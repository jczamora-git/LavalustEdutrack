import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';

type Role = 'admin' | 'teacher' | 'student';

/**
 * Custom hook for role-based authentication and authorization
 * Automatically redirects to /auth if user is not authenticated or doesn't have the required role
 * @param requiredRole - The role required to access the component
 * @returns Object containing user data and authentication status
 */
export function useRoleBasedAuth(requiredRole: Role) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== requiredRole) {
      navigate('/auth');
    }
  }, [isAuthenticated, user, requiredRole, navigate]);

  return { user, isAuthenticated };
}
