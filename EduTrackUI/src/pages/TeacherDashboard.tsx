import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, FileText, TrendingUp, LogOut, Plus, Clock, Award } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { API_ENDPOINTS, apiGet } from "@/lib/api";

const TeacherDashboard = () => {
  const { user } = useAuth();
  
  // State for real data
  const [courses, setCourses] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [upcomingActivities, setUpcomingActivities] = useState<any[]>([]);
  const [recentGrades, setRecentGrades] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    totalActivities: 0,
    avgGrade: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch teacher's courses (teacher assignments) and normalize shape
      const coursesRes = await apiGet(`${API_ENDPOINTS.TEACHER_ASSIGNMENTS}/my`);
      const rawAssignments = coursesRes.data ?? coursesRes.assigned_courses ?? coursesRes.assignments ?? coursesRes ?? [];

      // Normalize assignments to a predictable shape used across dashboard
      const assignments = (Array.isArray(rawAssignments) ? rawAssignments : []).map((a: any) => {
        // assignment may be nested or be the subject itself
        const subject = a.subject ?? a;
        return {
          // teacher-assignment id (may be teacher_subject_id or id)
          id: a.id ?? a.teacher_subject_id ?? a.teacher_assignment_id ?? subject.id ?? null,
          // canonical subject id
          subject_id: subject.id ?? a.subject_id ?? a.subject_id ?? null,
          name: subject.course_name ?? subject.title ?? subject.name ?? a.course_name ?? a.subject_name ?? 'N/A',
          code: subject.course_code ?? subject.code ?? a.course_code ?? a.subject_code ?? '',
          // sections may be provided on the assignment
          sections: Array.isArray(a.sections) ? a.sections : (Array.isArray(subject.sections) ? subject.sections : []),
          // commonly available section id/name fields
          section_id: a.section_id ?? a.section?.id ?? subject.section_id ?? null,
          section_name: a.section_name ?? a.section?.name ?? subject.section_name ?? null,
          // year level for student filtering
          year_level: a.year_level ?? a.yearLevel ?? subject.year_level ?? subject.yearLevel ?? null,
          raw: a,
        };
      });
      
      // Fetch all activities (filter later by assignments)
      const activitiesRes = await apiGet(API_ENDPOINTS.ACTIVITIES);
      const allActivities = activitiesRes.data || activitiesRes.activities || activitiesRes || [];

      // Fetch all students for sections taught (collect from normalized assignments)
      const sectionIdSet = new Set<any>();
      assignments.forEach((c: any) => {
        if (c.section_id) sectionIdSet.add(c.section_id);
        if (Array.isArray(c.sections)) {
          c.sections.forEach((s: any) => {
            if (s && (s.id || s.section_id)) sectionIdSet.add(s.id ?? s.section_id);
          });
        }
      });

      const sectionIds = [...sectionIdSet].filter(Boolean);
      let allStudents: any[] = [];

      // Build section->year_level map from assignments for proper student filtering
      const sectionYearLevelMap = new Map<string, string>();
      assignments.forEach((a: any) => {
        if (a.year_level) {
          if (a.section_id) sectionYearLevelMap.set(String(a.section_id), String(a.year_level));
          if (Array.isArray(a.sections)) {
            a.sections.forEach((s: any) => {
              const sid = s.id ?? s.section_id;
              if (sid) sectionYearLevelMap.set(String(sid), String(a.year_level));
            });
          }
        }
      });

      // Fetch students per section with year_level filter when available
      for (const sectionId of sectionIds) {
        try {
          const params = new URLSearchParams();
          params.set('section_id', String(sectionId));
          const yearLevel = sectionYearLevelMap.get(String(sectionId));
          if (yearLevel) params.set('year_level', yearLevel);
          
          const studRes = await apiGet(`${API_ENDPOINTS.STUDENTS}?${params.toString()}`);
          const students = studRes.data || studRes.students || studRes || [];
          allStudents = [...allStudents, ...students];
        } catch (e) {
          console.error('Error fetching students for section:', sectionId, e);
        }
      }

      // Remove duplicates
      const uniqueStudents = Array.from(new Map(allStudents.map(s => [s.id, s])).values());

      // Process assignments with stats
      const coursesWithStats = await Promise.all(assignments.map(async (course: any) => {
        // Determine matching IDs: assignment id and subject id
        const subjectId = course.subject_id;
        const assignId = course.id;

        // Get activities for this course (match by subject_id or assignment id)
        const courseActivities = allActivities.filter((a: any) => {
          const aid = a.course_id ?? a.subject_id ?? a.teacher_subject_id ?? null;
          return (aid && (String(aid) === String(subjectId) || String(aid) === String(assignId)));
        });

        // Get students for all sections of this course (aggregate and dedupe)
        const courseSectionIdSet = new Set<string>();
        if (course.section_id) courseSectionIdSet.add(String(course.section_id));
        if (Array.isArray(course.sections)) {
          course.sections.forEach((sec: any) => {
            if (sec && (sec.id || sec.section_id)) courseSectionIdSet.add(String(sec.id ?? sec.section_id));
          });
        }
        const sectionStudentsRaw = allStudents.filter((s: any) => courseSectionIdSet.has(String(s.section_id)));
        const sectionStudents = Array.from(new Map(sectionStudentsRaw.map((s: any) => [s.id, s])).values());

        // Calculate average grade from activities
        let avgGrade = 0;
        if (courseActivities.length > 0) {
          try {
            // Fetch grades for activities
            let totalGrades = 0;
            let gradeCount = 0;

            for (const activity of courseActivities.slice(0, 5)) { // Limit to recent 5 for performance
              try {
                const gradesRes = await apiGet(API_ENDPOINTS.ACTIVITY_GRADES(activity.id));
                const grades = gradesRes.data || gradesRes.grades || gradesRes || [];
                
                grades.forEach((g: any) => {
                  if (g.grade && activity.max_score) {
                    totalGrades += (parseFloat(g.grade) / parseFloat(activity.max_score)) * 100;
                    gradeCount++;
                  }
                });
              } catch (e) {
                // Ignore grade fetch errors
              }
            }

            if (gradeCount > 0) {
              avgGrade = Math.round(totalGrades / gradeCount);
            }
          } catch (e) {
            console.error('Error calculating average grade:', e);
          }
        }

        return {
          id: course.id,
          name: course.name || 'N/A',
          code: course.code || '',
          students: sectionStudents.length,
          activities: courseActivities.length,
          avgGrade: avgGrade || 0,
          section: course.section_name || ''
        };
      }));

      // Get recent activities with submission stats
      const sortedActivities = [...allActivities]
        .sort((a, b) => new Date(b.created_at || b.date_created || '').getTime() - 
                        new Date(a.created_at || a.date_created || '').getTime())
        .slice(0, 5);

      const recentWithStats = await Promise.all(sortedActivities.map(async (activity: any) => {
        try {
          // Find the course/assignment for this activity
          const course = assignments.find((c: any) => String(c.subject_id) === String(activity.course_id) || String(c.id) === String(activity.teacher_subject_id) || String(c.id) === String(activity.course_id));

          // Get the specific section_id for this activity (activities have a single section_id)
          const activitySectionId = activity.section_id ? String(activity.section_id) : null;

          // Filter students that belong to this activity's section AND year level
          let sectionStudents: any[] = [];
          if (activitySectionId) {
            sectionStudents = allStudents.filter((s: any) => {
              const matchesSection = String(s.section_id) === activitySectionId;
              // Also match year_level if the course has it defined
              if (course?.year_level && s.year_level) {
                return matchesSection && String(s.year_level) === String(course.year_level);
              }
              return matchesSection;
            });
          }

          // Deduplicate students by ID
          const uniqueSectionStudents = Array.from(new Map(sectionStudents.map((s: any) => [s.id, s])).values());

          // Fetch grades for this activity
          const gradesRes = await apiGet(API_ENDPOINTS.ACTIVITY_GRADES(activity.id));
          const grades = gradesRes.data || gradesRes.grades || gradesRes || [];

          // Count graded submissions (grade != null) for students in this section
          const studentIdSet = new Set(uniqueSectionStudents.map((s: any) => String(s.id)));
          const gradedCount = Array.isArray(grades) 
            ? grades.filter((g: any) => {
                const hasGrade = g.grade !== null && g.grade !== undefined && g.grade !== '';
                const isInSection = studentIdSet.has(String(g.student_id ?? g.studentId));
                return hasGrade && isInSection;
              }).length 
            : 0;

          return {
            id: activity.id,
            course: course?.name || 'N/A',
            activity: activity.name || activity.title || 'Untitled',
            submitted: gradedCount,
            total: uniqueSectionStudents.length,
            date: activity.created_at || activity.date_created || new Date().toISOString().split('T')[0]
          };
        } catch (e) {
          return {
            id: activity.id,
            course: 'N/A',
            activity: activity.name || activity.title || 'Untitled',
            submitted: 0,
            total: 0,
            date: activity.created_at || activity.date_created || new Date().toISOString().split('T')[0]
          };
        }
      }));

      // Upcoming activities (due in future)
      try {
        const now = new Date();
        const upcomingList = (allActivities || [])
          .filter((a: any) => a.due_at && new Date(a.due_at) > now)
          .sort((a: any, b: any) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())
          .slice(0, 5)
          .map((a: any) => {
            const course = assignments.find((c: any) => String(c.subject_id) === String(a.course_id) || String(c.id) === String(a.teacher_subject_id) || String(c.id) === String(a.course_id));
            return {
              id: a.id,
                activity: a.title || a.name || 'Untitled',
                course: course?.name || 'N/A',
                dueDate: a.due_at ? new Date(a.due_at).toLocaleDateString() : 'No due date',
                daysLeft: a.due_at ? Math.ceil((new Date(a.due_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null
            };
          });
        setUpcomingActivities(upcomingList);
      } catch (e) {
        setUpcomingActivities([]);
      }

      // Recent grades (latest graded submissions from recent activities)
      try {
        const recentGradesList: any[] = [];
        for (const activity of sortedActivities.slice(0, 10)) {
          try {
            const gradesRes = await apiGet(API_ENDPOINTS.ACTIVITY_GRADES(activity.id));
            const grades = gradesRes.data || gradesRes.grades || gradesRes || [];
            if (Array.isArray(grades) && grades.length > 0) {
              for (const g of grades.slice(0, 3)) {
                // Try to resolve student name from fetched students
                const studentObj = uniqueStudents.find((s: any) => String(s.id) === String(g.student_id || g.studentId || g.student_id));
                const studentName = studentObj ? (studentObj.first_name && studentObj.last_name ? `${studentObj.first_name} ${studentObj.last_name}` : (studentObj.name || studentObj.full_name || String(studentObj.id))) : (g.student_name || 'Student');
                recentGradesList.push({
                  studentName,
                  activity: activity.title || activity.name || 'Untitled',
                  grade: g.grade,
                  maxScore: activity.max_score || activity.maxScore || 100,
                  date: g.updated_at || g.created_at || null
                });
              }
            }
          } catch (e) {
            // ignore per-activity grade fetch errors
          }
          if (recentGradesList.length >= 5) break;
        }
        setRecentGrades(recentGradesList.slice(0, 5));
      } catch (e) {
        setRecentGrades([]);
      }

      // Calculate overall average grade
      const coursesWithGrades = coursesWithStats.filter(c => c.avgGrade > 0);
      const overallAvg = coursesWithGrades.length > 0
        ? Math.round(coursesWithGrades.reduce((sum, c) => sum + c.avgGrade, 0) / coursesWithGrades.length)
        : 0;

      // Update state
      setCourses(coursesWithStats);
      setRecentActivities(recentWithStats);
      setStats({
        totalCourses: coursesWithStats.length,
        totalStudents: uniqueStudents.length,
        totalActivities: allActivities.length,
        avgGrade: overallAvg
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              EduTrack
            </Link>
            <Badge className="bg-accent text-accent-foreground">Teacher</Badge>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{user?.name}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome, {user?.name}</h1>
            <p className="text-muted-foreground">Manage your courses and track student progress</p>
          </div>
          <div className="flex gap-3">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Course
            </Button>
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              New Activity
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Courses</p>
                  <p className="text-2xl font-bold">{loading ? '...' : stats.totalCourses}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold">{loading ? '...' : stats.totalStudents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Activities</p>
                  <p className="text-2xl font-bold">{loading ? '...' : stats.totalActivities}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Grade</p>
                  <p className="text-2xl font-bold">{loading ? '...' : stats.avgGrade}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Courses */}
            <Card>
              <CardHeader>
                <CardTitle>My Courses</CardTitle>
                <CardDescription>Manage your active courses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading courses...</div>
                ) : courses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No courses assigned yet</div>
                ) : (
                  courses.map((course) => (
                    <div key={course.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{course.name}</h3>
                          {course.section && (
                            <p className="text-xs text-muted-foreground mt-1">Section: {course.section}</p>
                          )}
                          <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {course.students} students
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              {course.activities} activities
                            </span>
                          </div>
                        </div>
                        {course.avgGrade > 0 && (
                          <Badge variant="secondary" className="bg-success/10 text-success">
                            Avg: {course.avgGrade}%
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/teacher/courses/${course.id}`}>View Details</Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link to="/teacher/grade-input">Input Grades</Link>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Recent Activities */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activities</CardTitle>
                <CardDescription>Latest submissions and assessments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading activities...</div>
                ) : recentActivities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No recent activities</div>
                ) : (
                  recentActivities.map((activity) => (
                    <div key={activity.id} className="p-4 border border-border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium">{activity.activity}</p>
                          <p className="text-sm text-muted-foreground">{activity.course}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{activity.date}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Submissions: {activity.submitted}/{activity.total}
                        </p>
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/teacher/activities/${activity.id}`}>View</Link>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Activities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Upcoming Deadlines
                </CardTitle>
                <CardDescription>Activities due soon</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">Loading...</div>
                ) : upcomingActivities.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">No upcoming deadlines</div>
                ) : (
                  upcomingActivities.map((activity) => (
                    <div key={activity.id} className="p-3 bg-muted rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-sm">{activity.activity}</p>
                        <Badge variant="outline" className={`text-xs ${
                          activity.daysLeft <= 3 ? 'bg-red-50 text-red-600 border-red-200' : 
                          activity.daysLeft <= 7 ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                          'bg-blue-50 text-blue-600 border-blue-200'
                        }`}>
                          {activity.daysLeft}d left
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{activity.course}</p>
                      <p className="text-xs text-muted-foreground">Due: {activity.dueDate}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Recent Grades */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Recent Grades
                </CardTitle>
                <CardDescription>Latest graded submissions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">Loading...</div>
                ) : recentGrades.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">No recent grades</div>
                ) : (
                  recentGrades.map((grade, idx) => (
                    <div key={idx} className="p-3 bg-muted rounded-lg">
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-medium text-sm truncate flex-1">{grade.studentName}</p>
                        <Badge className="text-xs bg-success/10 text-success">
                          {grade.grade}/{grade.maxScore}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{grade.activity}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/teacher/grade-input">
                    <FileText className="h-4 w-4 mr-2" />
                    Grade Input
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/teacher/courses">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Manage Courses
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/teacher/activities">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Activity
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
