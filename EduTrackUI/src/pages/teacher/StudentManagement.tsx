import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Search, UserMinus, ArrowUpDown, List, LayoutGrid, Mail, User } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const StudentManagement = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "teacher") {
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate]);

  const [students, setStudents] = useState([
    { name: "Sarah Davis", email: "sarah@edu.com", course: "Mathematics 101", grade: "A", attendance: "95%" },
    { name: "Emily Brown", email: "emily@edu.com", course: "Mathematics 101", grade: "B+", attendance: "92%" },
    { name: "Mike Johnson", email: "mike@edu.com", course: "Advanced Math", grade: "A-", attendance: "88%" },
  ]);

  // --- new state for subject-based sorting/filtering ---
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [sortKey, setSortKey] = useState<"name" | "course" | "grade" | "attendance">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const subjects = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.course))).sort();
  }, [students]);

  const gradeRank: Record<string, number> = {
    "A+": 12, "A": 11, "A-": 10,
    "B+": 9, "B": 8, "B-": 7,
    "C+": 6, "C": 5, "C-": 4,
    "D": 3, "F": 0
  };

  const displayedStudents = useMemo(() => {
    let arr = students.slice();

    // Filter by subject
    if (selectedSubject) {
      arr = arr.filter((s) => s.course === selectedSubject);
    }

    // Filter by search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      arr = arr.filter((s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
    }

    const compare = (a: typeof students[0], b: typeof students[0]) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name);
        case "course":
          return a.course.localeCompare(b.course);
        case "grade":
          return (gradeRank[b.grade] ?? 0) - (gradeRank[a.grade] ?? 0); // higher grade first by default
        case "attendance": {
          const an = parseInt(a.attendance.replace("%", ""), 10) || 0;
          const bn = parseInt(b.attendance.replace("%", ""), 10) || 0;
          return an - bn;
        }
        default:
          return 0;
      }
    };

    arr.sort((a, b) => (sortOrder === "asc" ? compare(a, b) : -compare(a, b)));
    return arr;
  }, [students, selectedSubject, sortKey, sortOrder, searchQuery]);

  // Add-student dialog state
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<{ id: string; name: string; email: string } | null>(null);

  // (View now opens full page StudentDetail via router — modal removed)

  if (!isAuthenticated) return null;

  // mock fetch for student suggestions (replace with real API call)
  const fetchStudentSuggestions = async (q: string) => {
    if (!q) return [];
    // simulate server-side search
    const pool = [
      { id: "S1001", name: "Sarah Davis", email: "sarah@edu.com" },
      { id: "S1002", name: "Samuel Green", email: "samuel@edu.com" },
      { id: "S1003", name: "Emily Brown", email: "emily@edu.com" },
      { id: "S1004", name: "Michael Chen", email: "michael@edu.com" },
      { id: "S1005", name: "Mike Johnson", email: "mike@edu.com" },
    ];
    const ql = q.toLowerCase();
    return pool.filter((p) => p.name.toLowerCase().includes(ql) || p.id.toLowerCase().includes(ql) || p.email.toLowerCase().includes(ql));
  };

  // debounce query
  useEffect(() => {
    let mounted = true;
    const t = setTimeout(() => {
      (async () => {
        const res = await fetchStudentSuggestions(query);
        if (mounted) setSuggestions(res);
      })();
    }, 250);
    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, [query]);

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Manage Students</h1>
          <p className="text-muted-foreground">Add or remove students from your classes</p>
        </div>

        <Card>
          <CardContent className="p-0">
            {/* Sticky Navigation Controls */}
            <div className="sticky top-0 z-10 border-b border-border bg-card p-4 space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filters and Controls */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Subject Filter */}
                <Select value={selectedSubject || "__all__"} onValueChange={(v) => setSelectedSubject(v === "__all__" ? "" : v)}>
                  <SelectTrigger className="w-40 h-9">
                    <SelectValue>{selectedSubject ? selectedSubject : "All Subjects"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Subjects</SelectItem>
                    {subjects.map((sub) => (
                      <SelectItem key={sub} value={sub}>
                        {sub}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Sort Key */}
                <Select value={sortKey} onValueChange={(v) => setSortKey(v as "name" | "course" | "grade" | "attendance")}>
                  <SelectTrigger className="w-40 h-9">
                    <SelectValue>
                      {sortKey === "name" ? "Name" : sortKey === "course" ? "Course" : sortKey === "grade" ? "Grade" : "Attendance"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="course">Course</SelectItem>
                    <SelectItem value="grade">Grade</SelectItem>
                    <SelectItem value="attendance">Attendance</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort Order Toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder((s) => (s === "asc" ? "desc" : "asc"))}
                  className="h-9 text-xs"
                >
                  <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
                  {sortOrder === "asc" ? "Asc" : "Desc"}
                </Button>

                {/* View Mode Toggle */}
                <Button
                  aria-pressed={viewMode === "grid"}
                  title="Toggle list / grid"
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode((v) => (v === "list" ? "grid" : "list"))}
                  className="ml-auto text-xs flex items-center gap-1 h-9"
                >
                  {viewMode === "list" ? (
                    <LayoutGrid className="h-4 w-4" />
                  ) : (
                    <List className="h-4 w-4" />
                  )}
                </Button>

                {/* Add Student Button */}
                <Button size="sm" onClick={() => setOpen(true)} className="text-xs">
                  <UserPlus className="h-4 w-4 mr-1" />
                  Add Student
                </Button>
              </div>

              {/* Results count */}
              {displayedStudents.length > 0 && (
                <p className="text-xs text-muted-foreground">{displayedStudents.length} student(s) found</p>
              )}
            </div>

            {/* Students Content */}
            <div className="p-4">
              {viewMode === "list" ? (
                <div className="space-y-3">
                  {displayedStudents.map((student, index) => (
                    <div
                      key={index}
                      className="p-4 border border-border rounded-lg hover:bg-muted/50 hover:shadow-sm transition-all duration-200 group"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-base">{student.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{student.email}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{student.course}</p>
                          </div>
                        </div>
                          <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-semibold">Grade: {student.grade}</p>
                            <p className="text-xs text-muted-foreground">Attendance: {student.attendance}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => navigate('/teacher/student-detail', { state: { student } })}>
                            View
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive h-9 w-9">
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayedStudents.map((student, index) => (
                    <div key={index} className="p-5 border border-border rounded-lg hover:shadow-md transition-shadow duration-200 hover:border-primary/50 group cursor-pointer">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-base">{student.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{student.course}</p>
                        </div>
                      </div>
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">{student.email}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">Grade: {student.grade}</span>
                          <span className="text-xs text-muted-foreground">{student.attendance}</span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="w-full" onClick={() => navigate('/teacher/student-detail', { state: { student } })}>View</Button>
                    </div>
                  ))}
                </div>
              )}

              {displayedStudents.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No students found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

        {/* Add Student Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Student</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm mb-1 block">Search by name or ID</label>
                <div className="relative">
                  <Input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setSelectedSuggestion(null);
                    }}
                    placeholder="Type student name or ID"
                  />
                  {suggestions.length > 0 && (
                    <ul className="absolute z-30 left-0 right-0 bg-card border border-border mt-1 rounded-md max-h-40 overflow-auto">
                      {suggestions.map((s) => (
                        <li
                          key={s.id}
                          onClick={() => {
                            setSelectedSuggestion(s);
                            setQuery(s.name + " (" + s.id + ")");
                            setSuggestions([]);
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
              <div>
                <label className="text-sm mb-1 block">Assign to subject</label>
                <select id="assign-subject" className="w-full border border-border rounded-md p-2">
                  <option value="">Select subject</option>
                  {subjects.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => {
                  const toAdd = selectedSuggestion ? { name: selectedSuggestion.name, email: selectedSuggestion.email, course: subjects[0] ?? "", grade: "", attendance: "0%" } : { name: query, email: "", course: subjects[0] ?? "", grade: "", attendance: "0%" };
                  setStudents((prev) => [toAdd, ...prev]);
                  setOpen(false);
                  setQuery("");
                  setSelectedSuggestion(null);
                }}>Add Student</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      
        {/* Student detail is now a full page at /teacher/student-detail */}
      </DashboardLayout>
    );
};

export default StudentManagement;
