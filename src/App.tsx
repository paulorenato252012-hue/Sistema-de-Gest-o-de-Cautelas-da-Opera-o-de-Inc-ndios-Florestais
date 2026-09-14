/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ErrorBoundary } from "./components/ErrorBoundary";
import { FirstAccess } from './pages/FirstAccess';
import { CautionView } from './pages/CautionView';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-500">Carregando...</p></div>;
  if (!currentUser || !userProfile) return <Navigate to="/login" />;
  
  if (userProfile.passwordChangeRequired || !userProfile.termsAccepted) {
    return <FirstAccess />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary><AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/cautions/:id" element={<PrivateRoute><Dashboard><CautionView /></Dashboard></PrivateRoute>} />
          <Route path="/cautela/:id" element={<PrivateRoute><Dashboard><CautionView /></Dashboard></PrivateRoute>} />
          <Route path="/cautelas/:id" element={<PrivateRoute><Dashboard><CautionView /></Dashboard></PrivateRoute>} />
          <Route path="/*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider></ErrorBoundary>
  );
}
