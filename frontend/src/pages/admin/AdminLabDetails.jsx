import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Stethoscope,
  Calendar,
  Settings,
  Mail,
  Phone,
  ArrowLeft,
  Users,
  Pill,
  FlaskConical,
  MapPin,
  Building2
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminService } from "@/services/api";

const navItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Doctors", href: "/admin/doctors", icon: Stethoscope },
  { name: "Patients", href: "/admin/patients", icon: Users },
  { name: "Pharmacy", href: "/admin/pharmacy", icon: Pill },
  { name: "Labs", href: "/admin/labs", icon: FlaskConical },
  { name: "Appointments", href: "/admin/appointments", icon: Calendar },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

const AdminLabDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lab, setLab] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const data = await adminService.getLabDetail(id);
        setLab(data);
      } catch (error) {
        console.error("Failed to fetch lab details", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (loading) {
    return <DashboardLayout navItems={navItems} userType="admin"><div>Loading...</div></DashboardLayout>;
  }

  if (!lab) {
    return <DashboardLayout navItems={navItems} userType="admin"><div>Lab not found</div></DashboardLayout>;
  }

  const name = lab.username;

  return (
    <DashboardLayout navItems={navItems} userType="admin">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/admin/labs")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Lab Details</h1>
            <p className="text-muted-foreground">View information and test requests</p>
          </div>
        </div>

        <div className="dashboard-card p-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-primary font-bold text-3xl">{name.charAt(0).toUpperCase()}</span>
            </div>
            
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground">{name}</h2>
                <p className="text-lg text-muted-foreground font-medium">License: {lab.license_number || "N/A"}</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-primary" />
                  <span>{lab.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-primary" />
                  <span>{lab.phone || "No phone"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>{lab.address || "No address"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span>Joined: {new Date(lab.date_joined).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            Lab Test Requests
          </h2>
          <div className="dashboard-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Tests</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Results</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lab.lab_requests && lab.lab_requests.length > 0 ? (
                  lab.lab_requests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>{new Date(req.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{req.patient_name}</TableCell>
                      <TableCell>{req.doctor_name}</TableCell>
                      <TableCell>{req.tests && req.tests.join(", ")}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          req.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                          req.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {req.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {req.attachment ? (
                          <a href={req.attachment} target="_blank" rel="noreferrer" className="text-primary hover:underline">View</a>
                        ) : req.result_value || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      No lab requests found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminLabDetails;
