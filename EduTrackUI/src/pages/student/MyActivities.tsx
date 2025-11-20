import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClipboardList, Clock, CheckCircle, BarChart3, ArrowUpDown, List, LayoutGrid, Loader2, Search, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination } from "@/components/Pagination";
import { API_ENDPOINTS, apiGet } from "@/lib/api";

const MyActivities = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "student") {
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate]);

  // Fetch activities from database
  useEffect(() => {
    const fetchActivities = async () => {
      if (!user?.id) return;
      setLoading(true);

      try {
        // 1) Fetch student to get student ID
        const studentRes = await apiGet(API_ENDPOINTS.STUDENT_BY_USER(user.id));
        const student = studentRes.data || studentRes.student || studentRes || null;
        
        if (!student || !student.id) {
          setActivities([]);
          setLoading(false);
          return;
        }

        // 2) Use OPTIMIZED bulk endpoint - fetches all activities with grades in ONE request
        const activitiesRes = await apiGet(`${API_ENDPOINTS.ACTIVITIES_STUDENT_ALL}?student_id=${student.id}`);
        const allActivities = activitiesRes.data || [];

        // 3) Normalize activities for UI
        const normalized = allActivities.map((a: any) => {
          const score = a.student_grade !== null && a.student_grade !== undefined ? a.student_grade : null;
          return {
            id: a.id,
            title: a.title,
            course: a.course_name || 'N/A',
            type: a.type,
            dueDate: a.due_at ? a.due_at.split(' ')[0] : 'TBA',
            status: score !== null ? 'graded' : 'pending',
            score: score,
            maxScore: a.max_score ?? 100
          };
        });

        setActivities(normalized);
      } catch (e) {
        console.error('Failed to load activities', e);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && user?.role === 'student') {
      fetchActivities();
    }
  }, [user, isAuthenticated]);

  // Sorting and view mode state
  const [sortKey, setSortKey] = useState<"title" | "course" | "dueDate" | "status" | "score">("dueDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [scoreFilter, setScoreFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Calculate activity summary stats
  const activityStats = useMemo(() => {
    const graded = activities.filter(a => a.status === "graded");
    const pending = activities.filter(a => a.status === "pending");
    const completionRate = activities.length > 0 ? Math.round((graded.length / activities.length) * 100) : 0;
    const avgScore = graded.length > 0 ? Math.round((graded.reduce((sum, a) => sum + (a.score || 0), 0) / graded.length) * 100) / 100 : 0;
    return { graded: graded.length, pending: pending.length, completionRate, avgScore };
  }, [activities]);

  // Extract unique courses and types for filter dropdowns
  const uniqueCourses = useMemo(() => {
    const courses = new Set(activities.map(a => a.course).filter(Boolean));
    return Array.from(courses).sort();
  }, [activities]);

  const uniqueTypes = useMemo(() => {
    const types = new Set(activities.map(a => a.type).filter(Boolean));
    return Array.from(types).sort();
  }, [activities]);

  // Filter activities based on all active filters
  const filteredActivities = useMemo(() => {
    return activities.filter(a => {
      // Search query filter
      const q = searchQuery.trim().toLowerCase();
      if (q && !a.title.toLowerCase().includes(q) && !a.course.toLowerCase().includes(q)) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all" && a.status !== statusFilter) {
        return false;
      }

      // Course filter
      if (courseFilter !== "all" && a.course !== courseFilter) {
        return false;
      }

      // Type filter
      if (typeFilter !== "all" && a.type !== typeFilter) {
        return false;
      }

      // Score filter
      if (scoreFilter !== "all") {
        if (scoreFilter === "graded" && a.score === null) return false;
        if (scoreFilter === "pending" && a.score !== null) return false;
        if (scoreFilter === "high" && (a.score === null || a.score < 80)) return false;
        if (scoreFilter === "medium" && (a.score === null || a.score < 60 || a.score >= 80)) return false;
        if (scoreFilter === "low" && (a.score === null || a.score >= 60)) return false;
      }

      return true;
    });
  }, [activities, searchQuery, statusFilter, courseFilter, typeFilter, scoreFilter]);

  // Sorted activities
  const sortedActivities = useMemo(() => {
    let arr = filteredActivities.slice();
    
    const compare = (a: typeof filteredActivities[0], b: typeof filteredActivities[0]) => {
      switch (sortKey) {
        case "title":
          return a.title.localeCompare(b.title);
        case "course":
          return a.course.localeCompare(b.course);
        case "dueDate":
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case "status": {
          const statusOrder = { pending: 0, graded: 1 };
          return (statusOrder[a.status as keyof typeof statusOrder] ?? 2) - (statusOrder[b.status as keyof typeof statusOrder] ?? 2);
        }
        case "score": {
          const aScore = a.score ?? -Infinity;
          const bScore = b.score ?? -Infinity;
          return aScore - bScore;
        }
        default:
          return 0;
      }
    };

    arr.sort((a, b) => (sortOrder === "asc" ? compare(a, b) : -compare(a, b)));
    return arr;
  }, [filteredActivities, sortKey, sortOrder]);

  // Reset page when sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortKey, sortOrder]);

  // Pagination
  const totalItems = sortedActivities.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const pagedActivities = sortedActivities.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (!isAuthenticated) return null;

  return (
    <DashboardLayout>
      <div className="p-8 bg-gradient-to-b from-background to-muted/30 min-h-screen">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Activities</h1>
          <p className="text-muted-foreground text-lg">Track all your assignments, exams, and assessments</p>
        </div>

        {/* Activity Summary Stats Card */}
        <Card className="mb-6 border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10 hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
              Activity Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Total Activities */}
              <div className="text-center p-3 bg-card/50 rounded-lg border border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">Total</p>
                <p className="text-2xl font-bold text-primary">{activities.length}</p>
                <p className="text-xs text-muted-foreground mt-1">activities</p>
              </div>

              {/* Graded */}
              <div className="text-center p-3 bg-card/50 rounded-lg border border-success/20">
                <p className="text-sm text-muted-foreground mb-1">Graded</p>
                <p className="text-2xl font-bold text-success">{activityStats.graded}</p>
                <p className="text-xs text-muted-foreground mt-1">completed</p>
              </div>

              {/* Pending */}
              <div className="text-center p-3 bg-card/50 rounded-lg border border-amber-200">
                <p className="text-sm text-muted-foreground mb-1">Pending</p>
                <p className="text-2xl font-bold text-amber-600">{activityStats.pending}</p>
                <p className="text-xs text-muted-foreground mt-1">awaiting</p>
              </div>

              {/* Completion Rate */}
              <div className="text-center p-3 bg-card/50 rounded-lg border border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">Completion</p>
                <p className="text-2xl font-bold text-primary">{activityStats.completionRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">overall</p>
              </div>

              {/* Average Score */}
              <div className="text-center p-3 bg-card/50 rounded-lg border border-accent/20">
                <p className="text-sm text-muted-foreground mb-1">Avg Score</p>
                <p className="text-2xl font-bold text-accent">{activityStats.avgScore}</p>
                <p className="text-xs text-muted-foreground mt-1">graded items</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* All Activities Card */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  All Activities
                </CardTitle>
                <CardDescription>Track your assignments and assessments</CardDescription>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by activity title or course..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 py-2.5 text-base border-2 focus:border-primary rounded-lg bg-background shadow-sm"
              />
            </div>

            {/* Filter Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-40 h-9 border-2 rounded-lg px-3 bg-background font-medium shadow-sm">
                  <SelectValue>{statusFilter === "all" ? "All Status" : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="graded">Graded</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              {/* Course Filter */}
              <Select value={courseFilter} onValueChange={(v) => { setCourseFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-40 h-9 border-2 rounded-lg px-3 bg-background font-medium shadow-sm">
                  <SelectValue>{courseFilter === "all" ? "All Courses" : courseFilter}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {uniqueCourses.map((course) => (
                    <SelectItem key={course} value={course}>{course}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-40 h-9 border-2 rounded-lg px-3 bg-background font-medium shadow-sm">
                  <SelectValue>{typeFilter === "all" ? "All Types" : typeFilter}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Score Filter */}
              <Select value={scoreFilter} onValueChange={(v) => { setScoreFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-40 h-9 border-2 rounded-lg px-3 bg-background font-medium shadow-sm">
                  <SelectValue>{scoreFilter === "all" ? "All Scores" : scoreFilter === "graded" ? "Graded" : scoreFilter === "pending" ? "Pending" : scoreFilter === "high" ? "High (80+)" : scoreFilter === "medium" ? "Medium (60-79)" : "Low (<60)"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scores</SelectItem>
                  <SelectItem value="graded">Graded</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="high">High (80+)</SelectItem>
                  <SelectItem value="medium">Medium (60-79)</SelectItem>
                  <SelectItem value="low">Low (&lt;60)</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort Key */}
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as "title" | "course" | "dueDate" | "status" | "score")}>
                <SelectTrigger className="w-40 h-9 border-2 rounded-lg px-3 bg-background font-medium shadow-sm">
                  <SelectValue>
                    {sortKey === "title" ? "Sort: Title" : sortKey === "course" ? "Sort: Course" : sortKey === "dueDate" ? "Sort: Due Date" : sortKey === "status" ? "Sort: Status" : "Sort: Score"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="title">Sort: Title</SelectItem>
                  <SelectItem value="course">Sort: Course</SelectItem>
                  <SelectItem value="dueDate">Sort: Due Date</SelectItem>
                  <SelectItem value="status">Sort: Status</SelectItem>
                  <SelectItem value="score">Sort: Score</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort Order Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder((s) => (s === "asc" ? "desc" : "asc"))}
                className="h-9 text-xs border-2"
              >
                <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
                {sortOrder === "asc" ? "Asc" : "Desc"}
              </Button>

              {/* View Mode Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode((v) => (v === "list" ? "grid" : "list"))}
                className="h-9 px-3 border-2"
                title="Toggle list / grid"
              >
                {viewMode === "list" ? (
                  <LayoutGrid className="h-4 w-4" />
                ) : (
                  <List className="h-4 w-4" />
                )}
              </Button>

              {/* Clear Filters Button */}
              {(searchQuery || statusFilter !== "all" || courseFilter !== "all" || typeFilter !== "all" || scoreFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setCourseFilter("all");
                    setTypeFilter("all");
                    setScoreFilter("all");
                    setCurrentPage(1);
                  }}
                  className="h-9 border-2 text-xs gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Activities List or Grid */}
            {viewMode === "list" ? (
              <div className="space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading activities...</span>
                  </div>
                ) : sortedActivities.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">No activities found.</div>
                ) : (
                  pagedActivities.map((activity, index) => (
                    <div
                      key={activity.id || index}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-primary/5 transition-colors duration-150 group"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                          activity.status === "graded" 
                            ? "bg-success/10 text-success" 
                            : activity.status === "submitted"
                            ? "bg-amber-100/70 text-amber-600 group-hover:bg-amber-100"
                            : "bg-primary/10 text-primary"
                        }`}>
                          {activity.status === "graded" ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            <Clock className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground">{activity.title}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span className="px-2 py-1 bg-muted rounded">{activity.course}</span>
                            <span className="px-2 py-1 bg-muted rounded">{activity.type}</span>
                            <span>Due: {activity.dueDate}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {activity.score !== null && (
                          <div className="text-right bg-success/5 px-3 py-2 rounded-lg border border-success/20">
                            <p className="font-bold text-base text-success">{activity.score}/{activity.maxScore}</p>
                            <p className="text-xs text-muted-foreground">
                              {((activity.score / activity.maxScore) * 100).toFixed(0)}%
                            </p>
                          </div>
                        )}
                        <Badge
                          variant={
                            activity.status === "graded" ? "default" :
                            "outline"
                          }
                          className={
                            activity.status === "graded" ? "bg-success text-success-foreground" :
                            "bg-blue-100 text-blue-700 border-blue-300"
                          }
                        >
                          {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12 col-span-full">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading activities...</span>
                  </div>
                ) : sortedActivities.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground col-span-full">No activities found.</div>
                ) : (
                  pagedActivities.map((activity, index) => (
                    <div key={activity.id || index} className="p-5 border border-border rounded-lg hover:shadow-md transition-shadow duration-200 hover:border-primary/50 group cursor-pointer">
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                          activity.status === "graded" 
                            ? "bg-success/10 text-success" 
                            : activity.status === "submitted"
                            ? "bg-amber-100/70 text-amber-600 group-hover:bg-amber-100"
                            : "bg-primary/10 text-primary"
                        }`}>
                          {activity.status === "graded" ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            <Clock className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-base truncate">{activity.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{activity.course}</p>
                        </div>
                      </div>
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-muted rounded text-xs">{activity.type}</span>
                          <span className="text-xs text-muted-foreground">Due: {activity.dueDate}</span>
                        </div>
                        {activity.score !== null && (
                          <div className="bg-success/5 px-2 py-1 rounded border border-success/20">
                            <p className="font-bold text-sm text-success">{activity.score}/{activity.maxScore} ({((activity.score / activity.maxScore) * 100).toFixed(0)}%)</p>
                          </div>
                        )}
                      </div>
                      <Badge
                        variant={
                          activity.status === "graded" ? "default" :
                          "outline"
                        }
                        className={
                          activity.status === "graded" ? "bg-success text-success-foreground" :
                          "bg-blue-100 text-blue-700 border-blue-300"
                        }
                      >
                        {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Pagination controls */}
            {totalItems > 0 && (
              <div className="mt-6 px-2">
                <Pagination
                  currentPage={currentPage}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={(p) => setCurrentPage(p)}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MyActivities;
