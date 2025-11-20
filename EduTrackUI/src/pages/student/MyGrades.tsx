import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, TrendingUp, BookOpen, List, LayoutGrid, Loader2 } from "lucide-react";
import { API_ENDPOINTS, apiGet } from "@/lib/api";

const MyGrades = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "student") {
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate]);

  // Fetch student's courses with midterm/finalterm grades
  useEffect(() => {
    const fetchGrades = async () => {
      if (!user?.id) return;
      setLoading(true);

      try {
        // 1) Fetch student to get section_id and year_level
        const studentRes = await apiGet(API_ENDPOINTS.STUDENT_BY_USER(user.id));
        const student = studentRes.data || studentRes.student || studentRes || null;
        const sectionId = student?.section_id ?? student?.sectionId ?? null;

        if (!student || !sectionId) {
          setCourses([]);
          setLoading(false);
          return;
        }

        // 2) Fetch all academic periods (to get midterm/finalterm for current year)
        let allPeriods: any[] = [];
        try {
          const periodsRes = await apiGet(API_ENDPOINTS.ACADEMIC_PERIODS);
          allPeriods = periodsRes.data || periodsRes || [];
        } catch (err) {
          console.warn('Failed to fetch academic periods', err);
        }

        // 3) Get current active period to determine which periods to show
        let activePeriod: any = null;
        try {
          const activeRes = await apiGet(`${API_ENDPOINTS.ACADEMIC_PERIODS_ACTIVE}-public`);
          activePeriod = activeRes.data || activeRes.period || activeRes || null;
        } catch (err) {
          try {
            const activeRes = await apiGet(API_ENDPOINTS.ACADEMIC_PERIODS_ACTIVE);
            activePeriod = activeRes.data || activeRes.period || activeRes || null;
          } catch (err2) {
            console.warn('Failed to fetch active period', err2);
          }
        }

        // 4) Get teacher assignments for this section (which have subject info)
        let taRows: any[] = [];
        try {
          const taRes = await apiGet(`${API_ENDPOINTS.TEACHER_ASSIGNMENTS_FOR_STUDENT}?section_id=${sectionId}`);
          taRows = taRes.data || taRes.assignments || [];
        } catch (err) {
          console.warn('Failed to fetch teacher assignments', err);
        }

        // 5) Bulk-fetch activities for the relevant academic periods (reduces many requests)
        // Determine needed period IDs (midterm/finalterm) per course, aggregate unique IDs
        const courseMeta = taRows.map((ta: any) => {
          const courseId = ta?.id ?? ta?.teacher_subject_id ?? null;
          const subject = ta?.subject || {};
          const subjectId = subject.id || ta?.subject_id;
          const courseName = subject.course_code || subject.code || 'N/A';
          const courseTitle = subject.course_name || subject.title || 'Untitled';
          const courseSchoolYear = activePeriod?.school_year || '2025-2026';
          const courseSemester = subject.semester || activePeriod?.semester || '1st Semester';

          const midtermPeriod = allPeriods.find(
            (p: any) => p.school_year === courseSchoolYear && p.semester === courseSemester && p.period_type === 'Midterm'
          );
          const finaltermPeriod = allPeriods.find(
            (p: any) => p.school_year === courseSchoolYear && p.semester === courseSemester && p.period_type === 'Final Term'
          );

          return { courseId, subjectId, courseName, courseTitle, midtermPeriod, finaltermPeriod, ta };
        });

        // Collect unique period IDs to fetch once per period
        const periodIdSet = new Set<number>();
        for (const cm of courseMeta) {
          if (cm.midtermPeriod?.id) periodIdSet.add(cm.midtermPeriod.id);
          if (cm.finaltermPeriod?.id) periodIdSet.add(cm.finaltermPeriod.id);
        }

        // Bulk fetch activities for each period (one request per unique period)
        const activitiesByPeriod: Record<number, any[]> = {};
        for (const pid of Array.from(periodIdSet)) {
          try {
            const res = await apiGet(`${API_ENDPOINTS.ACTIVITIES_STUDENT_ALL}?student_id=${student.id}&academic_period_id=${pid}`);
            activitiesByPeriod[pid] = res.data || [];
          } catch (err) {
            console.warn(`Failed to fetch activities for period ${pid}`, err);
            activitiesByPeriod[pid] = [];
          }
        }

        // Compute grades per course using the bulk-fetched activities
        const coursesWithGrades = courseMeta.map((cm: any) => {
          const computeGradeFromActivities = (acts: any[] | undefined) => {
            if (!acts || acts.length === 0) return null;
            let totalScore = 0;
            let totalMaxScore = 0;
            for (const a of acts) {
              if (String(a.course_id) !== String(cm.subjectId)) continue;
              const g = a.student_grade;
              if (g !== null && g !== undefined) {
                totalScore += Number(g);
                totalMaxScore += Number(a.max_score ?? 100);
              }
            }
            if (totalMaxScore > 0) {
              const percentage = Math.round((totalScore / totalMaxScore) * 100);
              return { score: totalScore, maxScore: totalMaxScore, percentage };
            }
            return null;
          };

          const midTermActs = cm.midtermPeriod?.id ? activitiesByPeriod[cm.midtermPeriod.id] : [];
          const finalTermActs = cm.finaltermPeriod?.id ? activitiesByPeriod[cm.finaltermPeriod.id] : [];

          const midtermGrade = computeGradeFromActivities(midTermActs);
          const finaltermGrade = computeGradeFromActivities(finalTermActs);

          return {
            id: cm.courseId,
            code: cm.courseName,
            title: cm.courseTitle,
            teacher: cm.ta?.teacher?.first_name && cm.ta?.teacher?.last_name ? `${cm.ta.teacher.first_name} ${cm.ta.teacher.last_name}` : 'N/A',
            midtermGrade,
            finaltermGrade,
            overallGrade: midtermGrade && finaltermGrade ? Math.round(((midtermGrade.percentage + finaltermGrade.percentage) / 2)) : midtermGrade?.percentage || finaltermGrade?.percentage || 0
          };
        });

        setCourses(coursesWithGrades);
      } catch (e) {
        console.error('Failed to load grades', e);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && user?.role === 'student') {
      fetchGrades();
    }
  }, [user, isAuthenticated]);

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
                  <BookOpen className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Courses</p>
                  <p className="text-3xl font-bold text-success">{courses.length}</p>
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
                  <p className="text-3xl font-bold text-primary">
                    {courses.length > 0 
                      ? Math.round(courses.reduce((sum, c) => sum + c.overallGrade, 0) / courses.length)
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Award className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Graded</p>
                  <p className="text-3xl font-bold text-accent">
                    {courses.filter(c => c.midtermGrade || c.finaltermGrade).length}/{courses.length}
                  </p>
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
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading grades...</span>
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No courses found.</p>
          </div>
        ) : viewMode === "list" ? (
          <div className="space-y-4">
            {courses.map((course, index) => (
              <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{course.code}</CardTitle>
                      <CardDescription className="text-sm">{course.title}</CardDescription>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-primary/20">
                      Overall: {course.overallGrade}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Midterm Grade */}
                    <div className="p-4 border border-border rounded-lg hover:bg-primary/5 transition-colors">
                      <p className="text-sm text-muted-foreground mb-2">Midterm</p>
                      {course.midtermGrade ? (
                        <div>
                          <p className="text-2xl font-bold text-primary">{course.midtermGrade.percentage}%</p>
                          <p className="text-xs text-muted-foreground mt-1">{course.midtermGrade.score}/{course.midtermGrade.maxScore}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No grades yet</p>
                      )}
                    </div>

                    {/* Finalterm Grade */}
                    <div className="p-4 border border-border rounded-lg hover:bg-primary/5 transition-colors">
                      <p className="text-sm text-muted-foreground mb-2">Final Term</p>
                      {course.finaltermGrade ? (
                        <div>
                          <p className="text-2xl font-bold text-success">{course.finaltermGrade.percentage}%</p>
                          <p className="text-xs text-muted-foreground mt-1">{course.finaltermGrade.score}/{course.finaltermGrade.maxScore}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No grades yet</p>
                      )}
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full" 
                    onClick={() => navigate(`/student/course-grade-detail/${course.id}`)}
                  >
                    View Detailed Breakdown
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course, index) => (
              <Card key={index} className="border-0 shadow-sm hover:shadow-lg transition-shadow duration-200 flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-base">{course.code}</CardTitle>
                      <CardDescription className="text-xs mt-1">{course.title}</CardDescription>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-sm px-2 py-1 flex-shrink-0">
                      {course.overallGrade}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="space-y-3 flex-1">
                    {/* Midterm */}
                    <div className="p-3 border border-border rounded-lg hover:bg-primary/5 transition-colors">
                      <p className="text-xs text-muted-foreground font-semibold mb-2">Midterm</p>
                      {course.midtermGrade ? (
                        <div>
                          <p className="text-lg font-bold text-primary">{course.midtermGrade.percentage}%</p>
                          <p className="text-xs text-muted-foreground">{course.midtermGrade.score}/{course.midtermGrade.maxScore}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No grades</p>
                      )}
                    </div>

                    {/* Finalterm */}
                    <div className="p-3 border border-border rounded-lg hover:bg-primary/5 transition-colors">
                      <p className="text-xs text-muted-foreground font-semibold mb-2">Final Term</p>
                      {course.finaltermGrade ? (
                        <div>
                          <p className="text-lg font-bold text-success">{course.finaltermGrade.percentage}%</p>
                          <p className="text-xs text-muted-foreground">{course.finaltermGrade.score}/{course.finaltermGrade.maxScore}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No grades</p>
                      )}
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="w-full mt-4" 
                    onClick={() => navigate(`/student/course-grade-detail/${course.id}`)}
                  >
                    View Breakdown
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
