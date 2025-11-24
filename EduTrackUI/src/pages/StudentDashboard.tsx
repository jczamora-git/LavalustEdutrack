import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Bell, Award, TrendingUp, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { API_ENDPOINTS, apiGet } from "@/lib/api";
import { useNotificationContext } from "@/context/NotificationContext";
import { NotificationBell } from "@/components/NotificationBell";
import { useEffect } from "react";

const StudentDashboard = () => {
  const { user } = useAuth();
  const { notifications, addNotification } = useNotificationContext();
  const courses = [
    { id: 1, name: "Mathematics 101", teacher: "Dr. Smith", grade: 92, progress: 75, status: "active" },
    { id: 2, name: "Physics 201", teacher: "Prof. Johnson", grade: 88, progress: 60, status: "active" },
    { id: 3, name: "Computer Science", teacher: "Dr. Williams", grade: 95, progress: 80, status: "active" },
  ];

  const recentGrades = [
    { activity: "Midterm Exam", course: "Mathematics 101", grade: 95, date: "2025-01-15" },
    { activity: "Lab Report", course: "Physics 201", grade: 88, date: "2025-01-12" },
    { activity: "Programming Project", course: "Computer Science", grade: 98, date: "2025-01-10" },
  ];

  const sidebarNotifications = [
    { id: 1, message: "New assignment posted in Mathematics 101", time: "2 hours ago" },
    { id: 2, message: "Grade updated for Physics Lab Report", time: "1 day ago" },
  ];

  // Fetch announcements and add to global notifications (once)
  useEffect(() => {
    let mounted = true;
    const loadAnnouncements = async () => {
      try {
        const res = await apiGet(API_ENDPOINTS.ANNOUNCEMENTS);
        const list = res.data ?? res.announcements ?? res ?? [];

        const existingMsg = new Set(sidebarNotifications.map((n: any) => n.message));
        const existingIds = new Set<string | number>();
        // Include already-added global notification sourceIds and messages
        notifications.forEach((n: any) => {
          if (n.sourceId) existingIds.add(String(n.sourceId));
          if (n.message) existingMsg.add(n.message);
        });

        const matchesAudience = (aud: string | null | undefined) => {
          const role = user?.role ?? '';
          if (!aud) return true;
          const a = String(aud).toLowerCase();
          if (a === 'all') return true;
          if (role === 'student' && (a === 'students' || a === 'student')) return true;
          if (role === 'teacher' && (a === 'teachers' || a === 'teacher')) return true;
          if (role === 'admin') return true;
          return false;
        };

        (Array.isArray(list) ? list : []).forEach((a: any) => {
          if (!mounted) return;
          if (!matchesAudience(a.audience)) return;
          const msg = a.title ? `${a.title}: ${a.message ?? ''}` : (a.message ?? '');
          const sid = a.id ?? a._id ?? null;
          if (sid && existingIds.has(String(sid))) return; // already added
          if (!sid && existingMsg.has(msg)) return; // dedupe by message if no id

          // attach full announcement as meta and keep it persistent
          addNotification({ type: 'info', message: msg, duration: 0, meta: a, sourceId: sid, displayToast: false });
          if (sid) existingIds.add(String(sid));
          existingMsg.add(msg);
        });
      } catch (e) {
        // ignore fetch errors on dashboard
      }
    };

    loadAnnouncements();
    return () => { mounted = false; };
  }, []);

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              EduTrack
            </Link>
            <Badge variant="secondary">Student</Badge>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="text-right">
              <p className="text-sm font-medium">{user?.name}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name}!</h1>
          <p className="text-muted-foreground">Track your courses and academic progress</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Stats Cards */}
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Courses</p>
                <p className="text-2xl font-bold">{courses.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <Award className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average Grade</p>
                <p className="text-2xl font-bold">91.7%</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overall Progress</p>
                <p className="text-2xl font-bold">72%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Courses */}
            <Card>
              <CardHeader>
                <CardTitle>My Courses</CardTitle>
                <CardDescription>Your enrolled courses and progress</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {courses.map((course) => (
                  <div key={course.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{course.name}</h3>
                        <p className="text-sm text-muted-foreground">{course.teacher}</p>
                      </div>
                      <Badge variant="secondary" className="bg-success/10 text-success">
                        {course.grade}%
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{course.progress}%</span>
                      </div>
                      <Progress value={course.progress} className="h-2" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Grades */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Grades</CardTitle>
                <CardDescription>Your latest assessment results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentGrades.map((grade, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div>
                        <p className="font-medium">{grade.activity}</p>
                        <p className="text-sm text-muted-foreground">{grade.course}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-success">{grade.grade}%</p>
                        <p className="text-xs text-muted-foreground">{grade.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(sidebarNotifications.concat(notifications as any)).slice(0,6).map((notification: any, idx: number) => (
                  <div key={notification.id ?? idx} className="p-3 bg-muted rounded-lg">
                    <p className="text-sm mb-1">{notification.message}</p>
                    <p className="text-xs text-muted-foreground">{notification.time ?? (notification.timestamp ? new Date(notification.timestamp).toLocaleString() : '')}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Browse Courses
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Award className="h-4 w-4 mr-2" />
                  View All Grades
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
