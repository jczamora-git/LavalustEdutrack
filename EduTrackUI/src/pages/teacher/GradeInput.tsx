import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Award, Save, Upload, Download, FileSpreadsheet, Edit3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const GradeInput = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "teacher") {
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate]);

  const [selectedCourse, setSelectedCourse] = useState("cs101");
  const [selectedSection, setSelectedSection] = useState("12-polaris");
  const [selectedTerm, setSelectedTerm] = useState("midterm");
  const [selectedSemester, setSelectedSemester] = useState("1st");

  const courseInfo = {
    code: "CS101",
    title: "Introduction to the Philosophy of the Human",
    teacher: "Aleck Jean F. Siscar",
    section: "12-Polaris",
  };

  const [grades] = useState([
    { id: "2024001", name: "Alagasi, Hyden Cristia A.", written: [10, 10, 91, 10, 8, 8, 38, 85], performance: [30, 15, 0, 0, 0], exam: 60 },
    { id: "2024002", name: "Algoy, Ann Ruslyn My Tolentino", written: [10, 10, 80, 8, 8, 8, 25, 85], performance: [30, 14, 0, 0, 0], exam: 31 },
    { id: "2024003", name: "Alvarez, Jezzabel Orallo", written: [10, 10, 84, 10, 8, 8, 25, 85], performance: [30, 15, 0, 0, 0], exam: 38 },
    { id: "2024004", name: "Ariola, Marienyque Angel R.", written: [10, 10, 98, 10, 8, 8, 45, 85], performance: [30, 15, 0, 0, 0], exam: 49 },
    { id: "2024005", name: "Austria, Jaila Marie Amiten", written: [10, 10, 88, 10, 8, 8, 32, 85], performance: [30, 13, 0, 0, 0], exam: 17 },
  ]);

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

  const handleDownloadTemplate = () => {
    alert("Download class record template - will generate Excel file with proper format");
  };

  const handleExportClassRecord = () => {
    alert("Export current class record - will generate Excel file with all grades");
  };

  const handleSaveGrades = () => {
    alert("Grades saved successfully!");
  };

  if (!isAuthenticated) return null;

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Class Record</h1>
            <p className="text-muted-foreground">Manage and input student grades</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <Button variant="outline" onClick={handleExportClassRecord}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Class Record
            </Button>
            <Button onClick={handleSaveGrades}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>

        {/* Course Selection and Info */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <Label className="text-xs text-muted-foreground">Semester</Label>
                <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1st">1st Semester</SelectItem>
                    <SelectItem value="2nd">2nd Semester</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Term</Label>
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="midterm">Midterm</SelectItem>
                    <SelectItem value="final">Final Term</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Course</Label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cs101">{courseInfo.code} - {courseInfo.title}</SelectItem>
                    <SelectItem value="cs201">CS201 - Data Structures</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Section</Label>
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12-polaris">12-Polaris</SelectItem>
                    <SelectItem value="12-sirius">12-Sirius</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Course Info Banner */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-lg">{courseInfo.code} - {courseInfo.title}</p>
                  <p className="text-sm text-muted-foreground">Teacher: {courseInfo.teacher} | Section: {courseInfo.section}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-xs">
                    {selectedSemester} Semester - {selectedTerm === "midterm" ? "Midterm" : "Final Term"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Class Record Table */}
        <Card className="mb-6">
          <CardHeader>
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Class Record
                </CardTitle>
                <CardDescription className="hidden md:block">
                  Grading System: Written Works (30%) • Exam (30%) • Performance Tasks (40%)
                </CardDescription>
              </div>
              <div>
                <Button
                  onClick={() => {
                    const url = `/teacher/grade-input-edit?course=${selectedCourse}&section=${selectedSection}&term=${selectedTerm}&semester=${selectedSemester}`;
                    window.open(url, "_blank", "noopener,noreferrer");
                  }}
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Grades
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto overflow-y-auto max-h-[600px] border rounded-lg">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 z-20">
                  <tr className="border-b-2 border-border">
                    <th className="p-2 text-left font-semibold sticky left-0 z-30 bg-background border-r border-border min-w-[200px]">
                      Learner's Name
                    </th>
                    {/* Written Works (30%) */}
                    <th colSpan={11} className="p-2 text-center font-semibold bg-table-written border-r border-border">
                      Written Works (30%)
                    </th>
                    {/* Performance (40%) */}
                    <th colSpan={8} className="p-2 text-center font-semibold bg-table-performance border-r border-border">
                      Performance Tasks (40%)
                    </th>
                    {/* Exam (30%) */}
                    <th colSpan={3} className="p-2 text-center font-semibold bg-table-exam border-r border-border">
                      Exam (30%)
                    </th>
                    {/* Total */}
                    <th colSpan={2} className="p-2 text-center font-semibold bg-table-total">
                      {selectedTerm === "midterm" ? "Midterm" : "Final Term"} Grade
                    </th>
                  </tr>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="p-2 text-left text-xs font-medium sticky left-0 z-30 bg-muted/50 border-r border-border">ID / Name</th>
                    {/* Written sub-columns */}
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <th key={`w${i}`} className="p-1 text-center font-medium w-12 bg-table-written/50">{i}</th>
                    ))}
                    <th className="p-1 text-center font-medium w-12 bg-table-written/50">Total</th>
                    <th className="p-1 text-center font-medium w-12 bg-table-written/50">PS</th>
                    <th className="p-1 text-center font-medium w-12 bg-table-written border-r border-border">WS</th>
                    {/* Performance sub-columns */}
                    {[1, 2, 3, 4, 5].map((i) => (
                      <th key={`p${i}`} className="p-1 text-center font-medium w-12 bg-table-performance/50">{i}</th>
                    ))}
                    <th className="p-1 text-center font-medium w-12 bg-table-performance/50">Total</th>
                    <th className="p-1 text-center font-medium w-12 bg-table-performance/50">PS</th>
                    <th className="p-1 text-center font-medium w-12 bg-table-performance border-r border-border">WS</th>
                    {/* Exam sub-columns */}
                    <th className="p-1 text-center font-medium w-12 bg-table-exam/50">Score</th>
                    <th className="p-1 text-center font-medium w-12 bg-table-exam/50">PS</th>
                    <th className="p-1 text-center font-medium w-12 bg-table-exam border-r border-border">WS</th>
                    {/* Total columns */}
                    <th className="p-1 text-center font-medium w-16 bg-table-total/50">Initial<br/><span className="text-[10px] font-normal">(0-100)</span></th>
                    <th className="p-1 text-center font-medium w-16 bg-table-total">Grade<br/><span className="text-[10px] font-normal">(1.0-5.0)</span></th>
                  </tr>
                  <tr className="border-b border-border bg-muted/30 text-[10px]">
                    <th className="p-1 text-right font-medium sticky left-0 z-30 bg-muted/30 border-r border-border">HPS →</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-written/30">10</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-written/30">10</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-written/30">100</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-written/30">10</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-written/30">10</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-written/30">10</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-written/30">50</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-written/30">100</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-written/30">300</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-written/30">100%</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-written border-r border-border">30%</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-performance/30">30</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-performance/30">15</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-performance/30">-</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-performance/30">-</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-performance/30">-</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-performance/30">45</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-performance/30">100%</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-performance border-r border-border">40%</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-exam/30">60</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-exam/30">100%</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-exam border-r border-border">30%</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-total/30">100%</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-total">-</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((student, idx) => {
                    const writtenTotal = student.written.reduce((a, b) => a + b, 0);
                    const writtenPS = ((writtenTotal / 300) * 100).toFixed(2);
                    const writtenWS = parseFloat(((writtenTotal / 300) * 30).toFixed(2));
                    
                    const performanceTotal = student.performance.reduce((a, b) => a + b, 0);
                    const performancePS = ((performanceTotal / 45) * 100).toFixed(2);
                    const performanceWS = parseFloat(((performanceTotal / 45) * 40).toFixed(2));
                    
                    const examPS = ((student.exam / 60) * 100).toFixed(2);
                    const examWS = parseFloat(((student.exam / 60) * 30).toFixed(2));
                    
                    const initialGrade = writtenWS + performanceWS + examWS;
                    const finalGrade = transmute(initialGrade);

                    return (
                      <tr key={idx} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="p-2 sticky left-0 z-20 bg-background border-r border-border">
                          <div>
                            <p className="font-medium text-xs">{idx + 1}. {student.name}</p>
                            <p className="text-[10px] text-muted-foreground">{student.id}</p>
                          </div>
                        </td>
                        {/* Written Works */}
                        {student.written.map((score) => (
                          <td key={`w${score}`} className="p-1 text-center bg-table-written/20">
                            <div className="text-xs">{score}</div>
                          </td>
                        ))}
                        <td className="p-1 text-center font-semibold bg-table-written/30 text-xs">
                          {writtenTotal}
                        </td>
                        <td className="p-1 text-center font-medium bg-table-written/30 text-xs">
                          {writtenPS}%
                        </td>
                        <td className="p-1 text-center font-semibold bg-table-written border-r border-border text-xs">
                          {writtenWS.toFixed(2)}
                        </td>
                        {/* Performance */}
                        {student.performance.map((score) => (
                          <td key={`p${score}`} className="p-1 text-center bg-table-performance/20">
                            <div className="text-xs">{score}</div>
                          </td>
                        ))}
                        <td className="p-1 text-center font-semibold bg-table-performance/30 text-xs">
                          {performanceTotal}
                        </td>
                        <td className="p-1 text-center font-medium bg-table-performance/30 text-xs">
                          {performancePS}%
                        </td>
                        <td className="p-1 text-center font-semibold bg-table-performance border-r border-border text-xs">
                          {performanceWS.toFixed(2)}
                        </td>
                        {/* Exam */}
                        <td className="p-1 text-center bg-table-exam/20">
                          <div className="text-xs">{student.exam}</div>
                        </td>
                        <td className="p-1 text-center font-medium bg-table-exam/30 text-xs">
                          {examPS}%
                        </td>
                        <td className="p-1 text-center font-semibold bg-table-exam border-r border-border text-xs">
                          {examWS.toFixed(2)}
                        </td>
                        {/* Totals */}
                        <td className="p-1 text-center font-bold bg-table-total/30 text-xs">
                          {initialGrade.toFixed(2)}
                        </td>
                        <td className={`p-1 text-center font-bold text-xs ${
                          parseFloat(finalGrade) <= 3.0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}>
                          {finalGrade}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Total Students: {grades.length}</p>
                <p className="text-[10px]">
                  <span className="font-medium">HPS</span> = Highest Possible Score • 
                  <span className="font-medium"> PS</span> = Percentage Score • 
                  <span className="font-medium"> WS</span> = Weighted Score
                </p>
              </div>
              <Button onClick={handleSaveGrades}>
                <Save className="h-4 w-4 mr-2" />
                Save All Grades
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Import/Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Offline Support</CardTitle>
            <CardDescription className="text-xs">Import or export class record for offline editing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border-2 border-dashed border-border rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">Import Excel File</p>
                    <p className="text-xs text-muted-foreground mb-2">Upload edited class record (.xlsx, .xls)</p>
                  </div>
                </div>
              </div>
              
              <div className="border border-border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">Export to Excel</p>
                    <p className="text-xs text-muted-foreground mb-2">Download current class record for offline editing</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default GradeInput;
