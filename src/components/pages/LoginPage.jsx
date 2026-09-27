import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { School, GitBranch, CalendarCheck, Calculator, ShieldCheck, Loader2, AlertCircle, ChevronDown } from 'lucide-react';

const FEATURES = [
  { icon: GitBranch, title: 'Tareas revisadas desde GitHub', text: 'Ve qué entregaste, cuándo y cuántos puntos obtuviste.' },
  { icon: CalendarCheck, title: 'Asistencia por sprint', text: 'Tus faltas y cómo afectan tu participación.' },
  { icon: Calculator, title: 'Calificación transparente', text: 'El desglose exacto de cada punto de tu sprint.' },
];

function GithubMark({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.113.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export function LoginPage() {
  const { user, loginWithGithub } = useAuth();
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // If already logged in, redirect based on role
  if (user) {
    return <Navigate to={user.role === 'teacher' ? '/dashboard/teams' : '/dashboard/my-grades'} replace />;
  }

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setError('');
    try {
      await loginWithGithub();
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setError('Cerraste la ventana de GitHub. Inténtalo de nuevo.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Tu navegador bloqueó la ventana de GitHub. Permite ventanas emergentes para este sitio.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Este dominio no está autorizado. Contacta al profesor.');
      } else {
        setError('Hubo un problema al iniciar sesión. Inténtalo de nuevo.');
      }
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-rows-[auto_1fr] lg:grid-rows-1 lg:grid-cols-2 bg-background">
      {/* Brand panel */}
      <section className="relative overflow-hidden bg-slate-950 text-slate-100 px-6 py-10 sm:px-12 lg:py-16 flex flex-col">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{ background: 'radial-gradient(60% 50% at 20% 10%, hsl(221 83% 53% / 0.45), transparent), radial-gradient(40% 40% at 90% 90%, hsl(199 89% 48% / 0.25), transparent)' }}
          aria-hidden="true"
        />
        <div className="relative flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <School className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-lg font-bold leading-tight">Mi Aula</p>
            <p className="text-xs text-slate-400">by Profesor Oscar Cocom</p>
          </div>
        </div>

        <div className="relative mt-10 lg:mt-auto max-w-md">
          <p className="text-sm font-medium text-sky-300">Programación Web · AEB-1055</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Tu avance del semestre, en un solo lugar.
          </h1>
          <ul className="mt-8 space-y-5 hidden sm:block">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/10">
                  <Icon className="h-4 w-4 text-sky-300" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-medium text-white">{title}</p>
                  <p className="text-sm text-slate-300">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative mt-10 lg:mt-auto text-xs text-slate-400">
          Instituto Tecnológico de Cancún · Ago–Dic 2026
        </p>
      </section>

      {/* Sign-in panel */}
      <main className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold tracking-tight">Inicia sesión</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Usa la cuenta de GitHub con la que entregas tus tareas.
          </p>

          {error && (
            <div role="alert" className="mt-6 flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-md bg-slate-950 px-4 text-base font-medium text-white transition-colors duration-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
          >
            {isLoggingIn
              ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              : <GithubMark className="h-5 w-5" />}
            {isLoggingIn ? 'Conectando con GitHub…' : 'Continuar con GitHub'}
          </button>

          <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
            Solo leemos tu nombre de usuario. La app no puede modificar tus repositorios.
          </p>

          <details className="mt-8 rounded-md border p-4 text-sm group">
            <summary className="cursor-pointer font-medium list-none flex items-center justify-between">
              ¿Entró con la cuenta equivocada?
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
            </summary>
            <ol className="mt-3 list-decimal pl-5 space-y-1 text-muted-foreground">
              <li>
                Cierra sesión en{' '}
                <a href="https://github.com/logout" target="_blank" rel="noreferrer" className="underline hover:text-foreground">github.com</a>.
              </li>
              <li>Vuelve aquí y da clic en <b className="text-foreground">Continuar con GitHub</b>.</li>
              <li>Entra con la cuenta que usas en la clase.</li>
            </ol>
          </details>
        </div>
      </main>
    </div>
  );
}
