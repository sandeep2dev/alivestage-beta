'use client';

import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor/RichTextEditor'), {
  ssr: false,
  loading: () => (
    <div
      className="textarea"
      style={{ minHeight: '10rem', opacity: 0.6 }}
      aria-hidden="true"
    />
  ),
});

export default RichTextEditor;
