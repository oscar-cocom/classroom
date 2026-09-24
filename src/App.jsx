import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { LoginPage } from '@/components/pages/LoginPage';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardPage } from '@/components/pages/DashboardPage';
import { TeamEvaluationPage } from '@/components/pages/TeamEvaluationPage';
import { StudentDashboardPage } from '@/components/pages/StudentDashboardPage';
import { AttendancePage } from '@/components/pages/AttendancePage';
import { GradesPage } from '@/components/pages/GradesPage';
import { StudentsPage } from '@/components/pages/StudentsPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route path="/dashboard" element={<DashboardLayout />}>
            {/* Rutas de Profesor */}
            <Route path="teams" element={<DashboardPage />} />
            <Route path="team/:teamId" element={<TeamEvaluationPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="grades" element={<GradesPage />} />
            
            {/* Rutas de Estudiante */}
            <Route path="my-grades" element={<StudentDashboardPage />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
