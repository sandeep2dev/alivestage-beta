import '@/styles/global.css';
import Navbar from '@/components/Navbar/Navbar';

export const metadata = {
  title: 'Alivestage — Live Performance Marketplace',
  description: 'Connect with live performance artists. Secure escrow bookings.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
