import React, { useEffect, useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { evaluateStudentTasks } from '@/services/githubApi';

export function StudentStatusRow({ student, score, onScoreChange }) {
  const [taskStatus, setTaskStatus] = useState({ loading: true, error: false, hasImage: false, hasButton: false, commitTime: null });

  useEffect(() => {
    let mounted = true;
    async function checkGithub() {
      if (!student.repoName) return;
      setTaskStatus(s => ({ ...s, loading: true }));
      
      const result = await evaluateStudentTasks(student.repoName);
      
      if (mounted) {
        setTaskStatus({
          loading: false,
          error: result.delivery.status === "error",
          hasImage: result.task1,
          hasButton: result.task2,
          commitTime: result.delivery.date
        });
      }
    }
    checkGithub();
    return () => { mounted = false; };
  }, [student.repoName]);

  const formatDate = (dateObj) => {
    if (!dateObj) return "Sin commits";
    return dateObj.toLocaleString();
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg gap-4 bg-card text-card-foreground">
      <div className="flex-1">
        <h4 className="font-semibold">{student.name}</h4>
        <p className="text-sm text-muted-foreground">{student.githubUser} | {student.repoName}</p>
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
          <>
            <Badge variant={taskStatus.hasImage ? "default" : "secondary"}>
              {taskStatus.hasImage ? "✅ Imagen" : "❌ Imagen"}
            </Badge>
            <Badge variant={taskStatus.hasButton ? "default" : "secondary"}>
              {taskStatus.hasButton ? "✅ Formulario" : "❌ Formulario"}
            </Badge>
          </>
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
