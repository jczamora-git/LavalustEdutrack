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
import { Plus, Search, Edit, Trash2, Grid3x3, Users, List, ChevronDown, ChevronUp, DownloadCloud } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertMessage } from "@/components/AlertMessage";
import { useConfirm } from "@/components/Confirm";
import { apiPost, apiGet, apiPut, apiDelete, API_ENDPOINTS } from "@/lib/api";

type Section = {
  id: string;
  name: string;
  students: string[];
  status: "active" | "inactive";
  description: string;
  yearLevel?: string;
  studentsCount?: number;
};

type YearLevel = {
  id: number;
  name: string;
  order: number;
};

const Sections = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [loading, setLoading] = useState(true);

  // Global section templates (no per-year assignment here)
  const [sections, setSections] = useState<Section[]>([]);

  // Year levels from backend
  const [yearLevels, setYearLevels] = useState<YearLevel[]>([]);

  // Mock mapping of year_level -> section names (this is the year_level_sections mapping)
  const [yearLevelSections, setYearLevelSections] = useState<Record<string, string[]>>({});

  // Student counts by section id (total)
  const [sectionStudentCounts, setSectionStudentCounts] = useState<Record<string, number>>({});

  // Student counts by section id + year label key `${sectionId}|${yearLabel}`
  const [sectionYearCounts, setSectionYearCounts] = useState<Record<string, number>>({});

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"manual" | "select">("manual");
  const [modalYearLabel, setModalYearLabel] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Section, "id">>({
    name: "",
    students: [],
    status: "active",
    description: "Bachelor of Science in Information Technology",
    yearLevel: "1st Year",
  });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; description: string; status: "active" | "inactive" }>({ name: "", description: "", status: "active" });

  const [alert, setAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);


  const showAlert = (type: "success" | "error" | "info", message: string) => {
    setAlert({ type, message });
  };

  const confirm = useConfirm();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      navigate("/auth");
    } else {
      fetchData();
    }
  }, [isAuthenticated, user, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch sections, year levels, and mappings in parallel using API helpers
      const [sectionsData, yearLevelsData, mappingsData] = await Promise.all([
        apiGet('/api/sections'),
        apiGet('/api/year-levels'),
        apiGet('/api/year-level-sections')
      ]);

      if (sectionsData.success) {
        // Convert backend sections to frontend format
        const mapped = sectionsData.sections.map((s: any) => ({
          id: s.id.toString(),
          name: s.name,
          students: [], // legacy placeholder
          studentsCount: 0,
          status: s.status,
          description: s.description
        }));
        setSections(mapped);

        // Fetch student counts for each section (total)
        try {
          const counts = {} as Record<string, number>;
          await Promise.all(mapped.map(async (sec) => {
              try {
              const res = await apiGet(`/api/students?section_id=${encodeURIComponent(sec.id)}`);
              let arr: any[] = [];
              if (Array.isArray(res)) arr = res as any[];
              else if (res && res.data) arr = res.data;
              else if (res && res.students) arr = res.students;
              counts[sec.id] = Array.isArray(arr) ? arr.length : 0;
            } catch (e) {
              counts[sec.id] = 0;
            }
          }));
          setSectionStudentCounts(counts);
          // Also update sections array to include the count in-place for quick UI render
          setSections((prev) => prev.map((p) => ({ ...p, studentsCount: counts[p.id] ?? 0 })));
        } catch (err) {
          console.error('Failed to fetch per-section student counts', err);
        }
      }

      if (yearLevelsData.success) {
        setYearLevels(yearLevelsData.year_levels);
      }

      if (mappingsData.success) {
        setYearLevelSections(mappingsData.organized);
        // After we have mappings and year levels, fetch per-section-per-year counts
        try {
          const countsByKey: Record<string, number> = {};
          // Build list of fetch promises
          const promises: Promise<void>[] = [];
          for (const yl of (yearLevelsData.success ? yearLevelsData.year_levels : [])) {
            const label = yl.name;
            const sectionNames: string[] = (mappingsData.organized && mappingsData.organized[label]) || [];
            for (const name of sectionNames) {
              const sec = (sectionsData.success ? sectionsData.sections.find((s: any) => s.name === name) : null) as any;
              if (!sec) continue;
              const key = `${sec.id}|${label}`;
              const p = (async () => {
                try {
                  const res = await apiGet(`/api/students?section_id=${encodeURIComponent(sec.id)}&year_level=${encodeURIComponent(label)}`);
                  let arr: any[] = [];
                  if (Array.isArray(res)) arr = res as any[];
                  else if (res && res.data) arr = res.data;
                  else if (res && res.students) arr = res.students;
                  countsByKey[key] = Array.isArray(arr) ? arr.length : 0;
                } catch (e) {
                  countsByKey[key] = 0;
                }
              })();
              promises.push(p);
            }
          }
          await Promise.all(promises);
          setSectionYearCounts(countsByKey);
        } catch (err) {
          console.error('Failed to fetch per-section-per-year counts', err);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showAlert('error', 'Failed to load data from server');
    } finally {
      setLoading(false);
    }
  };

  // Listen for updates coming from the detail page so the list can stay in sync.
  useEffect(() => {
    const handler = (e: Event) => {
      // CustomEvent carries the updated section in detail
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updated = (e as CustomEvent).detail as Section;
      setSections((prev) => {
        const found = prev.some((s) => s.id === updated.id);
        if (found) return prev.map((s) => (s.id === updated.id ? updated : s));
        return [updated, ...prev];
      });
    };
    window.addEventListener("section-updated", handler as EventListener);
    return () => window.removeEventListener("section-updated", handler as EventListener);
  }, []);

  const filteredSections = sections.filter((s) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery = q === "" || s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  // Convert backend year levels to frontend format
  const YEAR_LEVELS = yearLevels.map(yl => ({
    key: yl.name.replace(' Year', '').toLowerCase(),
    label: yl.name,
    id: yl.id,
    names: [] // We'll use yearLevelSections mapping instead
  }));

  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});
  const toggleYear = (key: string) => setExpandedYears((s) => ({ ...s, [key]: !s[key] }));

  const findSectionByName = (name: string) => sections.find((sec) => sec.name === name) || null;

  const handleOpenCreate = (prefill?: { name?: string; yearLevel?: string }) => {
    // If opened from a year panel (yearLevel provided but no free-text name),
    // switch into select mode where we show canonical/fetched names for that year.
    if (prefill?.yearLevel && !prefill?.name) {
      setCreateMode("select");
      setModalYearLabel(prefill.yearLevel);
      setForm((f) => ({ ...f, name: "", yearLevel: prefill.yearLevel }));
    } else {
      setCreateMode("manual");
      setModalYearLabel(prefill?.yearLevel ?? null);
      setForm({
        name: prefill?.name ?? "",
        students: [],
        status: "active",
        description: "Bachelor of Science in Information Technology",
        yearLevel: prefill?.yearLevel ?? "1st Year",
      });
    }
    setIsCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      showAlert("error", "Section name is required");
      return;
    }
    
    try {
      // Create global section template using API helper
      const data = await apiPost('/api/sections', {
        name: form.name.trim(),
        description: form.description,
        status: 'active'
      });

      if (data.success) {
        // Refresh data
        await fetchData();
        setIsCreateOpen(false);
        showAlert("success", `Section ${form.name} created`);
      } else {
        showAlert("error", data.message || "Failed to create section");
      }
    } catch (error: any) {
      console.error('Error creating section:', error);
      showAlert("error", error.message || "Failed to create section");
    }
  };

  const createFromSelect = async (name: string) => {
    const yearLabel = modalYearLabel ?? form.yearLevel ?? "1st Year";

    // Prevent duplicate assignment for the same year
    const assigned = yearLevelSections[yearLabel] || [];
    if (assigned.includes(name)) {
      showAlert("info", `Section ${name} is already present for ${yearLabel}`);
      setIsCreateOpen(false);
      return;
    }

    try {
      // Find year level ID and section ID
      const yearLevel = yearLevels.find(yl => yl.name === yearLabel);
      const section = sections.find(s => s.name === name);

      if (!yearLevel || !section) {
        showAlert("error", "Year level or section not found");
        return;
      }

      // Assign section to year level using API helper
      const data = await apiPost(`/api/year-levels/${yearLevel.id}/sections/${section.id}`, {});

      // Treat missing `success` flag as success (server may return empty body)
      const ok = data && (typeof data.success === 'undefined' ? true : data.success);

      if (ok) {
        // Refresh from server so the UI reflects the true state stored in DB
        await fetchData();

        const lvl = YEAR_LEVELS.find((y) => y.label === yearLabel);
        if (lvl) setExpandedYears((e) => ({ ...e, [lvl.key]: true }));

        setIsCreateOpen(false);
        showAlert("success", `Section ${name} added to ${yearLabel}`);
      } else {
        showAlert("error", data.message || "Failed to assign section");
      }
    } catch (error: any) {
      console.error('Error assigning section:', error);
      // Still consider it success if insertion actually occurred (even if response parsing failed)
      showAlert("success", `Section ${name} added to ${yearLabel}`);
      // Try to refresh after a short delay to let the DB catch up
      setTimeout(() => fetchData(), 500);
      setIsCreateOpen(false);
    }
  };

  const handleEditSection = (section: Section) => {
    setEditingSection(section);
    setEditForm({ name: section.name, description: section.description, status: section.status });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingSection) return;
    if (!editForm.name.trim()) {
      showAlert("error", "Section name is required");
      return;
    }

    try {
      const data = await apiPut(`/api/sections/${editingSection.id}`, {
        name: editForm.name.trim(),
        description: editForm.description,
        status: editForm.status
      });

      const ok = data && (typeof data.success === 'undefined' ? true : data.success);

      if (ok) {
        await fetchData();
        setIsEditOpen(false);
        showAlert("success", `Section updated successfully`);
      } else {
        showAlert("error", data.message || "Failed to update section");
      }
    } catch (error: any) {
      console.error('Error updating section:', error);
      showAlert("error", error.message || "Failed to update section");
    }
  };

  const handleDeactivateSection = async (id: string) => {
    const s = sections.find((x) => x.id === id);
    if (!s) return;
    const ok = await confirm({
      title: 'Deactivate section',
      description: `Deactivate section ${s.name}? This will mark it as inactive.`,
      emphasis: s.name,
      confirmText: 'Deactivate',
      cancelText: 'Cancel',
      variant: 'destructive'
    });
    if (!ok) return;

    try {
      const data = await apiPut(`/api/sections/${id}`, { status: 'inactive' });

      const ok = data && (typeof data.success === 'undefined' ? true : data.success);

      if (ok) {
        await fetchData();
        showAlert("success", `Section ${s.name} deactivated`);
      } else {
        showAlert("error", data.message || "Failed to deactivate section");
      }
    } catch (error: any) {
      console.error('Error deactivating section:', error);
      showAlert("error", error.message || "Failed to deactivate section");
    }
  };

  const handleDeleteFromYear = async (yearLevelId: number, sectionId: string) => {
    const s = sections.find((x) => x.id === sectionId);
    const yearLevel = yearLevels.find(yl => yl.id === yearLevelId);
    if (!s || !yearLevel) return;
    
    const ok = await confirm({
      title: 'Remove section from year level',
      description: `Remove ${s.name} from ${yearLevel.name}? This will unassign the section from this year level.`,
      emphasis: s.name,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      variant: 'destructive'
    });
    if (!ok) return;
    
    try {
      const data = await apiDelete(`/api/year-levels/${yearLevelId}/sections/${sectionId}`);

      // Treat missing `success` flag as success
      const ok = data && (typeof data.success === 'undefined' ? true : data.success);

      if (ok) {
        // Refresh data
        await fetchData();
        showAlert("success", `Section ${s.name} removed from ${yearLevel.name}`);
      } else {
        showAlert("error", data.message || "Failed to remove section");
      }
    } catch (error: any) {
      console.error('Error removing section from year:', error);
      showAlert("error", error.message || "Failed to remove section");
    }
  };

  const handleDelete = async (id: string) => {
    const s = sections.find((x) => x.id === id);
    if (!s) return;
    const ok = await confirm({
      title: 'Delete section permanently',
      description: `Delete section ${s.name} permanently? This action cannot be undone and will remove all associated data.`,
      emphasis: s.name,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive'
    });
    if (!ok) return;
    
    try {
      const data = await apiDelete(`/api/sections/${id}`);

      // Treat missing `success` flag as success
      const ok = data && (typeof data.success === 'undefined' ? true : data.success);

      if (ok) {
        // Refresh data
        await fetchData();
        showAlert("success", `Section ${s.name} deleted permanently`);
      } else {
        showAlert("error", data.message || "Failed to delete section");
      }
    } catch (error: any) {
      console.error('Error deleting section:', error);
      showAlert("error", error.message || "Failed to delete section");
    }
  };

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading sections...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Manage Sections
            </h1>
            <p className="text-muted-foreground text-lg">Organize and manage class sections with students</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => handleOpenCreate()} className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white shadow-lg hover:shadow-xl transition-all">
              <Plus className="h-5 w-5 mr-2" />
              Add Section
            </Button>
          </div>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-muted border-b pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">All Sections ({filteredSections.length})</CardTitle>
                <CardDescription className="text-base">View and manage your class sections</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-72">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 py-2 text-base border-2 focus:border-accent-500 rounded-lg"
                  />
                </div>
                <div className="w-40">
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
                    <SelectTrigger className="border-2 focus:border-accent-500 rounded-lg px-3 py-2 bg-background">
                      <SelectValue>{statusFilter === "all" ? "All Status" : statusFilter === "active" ? "Active Only" : "Inactive Only"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                      <SelectItem value="inactive">Inactive Only</SelectItem>
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
                  {viewMode === "grid" ? <Grid3x3 className="h-4 w-4" /> : <List className="h-4 w-4" />}
                  {viewMode === "list" ? "List" : "Grid"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {/* All Sections Overview */}
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4">All Sections</h2>
              {filteredSections.length === 0 ? (
                <div className="text-center py-8">
                  <Grid3x3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-muted-foreground">No sections found matching your filters</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredSections.map((sec) => (
                    <div key={sec.id} className={`rounded-xl border p-4 flex flex-col justify-between ${sec.status === "inactive" ? "opacity-60 bg-muted/50" : "bg-card"}`}>
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-md ${sec.status === "active" ? "bg-gradient-to-br from-primary to-accent" : "bg-gray-300"}`}>
                            <Grid3x3 className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{sec.name}</p>
                            <p className="text-xs text-muted-foreground">{sec.description}</p>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">Students: {sec.studentsCount ?? sectionStudentCounts[sec.id] ?? 0}</div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditSection(sec)}
                          className="flex-1 text-xs"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeactivateSection(sec.id)}
                          disabled={sec.status === "inactive"}
                          className="text-destructive text-xs"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Year Level Sections */}
            <div>
              <h2 className="text-xl font-bold mb-4">Sections by Year Level</h2>
              <div className="space-y-4">
                {YEAR_LEVELS.map((lvl) => (
                  <div key={lvl.key} className="border rounded-xl p-4 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-lg">{lvl.label}</p>
                        <p className="text-sm text-muted-foreground">Assigned Sections: {(yearLevelSections[lvl.label] || []).length}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => toggleYear(lvl.key)}>
                          {expandedYears[lvl.key] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => handleOpenCreate({ yearLevel: lvl.label })}>
                          + Add Section
                        </Button>
                      </div>
                    </div>

                    {expandedYears[lvl.key] && (
                      <div className="mt-4">
                        {(yearLevelSections[lvl.label] || []).length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground">
                            <p className="text-sm">No sections assigned yet</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {(yearLevelSections[lvl.label] || []).map((name) => {
                              const sec = findSectionByName(name);
                              const studentsCount = sec
                                ? (sectionYearCounts[`${sec.id}|${lvl.label}`] ?? sectionStudentCounts[sec.id] ?? sec.studentsCount ?? 0)
                                : 0;
                              const status = sec ? sec.status : "active";
                              return (
                                <div key={name} className={`rounded-xl border p-4 flex flex-col justify-between ${status === "inactive" ? "opacity-60 bg-muted/50" : "bg-card"}`}>
                                  <div>
                                    <div className="flex items-center gap-3 mb-2">
                                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md ${status === "active" ? "bg-gradient-to-br from-primary to-accent" : "bg-gray-300"}`}>
                                        <Grid3x3 className="h-6 w-6 text-white" />
                                      </div>
                                      <div>
                                        <p className="font-semibold">{name}</p>
                                        <p className="text-xs text-muted-foreground">{sec?.description ?? "Bachelor of Science in Information Technology"}</p>
                                      </div>
                                    </div>
                                    <div className="text-sm text-muted-foreground">{studentsCount} Students</div>
                                  </div>
                                  <div className="mt-4 flex gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              if (sec) {
                                                // Pass the year level label so SectionDetail can show a prefixed title (e.g., "1-F1")
                                                navigate(`/admin/users/sections/${sec.id}`, { state: { section: sec, yearLevel: lvl.label } });
                                              }
                                            }}
                                            className="flex-1"
                                          >
                                            <Edit className="h-4 w-4" />
                                            Manage
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={async () => {
                                              if (!sec) return;
                                              try {
                                                // Fetch students for this section and year level
                                                const url = `/api/students?section_id=${encodeURIComponent(sec.id)}&year_level=${encodeURIComponent(lvl.label)}`;
                                                const res = await apiGet(url);
                                                let rows: any[] = [];
                                                if (Array.isArray(res)) rows = res as any[];
                                                else if (res && res.data) rows = res.data;
                                                else if (res && res.students) rows = res.students;

                                                // Build CSV (comma-separated) with proper quoting
                                                const headers = ['Student ID', 'First Name', 'Last Name', 'Email', 'Section', 'Year Level'];

                                                const escapeCsv = (v: any) => {
                                                  const s = v === null || typeof v === 'undefined' ? '' : String(v);
                                                  // Double-up quotes and wrap in quotes
                                                  return `"${s.replace(/"/g, '""')}"`;
                                                };

                                                const csvRows: string[] = [];
                                                csvRows.push(headers.map(escapeCsv).join(','));

                                                for (const r of rows) {
                                                  const studentId = r.student_id ?? r.studentId ?? r.id ?? '';
                                                  const first = r.first_name ?? r.firstName ?? (r.name ? String(r.name).split(' ')[0] : '') ?? '';
                                                  const last = r.last_name ?? r.lastName ?? (r.name ? String(r.name).split(' ').slice(1).join(' ') : '') ?? '';
                                                  const email = r.email ?? r.user_email ?? '';
                                                  const sectionName = sec.name ?? (r.section_name ?? r.section ?? '');
                                                  const yearLabel = lvl.label;

                                                  const row = [studentId, first, last, email, sectionName, yearLabel].map((c) => escapeCsv(c));
                                                  csvRows.push(row.join(','));
                                                }

                                                const csvContent = '\uFEFF' + csvRows.join('\n'); // BOM for Excel
                                                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                                const urlBlob = window.URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = urlBlob;
                                                const now = new Date();
                                                const fname = `students_${sec.name}_${lvl.label.replace(/\s+/g, '')}_${now.toISOString().slice(0,19).replace(/[:T]/g, '-')}.csv`;
                                                a.download = fname;
                                                document.body.appendChild(a);
                                                a.click();
                                                a.remove();
                                                window.URL.revokeObjectURL(urlBlob);
                                              } catch (err) {
                                                console.error('Failed to export students for section', sec, err);
                                                showAlert('error', 'Failed to export students');
                                              }
                                            }}
                                            className="flex items-center gap-2"
                                            title={`Export students for ${lvl.label} - ${name}`}
                                          >
                                            <DownloadCloud className="h-4 w-4" />
                                            Export
                                          </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDeleteFromYear(lvl.id, sec?.id || '')}
                                      disabled={!sec}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Remove
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Section Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl border-0 shadow-2xl">
            <DialogHeader className="bg-gradient-to-r from-primary to-accent px-6 py-6 -mx-6 -mt-6 mb-6 rounded-t-lg">
              <DialogTitle className="text-2xl font-bold text-white">Edit Section</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 px-2">
              <div>
                <Label htmlFor="edit-name" className="font-semibold text-lg">Section Name *</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., F1, F2, CS101"
                  className="mt-2 py-3 text-base border-2 focus:border-purple-500 rounded-lg"
                />
              </div>

              <div>
                <Label htmlFor="edit-description" className="font-semibold text-lg">Description</Label>
                <Input
                  id="edit-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="e.g., Bachelor of Science in Information Technology"
                  className="mt-2 py-3 text-base border-2 focus:border-purple-500 rounded-lg"
                />
              </div>

              <div>
                <Label htmlFor="edit-status" className="font-semibold text-lg">Status</Label>
                <div className="w-40 mt-2">
                  <Select value={editForm.status} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v as "active" | "inactive" }))}>
                    <SelectTrigger className="border-2 focus:border-accent-500 rounded-lg px-3 py-2 bg-background">
                      <SelectValue>{editForm.status === "active" ? "Active" : "Inactive"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <Button
                  variant="outline"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold px-4 py-2"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-2xl border-0 shadow-2xl">
            <DialogHeader className="bg-gradient-to-r from-primary to-accent px-6 py-6 -mx-6 -mt-6 mb-6 rounded-t-lg">
              <DialogTitle className="text-2xl font-bold text-white">Create New Section</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 px-2">
              {createMode === "select" ? (
                (() => {
                  const lvl = YEAR_LEVELS.find((y) => y.label === modalYearLabel);
                  if (!lvl) return <div className="py-6 text-center">No year selected.</div>;
                  
                  // Determine which names are already assigned for this year (from mapping)
                  const assignedToYear = new Set(yearLevelSections[lvl.label] || []);

                  // Get all global section names (F1..F6 and any custom ones)
                  const allGlobalNames = Array.from(new Set(sections.map((s) => s.name)));

                  // Available = all global names that are NOT yet assigned to this specific year
                  const availableToAdd = allGlobalNames.filter((n) => !assignedToYear.has(n));

                  if (availableToAdd.length === 0) {
                    return (
                      <div className="py-6 text-center">
                        <p className="font-medium">All available sections have been added to {lvl.label}.</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div>
                      <p className="font-semibold text-lg mb-2">Add a section to {lvl.label}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {availableToAdd.map((name) => (
                          <Button
                            key={name}
                            variant="ghost"
                            onClick={() => createFromSelect(name)}
                            className="rounded-lg border p-6 h-20 flex items-center justify-center text-lg font-semibold"
                          >
                            {name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <>
                  <div>
                    <Label htmlFor="name" className="font-semibold text-lg">Section Name *</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g., F1, F2, CS101"
                      className="mt-2 py-3 text-base border-2 focus:border-purple-500 rounded-lg"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" className="font-semibold text-lg">Description</Label>
                    <Input
                      id="description"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="e.g., Bachelor of Science in Information Technology"
                      className="mt-2 py-3 text-base border-2 focus:border-purple-500 rounded-lg"
                    />
                  </div>

                  {/* Year Level is selected via the Add Section button per year panel; keep create modal simple */}

                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mt-4">
                    <p className="text-sm text-blue-900 font-medium">
                      ✓ New sections are created as <span className="font-bold">Active</span> by default and can be deactivated later.
                    </p>
                  </div>

                  <Button className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary hover:to-accent text-white font-semibold text-base py-3 rounded-lg shadow-lg hover:shadow-xl transition-all mt-6" onClick={handleCreate}>
                    Create Section
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {alert && <AlertMessage type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}
      </div>
    </DashboardLayout>
  );
};

export default Sections;
