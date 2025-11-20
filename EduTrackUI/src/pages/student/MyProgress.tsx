import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { API_ENDPOINTS, apiGet } from "@/lib/api";
import { Loader2 } from "lucide-react";

const MyProgress = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "student") {
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate]);

  const [progress, setProgress] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<{ present: number; total: number }>({ present: 0, total: 45 });
  const [submissionRate, setSubmissionRate] = useState<{ onTime: number; total: number }>({ onTime: 0, total: 0 });
  const [loadingProgress, setLoadingProgress] = useState(true);

  useEffect(() => {
    const loadProgress = async () => {
      if (!user?.id) return;
      setLoadingProgress(true);

      try {
        // Fetch student and then bulk activities with grades
        const studentRes = await apiGet(API_ENDPOINTS.STUDENT_BY_USER(user.id));
        const student = studentRes.data || studentRes.student || studentRes || null;
        if (!student || !student.id) {
          setProgress([]);
          setLoadingProgress(false);
          return;
        }

        const actsRes = await apiGet(`${API_ENDPOINTS.ACTIVITIES_STUDENT_ALL}?student_id=${student.id}`);
        const acts = actsRes.data || [];

        // Group activities by course_name
        const byCourse: Record<string, any[]> = {};
        for (const a of acts) {
          const course = a.course_name || a.course || 'Unassigned';
          if (!byCourse[course]) byCourse[course] = [];
          byCourse[course].push(a);
        }

        const progressArr = Object.entries(byCourse).map(([course, arr]) => {
          const total = arr.length;
          const completed = arr.filter(x => x.student_grade !== null && x.student_grade !== undefined).length;
          const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
          return { course, completed, total, percentage, trend: '' };
        });

        // Submission rate: count grade records and on-time submissions
        let totalSubmissions = 0;
        let onTime = 0;
        for (const a of acts) {
          if (a.grade_id) {
            totalSubmissions += 1;
            // compare grade_created_at to due_at when available
            if (a.grade_created_at && a.due_at) {
              const gradeAt = new Date(a.grade_created_at).getTime();
              const dueAt = new Date(a.due_at).getTime();
              if (!isNaN(gradeAt) && !isNaN(dueAt) && gradeAt <= dueAt) onTime += 1;
            }
          }
        }

        // Attendance approximation: scale completion to 45 days (fallback when no attendance API)
        const totalActivities = acts.length;
        const totalCompleted = acts.filter(x => x.student_grade !== null && x.student_grade !== undefined).length;
        const daysTotal = 45;
        const daysPresent = totalActivities > 0 ? Math.round((totalCompleted / totalActivities) * daysTotal) : 0;

        setProgress(progressArr);
        setSubmissionRate({ onTime, total: totalSubmissions });
        setAttendance({ present: daysPresent, total: daysTotal });
      } catch (err) {
        console.warn('Failed to load progress', err);
        setProgress([]);
      } finally {
        setLoadingProgress(false);
      }
    };

    if (isAuthenticated && user?.role === 'student') loadProgress();
  }, [user, isAuthenticated]);

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
