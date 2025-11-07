import { useState, useCallback } from 'react';
import { API_BASE_URL } from '@/lib/api';

export interface Student {
  id: number;
  user_id: number;
  student_id: string;
  year_level: string;
  section_id?: number;
  status: 'active' | 'inactive';
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  user_status: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateStudentRequest {
  yearLevel?: string;
  sectionId?: number;
  status?: 'active' | 'inactive';
}

export interface StudentStats {
  total: number;
  active: number;
  inactive: number;
  by_year_level: Array<{
    year_level: string;
    count: number;
  }>;
}

export interface UseStudentsReturn {
  students: Student[];
  stats: StudentStats | null;
  loading: boolean;
  error: string | null;
  getStudents: (filters?: Record<string, string>) => Promise<void>;
  getStudent: (id: number) => Promise<Student | null>;
  getStudentByUserId: (userId: number) => Promise<Student | null>;
  updateStudent: (id: number, data: UpdateStudentRequest) => Promise<Student | null>;
  deleteStudent: (id: number) => Promise<boolean>;
  getStats: () => Promise<void>;
}

export const useStudents = (): UseStudentsReturn => {
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStudents = useCallback(async (filters?: Record<string, string>) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams(filters || {});
      const response = await fetch(
        `${API_BASE_URL}/api/students?${queryParams}`,
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch students');
      const data = await response.json();
      setStudents(data.data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const getStudent = useCallback(async (id: number): Promise<Student | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/students/${id}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch student');
      const data = await response.json();
      return data.data || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getStudentByUserId = useCallback(
    async (userId: number): Promise<Student | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/students/by-user/${userId}`,
          {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) throw new Error('Failed to fetch student');
        const data = await response.json();
        return data.data || null;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateStudent = useCallback(
    async (id: number, data: UpdateStudentRequest): Promise<Student | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/students/${id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error('Failed to update student');
        const result = await response.json();

        if (result.data) {
          setStudents((prev) =>
            prev.map((s) => (s.id === id ? result.data : s))
          );
        }
        return result.data || null;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteStudent = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/students/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to delete student');
      setStudents((prev) => prev.filter((s) => s.id !== id));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const getStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/students/stats`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data.data || null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    students,
    stats,
    loading,
    error,
    getStudents,
    getStudent,
    getStudentByUserId,
    updateStudent,
    deleteStudent,
    getStats,
  };
};
