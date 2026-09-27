import React, { useState, useEffect } from 'react';
import { TeamCard } from '@/components/molecules/TeamCard';
import teamsData from '@/data/teams.json';
import studentsData from '@/data/students.json';
import { getTasks, migrateTasksToFirestore, deleteTask, getAllTeamEvaluations } from '@/services/firestoreApi';
import { PROJECT_SPRINTS } from '@/lib/projectGrading';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { CreateTaskModal } from '@/components/organisms/CreateTaskModal';
import { CodeBlock } from '@/components/atoms/CodeBlock';

export function DashboardPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [evaluations, setEvaluations] = useState({});
  const [projectSprint, setProjectSprint] = useState(1);

  const loadTasks = async () => {
    setLoading(true);
    await migrateTasksToFirestore();
    const fetchedTasks = await getTasks();
    setTasks(fetchedTasks.sort((a, b) => a.sprint - b.sprint || new Date(a.dateAssigned) - new Date(b.dateAssigned)));
    setLoading(false);
  };

  useEffect(() => {
    loadTasks();
    getAllTeamEvaluations()
      .then(setEvaluations)
      .catch(err => console.error('Error loading team evaluations:', err));
  }, []);

  const handleEdit = (task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta tarea permanentemente?")) {
      await deleteTask(id);
      loadTasks();
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setEditingTask(null), 200); // clear after animation
  };

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
                  <th className="px-6 py-3 font-semibold text-right">Acciones</th>
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
                    <td className="px-6 py-4 align-top text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(task)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(task.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-2xl font-bold">Proyecto por equipo</h2>
        <nav aria-label="Sprint del proyecto" className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          {PROJECT_SPRINTS.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setProjectSprint(n)}
              aria-current={projectSprint === n ? 'page' : undefined}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${projectSprint === n ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Sprint {n}
            </button>
          ))}
        </nav>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teamsData.map((team) => {
          const members = studentsData.filter(s => s.teamId === team.id);
          const evaluation = evaluations[team.id]?.[projectSprint] || {};
          const graded = members.filter(s => evaluation.students?.[s.id] !== undefined).length;
          return (
            <TeamCard 
              key={team.id} 
              team={team} 
              graded={graded}
              total={members.length}
              published={evaluation.published === true}
              sprint={projectSprint}
            />
          );
        })}
      </div>

      <CreateTaskModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        onTaskCreated={loadTasks}
        editingTask={editingTask}
      />
    </div>
  );
}
