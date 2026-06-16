import React from 'react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
 children: ReactNode;
 requiredRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
 children,
 requiredRoles
}) => {
 const { isAuthenticated, user } = useAuthStore();

 if (!isAuthenticated || !user) {
 return <Navigate to="/" replace />;
 }

 if (requiredRoles && !requiredRoles.includes(user.role)) {
 return <Navigate to="/unauthorized" replace />;
 }

 return <>{children}</>;
};
