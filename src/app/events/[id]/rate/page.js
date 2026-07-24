'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import FormAlert from '@/components/FormAlert/FormAlert';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import styles from './rate.module.css';

export default function RateEventPage() {
  const { id } = useParams();
  const router = useRouter();
  const [eligible, setEligible] = useState([]);
  const [windowOpen, setWindowOpen] = useState(true);
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      const token = getAccessToken();
      if (!token) {
        router.replace('/auth');
        return;
      }
      try {
        const data = await apiFetch(`/api/ratings/eligible/${id}`, { token });
        setEligible(data.eligible || []);
        setWindowOpen(Boolean(data.windowOpen));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  async function submitOne(person) {
    const score = Number(scores[person.ratee_id]);
    if (!score) {
      setError('Pick a score 1–5');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const token = getAccessToken();
      await apiFetch('/api/ratings', {
        method: 'POST',
        token,
        body: {
          event_id: id,
          ratee_id: person.ratee_id,
          rating_type: person.rating_type,
          score,
        },
      });
      setEligible((list) => list.filter((p) => p.ratee_id !== person.ratee_id));
      setMessage(`Rated ${person.profile?.name || 'member'}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className={`container ${styles.page}`}>
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className={`container ${styles.page}`}>
      <h1 className="pageTitle">Rate this jam</h1>
      <p className="pageSubtitle">
        Only host-marked attendees can rate. Reputation shows publicly after 10 ratings.
      </p>

      <FormAlert type="error">{error}</FormAlert>
      <FormAlert type="success">{message}</FormAlert>

      {!windowOpen ? (
        <p className={styles.empty}>Rating window is closed.</p>
      ) : eligible.length === 0 ? (
        <p className={styles.empty}>No one left to rate (or you were not marked attended).</p>
      ) : (
        <ul className={styles.list}>
          {eligible.map((person) => (
            <li key={person.ratee_id} className={styles.row}>
              <div>
                <strong>{person.profile?.name || 'Member'}</strong>
                <span className={styles.type}>{person.rating_type.replace('_', ' ')}</span>
              </div>
              <div className={styles.controls}>
                <select
                  className="input"
                  value={scores[person.ratee_id] || ''}
                  onChange={(e) =>
                    setScores((s) => ({ ...s, [person.ratee_id]: e.target.value }))
                  }
                >
                  <option value="">Score</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btnPrimary"
                  disabled={busy}
                  onClick={() => submitOne(person)}
                >
                  Submit
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
