import { fetchEventTitle } from '@/lib/metadata';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const title = await fetchEventTitle(id);
  return { title: title ? `Rate · ${title}` : 'Rate jam' };
}

export default function RateEventLayout({ children }) {
  return children;
}
