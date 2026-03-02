from rest_framework import generics
from django.contrib.auth import get_user_model
from .permissions import IsAdmin
from .serializers_admin import (
    AdminDoctorDetailSerializer,
    AdminPatientDetailSerializer,
    AdminPharmacyDetailSerializer,
    AdminLabDetailSerializer
)

User = get_user_model()

class AdminDoctorDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAdmin]
    queryset = User.objects.filter(role=User.Role.DOCTOR)
    serializer_class = AdminDoctorDetailSerializer
    lookup_field = 'id'

class AdminPatientDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAdmin]
    queryset = User.objects.filter(role=User.Role.PATIENT)
    serializer_class = AdminPatientDetailSerializer
    lookup_field = 'id'

class AdminPharmacyDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAdmin]
    queryset = User.objects.filter(role=User.Role.PHARMACY)
    serializer_class = AdminPharmacyDetailSerializer
    lookup_field = 'id'

class AdminLabDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAdmin]
    queryset = User.objects.filter(role=User.Role.LAB)
    serializer_class = AdminLabDetailSerializer
    lookup_field = 'id'
