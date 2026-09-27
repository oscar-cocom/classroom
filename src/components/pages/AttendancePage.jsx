import React, { useState, useEffect } from 'react';
import { Table } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { saveAttendance, getAttendanceByDate } from '@/services/firestoreApi';
import studentsData from '@/data/students.json';
import { CheckCircle2, XCircle, FileCheck2, Calendar as CalendarIcon } from 'lucide-react';
import { localDateString } from '@/lib/sprints';
import { AttendanceSummary } from '@/components/organisms/AttendanceSummary';
import { LoadingAnimation } from '@/components/atoms/LoadingAnimation';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './CalendarStyles.css'; // We will create this for dark mode support

export function AttendancePage() {
  // students.json is the single roster used by every page, the rules and the GitHub proxy
  const students = studentsData;
  const [attendance, setAttendance] = useState({});
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [view, setView] = useState('daily');

  // Format date as YYYY-MM-DD in local time
  const dateStr = localDateString(date);

  useEffect(() => {
    // Ignore a slow response for a date the teacher already moved away from
    let current = true;
    async function loadData() {
      setLoading(true);
      try {
        const dayAttendance = await getAttendanceByDate(dateStr);
        if (!current) return;
        const attendanceMap = {};
        dayAttendance.forEach(a => {
          attendanceMap[a.studentId] = a.isPresent ? 'present' : a.justified ? 'justified' : 'absent';
        });
        setAttendance(attendanceMap);
      } catch (err) {
        console.error("Error loading attendance:", err);
      } finally {
        if (current) setLoading(false);
      }
    }
    loadData();
    return () => { current = false; };
  }, [dateStr]);

  // status: 'present' | 'absent' | 'justified'
  const handleMarkAttendance = async (studentId, status) => {
    // Optimistic update
    setAttendance(prev => ({ ...prev, [studentId]: status }));
    try {
      await saveAttendance(dateStr, studentId, status === 'present', status === 'justified');
    } catch (error) {
      console.error("Error saving attendance:", error);
      // Revert if error
      setAttendance(prev => {
        const newObj = { ...prev };
        delete newObj[studentId];
        return newObj;
      });
      alert("Error al guardar en Firebase. Verifica que Firestore esté habilitado.");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Asistencia</h1>
          <p className="text-muted-foreground mt-1">
            {view === 'daily'
              ? 'Marca la asistencia de los alumnos. Se guardará automáticamente en la fecha seleccionada.'
              : 'Todas las faltas del sprint, alumno por alumno, como en tu Excel.'}
          </p>
          <nav aria-label="Vista" className="flex gap-1 p-1 bg-muted rounded-lg w-fit mt-4">
            {[['daily', 'Pase de lista'], ['summary', 'Resumen por sprint']].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                aria-current={view === key ? 'page' : undefined}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${view === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
        
        {view === 'daily' && (
        <div className="flex items-center gap-3">
          {/* Selector de fecha con React Calendar */}
          <div className="relative">
            <Button 
              variant="default" 
              onClick={() => setShowCalendar(!showCalendar)}
              className="min-w-[180px]"
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              {dateStr}
            </Button>
            
            {showCalendar && (
              <div className="absolute top-12 right-0 z-50 bg-background border rounded-lg shadow-xl p-2">
                <Calendar 
                  onChange={(newDate) => {
                    setDate(newDate);
                    setShowCalendar(false);
                  }} 
                  value={date} 
                />
              </div>
            )}
          </div>
        </div>
        )}
      </header>

      {view === 'summary' ? <AttendanceSummary /> : (
      <Card>
        <CardHeader>
          <CardTitle>Asistencia: {dateStr}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingAnimation label="Cargando lista…" />
          ) : (
            <div>
              <Table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 border-b">
                  <tr>
                    <th className="px-3 sm:px-6 py-3">Alumno / Asistencia</th>
                    <th className="hidden md:table-cell px-6 py-3">Equipo</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b last:border-0 hover:bg-muted/30">
                      {/* Phones: name on top, the three buttons below and always visible */}
                      <td className="px-3 sm:px-6 py-3 sm:py-4 font-medium flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4">
                        <span className="lg:w-64 lg:truncate">
                          {student.name}
                          <span className="md:hidden block text-xs font-normal text-muted-foreground">{student.teamId}</span>
                        </span>
                        <div className="grid grid-cols-3 gap-2 sm:flex">
                          <Button 
                            variant={attendance[student.id] === 'present' ? "default" : "outline"}
                            size="sm"
                            className={attendance[student.id] === 'present' ? "bg-green-600 hover:bg-green-700" : ""}
                            aria-pressed={attendance[student.id] === 'present'}
                            onClick={() => handleMarkAttendance(student.id, 'present')}
                          >
                            <CheckCircle2 className="w-4 h-4 sm:mr-2" aria-hidden="true" /> <span className="max-sm:text-xs">Presente</span>
                          </Button>
                          <Button 
                            variant={attendance[student.id] === 'absent' ? "destructive" : "outline"}
                            size="sm"
                            aria-pressed={attendance[student.id] === 'absent'}
                            onClick={() => handleMarkAttendance(student.id, 'absent')}
                          >
                            <XCircle className="w-4 h-4 sm:mr-2" aria-hidden="true" /> <span className="max-sm:text-xs">Falta</span>
                          </Button>
                          <Button 
                            variant="outline"
                            size="sm"
                            className={attendance[student.id] === 'justified' ? "bg-amber-100 border-amber-400 text-amber-900 hover:bg-amber-200" : ""}
                            aria-pressed={attendance[student.id] === 'justified'}
                            title="Falta con justificante: queda registrada pero no cuenta"
                            onClick={() => handleMarkAttendance(student.id, 'justified')}
                          >
                            <FileCheck2 className="w-4 h-4 sm:mr-2" aria-hidden="true" /> <span className="max-sm:text-xs">Justificada</span>
                          </Button>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4">{student.teamId}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
}
