from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from .models import Appointment, DoctorAvailability
from .serializers import AppointmentSerializer, DoctorAvailabilitySerializer
from accounts.permissions import IsPatient, IsDoctor, IsAdmin

User = get_user_model()


def _generate_slots(start_time, end_time, step_minutes=30):
    slots = []
    dt_start = datetime.combine(datetime.today().date(), start_time)
    dt_end = datetime.combine(datetime.today().date(), end_time)
    while dt_start < dt_end:
        slots.append(dt_start.time())
        dt_start += timedelta(minutes=step_minutes)
    return slots


class AvailableSlotsView(APIView):
    def get(self, request):
        doctor_id = request.query_params.get("doctor_id")
        date_str = request.query_params.get("date")
        if not doctor_id or not date_str:
            return Response({"detail": "doctor_id and date are required"}, status=400)

        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({"detail": "Invalid date format"}, status=400)

        doctor = get_object_or_404(User, id=doctor_id, role="DOCTOR")
        weekday = target_date.weekday()
        ranges = DoctorAvailability.objects.filter(doctor=doctor, weekday=weekday)

        all_slots = []
        for rng in ranges:
            all_slots.extend(_generate_slots(rng.start_time, rng.end_time))

        booked = set(
            Appointment.objects.filter(doctor=doctor, date=target_date)
            .values_list("time_slot", flat=True)
        )
        available = [s.strftime("%H:%M") for s in all_slots if s not in booked]
        return Response({"doctor_id": doctor.id, "date": date_str, "slots": available})


class BookAppointmentView(APIView):
    permission_classes = [IsPatient]

    def post(self, request):
        doctor_id = request.data.get("doctor_id")
        date = request.data.get("date")
        time_slot = request.data.get("time_slot")
        visit_type = request.data.get("visit_type") or Appointment.VisitType.VIDEO_CALL
        if not all([doctor_id, date, time_slot]):
            return Response({"detail": "doctor_id, date, time_slot required"}, status=400)

        try:
            doctor = User.objects.get(id=doctor_id, role="DOCTOR")
        except User.DoesNotExist:
            return Response({"detail": "Doctor not found"}, status=404)

        try:
            date_obj = datetime.strptime(date, "%Y-%m-%d").date()
            time_obj = datetime.strptime(time_slot, "%H:%M").time()
        except ValueError:
            return Response({"detail": "Invalid date/time format"}, status=400)

        weekday = date_obj.weekday()
        has_range = DoctorAvailability.objects.filter(
            doctor=doctor, weekday=weekday, start_time__lte=time_obj, end_time__gt=time_obj
        ).exists()
        if not has_range:
            return Response({"detail": "Slot not within doctor's availability"}, status=400)

        if Appointment.objects.filter(doctor=doctor, date=date_obj, time_slot=time_obj).exists():
            return Response({"detail": "Slot already booked"}, status=400)

        appt = Appointment.objects.create(
            patient=request.user, doctor=doctor, date=date_obj, time_slot=time_obj, visit_type=visit_type
        )
        return Response(AppointmentSerializer(appt).data, status=201)


class MyAppointmentsView(APIView):
    permission_classes = [IsPatient]

    def get(self, request):
        status_param = request.query_params.get("status")
        qs = Appointment.objects.filter(patient=request.user)
        if status_param:
            qs = qs.filter(status=status_param)
        data = AppointmentSerializer(qs.order_by("-date", "time_slot"), many=True).data
        return Response(data)


class CancelAppointmentView(APIView):
    permission_classes = [IsPatient]

    def post(self, request, pk):
        appt = get_object_or_404(Appointment, pk=pk, patient=request.user)
        appt.status = Appointment.Status.CANCELLED
        appt.save(update_fields=["status", "updated_at"])
        return Response(AppointmentSerializer(appt).data)


class RescheduleRequestView(APIView):
    permission_classes = [IsPatient]

    def post(self, request, pk):
        requested_date = request.data.get("requested_date")
        requested_time_slot = request.data.get("requested_time_slot")
        if not requested_date or not requested_time_slot:
            return Response({"detail": "requested_date and requested_time_slot required"}, status=400)
        appt = get_object_or_404(Appointment, pk=pk, patient=request.user)

        try:
            date_obj = datetime.strptime(requested_date, "%Y-%m-%d").date()
            time_obj = datetime.strptime(requested_time_slot, "%H:%M").time()
        except ValueError:
            return Response({"detail": "Invalid date/time format"}, status=400)

        weekday = date_obj.weekday()
        has_range = DoctorAvailability.objects.filter(
            doctor=appt.doctor, weekday=weekday, start_time__lte=time_obj, end_time__gt=time_obj
        ).exists()
        if not has_range:
            return Response({"detail": "Requested slot not within doctor's availability"}, status=400)

        if Appointment.objects.filter(doctor=appt.doctor, date=date_obj, time_slot=time_obj).exists():
            return Response({"detail": "Requested slot already booked"}, status=400)

        appt.status = Appointment.Status.RESCHEDULE_REQUESTED
        appt.requested_date = date_obj
        appt.requested_time_slot = time_obj
        appt.save(update_fields=["status", "requested_date", "requested_time_slot", "updated_at"])
        return Response(AppointmentSerializer(appt).data)


class DoctorAvailabilityView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request):
        qs = DoctorAvailability.objects.filter(doctor=request.user)
        return Response(DoctorAvailabilitySerializer(qs, many=True).data)

    def post(self, request):
        serializer = DoctorAvailabilitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        weekday = serializer.validated_data["weekday"]
        start_time = serializer.validated_data["start_time"]
        end_time = serializer.validated_data["end_time"]
        obj, created = DoctorAvailability.objects.get_or_create(
            doctor=request.user, weekday=weekday, start_time=start_time, end_time=end_time
        )
        return Response(DoctorAvailabilitySerializer(obj).data, status=201 if created else 200)

    def delete(self, request):
        weekday = request.data.get("weekday")
        start_time = request.data.get("start_time")
        end_time = request.data.get("end_time")
        if weekday is None or not start_time or not end_time:
            return Response({"detail": "weekday, start_time, end_time required"}, status=400)
        try:
            obj = DoctorAvailability.objects.get(
                doctor=request.user, weekday=int(weekday), start_time=start_time, end_time=end_time
            )
            obj.delete()
            return Response(status=204)
        except DoctorAvailability.DoesNotExist:
            return Response({"detail": "Availability not found"}, status=404)


class DoctorAppointmentsView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request):
        status_param = request.query_params.get("status")
        qs = Appointment.objects.filter(doctor=request.user)
        if status_param:
            qs = qs.filter(status=status_param)
        data = AppointmentSerializer(qs.order_by("-date", "time_slot"), many=True).data
        return Response(data)


class DoctorUpdateAppointmentStatusView(APIView):
    permission_classes = [IsDoctor]

    def post(self, request, pk):
        appt = get_object_or_404(Appointment, pk=pk, doctor=request.user)
        new_status = request.data.get("status")
        if new_status not in [Appointment.Status.COMPLETED, Appointment.Status.CANCELLED, Appointment.Status.UPCOMING]:
            return Response({"detail": "Invalid status"}, status=400)
        appt.status = new_status
        appt.save(update_fields=["status", "updated_at"])
        return Response(AppointmentSerializer(appt).data)


class AdminAllAppointmentsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        qs = Appointment.objects.all().order_by("-date", "time_slot")
        return Response(AppointmentSerializer(qs, many=True).data)


class AdminRescheduleDecisionView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        decision = request.data.get("decision")  # "ACCEPT" or "REJECT"
        appt = get_object_or_404(Appointment, pk=pk)
        if appt.status != Appointment.Status.RESCHEDULE_REQUESTED:
            return Response({"detail": "No reschedule requested for this appointment"}, status=400)

        if decision == "ACCEPT":
            if not appt.requested_date or not appt.requested_time_slot:
                return Response({"detail": "Missing requested date/time"}, status=400)
            appt.date = appt.requested_date
            appt.time_slot = appt.requested_time_slot
        elif decision == "REJECT":
            pass
        else:
            return Response({"detail": "decision must be ACCEPT or REJECT"}, status=400)

        appt.status = Appointment.Status.UPCOMING
        appt.requested_date = None
        appt.requested_time_slot = None
        appt.save(update_fields=["date", "time_slot", "status", "requested_date", "requested_time_slot", "updated_at"])
        return Response(AppointmentSerializer(appt).data)


class AdminCancelAppointmentView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        appt = get_object_or_404(Appointment, pk=pk)
        appt.status = Appointment.Status.CANCELLED
        appt.save(update_fields=["status", "updated_at"])
        return Response(AppointmentSerializer(appt).data)
