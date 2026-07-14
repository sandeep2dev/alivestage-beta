'use client';

import Navbar from '@/components/Navbar/Navbar';
import { CitiesProvider } from '@/components/CitiesProvider/CitiesProvider';

export default function AppProviders({ children }) {
  return (
    <CitiesProvider>
      <Navbar />
      <main>{children}</main>
    </CitiesProvider>
  );
}
