import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, TrendingUp, BookOpen, List, LayoutGrid } from "lucide-react";

const MyGrades = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "student") {
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate]);

  const grades = [
    {
      course: "Mathematics 101",
      grades: [
        { activity: "Quiz 1", score: "48/50", percentage: 96, letter: "A" },
        { activity: "Midterm", score: "85/100", percentage: 85, letter: "B+" },
      ],
      overall: "A",
    },
    {
      course: "Science 101",
      grades: [
        { activity: "Lab Report 1", score: "45/50", percentage: 90, letter: "A-" },
        { activity: "Quiz 1", score: "42/50", percentage: 84, letter: "B" },
      ],
      overall: "A-",
    },
  ];

  if (!isAuthenticated) return null;

  return (
    <DashboardLayout>
      <div className="p-8 bg-gradient-to-b from-background to-muted/30 min-h-screen">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Grades</h1>
          <p className="text-muted-foreground text-lg">View your academic performance</p>
        </div>

        {/* Grade Summary Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                  <Award className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Overall GPA</p>
                  <p className="text-3xl font-bold text-success">3.8</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average Grade</p>
                  <p className="text-3xl font-bold text-primary">A-</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-3xl font-bold text-accent">24/30</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Courses Section Header with View Toggle */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Course Grades</h2>
          <Button
            aria-pressed={viewMode === "grid"}
            title="Toggle list / grid"
            variant="outline"
            size="sm"
            onClick={() => setViewMode((v) => (v === "list" ? "grid" : "list"))}
            className="text-xs flex items-center gap-1 h-9"
          >
            {viewMode === "list" ? (
              <LayoutGrid className="h-4 w-4" />
            ) : (
              <List className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Courses Grid or List */}
        {viewMode === "list" ? (
          <div className="space-y-6">
            {grades.map((courseGrade, index) => (
              <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{courseGrade.course}</CardTitle>
                    <Badge className="bg-success text-success-foreground text-lg px-4 py-1">
                      {courseGrade.overall}
                    </Badge>
                  </div>
                  <CardDescription>Detailed grade breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    {courseGrade.grades.map((grade, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-primary/5 transition-colors"
                      >
                        <div>
                          <p className="font-semibold">{grade.activity}</p>
                          <p className="text-sm text-muted-foreground">{grade.score}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-semibold text-lg text-primary">{grade.percentage}%</p>
                          </div>
                          <Badge className="min-w-[3rem] bg-success/10 text-success border-success/20">
                            {grade.letter}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full" 
                    onClick={() => navigate('/student/course-grade-detail', { state: { course: courseGrade } })}
                  >
                    View Full Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
            {grades.map((courseGrade, index) => (
              <Card key={index} className="border-0 shadow-sm hover:shadow-lg transition-shadow duration-200 flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{courseGrade.course}</CardTitle>
                      <CardDescription className="mt-1">Grade breakdown</CardDescription>
                    </div>
                    <Badge className="bg-success text-success-foreground text-base px-3 py-1 flex-shrink-0">
                      {courseGrade.overall}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="space-y-3 flex-1">
                    {courseGrade.grades.map((grade, idx) => (
                      <div key={idx} className="p-3 border border-border rounded-lg hover:bg-primary/5 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-sm">{grade.activity}</p>
                          <Badge className="bg-success/10 text-success border-success/20 text-xs">
                            {grade.letter}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{grade.score}</span>
                          <span className="font-semibold text-primary">{grade.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="w-full mt-4" 
                    onClick={() => navigate('/student/course-grade-detail', { state: { course: courseGrade } })}
                  >
                    View Full Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MyGrades;
