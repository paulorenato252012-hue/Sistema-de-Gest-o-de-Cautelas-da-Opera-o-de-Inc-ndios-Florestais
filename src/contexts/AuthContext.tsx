import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User } from '../lib/types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = undefined;
      }
      
      if (user) {
        // We use onSnapshot to listen to profile changes (like termsAccepted, passwordChangeRequired)
        unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const matricula = user.email ? user.email.split('@')[0].trim().toLowerCase() : '';
            const isMasterAdmin = matricula === 'admin' || matricula === '123456' || user.email === 'paulorenato252012@gmail.com';
            if (isMasterAdmin && data.perfil !== 'ADMINISTRADOR') {
              try {
                await setDoc(doc(db, 'users', user.uid), {
                  ...data,
                  perfil: 'ADMINISTRADOR',
                  ativo: true
                }, { merge: true });
              } catch (e) {
                console.warn('Could not auto-promote admin profile:', e);
              }
            }
            setUserProfile({ id: docSnap.id, ...data, ...(isMasterAdmin ? { perfil: 'ADMINISTRADOR' } : {}) } as User);
            setLoading(false);
          } else {
            // Auto-heal missing profile document for signed in internal user
            try {
              const matricula = user.email ? user.email.split('@')[0].trim().toLowerCase() : 'militar';
              const isAdmin = matricula === 'admin' || matricula === '123456' || user.email === 'paulorenato252012@gmail.com';
              const defaultProfile: User = {
                id: user.uid,
                matricula: user.email === 'paulorenato252012@gmail.com' ? 'admin' : matricula,
                nomeCompleto: isAdmin ? 'ADMINISTRADOR PRINCIPAL (LOGÍSTICA)' : `Militar ${matricula}`,
                nomeGuerra: isAdmin ? 'ADMIN PRINCIPAL' : `MILITAR ${matricula}`,
                postoGraduacao: isAdmin ? 'CEL BM' : 'SD BM',
                email: user.email?.includes('@cbmms.internal') ? user.email : `${matricula}@cbmms.internal`,
                unidade: 'QCG',
                perfil: isAdmin ? 'ADMINISTRADOR' : 'MILITAR',
                ativo: true,
                passwordChangeRequired: !isAdmin,
                termsAccepted: isAdmin,
                termsVersion: 'v1.0',
                termsAcceptedAt: new Date().toISOString(),
              };
              await setDoc(doc(db, 'users', user.uid), defaultProfile);
              setUserProfile(defaultProfile);
            } catch (err) {
              console.warn('Erro ao auto-recuperar perfil do usuário:', err);
              setUserProfile(null);
            }
            setLoading(false);
          }
        }, (err) => {
          console.warn('Erro ao observar perfil do usuário:', err);
          setUserProfile(null);
          setLoading(false);
        });
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const signOut = () => {
    return firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
