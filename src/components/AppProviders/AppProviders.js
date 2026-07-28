'use client';

import Navbar from '@/components/Navbar/Navbar';
import { AuthProvider } from '@/contexts/AuthContext';

export default function AppProviders({ children }) {
  return (
    <AuthProvider>
      <Navbar />
      <main>{children}</main>
    </AuthProvider>
  );
}
