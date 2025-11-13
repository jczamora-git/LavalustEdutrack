import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, User, BookOpen, LayoutGrid, List, Upload, DownloadCloud } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertMessage } from "@/components/AlertMessage";
import EmailLoadingModal from "@/components/EmailLoadingModal";
import { useConfirm } from "@/components/Confirm";
import { API_ENDPOINTS, apiPost, apiGet, apiPut, apiDelete, apiUploadFile } from "@/lib/api";
import { Pagination } from "@/components/Pagination";

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

  const [students, setStudents] = useState<Student[]>([]);

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
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const [isImportResultOpen, setIsImportResultOpen] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number; total_rows: number; errors: string[] } | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);

  const showAlert = (type: "success" | "error" | "info", message: string) => {
    setAlert({ type, message });
  };

  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImportClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleExport = async () => {
    try {
      showAlert('info', 'Preparing export...');
      const resp = await fetch(API_ENDPOINTS.STUDENTS_EXPORT, { method: 'GET', credentials: 'include' });
      if (!resp.ok) {
        // try to parse json error
        const txt = await resp.text();
        try { const parsed = txt ? JSON.parse(txt) : {}; throw new Error(parsed.message || 'Export failed'); } catch (e: any) { throw new Error(e.message || 'Export failed'); }
      }

      const blob = await resp.blob();
      const disposition = resp.headers.get('Content-Disposition') || '';
      let filename = 'students_export.csv';
      const match = disposition.match(/filename\*=UTF-8''(.+)|filename="?([^";]+)"?/);
      if (match) {
        filename = decodeURIComponent((match[1] || match[2] || '').replace(/"/g, '')) || filename;
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showAlert('success', 'Export ready — download started');
    } catch (err: any) {
      console.error('Export error', err);
      showAlert('error', err?.message || 'Failed to export students');
    }
  };

  const handleFileChange = async (e: any) => {
    const file = e?.target?.files?.[0];
    if (!file) return;

    // Show loading state
    showAlert("info", `Uploading ${file.name}...`);

    try {
      // Upload file to backend
      const result = await apiUploadFile(API_ENDPOINTS.STUDENTS_IMPORT, file);

      if (result && result.success) {
        // Store import results and show dialog
        setImportResult({
          inserted: result.inserted || 0,
          skipped: result.skipped || 0,
          total_rows: result.total_rows || 0,
          errors: result.errors || [],
        });
        setIsImportResultOpen(true);

        // Refresh student list
        await fetchStudents();

        // Show success alert
        showAlert("success", result.message || `Import completed: ${result.inserted} students added`);
      } else {
        throw new Error(result?.message || "Import failed");
      }
    } catch (err: any) {
      console.error("Import error:", err);
      showAlert("error", err.message || "Failed to import students");
    } finally {
      // Reset file input so the same file can be selected again
      if (e.currentTarget) e.currentTarget.value = "";
    }
  };

  const yearLevelToEnum = (v: string | undefined) => {
    if (!v) return undefined;
    const map: Record<string, string> = { '1': '1st Year', '2': '2nd Year', '3': '3rd Year', '4': '4th Year', '1st Year': '1st Year', '2nd Year': '2nd Year', '3rd Year': '3rd Year', '4th Year': '4th Year' };
    return map[String(v)] ?? undefined;
  };

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate]);

  // Fetch students from API (uses the USERS endpoint + ../students similar to other pages)
  const fetchStudents = async () => {
    try {
      const res = await apiGet(`${API_ENDPOINTS.USERS}/../students`);
      // Accept shapes: { success: true, data: [...] } or { students: [...] } or array directly
      const rows = res && (res.data || res.students) ? (res.data || res.students) : Array.isArray(res) ? res : [];
      if (Array.isArray(rows)) {
        const mapped: Student[] = rows.map((r: any) => {
          // normalize section to a numeric value when possible (e.g. 'F4' or 'Section 4' -> '4')
          const rawSec = r.section_name ?? r.section ?? (r.section_id ? String(r.section_id) : "");
          let secNum = "";
          if (rawSec) {
            const m = String(rawSec).match(/(\d+)/);
            secNum = m ? m[1] : String(rawSec).trim();
          }
          return {
          id: String(r.id ?? r.user_id ?? Date.now()),
          name: `${r.first_name || r.firstName || ''} ${r.last_name || r.lastName || ''}`.trim() || (r.email || ''),
          email: r.email || r.user_email || '',
          studentId: r.student_id || r.studentId || '',
          yearLevel: (typeof r.year_level === 'string') ? (r.year_level.startsWith('1') ? '1' : r.year_level.charAt(0)) : (r.year_level || '1'),
          section: secNum,
          phone: r.phone || '',
          parentContact: undefined,
          status: r.status || r.user_status || 'active',
          // prefer any assigned courses already returned by the API
          assignedCourses: (r.assigned_courses || r.assignedCourses || r.courses || []).map((c: any) => ({ course: c.course_code || c.code || c.course || String(c), title: c.course_name || c.title || undefined, units: c.credits ?? c.units ?? undefined })) as AssignedCourse[],
          };
        });
        setStudents(mapped);

        // Populate assignedCourses based on subjects for the student's year level.
        // Collect unique year levels present in the fetched students.
        const years = Array.from(new Set(mapped.map((m) => String(m.yearLevel || '1'))));
        if (years.length > 0) {
          try {
            // Fetch subjects for each year once
            const yearFetches = years.map(async (y) => {
              try {
                const subRes = await apiGet(`${API_ENDPOINTS.SUBJECTS}?year_level=${encodeURIComponent(String(y))}`);
                const arr = subRes && (subRes.subjects || subRes.data) ? (subRes.subjects || subRes.data) : Array.isArray(subRes) ? subRes : [];
                const normalized = Array.isArray(arr)
                  ? arr.map((c: any) => ({ course: c.course_code || c.code || c.course || String(c), title: c.course_name || c.title || undefined, units: c.credits ?? c.units ?? undefined }))
                  : [];
                return { year: String(y), subjects: normalized };
              } catch (err) {
                return { year: String(y), subjects: [] };
              }
            });

            const yearResults = await Promise.all(yearFetches);
            const subjectsByYear: Record<string, AssignedCourse[]> = {};
            yearResults.forEach((yr) => {
              subjectsByYear[yr.year] = yr.subjects as AssignedCourse[];
            });

            // Update students: set assignedCourses to the subjects for their year
            setStudents((prev) => prev.map((s) => ({ ...s, assignedCourses: subjectsByYear[String(s.yearLevel)] || [] })));
          } catch (err) {
            console.warn('Failed to fetch subjects by year to populate assignedCourses', err);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load students', err);
      showAlert('error', err.message || 'Failed to load students');
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      fetchStudents();
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    // initial fetch: load subjects (unfiltered) so suggestions are available
    // Specific year-level fetches are performed when opening Create/Edit and when year changes
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

  // Helper: fetch subjects optionally filtered by year level.
  // Many subject records include year-level metadata, so the API supports a query param like ?year_level=1
  const fetchSubjects = async (yearLevel?: string) => {
    try {
      let url = API_ENDPOINTS.SUBJECTS;
      if (yearLevel && String(yearLevel).trim() !== '') {
        // prefer sending numeric year value (1/2/3/4)
        url = `${API_ENDPOINTS.SUBJECTS}?year_level=${encodeURIComponent(String(yearLevel))}`;
      }
      const res = await apiGet(url);
      if (res && res.success) {
        const mapped = (res.subjects || []).map((s: any) => ({ code: s.course_code, title: s.course_name, units: s.credits ?? 3 }));
        setSubjects(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch subjects by year level', err);
    }
  };

  // Generate next student ID by asking backend for last id and incrementing
  const generateStudentId = async (): Promise<string> => {
    try {
      const year = new Date().getFullYear();
      // try API endpoint for last student id
      const res = await apiGet(`${API_ENDPOINTS.STUDENTS}/last-id?year=${year}`);
      if (res && res.last_id) {
        const match = String(res.last_id).match(/MCC\d+-(\d+)/);
        if (match) {
          const nextNum = parseInt(match[1], 10) + 1;
          return `MCC${year}-${String(nextNum).padStart(5, '0')}`;
        }
      }
      return `MCC${year}-00001`;
    } catch (err) {
      console.error('Error generating student ID:', err);
      const year = new Date().getFullYear();
      return `MCC${year}-00001`;
    }
  };

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      q === "" ||
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.studentId.toLowerCase().includes(q);
    const matchesYearLevel = yearLevelFilter === "all" || s.yearLevel === yearLevelFilter;
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    // sectionFilter stored as `${year}-${sectionNum}` (e.g. "1-4"). Compare accordingly.
    const matchesSection =
      sectionFilter === "all" || `${s.yearLevel}-${s.section}` === sectionFilter;
    return matchesQuery && matchesYearLevel && matchesStatus;
  });

  // available sections for the Section filter dropdown (filter out empty strings to avoid SelectItem error)
  // Build unique year-section keys for the section filter dropdown (format: "1-4")
  const availableSections = Array.from(
    new Set(
      students
        .map((s) => {
          const sec = s.section?.toString().trim();
          if (!sec) return null;
          return `${s.yearLevel}-${sec}`;
        })
        .filter((x) => x)
    )
  ).sort();

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

  // Pagination: slice the sorted list
  const totalItems = sortedStudents.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  // clamp current page
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  // Reset page when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, yearLevelFilter, statusFilter, sectionFilter, sortOption]);

  const pagedStudents = sortedStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenCreate = () => {
    setForm({
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
      assignedCourses: [],
    });
    // fetch suggestions for default year (1)
    fetchSubjects('1');
    setIsCreateOpen(true);
  };

  const handleCreate = async () => {
    // First/Last name and email required; studentId optional (backend will generate if empty)
    if (!form.firstName?.trim() || !form.lastName?.trim() || !form.email?.trim()) {
      showAlert("error", "First name, last name and email are required");
      return;
    }
    // We'll create a user first, then create the student profile linked to that user.
    let createdUserId: number | string | null = null;
    setEmailSuccess(false);
    setShowEmailModal(true);
    try {
      // 1) create user
      const userResp = await apiPost(API_ENDPOINTS.USERS, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        role: 'student',
        phone: form.phone?.trim() || '',
        password: 'demo123'
      });

      if (!userResp || !userResp.success || !userResp.user) {
        const msg = (userResp && userResp.message) || 'Failed to create user';
        showAlert('error', msg);
        setShowEmailModal(false);
        return;
      }

      createdUserId = userResp.user.id;
      const defaultPassword = userResp.default_password || 'demo123';

      // 2) create student profile
      const studentIdToUse = form.studentId?.trim() || await generateStudentId();
      const payload: any = {
        user_id: createdUserId,
        student_id: studentIdToUse,
        year_level: yearLevelToEnum(form.yearLevel) || `${form.yearLevel}st Year`,
        status: form.status,
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone?.trim() || null,
      };

      const res = await apiPost(API_ENDPOINTS.STUDENTS, payload);
      if (!res || !res.success) {
        // cleanup created user to avoid dangling account
        try {
          if (createdUserId) await apiDelete(API_ENDPOINTS.USER_BY_ID(String(createdUserId)));
        } catch (cleanupErr) {
          console.warn('Failed to cleanup created user after student profile failure', cleanupErr);
        }
        const msg = (res && res.message) || 'Failed to create student profile';
        showAlert('error', msg);
        setShowEmailModal(false);
        return;
      }

      // 3) Send welcome email
      const emailResponse = await fetch('/api/students/send-welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          password: defaultPassword,
          studentId: studentIdToUse,
          yearLevel: yearLevelToEnum(form.yearLevel) || `${form.yearLevel}st Year`
        }),
        credentials: 'include'
      });

      // read text first in case server returns HTML (login page, error, etc.)
      const emailText = await emailResponse.text();
      let emailData: any = null;
      try {
        emailData = emailText ? JSON.parse(emailText) : { success: emailResponse.ok };
      } catch (err) {
        console.error('Non-JSON response from email endpoint:', emailResponse.status, emailText);
        emailData = { success: emailResponse.ok, message: emailText };
      }

      if (emailData && emailData.success) {
        setEmailSuccess(true);
      } else {
        setEmailSuccess(false);
      }

      // success: use returned student if present
      if (res && res.student) {
        const created = res.student;
        const displayName = `${form.firstName.trim()} ${form.lastName.trim()}`;
        const newStudent: Student = {
          id: created.id?.toString() || String(createdUserId),
          name: displayName,
          email: created.email ?? form.email,
          studentId: created.student_id ?? studentIdToUse,
          yearLevel: (created.year_level || `1st Year`).startsWith('1') ? '1' : (created.year_level || '1st Year').charAt(0),
          section: created.section_id ? String(created.section_id) : '',
          phone: created.phone ?? form.phone,
          parentContact: form.parentContact,
          status: created.status ?? form.status,
          assignedCourses: created.assigned_courses ?? (form.assignedCourses || []),
        };
        setStudents((s) => [newStudent, ...s]);
        
        // Auto close modal and cleanup after 3 seconds
        setTimeout(() => {
          setShowEmailModal(false);
          setIsCreateOpen(false);
          setForm({ firstName: "", lastName: "", email: "", studentId: "", yearLevel: "1", section: "", phone: "", parentContact: undefined, status: "active", assignedCourses: [] });
        }, 3000);
        
        showAlert('success', `Student ${newStudent.name} created. Welcome email ${emailData.success ? 'sent' : 'send attempted'}!`);
        return;
      }

      // fallback: local add
      const displayName = `${form.firstName.trim()} ${form.lastName.trim()}`;
      const newStudent: Student = { id: String(createdUserId ?? Date.now()), name: displayName, email: form.email, studentId: studentIdToUse, yearLevel: form.yearLevel, section: '', phone: form.phone, parentContact: form.parentContact, status: form.status, assignedCourses: form.assignedCourses };
      setStudents((s) => [newStudent, ...s]);
      
      setTimeout(() => {
        setShowEmailModal(false);
        setIsCreateOpen(false);
        setForm({ firstName: "", lastName: "", email: "", studentId: "", yearLevel: "1", section: "", phone: "", parentContact: undefined, status: "active", assignedCourses: [] });
      }, 3000);
      
      showAlert('success', `Student ${displayName} created. Welcome email ${emailData.success ? 'sent' : 'send attempted'}!`);
    } catch (err: any) {
      console.error('Error creating student:', err);
      // cleanup if user was created
      if (createdUserId) {
        try {
          await apiDelete(API_ENDPOINTS.USER_BY_ID(String(createdUserId)));
        } catch (cleanupErr) {
          console.warn('Cleanup failed', cleanupErr);
        }
      }
      setShowEmailModal(false);
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
    // fetch subjects that match this student's year level so suggestions match
    if (s.yearLevel) fetchSubjects(s.yearLevel);
  };

  const handleEdit = async () => {
    if (!selectedStudentId) return;

    // Build payload expected by StudentController::api_update_student
  const payload: any = {};
  if (form.studentId !== undefined) payload.studentId = form.studentId;
  if (form.yearLevel !== undefined) payload.yearLevel = yearLevelToEnum(form.yearLevel) ?? `${form.yearLevel}st Year`;
    if (form.section !== undefined && form.section !== '') {
      // try to send numeric id for section when possible
      const n = Number(form.section);
      payload.sectionId = Number.isFinite(n) && n > 0 ? n : form.section;
    }
    if (form.status !== undefined) payload.status = form.status;

    try {
      const res = await apiPut(`/api/students/${selectedStudentId}`, payload);
      if (res && res.success) {
        const updated = res.data || res.student || null;
        if (updated) {
          // map server response to local Student shape
          const mapped: Student = {
            id: String(updated.id ?? updated.user_id ?? selectedStudentId),
            name: `${updated.first_name || updated.firstName || form.name || ''} ${updated.last_name || updated.lastName || ''}`.trim() || (form.name || ''),
            email: updated.email ?? form.email ?? '',
            studentId: updated.student_id ?? form.studentId ?? '',
            yearLevel: (updated.year_level || `${form.yearLevel}st Year`).startsWith('1') ? '1' : (updated.year_level || `${form.yearLevel}st Year`).charAt(0),
            section: updated.section_id ? String(updated.section_id) : (updated.section_name || form.section || ''),
            phone: updated.phone ?? form.phone ?? '',
            parentContact: form.parentContact,
            status: updated.status ?? form.status ?? 'active',
            assignedCourses: updated.assigned_courses ?? form.assignedCourses ?? [],
          };
          setStudents((prev) => prev.map((s) => (s.id === selectedStudentId ? mapped : s)));
        } else {
          // fallback: update local copy with form values
          setStudents((prev) => prev.map((s) => (s.id === selectedStudentId ? { ...s, ...form } : s)));
        }

        setIsEditOpen(false);
        setSelectedStudentId(null);
        showAlert('success', res.message || 'Student updated');
        return;
      }

      throw new Error(res && res.message ? res.message : 'Update failed');
    } catch (err: any) {
      console.error('Failed to update student', err);
      showAlert('error', err?.message || String(err) || 'Failed to update student');
    }
  };

  const handleDelete = async (id: string) => {
    const s = students.find((x) => x.id === id);
    if (!s) return;
    const ok = await confirm({
      title: 'Inactivate student',
      description: `Inactivate student ${s.name}? This will set the student to INACTIVE status.`,
      emphasis: s.name,
      confirmText: 'Inactivate',
      cancelText: 'Cancel',
      variant: 'destructive'
    });
    if (!ok) return;
    setStudents((prev) => prev.map((x) => (x.id === id ? { ...x, status: "inactive" } : x)));
    showAlert("info", `Student ${s.name} has been set to inactive`);
  };

  if (!isAuthenticated) return null;

  return (
    <DashboardLayout>
      {/* Email Loading Modal */}
      <EmailLoadingModal
        isOpen={showEmailModal}
        isSuccess={emailSuccess}
        emailType="confirmation"
        customMessage="Sending welcome email..."
        customSuccessMessage="Welcome email sent successfully!"
        onComplete={() => setShowEmailModal(false)}
        autoCloseDuration={3000}
      />

      <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Manage Students</h1>
            <p className="text-muted-foreground">View and manage student accounts and enrollments</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="ml-auto flex items-center">
              {/* hidden file input for import placeholder (accessible via aria-label/title) */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={handleFileChange}
                aria-label="Import students file"
                title="Select a CSV or Excel file to import students"
              />
              <Button variant="outline" onClick={handleImportClick} className="mr-3 border-2 rounded-xl px-4 py-2.5">
                <Upload className="h-4 w-4 mr-2" />
                Import Students
              </Button>

              <Button variant="outline" onClick={handleExport} className="mr-3 border-2 rounded-xl px-4 py-2.5">
                <DownloadCloud className="h-4 w-4 mr-2" />
                Export Students
              </Button>

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
                          {sectionFilter === "all" ? "All Sections" : (() => {
                            const parts = String(sectionFilter).split('-');
                            return parts.length === 2 ? `${parts[0]} - F${parts[1]}` : String(sectionFilter);
                          })()}
                        </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sections</SelectItem>
                        {availableSections.map((sec) => {
                          const [y, s] = String(sec).split('-');
                          return (
                            <SelectItem key={sec} value={sec}>{`${y} - F${s}`}</SelectItem>
                          );
                        })}
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
                {pagedStudents.map((student) => (
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
                              <p className="text-xs text-muted-foreground mt-1">{student.yearLevel} - F{student.section || '—'}</p>
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
                {pagedStudents.map((student) => (
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
                        <p className="text-xs text-muted-foreground">{student.yearLevel} - F{student.section || '—'}</p>
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

                {totalItems === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <User className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-lg font-medium">No students found matching your filters</p>
                  </div>
                )}
              </div>
            )}
            {/* Pagination controls */}
            <div className="mt-6 px-2">
              <Pagination
                currentPage={currentPage}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={(p) => setCurrentPage(p)}
              />
            </div>
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
                    placeholder="e.g., MCC2025-00001 — leave empty to auto-generate"
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
                  <Select value={form.yearLevel || "1"} onValueChange={(v) => {
                      setForm((f) => ({ ...f, yearLevel: v as any }));
                      // update subject suggestions to match the selected year
                      fetchSubjects(String(v));
                    }}>
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
                  <Select value={form.status || "active"} onValueChange={(v) => setForm((f) => ({ ...f, status: v as any }))}>
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
              {/* Assigned courses removed from Add modal - assignment handled on dedicated page */}
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
                  <Select value={form.yearLevel || "1"} onValueChange={(v) => {
                      setForm((f) => ({ ...f, yearLevel: v as any }));
                      fetchSubjects(String(v));
                    }}>
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
                  <Select value={form.status || "active"} onValueChange={(v) => setForm((f) => ({ ...f, status: v as any }))}>
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
              <div className="mt-4">
                <Button
                  variant="secondary"
                  className="w-full justify-center"
                  onClick={() => {
                    setIsEditOpen(false);
                    if (selectedStudentId) navigate(`/admin/users/students/${selectedStudentId}/courses`);
                  }}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Manage Subjects
                </Button>
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <Button className="flex-1 bg-gradient-to-r from-primary to-accent text-white py-3 font-semibold rounded-lg shadow-lg" onClick={handleEdit}>
                  Save Changes
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Import Results Dialog */}
        <Dialog open={isImportResultOpen} onOpenChange={setIsImportResultOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-0 shadow-2xl">
            <DialogHeader className="bg-gradient-to-r from-primary to-accent px-6 py-6 -mx-6 -mt-6 mb-6 rounded-t-lg">
              <DialogTitle className="text-2xl font-bold text-white">Import Results</DialogTitle>
            </DialogHeader>
            {importResult && (
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="border-2 border-green-200 bg-green-50">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-green-700">{importResult.inserted}</p>
                        <p className="text-sm text-green-600 mt-1">Students Imported</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-2 border-yellow-200 bg-yellow-50">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-yellow-700">{importResult.skipped}</p>
                        <p className="text-sm text-yellow-600 mt-1">Skipped</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-2 border-blue-200 bg-blue-50">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-blue-700">{importResult.total_rows}</p>
                        <p className="text-sm text-blue-600 mt-1">Total Rows</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Error Details */}
                {importResult.errors && importResult.errors.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3 text-destructive">Errors & Warnings ({importResult.errors.length})</h3>
                    <div className="max-h-96 overflow-y-auto border-2 border-destructive/20 rounded-lg bg-destructive/5 p-4">
                      <ul className="space-y-2">
                        {importResult.errors.map((error, idx) => (
                          <li key={idx} className="text-sm text-destructive flex items-start gap-2">
                            <span className="font-mono text-xs bg-destructive/10 px-2 py-0.5 rounded flex-shrink-0">
                              {idx + 1}
                            </span>
                            <span>{error}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Success message if no errors */}
                {(!importResult.errors || importResult.errors.length === 0) && importResult.inserted > 0 && (
                  <div className="text-center py-4">
                    <p className="text-lg font-semibold text-green-700">✓ All students imported successfully!</p>
                    <p className="text-sm text-muted-foreground mt-2">Default password for all imported students: <code className="bg-muted px-2 py-1 rounded">demo123</code></p>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    className="flex-1 bg-gradient-to-r from-primary to-accent text-white py-3 font-semibold rounded-lg shadow-lg"
                    onClick={() => setIsImportResultOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {alert && <AlertMessage type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}
      </div>
    </DashboardLayout>
  );
};

export default Students;
