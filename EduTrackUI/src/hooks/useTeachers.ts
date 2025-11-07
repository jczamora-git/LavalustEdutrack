import { useState, useCallback } from 'react';
import { API_BASE_URL } from '@/lib/api';

export interface Teacher {
  id: number;
  user_id: number;
  employee_id: string;
  hire_date?: string;
  department?: string;
  specialization?: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  user_status: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateTeacherRequest {
  department?: string;
  specialization?: string;
  hireDate?: string;
}

export interface TeacherStats {
  total: number;
  active: number;
  inactive: number;
}

export interface UseTeachersReturn {
  teachers: Teacher[];
  stats: TeacherStats | null;
  loading: boolean;
  error: string | null;
  getTeachers: (filters?: Record<string, string>) => Promise<void>;
  getTeacher: (id: number) => Promise<Teacher | null>;
  updateTeacher: (id: number, data: UpdateTeacherRequest) => Promise<Teacher | null>;
  deleteTeacher: (id: number) => Promise<boolean>;
  getStats: () => Promise<void>;
}

export const useTeachers = (): UseTeachersReturn => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTeachers = useCallback(async (filters?: Record<string, string>) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams(filters || {});
      const response = await fetch(
        `${API_BASE_URL}/api/teachers?${queryParams}`,
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch teachers');
      const data = await response.json();
      setTeachers(data.teachers || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const getTeacher = useCallback(async (id: number): Promise<Teacher | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/teachers/${id}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch teacher');
      const data = await response.json();
      return data.teacher || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTeacher = useCallback(
    async (id: number, data: UpdateTeacherRequest): Promise<Teacher | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/teachers/${id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error('Failed to update teacher');
        const result = await response.json();

        if (result.teacher) {
          setTeachers((prev) =>
            prev.map((t) => (t.id === id ? result.teacher : t))
          );
        }
        return result.teacher || null;
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

  const deleteTeacher = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/teachers/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to delete teacher');
      setTeachers((prev) => prev.filter((t) => t.id !== id));
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
      const response = await fetch(`${API_BASE_URL}/api/teachers/stats`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data.stats || null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    teachers,
    stats,
    loading,
    error,
    getTeachers,
    getTeacher,
    updateTeacher,
    deleteTeacher,
    getStats,
  };
};
