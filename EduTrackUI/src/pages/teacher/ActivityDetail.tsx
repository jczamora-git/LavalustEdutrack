import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, CheckCircle2, AlertCircle, User, Zap } from "lucide-react";

type Student = { id: string; name: string; email?: string; grade?: string };

const ActivityDetail = () => {
  const { courseId, activityId } = useParams<{ courseId: string; activityId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "teacher") {
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate]);

  // Mock: replace with API call to fetch activity and enrolled students
  const activity = {
    id: activityId ?? "0",
    title: `Activity ${activityId}`,
    maxScore: 100,
  };

  const initialStudents: Student[] = [
    { id: "2024001", name: "Sarah Johnson", email: "sarah.j@university.edu", grade: "" },
    { id: "2024002", name: "Michael Chen", email: "m.chen@university.edu", grade: "" },
    { id: "2024003", name: "Emily Rodriguez", email: "e.rodriguez@university.edu", grade: "" },
  ];

  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [editing, setEditing] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    initialStudents.forEach((s) => (m[s.id] = s.grade ?? ""));
    return m;
  });

  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [sortPending, setSortPending] = useState(false);

  useEffect(() => {
    // Reset when params change
    setStudents(initialStudents);
    const m: Record<string, string> = {};
    initialStudents.forEach((s) => (m[s.id] = s.grade ?? ""));
    setEditing(m);
  }, [courseId, activityId]);

  // Calculate grading statistics using the 75% pass threshold
  const totalCount = students.length;

  const statusMap: Record<string, "passed" | "failed" | "pending"> = {};
  students.forEach((s) => {
    const v = editing[s.id];
    if (v === "" || v === undefined) {
      statusMap[s.id] = "pending";
      return;
    }
    const num = Number(v);
    if (isNaN(num)) {
      statusMap[s.id] = "pending";
      return;
    }
    const perc = (num / activity.maxScore) * 100;
    statusMap[s.id] = perc >= 75 ? "passed" : "failed";
  });

  const passedCount = Object.values(statusMap).filter((st) => st === "passed").length;
  const failedCount = Object.values(statusMap).filter((st) => st === "failed").length;
  const pendingCount = Object.values(statusMap).filter((st) => st === "pending").length;
  const gradedCount = passedCount + failedCount;
  const gradingPercentage = totalCount ? (gradedCount / totalCount) * 100 : 0;
  // Passing rate among graded students (passed / graded)
  const passingRate = gradedCount ? Math.round((passedCount / gradedCount) * 100) : null;

  // Sort students: pending first if sortPending is enabled
  const sortedStudents = sortPending
    ? [...students].sort((a, b) => {
        const aIsPending = statusMap[a.id] === "pending";
        const bIsPending = statusMap[b.id] === "pending";
        return aIsPending === bIsPending ? 0 : aIsPending ? -1 : 1;
      })
    : students;

  // Helper function to get student status
  const getStudentStatus = (studentId: string) => {
    return statusMap[studentId] ?? "pending";
  };

  const handleGradeChange = (studentId: string, value: string) => {
    setEditing((prev) => ({ ...prev, [studentId]: value }));
  };

  const handleSave = async () => {
    // Apply edits locally
    setStudents((prev) => prev.map((s) => ({ ...s, grade: editing[s.id] ?? s.grade })));

    // Simulate server save: replace with real API
    // await api.post(`/courses/${courseId}/activities/${activityId}/grades`, { grades: editing })

    // Show success message
    setSavedMessage("Grades saved successfully");
    setTimeout(() => setSavedMessage(null), 3000);
  };

  if (!isAuthenticated) return null;

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{activity.title}</h1>
              <span className="inline-block text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary">
                {activity.maxScore} points
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Course {courseId} • Activity {activityId}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Grades
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Grade Students</CardTitle>
            <CardDescription>Enter grades for {students.length} students and click Save to persist changes.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Grading Progress Bar */}
            <div className="mb-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Grading Progress</span>
                <div className="flex items-center gap-4 text-xs font-medium">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span>Passed: {passedCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span>Failed: {failedCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <span>Pending: {pendingCount}</span>
                  </div>
                </div>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden flex">
                {passedCount > 0 && (
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${(passedCount / totalCount) * 100}%` }}
                  ></div>
                )}
                {failedCount > 0 && (
                  <div
                    className="h-full bg-red-500 transition-all duration-300"
                    style={{ width: `${(failedCount / totalCount) * 100}%` }}
                  ></div>
                )}
                {pendingCount > 0 && (
                  <div
                    className="h-full bg-amber-500 transition-all duration-300"
                    style={{ width: `${(pendingCount / totalCount) * 100}%` }}
                  ></div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <p className="text-xs text-muted-foreground">{Math.round(gradingPercentage)}% graded ({gradedCount}/{totalCount})</p>
                  <p className="text-xs text-muted-foreground">Passing rate: {passingRate !== null ? `${passingRate}%` : "N/A"}</p>
                </div>
                <Button
                  size="sm"
                  variant={sortPending ? "default" : "outline"}
                  onClick={() => setSortPending(!sortPending)}
                  className="text-xs"
                >
                  <AlertCircle className="h-3.5 w-3.5 mr-1" />
                  {sortPending ? "All Students" : "Pending First"}
                </Button>
              </div>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {sortedStudents.map((s, idx) => {
                const hasGrade = editing[s.id] && editing[s.id] !== "";
                const status = getStudentStatus(s.id);
                const statusConfig = {
                  passed: { label: "Passed", color: "bg-green-50 text-green-600", icon: CheckCircle2 },
                  failed: { label: "Failed", color: "bg-red-50 text-red-600", icon: AlertCircle },
                  pending: { label: "Pending", color: "bg-amber-50 text-amber-600", icon: AlertCircle },
                };
                const config = statusConfig[status];
                const StatusIcon = config.icon;

                return (
                  <div key={s.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors shadow-sm group">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-base">{s.name}</p>
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              #{idx + 1}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <span className="font-medium">{s.id}</span>
                            <span>•</span>
                            <span className="truncate">{s.email}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={activity.maxScore}
                            value={editing[s.id] ?? ""}
                            onChange={(e) => handleGradeChange(s.id, e.target.value)}
                            placeholder="0"
                            className="w-20 text-center font-semibold"
                          />
                          <span className="text-sm font-medium text-muted-foreground min-w-fit">
                            / {activity.maxScore}
                          </span>
                        </div>
                        <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded flex-shrink-0 ${config.color}`}>
                          <StatusIcon className="h-4 w-4" />
                          <span>{config.label}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {savedMessage && (
              <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200 flex items-center gap-2 animate-in slide-in-from-top">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-700 font-medium">{savedMessage}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ActivityDetail;
