import { useEffect, useState, KeyboardEvent } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_ENDPOINTS, apiGet, apiPost } from "@/lib/api";
import { ArrowLeft, Save, CheckCircle2, AlertCircle, User, Zap } from "lucide-react";
import { AlertMessage } from '@/components/AlertMessage';
import { useConfirm } from '@/components/Confirm';

type Student = { id: number; code?: string; name: string; email?: string; grade?: string };

const ActivityDetail = () => {
  const { courseId, activityId } = useParams<{ courseId: string; activityId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "teacher") {
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate]);

  // State: will fetch real activity and students
  const location = useLocation();
  const [activity, setActivity] = useState<{ id: string; title: string; maxScore: number }>({ id: activityId ?? "0", title: `Activity ${activityId}`, maxScore: 100 });
  const [students, setStudents] = useState<Student[]>([]);
  const [editing, setEditing] = useState<Record<string, string>>({});
  // locked map: true means the input is disabled because the grade exists in DB
  const [locked, setLocked] = useState<Record<string, boolean>>({});
  // store original grades fetched from DB so ESC can revert edits
  const [originalGrades, setOriginalGrades] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState<string | null>(null);
  const [courseCode, setCourseCode] = useState<string | null>(null);
  const [sectionName, setSectionName] = useState<string | null>(null);
  const [courseYearLevel, setCourseYearLevel] = useState<number | string | null>(null);

  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  // removed sortPending toggle; ranking will be computed from grades
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'high-to-low' | 'low-to-high' | 'none'>('high-to-low');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'failed' | 'passed'>('all');

  // Fetch activity, students and existing grades when params or section change
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sectionId = params.get('section_id');
    setSelectedSectionId(sectionId);

    const fetchAll = async () => {
      if (!activityId) return;
      setLoading(true);
      try {
        // Activity details
        try {
          const aRes = await apiGet(API_ENDPOINTS.ACTIVITY_BY_ID(activityId));
          const a = aRes.data ?? aRes;
          if (a) setActivity({ id: String(a.id ?? activityId), title: a.title ?? (`Activity ${activityId}`), maxScore: Number(a.max_score ?? a.maxScore ?? 100) });
        } catch (e) {
          // keep defaults
        }

        // Fetch subject/course info from teacher assignments (non-admin endpoint)
        let detectedYearLevel: string | number | null = courseYearLevel ?? null;
        if (courseId) {
          try {
            const res = await apiGet(`${API_ENDPOINTS.TEACHER_ASSIGNMENTS}/my`);
            const assigned = res.assigned_courses ?? res.assignments ?? [];
            if (Array.isArray(assigned)) {
              for (const a of assigned) {
                const aId = a.id ?? a.teacher_subject_id ?? a.subject_id ?? null;
                if (String(aId) === String(courseId) || String(a.subject_id) === String(courseId)) {
                  setCourseTitle(a.course_name ?? a.title ?? '');
                  setCourseCode(a.course_code ?? a.code ?? '');
                  const detected = a.year_level ?? a.yearLevel ?? a.year ?? a.grade_level ?? null;
                  if (detected) {
                    detectedYearLevel = detected;
                    setCourseYearLevel(detected);
                  }
                  // also try to get section name if available in assignment
                  if (sectionId && Array.isArray(a.sections)) {
                    const sec = a.sections.find((s: any) => String(s.id ?? s.section_id) === String(sectionId));
                    if (sec) setSectionName(sec.name ?? sec.section_name ?? null);
                  }
                  break;
                }
              }
            }
          } catch (e) {
            // ignore
          }
        }

        // Students by section if provided, otherwise fallback to student-subjects endpoint if available
        let studentList: any[] = [];
        if (sectionId) {
          try {
            const sp = new URLSearchParams();
            sp.set('section_id', String(sectionId));
            // prefer detectedYearLevel (from assignments) falling back to state
            if (detectedYearLevel) sp.set('year_level', String(detectedYearLevel));
            else if (courseYearLevel) sp.set('year_level', String(courseYearLevel));
            const sRes = await apiGet(`${API_ENDPOINTS.STUDENTS}?${sp.toString()}`);
            studentList = sRes.data ?? sRes.students ?? sRes ?? [];
          } catch (e) {
            studentList = [];
          }
        }

        // Map students shape - extract numeric student.id (primary key from DB)
        const mappedStudents: Student[] = (Array.isArray(studentList) ? studentList : []).map((st: any) => {
          // Extract the numeric student ID (primary key). Prefer `id`, fallback to numeric `student_id` if present.
          const studentId = Number(st.id ?? (typeof st.student_id === 'number' ? st.student_id : undefined) ?? 0);
          // For display we prefer the string student identifier (student code) if present (e.g. "MCC2025-00012").
          // This field is commonly returned as `student_id` (string) from the API; fall back to any code field or the numeric id.
          let studentCode: string | undefined = undefined;
          if (st.student_id && typeof st.student_id === 'string' && st.student_id.trim() !== '') {
            studentCode = st.student_id;
          } else if (st.student_code && typeof st.student_code === 'string') {
            studentCode = st.student_code;
          } else if (st.code && typeof st.code === 'string') {
            studentCode = st.code;
          } else {
            studentCode = String(studentId);
          }

          return {
            id: studentId,
            code: studentCode,
            name: (st.first_name && st.last_name) ? `${st.first_name} ${st.last_name}` : (st.name ?? `${st.firstName ?? ''} ${st.lastName ?? ''}`),
            email: st.email ?? st.user_email ?? '',
            grade: ''
          };
        });

  setStudents(mappedStudents);

        // Fetch existing grades for this activity and prefill editing map
        try {
          const gRes = await apiGet(API_ENDPOINTS.ACTIVITY_GRADES(activityId));
          const grades = gRes.data ?? gRes.grades ?? gRes ?? [];
          const map: Record<string, string> = {};
          const lockMap: Record<string, boolean> = {};
          const origMap: Record<string, string> = {};
          // init map and lock map from students
          mappedStudents.forEach((s) => {
            map[s.id] = '';
            lockMap[s.id] = false;
            origMap[s.id] = '';
          });
          if (Array.isArray(grades)) {
            for (const g of grades) {
              const sid = String(g.student_id ?? g.studentId ?? g.student_id);
              if (sid) {
                map[sid] = g.grade != null ? String(g.grade) : '';
                // if grade exists in DB (not null/empty), lock the input
                lockMap[sid] = g.grade != null;
                origMap[sid] = g.grade != null ? String(g.grade) : '';
              }
            }
          }
          setEditing(map);
          setLocked(lockMap);
          setOriginalGrades(origMap);
        } catch (e) {
          // no grades yet: init maps with empty values and unlocked inputs
          const map: Record<string, string> = {};
          const lockMap: Record<string, boolean> = {};
          const origMap: Record<string, string> = {};
          mappedStudents.forEach((s) => {
            map[s.id] = '';
            lockMap[s.id] = false;
            origMap[s.id] = '';
          });
          setEditing(map);
          setLocked(lockMap);
          setOriginalGrades(origMap);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, activityId, location.search]);

  // Calculate grading statistics using the 75% pass threshold
  const totalCount = students.length;

  const statusMap: Record<string, "passed" | "failed" | "pending"> = {};
  students.forEach((s) => {
    const v = editing[s.id];
    if (v === "" || v === undefined) {
      statusMap[s.id] = "pending";
      return;
    }
    const num = Number(v);
    if (isNaN(num)) {
      statusMap[s.id] = "pending";
      return;
    }
    const perc = (num / activity.maxScore) * 100;
    statusMap[s.id] = perc >= 75 ? "passed" : "failed";
  });

  const passedCount = Object.values(statusMap).filter((st) => st === "passed").length;
  const failedCount = Object.values(statusMap).filter((st) => st === "failed").length;
  const pendingCount = Object.values(statusMap).filter((st) => st === "pending").length;
  const gradedCount = passedCount + failedCount;
  const gradingPercentage = totalCount ? (gradedCount / totalCount) * 100 : 0;
  // Passing rate among graded students (passed / graded)
  const passingRate = gradedCount ? Math.round((passedCount / gradedCount) * 100) : null;

  // Sort students: pending first if sortPending is enabled
  // Filter + Sort pipeline
  const filtered = students.filter((s) => {
    // Search filter by code or name (case-insensitive)
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const code = String(s.code ?? '').toLowerCase();
      const name = String(s.name ?? '').toLowerCase();
      if (!code.includes(q) && !name.includes(q)) return false;
    }

    // Status filter
    if (statusFilter !== 'all') {
      const st = statusMap[s.id];
      if (st !== statusFilter) return false;
    }

    return true;
  });

  const withGradesSort = (arr: Student[]) => {
    return arr.slice().sort((a, b) => {
      // Determine effective grade: prefer editing value if present, otherwise originalGrades
      const gaRaw = editing[a.id] ?? originalGrades[a.id] ?? '';
      const gbRaw = editing[b.id] ?? originalGrades[b.id] ?? '';
      const ga = Number(gaRaw);
      const gb = Number(gbRaw);
      const na = isNaN(ga) ? -Infinity : ga;
      const nb = isNaN(gb) ? -Infinity : gb;
      if (sortOrder === 'high-to-low') return nb - na;
      if (sortOrder === 'low-to-high') return na - nb;
      return 0;
    });
  };

  const sortedStudents = withGradesSort(filtered);

  // Compute ranking map (highest grade => rank 1). Ungraded students get rank 0 (no rank).
  const rankMap: Record<number, number> = {};
  (() => {
    const arr = students.map((s) => {
      const raw = editing[s.id] ?? originalGrades[s.id] ?? '';
      const v = Number(raw);
      return { id: s.id, grade: isNaN(v) ? Number.NEGATIVE_INFINITY : v };
    });
    arr.sort((a, b) => b.grade - a.grade);
    let rank = 0;
    let last: number | null = null;
    for (const it of arr) {
      if (!isFinite(it.grade)) {
        rankMap[it.id] = 0;
        continue;
      }
      if (last === null || it.grade !== last) {
        rank++;
        last = it.grade;
      }
      rankMap[it.id] = rank;
    }
  })();

  // Helper function to get student status
  const getStudentStatus = (studentId: number) => {
    return statusMap[studentId] ?? "pending";
  };

  // Save single student's grade (used when pressing Enter on an unlocked DB-grade input)
  const saveSingleGrade = async (studentId: number) => {
    if (!activityId) return;
    const val = editing[studentId] ?? '';
    if (val === '' || val === null || val === undefined) {
      console.log('No grade to save for student', studentId);
      return;
    }
    const parsed = Number(val);
    if (isNaN(parsed)) {
      console.warn('Invalid grade value for student', studentId, val);
      return;
    }

    const payload: any = {
      activity_id: Number(activityId),
      student_id: studentId,
      grade: parsed,
    };

    try {
      setSaving(true);
      console.log('Saving single grade payload:', payload);
      await apiPost(API_ENDPOINTS.ACTIVITY_GRADES(activityId), payload);
      // Re-lock the input after successful save
      setLocked((prev) => ({ ...prev, [studentId]: true }));
      // update originalGrades to the newly saved value so ESC will revert to this
      setOriginalGrades((prev) => ({ ...prev, [studentId]: String(parsed) }));
      // update editing to reflect the saved (normalized) value
      setEditing((prev) => ({ ...prev, [studentId]: String(parsed) }));
      setSavedMessage('Grade saved');
      setTimeout(() => setSavedMessage(null), 2000);
    } catch (e) {
      console.error('Failed to save single grade for', studentId, e);
    } finally {
      setSaving(false);
    }
  };

  // Cancel editing and revert the student's input back to the original DB value, then re-lock
  const cancelEdit = (studentId: number) => {
    const orig = originalGrades[studentId] ?? '';
    setEditing((prev) => ({ ...prev, [studentId]: orig }));
    setLocked((prev) => ({ ...prev, [studentId]: true }));
    // remove focus from input
    const el = document.getElementById(`grade-input-${studentId}`) as HTMLInputElement | null;
    if (el) el.blur();
  };

  // Double-click on a disabled input to allow editing (unlock)
  const handleUnlockForEdit = (studentId: number) => {
    setLocked((prev) => ({ ...prev, [studentId]: false }));
    // focus the input so the user can immediately type
    setTimeout(() => {
      const el = document.getElementById(`grade-input-${studentId}`) as HTMLInputElement | null;
      if (el) el.focus();
    }, 50);
  };

  const handleInputKeyDown = async (studentId: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Save only this student's grade and re-lock
      await saveSingleGrade(studentId);
    }
    if (e.key === 'Escape' || e.key === 'Esc') {
      // Cancel edit and revert to original DB value
      cancelEdit(studentId);
    }
  };

  const confirm = useConfirm();

  const handleGradeChange = async (studentId: number, value: string) => {
    // Allow empty value (clears grade).
    if (value === "") {
      setEditing((prev) => ({ ...prev, [studentId]: "" }));
      return;
    }

    // Try to parse numeric value; if not a number, keep raw input (let browser handle)
    const n = Number(value);
    if (isNaN(n)) {
      setEditing((prev) => ({ ...prev, [studentId]: value }));
      return;
    }

    // Negative input -> stop at 0 and show warning
    if (n < 0) {
      setEditing((prev) => ({ ...prev, [studentId]: '0' }));
      try {
        await confirm({
          title: 'Invalid score',
          description: `Negative scores are not allowed. Enter a value between 0 and ${activity.maxScore}.`,
          emphasis: `0`,
          confirmText: 'OK',
          variant: 'destructive'
        });
      } catch (e) {}
      return;
    }

    // Exceeding max -> truncate trailing digits until within range and show warning
    if (n > activity.maxScore) {
      let s = String(value);
      // remove non-digit chars (just in case)
      s = s.replace(/[^\d]/g, '');
      while (s.length > 0 && Number(s) > activity.maxScore) {
        s = s.slice(0, -1);
      }
      // If nothing left, fallback to maxScore as string
      const truncated = s.length > 0 ? s : String(activity.maxScore);
      setEditing((prev) => ({ ...prev, [studentId]: truncated }));
      try {
        await confirm({
          title: 'Score too high',
          description: `The entered score exceeds the maximum allowed (${activity.maxScore}). It was truncated to ${truncated}.`,
          emphasis: String(activity.maxScore),
          confirmText: 'OK',
          variant: 'default'
        });
      } catch (e) {}
      return;
    }

    // Valid value within range
    setEditing((prev) => ({ ...prev, [studentId]: String(n) }));
  };

  const handleSave = async () => {
    // Apply edits locally
    setStudents((prev) => prev.map((s) => ({ ...s, grade: editing[s.id] ?? s.grade })));

    // Persist grades to server (one by one because controller supports per-student upsert)
    if (!activityId) return;
    setSaving(true);
    try {
      // Only include entries where the grade input is non-empty AND the input is editable (not readOnly/locked)
      const entries = Object.entries(editing).filter(([studentIdStr, gradeVal]) => {
        // Skip empty values
        if (gradeVal === '' || gradeVal === null || gradeVal === undefined) return false;
        // Skip if input is locked/readOnly (meaning grade already stored in DB and not unlocked for edit)
        if (locked[String(studentIdStr)] === true) return false;
        return true;
      });

      if (entries.length === 0) {
        console.log('No new grades to save (either all inputs are empty or read-only)');
        setSavedMessage('No new grades to save');
        setTimeout(() => setSavedMessage(null), 2000);
        return;
      }

      for (const [studentIdStr, gradeVal] of entries) {
        const studentId = Number(studentIdStr);
        // Parse numeric grade; if not a valid number, skip and log
        const parsed = Number(gradeVal);
        if (isNaN(parsed)) {
          console.warn('Skipping invalid grade for student', studentId, 'value:', gradeVal);
          continue;
        }

        // Build payload with numeric activity_id, numeric student_id, and grade
        const payload: any = {
          activity_id: Number(activityId),
          student_id: studentId,
          grade: parsed
        };

        // Log the payload for verification
        console.log('Sending grade payload:', payload);

        try {
          await apiPost(API_ENDPOINTS.ACTIVITY_GRADES(activityId), payload);
        } catch (e) {
          console.error('Failed to save grade for student', studentId, 'payload:', payload, 'error:', e);
        }
      }

      setSavedMessage('Grades saved successfully');
      setTimeout(() => setSavedMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="mb-2">
              <h1 className="text-3xl font-bold">{activity.title}</h1>
              <div className="text-sm text-muted-foreground mt-1">{activity.maxScore} points</div>
              {/* Subtitle: show COURSE_CODE • {year}-{sectionName} (e.g. ITC 112 • 1-F1) */}
              {(() => {
                const yearStr = (() => {
                  if (!courseYearLevel) return null;
                  if (typeof courseYearLevel === 'number') return String(courseYearLevel);
                  const m = String(courseYearLevel).match(/^(\d+)/);
                  if (m) return m[1];
                  const m2 = String(courseYearLevel).match(/(\d+)/);
                  return m2 ? m2[1] : null;
                })();

                const secName = sectionName ?? (selectedSectionId ? `F${selectedSectionId}` : null);
                const rightPart = yearStr && secName ? `${yearStr}-${secName}` : (secName ?? null);

                return (
                  <p className="text-sm text-muted-foreground mt-1">{courseCode ? `${courseCode}${rightPart ? ` • ${rightPart}` : ''}` : `Course ${courseId}`}</p>
                );
              })()}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Grades
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Grade Students</CardTitle>
            <CardDescription>Enter grades for {students.length} students and click Save to persist changes.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Grading Progress Bar */}
            <div className="mb-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Grading Progress</span>
                <div className="flex items-center gap-4 text-xs font-medium">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span>Passed: {passedCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span>Failed: {failedCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <span>Pending: {pendingCount}</span>
                  </div>
                </div>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                {/* Segmented bar: passed (green), failed (red), pending (amber) */}
                {(() => {
                  const total = totalCount || 1; // avoid division by zero
                  const passedPct = Math.round((passedCount / total) * 100);
                  const failedPct = Math.round((failedCount / total) * 100);
                  // ensure the remainder goes to pending to sum to 100
                  const pendingPct = Math.max(0, 100 - passedPct - failedPct);

                  const ariaLabel = `Grading progress: ${passedPct}% passed, ${failedPct}% failed, ${pendingPct}% pending`;
                  const ariaValueText = `${Math.round(gradingPercentage)}% graded (${gradedCount}/${total})`;

                  return (
                    <div role="progressbar" aria-label={ariaLabel} aria-valuetext={ariaValueText} className="w-full h-2 flex">
                          {/* inline width styles are intentionally used for dynamic progress segments */}
                          {/* eslint-disable-next-line react/no-inline-styles */}
                          {passedPct > 0 && <div className="h-full bg-green-500 transition-all duration-200" style={{ width: `${passedPct}%` }} />}
                          {/* eslint-disable-next-line react/no-inline-styles */}
                          {failedPct > 0 && <div className="h-full bg-red-500 transition-all duration-200" style={{ width: `${failedPct}%` }} />}
                          {/* eslint-disable-next-line react/no-inline-styles */}
                          {pendingPct > 0 && <div className="h-full bg-amber-500 transition-all duration-200" style={{ width: `${pendingPct}%` }} />}
                    </div>
                  );
                })()}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <p className="text-xs text-muted-foreground">{Math.round(gradingPercentage)}% graded ({gradedCount}/{totalCount})</p>
                  <p className="text-xs text-muted-foreground">Passing rate: {passingRate !== null ? `${passingRate}%` : "N/A"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Search by student code or name */}
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name or ID"
                    className="text-sm px-3 py-1 rounded-md border border-border bg-background w-56"
                    aria-label="Search students by name or code"
                  />

                  {/* Sort order dropdown */}
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    className="text-sm px-2 py-1 rounded-md border border-border bg-background"
                    aria-label="Sort by grade"
                  >
                    <option value="high-to-low">Grade: High → Low</option>
                    <option value="low-to-high">Grade: Low → High</option>
                    <option value="none">No Grade Sort</option>
                  </select>

                  {/* Status filter dropdown */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="text-sm px-2 py-1 rounded-md border border-border bg-background"
                    aria-label="Filter by status"
                  >
                    <option value="all">All</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                    <option value="passed">Passed</option>
                  </select>

                  {/* Removed Pending First toggle per request */}
                </div>
              </div>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {sortedStudents.map((s, idx) => {
                const hasGrade = editing[s.id] && editing[s.id] !== "";
                const status = getStudentStatus(s.id);
                const statusConfig = {
                  passed: { label: "Passed", color: "bg-green-50 text-green-600", icon: CheckCircle2 },
                  failed: { label: "Failed", color: "bg-red-50 text-red-600", icon: AlertCircle },
                  pending: { label: "Pending", color: "bg-amber-50 text-amber-600", icon: AlertCircle },
                };
                const config = statusConfig[status];
                const StatusIcon = config.icon;

                return (
                  <div key={s.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors shadow-sm group">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-base">{s.name}</p>
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              {rankMap[s.id] > 0 ? `#${rankMap[s.id]}` : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <span className="font-medium">{s.code ?? s.id}</span>
                            <span>•</span>
                            <span className="truncate">{s.email}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <div
                            onDoubleClick={() => locked[s.id] === true ? handleUnlockForEdit(s.id) : undefined}
                            title={locked[s.id] === true ? 'Double-click to edit' : ''}
                            className={`${locked[s.id] === true ? 'cursor-pointer' : ''}`}
                          >
                            <Input
                              type="number"
                              min={0}
                              max={activity.maxScore}
                              id={`grade-input-${s.id}`}
                              value={editing[s.id] ?? ""}
                              onChange={(e) => handleGradeChange(s.id, e.target.value)}
                              // Use readOnly instead of disabled so the element can still receive events
                              readOnly={locked[s.id] === true}
                              aria-disabled={locked[s.id] === true}
                              onKeyDown={(e) => handleInputKeyDown(s.id, e)}
                              placeholder="0"
                              className={`w-20 text-center font-semibold ${locked[s.id] === true ? 'opacity-60 cursor-not-allowed' : ''}`}
                            />
                          </div>
                          <span className="text-sm font-medium text-muted-foreground min-w-fit">
                            / {activity.maxScore}
                          </span>
                        </div>
                        <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded flex-shrink-0 ${config.color}`}>
                          <StatusIcon className="h-4 w-4" />
                          <span>{config.label}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {savedMessage && (
              <AlertMessage type="success" message={savedMessage} onClose={() => setSavedMessage(null)} duration={3000} />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ActivityDetail;
