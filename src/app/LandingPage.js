'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import Hero from '@/components/landing/Hero';
import About from '@/components/landing/About';
import HowItWorks from '@/components/landing/HowItWorks';
import WhoItsFor from '@/components/landing/WhoItsFor';
import Spirit from '@/components/landing/Spirit';
import CTA from '@/components/landing/CTA';
import FAQ from '@/components/landing/FAQ';
import Footer from '@/components/landing/Footer';
import styles from './page.module.css';

export default function LandingPage() {
  const router = useRouter();
  const { sessionVersion } = useAuth();

  useEffect(() => {
    if (getAccessToken()) {
      router.replace('/events');
    }
  }, [router, sessionVersion]);

  return (
    <div className={styles.landing}>
      <Hero />
      <About />
      <HowItWorks />
      <WhoItsFor />
      <Spirit />
      <CTA />
      <FAQ />
      <Footer />
    </div>
  );
}
