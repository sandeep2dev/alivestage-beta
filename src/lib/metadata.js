const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:5001';

export async function fetchEventTitle(id) {
  try {
    const res = await fetch(`${SERVER_URL}/api/events/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.event?.title?.trim() || null;
  } catch {
    return null;
  }
}

export async function fetchUserDisplayName(id) {
  try {
    const res = await fetch(`${SERVER_URL}/api/auth/users/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.profile?.name?.trim() || null;
  } catch {
    return null;
  }
}
