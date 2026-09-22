import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

export function TeamCard({ team, progress = 0 }) {
  const navigate = useNavigate();

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/team/${team.id}`)}
    >
      <CardHeader>
        <CardTitle className="text-xl flex justify-between items-center">
          {team.name}
          {progress === 100 ? (
            <Badge variant="default">Completado</Badge>
          ) : (
            <Badge variant="outline">Pendiente</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">Repo: {team.repoName}</p>
        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
          <div 
            className="bg-primary h-full transition-all" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
