import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Clock, CheckCircle, BarChart3, AlertCircle } from "lucide-react";

const CourseDetails = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { courseId } = useParams();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "student") {
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate]);

  const courseInfo = {
    title: "Introduction to Computer Science",
    code: "CS101",
    instructor: "Dr. James Anderson",
    section: "Section A",
    credits: 3,
    semester: "Fall 2024",
  };

  const activities = [
    { title: "Programming Assignment 1", type: "Assignment", dueDate: "2025-01-25", status: "pending", score: null, maxScore: 100 },
    { title: "Midterm Exam", type: "Exam", dueDate: "2025-01-20", status: "graded", score: 85, maxScore: 100 },
    { title: "Quiz 1: Data Structures", type: "Quiz", dueDate: "2025-01-15", status: "graded", score: 45, maxScore: 50 },
    { title: "Group Project Proposal", type: "Project", dueDate: "2025-01-12", status: "graded", score: 92, maxScore: 100 },
  ];

  // Calculate course summary stats
  const courseSummary = useMemo(() => {
    const graded = activities.filter(a => a.status === "graded");
    const avgScore = graded.length > 0 
      ? graded.reduce((sum, a) => sum + (a.score ?? 0), 0) / graded.length 
      : 0;
    const completionRate = graded.length > 0 
      ? Math.round((graded.length / activities.length) * 100) 
      : 0;
    return { graded: graded.length, total: activities.length, avgScore, completionRate };
  }, [activities]);

  if (!isAuthenticated) return null;

  return (
    <DashboardLayout>
      <div className="p-8 bg-gradient-to-b from-background to-muted/30 min-h-screen">
        <Button variant="ghost" onClick={() => navigate("/student/courses")} className="mb-6 hover:bg-muted">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Courses
        </Button>

        <div className="grid gap-6">
          {/* Course Header Card */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-3xl font-bold mb-1">{courseInfo.title}</CardTitle>
                  <CardDescription className="text-base mb-2">
                    {courseInfo.code} • {courseInfo.section} • {courseInfo.credits} Credits
                  </CardDescription>
                  <p className="text-sm text-muted-foreground">
                    Instructor: <span className="font-medium text-foreground">{courseInfo.instructor}</span>
                  </p>
                </div>
                <Badge variant="secondary" className="text-sm px-3 py-1">{courseInfo.semester}</Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Course Summary Stats Card */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10 hover:shadow-md transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
                Course Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {/* Completion Rate */}
                <div className="text-center p-3 bg-card/50 rounded-lg border border-primary/20">
                  <p className="text-sm text-muted-foreground mb-1">Completion</p>
                  <p className="text-2xl font-bold text-primary">{courseSummary.completionRate}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {courseSummary.graded} of {courseSummary.total} graded
                  </p>
                </div>

                {/* Average Score */}
                <div className="text-center p-3 bg-card/50 rounded-lg border border-primary/20">
                  <p className="text-sm text-muted-foreground mb-1">Average Score</p>
                  <p className="text-2xl font-bold text-primary">
                    {courseSummary.avgScore > 0 ? courseSummary.avgScore.toFixed(0) : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {courseSummary.graded === 0 ? "No grades yet" : "out of 100"}
                  </p>
                </div>

                {/* Pending Items */}
                <div className="text-center p-3 bg-card/50 rounded-lg border border-primary/20">
                  <p className="text-sm text-muted-foreground mb-1">Pending</p>
                  <p className="text-2xl font-bold text-amber-600">{activities.length - courseSummary.graded}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    awaiting grading
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Course Activities Card */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5 text-primary" />
                Course Activities
              </CardTitle>
              <CardDescription>All assignments, exams, and projects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {activities.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-primary/5 transition-colors duration-150 group"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                        activity.status === "graded" 
                          ? "bg-success/10 text-success" 
                          : "bg-amber-100/70 text-amber-600 group-hover:bg-amber-100"
                      }`}>
                        {activity.status === "graded" ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <Clock className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{activity.title}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="px-2 py-1 bg-muted rounded">{activity.type}</span>
                          <span>Due: {activity.dueDate}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {activity.score !== null ? (
                        <div className="text-right bg-success/5 px-3 py-2 rounded-lg border border-success/20">
                          <p className="font-bold text-base text-success">
                            {activity.score}/{activity.maxScore}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {((activity.score / activity.maxScore) * 100).toFixed(0)}%
                          </p>
                        </div>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CourseDetails;
