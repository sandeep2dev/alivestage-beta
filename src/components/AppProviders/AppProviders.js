'use client';

import Navbar from '@/components/Navbar/Navbar';
import ScrollToTop from '@/components/ScrollToTop/ScrollToTop';
import { AuthProvider } from '@/contexts/AuthContext';

export default function AppProviders({ children }) {
  return (
    <AuthProvider>
      <ScrollToTop />
      <Navbar />
      <main>{children}</main>
    </AuthProvider>
  );
}
