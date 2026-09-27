import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TeamGradingPanel } from '@/components/organisms/TeamGradingPanel';
import { StudentStatusRow } from '@/components/molecules/StudentStatusRow';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { getTasks, getTeamEvaluation, saveTeamEvaluation } from '@/services/firestoreApi';

import teamsData from '@/data/teams.json';
import studentsData from '@/data/students.json';

export function TeamEvaluationPage() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  
  const team = teamsData.find(t => t.id === teamId);
  const teamStudents = studentsData.filter(s => s.teamId === teamId);

  const [teamGrades, setTeamGrades] = useState({});
  const [studentScores, setStudentScores] = useState({});
  const [tasksList, setTasksList] = useState([]);
  const [saveState, setSaveState] = useState({ status: 'loading', at: null });

  useEffect(() => {
    getTasks().then(setTasksList);
    getTeamEvaluation(teamId)
      .then(saved => {
        setTeamGrades(saved?.rubric || {});
        setStudentScores(saved?.students || {});
        setSaveState({ status: 'idle', at: saved?.updatedAt || null });
      })
      .catch(err => {
        console.error('Error loading team evaluation:', err);
        setSaveState({ status: 'error', at: null });
      });
  }, [teamId]);

  const save = async (data) => {
    setSaveState(s => ({ ...s, status: 'saving' }));
    try {
      await saveTeamEvaluation(teamId, data);
      setSaveState({ status: 'saved', at: new Date().toISOString() });
    } catch (err) {
      console.error('Error saving team evaluation:', err);
      setSaveState(s => ({ ...s, status: 'error' }));
    }
  };

  const handleGradeChange = (rubricId, checked) => {
    const newGrades = { ...teamGrades, [rubricId]: checked };
    setTeamGrades(newGrades);
    save({ rubric: newGrades });
  };

  const handleScoreChange = (studentId, score) => {
    const newScores = { ...studentScores, [studentId]: score };
    setStudentScores(newScores);
    save({ students: newScores });
  };

  const saveMessage = {
    loading: 'Cargando evaluación guardada…',
    saving: 'Guardando…',
    error: 'No se pudo guardar. Revisa tu conexión y vuelve a marcar el cambio.',
  }[saveState.status] || (saveState.at
    ? `Guardado ${new Date(saveState.at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}`
    : 'Sin cambios guardados todavía');

  if (!team) return <div className="p-8">Equipo no encontrado.</div>;

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl">
      <Button 
        variant="ghost" 
        className="mb-6 -ml-4 text-muted-foreground"
        onClick={() => navigate('/dashboard/teams')}
      >
        <ChevronLeft className="mr-2 w-4 h-4" /> Volver al Dashboard
      </Button>

      <header className="mb-8">
        <h1 className="text-3xl font-bold">{team.name}</h1>
        <p className="text-muted-foreground">Repositorio: {team.repoName}</p>
        <p
          className={`text-sm mt-2 ${saveState.status === 'error' ? 'text-destructive font-medium' : 'text-muted-foreground'}`}
          aria-live="polite"
        >
          {saveMessage}
        </p>
      </header>

      <TeamGradingPanel grades={teamGrades} onGradeChange={handleGradeChange} />

      <section>
        <h2 className="text-xl font-semibold mb-4">Evaluación Individual</h2>
        <div className="space-y-4">
          {teamStudents.length === 0 ? (
            <p className="text-red-500 italic font-medium">No hay alumnos asignados a este equipo.</p>
          ) : (
            teamStudents.map(student => (
              <StudentStatusRow 
                key={student.id} 
                student={student} 
                score={studentScores[student.id]}
                onScoreChange={handleScoreChange}
                tasksList={tasksList}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
