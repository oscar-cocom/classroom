import React, { useState, useEffect } from 'react';
import { TeamCard } from '@/components/molecules/TeamCard';
import teamsData from '@/data/teams.json';
import { getTasks, migrateTasksToFirestore } from '@/services/firestoreApi';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CreateTaskModal } from '@/components/organisms/CreateTaskModal';
import { CodeBlock } from '@/components/atoms/CodeBlock';

export function DashboardPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadTasks = async () => {
    setLoading(true);
    await migrateTasksToFirestore();
    const fetchedTasks = await getTasks();
    setTasks(fetchedTasks.sort((a, b) => a.sprint - b.sprint || new Date(a.dateAssigned) - new Date(b.dateAssigned)));
    setLoading(false);
  };

  useEffect(() => {
    loadTasks();
  }, []);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Gestor de Evaluaciones</h1>
        <p className="text-muted-foreground mt-2">
          Programación Web (AEB-1055) - Dashboard
        </p>
      </header>

      <div className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Registro de Tareas Activas</h2>
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Agregar Tarea
          </Button>
        </div>
        
        <div className="bg-card text-card-foreground border rounded-lg overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Cargando tareas...</div>
          ) : (
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
                {tasks.map(task => (
                  <tr key={task.id} className="hover:bg-muted/30 group">
                    <td className="px-6 py-4 font-medium align-top">Sprint {task.sprint}</td>
                    <td className="px-6 py-4 align-top">
                      <div className="font-semibold">{task.name}</div>
                      <div className="text-muted-foreground mt-1">{task.requirement}</div>
                      {task.template && (
                        <div className="mt-4">
                          <CodeBlock code={task.template} language="javascript" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground align-top">
                      {new Date(task.dateAssigned).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground align-top">
                      {new Date(task.deadline).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-primary align-top">{task.maxScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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

      <CreateTaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onTaskCreated={loadTasks} 
      />
    </div>
  );
}
