import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';


export function LoginPage() {
  const { user, loginWithGithub } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // If already logged in, redirect based on role
  if (user) {
    if (user.role === 'teacher') {
      return <Navigate to="/dashboard/teams" replace />;
    } else {
      return <Navigate to="/dashboard/my-grades" replace />;
    }
  }

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setError('');
    try {
      await loginWithGithub();
      // The useEffect in AuthContext will update the user state and trigger the redirect above
    } catch (err) {
      console.error(err);
      setError('Hubo un problema al iniciar sesión. ¿Agregaste las credenciales de Firebase?');
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold tracking-tight">Gestor de Evaluaciones</CardTitle>
          <CardDescription className="text-base">
            Inicia sesión con tu cuenta de GitHub para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          {error && (
            <div className="mb-4 p-3 w-full bg-destructive/10 border border-destructive text-destructive rounded-md text-sm text-center">
              {error}
            </div>
          )}
          <Button 
            className="w-full py-6 text-lg bg-black hover:bg-neutral-800 text-white" 
            onClick={handleLogin}
            disabled={isLoggingIn}
          >
            <svg className="mr-4 w-8 h-8 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.113.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
            {isLoggingIn ? "Conectando..." : "Continuar con GitHub"}
          </Button>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          Proyecto exclusivo para alumnos
        </CardFooter>
      </Card>
    </div>
  );
}
