'use client';

import { useRouter } from 'next/navigation';
import AuthForm from '@/components/AuthForm/AuthForm';
import styles from './auth.module.css';

export default function AuthPage() {
  const router = useRouter();

  function handleSuccess(profile) {
    if (!profile?.onboarding_complete) {
      router.push('/onboarding');
      return;
    }
    if (profile?.role === 'admin') {
      router.push('/admin');
      return;
    }
    router.push('/events');
    router.refresh();
  }

  return (
    <div className={`container ${styles.page}`}>
      <div className={`card ${styles.card}`}>
        <AuthForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
