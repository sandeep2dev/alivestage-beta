'use client';

import { useEffect, useRef, useState } from 'react';
import AuthForm from '@/components/AuthForm/AuthForm';
import OnboardingForm from '@/components/OnboardingForm/OnboardingForm';
import { lockScroll, unlockScroll } from '@/lib/scrollLock';
import styles from './AuthDrawer.module.css';

export default function AuthDrawer({ onClose, onComplete }) {
  const [step, setStep] = useState('auth');
  const [profile, setProfile] = useState(null);
  const drawerRef = useRef(null);

  useEffect(() => {
    const scrollY = lockScroll();

    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };

    const onTouchMove = (e) => {
      if (drawerRef.current?.contains(e.target)) return;
      e.preventDefault();
    };

    window.addEventListener('keydown', onKey);
    document.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      unlockScroll(scrollY);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('touchmove', onTouchMove);
    };
  }, [onClose]);

  function handleAuthSuccess(p) {
    if (!p?.onboarding_complete) {
      setProfile(p);
      setStep('onboarding');
      return;
    }
    onComplete(p);
  }

  function handleOnboardingSuccess(p) {
    onComplete(p);
  }

  return (
    <div className={styles.root} role="presentation">
      <div className={styles.backdrop} aria-hidden="true" />
      <aside
        ref={drawerRef}
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label={step === 'auth' ? 'Sign in' : 'Complete setup'}
      >
        <header className={styles.header}>
          <h2 className={styles.heading}>{step === 'auth' ? 'Sign in' : 'Finish setup'}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className={styles.body}>
          {step === 'auth' ? (
            <AuthForm compact onSuccess={handleAuthSuccess} />
          ) : (
            <OnboardingForm initialProfile={profile} onSuccess={handleOnboardingSuccess} />
          )}
        </div>
      </aside>
    </div>
  );
}
