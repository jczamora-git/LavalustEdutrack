import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Users, ClipboardList, UserPlus, LayoutGrid, List, CheckCircle2, AlertCircle, Clock, Mail, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { API_ENDPOINTS, apiGet, apiPost } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const CourseManagement = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { courseId } = useParams();
  const location = useLocation();

  const [courseTitle, setCourseTitle] = useState<string | null>(null);
  const [courseCode, setCourseCode] = useState<string | null>(null);
  const [sectionName, setSectionName] = useState<string | null>(null);
  const [courseYearLevel, setCourseYearLevel] = useState<number | string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "teacher") {
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate]);

  

  const [activities, setActivities] = useState<any[]>([]);

  const [viewType, setViewType] = useState<"list" | "grid">(() => {
    try {
      const saved = localStorage.getItem("course_activities_view");
      if (saved === "list" || saved === "grid") return saved;
    } catch (e) {}
    return "list";
  });

  // persist view preference
  useEffect(() => {
    try {
      localStorage.setItem("course_activities_view", viewType);
    } catch (e) {}
  }, [viewType]);

  // Add activity dialog state (controlled)
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("assignment");
  const [newMaxScore, setNewMaxScore] = useState<number | string>(100);
  const [newDueDate, setNewDueDate] = useState("");
  const [newInstructions, setNewInstructions] = useState("");

  // Students state and view
  const [students, setStudents] = useState(() => [
    { id: "2024001", name: "Sarah Johnson", email: "sarah.j@university.edu", status: "active" },
    { id: "2024002", name: "Michael Chen", email: "m.chen@university.edu", status: "active" },
    { id: "2024003", name: "Emily Rodriguez", email: "e.rodriguez@university.edu", status: "active" },
  ]);

  const courseInfo = {
    title: courseTitle ?? "",
    code: courseCode ?? "",
    section: sectionName ?? "",
    students: students.length,
  };

  const [studentViewType, setStudentViewType] = useState<"list" | "grid">(() => {
    try {
      const saved = localStorage.getItem("course_students_view");
      if (saved === "list" || saved === "grid") return saved;
    } catch (e) {}
    return "list";
  });

  // persist student view preference
  useEffect(() => {
    try {
      localStorage.setItem("course_students_view", studentViewType);
    } catch (e) {}
  }, [studentViewType]);

  // Add student dialog state
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentSuggestions, setStudentSuggestions] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string; email: string } | null>(null);

  // Mock student pool for suggestions
  const availableStudents = [
    { id: "S1001", name: "Sarah Davis", email: "sarah.d@university.edu" },
    { id: "S1002", name: "Samuel Green", email: "samuel@university.edu" },
    { id: "S1003", name: "Emily Brown", email: "emily.b@university.edu" },
    { id: "S1004", name: "Michael Chang", email: "m.chang@university.edu" },
    { id: "S1005", name: "Mike Johnson", email: "mike.j@university.edu" },
    { id: "S1006", name: "Jessica Lee", email: "jessica@university.edu" },
    { id: "S1007", name: "Anna Martinez", email: "anna.m@university.edu" },
  ];

  // Fetch student suggestions (debounced via useEffect)
  useEffect(() => {
    let mounted = true;
    const t = setTimeout(() => {
      if (studentSearchQuery.trim()) {
        const q = studentSearchQuery.toLowerCase();
        const filtered = availableStudents.filter(
          (s) =>
            (s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)) &&
            !students.find((st) => st.id === s.id) // exclude already added
        );
        if (mounted) setStudentSuggestions(filtered);
      } else {
        if (mounted) setStudentSuggestions([]);
      }
    }, 250);
    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, [studentSearchQuery, students]);

  if (!isAuthenticated) return null;

  // Fetch course/section metadata and students when courseId or section_id in query changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sectionId = params.get('section_id');
    // keep selected section id in state for other hooks
    setSelectedSectionId(sectionId);

    const fetchInfo = async () => {
      try {
        // Try to resolve course info from teacher assignments (preferred)
        let courseFound = false;
        let detectedYearLevel: number | string | null = null;
        try {
          const res = await apiGet(`${API_ENDPOINTS.TEACHER_ASSIGNMENTS}/my`);
          const assigned = res.assigned_courses ?? res.assignments ?? [];
          if (Array.isArray(assigned)) {
            for (const a of assigned) {
              // a may have id (teacher_subject_id), teacher_subject_id, or subject_id
              const aId = a.id ?? a.teacher_subject_id ?? a.subject_id ?? null;
              if (String(aId) === String(courseId) || String(a.subject_id) === String(courseId)) {
                setCourseTitle(a.course_name ?? a.title ?? '');
                setCourseCode(a.course_code ?? a.code ?? '');
                // detect year_level from assignment if present
                detectedYearLevel = a.year_level ?? a.yearLevel ?? a.year ?? a.subject_year_level ?? null;
                if (detectedYearLevel) setCourseYearLevel(detectedYearLevel);
                // find section name if sectionId provided
                if (sectionId && Array.isArray(a.sections)) {
                  const sec = a.sections.find((s: any) => String(s.id) === String(sectionId) || String(s.section_id) === String(sectionId));
                  if (sec) setSectionName(sec.name ?? sec.title ?? null);
                }
                courseFound = true;
                break;
              }
            }
          }
        } catch (e) {
          // ignore and fallback
          courseFound = false;
        }

        // Fallback: try subjects endpoint if course not found
        if (!courseFound && courseId) {
          try {
            const subj = await apiGet(API_ENDPOINTS.SUBJECT_BY_ID(courseId));
            // subject controller may return { success, data } or the subject directly
            const s = subj.data ?? subj;
            setCourseTitle(s.course_name ?? s.title ?? s.name ?? '');
            setCourseCode(s.course_code ?? s.code ?? '');
            // detect year_level from subject
            detectedYearLevel = detectedYearLevel ?? (s.year_level ?? s.yearLevel ?? s.year ?? null);
            if (detectedYearLevel) setCourseYearLevel(detectedYearLevel);
          } catch (e) {}
        }

        // Resolve section name from sections endpoint if still missing
        if (sectionId && !sectionName) {
          try {
            const secRes = await apiGet(`${API_ENDPOINTS.SECTIONS}/${sectionId}`);
            const sdata = secRes.data ?? secRes;
            setSectionName(sdata.name ?? sdata.title ?? null);
          } catch (e) {}
        }

        // Fetch students for the selected section (include year_level if detected)
        if (sectionId) {
          try {
            const stuParams = new URLSearchParams();
            stuParams.set('section_id', String(sectionId));
            if (detectedYearLevel) stuParams.set('year_level', String(detectedYearLevel));
            const stuRes = await apiGet(`${API_ENDPOINTS.STUDENTS}?${stuParams.toString()}`);
            const list = stuRes.data ?? stuRes.students ?? stuRes;
            if (Array.isArray(list)) setStudents(list.map((st: any) => ({ id: st.student_id ?? st.id ?? st.user_id ?? String(st.id), name: (st.first_name && st.last_name) ? `${st.first_name} ${st.last_name}` : (st.name ?? `${st.firstName ?? ''} ${st.lastName ?? ''}`), email: st.email ?? st.user_email ?? '', status: st.status ?? st.user_status ?? 'active' })));
          } catch (e) {
            // keep existing students as fallback
          }
        }
      } catch (e) {}
    };

    fetchInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, location.search]);

  // Fetch activities for the course
  useEffect(() => {
    if (!courseId) return;
    const fetchActivities = async () => {
      try {
        const q = new URLSearchParams();
        q.set('course_id', String(courseId));
        if (selectedSectionId) q.set('section_id', String(selectedSectionId));
        const res = await apiGet(`${API_ENDPOINTS.ACTIVITIES}?${q.toString()}`);
        const actList = res.data ?? res.activities ?? [];

        if (Array.isArray(actList)) {
          // For each activity, try to resolve grading stats. Prefer server-provided stats when available,
          // otherwise fetch activity grades and compute graded / pending using the already-fetched `students` list.
          const activitiesWithStats = await Promise.all(actList.map(async (a: any) => {
            const base = {
              id: a.id,
              title: a.title,
              type: a.type,
              max_score: a.max_score,
              due_at: a.due_at,
            };

            // If backend already returned grading_stats, use it (safe and cheap)
            if (a.grading_stats && (a.grading_stats.total || a.grading_stats.graded || a.grading_stats.pending)) {
              return { ...base, grading_stats: a.grading_stats };
            }

            // Otherwise, fetch grades for the activity and compute counts using students.length as total
            try {
              // API_ENDPOINTS.ACTIVITY_GRADES may be a function that accepts activity id
              const gradesEndpoint = typeof API_ENDPOINTS.ACTIVITY_GRADES === 'function'
                ? API_ENDPOINTS.ACTIVITY_GRADES(a.id)
                : `${API_ENDPOINTS.ACTIVITY_GRADES}/${a.id}`;

              const gRes = await apiGet(gradesEndpoint);
              const gradeList = gRes.data ?? gRes.grades ?? gRes ?? [];
              const gradeArray = Array.isArray(gradeList) ? gradeList : [];

              // Count graded entries (non-null / non-empty grade values)
              const gradedCount = gradeArray.filter((g: any) => g && (g.grade !== null && g.grade !== undefined && g.grade !== '')).length;
              const totalStudents = Array.isArray(students) ? students.length : 0;
              const pending = Math.max(totalStudents - gradedCount, 0);
              const percentage = totalStudents > 0 ? Math.round((gradedCount / totalStudents) * 100) : 0;

              return {
                ...base,
                grading_stats: {
                  total: totalStudents,
                  graded: gradedCount,
                  pending,
                  percentage_graded: percentage,
                }
              };
            } catch (e) {
              // If grade fetch failed, fall back to defaults (use students length for total)
              const totalStudents = Array.isArray(students) ? students.length : 0;
              return {
                ...base,
                grading_stats: a.grading_stats || { total: totalStudents, graded: 0, pending: totalStudents, percentage_graded: 0 }
              };
            }
          }));

          setActivities(activitiesWithStats);
        }
      } catch (e) {
        // keep empty activities array as fallback
      }
    };

    fetchActivities();
  }, [courseId, selectedSectionId, students.length]);

  return (
    <DashboardLayout>
      <div className="p-8">
        <Button variant="ghost" onClick={() => navigate("/teacher/courses")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Courses
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{courseInfo.title}</h1>
          <p className="text-muted-foreground">{courseInfo.code} - {courseInfo.section}</p>
        </div>

        <div className="grid gap-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Activities</span>

                  <div className="flex items-center gap-2">
                    <Button
                      aria-pressed={viewType === "grid"}
                      title="Toggle list / grid"
                      variant="outline"
                      size="sm"
                      onClick={() => setViewType((v) => (v === "list" ? "grid" : "list"))}
                      className="text-xs flex items-center gap-1"
                    >
                      {viewType === "list" ? (
                        <>
                          <LayoutGrid className="h-4 w-4" />
                        </>
                      ) : (
                        <>
                          <List className="h-4 w-4" />
                        </>
                      )}
                    </Button>

                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={() => setIsAddOpen(true)} className="text-xs">
                          <Plus className="h-4 w-4 mr-1" />
                          Add Activity
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Activity</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="activity-title">Activity Title</Label>
                            <Input id="activity-title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Enter activity title" />
                          </div>
                          <div>
                            <Label htmlFor="activity-type">Type</Label>
                            <Select value={newType} onValueChange={(v) => setNewType(v)}>
                              <SelectTrigger id="activity-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="assignment">Assignment</SelectItem>
                                <SelectItem value="quiz">Quiz</SelectItem>
                                <SelectItem value="exam">Exam</SelectItem>
                                <SelectItem value="project">Project</SelectItem>
                                <SelectItem value="performance-task">Performance Task</SelectItem>
                                <SelectItem value="laboratory">Laboratory</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="max-score">Maximum Score</Label>
                            <Input id="max-score" type="number" value={String(newMaxScore)} onChange={(e) => setNewMaxScore(Number(e.target.value || 0))} placeholder="100" />
                          </div>
                          <div>
                            <Label htmlFor="due-date">Due Date</Label>
                            <Input id="due-date" type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} />
                          </div>
                          <div>
                            <Label htmlFor="instructions">Instructions</Label>
                            <Textarea id="instructions" value={newInstructions} onChange={(e) => setNewInstructions(e.target.value)} placeholder="Activity instructions" rows={3} />
                          </div>
                          <Button className="w-full" onClick={async () => {
                            // validate
                            if (!newTitle || !courseId) {
                              alert('Please fill in title and ensure course is loaded');
                              return;
                            }
                            try {
                              console.log('Creating activity with data:', {
                                course_id: courseId,
                                section_id: selectedSectionId,
                                title: newTitle,
                                type: newType,
                                max_score: Number(newMaxScore) || 100,
                                due_at: newDueDate || null,
                              });

                              const res = await apiPost(API_ENDPOINTS.ACTIVITIES, {
                                course_id: courseId,
                                section_id: selectedSectionId,
                                title: newTitle,
                                type: newType,
                                max_score: Number(newMaxScore) || 100,
                                due_at: newDueDate || null,
                              });

                              console.log('API Response:', res);

                              if (res.success && res.data) {
                                const newActivity = res.data;
                                // Ensure grading_stats exists
                                if (!newActivity.grading_stats) {
                                  newActivity.grading_stats = { total: 0, graded: 0, pending: 0, percentage_graded: 0 };
                                }
                                setActivities((prev) => [newActivity, ...prev]);
                                // reset
                                setNewTitle("");
                                setNewType("assignment");
                                setNewMaxScore(100);
                                setNewDueDate("");
                                setNewInstructions("");
                                setIsAddOpen(false);
                                alert('Activity created successfully!');
                              } else {
                                console.error('Unexpected response:', res);
                                alert('Failed to create activity: ' + (res.message || 'Unknown error'));
                              }
                            } catch (e) {
                              console.error('Failed to create activity:', e);
                              alert('Error: ' + (e instanceof Error ? e.message : 'Unknown error'));
                            }
                          }}>Create Activity</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* scrollable container for activities */}
                <div className="space-y-3 max-h-[360px] overflow-y-auto">
                  {viewType === "list" && activities.map((activity) => {
                    const stats = activity.grading_stats || { total: 0, graded: 0, pending: 0, percentage_graded: 0 };
                    return (
                    <div key={activity.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-semibold text-base">{activity.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-block text-xs font-medium px-2 py-1 rounded bg-primary/10 text-primary">{activity.type}</span>
                            <span className="text-xs text-muted-foreground">{activity.max_score} points</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span className="font-medium">{activity.due_at ? new Date(activity.due_at).toLocaleDateString() : 'No due date'}</span>
                        </div>
                      </div>
                      <div className="mt-3 mb-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Grading Progress</span>
                          <span className="font-semibold">{stats.graded}/{stats.total}</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <progress className="h-full w-full rounded-full overflow-hidden appearance-none" value={stats.percentage_graded} max={100} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          {stats.pending === 0 && stats.total > 0 ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span className="text-green-600 font-medium">All graded</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-4 w-4 text-amber-500" />
                              <span className="text-amber-600 font-medium">{stats.pending} pending</span>
                            </>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/teacher/courses/${courseId}/activities/${activity.id}${selectedSectionId ? `?section_id=${selectedSectionId}` : ''}`)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                    );
                  })}

                  {viewType === "grid" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {activities.map((activity) => {
                        const stats = activity.grading_stats || { total: 0, graded: 0, pending: 0, percentage_graded: 0 };
                        return (
                        <div key={activity.id} className="p-4 border border-border rounded-lg hover:shadow-md transition-shadow bg-card flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <p className="font-semibold text-sm leading-tight">{activity.title}</p>
                              </div>
                              <span className="inline-block text-xs font-medium px-2 py-1 rounded bg-primary/10 text-primary flex-shrink-0 ml-2">{activity.type}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                              <Clock className="h-3 w-3" />
                              <span>{activity.due_at ? new Date(activity.due_at).toLocaleDateString() : 'No due date'}</span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Grading</span>
                                <span className="font-semibold">{stats.graded}/{stats.total}</span>
                              </div>
                              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <progress className="h-full w-full rounded-full overflow-hidden appearance-none" value={stats.percentage_graded} max={100} />
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-1 text-xs">
                              {stats.pending === 0 && stats.total > 0 ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                  <span className="text-green-600 font-medium">Complete</span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                                  <span className="text-amber-600 font-medium">{stats.pending} left</span>
                                </>
                              )}
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => navigate(`/teacher/courses/${courseId}/activities/${activity.id}${selectedSectionId ? `?section_id=${selectedSectionId}` : ''}`)}>View</Button>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Students</span>
                  <div className="flex items-center gap-2">
                    <Button
                      aria-pressed={studentViewType === "grid"}
                      title="Toggle list / grid"
                      variant="outline"
                      size="sm"
                      onClick={() => setStudentViewType((v) => (v === "list" ? "grid" : "list"))}
                      className="text-xs flex items-center gap-1"
                    >
                      {studentViewType === "list" ? (
                        <LayoutGrid className="h-4 w-4" />
                      ) : (
                        <List className="h-4 w-4" />
                      )}
                    </Button>
                    <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={() => setIsAddStudentOpen(true)} className="text-xs">
                          <UserPlus className="h-4 w-4 mr-1" />
                          Add Student
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Student to Course</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="student-search">Search Student</Label>
                            <div className="relative">
                              <Input
                                id="student-search"
                                value={studentSearchQuery}
                                onChange={(e) => {
                                  setStudentSearchQuery(e.target.value);
                                  setSelectedStudent(null);
                                }}
                                placeholder="Enter student ID or name"
                              />
                              {studentSuggestions.length > 0 && (
                                <ul className="absolute z-30 left-0 right-0 bg-card border border-border mt-1 rounded-md max-h-40 overflow-auto">
                                  {studentSuggestions.map((s) => (
                                    <li
                                      key={s.id}
                                      onClick={() => {
                                        setSelectedStudent(s);
                                        setStudentSearchQuery(s.name + " (" + s.id + ")");
                                        setStudentSuggestions([]);
                                      }}
                                      className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                                    >
                                      <div className="font-medium">{s.name} <span className="text-xs text-muted-foreground">{s.id}</span></div>
                                      <div className="text-xs text-muted-foreground">{s.email}</div>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Note: Student addition requires admin approval
                          </p>
                          <Button
                            className="w-full"
                            onClick={() => {
                              if (selectedStudent) {
                                setStudents((prev) => [
                                  ...prev,
                                  {
                                    id: selectedStudent.id,
                                    name: selectedStudent.name,
                                    email: selectedStudent.email,
                                    status: "active",
                                  },
                                ]);
                                setStudentSearchQuery("");
                                setSelectedStudent(null);
                                setIsAddStudentOpen(false);
                              }
                            }}
                            disabled={!selectedStudent}
                          >
                            Send Request
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardTitle>
                <CardDescription>Total: {students.length} students</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Scrollable container for students */}
                <div className="max-h-[360px] overflow-y-auto">
                  {studentViewType === "list" && (
                    <div className="space-y-3">
                      {students.map((student) => (
                        <div key={student.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors shadow-sm">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-base">{student.name}</p>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                  <span className="font-medium">{student.id}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                  <Mail className="h-3 w-3" />
                                  <span className="truncate">{student.email}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {student.status === "active" ? (
                                <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  {student.status}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {studentViewType === "grid" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {students.map((student) => (
                        <div key={student.id} className="p-4 border border-border rounded-lg hover:shadow-md transition-shadow bg-card">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm">{student.name}</p>
                              <p className="text-xs text-muted-foreground">{student.id}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-1 text-xs text-muted-foreground mb-3">
                            <Mail className="h-3 w-3 flex-shrink-0 mt-0.5" />
                            <span className="truncate">{student.email}</span>
                          </div>
                          {student.status === "active" ? (
                            <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              {student.status}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CourseManagement;
