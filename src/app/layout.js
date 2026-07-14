import '@/styles/global.css';
import AppProviders from '@/components/AppProviders/AppProviders';

export const metadata = {
  title: 'Alivestage — Live Performance Marketplace',
  description: 'Connect with live performance artists. Secure escrow bookings.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
