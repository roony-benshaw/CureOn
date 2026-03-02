import React from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  History,
  Settings,
  Bell,
  Shield,
  CreditCard,
  Store
} from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/pharmacy/dashboard", icon: LayoutDashboard },
  { name: "Orders", href: "/pharmacy/orders", icon: ClipboardList },
  { name: "Inventory", href: "/pharmacy/inventory", icon: Package },
  { name: "History", href: "/pharmacy/history", icon: History },
  { name: "Settings", href: "/pharmacy/settings", icon: Settings },
];

const PharmacySettings = () => {
  const handleSave = () => {
    toast.success("Settings saved successfully");
  };

  const handleCancel = () => {
    toast.info("Changes discarded");
  };

  const handleChangePassword = () => {
    toast.success("Password update link sent to email");
  };

  return (
    <DashboardLayout navItems={navItems} userType="pharmacy">
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage pharmacy configuration and preferences
          </p>
        </div>

        {/* General Settings */}
        <div className="dashboard-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Store className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">
              General Configuration
            </h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pharmacyName">Pharmacy Name</Label>
                <Input id="pharmacyName" defaultValue="Central Pharmacy" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license">License Number</Label>
                <Input id="license" defaultValue="PH-12345" disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Contact Phone</Label>
                <Input id="phone" defaultValue="+1 (555) 999-8888" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Contact Email</Label>
                <Input id="email" defaultValue="pharmacy@cureon.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" defaultValue="Building B, Ground Floor, Medical Center" />
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="dashboard-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">
              Notification Preferences
            </h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">New Order Alerts</p>
                <p className="text-sm text-muted-foreground">Get notified when a new prescription order is received</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Low Stock Alerts</p>
                <p className="text-sm text-muted-foreground">Receive warnings when inventory falls below minimum levels</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Expiry Notifications</p>
                <p className="text-sm text-muted-foreground">Get alerted about medicines nearing expiry date</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="dashboard-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">
              Security & Access
            </h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input id="currentPassword" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" />
            </div>
            <Button variant="outline" className="mt-2" onClick={handleChangePassword}>Change Password</Button>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          <Button variant="hero" onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PharmacySettings;
