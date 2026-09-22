import React from 'react';
import { TeamCard } from '@/components/molecules/TeamCard';
import teamsData from '@/data/teams.json';

export function DashboardPage() {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Gestor de Evaluaciones</h1>
        <p className="text-muted-foreground mt-2">
          Programación Web (AEB-1055) - Sprint 1
        </p>
      </header>

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
