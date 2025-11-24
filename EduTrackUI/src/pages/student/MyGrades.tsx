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
        // 1) Fetch student info to get year_level and section_id
        const studentRes = await apiGet(API_ENDPOINTS.STUDENT_BY_USER(user.id));
        const student = studentRes.data || studentRes.student || studentRes || null;
        
        if (!student) {
          console.error('Student record not found for user:', user.id);
          setCourses([]);
          setLoading(false);
          return;
        }

        // Normalize year_level to numeric value (supports '2nd Year', '2', or 2)
        let studentYearLevelNum: number | null = null;
        const studentYearLevelRaw = student.year_level ?? student.yearLevel;
        if (typeof studentYearLevelRaw === 'number') studentYearLevelNum = studentYearLevelRaw;
        else if (typeof studentYearLevelRaw === 'string') {
          const m = String(studentYearLevelRaw).match(/(\d+)/);
          studentYearLevelNum = m ? Number(m[1]) : null;
        }

        const studentSectionId = student.section_id || student.sectionId;

        // 2) Fetch active academic period to determine current semester
        let activePeriod: any = null;
        try {
          const activePeriodRes = await apiGet(`${API_ENDPOINTS.ACADEMIC_PERIODS_ACTIVE}-public`);
          activePeriod = activePeriodRes.data || activePeriodRes.period || activePeriodRes || null;
        } catch (err) {
          console.warn('Failed to fetch active period from public endpoint, trying authenticated endpoint', err);
          try {
            const activePeriodRes = await apiGet(API_ENDPOINTS.ACADEMIC_PERIODS_ACTIVE);
            activePeriod = activePeriodRes.data || activePeriodRes.period || activePeriodRes || null;
          } catch (err2) {
            console.error('Failed to fetch active period', err2);
          }
        }
        
        if (!activePeriod) {
          console.warn('No active academic period found');
          setCourses([]);
          setLoading(false);
          return;
        }

        // Extract semester from active period (e.g., "1st Semester" -> "1st")
        const semesterMatch = (activePeriod.semester || '').match(/^(\d+)(st|nd|rd|th)/i);
        const currentSemesterShort = semesterMatch ? (String(semesterMatch[1]) === '1' ? '1st' : '2nd') : null;

        // 3) Fetch all academic periods (to find midterm/finalterm for current year/semester)
        let allPeriods: any[] = [];
        try {
          const periodsRes = await apiGet(API_ENDPOINTS.ACADEMIC_PERIODS);
          allPeriods = periodsRes.data || periodsRes || [];
        } catch (err) {
          console.warn('Failed to fetch academic periods', err);
        }

        // 4) Fetch subjects using student-accessible endpoint with year_level and semester filtering
        const subjectsQueryBase = new URLSearchParams();
        if (studentYearLevelNum) subjectsQueryBase.set('year_level', String(studentYearLevelNum));

        let subjects: any[] = [];
        const semesterCandidates: (string | null)[] = [];
        if (currentSemesterShort) {
          semesterCandidates.push(currentSemesterShort);
          semesterCandidates.push(currentSemesterShort.startsWith('1') ? '1' : '2');
        } else {
          semesterCandidates.push(null);
        }

        // Try server-side filtered fetches with different semester representations
        let fetched = false;
        for (const sem of semesterCandidates) {
          try {
            const params = new URLSearchParams(subjectsQueryBase.toString());
            if (sem) params.set('semester', sem);
            console.debug('Trying subjects fetch with params:', params.toString());
            const subjectsRes = await apiGet(`${API_ENDPOINTS.SUBJECTS_FOR_STUDENT}?${params.toString()}`);
            const rows = subjectsRes.data || subjectsRes.subjects || subjectsRes || [];
            if (Array.isArray(rows) && rows.length > 0) {
              subjects = rows;
              fetched = true;
              break;
            }
          } catch (err) {
            console.warn('Subjects fetch failed for semester', sem, err);
          }
        }

        // Fallback: try without semester
        if (!fetched) {
          try {
            const params = new URLSearchParams();
            if (studentYearLevelNum) params.set('year_level', String(studentYearLevelNum));
            console.debug('Trying subjects fetch without semester:', params.toString());
            const subjectsRes = await apiGet(`${API_ENDPOINTS.SUBJECTS_FOR_STUDENT}?${params.toString()}`);
            const rows = subjectsRes.data || subjectsRes.subjects || subjectsRes || [];
            if (Array.isArray(rows)) subjects = rows;
          } catch (err) {
            console.error('Failed to fetch subjects fallback', err);
            subjects = [];
          }
        }

        // 5) Fetch teacher assignments to get teacher info for each subject
        let teacherAssignments: any[] = [];
        if (studentSectionId) {
          try {
            const taRes = await apiGet(`${API_ENDPOINTS.TEACHER_ASSIGNMENTS_FOR_STUDENT}?section_id=${encodeURIComponent(studentSectionId)}`);
            teacherAssignments = taRes.data || taRes.assignments || taRes || [];
          } catch (err) {
            console.warn('Failed to fetch teacher assignments for student endpoint, trying fallback', err);
            try {
              const taRes = await apiGet(API_ENDPOINTS.TEACHER_ASSIGNMENTS);
              teacherAssignments = taRes.data || taRes.assignments || taRes || [];
            } catch (err2) {
              console.warn('Fallback teacher assignments fetch also failed', err2);
            }
          }
        }

        // Build a lookup map from subjectId+sectionId => teacher info
        const teacherMap = new Map<string, any>();
        if (Array.isArray(teacherAssignments)) {
          teacherAssignments.forEach((ta: any) => {
            const subjId = ta?.subject?.id ?? ta?.subject_id ?? ta?.subjectId ?? null;
            const teacherObj = {
              id: ta?.teacher_id ?? ta?.teacher?.id ?? null,
              first_name: ta?.teacher?.first_name ?? ta?.teacher?.firstName ?? null,
              last_name: ta?.teacher?.last_name ?? ta?.teacher?.lastName ?? null,
              name: ta?.teacher_name ?? (ta?.teacher?.first_name && ta?.teacher?.last_name ? `${ta.teacher.first_name} ${ta.teacher.last_name}` : null)
            };

            const sections = ta?.sections ?? [];
            if (Array.isArray(sections) && sections.length > 0) {
              sections.forEach((s: any) => {
                const sid = s?.id ?? s?.section_id ?? s ?? null;
                if (subjId != null && sid != null) {
                  teacherMap.set(`${subjId}_${sid}`, teacherObj);
                }
              });
            } else if (subjId != null) {
              teacherMap.set(`${subjId}_*`, teacherObj);
            }
          });
        }

        // 6) Build course objects from subjects with teacher info
        const coursesList = (Array.isArray(subjects) ? subjects : []).map((subject: any) => {
          const subjId = subject?.id ?? subject?.subject_id ?? null;
          let teacherObj = null;

          if (subjId != null) {
            if (studentSectionId) {
              teacherObj = teacherMap.get(`${subjId}_${studentSectionId}`) || teacherMap.get(`${subjId}_*`);
            }

            if (!teacherObj) {
              for (const [key, val] of teacherMap.entries()) {
                if (key.startsWith(`${subjId}_`)) { teacherObj = val; break; }
              }
            }
          }

          const teacherName = teacherObj?.name ?? (teacherObj?.first_name && teacherObj?.last_name ? `${teacherObj.first_name} ${teacherObj.last_name}` : 'TBA');
          const teacherId = teacherObj?.id ?? null;

          return {
            id: subject.id,
            title: subject.course_name || subject.title || subject.name || 'Untitled Course',
            code: subject.course_code || subject.code || 'N/A',
            teacher: teacherName,
            teacherId: teacherId,
            section: student.section_name || studentSectionId || 'N/A',
            credits: subject.units || subject.credits || 3,
            semester: subject.semester || currentSemesterShort || 'N/A',
            yearLevel: subject.year_level ?? subject.yearLevel ?? studentYearLevelRaw ?? 'N/A',
            subjectId: subjId
          };
        });

        // 7) Fetch academic periods and build grade-period mappings per course
        // Find midterm/finalterm for current school year and semester
        const courseSchoolYear = activePeriod?.school_year || '2025-2026';
        const courseSemester = activePeriod?.semester || '1st Semester';

        const midtermPeriod = allPeriods.find(
          (p: any) => p.school_year === courseSchoolYear && p.semester === courseSemester && p.period_type === 'Midterm'
        );
        const finaltermPeriod = allPeriods.find(
          (p: any) => p.school_year === courseSchoolYear && p.semester === courseSemester && p.period_type === 'Final Term'
        );

        // 8) Bulk-fetch activities for the relevant academic periods
        const periodIdSet = new Set<number>();
        if (midtermPeriod?.id) periodIdSet.add(midtermPeriod.id);
        if (finaltermPeriod?.id) periodIdSet.add(finaltermPeriod.id);

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

        // 9) Compute grades per course using bulk-fetched activities
        const coursesWithGrades = coursesList.map((course: any) => {
          const computeGradeFromActivities = (acts: any[] | undefined) => {
            if (!acts || acts.length === 0) return null;
            let totalScore = 0;
            let totalMaxScore = 0;

            // match activities to course by checking multiple possible id fields
            const courseIdsToMatch = [course.subjectId, course.id].filter((v) => v !== undefined && v !== null).map(String);

            for (const a of acts) {
              const actIdCandidates = [
                a.course_id,
                a.subject_id,
                a.teacher_subject_id,
                a.subject?.id,
                a.course?.id
              ].filter((v) => v !== undefined && v !== null).map(String);

              const matched = actIdCandidates.some((id) => courseIdsToMatch.includes(id));
              if (!matched) continue;

              const g = a.student_grade ?? a.grade ?? a.score ?? null;
              if (g !== null && g !== undefined) {
                totalScore += Number(g);
                totalMaxScore += Number(a.max_score ?? a.maxScore ?? 100);
              }
            }

            if (totalMaxScore > 0) {
              const percentage = Math.round((totalScore / totalMaxScore) * 100);
              return { score: totalScore, maxScore: totalMaxScore, percentage };
            }
            return null;
          };

          const midTermActs = midtermPeriod?.id ? activitiesByPeriod[midtermPeriod.id] : [];
          const finalTermActs = finaltermPeriod?.id ? activitiesByPeriod[finaltermPeriod.id] : [];

          const midtermGrade = computeGradeFromActivities(midTermActs);
          const finaltermGrade = computeGradeFromActivities(finalTermActs);

          return {
            id: course.id,
            code: course.code,
            title: course.title,
            teacher: course.teacher,
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
