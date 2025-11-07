import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar, TrendingUp, CheckCircle, Clock } from "lucide-react";

const MyProgress = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "student") {
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate]);

  const progress = [
    { course: "Mathematics 101", completed: 18, total: 24, percentage: 75, trend: "+5%" },
    { course: "Science 101", completed: 20, total: 24, percentage: 83, trend: "+8%" },
    { course: "English Literature", completed: 16, total: 24, percentage: 67, trend: "+3%" },
  ];

  if (!isAuthenticated) return null;

  return (
    <DashboardLayout>
      <div className="p-8 bg-gradient-to-b from-background to-muted/30 min-h-screen">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Progress</h1>
          <p className="text-muted-foreground text-lg">Track your learning journey</p>
        </div>

        {/* Overall Progress Card */}
        <Card className="mb-8 border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              Overall Progress
            </CardTitle>
            <CardDescription>Your completion status across all courses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {progress.map((item, index) => (
                <div key={index} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{item.course}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.completed} of {item.total} activities completed
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="flex items-center gap-2 text-success">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-sm font-semibold">{item.trend}</span>
                      </div>
                      <span className="text-2xl font-bold text-primary">{item.percentage}%</span>
                    </div>
                  </div>
                  <Progress value={item.percentage} className="h-3" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Attendance and Submission Rate Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200 bg-gradient-to-br from-success/5 to-success/10">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle className="h-5 w-5 text-success" />
                Attendance
              </CardTitle>
              <CardDescription>Your attendance record</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Days Present</span>
                  <span className="text-2xl font-bold text-success">42/45</span>
                </div>
                <Progress value={93} className="h-3 bg-success/20" />
                <div className="p-3 bg-success/10 rounded-lg border border-success/20">
                  <p className="text-sm text-success font-medium">✓ Excellent attendance! Keep it up.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-primary" />
                Submission Rate
              </CardTitle>
              <CardDescription>On-time assignment submissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">On-Time Submissions</span>
                  <span className="text-2xl font-bold text-primary">28/30</span>
                </div>
                <Progress value={93} className="h-3 bg-primary/20" />
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-sm text-primary font-medium">✓ Great time management!</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MyProgress;
