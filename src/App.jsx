import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DashboardPage } from '@/components/pages/DashboardPage';
import { TeamEvaluationPage } from '@/components/pages/TeamEvaluationPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background font-sans antialiased text-foreground">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/team/:teamId" element={<TeamEvaluationPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
