import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';

interface RoleCheckResult {
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  hasRole: (role: 'admin' | 'teacher' | 'student') => boolean;
  hasAnyRole: (roles: Array<'admin' | 'teacher' | 'student'>) => boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  userRole: string | null;
}

/**
 * useRoleCheck Hook
 * 
 * Provides global role checking functionality that works even with active login sessions.
 * This hook automatically verifies the user's role when the component renders.
 * 
 * Usage:
 * const { isAdmin, isTeacher, isStudent, hasRole, isAuthenticated } = useRoleCheck();
 * 
 * if (!isAdmin) {
 *   return <Unauthorized />;
 * }
 */
export function useRoleCheck(): RoleCheckResult {
  const { user, isAuthenticated, checkUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  // Verify user role on component mount
  useEffect(() => {
    const verifyRole = async () => {
      setIsLoading(true);
      try {
        // Check if user exists in context
        if (!user) {
          // If no user in context, try to verify from session
          await checkUser();
        }
      } catch (error) {
        console.error('Role verification error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    verifyRole();
  }, []);

  // Utility function to check if user has a specific role
  const hasRole = (role: 'admin' | 'teacher' | 'student'): boolean => {
    return isAuthenticated && user?.role === role;
  };

  // Utility function to check if user has any of the specified roles
  const hasAnyRole = (roles: Array<'admin' | 'teacher' | 'student'>): boolean => {
    return isAuthenticated && user ? roles.includes(user.role) : false;
  };

  return {
    isAdmin: hasRole('admin'),
    isTeacher: hasRole('teacher'),
    isStudent: hasRole('student'),
    hasRole,
    hasAnyRole,
    isLoading,
    isAuthenticated,
    userRole: user?.role || null,
  };
}

/**
 * useRequireRole Hook
 * 
 * Enforces role-based access at the component level.
 * Automatically redirects if the user doesn't have the required role.
 * 
 * Usage:
 * useRequireRole('admin'); // Component will redirect if not admin
 */
export function useRequireRole(requiredRole: 'admin' | 'teacher' | 'student' | 'admin_or_teacher'): boolean {
  const { hasRole, hasAnyRole, isLoading, isAuthenticated } = useRoleCheck();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // User is not authenticated, will be handled by ProtectedRoute
      return;
    }

    if (!isLoading && isAuthenticated) {
      if (requiredRole === 'admin_or_teacher') {
        if (!hasAnyRole(['admin', 'teacher'])) {
          // User doesn't have required role, redirect handled by ProtectedRoute
          console.warn('User does not have required role for this resource');
        }
      } else {
        const typedRole = requiredRole as 'admin' | 'teacher' | 'student';
        if (!hasRole(typedRole)) {
          // User doesn't have required role
          console.warn(`User does not have ${requiredRole} role for this resource`);
        }
      }
    }
  }, [isLoading, isAuthenticated, requiredRole, hasRole, hasAnyRole]);

  if (requiredRole === 'admin_or_teacher') {
    return hasAnyRole(['admin', 'teacher']);
  }
  const typedRole = requiredRole as 'admin' | 'teacher' | 'student';
  return hasRole(typedRole);
}
