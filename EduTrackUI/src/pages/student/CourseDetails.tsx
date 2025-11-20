import { useEffect, useMemo, useState } from "react";
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

  const [activities, setActivities] = useState<any[]>([]);
  const [courseInfo, setCourseInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "student") {
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate]);
  // Fetch real data from backend: student -> determine section -> activities for course + section
  useEffect(() => {
    const fetchCourse = async () => {
      if (!user?.id || !courseId) return;
      setLoading(true);

      try {
        // 1) fetch student to determine section_id
        const studentRes = await (await import("@/lib/api")).apiGet((await import("@/lib/api")).API_ENDPOINTS.STUDENT_BY_USER(user.id));
        const student = studentRes.data || studentRes.student || studentRes || null;
        const sectionId = student?.section_id ?? student?.sectionId ?? null;
        const studentDbId = student?.id ?? null;

        // helper to build activities URL
        const { API_ENDPOINTS, apiGet } = await import("@/lib/api");

        // 2) try to fetch activities directly using the provided courseId (could be teacher_subjects.id)
        let activitiesRes: any = null;
        try {
          activitiesRes = await apiGet(`${API_ENDPOINTS.ACTIVITIES}?course_id=${encodeURIComponent(courseId)}${sectionId ? `&section_id=${encodeURIComponent(sectionId)}` : ''}`);
        } catch (err) {
          // ignore and try resolving courseId as subject id below
          activitiesRes = null;
        }

        // 3) If no activities found, try to resolve courseId as a subject id -> find teacher assignment for this student's section
        let resolvedCourseId = courseId;
        let resolvedCourseMeta: any = null;

        const activitiesData = activitiesRes ? (activitiesRes.data || activitiesRes || []) : [];
        if ((!Array.isArray(activitiesData) || activitiesData.length === 0) && sectionId) {
          // fetch teacher assignments for the student's section and attempt to match by subject id
          try {
            const taRes = await apiGet(`${API_ENDPOINTS.TEACHER_ASSIGNMENTS_FOR_STUDENT}?section_id=${encodeURIComponent(sectionId)}`);
            const taRows = taRes.data || taRes.assignments || taRes || [];
            const match = (taRows || []).find((ta: any) => {
              const subjId = ta?.subject?.id ?? ta?.subject_id ?? ta?.subjectId ?? null;
              return String(subjId) === String(courseId) || String(ta?.id) === String(courseId);
            });

            if (match) {
              // activities use teacher_subjects id as course_id
              resolvedCourseId = match.id ?? match.teacher_subject_id ?? resolvedCourseId;
              resolvedCourseMeta = match;
            }
          } catch (err) {
            // ignore
          }
        }

        // 4) OPTIMIZED: Use the new bulk endpoint to fetch activities with grades in ONE request
        let finalActivities: any[] = [];
        if (studentDbId && resolvedCourseId) {
          try {
            const bulkRes = await apiGet(
              `${API_ENDPOINTS.ACTIVITIES_STUDENT_GRADES}?course_id=${encodeURIComponent(resolvedCourseId)}&student_id=${encodeURIComponent(studentDbId)}${sectionId ? `&section_id=${encodeURIComponent(sectionId)}` : ''}`
            );
            finalActivities = bulkRes.data || bulkRes || [];
          } catch (err) {
            console.error('Failed to fetch activities with grades:', err);
            // Fallback to old method if the new endpoint fails
            finalActivities = activitiesData;
          }
        } else {
          finalActivities = activitiesData;
        }

        // 5) Build a courseInfo object: try from resolvedCourseMeta, otherwise fetch subject details
        let info: any = null;
        if (resolvedCourseMeta) {
          const teacher = resolvedCourseMeta.teacher || resolvedCourseMeta.teacher_info || {};
          const subj = resolvedCourseMeta.subject || resolvedCourseMeta.subject_info || {};
          info = {
            title: subj.course_name || subj.title || subj.name || resolvedCourseMeta.title || 'Untitled Course',
            code: subj.course_code || subj.code || 'N/A',
            instructor: teacher.first_name && teacher.last_name ? `${teacher.first_name} ${teacher.last_name}` : resolvedCourseMeta.teacher_name || 'TBA',
            section: student?.section_name || sectionId || 'N/A',
            credits: subj.credits || subj.units || 3,
            semester: subj.semester || 'N/A'
          };
        } else {
          // try to fetch subject info by id (courseId may be a subject id)
          try {
            const subjectRes = await apiGet((await import("@/lib/api")).API_ENDPOINTS.SUBJECT_BY_ID(courseId));
            const subj = subjectRes.data || subjectRes.subject || subjectRes || null;
            info = {
              title: subj?.course_name || subj?.title || subj?.name || 'Untitled Course',
              code: subj?.course_code || subj?.code || 'N/A',
              instructor: 'TBA',
              section: student?.section_name || sectionId || 'N/A',
              credits: subj?.credits || subj?.units || 3,
              semester: subj?.semester || 'N/A'
            };
          } catch (err) {
            // fallback to basic info
            info = {
              title: 'Course Details',
              code: 'N/A',
              instructor: 'TBA',
              section: student?.section_name || sectionId || 'N/A',
              credits: 3,
              semester: 'N/A'
            };
          }
        }

        // If instructor is still TBA, try to fetch it from teacher assignments
        if (info.instructor === 'TBA' && sectionId) {
          try {
            const taRes = await apiGet(`${API_ENDPOINTS.TEACHER_ASSIGNMENTS_FOR_STUDENT}?section_id=${encodeURIComponent(sectionId)}`);
            const taRows = taRes.data || taRes.assignments || taRes || [];
            const subjId = courseId;
            const taMatch = (taRows || []).find((ta: any) => {
              const subjIdFromTA = ta?.subject?.id ?? ta?.subject_id ?? ta?.subjectId ?? null;
              const taId = ta?.id ?? ta?.teacher_subject_id ?? null;
              return String(subjIdFromTA) === String(subjId) || String(taId) === String(subjId) || String(taId) === String(resolvedCourseId);
            });

            if (taMatch) {
              const teacher = taMatch.teacher || taMatch.teacher_info || {};
              if (teacher.first_name && teacher.last_name) {
                info.instructor = `${teacher.first_name} ${teacher.last_name}`;
              }
            }
          } catch (err) {
            // if fetch fails, keep TBA
          }
        }

        setCourseInfo(info);

        // 6) Normalize activities for UI - data now comes with grades already embedded
        const mapped = (finalActivities || []).map((a: any) => ({
          id: a.id,
          title: a.title,
          type: a.type,
          dueDate: a.due_at ? a.due_at.split(' ')[0] : 'TBA',
          // Use the embedded student_grade from the optimized endpoint
          status: a.student_grade !== null ? 'graded' : (a.grade_status?.toLowerCase() || 'pending'),
          score: a.student_grade ?? null,
          maxScore: a.max_score ?? 100,
          grading_stats: a.grading_stats || {}
        }));

        setActivities(mapped);
      } catch (e) {
        console.error('Failed to load course details', e);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && user?.role === 'student') fetchCourse();
  }, [user, isAuthenticated, courseId, navigate]);

  // Calculate course summary stats
  const courseSummary = useMemo(() => {
    const graded = activities.filter(a => a.status?.toLowerCase() === "graded" || (a.score !== null && a.score !== undefined));
    const pending = activities.filter(a => a.status?.toLowerCase() !== "graded" && (a.score === null || a.score === undefined));
    const avgScore = graded.length > 0
      ? graded.reduce((sum, a) => sum + (a.score ?? 0), 0) / graded.length
      : 0;
    const completionRate = activities.length > 0
      ? Math.round((graded.length / activities.length) * 100)
      : 0;
    return { graded: graded.length, pending: pending.length, total: activities.length, avgScore, completionRate };
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
                  <CardTitle className="text-3xl font-bold mb-1">{courseInfo ? courseInfo.title : 'Course Details'}</CardTitle>
                  <CardDescription className="text-base mb-2">
                    {courseInfo ? `${courseInfo.code} • ${courseInfo.section} • ${courseInfo.credits} Credits` : 'Loading course...'}
                  </CardDescription>
                  <p className="text-sm text-muted-foreground">
                    Instructor: <span className="font-medium text-foreground">{courseInfo ? courseInfo.instructor : 'TBA'}</span>
                  </p>
                </div>
                <Badge variant="secondary" className="text-sm px-3 py-1">{courseInfo ? courseInfo.semester : 'N/A'}</Badge>
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
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Clock className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading activities...</span>
                  </div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No activities found for this course.</div>
                ) : (
                  activities.map((activity, index) => (
                    <div
                      key={activity.id || index}
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
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CourseDetails;
