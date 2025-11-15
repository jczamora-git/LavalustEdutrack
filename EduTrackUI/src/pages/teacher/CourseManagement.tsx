import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Users, ClipboardList, UserPlus, LayoutGrid, List, CheckCircle2, AlertCircle, Clock, Mail, User, BookOpen, FileText, HelpCircle, Award, Zap, Microscope } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { API_ENDPOINTS, apiGet, apiPost } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertMessage } from "@/components/AlertMessage";

// Helper function to get activity type display label and icon
const getActivityTypeDisplay = (type: string) => {
  const typeMap: Record<string, { label: string; color: string; bgColor: string; Icon: any }> = {
    assignment: { label: 'Assignment', color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200', Icon: FileText },
    quiz: { label: 'Quiz', color: 'text-purple-600', bgColor: 'bg-purple-50 border-purple-200', Icon: HelpCircle },
    midterm: { label: 'Midterm', color: 'text-orange-600', bgColor: 'bg-orange-50 border-orange-200', Icon: Award },
    final: { label: 'Final', color: 'text-red-600', bgColor: 'bg-red-50 border-red-200', Icon: Award },
    project: { label: 'Project', color: 'text-cyan-600', bgColor: 'bg-cyan-50 border-cyan-200', Icon: Zap },
    laboratory: { label: 'Laboratory', color: 'text-green-600', bgColor: 'bg-green-50 border-green-200', Icon: Microscope },
    performance: { label: 'Performance', color: 'text-indigo-600', bgColor: 'bg-indigo-50 border-indigo-200', Icon: BookOpen },
    other: { label: 'Other', color: 'text-gray-600', bgColor: 'bg-gray-50 border-gray-200', Icon: ClipboardList },
  };
  return typeMap[type] || typeMap['other'];
};

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
  const [sections, setSections] = useState<Array<{ id: string | number; name: string }>>([]);

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

  // Activity category filter state (empty = show all)
  const activityCategories = [
    'assignment',
    'quiz',
    'midterm',
    'final',
    'project',
    'laboratory',
    'performance',
    'other',
  ];
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => (prev.includes(cat) ? prev.filter((p) => p !== cat) : [...prev, cat]));
  };

  // persist view preference
  useEffect(() => {
    try {
      localStorage.setItem("course_activities_view", viewType);
    } catch (e) {}
  }, [viewType]);

  // Add activity dialog state (controlled)
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("");
  const [newMaxScore, setNewMaxScore] = useState<string>("");
  const [newDueDate, setNewDueDate] = useState("");
  const [alert, setAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  

  // Students state and view (fetched from API)
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Academic periods
  const [academicPeriods, setAcademicPeriods] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<any | null>(null);

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

  // Fetch academic periods on mount and select current active period
  useEffect(() => {
    let mounted = true;
    const fetchPeriods = async () => {
      try {
        const res = await apiGet(API_ENDPOINTS.ACADEMIC_PERIODS);
        const list = res.data ?? res.periods ?? res ?? [];
        if (Array.isArray(list) && mounted) {
          setAcademicPeriods(list);
          const active = list.find((p: any) => p.status === 'active');
          if (active) setSelectedPeriod(active);
        }
      } catch (e) {
        // ignore
      }
    };
    fetchPeriods();
    return () => { mounted = false; };
  }, []);

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
                        if (Array.isArray(a.sections)) {
                          const secs = a.sections.map((s: any) => ({ id: s.id ?? s.section_id, name: s.name ?? s.title ?? String(s) }));
                          setSections(secs);
                          if (sectionId) {
                            const sec = secs.find((s: any) => String(s.id) === String(sectionId));
                            if (sec) setSectionName(sec.name ?? null);
                          } else if (secs.length > 0 && !sectionName) {
                            // default to first section if none specified in URL
                            setSelectedSectionId(String(secs[0].id));
                            setSectionName(secs[0].name ?? null);
                          }
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
            const secObj = { id: sdata.id ?? sectionId, name: sdata.name ?? sdata.title ?? String(sdata) };
            setSectionName(secObj.name ?? null);
            // ensure sections list contains this
            setSections((prev) => {
              if (prev.find((p) => String(p.id) === String(secObj.id))) return prev;
              return [secObj, ...prev];
            });
          } catch (e) {}
        }

            // Fetch students for the selected section (include year_level if detected)
            if (sectionId) {
              try {
                const stuParams = new URLSearchParams();
                stuParams.set('section_id', String(sectionId));
                if (detectedYearLevel) stuParams.set('year_level', String(detectedYearLevel));
                setLoadingStudents(true);
                const stuRes = await apiGet(`${API_ENDPOINTS.STUDENTS}?${stuParams.toString()}`);
                const list = stuRes.data ?? stuRes.students ?? stuRes ?? [];
                if (Array.isArray(list)) {
                  setStudents(list.map((st: any) => ({ id: st.student_id ?? st.id ?? st.user_id ?? String(st.id), name: (st.first_name && st.last_name) ? `${st.first_name} ${st.last_name}` : (st.name ?? `${st.firstName ?? ''} ${st.lastName ?? ''}`), email: st.email ?? st.user_email ?? '', status: st.status ?? st.user_status ?? 'active' })));
                } else {
                  setStudents([]);
                }
              } catch (e) {
                setStudents([]);
              } finally {
                setLoadingStudents(false);
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

  // Filter activities based on selected categories (empty = show all)
  const filteredActivities = activities.filter((a) => {
    if (!selectedCategories || selectedCategories.length === 0) return true;
    return selectedCategories.includes(a.type);
  });
  const filteredActivitiesLength = filteredActivities.length;

  return (
    <DashboardLayout>
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Header with enhanced title section */}
        <div className="border-b border-blue-100 px-8 py-6 shadow-sm">
          <Button variant="ghost" onClick={() => navigate("/teacher/courses")} className="mb-4 text-gray-600">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>

          <div className="space-y-2">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{courseInfo.title}</h1>
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold text-gray-700">{courseInfo.code}</span>
              {sections && sections.length > 0 ? (
                <div>
                  <Select value={selectedSectionId ?? undefined} onValueChange={(v) => {
                    setSelectedSectionId(v);
                    const s = sections.find((x) => String(x.id) === String(v));
                    setSectionName(s?.name ?? null);
                    // update URL param without reload
                    try {
                      const url = new URL(window.location.href);
                      url.searchParams.set('section_id', String(v));
                      window.history.replaceState({}, '', url.toString());
                    } catch (e) {}
                  }}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder={sectionName ?? 'Select section'} />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                courseInfo.section && <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{courseInfo.section}</span>
              )}
            </div>
          </div>
        </div>

        {/* Main content area that fills remaining space */}
        <div className="flex-1 overflow-hidden">
          <div className="grid gap-6 h-full grid-cols-2 p-6 min-h-0">
            {/* Activities column */}
            <div className="h-full min-h-0">
              <Card className="flex flex-col h-full border-0 rounded-lg shadow-md bg-white overflow-hidden min-h-0">
                <CardHeader className="bg-gradient-to-r from-primary/8 to-accent/8 border-b border-blue-100 px-6 py-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold text-gray-900">Activities</CardTitle>
                    <CardDescription className="text-sm text-gray-600 mt-1">Showing: {Math.min(filteredActivitiesLength, activities.length)} of {activities.length} activities</CardDescription>
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      {activityCategories.map((cat) => {
                        const info = getActivityTypeDisplay(cat);
                        const active = selectedCategories.includes(cat);
                        return (
                          <button
                            key={cat}
                            onClick={() => toggleCategory(cat)}
                            className={`text-xs inline-flex items-center gap-1 px-2 py-1 rounded-full transition-colors border ${active ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                            title={info.label}
                          >
                            <info.Icon className="h-3 w-3" />
                            <span className="sr-only">{info.label}</span>
                          </button>
                        );
                      })}
                      {selectedCategories.length > 0 && (
                        <button onClick={() => setSelectedCategories([])} className="text-xs ml-2 text-muted-foreground underline">Clear</button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      aria-pressed={viewType === "grid"}
                      title="Toggle list / grid"
                      variant="outline"
                      size="sm"
                      onClick={() => setViewType((v) => (v === "list" ? "grid" : "list"))}
                      className="text-xs flex items-center gap-1 border-gray-300"
                    >
                      {viewType === "list" ? (
                        <LayoutGrid className="h-4 w-4" />
                      ) : (
                        <List className="h-4 w-4" />
                      )}
                    </Button>

                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                        <Button size="sm" onClick={() => setIsAddOpen(true)} className="text-xs bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md rounded-full">
                          <Plus className="h-4 w-4 mr-1" />
                          Add Activity
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl border-0 shadow-2xl rounded-2xl overflow-hidden p-0">
                        <div className="px-8 py-6 bg-gradient-to-r from-blue-600 to-cyan-500 text-white">
                          <div>
                            <h3 className="text-2xl font-bold">Create New Activity</h3>
                            <p className="text-sm font-medium opacity-95 mt-2">Create a new activity for this course.</p>
                          </div>
                        </div>
                        <div className="px-8 py-6 bg-white space-y-6">
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
                                  <SelectItem value="midterm">Midterm</SelectItem>
                                  <SelectItem value="final">Final</SelectItem>
                                  <SelectItem value="project">Project</SelectItem>
                                  <SelectItem value="laboratory">Laboratory</SelectItem>
                                  <SelectItem value="performance">Performance</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="max-score">Maximum Score</Label>
                              <Input id="max-score" type="number" value={newMaxScore} onChange={(e) => setNewMaxScore(e.target.value)} placeholder="100" />
                            </div>
                            <div>
                              <Label htmlFor="due-date">Due Date <span className="text-amber-600">*</span></Label>
                              <Input id="due-date" type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} />
                            </div>
                          </div>
                          <div className="pt-2">
                            <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-full" disabled={!newTitle || !newType || !newDueDate || !newMaxScore} onClick={async () => {
                              // validate
                              if (!newTitle || !courseId) {
                                setAlert({ type: 'error', message: 'Please fill in title and ensure course is loaded' });
                                return;
                              }
                              if (!newType) {
                                setAlert({ type: 'error', message: 'Please select a category for the activity' });
                                return;
                              }
                              if (!newMaxScore || Number(newMaxScore) <= 0) {
                                setAlert({ type: 'error', message: 'Please enter a valid maximum score (greater than 0)' });
                                return;
                              }
                              if (!newDueDate) {
                                setAlert({ type: 'error', message: 'Please select a due date for the activity' });
                                return;
                              }
                              try {
                                const res = await apiPost(API_ENDPOINTS.ACTIVITIES, {
                                  course_id: courseId,
                                  section_id: selectedSectionId,
                                  title: newTitle,
                                  type: newType,
                                  max_score: Number(newMaxScore) || 100,
                                  due_at: newDueDate || null,
                                });

                                if (res.success && res.data) {
                                  const newActivity = res.data;
                                  if (!newActivity.grading_stats) {
                                    newActivity.grading_stats = { total: 0, graded: 0, pending: 0, percentage_graded: 0 };
                                  }
                                  setActivities((prev) => [newActivity, ...prev]);
                                  setNewTitle("");
                                  setNewType("");
                                  setNewMaxScore("");
                                  setNewDueDate("");
                                  setIsAddOpen(false);
                                  setAlert({ type: 'success', message: 'Activity created successfully!' });
                                } else {
                                  setAlert({ type: 'error', message: 'Failed to create activity: ' + (res.message || 'Unknown error') });
                                }
                              } catch (e) {
                                setAlert({ type: 'error', message: 'Error: ' + (e instanceof Error ? e.message : 'Unknown error') });
                              }
                            }}>Create Activity</Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0 min-h-0">
                {/* scrollable container for activities */}
                <div className="space-y-0 max-h-[calc(100vh-320px)] overflow-y-auto pr-2 min-h-0 scrollbar scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-transparent">
                  {activities.length === 0 ? (
                    <div className="p-8 text-center">
                      <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">No activities yet. Create one to get started.</p>
                    </div>
                  ) : filteredActivities.length === 0 ? (
                    <div className="p-8 text-center">
                      <ClipboardList className="h-12 w-12 text-gray-100 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">No activities match the selected categories.</p>
                    </div>
                  ) : viewType === "list" && filteredActivities.map((activity) => {
                    const stats = activity.grading_stats || { total: 0, graded: 0, pending: 0, percentage_graded: 0 };
                    return (
                    <div key={activity.id} className="p-5 border-b border-gray-100 hover:bg-gray-50 transition-colors last:border-b-0">
                      <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                          <p className="font-semibold text-base text-gray-900">{activity.title}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {(() => {
                              const typeInfo = getActivityTypeDisplay(activity.type);
                              const IconComponent = typeInfo.Icon;
                              return (
                                <Badge className={`text-xs py-1 px-2 border gap-1 flex items-center ${typeInfo.bgColor} ${typeInfo.color}`}>
                                  <IconComponent className="h-3 w-3" />
                                  {typeInfo.label}
                                </Badge>
                              );
                            })()}
                            <span className="text-xs text-gray-500 font-medium">{activity.max_score} points</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500 flex-shrink-0">
                          <Clock className="h-4 w-4" />
                          <span className="font-medium">{activity.due_at ? new Date(activity.due_at).toLocaleDateString() : 'No due date'}</span>
                        </div>
                      </div>
                      <div className="mt-4 mb-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600 font-medium">Grading Progress</span>
                          <span className="font-bold text-blue-600">{stats.graded}/{stats.total}</span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
                          <div 
                            className="h-full rounded-full transition-all duration-300" 
                            style={{
                              width: `${stats.percentage_graded}%`,
                              background: stats.percentage_graded === 100 ? '#10b981' : stats.percentage_graded >= 50 ? '#2563eb' : '#f59e0b',
                            }}
                          />
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
                      {filteredActivities.map((activity) => {
                        const stats = activity.grading_stats || { total: 0, graded: 0, pending: 0, percentage_graded: 0 };
                        return (
                        <div key={activity.id} className="p-4 border border-border rounded-lg hover:shadow-md transition-shadow bg-card flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <p className="font-semibold text-sm leading-tight">{activity.title}</p>
                              </div>
                              {(() => {
                                const typeInfo = getActivityTypeDisplay(activity.type);
                                const IconComponent = typeInfo.Icon;
                                return (
                                  <Badge className={`text-xs py-1 px-2 border gap-1 flex items-center ${typeInfo.bgColor} ${typeInfo.color} flex-shrink-0`}>
                                    <IconComponent className="h-3 w-3" />
                                    {typeInfo.label}
                                  </Badge>
                                );
                              })()}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                              <Clock className="h-3 w-3" />
                              <span>{activity.due_at ? new Date(activity.due_at).toLocaleDateString() : 'No due date'}</span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground font-medium">Grading</span>
                                <span className="font-bold text-primary">{stats.graded}/{stats.total}</span>
                              </div>
                              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
                                <div 
                                  className="h-full rounded-full transition-all duration-300" 
                                  style={{
                                    width: `${stats.percentage_graded}%`,
                                    background: stats.percentage_graded === 100 ? '#10b981' : stats.percentage_graded >= 50 ? '#2563eb' : '#f59e0b',
                                  }}
                                />
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
              {/* Render alert messages at the bottom like admin pages */}
              {alert && <AlertMessage type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}
            </Card>
            </div>

            {/* Students column */}
            <div className="h-full min-h-0">
            <Card className="flex flex-col h-full border-0 rounded-lg shadow-md bg-white overflow-hidden min-h-0">
              <CardHeader className="bg-gradient-to-r from-primary/8 to-accent/8 border-b border-blue-100 px-6 py-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold text-gray-900">Students</CardTitle>
                    <CardDescription className="text-sm text-gray-600 mt-1">{students.length} students enrolled</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      aria-pressed={studentViewType === "grid"}
                      title="Toggle list / grid"
                      variant="outline"
                      size="sm"
                      onClick={() => setStudentViewType((v) => (v === "list" ? "grid" : "list"))}
                      className="text-xs flex items-center gap-1 border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                      {studentViewType === "list" ? (
                        <LayoutGrid className="h-4 w-4" />
                      ) : (
                        <List className="h-4 w-4" />
                      )}
                    </Button>
                    <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
                        <DialogTrigger asChild>
                        <Button size="sm" onClick={() => setIsAddStudentOpen(true)} className="text-xs bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-full shadow-md">
                          <UserPlus className="h-4 w-4 mr-1" />
                          Add Student
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl border-0 shadow-2xl rounded-2xl overflow-hidden p-0">
                        <div className="px-8 py-6 bg-gradient-to-r from-blue-600 to-cyan-500 text-white">
                          <div>
                            <h3 className="text-2xl font-bold">Add Student to Course</h3>
                            <p className="text-sm font-medium opacity-95 mt-2">Search for a student to request enrollment.</p>
                          </div>
                        </div>
                        <div className="px-8 py-6 bg-white space-y-6">
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
                            className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-full"
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
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0 min-h-0">
                {/* Scrollable container for students */}
                <div className="max-h-[calc(100vh-320px)] overflow-y-auto pr-2 min-h-0 scrollbar scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-transparent">
                  {studentViewType === "list" && (
                    <div className="divide-y divide-gray-200">
                      {students.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <User className="h-12 w-12 text-gray-300 mb-3" />
                          <p className="text-gray-500 text-sm">No students enrolled yet</p>
                        </div>
                      ) : (
                        students.map((student) => (
                          <div key={student.id} className="p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <User className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900">{student.name}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                  <span className="font-medium">{student.id}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                  <Mail className="h-3 w-3" />
                                  <span className="truncate">{student.email}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {student.status === "active" ? (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border border-green-300">
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
                        ))
                      )}
                    </div>
                  )}

                  {studentViewType === "grid" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
                      {students.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                          <User className="h-12 w-12 text-gray-300 mb-3" />
                          <p className="text-gray-500 text-sm">No students enrolled yet</p>
                        </div>
                      ) : (
                        students.map((student) => (
                          <div key={student.id} className="p-4 border border-gray-100 rounded-lg hover:shadow-sm transition-shadow bg-white hover:bg-gray-50">
                            <div className="flex items-start gap-3 mb-3">
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <User className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 text-sm">{student.name}</p>
                                <p className="text-xs text-gray-500">{student.id}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-1 text-xs text-gray-500 mb-3">
                              <Mail className="h-3 w-3 flex-shrink-0 mt-0.5" />
                              <span className="truncate">{student.email}</span>
                            </div>
                            {student.status === "active" ? (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border border-green-300 text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                {student.status}
                              </Badge>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            </div>
          </div>
        </div>

        {/* Alert messages at the bottom */}
        {alert && <AlertMessage type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}
      </div>
    </DashboardLayout>
  );
};

export default CourseManagement;
