import AdminGate from './AdminGate';

export const metadata = {
  title: 'Admin',
};

export default function AdminLayout({ children }) {
  return <AdminGate>{children}</AdminGate>;
}
