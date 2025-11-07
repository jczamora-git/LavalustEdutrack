import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Users, ClipboardList, UserPlus, LayoutGrid, List, CheckCircle2, AlertCircle, Clock, Mail, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const CourseManagement = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { courseId } = useParams();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "teacher") {
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate]);

  const courseInfo = {
    title: "Introduction to Computer Science",
    code: "CS101",
    section: "Section A",
    students: 35,
  };

  const [activities, setActivities] = useState(() => [
    { title: "Programming Assignment 1", type: "Assignment", dueDate: "2025-01-25", submissions: 28, graded: 20, maxScore: 50 },
    { title: "Midterm Exam", type: "Exam", dueDate: "2025-01-20", submissions: 35, graded: 35, maxScore: 100 },
    { title: "Quiz 1: Data Structures", type: "Quiz", dueDate: "2025-01-15", submissions: 33, graded: 33, maxScore: 20 },
  ]);

  const [viewType, setViewType] = useState<"list" | "grid">(() => {
    try {
      const saved = localStorage.getItem("course_activities_view");
      if (saved === "list" || saved === "grid") return saved;
    } catch (e) {}
    return "list";
  });

  // persist view preference
  useEffect(() => {
    try {
      localStorage.setItem("course_activities_view", viewType);
    } catch (e) {}
  }, [viewType]);

  // Add activity dialog state (controlled)
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("assignment");
  const [newMaxScore, setNewMaxScore] = useState<number | string>(100);
  const [newDueDate, setNewDueDate] = useState("");
  const [newInstructions, setNewInstructions] = useState("");

  // Students state and view
  const [students, setStudents] = useState(() => [
    { id: "2024001", name: "Sarah Johnson", email: "sarah.j@university.edu", status: "active" },
    { id: "2024002", name: "Michael Chen", email: "m.chen@university.edu", status: "active" },
    { id: "2024003", name: "Emily Rodriguez", email: "e.rodriguez@university.edu", status: "active" },
  ]);

  const [studentViewType, setStudentViewType] = useState<"list" | "grid">(() => {
    try {
      const saved = localStorage.getItem("course_students_view");
      if (saved === "list" || saved === "grid") return saved;
    } catch (e) {}
    return "list";
  });

  // persist student view preference
  useEffect(() => {
    try {
      localStorage.setItem("course_students_view", studentViewType);
    } catch (e) {}
  }, [studentViewType]);

  // Add student dialog state
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentSuggestions, setStudentSuggestions] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string; email: string } | null>(null);

  // Mock student pool for suggestions
  const availableStudents = [
    { id: "S1001", name: "Sarah Davis", email: "sarah.d@university.edu" },
    { id: "S1002", name: "Samuel Green", email: "samuel@university.edu" },
    { id: "S1003", name: "Emily Brown", email: "emily.b@university.edu" },
    { id: "S1004", name: "Michael Chang", email: "m.chang@university.edu" },
    { id: "S1005", name: "Mike Johnson", email: "mike.j@university.edu" },
    { id: "S1006", name: "Jessica Lee", email: "jessica@university.edu" },
    { id: "S1007", name: "Anna Martinez", email: "anna.m@university.edu" },
  ];

  // Fetch student suggestions (debounced via useEffect)
  useEffect(() => {
    let mounted = true;
    const t = setTimeout(() => {
      if (studentSearchQuery.trim()) {
        const q = studentSearchQuery.toLowerCase();
        const filtered = availableStudents.filter(
          (s) =>
            (s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)) &&
            !students.find((st) => st.id === s.id) // exclude already added
        );
        if (mounted) setStudentSuggestions(filtered);
      } else {
        if (mounted) setStudentSuggestions([]);
      }
    }, 250);
    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, [studentSearchQuery, students]);

  if (!isAuthenticated) return null;

  return (
    <DashboardLayout>
      <div className="p-8">
        <Button variant="ghost" onClick={() => navigate("/teacher/courses")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Courses
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{courseInfo.title}</h1>
          <p className="text-muted-foreground">{courseInfo.code} - {courseInfo.section}</p>
        </div>

        <div className="grid gap-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Activities</span>

                  <div className="flex items-center gap-2">
                    <Button
                      aria-pressed={viewType === "grid"}
                      title="Toggle list / grid"
                      variant="outline"
                      size="sm"
                      onClick={() => setViewType((v) => (v === "list" ? "grid" : "list"))}
                      className="text-xs flex items-center gap-1"
                    >
                      {viewType === "list" ? (
                        <>
                          <LayoutGrid className="h-4 w-4" />
                        </>
                      ) : (
                        <>
                          <List className="h-4 w-4" />
                        </>
                      )}
                    </Button>

                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={() => setIsAddOpen(true)} className="text-xs">
                          <Plus className="h-4 w-4 mr-1" />
                          Add Activity
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Activity</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="activity-title">Activity Title</Label>
                            <Input id="activity-title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Enter activity title" />
                          </div>
                          <div>
                            <Label htmlFor="activity-type">Type</Label>
                            <Select value={newType} onValueChange={(v) => setNewType(v)}>
                              <SelectTrigger id="activity-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="assignment">Assignment</SelectItem>
                                <SelectItem value="quiz">Quiz</SelectItem>
                                <SelectItem value="exam">Exam</SelectItem>
                                <SelectItem value="project">Project</SelectItem>
                                <SelectItem value="performance-task">Performance Task</SelectItem>
                                <SelectItem value="written-task">Written Task</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="max-score">Maximum Score</Label>
                            <Input id="max-score" type="number" value={String(newMaxScore)} onChange={(e) => setNewMaxScore(Number(e.target.value || 0))} placeholder="100" />
                          </div>
                          <div>
                            <Label htmlFor="due-date">Due Date</Label>
                            <Input id="due-date" type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} />
                          </div>
                          <div>
                            <Label htmlFor="instructions">Instructions</Label>
                            <Textarea id="instructions" value={newInstructions} onChange={(e) => setNewInstructions(e.target.value)} placeholder="Activity instructions" rows={3} />
                          </div>
                          <Button className="w-full" onClick={() => {
                            // validate
                            if (!newTitle) return;
                            const item = { title: newTitle, type: newType, dueDate: newDueDate || "TBD", submissions: 0, graded: 0, maxScore: Number(newMaxScore) || 100 };
                            setActivities((prev) => [item, ...prev]);
                            // reset
                            setNewTitle(""); setNewType("assignment"); setNewMaxScore(100); setNewDueDate(""); setNewInstructions("");
                            setIsAddOpen(false);
                          }}>Create Activity</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* scrollable container for activities */}
                <div className="space-y-3 max-h-[360px] overflow-y-auto">
                  {viewType === "list" && activities.map((activity, index) => (
                    <div key={index} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-semibold text-base">{activity.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-block text-xs font-medium px-2 py-1 rounded bg-primary/10 text-primary">{activity.type}</span>
                            <span className="text-xs text-muted-foreground">{activity.maxScore} points</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span className="font-medium">{activity.dueDate}</span>
                        </div>
                      </div>
                      <div className="mt-3 mb-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Grading Progress</span>
                          <span className="font-semibold">{activity.graded}/{activity.submissions}</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${activity.submissions ? (activity.graded / activity.submissions) * 100 : 0}%` }}></div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          {activity.graded === activity.submissions ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span className="text-green-600 font-medium">All graded</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-4 w-4 text-amber-500" />
                              <span className="text-amber-600 font-medium">{activity.submissions - activity.graded} pending</span>
                            </>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/teacher/courses/${courseId}/activities/${index}`)}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  ))}

                  {viewType === "grid" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {activities.map((activity, index) => (
                        <div key={index} className="p-4 border border-border rounded-lg hover:shadow-md transition-shadow bg-card flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <p className="font-semibold text-sm leading-tight">{activity.title}</p>
                              </div>
                              <span className="inline-block text-xs font-medium px-2 py-1 rounded bg-primary/10 text-primary flex-shrink-0 ml-2">{activity.type}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                              <Clock className="h-3 w-3" />
                              <span>{activity.dueDate}</span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Grading</span>
                                <span className="font-semibold">{activity.graded}/{activity.submissions}</span>
                              </div>
                              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${activity.submissions ? (activity.graded / activity.submissions) * 100 : 0}%` }}></div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-1 text-xs">
                              {activity.graded === activity.submissions ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                  <span className="text-green-600 font-medium">Complete</span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                                  <span className="text-amber-600 font-medium">{activity.submissions - activity.graded} left</span>
                                </>
                              )}
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => navigate(`/teacher/courses/${courseId}/activities/${index}`)}>View</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Students</span>
                  <div className="flex items-center gap-2">
                    <Button
                      aria-pressed={studentViewType === "grid"}
                      title="Toggle list / grid"
                      variant="outline"
                      size="sm"
                      onClick={() => setStudentViewType((v) => (v === "list" ? "grid" : "list"))}
                      className="text-xs flex items-center gap-1"
                    >
                      {studentViewType === "list" ? (
                        <LayoutGrid className="h-4 w-4" />
                      ) : (
                        <List className="h-4 w-4" />
                      )}
                    </Button>
                    <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={() => setIsAddStudentOpen(true)} className="text-xs">
                          <UserPlus className="h-4 w-4 mr-1" />
                          Add Student
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Student to Course</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="student-search">Search Student</Label>
                            <div className="relative">
                              <Input
                                id="student-search"
                                value={studentSearchQuery}
                                onChange={(e) => {
                                  setStudentSearchQuery(e.target.value);
                                  setSelectedStudent(null);
                                }}
                                placeholder="Enter student ID or name"
                              />
                              {studentSuggestions.length > 0 && (
                                <ul className="absolute z-30 left-0 right-0 bg-card border border-border mt-1 rounded-md max-h-40 overflow-auto">
                                  {studentSuggestions.map((s) => (
                                    <li
                                      key={s.id}
                                      onClick={() => {
                                        setSelectedStudent(s);
                                        setStudentSearchQuery(s.name + " (" + s.id + ")");
                                        setStudentSuggestions([]);
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
                          <p className="text-sm text-muted-foreground">
                            Note: Student addition requires admin approval
                          </p>
                          <Button
                            className="w-full"
                            onClick={() => {
                              if (selectedStudent) {
                                setStudents((prev) => [
                                  ...prev,
                                  {
                                    id: selectedStudent.id,
                                    name: selectedStudent.name,
                                    email: selectedStudent.email,
                                    status: "active",
                                  },
                                ]);
                                setStudentSearchQuery("");
                                setSelectedStudent(null);
                                setIsAddStudentOpen(false);
                              }
                            }}
                            disabled={!selectedStudent}
                          >
                            Send Request
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardTitle>
                <CardDescription>Total: {students.length} students</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Scrollable container for students */}
                <div className="max-h-[360px] overflow-y-auto">
                  {studentViewType === "list" && (
                    <div className="space-y-3">
                      {students.map((student) => (
                        <div key={student.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors shadow-sm">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-base">{student.name}</p>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                  <span className="font-medium">{student.id}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                  <Mail className="h-3 w-3" />
                                  <span className="truncate">{student.email}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {student.status === "active" ? (
                                <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  {student.status}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {studentViewType === "grid" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {students.map((student) => (
                        <div key={student.id} className="p-4 border border-border rounded-lg hover:shadow-md transition-shadow bg-card">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm">{student.name}</p>
                              <p className="text-xs text-muted-foreground">{student.id}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-1 text-xs text-muted-foreground mb-3">
                            <Mail className="h-3 w-3 flex-shrink-0 mt-0.5" />
                            <span className="truncate">{student.email}</span>
                          </div>
                          {student.status === "active" ? (
                            <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              {student.status}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CourseManagement;
