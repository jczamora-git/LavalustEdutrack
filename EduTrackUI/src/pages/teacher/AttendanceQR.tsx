import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { API_ENDPOINTS, apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useNotification } from '@/hooks/useNotification';
import { MapPin, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const AttendanceQR: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scanned, setScanned] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string>('');
  const [campusId, setCampusId] = useState<string>('1');
  const [courses, setCourses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [courseYearLevel, setCourseYearLevel] = useState<number | string | null>(null);
  const [sectionStudents, setSectionStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [teacherLocation, setTeacherLocation] = useState<any>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [studentData, setStudentData] = useState<any>(null);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const { user } = useAuth();
  const notify = useNotification();
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Get teacher's location on component mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setTeacherLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationError(null);
        },
        (error) => {
          setLocationError('Unable to get location: ' + error.message);
        }
      );
    }

    // fetch teacher courses & campuses
    if (user) {
      fetchTeacherCourses().catch(() => {});
      fetchCampuses().catch(() => {});
      fetchTodayAttendance().catch(() => {});
    }

    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTeacherCourses = async () => {
    if (!user) return;
    try {
      const tries = [
        `${API_ENDPOINTS.TEACHER_ASSIGNMENTS}/my`,
        API_ENDPOINTS.TEACHER_ASSIGNMENTS_BY_TEACHER(user.id),
        `${API_ENDPOINTS.TEACHER_ASSIGNMENTS}?user_id=${encodeURIComponent(user.id)}`,
      ];

      for (const url of tries) {
        try {
          const res = await apiGet(url);
          if (!res) continue;

          // try different response shapes (same as Courses.tsx)
          const assigned = res.assigned_courses || res.assignments || (res.teacher && res.teacher.assigned_courses) || res;
          if (Array.isArray(assigned) && assigned.length > 0) {
            const mapped = assigned.map((c: any, idx: number) => ({
              id: c.id ?? c.subject_id ?? idx,
              title: c.course_name || c.course || c.title || '',
              code: c.course_code || c.code || '',
              year_level: c.year_level ?? c.yearLevel ?? c.year ?? null,
              sections: Array.isArray(c.sections) ? c.sections.map((s: any) => ({ 
                id: s.id ?? s.section_id, 
                name: s.name 
              })) : [],
            }));
            setCourses(mapped);
            // if no course selected yet, pick first
            if (!courseId && mapped.length > 0) {
              setCourseId(String(mapped[0].id));
              setSections(mapped[0].sections || []);
              setCourseYearLevel(mapped[0].year_level);
              // Auto-select the first section if available and pre-load its students
              const firstSection = mapped[0].sections && mapped[0].sections.length > 0 ? mapped[0].sections[0] : null;
              if (firstSection) {
                setSelectedSectionId(String(firstSection.id));
                // fetch students for the default section
                fetchSectionStudents(firstSection.id, mapped[0].year_level).catch(() => {});
              }
            }
            return;
          }
        } catch (e) {
          // try next
        }
      }
    } catch (e) {
      // ignore
    }
  };

  const fetchCampuses = async () => {
    try {
      const res = await apiGet(API_ENDPOINTS.CAMPUSES);
      if (Array.isArray(res) && res.length > 0) {
        setCampusId(String(res[0].id));
      }
    } catch (e) {
      // ignore
    }
  };

  const fetchSectionStudents = async (sectionId: string | number, yearLevel: number | string | null = null) => {
    if (!sectionId) return;
    try {
      setLoadingStudents(true);
      const stuParams = new URLSearchParams();
      stuParams.set('section_id', String(sectionId));
      if (yearLevel) stuParams.set('year_level', String(yearLevel));
      
      const stuRes = await apiGet(`${API_ENDPOINTS.STUDENTS}?${stuParams.toString()}`);
      const list = stuRes.data ?? stuRes.students ?? stuRes ?? [];
      
      if (Array.isArray(list)) {
        const normalized = list.map((st: any) => ({
          // preserve multiple id shapes so we can match scanned QR payloads that may contain user_id, student_id, or db id
          dbId: st.id ?? null,
          userId: st.user_id ?? null,
          studentId: st.student_id ?? null,
          // legacy "id" field to keep existing code compatibility (prefer student_id if present)
          id: st.student_id ?? st.id ?? st.user_id ?? String(st.id),
          name: (st.first_name && st.last_name) ? `${st.first_name} ${st.last_name}` : (st.name ?? `${st.firstName ?? ''} ${st.lastName ?? ''}`),
          email: st.email ?? st.user_email ?? '',
          status: st.status ?? st.user_status ?? 'active',
          raw: st
        }));
        setSectionStudents(normalized);
      } else {
        setSectionStudents([]);
      }
    } catch (e) {
      setSectionStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchStudentProfile = async (studentId: string | number) => {
    setLoadingStudent(true);
    try {
      const res = await apiGet(`${API_ENDPOINTS.STUDENTS}/${studentId}`);
      if (res && res.data) {
        setStudentData(res.data);
      } else if (res) {
        setStudentData(res);
      }
    } catch (e) {
      // try generic student fetch
      try {
        const students = await apiGet(API_ENDPOINTS.STUDENTS);
        if (Array.isArray(students)) {
          const found = students.find((s: any) => String(s.id) === String(studentId));
          setStudentData(found || { id: studentId, name: `Student ${studentId}` });
        }
      } catch (ee) {
        setStudentData({ id: studentId, name: `Student ${studentId}` });
      }
    } finally {
      setLoadingStudent(false);
    }
  };

  const startCamera = async () => {
    setError(null);
    setScanned(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      tick();
    } catch (e: any) {
      setError('Unable to access camera: ' + (e.message || String(e)));
      notify.error('Camera access denied');
    }
  };

  const stopCamera = () => {
    setScanning(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const tick = () => {
    if (!videoRef.current || !canvasRef.current) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code && code.data) {
        // call async handler (don't await here to keep animation loop responsive)
        void handleDecoded(code.data);
      }
    } catch (e) {
      // ignore drawing errors
    }

    rafRef.current = requestAnimationFrame(tick);
  };

  const handleDecoded = (data: string) => {
    stopCamera();
    let parsed: any = null;
    try {
      parsed = JSON.parse(data);
    } catch (e) {
      parsed = { student_id: data };
    }

    if (!parsed || (!parsed.student_id && !parsed.id)) {
      setError('Invalid QR payload');
      notify.error('Invalid QR payload');
      return;
    }

    const studentId = parsed.student_id ?? parsed.id;
    setScanned({ raw: data, student_id: studentId, payload: parsed });

    // Validate QR expiry if payload contains expires_at
    if (parsed.expires_at) {
      const currentTimeMs = Date.now();
      const expiresAtMs = parsed.expires_at;

      if (currentTimeMs > expiresAtMs) {
        setValidationResult({
          valid: false,
          reason: 'QR code has expired',
          expiresAt: new Date(expiresAtMs).toLocaleTimeString()
        });
        notify.error('QR code has expired');
        return;
      }
    }

    // Validate student is enrolled in selected section using currently-loaded sectionStudents
    let matchedStudent: any = null;
    if (selectedSectionId) {
      if (sectionStudents.length > 0) {
        const sid = String(studentId);
        matchedStudent = sectionStudents.find((s) => {
          return (s.studentId && String(s.studentId) === sid) || (s.userId && String(s.userId) === sid) || (s.dbId && String(s.dbId) === sid) || String(s.id) === sid;
        });

        if (!matchedStudent) {
          setValidationResult({ valid: false, reason: `Student ${studentId} is not enrolled in this section`, studentId });
          notify.error(`Student ${studentId} is not enrolled in the selected section`);
          return;
        }
      } else {
        setValidationResult({ valid: false, reason: 'Student roster not loaded; please wait', studentId });
        notify.error('Student roster not loaded; please wait and scan again');
        return;
      }
    }

    // Validation passed
    setValidationResult({ valid: true, reason: 'QR code is valid and ready to mark', studentId, isEnrolled: !!matchedStudent });

    // If we matched a student from the section list, use that record for the modal; otherwise fetch profile
    if (matchedStudent) {
      setStudentData(matchedStudent.raw ?? matchedStudent);
    } else {
      fetchStudentProfile(studentId);
    }

    setShowModal(true);
    notify.success('QR scanned: ' + String(studentId));
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setScanned(null);
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      URL.revokeObjectURL(url);
      if (code && code.data) {
        handleDecoded(code.data);
      } else {
        setError('No QR code found in image');
        notify.error('No QR code found in image');
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError('Failed to load image');
    };
  };

  const fetchTodayAttendance = async () => {
    if (!user?.id || !courseId) return;

    setLoadingAttendance(true);
    try {
      const res = await apiGet(`${API_ENDPOINTS.ATTENDANCE_COURSE(courseId)}?teacher_id=${user.id}`);
      if (res && res.success && Array.isArray(res.data)) {
        // Filter for today's records
        const today = new Date().toISOString().split('T')[0];
        const todayRecords = res.data.filter((record: any) => {
          const recordDate = new Date(record.created_at).toISOString().split('T')[0];
          return recordDate === today;
        });
        setAttendanceRecords(todayRecords);
      } else {
        setAttendanceRecords([]);
      }
    } catch (e: any) {
      console.error('Failed to fetch attendance records:', e);
      setAttendanceRecords([]);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const markPresent = async () => {
    if (!scanned || !courseId || !campusId) {
      notify.error('Please select a course and scan a QR code');
      return;
    }

    if (!user?.id) {
      notify.error('Teacher ID not found');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        student_id: scanned.student_id,
        teacher_id: user.id,
        course_id: parseInt(courseId),
        campus_id: parseInt(campusId),
        qr_payload: scanned.payload,
        teacher_location: teacherLocation,
        dev_mode: devMode
      };

      const res = await apiPost(API_ENDPOINTS.ATTENDANCE_MARK, payload);

      if (res && res.success) {
        notify.success(`Attendance marked: ${res.status || 'present'}`);
        setScanned(null);
        setValidationResult(null);
        setShowModal(false);
        setStudentData(null);
        setError(null);
        // Refresh attendance records
        await fetchTodayAttendance();
      } else {
        notify.error(res?.message || 'Failed to mark attendance');
      }
    } catch (e: any) {
      notify.error('Failed to mark attendance: ' + (e.message || String(e)));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCourse = courses.find(c => String(c.id) === String(courseId));
  const selectedCourseCode = selectedCourse?.code || 'Course';

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 md:p-8 pt-20 md:pt-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Attendance Scanner
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Scan student QR codes to mark attendance for your assigned courses
          </p>
        </div>

        {/* Configuration Card */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-muted border-b">
            <CardTitle className="text-lg font-semibold">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Course Selection */}
              <div>
                <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block">
                  Subject/Course *
                </label>
                <Select value={String(courseId)} onValueChange={(v) => {
                  setCourseId(String(v));
                  const c = courses.find((x) => String(x.id) === String(v));
                  setSections(c?.sections || []);
                  setCourseYearLevel(c?.year_level || null);
                  setSelectedSectionId('');
                  setSectionStudents([]);
                  // Fetch today's attendance for the selected course
                  fetchTodayAttendance();
                }}>
                  <SelectTrigger className="rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white">
                    <SelectValue placeholder={courses.length ? 'Select course' : 'Loading...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.code} - {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Section Selection */}
              <div>
                <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block">
                  Section
                </label>
                <Select value={String(selectedSectionId)} onValueChange={(v) => {
                  setSelectedSectionId(String(v));
                  // Fetch students when section is selected
                  fetchSectionStudents(v, courseYearLevel);
                }}>
                  <SelectTrigger className="rounded-xl border-2 border-gray-200 focus:border-blue-500 bg-white">
                    <SelectValue placeholder={sections.length ? 'Select section' : 'No sections'} />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.length > 0 && sections.map((s) => (
                      <SelectItem key={s.id ?? s.name} value={String(s.id ?? s.name)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dev Mode Toggle */}
              <div className="flex items-end">
                <label className="text-xs sm:text-sm font-semibold cursor-pointer flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 transition-colors w-full">
                  <input
                    type="checkbox"
                    checked={devMode}
                    onChange={(e) => setDevMode(e.target.checked)}
                    className="rounded w-4 h-4 cursor-pointer"
                  />
                  <span className="text-gray-700">Dev Mode</span>
                </label>
              </div>
            </div>

            {/* Info Row */}
            {teacherLocation && (
              <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-start gap-3">
                <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-blue-800">
                  <p className="font-semibold">Your Location</p>
                  <p className="font-mono">{teacherLocation.lat.toFixed(5)}, {teacherLocation.lng.toFixed(5)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scanner Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Camera Scanner Card */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-muted/50 to-muted border-b">
              <CardTitle className="text-lg font-semibold">Camera Scanner</CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex flex-col gap-4">
              <div className="w-full rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                <video
                  ref={videoRef}
                  className={`w-full h-full object-cover ${scanning ? '' : 'hidden'}`}
                />
                {!scanning && (
                  <div className="text-center text-white text-sm">Camera not running</div>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />

              <div className="flex flex-col sm:flex-row gap-3">
                {!scanning ? (
                  <>
                    <Button
                      onClick={startCamera}
                      disabled={!selectedSectionId}
                      title={!selectedSectionId ? 'Select a section first' : 'Start camera to scan QR codes'}
                      className={`flex-1 ${!selectedSectionId ? 'opacity-60 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600'} text-white font-semibold rounded-xl py-2.5`}
                    >
                      Start Camera
                    </Button>
                    {!selectedSectionId && (
                      <p className="text-xs text-muted-foreground mt-2">Please select a section before starting the camera.</p>
                    )}
                  </>
                ) : (
                  <Button
                    onClick={stopCamera}
                    variant="outline"
                    className="flex-1 rounded-xl border-2 border-gray-300 font-semibold"
                  >
                    Stop Camera
                  </Button>
                )}

                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    className="w-full rounded-xl border-2 border-gray-300 font-semibold"
                    asChild
                  >
                    <span>Upload Image</span>
                  </Button>
                </label>
              </div>

              {error && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-red-700 font-medium">{error}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attendance Records Card */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-muted/50 to-muted border-b">
              <CardTitle className="text-lg font-semibold">Today's Attendance</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {loadingAttendance ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Loading attendance records...</p>
                </div>
              ) : attendanceRecords.length > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 mb-4 px-3 py-2 bg-gray-100 rounded-lg text-xs font-semibold text-gray-700">
                    <div>Student</div>
                    <div>Time</div>
                    <div>Status</div>
                  </div>
                  {attendanceRecords.map((record: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                      <div>
                        <div className="font-semibold text-gray-900">{(record.first_name || record.last_name) ? `${record.first_name || ''} ${record.last_name || ''}`.trim() : (record.student_code ?? record.student_id)}</div>
                        <div className="text-xs text-gray-600 mt-1">{record.student_code ?? ''}</div>
                      </div>
                      <div className="text-gray-600">
                        {new Date(record.created_at).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit', 
                          hour12: true 
                        })}
                      </div>
                      <div>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          record.status === 'present' ? 'bg-green-100 text-green-700' :
                          record.status === 'out_of_range' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {record.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-2">No attendance records yet</p>
                  <p className="text-xs text-muted-foreground">
                    Attendance records for today will appear here as you scan student QR codes.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Student Profile Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md border-0 shadow-2xl rounded-2xl overflow-hidden p-0">
          {/* Header */}
          <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white">
            <DialogTitle className="text-lg font-bold">Confirm Attendance</DialogTitle>
            <p className="text-sm font-medium opacity-95 mt-1">Review student details before marking</p>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-5">
            {loadingStudent ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Loading student profile...</p>
              </div>
            ) : studentData ? (
              <>
                {/* Student Profile Card */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                      {((studentData.first_name || studentData.name)?.charAt(0) || 'S').toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {studentData.first_name && studentData.last_name
                          ? `${studentData.first_name} ${studentData.last_name}`
                          : (studentData.name || `Student ${studentData.id}`)}
                      </p>
                      <p className="text-sm text-gray-600">ID: {studentData.student_id || studentData.id}</p>
                      {studentData.email && <p className="text-sm text-gray-600">{studentData.email}</p>}
                    </div>
                  </div>
                </div>

                {/* Course & Section Info */}
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Subject/Course</p>
                    <p className="font-semibold text-gray-900">{selectedCourseCode}</p>
                  </div>
                  {selectedSectionId && (
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                      <p className="text-xs font-semibold text-gray-600 mb-1">Section</p>
                      <p className="font-semibold text-gray-900">{sections.find(s => String(s.id ?? s.name) === String(selectedSectionId))?.name || selectedSectionId}</p>
                    </div>
                  )}
                </div>

                {/* Location Info */}
                {scanned?.payload?.location && (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-xs font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Student Location
                    </p>
                    <p className="font-mono text-sm text-blue-800">
                      {scanned.payload.location.lat.toFixed(5)}, {scanned.payload.location.lng.toFixed(5)}
                    </p>
                  </div>
                )}

                {/* QR Payload Data */}
                {scanned && (
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <p className="text-xs font-semibold text-gray-900 mb-2">QR Data</p>
                    <pre className="text-xs p-2 bg-white rounded border border-gray-300 overflow-auto max-h-40 font-mono text-gray-700">
                      {JSON.stringify(scanned.payload ?? scanned.raw, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Dev Mode Indicator */}
                {devMode && (
                  <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                    <p className="text-xs font-semibold text-yellow-900">⚙️ Dev Mode Active</p>
                    <p className="text-xs text-yellow-700 mt-1">Location validation is bypassed for development.</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t">
                  <Button
                    onClick={markPresent}
                    disabled={submitting || !courseId}
                    className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Marking...' : 'Mark Present'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowModal(false)}
                    className="rounded-xl border-2 border-gray-300 font-semibold"
                  >
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Unable to load student profile</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AttendanceQR;
