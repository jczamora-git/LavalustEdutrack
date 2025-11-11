import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRoleCheck } from "@/hooks/useRoleCheck";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, GraduationCap, BookOpen, Grid3x3, List, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertMessage } from "@/components/AlertMessage";
import { useConfirm } from "@/components/Confirm";
import { API_ENDPOINTS, apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { toast } from "sonner";

type Teacher = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string;
  phone?: string;
  status: "active" | "inactive";
  assignedCourses: { 
    course: string; 
    title?: string; 
    units?: number; 
    sections: (string | { id?: number; section_id?: number; name?: string; section_name?: string; students_count?: number })[]; 
    yearLevel?: string 
  }[];
};

const Teachers = () => {
  const { user, isAuthenticated } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useRoleCheck();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [isLoading, setIsLoading] = useState(false);

  const [teachers, setTeachers] = useState<Teacher[]>([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Teacher, "id">>({
    firstName: "",
    lastName: "",
    email: "",
    employeeId: "",
    phone: "",
    status: "active",
    assignedCourses: [],
  });

  const [alert, setAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const showAlert = (type: "success" | "error" | "info", message: string) => {
    setAlert({ type, message });
  };

  const confirm = useConfirm();

  useEffect(() => {
    if (!roleLoading) {
      if (!isAuthenticated || !isAdmin) {
        navigate("/auth");
      } else {
  fetchTeachers();
  fetchSubjects();
  fetchYearLevelData();
      }
    }
  }, [isAuthenticated, isAdmin, navigate, roleLoading]);

  // Fetch teachers from API
  const fetchTeachers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      
  const url = `${API_ENDPOINTS.TEACHERS}?${params.toString()}`;
  const response = await apiGet(url);
      
      if (response.success) {
        // Transform API response to match component structure
        let transformedTeachers = response.teachers.map((t: any) => ({
          id: t.id.toString(),
          firstName: t.first_name,
          lastName: t.last_name,
          email: t.email,
          employeeId: t.employee_id,
          phone: t.phone || '',
          status: t.status,
          assignedCourses: t.assigned_courses || t.assignedCourses || []
        }));

        // Ensure we have up-to-date assigned courses for each teacher.
        // The /api/teachers endpoint may not include assignment details for every teacher,
        // so fetch per-teacher assignments in parallel and merge into the list.
        const withAssignments = await Promise.all(
          transformedTeachers.map(async (tt) => {
            try {
              const res = await apiGet(API_ENDPOINTS.TEACHER_ASSIGNMENTS_BY_TEACHER(tt.id));
              const assigned = (res && (res.assigned_courses || res.assignedCourses || res.assignments)) || [];
              // Normalize to the UI shape used elsewhere: { course, title?, units?, sections: [], yearLevel? }
              const mapped = Array.isArray(assigned)
                ? assigned.map((a: any) => ({
                    course: a.course_code ?? a.course ?? a.courseCode ?? a.course_code,
                    title: a.course_name ?? a.course_name ?? a.title ?? a.course_name,
                    units: a.credits ?? a.units,
                    sections: a.sections || [],
                    yearLevel: a.year_level ?? a.yearLevel ?? undefined,
                  }))
                : [];
              return { ...tt, assignedCourses: mapped };
            } catch (err) {
              // If assignment fetch fails, return teacher as-is
              return tt;
            }
          })
        );

        setTeachers(withAssignments);
      }
    } catch (error: any) {
      console.error('Fetch teachers error:', error);
      toast.error(error.message || 'Failed to fetch teachers');
    } finally {
      setIsLoading(false);
    }
  };

  // Refetch when filters change
  useEffect(() => {
    if (isAuthenticated && isAdmin && !roleLoading) {
      fetchTeachers();
    }
  }, [statusFilter, searchQuery]);

  const filteredTeachers = teachers.filter((t) => {
    const q = searchQuery.trim().toLowerCase();
    const fullname = `${t.firstName} ${t.lastName}`.toLowerCase();
    const matchesQuery = q === "" || fullname.includes(q) || t.email.toLowerCase().includes(q) || t.employeeId.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesQuery && matchesStatus;
  });
  // Year levels and their sections (fetched as year_level_sections)
  const [yearLevels, setYearLevels] = useState<{ id: number; name: string }[]>([]);
  const [yearLevelSectionsMap, setYearLevelSectionsMap] = useState<Record<string, { id: number; name: string }[]>>({});

  const ordinal = (n: number) => {
    if (n % 10 === 1 && n % 100 !== 11) return `${n}st Year`;
    if (n % 10 === 2 && n % 100 !== 12) return `${n}nd Year`;
    if (n % 10 === 3 && n % 100 !== 13) return `${n}rd Year`;
    return `${n}th Year`;
  };

  const fetchYearLevelData = async () => {
    try {
      // Fetch year levels (optional)
      try {
        const ylRes = await apiGet(API_ENDPOINTS.YEAR_LEVELS);
        const ylRows = ylRes && (ylRes.year_levels || ylRes.rows || Array.isArray(ylRes) ? ylRes : []) || [];
        if (Array.isArray(ylRows) && ylRows.length) {
          const mapped = ylRows.map((y: any) => ({ id: Number(y.id), name: y.name || y.label || ordinal(Number(y.id)) }));
          setYearLevels(mapped);
        } else {
          // fallback default 1..4
          setYearLevels([{ id: 1, name: ordinal(1) }, { id: 2, name: ordinal(2) }, { id: 3, name: ordinal(3) }, { id: 4, name: ordinal(4) }]);
        }
      } catch (e) {
        // fallback defaults
        setYearLevels([{ id: 1, name: ordinal(1) }, { id: 2, name: ordinal(2) }, { id: 3, name: ordinal(3) }, { id: 4, name: ordinal(4) }]);
      }

      // Fetch year_level_sections mapping
      const res = await apiGet(API_ENDPOINTS.YEAR_LEVEL_SECTIONS);

      // Accept multiple response shapes: { mappings }, { organized }, etc.
      const map: Record<string, { id: number; name: string }[]> = {};
      const mappings = res && (res.mappings || res.year_level_sections || res.rows || (Array.isArray(res) ? res : []));
      const organized = res && res.organized;

      if (organized && typeof organized === 'object') {
        for (const [display, list] of Object.entries(organized)) {
          if (!Array.isArray(list)) continue;
          map[display] = list.map((n: any, i: number) => ({ id: i + 1, name: String(n) }));
          const m = String(display).match(/^(\d+)/);
          if (m) map[m[1]] = map[display];
        }
      }

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
      console.error('Failed to fetch year level sections', err);
      // leave map empty — UI will show fallback sections
    }
  };
  // subjects fetched from backend (course_code, course_name, credits)
  const [subjects, setSubjects] = useState<{ code: string; title: string; units: number }[]>([]);

  const fetchSubjects = async () => {
    try {
      const res = await apiGet(API_ENDPOINTS.SUBJECTS);
      // Accept a few possible response shapes: { success, subjects: [...] } or { subjects: [...] } or array directly
      const rows = res && res.subjects ? res.subjects : Array.isArray(res) ? res : (res && res.rows) ? res.rows : [];
      if (rows && Array.isArray(rows)) {
        const mapped = rows.map((s: any) => ({
          code: (s.course_code || s.code || s.course || '')?.toString().toUpperCase(),
          title: (s.course_name || s.title || '')?.toString(),
          units: s.credits ?? s.units ?? 3,
        }));
        setSubjects(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch subjects', err);
    }
  };

  const normalize = (s: string) => s.replace(/\s+/g, "").toUpperCase();

  const getCourseSuggestions = (query: string) => {
    const q = normalize(query || "");
    if (!q) return [];
    const qTitle = query.trim().toUpperCase();
    return subjects.filter((c) => (c.code || '').toUpperCase().includes(q) || (c.title || '').toUpperCase().includes(qTitle)).slice(0, 8);
  };

  const setCourseFromSuggestion = (idx: number, courseObj: { code: string; title: string; units: number }) => {
    setForm((f) => ({
      ...f,
      assignedCourses: f.assignedCourses.map((ac, i) => (i === idx ? { ...ac, course: courseObj.code, title: courseObj.title, units: courseObj.units } : ac)),
    }));
  };

  // Ensure subjects are loaded when user focuses an input (lazy-load if necessary)
  const ensureSubjectsLoaded = async () => {
    if (!subjects || subjects.length === 0) {
      await fetchSubjects();
    }
  };

  const updateAssignedCourseYearLevel = (idx: number, value: string) => {
    setForm((f) => ({
      ...f,
      assignedCourses: f.assignedCourses.map((ac, i) => 
        i === idx 
          ? { 
              ...ac, 
              yearLevel: value,
              // Clear sections when year level changes to avoid showing wrong sections
              sections: []
            } 
          : ac
      ),
    }));
  };

  const [focusedCourseIdx, setFocusedCourseIdx] = useState<number | null>(null);

  const addCourseRow = () => {
    setForm((f) => ({ ...f, assignedCourses: [...f.assignedCourses, { course: "", sections: [], yearLevel: "1st Year" }] }));
  };

  const removeCourseRow = (idx: number) => {
    setForm((f) => ({ ...f, assignedCourses: f.assignedCourses.filter((_, i) => i !== idx) }));
  };

  const updateCourseCode = (idx: number, value: string) => {
    setForm((f) => ({
      ...f,
      assignedCourses: f.assignedCourses.map((ac, i) => (i === idx ? { ...ac, course: value, title: undefined, units: undefined } : ac)),
    }));
  };

  // Generate next employee ID by asking backend for last id and incrementing
  const generateEmployeeId = async (): Promise<string> => {
    try {
      const year = new Date().getFullYear();
      const res = await apiGet(`${API_ENDPOINTS.TEACHERS}/last-id?year=${year}`);
      if (res && res.last_id) {
        const match = String(res.last_id).match(/EMP\d+-(\d+)/);
        if (match) {
          const nextNum = parseInt(match[1], 10) + 1;
          return `EMP${year}-${String(nextNum).padStart(3, '0')}`;
        }
      }
      return `EMP${year}-001`;
    } catch (err) {
      console.error('Error generating employee ID:', err);
      const year = new Date().getFullYear();
      return `EMP${year}-001`;
    }
  };

  const toggleSection = (idx: number, section: string) => {
    setForm((f) => ({
      ...f,
      assignedCourses: f.assignedCourses.map((ac, i) => {
        if (i !== idx) return ac;
        const has = ac.sections.includes(section);
        return { ...ac, sections: has ? ac.sections.filter((s) => s !== section) : [...ac.sections, section] };
      }),
    }));
  };


  const handleOpenCreate = () => {
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      employeeId: "",
      phone: "",
      status: "active",
      assignedCourses: [],
    });
    setIsCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      toast.error("First name, last name and email are required");
      return;
    }

    setIsLoading(true);
    let createdUserId: number | string | null = null;
    try {
      // Step 1: create a user record with role=teacher
      const userResp = await apiPost(API_ENDPOINTS.USERS, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        role: 'teacher',
        phone: form.phone?.trim() || "",
        password: 'demo123'
      });

      if (!userResp || !userResp.success || !userResp.user) {
        const msg = (userResp && userResp.message) || 'Failed to create user';
        toast.error(msg);
        return;
      }

      createdUserId = userResp.user.id;

      // Step 2: create teacher profile linked to the user
      // If employeeId was not provided (create flow), generate one
      const employeeIdToUse = form.employeeId && String(form.employeeId).trim() ? String(form.employeeId).trim() : await generateEmployeeId();
      const teacherResp = await apiPost(API_ENDPOINTS.TEACHERS, {
        user_id: createdUserId,
        employee_id: employeeIdToUse,
        phone: form.phone?.trim() || "",
        assignedCourses: form.assignedCourses
      });

      if (!teacherResp || !teacherResp.success) {
        // attempt to clean up the created user to avoid dangling accounts
        try {
          if (createdUserId) await apiDelete(API_ENDPOINTS.USER_BY_ID(String(createdUserId)));
        } catch (cleanupErr) {
          console.warn('Failed to cleanup created user after teacher profile failure', cleanupErr);
        }
        const msg = (teacherResp && teacherResp.message) || 'Failed to create teacher profile';
        toast.error(msg);
        return;
      }

      toast.success(`Teacher created successfully${userResp.default_password ? ` — default password: ${userResp.default_password}` : ''}`);
      setIsCreateOpen(false);
      fetchTeachers();
    } catch (error: any) {
      console.error('Create teacher error:', error);
      // If teacher creation failed after user creation, try cleanup
      if (createdUserId) {
        try {
          await apiDelete(API_ENDPOINTS.USER_BY_ID(String(createdUserId)));
        } catch (cleanupErr) {
          console.warn('Cleanup failed', cleanupErr);
        }
      }
      toast.error(error?.message || 'Failed to create teacher');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEdit = (t: Teacher) => {
    setSelectedTeacherId(t.id);
    setForm({
      firstName: t.firstName,
      lastName: t.lastName,
      email: t.email,
      employeeId: t.employeeId,
      phone: t.phone,
      status: t.status,
      assignedCourses: t.assignedCourses,
    });
    setIsEditOpen(true);
  };

  const handleEdit = () => {
    if (!selectedTeacherId) return;

    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.employeeId.trim()) {
      toast.error("First name, last name, email and employee ID are required");
      return;
    }

    setIsLoading(true);
    try {
  apiPut(`${API_ENDPOINTS.TEACHERS}/${selectedTeacherId}`, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        employeeId: form.employeeId.trim(),
        phone: form.phone?.trim() || "",
        status: form.status,
        assignedCourses: form.assignedCourses
      }).then(response => {
        if (response.success) {
          toast.success("Teacher updated successfully");
          setIsEditOpen(false);
          setSelectedTeacherId(null);
          fetchTeachers();
        }
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to update teacher");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const t = teachers.find((x) => x.id === id);
    if (!t) return;
    const ok = await confirm({
      title: 'Inactivate teacher',
      description: `Inactivate teacher ${t.firstName} ${t.lastName}? This will set the teacher to INACTIVE status.`,
      emphasis: `${t.firstName} ${t.lastName}`,
      confirmText: 'Inactivate',
      cancelText: 'Cancel',
      variant: 'destructive'
    });
    if (!ok) return;

    setIsLoading(true);
    try {
      const response = await apiDelete(`${API_ENDPOINTS.TEACHERS}/${id}`);
      if (response && response.success) {
        toast.success(`Teacher ${t.firstName} ${t.lastName} has been set to inactive`);
        fetchTeachers();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete teacher");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Manage Teachers</h1>
            <p className="text-muted-foreground text-lg">Create and manage teacher accounts and course assignments</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleOpenCreate} className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white shadow-lg hover:shadow-xl transition-all">
              <Plus className="h-5 w-5 mr-2" />
              Add Teacher
            </Button>
          </div>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-muted border-b pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">All Teachers ({isLoading ? <Loader2 className="inline h-5 w-5 animate-spin" /> : filteredTeachers.length})</CardTitle>
                <CardDescription className="text-base">Faculty members and their course assignments</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-72">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Search teachers by name or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 py-2 text-base border-2 focus:border-accent-500 rounded-lg"
                  />
                </div>
                <div className="w-40">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="border-2 focus:border-accent-500 rounded-lg px-3 py-2 bg-background">
                      <SelectValue>{statusFilter === "all" ? "All Status" : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode((v) => (v === "list" ? "grid" : "list"))}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium border-2 shadow-sm hover:bg-accent-50 hover:border-accent-300 transition-all"
                  title="Toggle view"
                  aria-pressed={viewMode === "grid"}
                >
                  {viewMode === "list" ? <Grid3x3 className="h-4 w-4" /> : <List className="h-4 w-4" />}
                  {viewMode === "list" ? "Grid" : "List"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <span className="ml-4 text-lg text-muted-foreground">Loading teachers...</span>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTeachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className={`rounded-2xl border-2 transition-all duration-300 flex flex-col overflow-hidden ${
                      teacher.status === "inactive"
                        ? "bg-muted/50 border-muted opacity-70"
                        : "bg-gradient-to-br from-card to-muted/30 border-accent-200 hover:border-accent-400 hover:shadow-xl"
                    }`}
                  >
                    <div className={teacher.status === "inactive" ? "p-5 opacity-60 pointer-events-none" : "p-5"}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
                            <GraduationCap className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <p className="font-bold text-lg">{teacher.firstName} {teacher.lastName}</p>
                            <p className="text-sm text-muted-foreground">{teacher.email}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge 
                          variant="secondary" 
                          className="capitalize font-semibold px-3 py-1 bg-gradient-to-r from-primary/10 to-accent/10 text-primary border border-primary/20"
                        >
                          {teacher.employeeId}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={`font-semibold px-3 py-1 ${teacher.status === "active" ? "bg-success/10 text-success border-success/20" : "bg-muted/30 text-muted-foreground"}`}
                        >
                          {teacher.status.charAt(0).toUpperCase() + teacher.status.slice(1)}
                        </Badge>
                      </div>

                      {teacher.assignedCourses.length > 0 && (
                        <div className="pt-3 border-t border-accent-100">
                          <div className="flex items-center gap-2 mb-3">
                            <BookOpen className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-sm">{teacher.assignedCourses.length} Course{teacher.assignedCourses.length !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="space-y-2">
                            {teacher.assignedCourses.slice(0, 3).map((ac, i) => (
                                <div key={i} className="p-2 bg-card/50 rounded-lg">
                                <p className="font-semibold text-xs">{ac.course}</p>
                                {ac.sections.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {ac.sections.map((s, idx) => {
                                      const sectionName = typeof s === 'string' ? s : (s.name ?? s.section_name ?? String(s.id ?? idx));
                                      const sectionKey = typeof s === 'string' ? s : (s.id ?? s.section_id ?? idx);
                                      return (
                                        <Badge key={sectionKey} variant="default" className="text-xs font-semibold bg-gradient-to-r from-primary to-accent text-white">
                                          {sectionName}
                                        </Badge>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            ))}
                            {teacher.assignedCourses.length > 3 && (
                              <p className="text-xs text-muted-foreground font-medium">+{teacher.assignedCourses.length - 3} more</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-auto p-5 border-t border-accent-100 bg-muted/30">
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(teacher)}
                          className="flex-1 gap-2 font-medium hover:bg-accent-50 hover:border-accent-300 transition-all"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(teacher.id)}
                          disabled={teacher.status === "inactive"}
                          className={`text-destructive hover:text-destructive hover:bg-destructive/10 flex-1 gap-2 font-medium transition-all ${
                            teacher.status === "inactive" ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTeachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className={`p-5 border-2 rounded-2xl transition-all duration-300 ${
                    teacher.status === "inactive"
                      ? "bg-muted/50 border-muted opacity-70"
                      : "bg-card border-accent-100 hover:shadow-md hover:border-accent-300"
                  }`}
                >
                  {/* Header: Teacher Info */}
                  <div className={teacher.status === "inactive" ? "opacity-60 pointer-events-none" : ""}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
                          <GraduationCap className="h-7 w-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <p className="font-bold text-lg">{teacher.firstName} {teacher.lastName}</p>
                            <Badge variant="outline" className="text-xs font-semibold bg-gradient-to-r from-primary/10 to-accent/10 text-primary border border-primary/20">
                              {teacher.employeeId}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{teacher.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={teacher.status === "active" ? "default" : "outline"} 
                          className={`font-medium ${teacher.status === "active" ? "bg-success text-white" : ""}`}
                        >
                          {teacher.status.charAt(0).toUpperCase() + teacher.status.slice(1)}
                        </Badge>
                      </div>
                    </div>

                    {/* Courses Section */}
                    {teacher.assignedCourses.length > 0 && (
                      <div className="mb-4 pb-4 border-b border-border/50">
                        <div className="flex items-center gap-2 mb-3">
                          <BookOpen className="h-4 w-4 text-primary" />
                          <span className="font-semibold text-sm">{teacher.assignedCourses.length} Assigned Course{teacher.assignedCourses.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {teacher.assignedCourses.map((ac, i) => (
                            <div key={i} className="p-3 bg-card/50 rounded-lg border border-border/30">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <p className="font-semibold text-sm text-foreground">{ac.course}</p>
                                  {ac.title && <p className="text-xs text-muted-foreground line-clamp-2">{ac.title}</p>}
                                </div>
                                {ac.units !== undefined && (
                                  <Badge variant="secondary" className="text-xs ml-2 shrink-0">
                                    {ac.units} u
                                  </Badge>
                                )}
                              </div>
                              {ac.sections.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {ac.sections.map((s, idx) => {
                                    const sectionName = typeof s === 'string' ? s : (s.name ?? s.section_name ?? String(s.id ?? idx));
                                    const sectionKey = typeof s === 'string' ? s : (s.id ?? s.section_id ?? idx);
                                    return (
                                      <Badge key={sectionKey} variant="default" className="text-xs font-semibold bg-gradient-to-r from-primary to-accent text-white">
                                        {sectionName}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleOpenEdit(teacher)}
                      className="gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDelete(teacher.id)}
                      disabled={teacher.status === "inactive"}
                      className={`text-destructive hover:text-destructive hover:bg-destructive/10 gap-2 ${
                        teacher.status === "inactive" ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
                ))}
              </div>
            )}
            {filteredTeachers.length === 0 && (
              <div className="text-center py-16">
                <GraduationCap className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-lg text-muted-foreground font-medium">No teachers found matching your filters</p>
                <p className="text-sm text-muted-foreground mt-2">Try adjusting your search or filters</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Add New Teacher</DialogTitle>
            </DialogHeader>
            <div className="space-y-5">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="font-semibold">First Name *</Label>
                    <Input
                      id="firstName"
                      value={form.firstName}
                      onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                      placeholder="First name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="font-semibold">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={form.lastName}
                      onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                      placeholder="Last name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="font-semibold">Employee ID</Label>
                    <Input
                      id="employeeId"
                      value={form.employeeId}
                      placeholder="Auto-generated"
                      disabled
                      className="mt-1 bg-muted/10"
                    />
                    <p className="text-xs text-muted-foreground mt-2">Employee ID will be auto-generated when creating the teacher.</p>
                  </div>
                </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="font-semibold">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="email@edu.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="font-semibold">Phone</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+1234567890"
                    className="mt-1"
                  />
                </div>
              </div>
                <div>
                  <Label htmlFor="status" className="font-semibold">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as any }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              <Button className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary hover:to-accent text-white font-semibold" onClick={handleCreate}>
                Add Teacher
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Edit Teacher</DialogTitle>
            </DialogHeader>
            <div className="space-y-5">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="edit-firstName" className="font-semibold">First Name *</Label>
                    <Input
                      id="edit-firstName"
                      value={form.firstName}
                      onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-lastName" className="font-semibold">Last Name *</Label>
                    <Input
                      id="edit-lastName"
                      value={form.lastName}
                      onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-employeeId" className="font-semibold">Employee ID *</Label>
                    <Input
                      id="edit-employeeId"
                      value={form.employeeId}
                      onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-email" className="font-semibold">Email *</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phone" className="font-semibold">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
                <div>
                  <Label htmlFor="edit-status" className="font-semibold">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as any }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              <div className="mt-4">
                <Button
                  variant="secondary"
                  className="w-full justify-center"
                  onClick={() => {
                    setIsEditOpen(false);
                    // Navigate to the teacher course assignment page (users path)
                    navigate(`/admin/users/teachers/${selectedTeacherId}/courses`);
                  }}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Manage Courses
                </Button>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button className="flex-1 bg-gradient-to-r from-primary to-accent hover:from-primary hover:to-accent text-white font-semibold" onClick={handleEdit}>
                  Save Changes
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {alert && <AlertMessage type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}
      </div>
    </DashboardLayout>
  );
};

export default Teachers;
