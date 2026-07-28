'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import FormAlert from '@/components/FormAlert/FormAlert';
import ConfirmationModal from '@/components/ConfirmationModal/ConfirmationModal';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { payAndConfirm } from '@/lib/payments';
import styles from './event.module.css';

function formatWhen(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function EventDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [event, setEvent] = useState(null);
  const [membership, setMembership] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getAccessToken();
      const data = await apiFetch(`/api/events/${id}`, { token: token || undefined });
      setEvent(data.event);
      setMembership(data.membership || null);
      setMembers(data.members || []);
    } catch (err) {
      setError(err.message || 'Failed to load event');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function runAction(fn) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err.message || 'Action failed');
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  async function join() {
    const token = getAccessToken();
    if (!token) {
      router.push('/auth');
      return;
    }
    await runAction(async () => {
      const order = await apiFetch(`/api/events/${id}/join-order`, { method: 'POST', token });
      await payAndConfirm({
        order,
        token,
        confirmPath: `/api/events/${id}/confirm-join`,
      });
      setMessage('Joined — precise address unlocked.');
    });
  }

  function toggleAttended(membershipId, attended) {
    setMembers((list) =>
      list.map((m) =>
        m.id === membershipId ? { ...m, host_marked_attended: attended } : m
      )
    );
  }

  async function saveAttendance() {
    const token = getAccessToken();
    await runAction(async () => {
      const data = await apiFetch(`/api/events/${id}/attendance`, {
        method: 'POST',
        token,
        body: {
          attendance: members.map((m) => ({
            membershipId: m.id,
            attended: Boolean(m.host_marked_attended),
          })),
        },
      });
      setMembers(data.members || []);
      setMessage('Attendance saved.');
    });
  }

  if (loading) {
    return (
      <div className={`container ${styles.page}`}>
        <p>Loading…</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className={`container ${styles.page}`}>
        <FormAlert type="error">{error || 'Event not found'}</FormAlert>
      </div>
    );
  }

  const isHost = event.is_host;
  const isMember = event.is_member;
  const open = ['created', 'live'].includes(event.status) && !event.has_ended;

  return (
    <div className={`container ${styles.page}`}>
      <FormAlert type="error">{error}</FormAlert>
      <FormAlert type="success">{message}</FormAlert>

      <header className={styles.header}>
        <p className={styles.eyebrow}>
          {event.display_status || event.status} · {event.city}
        </p>
        <h1 className="pageTitle">{event.title}</h1>
        <p className={styles.summary}>{event.summary}</p>
        <div className={styles.meta}>
          <span>{formatWhen(event.start_at)}</span>
          <span>{event.duration_minutes} minutes</span>
          {event.host?.name && (
            <span>
              Host:{' '}
              <Link href={`/u/${event.host.id}`}>{event.host.name}</Link>
            </span>
          )}
        </div>
      </header>

      {event.description && (
        <section className={styles.section}>
          <h2>About</h2>
          <p className={styles.body}>{event.description}</p>
        </section>
      )}

      <section className={styles.section}>
        <h2>Location</h2>
        {event.precise_address ? (
          <p className={styles.body}>{event.precise_address}</p>
        ) : (
          <p className={styles.muted}>
            City: {event.city}. Precise address unlocks after you join (₹50).
          </p>
        )}
      </section>

      <div className={styles.actions}>
        {open && !isHost && !isMember && (
          <button type="button" className="btn btnPrimary" disabled={busy} onClick={join}>
            {busy ? 'Processing…' : 'Join for ₹50'}
          </button>
        )}
        {isMember && !isHost && open && (
          <>
            <button
              type="button"
              className="btn btnSecondary"
              disabled={busy}
              onClick={() =>
                runAction(async () => {
                  const token = getAccessToken();
                  await apiFetch(`/api/events/${id}/present`, { method: 'POST', token });
                  setMessage('Marked yourself present (informational).');
                })
              }
            >
              I&apos;m here
            </button>
            <button
              type="button"
              className="btn btnSecondary"
              disabled={busy}
              onClick={() =>
                setConfirm({
                  title: 'Leave this jam?',
                  body: 'You will receive a 50% refund (₹25).',
                  onConfirm: () =>
                    runAction(async () => {
                      const token = getAccessToken();
                      await apiFetch(`/api/events/${id}/leave`, { method: 'POST', token });
                      setMessage('Left event. ₹25 refund initiated.');
                      router.push('/my-events');
                    }),
                })
              }
            >
              Leave (₹25 refund)
            </button>
          </>
        )}
        {isHost && event.status === 'created' && !event.has_started && members.filter((m) => !m.cancelled_at).length === 0 && (
          <Link href={`/events/${id}/edit`} className="btn btnSecondary">
            Edit details
          </Link>
        )}
        {isHost && ['created', 'live'].includes(event.status) && (
          <>
            <button
              type="button"
              className="btn btnPrimary"
              disabled={busy}
              onClick={() =>
                setConfirm({
                  title: 'Mark completed?',
                  body: 'This opens the rating window. Confirm the jam happened.',
                  onConfirm: () =>
                    runAction(async () => {
                      const token = getAccessToken();
                      await apiFetch(`/api/events/${id}/complete`, { method: 'POST', token });
                      setMessage('Marked completed. Rating window opened.');
                    }),
                })
              }
            >
              Mark completed
            </button>
            <button
              type="button"
              className="btn btnSecondary"
              disabled={busy}
              onClick={() =>
                setConfirm({
                  title: 'Cancel this jam?',
                  body: 'Joiners get a full ₹50 refund. Your ₹200 host fee is not refunded.',
                  onConfirm: () =>
                    runAction(async () => {
                      const token = getAccessToken();
                      await apiFetch(`/api/events/${id}/cancel`, { method: 'POST', token });
                      setMessage('Event cancelled. Joiners refunded.');
                    }),
                })
              }
            >
              Cancel event
            </button>
          </>
        )}
        {event.status === 'completed' && (isHost || isMember) && (
          <Link href={`/events/${id}/rate`} className="btn btnPrimary">
            Rate attendees
          </Link>
        )}
      </div>

      {(isHost || isMember) && members.length > 0 && (
        <section className={styles.section}>
          <h2>Members</h2>
          <ul className={styles.memberList}>
            {members.map((m) => (
              <li key={m.id} className={styles.memberRow}>
                <div>
                  <strong>{m.profile?.name || 'Member'}</strong>
                  {m.cancelled_at && <span className={styles.badge}>cancelled</span>}
                  {m.self_marked_present && <span className={styles.badge}>self-present</span>}
                </div>
                {isHost && !m.cancelled_at && (
                  <label className={styles.check}>
                    <input
                      type="checkbox"
                      checked={Boolean(m.host_marked_attended)}
                      onChange={(e) => toggleAttended(m.id, e.target.checked)}
                    />
                    Attended
                  </label>
                )}
              </li>
            ))}
          </ul>
          {isHost && (
            <button
              type="button"
              className="btn btnSecondary"
              disabled={busy}
              onClick={saveAttendance}
            >
              Save attendance
            </button>
          )}
        </section>
      )}

      {confirm && (
        <ConfirmationModal
          open
          title={confirm.title}
          message={confirm.body}
          confirmLabel="Confirm"
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
