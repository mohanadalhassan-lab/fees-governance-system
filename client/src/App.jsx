import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import Login from './pages/Login';
import CEODashboard from './pages/CEODashboard';
import Fees from './pages/Fees';
import Exemptions from './pages/Exemptions';
import Thresholds from './pages/Thresholds';
import Satisfaction from './pages/Satisfaction';
import Reports from './pages/Reports';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<CEODashboard />} />
            <Route path="fees" element={<Fees />} />
            <Route path="exemptions" element={<Exemptions />} />
            <Route path="thresholds" element={<Thresholds />} />
            <Route path="satisfaction" element={<Satisfaction />} />
            <Route path="reports" element={<Reports />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
