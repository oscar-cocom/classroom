import React, { useState } from 'react';
import { Outlet, Navigate, NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, LogOut, Menu, X, Users, BookOpen, CalendarCheck, GraduationCap } from 'lucide-react';

export function DashboardLayout() {
  const { user, loading, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="min-h-screen bg-muted/40 flex flex-col md:flex-row">
      
      {/* Mobile Navbar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-background border-b z-20">
        <div className="flex items-center gap-2 font-bold text-lg">
          <LayoutDashboard className="w-5 h-5 text-primary" />
          GestorEval
        </div>
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-10 md:hidden" 
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-20 h-screen w-64 bg-background border-r flex flex-col transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 hidden md:flex items-center gap-2 font-bold text-xl">
          <LayoutDashboard className="w-6 h-6 text-primary" />
          GestorEval
        </div>
        
        <div className="px-4 py-2 border-b md:border-none mb-4 flex items-center gap-3">
          {user.photoURL ? (
            <img src={user.photoURL} alt="Avatar" className="w-10 h-10 rounded-full" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
              {user.displayName?.charAt(0) || user.githubUsername?.charAt(0) || 'U'}
            </div>
          )}
          <div className="overflow-hidden">
            <p className="text-sm font-medium truncate">{user.displayName || user.githubUsername}</p>
            <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {user.role === 'teacher' ? (
            <>
              <NavLink 
                to="/dashboard/students" 
                onClick={closeSidebar}
                className={({isActive}) => `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'}`}
              >
                <BookOpen className="w-4 h-4" />
                Alumnos
              </NavLink>
              <NavLink 
                to="/dashboard/teams" 
                onClick={closeSidebar}
                className={({isActive}) => `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'}`}
              >
                <Users className="w-4 h-4" />
                Equipos
              </NavLink>
              <NavLink 
                to="/dashboard/attendance" 
                onClick={closeSidebar}
                className={({isActive}) => `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'}`}
              >
                <CalendarCheck className="w-4 h-4" />
                Asistencia
              </NavLink>
              <NavLink 
                to="/dashboard/grades" 
                onClick={closeSidebar}
                className={({isActive}) => `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'}`}
              >
                <GraduationCap className="w-4 h-4" />
                Calificaciones
              </NavLink>
            </>
          ) : (
            <>
              <NavLink 
                to="/dashboard/my-grades" 
                onClick={closeSidebar}
                className={({isActive}) => `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'}`}
              >
                <BookOpen className="w-4 h-4" />
                Mis Calificaciones
              </NavLink>
            </>
          )}
        </nav>

        <div className="p-4 border-t mt-auto">
          <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <div className="flex-1 p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
