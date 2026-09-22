import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TeamGradingPanel } from '@/components/organisms/TeamGradingPanel';
import { StudentStatusRow } from '@/components/molecules/StudentStatusRow';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

import teamsData from '@/data/teams.json';
import studentsData from '@/data/students.json';

// In a real app, this would connect to Firebase db
// import { doc, onSnapshot, setDoc } from "firebase/firestore";
// import { db } from "@/lib/firebase";

export function TeamEvaluationPage() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  
  const team = teamsData.find(t => t.id === teamId);
  const teamStudents = studentsData.filter(s => s.teamId === teamId);

  const [teamGrades, setTeamGrades] = useState({});
  const [studentScores, setStudentScores] = useState({});

  useEffect(() => {
    // Here we would setup a Firebase listener for the team's grades
    // const unsub = onSnapshot(doc(db, "evaluations", teamId), (doc) => {
    //   if (doc.exists()) {
    //     setTeamGrades(doc.data().rubric || {});
    //     setStudentScores(doc.data().students || {});
    //   }
    // });
    // return () => unsub();
  }, [teamId]);

  const handleGradeChange = (rubricId, checked) => {
    const newGrades = { ...teamGrades, [rubricId]: checked };
    setTeamGrades(newGrades);
    
    // Save to Firebase
    // setDoc(doc(db, "evaluations", teamId), { rubric: newGrades }, { merge: true });
  };

  const handleScoreChange = (studentId, score) => {
    const newScores = { ...studentScores, [studentId]: score };
    setStudentScores(newScores);

    // Save to Firebase
    // setDoc(doc(db, "evaluations", teamId), { students: newScores }, { merge: true });
  };

  if (!team) return <div className="p-8">Equipo no encontrado.</div>;

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl">
      <Button 
        variant="ghost" 
        className="mb-6 -ml-4 text-muted-foreground"
        onClick={() => navigate('/')}
      >
        <ChevronLeft className="mr-2 w-4 h-4" /> Volver al Dashboard
      </Button>

      <header className="mb-8">
        <h1 className="text-3xl font-bold">{team.name}</h1>
        <p className="text-muted-foreground">Repositorio: {team.repoName}</p>
      </header>

      <TeamGradingPanel grades={teamGrades} onGradeChange={handleGradeChange} />

      <section>
        <h2 className="text-xl font-semibold mb-4">Evaluación Individual</h2>
        <div className="space-y-4">
          {teamStudents.length === 0 ? (
            <p className="text-muted-foreground italic">No hay alumnos asignados a este equipo.</p>
          ) : (
            teamStudents.map(student => (
              <StudentStatusRow 
                key={student.id} 
                student={student} 
                score={studentScores[student.id]}
                onScoreChange={handleScoreChange}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
