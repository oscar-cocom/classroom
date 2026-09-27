import React, { useEffect, useMemo, useState } from 'react';
import { Table } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getFollowUps, saveFollowUp, deleteFollowUp } from '@/services/firestoreApi';
import { evaluateStudentTasks } from '@/services/githubApi';
import studentsData from '@/data/students.json';
import { LoadingAnimation } from '@/components/atoms/LoadingAnimation';
import {
  ClipboardList, RefreshCcw, Copy, Check, ExternalLink, Plus, Trash2,
  UserX, FolderX, FileWarning, MessageSquareText, CircleCheck, Clock,
} from 'lucide-react';

const ORG_URL = 'https://github.com/classroom-programacion-web';

const ISSUES = {
  no_account: { label: 'Sin cuenta de GitHub', icon: UserX },
  no_repo: { label: 'Sin repo de tareas', icon: FolderX },
  no_work: { label: 'Repo sin tareas subidas', icon: FileWarning },
  manual: { label: 'Nota manual', icon: MessageSquareText },
};

const STATUSES = {
  pendiente: { label: 'Pendiente', className: 'bg-amber-100 text-amber-900 border-amber-300' },
  avisado: { label: 'Avisado', className: 'bg-blue-100 text-blue-900 border-blue-300' },
  resuelto: { label: 'Resuelto', className: 'bg-green-100 text-green-900 border-green-300' },
};

// Checks every student's task repo, a few at a time to stay polite with the GitHub API
async function detectIssues(students, onProgress) {
  const issues = {};
  let done = 0;
  const queue = [...students];
  async function worker() {
    while (queue.length) {
      const student = queue.shift();
      if (!student.githubUsername) {
        issues[student.id] = 'no_account';
      } else {
        const result = await evaluateStudentTasks(student.repoName);
        if (result.repoMissing) issues[student.id] = 'no_repo';
        else if (!result.error && result.studentCommits === 0) issues[student.id] = 'no_work';
      }
      onProgress(Math.round((++done / students.length) * 100));
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  return issues;
}

export function FollowUpPage() {
  const [followUps, setFollowUps] = useState({});
  const [issues, setIssues] = useState({});
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [filter, setFilter] = useState('activos');
  const [savingId, setSavingId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [newEntry, setNewEntry] = useState({ studentId: '', reason: '' });

  const runScan = async () => {
    setScanning(true);
    setScanProgress(0);
    try {
      setIssues(await detectIssues(studentsData, setScanProgress));
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    getFollowUps().then(list => setFollowUps(Object.fromEntries(list.map(f => [f.studentId, f]))));
    runScan();
  }, []);

  // A student shows up when GitHub reports a problem or the teacher added a note
  const rows = useMemo(() => studentsData
    .filter(s => issues[s.id] || followUps[s.id])
    .map(s => {
      const saved = followUps[s.id] || {};
      return {
        student: s,
        issue: issues[s.id] || (saved.manual ? 'manual' : null),
        status: saved.status || 'pendiente',
        note: saved.note || '',
        reason: saved.reason || '',
        manual: !!saved.manual,
        updatedAt: saved.updatedAt,
      };
    })
    .sort((a, b) => a.student.name.localeCompare(b.student.name)), [issues, followUps]);

  const counts = useMemo(() => rows.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {}), [rows]);

  const visibleRows = rows.filter(r =>
    filter === 'todos' ? true : filter === 'activos' ? r.status !== 'resuelto' : r.status === filter);

  const update = async (studentId, data) => {
    setSavingId(studentId);
    const next = { ...followUps[studentId], studentId, ...data };
    setFollowUps(prev => ({ ...prev, [studentId]: next }));
    try {
      await saveFollowUp(studentId, data);
    } catch (err) {
      console.error('Error saving follow-up:', err);
      alert('No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (studentId) => {
    if (!confirm('¿Quitar a este alumno del seguimiento?')) return;
    await deleteFollowUp(studentId);
    setFollowUps(prev => {
      const { [studentId]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const addManual = async (e) => {
    e.preventDefault();
    if (!newEntry.studentId) return;
    await update(newEntry.studentId, { manual: true, reason: newEntry.reason.trim(), status: 'pendiente' });
    setNewEntry({ studentId: '', reason: '' });
  };

  const copyList = async () => {
    const pending = rows.filter(r => r.status !== 'resuelto');
    const text = [
      `Seguimiento (${new Date().toLocaleDateString('es-MX')}):`,
      ...pending.map(r => {
        const problem = r.reason || ISSUES[r.issue]?.label || '';
        return `- ${r.student.name} (${r.student.teamId}): ${problem}${r.note ? ` — ${r.note}` : ''}`;
      }),
    ].join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const notListed = studentsData.filter(s => !rows.some(r => r.student.id === s.id));

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-primary" aria-hidden="true" />
            Seguimiento
          </h1>
          <p className="text-muted-foreground mt-1">
            Alumnos a los que hay que avisar: sin cuenta, sin repo de tareas o sin tareas subidas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={runScan} disabled={scanning} className="cursor-pointer">
            <RefreshCcw className={`w-4 h-4 mr-2 ${scanning ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
            {scanning ? `Revisando… ${scanProgress}%` : 'Revisar repos'}
          </Button>
          <Button onClick={copyList} disabled={!rows.length} className="cursor-pointer">
            {copied ? <Check className="w-4 h-4 mr-2" aria-hidden="true" /> : <Copy className="w-4 h-4 mr-2" aria-hidden="true" />}
            {copied ? 'Copiado' : 'Copiar lista'}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Object.entries(STATUSES).map(([key, { label }]) => {
          const Icon = key === 'resuelto' ? CircleCheck : key === 'avisado' ? MessageSquareText : Clock;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={`text-left rounded-xl border bg-card p-4 transition-colors duration-200 cursor-pointer hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${filter === key ? 'border-primary ring-1 ring-primary' : ''}`}
            >
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                {label}
                <Icon className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="text-3xl font-bold mt-1">{counts[key] || 0}</div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por estado">
        {[['activos', 'Por atender'], ['todos', 'Todos'], ...Object.entries(STATUSES).map(([k, v]) => [k, v.label])].map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            variant={filter === key ? 'default' : 'outline'}
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
            className="cursor-pointer"
          >
            {label}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted border-b">
              <tr>
                <th scope="col" className="sticky left-0 z-10 bg-muted px-4 py-3 min-w-[170px]">Alumno</th>
                <th scope="col" className="px-4 py-3">Problema</th>
                <th scope="col" className="px-4 py-3">Estado</th>
                <th scope="col" className="px-4 py-3 min-w-[260px]">Nota</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(({ student, issue, status, note, reason, manual, updatedAt }) => {
                const issueInfo = ISSUES[issue];
                const IssueIcon = issueInfo?.icon;
                return (
                  <tr key={student.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors align-top">
                    <td className="sticky left-0 z-10 bg-card px-4 py-3 min-w-[170px]">
                      <div className="font-medium">{student.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {student.teamId}{student.githubUsername ? ` · @${student.githubUsername}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {issueInfo ? (
                        <Badge variant="outline" className="gap-1 border-destructive/40 text-destructive whitespace-nowrap">
                          <IssueIcon className="w-3 h-3" aria-hidden="true" />
                          {issueInfo.label}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 border-green-400 text-green-800 whitespace-nowrap">
                          <CircleCheck className="w-3 h-3" aria-hidden="true" />
                          Ya aparece en GitHub
                        </Badge>
                      )}
                      {reason && <p className="text-xs text-muted-foreground mt-1">{reason}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        aria-label={`Estado de ${student.name}`}
                        value={status}
                        onChange={e => update(student.id, { status: e.target.value })}
                        className={`h-9 rounded-md border px-2 text-sm font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${STATUSES[status].className}`}
                      >
                        {Object.entries(STATUSES).map(([key, { label }]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <textarea
                        aria-label={`Nota sobre ${student.name}`}
                        defaultValue={note}
                        placeholder="Ej: avisar el lunes que acepte la invitación de Classroom"
                        rows={2}
                        onBlur={e => e.target.value !== note && update(student.id, { note: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <p className="text-xs text-muted-foreground mt-1 h-4" aria-live="polite">
                        {savingId === student.id ? 'Guardando…' : updatedAt ? `Actualizado ${new Date(updatedAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {student.githubUsername && (
                          <Button asChild variant="ghost" size="icon" aria-label={`Abrir repo de ${student.name}`}>
                            <a href={`${ORG_URL}/${student.repoName}`} target="_blank" rel="noreferrer">
                              <ExternalLink className="w-4 h-4" aria-hidden="true" />
                            </a>
                          </Button>
                        )}
                        {manual && (
                          <Button variant="ghost" size="icon" onClick={() => remove(student.id)} aria-label={`Quitar a ${student.name} del seguimiento`} className="cursor-pointer text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!visibleRows.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    {scanning ? <LoadingAnimation label={`Revisando repositorios… ${scanProgress}%`} /> : 'No hay alumnos en esta vista.'}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={addManual} className="flex flex-col md:flex-row gap-3 md:items-end">
            <div className="flex-1 space-y-1">
              <label htmlFor="followup-student" className="text-sm font-medium">Agregar otro alumno</label>
              <select
                id="followup-student"
                value={newEntry.studentId}
                onChange={e => setNewEntry(v => ({ ...v, studentId: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Selecciona un alumno…</option>
                {notListed.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex-[2] space-y-1">
              <label htmlFor="followup-reason" className="text-sm font-medium">Motivo</label>
              <input
                id="followup-reason"
                type="text"
                value={newEntry.reason}
                onChange={e => setNewEntry(v => ({ ...v, reason: e.target.value }))}
                placeholder="Ej: no entregó la tarea 2"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Button type="submit" disabled={!newEntry.studentId} className="cursor-pointer">
              <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
              Agregar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
