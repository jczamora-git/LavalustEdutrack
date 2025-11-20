import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, BookOpen, Loader2, Check, X } from "lucide-react";
import { AlertMessage } from "@/components/AlertMessage";
import { API_ENDPOINTS, apiGet, apiPost } from "@/lib/api";
import { toast } from "sonner";

type Teacher = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string;
  phone?: string;
  status: "active" | "inactive";
};

type Subject = {
  id: string;
  code: string;
  title: string;
  units: number;
  yearLevel?: string;
};

type AssignedCourse = {
  id?: string;
  course: string;
  title?: string;
  units?: number;
  sections: string[];
  yearLevel: string;
};

type YearLevelSection = {
  year_level_id: number;
  section: { id: number; name: string } | string;
  section_id?: number;
  section_name?: string;
  name?: string;
  id?: number;
};

const TeacherCourseAssignment = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { teacherId } = useParams<{ teacherId: string }>();

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignedCourses, setAssignedCourses] = useState<AssignedCourse[]>([]);
  const [yearLevelSectionsMap, setYearLevelSectionsMap] = useState<Record<string, { id: number; name: string }[]>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [isAddSubjectPanelOpen, setIsAddSubjectPanelOpen] = useState(false);
  const [pendingSubject, setPendingSubject] = useState<Subject | null>(null);
  const [isAvailableCoursesOpen, setIsAvailableCoursesOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const showAlert = (type: "success" | "error" | "info", message: string) => {
    setAlert({ type, message });
  };

  const ordinal = (n: number) => {
    if (n % 10 === 1 && n % 100 !== 11) return `${n}st Year`;
    if (n % 10 === 2 && n % 100 !== 12) return `${n}nd Year`;
    if (n % 10 === 3 && n % 100 !== 13) return `${n}rd Year`;
    return `${n}th Year`;
  };

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      navigate("/auth");
    } else if (teacherId) {
      fetchTeacher();
      fetchSubjects();
      fetchYearLevelData();
      fetchAssignedCourses();
    }
  }, [isAuthenticated, user, navigate, teacherId]);

  // Fetch taken sections for any assigned course when assignedCourses changes
  useEffect(() => {
    if (!teacherId) return;
    // build unique list of course codes to query
    const courses = Array.from(new Set(assignedCourses.map((a) => a.course))).filter(Boolean);
    if (courses.length) {
      console.log('[TeacherCourseAssignment] Fetching taken sections for courses:', courses);
      fetchTakenSectionsBulk(courses);
    }
  }, [assignedCourses, teacherId]);

  const fetchTeacher = async () => {
    try {
      const res = await apiGet(`${API_ENDPOINTS.TEACHER_BY_ID(teacherId)}`);
      if (res && res.success && res.teacher) {
        setTeacher({
          id: res.teacher.id.toString(),
          firstName: res.teacher.first_name,
          lastName: res.teacher.last_name,
          email: res.teacher.email,
          employeeId: res.teacher.employee_id,
          phone: res.teacher.phone,
          status: res.teacher.status,
        });
      } else {
        showAlert("error", "Failed to load teacher information");
        setTimeout(() => navigate("/admin/users/teachers"), 2000);
      }
    } catch (err: any) {
      console.error("Fetch teacher error:", err);
      showAlert("error", err.message || "Failed to load teacher");
      setTimeout(() => navigate("/admin/users/teachers"), 2000);
    }
  };

  const fetchSubjects = async () => {
    try {
      // Try to fetch current active academic period so we can limit subjects
      let semesterParam: string | null = null;
      try {
        const ap = await apiGet(API_ENDPOINTS.ACADEMIC_PERIODS_ACTIVE);
        const active = ap && (ap.active || ap.period || ap.academic_period || ap);
        if (active && active.semester) {
          const m = String(active.semester).match(/^(\d+)/);
          semesterParam = m ? (String(m[1]) === '1' ? '1st' : '2nd') : String(active.semester);
        }
      } catch (err) {
        console.debug('Failed to fetch active academic period, will fetch subjects without semester filter', err);
      }

      // First attempt: request subjects filtered by semester (server-side filtering)
      let res: any = null;
      if (semesterParam) {
        res = await apiGet(`${API_ENDPOINTS.SUBJECTS}?semester=${encodeURIComponent(semesterParam)}`);
      } else {
        res = await apiGet(API_ENDPOINTS.SUBJECTS);
      }

      let rows = (res && res.subjects) || (Array.isArray(res) ? res : res && res.rows ? res.rows : []);

      // Fallback: if server-side filtered result is empty but we have a semester, fetch all and filter client-side
      if ((!rows || rows.length === 0) && semesterParam) {
        try {
          const all = await apiGet(API_ENDPOINTS.SUBJECTS);
          const allRows = (all && all.subjects) || (Array.isArray(all) ? all : all && all.rows ? all.rows : []);
          if (Array.isArray(allRows)) {
            rows = allRows.filter((s: any) => {
              const semRaw = s.semester ?? s.academic_period_semester ?? s.sem ?? s.period ?? '';
              if (!semRaw) return false;
              const mm = String(semRaw).match(/^(\d+)/);
              const semShort = mm ? (String(mm[1]) === '1' ? '1st' : '2nd') : String(semRaw);
              return semShort === semesterParam;
            });
          }
        } catch (err) {
          console.debug('Failed to fetch all subjects for client-side semester filter', err);
        }
      }

      // If we have an active semester, enforce it client-side too because some
      // backend implementations ignore the semester query param and return all subjects.
      if (semesterParam && Array.isArray(rows) && rows.length) {
        rows = rows.filter((s: any) => {
          const semRaw = s.semester ?? s.academic_period_semester ?? s.sem ?? s.period ?? s.period_name ?? s.semester_name ?? '';
          if (!semRaw) return false;
          const mm = String(semRaw).match(/(\d+)/);
          const semShort = mm ? (String(mm[1]) === '1' ? '1st' : '2nd') : String(semRaw).replace(/semester/i, '').trim();
          // Accept if normalized short matches or if the raw includes the semesterParam
          return semShort === semesterParam || String(semRaw).toLowerCase().includes(String(semesterParam).toLowerCase());
        });
      }

      if (Array.isArray(rows)) {
        const mapped = rows.map((s: any) => ({
          id: s.id?.toString() || "",
          code: (s.course_code || s.code || "").toUpperCase(),
          title: s.course_name || s.title || "",
          units: s.credits ?? s.units ?? 3,
          yearLevel: s.year_level ?? s.yearLevel ?? s.year ?? "",
        }));
        setSubjects(mapped);
      }
    } catch (err) {
      console.error("Fetch subjects error:", err);
    }
  };

  const fetchYearLevelData = async () => {
    try {
      const res = await apiGet(API_ENDPOINTS.YEAR_LEVEL_SECTIONS);

      // Accept multiple response shapes from the backend:
      // - { year_level_sections: [...] }
      // - { mappings: [...] }
      // - { organized: { "1st Year": ["F1",...] } }
      // - array directly
      const map: Record<string, { id: number; name: string }[]> = {};

      const mappings = res && (res.mappings || res.year_level_sections || res.rows || (Array.isArray(res) ? res : []));
      const organized = res && res.organized;

      // If API returned an 'organized' shape (display-name => [section names]) use it
      if (organized && typeof organized === "object") {
        for (const [display, list] of Object.entries(organized)) {
          if (!Array.isArray(list)) continue;
          map[display] = list.map((n: any, i: number) => ({ id: i + 1, name: String(n) }));
          // also add numeric key if we can extract
          const m = String(display).match(/^(\d+)/);
          if (m) map[m[1]] = map[display];
        }
      }

      // If API gave mappings (flat rows), use them to populate numeric and display keys
      if (Array.isArray(mappings) && mappings.length) {
        for (const r of mappings) {
          const ylId = r.year_level_id ?? r.year_level ?? r.year_level_id;
          const sectionName = r.section_name ?? r.section ?? r.name ?? r.section_name;
          const display = r.year_level_name ?? ordinal(Number(ylId));
          if (!ylId || !sectionName) continue;

          const keyId = String(ylId);
          if (!map[keyId]) map[keyId] = [];
          if (!map[keyId].some((s) => s.name === sectionName)) map[keyId].push({ id: Number(r.section_id ?? r.id ?? 0), name: String(sectionName) });

          if (!map[display]) map[display] = map[keyId];
        }
      }

      setYearLevelSectionsMap(map);
    } catch (err) {
      console.error("Fetch year level sections error:", err);
    }
  };

  const fetchAssignedCourses = async () => {
    try {
      const res = await apiGet(API_ENDPOINTS.TEACHER_ASSIGNMENTS_BY_TEACHER(teacherId));
      // prefer the normalized assigned_courses array, but keep raw assignments too
      const courses = (res && (res.assigned_courses || res.assignedCourses || res.assignments)) || (Array.isArray(res) ? res : []);
      const raw = (res && res.assignments) || null;

      if (Array.isArray(courses)) {
        const mapped = courses.map((c: any) => ({
          id: (c.teacher_subject_id ?? c.id)?.toString(),
          course: c.course_code || (c.subject && c.subject.course_code) || c.course || "",
          title: c.course_name || (c.subject && c.subject.course_name) || c.title,
          units: c.credits ?? c.units,
          sections: (c.sections || []).map((s: any) => (typeof s === "string" ? s : s.name || s)),
          yearLevel: c.year_level || (c.subject && c.subject.year_level) || "1st Year",
        }));
        setAssignedCourses(mapped);
        // keep a snapshot of original assignments to compute diffs on save
        setOriginalAssignments(mapped);

        // Build persistedSectionsMap from raw assignments if available (sections with ids)
        const map: Record<string, { section_id?: number; name: string; teacher_subject_id?: number }[]> = {};
        const source = Array.isArray(raw) ? raw : (Array.isArray(res.assignments) ? res.assignments : null);
        if (Array.isArray(source)) {
          for (const a of source) {
            const courseCode = a.course_code || (a.subject && a.subject.course_code) || "";
            const tsid = a.teacher_subject_id ?? null;
            const secs = a.sections || [];
            if (!map[courseCode]) map[courseCode] = [];
            for (const s of secs) {
              if (typeof s === 'string') {
                map[courseCode].push({ name: s, teacher_subject_id: tsid });
              } else if (s && (s.name || s.id)) {
                map[courseCode].push({ section_id: s.id ?? null, name: s.name ?? String(s), teacher_subject_id: tsid });
              }
            }
          }
        }
        setPersistedSectionsMap(map);
      }
    } catch (err) {
      console.error("Fetch assigned courses error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // snapshot of assignments loaded from server to compute creates/updates/deletes
  const [originalAssignments, setOriginalAssignments] = useState<AssignedCourse[]>([]);
  // map course code -> array of persisted section objects { section_id, name, teacher_subject_id }
  const [persistedSectionsMap, setPersistedSectionsMap] = useState<Record<string, { section_id?: number; name: string; teacher_subject_id?: number }[]>>({});
  // sections taken by other teachers for a given subject/course_code
  const [takenSectionsMap, setTakenSectionsMap] = useState<Record<string, { name: string; teacher_id: number; teacher_subject_id?: number; teacher_name?: string }[]>>({});

  const fetchTakenSections = async (courseCode: string) => {
    if (!courseCode) return;
    try {
      const res = await apiGet(`${API_ENDPOINTS.TEACHER_ASSIGNMENTS}?subject_code=${encodeURIComponent(courseCode)}`);
      const rows = (res && res.assignments) || [];
      const list: { name: string; teacher_id: number; teacher_subject_id?: number; teacher_name?: string }[] = [];
      if (Array.isArray(rows)) {
        for (const a of rows) {
          const teacherIdNum = a.teacher_id ?? (a.teacher && a.teacher.id) ?? null;
          const teacherName = a.teacher ? `${a.teacher.first_name || ''} ${a.teacher.last_name || ''}`.trim() : undefined;
          const secs = a.sections || [];
          for (const s of secs) {
            if (typeof s === 'string') {
              list.push({ name: s, teacher_id: Number(teacherIdNum), teacher_subject_id: a.teacher_subject_id ?? null, teacher_name: teacherName });
            } else if (s && (s.name || s.id)) {
              list.push({ name: s.name ?? String(s), teacher_id: Number(teacherIdNum), teacher_subject_id: a.teacher_subject_id ?? null, teacher_name: teacherName });
            }
          }
        }
      }
      setTakenSectionsMap((prev) => ({ ...prev, [courseCode]: list }));
    } catch (err) {
      console.error('Failed to fetch taken sections for', courseCode, err);
    }
  };

  // Bulk fetch: request taken sections for many courses in a single request
  const fetchTakenSectionsBulk = async (courseCodes: string[]) => {
    const codes = (courseCodes || []).filter(Boolean);
    if (!codes.length) return;
    try {
      // Expect backend to accept a comma-separated subject_codes query param
      const q = `subject_codes=${encodeURIComponent(codes.join(","))}`;
      console.log('[fetchTakenSectionsBulk] Query:', q);
      const res = await apiGet(`${API_ENDPOINTS.TEACHER_ASSIGNMENTS}?${q}`);
      console.log('[fetchTakenSectionsBulk] Response:', res);
      const rows = (res && res.assignments) || [];
      const newMap: Record<string, { name: string; teacher_id: number; teacher_subject_id?: number; teacher_name?: string }[]> = {};

      if (Array.isArray(rows)) {
        for (const a of rows) {
          const courseCode = a.course_code || (a.subject && a.subject.course_code) || a.course || "";
          if (!courseCode) continue;
          if (!newMap[courseCode]) newMap[courseCode] = [];
          const teacherIdNum = a.teacher_id ?? (a.teacher && a.teacher.id) ?? null;
          const teacherName = a.teacher ? `${a.teacher.first_name || ''} ${a.teacher.last_name || ''}`.trim() : undefined;
          const secs = a.sections || [];
          for (const s of secs) {
            if (typeof s === 'string') {
              newMap[courseCode].push({ name: s, teacher_id: Number(teacherIdNum), teacher_subject_id: a.teacher_subject_id ?? null, teacher_name: teacherName });
            } else if (s && (s.name || s.id)) {
              newMap[courseCode].push({ name: s.name ?? String(s), teacher_id: Number(teacherIdNum), teacher_subject_id: a.teacher_subject_id ?? null, teacher_name: teacherName });
            }
          }
        }
      }

      console.log('[fetchTakenSectionsBulk] Built takenSectionsMap:', newMap);
      setTakenSectionsMap((prev) => ({ ...prev, ...newMap }));
    } catch (err) {
      console.error('Failed to bulk fetch taken sections', err);
    }
  };

  // Open the Available Courses panel and prefetch taken sections so availability is accurate
  const handleOpenAvailablePanel = async () => {
    try {
      const codes = subjects.map((s) => s.code).filter(Boolean);
      if (codes.length) {
        await fetchTakenSectionsBulk(codes);
      }
    } catch (err) {
      console.error('[handleOpenAvailablePanel] Failed to prefetch taken sections', err);
    } finally {
      setIsAvailableCoursesOpen(true);
    }
  };

  const toggleAssignCourse = async (subject: Subject, assign: boolean) => {
    if (assign) {
      // Check if already assigned
      if (assignedCourses.some((ac) => ac.course === subject.code)) {
        showAlert("info", "Course already assigned");
        return;
      }
      // Add new assignment locally (persist on batch save)
      const newAssignment: AssignedCourse = {
        course: subject.code,
        title: subject.title,
        units: subject.units,
        sections: [],
        yearLevel: "1st Year",
      };
      setAssignedCourses([...assignedCourses, newAssignment]);
      showAlert("success", `${subject.code} added`);
    } else {
      // Remove assignment locally (persist deletion on batch save)
      setAssignedCourses(assignedCourses.filter((ac) => ac.course !== subject.code));
      showAlert("success", `${subject.code} removed`);
    }
  };

  // Remove assignment immediately from the database (not just local state)
  const removeAssignment = async (courseCode: string, teacherSubjectId?: string) => {
    if (!teacherId) return;
    const confirmMsg = `Are you sure you want to remove ${courseCode} from this teacher? This will delete the assignment and all assigned sections.`;
    if (!confirm(confirmMsg)) return;

    try {
      setIsSaving(true);
      const payload: any = {};
      if (teacherSubjectId) payload.teacher_subject_id = Number(teacherSubjectId);
      else {
        payload.teacher_id = Number(teacherId);
        payload.course_code = courseCode;
      }

      await apiPost(`${API_ENDPOINTS.TEACHER_ASSIGNMENTS}/remove-assignment`, payload);

      // Update local state: remove course from assignedCourses and persisted map
      setAssignedCourses((prev) => prev.filter((a) => a.course !== courseCode));
      setPersistedSectionsMap((prev) => {
        const copy = { ...prev };
        delete copy[courseCode];
        return copy;
      });

      // refresh taken sections so availability updates
      fetchTakenSectionsBulk([courseCode]);

      showAlert('success', `${courseCode} removed`);
    } catch (err: any) {
      console.error('Failed to remove assignment', err);
      showAlert('error', err?.message || 'Failed to remove assignment');
    } finally {
      setIsSaving(false);
    }
  };

  const updateAssignmentYearLevel = (courseCode: string, yearLevel: string) => {
    setAssignedCourses((prev) =>
      prev.map((ac) =>
        ac.course === courseCode
          ? {
              ...ac,
              yearLevel,
              sections: [], // Clear sections when year level changes
            }
          : ac
      )
    );
  };

  const toggleSection = (courseCode: string, section: string) => {
    setAssignedCourses((prev) =>
      prev.map((ac) =>
        ac.course === courseCode
          ? {
              ...ac,
              sections: ac.sections.includes(section)
                ? ac.sections.filter((s) => s !== section)
                : [...ac.sections, section],
            }
          : ac
      )
    );
  };

  const saveAssignments = async () => {
    if (!teacherId) return;
    setIsSaving(true);
    try {
      // Send a single batch payload with all assignments. Server should
      // process creates/updates/deletes transactionally.
      const payload = {
        teacher_id: teacherId,
        assignments: assignedCourses.map((a) => ({
          id: a.id,
          course_code: a.course,
          year_level: a.yearLevel,
          sections: a.sections,
        })),
      };

      const res = await apiPost(API_ENDPOINTS.TEACHER_ASSIGNMENTS, payload);

      // Prefer structured information returned by the server about what was processed.
      const processed = res && (res.assignments || res.processed || res.saved_assignments || res.data || null);

      if (Array.isArray(processed) && processed.length) {
        // Build a readable summary: subject id/code - year level - sections
        const lines = processed.map((p: any) => {
          const subj = p.subject_id ?? p.course_id ?? p.course_code ?? p.course ?? p.id ?? "unknown";
          const year = p.year_level ?? p.yearLevel ?? p.year ?? "?";
          const secs = Array.isArray(p.sections) ? p.sections.join(", ") : p.sections || "(none)";
          return `${subj} — ${year} — ${secs}`;
        });
        showAlert("success", `Assignments processed:\n${lines.join("\n")}`);
      } else if (res && (res.success || res.saved)) {
        // Server confirmed but didn't return details; show what we sent
        const lines = payload.assignments.map((p: any) => `${p.course_code ?? p.course ?? "unknown"} — ${p.year_level} — ${(p.sections || []).join(", ") || "(none)"}`);
        showAlert("success", `Assignments processed (sent):\n${lines.join("\n")}`);
      } else if (res && res.error) {
        showAlert("error", res.error || "Failed to save assignments");
      } else {
        // Fallback: generic success
        showAlert("success", "Course assignments saved");
      }

  // Refresh canonical assignments from server and stay on the page so admin
  // can continue editing without being redirected.
  await fetchAssignedCourses();
  // After refresh, also fetch taken sections for current assigned courses to update disabling
  const coursesAfter = Array.from(new Set(assignedCourses.map((a) => a.course))).filter(Boolean);
  if (coursesAfter.length) await fetchTakenSectionsBulk(coursesAfter);
    } catch (err: any) {
      console.error("Save assignments error:", err);
      showAlert("error", err.message || "Failed to save assignments");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthenticated) return null;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">Loading teacher information...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!teacher) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <div className="text-center py-16">
            <p className="text-lg text-muted-foreground">Teacher not found</p>
            <Button onClick={() => navigate("/admin/users/teachers")} className="mt-4">
              Back to Teachers
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const filteredSubjects = subjects.filter(
    (s) =>
      searchQuery.trim() === "" ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Apply year level filter (from subject metadata) if set
  const subjectsWithYear = filteredSubjects.map((s) => ({
    subject: s,
    year: ((s as any).year_level || (s as any).yearLevel || (s as any).year || "") as string,
  }));

  const unassignedSubjects = subjectsWithYear
    .filter(({ subject }) => !assignedCourses.some((ac) => ac.course === subject.code))
    .filter(({ subject, year }) => {
      if (yearFilter === "all") return true;
      return String(year) === String(yearFilter);
    })
    // Exclude subjects that have no available sections left (all sections occupied)
    .filter(({ subject, year }) => {
      // Determine year key from subject metadata or fallback to year
      const subjectYear = (subject as any).yearLevel || year || "";
      let yearKey = String(subjectYear || "");

      let byYear = yearLevelSectionsMap[yearKey];
      if ((!byYear || !byYear.length) && yearKey) {
        const m = String(yearKey).match(/^(\d+)/);
        if (m) byYear = yearLevelSectionsMap[m[1]];
      }

      // If we don't know the sections for this year, keep the subject (can't determine fullness)
      if (!byYear || !byYear.length) return true;

      const totalNames = byYear.map((b) => String(b.name));
      const totalCount = totalNames.length;

      // Sections already taken by other teachers
      const taken = (takenSectionsMap[subject.code] || []).map((t: any) => String(t.name)).filter(Boolean);
      // Sections persisted for this teacher (from persistedSectionsMap)
      const persisted = (persistedSectionsMap[subject.code] || []).map((p: any) => String(p.name)).filter(Boolean);
      // Sections assigned in current local state for this teacher
      const localAssigned = (assignedCourses.find((ac) => ac.course === subject.code)?.sections) || [];

      const occupied = new Set<string>([...taken, ...persisted, ...localAssigned]);

      // If all sections are occupied, exclude the subject from available list
      if (occupied.size >= totalCount) return false;
      return true;
    })
    .map(({ subject }) => subject as Subject);

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/users/teachers")} className="hover:bg-muted">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Manage Teacher Courses
              </h1>
              <p className="text-muted-foreground">
                {teacher.firstName} {teacher.lastName} ({teacher.employeeId})
              </p>
            </div>
          </div>
          <Button
            onClick={() => handleOpenAvailablePanel()}
            className="bg-gradient-to-r from-primary to-accent text-white font-semibold gap-2 shadow-lg hover:shadow-xl transition-all"
          >
            <Check className="h-4 w-4" />
            Add Course
          </Button>
        </div>

            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-muted/50 to-muted border-b pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Assigned Courses ({assignedCourses.length})</CardTitle>
                    <CardDescription>Configure sections per year level</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate("/admin/users/teachers")}>
                      Cancel
                    </Button>
                    <Button
                      onClick={saveAssignments}
                      disabled={isSaving}
                      className="bg-gradient-to-r from-primary to-accent text-white"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {assignedCourses.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">No courses assigned yet</p>
                    <p className="text-sm">Click "Add Course" in the header to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assignedCourses.map((ac) => (
                      <div key={ac.course} className="p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors space-y-3">
                        {/* Course Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-lg">{ac.course}</p>
                            <p className="text-sm text-muted-foreground">{ac.title}</p>
                            <p className="text-xs text-muted-foreground">{ac.units} units</p>
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              // If this assignment exists in DB (has id), remove from DB. Otherwise just remove locally.
                              if (ac.id) removeAssignment(ac.course, ac.id);
                              else toggleAssignCourse({ id: "", code: ac.course, title: ac.title || "", units: ac.units || 0 }, false);
                            }}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Remove
                          </Button>
                        </div>

                        {/* Year Level & Sections */}
                        <div className="space-y-3 pt-3 border-t">
                          <div>
                            <Label className="text-sm font-semibold mb-2 block">Year Level</Label>
                            {/* Use the subject's dedicated year level (from subjects data) when available. This replaces the editable dropdown so
                                the UI only shows sections that belong to the subject's configured year level. */}
                            {(() => {
                              const subj = subjects.find((s) => s.code === ac.course);
                              const subjectYear = subj && ( (subj as any).year_level || (subj as any).yearLevel || (subj as any).year ) ?
                                ((subj as any).year_level || (subj as any).yearLevel || (subj as any).year) : ac.yearLevel;

                              return (
                                <Badge className="px-3 py-2 text-sm font-medium">
                                  {String(subjectYear)}
                                </Badge>
                              );
                            })()}
                          </div>

                          <div>
                            <Label className="text-sm font-semibold mb-2 block">Sections</Label>
                            <div className="flex gap-2 flex-wrap">
                              {(() => {
                                // Prefer the subject's dedicated year level (from subjects table) so we only show sections
                                // relevant to that subject. Fallback to ac.yearLevel or "1st Year".
                                const subj = subjects.find((s) => s.code === ac.course);
                                const subjectYear = subj && ( (subj as any).year_level || (subj as any).yearLevel || (subj as any).year ) ?
                                  ((subj as any).year_level || (subj as any).yearLevel || (subj as any).year) : ac.yearLevel;
                                const yearKey = subjectYear || ac.yearLevel || "1st Year";
                                let byYear = yearLevelSectionsMap[yearKey];

                                if (!byYear) {
                                  const match = yearKey.match(/^(\d+)/);
                                  if (match) {
                                    byYear = yearLevelSectionsMap[match[1]];
                                  }
                                }

                                const names = (byYear && byYear.length ? byYear.map((x) => x.name) : []);
                                if (!names.length) {
                                  return (
                                    <div className="text-sm text-muted-foreground">No sections defined for this year level</div>
                                  );
                                }
                                return names.map((s) => {
                                  const active = ac.sections.includes(s);
                                  // check if this section exists in DB (persisted for this teacher)
                                  const persisted = (persistedSectionsMap[ac.course] || []).find((ps) => ps.name === s);
                                  // check if this section is taken by another teacher
                                  const taken = (takenSectionsMap[ac.course] || []).find((ts) => ts.name === s && String(ts.teacher_id) !== String(teacherId));

                                  console.log(`[Section ${s}] course=${ac.course}, teacherId=${teacherId}, takenMap=`, takenSectionsMap[ac.course], 'taken=', taken);

                                  if (taken) {
                                    // disabled for this teacher because another teacher has it
                                    return (
                                      <Button key={s} size="sm" variant="outline" disabled title={`Assigned to ${taken.teacher_name || 'another teacher'}`} className="font-medium opacity-60">
                                        {s}
                                      </Button>
                                    );
                                  }

                                  return (
                                    <div key={s} className="relative group">
                                      <Button
                                        size="sm"
                                        variant={active ? "default" : "outline"}
                                        className="font-medium"
                                        onClick={() => {
                                          // Only allow toggle for non-persisted (local) selections.
                                          if (!persisted) toggleSection(ac.course, s);
                                        }}
                                      >
                                        {s}
                                      </Button>
                                      {persisted && (
                                        <button
                                          title="Delete persisted section"
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            const confirmMsg = `Are you sure you want to remove section ${s} for ${ac.course}? This will delete the assignment in the database.`;
                                            if (!confirm(confirmMsg)) return;
                                            try {
                                              setIsSaving(true);
                                              // call backend to remove the section mapping
                                              const payload = {
                                                teacher_subject_id: persisted.teacher_subject_id ?? ac.id,
                                                section_id: persisted.section_id ?? null,
                                              };
                                              await apiPost(`${API_ENDPOINTS.TEACHER_ASSIGNMENTS}/remove-section`, payload);
                                              // update local states: remove section from assignedCourses and persistedSectionsMap
                                              setAssignedCourses((prev) => prev.map((p) => p.course === ac.course ? { ...p, sections: p.sections.filter((x) => x !== s) } : p));
                                              setPersistedSectionsMap((prev) => {
                                                const copy = { ...prev };
                                                copy[ac.course] = (copy[ac.course] || []).filter((x) => x.name !== s);
                                                return copy;
                                              });
                                              // also refresh taken sections for this course so UI updates (bulk-friendly)
                                              fetchTakenSectionsBulk([ac.course]);
                                              showAlert('success', `Section ${s} removed`);
                                            } catch (err: any) {
                                              console.error('Failed to remove persisted section', err);
                                              showAlert('error', err?.message || 'Failed to remove section');
                                            } finally {
                                              setIsSaving(false);
                                            }
                                          }}
                                          className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

        {alert && <AlertMessage type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}
        
        {/* Available Courses Side Panel */}
        {isAvailableCoursesOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/40 transition-opacity" onClick={() => setIsAvailableCoursesOpen(false)} />
            <div className="relative ml-auto w-full max-w-2xl bg-background shadow-2xl flex flex-col border-l border-border">
              <div className="bg-gradient-to-r from-primary to-accent p-6 text-white flex items-center justify-between border-b border-accent-200">
                <h2 className="text-2xl font-bold">Add Course</h2>
                <button
                  onClick={() => setIsAvailableCoursesOpen(false)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-all"
                  title="Close"
                  aria-label="Close"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="flex gap-3 mb-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search courses..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-10"
                    />
                  </div>
                  <div className="w-40">
                    <Select value={yearFilter} onValueChange={(v) => setYearFilter(v)}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {Array.from(
                          new Set(
                            subjects
                              .map((s) => ((s as any).year_level || (s as any).yearLevel || (s as any).year || "") as string)
                              .filter(Boolean)
                          )
                        )
                          .sort((a, b) => {
                            // Extract numeric year from strings like "1st Year", "2nd Year", etc.
                            const aNum = parseInt(a) || 0;
                            const bNum = parseInt(b) || 0;
                            return aNum - bNum;
                          })
                          .map((y) => (
                            <SelectItem key={y} value={y}>{String(y)}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2">
                  {unassignedSubjects.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{subjects.length === 0 ? "No courses available" : "All courses assigned"}</p>
                    </div>
                  ) : (
                    unassignedSubjects.map((subject) => (
                      <div
                        key={subject.id}
                        className="p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors flex items-start justify-between gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{subject.code}</p>
                          <p className="text-xs text-muted-foreground truncate">{subject.title}</p>
                          <p className="text-xs text-muted-foreground">{subject.units} units</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPendingSubject(subject);
                            setIsAddSubjectPanelOpen(true);
                            setIsAvailableCoursesOpen(false);
                          }}
                          className="flex-shrink-0 gap-1"
                        >
                          <Check className="h-3 w-3" />
                          Add
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Add Subject Confirmation Panel */}
        {isAddSubjectPanelOpen && pendingSubject && (
          <div className="fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/40 transition-opacity" onClick={() => { setIsAddSubjectPanelOpen(false); setPendingSubject(null); }} />
            <div className="relative ml-auto w-full max-w-2xl bg-background shadow-2xl flex flex-col border-l border-border">
              <div className="bg-gradient-to-r from-primary to-accent p-6 text-white flex items-center justify-between border-b border-accent-200">
                <h2 className="text-2xl font-bold">Add Course: {pendingSubject.code}</h2>
                <button
                  onClick={() => { setIsAddSubjectPanelOpen(false); setPendingSubject(null); }}
                  className="p-1 hover:bg-white/20 rounded-lg transition-all"
                  title="Close"
                  aria-label="Close"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="p-6 flex-1">
                <p className="font-semibold mb-2">{pendingSubject.title}</p>
                <p className="text-sm text-muted-foreground mb-4">Units: {pendingSubject.units}</p>
                <p className="text-sm mb-4">Year Level: {( (pendingSubject as any).year_level || (pendingSubject as any).yearLevel || (pendingSubject as any).year) || 'Not specified'}</p>
                <div className="flex gap-2">
                  <Button
                    onClick={async () => {
                      // perform the actual assign
                      toggleAssignCourse(pendingSubject, true);
                      setIsAddSubjectPanelOpen(false);
                      setPendingSubject(null);
                    }}
                    className="bg-gradient-to-r from-primary to-accent text-white"
                  >
                    Add Course
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setIsAddSubjectPanelOpen(false); setPendingSubject(null); }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherCourseAssignment;
