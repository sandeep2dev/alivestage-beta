'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import FormAlert from '@/components/FormAlert/FormAlert';
import { SkeletonLine } from '@/components/Skeleton/Skeleton';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import styles from './rate.module.css';

function StarPicker({ value, onChange, disabled }) {
  return (
    <div className={styles.stars} role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`${styles.star} ${value >= n ? styles.starActive : ''}`}
          disabled={disabled}
          onClick={() => onChange(n)}
          aria-label={`${n} stars`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function RateEventPage() {
  const { id } = useParams();
  const { openAuth } = useAuth();
  const [eligible, setEligible] = useState([]);
  const [windowOpen, setWindowOpen] = useState(true);
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    const token = getAccessToken();
    if (!token) {
      openAuth({ onSuccess: () => load() });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch(`/api/ratings/eligible/${id}`, { token });
      setEligible(data.eligible || []);
      setWindowOpen(Boolean(data.windowOpen));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
        <SkeletonLine width="50%" />
        <SkeletonLine width="80%" />
      </div>
    );
  }

  return (
    <div className={`container ${styles.page}`}>
      <Link href={`/events/${id}`} className={styles.back}>
        ← Back to jam
      </Link>
      <h1 className="pageTitle">Rate this jam</h1>
      <p className="pageSubtitle">
        Only host-marked attendees can rate. Reputation shows publicly after 10 ratings.
      </p>

      <FormAlert type="error">{error}</FormAlert>
      <FormAlert type="success">{message}</FormAlert>

      {!windowOpen ? (
        <div className={styles.empty}>
          <p>Rating window is closed.</p>
          <Link href={`/events/${id}`} className="btn btnSecondary">
            Back to jam
          </Link>
        </div>
      ) : eligible.length === 0 ? (
        <div className={styles.empty}>
          <p>No one left to rate (or you were not marked attended).</p>
          <Link href={`/events/${id}`} className="btn btnSecondary">
            Back to jam
          </Link>
        </div>
      ) : (
        <ul className={styles.list}>
          {eligible.map((person) => (
            <li key={person.ratee_id} className={styles.row}>
              <div>
                <strong>{person.profile?.name || 'Member'}</strong>
                <span className={styles.type}>{person.rating_type.replace('_', ' ')}</span>
              </div>
              <div className={styles.controls}>
                <StarPicker
                  value={Number(scores[person.ratee_id]) || 0}
                  onChange={(n) => setScores((s) => ({ ...s, [person.ratee_id]: n }))}
                  disabled={busy}
                />
                <button
                  type="button"
                  className="btn btnPrimary"
                  disabled={busy || !scores[person.ratee_id]}
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
