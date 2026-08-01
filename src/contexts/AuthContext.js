'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import AuthDrawer from '@/components/AuthDrawer/AuthDrawer';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [sessionVersion, setSessionVersion] = useState(0);
  const onSuccessRef = useRef(null);

  const openAuth = useCallback(({ onSuccess } = {}) => {
    onSuccessRef.current = onSuccess || null;
    setOpen(true);
  }, []);

  const closeAuth = useCallback(() => {
    setOpen(false);
    onSuccessRef.current = null;
  }, []);

  const bumpSession = useCallback(() => {
    setSessionVersion((v) => v + 1);
  }, []);

  const completeAuth = useCallback(
    async (profile) => {
      bumpSession();
      const cb = onSuccessRef.current;
      closeAuth();
      if (cb) {
        await cb(profile);
      }
    },
    [bumpSession, closeAuth]
  );

  return (
    <AuthContext.Provider value={{ openAuth, closeAuth, completeAuth, bumpSession, sessionVersion }}>
      {children}
      {open && <AuthDrawer onClose={closeAuth} onComplete={completeAuth} />}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
