import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, GraduationCap, Settings, LogOut, Plus, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";

const AdminDashboard = () => {
  const { user } = useAuth();
  const stats = [
    { label: "Total Students", value: "1,234", icon: Users, color: "primary" },
    { label: "Total Teachers", value: "89", icon: GraduationCap, color: "accent" },
    { label: "Active Courses", value: "156", icon: BookOpen, color: "success" },
    { label: "System Health", value: "98%", icon: TrendingUp, color: "warning" },
  ];

  const recentUsers = [
    { name: "John Smith", role: "teacher", email: "john.smith@edu.com", date: "2025-01-15" },
    { name: "Sarah Davis", role: "student", email: "sarah.davis@edu.com", date: "2025-01-15" },
    { name: "Mike Wilson", role: "teacher", email: "mike.wilson@edu.com", date: "2025-01-14" },
  ];

  const systemSettings = [
    { name: "Grading System", status: "configured", description: "Unified grading policy active" },
    { name: "User Permissions", status: "active", description: "Role-based access control enabled" },
    { name: "Email Notifications", status: "active", description: "Automated alerts configured" },
  ];

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome, {user?.name}</h1>
            <p className="text-muted-foreground">System overview and management</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create User
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon as any;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg bg-${stat.color}/10 flex items-center justify-center`}>
                      <Icon className={`h-6 w-6 text-${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* User Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Recently created accounts</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">View All</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentUsers.map((user, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="font-semibold text-primary">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant="secondary" 
                          className={user.role === 'teacher' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'}
                        >
                          {user.role}
                        </Badge>
                        <p className="text-xs text-muted-foreground">{user.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Teacher View */}
            <Card>
              <CardHeader>
                <CardTitle>Teacher Overview</CardTitle>
                <CardDescription>Performance metrics and activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 border border-border rounded-lg text-center">
                    <p className="text-2xl font-bold text-primary">89</p>
                    <p className="text-sm text-muted-foreground mt-1">Active Teachers</p>
                  </div>
                  <div className="p-4 border border-border rounded-lg text-center">
                    <p className="text-2xl font-bold text-accent">156</p>
                    <p className="text-sm text-muted-foreground mt-1">Courses Created</p>
                  </div>
                  <div className="p-4 border border-border rounded-lg text-center">
                    <p className="text-2xl font-bold text-success">87%</p>
                    <p className="text-sm text-muted-foreground mt-1">Avg Engagement</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Student View */}
            <Card>
              <CardHeader>
                <CardTitle>Student Overview</CardTitle>
                <CardDescription>Enrollment and performance stats</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 border border-border rounded-lg text-center">
                    <p className="text-2xl font-bold text-primary">1,234</p>
                    <p className="text-sm text-muted-foreground mt-1">Total Students</p>
                  </div>
                  <div className="p-4 border border-border rounded-lg text-center">
                    <p className="text-2xl font-bold text-success">92%</p>
                    <p className="text-sm text-muted-foreground mt-1">Active Rate</p>
                  </div>
                  <div className="p-4 border border-border rounded-lg text-center">
                    <p className="text-2xl font-bold text-accent">85%</p>
                    <p className="text-sm text-muted-foreground mt-1">Avg Grade</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* System Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {systemSettings.map((setting, index) => (
                  <div key={index} className="p-3 border border-border rounded-lg">
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-medium text-sm">{setting.name}</p>
                      <Badge variant="secondary" className="bg-success/10 text-success text-xs">
                        {setting.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{setting.description}</p>
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
                  <Plus className="h-4 w-4 mr-2" />
                  Create Teacher Account
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Student Account
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Grading System
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  View All Users
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
