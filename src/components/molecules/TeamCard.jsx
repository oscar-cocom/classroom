import React from 'react';
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CheckCircle2, Eye } from "lucide-react";

// Grading status of one team's project for a sprint
function statusOf(graded, total, published) {
  if (total > 0 && graded === total) return published ? 'published' : 'graded';
  return graded > 0 ? 'progress' : 'pending';
}

const STATUS = {
  pending: { label: 'Pendiente', className: 'border-border text-muted-foreground bg-background', bar: 'bg-primary' },
  progress: { label: 'En progreso', className: 'border-amber-300 text-amber-900 bg-amber-50', bar: 'bg-amber-500' },
  graded: { label: 'Calificado', className: 'border-green-300 text-green-800 bg-green-50', bar: 'bg-green-600' },
  published: { label: 'Publicado', className: 'border-green-600 text-white bg-green-600', bar: 'bg-green-600' },
};

export function TeamCard({ team, graded = 0, total = 0, published = false, sprint = 1 }) {
  const status = statusOf(graded, total, published);
  const { label, className, bar } = STATUS[status];
  const progress = total > 0 ? Math.round((graded / total) * 100) : 0;
  const Icon = status === 'published' ? Eye : CheckCircle2;

  return (
    <Link
      to={`/dashboard/team/${team.id}`}
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`${team.name}: ${label}, ${graded} de ${total} alumnos con expo en el Sprint ${sprint}`}
    >
      <Card className={`h-full cursor-pointer transition-shadow duration-200 hover:shadow-md ${status === 'published' || status === 'graded' ? 'border-green-300' : ''}`}>
        <CardHeader>
          <CardTitle className="text-xl flex justify-between items-center gap-2">
            {team.name}
            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${className}`}>
              {(status === 'graded' || status === 'published') && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
              {label}{status === 'progress' && ` ${graded}/${total}`}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Repo: {team.repoName}</p>
          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
            <div className={`${bar} h-full transition-all duration-300`} style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {graded} de {total} alumnos con expo · Sprint {sprint}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
