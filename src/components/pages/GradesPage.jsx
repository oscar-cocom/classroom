import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getStudents, getAllGrades, getAllAttendanceRecords, saveTaskGrade, saveStudentGrades } from '@/services/firestoreApi';
import { evaluateStudentTasks } from '@/services/githubApi';
import studentsData from '@/data/students.json';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCcw, ExternalLink, Pencil, Save, X, Search } from 'lucide-react';

export function GradesPage() {
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState({});
  const [absences, setAbsences] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  // Search and Edit state
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [tempGrades, setTempGrades] = useState({ taskScore: 0, projectScore: 0, participationScore: 0 });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        let dbStudents = await getStudents();
        if (dbStudents.length === 0) dbStudents = studentsData;
        setStudents(dbStudents);

        // Load attendance
        const allAttendance = await getAllAttendanceRecords();
        const absencesMap = {};
        allAttendance.forEach(a => {
          if (!a.isPresent) {
            absencesMap[a.studentId] = (absencesMap[a.studentId] || 0) + 1;
          }
        });
        setAbsences(absencesMap);

        // Load grades
        const allGrades = await getAllGrades();
        const gradesMap = {};
        allGrades.forEach(g => {
          if (g.sprint === 'Sprint 1') {
            gradesMap[g.studentId] = g;
          }
        });
        setGrades(gradesMap);
      } catch (err) {
        console.error("Error loading grades:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSyncTasks = async () => {
    if (!confirm("Esto revisará los repositorios de GitHub de los 36 alumnos. Puede tardar un par de minutos. ¿Continuar?")) return;
    
    setIsSyncing(true);
    setSyncProgress(0);
    try {
      const updatedGrades = { ...grades };
      let count = 0;
      for (const student of students) {
        const githubResult = await evaluateStudentTasks(student.repoName);
        const taskScore = githubResult.totalScore || 0;
        
        let reasonParts = [];
        if (githubResult.delivery.status === "late") reasonParts.push("Entrega tardía (-20 pts)");
        if (githubResult.task2.status === "partial") reasonParts.push("Solo 1 botón en form");
        if (githubResult.task2.status === "missing") reasonParts.push("No hizo Tarea 2");
        if (!githubResult.task1.completed) reasonParts.push("No hizo Tarea 1");
        const taskReason = reasonParts.join(", ") || "Completo";
        
        await saveStudentGrades(student.id, 'Sprint 1', { taskScore, taskReason });
        
        if (!updatedGrades[student.id]) updatedGrades[student.id] = {};
        updatedGrades[student.id].taskScore = taskScore;
        updatedGrades[student.id].taskReason = taskReason;
        
        count++;
        setSyncProgress(Math.round((count / students.length) * 100));
        setGrades({ ...updatedGrades });
      }
    } catch (err) {
      console.error("Error syncing tasks:", err);
      alert("Hubo un error sincronizando algunas tareas.");
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
    }
  };

  const getAutoParticipation = (absenceCount) => {
    if (absenceCount <= 1) return 100;
    if (absenceCount === 2) return 50;
    return 0;
  };

  const renderAbsences = (count) => {
    if (count >= 4) {
      return <span className="font-bold text-red-500">+{count}</span>;
    }
    return count;
  };

  const handleEditClick = (studentId, currentTask, currentProject, currentPart) => {
    setEditingId(studentId);
    setTempGrades({
      taskScore: currentTask === '-' ? 0 : currentTask,
      projectScore: currentProject === '-' ? 0 : currentProject,
      participationScore: currentPart
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveClick = async (studentId) => {
    try {
      await saveStudentGrades(studentId, 'Sprint 1', {
        taskScore: tempGrades.taskScore,
        projectScore: tempGrades.projectScore,
        participationScoreOverride: tempGrades.participationScore
      });

      setGrades(prev => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          taskScore: tempGrades.taskScore,
          projectScore: tempGrades.projectScore,
          participationScoreOverride: tempGrades.participationScore
        }
      }));
      setEditingId(null);
    } catch (err) {
      console.error("Error saving grades:", err);
      alert("Hubo un error al guardar las calificaciones.");
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Calificaciones - Sprint 1</h1>
          <p className="text-muted-foreground mt-1">
            Revisión automática de Tareas. Ahora con buscador y editor manual de notas.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar alumno por nombre..." 
              className="w-full pl-9 pr-4 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button 
            onClick={handleSyncTasks} 
            disabled={isSyncing || loading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground whitespace-nowrap"
          >
            <RefreshCcw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? `Sync... ${syncProgress}%` : 'Sincronizar'}
          </Button>
        </div>
      </header>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6">Cargando datos...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 border-b">
                  <tr>
                    <th className="px-6 py-3">Alumno</th>
                    <th className="px-6 py-3">Equipo</th>
                    <th className="px-4 py-3 text-center">Faltas</th>
                    <th className="px-4 py-3 text-center">Tareas (40%)</th>
                    <th className="px-4 py-3 text-center">Proyecto (50%)</th>
                    <th className="px-4 py-3 text-center">Part. (10%)</th>
                    <th className="px-4 py-3 text-center text-primary">Final (100%)</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-8 text-center text-muted-foreground">
                        No se encontraron alumnos con ese nombre.
                      </td>
                    </tr>
                  ) : null}
                  {filteredStudents.map((student) => {
                    const absenceCount = absences[student.id] || 0;
                    const autoPart = getAutoParticipation(absenceCount);
                    
                    const participationScore = grades[student.id]?.participationScoreOverride !== undefined 
                      ? grades[student.id].participationScoreOverride 
                      : autoPart;

                    const taskScore = grades[student.id]?.taskScore !== undefined ? grades[student.id].taskScore : '-';
                    const taskReason = grades[student.id]?.taskReason || '';
                    
                    const projectScore = grades[student.id]?.projectScore !== undefined ? grades[student.id].projectScore : '-';
                    const isFailedByAbsences = absenceCount >= 4;
                    
                    let finalGradeDisplay = '-';
                    if (taskScore !== '-' && projectScore !== '-') {
                      const computedFinalGrade = (taskScore * 0.4) + (projectScore * 0.5) + (participationScore * 0.1);
                      finalGradeDisplay = isFailedByAbsences ? "EXAMEN" : computedFinalGrade.toFixed(1);
                    }

                    const isEditing = editingId === student.id;

                    return (
                      <tr key={student.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-6 py-4 font-medium flex items-center gap-2">
                          {student.name}
                          <a 
                            href={`https://github.com/classroom-programacion-web/${student.repoName}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title="Abrir repositorio en GitHub"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <a 
                            href={`/dashboard/my-grades?preview=${student.githubUsername}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-muted-foreground hover:text-blue-500 transition-colors ml-1"
                            title="Ver dashboard como este alumno"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                          </a>
                        </td>
                        <td className="px-6 py-4">{student.teamId}</td>
                        <td className="px-4 py-4 text-center text-lg">{renderAbsences(absenceCount)}</td>
                        
                        <td className="px-4 py-4 text-center">
                          {isEditing ? (
                            <input 
                              type="number" min="0" max="100" 
                              className="w-16 p-1 border rounded text-center bg-background"
                              value={tempGrades.taskScore}
                              onChange={(e) => setTempGrades({...tempGrades, taskScore: parseInt(e.target.value) || 0})}
                            />
                          ) : (
                            <div className="group relative inline-block">
                              <span className="font-bold cursor-help underline decoration-dotted decoration-muted-foreground/50">
                                {taskScore === '-' ? <span className="text-muted-foreground/50">N/A</span> : taskScore}
                              </span>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-max bg-zinc-900 text-white text-xs rounded py-1.5 px-3 z-50 shadow-xl pointer-events-none">
                                {taskReason || "Sincroniza para ver detalles"}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900"></div>
                              </div>
                            </div>
                          )}
                        </td>
                        
                        <td className="px-4 py-4 text-center">
                          {isEditing ? (
                            <input 
                              type="number" min="0" max="100" 
                              className="w-16 p-1 border rounded text-center bg-background"
                              value={tempGrades.projectScore}
                              onChange={(e) => setTempGrades({...tempGrades, projectScore: parseInt(e.target.value) || 0})}
                            />
                          ) : (
                            projectScore
                          )}
                        </td>
                        
                        <td className="px-4 py-4 text-center">
                          {isEditing ? (
                            <input 
                              type="number" min="0" max="100" 
                              className="w-16 p-1 border rounded text-center bg-background"
                              value={tempGrades.participationScore}
                              onChange={(e) => setTempGrades({...tempGrades, participationScore: parseInt(e.target.value) || 0})}
                            />
                          ) : (
                            <Badge variant={participationScore === 100 ? "default" : participationScore >= 50 ? "secondary" : "destructive"}>
                              {participationScore}
                            </Badge>
                          )}
                        </td>
                        
                        <td className={`px-4 py-4 text-center font-bold ${isFailedByAbsences ? 'text-red-500' : 'text-primary'}`}>
                          {finalGradeDisplay}
                        </td>
                        
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {isEditing ? (
                              <>
                                <button onClick={() => handleSaveClick(student.id)} className="text-green-600 hover:text-green-700 bg-green-500/10 p-1.5 rounded-md" title="Guardar">
                                  <Save className="w-4 h-4" />
                                </button>
                                <button onClick={handleCancelEdit} className="text-red-600 hover:text-red-700 bg-red-500/10 p-1.5 rounded-md" title="Cancelar">
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <button onClick={() => handleEditClick(student.id, taskScore, projectScore, participationScore)} className="text-blue-600 hover:text-blue-700 bg-blue-500/10 p-1.5 rounded-md transition-colors" title="Editar">
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
