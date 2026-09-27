import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { saveAttendance, getAttendanceByDate } from '@/services/firestoreApi';
import studentsData from '@/data/students.json';
import { CheckCircle2, XCircle, FileCheck2, Calendar as CalendarIcon } from 'lucide-react';
import { localDateString } from '@/lib/sprints';
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
          <h1 className="text-3xl font-bold">Pase de Lista</h1>
          <p className="text-muted-foreground mt-1">
            Marca la asistencia de los alumnos. Se guardará automáticamente en la fecha seleccionada.
          </p>
        </div>
        
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
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Asistencia: {dateStr}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Cargando lista...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 border-b">
                  <tr>
                    <th className="px-6 py-3">Alumno / Asistencia</th>
                    <th className="px-6 py-3">Equipo</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-6 py-4 font-medium flex items-center gap-4">
                        <span className="w-64 truncate">{student.name}</span>
                        <div className="flex gap-2">
                          <Button 
                            variant={attendance[student.id] === 'present' ? "default" : "outline"}
                            size="sm"
                            className={attendance[student.id] === 'present' ? "bg-green-600 hover:bg-green-700" : ""}
                            aria-pressed={attendance[student.id] === 'present'}
                            onClick={() => handleMarkAttendance(student.id, 'present')}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Presente
                          </Button>
                          <Button 
                            variant={attendance[student.id] === 'absent' ? "destructive" : "outline"}
                            size="sm"
                            aria-pressed={attendance[student.id] === 'absent'}
                            onClick={() => handleMarkAttendance(student.id, 'absent')}
                          >
                            <XCircle className="w-4 h-4 mr-2" /> Falta
                          </Button>
                          <Button 
                            variant="outline"
                            size="sm"
                            className={attendance[student.id] === 'justified' ? "bg-amber-100 border-amber-400 text-amber-900 hover:bg-amber-200" : ""}
                            aria-pressed={attendance[student.id] === 'justified'}
                            title="Falta con justificante: queda registrada pero no cuenta"
                            onClick={() => handleMarkAttendance(student.id, 'justified')}
                          >
                            <FileCheck2 className="w-4 h-4 mr-2" /> Justificada
                          </Button>
                        </div>
                      </td>
                      <td className="px-6 py-4">{student.teamId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
