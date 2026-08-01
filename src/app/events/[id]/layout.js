import { fetchEventTitle } from '@/lib/metadata';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const title = await fetchEventTitle(id);
  return { title: title || 'Jam details' };
}

export default function EventDetailLayout({ children }) {
  return children;
}
