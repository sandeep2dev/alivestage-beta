'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/** Reset window scroll on route change (footer / in-app links). */
export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
