from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from .models import Appointment, DoctorAvailability, Prescription, LabTestRequest
from .serializers import AppointmentSerializer, DoctorAvailabilitySerializer, PrescriptionSerializer, LabTestRequestSerializer
from accounts.permissions import IsPatient, IsDoctor, IsAdmin, IsPharmacy, IsLab

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
        now = timezone.localtime()
        if target_date == now.date():
            current_time = now.time()
            filtered = [s for s in all_slots if s not in booked and s > current_time]
        else:
            filtered = [s for s in all_slots if s not in booked]
        available = [s.strftime("%H:%M") for s in filtered]
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

class DoctorPatientsListView(APIView):
    permission_classes = [IsDoctor]
    def get(self, request):
        appts = Appointment.objects.filter(doctor=request.user).order_by("-date")
        by_patient = {}
        for appt in appts:
            p = appt.patient
            pid = p.id
            entry = by_patient.get(pid)
            last_visit = appt.date
            if not entry:
                prof = getattr(p, "patient_profile", None)
                name = f"{getattr(p, 'first_name', '')} {getattr(p, 'last_name', '')}".strip() or p.username
                by_patient[pid] = {
                    "id": pid,
                    "name": name,
                    "email": getattr(p, "email", "") or "",
                    "phone": getattr(prof, "phone", "") if prof else "",
                    "age": getattr(prof, "age", None) if prof else None,
                    "last_visit": last_visit.isoformat(),
                    "total_visits": 1,
                    "condition": None,
                }
            else:
                entry["total_visits"] += 1
                if last_visit > datetime.fromisoformat(entry["last_visit"]).date():
                    entry["last_visit"] = last_visit.isoformat()
        # enrich condition from latest prescription per patient with this doctor
        for pid, entry in by_patient.items():
            presc = Prescription.objects.filter(patient_id=pid, doctor=request.user).order_by("-created_at").first()
            entry["condition"] = getattr(presc, "diagnosis", None)
        # sort by last_visit desc
        data = sorted(by_patient.values(), key=lambda x: x["last_visit"], reverse=True)
        return Response(data)

class DoctorPatientHistoryView(APIView):
    permission_classes = [IsDoctor]
    def get(self, request, patient_id):
        # Ensure this patient has a relationship with the doctor
        try:
            patient = User.objects.get(id=patient_id, role="PATIENT")
        except User.DoesNotExist:
            return Response({"detail": "Patient not found"}, status=404)
        if not Appointment.objects.filter(doctor=request.user, patient=patient).exists():
            return Response({"detail": "No relationship with this patient"}, status=403)
        prof = getattr(patient, "patient_profile", None)
        last_appt = Appointment.objects.filter(doctor=request.user, patient=patient).order_by("-date").first()
        patient_info = {
            "id": patient.id,
            "name": f"{getattr(patient, 'first_name', '')} {getattr(patient, 'last_name', '')}".strip() or patient.username,
            "email": getattr(patient, "email", "") or "",
            "phone": getattr(prof, "phone", "") if prof else "",
            "age": getattr(prof, "age", None) if prof else None,
            "gender": getattr(prof, "gender", None) if prof else None,
            "last_visit": last_appt.date.isoformat() if last_appt else None,
        }
        prescs = Prescription.objects.filter(patient=patient, doctor=request.user).order_by("-created_at")
        labs = LabTestRequest.objects.filter(patient=patient, doctor=request.user).order_by("-created_at")
        return Response({
            "patient": patient_info,
            "prescriptions": PrescriptionSerializer(prescs, many=True).data,
            "lab_results": LabTestRequestSerializer(labs, many=True).data,
        })

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

class DoctorRescheduleDecisionView(APIView):
    permission_classes = [IsDoctor]

    def post(self, request, pk):
        decision = request.data.get("decision")  # "ACCEPT" or "REJECT"
        appt = get_object_or_404(Appointment, pk=pk, doctor=request.user)
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

class DoctorRescheduleView(APIView):
    permission_classes = [IsDoctor]

    def post(self, request, pk):
        new_date = request.data.get("date")
        new_time_slot = request.data.get("time_slot")
        if not new_date or not new_time_slot:
            return Response({"detail": "date and time_slot required"}, status=400)
        appt = get_object_or_404(Appointment, pk=pk, doctor=request.user)
        try:
            date_obj = datetime.strptime(new_date, "%Y-%m-%d").date()
            time_obj = datetime.strptime(new_time_slot, "%H:%M").time()
        except ValueError:
            return Response({"detail": "Invalid date/time format"}, status=400)

        weekday = date_obj.weekday()
        has_range = DoctorAvailability.objects.filter(
            doctor=request.user, weekday=weekday, start_time__lte=time_obj, end_time__gt=time_obj
        ).exists()
        if not has_range:
            return Response({"detail": "Slot not within doctor's availability"}, status=400)

        if Appointment.objects.filter(doctor=request.user, date=date_obj, time_slot=time_obj).exists():
            return Response({"detail": "Slot already booked"}, status=400)

        appt.date = date_obj
        appt.time_slot = time_obj
        appt.status = Appointment.Status.UPCOMING
        appt.requested_date = None
        appt.requested_time_slot = None
        appt.save(update_fields=["date", "time_slot", "status", "requested_date", "requested_time_slot", "updated_at"])
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

class DoctorCreatePrescriptionView(APIView):
    permission_classes = [IsDoctor]

    def post(self, request, pk):
        appt = get_object_or_404(Appointment, pk=pk, doctor=request.user)
        if Prescription.objects.filter(appointment=appt).exists():
            return Response({"detail": "Prescription already exists"}, status=400)
        data = request.data.copy()
        data["appointment"] = appt.id
        serializer = PrescriptionSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        presc = serializer.save(patient=appt.patient, doctor=request.user, appointment=appt)
        return Response(PrescriptionSerializer(presc).data, status=201)

class PatientPrescriptionsView(APIView):
    permission_classes = [IsPatient]

    def get(self, request):
        qs = Prescription.objects.filter(patient=request.user).order_by("-created_at")
        return Response(PrescriptionSerializer(qs, many=True).data)

class PharmacyPrescriptionsView(APIView):
    permission_classes = [IsPharmacy]

    def get(self, request):
        qs = Prescription.objects.all().order_by("-created_at")
        return Response(PrescriptionSerializer(qs, many=True).data)

class PharmacyUpdatePrescriptionStatusView(APIView):
    permission_classes = [IsPharmacy]

    def post(self, request, pk):
        presc = get_object_or_404(Prescription, pk=pk)
        new_status = request.data.get("status")
        valid = [s for s, _ in Prescription.PharmacyStatus.choices]
        if new_status not in valid:
            return Response({"detail": "Invalid status"}, status=400)
        presc.pharmacy_status = new_status
        if new_status == Prescription.PharmacyStatus.COMPLETED:
            presc.status = Prescription.Status.COMPLETED
        presc.save(update_fields=["pharmacy_status", "status", "updated_at"])
        return Response(PrescriptionSerializer(presc).data)

class PharmacyUpdatePrescriptionBillView(APIView):
    permission_classes = [IsPharmacy]

    def post(self, request, pk):
        presc = get_object_or_404(Prescription, pk=pk)
        items = request.data.get("items")
        if isinstance(items, str):
            import json
            try:
                items = json.loads(items)
            except Exception:
                return Response({"detail": "items must be JSON list"}, status=400)
        if not isinstance(items, list) or not items:
            return Response({"detail": "items list required"}, status=400)
        total = 0
        for incoming in items:
            item_id = incoming.get("id")
            unit_price = incoming.get("unit_price")
            quantity = incoming.get("quantity")
            if item_id is None or unit_price is None or quantity is None:
                return Response({"detail": "id, unit_price, quantity required per item"}, status=400)
            try:
                obj = presc.items.get(id=item_id)
            except Exception:
                return Response({"detail": f"Item {item_id} not found"}, status=404)
            obj.unit_price = unit_price
            obj.quantity = quantity
            obj.save(update_fields=["unit_price", "quantity"])
            total += float(unit_price) * int(quantity)
        presc.total_amount = total
        file = request.FILES.get("attachment")
        update_fields = ["total_amount", "updated_at"]
        if file:
            presc.bill_attachment = file
            update_fields.append("bill_attachment")
        presc.save(update_fields=update_fields)
        return Response(PrescriptionSerializer(presc).data)

class DoctorCreateLabRequestView(APIView):
    permission_classes = [IsDoctor]
    def post(self, request, pk):
        appt = get_object_or_404(Appointment, pk=pk, doctor=request.user)
        lab_id = request.data.get("lab_id")
        if not lab_id:
            return Response({"detail": "lab_id required"}, status=400)
        try:
            lab_user = User.objects.get(id=lab_id, role="LAB")
        except User.DoesNotExist:
            return Response({"detail": "Lab not found"}, status=404)
        data = {
            "appointment": appt.id,
            "tests": request.data.get("tests") or [],
            "notes": request.data.get("notes") or "",
            "priority": request.data.get("priority") or LabTestRequest.Priority.ROUTINE,
            "lab": lab_user.id,
        }
        if not isinstance(data["tests"], list) or len(data["tests"]) == 0:
            return Response({"detail": "tests list required"}, status=400)
        serializer = LabTestRequestSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save(patient=appt.patient, doctor=request.user, lab=lab_user)
        return Response(LabTestRequestSerializer(obj).data, status=201)

class LabRequestsView(APIView):
    permission_classes = [IsLab]
    def get(self, request):
        qs = LabTestRequest.objects.filter(lab=request.user).order_by("-created_at")
        return Response(LabTestRequestSerializer(qs, many=True).data)

class PatientLabResultsView(APIView):
    permission_classes = [IsPatient]
    def get(self, request):
        qs = LabTestRequest.objects.filter(patient=request.user, status=LabTestRequest.Status.COMPLETED).order_by("-created_at")
        return Response(LabTestRequestSerializer(qs, many=True).data)

class LabUpdateRequestStatusView(APIView):
    permission_classes = [IsLab]
    def post(self, request, pk):
        req = get_object_or_404(LabTestRequest, pk=pk)
        new_status = request.data.get("status")
        valid = [s for s, _ in LabTestRequest.Status.choices]
        if new_status not in valid:
            return Response({"detail": "Invalid status"}, status=400)
        req.status = new_status
        req.save(update_fields=["status", "updated_at"])
        return Response(LabTestRequestSerializer(req).data)

class LabSubmitResultView(APIView):
    permission_classes = [IsLab]
    def post(self, request, pk):
        req = get_object_or_404(LabTestRequest, pk=pk, lab=request.user)
        req.result_value = request.data.get("result_value") or ""
        req.reference_range = request.data.get("reference_range") or ""
        req.clinical_notes = request.data.get("clinical_notes") or ""
        file = request.FILES.get("attachment")
        if file:
            req.attachment = file
        req.status = LabTestRequest.Status.COMPLETED
        req.save()
        return Response(LabTestRequestSerializer(req).data)
