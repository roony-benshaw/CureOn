import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import AppointmentCard from "@/components/dashboard/AppointmentCard";
import RescheduleModal from "@/components/patient/RescheduleModal";
import PrescriptionModal from "@/components/doctor/PrescriptionModal";
import LabRequestModal from "@/components/doctor/LabRequestModal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Clock,
  Settings,
  Pill,
} from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/doctor/dashboard", icon: LayoutDashboard },
  { name: "Appointments", href: "/doctor/appointments", icon: Calendar },
  { name: "Patients", href: "/doctor/patients", icon: Users },
  { name: "Manage Availability", href: "/doctor/availability", icon: Clock },
  { name: "Settings", href: "/doctor/settings", icon: Settings },
];

const DoctorAppointments = () => {
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);
  const [selectedPrescriptionAppointment, setSelectedPrescriptionAppointment] = useState(null);
  const [labModalOpen, setLabModalOpen] = useState(false);
  const [selectedLabAppointment, setSelectedLabAppointment] = useState(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

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

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const { appointmentsService } = await import("@/services/api");
      const res = await appointmentsService.doctorAppointments();
      const items = (res || []).map((a) => ({
        id: a.id,
        patientName: a.patient_name || "Patient",
        date: format(new Date(a.date), "PP"),
        rawDate: new Date(a.date),
        time: a.time_slot,
        type: mapType(a.visit_type),
        status: mapStatus(a.status),
        rescheduleRequested: a.status === "RESCHEDULE_REQUESTED",
        requestedDate: a.requested_date ? format(new Date(a.requested_date), "PP") : null,
        requestedTime: a.requested_time_slot || null,
        doctorId: a.doctor,
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

  const handleJoinCall = (appointment) => {
    toast.success(`Starting video call with ${appointment.patientName}`);
    // Simulate opening a video call window
    window.open(`https://meet.google.com/new`, '_blank');
  };

  const handleCancel = (appointment) => {
    import("@/services/api").then(async ({ appointmentsService }) => {
      try {
        await appointmentsService.doctorUpdateStatus(appointment.id, "CANCELLED");
        toast.error(`Appointment with ${appointment.patientName} cancelled`);
        loadAppointments();
      } catch {}
    });
  };

  const handleComplete = (appointment) => {
    import("@/services/api").then(async ({ appointmentsService }) => {
      try {
        await appointmentsService.doctorUpdateStatus(appointment.id, "COMPLETED");
        toast.success("Marked as completed");
        loadAppointments();
      } catch {}
    });
  };

  const handleApproveReschedule = (appointment) => {
    import("@/services/api").then(async ({ appointmentsService }) => {
      try {
        await appointmentsService.doctorRescheduleDecision(appointment.id, "ACCEPT");
        toast.success("Reschedule accepted");
        loadAppointments();
      } catch {}
    });
  };

  const handleRejectReschedule = (appointment) => {
    import("@/services/api").then(async ({ appointmentsService }) => {
      try {
        await appointmentsService.doctorRescheduleDecision(appointment.id, "REJECT");
        toast.error("Reschedule rejected");
        loadAppointments();
      } catch {}
    });
  };

  const handlePrescribe = (appointment) => {
    setSelectedPrescriptionAppointment(appointment);
    setPrescriptionModalOpen(true);
  };
  const handleLab = (appointment) => {
    setSelectedLabAppointment(appointment);
    setLabModalOpen(true);
  };

  const handleRescheduleOpen = (appointment) => {
    setSelectedAppointment(appointment);
    setRescheduleOpen(true);
  };

  const handleRescheduleConfirm = (newDate, newTime) => {
    import("@/services/api").then(async ({ appointmentsService }) => {
      try {
        await appointmentsService.doctorReschedule(
          selectedAppointment.id,
          format(newDate, "yyyy-MM-dd"),
          newTime
        );
        toast.success("Rescheduled");
        setSelectedAppointment(null);
        setRescheduleOpen(false);
        loadAppointments();
      } catch {
        toast.error("Error");
      }
    });
  };

  const today = new Date();
  const isToday = (d) =>
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  const todayAppointments = appointments.filter(app => isToday(app.rawDate) && app.status === 'upcoming');
  const upcomingAppointments = appointments.filter(app => !isToday(app.rawDate) && app.status === 'upcoming');
  const completedAppointments = appointments.filter(app => app.status === 'completed');
  const cancelledAppointments = appointments.filter(app => app.status === 'cancelled');

  return (
    <DashboardLayout
      navItems={navItems}
      userType="doctor"
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
            Appointments
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage your appointments
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="today">
              Today ({todayAppointments.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingAppointments.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedAppointments.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Cancelled ({cancelledAppointments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="mt-6">
            <div className="space-y-4">
              {todayAppointments.length > 0 ? (
                todayAppointments.map((appointment, index) => (
                  <AppointmentCard
                    key={index}
                    {...appointment}
                    userType="doctor"
                    onJoin={() => handleJoinCall(appointment)}
                    onCancel={() => handleCancel(appointment)}
                    onReschedule={() => handleRescheduleOpen(appointment)}
                    onComplete={() => handleComplete(appointment)}
                  />
                ))
              ) : (
                <div className="dashboard-card p-8 text-center">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">No appointments today</h3>
                  <p className="text-muted-foreground">Enjoy your free day!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="upcoming" className="mt-6">
            <div className="space-y-4">
              {upcomingAppointments.map((appointment, index) => (
                <AppointmentCard
                  key={index}
                  {...appointment}
                  userType="doctor"
                  onJoin={() => handleJoinCall(appointment)}
                  onCancel={() => handleCancel(appointment)}
                  onReschedule={() => handleRescheduleOpen(appointment)}
                  onComplete={() => handleComplete(appointment)}
                  showActions={!appointment.rescheduleRequested}
                  customActions={
                    appointment.rescheduleRequested ? (
                      <>
                        <Button size="sm" variant="hero" onClick={() => handleApproveReschedule(appointment)}>
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleRejectReschedule(appointment)}>
                          Reject
                        </Button>
                      </>
                    ) : undefined
                  }
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            <div className="space-y-4">
              {completedAppointments.map((appointment, index) => (
                <AppointmentCard
                  key={index}
                  {...appointment}
                  userType="doctor"
                  showActions={false}
                  customActions={
                    <>
                      <Button size="sm" variant="hero" onClick={() => handlePrescribe(appointment)}>
                        <Pill className="w-4 h-4 mr-2" />
                        Prescribe
                      </Button>
                      <Button size="sm" variant="outline" className="ml-2" onClick={() => handleLab(appointment)}>
                        Request Lab
                      </Button>
                    </>
                  }
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="cancelled" className="mt-6">
            <div className="space-y-4">
              {cancelledAppointments.length > 0 ? (
                cancelledAppointments.map((appointment, index) => (
                  <AppointmentCard
                    key={index}
                    {...appointment}
                    userType="doctor"
                    showActions={false}
                  />
                ))
              ) : (
                <div className="dashboard-card p-8 text-center">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-foreground">No cancelled appointments</h3>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <PrescriptionModal
        open={prescriptionModalOpen}
        onOpenChange={setPrescriptionModalOpen}
        appointment={selectedPrescriptionAppointment}
        onSubmit={async () => {
          import("@/services/api").then(async ({ appointmentsService }) => {
            try {
              await appointmentsService.doctorUpdateStatus(selectedPrescriptionAppointment.id, "COMPLETED");
            } catch {}
            loadAppointments();
          });
        }}
      />
      <RescheduleModal
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        appointmentDetails={selectedAppointment ? {
          patientName: selectedAppointment.patientName,
          doctorId: selectedAppointment.doctorId,
          currentDate: selectedAppointment.rawDate,
          currentTime: selectedAppointment.time,
        } : undefined}
        onConfirm={handleRescheduleConfirm}
      />
      <LabRequestModal
        open={labModalOpen}
        onOpenChange={setLabModalOpen}
        appointment={selectedLabAppointment}
        onSubmit={() => {
          // no status update necessary; labs will process independently
          toast.success("Lab request created");
        }}
      />
    </DashboardLayout>
  );
};

export default DoctorAppointments;
