import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, BookOpen, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";

interface CourseGrade {
  course: string;
  overall: string;
  grades: Array<{ activity: string; score: string; percentage: number; letter: string }>;
}

interface GradeCategory {
  name: string;
  weight: number;
  score: number;
  maxScore: number;
  percentage: number;
}

const CourseGradeDetail = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const courseData = location.state?.course as CourseGrade | undefined;
  const [currentTerm, setCurrentTerm] = useState<"midterm" | "finalterm">("midterm");

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "student") {
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate]);

  // Mock grade data for Midterm
  const midtermGrades: GradeCategory[] = [
    {
      name: "Written Works",
      weight: 30,
      score: 260,
      maxScore: 300,
      percentage: 86.67
    },
    {
      name: "Performance Tasks",
      weight: 40,
      score: 45,
      maxScore: 100,
      percentage: 45
    },
    {
      name: "Exam",
      weight: 30,
      score: 60,
      maxScore: 100,
      percentage: 60
    }
  ];

  // Mock grade data for Final Term
  const finaltermGrades: GradeCategory[] = [
    {
      name: "Written Works",
      weight: 30,
      score: 280,
      maxScore: 300,
      percentage: 93.33
    },
    {
      name: "Performance Tasks",
      weight: 40,
      score: 85,
      maxScore: 100,
      percentage: 85
    },
    {
      name: "Exam",
      weight: 30,
      score: 82,
      maxScore: 100,
      percentage: 82
    }
  ];

  const gradeBreakdown = currentTerm === "midterm" ? midtermGrades : finaltermGrades;

  // Calculate weighted score
  const calculateWeightedScore = () => {
    return (
      (gradeBreakdown[0].percentage * gradeBreakdown[0].weight) / 100 +
      (gradeBreakdown[1].percentage * gradeBreakdown[1].weight) / 100 +
      (gradeBreakdown[2].percentage * gradeBreakdown[2].weight) / 100
    ).toFixed(2);
  };

  // Calculate scores for both terms
  const midtermWeightedScore = parseFloat(
    (
      (midtermGrades[0].percentage * midtermGrades[0].weight) / 100 +
      (midtermGrades[1].percentage * midtermGrades[1].weight) / 100 +
      (midtermGrades[2].percentage * midtermGrades[2].weight) / 100
    ).toFixed(2)
  );

  const finaltermWeightedScore = parseFloat(
    (
      (finaltermGrades[0].percentage * finaltermGrades[0].weight) / 100 +
      (finaltermGrades[1].percentage * finaltermGrades[1].weight) / 100 +
      (finaltermGrades[2].percentage * finaltermGrades[2].weight) / 100
    ).toFixed(2)
  );

  // Final grade is average of midterm and final term
  const finalOverallGrade = parseFloat(((midtermWeightedScore + finaltermWeightedScore) / 2).toFixed(2));

  // Get color and indication based on final grade
  const getGradeColorAndIndication = (grade: number) => {
    if (grade <= 1.75) {
      return { color: "text-white", bgColor: "bg-green-600", borderColor: "border-green-600", indication: "Excellent" };
    } else if (grade <= 2.75) {
      return { color: "text-gray-900", bgColor: "bg-yellow-500", borderColor: "border-yellow-500", indication: "Good" };
    } else if (grade <= 3.00) {
      return { color: "text-white", bgColor: "bg-blue-600", borderColor: "border-blue-600", indication: "Passing" };
    } else {
      return { color: "text-white", bgColor: "bg-red-600", borderColor: "border-red-600", indication: "Fail" };
    }
  };

  const finalGradeStyle = getGradeColorAndIndication(finalOverallGrade);

  // Transmute to DepEd scale
  const transmute = (percentage: number): string => {
    if (percentage >= 97) return "1.00";
    if (percentage >= 94) return "1.25";
    if (percentage >= 91) return "1.50";
    if (percentage >= 88) return "1.75";
    if (percentage >= 85) return "2.00";
    if (percentage >= 82) return "2.25";
    if (percentage >= 79) return "2.50";
    if (percentage >= 76) return "2.75";
    if (percentage >= 75) return "3.00";
    return "5.00";
  };

  const weightedScore = parseFloat(calculateWeightedScore());
  const finalGrade = transmute(weightedScore);

  if (!isAuthenticated) return null;

  if (!courseData) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <Button variant="ghost" onClick={() => navigate("/student/grades")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Grades
          </Button>
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No course data available. Please select a course from the grades page.</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 bg-gradient-to-b from-background to-muted/30 min-h-screen">
        <Button variant="ghost" onClick={() => navigate("/student/grades")} className="mb-6 hover:bg-muted">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Grades
        </Button>

        {/* Course Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">{courseData.course}</h1>
              <p className="text-muted-foreground text-lg">Your detailed grade breakdown</p>
            </div>
            <Badge className="bg-success text-success-foreground text-lg px-4 py-2">
              {finalGrade}
            </Badge>
          </div>
        </div>

        {/* Semester Term Toggle */}
        <div className="mb-8 flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Semester Term:</span>
          <div className="flex gap-2">
            <Button
              variant={currentTerm === "midterm" ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentTerm("midterm")}
              className="px-4"
            >
              {currentTerm === "midterm" && <CheckCircle className="h-4 w-4 mr-2" />}
              Midterm
            </Button>
            <Button
              variant={currentTerm === "finalterm" ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentTerm("finalterm")}
              className="px-4"
            >
              {currentTerm === "finalterm" && <CheckCircle className="h-4 w-4 mr-2" />}
              Final Term
            </Button>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Weighted Average</p>
                  <p className="text-3xl font-bold text-primary">{weightedScore}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Final Grade</p>
                  <p className="text-3xl font-bold text-success">{finalGrade}</p>
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
                  <p className="text-sm text-muted-foreground">Letter Grade</p>
                  <p className="text-3xl font-bold text-accent">{courseData.overall}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Grade Components Breakdown */}
        <div className="space-y-6">
          {gradeBreakdown.map((category, idx) => {
            const componentWeightedScore = (category.percentage * category.weight) / 100;
            return (
              <Card key={idx} className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">{category.name}</CardTitle>
                      <CardDescription>Weight: {category.weight}% of final grade</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-base px-3 py-1">
                      {category.percentage.toFixed(0)}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Score Display */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <p className="text-sm text-muted-foreground mb-1">Your Score</p>
                      <p className="text-2xl font-bold text-primary">
                        {category.score}/{category.maxScore}
                      </p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg border border-border">
                      <p className="text-sm text-muted-foreground mb-1">Percentage</p>
                      <p className="text-2xl font-bold">{category.percentage.toFixed(2)}%</p>
                    </div>
                    <div className="p-4 bg-accent/5 rounded-lg border border-accent/20">
                      <p className="text-sm text-muted-foreground mb-1">Weighted Score</p>
                      <p className="text-2xl font-bold text-accent">{componentWeightedScore.toFixed(2)}%</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Progress</span>
                      <span className="text-muted-foreground">{category.percentage.toFixed(1)}% complete</span>
                    </div>
                    <Progress value={category.percentage} className="h-3" />
                  </div>

                  {/* Status Message */}
                  <div className={`p-3 rounded-lg border ${
                    category.percentage >= 75 
                      ? "bg-success/10 border-success/20 text-success" 
                      : category.percentage >= 60
                      ? "bg-amber-100/70 border-amber-200 text-amber-700"
                      : "bg-destructive/10 border-destructive/20 text-destructive"
                  }`}>
                    <p className="text-sm font-medium">
                      {category.percentage >= 75 
                        ? "✓ Good performance in this category" 
                        : category.percentage >= 60
                        ? "⚠ You're doing okay, but there's room for improvement"
                        : "✕ Needs attention - work on this category"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Summary Card */}
        <Card className="mt-8 border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Grade Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg">
                <span className="font-medium">Midterm Grade</span>
                <span className="text-lg font-bold text-primary">{transmute(midtermWeightedScore)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg">
                <span className="font-medium">Final Term Grade</span>
                <span className="text-lg font-bold text-primary">{transmute(finaltermWeightedScore)}</span>
              </div>
              <div className={`flex items-center justify-between p-4 rounded-lg border-2 ${finalGradeStyle.bgColor} ${finalGradeStyle.borderColor}`}>
                <div>
                  <span className={`font-bold ${finalGradeStyle.color}`}>Final Grade</span>
                  <p className={`text-sm ${finalGradeStyle.color} opacity-90`}>{finalGradeStyle.indication}</p>
                </div>
                <span className={`text-2xl font-bold ${finalGradeStyle.color}`}>{transmute(finalOverallGrade)}</span>
              </div>
              {/* Letter Grade removed per request - showing term grades and final average only */}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CourseGradeDetail;
