import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TeamGradingPanel } from '@/components/organisms/TeamGradingPanel';
import { StudentStatusRow } from '@/components/molecules/StudentStatusRow';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { getTasks, getTeamEvaluation, saveTeamEvaluation, saveStudentGrades, getAllGrades, setTeamDemoPublished } from '@/services/firestoreApi';
import { DEFAULT_PARTICIPATION, PARTICIPATION_ON_GRADING } from '@/lib/sprints';
import { PROJECT_SPRINTS, rubricPoints, projectScore } from '@/lib/projectGrading';

import teamsData from '@/data/teams.json';
import studentsData from '@/data/students.json';

export function TeamEvaluationPage() {
  const { teamId } = useParams();
  const navigate = useNavigate();

  const team = teamsData.find(t => t.id === teamId);
  const teamStudents = studentsData.filter(s => s.teamId === teamId);

  const [sprint, setSprint] = useState(1);
  // { [sprint]: { rubric, students, updatedAt } }
  const [evaluations, setEvaluations] = useState({});
  const [tasksList, setTasksList] = useState([]);
  const [saveState, setSaveState] = useState('loading');
  // Participation per student and sprint, from their grade docs: { [sprint]: { [studentId]: points } }
  const [participation, setParticipation] = useState({});

  useEffect(() => {
    getTasks().then(setTasksList);
    getAllGrades()
      .then(all => {
        const bySprint = {};
        all.filter(g => g.participationPoints !== undefined).forEach(g => {
          const n = Number(String(g.sprint).replace(/\D/g, ''));
          (bySprint[n] ??= {})[g.studentId] = g.participationPoints;
        });
        setParticipation(bySprint);
      })
      .catch(err => console.error('Error loading participation:', err));
    getTeamEvaluation(teamId)
      .then(saved => {
        setEvaluations(saved);
        setSaveState('idle');
      })
      .catch(err => {
        console.error('Error loading team evaluation:', err);
        setSaveState('error');
      });
  }, [teamId]);

  const current = evaluations[sprint] || {};
  const teamGrades = current.rubric || {};
  const studentScores = current.students || {};
  const published = current.published === true;

  const save = async (next) => {
    setEvaluations(prev => ({ ...prev, [sprint]: { ...next, updatedAt: new Date().toISOString() } }));
    setSaveState('saving');
    try {
      await saveTeamEvaluation(teamId, sprint, next);
      // Copy each graded student's project score to their own grades, which is
      // what their dashboard and the grades page read. Students only see it
      // once the teacher publishes the sprint.
      await Promise.all(teamStudents
        .filter(s => next.students[s.id] !== undefined)
        .map(s => saveStudentGrades(s.id, `Sprint ${sprint}`, {
          projectScore: projectScore(next.students[s.id]),
          projectRubric: rubricPoints(next.rubric),
          projectExpo: next.students[s.id],
          projectPublished: next.published === true,
        })));
      // Public landing page shows which teams already presented
      if (next.published !== published) await setTeamDemoPublished(teamId, sprint, next.published === true);
      setSaveState('saved');
    } catch (err) {
      console.error('Error saving team evaluation:', err);
      setSaveState('error');
    }
  };

  const handleGradeChange = (rubricId, checked) => {
    save({ rubric: { ...teamGrades, [rubricId]: checked }, students: studentScores, published });
  };

  const handleScoreChange = (studentId, score) => {
    save({ rubric: teamGrades, students: { ...studentScores, [studentId]: score }, published });
    // First time this student is graded this sprint: participation starts at the full 5
    if (participation[sprint]?.[studentId] === undefined) handleParticipationChange(studentId, PARTICIPATION_ON_GRADING);
  };

  // Same field the grades page edits; everyone starts at 5 until lowered
  const handleParticipationChange = async (studentId, points) => {
    setParticipation(prev => ({ ...prev, [sprint]: { ...prev[sprint], [studentId]: points } }));
    setSaveState('saving');
    try {
      await saveStudentGrades(studentId, `Sprint ${sprint}`, { participationPoints: points });
      setSaveState('saved');
    } catch (err) {
      console.error('Error saving participation:', err);
      setSaveState('error');
    }
  };

  const gradedCount = teamStudents.filter(s => studentScores[s.id] !== undefined).length;
  const togglePublished = () => {
    if (!published && gradedCount < teamStudents.length &&
        !confirm(`Solo ${gradedCount} de ${teamStudents.length} alumnos tienen expo calificada. Los demás seguirán viendo "Pendiente". ¿Publicar de todos modos?`)) return;
    save({ rubric: teamGrades, students: studentScores, published: !published });
  };

  const saveMessage = {
    loading: 'Cargando evaluación guardada…',
    saving: 'Guardando…',
    error: 'No se pudo guardar. Revisa tu conexión y vuelve a marcar el cambio.',
  }[saveState] || (current.updatedAt
    ? `Sprint ${sprint} guardado ${new Date(current.updatedAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}`
    : `Sprint ${sprint} sin calificar todavía`);

  if (!team) return <div className="p-8">Equipo no encontrado.</div>;

  return (
    <div className="mx-auto max-w-4xl">
      <Button
        variant="ghost"
        className="mb-6 -ml-4 text-muted-foreground"
        onClick={() => navigate('/dashboard/teams')}
      >
        <ChevronLeft className="mr-2 w-4 h-4" /> Volver al Dashboard
      </Button>

      <header className="mb-6">
        <h1 className="text-3xl font-bold">{team.name}</h1>
        <p className="text-muted-foreground">Repositorio: {team.repoName}</p>
      </header>

      <nav aria-label="Sprint a calificar" className="flex gap-1 p-1 bg-muted rounded-lg w-fit mb-2">
        {PROJECT_SPRINTS.map(n => (
          <button
            key={n}
            type="button"
            onClick={() => setSprint(n)}
            aria-current={sprint === n ? 'page' : undefined}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${sprint === n ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Sprint {n}
          </button>
        ))}
      </nav>
      <p
        className={`text-sm mb-4 ${saveState === 'error' ? 'text-destructive font-medium' : 'text-muted-foreground'}`}
        aria-live="polite"
      >
        {saveMessage}
      </p>

      <div className={`mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-4 ${published ? 'border-green-300 bg-green-50 dark:bg-green-950/30' : 'bg-muted/40'}`}>
        <div className="flex gap-3">
          {published
            ? <Eye className="h-5 w-5 shrink-0 text-green-700" aria-hidden="true" />
            : <EyeOff className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />}
          <div>
            <p className="font-medium">
              {published ? `Los alumnos ya ven su proyecto del Sprint ${sprint}` : `Los alumnos todavía no ven su proyecto del Sprint ${sprint}`}
            </p>
            <p className="text-sm text-muted-foreground">
              {published
                ? 'Los cambios que hagas se les muestran al momento.'
                : `En su pantalla aparece "Pendiente". ${gradedCount} de ${teamStudents.length} alumnos con expo calificada.`}
            </p>
          </div>
        </div>
        <Button
          variant={published ? 'outline' : 'default'}
          onClick={togglePublished}
          disabled={saveState === 'loading' || saveState === 'saving' || gradedCount === 0}
          className="cursor-pointer shrink-0"
        >
          {published ? 'Ocultar a los alumnos' : 'Publicar a los alumnos'}
        </Button>
      </div>

      <TeamGradingPanel grades={teamGrades} onGradeChange={handleGradeChange} disabled={saveState === 'loading'} />

      <section>
        <h2 className="text-xl font-semibold mb-1">Evaluación Individual · Sprint {sprint}</h2>
        <p className="text-sm text-muted-foreground mb-4">
          El proyecto de cada alumno (50 pts del sprint) es su expo: cada punto de expo vale 5 pts. La rúbrica del equipo es guía y retroalimentación.
          La participación está en 0 hasta que calificas: al poner la expo de un alumno se pone en 5, y la bajas si hace falta. La asistencia se calcula sola con las faltas.
        </p>
        <div className="space-y-4">
          {teamStudents.length === 0 ? (
            <p className="text-red-500 italic font-medium">No hay alumnos asignados a este equipo.</p>
          ) : (
            teamStudents.map(student => (
              <StudentStatusRow
                key={student.id}
                student={student}
                score={studentScores[student.id]}
                projectScore={studentScores[student.id] !== undefined ? projectScore(studentScores[student.id]) : null}
                onScoreChange={handleScoreChange}
                participation={participation[sprint]?.[student.id] ?? DEFAULT_PARTICIPATION}
                onParticipationChange={handleParticipationChange}
                tasksList={tasksList}
                currentSprint={sprint}
                disabled={saveState === 'loading'}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
