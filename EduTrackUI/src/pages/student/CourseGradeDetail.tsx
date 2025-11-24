import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, BookOpen, CheckCircle, AlertCircle, TrendingUp, Loader2 } from "lucide-react";
import { API_ENDPOINTS, apiGet } from "@/lib/api";

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
  const { courseId } = useParams<{ courseId: string }>();
  const [currentTerm, setCurrentTerm] = useState<"midterm" | "finalterm">("midterm");
  const [loading, setLoading] = useState(true);
  const [courseInfo, setCourseInfo] = useState<any>(null);
  const [midtermGrades, setMidtermGrades] = useState<GradeCategory[]>([]);
  const [finaltermGrades, setFinaltermGrades] = useState<GradeCategory[]>([]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "student") {
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate]);

  // OPTIMIZED: Fetch grade category data for a specific course and academic period
  const fetchGradesForPeriod = async (periodType: 'Midterm' | 'Final Term', allActivities: any[], sectionId: number, studentId: number): Promise<GradeCategory[]> => {
    try {
      // Filter activities by period type
      const periodActivities = allActivities.filter((a: any) => {
        const actPeriodType = a.period_type || a.academic_period?.period_type;
        return actPeriodType === periodType;
      });

      // Categorize activities (matching teacher's GradeInputEdit logic)
      const writtenWorks = periodActivities.filter((a: any) => {
        const type = (a.type || '').toLowerCase();
        return ['quiz', 'assignment', 'other'].includes(type);
      });
      
      const performanceTasks = periodActivities.filter((a: any) => {
        const type = (a.type || '').toLowerCase();
        return ['project', 'laboratory', 'performance'].includes(type);
      });
      
      const exams = periodActivities.filter((a: any) => {
        const type = (a.type || '').toLowerCase();
        return type === 'exam';
      });

      // OPTIMIZED: Calculate grades from activities that already have student_grade embedded
      const calculateGradesForActivities = (acts: any[]) => {
        let totalScore = 0;
        let totalMaxScore = 0;
        for (const act of acts) {
          // Use the embedded student_grade from the optimized endpoint
          if (act.student_grade !== null && act.student_grade !== undefined) {
            totalScore += parseFloat(act.student_grade);
          }
          totalMaxScore += parseFloat(act.max_score || 0);
        }
        return { totalScore, totalMaxScore };
      };

      const writtenData = calculateGradesForActivities(writtenWorks);
      const performanceData = calculateGradesForActivities(performanceTasks);
      const examData = calculateGradesForActivities(exams);

      const categories: GradeCategory[] = [
        {
          name: "Written Works",
          weight: 30,
          score: writtenData.totalScore,
          maxScore: writtenData.totalMaxScore || 1,
          percentage: writtenData.totalMaxScore > 0 ? (writtenData.totalScore / writtenData.totalMaxScore) * 100 : 0
        },
        {
          name: "Performance Tasks",
          weight: 40,
          score: performanceData.totalScore,
          maxScore: performanceData.totalMaxScore || 1,
          percentage: performanceData.totalMaxScore > 0 ? (performanceData.totalScore / performanceData.totalMaxScore) * 100 : 0
        },
        {
          name: "Exam",
          weight: 30,
          score: examData.totalScore,
          maxScore: examData.totalMaxScore || 1,
          percentage: examData.totalMaxScore > 0 ? (examData.totalScore / examData.totalMaxScore) * 100 : 0
        }
      ];

      return categories;
    } catch (error) {
      console.error("Error fetching grades for period:", error);
      return [];
    }
  };

  // Main data fetch
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || !courseId) return;
      setLoading(true);

      try {
        // 1) Get student to find section_id
        const studentRes = await apiGet(API_ENDPOINTS.STUDENT_BY_USER(user.id));
        const student = studentRes.data || studentRes.student || studentRes || null;
        if (!student?.id) {
          console.error("Student not found");
          setLoading(false);
          return;
        }
        const sectionId = student?.section_id ?? student?.sectionId ?? null;

        // 2) Get all academic periods
        const periodsRes = await apiGet(API_ENDPOINTS.ACADEMIC_PERIODS);
        const periods = Array.isArray(periodsRes) ? periodsRes : (periodsRes.data || []);

        // 3) Prefer fetching the subject by id directly when the route param is a subject id
        let subjectId: any = null;
        let subject: any = null;
        try {
          const subjectUrl = API_ENDPOINTS.SUBJECT_BY_ID(courseId);
          console.debug('[CourseGradeDetail] Fetching subject by id:', subjectUrl);
          const trySubject = await apiGet(subjectUrl);
          console.debug('[CourseGradeDetail] SUBJECT response:', trySubject);
          const s = trySubject?.data || trySubject?.subject || trySubject || null;
          if (s && (s.id || s.course_name)) {
            subjectId = s.id ?? courseId;
            subject = s;
          }
        } catch (err) {
          console.warn('[CourseGradeDetail] SUBJECT fetch failed, will resolve via assignments:', err);
        }

        // If subject wasn't found directly, fall back to teacher assignments for this student's section
        let courseAssignment: any = null;
        if (!subjectId) {
          const taUrl = `${API_ENDPOINTS.TEACHER_ASSIGNMENTS_FOR_STUDENT}?section_id=${sectionId}`;
          console.debug('[CourseGradeDetail] Fetching teacher assignments for student section:', taUrl);
          const assignmentsRes = await apiGet(taUrl);
          console.debug('[CourseGradeDetail] TEACHER_ASSIGNMENTS response:', assignmentsRes);
          const assignments = Array.isArray(assignmentsRes) ? assignmentsRes : (assignmentsRes.data || assignmentsRes.assignments || []);

          // Find the course we're viewing - courseId could be teacher assignment ID or subject ID
          courseAssignment = assignments.find((a: any) =>
            String(a?.id) === String(courseId) ||
            String(a?.teacher_subject_id) === String(courseId) ||
            String(a?.subject_id) === String(courseId)
          );

          if (!courseAssignment) {
            console.error("Course assignment not found for this student", courseId, assignments);
            setLoading(false);
            return;
          }

          // Get subject_id (activities.course_id uses subject_id, not teacher_subject_id!)
          subjectId = courseAssignment.subject_id || courseAssignment.subject?.id;

          // Get subject details to find course title
          let subjectRes: any = null;
          if (subjectId) {
            subjectRes = await apiGet(API_ENDPOINTS.SUBJECT_BY_ID(subjectId));
          }
          subject = subjectRes?.data || subjectRes?.subject || subjectRes || (courseAssignment.subject || {});

          // subject and courseAssignment are now set (courseAssignment may be null)
        }

        // Determine teacher name (prefer courseAssignment teacher info if available)
        let teacherName = 'TBA';
        if (courseAssignment) {
          const t = courseAssignment.teacher || courseAssignment.teacher_info || {};
          teacherName = t.first_name && t.last_name ? `${t.first_name} ${t.last_name}` : (courseAssignment.teacher_name || 'Unknown');
        }

        // Finally set course info once
        setCourseInfo({
          title: subject?.course_name || subject?.title || (courseAssignment?.title ?? 'Course'),
          code: subject?.course_code || subject?.code || (courseAssignment?.course_code ?? '---'),
          teacher: teacherName,
          courseId: subjectId
        });

        // If teacher not available, attempt to fetch teacher assignment for this subject+section
        if ((teacherName === 'TBA' || teacherName === 'Unknown') && subjectId && sectionId) {
          try {
            const taUrl = `${API_ENDPOINTS.TEACHER_ASSIGNMENTS_FOR_STUDENT}?section_id=${sectionId}&subject_id=${subjectId}`;
            const taRes = await apiGet(taUrl);
            const taList = Array.isArray(taRes) ? taRes : (taRes.assignments || taRes.data || taRes || []);
            const ta = Array.isArray(taList) && taList.length > 0 ? taList[0] : null;
            if (ta) {
              let fetchedTeacherName = null;
              if (ta.teacher) {
                const t = ta.teacher;
                if (t.first_name && t.last_name) fetchedTeacherName = `${t.first_name} ${t.last_name}`;
              }
              // fallback: if teacher_id present, fetch public teacher info
              if (!fetchedTeacherName && ta.teacher_id) {
                try {
                  const pub = await apiGet(API_ENDPOINTS.TEACHER_BY_ID_PUBLIC(ta.teacher_id));
                  const tpub = pub.data || pub.teacher || pub || null;
                  if (tpub && (tpub.first_name || tpub.last_name)) {
                    fetchedTeacherName = `${tpub.first_name ?? ''} ${tpub.last_name ?? ''}`.trim();
                  }
                } catch (e) {
                  // ignore
                }
              }

              if (fetchedTeacherName) {
                setCourseInfo((prev: any) => ({ ...prev, teacher: fetchedTeacherName }));
              }
            }
          } catch (e) {
            // ignore failure to fetch teacher assignment
          }
        }

        // 4) OPTIMIZED: Fetch ALL activities WITH grades for this course in ONE request
        // Try using the route param `courseId` first (the id user navigated with). If no activities
        // are returned, fall back to the resolved `subjectId` (teacher assignment resolution).
        let activitiesWithGrades: any[] = [];
        const tryCourseIds = [courseId, subjectId].filter((v) => v !== undefined && v !== null && v !== '').map(String);
        for (const cid of tryCourseIds) {
          try {
            const url = `${API_ENDPOINTS.ACTIVITIES_STUDENT_GRADES}?course_id=${encodeURIComponent(cid)}&student_id=${student.id}${sectionId ? `&section_id=${sectionId}` : ''}`;
            console.debug('[CourseGradeDetail] Trying activities/student-grades with:', url);
            const bulkRes = await apiGet(url);
            console.debug('[CourseGradeDetail] ACTIVITIES_STUDENT_GRADES response for', cid, bulkRes);
            const rows = bulkRes.data || bulkRes || [];
            if (Array.isArray(rows) && rows.length > 0) {
              activitiesWithGrades = rows;
              break;
            }
          } catch (err) {
            console.warn('[CourseGradeDetail] activities/student-grades fetch failed for', cid, err);
            // ignore and try next id
          }
        }

        // If still empty, try fetching activities without embedded grades and then fetch per-activity grades
        if ((!activitiesWithGrades || activitiesWithGrades.length === 0) && subjectId) {
          try {
            const activitiesUrl = `${API_ENDPOINTS.ACTIVITIES}?course_id=${encodeURIComponent(subjectId)}${sectionId ? `&section_id=${sectionId}` : ''}`;
            console.debug('[CourseGradeDetail] Fetching activities fallback:', activitiesUrl);
            const activitiesRes = await apiGet(activitiesUrl);
            const acts = activitiesRes.data || activitiesRes || [];
            console.debug('[CourseGradeDetail] ACTIVITIES fallback response count:', Array.isArray(acts) ? acts.length : 0);

            // For each activity, fetch the student's grade row via the activity-grades query endpoint
            const populated: any[] = [];
            for (const a of acts) {
              try {
                const gradesUrl = `${API_ENDPOINTS.ACTIVITY_GRADES_BY_PARAMS}?activity_id=${encodeURIComponent(a.id)}&student_id=${encodeURIComponent(student.id)}`;
                console.debug('[CourseGradeDetail] Fetching activity grades for activity:', a.id, gradesUrl);
                const gres = await apiGet(gradesUrl);
                const grows = gres.data || gres || [];
                const studentGradeRow = Array.isArray(grows) && grows.length > 0 ? grows[0] : null;
                const merged = { ...a, student_grade: studentGradeRow ? (studentGradeRow.grade ?? studentGradeRow.student_grade ?? studentGradeRow.score ?? null) : null };
                populated.push(merged);
              } catch (err) {
                console.warn('[CourseGradeDetail] Failed to fetch activity grades for', a.id, err);
                populated.push({ ...a, student_grade: null });
              }
            }

            activitiesWithGrades = populated;
          } catch (err) {
            console.error('Failed to fetch activities fallback:', err);
            activitiesWithGrades = [];
          }
        }

        // 5) Map academic_period_id to period info for each activity
        const activitiesWithPeriod = activitiesWithGrades.map((act: any) => {
          const period = periods.find((p: any) => p.id === act.academic_period_id);
          return {
            ...act,
            period_type: period?.period_type,
            academic_period: period
          };
        });

        console.log('Activities loaded:', { 
          total: activitiesWithPeriod.length,
          activities: activitiesWithPeriod,
          periods 
        });

        // 6) Calculate grades for both Midterm and Final Term (using embedded grades)
        const midtermData = await fetchGradesForPeriod('Midterm', activitiesWithPeriod, sectionId, student.id);
        setMidtermGrades(midtermData);

        const finaltermData = await fetchGradesForPeriod('Final Term', activitiesWithPeriod, sectionId, student.id);
        setFinaltermGrades(finaltermData);
      } catch (error) {
        console.error("Error fetching course grade details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, courseId]);


  // Calculate weighted score for a set of grade categories
  const calculateWeightedScore = (categories: GradeCategory[]) => {
    if (categories.length === 0) return 0;
    return (
      (categories[0].percentage * categories[0].weight) / 100 +
      (categories[1].percentage * categories[1].weight) / 100 +
      (categories[2].percentage * categories[2].weight) / 100
    );
  };

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

  const gradeBreakdown = currentTerm === "midterm" ? midtermGrades : finaltermGrades;
  const midtermWeightedScore = calculateWeightedScore(midtermGrades);
  const finaltermWeightedScore = calculateWeightedScore(finaltermGrades);
  const weightedScore = calculateWeightedScore(gradeBreakdown);
  const finalOverallGrade = (midtermWeightedScore + finaltermWeightedScore) / 2;
  const finalGrade = transmute(weightedScore);

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

  const finalGradeStyle = getGradeColorAndIndication(parseFloat(finalGrade));

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading grade details...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!courseInfo) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <Button variant="ghost" onClick={() => navigate("/student/grades")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Grades
          </Button>
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Course not found. Please select a course from the grades page.</p>
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
              <h1 className="text-4xl font-bold mb-2">{courseInfo.code} - {courseInfo.title}</h1>
              <p className="text-muted-foreground text-lg">Your detailed grade breakdown for {currentTerm === "midterm" ? "Midterm" : "Final Term"}</p>
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

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Weighted Average</p>
                  <p className="text-3xl font-bold text-primary">{weightedScore.toFixed(2)}%</p>
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
                  <p className="text-sm text-muted-foreground">Instructor</p>
                  <p className="text-lg font-bold text-accent">{courseInfo.teacher}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Grade Components Breakdown */}
        <div className="space-y-6">
          {gradeBreakdown.length > 0 ? (
            gradeBreakdown.map((category, idx) => {
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
                      <Progress value={Math.min(category.percentage, 100)} className="h-3" />
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
            })
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No grades available for this term yet.</p>
              </CardContent>
            </Card>
          )}
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
                  <span className={`font-bold ${finalGradeStyle.color}`}>Overall Grade</span>
                  <p className={`text-sm ${finalGradeStyle.color} opacity-90`}>{finalGradeStyle.indication}</p>
                </div>
                <span className={`text-2xl font-bold ${finalGradeStyle.color}`}>{transmute(finalOverallGrade)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CourseGradeDetail;
