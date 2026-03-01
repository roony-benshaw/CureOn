from django.urls import path
from .views import (
    AvailableSlotsView,
    BookAppointmentView,
    MyAppointmentsView,
    CancelAppointmentView,
    RescheduleRequestView,
    DoctorAvailabilityView,
    DoctorAppointmentsView,
    DoctorUpdateAppointmentStatusView,
    AdminAllAppointmentsView,
    AdminRescheduleDecisionView,
    AdminCancelAppointmentView,
)


urlpatterns = [
    # General / Patient
    path("available-slots/", AvailableSlotsView.as_view(), name="available_slots"),
    path("book/", BookAppointmentView.as_view(), name="book_appointment"),
    path("mine/", MyAppointmentsView.as_view(), name="my_appointments"),
    path("<int:pk>/cancel/", CancelAppointmentView.as_view(), name="cancel_appointment"),
    path("<int:pk>/reschedule-request/", RescheduleRequestView.as_view(), name="reschedule_request"),

    # Doctor
    path("availability/", DoctorAvailabilityView.as_view(), name="doctor_availability"),
    path("doctor/", DoctorAppointmentsView.as_view(), name="doctor_appointments"),
    path("<int:pk>/status/", DoctorUpdateAppointmentStatusView.as_view(), name="doctor_update_status"),

    # Admin
    path("admin/all/", AdminAllAppointmentsView.as_view(), name="admin_all_appointments"),
    path("<int:pk>/reschedule-decision/", AdminRescheduleDecisionView.as_view(), name="admin_reschedule_decision"),
    path("<int:pk>/admin-cancel/", AdminCancelAppointmentView.as_view(), name="admin_cancel_appointment"),
]
