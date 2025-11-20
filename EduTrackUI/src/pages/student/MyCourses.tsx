import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BookOpen, User, Loader2, Phone, Mail, IdCard } from "lucide-react";
import { API_ENDPOINTS, apiGet } from "@/lib/api";

const MyCourses = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [teacherDialogOpen, setTeacherDialogOpen] = useState(false);
  const [loadingTeacher, setLoadingTeacher] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "student") {
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        // declarations for values used across this function
        let studentYearLevelNum: number | null = null;
        let studentSectionId: any = null;

        // Fetch student info to get year_level and section_id (use by-user endpoint)
        const studentRes = await apiGet(API_ENDPOINTS.STUDENT_BY_USER(user.id));
        const student = studentRes.data || studentRes.student || studentRes || null;
        
        if (!student) {
          console.error('Student record not found for user:', user.id);
          setCourses([]);
          setLoading(false);
          return;
        }

        // Compute a display-friendly year label for the student (e.g. '2nd Year')
        const ordinal = (n: number) => {
          if (!Number.isFinite(n)) return String(n);
          if (n % 10 === 1 && n % 100 !== 11) return `${n}st Year`;
          if (n % 10 === 2 && n % 100 !== 12) return `${n}nd Year`;
          if (n % 10 === 3 && n % 100 !== 13) return `${n}rd Year`;
          return `${n}th Year`;
        };

        const studentYearLevelRawVal = student.year_level ?? student.yearLevel ?? null;
        let displayYearLabel = 'N/A';
        if (studentYearLevelRawVal != null) {
          if (typeof studentYearLevelRawVal === 'number') displayYearLabel = ordinal(studentYearLevelRawVal);
          else if (typeof studentYearLevelRawVal === 'string') {
            const raw = studentYearLevelRawVal.trim();
            if (/year/i.test(raw)) {
              displayYearLabel = raw; // already contains 'Year'
            } else {
              const m = raw.match(/(\d+)/);
              if (m) displayYearLabel = ordinal(Number(m[1]));
              else if (/^\d+(st|nd|rd|th)$/i.test(raw)) displayYearLabel = `${raw} Year`;
              else displayYearLabel = raw;
            }
          } else {
            displayYearLabel = String(studentYearLevelRawVal);
          }
        }

        // Normalize year level to a numeric value (supports '2nd Year', '2', or 2)
        const studentYearLevelRaw = student.year_level ?? student.yearLevel;
        if (typeof studentYearLevelRaw === 'number') studentYearLevelNum = studentYearLevelRaw;
        else if (typeof studentYearLevelRaw === 'string') {
          const m = String(studentYearLevelRaw).match(/(\d+)/);
          studentYearLevelNum = m ? Number(m[1]) : null;
        }
        studentSectionId = student.section_id || student.sectionId;

        // store student info along with a computed display label and numeric year
        const studentInfoObj: any = { ...student, displayYearLabel, yearLevelNum: studentYearLevelNum };

        // Resolve section details (name, description) for nicer header display
        if (studentSectionId) {
          try {
            const secRes = await apiGet(`${API_ENDPOINTS.SECTIONS}/${encodeURIComponent(studentSectionId)}`);
            const sec = secRes.data || secRes.section || secRes || null;
            if (sec) {
              studentInfoObj.section_name = sec.name || student.section_name || student.sectionName || sec.title || studentInfoObj.section_name;
              studentInfoObj.section_description = sec.description || studentInfoObj.section_description || student.description || sec.desc || '';
            }
          } catch (err) {
            console.warn('Failed to fetch section details for header display', err);
          }
        }

        setStudentInfo(studentInfoObj);

        // Fetch active academic period to get current semester (try public endpoint first)
        let activePeriod = null;
        try {
          const activePeriodRes = await apiGet(`${API_ENDPOINTS.ACADEMIC_PERIODS_ACTIVE}-public`);
          activePeriod = activePeriodRes.data || activePeriodRes.period || activePeriodRes || null;
        } catch (err) {
          console.warn('Failed to fetch active period from public endpoint, trying authenticated endpoint', err);
          try {
            const activePeriodRes = await apiGet(API_ENDPOINTS.ACADEMIC_PERIODS_ACTIVE);
            activePeriod = activePeriodRes.data || activePeriodRes.period || activePeriodRes || null;
          } catch (err2) {
            console.error('Failed to fetch active period', err2);
          }
        }
        
        if (!activePeriod) {
          console.warn('No active academic period found');
          setCourses([]);
          setLoading(false);
          return;
        }

        // Extract semester from active period (e.g., "1st Semester" -> "1st")
        const semesterMatch = (activePeriod.semester || '').match(/^(\d+)(st|nd|rd|th)/i);
        const currentSemesterShort = semesterMatch ? (String(semesterMatch[1]) === '1' ? '1st' : '2nd') : null;

        // Build candidate semester params (try short form '1st' then numeric '1')
        const subjectsQueryBase = new URLSearchParams();
        if (studentYearLevelNum) subjectsQueryBase.set('year_level', String(studentYearLevelNum));

        let subjects: any[] = [];

        const semesterCandidates: (string | null)[] = [];
        if (currentSemesterShort) {
          semesterCandidates.push(currentSemesterShort);
          // also try numeric form '1' or '2'
          semesterCandidates.push(currentSemesterShort.startsWith('1') ? '1' : '2');
        } else {
          semesterCandidates.push(null);
        }

        // Try server-side filtered fetches with different semester representations using student-accessible endpoint
        let fetched = false;
        for (const sem of semesterCandidates) {
          try {
            const params = new URLSearchParams(subjectsQueryBase.toString());
            if (sem) params.set('semester', sem);
            console.debug('Trying subjects fetch (student endpoint) with params:', params.toString());
            const subjectsRes = await apiGet(`${API_ENDPOINTS.SUBJECTS_FOR_STUDENT}?${params.toString()}`);
            const rows = subjectsRes.data || subjectsRes.subjects || subjectsRes || [];
            if (Array.isArray(rows) && rows.length > 0) {
              subjects = rows;
              fetched = true;
              break;
            }
            // if returned empty, continue to next candidate
          } catch (err) {
            console.warn('Subjects fetch failed for semester', sem, err);
            // try next candidate
          }
        }

        // If server-side attempts failed or returned empty, try student endpoint without semester
        if (!fetched) {
          try {
            const params = new URLSearchParams();
            if (studentYearLevelNum) params.set('year_level', String(studentYearLevelNum));
            console.debug('Trying subjects fetch (student endpoint) without semester:', params.toString());
            const subjectsRes = await apiGet(`${API_ENDPOINTS.SUBJECTS_FOR_STUDENT}?${params.toString()}`);
            const rows = subjectsRes.data || subjectsRes.subjects || subjectsRes || [];
            if (Array.isArray(rows)) subjects = rows;
          } catch (err) {
            console.error('Failed to fetch subjects from student endpoint fallback', err);
            subjects = [];
          }
        }

        // Fetch teacher assignments to get teacher info for each subject (use student-accessible endpoint if section_id available)
        let teacherAssignments: any[] = [];
        if (studentSectionId) {
          try {
            const taRes = await apiGet(`${API_ENDPOINTS.TEACHER_ASSIGNMENTS_FOR_STUDENT}?section_id=${encodeURIComponent(studentSectionId)}`);
            teacherAssignments = taRes.data || taRes.assignments || taRes || [];
          } catch (err) {
            console.warn('Failed to fetch teacher assignments for student endpoint, trying fallback', err);
            // Fallback: fetch all and filter locally
            try {
              const taRes = await apiGet(API_ENDPOINTS.TEACHER_ASSIGNMENTS);
              teacherAssignments = taRes.data || taRes.assignments || taRes || [];
            } catch (err2) {
              console.warn('Fallback teacher assignments fetch also failed', err2);
            }
          }
        }

        // Build a fast lookup map from subjectId+sectionId => teacher info
        const teacherMap = new Map<string, any>();
        if (Array.isArray(teacherAssignments)) {
          teacherAssignments.forEach((ta: any) => {
            const subjId = ta?.subject?.id ?? ta?.subject_id ?? ta?.subjectId ?? null;
            const teacherObj = {
              id: ta?.teacher_id ?? ta?.teacher?.id ?? null,
              first_name: ta?.teacher?.first_name ?? ta?.teacher?.firstName ?? null,
              last_name: ta?.teacher?.last_name ?? ta?.teacher?.lastName ?? null,
              name: ta?.teacher_name ?? (ta?.teacher?.first_name && ta?.teacher?.last_name ? `${ta.teacher.first_name} ${ta.teacher.last_name}` : null)
            };

            const sections = ta?.sections ?? [];
            if (Array.isArray(sections) && sections.length > 0) {
              sections.forEach((s: any) => {
                const sid = s?.id ?? s?.section_id ?? s ?? null;
                if (subjId != null && sid != null) {
                  teacherMap.set(`${subjId}_${sid}`, teacherObj);
                }
              });
            } else if (subjId != null) {
              // fallback: map subject alone
              teacherMap.set(`${subjId}_*`, teacherObj);
            }
          });
        }

        // Map subjects to course cards with teacher info using the teacherMap
        const mappedCourses = (Array.isArray(subjects) ? subjects : []).map((subject: any) => {
          const subjId = subject?.id ?? subject?.subject_id ?? null;
          let teacherObj = null;

          if (subjId != null) {
            if (studentSectionId) {
              teacherObj = teacherMap.get(`${subjId}_${studentSectionId}`) || teacherMap.get(`${subjId}_*`);
            }

            if (!teacherObj) {
              // as a last resort, find any teacher for the subject
              for (const [key, val] of teacherMap.entries()) {
                if (key.startsWith(`${subjId}_`)) { teacherObj = val; break; }
              }
            }
          }

          const teacherName = teacherObj?.name ?? (teacherObj?.first_name && teacherObj?.last_name ? `${teacherObj.first_name} ${teacherObj.last_name}` : 'TBA');
          const teacherId = teacherObj?.id ?? null;

          return {
            id: subject.id,
            title: subject.course_name || subject.title || subject.name || 'Untitled Course',
            code: subject.course_code || subject.code || 'N/A',
            teacher: teacherName,
            teacherId: teacherId,
            section: student.section_name || studentSectionId || 'N/A',
            credits: subject.units || subject.credits || 3,
            semester: subject.semester || currentSemesterShort || 'N/A',
            yearLevel: subject.year_level ?? subject.yearLevel ?? studentYearLevelRaw ?? 'N/A',
            grade: null // Will be calculated from activities later
          };
        });

        setCourses(mappedCourses);
      } catch (error) {
        console.error('Error fetching courses:', error);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && user?.role === 'student') {
      fetchCourses();
    }
  }, [user, isAuthenticated]);

  const handleViewTeacher = async (teacherId: number | string) => {
    if (!teacherId) {
      // Show a message that teacher info is not available
      setSelectedTeacher({ 
        first_name: 'Not', 
        last_name: 'Assigned',
        email: 'N/A',
        phone: 'N/A',
        employee_id: 'N/A',
        assigned_courses: []
      });
      setTeacherDialogOpen(true);
      return;
    }

    try {
      setLoadingTeacher(true);
      setTeacherDialogOpen(true);
      
      const response = await apiGet(API_ENDPOINTS.TEACHER_BY_ID_PUBLIC(teacherId));
      const teacherData = response.data || response.teacher || response || null;
      
      if (teacherData) {
        setSelectedTeacher(teacherData);
      } else {
        setSelectedTeacher({
          first_name: 'Teacher',
          last_name: 'Information',
          email: 'Not available',
          phone: 'N/A',
          employee_id: 'N/A',
          assigned_courses: []
        });
      }
    } catch (error) {
      console.error('Error fetching teacher details:', error);
      setSelectedTeacher({
        first_name: 'Error',
        last_name: 'Loading',
        email: 'Unable to load teacher information',
        phone: 'N/A',
        employee_id: 'N/A',
        assigned_courses: []
      });
    } finally {
      setLoadingTeacher(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">My Courses</h1>
          <p className="text-muted-foreground">
            {studentInfo ? (
              // Prefer: "Program Description | <year>-<SectionName>" e.g. "Bachelor of Science in Information Technology | 1-F1"
              studentInfo.section_description && studentInfo.section_name && studentInfo.yearLevelNum
                ? `${studentInfo.section_description} | ${studentInfo.yearLevelNum}-${studentInfo.section_name}`
                : `${studentInfo.displayYearLabel || (studentInfo.year_level || studentInfo.yearLevel || 'N/A')} - ${studentInfo.section_name || 'Section'}`
            ) : (
              'View all your enrolled courses'
            )}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading courses...</span>
          </div>
        ) : courses.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">No courses found</p>
              <p className="text-sm text-muted-foreground">
                No courses are available for your year level and the current semester.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
            <Card key={course.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{course.title}</CardTitle>
                <CardDescription>{course.code}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Instructor</span>
                    <button
                      onClick={() => handleViewTeacher(course.teacherId)}
                      className="font-medium text-right flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
                      disabled={!course.teacherId}
                    >
                      <User className="h-3 w-3" />
                      {course.teacher}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Section</span>
                    <Badge variant="secondary">{course.section}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Credits</span>
                    <span className="font-semibold">{course.credits}</span>
                  </div>
                  {course.grade && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Current Grade</span>
                      <Badge className="bg-success text-success-foreground">{course.grade}</Badge>
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate(`/student/courses/${course.id}`)}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
            ))}
          </div>
        )}
      </div>

      {/* Teacher Details Dialog */}
      <Dialog open={teacherDialogOpen} onOpenChange={setTeacherDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Teacher Information</DialogTitle>
            <DialogDescription>
              Contact details and assigned courses
            </DialogDescription>
          </DialogHeader>
          {loadingTeacher ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : selectedTeacher ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {selectedTeacher.first_name} {selectedTeacher.last_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">Instructor</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <IdCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Employee ID:</span>
                  <span className="font-medium">{selectedTeacher.employee_id || 'N/A'}</span>
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                  <a 
                    href={`mailto:${selectedTeacher.email}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {selectedTeacher.email || 'N/A'}
                  </a>
                </div>

                {selectedTeacher.phone && selectedTeacher.phone !== 'N/A' && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Phone:</span>
                    <a 
                      href={`tel:${selectedTeacher.phone}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {selectedTeacher.phone}
                    </a>
                  </div>
                )}
              </div>

              {selectedTeacher.assigned_courses && selectedTeacher.assigned_courses.length > 0 && (
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2 text-sm">Assigned Courses</h4>
                  <div className="space-y-1">
                    {selectedTeacher.assigned_courses.map((course: any, index: number) => (
                      <div key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{course.course || course.code} - {course.title || course.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No teacher information available
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default MyCourses;
