import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const StudentDetail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const student = (location.state as any)?.student || null;

  // grade mapping used in StudentManagement
  const gradeToPercent: Record<string, number> = {
    "A+": 98, "A": 95, "A-": 92,
    "B+": 88, "B": 85, "B-": 82,
    "C+": 78, "C": 75, "C-": 72,
    "D": 65, "F": 50
  };

  const transmute = (percentage: number): string => {
    if (percentage >= 97) return "1.00";
    if (percentage >= 94) return "1.25";
    if (percentage >= 91) return "1.50";
    if (percentage >= 88) return "1.75";
    if (percentage >= 85) return "2.00";
    if (percentage >= 82) return "2.25";
    if (percentage >= 79) return "2.50";
    if (percentage >= 76) return "2.75";
    if (percentage >= 75) return "3.00";
    return "5.00";
  };

  if (!student) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">No student data provided. Go back to the student list.</p>
              <div className="mt-4">
                <Button onClick={() => navigate(-1)}>Back</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const percent = gradeToPercent[student.grade] ?? 0;
  const writtenWS = parseFloat(((percent / 100) * 30).toFixed(2));
  const perfWS = parseFloat(((percent / 100) * 40).toFixed(2));
  const examWS = parseFloat(((percent / 100) * 30).toFixed(2));
  const initial = parseFloat((writtenWS + perfWS + examWS).toFixed(2));
  const finalGrade = transmute(initial);

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{student.name}</h1>
            <p className="text-sm text-muted-foreground">{student.email} • {student.course}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate(-1)}>Back</Button>
            <Button onClick={() => navigate('/teacher/grade-input-edit', { state: { student } })}>Open Gradebook</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Progress Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-3 border border-border rounded">
                <p className="text-xs text-muted-foreground">Current Grade</p>
                <p className="font-semibold text-lg">{student.grade}</p>
              </div>
              <div className="p-3 border border-border rounded">
                <p className="text-xs text-muted-foreground">Attendance</p>
                <p className="font-semibold text-lg">{student.attendance}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Assessment Breakdown</p>
              <table className="w-full text-sm border-collapse">
                <tbody>
                  <tr className="border-b"><td className="py-2">Written (30%)</td><td className="py-2 text-right">{percent}%</td><td className="py-2 text-right">{writtenWS.toFixed(2)}</td></tr>
                  <tr className="border-b"><td className="py-2">Performance (40%)</td><td className="py-2 text-right">{percent}%</td><td className="py-2 text-right">{perfWS.toFixed(2)}</td></tr>
                  <tr className="border-b"><td className="py-2">Exam (30%)</td><td className="py-2 text-right">{percent}%</td><td className="py-2 text-right">{examWS.toFixed(2)}</td></tr>
                  <tr className="font-semibold"><td className="py-2">Initial</td><td className="py-2 text-right">—</td><td className="py-2 text-right">{initial.toFixed(2)}</td></tr>
                  <tr className="font-semibold"><td className="py-2">Final Grade</td><td className="py-2 text-right">—</td><td className="py-2 text-right">{finalGrade}</td></tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
};

export default StudentDetail;
