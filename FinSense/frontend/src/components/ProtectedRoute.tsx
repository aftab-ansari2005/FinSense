import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // TEMPORARY: Authentication disabled for testing
  // const { isAuthenticated, isLoading } = useAuth();
  // const location = useLocation();

  // if (isLoading) {
  //   return (
  //     <div className="flex items-center justify-center min-h-screen">
  //       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
  //     </div>
  //   );
  // }

  // if (!isAuthenticated) {
  //   // Redirect to login page but save the attempted location
  //   return <Navigate to="/login" state={{ from: location }} replace />;
  // }

  // TEMPORARY: Always allow access for testing
  return <>{children}</>;
};

export default ProtectedRoute;
