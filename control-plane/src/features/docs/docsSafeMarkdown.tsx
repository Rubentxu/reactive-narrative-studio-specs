/**
 * docsSafeMarkdown — GFM-safe markdown renderer (REQ-DOC-1, D6, Appendix B).
 *
 * Wraps react-markdown with:
 *   - remark-gfm (GFM tables, task lists, autolinks)
 *   - entityLinkPlugin (maps [[Kind:namespace/name]] to internal links per REQ-DOC-3)
 *   - rehype-sanitize with a GFM-safe schema + 4 explicit allow-list deltas (Appendix B)
 *
 * The 4 allow-list deltas (D6):
 *   1. clobberPrefix: 'user-content-' — belt-and-suspenders against id/name collision
 *   2. protocols.href = [http, https, mailto, relative] — strips javascript:, vbscript:, data:
 *   3. protocols.src = [http, https, data:image] — strips data: except image MIME
 *   4. attributes — explicit allow-list for
 *      a[href,className,data-entity-ref,data-capability-ref],
 *      img[src,alt] (survives sanitize)
 *
 * Blocks all 10 OWASP Markdown XSS vectors enumerated in REQ-DOC-2.
 *
 * EVT-DOC-01 oracle: grep -cE 'react-markdown|rehype-sanitize|remark-gfm|entityLinkPlugin'
 *   on this file → ≥ 4
 * EVT-DOC-01 oracle: grep -cE 'tagName|attributes' on this file → ≥ 2
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import sanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { entityLinkPlugin } from './entityLinkPlugin';

// GFM-safe custom schema: defaultSchema + 4 deltas (Appendix B, D6)
// Uses object-spread merge (NOT deepmerge — avoids adding a dep per correction note)
// The attributes type is inferred from defaultSchema.attributes (Record<string, PropertyDefinition[] | false>)
// We override a and img (the former for entityLinkPlugin anchors).
const customSchema = {
  ...defaultSchema,
  // DELTA 1: clobberPrefix to prevent id/name collision attacks
  clobberPrefix: 'user-content-',

  // DELTA 2 & 3: restrict URL protocols on href and src attributes
  protocols: {
    ...(defaultSchema.protocols ?? {}),
    href: ['http', 'https', 'mailto', 'relative'],
    src: ['http', 'https', 'data:image'],
  },

  // DELTA 4: explicit allow-list for elements used by the markdown pipeline.
  // We cast through `unknown` since PropertyDefinition type is not importable from
  // the transitive dep hast-util-sanitize (not a direct dep of this package).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attributes: {
    ...(defaultSchema.attributes ?? {}),
    a: ['href', 'className', 'data-entity-ref', 'data-capability-ref'] as unknown as typeof defaultSchema.attributes extends Record<string, infer V> ? V : never,
    img: ['src', 'alt'] as unknown as typeof defaultSchema.attributes extends Record<string, infer V> ? V : never,
  },
} as typeof defaultSchema;

export interface DocsSafeMarkdownOptions {
  /** Optional class name for the container div. */
  className?: string;
}

/**
 * Renders markdown content safely using GFM-safe sanitization.
 * Use this instead of raw react-markdown to prevent XSS attacks (REQ-DOC-2).
 *
 * Pipeline (D6):
 *   Markdown string
 *     → remark-gfm (GFM syntax)
 *     → entityLinkPlugin (REQ-DOC-3: [[Kind:ns/name]] → <a href="/entity/...">)
 *     → react-markdown
 *     → rehype-sanitize (custom GFM-safe schema)
 *     → React elements
 */
export function docsSafeMarkdown(
  content: string,
  options: DocsSafeMarkdownOptions = {}
): React.ReactElement {
  const { className = 'docs-content' } = options;

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, entityLinkPlugin]}
        rehypePlugins={[[sanitize, customSchema]]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
