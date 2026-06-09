import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import styles from './admin.module.css';

export default async function AdminLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
    redirect('/');
  }

  return (
    <div className={styles.adminLayout}>
      <aside className={styles.sidebar}>
        <h2 className={styles.sidebarTitle}>Admin</h2>
        <nav className={styles.sidebarNav}>
          <a href="/admin" className={styles.sidebarLink}>Bookings</a>
          {profile.role === 'superadmin' && (
            <a href="/admin/settings" className={styles.sidebarLink}>Settings</a>
          )}
        </nav>
      </aside>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
