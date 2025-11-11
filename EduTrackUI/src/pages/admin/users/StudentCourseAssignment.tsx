import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { API_ENDPOINTS, apiGet, apiPost } from "@/lib/api";

type SubjectRow = { id: number; course_code: string; course_name: string; credits?: number; year_level?: string };


const StudentCourseAssignment = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const studentId = params.studentId;
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [assigned, setAssigned] = useState<number[]>([]);

  useEffect(() => {
    if (!studentId) return;

    // load student details first to know their year level, then fetch subjects filtered by that year level
    const load = async () => {
      try {
        // fetch student record (students endpoint follows pattern used elsewhere)
        const studentRes = await apiGet(`${API_ENDPOINTS.USERS}/../students/${encodeURIComponent(studentId)}`);
        const student = studentRes && (studentRes.data || studentRes.student) ? (studentRes.data || studentRes.student) : null;

        let yearLevel = student?.year_level || student?.yearLevel || '';
        // normalize short numeric year levels (e.g. '1','2') to DB enum format '1st Year', etc.
        if (/^[1-4]$/.test(String(yearLevel))) {
          const map: Record<string, string> = { '1': '1st Year', '2': '2nd Year', '3': '3rd Year', '4': '4th Year' };
          yearLevel = map[String(yearLevel)];
        }

        // call subjects API with year_level filter if available
        const subjectsUrl = yearLevel ? `${API_ENDPOINTS.SUBJECTS}?year_level=${encodeURIComponent(yearLevel)}` : API_ENDPOINTS.SUBJECTS;
        const s = await apiGet(subjectsUrl);
        const rows = s && (s.subjects || s.data) ? (s.subjects || s.data) : Array.isArray(s) ? s : [];
        setSubjects(rows.map((r: any) => ({ id: r.id, course_code: r.course_code || r.code, course_name: r.course_name || r.title, credits: r.credits ?? r.credits, year_level: r.year_level })));

        const a = await apiGet(`${API_ENDPOINTS.STUDENT_SUBJECTS}?student_id=${encodeURIComponent(studentId)}`);
        const al = a && (a.data || []) ? a.data : [];
        setAssigned(al.map((x: any) => Number(x.subject_id)));
      } catch (err) {
        console.error('Failed to load student, subjects or assignments', err);
      }
    };
    load();
  }, [studentId]);

  const assign = async (subjectId: number) => {
    try {
      const res = await apiPost(API_ENDPOINTS.STUDENT_SUBJECTS, { student_id: studentId, subject_id: subjectId });
      if (res && res.success) {
        setAssigned((s) => Array.from(new Set([...s, Number(subjectId)])));
      }
    } catch (err) {
      console.error('Assign failed', err);
    }
  };

  const unassign = async (subjectId: number) => {
    try {
      const res = await apiPost(`${API_ENDPOINTS.STUDENT_SUBJECTS}/delete`, { student_id: studentId, subject_id: subjectId });
      if (res && res.success) {
        setAssigned((s) => s.filter((id) => id !== Number(subjectId)));
      }
    } catch (err) {
      console.error('Unassign failed', err);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Manage Student Subjects</h1>
            <p className="text-muted-foreground">Assign courses and sections for the selected student</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Back
            </Button>
          </div>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-muted border-b pb-6">
            <CardTitle className="text-2xl font-bold">Student: {studentId ?? "—"}</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Assign courses to this student. Use the buttons to enroll or remove the student from a subject.</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full table-auto border-collapse">
                <thead>
                  <tr className="text-left">
                    <th className="py-2">Course Code</th>
                    <th className="py-2">Course Name</th>
                    <th className="py-2">Units</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((sub) => (
                    <tr key={sub.id} className="border-t">
                      <td className="py-2">{sub.course_code}</td>
                      <td className="py-2">{sub.course_name}</td>
                      <td className="py-2">{sub.credits ?? '-'}</td>
                      <td className="py-2">
                        {assigned.includes(Number(sub.id)) ? (
                          <Button variant="outline" size="sm" onClick={() => unassign(sub.id)}>Remove</Button>
                        ) : (
                          <Button size="sm" onClick={() => assign(sub.id)}>Assign</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6">
              <Button onClick={() => navigate(`/admin/users/students`)}>
                Go to Students
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StudentCourseAssignment;
