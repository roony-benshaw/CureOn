from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import RegisterView, AdminCreateStaffView, UserDetailView, UsersListView, AdminUserUpdateView, DoctorsPublicListView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('create-staff/', AdminCreateStaffView.as_view(), name='create_staff'),
    path('me/', UserDetailView.as_view(), name='user_detail'),
    path('users/', UsersListView.as_view(), name='users_list'),
    path('users/<int:pk>/', AdminUserUpdateView.as_view(), name='users_update'),
    path('doctors/', DoctorsPublicListView.as_view(), name='doctors_public_list'),
]
