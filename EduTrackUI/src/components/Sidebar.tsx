import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { useSidebar } from "@/hooks/use-sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  School,
  Bell,
  CreditCard,
  FileText,
  Settings,
  ChevronLeft,
  ChevronDown,
  LogOut,
  BarChart3,
  ClipboardList,
  Award,
  Calendar,
  BookOpen,
  Grid3x3,
  Sun,
  Moon,
  Monitor
} from "lucide-react";

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive?: boolean;
}

const SidebarItem = ({ icon, label, href, isActive }: SidebarItemProps) => {
  const navigate = useNavigate();
  const { isOpen } = useSidebar();
  return (
    <button
      onClick={() => navigate(href)}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-sm",
        isActive ? "bg-primary/10 text-primary" : "hover:bg-muted/80",
        !isOpen && "justify-center"
      )}
    >
      {icon}
      {isOpen && <span className="truncate">{label}</span>}
    </button>
  );
};

export const Sidebar = () => {
  const { isOpen, toggle } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  // Check if any admin submenu is active (includes the main users page)
  const isAdminSubmenuActive = location.pathname.startsWith('/admin/users');

  // Auto-expand submenu if active; collapse by default
  const isManageUsersExpanded = expandedMenus['/admin/users'] ?? isAdminSubmenuActive;

  const toggleMenu = (menuId: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-5 w-5" />;
      case 'dark':
        return <Moon className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light Mode';
      case 'dark':
        return 'Dark Mode';
      default:
        return 'System';
    }
  };

  const handleLogout = () => {
    // Prefer centralized auth logout which already redirects to /auth
    try {
      logout();
    } catch (e) {
      // fallback: clear token and redirect to auth
      localStorage.removeItem("token");
      navigate("/auth");
    }
  };

  const adminLinks = [
    { to: "/admin/dashboard", icon: BarChart3, label: "Dashboard" },
    { to: "/admin/users", icon: Users, label: "Manage Users" },
    { to: "/admin/grading", icon: Award, label: "Grading System" },
    { to: "/admin/announcements", icon: Bell, label: "Announcements" },
    { to: "/admin/payments", icon: CreditCard, label: "Payments" },
    { to: "/admin/pdf", icon: FileText, label: "PDF Generation" },
    { to: "/admin/settings", icon: Settings, label: "Settings" },
  ];

  const teacherLinks = [
    { to: "/teacher/dashboard", icon: BarChart3, label: "Dashboard" },
    { to: "/teacher/courses", icon: BookOpen, label: "My Courses" },
    { to: "/teacher/activities", icon: ClipboardList, label: "Activities" },
    { to: "/teacher/students", icon: Users, label: "Manage Students" },
    { to: "/teacher/grades", icon: Award, label: "Grade Input" },
    { to: "/teacher/settings", icon: Settings, label: "Settings" },
  ];

  const studentLinks = [
    { to: "/student/dashboard", icon: BarChart3, label: "Dashboard" },
    { to: "/student/courses", icon: BookOpen, label: "My Courses" },
    { to: "/student/activities", icon: ClipboardList, label: "Activities" },
    { to: "/student/grades", icon: Award, label: "My Grades" },
    { to: "/student/progress", icon: Calendar, label: "Progress" },
    { to: "/student/settings", icon: Settings, label: "Settings" },
  ];

  // Determine links from the authenticated user's role. If no role, return an empty list.
  const links = (() => {
    const role = user?.role;
    switch (role) {
      case "admin":
        return adminLinks;
      case "teacher":
        return teacherLinks;
      case "student":
        return studentLinks;
      default:
        return [];
    }
  })();

  return (
    <div
      className={cn(
        // make the sidebar sticky so it doesn't scroll with the main content
        "sticky top-0 h-screen bg-background border-r border-border flex flex-col transition-all duration-300 z-20",
        isOpen ? "w-64" : "w-20"
      )}
    >
      <div className="p-6 flex justify-between items-center">
        {isOpen && (
          <div className="flex items-center gap-2">
            <img src="/vector.png" alt="EduTrack logo" className="h-6 w-6" />
            <span className="text-xl font-bold text-blue-700">EduTrack</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="hover:bg-muted"
        >
          <ChevronLeft className={cn("h-6 w-6", !isOpen && "rotate-180")} />
        </Button>
      </div>

      <div className="flex-1 px-4 space-y-2 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon as any;
          const isActive = location.pathname === link.to || location.pathname.startsWith(link.to + "/");
          const isManageUsers = link.to === "/admin/users";
          const isMenuExpanded = isManageUsers ? isManageUsersExpanded : expandedMenus[link.to] ?? true;
          
          return (
            <div key={link.to}>
              {isManageUsers && user?.role === "admin" && isOpen ? (
                // Render collapsible button for Manage Users
                <button
                  onClick={() => {
                    toggleMenu(link.to);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-sm",
                    isActive || isAdminSubmenuActive ? "bg-primary/10 text-primary" : "hover:bg-muted/80"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="truncate flex-1 text-left">{link.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-300",
                      isMenuExpanded ? "rotate-0" : "-rotate-90"
                    )}
                  />
                </button>
              ) : (
                // Regular link item
                <SidebarItem
                  icon={<Icon className="h-5 w-5" />}
                  label={link.label}
                  href={link.to}
                  isActive={isActive}
                />
              )}

              {/* Animated submenu for Manage Users */}
              {isManageUsers && user?.role === "admin" && isOpen && (
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-300 ease-in-out",
                    isMenuExpanded ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  <div className="mt-1 space-y-1 pl-6">
                    <button
                      onClick={() => navigate('/admin/users')}
                      className={cn(
                        "w-full flex items-center gap-2 p-2 rounded-md text-sm hover:bg-muted/80 transition-colors",
                        location.pathname === '/admin/users' ? 'bg-primary/10 text-primary' : ''
                      )}
                    >
                      <Users className="h-4 w-4" />
                      <span>User Directory</span>
                    </button>

                    <button
                      onClick={() => navigate('/admin/users/teachers')}
                      className={cn(
                        "w-full flex items-center gap-2 p-2 rounded-md text-sm hover:bg-muted/80 transition-colors",
                        location.pathname.startsWith('/admin/users/teachers') ? 'bg-primary/10 text-primary' : ''
                      )}
                    >
                      <GraduationCap className="h-4 w-4" />
                      <span>Manage Teachers</span>
                    </button>

                    <button
                      onClick={() => navigate('/admin/users/students')}
                      className={cn(
                        "w-full flex items-center gap-2 p-2 rounded-md text-sm hover:bg-muted/80 transition-colors",
                        location.pathname.startsWith('/admin/users/students') ? 'bg-primary/10 text-primary' : ''
                      )}
                    >
                      <Users className="h-4 w-4" />
                      <span>Manage Students</span>
                    </button>

                    <button
                      onClick={() => navigate('/admin/users/subjects')}
                      className={cn(
                        "w-full flex items-center gap-2 p-2 rounded-md text-sm hover:bg-muted/80 transition-colors",
                        location.pathname.startsWith('/admin/users/subjects') ? 'bg-primary/10 text-primary' : ''
                      )}
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>Manage Subjects</span>
                    </button>

                    <button
                      onClick={() => navigate('/admin/users/sections')}
                      className={cn(
                        "w-full flex items-center gap-2 p-2 rounded-md text-sm hover:bg-muted/80 transition-colors",
                        location.pathname.startsWith('/admin/users/sections') ? 'bg-primary/10 text-primary' : ''
                      )}
                    >
                      <Grid3x3 className="h-4 w-4" />
                      <span>Manage Sections</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t p-4 space-y-2">
        {/* Theme Toggle */}
        <button
          onClick={cycleTheme}
          className={cn(
            "w-full flex items-center gap-2 p-3 rounded-lg text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all",
            !isOpen && "justify-center"
          )}
          title={isOpen ? undefined : getThemeLabel()}
        >
          {getThemeIcon()}
          {isOpen && <span>{getThemeLabel()}</span>}
        </button>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-2 p-3 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all",
            !isOpen && "justify-center"
          )}
        >
          <LogOut className="h-5 w-5" />
          {isOpen && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
};