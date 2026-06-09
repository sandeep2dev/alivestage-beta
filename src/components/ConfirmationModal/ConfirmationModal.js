'use client';

import styles from './ConfirmationModal.module.css';

export default function ConfirmationModal({ open, title, message, confirmLabel, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onCancel} role="presentation">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button type="button" className="btn btnSecondary" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn btnPrimary" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
