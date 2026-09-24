import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getStudentAttendance, getStudentGrades, getTasks } from '@/services/firestoreApi';
import { evaluateStudentTasks } from '@/services/githubApi';
import { BookOpen, CalendarX2, CheckCircle2, Trophy, Clock, XCircle, AlertTriangle } from 'lucide-react';
import studentsData from '@/data/students.json';
import datesData from '@/data/dates.json';

export function StudentDashboardPage() {
  const { user } = useAuth();
  const [studentInfo, setStudentInfo] = useState(null);
  const [grades, setGrades] = useState({ task: 0, project: '-', participation: 0 });
  const [absences, setAbsences] = useState(0);
  const [totalClasses, setTotalClasses] = useState(0);
  const [taskMetrics, setTaskMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const previewUser = urlParams.get('preview');
        const githubUsername = previewUser || user?.reloadUserInfo?.providerUserInfo?.[0]?.screenName || user?.email?.split('@')[0];
        
        const student = studentsData.find(s => s.githubUsername.toLowerCase() === githubUsername?.toLowerCase());
        
        if (student) {
          setStudentInfo(student);

          // Get attendance
          const att = await getStudentAttendance(student.id);
          
          const currentPeriod = datesData.periods[datesData.currentPeriod];
          const periodStart = new Date(currentPeriod.startDate);
          const periodEnd = new Date(currentPeriod.endDate);
          
          const periodAtt = att.filter(a => {
            const d = new Date(a.date);
            return d >= periodStart && d <= periodEnd;
          });

          setTotalClasses(periodAtt.length);
          const totalAbsences = periodAtt.filter(a => !a.isPresent).length;
          setAbsences(totalAbsences);

          // Calculate participation automatically based on absences in the current period
          let autoParticipation = 100; // 0 to 1 absences = 100%
          if (totalAbsences === 2) autoParticipation = 50; // 2 absences = 50%
          if (totalAbsences >= currentPeriod.maxAbsences) autoParticipation = 0; // limit reached = 0%
          
          // Fetch tasks from Firestore
          const fetchedTasks = await getTasks();

          // Evaluate tasks from GitHub
          const githubResult = await evaluateStudentTasks(student.repoName, fetchedTasks);
          setTaskMetrics(githubResult);

          setGrades({ 
            task: githubResult.totalScore || 0, 
            project: '-', // Pendiente
            participation: autoParticipation 
          });
        }
      } catch (err) {
        console.error("Error loading student dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  if (loading) return <div className="p-8">Cargando tu progreso...</div>;

  if (!studentInfo) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <h2 className="text-2xl font-bold text-red-500 mb-2">Estudiante no encontrado</h2>
        <p className="text-muted-foreground">
          No se encontró ningún estudiante asociado a la cuenta de GitHub <b>{user.reloadUserInfo?.providerUserInfo?.[0]?.screenName}</b>.
        </p>
      </div>
    );
  }

  // Temporary flag to avoid scaring students while teacher adjusts logic
  const HIDE_FAIL_WARNINGS = true;
  
  const isFailedByAbsences = !HIDE_FAIL_WARNINGS && absences >= 4;
  
  let finalGradeDisplay = '-';
  let partialNote = null;
  if (isFailedByAbsences) {
    finalGradeDisplay = "EXAMEN";
  } else if (grades.task !== '-' && grades.project !== '-' && grades.participation !== '-') {
    const computedFinalGrade = (grades.task * 0.4) + (grades.project * 0.5) + (grades.participation * 0.1);
    finalGradeDisplay = computedFinalGrade.toFixed(1);
  } else if (grades.task !== '-') {
    // Parcial: solo tareas + participación (sin proyecto)
    const taskPart = grades.task * 0.4;
    const partPart = (grades.participation !== '-' ? grades.participation : 0) * 0.1;
    finalGradeDisplay = (taskPart + partPart).toFixed(1);
    partialNote = "Sin proyecto aún";
  }
  
  const attendancePercentage = totalClasses === 0 ? 100 : Math.round(((totalClasses - absences) / totalClasses) * 100);

  const renderDeliveryBadge = (status) => {
    if (status === "on_time") return <Badge className="bg-green-500 hover:bg-green-600">A tiempo</Badge>;
    if (status === "late") return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950">Entregado Tarde</Badge>;
    return <Badge variant="destructive">Faltante</Badge>;
  };

  const formatDate = (dateObj) => {
    if (!dateObj) return "Sin registro";
    return dateObj.toLocaleDateString('es-MX') + ' ' + dateObj.toLocaleTimeString('es-MX');
  };

  // Convert exact absences to the +5, +6 format if they are 5 or more
  const displayAbsences = absences >= 5 ? `+${absences}` : absences;

  const urlParams = new URLSearchParams(window.location.search);
  const isPreview = urlParams.has('preview');

  return (
    <div className="space-y-6">
      {isPreview && (
        <a 
          href="/dashboard/grades" 
          className="inline-flex items-center text-sm font-medium text-primary hover:underline"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="m15 18-6-6 6-6"/></svg>
          Volver a calificaciones
        </a>
      )}

      {isFailedByAbsences && (
        <div className="bg-orange-500/10 border-l-4 border-orange-500 p-4 rounded-md mt-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-bold text-orange-500">Evaluación por Examen</h3>
              <div className="mt-1 text-sm text-orange-500/80">
                Has acumulado {displayAbsences} inasistencias (límite superado). Tu calificación ordinaria ha sido anulada y debes presentar examen.
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold uppercase">
          {studentInfo.name.charAt(0)}
        </div>
        <div>
          <h1 className="text-3xl font-bold">¡Hola, {studentInfo.name}!</h1>
          <p className="text-muted-foreground mt-1">
            Equipo: <span className="font-medium text-foreground">{studentInfo.teamId}</span> | 
            Repo: <span className="font-mono text-sm ml-1 text-primary">{studentInfo.repoName}</span>
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`bg-gradient-to-br ${isFailedByAbsences ? 'from-orange-500/10 border-orange-200 dark:border-orange-900' : 'from-blue-500/10 border-blue-200 dark:border-blue-900'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Trophy className={`w-4 h-4 ${isFailedByAbsences ? 'text-orange-500' : 'text-blue-500'}`} />
              Calificación Final
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${isFailedByAbsences ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}`}>
              {finalGradeDisplay} {!isFailedByAbsences && <span className="text-lg text-muted-foreground">/ 100</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {partialNote ? (
                <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                  Parcial: {partialNote}
                </span>
              ) : (
                'Sprint 1'
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarX2 className="w-4 h-4 text-destructive" />
              Faltas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground mb-3">
              Tienes {absences} falta{absences !== 1 ? 's' : ''} registrada{absences !== 1 ? 's' : ''}
            </div>
            <div className="space-y-3 mt-2">
              <p className="text-sm text-muted-foreground">Reglas de asistencia para el parcial:</p>
              <ul className="text-sm space-y-1.5 border-l-2 border-muted pl-3">
                <li><strong className="text-foreground">0 a 1 falta:</strong> Participación 100%</li>
                <li><strong className="text-foreground">2 faltas:</strong> Participación baja al 50%</li>
                <li><strong className="text-foreground">3 faltas:</strong> Participación baja al 0%</li>
                <li className="text-destructive"><strong className="font-bold">4+ faltas:</strong> Directo a examen <span className="text-muted-foreground font-normal text-xs">(Salvo justificante aceptable)</span></li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-bold mt-8 mb-4">Desglose de Evaluación</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tareas */}
        <Card className="border-primary/50 ring-1 ring-primary/20">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Tareas</span>
              <span className="text-sm px-2 py-1 bg-primary/20 text-primary rounded-md font-bold">40%</span>
            </CardTitle>
            <CardDescription>Evaluación de código de GitHub</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{grades.task} / 100</div>
            <p className="text-sm text-muted-foreground">Aporta {((grades.task * 0.4)).toFixed(1)} pts a la calificación final.</p>
          </CardContent>
        </Card>

        {/* Proyecto */}
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Proyecto</span>
              <span className="text-sm px-2 py-1 bg-muted rounded-md">50%</span>
            </CardTitle>
            <CardDescription>Avance del proyecto de equipo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              {grades.project === '-' ? (
                <span className="text-muted-foreground text-2xl font-medium flex items-center gap-2">
                  <Clock className="w-5 h-5 animate-pulse" />
                  Pendiente
                </span>
              ) : (
                `${grades.project} / 100`
              )}
            </div>
            {grades.project !== '-' && (
              <p className="text-sm text-muted-foreground">Aporta {((grades.project * 0.5)).toFixed(1)} pts a la calificación final.</p>
            )}
          </CardContent>
        </Card>

        {/* Participación */}
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Participación</span>
              <span className="text-sm px-2 py-1 bg-muted rounded-md">10%</span>
            </CardTitle>
            <CardDescription>Asignada por el profesor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{grades.participation} / 100</div>
            <p className="text-sm text-muted-foreground">Aporta {((grades.participation * 0.1)).toFixed(1)} pts a la calificación final.</p>
          </CardContent>
        </Card>
      </div>

      {/* MÉTRICAS DE COMMITS */}
      {taskMetrics && !taskMetrics.error && (
        <>
          {Object.entries(
            Object.values(taskMetrics.tasks).reduce((acc, t) => {
              if (!acc[t.taskInfo.sprint]) acc[t.taskInfo.sprint] = [];
              acc[t.taskInfo.sprint].push(t);
              return acc;
            }, {})
          ).map(([sprint, tasks]) => (
            <div key={`sprint-${sprint}`} className="mb-8">
              <h2 className="text-xl font-bold mt-8 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Métricas de Tareas - Sprint {sprint}
              </h2>
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-muted/50 border-b">
                      <tr>
                        <th className="px-6 py-3">Actividad</th>
                        <th className="px-6 py-3">Requisito</th>
                        <th className="px-6 py-3 text-center">Último Commit</th>
                        <th className="px-6 py-3 text-center">Estado</th>
                        <th className="px-6 py-3 text-center">Puntaje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((t) => (
                        <tr key={t.taskInfo.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-6 py-4 font-medium">{t.taskInfo.name}</td>
                          <td className="px-6 py-4 text-muted-foreground">{t.taskInfo.requirement}</td>
                          <td className="px-6 py-4 text-center font-mono text-xs">
                            {formatDate(t.delivery.date)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {t.completed 
                              ? renderDeliveryBadge(t.delivery.status) 
                              : (t.score > 0 ? <Badge variant="secondary">Parcial</Badge> : <Badge variant="destructive">Incompleto</Badge>)}
                          </td>
                          <td className="px-6 py-4 text-center font-bold">
                            {t.score} <span className="text-muted-foreground font-normal">/ {t.taskInfo.maxScore}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="p-4 bg-muted/20 border-t flex justify-end gap-4 items-center">
                    <span className="text-sm text-muted-foreground">Total Sprint {sprint}:</span>
                    <span className="text-2xl font-bold text-primary">
                      {tasks.reduce((sum, t) => sum + t.score, 0)} / {tasks.reduce((sum, t) => sum + t.taskInfo.maxScore, 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
