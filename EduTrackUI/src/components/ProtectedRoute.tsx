import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

type Role = 'admin' | 'teacher' | 'student';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole: Role;
}

/**
 * ProtectedRoute component for role-based route protection
 * - Redirects to /auth if user is not authenticated
 * - Redirects to /unauthorized if user is authenticated but lacks the required role
 */
export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (user?.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
