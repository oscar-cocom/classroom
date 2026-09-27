import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import {
  School, GitBranch, Presentation, CalendarCheck, Hand, ShieldCheck, Loader2, AlertCircle,
  ChevronDown, CheckCircle2, Clock, Users, ArrowRight, AlertTriangle, Copy, Check, ExternalLink,
} from 'lucide-react';
import { getShowcase } from '@/services/firestoreApi';
import { localDateString } from '@/lib/sprints';
import { inAppBrowserName, isAndroid, chromeIntentUrl } from '@/lib/browser';
import teamsData from '@/data/teams.json';
import studentsData from '@/data/students.json';
import doodles from '@/assets/landing-doodles.webp';

// Course calendar (ADR-002). Dates are YYYY-MM-DD in Cancún time.
const SPRINTS = [
  { name: 'Sprint 0', start: '2026-08-31', demo: ['2026-09-11', '2026-09-11'], scope: 'Equipos, idea, backlog, wireframes y repo' },
  { name: 'Sprint 1', start: '2026-09-14', demo: ['2026-09-28', '2026-10-02'], scope: 'Sitio estático HTML/CSS, 3 páginas, navegación y formulario', sprint: 1 },
  { name: 'Sprint 2', start: '2026-10-05', demo: ['2026-11-02', '2026-11-06'], scope: 'Validación en cliente, lista desde arreglo JS, búsqueda y filtro', sprint: 2 },
  { name: 'Sprint 3', start: '2026-11-09', demo: ['2026-11-30', '2026-12-04'], scope: 'Node + Express, SQLite y deploy en Render', sprint: 3 },
  { name: 'Cierre', start: '2026-12-07', demo: ['2026-12-11', '2026-12-11'], scope: 'Presentación final, coevaluación y reflexión' },
];

const GRADING = [
  { icon: GitBranch, points: 40, title: 'Tareas', text: 'Se revisan solas en tu repo de GitHub. A tiempo valen completo; tarde, el 80%.' },
  { icon: Presentation, points: 50, title: 'Proyecto', text: 'Tu expo en la demo del sprint: cada punto de expo vale 5.' },
  { icon: CalendarCheck, points: 5, title: 'Asistencia', text: '0–1 faltas = 5 · 2 faltas = 2.5 · 3 o más = 0.' },
  { icon: Hand, points: 5, title: 'Participación', text: 'Se asigna en la demo de tu equipo.' },
];

const STACK = ['HTML', 'CSS', 'JavaScript', 'Bootstrap', 'Node.js', 'Express', 'SQLite', 'Render', 'Git + GitHub', 'Scrum'];

function GithubMark({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.113.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function sprintStatus(s, today) {
  if (today > s.demo[1]) return 'done';
  if (today >= s.start) return 'now';
  return 'next';
}

/**
 * Public landing page. Doubles as the sign-in screen: signed-in users are sent to their dashboard.
 */
export function LoginPage() {
  const { user, loginWithGithub } = useAuth();
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showcase, setShowcase] = useState(null);
  const [copied, setCopied] = useState(false);
  const inApp = inAppBrowserName();

  useEffect(() => {
    getShowcase()
      .then(setShowcase)
      .catch(() => setShowcase({}));
  }, []);

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
      } else if (inApp) {
        setError(`El navegador de ${inApp} no deja iniciar sesión con GitHub. Abre esta página en Chrome o Safari.`);
      } else if (err.code === 'auth/popup-blocked') {
        setError('Tu navegador bloqueó la ventana de GitHub. Permite ventanas emergentes para este sitio y vuelve a intentarlo.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Este dominio no está autorizado. Contacta al profesor.');
      } else {
        setError('Hubo un problema al iniciar sesión. Inténtalo de nuevo.');
      }
      setIsLoggingIn(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
    } catch {
      window.prompt('Copia este enlace:', window.location.origin);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const today = localDateString(new Date());
  const current = SPRINTS.find(s => sprintStatus(s, today) === 'now') || SPRINTS[0];
  // The sprint whose demos the team grid shows: the latest one that has started
  const demoSprint = [...SPRINTS].reverse().find(s => s.sprint && today >= s.start) || SPRINTS[1];
  const presented = teamsData.filter(t => showcase?.[t.id]?.[demoSprint.sprint]);

  const loginButton = (big) => (
    <button
      type="button"
      onClick={handleLogin}
      disabled={isLoggingIn}
      className={`inline-flex items-center justify-center gap-3 rounded-lg bg-slate-950 font-semibold text-white shadow-lg shadow-slate-950/20 transition-colors duration-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer ${big ? 'h-12 px-6 text-base w-full sm:w-auto' : 'h-10 px-4 text-sm'}`}
    >
      {isLoggingIn
        ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        : <GithubMark className="h-5 w-5" />}
      {isLoggingIn ? 'Conectando…' : big ? 'Entrar con GitHub' : 'Entrar'}
    </button>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <a href="#inicio" className="flex items-center gap-3 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <School className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block font-bold leading-tight">Mi Aula</span>
              <span className="block text-xs text-muted-foreground whitespace-nowrap">by Profesor Oscar Cocom</span>
            </span>
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground" aria-label="Secciones">
            <a href="#calificacion" className="hover:text-foreground transition-colors">Calificación</a>
            <a href="#calendario" className="hover:text-foreground transition-colors">Calendario</a>
            <a href="#equipos" className="hover:text-foreground transition-colors">Equipos</a>
          </nav>
          {loginButton(false)}
        </div>
      </header>

      <main>
        {/* Hero over the doodle wall */}
        <section id="inicio" className="relative overflow-hidden border-b">
          <div
            className="absolute inset-0 opacity-25"
            aria-hidden="true"
            style={{ backgroundImage: `url(${doodles})`, backgroundSize: '520px', backgroundRepeat: 'repeat' }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" aria-hidden="true" />

          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-20">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
                Programación Web · AEB-1055 · ITCancún · Ago–Dic 2026
              </p>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Aprende a construir la web,{' '}
                <span className="font-['Permanent_Marker'] font-normal text-primary">un sprint a la vez.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                Tus tareas, la demo de tu equipo, tu asistencia y tu calificación de cada sprint, explicadas punto por punto.
              </p>

              {inApp && (
                <div role="alert" className="mt-6 max-w-md rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                  <p className="flex items-start gap-2 font-semibold">
                    <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
                    Estás en el navegador de {inApp}
                  </p>
                  <p className="mt-1">
                    Desde aquí GitHub no te deja entrar.{' '}
                    {isAndroid()
                      ? 'Ábrelo en Chrome con el botón de abajo.'
                      : <>Toca <b>⋯</b> o el ícono de compartir y elige <b>Abrir en Safari</b>, o copia el enlace y pégalo en Safari.</>}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {isAndroid() && (
                      <a href={chromeIntentUrl()} className="inline-flex h-10 items-center gap-2 rounded-md bg-amber-900 px-4 font-semibold text-white">
                        <ExternalLink className="h-4 w-4" aria-hidden="true" /> Abrir en Chrome
                      </a>
                    )}
                    <button type="button" onClick={copyLink} className="inline-flex h-10 items-center gap-2 rounded-md border border-amber-400 bg-white px-4 font-semibold cursor-pointer">
                      {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                      {copied ? 'Enlace copiado' : 'Copiar enlace'}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div role="alert" className="mt-6 flex max-w-md gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                  {error}
                </div>
              )}

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                {loginButton(true)}
                <a
                  href="#calificacion"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border bg-background px-6 font-semibold transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Cómo se califica <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
              <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground max-w-md">
                <ShieldCheck className="h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
                Solo leemos tu nombre de usuario de GitHub. La app no puede modificar tus repositorios.
              </p>
              <details className="mt-4 max-w-md rounded-md border bg-background/80 p-3 text-sm group">
                <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                  ¿Entró con la cuenta equivocada?
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
                </summary>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
                  <li>Cierra sesión en <a href="https://github.com/logout" target="_blank" rel="noreferrer" className="underline hover:text-foreground">github.com</a>.</li>
                  <li>Vuelve aquí y da clic en <b className="text-foreground">Entrar con GitHub</b>.</li>
                  <li>Entra con la cuenta que usas en la clase.</li>
                </ol>
              </details>
            </div>

            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="absolute -inset-3 rotate-2 rounded-3xl bg-primary/15" aria-hidden="true" />
              <img
                src={doodles}
                alt="Dibujos de programación web con una pareja corriendo, un sandbox, un sedán y una camioneta"
                className="relative w-full -rotate-1 rounded-3xl border-2 border-slate-950 bg-white shadow-xl"
                width="1290"
                height="1290"
              />
              <div className="absolute -bottom-4 left-4 right-4 sm:left-auto sm:right-6 rounded-xl border bg-background/95 px-4 py-3 shadow-lg backdrop-blur">
                <p className="text-xs text-muted-foreground">Ahora mismo</p>
                <p className="font-semibold">{current.name}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Grading */}
        <section id="calificacion" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight">Cómo se califica cada sprint</h2>
          <p className="mt-2 text-muted-foreground">Cada sprint vale 100 puntos. Tu calificación final es el promedio de los 3 sprints.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {GRADING.map(({ icon: Icon, points, title, text }) => (
              <div key={title} className="rounded-xl border bg-card p-5 transition-shadow duration-200 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="text-3xl font-extrabold">{points}<span className="text-base font-medium text-muted-foreground"> pts</span></span>
                </div>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
            Con 4 o más faltas sin justificar en un sprint, ese sprint se va a recuperación (14–16 dic). Si tienes justificante, entrégalo al profesor.
          </p>
        </section>

        {/* Calendar */}
        <section id="calendario" className="scroll-mt-20 border-y bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight">Calendario del proyecto</h2>
            <p className="mt-2 text-muted-foreground">Un solo proyecto por equipo, construido todo el semestre y presentado en cada demo.</p>
            <ol className="mt-8 grid gap-4 md:grid-cols-5">
              {SPRINTS.map(s => {
                const status = sprintStatus(s, today);
                return (
                  <li
                    key={s.name}
                    className={`rounded-xl border p-4 ${status === 'now' ? 'border-primary bg-background ring-2 ring-primary/30' : status === 'done' ? 'bg-background/60' : 'bg-background'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{s.name}</span>
                      {status === 'done' && <CheckCircle2 className="h-4 w-4 text-green-600" aria-label="Terminado" />}
                      {status === 'now' && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground">Ahora</span>}
                      {status === 'next' && <Clock className="h-4 w-4 text-muted-foreground" aria-label="Próximo" />}
                    </div>
                    <p className="mt-2 text-sm">{s.scope}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* Teams */}
        <section id="equipos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Demos del {demoSprint.name}</h2>
              <p className="mt-2 text-muted-foreground">{teamsData.length} equipos</p>
            </div>
            <p className="text-sm font-medium">
              <span className="text-green-700">{presented.length} presentado{presented.length !== 1 ? 's' : ''}</span>
              <span className="text-muted-foreground"> de {teamsData.length}</span>
            </p>
          </div>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {teamsData.map(team => {
              const done = showcase?.[team.id]?.[demoSprint.sprint] === true;
              const members = studentsData.filter(s => s.teamId === team.id).length;
              return (
                <li
                  key={team.id}
                  className={`rounded-xl border p-5 transition-shadow duration-200 hover:shadow-md ${done ? 'border-green-300 bg-green-50' : 'bg-card'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{team.name}</h3>
                    {done
                      ? <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />
                      : <Clock className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />}
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" aria-hidden="true" /> {members} integrantes
                  </p>
                  <p className={`mt-4 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${done ? 'bg-green-600 text-white' : 'border text-muted-foreground'}`}>
                    {showcase === null ? 'Cargando…' : done ? `Demo ${demoSprint.name} presentada` : 'Por presentar'}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Stack + closing CTA */}
        <section className="border-t bg-slate-950 text-slate-100">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white">Lo que vas a usar</h2>
              <ul className="mt-6 flex flex-wrap gap-2">
                {STACK.map(tech => (
                  <li key={tech} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm">{tech}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="font-['Permanent_Marker'] text-2xl text-sky-300">¿Listo para ver tu avance?</p>
              <p className="mt-2 text-slate-300">Entra con la cuenta de GitHub con la que entregas tus tareas.</p>
              <div className="mt-6">{loginButton(true)}</div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
          <p>Mi Aula · by Profesor Oscar Cocom</p>
          <p>Instituto Tecnológico de Cancún · Ago–Dic 2026</p>
        </div>
      </footer>
    </div>
  );
}
