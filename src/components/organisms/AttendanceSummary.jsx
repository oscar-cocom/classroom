import React, { useEffect, useMemo, useState } from 'react';
import { Table } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { getAllAttendanceRecords } from '@/services/firestoreApi';
import { PROJECT_SPRINTS } from '@/lib/projectGrading';
import { sprintOfDate, attendancePoints, RECOVERY_ABSENCES } from '@/lib/sprints';
import studentsData from '@/data/students.json';
import { LoadingAnimation } from '@/components/atoms/LoadingAnimation';

// Absences imported from the Excel sheet got placeholder dates (Sept 1-10), one per absence
const IMPORTED_UNTIL = '2026-09-10';

const MARK = { present: '✓', absent: '•', justified: 'J' };
const statusOf = r => (r.isPresent ? 'present' : r.justified ? 'justified' : 'absent');

function shortDate(dateStr) {
  const [, m, d] = dateStr.split('-');
  return `${Number(d)}/${Number(m)}`;
}

/**
 * Students × class days for one sprint, like the attendance spreadsheet:
 * • unexcused absence, J excused, ✓ present, blank = no record.
 */
export function AttendanceSummary() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sprint, setSprint] = useState(2);

  useEffect(() => {
    getAllAttendanceRecords()
      .then(setRecords)
      .catch(err => console.error('Error loading attendance:', err))
      .finally(() => setLoading(false));
  }, []);

  const { dates, byStudent } = useMemo(() => {
    const inSprint = records.filter(r => sprintOfDate(r.date) === sprint);
    const byStudent = {};
    inSprint.forEach(r => { (byStudent[r.studentId] ??= {})[r.date] = statusOf(r); });
    return { dates: [...new Set(inSprint.map(r => r.date))].sort(), byStudent };
  }, [records, sprint]);

  const rows = studentsData.map(student => {
    const days = byStudent[student.id] || {};
    const absences = Object.values(days).filter(s => s === 'absent').length;
    const justified = Object.values(days).filter(s => s === 'justified').length;
    return { student, days, absences, justified, points: attendancePoints(absences), recovery: absences >= RECOVERY_ABSENCES };
  });

  const downloadExcel = async () => {
    const XLSX = await import('xlsx');
    const sheet = XLSX.utils.aoa_to_sheet([
      ['Alumno', 'Equipo', ...dates.map(shortDate), 'Faltas', 'Justificadas', 'Pts asistencia', 'Estado'],
      ...rows.map(r => [
        r.student.name,
        r.student.teamId,
        ...dates.map(d => (r.days[d] ? MARK[r.days[d]] : '')),
        r.absences,
        r.justified,
        r.points,
        r.recovery ? 'Recuperación' : '',
      ]),
    ]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, `Sprint ${sprint}`);
    XLSX.writeFile(book, `asistencia-sprint-${sprint}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <nav aria-label="Sprint" className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          {PROJECT_SPRINTS.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setSprint(n)}
              aria-current={sprint === n ? 'page' : undefined}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${sprint === n ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Sprint {n}
            </button>
          ))}
        </nav>
        <Button variant="outline" onClick={downloadExcel} disabled={loading || !dates.length} className="cursor-pointer">
          <Download className="w-4 h-4 mr-2" aria-hidden="true" />
          Descargar Excel
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        <b className="text-foreground">•</b> falta · <b className="text-foreground">J</b> justificada (no cuenta) · <b className="text-foreground">✓</b> presente · vacío = sin registro.
        {' '}0–1 faltas = 5 pts · 2 = 2.5 · 3 = 0 · {RECOVERY_ABSENCES} o más = recuperación.
        {sprint === 1 && dates.some(d => d <= IMPORTED_UNTIL) && (
          <span className="block mt-1 text-amber-700">
            Las columnas del 1/9 al 10/9 son las faltas importadas del Excel: cada columna es una falta, no el día real.
          </span>
        )}
      </p>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <LoadingAnimation label="Cargando asistencia…" />
          ) : !dates.length ? (
            <p className="p-6 text-muted-foreground">Todavía no hay pase de lista en el Sprint {sprint}.</p>
          ) : (
            <Table className="text-sm border-collapse">
              <thead className="text-xs bg-muted/50 border-b">
                <tr>
                  <th scope="col" className="sticky left-0 z-10 bg-muted px-4 py-2 text-left min-w-[240px]">Alumno</th>
                  {dates.map(d => (
                    <th key={d} scope="col" className="px-2 py-2 text-center font-medium whitespace-nowrap">{shortDate(d)}</th>
                  ))}
                  <th scope="col" className="px-3 py-2 text-center">Faltas</th>
                  <th scope="col" className="px-3 py-2 text-center">Just.</th>
                  <th scope="col" className="px-3 py-2 text-center">Pts /5</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.student.id} className={`border-b last:border-0 ${r.recovery ? 'bg-red-50 dark:bg-red-950/30' : 'hover:bg-muted/30'}`}>
                    <th scope="row" className={`sticky left-0 z-10 px-4 py-1.5 text-left font-medium ${r.recovery ? 'bg-red-50 dark:bg-red-950/30' : 'bg-card'}`}>
                      {r.student.name}
                    </th>
                    {dates.map(d => {
                      const status = r.days[d];
                      return (
                        <td
                          key={d}
                          className={`px-2 py-1.5 text-center ${status === 'absent' ? 'font-bold text-red-600' : status === 'justified' ? 'font-semibold text-amber-700' : 'text-green-700'}`}
                          aria-label={status === 'absent' ? 'Falta' : status === 'justified' ? 'Justificada' : status === 'present' ? 'Presente' : 'Sin registro'}
                        >
                          {status ? MARK[status] : ''}
                        </td>
                      );
                    })}
                    <td className={`px-3 py-1.5 text-center font-bold ${r.recovery ? 'text-red-600' : ''}`}>
                      {r.absences}{r.recovery && <span className="block text-[10px] font-medium">Recuperación</span>}
                    </td>
                    <td className="px-3 py-1.5 text-center text-amber-700">{r.justified || ''}</td>
                    <td className="px-3 py-1.5 text-center">{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
