'use client';

import styles from './FileUpload.module.css';

/**
 * Themed file picker — hides the native control (which breaks on dark UIs).
 */
export default function FileUpload({
  id,
  accept = 'image/*',
  onChange,
  previewSrc = '',
  previewAlt = 'Preview',
  label = 'Choose file',
  hint = '',
  fileName = '',
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}) {
  return (
    <div className={styles.root}>
      {previewSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewSrc} alt={previewAlt} className={styles.preview} />
      ) : (
        <div className={styles.placeholder} aria-hidden="true">
          <span className={styles.placeholderIcon}>＋</span>
        </div>
      )}
      <div className={styles.meta}>
        <label className={styles.trigger} htmlFor={id}>
          <input
            id={id}
            type="file"
            accept={accept}
            className={styles.input}
            onChange={onChange}
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedBy}
          />
          <span className={styles.triggerLabel}>{previewSrc ? 'Change photo' : label}</span>
        </label>
        {(fileName || hint) && (
          <p className={styles.hint}>
            {fileName || hint}
          </p>
        )}
      </div>
    </div>
  );
}
