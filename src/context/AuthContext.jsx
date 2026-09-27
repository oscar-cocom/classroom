import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signInWithCredential, GithubAuthProvider, signOut } from 'firebase/auth';
import { auth, githubProvider } from '@/lib/firebase';
import teacherIds from '@/data/teachers.json';
import { LoadingAnimation } from '@/components/atoms/LoadingAnimation';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

// Local dev keeps Firebase's popup: the server flow's callback URL is registered for production only
const USE_SERVER_FLOW = !['localhost', '127.0.0.1'].includes(window.location.hostname);

// ?auth=github / ?auth_error=… are left by api/auth/github/callback.js
function readReturnParams() {
  const params = new URLSearchParams(window.location.search);
  return { returning: params.get('auth') === 'github', error: params.get('auth_error') };
}

function clearReturnParams() {
  const url = new URL(window.location.href);
  url.searchParams.delete('auth');
  url.searchParams.delete('auth_error');
  window.history.replaceState(null, '', url.pathname + url.search + url.hash);
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [{ returning, error: returnError }] = useState(readReturnParams);
  const [finishing, setFinishing] = useState(returning);
  const [authError, setAuthError] = useState(returnError);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // We get the github username from the providerData or reloadUserInfo
        const githubUsername = currentUser.reloadUserInfo?.screenName || currentUser.providerData[0]?.uid;
        // Numeric GitHub id: stable even if the student renames their account
        const githubId = currentUser.providerData.find(p => p.providerId === 'github.com')?.uid;

        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          githubUsername,
          githubId,
          // Same GitHub ids the Firestore rules and the GitHub proxy trust (src/data/teachers.json)
          role: githubId && teacherIds.includes(githubId) ? 'teacher' : 'student'
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Back from GitHub through the server flow: pick up the token and sign in to Firebase
  useEffect(() => {
    if (returnError) clearReturnParams();
    if (!returning || !auth) return;
    (async () => {
      try {
        const res = await fetch('/api/auth/github/token', { method: 'POST', credentials: 'same-origin' });
        if (!res.ok) throw new Error('state');
        const { accessToken } = await res.json();
        await signInWithCredential(auth, GithubAuthProvider.credential(accessToken));
      } catch (error) {
        console.error('Error finishing GitHub sign-in', error);
        setAuthError(error.message === 'state' ? 'state' : 'firebase');
      } finally {
        clearReturnParams();
        setFinishing(false);
      }
    })();
  }, [returning, returnError]);

  const loginWithGithub = async () => {
    try {
      if (!auth) throw new Error("Firebase auth not initialized. Check your env variables.");
      setAuthError(null);
      if (USE_SERVER_FLOW) {
        // Leaves the page; the promise never resolves
        window.location.assign('/api/auth/github/start');
        return new Promise(() => {});
      }
      await signInWithPopup(auth, githubProvider);
    } catch (error) {
      console.error("Error signing in with GitHub", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (!auth) return;
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGithub, logout, authError }}>
      {loading || finishing
        ? <LoadingAnimation fullScreen label={finishing ? 'Entrando con GitHub…' : 'Iniciando…'} />
        : children}
    </AuthContext.Provider>
  );
};
