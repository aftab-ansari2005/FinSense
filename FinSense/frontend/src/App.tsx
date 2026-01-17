import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import PredictionsPage from './pages/PredictionsPage';
import UploadPage from './pages/UploadPage';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <Routes>
            {/* TEMPORARY: Redirect home to dashboard for testing */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected routes with layout - now accessible without auth */}
            <Route element={<Layout />}>
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <DashboardPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/transactions"
                element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <TransactionsPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/predictions"
                element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <PredictionsPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/upload"
                element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <UploadPage />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
