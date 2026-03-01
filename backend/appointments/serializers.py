from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Appointment, DoctorAvailability

User = get_user_model()


class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorAvailability
        fields = ["id", "doctor", "weekday", "start_time", "end_time"]
        read_only_fields = ["doctor"]


class AppointmentSerializer(serializers.ModelSerializer):
    doctor_name = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    doctor_specialization = serializers.SerializerMethodField()
    class Meta:
        model = Appointment
        fields = [
            "id",
            "patient",
            "doctor",
            "date",
            "time_slot",
            "status",
            "visit_type",
            "requested_date",
            "requested_time_slot",
            "created_at",
            "updated_at",
            "doctor_name",
            "patient_name",
            "doctor_specialization",
        ]
        read_only_fields = ["patient", "status", "created_at", "updated_at"]

    def validate(self, attrs):
        doctor = attrs.get("doctor")
        date = attrs.get("date")
        time_slot = attrs.get("time_slot")
        if doctor and date and time_slot:
            if Appointment.objects.filter(doctor=doctor, date=date, time_slot=time_slot).exists():
                raise serializers.ValidationError("This slot is already booked for the doctor.")
        return attrs

    def get_doctor_name(self, obj):
        d = getattr(obj, "doctor", None)
        if d:
            full = f"{getattr(d, 'first_name', '')} {getattr(d, 'last_name', '')}".strip()
            return full or d.username
        return None

    def get_patient_name(self, obj):
        p = getattr(obj, "patient", None)
        if p:
            full = f"{getattr(p, 'first_name', '')} {getattr(p, 'last_name', '')}".strip()
            return full or p.username
        return None

    def get_doctor_specialization(self, obj):
        d = getattr(obj, "doctor", None)
        prof = getattr(d, "doctor_profile", None) if d else None
        return getattr(prof, "specialization", None)
