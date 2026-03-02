import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useUser } from "@/context/UserContext";
import LanguageSelector from "@/components/dashboard/LanguageSelector";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  Bell,
  Search,
  ChevronDown,
  LogOut,
  Settings,
  User,
  Stethoscope,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DashboardLayout = ({
  children,
  navItems,
  userType,
  userName: propUserName,
  userAvatar: propUserAvatar,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useUser();
  const { t } = useTranslation();
  
  const userName = user?.username || propUserName || "User";
  const userAvatar = propUserAvatar; // Fallback or use user.avatar if available later

  const userTypeLabels = {
    patient: "Patient",
    doctor: "Doctor",
    admin: "Administrator",
    pharmacy: "Pharmacy",
    labs: "Laboratory",
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar transform transition-transform duration-300 ease-in-out lg:translate-x-0 overflow-hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full border-r border-sidebar-border">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-lg text-sidebar-foreground">
                CureOn
              </span>
            </Link>
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-sidebar-accent"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5 text-sidebar-foreground" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className={`w-5 h-5 ${isActive ? "text-sidebar-primary" : ""}`} />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-background/95 backdrop-blur-sm border-b border-border flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-secondary"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Selector - Only for Patients */}
            {userType === 'patient' && <LanguageSelector />}

            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
            </button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    {userAvatar ? (
                      <img src={userAvatar} alt={userName} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-primary-foreground font-semibold text-sm">
                        {userName.charAt(0)}
                      </span>
                    )}
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="font-medium text-foreground">{userName}</p>
                  <p className="text-sm text-muted-foreground">{userTypeLabels[userType]}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(`/${userType}/profile`)}>
                  <User className="w-4 h-4 mr-2" />
                  {userType === 'patient' ? t('common.profile') : "Profile"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/${userType}/settings`)}>
                  <Settings className="w-4 h-4 mr-2" />
                  {userType === 'patient' ? t('common.settings') : "Settings"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  {userType === 'patient' ? t('common.logout') : "Logout"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};


export default DashboardLayout;
