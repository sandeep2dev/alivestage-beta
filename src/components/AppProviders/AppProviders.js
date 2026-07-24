'use client';

import Navbar from '@/components/Navbar/Navbar';

export default function AppProviders({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}
