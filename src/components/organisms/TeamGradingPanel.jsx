import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RUBRIC_ITEMS, rubricPoints } from '@/lib/projectGrading';

export function TeamGradingPanel({ grades, onGradeChange, disabled = false }) {
  const totalScore = rubricPoints(grades);

  return (
    <Card className="mb-8 border-primary/20">
      <CardHeader className="bg-primary/5 rounded-t-lg">
        <CardTitle className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <span>
            Rúbrica del Proyecto (Equipo)
            <span className="block text-sm font-normal text-muted-foreground mt-1">Guía y retroalimentación: no suma puntos, te ayuda a decidir la expo de cada alumno.</span>
          </span>
          <span className="text-2xl font-bold text-primary whitespace-nowrap">{totalScore} / 10 pts</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-4">
          {RUBRIC_ITEMS.map(item => (
            <div key={item.id} className="flex items-center space-x-3 p-2 hover:bg-secondary/50 rounded transition-colors">
              <Checkbox 
                id={item.id}
                checked={grades[item.id] || false}
                onCheckedChange={(checked) => onGradeChange(item.id, checked === true)}
                disabled={disabled}
                className="w-5 h-5"
              />
              <label 
                htmlFor={item.id} 
                className="text-base font-medium leading-none cursor-pointer flex-1"
              >
                {item.label}
              </label>
              <span className="text-sm font-bold text-muted-foreground bg-secondary px-2 py-1 rounded">
                {item.points} pts
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
