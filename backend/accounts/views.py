from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.mail import send_mail
import secrets
import string
import re
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .serializers import (
    RegisterSerializer,
    CreateStaffSerializer,
    UserSerializer,
    ExtendedUserSerializer,
    AdminUserUpdateSerializer,
    PatientProfileUpdateSerializer,
    DoctorProfileUpdateSerializer,
    PharmacyProfileUpdateSerializer,
    LabProfileUpdateSerializer,
)
from .models import PatientProfile, DoctorProfile, PharmacyProfile, LabProfile
from .permissions import IsAdmin

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

class AdminCreateStaffView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [IsAdmin]
    serializer_class = CreateStaffSerializer

    def _generate_password(self, length: int = 10):
        alphabet = string.ascii_letters + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(length))

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        role = data.get('role')
        temp_password = data.get('password')

        # Auto-generate password only if not provided
        if not temp_password:
            temp_password = self._generate_password()
            data['password'] = temp_password  
        else:
            # Respect provided password
            temp_password = temp_password

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        role_upper = str(role).upper() if role else None
        if role_upper == User.Role.DOCTOR:
            DoctorProfile.objects.get_or_create(
                user=user,
                defaults={
                    "specialization": request.data.get("specialization"),
                    "phone": request.data.get("phone"),
                },
            )
        elif role_upper == User.Role.PHARMACY:
            PharmacyProfile.objects.get_or_create(
                user=user,
                defaults={
                    "license_number": request.data.get("licenseNumber") or request.data.get("license_number"),
                    "phone": request.data.get("phone"),
                    "address": request.data.get("address"),
                },
            )
        elif role_upper == User.Role.LAB:
            LabProfile.objects.get_or_create(
                user=user,
                defaults={
                    "license_number": request.data.get("licenseNumber") or request.data.get("license_number"),
                    "phone": request.data.get("phone"),
                    "address": request.data.get("address"),
                },
            )
        elif role_upper == User.Role.PATIENT:
            PatientProfile.objects.get_or_create(
                user=user,
                defaults={
                    "age": request.data.get("age"),
                    "gender": request.data.get("gender"),
                    "phone": request.data.get("phone"),
                    "address": request.data.get("address"),
                },
            )

        headers = self.get_success_headers(serializer.data)
        return Response(
            {"user": UserSerializer(user).data, "temp_password": temp_password, "email_sent": False},
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

class UserDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ExtendedUserSerializer

    def get_object(self):
        return self.request.user

class UsersListView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = ExtendedUserSerializer

    def get_queryset(self):
        role = self.request.query_params.get('role')
        qs = User.objects.all().order_by('-date_joined')
        if role:
            qs = qs.filter(role=role.upper())
        return qs

class DoctorsPublicListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ExtendedUserSerializer

    def get_queryset(self):
        specialization = self.request.query_params.get('specialization')
        qs = User.objects.filter(role=User.Role.DOCTOR).order_by('username')
        if specialization:
            qs = qs.filter(doctor_profile__specialization__iexact=specialization)
        return qs

class LabsPublicListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ExtendedUserSerializer

    def get_queryset(self):
        qs = User.objects.filter(role=User.Role.LAB).order_by('username')
        return qs

class AdminUserUpdateView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]
    queryset = User.objects.all()
    serializer_class = AdminUserUpdateSerializer

class PatientProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(ExtendedUserSerializer(request.user).data)

    def patch(self, request):
        if request.user.role != User.Role.PATIENT:
            return Response({"detail": "Not a patient"}, status=status.HTTP_403_FORBIDDEN)
        serializer = PatientProfileUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.update(request.user, serializer.validated_data)
        return Response(ExtendedUserSerializer(request.user).data)

class DoctorProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(ExtendedUserSerializer(request.user).data)

    def patch(self, request):
        if request.user.role != User.Role.DOCTOR:
            return Response({"detail": "Not a doctor"}, status=status.HTTP_403_FORBIDDEN)
        serializer = DoctorProfileUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.update(request.user, serializer.validated_data)
        return Response(ExtendedUserSerializer(request.user).data)

class AvatarUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request):
        file = request.FILES.get("avatar")
        if not file:
            return Response({"detail": "avatar required"}, status=status.HTTP_400_BAD_REQUEST)
        user = request.user
        user.avatar = file
        user.save()
        return Response(ExtendedUserSerializer(user).data, status=status.HTTP_200_OK)

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username_or_email = attrs.get("username")
        if username_or_email:
            try:
                u = User.objects.get(email=username_or_email)
                attrs["username"] = u.username
            except User.DoesNotExist:
                pass
        return super().validate(attrs)

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

class PharmacyProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(ExtendedUserSerializer(request.user).data)

    def patch(self, request):
        if request.user.role != User.Role.PHARMACY:
            return Response({"detail": "Not a pharmacy"}, status=status.HTTP_403_FORBIDDEN)
        serializer = PharmacyProfileUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.update(request.user, serializer.validated_data)
        return Response(ExtendedUserSerializer(request.user).data)

class LabProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(ExtendedUserSerializer(request.user).data)

    def patch(self, request):
        if request.user.role != User.Role.LAB:
            return Response({"detail": "Not a lab"}, status=status.HTTP_403_FORBIDDEN)
        serializer = LabProfileUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.update(request.user, serializer.validated_data)
        return Response(ExtendedUserSerializer(request.user).data)

class AdminProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(ExtendedUserSerializer(request.user).data)

    def patch(self, request):
        if request.user.role != User.Role.ADMIN:
            return Response({"detail": "Not an admin"}, status=status.HTTP_403_FORBIDDEN)
        # Allow updating first_name, last_name, email only
        data = {k: request.data.get(k) for k in ['first_name', 'last_name', 'email'] if k in request.data}
        for f, v in data.items():
            setattr(request.user, f, v)
        request.user.save()
        return Response(ExtendedUserSerializer(request.user).data)

class SendCredentialsView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        name = request.data.get('name') or ''
        role = request.data.get('role') or 'Doctor'

        if not email or not password:
            return Response({"detail": "email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

        subject = "Your MediCare Account Credentials"
        message = (
            f"Hello {name},\n\n"
            f"Your {role} account credentials:\n"
            f"Login Email: {email}\n"
            f"Temporary Password: {password}\n\n"
            "Please sign in and change your password after first login.\n\n"
            "Regards,\nMediCare Admin"
        )
        try:
            send_mail(
                subject,
                message,
                getattr(settings, "DEFAULT_FROM_EMAIL", None),
                [email],
                fail_silently=False,
            )
            return Response({"sent": True})
        except Exception as e:
            return Response({"sent": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        current = request.data.get("current_password")
        new = request.data.get("new_password")
        if not current or not new:
            return Response({"detail": "current_password and new_password are required"}, status=status.HTTP_400_BAD_REQUEST)
        user = request.user
        if not user.check_password(current):
            return Response({"detail": "Incorrect current password"}, status=status.HTTP_400_BAD_REQUEST)
        if len(new) < 8:
            return Response({"detail": "New password must be at least 8 characters"}, status=status.HTTP_400_BAD_REQUEST)
        if new == current:
            return Response({"detail": "New password must be different from current password"}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new)
        user.save(update_fields=["password"])
        return Response({"detail": "Password updated"}, status=status.HTTP_200_OK)

class ChangeUsernameView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        new_username = request.data.get("new_username")
        if not new_username:
            return Response({"detail": "new_username is required"}, status=status.HTTP_400_BAD_REQUEST)
        if len(new_username) < 3 or len(new_username) > 150:
            return Response({"detail": "Username must be between 3 and 150 characters"}, status=status.HTTP_400_BAD_REQUEST)
        if not re.match(r"^[a-zA-Z0-9_.-]+$", new_username):
            return Response({"detail": "Username can contain letters, numbers, ., _, -"}, status=status.HTTP_400_BAD_REQUEST)
        if new_username.lower() == request.user.username.lower():
            return Response({"detail": "New username must be different"}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(username__iexact=new_username).exists():
            return Response({"detail": "Username already taken"}, status=status.HTTP_400_BAD_REQUEST)
        request.user.username = new_username
        request.user.save(update_fields=["username"])
        return Response({"detail": "Username updated"}, status=status.HTTP_200_OK)
