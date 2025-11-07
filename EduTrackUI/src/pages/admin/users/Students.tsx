import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, User, BookOpen, LayoutGrid, List } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertMessage } from "@/components/AlertMessage";
import { API_ENDPOINTS, apiPost, apiGet } from "@/lib/api";

type AssignedCourse = { course: string; title?: string; units?: number };

type Student = {
  id: string;
  name: string;
  email: string;
  studentId: string;
  yearLevel: "1" | "2" | "3" | "4";
  section: string;
  phone?: string;
  parentContact?: {
    name: string;
    phone: string;
  };
  status: "active" | "inactive" | "graduated";
  assignedCourses: AssignedCourse[];
};

const Students = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [yearLevelFilter, setYearLevelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortOption, setSortOption] = useState<string>("name_asc");

  const [students, setStudents] = useState<Student[]>([
    {
      id: "1",
      name: "Sarah Davis",
      email: "sarah.d@student.edu.com",
      studentId: "STU2024001",
      yearLevel: "1",
      section: "A",
      phone: "+1234567890",
      parentContact: {
        name: "Mary Davis",
        phone: "+1234567800",
      },
      status: "active",
      assignedCourses: [
        { course: "CS101", title: "Intro to CS", units: 3 },
        { course: "MATH101", title: "Calculus I", units: 4 },
        { course: "ENG101", title: "English I", units: 3 },
      ],
    },
    {
      id: "2",
      name: "Emily Brown",
      email: "emily.b@student.edu.com",
      studentId: "STU2024002",
      yearLevel: "2",
      section: "B",
      phone: "+1234567891",
      status: "active",
      assignedCourses: [
        { course: "CS201", title: "Data Structures", units: 3 },
        { course: "MATH201", title: "Linear Algebra", units: 3 },
      ],
    },
    {
      id: "3",
      name: "James Wilson",
      email: "james.w@student.edu.com",
      studentId: "STU2023015",
      yearLevel: "3",
      section: "A",
      phone: "+1234567892",
      status: "active",
      assignedCourses: [
        { course: "CS301", title: "Algorithms", units: 3 },
        { course: "CS302", title: "Operating Systems", units: 3 },
        { course: "MATH301", title: "Discrete Math", units: 3 },
      ],
    },
  ]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({
    firstName: "",
    lastName: "",
    email: "",
    studentId: "",
    yearLevel: "1",
    // section removed from add modal; keep empty by default
    section: "",
    phone: "",
    parentContact: undefined,
    status: "active",
    assignedCourses: [] as AssignedCourse[],
  });

  const [subjects, setSubjects] = useState<{ code: string; title: string; units: number }[]>([]);
  const [focusedCourseIdx, setFocusedCourseIdx] = useState<number | null>(null);

  const [alert, setAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const showAlert = (type: "success" | "error" | "info", message: string) => {
    setAlert({ type, message });
  };

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    // fetch subjects for course suggestions when component mounts
    const load = async () => {
      try {
        const res = await apiGet(API_ENDPOINTS.SUBJECTS);
        if (res && res.success) {
          const mapped = (res.subjects || []).map((s: any) => ({ code: s.course_code, title: s.course_name, units: s.credits ?? 3 }));
          setSubjects(mapped);
        }
      } catch (err) {
        // silently fail — suggestions are optional
        console.error('Failed to load subjects for suggestions', err);
      }
    };
    load();
  }, []);

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      q === "" ||
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.studentId.toLowerCase().includes(q);
    const matchesYearLevel = yearLevelFilter === "all" || s.yearLevel === yearLevelFilter;
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    const matchesSection = sectionFilter === "all" || s.section === sectionFilter;
    return matchesQuery && matchesYearLevel && matchesStatus;
  });

  // available sections for the Section filter dropdown
  const availableSections = Array.from(new Set(students.map((s) => s.section))).sort();

  const getCourseSuggestions = (query: string) => {
    const q = (query || "").replace(/\s+/g, "").toUpperCase();
    if (!q) return [] as { code: string; title: string; units: number }[];
    return subjects.filter((c) => c.code.includes(q) || c.title.toUpperCase().includes(query.trim().toUpperCase())).slice(0, 8);
  };

  const setCourseFromSuggestion = (idx: number, courseObj: { code: string; title: string; units: number }) => {
    setForm((f: any) => ({
      ...f,
      assignedCourses: f.assignedCourses.map((ac: AssignedCourse, i: number) => (i === idx ? { ...ac, course: courseObj.code, title: courseObj.title, units: courseObj.units } : ac)),
    }));
  };

  const addCourseRow = () => {
    setForm((f: any) => ({ ...f, assignedCourses: [...(f.assignedCourses || []), { course: "", title: undefined, units: undefined }] }));
  };

  const removeCourseRow = (idx: number) => {
    setForm((f: any) => ({ ...f, assignedCourses: f.assignedCourses.filter((_: any, i: number) => i !== idx) }));
  };

  const updateCourseCode = (idx: number, value: string) => {
    setForm((f: any) => ({ ...f, assignedCourses: f.assignedCourses.map((ac: AssignedCourse, i: number) => (i === idx ? { ...ac, course: value, title: undefined, units: undefined } : ac)) }));
  };

  // apply sorting on a copy
  const sortedStudents = (() => {
    const list = [...filteredStudents];
    switch (sortOption) {
      case "name_asc":
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case "name_desc":
        return list.sort((a, b) => b.name.localeCompare(a.name));
      case "id_asc":
        return list.sort((a, b) => a.studentId.localeCompare(b.studentId));
      case "id_desc":
        return list.sort((a, b) => b.studentId.localeCompare(a.studentId));
      case "year_asc":
        return list.sort((a, b) => parseInt(a.yearLevel) - parseInt(b.yearLevel));
      case "year_desc":
        return list.sort((a, b) => parseInt(b.yearLevel) - parseInt(a.yearLevel));
      default:
        return list;
    }
  })();

  const handleOpenCreate = () => {
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      studentId: "",
      yearLevel: "1",
      section: "",
      phone: "",
      parentContact: undefined,
      status: "active",
      assignedCourses: [],
    });
    setIsCreateOpen(true);
  };

  const handleCreate = async () => {
    // First/Last name and email required; studentId optional (backend will generate if empty)
    if (!form.firstName?.trim() || !form.lastName?.trim() || !form.email?.trim()) {
      showAlert("error", "First name, last name and email are required");
      return;
    }

    const payload: any = {
      // no user_id here; student profile can be created without linking a user
      student_id: form.studentId?.trim() || undefined,
      year_level: `${form.yearLevel}st Year`,
      status: form.status,
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone?.trim() || null,
      assigned_courses: form.assignedCourses || [],
    };

    try {
      const res = await apiPost('/api/students', payload);
      // If backend returned created student, use it; otherwise fallback to local
      if (res && res.success && res.student) {
        const created = res.student;
        const displayName = `${form.firstName.trim()} ${form.lastName.trim()}`;
        const newStudent: Student = {
          id: created.id?.toString() || Date.now().toString(),
          name: displayName,
          email: created.email ?? form.email,
          studentId: created.student_id ?? (form.studentId || ''),
          yearLevel: (created.year_level || `1st Year`).startsWith('1') ? '1' : (created.year_level || '1st Year').charAt(0),
          section: created.section_id ? String(created.section_id) : '',
          phone: created.phone ?? form.phone,
          parentContact: form.parentContact,
          status: created.status ?? form.status,
          assignedCourses: created.assigned_courses ?? (form.assignedCourses || []),
        };
        setStudents((s) => [newStudent, ...s]);
        setIsCreateOpen(false);
        showAlert('success', `Student ${newStudent.name} created`);
        return;
      }

      // Fallback: local add
      const displayName = `${form.firstName.trim()} ${form.lastName.trim()}`;
  const newStudent: Student = { id: Date.now().toString(), name: displayName, email: form.email, studentId: form.studentId || '', yearLevel: form.yearLevel, section: '', phone: form.phone, parentContact: form.parentContact, status: form.status, assignedCourses: form.assignedCourses };
      setStudents((s) => [newStudent, ...s]);
      setIsCreateOpen(false);
      showAlert('success', `Student ${displayName} created (local)`);
    } catch (err: any) {
      console.error('Error creating student:', err);
      showAlert('error', err.message || 'Failed to create student');
    }
  };

  const handleOpenEdit = (s: Student) => {
    setSelectedStudentId(s.id);
    setForm({
      name: s.name,
      email: s.email,
      studentId: s.studentId,
      yearLevel: s.yearLevel,
      section: s.section,
      phone: s.phone,
      parentContact: s.parentContact,
      status: s.status,
      assignedCourses: s.assignedCourses,
    });
    setIsEditOpen(true);
  };

  const handleEdit = () => {
    if (!selectedStudentId) return;
    setStudents((prev) => prev.map((s) => (s.id === selectedStudentId ? { ...s, ...form } : s)));
    setIsEditOpen(false);
    setSelectedStudentId(null);
    showAlert("success", "Student updated");
  };

  const handleDelete = (id: string) => {
    const s = students.find((x) => x.id === id);
    if (!s) return;
    if (!confirm(`Inactivate student ${s.name}? This will set the student to INACTIVE status.`)) return;
    setStudents((prev) => prev.map((x) => (x.id === id ? { ...x, status: "inactive" } : x)));
    showAlert("info", `Student ${s.name} has been set to inactive`);
  };

  if (!isAuthenticated) return null;

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Manage Students</h1>
            <p className="text-muted-foreground">View and manage student accounts and enrollments</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="ml-auto">
              <Button onClick={handleOpenCreate} className="bg-gradient-to-r from-primary to-accent text-white shadow-lg hover:shadow-xl">
                <Plus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            </div>
          </div>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-muted border-b pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">All Students ({filteredStudents.length})</CardTitle>
                <CardDescription>Enrolled students in the institution</CardDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-3 mt-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search students by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 py-2.5 text-base border-2 focus:border-accent-500 rounded-xl bg-background shadow-sm"
                />
              </div>
            
                <div className="flex items-center gap-3">
                  <div className="w-36">
                    <Select value={yearLevelFilter} onValueChange={setYearLevelFilter}>
                      <SelectTrigger className="border-2 rounded-xl px-3 py-2 bg-background font-medium shadow-sm">
                        {yearLevelFilter === "all" ? "All Years" : `${yearLevelFilter}st Year`}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        <SelectItem value="1">1st Year</SelectItem>
                        <SelectItem value="2">2nd Year</SelectItem>
                        <SelectItem value="3">3rd Year</SelectItem>
                        <SelectItem value="4">4th Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-40">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="border-2 rounded-xl px-3 py-2 bg-background font-medium shadow-sm">
                        {statusFilter === "all" ? "All Status" : statusFilter}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="graduated">Graduated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-40">
                    <Select value={sectionFilter} onValueChange={setSectionFilter}>
                      <SelectTrigger className="border-2 rounded-xl px-3 py-2 bg-background font-medium shadow-sm">
                        {sectionFilter === "all" ? "All Sections" : `Section ${sectionFilter}`}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sections</SelectItem>
                        {availableSections.map((sec) => (
                          <SelectItem key={sec} value={sec}>{`Section ${sec}`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-44">
                    <Select value={sortOption} onValueChange={setSortOption}>
                      <SelectTrigger className="border-2 rounded-xl px-4 py-2.5 bg-background font-medium shadow-sm">
                        {sortOption === "name_asc" && "Name A → Z"}
                        {sortOption === "name_desc" && "Name Z → A"}
                        {sortOption === "id_asc" && "ID A → Z"}
                        {sortOption === "id_desc" && "ID Z → A"}
                        {sortOption === "year_asc" && "Year ↑"}
                        {sortOption === "year_desc" && "Year ↓"}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name_asc">Name A → Z</SelectItem>
                        <SelectItem value="name_desc">Name Z → A</SelectItem>
                        <SelectItem value="id_asc">Student ID A → Z</SelectItem>
                        <SelectItem value="id_desc">Student ID Z → A</SelectItem>
                        <SelectItem value="year_asc">Year ↑</SelectItem>
                        <SelectItem value="year_desc">Year ↓</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode((v) => (v === "list" ? "grid" : "list"))}
                    className="px-4 py-2.5 rounded-xl font-medium border-2 gap-2 shadow-sm hover:bg-accent-50 hover:border-accent-300 transition-all"
                    title="Toggle view"
                    aria-pressed={viewMode === "grid"}
                  >
                    {viewMode === "grid" ? <LayoutGrid className="h-5 w-5" /> : <List className="h-5 w-5" />}
                    <span>{viewMode === "grid" ? "Grid" : "List"}</span>
                  </Button>
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sortedStudents.map((student) => (
                  <div
                    key={student.id}
                    className={`rounded-2xl border-2 transition-all duration-300 flex flex-col overflow-hidden ${
                      student.status === "inactive"
                        ? "bg-muted/50 border-muted opacity-70"
                        : "bg-gradient-to-br from-card to-muted/30 border-accent-200 hover:border-accent-400 hover:shadow-lg"
                    }`}
                  >
                    {/* Card Header */}
                    <div className="p-5 flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 ${
                          student.status === "active" ? "bg-gradient-to-br from-primary to-accent" : "bg-slate-300"
                        }`}>
                          <User className="h-7 w-7 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-lg">{student.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{student.email}</p>
                          <p className="text-xs text-muted-foreground mt-1">Year {student.yearLevel} • Section {student.section}</p>
                        </div>
                      </div>
                      <Badge
                        variant={student.status === "active" ? "default" : student.status === "graduated" ? "secondary" : "outline"}
                        className={`font-semibold ml-2 ${
                          student.status === "active" ? "bg-gradient-to-r from-primary to-accent text-white" : ""
                        }`}
                      >
                        {student.status}
                      </Badge>
                    </div>

                    {/* Card Metadata */}
                    <div className={`px-5 py-3 ${
                      student.status === "active"
                        ? "bg-gradient-to-r from-primary/5 to-accent/5 border-t border-primary/10"
                        : "bg-muted/30 border-t border-muted"
                    }`}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-1">Student ID</p>
                                  <p className="text-sm font-medium">{student.studentId}</p>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center gap-1 text-sm font-medium mb-1">
                                    <BookOpen className="h-4 w-4 text-primary" />
                                    <span>{student.assignedCourses.length} courses</span>
                                  </div>
                                  {student.assignedCourses.length > 0 && (
                                    <p className="text-xs text-muted-foreground">
                                      {student.assignedCourses.slice(0, 2).map((c) => c.course).join(", ")}
                                      {student.assignedCourses.length > 2 && "..."}
                                    </p>
                                  )}
                                </div>
                              </div>
                    </div>

                    {/* Card Actions */}
                    <div className={`px-5 py-4 border-t ${
                      student.status === "inactive" ? "border-muted bg-muted/30" : "border-accent-100 bg-card/50"
                    }`}>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(student)}
                          className="flex-1 gap-2 font-medium hover:bg-accent-50 hover:border-accent-300 transition-all"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(student.id)}
                          disabled={student.status === "inactive"}
                          className={`text-destructive hover:text-destructive hover:bg-destructive/10 font-medium transition-all px-3 ${
                            student.status === "inactive" ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {sortedStudents.map((student) => (
                  <div
                    key={student.id}
                    className={`rounded-2xl border-2 transition-all duration-300 flex items-center justify-between p-4 ${
                      student.status === "inactive"
                        ? "bg-muted/50 border-muted opacity-80"
                        : "bg-card border-accent-100 hover:border-accent-300 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 ${
                        student.status === "active" ? "bg-gradient-to-br from-primary to-accent" : "bg-slate-200"
                      }`}>
                        <User className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-lg">{student.name}</p>
                          <Badge variant="outline" className="text-xs flex-shrink-0">{student.studentId}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                        <p className="text-xs text-muted-foreground">Year {student.yearLevel} • Section {student.section}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                            <div className="flex items-center gap-1 text-sm font-medium">
                              <BookOpen className="h-4 w-4" />
                              <span>{student.assignedCourses.length} courses</span>
                            </div>
                            {student.assignedCourses.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {student.assignedCourses.slice(0, 3).map((c) => c.course).join(", ")}
                                {student.assignedCourses.length > 3 && "..."}
                              </p>
                            )}
                      </div>

                      <Badge variant={student.status === "active" ? "default" : student.status === "graduated" ? "secondary" : "outline"}>
                        {student.status}
                      </Badge>

                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(student)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(student.id)}
                          disabled={student.status === "inactive"}
                          className={student.status === "inactive" ? "opacity-50 cursor-not-allowed" : ""}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {sortedStudents.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <User className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-lg font-medium">No students found matching your filters</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-0 shadow-2xl">
            <DialogHeader className="bg-gradient-to-r from-primary to-accent px-6 py-6 -mx-6 -mt-6 mb-6 rounded-t-lg">
              <DialogTitle className="text-2xl font-bold text-white">Add New Student</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    placeholder="Given name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                    placeholder="Family name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 mt-2">
                <div>
                  <Label htmlFor="studentId">Student ID (optional)</Label>
                  <Input
                    id="studentId"
                    value={form.studentId}
                    onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
                    placeholder="e.g., STU2024001 — leave empty to auto-generate"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="student@edu.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+1234567890"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="yearLevel">Year Level</Label>
                  <Select value={form.yearLevel} onValueChange={(v) => setForm((f) => ({ ...f, yearLevel: v as any }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1st Year</SelectItem>
                      <SelectItem value="2">2nd Year</SelectItem>
                      <SelectItem value="3">3rd Year</SelectItem>
                      <SelectItem value="4">4th Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as any }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="graduated">Graduated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-sm font-semibold">Parent/Guardian Contact (Optional)</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="parentName" className="text-xs">Name</Label>
                    <Input
                      id="parentName"
                      value={form.parentContact?.name || ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          parentContact: { name: e.target.value, phone: f.parentContact?.phone || "" },
                        }))
                      }
                      placeholder="Parent name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="parentPhone" className="text-xs">Phone</Label>
                    <Input
                      id="parentPhone"
                      value={form.parentContact?.phone || ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          parentContact: { name: f.parentContact?.name || "", phone: e.target.value },
                        }))
                      }
                      placeholder="Parent phone"
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label className="font-semibold">Assigned Courses</Label>
                <div className="space-y-3 mt-3">
                  {(form.assignedCourses || []).map((ac: AssignedCourse, idx: number) => (
                    <div key={idx} className="space-y-2 p-3 border rounded-lg bg-muted/30">
                      <div className="flex items-start gap-2">
                        <div className="relative flex-1">
                          <Input
                            placeholder="Search course e.g., CS101"
                            value={ac.course}
                            onChange={(e) => updateCourseCode(idx, e.target.value)}
                            onFocus={() => setFocusedCourseIdx(idx)}
                            onBlur={() => setTimeout(() => setFocusedCourseIdx((v) => (v === idx ? null : v)), 150)}
                            className="w-full"
                          />
                          {focusedCourseIdx === idx && ac.course && (
                            <div className="absolute z-20 top-full left-0 mt-1 w-full max-h-64 overflow-y-auto bg-popover border border-border rounded-md shadow-lg">
                              {getCourseSuggestions(ac.course).map((c) => (
                                <div
                                  key={c.code}
                                  className="p-3 hover:bg-muted/60 cursor-pointer transition-colors border-b border-border/50 last:border-0"
                                  onMouseDown={() => { setCourseFromSuggestion(idx, c); setFocusedCourseIdx(null); }}
                                >
                                  <div className="font-semibold text-sm">{c.code}</div>
                                  <div className="text-sm text-foreground/90">{c.title}</div>
                                  <div className="text-xs text-muted-foreground">{c.units} units</div>
                                </div>
                              ))}
                              {getCourseSuggestions(ac.course).length === 0 && (
                                <div className="p-4 text-center text-sm text-muted-foreground">No courses found</div>
                              )}
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" className="shrink-0 text-destructive hover:text-destructive" onClick={() => removeCourseRow(idx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {ac.course && (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-sm text-foreground">{ac.course}{ac.title ? ` — ${ac.title}` : ''}</p>
                            {ac.units !== undefined && <p className="text-xs text-muted-foreground">{ac.units} units</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <Button onClick={addCourseRow} variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Course
                  </Button>
                  <p className="text-xs text-muted-foreground">Assign courses (suggestions available)</p>
                </div>
              </div>
              <Button className="w-full bg-gradient-to-r from-primary to-accent text-white py-3 font-semibold rounded-lg shadow-lg" onClick={handleCreate}>
                Add Student
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-0 shadow-2xl">
            <DialogHeader className="bg-gradient-to-r from-primary to-accent px-6 py-6 -mx-6 -mt-6 mb-6 rounded-t-lg">
              <DialogTitle className="text-2xl font-bold text-white">Edit Student</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Full Name *</Label>
                  <Input
                    id="edit-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-studentId">Student ID *</Label>
                  <Input
                    id="edit-studentId"
                    value={form.studentId}
                    onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-email">Email *</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit-yearLevel">Year Level</Label>
                  <Select value={form.yearLevel} onValueChange={(v) => setForm((f) => ({ ...f, yearLevel: v as any }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1st Year</SelectItem>
                      <SelectItem value="2">2nd Year</SelectItem>
                      <SelectItem value="3">3rd Year</SelectItem>
                      <SelectItem value="4">4th Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-status">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as any }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="graduated">Graduated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-sm font-semibold">Parent/Guardian Contact (Optional)</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="edit-parentName" className="text-xs">Name</Label>
                    <Input
                      id="edit-parentName"
                      value={form.parentContact?.name || ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          parentContact: { name: e.target.value, phone: f.parentContact?.phone || "" },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-parentPhone" className="text-xs">Phone</Label>
                    <Input
                      id="edit-parentPhone"
                      value={form.parentContact?.phone || ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          parentContact: { name: f.parentContact?.name || "", phone: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label className="font-semibold">Assigned Courses</Label>
                <div className="space-y-3 mt-3">
                  {(form.assignedCourses || []).map((ac: AssignedCourse, idx: number) => (
                    <div key={idx} className="space-y-2 p-3 border rounded-lg bg-muted/30">
                      <div className="flex items-start gap-2">
                        <div className="relative flex-1">
                          <Input
                            placeholder="Search course e.g., CS101"
                            value={ac.course}
                            onChange={(e) => updateCourseCode(idx, e.target.value)}
                            onFocus={() => setFocusedCourseIdx(idx)}
                            onBlur={() => setTimeout(() => setFocusedCourseIdx((v) => (v === idx ? null : v)), 150)}
                            className="w-full"
                          />
                          {focusedCourseIdx === idx && ac.course && (
                            <div className="absolute z-20 top-full left-0 mt-1 w-full max-h-64 overflow-y-auto bg-popover border border-border rounded-md shadow-lg">
                              {getCourseSuggestions(ac.course).map((c) => (
                                <div
                                  key={c.code}
                                  className="p-3 hover:bg-muted/60 cursor-pointer transition-colors border-b border-border/50 last:border-0"
                                  onMouseDown={() => { setCourseFromSuggestion(idx, c); setFocusedCourseIdx(null); }}
                                >
                                  <div className="font-semibold text-sm">{c.code}</div>
                                  <div className="text-sm text-foreground/90">{c.title}</div>
                                  <div className="text-xs text-muted-foreground">{c.units} units</div>
                                </div>
                              ))}
                              {getCourseSuggestions(ac.course).length === 0 && (
                                <div className="p-4 text-center text-sm text-muted-foreground">No courses found</div>
                              )}
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" className="shrink-0 text-destructive hover:text-destructive" onClick={() => removeCourseRow(idx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {ac.course && (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-sm text-foreground">{ac.course}{ac.title ? ` — ${ac.title}` : ''}</p>
                            {ac.units !== undefined && <p className="text-xs text-muted-foreground">{ac.units} units</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <Button onClick={addCourseRow} variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Course
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-gradient-to-r from-primary to-accent text-white py-3 font-semibold rounded-lg shadow-lg" onClick={handleEdit}>
                  Save Changes
                </Button>
                <Button variant="ghost" className="flex-1" onClick={() => setIsEditOpen(false)}>
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

export default Students;
