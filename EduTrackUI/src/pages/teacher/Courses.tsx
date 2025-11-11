import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, BookOpen, Search, Grid3x3, List, Loader2, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { API_ENDPOINTS, apiGet } from "@/lib/api";

type Course = {
  id: number | string;
  title: string;
  code: string;
  section?: string;
  students?: number;
  status?: string;
  yearLevel?: string;
  sections?: Array<{ id?: number | string; name: string; students?: number }>;
};

const Courses = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [sortOption, setSortOption] = useState<string>("code_asc");
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [manageCourse, setManageCourse] = useState<Course | null>(null);

  const renderText = (v: any) => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string' || typeof v === 'number') return String(v);
    if (typeof v === 'function') return v.name || '[function]';
    try {
      return typeof v === 'object' ? (v.toString && v.toString() !== '[object Object]' ? v.toString() : JSON.stringify(v)) : String(v);
    } catch (e) {
      return String(v);
    }
  };

  // Filter courses based on search
  const filteredCourses = courses.filter((course) =>
    renderText(course.title).toLowerCase().includes(searchQuery.toLowerCase()) ||
    renderText(course.code).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort courses
  const sortedCourses = [...filteredCourses].sort((a, b) => {
    switch (sortOption) {
      case "code_asc":
        return String(a.code).localeCompare(String(b.code));
      case "code_desc":
        return String(b.code).localeCompare(String(a.code));
      case "title_asc":
        return String(a.title).localeCompare(String(b.title));
      case "title_desc":
        return String(b.title).localeCompare(String(a.title));
      case "students_asc":
        return (a.students || 0) - (b.students || 0);
      case "students_desc":
        return (b.students || 0) - (a.students || 0);
      default:
        return 0;
    }
  });

  // Helper: attach student counts per section (by year level)
  const fetchStudentCountsForCourses = async (coursesToUpdate: Course[]) => {
    // For each course, for each section that has an id, fetch students count by year level + section_id
    const updated = await Promise.all(coursesToUpdate.map(async (c) => {
      if (!c.sections || c.sections.length === 0) return c;
      const secs = await Promise.all(c.sections.map(async (s) => {
        // if section already has students count, skip
        if (typeof s.students === 'number') return s;
        // If we don't have section id, try to skip (no reliable way to query)
        if (!s.id) return s;
        try {
          const q = [] as string[];
          if (c.yearLevel) q.push(`year_level=${encodeURIComponent(c.yearLevel)}`);
          q.push(`section_id=${encodeURIComponent(String(s.id))}`);
          const url = `${API_ENDPOINTS.STUDENTS}?${q.join('&')}`;
          const res = await apiGet(url);
          const count = (res && (typeof res.count === 'number' ? res.count : (Array.isArray(res.data) ? res.data.length : 0))) || 0;
          return { ...s, students: count };
        } catch (e) {
          return { ...s, students: undefined };
        }
      }));
      return { ...c, sections: secs };
    }));

    setCourses(updated);
  };

  const fetchTeacherCourses = async () => {
    if (!user) return;
    setLoading(true);
    const tries = [
      `${API_ENDPOINTS.TEACHER_ASSIGNMENTS}/my`,
      `${API_ENDPOINTS.TEACHERS}/by-user/${encodeURIComponent(user.id)}`,
      `${API_ENDPOINTS.TEACHERS}/${encodeURIComponent(user.id)}`,
      API_ENDPOINTS.TEACHER_ASSIGNMENTS_BY_TEACHER(user.id),
      `${API_ENDPOINTS.TEACHER_ASSIGNMENTS}?user_id=${encodeURIComponent(user.id)}`,
      `${API_ENDPOINTS.TEACHER_ASSIGNMENTS}?teacher_user_id=${encodeURIComponent(user.id)}`,
    ];

    for (const url of tries) {
      try {
        const res = await apiGet(url);
        // debug: log response shape to help identify incorrect callback rendering
        console.debug('fetchTeacherCourses response', url, res);
        if (!res) continue;

        if (res.teacher && Array.isArray(res.teacher.assigned_courses)) {
          const mapped: Course[] = res.teacher.assigned_courses.map((c: any, idx: number) => ({
            id: c.id ?? c.subject_id ?? idx,
            title: c.course_name || c.course || c.title || '',
            code: c.course_code || c.code || '',
            yearLevel: c.year_level ?? c.yearLevel ?? (c.subject && c.subject.year_level) ?? undefined,
            sections: Array.isArray(c.sections) ? c.sections.map((s: any) => (typeof s === 'object' ? { id: s.id || s.section_id, name: s.name, students: typeof s.students_count === 'number' ? s.students_count : undefined } : { name: String(s) })) : [],
            status: c.status ?? undefined,
          }));
          setCourses(mapped);
          // fetch counts per section
          fetchStudentCountsForCourses(mapped).catch(() => {});
          setLoading(false);
          return;
        }

        if (Array.isArray(res.assigned_courses)) {
          const mapped: Course[] = res.assigned_courses.map((c: any, idx: number) => ({
            id: c.id ?? c.subject_id ?? idx,
            title: c.course_name || c.course || c.title || '',
            code: c.course_code || c.code || '',
            yearLevel: c.year_level ?? c.yearLevel ?? (c.subject && c.subject.year_level) ?? undefined,
            sections: Array.isArray(c.sections) ? c.sections.map((s: any) => (typeof s === 'object' ? { id: s.id || s.section_id, name: s.name, students: typeof s.students_count === 'number' ? s.students_count : undefined } : { name: String(s) })) : [],
            status: c.status ?? undefined,
          }));
          setCourses(mapped);
          fetchStudentCountsForCourses(mapped).catch(() => {});
          setLoading(false);
          return;
        }

        if (Array.isArray(res.assignments)) {
          const mapped: Course[] = res.assignments.map((a: any, idx: number) => {
            const subj = a.subject || a;
            const sections = Array.isArray(a.sections) && a.sections.length > 0 ? a.sections : (Array.isArray(subj.sections) ? subj.sections : []);
            return {
              id: subj.id ?? idx,
              title: subj.course_name || subj.title || subj.course || '',
              code: subj.course_code || subj.code || '',
              yearLevel: subj.year_level ?? subj.yearLevel ?? undefined,
              sections: sections.map((s: any) => (typeof s === 'object' ? { id: s.id || s.section_id, name: s.name, students: typeof s.students_count === 'number' ? s.students_count : undefined } : { name: String(s) })),
              status: subj.status ?? undefined,
            };
          });
          setCourses(mapped);
          fetchStudentCountsForCourses(mapped).catch(() => {});
          setLoading(false);
          return;
        }

        if (Array.isArray(res)) {
          const mapped = res.map((c: any, idx: number) => ({ id: c.id ?? idx, title: c.course_name || c.title || c.course || '', code: c.course_code || c.code || '', section: (c.sections && c.sections[0]) || undefined, students: c.students_count ?? undefined, status: c.status ?? undefined }));
          setCourses(mapped);
          setLoading(false);
          return;
        }
      } catch (err) {
        // ignore and try next
        console.debug('fetchTeacherCourses attempt failed', err);
      }
    }

    // fallback sample
    setCourses([
      { id: 1, title: "Introduction to Computer Science", code: "CS101", section: "Section A", students: 35, status: "approved" },
      { id: 2, title: "Data Structures", code: "CS201", section: "Section B", students: 28, status: "approved" },
      { id: 3, title: "Web Development", code: "CS301", section: "Section A", students: 30, status: "pending" },
    ]);
    setLoading(false);
  };

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "teacher") {
      navigate("/auth");
      return;
    }
    // fetch teacher courses when page mounts for teacher
    if (isAuthenticated && user?.role === 'teacher') {
      fetchTeacherCourses();
    }
  }, [isAuthenticated, user, navigate]);

  if (!isAuthenticated) return null;

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header Section */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              My Teaching Courses
            </h1>
            <p className="text-muted-foreground text-lg">
              {user?.name} • Manage your assigned courses and students
            </p>
          </div>
          <Button className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white shadow-lg hover:shadow-xl transition-all">
            <Plus className="h-5 w-5 mr-2" />
            Request New Course
          </Button>
        </div>

        {/* Main Card */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-muted border-b pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      All Courses ({courses.length})
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </span>
                  ) : (
                    `All Courses (${sortedCourses.length})`
                  )}
                </CardTitle>
                <CardDescription className="text-base">
                  Courses assigned to you for this academic year
                </CardDescription>
              </div>
            </div>

            {/* Filters and Controls */}
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search courses by name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 py-2.5 text-base border-2 focus:border-accent-500 rounded-xl bg-background shadow-sm"
                />
              </div>

              <div className="w-48">
                <Select value={sortOption} onValueChange={setSortOption}>
                  <SelectTrigger className="border-2 rounded-xl px-4 py-2.5 bg-background font-medium shadow-sm">
                    {sortOption === "code_asc" && "Code A → Z"}
                    {sortOption === "code_desc" && "Code Z → A"}
                    {sortOption === "title_asc" && "Title A → Z"}
                    {sortOption === "title_desc" && "Title Z → A"}
                    {sortOption === "students_asc" && "Students ↑"}
                    {sortOption === "students_desc" && "Students ↓"}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="code_asc">Code A → Z</SelectItem>
                    <SelectItem value="code_desc">Code Z → A</SelectItem>
                    <SelectItem value="title_asc">Title A → Z</SelectItem>
                    <SelectItem value="title_desc">Title Z → A</SelectItem>
                    <SelectItem value="students_asc">Students ↑</SelectItem>
                    <SelectItem value="students_desc">Students ↓</SelectItem>
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
                {viewMode === "grid" ? <Grid3x3 className="h-5 w-5" /> : <List className="h-5 w-5" />}
                <span>{viewMode === "grid" ? "Grid" : "List"}</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <span className="ml-4 text-lg text-muted-foreground">Loading your courses...</span>
              </div>
            ) : sortedCourses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <BookOpen className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Courses Yet</h3>
                <p className="text-muted-foreground max-w-md">
                  {searchQuery
                    ? "No courses match your search. Try adjusting your filters."
                    : "You have no assigned courses yet. Please contact your administrator."}
                </p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedCourses.map((course) => (
                  <div
                    key={course.id}
                    className="rounded-2xl border-2 transition-all duration-300 flex flex-col overflow-hidden bg-white border-gray-200 hover:shadow-lg"
                  >
                    {/* Card Header - Course Title & Code */}
                    <div className="p-5 flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0 bg-gradient-to-br from-primary to-accent">
                        <BookOpen className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-base">{renderText(course.code)}</p>
                        <p className="text-sm text-muted-foreground text-wrap">{renderText(course.title)}</p>
                        {course.yearLevel && <p className="text-xs text-muted-foreground mt-1">Year Level: {renderText(course.yearLevel)}</p>}
                      </div>
                    </div>

                    {/* Sections with Student Counts */}
                    <div className="px-5 py-4 bg-blue-50 border-t border-gray-200">
                      <p className="text-xs font-semibold text-muted-foreground mb-3">Sections</p>
                      <div className="flex flex-col gap-3">
                        {course.sections && course.sections.length > 0 ? (
                          course.sections.map((s) => (
                            <div key={s.id ?? s.name} className="flex items-baseline justify-between">
                              <span className="font-semibold text-sm">{renderText(s.name)}</span>
                              <span className="text-xs text-muted-foreground">{typeof s.students === 'number' ? `${s.students} students` : '\u2014'}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm font-medium">{renderText(course.section || "—")}</p>
                        )}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="px-5 py-4 border-t border-gray-200 mt-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setManageCourse(course);
                          setManageModalOpen(true);
                        }}
                        className="w-full gap-2 font-medium"
                      >
                        <BookOpen className="h-4 w-4" />
                        Manage Course
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {sortedCourses.map((course) => (
                  <div
                    key={course.id}
                    className="rounded-2xl border-2 transition-all duration-300 flex items-center justify-between p-4 bg-card border-accent-100 hover:border-accent-300 hover:shadow-md"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 bg-gradient-to-br from-primary to-accent">
                        <BookOpen className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-lg">{renderText(course.title)}</p>
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {renderText(course.code)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {course.sections && course.sections.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {course.sections.map((s) => (
                                <div key={s.id ?? s.name} className="flex items-center justify-between">
                                  <span className="font-medium">{renderText(s.name)}</span>
                                  <span className="text-sm text-muted-foreground">{typeof s.students === 'number' ? `${s.students} students` : '\u2014'}</span>
                                </div>
                              ))}
                              {course.yearLevel && <div className="text-xs text-muted-foreground mt-1">Year {renderText(course.yearLevel)}</div>}
                            </div>
                          ) : (
                            <>
                              {course.section && `${renderText(course.section)} • `}
                              {renderText(course.students || 0)} Students
                              {course.yearLevel && ` • Year ${renderText(course.yearLevel)}`}
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {course.status && (
                        <Badge
                          variant={renderText(course.status) === "approved" ? "default" : "secondary"}
                          className={`text-xs ${renderText(course.status) === "approved" ? "bg-gradient-to-r from-primary to-accent text-white" : ""}`}
                        >
                          {renderText(course.status)}
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setManageCourse(course);
                          setManageModalOpen(true);
                        }}
                        className="gap-1 font-medium hover:bg-accent-50 hover:border-accent-300 transition-all"
                      >
                        <BookOpen className="h-4 w-4" />
                        Manage
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        {/* Manage Course Modal */}
        <Dialog open={manageModalOpen} onOpenChange={setManageModalOpen}>
          <DialogContent className="max-w-2xl border-0 shadow-2xl rounded-2xl overflow-hidden p-0">
            {/* Gradient header */}
            <div className="px-8 py-7 bg-gradient-to-r from-blue-600 to-cyan-500 text-white">
              <div>
                <h3 className="text-2xl font-bold">{manageCourse ? `Manage: ${renderText(manageCourse.title)}` : 'Manage Course'}</h3>
                <p className="text-sm font-medium opacity-95 mt-2">Select a section to manage for this course.</p>
              </div>
            </div>

            {/* Body with side padding */}
            <div className="px-8 py-6 bg-white space-y-6">
              {manageCourse ? (
                <div>
                  {manageCourse.sections && manageCourse.sections.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      {manageCourse.sections.map((s) => (
                        <div key={s.id ?? s.name} className="flex flex-col items-center justify-between p-6 border border-gray-200 rounded-2xl bg-white hover:shadow-md transition-all hover:border-blue-200">
                          <div className="text-center mb-4 w-full">
                            <div className="font-bold text-lg text-gray-900">{renderText(s.name)}</div>
                            <div className="text-sm text-gray-600 mt-1">{typeof s.students === 'number' ? `${s.students} students` : 'No students'}</div>
                          </div>
                          <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:shadow-lg hover:from-blue-700 hover:to-cyan-600 transition-all shadow-md rounded-full px-6 py-2.5 text-sm" onClick={() => {
                            setManageModalOpen(false);
                            if (s.id) navigate(`/teacher/courses/${manageCourse.id}?section_id=${s.id}`);
                            else navigate(`/teacher/courses/${manageCourse.id}`);
                          }}>
                            Manage Section
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-4">No sections available for this course.</p>
                  )}

                  {/* Manage Course Overview button removed — per-section Manage Section handles navigation */}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No course selected.</p>
              )}
            </div>

            {/* Footer removed — close handled by the dialog X icon in the header */}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Courses;
