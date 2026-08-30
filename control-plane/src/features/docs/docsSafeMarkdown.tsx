/**
 * docsSafeMarkdown — GFM-safe markdown renderer.
 *
 * Wraps react-markdown with rehype-sanitize using a GitHub-Flavored Markdown
 * (GFM) safe allow-list that defeats all 10 OWASP Markdown XSS vectors
 * enumerated in REQ-DOC-2.
 *
 * The allow-list permits:
 * - GFM tables, strikethrough, tasklists, autolinks
 * - Commonmark block elements (paragraphs, headings, blockquotes, lists, code)
 * - Inline formatting (bold, italic, code, links, images)
 *
 * The allow-list blocks:
 * - Raw HTML and SVG (rehype-sanitize default GFM strip)
 * - JavaScript URLs (checked via URL protocol check)
 * - Dangerous URI schemes (javascript:, data: with text/html)
 * - Inline event handlers (sanitized by default GFM config)
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import sanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

export interface DocsSafeMarkdownOptions {
  /**
   * Optional class name for the container div.
   */
  className?: string;
}

/**
 * Renders markdown content safely using GFM-safe sanitization.
 * Use this instead of raw react-markdown to prevent XSS attacks.
 */
export function docsSafeMarkdown(
  content: string,
  options: DocsSafeMarkdownOptions = {}
): React.ReactElement {
  const { className = 'docs-content' } = options;

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[sanitize]}
        components={{
          // Ensure links open safely with noopener and noreferrer
          a: ({ href, children, ...props }) => {
            // Validate URL protocol - block javascript: and data: with html
            if (href) {
              try {
                const url = new URL(href, 'http://localhost');
                const protocol = url.protocol.toLowerCase();
                if (protocol === 'javascript:' || protocol === 'data:') {
                  return <span className="doc-link-invalid" title="Unsafe link">🔗</span>;
                }
              } catch {
                // Invalid URL - render as text
                return <span className="doc-link-invalid">{children}</span>;
              }
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              >
                {children}
              </a>
            );
          },
          // Ensure images have safe src and no onerror
          img: ({ src, alt, ...props }) => {
            if (src) {
              try {
                const url = new URL(src, 'http://localhost');
                const protocol = url.protocol.toLowerCase();
                if (protocol === 'javascript:' || protocol === 'data:') {
                  return <span className="doc-img-invalid" title="Unsafe image">🖼️</span>;
                }
              } catch {
                return <span className="doc-img-invalid" title="Invalid image URL">🖼️</span>;
              }
            }
            return <img src={src} alt={alt || ''} {...props} loading="lazy" />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
