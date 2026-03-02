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

const AdminPharmacyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pharmacy, setPharmacy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const data = await adminService.getPharmacyDetail(id);
        setPharmacy(data);
      } catch (error) {
        console.error("Failed to fetch pharmacy details", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (loading) {
    return <DashboardLayout navItems={navItems} userType="admin"><div>Loading...</div></DashboardLayout>;
  }

  if (!pharmacy) {
    return <DashboardLayout navItems={navItems} userType="admin"><div>Pharmacy not found</div></DashboardLayout>;
  }

  const name = pharmacy.username; 

  return (
    <DashboardLayout navItems={navItems} userType="admin">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/admin/pharmacy")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Pharmacy Details</h1>
            <p className="text-muted-foreground">View information and order history</p>
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
                <p className="text-lg text-muted-foreground font-medium">License: {pharmacy.license_number || "N/A"}</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-primary" />
                  <span>{pharmacy.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-primary" />
                  <span>{pharmacy.phone || "No phone"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>{pharmacy.address || "No address"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span>Joined: {new Date(pharmacy.date_joined).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
            <Pill className="w-5 h-5 text-primary" />
            Processed Prescriptions
          </h2>
          <div className="dashboard-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pharmacy.processed_prescriptions && pharmacy.processed_prescriptions.length > 0 ? (
                  pharmacy.processed_prescriptions.map((pres) => (
                    <TableRow key={pres.id}>
                      <TableCell>{new Date(pres.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{pres.patient_name}</TableCell>
                      <TableCell>{pres.doctor_name}</TableCell>
                      <TableCell>{pres.items?.length || 0} items</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          pres.pharmacy_status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                          pres.pharmacy_status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {pres.pharmacy_status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      No prescriptions processed yet.
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

export default AdminPharmacyDetails;
