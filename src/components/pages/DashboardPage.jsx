import React from 'react';
import { TeamCard } from '@/components/molecules/TeamCard';
import teamsData from '@/data/teams.json';
import tasksData from '@/data/tasks.json';

export function DashboardPage() {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Gestor de Evaluaciones</h1>
        <p className="text-muted-foreground mt-2">
          Programación Web (AEB-1055) - Sprint 1
        </p>
      </header>

      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-4">Registro de Tareas Activas</h2>
        <div className="bg-card text-card-foreground border rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3 font-semibold">Sprint</th>
                <th className="px-6 py-3 font-semibold">Tarea</th>
                <th className="px-6 py-3 font-semibold">Fecha Asignada</th>
                <th className="px-6 py-3 font-semibold">Límite</th>
                <th className="px-6 py-3 font-semibold text-center">Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tasksData.map(task => (
                <tr key={task.id} className="hover:bg-muted/30">
                  <td className="px-6 py-4 font-medium">Sprint {task.sprint}</td>
                  <td className="px-6 py-4">{task.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {new Date(task.dateAssigned).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {new Date(task.deadline).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-primary">{task.maxScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teamsData.map((team) => (
          <TeamCard 
            key={team.id} 
            team={team} 
            progress={0} // To be wired to firebase later
          />
        ))}
      </div>
    </div>
  );
}
