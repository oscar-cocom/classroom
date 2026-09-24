import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getStudents, saveAttendance, getAttendanceByDate, saveStudent } from '@/services/firestoreApi';
import studentsData from '@/data/students.json';
import { CheckCircle2, XCircle, Database, Calendar as CalendarIcon } from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './CalendarStyles.css'; // We will create this for dark mode support

export function AttendancePage() {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  // Format date as YYYY-MM-DD for consistency
  const dateStr = date.toISOString().split('T')[0];

  const loadData = async () => {
    setLoading(true);
    try {
      let dbStudents = await getStudents();
      // Fallback to local json if firestore is empty
      if (dbStudents.length === 0) {
        dbStudents = studentsData;
      }
      setStudents(dbStudents);

      const todayAttendance = await getAttendanceByDate(dateStr);
      const attendanceMap = {};
      todayAttendance.forEach(a => {
        attendanceMap[a.studentId] = a.isPresent;
      });
      setAttendance(attendanceMap);
    } catch (err) {
      console.error("Error loading attendance:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateStr]);

  const handleMarkAttendance = async (studentId, isPresent) => {
    // Optimistic update
    setAttendance(prev => ({ ...prev, [studentId]: isPresent }));
    try {
      await saveAttendance(dateStr, studentId, isPresent);
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

  const handleImportStudents = async () => {
    if (!confirm("¿Seguro que deseas importar los 36 alumnos de tu archivo local a la Base de Datos?")) return;
    setImporting(true);
    try {
      for (const student of studentsData) {
        await saveStudent(student);
      }
      alert("¡Importación exitosa! Todos los alumnos están ahora en Firestore.");
      loadData(); // Reload from db
    } catch (error) {
      console.error("Error importing:", error);
      alert("Hubo un error al importar. Revisa la consola.");
    } finally {
      setImporting(false);
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
          {/* Botón de importación temporal */}
          <Button variant="outline" onClick={handleImportStudents} disabled={importing}>
            <Database className="w-4 h-4 mr-2" />
            {importing ? "Importando..." : "Importar a BD"}
          </Button>
          
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
                            variant={attendance[student.id] === true ? "default" : "outline"}
                            size="sm"
                            className={attendance[student.id] === true ? "bg-green-600 hover:bg-green-700" : ""}
                            onClick={() => handleMarkAttendance(student.id, true)}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Presente
                          </Button>
                          <Button 
                            variant={attendance[student.id] === false ? "destructive" : "outline"}
                            size="sm"
                            onClick={() => handleMarkAttendance(student.id, false)}
                          >
                            <XCircle className="w-4 h-4 mr-2" /> Falta
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
