import { fetchEventTitle } from '@/lib/metadata';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const title = await fetchEventTitle(id);
  return { title: title ? `Edit · ${title}` : 'Edit jam' };
}

export default function EditEventLayout({ children }) {
  return children;
}
