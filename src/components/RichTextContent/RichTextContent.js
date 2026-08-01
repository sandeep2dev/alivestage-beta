'use client';

import { useMemo } from 'react';
import { prepareDescriptionForDisplay } from '@/lib/richText';
import styles from './RichTextContent.module.css';

export default function RichTextContent({ html, className = '' }) {
  const safeHtml = useMemo(() => prepareDescriptionForDisplay(html), [html]);

  if (!safeHtml) return null;

  return (
    <div
      className={`${styles.content} ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
