import React, { useState, useEffect, useMemo } from 'react';
import { Table } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { getAllGrades, getAllAttendanceRecords, saveStudentGrades, getTasks } from '@/services/firestoreApi';
import { evaluateStudentTasks } from '@/services/githubApi';
import studentsData from '@/data/students.json';
import { sprintOfDate, isUnexcusedAbsence, attendancePoints, DEFAULT_PARTICIPATION, RECOVERY_ABSENCES } from '@/lib/sprints';
import { PROJECT_SPRINTS } from '@/lib/projectGrading';
import { Badge } from '@/components/ui/badge';
import { LoadingAnimation } from '@/components/atoms/LoadingAnimation';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { RefreshCcw, ExternalLink, Pencil, Save, X, Search, Eye, CheckCircle2 } from 'lucide-react';

const round1 = n => Math.round(n * 10) / 10;

// Stored scores are 0-100 per component; this page shows sprint points
// (tasks 40 + project 50 + attendance 5 + participation 5)
const TASK_WEIGHT = 0.4;
const PROJECT_WEIGHT = 0.5;

export function GradesPage() {
  const [sprint, setSprint] = useState(1);
  // students.json is the single roster used by every page, the rules and the GitHub proxy
  const students = studentsData;
  const [allGrades, setAllGrades] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  // Search and edit state
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [temp, setTemp] = useState({ task: 0, participation: DEFAULT_PARTICIPATION });

  const sprintLabel = `Sprint ${sprint}`;

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        setAttendance(await getAllAttendanceRecords());
        setAllGrades(await getAllGrades());
      } catch (err) {
        console.error("Error loading grades:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const grades = useMemo(
    () => Object.fromEntries(allGrades.filter(g => g.sprint === sprintLabel).map(g => [g.studentId, g])),
    [allGrades, sprintLabel]
  );

  // Unexcused absences that fall in the selected sprint
  const absences = useMemo(() => {
    const map = {};
    attendance
      .filter(a => isUnexcusedAbsence(a) && sprintOfDate(a.date) === sprint)
      .forEach(a => { map[a.studentId] = (map[a.studentId] || 0) + 1; });
    return map;
  }, [attendance, sprint]);

  const updateLocalGrade = (studentId, data) => {
    setAllGrades(prev => {
      const exists = prev.some(g => g.studentId === studentId && g.sprint === sprintLabel);
      return exists
        ? prev.map(g => (g.studentId === studentId && g.sprint === sprintLabel ? { ...g, ...data } : g))
        : [...prev, { studentId, sprint: sprintLabel, ...data }];
    });
  };

  const describeTaskResults = (taskResults) => {
    const parts = taskResults.flatMap(({ taskInfo, delivery, partial }) => {
      const name = taskInfo.name.split(':')[0];
      if (delivery.status === "missing" || delivery.status === "incomplete") return [`No hizo ${name}`];
      const notes = [];
      if (delivery.status === "late") notes.push(`${name} tarde (-20%)`);
      if (partial) notes.push(`${name} parcial`);
      return notes;
    });
    return parts.join(", ") || "Completo";
  };

  const handleSyncTasks = async () => {
    if (!confirm(`Esto revisará las tareas del Sprint ${sprint} en los repositorios de los ${students.length} alumnos. Puede tardar un par de minutos. ¿Continuar?`)) return;

    setIsSyncing(true);
    setSyncProgress(0);
    try {
      const sprintTasks = (await getTasks()).filter(t => Number(t.sprint) === sprint);
      if (!sprintTasks.length) {
        alert(`El Sprint ${sprint} no tiene tareas registradas.`);
        return;
      }
      const maxScore = sprintTasks.reduce((sum, t) => sum + Number(t.maxScore), 0);
      let count = 0;
      for (const student of students) {
        const githubResult = await evaluateStudentTasks(student.repoName, sprintTasks);
        count++;
        setSyncProgress(Math.round((count / students.length) * 100));
        if (githubResult.error) continue;

        const taskScore = maxScore > 0 ? Math.round((githubResult.totalScore / maxScore) * 100) : 0;
        const taskReason = githubResult.repoMissing
          ? "Sin repo de tareas"
          : describeTaskResults(Object.values(githubResult.tasks));
        // A grade the teacher corrected by hand is not overwritten by the sync
        if (grades[student.id]?.taskManual) continue;
        await saveStudentGrades(student.id, sprintLabel, { taskScore, taskReason });
        updateLocalGrade(student.id, { taskScore, taskReason });
      }
    } catch (err) {
      console.error("Error syncing tasks:", err);
      alert("Hubo un error sincronizando algunas tareas.");
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
    }
  };

  const handleEditClick = (studentId, row) => {
    setEditingId(studentId);
    setTemp({ task: row.task ?? 0, participation: row.participation });
  };

  const handleSaveClick = async (studentId, row) => {
    const data = { participationPoints: Math.min(5, Math.max(0, temp.participation)) };
    if (temp.task !== (row.task ?? 0)) {
      data.taskScore = round1(temp.task / TASK_WEIGHT);
      // The student's dashboard shows this instead of the live GitHub check
      data.taskManual = true;
    }
    try {
      await saveStudentGrades(studentId, sprintLabel, data);
      updateLocalGrade(studentId, data);
      setEditingId(null);
    } catch (err) {
      console.error("Error saving grades:", err);
      alert("Hubo un error al guardar las calificaciones.");
    }
  };

  // Undo a hand correction: the next sync writes the automatic grade again
  const handleUseAutomatic = async (studentId) => {
    try {
      await saveStudentGrades(studentId, sprintLabel, { taskManual: false });
      updateLocalGrade(studentId, { taskManual: false });
      setEditingId(null);
    } catch (err) {
      console.error("Error saving grades:", err);
      alert("Hubo un error al guardar las calificaciones.");
    }
  };

  const rows = students
    .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .map(student => {
      const g = grades[student.id] || {};
      const absenceCount = absences[student.id] || 0;
      const row = {
        student,
        absences: absenceCount,
        task: g.taskScore !== undefined ? round1(g.taskScore * TASK_WEIGHT) : null,
        taskReason: g.taskReason || '',
        taskManual: g.taskManual === true,
        project: g.projectScore !== undefined && g.projectScore !== null ? round1(g.projectScore * PROJECT_WEIGHT) : null,
        projectPublished: g.projectPublished === true,
        attendance: attendancePoints(absenceCount),
        participation: g.participationPoints ?? DEFAULT_PARTICIPATION,
        participationSet: g.participationPoints !== undefined,
        inRecovery: absenceCount >= RECOVERY_ABSENCES,
      };
      row.total = row.task === null ? null : round1(row.task + (row.project ?? 0) + row.attendance + row.participation);
      // Tasks and project already graded (attendance always has a value); recovery is shown in red instead
      row.complete = row.task !== null && row.project !== null && !row.inRecovery;
      return row;
    });
  const completeCount = rows.filter(r => r.complete).length;

  const numberInput = (value, max, step, onChange, label) => (
    <input
      type="number" min="0" max={max} step={step}
      aria-label={label}
      className="w-16 p-1 border rounded text-center bg-background"
      value={value}
      onChange={(e) => onChange(Math.min(max, Math.max(0, parseFloat(e.target.value) || 0)))}
    />
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Calificaciones</h1>
          <p className="text-muted-foreground mt-1">
            Tareas 40 + Proyecto 50 + Asistencia 5 + Participación 5 = 100 pts por sprint.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
          <div className="relative flex-1 lg:min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <input
              type="text"
              aria-label="Buscar alumno"
              placeholder="Buscar alumno por nombre..."
              className="w-full pl-9 pr-4 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            onClick={handleSyncTasks}
            disabled={isSyncing || loading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground whitespace-nowrap cursor-pointer"
          >
            <RefreshCcw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
            {isSyncing ? `Sync... ${syncProgress}%` : 'Sincronizar tareas'}
          </Button>
        </div>
      </header>

      <nav aria-label="Sprint" className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {PROJECT_SPRINTS.map(n => (
          <button
            key={n}
            type="button"
            onClick={() => { setSprint(n); setEditingId(null); }}
            aria-current={sprint === n ? 'page' : undefined}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${sprint === n ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Sprint {n}
          </button>
        ))}
      </nav>

      {!loading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-block h-3 w-3 rounded-sm bg-green-100 border border-green-300" aria-hidden="true" />
          En verde, los alumnos con tareas, proyecto y asistencia ya calificados:
          <b className="text-foreground whitespace-nowrap">{completeCount} de {rows.length}</b>
        </p>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingAnimation label="Cargando calificaciones…" />
          ) : (
            <div className="overflow-x-auto">
              <Table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted border-b">
                  <tr>
                    <th scope="col" className="sticky left-0 z-10 bg-muted px-4 sm:px-6 py-3 min-w-[190px]">Alumno</th>
                    <th scope="col" className="px-4 py-3">Equipo</th>
                    <th scope="col" className="px-4 py-3 text-center">Faltas</th>
                    <th scope="col" className="px-4 py-3 text-center">Tareas /40</th>
                    <th scope="col" className="px-4 py-3 text-center">Proyecto /50</th>
                    <th scope="col" className="px-4 py-3 text-center">Asist. /5</th>
                    <th scope="col" className="px-4 py-3 text-center">Part. /5</th>
                    <th scope="col" className="px-4 py-3 text-center text-primary">Total /100</th>
                    <th scope="col" className="px-4 py-3 text-center"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan="9" className="px-6 py-8 text-center text-muted-foreground">
                        No se encontraron alumnos con ese nombre.
                      </td>
                    </tr>
                  )}
                  {rows.map((row) => {
                    const { student } = row;
                    const isEditing = editingId === student.id;

                    return (
                      <tr key={student.id} className={`border-b last:border-0 transition-colors ${row.complete ? 'bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:hover:bg-green-950/50' : row.inRecovery ? 'bg-red-50/60 hover:bg-red-50 dark:bg-red-950/20' : 'hover:bg-muted/30'}`}>
                        {/* Name stays in view while the rest of the row scrolls on small screens */}
                        <td className={`sticky left-0 z-10 px-4 sm:px-6 py-4 font-medium min-w-[190px] ${row.complete ? 'bg-green-50 dark:bg-green-950' : row.inRecovery ? 'bg-red-50 dark:bg-red-950' : 'bg-card'}`}>
                          <div className="flex items-center gap-2">
                            {student.name}
                            <a
                              href={`https://github.com/classroom-programacion-web/${student.repoName}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-muted-foreground hover:text-primary transition-colors"
                              aria-label={`Abrir repositorio de ${student.name}`}
                            >
                              <ExternalLink className="w-4 h-4" aria-hidden="true" />
                            </a>
                            {student.githubUsername && (
                              <a
                                href={`/dashboard/my-grades?preview=${student.githubUsername}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-muted-foreground hover:text-blue-500 transition-colors"
                                aria-label={`Ver la pantalla de ${student.name}`}
                              >
                                <Eye className="w-4 h-4" aria-hidden="true" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">{student.teamId}</td>
                        <td className={`px-4 py-4 text-center text-lg ${row.inRecovery ? 'font-bold text-red-600' : ''}`}>{row.absences}</td>

                        <td className="px-4 py-4 text-center">
                          {isEditing ? (
                            <div className="flex flex-col items-center gap-1">
                              {numberInput(temp.task, 40, 0.5, v => setTemp({ ...temp, task: v }), `Tareas de ${student.name}`)}
                              {row.taskManual && (
                                <button type="button" onClick={() => handleUseAutomatic(student.id)} className="text-[10px] text-primary underline cursor-pointer">
                                  Usar automática
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="font-bold" title={row.taskManual ? 'Ajustada a mano (la sincronización no la cambia)' : row.taskReason || "Sincroniza para ver detalles"}>
                              {row.task === null ? <span className="text-muted-foreground/60">—</span> : row.task}
                              {row.taskManual && <span className="block text-[10px] font-normal text-amber-700">a mano</span>}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-center">
                          {/* The project is graded on the team page, where it is also published */}
                          {row.project === null ? (
                            <Link to={`/dashboard/team/${student.teamId}`} className="text-muted-foreground/60 hover:text-primary" title="Calificar en la pantalla del equipo">—</Link>
                          ) : (
                            <Link to={`/dashboard/team/${student.teamId}`} className="hover:underline" title={row.projectPublished ? 'Publicado al alumno · editar en Equipos' : 'Aún no publicado · editar en Equipos'}>
                              {row.project}
                              {!row.projectPublished && <span className="block text-[10px] text-amber-700">sin publicar</span>}
                            </Link>
                          )}
                        </td>

                        <td className="px-4 py-4 text-center">{row.attendance}</td>

                        <td className="px-4 py-4 text-center">
                          {isEditing ? numberInput(temp.participation, 5, 0.5, v => setTemp({ ...temp, participation: v }), `Participación de ${student.name}`) : (
                            row.participationSet ? (
                              <Badge variant={row.participation === 5 ? "default" : row.participation >= 2.5 ? "secondary" : "destructive"}>
                                {row.participation}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground" title="Se asigna al calificar la demo del equipo">
                                0<span className="block text-[10px]">pendiente</span>
                              </span>
                            )
                          )}
                        </td>

                        <td className={`px-4 py-4 text-center font-bold ${row.inRecovery ? 'text-red-600' : 'text-primary'}`}>
                          {row.inRecovery ? 'Recuperación' : row.total === null ? '—' : (
                            <>
                              <span className={`inline-flex items-center gap-1 ${row.complete ? 'text-green-700 dark:text-green-400' : ''}`}>
                                {row.complete && <CheckCircle2 className="w-4 h-4" aria-label="Completo" />}
                                {row.total}
                              </span>
                              {row.project === null && <span className="block text-[10px] font-normal text-muted-foreground">sin proyecto</span>}
                            </>
                          )}
                        </td>

                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {isEditing ? (
                              <>
                                <button onClick={() => handleSaveClick(student.id, row)} className="text-green-600 hover:text-green-700 bg-green-500/10 p-1.5 rounded-md cursor-pointer" aria-label="Guardar">
                                  <Save className="w-4 h-4" aria-hidden="true" />
                                </button>
                                <button onClick={() => setEditingId(null)} className="text-red-600 hover:text-red-700 bg-red-500/10 p-1.5 rounded-md cursor-pointer" aria-label="Cancelar">
                                  <X className="w-4 h-4" aria-hidden="true" />
                                </button>
                              </>
                            ) : (
                              <button onClick={() => handleEditClick(student.id, row)} className="text-blue-600 hover:text-blue-700 bg-blue-500/10 p-1.5 rounded-md transition-colors cursor-pointer" aria-label={`Editar calificaciones de ${student.name}`}>
                                <Pencil className="w-4 h-4" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Asistencia: 0–1 faltas = 5 · 2 faltas = 2.5 · 3 = 0 · {RECOVERY_ABSENCES} o más faltas sin justificar = recuperación. La participación está en 0 hasta calificar la demo del equipo (en Equipos, junto a la expo, o con el lápiz). El proyecto se califica y publica en Equipos.
      </p>
    </div>
  );
}
