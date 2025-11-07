import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Users,
  BookOpen,
  GraduationCap,
  Settings,
  Bell,
  CreditCard,
  FileText,
  UserPlus,
  ClipboardList,
  BarChart3,
  Calendar,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const RoleBasedNav = () => {
  const { user } = useAuth();
  const location = useLocation();

  const adminLinks = [
    { to: "/admin", icon: BarChart3, label: "Dashboard" },
    { to: "/admin/users", icon: Users, label: "Manage Users" },
    { to: "/admin/grading", icon: Award, label: "Grading System" },
    { to: "/admin/assignments", icon: ClipboardList, label: "Teacher & Subject Management" },
    { to: "/admin/announcements", icon: Bell, label: "Announcements" },
    { to: "/admin/payments", icon: CreditCard, label: "Payments" },
    { to: "/admin/pdf", icon: FileText, label: "PDF Generation" },
  ];

  const teacherLinks = [
    { to: "/teacher", icon: BarChart3, label: "Dashboard" },
    { to: "/teacher/courses", icon: BookOpen, label: "My Courses" },
    { to: "/teacher/activities", icon: ClipboardList, label: "Activities" },
    { to: "/teacher/students", icon: Users, label: "Manage Students" },
    { to: "/teacher/grades", icon: Award, label: "Grade Input" },
  ];

  const studentLinks = [
    { to: "/student", icon: BarChart3, label: "Dashboard" },
    { to: "/student/courses", icon: BookOpen, label: "My Courses" },
    { to: "/student/activities", icon: ClipboardList, label: "Activities" },
    { to: "/student/grades", icon: Award, label: "My Grades" },
    { to: "/student/progress", icon: Calendar, label: "Progress" },
  ];

  const getLinks = () => {
    switch (user?.role) {
      case "admin":
        return adminLinks;
      case "teacher":
        return teacherLinks;
      case "student":
        return studentLinks;
      default:
        return [];
    }
  };

  const links = getLinks();

  return (
    <nav className="w-64 border-r border-border bg-card min-h-screen p-4">
      <div className="space-y-2">
        {links.map((link) => {
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <link.icon className="h-5 w-5" />
              <span className="font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
