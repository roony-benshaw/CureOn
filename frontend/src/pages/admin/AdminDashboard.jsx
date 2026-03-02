import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import { useUser } from "@/context/UserContext";
import { LayoutDashboard, Users, Calendar, Settings, Stethoscope, CheckCircle2, Clock, XCircle, Pill, FlaskConical } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { userService, appointmentsService } from "@/services/api";

const navItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Doctors", href: "/admin/doctors", icon: Stethoscope },
  { name: "Patients", href: "/admin/patients", icon: Users },
  { name: "Pharmacy", href: "/admin/pharmacy", icon: Pill },
  { name: "Labs", href: "/admin/labs", icon: FlaskConical },
  { name: "Appointments", href: "/admin/appointments", icon: Calendar },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

const AdminDashboard = () => {
  const { user } = useUser();
  const [users, setUsers] = useState([]);
  const [appts, setAppts] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [u, a] = await Promise.all([
          userService.list(),
          appointmentsService.adminAll(),
        ]);
        setUsers(u || []);
        setAppts(a || []);
      } catch {
        setUsers([]);
        setAppts([]);
      }
    };
    load();
  }, []);

  const totals = useMemo(() => {
    const totalUsers = users.length;
    const activeDoctors = (users || []).filter((u) => u.role === "DOCTOR" && u.is_active).length;
    const totalAppointments = appts.length;
    return { totalUsers, activeDoctors, totalAppointments };
  }, [users, appts]);

  const appointmentStats = useMemo(() => {
    const completed = (appts || []).filter((a) => a.status === "COMPLETED").length;
    const pending = (appts || []).filter((a) => a.status === "UPCOMING").length;
    const cancelled = (appts || []).filter((a) => a.status === "CANCELLED").length;
    return [
      { label: "Completed", value: completed, icon: CheckCircle2, color: "text-success" },
      { label: "Pending", value: pending, icon: Clock, color: "text-warning" },
      { label: "Cancelled", value: cancelled, icon: XCircle, color: "text-destructive" },
    ];
  }, [appts]);

  const quickSummary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const newPatientsToday = (users || []).filter((u) => u.role === "PATIENT" && (u.date_joined || "").slice(0, 10) === today).length;
    const activeConsultations = (appts || []).filter((a) => a.status === "UPCOMING" && (a.date || "") === today).length;
    const pendingVerifications = (users || []).filter((u) => !u.is_active).length;
    const systemHealth = "Good";
    return { newPatientsToday, activeConsultations, pendingVerifications, systemHealth };
  }, [users, appts]);

  return (
    <DashboardLayout navItems={navItems} userType="admin">
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">{user?.first_name || user?.username || "Admin"} 🛡️</h1>
          <p className="text-muted-foreground mt-1">Platform overview and management</p>
        </div>

        {/* Main Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          <StatCard title="Total Users" value={totals.totalUsers} icon={Users} iconColor="text-primary" iconBg="bg-primary/10" />
          <StatCard title="Active Doctors" value={totals.activeDoctors} icon={Stethoscope} iconColor="text-success" iconBg="bg-success/10" />
          <StatCard title="Total Appointments" value={totals.totalAppointments} icon={Calendar} iconColor="text-accent" iconBg="bg-accent/10" />
        </div>

        {/* Appointment Stats */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-foreground">Appointment Overview</h2>
            <div className="dashboard-card p-5 space-y-4">
              {appointmentStats.map((stat) => (
                <div key={stat.label} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    <span className="text-foreground">{stat.label}</span>
                  </div>
                  <span className="font-semibold text-foreground">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Summary */}
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-foreground">Quick Summary</h2>
            <div className="dashboard-card p-5 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10">
                <span className="text-foreground">New patients today</span>
                <span className="font-semibold text-primary">{quickSummary.newPatientsToday}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-success/5 border border-success/10">
                <span className="text-foreground">Active consultations</span>
                <span className="font-semibold text-success">{quickSummary.activeConsultations}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-warning/5 border border-warning/10">
                <span className="text-foreground">Pending verifications</span>
                <span className="font-semibold text-warning">{quickSummary.pendingVerifications}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-accent/5 border border-accent/10">
                <span className="text-foreground">System health</span>
                <span className="font-semibold text-accent">{quickSummary.systemHealth}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
