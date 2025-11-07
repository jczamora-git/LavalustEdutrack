import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Trash2, Grid3x3, Users, ArrowLeft, X, LayoutGrid, List, ArrowUpDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertMessage } from "@/components/AlertMessage";

type Section = {
  id: string;
  name: string;
  students: string[];
  status: "active" | "inactive";
  description: string;
};

type Student = {
  id: string;
  name: string;
};

// Mock student database
const mockStudents: Student[] = [
  { id: "STU001", name: "John Doe" },
  { id: "STU002", name: "Jane Smith" },
  { id: "STU003", name: "Carlos Rodriguez" },
  { id: "STU004", name: "Maria Garcia" },
  { id: "STU005", name: "Ahmed Hassan" },
  { id: "STU006", name: "Emily Johnson" },
  { id: "STU007", name: "David Lee" },
  { id: "STU008", name: "Lisa Wong" },
  { id: "STU009", name: "Marcus Johnson" },
  { id: "STU010", name: "Sarah Williams" },
  { id: "STU011", name: "Alex Chen" },
  { id: "STU012", name: "James Miller" },
  { id: "STU013", name: "Patricia Brown" },
  { id: "STU014", name: "Robert Davis" },
  { id: "STU015", name: "Michael Wilson" },
  { id: "STU016", name: "Jennifer Taylor" },
  { id: "STU017", name: "Christopher Anderson" },
  { id: "STU018", name: "Barbara Thomas" },
  { id: "STU019", name: "Daniel Jackson" },
  { id: "STU020", name: "Mary White" },
];

const SectionDetail = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStudentInput, setNewStudentInput] = useState("");
  const [suggestions, setSuggestions] = useState<Student[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Get section from state or use mock data
  const sectionFromState = location.state?.section;
  const [section, setSection] = useState<Section | null>(
    sectionFromState || {
      id: "1",
      name: "F1",
      students: ["John Doe", "Jane Smith", "Carlos Rodriguez", "Maria Garcia", "Ahmed Hassan"],
      status: "active",
      description: "Bachelor of Science in Information Technology",
    }
  );

  const [alert, setAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const showAlert = (type: "success" | "error" | "info", message: string) => {
    setAlert({ type, message });
  };

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate]);

  // Handle suggestion filtering
  const handleInputChange = (value: string) => {
    setNewStudentInput(value);
    if (value.trim() === "") {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const query = value.trim().toLowerCase();
    const filtered = mockStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.id.toLowerCase().includes(query)
    );
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (student: Student) => {
    setNewStudentInput(student.name);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  if (!section) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <div className="text-center py-16">
            <p className="text-lg text-muted-foreground">Section not found</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const filteredStudents = section.students.filter((s) =>
    searchQuery.trim() === "" || s.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  // Apply sorting to the filtered students
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (sortOrder === "asc") return a.localeCompare(b);
    return b.localeCompare(a);
  });

  const handleAddStudent = () => {
    if (!newStudentInput.trim()) {
      showAlert("error", "Student name is required");
      return;
    }
    if (section.students.includes(newStudentInput.trim())) {
      showAlert("error", "Student already exists in this section");
      return;
    }
    const newSection = { ...section, students: [...section.students, newStudentInput.trim()] };
    setSection(newSection);
    // notify list page about the student addition
    window.dispatchEvent(new CustomEvent("section-updated", { detail: newSection }));
    setNewStudentInput("");
    setSuggestions([]);
    setShowSuggestions(false);
    setIsAddStudentOpen(false);
    showAlert("success", `${newStudentInput} added to section`);
  };

  const handleRemoveStudent = (studentName: string) => {
    if (!confirm(`Remove ${studentName} from section?`)) return;
    const newSection = { ...section, students: section.students.filter((s) => s !== studentName) };
    setSection(newSection);
    window.dispatchEvent(new CustomEvent("section-updated", { detail: newSection }));
    showAlert("info", `${studentName} removed from section`);
  };

  const handleToggleStatus = () => {
    if (!section) return;
    if (section.status === "active") {
      const ok = confirm(
        `Are you sure you want to set ${section.name} to INACTIVE? This will remove all students from the section.`
      );
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
      const ok = confirm(`Activate ${section.name}?`);
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
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{section.name}</h1>
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
                <CardDescription className="text-base">Add or remove students from section {section.name}</CardDescription>
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
                  onClick={() => setIsAddStudentOpen(true)}
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
                  {sortedStudents.map((student, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-card to-muted/20 border-2 border-border/30 rounded-xl hover:border-accent-300 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-base shadow-md">
                          {student.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-base">{student}</p>
                          <p className="text-sm text-muted-foreground">Student in section</p>
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
                  {sortedStudents.map((student, idx) => {
                    const studentObj = mockStudents.find((m) => m.name === student);
                    return (
                      <div key={idx} className="p-4 border rounded-xl bg-card shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold">
                              {student.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold">{student}</p>
                              <p className="text-xs text-muted-foreground">{studentObj ? studentObj.id : "—"}</p>
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

        {/* Add Student Dialog */}
        <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
          <DialogContent className="max-w-md border-0 shadow-2xl">
            <DialogHeader className="bg-gradient-to-r from-primary to-accent px-6 py-6 -mx-6 -mt-6 mb-6 rounded-t-lg">
              <DialogTitle className="text-2xl font-bold text-white">Add Student to {section.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 px-2">
              <div>
                <Label htmlFor="student-name" className="font-semibold text-lg">Student Name / ID *</Label>
                <div className="relative mt-2">
                  <Input
                    id="student-name"
                    value={newStudentInput}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={() => {
                      if (newStudentInput.trim() && suggestions.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    placeholder="Type name (e.g., John) or ID (e.g., STU001)"
                    className="py-3 text-base border-2 focus:border-accent-500 rounded-lg"
                    autoFocus
                  />
                  {/* Suggestions Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div
                      ref={suggestionsRef}
                      className="absolute top-full left-0 right-0 mt-2 bg-background border-2 border-primary/30 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto"
                    >
                      <div className="p-2">
                        {suggestions.map((student) => (
                          <div
                            key={student.id}
                            onMouseDown={() => handleSelectSuggestion(student)}
                              className="px-4 py-3 hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/10 cursor-pointer rounded-lg flex justify-between items-center transition-all group mb-1"
                          >
                            <div className="flex-1">
                                <p className="font-semibold text-sm group-hover:text-primary transition-colors">{student.name}</p>
                              <p className="text-xs text-muted-foreground">{student.id}</p>
                            </div>
                              <span className="text-xs font-bold px-3 py-1 bg-gradient-to-r from-primary/20 to-accent/20 text-primary rounded-full">
                              {student.id}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2">🔍 Type to search by name or student ID</p>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  className="flex-1 bg-gradient-to-r from-primary to-accent hover:from-primary hover:to-accent text-white font-semibold text-base py-3 rounded-lg shadow-lg hover:shadow-xl transition-all"
                  onClick={handleAddStudent}
                >
                  Add Student
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-2 font-semibold py-3 rounded-lg transition-all hover:bg-muted/50"
                  onClick={() => {
                    setIsAddStudentOpen(false);
                    setNewStudentInput("");
                    setSuggestions([]);
                    setShowSuggestions(false);
                  }}
                >
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

export default SectionDetail;
