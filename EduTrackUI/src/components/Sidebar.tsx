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
  Monitor,
  Menu,
  X
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
        "w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg transition-all text-xs sm:text-sm",
        isActive ? "bg-primary/10 text-primary" : "hover:bg-muted/80",
        !isOpen && "justify-center"
      )}
    >
      {icon}
      {isOpen && <span className="truncate hidden sm:inline">{label}</span>}
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    try {
      logout();
    } catch (e) {
      localStorage.removeItem("token");
      navigate("/auth");
    }
  };

  const adminLinks = [
    { to: "/admin/dashboard", icon: BarChart3, label: "Dashboard" },
    { to: "/admin/users", icon: Users, label: "Manage Users" },
    { to: "/admin/campuses", icon: School, label: "Campuses" },
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
    { to: "/teacher/attendance-qr", icon: Calendar, label: "Attendance QR" },
    { to: "/teacher/grades", icon: Award, label: "Grade Input" },
    { to: "/teacher/settings", icon: Settings, label: "Settings" },
  ];

  const studentLinks = [
    { to: "/student/dashboard", icon: BarChart3, label: "Dashboard" },
    { to: "/student/courses", icon: BookOpen, label: "My Courses" },
    { to: "/student/attendance-qr", icon: Calendar, label: "Attendance QR" },
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
    <>
      {/* Mobile Header with Hamburger */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-background border-b border-border z-30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/vector.png" alt="EduTrack logo" className="h-6 w-6" />
          <span className="text-lg font-bold text-blue-700">EduTrack</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="hover:bg-muted"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile Overlay Menu */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-20 top-14"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Slide-out Menu */}
      <div
        className={cn(
          "md:hidden fixed top-14 left-0 h-screen w-64 bg-background border-r border-border z-20 transform transition-transform duration-300 ease-in-out overflow-y-auto",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-4 space-y-1">
          {links.map((link) => {
            const Icon = link.icon as any;
            const isActive = location.pathname === link.to || location.pathname.startsWith(link.to + "/");
            const isManageUsers = link.to === "/admin/users";
            const isMenuExpanded = isManageUsers ? isManageUsersExpanded : expandedMenus[link.to] ?? true;

            return (
              <div key={link.to}>
                {isManageUsers && user?.role === "admin" ? (
                  <button
                    onClick={() => toggleMenu(link.to)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-sm",
                      isActive || isAdminSubmenuActive ? "bg-primary/10 text-primary" : "hover:bg-muted/80"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="flex-1 text-left">{link.label}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-300",
                        isMenuExpanded ? "rotate-0" : "-rotate-90"
                      )}
                    />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      navigate(link.to);
                      setMobileMenuOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-sm",
                      isActive ? "bg-primary/10 text-primary" : "hover:bg-muted/80"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="truncate">{link.label}</span>
                  </button>
                )}

                {isManageUsers && user?.role === "admin" && (
                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-300 ease-in-out",
                      isMenuExpanded ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
                    )}
                  >
                    <div className="mt-1 space-y-1 pl-6">
                      <button
                        onClick={() => {
                          navigate('/admin/users');
                          setMobileMenuOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 p-2 rounded-md text-sm hover:bg-muted/80 transition-colors",
                          location.pathname === '/admin/users' ? 'bg-primary/10 text-primary' : ''
                        )}
                      >
                        <Users className="h-4 w-4" />
                        <span>User Directory</span>
                      </button>
                      <button
                        onClick={() => {
                          navigate('/admin/users/teachers');
                          setMobileMenuOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 p-2 rounded-md text-sm hover:bg-muted/80 transition-colors",
                          location.pathname.startsWith('/admin/users/teachers') ? 'bg-primary/10 text-primary' : ''
                        )}
                      >
                        <GraduationCap className="h-4 w-4" />
                        <span>Manage Teachers</span>
                      </button>
                      <button
                        onClick={() => {
                          navigate('/admin/users/students');
                          setMobileMenuOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 p-2 rounded-md text-sm hover:bg-muted/80 transition-colors",
                          location.pathname.startsWith('/admin/users/students') ? 'bg-primary/10 text-primary' : ''
                        )}
                      >
                        <Users className="h-4 w-4" />
                        <span>Manage Students</span>
                      </button>
                      <button
                        onClick={() => {
                          navigate('/admin/users/subjects');
                          setMobileMenuOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 p-2 rounded-md text-sm hover:bg-muted/80 transition-colors",
                          location.pathname.startsWith('/admin/users/subjects') ? 'bg-primary/10 text-primary' : ''
                        )}
                      >
                        <BookOpen className="h-4 w-4" />
                        <span>Manage Subjects</span>
                      </button>
                      <button
                        onClick={() => {
                          navigate('/admin/users/sections');
                          setMobileMenuOpen(false);
                        }}
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
          <button
            onClick={cycleTheme}
            className="w-full flex items-center gap-2 p-3 rounded-lg text-sm text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all"
          >
            {getThemeIcon()}
            <span>{getThemeLabel()}</span>
          </button>
          <button
            onClick={() => {
              handleLogout();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-2 p-3 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div
        className={cn(
          "hidden md:flex sticky top-0 h-screen bg-background border-r border-border flex-col transition-all duration-300 z-20",
          isOpen ? "w-64" : "w-20"
        )}
      >
        <div className="p-4 sm:p-6 flex justify-between items-center">
          {isOpen && (
            <div className="flex items-center gap-2">
              <img src="/vector.png" alt="EduTrack logo" className="h-5 sm:h-6 w-5 sm:w-6" />
              <span className="text-lg sm:text-xl font-bold text-blue-700 truncate">EduTrack</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="hover:bg-muted"
          >
            <ChevronLeft className={cn("h-5 sm:h-6 w-5 sm:w-6", !isOpen && "rotate-180")} />
          </Button>
        </div>

        <div className="flex-1 px-2 sm:px-4 space-y-1 sm:space-y-2 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon as any;
            const isActive = location.pathname === link.to || location.pathname.startsWith(link.to + "/");
            const isManageUsers = link.to === "/admin/users";
            const isMenuExpanded = isManageUsers ? isManageUsersExpanded : expandedMenus[link.to] ?? true;
            
            return (
              <div key={link.to}>
                {isManageUsers && user?.role === "admin" && isOpen ? (
                  <button
                    onClick={() => {
                      toggleMenu(link.to);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg transition-all text-xs sm:text-sm",
                      isActive || isAdminSubmenuActive ? "bg-primary/10 text-primary" : "hover:bg-muted/80"
                    )}
                  >
                    <Icon className="h-4 sm:h-5 w-4 sm:w-5" />
                    <span className="truncate flex-1 text-left hidden sm:inline">{link.label}</span>
                    <ChevronDown
                      className={cn(
                        "h-3 sm:h-4 w-3 sm:w-4 transition-transform duration-300 hidden sm:block",
                        isMenuExpanded ? "rotate-0" : "-rotate-90"
                      )}
                    />
                  </button>
                ) : (
                  <SidebarItem
                    icon={<Icon className="h-5 w-5" />}
                    label={link.label}
                    href={link.to}
                    isActive={isActive}
                  />
                )}

                {isManageUsers && user?.role === "admin" && isOpen && (
                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-300 ease-in-out",
                      isMenuExpanded ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
                    )}
                  >
                    <div className="mt-1 space-y-1 pl-4 sm:pl-6">
                      <button
                        onClick={() => navigate('/admin/users')}
                        className={cn(
                          "w-full flex items-center gap-2 p-2 rounded-md text-xs sm:text-sm hover:bg-muted/80 transition-colors",
                          location.pathname === '/admin/users' ? 'bg-primary/10 text-primary' : ''
                        )}
                      >
                        <Users className="h-3 sm:h-4 w-3 sm:w-4" />
                        <span className="hidden sm:inline">User Directory</span>
                      </button>

                      <button
                        onClick={() => navigate('/admin/users/teachers')}
                        className={cn(
                          "w-full flex items-center gap-2 p-2 rounded-md text-xs sm:text-sm hover:bg-muted/80 transition-colors",
                          location.pathname.startsWith('/admin/users/teachers') ? 'bg-primary/10 text-primary' : ''
                        )}
                      >
                        <GraduationCap className="h-3 sm:h-4 w-3 sm:w-4" />
                        <span className="hidden sm:inline">Manage Teachers</span>
                      </button>

                      <button
                        onClick={() => navigate('/admin/users/students')}
                        className={cn(
                          "w-full flex items-center gap-2 p-2 rounded-md text-xs sm:text-sm hover:bg-muted/80 transition-colors",
                          location.pathname.startsWith('/admin/users/students') ? 'bg-primary/10 text-primary' : ''
                        )}
                      >
                        <Users className="h-3 sm:h-4 w-3 sm:w-4" />
                        <span className="hidden sm:inline">Manage Students</span>
                      </button>

                      <button
                        onClick={() => navigate('/admin/users/subjects')}
                        className={cn(
                          "w-full flex items-center gap-2 p-2 rounded-md text-xs sm:text-sm hover:bg-muted/80 transition-colors",
                          location.pathname.startsWith('/admin/users/subjects') ? 'bg-primary/10 text-primary' : ''
                        )}
                      >
                        <BookOpen className="h-3 sm:h-4 w-3 sm:w-4" />
                        <span className="hidden sm:inline">Manage Subjects</span>
                      </button>

                      <button
                        onClick={() => navigate('/admin/users/sections')}
                        className={cn(
                          "w-full flex items-center gap-2 p-2 rounded-md text-xs sm:text-sm hover:bg-muted/80 transition-colors",
                          location.pathname.startsWith('/admin/users/sections') ? 'bg-primary/10 text-primary' : ''
                        )}
                      >
                        <Grid3x3 className="h-3 sm:h-4 w-3 sm:w-4" />
                        <span className="hidden sm:inline">Manage Sections</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t p-2 sm:p-4 space-y-1 sm:space-y-2">
          <button
            onClick={cycleTheme}
            className={cn(
              "w-full flex items-center gap-2 p-2 sm:p-3 rounded-lg text-xs sm:text-sm text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all",
              !isOpen && "justify-center"
            )}
            title={isOpen ? undefined : getThemeLabel()}
          >
            {getThemeIcon()}
            {isOpen && <span className="hidden sm:inline">{getThemeLabel()}</span>}
          </button>

          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-2 p-2 sm:p-3 rounded-lg text-xs sm:text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all",
              !isOpen && "justify-center"
            )}
          >
            <LogOut className="h-4 sm:h-5 w-4 sm:w-5" />
            {isOpen && <span className="hidden sm:inline">Logout</span>}
          </button>
        </div>
      </div>
    </>
  );
};