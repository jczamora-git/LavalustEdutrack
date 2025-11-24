import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Download, Users, User, Search, Filter, FileDown, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { API_ENDPOINTS, apiGet } from "@/lib/api";
import { AlertMessage } from "@/components/AlertMessage";
import { Badge } from "@/components/ui/badge";

type Student = {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  year_level: string;
  section_id?: string;
  status: string;
};

type AcademicPeriod = {
  id: string;
  name: string;
  term: string;
  year: string;
  is_active: boolean | number;
};

const PDFGeneration = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // State
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [academicPeriods, setAcademicPeriods] = useState<AcademicPeriod[]>([]);
  // Grouped periods by school year -> semester -> periods[]
  const [groupedPeriods, setGroupedPeriods] = useState<Record<string, Record<string, any[]>>>({});
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [yearLevelFilter, setYearLevelFilter] = useState<string>("all");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");

  // Individual report
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  // For display we keep the selected value (comma-separated ids), and for payload we keep array of ids
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<string[]>([]);
  const [templateType, setTemplateType] = useState<string>("standard");

  // Bulk report
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [bulkPeriodId, setBulkPeriodId] = useState<string>("");
  const [bulkPeriodIds, setBulkPeriodIds] = useState<string[]>([]);
  const [bulkTemplate, setBulkTemplate] = useState<string>("standard");
  const [currentPage, setCurrentPage] = useState(1);
  const studentsPerPage = 20;

  const showAlert = (type: "success" | "error" | "info", message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (isAuthenticated && user?.role === "admin") {
      fetchData();
    }
  }, [isAuthenticated, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch students
      const studentsRes = await apiGet(`${API_ENDPOINTS.REPORTS_STUDENTS}?status=${statusFilter}`);
        console.log("REPORTS_STUDENTS response:", studentsRes);
      if (studentsRes && studentsRes.success) {
        // Support different payload shapes: { students: [...] } or { data: [...] }
        const rawStudents = studentsRes.students || studentsRes.data || [];
        // Normalize student objects (string ids, expected name/email fields)
        const normalized = (rawStudents as any[]).map((s) => ({
          id: String(s.id ?? s.student_id ?? ''),
          student_id: s.student_id ?? s.studentId ?? s.studentID ?? '',
          first_name: s.first_name ?? s.firstName ?? s.first ?? '',
          last_name: s.last_name ?? s.lastName ?? s.last ?? '',
          email: s.email ?? s.user_email ?? '',
          year_level: s.year_level ? String(s.year_level) : (s.yearLevel ? String(s.yearLevel) : ''),
          section_id: s.section_id ?? s.sectionId ?? null,
          status: s.status ?? s.user_status ?? 'active',
        }));

        setStudents(normalized);
        setFilteredStudents(normalized);
      } else {
        console.warn("Students API response:", studentsRes);
      }

      // Fetch sections
      const sectionsRes = await apiGet(API_ENDPOINTS.SECTIONS);
      if (sectionsRes && sectionsRes.success && sectionsRes.data) {
        setSections(sectionsRes.data);
      } else {
        console.warn("Sections API response:", sectionsRes);
      }

      // Fetch academic periods
      const periodsRes = await apiGet(API_ENDPOINTS.ACADEMIC_PERIODS);
      if (periodsRes && periodsRes.success && periodsRes.data) {
        // The backend returns periods with fields like { id, school_year, semester, period_type, status }
        // We'll build both a flat mapped array and a grouped structure by school_year -> semester
        const rawPeriods = periodsRes.data as any[];
        const mapped = rawPeriods.map((p) => ({
          id: String(p.id),
          name: `${p.school_year} - ${p.period_type}`,
          term: p.semester,
          year: p.school_year,
          period_type: p.period_type,
          is_active: (p.status === "active")
        }));

        // Build grouped structure: { '2025-2026': { '1st Semester': [periods...], '2nd Semester': [periods...] } }
        const groups: Record<string, Record<string, any[]>> = {};
        for (const p of rawPeriods) {
          const year = String(p.school_year ?? "");
          const semLabel = String(p.semester ?? "");
          if (!groups[year]) groups[year] = {};
          if (!groups[year][semLabel]) groups[year][semLabel] = [];
          groups[year][semLabel].push(p);
        }

        setAcademicPeriods(mapped);
        setGroupedPeriods(groups);
          console.log("Grouped academic periods:", groups);

        // Auto-select the active semester (group) if available: pick the semester that has any active period
        let found = false;
        for (const [year, sems] of Object.entries(groups)) {
          for (const [semLabel, periods] of Object.entries(sems)) {
            const activePeriods = periods.filter((pp: any) => pp.status === "active" || pp.status === 1 || pp.status === "1");
            if (activePeriods.length > 0) {
              const ids = periods.map((x: any) => String(x.id));
              const joined = ids.join(",");
              setSelectedPeriodId(joined);
              setSelectedPeriodIds(ids);
              setBulkPeriodId(joined);
              setBulkPeriodIds(ids.slice());
              found = true;
              break;
            }
          }
          if (found) break;
        }
      } else {
        console.warn("Academic periods API response:", periodsRes);
      }
    } catch (err: any) {
      console.error("Error fetching data:", err);
      showAlert("error", err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let result = students;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.first_name?.toLowerCase().includes(q) ||
          s.last_name?.toLowerCase().includes(q) ||
          s.student_id?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q)
      );
    }

    // Year level filter
    if (yearLevelFilter !== "all") {
      result = result.filter((s) => {
        const year = s.year_level?.toString();
        return year?.startsWith(yearLevelFilter) || year === yearLevelFilter;
      });
    }

    // Section filter
    if (sectionFilter !== "all") {
      result = result.filter((s) => String(s.section_id) === sectionFilter);
    }

    setFilteredStudents(result);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchQuery, yearLevelFilter, sectionFilter, students]);

  const handleGenerateIndividual = async () => {
    if (!selectedStudentId) {
      showAlert("error", "Please select a student");
      return;
    }

    if (!selectedPeriodId) {
      showAlert("error", "Please select an academic period");
      return;
    }

    setGenerating(true);
    try {
      // If multiple period ids selected (midterm + final), include them in the query as academic_period_ids
      const params = new URLSearchParams();
      if (selectedPeriodIds && selectedPeriodIds.length > 1) {
        params.append("academic_period_ids", selectedPeriodIds.join(","));
        // also include the first id as legacy single param for backward compatibility
        params.append("academic_period_id", selectedPeriodIds[0]);
      } else {
        params.append("academic_period_id", selectedPeriodId);
      }
      params.append("template", templateType);

      const url = `${API_ENDPOINTS.REPORTS_STUDENT_PDF(selectedStudentId)}?${params.toString()}`;
      console.debug("Generating individual PDF with payload:", { student_id: selectedStudentId, academic_period_ids: selectedPeriodIds });

      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      // Download PDF
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `Grade_Report_${selectedStudentId}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      showAlert("success", "PDF report generated successfully!");
    } catch (err: any) {
      console.error("Error generating PDF:", err);
      showAlert("error", err.message || "Failed to generate PDF report");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateBulk = async () => {
    if (selectedStudents.size === 0) {
      showAlert("error", "Please select at least one student");
      return;
    }

    if (!bulkPeriodId) {
      showAlert("error", "Please select an academic period");
      return;
    }

    setGenerating(true);
    try {
      // Build body including academic_period_ids (array) and legacy academic_period_id
      const bodyPayload: any = {
        student_ids: Array.from(selectedStudents),
        template: bulkTemplate,
      };
      if (bulkPeriodIds && bulkPeriodIds.length > 1) {
        bodyPayload.academic_period_ids = bulkPeriodIds;
        bodyPayload.academic_period_id = bulkPeriodIds[0];
      } else {
        bodyPayload.academic_period_id = bulkPeriodId;
      }

      console.debug("Generating bulk PDFs with payload:", bodyPayload);

      const response = await fetch(API_ENDPOINTS.REPORTS_BULK_PDF, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(bodyPayload),
      });

      if (!response.ok) {
        throw new Error("Failed to generate bulk PDFs");
      }

      // Download ZIP
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `Grade_Reports_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      showAlert("success", `Generated ${selectedStudents.size} PDF reports successfully!`);
      setSelectedStudents(new Set());
    } catch (err: any) {
      console.error("Error generating bulk PDFs:", err);
      showAlert("error", err.message || "Failed to generate bulk PDF reports");
    } finally {
      setGenerating(false);
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    const newSelection = new Set(selectedStudents);
    if (newSelection.has(studentId)) {
      newSelection.delete(studentId);
    } else {
      newSelection.add(studentId);
    }
    setSelectedStudents(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);
  const startIndex = (currentPage - 1) * studentsPerPage;
  const endIndex = startIndex + studentsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  if (!isAuthenticated) return null;

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            PDF Report Generation
          </h1>
          <p className="text-muted-foreground">Generate student grade reports in PDF format</p>
        </div>

        {alert && <AlertMessage type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

        <Tabs defaultValue="individual" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="individual" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Individual Student
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Bulk Generate
            </TabsTrigger>
          </TabsList>

          <TabsContent value="individual">
            <div className="space-y-6">
              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-muted/50 to-muted border-b">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Generate Individual Report
                  </CardTitle>
                  <CardDescription>Search and select a student, then generate their PDF grade report</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="period-select">Academic Period *</Label>
                      <Select
                        value={selectedPeriodId}
                        onValueChange={(val) => {
                          const ids = val ? String(val).split(",") : [];
                          setSelectedPeriodId(val);
                          setSelectedPeriodIds(ids);
                            console.log("Academic period changed (individual):", { selectedPeriodId: val, academic_period_ids: ids });
                          console.log("Generating individual PDF with payload:", { student_id: selectedStudentId, academic_period_ids: selectedPeriodIds });
                        }}
                      >
                        <SelectTrigger id="period-select" className="mt-2">
                          <SelectValue placeholder="Select academic period" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(groupedPeriods).length === 0 ? (
                            <SelectItem value="none" disabled>No periods available</SelectItem>
                          ) : (
                            (() => {
                              const items: JSX.Element[] = [];
                              Object.entries(groupedPeriods).forEach(([year, sems]) => {
                                items.push(
                                  <SelectItem key={`year-${year}`} value={`year-${year}`} disabled className="font-semibold text-sm">
                                    {year}
                                  </SelectItem>
                                );
                                Object.entries(sems).forEach(([semLabel, periods]: any) => {
                                  const ids = (periods as any[]).map((p: any) => String(p.id));
                                  const joined = ids.join(",");
                                  const types = (periods as any[]).map((p: any) => p.period_type).join(" & ");
                                  const isActive = (periods as any[]).some((p: any) => p.status === "active" || p.status === 1 || p.status === "1");
                                  items.push(
                                    <SelectItem key={`${year}-${semLabel}`} value={joined}>
                                      {semLabel} ({types}) {isActive && <Badge className="ml-2">Active</Badge>}
                                    </SelectItem>
                                  );
                                });
                              });
                              return items;
                            })()
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="template-select">Report Template</Label>
                      <Select value={templateType} onValueChange={setTemplateType}>
                        <SelectTrigger id="template-select" className="mt-2">
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard Report</SelectItem>
                          <SelectItem value="detailed">Detailed Report (with activities)</SelectItem>
                          <SelectItem value="summary">Summary Report (GWA only)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Search and Select Student *</Label>
                    <div className="relative mt-2">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, student ID, or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="border rounded-lg max-h-80 overflow-y-auto">
                    {loading ? (
                      <div className="text-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                        <p className="mt-4 text-muted-foreground">Loading students...</p>
                      </div>
                    ) : filteredStudents.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No students found</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredStudents.map((student) => (
                          <div
                            key={student.id}
                            className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                              selectedStudentId === student.id ? "bg-primary/10 border-l-4 border-primary" : ""
                            }`}
                            onClick={() => setSelectedStudentId(student.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {student.first_name} {student.last_name}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {student.student_id} • {student.email}
                                </p>
                              </div>
                              <Badge variant={student.status === "active" ? "default" : "secondary"}>
                                {student.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedStudentId && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm font-semibold text-blue-900 mb-1">Selected Student</p>
                      <p className="text-blue-800">
                        {filteredStudents.find(s => s.id === selectedStudentId)?.first_name}{" "}
                        {filteredStudents.find(s => s.id === selectedStudentId)?.last_name}
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={handleGenerateIndividual}
                    disabled={!selectedStudentId || !selectedPeriodId || generating}
                    className="w-full bg-gradient-to-r from-primary to-accent hover:shadow-lg"
                    size="lg"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <FileDown className="h-5 w-5 mr-2" />
                        Generate PDF Report
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
                  <CardTitle className="text-base">Report Information</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4 text-sm">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-gray-900">What&apos;s included:</p>
                        <ul className="mt-2 space-y-1 text-gray-600 list-disc list-inside">
                          <li>Student information</li>
                          <li>Course grades (Midterm & Final)</li>
                          <li>GWA calculation</li>
                          <li>Remarks & status</li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-gray-900">Note:</p>
                        <p className="mt-1 text-gray-600">
                          PDFs are generated with the selected academic period&apos;s finalized grades. Make sure grades are
                          submitted before generating reports.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bulk">
            <div className="space-y-6">
              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-muted/50 to-muted border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filter Students
                  </CardTitle>
                  <CardDescription>Apply filters to select students for bulk report generation</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search students..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    <Select value={yearLevelFilter} onValueChange={setYearLevelFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Year Level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Year Levels</SelectItem>
                        <SelectItem value="1">1st Year</SelectItem>
                        <SelectItem value="2">2nd Year</SelectItem>
                        <SelectItem value="3">3rd Year</SelectItem>
                        <SelectItem value="4">4th Year</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={sectionFilter} onValueChange={setSectionFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Section" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sections</SelectItem>
                        {sections.map((section) => (
                          <SelectItem key={section.id} value={String(section.id)}>
                            {section.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="all">All Status</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-muted/50 to-muted border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Select Students</CardTitle>
                      <CardDescription>
                        {selectedStudents.size} of {filteredStudents.length} students selected
                      </CardDescription>
                    </div>
                    <Button variant="outline" onClick={toggleSelectAll} size="sm">
                      {selectedStudents.size === filteredStudents.length ? "Deselect All" : "Select All"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {loading ? (
                    <div className="text-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                      <p className="mt-4 text-muted-foreground">Loading students...</p>
                    </div>
                  ) : filteredStudents.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No students found matching the filters</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2 mb-4">
                        {paginatedStudents.map((student) => (
                          <div
                            key={student.id}
                            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => toggleStudentSelection(student.id)}
                          >
                            <Checkbox
                              checked={selectedStudents.has(student.id)}
                              onCheckedChange={() => toggleStudentSelection(student.id)}
                            />
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">
                                {student.first_name} {student.last_name}
                              </p>
                              <p className="text-sm text-gray-600">
                                {student.student_id} • Year {student.year_level} • {student.email}
                              </p>
                            </div>
                            <Badge variant={student.status === "active" ? "default" : "secondary"}>
                              {student.status}
                            </Badge>
                          </div>
                        ))}
                      </div>

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4 border-t">
                          <div className="text-sm text-muted-foreground">
                            Showing {startIndex + 1}-{Math.min(endIndex, filteredStudents.length)} of {filteredStudents.length} students
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                            >
                              Previous
                            </Button>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                  pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                  pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                  pageNum = totalPages - 4 + i;
                                } else {
                                  pageNum = currentPage - 2 + i;
                                }
                                return (
                                  <Button
                                    key={pageNum}
                                    variant={currentPage === pageNum ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setCurrentPage(pageNum)}
                                    className="w-10"
                                  >
                                    {pageNum}
                                  </Button>
                                );
                              })}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                              disabled={currentPage === totalPages}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-muted/50 to-muted border-b">
                  <CardTitle>Generation Settings</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bulk-period">Academic Period *</Label>
                      <Select
                        value={bulkPeriodId}
                          onValueChange={(val) => {
                          const ids = val ? String(val).split(",") : [];
                          setBulkPeriodId(val);
                          setBulkPeriodIds(ids);
                          // Log selection and preview payload (do not reference runtime-only bodyPayload)
                          const previewPayload = {
                            student_ids: Array.from(selectedStudents),
                            template: bulkTemplate,
                            academic_period_ids: ids.length > 0 ? ids : undefined,
                            academic_period_id: ids.length > 0 ? ids[0] : val
                          };
                          console.log("Academic period changed (bulk):", { bulkPeriodId: val, academic_period_ids: ids });
                          console.log("Generating bulk PDFs preview payload:", previewPayload);
                        }}
                      >
                        <SelectTrigger id="bulk-period" className="mt-2">
                          <SelectValue placeholder="Select academic period" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(groupedPeriods).length === 0 ? (
                            <SelectItem value="none" disabled>No periods available</SelectItem>
                          ) : (
                            (() => {
                              const items: JSX.Element[] = [];
                              Object.entries(groupedPeriods).forEach(([year, sems]) => {
                                items.push(
                                  <SelectItem key={`year-${year}`} value={`year-${year}`} disabled className="font-semibold text-sm">
                                    {year}
                                  </SelectItem>
                                );
                                Object.entries(sems).forEach(([semLabel, periods]: any) => {
                                  const ids = (periods as any[]).map((p: any) => String(p.id));
                                  const joined = ids.join(",");
                                  const types = (periods as any[]).map((p: any) => p.period_type).join(" & ");
                                  const isActive = (periods as any[]).some((p: any) => p.status === "active" || p.status === 1 || p.status === "1");
                                  items.push(
                                    <SelectItem key={`${year}-${semLabel}`} value={joined}>
                                      {semLabel} ({types}) {isActive && <Badge className="ml-2">Active</Badge>}
                                    </SelectItem>
                                  );
                                });
                              });
                              return items;
                            })()
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="bulk-template">Report Template</Label>
                      <Select value={bulkTemplate} onValueChange={setBulkTemplate}>
                        <SelectTrigger id="bulk-template" className="mt-2">
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard Report</SelectItem>
                          <SelectItem value="detailed">Detailed Report</SelectItem>
                          <SelectItem value="summary">Summary Report</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm font-semibold text-blue-900 mb-2">Generation Summary</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-blue-700">Selected Students:</span>
                        <p className="font-bold text-blue-900 text-2xl">{selectedStudents.size}</p>
                      </div>
                      <div>
                        <span className="text-blue-700">Output Format:</span>
                        <p className="font-bold text-blue-900 text-lg">ZIP Archive</p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleGenerateBulk}
                    disabled={selectedStudents.size === 0 || !bulkPeriodId || generating}
                    className="w-full bg-gradient-to-r from-primary to-accent hover:shadow-lg"
                    size="lg"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Generating {selectedStudents.size} PDFs...
                      </>
                    ) : (
                      <>
                        <FileDown className="h-5 w-5 mr-2" />
                        Generate {selectedStudents.size} PDF Reports
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default PDFGeneration;
