import { Inter, Space_Grotesk } from 'next/font/google';
import '@/styles/global.css';
import AppProviders from '@/components/AppProviders/AppProviders';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '700'],
  display: 'swap',
});

export const metadata = {
  title: 'Alivestage — Live Performance Marketplace',
  description: 'Connect with live performance artists. Secure escrow bookings.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
