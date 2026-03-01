from django.db import models
from django.conf import settings


class DoctorAvailability(models.Model):
    class Weekday(models.IntegerChoices):
        MONDAY = 0, "Monday"
        TUESDAY = 1, "Tuesday"
        WEDNESDAY = 2, "Wednesday"
        THURSDAY = 3, "Thursday"
        FRIDAY = 4, "Friday"
        SATURDAY = 5, "Saturday"
        SUNDAY = 6, "Sunday"

    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="availability"
    )
    weekday = models.IntegerField(choices=Weekday.choices)
    start_time = models.TimeField()
    end_time = models.TimeField()

    class Meta:
        unique_together = ("doctor", "weekday", "start_time", "end_time")
        ordering = ["doctor_id", "weekday", "start_time"]

    def __str__(self):
        return f"{self.doctor_id} {self.get_weekday_display()} {self.start_time}-{self.end_time}"


class Appointment(models.Model):
    class Status(models.TextChoices):
        UPCOMING = "UPCOMING", "Upcoming"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"
        RESCHEDULE_REQUESTED = "RESCHEDULE_REQUESTED", "RescheduleRequested"

    class VisitType(models.TextChoices):
        VIDEO_CALL = "VIDEO_CALL", "Video Call"
        IN_PERSON = "IN_PERSON", "In-Person"

    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="patient_appointments"
    )
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="doctor_appointments"
    )
    date = models.DateField()
    time_slot = models.TimeField()
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.UPCOMING)
    visit_type = models.CharField(max_length=20, choices=VisitType.choices, default=VisitType.VIDEO_CALL)

    requested_date = models.DateField(null=True, blank=True)
    requested_time_slot = models.TimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("doctor", "date", "time_slot")
        ordering = ["-date", "time_slot"]

    def __str__(self):
        return f"{self.patient_id} -> {self.doctor_id} @ {self.date} {self.time_slot} [{self.status}]"
