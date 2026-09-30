// @vitest-environment jsdom
/**
 * entity-link-render.spec.ts (m16-doc-entity-links, REQ-DOC-3)
 *
 * Verifies that the m16 branch of entityLinkPlugin emits a NAVIGABLE internal
 * link for valid entity refs [[Kind:namespace/name]] — an `entityLink` mdast
 * node rendered as a real <a> anchor whose href targets the entity page route
 * /entity/{kind}/{namespace}/{name} registered in routes/router.tsx — and
 * that invalid refs keep rendering as plain text (no anchor).
 *
 * REQ-DOC-3 anchor contract (design C1):
 *   data.hName === 'a'
 *   href = '/entity/' + encodeURIComponent(kind) + '/' + encodeURIComponent(namespace)
 *          + '/' + encodeURIComponent(name)   — built exclusively from the
 *   components validated by parseEntityRef (never re-parsing the raw string),
 *   so URL separators cannot appear inside segments (parseEntityRef pattern
 *   [^:/]+ excludes ':' and '/') and encodeURIComponent neutralizes '?', '#'
 *   and '%' residuals.
 *   className === ['doc-entity-link'], 'data-entity-ref' === raw ref.
 *
 * REQ-DOC-3 SHALL NOT clause: no <a href> with an attacker-controlled URL.
 * Invalid refs fall back to plain text (entityLinkPlugin catch branch) AND
 * docsSafeMarkdown's sanitize layer would strip a javascript: href anyway
 * (protocols.href = http/https/mailto/relative) — the XSS test asserts the
 * double absence (no anchor AND no 'javascript:' in the sanitized output).
 *
 * Double pattern: (i) plugin direct on mdast (capability-cross-ref.spec.ts
 * pattern) for the node contract; (ii) jsdom render via docsSafeMarkdown
 * (docs-sanitization.spec.ts pattern) for the post-sanitize DOM contract.
 *
 * Capability refs ([[Skill:...]] etc.) keep their own anchor contract —
 * covered by capability-cross-ref.spec.ts (REQ-DOC-5); not duplicated here.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { entityLinkPlugin } from '../src/features/docs/entityLinkPlugin';
import { docsSafeMarkdown } from '../src/features/docs/docsSafeMarkdown';

// Explicit cleanup: vitest runs with globals:false in this package, so
// @testing-library/react auto-cleanup is not registered (same convention as
// decisions-view.spec.tsx and search.spec.tsx).
afterEach(() => {
  cleanup();
});

interface MdastNode {
  type: string;
  value?: string;
  children?: MdastNode[];
  data?: {
    hName?: string;
    hProperties?: {
      href?: string;
      className?: string[];
      'data-entity-ref'?: string;
    };
  };
}

function runPluginOnText(text: string): MdastNode[] {
  const tree: MdastNode = {
    type: 'root',
    children: [{ type: 'text', value: text }],
  };
  const transform = entityLinkPlugin();
  transform(tree);
  return tree.children ?? [];
}

describe('entity link render — REQ-DOC-3 navigable internal anchor', () => {
  it('REQ-DOC-3: emits an entityLink mdast node as <a> with /entity/ href (mdast contract)', () => {
    const out = runPluginOnText('See [[Character:demo/nora]] for details.');
    const link = out.find((n) => n.type === 'entityLink');
    expect(link, 'expected entityLink node').toBeDefined();
    // REQ-DOC-3 anchor contract: real <a>, href built from parsed components.
    expect(link?.data?.hName).toBe('a');
    expect(link?.data?.hProperties?.href).toBe('/entity/Character/demo/nora');
    expect(link?.data?.hProperties?.className).toEqual(['doc-entity-link']);
    expect(link?.data?.hProperties?.['data-entity-ref']).toBe('Character:demo/nora');
    // The visible text is the raw ref itself.
    expect(link?.children?.[0]?.type).toBe('text');
    expect(link?.children?.[0]?.value).toBe('Character:demo/nora');
  });

  it('REQ-DOC-3: renders a sanitized navigable <a href="/entity/..."> in the DOM', () => {
    const { getByText, container } = render(docsSafeMarkdown('See [[Character:demo/nora]] for details.'));
    const anchor = getByText('Character:demo/nora');
    expect(anchor.tagName).toBe('A');
    expect(anchor.getAttribute('href')).toBe('/entity/Character/demo/nora');
    expect(anchor.getAttribute('class')).toContain('doc-entity-link');
    expect(anchor.getAttribute('data-entity-ref')).toBe('Character:demo/nora');
    // No raw [[ ]] syntax survives rendering.
    expect(container.innerHTML).not.toContain('[[');
  });

  it('REQ-DOC-3: invalid entity ref renders as plain text, no anchor', () => {
    const out = runPluginOnText('See [[not-a-valid-ref]] for details.');
    expect(out.find((n) => n.type === 'entityLink')).toBeUndefined();
    const textNodes = out.filter((n) => n.type === 'text').map((n) => n.value);
    expect(textNodes.join('')).toContain('[[not-a-valid-ref]]');

    const { queryByRole, container } = render(docsSafeMarkdown('See [[not-a-valid-ref]] for details.'));
    expect(queryByRole('link')).toBeNull();
    expect(container.innerHTML).toContain('[[not-a-valid-ref]]');
  });

  it('REQ-DOC-3 (EVT-DOC-03 XSS vector): a ref whose payload mimics javascript: stays plain text — no anchor, no javascript: anywhere', () => {
    // A third ':' breaks the parseEntityRef pattern ([^:/]+ in the name segment),
    // so the whole ref falls back to plain text in the plugin itself.
    const out = runPluginOnText('See [[Character:demo/nora-with-javascript:alert(1)]] for details.');
    expect(out.find((n) => n.type === 'entityLink')).toBeUndefined();
    const textNodes = out.filter((n) => n.type === 'text').map((n) => n.value);
    expect(textNodes.join('')).toContain('[[Character:demo/nora-with-javascript:alert(1)]]');

    // Double barrier asserted: plugin keeps plain text AND the sanitized
    // output contains neither an anchor nor any href attribute — the payload
    // therefore never materializes as a URL. (The literal ref text itself
    // contains the substring 'javascript:' as inert text — that is the
    // documented plain-text fallback for invalid refs, not a URL; the attack
    // surface is the href attribute, which must be absent entirely.)
    const { queryByRole, container } = render(
      docsSafeMarkdown('See [[Character:demo/nora-with-javascript:alert(1)]] for details.')
    );
    expect(queryByRole('link')).toBeNull();
    expect(container.innerHTML).not.toContain('href=');
    expect(container.innerHTML).not.toContain('href="javascript:');
  });

  it('REQ-DOC-3: reserved URL characters inside segments are percent-encoded in href', () => {
    // parseEntityRef ([^:/]+) does not exclude '?' '#' '%', so encodeURIComponent
    // must neutralize them per segment (design C1, normative example).
    const out = runPluginOnText('See [[Character:demo/nora?x#frag]] for details.');
    const link = out.find((n) => n.type === 'entityLink');
    expect(link, 'expected entityLink node').toBeDefined();
    const href = link?.data?.hProperties?.href;
    expect(href).toBe('/entity/Character/demo/nora%3Fx%23frag');
    // Negative oracle: no raw '?' or '#' inside the href path.
    expect(href).not.toContain('?');
    expect(href).not.toContain('#');
  });
});
