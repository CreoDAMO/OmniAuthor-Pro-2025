import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from 'react-error-boundary';
import { motion } from 'framer-motion';

import { apolloClient } from './config/apollo';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SubscriptionProvider, useSubscription } from './contexts/SubscriptionContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import FloatingAssistant from './components/AI/FloatingAssistant';
import ErrorFallback from './components/Common/ErrorFallback';
import LoadingSpinner from './components/Common/LoadingSpinner';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentCancelPage from './pages/PaymentCancelPage';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EditorPage from './pages/EditorPage';
import DashboardPage from './pages/DashboardPage';
import SubscriptionPage from './pages/SubscriptionPage';
import CollaborationPage from './pages/CollaborationPage';

import { SUBSCRIPTION_PLANS } from '@omniauthor/shared';
import { logger } from './utils/logger'; // Added for client-side logging

import './styles/globals.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode; requirePremium?: boolean }> = ({
  children,
  requirePremium = false,
}) => {
  const { user, loading } = useAuth();
  const { subscription } = useSubscription();
  const location = useLocation();

  if (loading) return <LoadingSpinner data-testid="loading-spinner" />;
  if (!user) {
    logger.warn(`Unauthorized access attempt to ${location.pathname}`);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (requirePremium && (!subscription || subscription.tier === 'FREE')) {
    logger.warn(`Premium feature access denied for user ${user.id} on ${location.pathname}`);
    return <Navigate to="/subscription" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (loading) return <LoadingSpinner data-testid="loading-spinner" />;

  return (
    <motion.div
      className={`app-container ${theme}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      data-testid="app-container"
    >
      {user && <Header toggleTheme={toggleTheme} />}
      <div className={`main-layout ${user ? 'authenticated' : 'guest'}`}>
        {user && <Sidebar />}
        <main className="content-area">
          <Routes>
            <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" />} />
            <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/dashboard" />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/editor/:manuscriptId?"
              element={
                <ProtectedRoute requirePremium>
                  <EditorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/collaboration/:manuscriptId"
              element={
                <ProtectedRoute requirePremium>
                  <CollaborationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscription"
              element={
                <ProtectedRoute>
                  <SubscriptionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment/success"
              element={
                <ProtectedRoute>
                  <PaymentSuccessPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment/cancel"
              element={
                <ProtectedRoute>
                  <PaymentCancelPage />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={user ? <Navigate to="/dashboard" /> : <HomePage />} />
            <Route path="*" element={<Navigate to={user ? '/dashboard' : '/'} />} />
          </Routes>
        </main>
      </div>
      {user && <FloatingAssistant />}
      <Toaster position="top-right" toastOptions={{ duration: 5000 }} />
    </motion.div>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    // Dark mode detection
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    if (mediaQuery.matches) {
      document.documentElement.classList.add('dark');
    }

    mediaQuery.addEventListener('change', handleThemeChange);
    return () => mediaQuery.removeEventListener('change', handleThemeChange);
  }, []);

  const handleError = (error: Error, info: { componentStack: string }) => {
    logger.error('Application error:', {
      error: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
    toast.error('An unexpected error occurred. Please try again.');
  };

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onError={handleError}>
      <ApolloProvider client={apolloClient}>
        <AuthProvider>
          <SubscriptionProvider>
            <ThemeProvider>
              <Router>
                <AppRoutes />
              </Router>
            </ThemeProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </ApolloProvider>
    </ErrorBoundary>
  );
};

export default App;