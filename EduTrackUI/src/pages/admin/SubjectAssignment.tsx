import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from "lucide-react";

const SubjectAssignment = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate]);

  const assignments = [
    { teacher: "Dr. James Anderson", subject: "Computer Science", section: "Section A", students: 35 },
    { teacher: "Prof. Maria Garcia", subject: "Mathematics", section: "Section B", students: 30 },
    { teacher: "Dr. Robert Chen", subject: "English", section: "Section A", students: 28 },
  ];

  const pendingStudents = [
    { student: "Sarah Johnson", teacher: "Dr. James Anderson", subject: "Computer Science", section: "Section A", date: "2025-01-20" },
    { student: "Michael Chen", teacher: "Prof. Maria Garcia", subject: "Mathematics", section: "Section B", date: "2025-01-19" },
  ];

  if (!isAuthenticated) return null;

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Teacher & Subject Management</h1>
          <p className="text-muted-foreground">Assign subjects and sections to teachers, and approve student additions</p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Assignment</CardTitle>
              <CardDescription>Assign a teacher to a subject and section</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Teacher</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teacher1">John Smith</SelectItem>
                      <SelectItem value="teacher2">Mike Wilson</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subject</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cs">Computer Science</SelectItem>
                      <SelectItem value="math">Mathematics</SelectItem>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="physics">Physics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Section</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="section-a">Section A</SelectItem>
                      <SelectItem value="section-b">Section B</SelectItem>
                      <SelectItem value="section-c">Section C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button>Create Assignment</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Assignments</CardTitle>
              <CardDescription>View and manage existing assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {assignments.map((assignment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{assignment.teacher}</p>
                      <p className="text-sm text-muted-foreground">
                        {assignment.subject} - {assignment.section}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{assignment.students} students</Badge>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending Student Approvals</CardTitle>
              <CardDescription>Approve or reject teacher requests to add students</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingStudents.length > 0 ? (
                  pendingStudents.map((request, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border border-border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{request.student}</p>
                        <p className="text-sm text-muted-foreground">
                          {request.subject} - {request.section}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Requested by: {request.teacher} | {request.date}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="text-success">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" className="text-destructive">
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No pending approval requests
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SubjectAssignment;
