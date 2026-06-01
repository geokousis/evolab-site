import DOMPurify from 'dompurify';
import { useMemo } from 'react';

type FormattedTextProps = {
  text: string;
  className?: string;
};

const ALLOWED_TAGS = [
  'strong', 'b', 'em', 'i', 'u', 'br', 'p', 'span', 'div',
  'ul', 'ol', 'li', 'a',
];
const ALLOWED_ATTR = ['href', 'target', 'rel', 'class', 'style'];
const SAFE_URI = /^(?:(?:https?|mailto|tel):|\/|#)/i;

export function FormattedText({ text, className = '' }: FormattedTextProps) {
  const html = useMemo(() => {
    if (!text) return '';

    let out = text;

    // [link text](https://...) → <a>
    out = out.replace(
      /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="rte-link">$1</a>',
    );

    // **bold**
    out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');

    // *italic*  (single asterisk, not already wrapped)
    out = out.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');

    // __underline__
    out = out.replace(/__([^_\n]+)__/g, '<u>$1</u>');

    // bare https?:// URLs not already inside an <a> — show domain as label
    out = out.replace(
      /(?<!href=["'])(?<!>)(https?:\/\/[^\s<>"')\]]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="rte-link"><strong><u>$1</u></strong></a>',
    );

    // newlines → <br> when no block HTML present
    if (!/<(ul|ol|div)/.test(out)) {
      out = out.replace(/\n/g, '<br />');
    }

    return DOMPurify.sanitize(out, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      ALLOW_DATA_ATTR: false,
      ALLOWED_URI_REGEXP: SAFE_URI,
    });
  }, [text]);

  return (
    <div
      className={`formatted-text ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
