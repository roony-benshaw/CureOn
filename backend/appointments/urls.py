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
    DoctorRescheduleDecisionView,
    DoctorRescheduleView,
    AdminAllAppointmentsView,
    AdminRescheduleDecisionView,
    AdminCancelAppointmentView,
    DoctorCreatePrescriptionView,
    DoctorPatientsListView,
    DoctorPatientHistoryView,
    PatientPrescriptionsView,
    PharmacyPrescriptionsView,
    PharmacyUpdatePrescriptionStatusView,
    PharmacyUpdatePrescriptionBillView,
    DoctorCreateLabRequestView,
    LabRequestsView,
    LabUpdateRequestStatusView,
    LabSubmitResultView,
    PatientLabResultsView,
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
    path("doctor/patients/", DoctorPatientsListView.as_view(), name="doctor_patients"),
    path("doctor/patients/<int:patient_id>/history/", DoctorPatientHistoryView.as_view(), name="doctor_patient_history"),
    path("<int:pk>/status/", DoctorUpdateAppointmentStatusView.as_view(), name="doctor_update_status"),
    path("doctor/<int:pk>/reschedule-decision/", DoctorRescheduleDecisionView.as_view(), name="doctor_reschedule_decision"),
    path("doctor/<int:pk>/reschedule/", DoctorRescheduleView.as_view(), name="doctor_reschedule"),

    # Admin
    path("admin/all/", AdminAllAppointmentsView.as_view(), name="admin_all_appointments"),
    path("<int:pk>/reschedule-decision/", AdminRescheduleDecisionView.as_view(), name="admin_reschedule_decision"),
    path("<int:pk>/admin-cancel/", AdminCancelAppointmentView.as_view(), name="admin_cancel_appointment"),
    path("<int:pk>/prescription/", DoctorCreatePrescriptionView.as_view(), name="doctor_create_prescription"),
    path("patient/prescriptions/", PatientPrescriptionsView.as_view(), name="patient_prescriptions"),
    path("pharmacy/prescriptions/", PharmacyPrescriptionsView.as_view(), name="pharmacy_prescriptions"),
    path("pharmacy/prescriptions/<int:pk>/status/", PharmacyUpdatePrescriptionStatusView.as_view(), name="pharmacy_update_prescription_status"),
    path("pharmacy/prescriptions/<int:pk>/bill/", PharmacyUpdatePrescriptionBillView.as_view(), name="pharmacy_update_prescription_bill"),
    path("<int:pk>/lab-request/", DoctorCreateLabRequestView.as_view(), name="doctor_create_lab_request"),
    path("lab/requests/", LabRequestsView.as_view(), name="lab_requests"),
    path("lab/requests/<int:pk>/status/", LabUpdateRequestStatusView.as_view(), name="lab_update_request_status"),
    path("lab/requests/<int:pk>/result/", LabSubmitResultView.as_view(), name="lab_submit_result"),
    path("patient/lab-results/", PatientLabResultsView.as_view(), name="patient_lab_results"),
]
