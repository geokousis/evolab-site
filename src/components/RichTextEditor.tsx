import { type ChangeEvent, useRef, useState } from 'react';
import { Bold, Italic, Underline, Link } from 'lucide-react';
import { FormattedText } from './FormattedText';

type Props = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
};

export function RichTextEditor({ value, onChange, label, placeholder }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  const [linkModal, setLinkModal] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const savedRange = useRef<{ start: number; end: number } | null>(null);

  const wrap = (before: string, after: string) => {
    const ta = ref.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const selected = value.slice(s, e);
    if (!selected) return;
    const next = value.slice(0, s) + before + selected + after + value.slice(e);
    onChange(next);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(s + before.length, e + before.length);
    }, 0);
  };

  const openLinkModal = () => {
    const ta = ref.current;
    if (!ta) return;
    savedRange.current = { start: ta.selectionStart, end: ta.selectionEnd };
    const selected = value.slice(ta.selectionStart, ta.selectionEnd);
    setLinkText(selected);
    setLinkUrl('');
    setLinkModal(true);
  };

  const insertLink = () => {
    const range = savedRange.current;
    const url = linkUrl.trim();
    const text = linkText.trim();
    if (!url || !text || !range) { setLinkModal(false); return; }
    const snippet = `[${text}](${url})`;
    const next = value.slice(0, range.start) + snippet + value.slice(range.end);
    onChange(next);
    setLinkModal(false);
    setTimeout(() => ref.current?.focus(), 0);
  };

  return (
    <div className="rte-root">
      {label && <label className="admin-label">{label}</label>}

      {/* Toolbar */}
      <div className="rte-toolbar">
        <button type="button" className="rte-btn" title="Bold — select text then click" onClick={() => wrap('**', '**')}>
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" className="rte-btn" title="Italic — select text then click" onClick={() => wrap('*', '*')}>
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" className="rte-btn" title="Underline — select text then click" onClick={() => wrap('__', '__')}>
          <Underline className="h-4 w-4" />
        </button>

        <div className="rte-sep" />

        <button type="button" className="rte-btn" title="Insert link" onClick={openLinkModal}>
          <Link className="h-4 w-4" />
        </button>

        <div className="rte-spacer" />

        <button
          type="button"
          className={`rte-tab ${!preview ? 'rte-tab--active' : ''}`}
          onClick={() => setPreview(false)}
        >
          Edit
        </button>
        <button
          type="button"
          className={`rte-tab ${preview ? 'rte-tab--active' : ''}`}
          onClick={() => setPreview(true)}
        >
          Preview
        </button>
      </div>

      {/* Editor / Preview */}
      {preview ? (
        <div className="rte-preview">
          {value ? <FormattedText text={value} /> : <span className="rte-empty">Nothing to preview.</span>}
        </div>
      ) : (
        <textarea
          ref={ref}
          className="admin-textarea rte-textarea"
          value={value}
          placeholder={placeholder}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
        />
      )}

      {/* Link modal */}
      {linkModal && (
        <div className="rte-modal-backdrop" onClick={() => setLinkModal(false)}>
          <div className="rte-modal" onClick={(e) => e.stopPropagation()}>
            <p className="rte-modal-title">Insert link</p>
            <label className="admin-label">Link text</label>
            <input
              className="admin-input"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              placeholder="Click here"
              autoFocus
            />
            <label className="admin-label" style={{ marginTop: 8 }}>URL</label>
            <input
              className="admin-input"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              onKeyDown={(e) => e.key === 'Enter' && insertLink()}
            />
            <div className="rte-modal-actions">
              <button className="admin-button admin-button--ghost" type="button" onClick={() => setLinkModal(false)}>
                Cancel
              </button>
              <button className="admin-button admin-button--primary" type="button" onClick={insertLink}>
                Insert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
