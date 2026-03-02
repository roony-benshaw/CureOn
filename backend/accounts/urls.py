from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import RegisterView, AdminCreateStaffView, UserDetailView, UsersListView, AdminUserUpdateView, DoctorsPublicListView, LabsPublicListView, PatientProfileView, DoctorProfileView, PharmacyProfileView, LabProfileView, AdminProfileView, ChangePasswordView, ChangeUsernameView, AvatarUploadView, MyTokenObtainPairView
from .views_admin import (
    AdminDoctorDetailView,
    AdminPatientDetailView,
    AdminPharmacyDetailView,
    AdminLabDetailView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('create-staff/', AdminCreateStaffView.as_view(), name='create_staff'),
    path('me/', UserDetailView.as_view(), name='user_detail'),
    path('users/', UsersListView.as_view(), name='users_list'),
    path('users/<int:pk>/', AdminUserUpdateView.as_view(), name='users_update'),
    path('doctors/', DoctorsPublicListView.as_view(), name='doctors_public_list'),
    path('labs/', LabsPublicListView.as_view(), name='labs_public_list'),
    path('patient/profile/', PatientProfileView.as_view(), name='patient_profile'),
    path('doctor/profile/', DoctorProfileView.as_view(), name='doctor_profile'),
    path('pharmacy/profile/', PharmacyProfileView.as_view(), name='pharmacy_profile'),
    path('labs/profile/', LabProfileView.as_view(), name='lab_profile'),
    path('admin/profile/', AdminProfileView.as_view(), name='admin_profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('change-username/', ChangeUsernameView.as_view(), name='change_username'),
    path('profile/avatar/', AvatarUploadView.as_view(), name='profile_avatar'),
    
    # Admin Detail Views
    path('admin/doctors/<int:id>/', AdminDoctorDetailView.as_view(), name='admin_doctor_detail'),
    path('admin/patients/<int:id>/', AdminPatientDetailView.as_view(), name='admin_patient_detail'),
    path('admin/pharmacy/<int:id>/', AdminPharmacyDetailView.as_view(), name='admin_pharmacy_detail'),
    path('admin/labs/<int:id>/', AdminLabDetailView.as_view(), name='admin_lab_detail'),
]
