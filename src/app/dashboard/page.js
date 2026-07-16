'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { formatCityLabel } from '@/lib/cities';
import { statusClass, statusLabel } from '@/lib/status';
import FormAlert from '@/components/FormAlert/FormAlert';
import styles from './dashboard.module.css';

const UPCOMING_STATUSES = new Set(['pending', 'confirmed']);

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  );
}

export default function ArtistOverviewPage() {
  const [bookings, setBookings] = useState([]);
  const [lifetimePayout, setLifetimePayout] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  useEffect(() => {
    async function load() {
      const token = getAccessToken();
      if (!token) return;
      try {
        const [mine, earnings] = await Promise.all([
          apiFetch('/api/bookings/mine', { token }),
          apiFetch('/api/earnings', { token }),
        ]);
        setBookings(mine || []);
        setLifetimePayout(Number(earnings?.lifetimePayout) || 0);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const now = useMemo(() => new Date(), []);

  const upcoming = useMemo(() => {
    return (bookings || [])
      .filter((b) => UPCOMING_STATUSES.has(b.status) && new Date(b.event_date) >= now)
      .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
  }, [bookings, now]);

  const gigDates = useMemo(() => {
    return (bookings || [])
      .filter((b) => UPCOMING_STATUSES.has(b.status) || b.status === 'completed_by_fan' || b.status === 'settled')
      .map((b) => new Date(b.event_date));
  }, [bookings]);

  const calendarCells = useMemo(() => {
    const first = startOfMonth(month);
    const total = daysInMonth(month);
    const startPad = first.getDay();
    const cells = [];
    for (let i = 0; i < startPad; i += 1) cells.push(null);
    for (let day = 1; day <= total; day += 1) {
      cells.push(new Date(month.getFullYear(), month.getMonth(), day));
    }
    return cells;
  }, [month]);

  function counterpartyName(b) {
    return b.fan?.name || b.guest_name || 'Guest';
  }

  if (loading) return <div className={styles.page}><p>Loading...</p></div>;

  return (
    <div className={styles.page}>
      <h1 className="pageTitle">Overview</h1>
      <p className="pageSubtitle">Upcoming gigs and earnings at a glance</p>

      <FormAlert type="error">{error}</FormAlert>

      <div className={styles.statRow}>
        <div className={`card ${styles.statCard}`}>
          <span className={styles.statLabel}>Lifetime earnings</span>
          <strong className={styles.statValue}>₹{lifetimePayout.toLocaleString()}</strong>
          <Link href="/dashboard/earnings" className={styles.statLink}>View earnings</Link>
        </div>
        <div className={`card ${styles.statCard}`}>
          <span className={styles.statLabel}>Upcoming gigs</span>
          <strong className={styles.statValue}>{upcoming.length}</strong>
          <Link href="/dashboard/bookings" className={styles.statLink}>All bookings</Link>
        </div>
      </div>

      <div className={styles.overviewGrid}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Upcoming</h2>
          {upcoming.length === 0 ? (
            <div className={styles.empty}>
              <p>No upcoming gigs.</p>
              <p style={{ marginTop: '0.75rem' }}>
                <Link href="/dashboard/bookings/new" className="btn btnPrimary">Add a booking</Link>
              </p>
            </div>
          ) : (
            <div className={styles.list}>
              {upcoming.slice(0, 6).map((b) => (
                <div key={b.id} className={`card ${styles.bookingCard}`}>
                  <div className={styles.bookingHeader}>
                    <div>
                      <h3>{counterpartyName(b)}</h3>
                      <p className={styles.meta}>{new Date(b.event_date).toLocaleString()}</p>
                    </div>
                    <span className={`statusBadge ${statusClass(b.status)}`}>
                      {statusLabel(b.status)}
                    </span>
                  </div>
                  <p className={styles.details}>{b.event_details}</p>
                  <p className={styles.meta}>
                    {formatCityLabel(b.venue_city) || '—'}
                    {b.venue_location ? ` — ${b.venue_location}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.calHeader}>
            <h2 className={styles.sectionTitle}>Calendar</h2>
            <div className={styles.calNav}>
              <button
                type="button"
                className={styles.calBtn}
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                aria-label="Previous month"
              >
                ‹
              </button>
              <span className={styles.calMonth}>
                {month.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
              </span>
              <button
                type="button"
                className={styles.calBtn}
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                aria-label="Next month"
              >
                ›
              </button>
            </div>
          </div>
          <div className={`card ${styles.calendar}`}>
            <div className={styles.calWeekdays}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <span key={d} className={styles.calWeekday}>{d}</span>
              ))}
            </div>
            <div className={styles.calGrid}>
              {calendarCells.map((date, idx) => {
                if (!date) return <span key={`e-${idx}`} className={styles.calEmpty} />;
                const hasGig = gigDates.some((g) => sameDay(g, date));
                const isToday = sameDay(date, now);
                return (
                  <span
                    key={date.toISOString()}
                    className={`${styles.calDay} ${hasGig ? styles.calGig : ''} ${isToday ? styles.calToday : ''}`}
                  >
                    {date.getDate()}
                  </span>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
