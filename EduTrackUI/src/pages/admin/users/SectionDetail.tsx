import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Trash2, Grid3x3, Users, ArrowLeft, X, LayoutGrid, List, ArrowUpDown, ChevronLeft, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertMessage } from "@/components/AlertMessage";
import { useConfirm } from "@/components/Confirm";
import { API_ENDPOINTS, apiGet, apiPut } from "@/lib/api";

type Section = {
  id: string;
  name: string;
  students: string[];
  status: "active" | "inactive";
  description: string;
};

type SectionOption = {
  id: string;
  name: string;
  yearLevel?: string;
};

type Student = {
  id: string; // internal id
  studentId?: string; // school id (e.g., STU001)
  name: string;
  yearLevel?: string;
  email?: string;
  sectionId?: string | number | null;
};

// Students fetched from backend (used for suggestions)
const MOCK_FALLBACK_STUDENTS: Student[] = [
  { id: "1", studentId: "STU001", name: "John Doe", yearLevel: "1st Year" },
  { id: "2", studentId: "STU002", name: "Jane Smith", yearLevel: "1st Year" },
];

const SectionDetail = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddStudentPanelOpen, setIsAddStudentPanelOpen] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [availableSearchQuery, setAvailableSearchQuery] = useState("");
  const [studentsData, setStudentsData] = useState<Student[]>([]);
  const [sectionStudents, setSectionStudents] = useState<Student[]>([]);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [allSections, setAllSections] = useState<SectionOption[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get section from state or use mock data
  const sectionFromState = location.state?.section;
   const yearFromState = location.state?.yearLevel as string | undefined;
  const [section, setSection] = useState<Section | null>(
    sectionFromState || {
      id: "1",
      name: "F1",
      students: ["John Doe", "Jane Smith", "Carlos Rodriguez", "Maria Garcia", "Ahmed Hassan"],
      status: "active",
      description: "Bachelor of Science in Information Technology",
    }
  );

  // Read route param so we can react when :sectionId changes
  const params = useParams();
  const routeSectionId = params.sectionId as string | undefined;

  // When route param changes, fetch the section details so the component refreshes
  useEffect(() => {
    const loadSectionFromRoute = async () => {
      if (!routeSectionId) return;
      // If we already have the same section loaded, skip
      if (section && String(section.id) === routeSectionId) return;

      try {
        const res = await apiGet(`${API_ENDPOINTS.SECTIONS}/${routeSectionId}`);
        let s: any = null;
        if (res && res.section) s = res.section;
        else if (res && res.data) s = res.data;
        else s = res;

        if (s) {
          const normalized: Section = {
            id: String(s.id ?? s.section_id ?? routeSectionId),
            name: s.name ?? s.section_name ?? s.section ?? '',
            students: Array.isArray(s.students) ? s.students.map((st: any) => st.name ?? st) : (s.students || []),
            status: (s.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
            description: s.description ?? s.desc ?? ''
          };

          setSection(normalized);
        }
      } catch (e) {
        console.error('[SectionDetail] Failed to load section by route id', routeSectionId, e);
      }
    };

    loadSectionFromRoute();
  }, [routeSectionId]);

   // Display title: prefix with year number when provided in navigation state (e.g. '1-F1')
   const yearPrefix = yearFromState ? (yearFromState.match(/\d+/)?.[0] ?? yearFromState) : null;
   const displayTitle = section ? (yearPrefix ? `${yearPrefix}-${section.name}` : section.name) : "";

  const [alert, setAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const showAlert = (type: "success" | "error" | "info", message: string) => {
    setAlert({ type, message });
  };

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate]);

  // Load all sections for the current year level to populate the selector
  useEffect(() => {
    const loadSectionsForYear = async () => {
      if (!yearFromState || !section?.id) return;

      // Extract numeric year id (e.g., '2' from '2nd Year' or '2')
      const yearId = yearFromState.match(/\d+/)?.[0];
      if (!yearId) {
        console.warn('[SectionDetail] yearFromState does not contain numeric year id:', yearFromState);
        setAllSections([{ id: section.id, name: section.name, yearLevel: yearFromState }]);
        return;
      }

      try {
        // Call backend route: GET /api/year-levels/{id}/sections
        const url = `${API_ENDPOINTS.YEAR_LEVELS}/${yearId}/sections`;
        const res = await apiGet(url);
        let sections: any[] = [];
        if (Array.isArray(res)) {
          sections = res;
        } else if (res && res.data) {
          sections = res.data;
        } else if (res && res.sections) {
          sections = res.sections;
        }

        console.log('[SectionDetail] Loaded year-level sections:', sections, 'for yearId:', yearId);

        const mapped = (sections || [])
          .map((s: any) => ({
            id: String(s.id ?? s.section_id ?? s.sectionId ?? ''),
            name: s.name ?? s.section_name ?? s.section ?? '',
            yearLevel: yearFromState,
          }))
          .filter((s: SectionOption) => s.id && s.name);

        // Ensure current section is present
        const ids = new Set(mapped.map((m) => m.id));
        if (!ids.has(section.id)) {
          mapped.unshift({ id: section.id, name: section.name, yearLevel: yearFromState });
        }

        setAllSections(mapped);
      } catch (e) {
        console.error('Failed to load year-level sections', e);
        // Fallback: at least show current section
        setAllSections([{ id: section.id, name: section.name, yearLevel: yearFromState }]);
      }
    };

    loadSectionsForYear();
  }, [yearFromState, section?.id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  // Load all students with matching year level but NO section (available to add)
  useEffect(() => {
    const loadAvailableStudents = async () => {
      if (!section?.id || !yearFromState) return;
      try {
        // Fetch students with this year level but no section (section_id = null)
        const res = await apiGet(`${API_ENDPOINTS.STUDENTS}?year_level=${encodeURIComponent(yearFromState)}&section_id=`);
        let arr: any[] = [];
        if (Array.isArray(res)) arr = res as any[];
        else if (res && res.data) arr = res.data;
        else if (res && res.students) arr = res.students;

        const normalized: Student[] = (arr || []).map((s: any) => ({
          id: String(s.id ?? s.user_id ?? s.student_id ?? s.uuid ?? Date.now()),
          studentId: s.student_id ?? s.student_number ?? s.id_number ?? s.user_id ?? undefined,
          name: s.name ?? s.full_name ?? [s.first_name, s.last_name].filter(Boolean).join(" ") ?? "",
          yearLevel: s.year_level ?? s.yearLevel ?? s.year ?? undefined,
          email: s.email ?? s.user_email ?? s.username ?? undefined,
          sectionId: s.section_id ?? s.sectionId ?? s.section ?? null,
        })).filter((x: Student) => x.name);

        // Only include students that do NOT have a section assigned (sectionId null/empty)
        const available = normalized.filter((st) => st.sectionId === null || st.sectionId === undefined || st.sectionId === "" );
        setAvailableStudents(available.length ? available : []);
      } catch (e) {
        console.error('Failed to load available students', e);
        setAvailableStudents([]);
      }
    };
    loadAvailableStudents();
  }, [section?.id, yearFromState]);

  // Load students belonging to this section (and optionally filtered by year level)
  useEffect(() => {
    const loadSectionStudents = async () => {
      if (!section?.id) return;
      try {
        const params: string[] = [];
        if (yearFromState) params.push(`year_level=${encodeURIComponent(yearFromState)}`);
        params.push(`section_id=${encodeURIComponent(section.id)}`);
        const url = API_ENDPOINTS.STUDENTS + (params.length ? `?${params.join('&')}` : '');

        const res = await apiGet(url);
        let arr: any[] = [];
        if (Array.isArray(res)) arr = res as any[];
        else if (res && res.data) arr = res.data;
        else if (res && res.students) arr = res.students;

        const normalized: Student[] = (arr || []).map((s: any) => ({
          id: String(s.id ?? s.user_id ?? s.student_id ?? s.uuid ?? Date.now()),
          studentId: s.student_id ?? s.student_number ?? s.id_number ?? s.user_id ?? undefined,
          name: s.name ?? s.full_name ?? [s.first_name, s.last_name].filter(Boolean).join(' ') ?? '',
          yearLevel: s.year_level ?? s.yearLevel ?? s.year ?? undefined,
          email: s.email ?? s.user_email ?? s.username ?? undefined,
        })).filter((x: Student) => x.name);

        // Update studentsData (for suggestions) and section students list
        if (normalized.length) {
          setStudentsData(normalized);
          setSectionStudents(normalized);
          // keep legacy section.students string array in sync
          setSection((prev) => prev ? { ...prev, students: normalized.map((s) => s.name) } : prev);
        } else {
          // keep existing studentsData but if empty ensure fallback
          setStudentsData((d) => (d.length ? d : MOCK_FALLBACK_STUDENTS));
        }
      } catch (e) {
        console.error('Failed to load section students', e);
        // leave existing local state intact
      }
    };

    loadSectionStudents();
  }, [section?.id, yearFromState]);

  // Handle adding a student from the available list
  const handleAddStudentFromPanel = async (student: Student) => {
    if (sectionStudents.find((s) => s.id === student.id)) {
      showAlert("error", "Student already exists in this section");
      return;
    }

    try {
      await apiPut(API_ENDPOINTS.STUDENT_BY_ID(student.id), { sectionId: section.id });
      const newSection = { ...section, students: [...section.students, student.name] };
      setSection(newSection);
      setSectionStudents((s) => [...s, student]);
      setAvailableStudents((s) => s.filter((st) => st.id !== student.id));
      window.dispatchEvent(new CustomEvent("section-updated", { detail: newSection }));
      showAlert("success", `${student.name} added to section`);
    } catch (e: any) {
      console.error('Failed to update student section', e);
      showAlert("error", e?.message || 'Failed to update student record');
    }
  };

  const confirm = useConfirm();

  const handleRemoveStudent = async (student: Student) => {
    const studentInfo = `${student.name} (${student.studentId ?? student.id})`;
    const ok = await confirm({
      title: 'Remove student from section',
      description: `Are you sure you want to remove ${studentInfo} from ${displayTitle}?`,
      emphasis: studentInfo,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      variant: 'destructive'
    });
    if (!ok) return;

    try {
      // Unassign section on student record
      await apiPut(API_ENDPOINTS.STUDENT_BY_ID(student.id), { sectionId: null });

      const newSection = { ...section, students: section.students.filter((s) => s !== student.name) };
      setSection(newSection);
      setSectionStudents((s) => s.filter((st) => st.id !== student.id));
      // add back to available students list
      setAvailableStudents((s) => [{ ...student, sectionId: null }, ...s]);
      window.dispatchEvent(new CustomEvent("section-updated", { detail: newSection }));
      showAlert("success", `${student.name} removed from section`);
    } catch (e: any) {
      console.error('Failed to remove student from section', e);
      showAlert('error', e?.message || 'Failed to remove student from section');
    }
  };

  const handleSwitchSection = (sectionOption: SectionOption) => {
    console.log('[SectionDetail] Switching to section:', sectionOption);
    setIsDropdownOpen(false);

    const targetPath = `/admin/users/sections/${sectionOption.id}`;
    console.log('[SectionDetail] Current pathname:', window.location.pathname, 'Target:', targetPath);

    // Navigate to the selected section detail page, keeping the year level in state
    navigate(targetPath, {
      state: {
        section: {
          id: sectionOption.id,
          name: sectionOption.name,
          students: [],
          status: "active",
          description: "",
        },
        yearLevel: yearFromState,
      },
    });

    // Fallback: if react-router didn't update the path (rare), force a full navigation
    setTimeout(() => {
      if (window.location.pathname !== targetPath) {
        console.warn('[SectionDetail] react-router navigate did not update URL, forcing full navigation to', targetPath);
        window.location.href = targetPath;
      }
    }, 150);
  };

  const handleToggleStatus = async () => {
    if (!section) return;
    if (section.status === "active") {
      const ok = await confirm({
        title: 'Set Section to Inactive',
        description: `Are you sure you want to set ${section.name} to INACTIVE? This will remove all students from the section.`,
        confirmText: 'Set Inactive',
        cancelText: 'Cancel',
        variant: 'destructive'
      });
      if (!ok) {
        showAlert("info", "No changes made");
        return;
      }
      const newSection = { ...section, status: "inactive" as const, students: [] };
      setSection(newSection);
      // notify list page (if present) so it can sync
      window.dispatchEvent(new CustomEvent("section-updated", { detail: newSection }));
      showAlert("success", `${section.name} set to inactive and students cleared`);
    } else {
      const ok = await confirm({
        title: 'Activate Section',
        description: `Are you sure you want to activate ${section.name}?`,
        confirmText: 'Activate',
        cancelText: 'Cancel',
        variant: 'default'
      });
      if (!ok) {
        showAlert("info", "No changes made");
        return;
      }
      const newSection = { ...section, status: "active" as const };
      setSection(newSection);
      window.dispatchEvent(new CustomEvent("section-updated", { detail: newSection }));
      showAlert("success", `${section.name} set to active`);
    }
  };

  if (!isAuthenticated) return null;

  const studentsSource: Student[] = sectionStudents.length
    ? sectionStudents
    : (section.students || []).map((name, idx) => ({ id: `local-${idx}-${name}`, name } as Student));

  const filteredStudents = studentsSource.filter((s) =>
    searchQuery.trim() === "" || s.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) || (s.studentId ?? "").toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  // Apply sorting to the filtered students (by name)
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (sortOrder === "asc") return a.name.localeCompare(b.name);
    return b.name.localeCompare(a.name);
  });

  // Filter available students by search
  const filteredAvailableStudents = availableStudents.filter((s) =>
    availableSearchQuery.trim() === "" || s.name.toLowerCase().includes(availableSearchQuery.toLowerCase()) || (s.studentId ?? "").toLowerCase().includes(availableSearchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin/users/sections")}
            className="mb-6 gap-2 text-base font-medium hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Sections
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-4 mb-3">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                  <Grid3x3 className="h-8 w-8 text-white" />
                </div>
                <div>
                  {/* Section Title with Dropdown Selector */}
                  <div className="relative inline-block" ref={dropdownRef}>
                    <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="flex items-center gap-2 mb-3 hover:opacity-80 transition-opacity group"
                    >
                      <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        {displayTitle}
                      </h1>
                      {allSections.length > 1 && (
                        <ChevronDown className="h-6 w-6 text-primary group-hover:text-accent transition-colors" />
                      )}
                    </button>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && allSections.length >= 1 && (
                      <div className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-lg z-50">
                        <div className="max-h-96 overflow-y-auto">
                          {allSections.map((sectionOpt) => (
                            <button
                              key={sectionOpt.id}
                              type="button"
                              onClick={() => {
                                console.log('[SectionDetail] Dropdown item clicked:', sectionOpt);
                                handleSwitchSection(sectionOpt);
                              }}
                              className={`w-full text-left px-4 py-3 border-b border-border/50 last:border-b-0 transition-colors ${
                                sectionOpt.id === section?.id
                                  ? "bg-primary/10 text-primary font-semibold"
                                  : "hover:bg-accent/10 text-foreground"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>
                                  {yearPrefix ? `${yearPrefix}-${sectionOpt.name}` : sectionOpt.name}
                                </span>
                                {sectionOpt.id === section?.id && (
                                  <Badge variant="default" className="text-xs">
                                    Current
                                  </Badge>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-muted-foreground text-lg mt-1">{section.description}</p>
                </div>
              </div>
            </div>
            <Badge variant={section.status === "active" ? "default" : "outline"} className={`text-base font-semibold px-4 py-2 ${
              section.status === "active"
                ? "bg-gradient-to-r from-primary to-accent text-white"
                : "bg-muted/30 text-muted-foreground"
            }`}>
              {section.status.charAt(0).toUpperCase() + section.status.slice(1)}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-lg border-0 bg-gradient-to-br from-card to-muted/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground">Total Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{section.students.length}</div>
              <p className="text-sm text-muted-foreground mt-2">enrolled in this section</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg border-0 bg-gradient-to-br from-card to-muted/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground">Section Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${section.status === "active" ? "text-accent-600" : "text-muted-foreground"}`}>
                {section.status === "active" ? "Active" : "Inactive"}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {section.status === "active" ? "Taking new students" : "Not accepting students"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-muted border-b pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">Manage Students</CardTitle>
                <CardDescription className="text-base">Add or remove students from section {displayTitle}</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant={section.status === "active" ? "outline" : "default"}
                  size="sm"
                  onClick={() => handleToggleStatus()}
                  className={`font-semibold px-4 py-2 transition-all ${
                    section.status === "active"
                      ? "border-2 border-red-300 text-red-600 hover:bg-red-50"
                      : "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                  }`}
                >
                  {section.status === "active" ? "Set Inactive" : "Set Active"}
                </Button>
                <Button
                  onClick={() => setIsAddStudentPanelOpen(true)}
                  className={`bg-gradient-to-r from-primary to-accent hover:from-primary hover:to-accent text-white font-semibold gap-2 shadow-lg hover:shadow-xl transition-all ${
                    section.status === "inactive" ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  disabled={section.status === "inactive"}
                >
                  <Plus className="h-4 w-4" />
                  Add Student
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Search students by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 py-3 text-base border-2 focus:border-accent-500 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder((s) => (s === "asc" ? "desc" : "asc"))}
                  className="flex items-center gap-2 font-medium"
                  aria-pressed={sortOrder === "desc"}
                  title={`Sort ${sortOrder === "asc" ? "A → Z" : "Z → A"}`}
                >
                  <ArrowUpDown className="h-4 w-4" />
                  {sortOrder === "asc" ? "A → Z" : "Z → A"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode((v) => (v === "list" ? "grid" : "list"))}
                  className="flex items-center gap-2"
                  title="Toggle view"
                  aria-pressed={viewMode === "grid"}
                >
                  {viewMode === "list" ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                  <span className="ml-2 text-sm">{viewMode === "list" ? "List" : "Grid"}</span>
                </Button>
              </div>
            </div>

            {sortedStudents.length > 0 ? (
              viewMode === "list" ? (
                <div className="space-y-3">
                  {sortedStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-card to-muted/20 border-2 border-border/30 rounded-xl hover:border-accent-300 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-base shadow-md">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <p className="font-semibold text-base">{student.name}</p>
                            <Badge variant="secondary" className="capitalize font-semibold px-3 py-1 bg-gradient-to-r from-primary/10 to-accent/10 text-primary border border-primary/20">{student.studentId ?? "—"}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{student.email ?? "—"}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveStudent(student)}
                        disabled={section.status === "inactive"}
                        className={`text-destructive hover:text-destructive hover:bg-destructive/15 opacity-0 group-hover:opacity-100 transition-opacity gap-2 font-medium px-4 py-2 ${
                          section.status === "inactive" ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedStudents.map((student) => {
                    return (
                      <div key={student.id} className="p-4 border rounded-xl bg-card shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold">
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-3">
                                <p className="font-semibold">{student.name}</p>
                                <Badge variant="outline" className="text-xs font-semibold bg-gradient-to-r from-primary/10 to-accent/10 text-primary border border-primary/20">{student.studentId ?? "—"}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{student.email ?? "—"}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveStudent(student)}
                            disabled={section.status === "inactive"}
                            className={`text-destructive hover:text-destructive hover:bg-destructive/10 gap-2 ${
                              section.status === "inactive" ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-lg text-muted-foreground font-medium">
                  {searchQuery ? "No students matching your search" : "No students in this section yet"}
                </p>
                {!searchQuery && (
                  <p className="text-sm text-muted-foreground mt-2">Click "Add Student" to enroll students</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Student Side Panel */}
        {isAddStudentPanelOpen && (
          <div className="fixed inset-0 z-50 flex">
            {/* Overlay */}
            <div 
              className="absolute inset-0 bg-black/40 transition-opacity"
              onClick={() => setIsAddStudentPanelOpen(false)}
            />
            {/* Panel */}
            <div className="relative ml-auto w-full max-w-2xl bg-background shadow-2xl flex flex-col border-l border-border">
              {/* Header */}
              <div className="bg-gradient-to-r from-primary to-accent p-6 text-white flex items-center justify-between border-b border-accent-200">
                <h2 className="text-2xl font-bold">Add Students to {displayTitle}</h2>
                <button
                  onClick={() => setIsAddStudentPanelOpen(false)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-all"
                  title="Close panel"
                  aria-label="Close"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Content - Two column layout */}
              <div className="flex-1 overflow-hidden flex">
                {/* Left: Current Students */}
                <div className="w-1/2 border-r border-border flex flex-col">
                  <div className="p-4 border-b border-border bg-muted/30">
                    <h3 className="font-bold text-lg">Current Students ({sectionStudents.length})</h3>
                    <p className="text-xs text-muted-foreground mt-1">In {displayTitle}</p>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {sectionStudents.length > 0 ? (
                      <div className="space-y-2 p-4">
                        {sectionStudents.map((student) => (
                          <div key={student.id} className="p-3 bg-card rounded-lg border border-border/50 hover:border-accent-300 transition-all">
                            <p className="font-semibold text-sm">{student.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">{student.studentId ?? "—"} • {student.email ?? "—"}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p className="text-sm">No students enrolled yet</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Available Students */}
                <div className="w-1/2 flex flex-col">
                  <div className="p-4 border-b border-border bg-muted/30">
                    <h3 className="font-bold text-lg">Available Students ({availableStudents.length})</h3>
                    <p className="text-xs text-muted-foreground mt-1">Year level: {yearFromState || "—"}</p>
                    <div className="relative mt-3">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name or ID..."
                        value={availableSearchQuery}
                        onChange={(e) => setAvailableSearchQuery(e.target.value)}
                        className="pl-10 py-2 text-sm border-2 focus:border-accent-500 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {filteredAvailableStudents.length > 0 ? (
                      <div className="space-y-2 p-4">
                        {filteredAvailableStudents.map((student) => (
                          <div key={student.id} className="p-3 bg-card rounded-lg border border-border/50 hover:border-accent-300 hover:bg-accent/5 transition-all group cursor-pointer">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-semibold text-sm">{student.name}</p>
                                <p className="text-xs text-muted-foreground mt-1">{student.studentId ?? "—"} • {student.email ?? "—"}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleAddStudentFromPanel(student)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity gap-2 ml-2"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p className="text-sm">{availableSearchQuery ? "No students match your search" : "No available students"}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Remove old modal dialog */}

        {alert && <AlertMessage type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}
      </div>
    </DashboardLayout>
  );
};

export default SectionDetail;
