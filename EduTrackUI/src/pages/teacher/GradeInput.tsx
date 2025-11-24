import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Award, Save, Upload, Download, FileSpreadsheet, Edit3, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { API_ENDPOINTS, apiGet, apiPost } from "@/lib/api";

const GradeInput = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "teacher") {
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate]);

  // selections / state (declared before effects)
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedTerm, setSelectedTerm] = useState("midterm");
  const [selectedSemester, setSelectedSemester] = useState("1st");

  const [academicPeriods, setAcademicPeriods] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [availablePeriodTypes, setAvailablePeriodTypes] = useState<any[]>([]);

  const [courses, setCourses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState({ periods: false, courses: false, sections: false, students: false, activities: false, submitting: false });

  const [courseInfo, setCourseInfo] = useState({ code: "", title: "", teacher: "", section: "" });

  // Helper to categorize activities by grading component
  const categorizeActivities = (activities: any[]) => {
    const written: any[] = []; // quiz, assignment, other
    const performance: any[] = []; // project, laboratory, performance
    const exam: any[] = []; // exam

    activities.forEach(act => {
      const type = (act.type || '').toLowerCase();
      if (['quiz', 'assignment', 'other'].includes(type)) {
        written.push(act);
      } else if (['project', 'laboratory', 'performance'].includes(type)) {
        performance.push(act);
      } else if (type === 'exam') {
        exam.push(act);
      }
    });

    return { written, performance, exam };
  };

  // Helper to get student grade for an activity
  const getStudentGrade = (studentId: string, activityId: string) => {
    const student = students.find(s => String(s.id) === String(studentId));
    if (!student || !student.grades) return null;
    
    const gradeRecord = student.grades.find((g: any) => String(g.activity_id) === String(activityId));
    return gradeRecord ? parseFloat(gradeRecord.grade ?? 0) : 0;
  };

  // Helper to calculate weighted scores
  const calculateGrades = (studentId: string, categorized: any) => {
    // Written Works (30%)
    let writtenTotal = 0;
    let writtenMax = 0;
    categorized.written.forEach((act: any) => {
      const grade = getStudentGrade(studentId, act.id);
      writtenTotal += grade;
      writtenMax += parseFloat(act.max_score ?? 0);
    });
    const writtenPS = writtenMax > 0 ? (writtenTotal / writtenMax) * 100 : 0;
    const writtenWS = (writtenPS / 100) * 30;

    // Performance Tasks (40%)
    let performanceTotal = 0;
    let performanceMax = 0;
    categorized.performance.forEach((act: any) => {
      const grade = getStudentGrade(studentId, act.id);
      performanceTotal += grade;
      performanceMax += parseFloat(act.max_score ?? 0);
    });
    const performancePS = performanceMax > 0 ? (performanceTotal / performanceMax) * 100 : 0;
    const performanceWS = (performancePS / 100) * 40;

    // Exam (30%)
    let examTotal = 0;
    let examMax = 0;
    categorized.exam.forEach((act: any) => {
      const grade = getStudentGrade(studentId, act.id);
      examTotal += grade;
      examMax += parseFloat(act.max_score ?? 0);
    });
    const examPS = examMax > 0 ? (examTotal / examMax) * 100 : 0;
    const examWS = (examPS / 100) * 30;

    const initialGrade = writtenWS + performanceWS + examWS;
    const finalGrade = transmute(initialGrade);

    return {
      written: { total: writtenTotal, max: writtenMax, ps: writtenPS, ws: writtenWS },
      performance: { total: performanceTotal, max: performanceMax, ps: performancePS, ws: performanceWS },
      exam: { total: examTotal, max: examMax, ps: examPS, ws: examWS },
      initialGrade,
      finalGrade
    };
  };

  // Build an empty grade row for a student when no grades exist yet
  const makeEmptyGradeRow = (s: any) => ({ id: String(s.id ?? s.student_id ?? s.user_id ?? s.id ?? ''), name: s.name ?? `${s.first_name ?? ''} ${s.last_name ?? ''}`, grades: [] });

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

  const handleExportClassRecord = async () => {
    if (!selectedCourse || !selectedSection) {
      alert("Please select a course and section first");
      return;
    }

    try {
      // Build query parameters
      let query = `course_id=${encodeURIComponent(String(selectedCourse))}&section_id=${encodeURIComponent(String(selectedSection))}`;
      
      if (selectedPeriodId) {
        query += `&academic_period_id=${encodeURIComponent(String(selectedPeriodId))}`;
      }

      // Download using fetch with credentials
      const url = `${API_ENDPOINTS.EXPORT_CLASS_RECORD}?${query}`;
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include', // Important for session cookies
      });

      if (!response.ok) {
        // Try to get error message from response
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Export failed');
        }
        throw new Error(`Export failed with status ${response.status}`);
      }

      // Get the blob from response
      const blob = await response.blob();
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'ClassRecord.csv';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/"/g, '');
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(downloadUrl);
      
    } catch (error: any) {
      console.error('Export failed:', error);
      alert('Failed to export class record: ' + (error.message || 'Unknown error'));
    }
  };

  const handleExportClassRecordExcel = async () => {
    if (!selectedCourse || !selectedSection) {
      alert("Please select a course and section first");
      return;
    }

    try {
      // Build query parameters
      let query = `course_id=${encodeURIComponent(String(selectedCourse))}&section_id=${encodeURIComponent(String(selectedSection))}`;
      
      if (selectedPeriodId) {
        query += `&academic_period_id=${encodeURIComponent(String(selectedPeriodId))}`;
      }

      // Download using fetch with credentials
      const url = `${API_ENDPOINTS.EXPORT_CLASS_RECORD_EXCEL}?${query}`;
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Export failed');
        }
        throw new Error(`Export failed with status ${response.status}`);
      }

      // Get the blob from response
      const blob = await response.blob();
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'ClassRecord.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/"/g, '');
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(downloadUrl);
      
    } catch (error: any) {
      console.error('Export Excel failed:', error);
      alert('Failed to export Excel: ' + (error.message || 'Unknown error'));
    }
  };

  const handleSaveGrades = () => {
    alert("Grades saved successfully!");
  };

  // Helper to convert transmuted grade to numeric equivalent
  const getNumericFromGrade = (gradeStr: string): number => {
    const gradeMap: Record<string, number> = {
      '1.00': 97, '1.25': 94, '1.50': 91, '1.75': 88, '2.00': 85,
      '2.25': 82, '2.50': 79, '2.75': 76, '3.00': 75, '5.00': 0
    };
    return gradeMap[gradeStr] || 0;
  };

  const handleSubmitGrades = async () => {
    if (!selectedCourse || !selectedSection || !selectedPeriodId || !selectedTerm) {
      alert("Please select a course, section, period, and term first");
      return;
    }

    if (students.length === 0) {
      alert("No students found for this course/section");
      return;
    }

    const confirmSubmit = window.confirm(
      `Are you sure you want to submit grades for ${students.length} students?\nThis will upload the final grades to the system.`
    );

    if (!confirmSubmit) return;

    try {
      setLoading((l) => ({ ...l, submitting: true }));

      // Prepare grades payload
      const gradesData = students.map((student) => {
        const categorized = categorizeActivities(activities);
        const calculatedGrades = calculateGrades(student.id, categorized);
        const numericScore = getNumericFromGrade(calculatedGrades.finalGrade);
        
        return {
          student_id: student.id,
          final_grade_num: numericScore,
          final_grade: calculatedGrades.finalGrade
        };
      });

      const payload = {
        subject_id: selectedCourse,
        section_id: selectedSection,
        academic_period_id: selectedPeriodId,
        term: selectedTerm.charAt(0).toUpperCase() + selectedTerm.slice(1),
        grades: gradesData
      };

      const response = await apiPost(API_ENDPOINTS.FINAL_GRADES_SUBMIT, payload);

      if (response.success) {
        alert(
          `Grades submitted successfully!\n` +
          `Inserted: ${response.inserted}, Updated: ${response.updated}` +
          (response.errors && response.errors.length > 0 ? `\nErrors: ${response.errors.join('; ')}` : '')
        );
      } else {
        alert(`Failed to submit grades: ${response.message}`);
      }
    } catch (error: any) {
      console.error('Grade submission error:', error);
      alert(`Error submitting grades: ${error.message}`);
    } finally {
      setLoading((l) => ({ ...l, submitting: false }));
    }
  };

  // Fetch academic periods and teacher assignments (courses) on mount
  useEffect(() => {
    let mounted = true;
    const fetchInitial = async () => {
      try {
        setLoading((l) => ({ ...l, periods: true, courses: true }));
        // academic periods
        try {
          const pRes = await apiGet(API_ENDPOINTS.ACADEMIC_PERIODS);
          const plist = pRes.data ?? pRes.periods ?? pRes ?? [];
          if (mounted && Array.isArray(plist)) {
            setAcademicPeriods(plist);
            const active = plist.find((p: any) => p.status === 'active');
            if (active) {
              setSelectedPeriodId(String(active.id ?? active));
              // derive short semester (1st / 2nd / Summer)
              const s = (active.semester || '').toLowerCase();
              if (s.includes('1st')) setSelectedSemester('1st');
              else if (s.includes('2nd')) setSelectedSemester('2nd');
              else setSelectedSemester('summer');
              
              // Set available period types for active semester
              const periodsForSemester = plist.filter((p: any) => p.semester === active.semester);
              setAvailablePeriodTypes(periodsForSemester);
              
              // Set term based on period_type
              const pt = (active.period_type || '').toLowerCase();
              if (pt.includes('midterm')) setSelectedTerm('midterm');
              else if (pt.includes('final')) setSelectedTerm('final');
            }
          }
        } catch (e) {
          // ignore
        }

        // teacher assignments -> courses
        try {
          const tRes = await apiGet(`${API_ENDPOINTS.TEACHER_ASSIGNMENTS}/my`);
          const tlist = tRes.data ?? tRes.assigned_courses ?? tRes.assignments ?? tRes ?? [];
          if (mounted && Array.isArray(tlist)) {
            // Map to course objects (handle different shapes)
            const mapped = tlist.map((a: any) => {
              // Handle various response structures
              const subj = a.subject ?? a;
              // Prefer nested subject.id or flat subject_id when available.
              // Many API shapes return either `assignments` (with nested `subject`) or
              // `assigned_courses` (flat object where `id` is the teacher_subject id and
              // `subject_id` is the canonical subject id). We prefer the canonical
              // subject id to use as activities.course_id.
              const courseId = (a.subject && a.subject.id) ?? a.subject_id ?? subj.subject_id ?? subj.id ?? a.teacher_subject_id ?? a.id;
              const courseCode = a.course_code ?? subj.course_code ?? subj.code ?? a.code;
              const courseName = a.course_name ?? subj.course_name ?? subj.title ?? subj.name;
              const semester = a.semester ?? subj.semester ?? null;
              const yearLevel = a.year_level ?? subj.year_level ?? null;

              // Extract sections
              let sectionsList = [];
              if (Array.isArray(a.sections)) {
                sectionsList = a.sections.map((s: any) => ({ 
                  id: s.id ?? s.section_id, 
                  name: s.name ?? s.title ?? s.section_name 
                }));
              } else if (Array.isArray(subj.sections)) {
                sectionsList = subj.sections.map((s: any) => ({ 
                  id: s.id ?? s.section_id, 
                  name: s.name ?? s.title ?? s.section_name 
                }));
              }

              return {
                id: courseId,
                code: courseCode,
                title: courseName,
                semester: semester,
                year_level: yearLevel,
                teacher: a.teacher_name ?? (user?.name ?? ''),
                sections: sectionsList,
              };
            });

            console.log('Fetched courses:', mapped); // Debug log
            setCourses(mapped);
            
            if (mapped.length > 0) {
              setSelectedCourse(String(mapped[0].id));
              setCourseInfo({ 
                code: mapped[0].code ?? '', 
                title: mapped[0].title ?? '', 
                teacher: mapped[0].teacher ?? (user?.name ?? ''), 
                section: mapped[0].sections && mapped[0].sections[0] ? mapped[0].sections[0].name : '' 
              });
              // set sections for first course
              setSections(mapped[0].sections ?? []);
              if (mapped[0].sections && mapped[0].sections.length > 0) {
                setSelectedSection(String(mapped[0].sections[0].id));
              }
            }
          }
        } catch (e) {
          console.error('Failed to fetch teacher assignments:', e);
          // fallback: try fetch subjects list
          try {
            const sres = await apiGet(API_ENDPOINTS.SUBJECTS);
            const slist = sres.data ?? sres.subjects ?? sres ?? [];
            if (mounted && Array.isArray(slist) && slist.length > 0) {
              const mapped = slist.map((s: any) => ({ id: s.id, code: s.course_code, title: s.course_name, semester: s.semester ?? null, year_level: s.year_level ?? null, sections: Array.isArray(s.sections) ? s.sections.map((x: any) => ({ id: x.id, name: x.name })) : [] }));
              setCourses(mapped);
              if (mapped.length > 0) {
                setSelectedCourse(String(mapped[0].id));
                setCourseInfo({ code: mapped[0].code ?? '', title: mapped[0].title ?? '', teacher: user?.name ?? '', section: mapped[0].sections && mapped[0].sections[0] ? mapped[0].sections[0].name : '' });
                setSections(mapped[0].sections ?? []);
                if (mapped[0].sections && mapped[0].sections.length > 0) setSelectedSection(String(mapped[0].sections[0].id));
              }
            }
          } catch (e) {}
        }
      } finally {
        setLoading((l) => ({ ...l, periods: false, courses: false }));
      }
    };
    fetchInitial();
    return () => { mounted = false; };
  }, [user]);

  // When selectedSemester changes, update available period types
  useEffect(() => {
    if (!selectedSemester || !academicPeriods.length) return;
    
    // Find all periods for the selected semester
    let semesterMatch = '';
    if (selectedSemester === '1st') semesterMatch = '1st Semester';
    else if (selectedSemester === '2nd') semesterMatch = '2nd Semester';
    else if (selectedSemester === 'summer') semesterMatch = 'Summer';
    
    const periodsForSemester = academicPeriods.filter((p: any) => {
      const pSem = (p.semester || '').toLowerCase();
      return pSem.includes(semesterMatch.toLowerCase());
    });
    
    setAvailablePeriodTypes(periodsForSemester);
    
    // Auto-select first available period for this semester if current selection is not valid
    if (periodsForSemester.length > 0) {
      const currentPeriod = academicPeriods.find((p: any) => String(p.id) === String(selectedPeriodId));
      const currentIsValid = currentPeriod && periodsForSemester.some((p: any) => p.id === currentPeriod.id);
      
      if (!currentIsValid) {
        const firstPeriod = periodsForSemester[0];
        setSelectedPeriodId(String(firstPeriod.id));
        const pt = (firstPeriod.period_type || '').toLowerCase();
        if (pt.includes('midterm')) setSelectedTerm('midterm');
        else if (pt.includes('final')) setSelectedTerm('final');
      }
    }
  }, [selectedSemester, academicPeriods, selectedPeriodId]);

  // When selectedSemester changes, filter courses by semester
  useEffect(() => {
    if (!selectedSemester || !courses.length) return;
    
    // Filter courses to show only those matching selected semester
    const filteredCourses = courses.filter((c) => {
      if (!c.semester) return true; // Include if no semester specified
      const courseSemester = (c.semester || '').toLowerCase();
      let matchesSemester = false;
      
      if (selectedSemester === '1st' && courseSemester.includes('1st')) matchesSemester = true;
      else if (selectedSemester === '2nd' && courseSemester.includes('2nd')) matchesSemester = true;
      else if (selectedSemester === 'summer' && courseSemester.includes('summer')) matchesSemester = true;
      
      return matchesSemester;
    });

    // If filtered list is empty, show all courses as fallback
    const courseList = filteredCourses.length > 0 ? filteredCourses : courses;
    
    // Reset course selection if currently selected course is not in filtered list
    if (selectedCourse && !courseList.find((c) => String(c.id) === String(selectedCourse))) {
      if (courseList.length > 0) {
        const firstCourse = courseList[0];
        setSelectedCourse(String(firstCourse.id));
        setSections(firstCourse.sections ?? []);
        setCourseInfo({ code: firstCourse.code ?? '', title: firstCourse.title ?? '', teacher: firstCourse.teacher ?? (user?.name ?? ''), section: firstCourse.sections && firstCourse.sections[0] ? firstCourse.sections[0].name : '' });
        if (firstCourse.sections && firstCourse.sections.length > 0) {
          setSelectedSection(String(firstCourse.sections[0].id));
        }
      } else {
        setSelectedCourse(null);
        setSections([]);
        setSelectedSection(null);
      }
    }
  }, [selectedSemester, courses]);

  // When selectedCourse changes, update sections and courseInfo
  useEffect(() => {
    if (!selectedCourse) return;
    const found = courses.find((c) => String(c.id) === String(selectedCourse));
    if (found) {
      setSections(found.sections ?? []);
      setCourseInfo({ code: found.code ?? '', title: found.title ?? '', teacher: found.teacher ?? (user?.name ?? ''), section: found.sections && found.sections[0] ? found.sections[0].name : '' });
      if ((!selectedSection || String(selectedSection) === 'null') && found.sections && found.sections.length > 0) {
        setSelectedSection(String(found.sections[0].id));
      }
    }
  }, [selectedCourse, courses, user]);

  // When selectedSection or selectedPeriodId changes, fetch activities
  useEffect(() => {
    let mounted = true;
    const fetchActivities = async () => {
      if (!selectedCourse || !selectedSection) return;
      try {
        setLoading((l) => ({ ...l, activities: true }));
        
        // Build query params - filter by academic_period_id if selected
        let query = `course_id=${encodeURIComponent(String(selectedCourse))}&section_id=${encodeURIComponent(String(selectedSection))}`;
        
        if (selectedPeriodId) {
          query += `&academic_period_id=${encodeURIComponent(String(selectedPeriodId))}`;
        }
        
        const res = await apiGet(`${API_ENDPOINTS.ACTIVITIES}?${query}`);
        const list = res.data ?? res.activities ?? res ?? [];
        
        if (mounted && Array.isArray(list)) {
          console.log('Fetched activities:', list); // Debug log
          setActivities(list);
        } else {
          setActivities([]);
        }
      } catch (e) {
        console.error('Failed to fetch activities:', e);
        setActivities([]);
      } finally {
        setLoading((l) => ({ ...l, activities: false }));
      }
    };
    fetchActivities();
    return () => { mounted = false; };
  }, [selectedCourse, selectedSection, selectedPeriodId]);

  // When selectedSection changes, fetch students for that section
  useEffect(() => {
    let mounted = true;
    const fetchStudents = async () => {
      if (!selectedSection || !selectedCourse) return;
      try {
        setLoading((l) => ({ ...l, students: true }));
        // Get year level from selected course
        const course = courses.find((c) => String(c.id) === String(selectedCourse));
        const yearLevel = course?.year_level ?? null;
        
        // Build query with section_id and optionally year_level
        let query = `section_id=${encodeURIComponent(String(selectedSection))}`;
        if (yearLevel) {
          query += `&year_level=${encodeURIComponent(String(yearLevel))}`;
        }
        // Include grades in the response
        query += `&include_grades=true`;
        
        const res = await apiGet(`${API_ENDPOINTS.STUDENTS}?${query}`);
        const list = res.data ?? res.students ?? res ?? [];
        if (mounted && Array.isArray(list)) {
          // Map backend student shape to UI student rows
          // Use numeric DB `id` as the primary `id` for API calls, keep `student_code` for display
          const mapped = list.map((st: any) => {
            return {
              id: st.id ?? st.user_id ?? null,
              student_code: st.student_id ?? null,
              name: st.name ?? `${st.first_name ?? ''} ${st.last_name ?? ''}`,
              email: st.email ?? st.user_email ?? '',
              status: st.status ?? 'active',
              grades: st.grades ?? st.activity_grades ?? []
            };
          });
          setStudents(mapped);
        } else {
          setStudents([]);
        }
      } catch (e) {
        console.error('Failed to fetch students:', e);
        setStudents([]);
      } finally {
        setLoading((l) => ({ ...l, students: false }));
      }
    };
    fetchStudents();
    return () => { mounted = false; };
  }, [selectedSection, selectedCourse, courses]);

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
              Export CSV
            </Button>
            <Button variant="outline" onClick={handleExportClassRecordExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button onClick={handleSaveGrades}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
            <Button
              onClick={handleSubmitGrades}
              disabled={loading.submitting}
              className="bg-green-600 hover:bg-green-700"
            >
              <Send className="h-4 w-4 mr-2" />
              {loading.submitting ? 'Submitting...' : 'Submit Grades'}
            </Button>
          </div>
        </div>

        {/* Course Selection and Info */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <Label className="text-xs text-muted-foreground">Semester / Period</Label>
                <Select value={selectedPeriodId ?? undefined} onValueChange={(v) => {
                  setSelectedPeriodId(v);
                  const p = academicPeriods.find((x: any) => String(x.id) === String(v));
                  if (p) {
                    const s = (p.semester || '').toLowerCase();
                    if (s.includes('1st')) setSelectedSemester('1st');
                    else if (s.includes('2nd')) setSelectedSemester('2nd');
                    else setSelectedSemester('summer');
                    
                    // Update term based on period type
                    const pt = (p.period_type || '').toLowerCase();
                    if (pt.includes('midterm')) setSelectedTerm('midterm');
                    else if (pt.includes('final')) setSelectedTerm('final');
                  }
                }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      // Get distinct school_year + semester combinations
                      const seen = new Map();
                      return academicPeriods
                        .filter((p: any) => {
                          const key = `${p.school_year}-${p.semester}`;
                          if (seen.has(key)) return false;
                          seen.set(key, p);
                          return true;
                        })
                        .map((p: any) => (
                          <SelectItem key={`${p.school_year}-${p.semester}`} value={String(p.id)}>{`${p.school_year} • ${p.semester}`}</SelectItem>
                        ));
                    })()}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Term</Label>
                <Select value={selectedTerm} onValueChange={(v) => {
                  setSelectedTerm(v);
                  // Find the period that matches the selected term for current semester
                  const matchingPeriod = availablePeriodTypes.find((p: any) => {
                    const pt = (p.period_type || '').toLowerCase();
                    return (v === 'midterm' && pt.includes('midterm')) || (v === 'final' && pt.includes('final'));
                  });
                  if (matchingPeriod) {
                    setSelectedPeriodId(String(matchingPeriod.id));
                  }
                }}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePeriodTypes
                      .filter((p: any, index: number, self: any[]) => {
                        // Remove duplicates by period_type
                        const pt = (p.period_type || '').toLowerCase();
                        return index === self.findIndex((t: any) => (t.period_type || '').toLowerCase() === pt);
                      })
                      .map((p: any) => {
                        const pt = (p.period_type || '').toLowerCase();
                        const value = pt.includes('midterm') ? 'midterm' : 'final';
                        return (
                          <SelectItem key={p.id} value={value}>
                            {p.period_type}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Course</Label>
                <Select value={selectedCourse ?? undefined} onValueChange={(v) => setSelectedCourse(v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses
                      .filter((c) => {
                        if (!c.semester || !selectedSemester) return true;
                        const courseSemester = (c.semester || '').toLowerCase();
                        if (selectedSemester === '1st') return courseSemester.includes('1st');
                        if (selectedSemester === '2nd') return courseSemester.includes('2nd');
                        if (selectedSemester === 'summer') return courseSemester.includes('summer');
                        return true;
                      })
                      .map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{`${c.code ?? ''} - ${c.title ?? ''}`}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Section</Label>
                <Select value={selectedSection ?? undefined} onValueChange={(v) => setSelectedSection(v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
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
                    {academicPeriods.find((p) => String(p.id) === String(selectedPeriodId)) ? `${academicPeriods.find((p) => String(p.id) === String(selectedPeriodId)).school_year} - ${academicPeriods.find((p) => String(p.id) === String(selectedPeriodId)).semester}` : `${selectedSemester} Semester - ${selectedTerm === "midterm" ? "Midterm" : "Final Term"}`}
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
                    const url = `/teacher/grade-input-edit?course=${selectedCourse}&section=${selectedSection}&term=${selectedTerm}&semester=${selectedSemester}&period_id=${selectedPeriodId || ''}`;
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
                <thead className="sticky top-0 z-20 bg-background">
                  <tr className="border-b-2 border-border bg-background">
                    <th className="p-2 text-left font-semibold sticky left-0 z-30 bg-background border-r border-border min-w-[200px] max-w-[200px] w-[200px]">
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
                    <th className="p-2 text-left text-xs font-medium sticky left-0 z-30 bg-muted border-r border-border min-w-[200px] max-w-[200px] w-[200px]">ID / Name</th>
                    {/* Written sub-columns */}
                    {categorizeActivities(activities).written.map((act, idx) => (
                      <th key={`wh${idx}`} className="p-1 text-center font-medium w-12 bg-table-written/50" title={act.title}>
                        {act.title.length > 10 ? act.title.substring(0, 10) + '...' : act.title}
                      </th>
                    ))}
                    {Array.from({ length: Math.max(0, 8 - categorizeActivities(activities).written.length) }).map((_, i) => (
                      <th key={`whe${i}`} className="p-1 text-center font-medium w-12 bg-table-written/50">-</th>
                    ))}
                    <th className="p-1 text-center font-medium w-12 bg-table-written/50">Total</th>
                    <th className="p-1 text-center font-medium w-12 bg-table-written/50">PS</th>
                    <th className="p-1 text-center font-medium w-12 bg-table-written border-r border-border">WS</th>
                    {/* Performance sub-columns */}
                    {categorizeActivities(activities).performance.map((act, idx) => (
                      <th key={`ph${idx}`} className="p-1 text-center font-medium w-12 bg-table-performance/50" title={act.title}>
                        {act.title.length > 10 ? act.title.substring(0, 10) + '...' : act.title}
                      </th>
                    ))}
                    {Array.from({ length: Math.max(0, 5 - categorizeActivities(activities).performance.length) }).map((_, i) => (
                      <th key={`phe${i}`} className="p-1 text-center font-medium w-12 bg-table-performance/50">-</th>
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
                    <th className="p-1 text-right font-medium sticky left-0 z-30 bg-muted border-r border-border min-w-[200px] max-w-[200px] w-[200px]">HPS →</th>
                    {/* Written Works HPS */}
                    {categorizeActivities(activities).written.map((act, idx) => (
                      <th key={`whps${idx}`} className="p-1 text-center text-muted-foreground bg-table-written/30">{act.max_score}</th>
                    ))}
                    {Array.from({ length: Math.max(0, 8 - categorizeActivities(activities).written.length) }).map((_, i) => (
                      <th key={`whpse${i}`} className="p-1 text-center text-muted-foreground bg-table-written/30">-</th>
                    ))}
                    <th className="p-1 text-center text-muted-foreground bg-table-written/30">{categorizeActivities(activities).written.reduce((sum, act) => sum + parseFloat(act.max_score ?? 0), 0)}</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-written/30">100%</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-written border-r border-border">30%</th>
                    {/* Performance Tasks HPS */}
                    {categorizeActivities(activities).performance.map((act, idx) => (
                      <th key={`phps${idx}`} className="p-1 text-center text-muted-foreground bg-table-performance/30">{act.max_score}</th>
                    ))}
                    {Array.from({ length: Math.max(0, 5 - categorizeActivities(activities).performance.length) }).map((_, i) => (
                      <th key={`phpsee${i}`} className="p-1 text-center text-muted-foreground bg-table-performance/30">-</th>
                    ))}
                    <th className="p-1 text-center text-muted-foreground bg-table-performance/30">{categorizeActivities(activities).performance.reduce((sum, act) => sum + parseFloat(act.max_score ?? 0), 0)}</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-performance/30">100%</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-performance border-r border-border">40%</th>
                    {/* Exam HPS */}
                    <th className="p-1 text-center text-muted-foreground bg-table-exam/30">{categorizeActivities(activities).exam.reduce((sum, act) => sum + parseFloat(act.max_score ?? 0), 0)}</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-exam/30">100%</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-exam border-r border-border">30%</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-total/30">100%</th>
                    <th className="p-1 text-center text-muted-foreground bg-table-total">-</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => {
                    const categorized = categorizeActivities(activities);
                    const grades = calculateGrades(student.id, categorized);

                    return (
                      <tr key={idx} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="p-2 sticky left-0 z-10 bg-background border-r border-border min-w-[200px] max-w-[200px] w-[200px]">
                          <div>
                            <p className="font-medium text-xs">{idx + 1}. {student.name}</p>
                            <p className="text-[10px] text-muted-foreground">{student.student_code ?? student.id}</p>
                          </div>
                        </td>
                        {/* Written Works - Individual Scores */}
                        {categorized.written.map((act, actIdx) => (
                          <td key={`w${actIdx}`} className="p-1 text-center bg-table-written/20">
                            <div className="text-xs">{getStudentGrade(student.id, act.id) || '-'}</div>
                          </td>
                        ))}
                        {/* Fill empty columns if less than 8 activities */}
                        {Array.from({ length: Math.max(0, 8 - categorized.written.length) }).map((_, i) => (
                          <td key={`we${i}`} className="p-1 text-center bg-table-written/20">
                            <div className="text-xs text-muted-foreground">-</div>
                          </td>
                        ))}
                        <td className="p-1 text-center font-semibold bg-table-written/30 text-xs">
                          {grades.written.total.toFixed(0)}
                        </td>
                        <td className="p-1 text-center font-medium bg-table-written/30 text-xs">
                          {grades.written.ps.toFixed(2)}%
                        </td>
                        <td className="p-1 text-center font-semibold bg-table-written border-r border-border text-xs">
                          {grades.written.ws.toFixed(2)}
                        </td>
                        {/* Performance Tasks - Individual Scores */}
                        {categorized.performance.map((act, actIdx) => (
                          <td key={`p${actIdx}`} className="p-1 text-center bg-table-performance/20">
                            <div className="text-xs">{getStudentGrade(student.id, act.id) || '-'}</div>
                          </td>
                        ))}
                        {/* Fill empty columns if less than 5 activities */}
                        {Array.from({ length: Math.max(0, 5 - categorized.performance.length) }).map((_, i) => (
                          <td key={`pe${i}`} className="p-1 text-center bg-table-performance/20">
                            <div className="text-xs text-muted-foreground">-</div>
                          </td>
                        ))}
                        <td className="p-1 text-center font-semibold bg-table-performance/30 text-xs">
                          {grades.performance.total.toFixed(0)}
                        </td>
                        <td className="p-1 text-center font-medium bg-table-performance/30 text-xs">
                          {grades.performance.ps.toFixed(2)}%
                        </td>
                        <td className="p-1 text-center font-semibold bg-table-performance border-r border-border text-xs">
                          {grades.performance.ws.toFixed(2)}
                        </td>
                        {/* Exam */}
                        <td className="p-1 text-center bg-table-exam/20">
                          <div className="text-xs">{grades.exam.total.toFixed(0)}</div>
                        </td>
                        <td className="p-1 text-center font-medium bg-table-exam/30 text-xs">
                          {grades.exam.ps.toFixed(2)}%
                        </td>
                        <td className="p-1 text-center font-semibold bg-table-exam border-r border-border text-xs">
                          {grades.exam.ws.toFixed(2)}
                        </td>
                        {/* Totals */}
                        <td className="p-1 text-center font-bold bg-table-total/30 text-xs">
                          {grades.initialGrade.toFixed(2)}
                        </td>
                        <td className={`p-1 text-center font-bold text-xs ${
                          parseFloat(grades.finalGrade) <= 3.0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}>
                          {grades.finalGrade}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Total Students: {students.length}</p>
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
