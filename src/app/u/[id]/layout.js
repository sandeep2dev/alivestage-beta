import { fetchUserDisplayName } from '@/lib/metadata';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const name = await fetchUserDisplayName(id);
  return { title: name || 'Musician profile' };
}

export default function UserProfileLayout({ children }) {
  return children;
}
