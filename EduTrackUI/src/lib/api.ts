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
  
  // Subjects & Sections
  SUBJECTS: `${API_BASE_URL}/api/subjects`,
  SUBJECT_BY_ID: (id: string | number) => `${API_BASE_URL}/api/subjects/${id}`,

  // Teacher assignments
  TEACHER_ASSIGNMENTS: `${API_BASE_URL}/api/teacher-assignments`,
  // Sections
  SECTIONS: `${API_BASE_URL}/api/sections`,
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
