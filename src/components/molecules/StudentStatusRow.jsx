import React, { useEffect, useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { evaluateStudentTasks } from '@/services/githubApi';

export function StudentStatusRow({ student, score, projectScore = null, onScoreChange, tasksList = [], currentSprint = 1, disabled = false }) {
  const [taskStatus, setTaskStatus] = useState({ loading: true, error: false, tasks: {} });

  useEffect(() => {
    let mounted = true;
    async function checkGithub() {
      if (!student.repoName || tasksList.length === 0) return;
      setTaskStatus(s => ({ ...s, loading: true }));
      
      try {
        const result = await evaluateStudentTasks(student.repoName, tasksList);
        if (mounted) {
          setTaskStatus({ loading: false, error: result.error, repoMissing: result.repoMissing, tasks: result.tasks });
        }
      } catch {
        if (mounted) {
          setTaskStatus({ loading: false, error: true, tasks: {} });
        }
      }
    }
    checkGithub();
    return () => { mounted = false; };
  }, [student.repoName, tasksList]);

  // Task points of the selected sprint on the same scale as the grades page (out of 40)
  const sprintTasks = Object.values(taskStatus.tasks).filter(t => Number(t.taskInfo.sprint) === Number(currentSprint));
  const sprintMax = tasksList
    .filter(t => Number(t.sprint) === Number(currentSprint))
    .reduce((sum, t) => sum + Number(t.maxScore), 0);
  const sprintPoints = sprintMax > 0
    ? Math.round((sprintTasks.reduce((sum, t) => sum + t.score, 0) / sprintMax) * 400) / 10
    : null;
  const commitTime = sprintTasks
    .map(t => t.delivery.date)
    .filter(Boolean)
    .sort((a, b) => b - a)[0] || null;

  const formatDate = (dateObj) => {
    if (!dateObj) return "Sin entrega";
    return dateObj.toLocaleString('es-MX');
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg gap-4 bg-card text-card-foreground">
      <div className="flex-1">
        <h4 className="font-semibold">{student.name}</h4>
        <p className="text-sm text-muted-foreground">{student.githubUsername} | {student.repoName}</p>
        <div className="mt-2 text-xs text-muted-foreground">
          Último commit: {taskStatus.loading ? "Cargando..." : formatDate(commitTime)}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {taskStatus.loading ? (
          <Badge variant="outline">Verificando tarea...</Badge>
        ) : taskStatus.repoMissing ? (
          <Badge variant="destructive">Sin repo de tareas</Badge>
        ) : taskStatus.error ? (
          <Badge variant="destructive">Error repo</Badge>
        ) : (
          <Badge variant="default" className="bg-primary/20 text-primary hover:bg-primary/30 border-0">
            Tareas Sprint {currentSprint}: {sprintPoints === null ? '—' : `${sprintPoints} / 40 pts`}
          </Badge>
        )}
      </div>

      <div className="flex flex-col gap-1 min-w-[140px]">
        <label className="flex items-center gap-2 text-sm">
          Expo:
          <select 
            className="p-1 border rounded w-full bg-background text-foreground cursor-pointer disabled:cursor-not-allowed"
            value={score ?? ''} 
            disabled={disabled}
            onChange={(e) => onScoreChange(student.id, parseInt(e.target.value))}
          >
            <option value="" disabled>Sin calificar</option>
            {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
              <option key={n} value={n}>{n} / 10 → {n * 5} pts</option>
            ))}
          </select>
        </label>
        {projectScore !== null && (
          <span className="text-xs text-muted-foreground">Proyecto: <b className="text-foreground">{Math.round(projectScore * 5) / 10} / 50 pts</b></span>
        )}
      </div>
    </div>
  );
}
