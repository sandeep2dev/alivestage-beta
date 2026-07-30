'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { useCallback, useEffect, useRef, useState } from 'react';
import { uploadEventImage } from '@/lib/richText';
import styles from './RichTextEditor.module.css';

function ToolbarButton({ active, onClick, children, title }) {
  return (
    <button
      type="button"
      className={`${styles.toolBtn} ${active ? styles.toolBtnActive : ''}`}
      onClick={onClick}
      title={title}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Describe your jam — paste formatted text, add links and photos…',
  id,
  className = '',
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}) {
  const fileRef = useRef(null);
  const editorRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const insertImage = useCallback(async (file) => {
    const ed = editorRef.current;
    if (!file || !ed) return;
    setUploading(true);
    setUploadError('');
    try {
      const url = await uploadEventImage(file);
      ed.chain().focus().setImage({ src: url, alt: file.name || 'Event photo' }).run();
    } catch (err) {
      setUploadError(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        class: styles.editorContent,
        ...(ariaInvalid ? { 'aria-invalid': 'true' } : {}),
        ...(ariaDescribedBy ? { 'aria-describedby': ariaDescribedBy } : {}),
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) insertImage(file);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.isEmpty ? '' : ed.getHTML();
      onChange?.(html);
    },
  });

  editorRef.current = editor;

  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? '' : editor.getHTML();
    const next = value || '';
    if (current !== next) {
      editor.commands.setContent(next, false);
    }
  }, [editor, value]);

  function setLink() {
    if (!editor) return;
    const previous = editor.getAttributes('link').href;
    const url = window.prompt('Link URL', previous || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  if (!editor) {
    return <div className={styles.shell} id={id} aria-hidden="true" />;
  }

  return (
    <div
      id={id}
      className={`${styles.shell} ${className}`.trim()}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
    >
      <div className={styles.toolbar} role="toolbar" aria-label="Formatting">
        <ToolbarButton
          title="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          U
        </ToolbarButton>
        <span className={styles.divider} aria-hidden="true" />
        <ToolbarButton
          title="Heading"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H
        </ToolbarButton>
        <ToolbarButton
          title="Bullet list"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          •
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1.
        </ToolbarButton>
        <span className={styles.divider} aria-hidden="true" />
        <ToolbarButton title="Add link" active={editor.isActive('link')} onClick={setLink}>
          Link
        </ToolbarButton>
        <ToolbarButton
          title="Add photo"
          active={false}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? '…' : 'Photo'}
        </ToolbarButton>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className={styles.hiddenFile}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) insertImage(file);
          }}
        />
      </div>
      {uploadError && <p className={styles.uploadError}>{uploadError}</p>}
      <EditorContent editor={editor} />
    </div>
  );
}
