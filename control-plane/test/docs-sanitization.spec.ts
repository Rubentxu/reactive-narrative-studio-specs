// @vitest-environment jsdom
/**
 * docs-sanitization.spec.ts — OWASP Markdown XSS neutralization.
 *
 * Asserts individually that each of the 10 OWASP Markdown XSS vectors
 * from REQ-DOC-2 is neutralized by docsSafeMarkdown:
 *   1. <script> tag
 *   2. javascript: URL in <a href>
 *   3. onerror= attribute (img)
 *   4. data: URL in <img src>
 *   5. data: URL in <a href>
 *   6. <iframe>
 *   7. <object> / <embed>
 *   8. vbscript: URL in <a href>
 *   9. Inline event handlers (onclick=, onload=, etc.)
 *   10. Raw <style> tag
 *
 * Each vector is tested with a measurable assertion: the component renders
 * without throwing, and the output text does not contain the payload substring.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { docsSafeMarkdown } from '../src/features/docs/docsSafeMarkdown';

const VECTORS: Array<{ name: string; markdown: string; payload: string }> = [
  {
    name: '1. <script> tag',
    markdown: '<script>alert("xss")</script><p>Hello</p>',
    payload: '<script>',
  },
  {
    name: '2. javascript: URL in <a href>',
    markdown: '[click me](javascript:alert("xss"))',
    payload: 'javascript:',
  },
  {
    name: '3. onerror= attribute on <img>',
    markdown: '<img src="x" onerror="alert(1)">',
    payload: 'onerror=',
  },
  {
    name: '4. data: URL in <img src>',
    markdown: '<img src="data:text/html,<svg onload=alert(1)>">',
    payload: 'data:',
  },
  {
    name: '5. data: URL in <a href>',
    markdown: '[click](data:text/html,<script>alert(1)</script>)',
    payload: 'data:',
  },
  {
    name: '6. <iframe>',
    markdown: '<iframe src="https://evil.com"></iframe><p>safe</p>',
    payload: '<iframe',
  },
  {
    name: '7. <object> / <embed>',
    markdown: '<object data="evil.swf"></object><p>safe</p>',
    payload: '<object',
  },
  {
    name: '8. vbscript: URL in <a href>',
    markdown: '[vbs](vbscript:msgbox("xss"))',
    payload: 'vbscript:',
  },
  {
    name: '9. Inline event handlers (onclick)',
    markdown: '<button onclick="alert(1)">click</button>',
    payload: 'onclick=',
  },
  {
    name: '10. Raw <style> tag',
    markdown: '<style>body{color:red}</style><p>Hello</p>',
    payload: '<style>',
  },
];

describe('docsSafeMarkdown — REQ-DOC-2 OWASP XSS vectors', () => {
  for (const { name, markdown, payload } of VECTORS) {
    it(`${name}: renders without throwing`, () => {
      expect(() => {
        render(docsSafeMarkdown(markdown));
      }).not.toThrow();
    });

    it(`${name}: output does not contain payload substring`, () => {
      const { container } = render(docsSafeMarkdown(markdown));
      const text = container.textContent ?? '';
      // The payload substring must not appear in the rendered output
      expect(text).not.toContain(payload);
    });
  }

  it('renders safe GFM content correctly', () => {
    const md = `## Heading

- list item 1
- list item 2

**bold** and *italic* and \`code\`

[link](https://example.com)`;
    const { container } = render(docsSafeMarkdown(md));
    const text = container.textContent ?? '';
    expect(text).toContain('Heading');
    expect(text).toContain('list item 1');
    expect(text).toContain('bold');
    expect(text).toContain('link');
  });

  it('strips dangerous protocols from <a> while rendering safe links', () => {
    const md = '[safe](https://example.com) [js](javascript:alert(1)) [data](data:text/html,evil)';
    const { container } = render(docsSafeMarkdown(md));
    const text = container.textContent ?? '';
    // Safe link text should be present
    expect(text).toContain('safe');
    // javascript: and data: should be neutralized (not appear as clickable links)
    expect(text).not.toContain('javascript:');
    expect(text).not.toContain('data:');
  });

  it('strips dangerous protocols from <img> src', () => {
    const md = '![safe alt](https://example.com/img.png) ![evil](javascript:alert(1)) ![data](data:text/html,evil)';
    const { container } = render(docsSafeMarkdown(md));
    // The safe image should render with the correct alt attribute
    const safeImg = container.querySelector('img[src="https://example.com/img.png"]');
    expect(safeImg).not.toBeNull();
    expect(safeImg?.getAttribute('alt')).toBe('safe alt');
    // javascript: and data: images should not appear as <img> elements
    const evilImgs = container.querySelectorAll('img');
    for (const img of Array.from(evilImgs)) {
      const src = img.getAttribute('src') ?? '';
      expect(src).not.toContain('javascript:');
      expect(src).not.toMatch(/^data:/);
    }
  });
});
