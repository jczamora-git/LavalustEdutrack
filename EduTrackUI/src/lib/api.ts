// API Configuration for LavaLust Backend
// Use empty string for development (Vite proxy), or full URL for production
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const API_ENDPOINTS = {
  // Authentication
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  REGISTER: `${API_BASE_URL}/api/auth/register`,
  LOGOUT: `${API_BASE_URL}/api/auth/logout`,
  ME: `${API_BASE_URL}/api/auth/me`,
  CHECK: `${API_BASE_URL}/api/auth/check`,
  
  // User Management
  USERS: `${API_BASE_URL}/api/users`,
  USER_BY_ID: (id: string | number) => `${API_BASE_URL}/api/users/${id}`,
  
  // Teacher Management
  TEACHERS: `${API_BASE_URL}/api/teachers`,
  TEACHER_BY_ID: (id: string | number) => `${API_BASE_URL}/api/teachers/${id}`,
  TEACHER_STATS: `${API_BASE_URL}/api/teachers/stats`,
  
  // Student Management
  STUDENTS: `${API_BASE_URL}/api/students`,
  STUDENT_BY_ID: (id: string | number) => `${API_BASE_URL}/api/students/${id}`,
  STUDENT_BY_USER: (user_id: string | number) => `${API_BASE_URL}/api/students/by-user/${user_id}`,
  STUDENTS_IMPORT: `${API_BASE_URL}/api/students/import`,
  STUDENTS_EXPORT: `${API_BASE_URL}/api/students/export`,
  
  // Subjects
  SUBJECTS: `${API_BASE_URL}/api/subjects`,
  SUBJECT_BY_ID: (id: string | number) => `${API_BASE_URL}/api/subjects/${id}`,
  SUBJECTS_FOR_STUDENT: `${API_BASE_URL}/api/subjects/for-student`,

  // Year levels & year_level_sections
  YEAR_LEVELS: `${API_BASE_URL}/api/year-levels`,
  YEAR_LEVEL_SECTIONS: `${API_BASE_URL}/api/year-level-sections`,

  // Teacher assignments
  TEACHER_ASSIGNMENTS: `${API_BASE_URL}/api/teacher-assignments`,
  TEACHER_ASSIGNMENTS_BY_TEACHER: (teacher_id: string | number) => `${API_BASE_URL}/api/teacher-assignments/by-teacher/${teacher_id}`,
  TEACHER_ASSIGNMENTS_FOR_STUDENT: `${API_BASE_URL}/api/teacher-assignments/for-student`,
  TEACHER_BY_ID_PUBLIC: (id: string | number) => `${API_BASE_URL}/api/teachers/${id}/public`,
  // Student subjects (enrollments)
  STUDENT_SUBJECTS: `${API_BASE_URL}/api/student-subjects`,
  // Sections
  SECTIONS: `${API_BASE_URL}/api/sections`,

  // Activities (Grade Transparency)
  ACTIVITIES: `${API_BASE_URL}/api/activities`,
  ACTIVITY_BY_ID: (id: string | number) => `${API_BASE_URL}/api/activities/${id}`,
  ACTIVITY_GRADES: (id: string | number) => `${API_BASE_URL}/api/activities/${id}/grades`,
  ACTIVITY_GRADES_BY_PARAMS: `${API_BASE_URL}/api/activity-grades`,
  ACTIVITIES_STUDENT_GRADES: `${API_BASE_URL}/api/activities/student-grades`,
  ACTIVITIES_STUDENT_ALL: `${API_BASE_URL}/api/activities/student-all`,
  EXPORT_CLASS_RECORD: `${API_BASE_URL}/api/activities/export-class-record`,
  EXPORT_CLASS_RECORD_EXCEL: `${API_BASE_URL}/api/activities/export-class-record-excel`,
  
  // Academic periods
  ACADEMIC_PERIODS: `${API_BASE_URL}/api/academic-periods`,
  ACADEMIC_PERIODS_STATS: `${API_BASE_URL}/api/academic-periods/stats`,
  ACADEMIC_PERIODS_ACTIVE: `${API_BASE_URL}/api/academic-periods/active`,
  ACADEMIC_PERIODS_GRADING_CONTEXT: `${API_BASE_URL}/api/academic-periods/grading-context`,
  ACADEMIC_PERIODS_CURRENT_SUBJECTS: `${API_BASE_URL}/api/academic-periods/current-subjects`,
  ACADEMIC_PERIOD_BY_ID: (id: string | number) => `${API_BASE_URL}/api/academic-periods/${id}`,
  ACADEMIC_PERIOD_SET_ACTIVE: (id: string | number) => `${API_BASE_URL}/api/academic-periods/${id}/set-active`,
  // Campuses (location for attendance)
  CAMPUSES: `${API_BASE_URL}/api/campuses`,
  CAMPUS_BY_ID: (id: string | number) => `${API_BASE_URL}/api/campuses/${id}`,
  // Announcements
  ANNOUNCEMENTS: `${API_BASE_URL}/api/announcements`,
  ANNOUNCEMENT_BY_ID: (id: string | number) => `${API_BASE_URL}/api/announcements/${id}`,
  // Attendance
  ATTENDANCE_MARK: `${API_BASE_URL}/api/attendance/mark`,
  ATTENDANCE_STUDENT: (id: string | number) => `${API_BASE_URL}/api/attendance/student/${id}`,
  ATTENDANCE_COURSE: (id: string | number) => `${API_BASE_URL}/api/attendance/course/${id}`,
  
  // Final Grades
  FINAL_GRADES: `${API_BASE_URL}/api/final-grades`,
  FINAL_GRADES_SUBMIT: `${API_BASE_URL}/api/final-grades/submit`,

  // PDF Reports
  REPORTS_STUDENTS: `${API_BASE_URL}/api/reports/students`,
  REPORTS_STUDENT_PDF: (id: string | number) => `${API_BASE_URL}/api/reports/student/${id}/pdf`,
  REPORTS_BULK_PDF: `${API_BASE_URL}/api/reports/bulk/pdf`,
};

// API helper functions
export async function apiPost(url: string, data: any) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important for session cookies
    body: JSON.stringify(data),
  });

  const text = await response.text();

  if (!response.ok) {
    // Try to parse error body if present, otherwise throw a generic error
    try {
      const parsed = text ? JSON.parse(text) : {};
      throw new Error(parsed.message || 'Request failed');
    } catch (e: any) {
      throw new Error((e && e.message) || 'Request failed');
    }
  }

  // If response body is empty (204, 201 with no JSON, etc.), return a success-ish object
  if (!text) return { success: true };

  try {
    return JSON.parse(text);
  } catch (e) {
    // If parsing fails, return an object so callers don't crash
    return { success: true };
  }
}

export async function apiGet(url: string) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important for session cookies
  });

  const text = await response.text();

  if (!response.ok) {
    try {
      const parsed = text ? JSON.parse(text) : {};
      throw new Error(parsed.message || 'Request failed');
    } catch (e: any) {
      throw new Error((e && e.message) || 'Request failed');
    }
  }

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch (e) {
    return {};
  }
}

export async function apiPut(url: string, data: any) {
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important for session cookies
    body: JSON.stringify(data),
  });

  const text = await response.text();

  if (!response.ok) {
    try {
      const parsed = text ? JSON.parse(text) : {};
      throw new Error(parsed.message || 'Request failed');
    } catch (e: any) {
      throw new Error((e && e.message) || 'Request failed');
    }
  }

  if (!text) return { success: true };

  try {
    return JSON.parse(text);
  } catch (e) {
    return { success: true };
  }
}

export async function apiDelete(url: string) {
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important for session cookies
  });

  const text = await response.text();

  if (!response.ok) {
    try {
      const parsed = text ? JSON.parse(text) : {};
      throw new Error(parsed.message || 'Request failed');
    } catch (e: any) {
      throw new Error((e && e.message) || 'Request failed');
    }
  }

  if (!text) return { success: true };

  try {
    return JSON.parse(text);
  } catch (e) {
    return { success: true };
  }
}

/**
 * Upload file (multipart/form-data)
 * @param url API endpoint
 * @param file File object to upload
 * @param fieldName Form field name (default: 'file')
 * @param additionalData Optional additional form fields
 */
export async function apiUploadFile(url: string, file: File, fieldName: string = 'file', additionalData?: Record<string, string>) {
  const formData = new FormData();
  formData.append(fieldName, file);

  // Add any additional form fields
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include', // Important for session cookies
    body: formData,
    // Don't set Content-Type header - browser will set it with boundary
  });

  const text = await response.text();

  if (!response.ok) {
    try {
      const parsed = text ? JSON.parse(text) : {};
      throw new Error(parsed.message || 'Upload failed');
    } catch (e: any) {
      throw new Error((e && e.message) || 'Upload failed');
    }
  }

  if (!text) return { success: true };

  try {
    return JSON.parse(text);
  } catch (e) {
    return { success: true };
  }
}

