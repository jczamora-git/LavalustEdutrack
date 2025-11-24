import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Save, ArrowLeft, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import { API_ENDPOINTS, apiGet, apiPost } from "@/lib/api";
import { AlertMessage } from "@/components/AlertMessage";
import { useConfirm } from '@/components/Confirm';
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

const GradeInputEdit = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "teacher") {
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate]);

  // Get parameters from URL
  const selectedCourse = searchParams.get("course");
  const selectedSection = searchParams.get("section");
  const selectedTerm = searchParams.get("term") || "midterm";
  const selectedSemester = searchParams.get("semester") || "1st";
  const urlPeriodId = searchParams.get("period_id");

  const [courseInfo, setCourseInfo] = useState({
    code: "",
    title: "",
    teacher: "",
    section: "",
  });

  const [students, setStudents] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [academicPeriods, setAcademicPeriods] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);

  // Helper to categorize activities by grading component
  const categorizeActivities = (activities: any[]) => {
    const written: any[] = [];
    const performance: any[] = [];
    const exam: any[] = [];

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

  // Fetch data on mount
  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      if (!selectedCourse || !selectedSection) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch academic periods first
        const periodsRes = await apiGet(API_ENDPOINTS.ACADEMIC_PERIODS);
        const periodsList = periodsRes.data ?? periodsRes.academic_periods ?? periodsRes ?? [];
        if (mounted && Array.isArray(periodsList)) {
          setAcademicPeriods(periodsList);
        }

        // Determine academic_period_id from URL or semester/term match
        let determinedPeriodId: string | null = urlPeriodId;
        
        if (!determinedPeriodId && Array.isArray(periodsList)) {
          // Match semester and period_type (term) if period_id not in URL
          const matchedPeriod = periodsList.find((p: any) => {
            const periodSemester = (p.semester || '').toLowerCase();
            const periodType = (p.period_type || '').toLowerCase();
            const urlSemester = (selectedSemester || '').toLowerCase();
            const urlTerm = (selectedTerm || '').toLowerCase();
            
            return periodSemester === urlSemester && periodType === urlTerm;
          });
          
          if (matchedPeriod) {
            determinedPeriodId = String(matchedPeriod.id);
          }
        }
        
        if (mounted && determinedPeriodId) {
          setSelectedPeriodId(determinedPeriodId);
        }

        // Fetch course info
        const courseRes = await apiGet(`${API_ENDPOINTS.TEACHER_ASSIGNMENTS}/my`);
        const courseList = courseRes.assigned_courses ?? courseRes.data ?? courseRes.assignments ?? courseRes ?? [];
        if (mounted && Array.isArray(courseList)) {
          setCourses(courseList);
          const foundCourse = courseList.find((c: any) => String((c.subject && c.subject.id) ?? c.subject_id ?? c.subject?.subject_id ?? c.id ?? c.teacher_subject_id) === String(selectedCourse));
          if (foundCourse) {
            const section = Array.isArray(foundCourse.sections) 
              ? foundCourse.sections.find((s: any) => String(s.id ?? s.section_id) === String(selectedSection))
              : null;
            
            setCourseInfo({
              code: foundCourse.course_code ?? '',
              title: foundCourse.course_name ?? '',
              teacher: user?.name ?? '',
              section: section ? (section.name ?? '') : '',
            });
          }
        }

        // Fetch activities - filter by academic_period_id
        let activityQuery = `course_id=${encodeURIComponent(String(selectedCourse))}&section_id=${encodeURIComponent(String(selectedSection))}`;
        if (determinedPeriodId) {
          activityQuery += `&academic_period_id=${encodeURIComponent(determinedPeriodId)}`;
        }
        const actRes = await apiGet(`${API_ENDPOINTS.ACTIVITIES}?${activityQuery}`);
        const actList = actRes.data ?? actRes.activities ?? actRes ?? [];
        
        if (mounted && Array.isArray(actList)) {
          setActivities(actList);
        }

        // Fetch students with grades
        const course = courseList.find((c: any) => String((c.subject && c.subject.id) ?? c.subject_id ?? c.subject?.subject_id ?? c.id ?? c.teacher_subject_id) === String(selectedCourse));
        const yearLevel = course?.year_level ?? null;

        let query = `section_id=${encodeURIComponent(String(selectedSection))}`;
        if (yearLevel) {
          query += `&year_level=${encodeURIComponent(String(yearLevel))}`;
        }
        query += `&include_grades=true`;

        const studRes = await apiGet(`${API_ENDPOINTS.STUDENTS}?${query}`);
        const studList = studRes.data ?? studRes.students ?? studRes ?? [];
        if (mounted && Array.isArray(studList)) {
          setStudents(studList);

          // Transform students into grid row format
          const categorized = categorizeActivities(actList);
          const gridRows = studList.map((st: any) => {
            const row: any = {
              id: st.student_id ?? st.id ?? String(st.id),
              student_db_id: st.id ?? st.student_db_id ?? null,
              name: st.name ?? `${st.first_name ?? ''} ${st.last_name ?? ''}`,
            };

            // Add written work grades
            categorized.written.forEach((act: any, idx: number) => {
              const grade = st.grades?.find((g: any) => String(g.activity_id) === String(act.id));
              row[`w${idx + 1}`] = grade ? parseFloat(grade.grade ?? 0) : 0;
              // also store whether a grade record exists for this activity
              if (!row._grade_exists) row._grade_exists = {};
              row._grade_exists[String(act.id)] = !!grade;
            });

            // Add performance task grades
            categorized.performance.forEach((act: any, idx: number) => {
              const grade = st.grades?.find((g: any) => String(g.activity_id) === String(act.id));
              row[`p${idx + 1}`] = grade ? parseFloat(grade.grade ?? 0) : 0;
              if (!row._grade_exists) row._grade_exists = {};
              row._grade_exists[String(act.id)] = !!grade;
            });

            // Add exam grade
            if (categorized.exam.length > 0) {
              const examTotal = categorized.exam.reduce((sum: number, act: any) => {
                const grade = st.grades?.find((g: any) => String(g.activity_id) === String(act.id));
                if (!row._grade_exists) row._grade_exists = {};
                row._grade_exists[String(act.id)] = !!grade;
                return sum + (grade ? parseFloat(grade.grade ?? 0) : 0);
              }, 0);
              row.exam = examTotal;
            } else {
              row.exam = 0;
            }

            return row;
          });

          setGrades(gridRows);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => { mounted = false; };
  }, [selectedCourse, selectedSection, selectedTerm, selectedSemester, urlPeriodId, user]);

  const confirm = useConfirm();

  const handleCellValueChanged = useCallback((event: any) => {
    (async () => {
      const { data, colDef, newValue, oldValue } = event;
      const field = colDef?.field;
      // `data.id` is the visible student code; use `student_db_id` for DB operations
      const studentDbId = data?.student_db_id ?? data?.id;
      let value = Number(newValue);
      if (Number.isNaN(value)) value = 0;

      // Reject negative scores immediately — show a confirm/error modal instead of toast
      if (value < 0) {
        try { event.node.setDataValue(field, oldValue); } catch (e) {}
        try {
          await confirm({
            title: 'Invalid score',
            description: 'Negative scores are not allowed.',
            confirmText: 'OK',
            variant: 'destructive'
          });
        } catch (e) {
          // ignore confirm errors
        }
        return;
      }

      // Determine which activity this column maps to
      const categorized = categorizeActivities(activities);
      let activity: any = null;
      if (field && field.startsWith('w')) {
        const idx = parseInt(field.slice(1), 10) - 1;
        activity = categorized.written[idx];
      } else if (field && field.startsWith('p')) {
        const idx = parseInt(field.slice(1), 10) - 1;
        activity = categorized.performance[idx];
      } else if (field === 'exam') {
        // If there's a single exam activity, map to it. If multiple, disallow editing aggregated exam.
        if (categorized.exam.length === 1) {
          activity = categorized.exam[0];
        } else {
          // revert to old value and notify user
          try { event.node.setDataValue(field, oldValue); } catch (e) {}
          setToast({ type: 'info', message: 'Multiple exam activities exist. Edit individual exam activity instead.'});
          return;
        }
      } else {
        // Unknown field - just update local state
        setGrades(prev => prev.map((g: any) => g.id === data.id ? data : g));
        return;
      }

      if (!activity || !activity.id) {
        // No mapped activity, revert
        try { event.node.setDataValue(field, oldValue); } catch (e) {}
        setToast({ type: 'error', message: 'Unable to map column to activity.' });
        return;
      }

      const maxScore = parseFloat(activity.max_score ?? 0) || 0;
      let clamped = Math.max(0, Math.min(value, maxScore || value));
      if (value > maxScore && maxScore > 0) {
        // Try truncation similar to ActivityDetail: remove non-digits then trim trailing digits until within range
        let s = String(newValue ?? '');
        s = s.replace(/[^\d]/g, '');
        while (s.length > 0 && Number(s) > maxScore) {
          s = s.slice(0, -1);
        }
        const truncated = s.length > 0 ? s : String(maxScore);
        const truncatedNum = Number(truncated);

        // Ask user to acknowledge truncation
        try {
          const ok = await confirm({
            title: 'Score too high',
            description: `The entered score exceeds the maximum allowed (${maxScore}). It will be truncated to ${truncated}.`,
            emphasis: String(maxScore),
            confirmText: 'OK',
            variant: 'default'
          });
          if (!ok) {
            // user cancelled - revert to old value
            try { event.node.setDataValue(field, oldValue); } catch (e) {}
            return;
          }
        } catch (e) {
          // if confirm errors, proceed with truncation
        }

        clamped = truncatedNum;
        try { event.node.setDataValue(field, clamped); } catch (e) {}
      }

      // Optimistically update local state
      setGrades(prev => prev.map((g: any) => g.id === data.id ? ({ ...data, [field]: clamped }) : g));

      // Send to backend
      try {
        const res = await apiPost(API_ENDPOINTS.ACTIVITY_GRADES(activity.id), { student_id: studentDbId, grade: clamped });
        setToast({ type: 'success', message: res?.message ?? 'Grade saved' });
      } catch (err: any) {
        console.error('Failed saving grade', err);
        // revert on failure
        try { event.node.setDataValue(field, oldValue); } catch (e) {}
        setGrades(prev => prev.map((g: any) => g.id === data.id ? ({ ...data, [field]: oldValue }) : g));
        setToast({ type: 'error', message: err?.message ?? 'Failed to save grade' });
      }
    })();
  }, [activities, confirm]);

  // Alert / toast state
  const [toast, setToast] = useState<{type: 'success'|'error'|'info', message: string} | null>(null);
  const closeToast = () => setToast(null);

  const calculateWrittenTotal = (row: any) => {
    const categorized = categorizeActivities(activities);
    let total = 0;
    categorized.written.forEach((_, idx) => {
      total += (row[`w${idx + 1}`] || 0);
    });
    return total;
  };

  const calculatePerformanceTotal = (row: any) => {
    const categorized = categorizeActivities(activities);
    let total = 0;
    categorized.performance.forEach((_, idx) => {
      total += (row[`p${idx + 1}`] || 0);
    });
    return total;
  };

  const getWrittenMaxScore = () => {
    const categorized = categorizeActivities(activities);
    return categorized.written.reduce((sum, act) => sum + parseFloat(act.max_score ?? 0), 0);
  };

  const getPerformanceMaxScore = () => {
    const categorized = categorizeActivities(activities);
    return categorized.performance.reduce((sum, act) => sum + parseFloat(act.max_score ?? 0), 0);
  };

  const getExamMaxScore = () => {
    const categorized = categorizeActivities(activities);
    return categorized.exam.reduce((sum, act) => sum + parseFloat(act.max_score ?? 0), 0);
  };

  // Filter grades based on search query
  const filteredGrades = useMemo(() => {
    if (!searchQuery.trim()) return grades;
    const query = searchQuery.toLowerCase();
    return grades.filter(g => 
      (g.id ?? '').toString().toLowerCase().includes(query) ||
      (g.name ?? '').toLowerCase().includes(query)
    );
  }, [grades, searchQuery]);

  const columnDefs = useMemo(() => {
    const categorized = categorizeActivities(activities);
    const writtenMaxScore = getWrittenMaxScore();
    const performanceMaxScore = getPerformanceMaxScore();
    const examMaxScore = getExamMaxScore();

    return [
    {
      headerName: "Student Info",
      children: [
        {
          field: "id",
          headerName: "ID",
          width: 120,
          minWidth: 100,
          maxWidth: 160,
          pinned: "left",
          headerClass: 'col-id',
          cellStyle: (params: any) => ({
            fontWeight: params.node.rowPinned ? "700" : "bold",
            color: params.node.rowPinned ? "#374151" : "inherit",
            backgroundColor: params.node.rowPinned ? "#f9fafb" : "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }),
        },
        {
          field: "name",
          headerName: "Learner's Name",
          width: 180,
          minWidth: 140,
          maxWidth: 300,
          pinned: "left",
          // Modern AG Grid React inline component approach
          cellRenderer: (props: any) => {
            const isPinned = props.node && props.node.rowPinned;
            const baseStyle: any = { display: 'flex', alignItems: 'center', height: '100%' };
            if (isPinned) {
              return (
                <div className="student-name" style={{ ...baseStyle, fontWeight: 700 }}>
                  <div className="student-name-line">{props.value}</div>
                </div>
              );
            }
            return (
              <div className="student-name" style={baseStyle}>
                <div className="student-name-line">{props.value}</div>
              </div>
            );
          },
          cellStyle: (params: any) => ({
            backgroundColor: params.node.rowPinned ? "#f9fafb" : "#ffffff",
            fontWeight: params.node.rowPinned ? "700" : "600",
            color: params.node.rowPinned ? "#374151" : "inherit"
          })
        },
      ],
    },
    {
      headerName: "Written Works (30%)",
      headerClass: 'group-header-blue',
      children: [
        ...categorized.written.map((act: any, idx: number) => ({
          field: `w${idx + 1}`,
          headerName: act.title.length > 12 ? act.title.substring(0, 12) + '...' : act.title,
          width: 90,
          editable: (params: any) => !params.node?.rowPinned,
          type: "numericColumn",
          headerTooltip: act.title,
          cellStyle: (params: any) => {
            if (params.node?.rowPinned) return {};
            const value = params.value ?? 0;
            const maxScore = parseFloat(act.max_score ?? 0) || 1;
            if (value === 0) return {};
            const percentage = (value / maxScore) * 100;
            return {
              backgroundColor: percentage >= 75 ? '#d1fae5' : '#fee2e2',
              color: percentage >= 75 ? '#065f46' : '#991b1b',
              fontWeight: '600'
            };
          },
        })),
        {
          headerName: "Total",
          width: 80,
          valueGetter: (params: any) => calculateWrittenTotal(params.data ?? params.node?.data ?? {}),
          cellStyle: (params: any) => ({
            fontWeight: "bold",
            backgroundColor: params.node.rowPinned ? "#f9fafb" : "#dbeafe",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }),
        },
        {
          headerName: "PS",
          width: 80,
          valueGetter: (params: any) => {
            const total = calculateWrittenTotal(params.data ?? params.node?.data ?? {});
            const maxScore = writtenMaxScore || 1;
            return ((total / maxScore) * 100).toFixed(2) + "%";
          },
          cellStyle: (params: any) => ({
            backgroundColor: params.node.rowPinned ? "#f9fafb" : "#dbeafe",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }),
        },
        {
          headerName: "WS",
          width: 80,
          valueGetter: (params: any) => {
            const total = calculateWrittenTotal(params.data ?? params.node?.data ?? {});
            const maxScore = writtenMaxScore || 1;
            return ((total / maxScore) * 30).toFixed(2);
          },
          cellStyle: (params: any) => ({
            fontWeight: "bold",
            backgroundColor: params.node.rowPinned ? "#f9fafb" : "#bfdbfe",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }),
        },
      ],
    },
    {
      headerName: "Performance Tasks (40%)",
      headerClass: 'group-header-green',
      children: [
        ...categorized.performance.map((act: any, idx: number) => ({
          field: `p${idx + 1}`,
          headerName: act.title.length > 12 ? act.title.substring(0, 12) + '...' : act.title,
          width: 90,
          editable: (params: any) => !params.node?.rowPinned,
          type: "numericColumn",
          headerTooltip: act.title,
          cellStyle: (params: any) => {
            if (params.node?.rowPinned) return {};
            const value = params.value ?? 0;
            const maxScore = parseFloat(act.max_score ?? 0) || 1;
            if (value === 0) return {};
            const percentage = (value / maxScore) * 100;
            return {
              backgroundColor: percentage >= 75 ? '#d1fae5' : '#fee2e2',
              color: percentage >= 75 ? '#065f46' : '#991b1b',
              fontWeight: '600'
            };
          },
        })),
        {
          headerName: "Total",
          width: 80,
          valueGetter: (params: any) => calculatePerformanceTotal(params.data ?? params.node?.data ?? {}),
          cellStyle: (params: any) => ({
            fontWeight: "bold",
            backgroundColor: params.node.rowPinned ? "#f9fafb" : "#dcfce7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }),
        },
        {
          headerName: "PS",
          width: 80,
          valueGetter: (params: any) => {
            const total = calculatePerformanceTotal(params.data ?? params.node?.data ?? {});
            const maxScore = performanceMaxScore || 1;
            return ((total / maxScore) * 100).toFixed(2) + "%";
          },
          cellStyle: (params: any) => ({
            backgroundColor: params.node.rowPinned ? "#f9fafb" : "#dcfce7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }),
        },
        {
          headerName: "WS",
          width: 80,
          valueGetter: (params: any) => {
            const total = calculatePerformanceTotal(params.data ?? params.node?.data ?? {});
            const maxScore = performanceMaxScore || 1;
            return ((total / maxScore) * 40).toFixed(2);
          },
          cellStyle: (params: any) => ({
            fontWeight: "bold",
            backgroundColor: params.node.rowPinned ? "#f9fafb" : "#bbf7d0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }),
        },
      ],
    },
    {
      headerName: "Exam (30%)",
      headerClass: 'group-header-amber',
      children: [
        {
          field: "exam",
          headerName: "Score",
          width: 80,
          editable: (params: any) => !params.node?.rowPinned,
          type: "numericColumn",
          cellStyle: (params: any) => {
            if (params.node?.rowPinned) return {};
            const categorized = categorizeActivities(activities);
            const value = params.value ?? 0;
            const maxScore = categorized.exam.reduce((sum: number, act: any) => sum + parseFloat(act.max_score ?? 0), 0) || 1;
            if (value === 0) return {};
            const percentage = (value / maxScore) * 100;
            return {
              backgroundColor: percentage >= 75 ? '#d1fae5' : '#fee2e2',
              color: percentage >= 75 ? '#065f46' : '#991b1b',
              fontWeight: '600'
            };
          },
        },
        {
          headerName: "PS",
          width: 80,
          valueGetter: (params: any) => {
            const exam = (params.data ?? params.node?.data ?? {}).exam || 0;
            const maxScore = examMaxScore || 1;
            return ((exam / maxScore) * 100).toFixed(2) + "%";
          },
          cellStyle: (params: any) => ({
            backgroundColor: params.node.rowPinned ? "#f9fafb" : "#fef3c7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }),
        },
        {
          headerName: "WS",
          width: 80,
          valueGetter: (params: any) => {
            const exam = (params.data ?? params.node?.data ?? {}).exam || 0;
            const maxScore = examMaxScore || 1;
            return ((exam / maxScore) * 30).toFixed(2);
          },
          cellStyle: (params: any) => ({
            fontWeight: "bold",
            backgroundColor: params.node.rowPinned ? "#f9fafb" : "#fde68a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }),
        },
      ],
    },
    {
      headerName: "Midterm Grade",
      headerClass: 'group-header-accent',
      children: [
        {
          headerName: "Initial",
          width: 100,
          valueGetter: (params: any) => {
            const writtenTotal = calculateWrittenTotal(params.data ?? params.node?.data ?? {});
            const writtenWS = (writtenTotal / (writtenMaxScore || 1)) * 30;
            const performanceTotal = calculatePerformanceTotal(params.data ?? params.node?.data ?? {});
            const performanceWS = (performanceTotal / (performanceMaxScore || 1)) * 40;
            const exam = (params.data ?? params.node?.data ?? {}).exam || 0;
            const examWS = (exam / (examMaxScore || 1)) * 30;
            return (writtenWS + performanceWS + examWS).toFixed(2);
          },
          cellStyle: (params: any) => ({
            fontWeight: "bold",
            backgroundColor: params.node.rowPinned ? "#f9fafb" : "#f3e8ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }),
        },
        {
          headerName: "Grade",
          width: 100,
          valueGetter: (params: any) => {
            const writtenTotal = calculateWrittenTotal(params.data ?? params.node?.data ?? {});
            const writtenWS = (writtenTotal / (writtenMaxScore || 1)) * 30;
            const performanceTotal = calculatePerformanceTotal(params.data ?? params.node?.data ?? {});
            const performanceWS = (performanceTotal / (performanceMaxScore || 1)) * 40;
            const exam = (params.data ?? params.node?.data ?? {}).exam || 0;
            const examWS = (exam / (examMaxScore || 1)) * 30;
            const initialGrade = writtenWS + performanceWS + examWS;
            return transmute(initialGrade);
          },
          cellStyle: (params: any) => {
            if (params.node.rowPinned) {
              return {
                backgroundColor: "#f9fafb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "600"
              };
            }
            const writtenTotal = calculateWrittenTotal(params.data);
            const writtenWS = (writtenTotal / (writtenMaxScore || 1)) * 30;
            const performanceTotal = calculatePerformanceTotal(params.data);
            const performanceWS = (performanceTotal / (performanceMaxScore || 1)) * 40;
            const exam = params.data.exam || 0;
            const examWS = (exam / (examMaxScore || 1)) * 30;
            const initialGrade = writtenWS + performanceWS + examWS;
            const gradeStr = transmute(initialGrade);
            const isPass = parseFloat(gradeStr) <= 3.0;
            return {
              fontWeight: "700",
              fontSize: "14px",
              backgroundColor: isPass ? "#d1fae5" : "#fee2e2",
              color: isPass ? "#065f46" : "#991b1b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            };
          },
        },
      ],
    },
  ];
  }, [activities]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: false, // remove filters but keep sorting on header
    resizable: true,
    // center contents vertically and horizontally by default
    cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' },
  }), []);

  // Grid API refs to keep column state persistent and support autosize
  const gridApiRef = useRef<any>(null);
  const columnApiRef = useRef<any>(null);

  // Highest Possible Score (pinned top row) values
  const pinnedTopRow = useMemo(() => {
    const categorized = categorizeActivities(activities);
    const row: any = {
      id: '',
      name: 'HPS →',
      __hps: true,
    };

    // Add written work max scores
    categorized.written.forEach((act: any, idx: number) => {
      row[`w${idx + 1}`] = parseFloat(act.max_score ?? 0);
    });

    // Add performance task max scores
    categorized.performance.forEach((act: any, idx: number) => {
      row[`p${idx + 1}`] = parseFloat(act.max_score ?? 0);
    });

    // Add exam max score
    row.exam = categorized.exam.reduce((sum: number, act: any) => sum + parseFloat(act.max_score ?? 0), 0);

    return row;
  }, [activities]);

  const onGridReady = useCallback((params: any) => {
    gridApiRef.current = params.api;
    columnApiRef.current = params.columnApi;
    // make columns fit initially
    try {
      const allCols = params.columnApi.getAllColumns();
      const colIds = allCols.map((c: any) => c.getId());
      // Auto-size to content first
      params.columnApi.autoSizeColumns(colIds, false);

      // Enforce reasonable limits for some columns (prevent one column from taking all space)
      // Ensure name column isn't overly wide
      try {
        const nameCol = allCols.find((c: any) => c.getId() === 'name');
        if (nameCol) {
          // getActualWidth may be available on column objects depending on AG Grid version
          const actualW = typeof nameCol.getActualWidth === 'function' ? nameCol.getActualWidth() : (nameCol.getWidth ? nameCol.getWidth() : null);
          const maxW = 300;
          const minW = 140;
          if (actualW) {
            const newW = Math.max(minW, Math.min(actualW, maxW));
            params.columnApi.setColumnWidth('name', newW);
          }
        }
      } catch (e) {
        // ignore any sizing errors
      }
    } catch (e) {
      // ignore autosize errors
    }
  }, []);

  const autoSizeAllColumns = useCallback(() => {
    if (!columnApiRef.current) return;
    const allCols = columnApiRef.current.getAllColumns();
    const colIds = allCols.map((c: any) => c.getId());
    columnApiRef.current.autoSizeColumns(colIds, false);
  }, []);

  // When a cell receives focus, select its whole row (but don't select pinned rows)
  const onCellFocused = useCallback((event: any) => {
    if (!gridApiRef.current) return;
    // If the focused cell is on a pinned row (HPS), clear selection
    if (event.rowPinned) {
      try { gridApiRef.current.deselectAll(); } catch (e) {}
      return;
    }
    const rowIndex = event.rowIndex;
    if (typeof rowIndex === 'number' && rowIndex >= 0) {
      const rowNode = gridApiRef.current.getDisplayedRowAtIndex(rowIndex);
      if (rowNode) {
        try {
          gridApiRef.current.forEachNode((node: any) => node.setSelected(false));
        } catch (e) {}
        rowNode.setSelected(true);
      }
    }
  }, []);

  const handleSaveGrades = () => {
    alert("Grades saved successfully!");
    navigate(-1);
  };

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading class record...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col p-4 bg-background">
      {toast && (
        <AlertMessage type={toast.type} message={toast.message} onClose={closeToast} duration={2500} />
      )}
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {courseInfo.code ? `${courseInfo.code} - ${courseInfo.title}` : 'Edit Class Record'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {courseInfo.code ? `Teacher: ${courseInfo.teacher} | Section: ${courseInfo.section}` : (selectedTerm === "midterm" ? "Midterm" : "Final Term")}
            </p>
          </div>
        </div>
        <Button onClick={handleSaveGrades}>
          <Save className="h-4 w-4 mr-2" />
          Save & Close
        </Button>
      </div>

      {/* Course Info Banner */}
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-lg">{courseInfo.code} - {courseInfo.title}</p>
              <p className="text-sm text-muted-foreground">Teacher: {courseInfo.teacher} | Section: {courseInfo.section}</p>
            </div>
            <Badge variant="outline" className="text-xs">
              {selectedSemester} Semester - {selectedTerm === "midterm" ? "Midterm" : "Final Term"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Students Count */}
      <div className="mb-4 flex items-center justify-between px-2">
        <div className="text-sm font-medium">Total Students: {grades.length}</div>
        <div className="text-sm text-muted-foreground">HPS = Highest Possible Score • PS = Percentage Score • WS = Weighted Score</div>
      </div>

      {/* AG Grid Table */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Full Edit View
              </CardTitle>
              <CardDescription>
                Click cells to edit • Drag column borders to resize • Sort by clicking column headers
              </CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search ID / Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-4 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          {/* Add thin borders to every header cell and data cell so grid lines are visible */}
          <style>{`
            .ag-theme-quartz .ag-header-cell, .ag-theme-quartz .ag-cell {
              border-right: 1px solid #adadadff !important;
              border-bottom: 1px solid #adadadff !important;
              box-sizing: border-box;
            }
            .ag-theme-quartz .ag-header-row, .ag-theme-quartz .ag-row {
              border-bottom: none !important;
            }
            .ag-theme-quartz .ag-pinned-left-cols-container .ag-cell,
            .ag-theme-quartz .ag-pinned-right-cols-container .ag-cell {
              border-right: 1px solid #adadadff !important;
            }
            .ag-theme-quartz .ag-header {
              border-bottom: 1px solid #adadadff !important;
            }
            /* Highlight the entire row when it's selected */
            .ag-theme-quartz .ag-row-selected .ag-cell {
              background-color: rgba(59,130,246,0.08) !important;
            }
            .ag-theme-quartz .ag-row-selected .ag-cell.ag-cell-inline-editing {
              background-color: rgba(59,130,246,0.04) !important;
            }
            /* Robust cell alignment - center all cells */
            .ag-theme-quartz .ag-cell {
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
            }
            .ag-theme-quartz .ag-cell-wrapper {
              width: 100% !important;
              height: 100% !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
            }
            .ag-theme-quartz .ag-header-cell-text {
              display: flex !important;
              align-items: center !important;
              justify-content: flex-start !important;
              padding-left: 8px !important;
            }

            /* Left-align pinned (left) columns such as ID and Learner's Name */
            .ag-theme-quartz .ag-pinned-left-cols-container .ag-cell,
            .ag-theme-quartz .ag-pinned-left-cols-container .ag-cell-wrapper {
              justify-content: flex-start !important;
              padding-left: 12px !important;
            }

            /* Also ensure pinned header cells align left */
            .ag-theme-quartz .ag-pinned-left-header .ag-header-cell .ag-header-cell-label,
            .ag-theme-quartz .ag-pinned-left-header .ag-header-cell-text {
              justify-content: flex-start !important;
              padding-left: 8px !important;
            }
          `}</style>
          <div className="ag-theme-quartz h-full" style={{ "--ag-font-size": "13px" } as any}>
            <AgGridReact
              rowData={filteredGrades}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              onCellValueChanged={handleCellValueChanged}
              onCellFocused={onCellFocused}
              onGridReady={onGridReady}
              headerHeight={40}
              groupHeaderHeight={40}
              rowHeight={56}
              // make pinned HPS row same height as header row
              getRowHeight={(params: any) => params.node?.rowPinned ? 40 : 56}
              // apply header-like styling for pinned row (ensure vertical centering)
              getRowStyle={(params: any) => params.node?.rowPinned ? { backgroundColor: '#ffffff', fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center' } : undefined}
              animateRows={true}
              rowSelection="single"
              suppressRowClickSelection={true}
              suppressCellFocus={false}
              pagination={false}
              pinnedTopRowData={[pinnedTopRow]}
              getRowId={(params: any) => {
                // The data object is different for rowData and pinnedRowData
                const rowData = params.data;
                if (rowData.__hps) {
                  return 'hps_row';
                }
                return rowData.id;
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GradeInputEdit;
