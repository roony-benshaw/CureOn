import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import AppointmentCard from "@/components/dashboard/AppointmentCard";
import { useUser } from "@/context/UserContext";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Clock,
  Settings,
  UserCheck,
  Video,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { appointmentsService } from "@/services/api";

const navItems = [
  { name: "Dashboard", href: "/doctor/dashboard", icon: LayoutDashboard },
  { name: "Appointments", href: "/doctor/appointments", icon: Calendar },
  { name: "Patients", href: "/doctor/patients", icon: Users },
  { name: "Manage Availability", href: "/doctor/availability", icon: Clock },
  { name: "Settings", href: "/doctor/settings", icon: Settings },
];

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [availability, setAvailability] = useState([]);

  const mapType = (t) => (t === "IN_PERSON" ? "in-person" : "video");

  useEffect(() => {
    const load = async () => {
      try {
        const [appts, pats, avail] = await Promise.all([
          appointmentsService.doctorAppointments(),
          appointmentsService.doctorPatients(),
          appointmentsService.doctorAvailability.list(),
        ]);
        setAppointments(appts || []);
        setPatients(pats || []);
        setAvailability(avail || []);
      } catch {
        setAppointments([]);
        setPatients([]);
        setAvailability([]);
      }
    };
    load();
  }, []);

  const todayAppointments = useMemo(() => {
    const today = new Date();
    const isSameDay = (d) => {
      const dd = new Date(d);
      return dd.getFullYear() === today.getFullYear() && dd.getMonth() === today.getMonth() && dd.getDate() === today.getDate();
    };
    return (appointments || [])
      .filter((a) => a.status === "UPCOMING" && isSameDay(a.date))
      .map((a) => ({
        patientName: a.patient_name || "Patient",
        date: "Today",
        time: a.time_slot,
        type: mapType(a.visit_type),
        status: "upcoming",
      }));
  }, [appointments]);

  const stats = useMemo(() => {
    const todayCount = todayAppointments.length;
    const totalPatients = patients.length;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyConsults = (appointments || []).filter((a) => {
      const d = new Date(a.date);
      return a.status === "COMPLETED" && d >= monthStart && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return { todayCount, totalPatients, monthlyConsults };
  }, [todayAppointments, patients, appointments]);

  const generateSlotsCount = (start, end) => {
    // count 30-min slots
    const [sh, sm] = String(start).split(":").map((x) => parseInt(x, 10));
    const [eh, em] = String(end).split(":").map((x) => parseInt(x, 10));
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    return Math.max(0, Math.floor((endMin - startMin) / 30));
  };

  const weeklyOverview = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const slotsByDay = new Array(7).fill(0);
    availability.forEach((rng) => {
      const count = generateSlotsCount(rng.start_time, rng.end_time);
      slotsByDay[rng.weekday] += count;
    });
    const bookedByDay = new Array(7).fill(0);
    (appointments || []).forEach((a) => {
      const d = new Date(a.date);
      bookedByDay[d.getDay()] += 1;
    });
    return days.slice(1, 6).map((label, idx) => {
      const dayIndex = idx + 1; // Mon-Fri
      return { day: label, slots: slotsByDay[dayIndex] || 0, booked: bookedByDay[dayIndex] || 0 };
    });
  }, [availability, appointments]);

  return (
    <DashboardLayout
      navItems={navItems}
      userType="doctor"
    >
      <div className="space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
            Good morning, {user?.first_name || user?.username || "Doctor"}! 🩺
          </h1>
          <p className="text-muted-foreground mt-1">
            You have {stats.todayCount} appointments scheduled for today
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          <div onClick={() => navigate("/doctor/appointments")} className="cursor-pointer transition-transform hover:scale-105">
            <StatCard
              title="Today's Appointments"
              value={stats.todayCount}
              icon={Calendar}
              iconColor="text-primary"
              iconBg="bg-primary/10"
            />
          </div>
          <div onClick={() => navigate("/doctor/patients")} className="cursor-pointer transition-transform hover:scale-105">
            <StatCard
              title="Total Patients"
              value={stats.totalPatients}
              icon={UserCheck}
              iconColor="text-success"
              iconBg="bg-success/10"
            />
          </div>
          <div onClick={() => navigate("/doctor/appointments")} className="cursor-pointer transition-transform hover:scale-105">
            <StatCard
              title="Monthly Consultations"
              value={stats.monthlyConsults}
              icon={Video}
              iconColor="text-accent"
              iconBg="bg-accent/10"
            />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Today's Schedule */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-foreground">
                Today's Schedule
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigate("/doctor/appointments")}>
                View Full Schedule
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-4">
              {todayAppointments.map((appointment, index) => (
                <AppointmentCard
                  key={index}
                  {...appointment}
                  userType="doctor"
                />
              ))}
            </div>
          </div>

          {/* Weekly Overview */}
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Weekly Overview
            </h2>
            <div className="dashboard-card p-5">
              <div className="space-y-4">
                {weeklyOverview.map((day) => (
                  <div key={day.day} className="flex items-center gap-4">
                    <span className="w-10 text-sm font-medium text-muted-foreground">
                      {day.day}
                    </span>
                    <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${(day.booked / day.slots) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {day.booked}/{day.slots}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Weekly capacity</span>
                  <span className="font-medium text-foreground">
                    {(() => {
                      const totalSlots = weeklyOverview.reduce((s, d) => s + d.slots, 0);
                      const booked = weeklyOverview.reduce((s, d) => s + d.booked, 0);
                      const pct = totalSlots ? Math.round((booked / totalSlots) * 100) : 0;
                      return `${pct}%`;
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DoctorDashboard;
