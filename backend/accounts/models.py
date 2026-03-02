from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    class Role(models.TextChoices):
        PATIENT = "PATIENT", "Patient"
        DOCTOR = "DOCTOR", "Doctor"
        PHARMACY = "PHARMACY", "Pharmacy"
        LAB = "LAB", "Lab"
        ADMIN = "ADMIN", "Admin"

    role = models.CharField(max_length=50, choices=Role.choices, default=Role.PATIENT)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    
    def save(self, *args, **kwargs):
        if self.is_superuser:
            self.role = self.Role.ADMIN
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} ({self.role})"

class PatientProfile(models.Model):
    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="patient_profile")
    age = models.IntegerField(null=True, blank=True)
    gender = models.CharField(max_length=20, null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    address = models.CharField(max_length=255, null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    blood_type = models.CharField(max_length=3, null=True, blank=True)
    height_cm = models.IntegerField(null=True, blank=True)
    weight_kg = models.FloatField(null=True, blank=True)
    allergies = models.TextField(null=True, blank=True)
    chronic_diseases = models.TextField(null=True, blank=True)
    past_diseases = models.TextField(null=True, blank=True)
    family_history = models.TextField(null=True, blank=True)

class DoctorProfile(models.Model):
    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="doctor_profile")
    specialization = models.CharField(max_length=100, null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    license_number = models.CharField(max_length=100, null=True, blank=True)
    hospital_name = models.CharField(max_length=255, null=True, blank=True)
    experience_years = models.IntegerField(null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    about = models.TextField(null=True, blank=True)

class PharmacyProfile(models.Model):
    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="pharmacy_profile")
    license_number = models.CharField(max_length=100, null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    address = models.CharField(max_length=255, null=True, blank=True)

class LabProfile(models.Model):
    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="lab_profile")
    license_number = models.CharField(max_length=100, null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    address = models.CharField(max_length=255, null=True, blank=True)
