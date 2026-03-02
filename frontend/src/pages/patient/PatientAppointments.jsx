import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import AppointmentCard from "@/components/dashboard/AppointmentCard";
import BookingModal from "@/components/patient/BookingModal";
import RescheduleModal from "@/components/patient/RescheduleModal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Pill,
  Settings,
  CalendarPlus,
  HeartPulse,
} from "lucide-react";
import { format } from "date-fns";
import { getDateLocale } from "@/lib/utils";
import { appointmentsService } from "@/services/api";

const PatientAppointments = () => {
  const { t } = useTranslation();
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const navItems = [
    { name: t('common.dashboard'), href: "/patient/dashboard", icon: LayoutDashboard },
    { name: t('common.appointments'), href: "/patient/appointments", icon: Calendar },
    { name: t('common.myRecords'), href: "/patient/records", icon: FileText },
    { name: t('common.prescriptions'), href: "/patient/prescriptions", icon: Pill },
    { name: t('common.aiHealthAssistant'), href: "/patient/chatbot", icon: HeartPulse },
    { name: t('common.settings'), href: "/patient/settings", icon: Settings },
  ];
  
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);

  const mapStatus = (s) => {
    switch (s) {
      case "UPCOMING": return "upcoming";
      case "COMPLETED": return "completed";
      case "CANCELLED": return "cancelled";
      default: return "upcoming";
    }
  };

  const mapType = (t) => t === "IN_PERSON" ? "in-person" : "video";
  const buildAvatarUrl = (path) => {
    if (!path) return null;
    const p = String(path);
    if (p.startsWith("http")) return p;
    if (p.startsWith("/media/")) return `http://127.0.0.1:8000${p}`;
    return `http://127.0.0.1:8000/media/${p}`;
  };

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const res = await appointmentsService.myAppointments();
      const items = (res || []).map((a) => ({
        id: a.id,
        doctorName: a.doctor_name || "Doctor",
        specialty: a.doctor_specialization || "",
        date: new Date(a.date),
        time: a.time_slot,
        type: mapType(a.visit_type),
        status: mapStatus(a.status),
        doctorId: a.doctor,
        avatar: buildAvatarUrl(a.doctor_avatar),
      }));
      setAppointments(items);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const completedAppointments = appointments.filter(a => a.status === "completed");
  const cancelledAppointments = appointments.filter(a => a.status === "cancelled");

  const upcomingAppointments = appointments.filter(a => a.status === "upcoming");

  const handleBookingConfirmed = () => {
    loadAppointments();
  };

  const handleReschedule = (appointment) => {
    setSelectedAppointment(appointment);
    setRescheduleModalOpen(true);
  };

  const handleRescheduleConfirm = async (newDate, newTime) => {
    if (selectedAppointment) {
      try {
        await appointmentsService.requestReschedule(
          selectedAppointment.id,
          format(newDate, "yyyy-MM-dd"),
          newTime
        );
        toast.success(t('appointments.rescheduleSuccess'));
        loadAppointments();
      } catch {
        toast.error(t('common.error') || "Error");
      }
    }
    setSelectedAppointment(null);
    setRescheduleModalOpen(false);
  };

  const handleJoinCall = (appointment) => {
    toast.success(t('appointments.joinCall', { name: appointment.doctorName }));
  };

  const handleCancel = async (appointment) => {
    try {
      await appointmentsService.cancel(appointment.id);
      toast.error(t('appointments.cancelSuccess', { name: appointment.doctorName }));
      loadAppointments();
    } catch {
      toast.error(t('common.error') || "Error");
    }
  };

  return (
    <DashboardLayout
      navItems={navItems}
      userType="patient"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
              {t('appointments.title')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('appointments.subtitle')}
            </p>
          </div>
          <Button variant="hero" onClick={() => setBookingModalOpen(true)}>
            <CalendarPlus className="w-5 h-5" />
            {t('appointments.bookNew')}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="upcoming">
              {t('appointments.upcoming')} ({upcomingAppointments.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              {t('appointments.completed')} ({completedAppointments.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              {t('appointments.cancelled')} ({cancelledAppointments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6">
            <div className="space-y-4">
              {upcomingAppointments.length > 0 ? (
                upcomingAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    {...appointment}
                    date={format(appointment.date, "PP", { locale: getDateLocale() })}
                    userType="patient"
                    showActions={true}
                    onJoin={() => handleJoinCall(appointment)}
                    onReschedule={() => handleReschedule(appointment)}
                    onCancel={() => handleCancel(appointment)}
                  />
                ))
              ) : (
                <div className="dashboard-card p-8 text-center">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">{t('appointments.noUpcoming')}</h3>
                  <p className="text-muted-foreground mb-4">{t('appointments.bookToStart')}</p>
                  <Button variant="hero" onClick={() => setBookingModalOpen(true)}>
                    <CalendarPlus className="w-5 h-5" />
                    {t('appointments.bookBtn')}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            <div className="space-y-4">
                {completedAppointments.length > 0 ? (
                  completedAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                      {...appointment}
                      date={format(appointment.date, "PP", { locale: getDateLocale() })}
                    userType="patient"
                    showActions={false}
                  />
                ))
              ) : (
                <div className="dashboard-card p-8 text-center">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-foreground">{t('appointments.noCompleted')}</h3>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="cancelled" className="mt-6">
            <div className="space-y-4">
                {cancelledAppointments.length > 0 ? (
                  cancelledAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                      {...appointment}
                      date={format(appointment.date, "PP", { locale: getDateLocale() })}
                    userType="patient"
                    showActions={false}
                  />
                ))
              ) : (
                <div className="dashboard-card p-8 text-center">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-foreground">{t('appointments.noCancelled')}</h3>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Booking Modal */}
      <BookingModal 
        open={bookingModalOpen} 
        onOpenChange={setBookingModalOpen}
        onBookingConfirmed={handleBookingConfirmed}
      />

      {/* Reschedule Modal */}
      <RescheduleModal
        open={rescheduleModalOpen}
        onOpenChange={setRescheduleModalOpen}
        appointmentDetails={selectedAppointment ? {
          doctorName: selectedAppointment.doctorName,
          doctorId: selectedAppointment.doctorId,
          currentDate: selectedAppointment.date,
          currentTime: selectedAppointment.time,
        } : undefined}
        onConfirm={handleRescheduleConfirm}
      />
    </DashboardLayout>
  );
};

export default PatientAppointments;
