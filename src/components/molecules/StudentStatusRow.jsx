import React, { useEffect, useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { evaluateStudentTasks } from '@/services/githubApi';

export function StudentStatusRow({ student, score, onScoreChange, tasksList = [], currentSprint = 1 }) {
  const [taskStatus, setTaskStatus] = useState({ loading: true, error: false, totalScore: 0, sprintScores: {}, commitTime: null });

  useEffect(() => {
    let mounted = true;
    async function checkGithub() {
      if (!student.repoName || tasksList.length === 0) return;
      setTaskStatus(s => ({ ...s, loading: true }));
      
      try {
        const result = await evaluateStudentTasks(student.repoName, tasksList);
        
        if (mounted) {
          // Find the latest delivery date among tasks for THIS sprint
          const sprintTasks = Object.values(result.tasks).filter(t => t.taskInfo.sprint === currentSprint);
          const latestCommit = sprintTasks
            .map(t => t.delivery.date)
            .filter(d => d)
            .sort((a, b) => b - a)[0] || null;

          setTaskStatus({
            loading: false,
            error: result.error,
            totalScore: result.totalScore,
            sprintScores: result.sprintScores,
            commitTime: latestCommit
          });
        }
      } catch (err) {
        if (mounted) {
          setTaskStatus({ loading: false, error: true });
        }
      }
    }
    checkGithub();
    return () => { mounted = false; };
  }, [student.repoName, currentSprint, tasksList]);

  const formatDate = (dateObj) => {
    if (!dateObj) return "Sin commits";
    return dateObj.toLocaleString();
  };

  const sprintScore = taskStatus.sprintScores[currentSprint] || 0;

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg gap-4 bg-card text-card-foreground">
      <div className="flex-1">
        <h4 className="font-semibold">{student.name}</h4>
        <p className="text-sm text-muted-foreground">{student.githubUsername} | {student.repoName}</p>
        <div className="mt-2 text-xs text-muted-foreground">
          Último commit: {taskStatus.loading ? "Cargando..." : formatDate(taskStatus.commitTime)}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {taskStatus.loading ? (
          <Badge variant="outline">Verificando tarea...</Badge>
        ) : taskStatus.error ? (
          <Badge variant="destructive">Error repo</Badge>
        ) : (
          <Badge variant="default" className="bg-primary/20 text-primary hover:bg-primary/30 border-0">
            Tareas Sprint {currentSprint}: {sprintScore} pts
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2 min-w-[120px]">
        <span className="text-sm">Expo:</span>
        <select 
          className="p-1 border rounded w-full bg-background text-foreground"
          value={score || 0} 
          onChange={(e) => onScoreChange(student.id, parseInt(e.target.value))}
        >
          {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
            <option key={n} value={n}>{n} pts</option>
          ))}
        </select>
      </div>
    </div>
  );
}
