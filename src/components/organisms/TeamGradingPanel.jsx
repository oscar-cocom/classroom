import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

const RUBRIC_ITEMS = [
  { id: "func", label: "Funcionalidades terminadas", points: 4 },
  { id: "demo", label: "Demo funciona en vivo sin errores", points: 2 },
  { id: "repo", label: "Repo con commits de todos", points: 2 },
  { id: "scrum", label: "Tablero Scrum al día", points: 1 },
  { id: "po", label: "Presentación clara del PO", points: 1 }
];

export function TeamGradingPanel({ grades, onGradeChange }) {
  const totalScore = RUBRIC_ITEMS.reduce((sum, item) => {
    return sum + (grades[item.id] ? item.points : 0);
  }, 0);

  return (
    <Card className="mb-8 border-primary/20">
      <CardHeader className="bg-primary/5 rounded-t-lg">
        <CardTitle className="flex justify-between items-center">
          <span>Rúbrica del Proyecto (Equipo)</span>
          <span className="text-2xl font-bold text-primary">{totalScore} / 10 pts</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {RUBRIC_ITEMS.map(item => (
            <div key={item.id} className="flex items-center space-x-3 p-2 hover:bg-secondary/50 rounded transition-colors">
              <Checkbox 
                id={item.id}
                checked={grades[item.id] || false}
                onCheckedChange={(checked) => onGradeChange(item.id, checked)}
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
