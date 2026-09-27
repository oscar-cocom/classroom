import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, githubProvider } from '@/lib/firebase';
import teacherIds from '@/data/teachers.json';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const loginWithGithub = async () => {
    try {
      if (!auth) throw new Error("Firebase auth not initialized. Check your env variables.");
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
    <AuthContext.Provider value={{ user, loading, loginWithGithub, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
