import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS, apiPost, apiGet } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'teacher' | 'admin';
}

interface RegistrationResponse {
  success: boolean;
  message?: string;
  // email_result comes from the backend and may include send status and message
  email_result?: {
    success: boolean;
    message?: string;
  };
  user?: any;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, firstName: string, lastName: string, role: string) => Promise<RegistrationResponse>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  checkUser: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Initialize user from localStorage on mount
    try {
      const stored = localStorage.getItem('edutrack_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const navigate = useNavigate();

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await apiPost(API_ENDPOINTS.LOGIN, { email, password });
      
      if (response.success && response.user) {
        const userData: User = {
          id: response.user.id.toString(),
          email: response.user.email,
          name: `${response.user.first_name} ${response.user.last_name}`,
          role: response.user.role as 'student' | 'teacher' | 'admin',
        };
        
        setUser(userData);
        localStorage.setItem('edutrack_user', JSON.stringify(userData));
        
        // Navigate based on role
        switch (userData.role) {
          case 'student':
            navigate('/student/dashboard');
            break;
          case 'teacher':
            navigate('/teacher/dashboard');
            break;
          case 'admin':
            navigate('/admin/dashboard');
            break;
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (
    email: string, 
    password: string, 
    firstName: string, 
    lastName: string, 
    role: string
  ): Promise<RegistrationResponse> => {
    try {
      const response = await apiPost(API_ENDPOINTS.REGISTER, {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        role,
      });

      // Return the full response so callers can inspect email_result
      return response;
    } catch (error: any) {
      console.error('Registration error:', error);
      return { success: false, message: error.message || 'Registration failed' };
    }
  };

  const logout = async () => {
    try {
      await apiGet(API_ENDPOINTS.LOGOUT);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('edutrack_user');
      navigate('/auth');
    }
  };

  const checkUser = async (): Promise<boolean> => {
    try {
      const response = await apiGet(API_ENDPOINTS.CHECK);
      
      if (response.authenticated && response.user) {
        const userData: User = {
          id: response.user.id.toString(),
          email: response.user.email,
          name: `${response.user.first_name} ${response.user.last_name}`,
          role: response.user.role as 'student' | 'teacher' | 'admin',
        };
        
        setUser(userData);
        localStorage.setItem('edutrack_user', JSON.stringify(userData));
        
        // Navigate based on role
        switch (userData.role) {
          case 'student':
            navigate('/student/dashboard');
            break;
          case 'teacher':
            navigate('/teacher/dashboard');
            break;
          case 'admin':
            navigate('/admin/dashboard');
            break;
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Check user error:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user, checkUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
