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
import GMRetailDashboard from './pages/GMRetailDashboard';
import GMCorporateDashboard from './pages/GMCorporateDashboard';
import GMFinanceDashboard from './pages/GMFinanceDashboard';
import GMRiskDashboard from './pages/GMRiskDashboard';
import GMComplianceDashboard from './pages/GMComplianceDashboard';
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
            
            {/* GM Dashboards */}
            <Route path="gm/retail" element={<GMRetailDashboard />} />
            <Route path="gm/corporate" element={<GMCorporateDashboard />} />
            <Route path="gm/finance" element={<GMFinanceDashboard />} />
            <Route path="gm/risk" element={<GMRiskDashboard />} />
            <Route path="gm/compliance" element={<GMComplianceDashboard />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
