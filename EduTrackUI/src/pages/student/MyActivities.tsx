import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Clock, CheckCircle, BarChart3, ArrowUpDown, List, LayoutGrid } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MyActivities = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "student") {
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate]);

  const activities = [
    { title: "Programming Assignment 1", course: "CS101", type: "Assignment", dueDate: "2025-01-25", status: "pending", score: null },
    { title: "Midterm Exam", course: "MATH101", type: "Exam", dueDate: "2025-01-22", status: "graded", score: "85/100" },
    { title: "Research Paper", course: "ENG101", type: "Project", dueDate: "2025-01-20", status: "graded", score: "92/100" },
    { title: "Quiz 1: Data Structures", course: "CS101", type: "Quiz", dueDate: "2025-01-18", status: "graded", score: "45/50" },
  ];

  // Sorting and view mode state
  const [sortKey, setSortKey] = useState<"title" | "course" | "dueDate" | "status">("dueDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Calculate activity summary stats
  const activityStats = useMemo(() => {
    const graded = activities.filter(a => a.status === "graded");
    const pending = activities.filter(a => a.status === "pending");
    const submitted = activities.filter(a => a.status === "submitted");
    const completionRate = Math.round((graded.length / activities.length) * 100);
    return { graded: graded.length, pending: pending.length, submitted: submitted.length, completionRate };
  }, [activities]);

  // Sorted activities
  const sortedActivities = useMemo(() => {
    let arr = activities.slice();
    
    const compare = (a: typeof activities[0], b: typeof activities[0]) => {
      switch (sortKey) {
        case "title":
          return a.title.localeCompare(b.title);
        case "course":
          return a.course.localeCompare(b.course);
        case "dueDate":
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case "status": {
          const statusOrder = { pending: 0, submitted: 1, graded: 2 };
          return (statusOrder[a.status as keyof typeof statusOrder] ?? 3) - (statusOrder[b.status as keyof typeof statusOrder] ?? 3);
        }
        default:
          return 0;
      }
    };

    arr.sort((a, b) => (sortOrder === "asc" ? compare(a, b) : -compare(a, b)));
    return arr;
  }, [activities, sortKey, sortOrder]);

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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
            </div>
          </CardContent>
        </Card>

        {/* All Activities Card */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5 text-primary" />
              All Activities
            </CardTitle>
            <CardDescription>Track your assignments and assessments</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Sorting and View Mode Controls */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              {/* Sort Key */}
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as "title" | "course" | "dueDate" | "status")}>
                <SelectTrigger className="w-40 h-9">
                  <SelectValue>
                    {sortKey === "title" ? "Title" : sortKey === "course" ? "Course" : sortKey === "dueDate" ? "Due Date" : "Status"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="course">Course</SelectItem>
                  <SelectItem value="dueDate">Due Date</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
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
            </div>

            {/* Activities List or Grid */}
            {viewMode === "list" ? (
              <div className="space-y-2">
                {sortedActivities.map((activity, index) => (
                  <div
                    key={index}
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
                      {activity.score && (
                        <div className="text-right bg-success/5 px-3 py-2 rounded-lg border border-success/20">
                          <p className="font-bold text-base text-success">{activity.score}</p>
                        </div>
                      )}
                      <Badge
                        variant={
                          activity.status === "graded" ? "default" :
                          activity.status === "submitted" ? "secondary" :
                          "outline"
                        }
                        className={
                          activity.status === "graded" ? "bg-success text-success-foreground" :
                          activity.status === "submitted" ? "bg-amber-500 text-white" :
                          "bg-blue-100 text-blue-700 border-blue-300"
                        }
                      >
                        {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedActivities.map((activity, index) => (
                  <div key={index} className="p-5 border border-border rounded-lg hover:shadow-md transition-shadow duration-200 hover:border-primary/50 group cursor-pointer">
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
                      {activity.score && (
                        <div className="bg-success/5 px-2 py-1 rounded border border-success/20">
                          <p className="font-bold text-sm text-success">{activity.score}</p>
                        </div>
                      )}
                    </div>
                    <Badge
                      variant={
                        activity.status === "graded" ? "default" :
                        activity.status === "submitted" ? "secondary" :
                        "outline"
                      }
                      className={
                        activity.status === "graded" ? "bg-success text-success-foreground" :
                        activity.status === "submitted" ? "bg-amber-500 text-white" :
                        "bg-blue-100 text-blue-700 border-blue-300"
                      }
                    >
                      {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MyActivities;
