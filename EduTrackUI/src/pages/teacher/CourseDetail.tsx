import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Student = {
  id: string;
  name: string;
  email?: string;
  grade?: string;
};

const CourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "teacher") {
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate]);

  // Mock courses and students. In a real app replace with API calls.
  const courses = useMemo(
    () => [
      { id: "1", title: "Introduction to Computer Science" },
      { id: "2", title: "Data Structures" },
      { id: "3", title: "Web Development" },
    ],
    []
  );

  const initialStudentsByCourse: Record<string, Student[]> = {
    "1": [
      { id: "S1001", name: "Sarah Davis", email: "sarah@edu.com", grade: "A" },
      { id: "S1002", name: "Samuel Green", email: "samuel@edu.com", grade: "B+" },
      { id: "S1003", name: "Emily Brown", email: "emily@edu.com", grade: "A-" },
    ],
    "2": [
      { id: "S2001", name: "Mike Johnson", email: "mike@edu.com", grade: "B" },
      { id: "S2002", name: "Anna Lee", email: "anna@edu.com", grade: "B-" },
    ],
    "3": [
      { id: "S3001", name: "Michael Chen", email: "michael@edu.com", grade: "A" },
    ],
  };

  const course = courses.find((c) => c.id === (id ?? "")) ?? { id: id ?? "", title: `Course ${id}` };

  const [students, setStudents] = useState<Student[]>(() => initialStudentsByCourse[id ?? ""] ?? []);
  const [editing, setEditing] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    (initialStudentsByCourse[id ?? ""] ?? []).forEach((s) => (map[s.id] = s.grade ?? ""));
    return map;
  });

  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    // reset when route id changes
    setStudents(initialStudentsByCourse[id ?? ""] ?? []);
    const map: Record<string, string> = {};
    (initialStudentsByCourse[id ?? ""] ?? []).forEach((s) => (map[s.id] = s.grade ?? ""));
    setEditing(map);
  }, [id]);

  const handleGradeChange = (studentId: string, value: string) => {
    setEditing((prev) => ({ ...prev, [studentId]: value }));
  };

  const handleSave = () => {
    // Apply editing values to students state
    setStudents((prev) => prev.map((s) => ({ ...s, grade: editing[s.id] ?? s.grade })));
    setSavedMessage("Grades saved successfully");
    setTimeout(() => setSavedMessage(null), 3000);

    // In a real app, here you'd send the updated grades to the server.
    // e.g. await api.put(`/courses/${id}/grades`, { grades: editing })
  };

  if (!isAuthenticated) return null;

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
            <p className="text-muted-foreground">Course ID: {course.id}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              Back
            </Button>
            <Button onClick={handleSave}>Save Grades</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Students</CardTitle>
            <CardDescription>Enter grades for students in this course and click Save.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {students.length === 0 && <div className="text-sm text-muted-foreground">No students enrolled.</div>}
              {students.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-muted-foreground">{s.id} • {s.email}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      value={editing[s.id] ?? ""}
                      onChange={(e) => handleGradeChange(s.id, e.target.value)}
                      placeholder="Grade"
                      className="w-28"
                    />
                  </div>
                </div>
              ))}
            </div>
            {savedMessage && <div className="mt-4 text-sm text-success">{savedMessage}</div>}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CourseDetail;
