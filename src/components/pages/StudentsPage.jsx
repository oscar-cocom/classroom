import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, ExternalLink } from 'lucide-react';
import studentsData from '@/data/students.json';
import teamsData from '@/data/teams.json';

export function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeam, setFilterTeam] = useState('all');

  const filtered = studentsData.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTeam = filterTeam === 'all' || s.teamId === filterTeam;
    return matchesSearch && matchesTeam;
  });

  const teamColors = {
    amazon: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    steam: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    playstation: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
    samsung: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300',
    steren: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    michoacana: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
    nintendo: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    mercadolibre: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Lista de Alumnos</h1>
        <p className="text-muted-foreground mt-1">{studentsData.length} alumnos registrados</p>
      </header>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Buscar alumno..." 
            className="w-full pl-9 pr-4 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={filterTeam}
          onChange={(e) => setFilterTeam(e.target.value)}
          className="px-3 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="all">Todos los equipos</option>
          {teamsData.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50 border-b">
                <tr>
                  <th className="px-6 py-3">#</th>
                  <th className="px-6 py-3">Nombre Completo</th>
                  <th className="px-6 py-3">Equipo</th>
                  <th className="px-6 py-3">Repositorio</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-muted-foreground">
                      No se encontraron alumnos.
                    </td>
                  </tr>
                ) : null}
                {filtered.map((student, idx) => (
                  <tr key={student.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-muted-foreground">{idx + 1}</td>
                    <td className="px-6 py-4 font-medium">{student.name}</td>
                    <td className="px-6 py-4">
                      <Badge className={`${teamColors[student.teamId] || 'bg-muted text-muted-foreground'} border-0`}>
                        {student.teamId}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <a 
                        href={`https://github.com/classroom-programacion-web/${student.repoName}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1 text-xs font-mono"
                      >
                        {student.repoName}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
