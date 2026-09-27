import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LoginPage } from '@/components/pages/LoginPage';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardPage } from '@/components/pages/DashboardPage';
import { TeamEvaluationPage } from '@/components/pages/TeamEvaluationPage';
import { StudentDashboardPage } from '@/components/pages/StudentDashboardPage';
import { AttendancePage } from '@/components/pages/AttendancePage';
import { GradesPage } from '@/components/pages/GradesPage';
import { StudentsPage } from '@/components/pages/StudentsPage';
import { FollowUpPage } from '@/components/pages/FollowUpPage';
import { UpdateBanner } from '@/components/molecules/UpdateBanner';

// Teacher-only pages: students who type the URL get sent to their own grades
function TeacherOnly({ children }) {
  const { user } = useAuth();
  return user?.role === 'teacher' ? children : <Navigate to="/dashboard/my-grades" replace />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route path="/dashboard" element={<DashboardLayout />}>
            {/* Rutas de Profesor */}
            <Route path="teams" element={<TeacherOnly><DashboardPage /></TeacherOnly>} />
            <Route path="team/:teamId" element={<TeacherOnly><TeamEvaluationPage /></TeacherOnly>} />
            <Route path="students" element={<TeacherOnly><StudentsPage /></TeacherOnly>} />
            <Route path="attendance" element={<TeacherOnly><AttendancePage /></TeacherOnly>} />
            <Route path="grades" element={<TeacherOnly><GradesPage /></TeacherOnly>} />
            <Route path="followup" element={<TeacherOnly><FollowUpPage /></TeacherOnly>} />
            
            {/* Rutas de Estudiante */}
            <Route path="my-grades" element={<StudentDashboardPage />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
      <UpdateBanner />
    </AuthProvider>
  );
}

export default App;
