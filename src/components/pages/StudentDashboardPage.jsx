import React, { useState, useEffect } from 'react';
import { Table } from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';
import { LoadingAnimation } from '@/components/atoms/LoadingAnimation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getStudentAttendance, getStudentGrades, getTasks } from '@/services/firestoreApi';
import { evaluateStudentTasks } from '@/services/githubApi';
import { BookOpen, CalendarX2, CheckCircle2, Trophy, Clock, XCircle, AlertTriangle } from 'lucide-react';
import studentsData from '@/data/students.json';
import teamsData from '@/data/teams.json';
import campusImg from '@/assets/campus-itcancun.jpeg';
import { sprintOfDate, isUnexcusedAbsence, attendancePoints, DEFAULT_PARTICIPATION, RECOVERY_ABSENCES, RECOVERY_DATES } from '@/lib/sprints';

export function StudentDashboardPage() {
  const { user, logout } = useAuth();
  const [studentInfo, setStudentInfo] = useState(null);
  const [attendance, setAttendance] = useState([]);
  // Saved grades per sprint (project score comes from the team evaluation page)
  const [savedGrades, setSavedGrades] = useState({});
  const [taskMetrics, setTaskMetrics] = useState(null);
  const [sprints, setSprints] = useState([1]);
  const [tasks, setTasks] = useState([]);
  const [sprint, setSprint] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const urlParams = new URLSearchParams(window.location.search);
        // Only the teacher may preview another student's dashboard
        const previewUser = user?.role === 'teacher' ? urlParams.get('preview') : null;
        const student = previewUser
          ? studentsData.find(s => s.githubUsername.toLowerCase() === previewUser.toLowerCase())
          : studentsData.find(s => s.githubId && s.githubId === user?.githubId)
            || studentsData.find(s => s.githubUsername && s.githubUsername.toLowerCase() === user?.githubUsername?.toLowerCase());
        
        if (student) {
          setStudentInfo(student);

          setAttendance(await getStudentAttendance(student.id));

          // Evaluate every sprint's tasks; the page shows one sprint at a time
          const allTasks = await getTasks();
          setTasks(allTasks);
          const githubResult = await evaluateStudentTasks(student.repoName, allTasks);
          setTaskMetrics(githubResult);
          const sprintList = [...new Set(allTasks.map(t => Number(t.sprint)))].sort((a, b) => a - b);
          setSprints(sprintList);

          const gradeDocs = await Promise.all(sprintList.map(n => getStudentGrades(student.id, `Sprint ${n}`)));
          setSavedGrades(Object.fromEntries(sprintList.map((n, i) => [n, gradeDocs[i]])));
        }
      } catch (err) {
        console.error("Error loading student dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  if (loading) return <LoadingAnimation size={220} label="Revisando tus tareas y calificaciones…" />;

  if (!studentInfo) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <h2 className="text-2xl font-bold text-red-500 mb-2">Estudiante no encontrado</h2>
        <p className="text-muted-foreground">
          No se encontró ningún estudiante asociado a la cuenta de GitHub <b>{user.githubUsername}</b>.
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          Si entraste con otra cuenta, cierra sesión aquí y también en{' '}
          <a href="https://github.com/logout" target="_blank" rel="noreferrer" className="underline hover:text-foreground">github.com</a>,
          y vuelve a entrar con la cuenta que usas en la clase.
        </p>
        <button
          type="button"
          onClick={logout}
          className="mt-4 inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors cursor-pointer"
        >
          Cerrar sesión y usar otra cuenta
        </button>
      </div>
    );
  }

  // Task grade (0-100) of the sprint being viewed
  const sprintResults = Object.values(taskMetrics?.tasks || {}).filter(t => Number(t.taskInfo.sprint) === sprint);
  // Out of every task of the sprint, so a task GitHub failed to check never inflates the grade
  const sprintMax = tasks.filter(t => Number(t.sprint) === sprint).reduce((sum, t) => sum + Number(t.maxScore), 0);
  const tasksFailed = taskMetrics?.error === true;
  // Absences only count toward the sprint whose dates they fall in
  const sprintAttendance = attendance.filter(a => sprintOfDate(a.date) === sprint);
  const absences = sprintAttendance.filter(isUnexcusedAbsence).length;
  const justifiedAbsences = sprintAttendance.filter(a => !a.isPresent && a.justified).length;
  const saved = savedGrades[sprint];
  // The teacher publishes each sprint's project grades from the team page; the
  // teacher previewing a student sees them before that
  const hasProject = saved?.projectScore !== undefined && saved?.projectScore !== null
    && (saved.projectPublished === true || user?.role === 'teacher');
  // Grades edited by hand on the grades page have no expo breakdown
  const hasBreakdown = hasProject && saved.projectExpo !== undefined;

  // Everything below is in sprint points: tasks 40 + project 50 + attendance 5 + participation 5
  const round1 = n => Math.round(n * 10) / 10;
  // A task grade the teacher corrected by hand on the grades page wins over the live check
  const taskManual = saved?.taskManual === true && saved?.taskScore !== undefined;
  const taskPercent = taskManual
    ? saved.taskScore
    : sprintMax > 0 && !tasksFailed ? (sprintResults.reduce((sum, t) => sum + t.score, 0) / sprintMax) * 100 : null;
  const points = {
    task: taskPercent === null ? null : round1(taskPercent * 0.4),
    // Project: the student's own expo, 5 pts per expo point (see lib/projectGrading.js)
    project: hasProject ? round1(saved.projectScore * 0.5) : null,
    attendance: attendancePoints(absences),
    // Everyone starts with full participation; the teacher lowers it on the grades page
    participation: saved?.participationPoints ?? DEFAULT_PARTICIPATION,
  };
  const fmt = n => (n === null ? '-' : String(n));

  // A total the teacher set by hand on the grades page (e.g. the one captured in the SIE)
  // replaces the sum and cancels recovery
  const finalOverride = typeof saved?.finalOverride === 'number' ? saved.finalOverride : null;
  // Too many unexcused absences: the sprint goes to recovery instead of an ordinary grade
  const isFailedByAbsences = absences >= RECOVERY_ABSENCES && finalOverride === null;

  let finalGradeDisplay = '-';
  let partialNote = null;
  if (isFailedByAbsences) {
    finalGradeDisplay = "Recuperación";
  } else if (finalOverride !== null) {
    finalGradeDisplay = fmt(finalOverride);
  } else if (points.task !== null) {
    finalGradeDisplay = fmt(round1(points.task + (points.project ?? 0) + points.attendance + points.participation));
    // Until the demo, the grade only has tasks + participation
    if (points.project === null) partialNote = "Sin proyecto aún";
  }
  

  const renderDeliveryBadge = (status) => {
    if (status === "on_time") return <Badge className="bg-green-500 hover:bg-green-600">A tiempo</Badge>;
    if (status === "late") return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950">Entregado Tarde</Badge>;
    if (status === "incomplete") return <Badge variant="destructive">Incompleto</Badge>;
    return <Badge variant="destructive">Sin entregar</Badge>;
  };

  const renderTaskStatus = (t) => (taskManual
    ? <Badge className="bg-blue-600 hover:bg-blue-600">Revisado por el profesor</Badge>
    : t.partial
    ? <Badge variant="secondary">Parcial</Badge>
    : !t.completed && new Date(t.taskInfo.deadline) > new Date()
      ? <Badge variant="outline">Aún no vence</Badge>
      : renderDeliveryBadge(t.delivery.status));

  const formatDate = (dateObj) => {
    if (!dateObj) return "Sin registro";
    return dateObj.toLocaleDateString('es-MX') + ' ' + dateObj.toLocaleTimeString('es-MX');
  };

  // Convert exact absences to the +5, +6 format if they are 5 or more
  const displayAbsences = absences >= 5 ? `+${absences}` : absences;

  const urlParams = new URLSearchParams(window.location.search);
  const isPreview = user?.role === 'teacher' && urlParams.has('preview');

  const teamName = teamsData.find(t => t.id === studentInfo.teamId)?.name || studentInfo.teamId;

  return (
    <div className="space-y-6">
      {/* Cover: full-bleed photo (cancels the layout padding), dark on the left for
          the text, fading at the bottom into the page background */}
      <section className="relative -mx-4 -mt-4 md:-mx-8 md:-mt-8 min-h-[280px] md:min-h-[360px] overflow-hidden flex items-end">
        <img src={campusImg} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{ background: 'linear-gradient(90deg, rgb(2 6 23 / 0.92) 0%, rgb(2 6 23 / 0.7) 35%, rgb(2 6 23 / 0.25) 70%, rgb(2 6 23 / 0.1) 100%)' }}
        />
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{ background: 'linear-gradient(to top, color-mix(in srgb, hsl(var(--muted)) 40%, hsl(var(--background))) 0%, transparent 22%)' }}
        />

        {isPreview && (
          // z-10: the greeting block below is also positioned and would otherwise sit on top and swallow the clicks
          <Link
            to="/dashboard/grades"
            className="absolute z-10 top-4 left-4 md:left-8 inline-flex items-center rounded-md bg-black/40 px-3 py-1.5 text-sm font-medium text-white backdrop-blur hover:bg-black/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
            Volver a calificaciones
          </Link>
        )}

        <div className="relative w-full px-4 md:px-8 pt-20 pb-16 md:pb-20 text-white">
          <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">
            Programación Web · ITCancún
          </p>
          <h1 className="mt-2 max-w-3xl text-3xl md:text-5xl font-extrabold leading-tight tracking-tight [text-shadow:0_2px_12px_rgb(0_0_0/0.5)]">
            ¡Hola, {studentInfo.name}!
          </h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm md:text-base text-white/85">
            <span>{teamName}</span>
            <span aria-hidden="true" className="text-white/40">•</span>
            <span className="font-mono text-sm">{studentInfo.repoName}</span>
          </p>
        </div>
      </section>

      {isFailedByAbsences && (
        <div className="bg-orange-500/10 border-l-4 border-orange-500 p-4 rounded-md mt-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-bold text-orange-700 dark:text-orange-400">Sprint {sprint} en recuperación</h3>
              <div className="mt-1 text-sm text-orange-800 dark:text-orange-300">
                Tienes {displayAbsences} faltas sin justificar en este sprint (el límite es {RECOVERY_ABSENCES - 1}). Este sprint no tendrá calificación ordinaria: lo recuperas del {RECOVERY_DATES}. Si tienes justificante, entrégalo al profesor.
              </div>
            </div>
          </div>
        </div>
      )}

      {sprints.length > 1 && (
        <nav aria-label="Sprints" className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          {sprints.map(n => (
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
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`bg-gradient-to-br ${isFailedByAbsences ? 'from-orange-500/10 border-orange-200 dark:border-orange-900' : 'from-blue-500/10 border-blue-200 dark:border-blue-900'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Trophy className={`w-4 h-4 ${isFailedByAbsences ? 'text-orange-500' : 'text-blue-500'}`} />
              Calificación Sprint {sprint}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${isFailedByAbsences ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}`}>
              {finalGradeDisplay} {!isFailedByAbsences && <span className="text-lg text-muted-foreground">/ 100</span>}
            </div>
            {!isFailedByAbsences && (
              <p className="text-xs text-muted-foreground mt-1">
                {finalOverride !== null
                  ? 'Calificación ajustada por el profesor'
                  : <>Tareas {fmt(points.task)} + Proyecto {fmt(points.project)} + Asistencia {fmt(points.attendance)} + Participación {fmt(points.participation)}</>}
              </p>
            )}
            {partialNote && (
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">Parcial: {partialNote}</p>
            )}
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
              Tienes {absences} falta{absences !== 1 ? 's' : ''} en este sprint
            </div>
            {justifiedAbsences > 0 && (
              <p className="text-sm text-muted-foreground -mt-2 mb-3">
                Además, {justifiedAbsences} justificada{justifiedAbsences !== 1 ? 's' : ''} que no cuenta{justifiedAbsences !== 1 ? 'n' : ''}.
              </p>
            )}
            <div className="space-y-3 mt-2">
              <p className="text-sm text-muted-foreground">Reglas de asistencia para este sprint:</p>
              <ul className="text-sm space-y-1.5 border-l-2 border-muted pl-3">
                <li><strong className="text-foreground">0 a 1 falta:</strong> 5 pts de asistencia</li>
                <li><strong className="text-foreground">2 faltas:</strong> 2.5 pts de asistencia</li>
                <li><strong className="text-foreground">3 faltas:</strong> 0 pts de asistencia</li>
                <li className="text-destructive"><strong className="font-bold">4 o más faltas:</strong> el sprint se va a recuperación ({RECOVERY_DATES}) <span className="text-muted-foreground font-normal text-xs">(salvo justificante)</span></li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-bold mt-8 mb-1">Desglose de Evaluación · Sprint {sprint}</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Tu calificación del sprint es la suma de: Tareas (hasta 40 pts) + Proyecto (hasta 50 pts) + Asistencia (hasta 5 pts) + Participación (hasta 5 pts) = 100.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
            <div className="text-3xl font-bold mb-3">{fmt(points.task)} <span className="text-lg text-muted-foreground font-medium">/ 40 pts</span></div>
            {!taskManual && (
              <ul className="text-sm space-y-1 mb-3">
                {sprintResults.map(t => (
                  <li key={t.taskInfo.id} className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{t.taskInfo.name.split(':')[0]}</span>
                    <span className="font-medium whitespace-nowrap">{t.score} / {t.taskInfo.maxScore}</span>
                  </li>
                ))}
              </ul>
            )}
            {tasksFailed && !taskManual && (
              <p className="text-xs text-destructive mb-2">No pudimos revisar todas tus tareas en GitHub. Recarga la página en un momento.</p>
            )}
            {taskManual && (
              <div className="mb-3 rounded-md bg-blue-50 p-2 text-xs text-blue-900">
                <p className="font-semibold">Revisado por el profesor</p>
                {saved?.taskReason && <p className="mt-0.5">{saved.taskReason}</p>}
              </div>
            )}
            {taskPercent !== null && (
              <p className="text-xs text-muted-foreground border-t pt-2">
                Sacaste {fmt(round1(taskPercent))} de 100 en tareas. Valen 40 pts: {fmt(round1(taskPercent))} × 0.4 = <b className="text-foreground">{fmt(points.task)} pts</b>.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Proyecto */}
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Proyecto</span>
              <span className="text-sm px-2 py-1 bg-muted rounded-md">50%</span>
            </CardTitle>
            <CardDescription>
              Demo del proyecto en equipo
              {hasProject && !saved.projectPublished && (
                <span className="block mt-1 text-xs font-medium text-amber-700">Vista previa: el alumno aún no lo ve</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-3">
              {points.project === null ? (
                <span className="text-muted-foreground text-2xl font-medium flex items-center gap-2">
                  <Clock className="w-5 h-5 animate-pulse motion-reduce:animate-none" />
                  Pendiente
                </span>
              ) : (
                <>{fmt(points.project)} <span className="text-lg text-muted-foreground font-medium">/ 50 pts</span></>
              )}
            </div>
            {points.project === null ? (
              <p className="text-xs text-muted-foreground">Se califica con tu expo en la demo del sprint: cada punto de expo vale 5 pts.</p>
            ) : !hasBreakdown ? (
              <p className="text-xs text-muted-foreground">Calificación asignada por el profesor.</p>
            ) : (
              <>
                <ul className="text-sm space-y-1 mb-3">
                  <li className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Tu expo</span>
                    <span className="font-medium whitespace-nowrap">{saved.projectExpo} / 10</span>
                  </li>
                  {saved.projectRubric !== undefined && (
                    <li className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Rúbrica de tu equipo <span className="text-xs">(retroalimentación)</span></span>
                      <span className="font-medium whitespace-nowrap">{saved.projectRubric} / 10</span>
                    </li>
                  )}
                </ul>
                <p className="text-xs text-muted-foreground border-t pt-2">
                  Cada punto de tu expo vale 5 pts: {saved.projectExpo} × 5 = <b className="text-foreground">{fmt(points.project)} pts</b>. La rúbrica del equipo no suma puntos; es la guía de tu expo.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Asistencia y participación */}
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Asistencia y participación</span>
              <span className="text-sm px-2 py-1 bg-muted rounded-md">10%</span>
            </CardTitle>
            <CardDescription>5 pts por asistencia + 5 pts por participación</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-3">{fmt(round1(points.attendance + points.participation))} <span className="text-lg text-muted-foreground font-medium">/ 10 pts</span></div>
            <ul className="text-sm space-y-1 mb-3">
              <li className="flex justify-between gap-2">
                <span className="text-muted-foreground">Asistencia ({absences} falta{absences !== 1 ? 's' : ''})</span>
                <span className="font-medium whitespace-nowrap">{fmt(points.attendance)} / 5</span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-muted-foreground">Participación en clase</span>
                <span className="font-medium whitespace-nowrap">{fmt(points.participation)} / 5</span>
              </li>
            </ul>
            <p className="text-xs text-muted-foreground border-t pt-2">
              Asistencia: 0–1 faltas = 5 · 2 faltas = 2.5 · 3 o más = 0. La participación la asigna el profesor al calificar la demo de tu equipo{saved?.participationPoints === undefined ? '; todavía está pendiente' : ''}.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* MÉTRICAS DE COMMITS */}
      {taskMetrics?.repoMissing && (
        <div className="bg-destructive/10 border-l-4 border-destructive p-4 rounded-md flex gap-3">
          <XCircle className="h-5 w-5 text-destructive shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-destructive">No encontramos tu repositorio de tareas</h3>
            <p className="mt-1 text-sm text-foreground/80">
              Acepta la invitación de GitHub Classroom que te compartió el profesor. Hasta entonces tus tareas cuentan como no entregadas.
            </p>
          </div>
        </div>
      )}

      {taskMetrics && !taskMetrics.error && !taskMetrics.repoMissing && (
        <>
          {Object.entries(
            sprintResults.reduce((acc, t) => {
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
                  {/* Phones: one card per task */}
                  <ul className="md:hidden divide-y">
                    {tasks.map((t) => (
                      <li key={t.taskInfo.id} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-medium">{t.taskInfo.name}</p>
                          {!taskManual && (
                            <p className="font-bold whitespace-nowrap">
                              {t.score} <span className="text-muted-foreground font-normal">/ {t.taskInfo.maxScore}</span>
                            </p>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{t.taskInfo.requirement}</p>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          {renderTaskStatus(t)}
                          {!taskManual && <span className="font-mono text-xs text-muted-foreground">{formatDate(t.delivery.date)}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Table className="hidden md:table w-full text-sm text-left">
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
                            {taskManual ? '—' : formatDate(t.delivery.date)}
                          </td>
                          <td className="px-6 py-4 text-center">{renderTaskStatus(t)}</td>
                          <td className="px-6 py-4 text-center font-bold whitespace-nowrap">
                            {taskManual ? '—' : <>{t.score} <span className="text-muted-foreground font-normal">/ {t.taskInfo.maxScore}</span></>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  <div className="p-4 bg-muted/20 border-t flex flex-wrap justify-end gap-x-4 gap-y-1 items-center">
                    {taskManual && <span className="mr-auto text-xs text-blue-900">Revisado por el profesor{saved?.taskReason ? `: ${saved.taskReason}` : ''}</span>}
                    <span className="text-sm text-muted-foreground">Total Sprint {sprint}:</span>
                    <span className="text-2xl font-bold text-primary">
                      {taskManual
                        ? Math.round(saved.taskScore * tasks.reduce((sum, t) => sum + t.taskInfo.maxScore, 0) / 10) / 10
                        : tasks.reduce((sum, t) => sum + t.score, 0)} / {tasks.reduce((sum, t) => sum + t.taskInfo.maxScore, 0)}
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
