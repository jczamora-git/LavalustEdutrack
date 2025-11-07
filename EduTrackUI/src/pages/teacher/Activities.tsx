import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, ClipboardList, Search, List, LayoutGrid } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const Activities = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "teacher") {
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate]);

  const activities = [
    { title: "Programming Assignment 1", course: "CS101", section: "Section A", type: "Assignment", dueDate: "2025-01-25", submissions: 28, totalStudents: 35 },
    { title: "Midterm Exam", course: "CS201", section: "Section B", type: "Exam", dueDate: "2025-01-22", submissions: 28, totalStudents: 28 },
    { title: "Research Paper", course: "CS301", section: "Section A", type: "Project", dueDate: "2025-01-20", submissions: 25, totalStudents: 30 },
  ];

  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("dueDate");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const subjects = useMemo(() => {
    return Array.from(new Set(activities.map((a) => a.course)));
  }, [activities]);

  const sections = useMemo(() => {
    return Array.from(new Set(activities.map((a) => a.section)));
  }, [activities]);

  const displayed = useMemo(() => {
    let out = activities.slice();
    if (subjectFilter !== "all") out = out.filter((a) => a.course === subjectFilter);
    if (sectionFilter !== "all") out = out.filter((a) => a.section === sectionFilter);
    if (searchQuery) out = out.filter((a) => a.title.toLowerCase().includes(searchQuery.toLowerCase()));

    if (sortBy === "dueDate") {
      out.sort((x, y) => (x.dueDate > y.dueDate ? 1 : -1));
    } else if (sortBy === "submissions") {
      out.sort((x, y) => y.submissions - x.submissions);
    } else if (sortBy === "title") {
      out.sort((x, y) => x.title.localeCompare(y.title));
    }

    return out;
  }, [activities, subjectFilter, sectionFilter, sortBy, searchQuery]);

  if (!isAuthenticated) return null;

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Activities</h1>
          <p className="text-muted-foreground">View and manage all activities across courses</p>
        </div>

        <Card>
          <CardContent className="p-0">
            {/* Sticky Navigation Controls */}
            <div className="sticky top-0 z-10 border-b border-border bg-card p-4 space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filters and View Toggle */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Select value={subjectFilter} onValueChange={(v) => setSubjectFilter(v)}>
                    <SelectTrigger className="w-40 h-9">
                      <SelectValue>{subjectFilter === "all" ? "All subjects" : subjectFilter}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All subjects</SelectItem>
                      {subjects.map((s) => (
                        <SelectItem value={s} key={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Select value={sectionFilter} onValueChange={(v) => setSectionFilter(v)}>
                    <SelectTrigger className="w-40 h-9">
                      <SelectValue>{sectionFilter === "all" ? "All sections" : sectionFilter}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sections</SelectItem>
                      {sections.map((s) => (
                        <SelectItem value={s} key={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Select value={sortBy} onValueChange={(v) => setSortBy(v)}>
                  <SelectTrigger className="w-32 h-9">
                    <SelectValue>
                      {sortBy === "dueDate" ? "Due Date" : sortBy === "submissions" ? "Submissions" : "Title"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dueDate">Due Date</SelectItem>
                    <SelectItem value="submissions">Submissions</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Mode Toggle */}
                <Button
                  aria-pressed={viewMode === "grid"}
                  title="Toggle list / grid"
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode((v) => (v === "list" ? "grid" : "list"))}
                  className="ml-auto text-xs flex items-center gap-1"
                >
                  {viewMode === "list" ? (
                    <LayoutGrid className="h-4 w-4" />
                  ) : (
                    <List className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Results count */}
              {displayed.length > 0 && (
                <p className="text-xs text-muted-foreground">{displayed.length} activity/activities found</p>
              )}
            </div>

            {/* Activities Content */}
            <div className="p-4">
              {viewMode === "list" ? (
                <div className="space-y-3">
                  {displayed.map((activity, index) => (
                    <div
                      key={index}
                      className="p-4 border border-border rounded-lg hover:bg-muted/50 hover:shadow-sm transition-all duration-200 group"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-semibold text-base group-hover:text-primary transition-colors">{activity.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            <span className="font-medium">{activity.course}</span>
                            <span className="mx-2">•</span>
                            <span>{activity.section}</span>
                            <span className="mx-2">•</span>
                            <Badge variant="outline" className="text-xs">{activity.type}</Badge>
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">Due: {activity.dueDate}</p>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Submissions</p>
                            <p className="text-lg font-semibold">{activity.submissions}/{activity.totalStudents}</p>
                          </div>
                          <Button variant="default" size="sm" onClick={() => navigate(`/teacher/courses/${activity.course}/activities/${index}`)}>
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayed.map((activity, index) => (
                    <div key={index} className="p-5 border border-border rounded-lg hover:shadow-md transition-shadow duration-200 hover:border-primary/50 group cursor-pointer">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-base group-hover:text-primary transition-colors">{activity.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{activity.course} • {activity.section}</p>
                        </div>
                        <Badge className="text-xs">{activity.type}</Badge>
                      </div>
                      <div className="space-y-2 mb-4">
                        <p className="text-sm text-muted-foreground">Due {activity.dueDate}</p>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <span className="text-sm font-medium">{activity.submissions}/{activity.totalStudents} submissions</span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/teacher/courses/${activity.course}/activities/${index}`)} className="w-full">View</Button>
                    </div>
                  ))}
                </div>
              )}

              {displayed.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No activities found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Activities;
