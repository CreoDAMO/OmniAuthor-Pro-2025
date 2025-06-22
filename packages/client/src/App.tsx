import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from 'react-error-boundary';


import { apolloClient } from './config/apollo';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { ThemeProvider } from './contexts/ThemeContext';


import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import FloatingAssistant from './components/AI/FloatingAssistant';
import ErrorFallback from './components/Common/ErrorFallback';
import LoadingSpinner from './components/Common/LoadingSpinner';


import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EditorPage from './pages/EditorPage';
import DashboardPage from './pages/DashboardPage';
import SubscriptionPage from './pages/SubscriptionPage';
import CollaborationPage from './pages/CollaborationPage';


import './styles/globals.css';


const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();


  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;


  return <>{children}</>;
};


const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();


  if (loading) return <LoadingSpinner />;


  return (
    <div className="app-container">
      {user && <Header />}
      
      <div className={`main-layout ${user ? 'authenticated' : 'guest'}`}>
        {user && <Sidebar />}
        
        <main className="content-area">
          <Routes>
            <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" />} />
            <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/dashboard" />} />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />
            
            <Route path="/editor/:manuscriptId?" element={
              <ProtectedRoute>
                <EditorPage />
              </ProtectedRoute>
            } />
            
            <Route path="/collaboration/:manuscriptId" element={
              <ProtectedRoute>
                <CollaborationPage />
              </ProtectedRoute>
            } />
            
            <Route path="/subscription" element={
              <ProtectedRoute>
                <SubscriptionPage />
              </ProtectedRoute>
            } />
            
            <Route path="/" element={user ? <Navigate to="/dashboard" /> : <HomePage />} />
            <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} />} />
          </Routes>
        </main>
      </div>


      {user && <FloatingAssistant />}
      <Toaster position="top-right" />
    </div>
  );
};


const App: React.FC = () => {
  useEffect(() => {
    // Dark mode detection
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }


    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
      if (event.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    });
  }, []);


  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
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
