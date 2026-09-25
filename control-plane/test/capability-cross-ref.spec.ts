/**
 * capability-cross-ref.spec.ts
 *
 * Cross-reference drill-down proof for capability-catalog (T2.4 verification,
 * F-T25 closure). Verifies the entityLinkPlugin emits a `capabilityLink`
 * node for every capability-kind reference, and that the emitted node carries
 * the kind/namespace/name triple needed to drill into the catalog detail page.
 *
 * Requirements: REQ-DOC-5 (anchor contracts — hName 'a', href format identical
 * to KindList.tsx / routes/router.tsx, className and data-capability-ref;
 * testRefs harvested from this file by verification/src/traceability/build.ts),
 * REQ-CR-CAP-13 (detail page renders cross-ref-bearing content),
 * REQ-VAH-CROSSREF-RENDER (first real cross-reference + browser UAT).
 */

import { describe, it, expect } from 'vitest';
import { entityLinkPlugin } from '../src/features/docs/entityLinkPlugin';

interface MdastNode {
  type: string;
  value?: string;
  children?: MdastNode[];
  data?: {
    hName?: string;
    hProperties?: {
      href?: string;
      className?: string[];
      'data-capability-ref'?: string;
    };
  };
  kind?: string;
  namespace?: string;
  name?: string;
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

describe('capability cross-reference drill-down', () => {
  // REQ-DOC-5: route segment per kind — must stay identical to the plural
  // segments registered in routes/router.tsx (/capabilities/<route>/...) and
  // normalized back by CapabilityDetail's KIND_FROM_ROUTE_SEGMENT.
  const ROUTE_BY_KIND: Record<string, string> = {
    Skill: 'skills',
    Pack: 'packs',
    Profile: 'profiles',
    Workflow: 'workflows',
    Recipe: 'recipes',
  };

  it('emits a capabilityLink node for [[Skill:default/character-consistency]]', () => {
    const out = runPluginOnText('See [[Skill:default/character-consistency]] for details.');
    const link = out.find((n) => n.type === 'capabilityLink');
    expect(link, 'expected capabilityLink node').toBeDefined();
    expect(link?.kind).toBe('Skill');
    expect(link?.namespace).toBe('default');
    expect(link?.name).toBe('character-consistency');
    expect(link?.data?.hProperties?.['data-capability-ref']).toBe(
      'Skill:default/character-consistency'
    );
    // REQ-DOC-5 anchor contract: real <a> with the catalog-detail href.
    expect(link?.data?.hName).toBe('a');
    expect(link?.data?.hProperties?.href).toBe(
      '/capabilities/skills/default/character-consistency'
    );
    expect(link?.data?.hProperties?.className).toEqual(['doc-capability-link']);
  });

  it('emits a capabilityLink node for each of the 5 supported capability kinds', () => {
    const REFS = [
      ['Skill', 'default', 'character-consistency'],
      ['Pack', 'editorial', 'story_core'],
      ['Profile', 'default', 'middle-grade-10-11'],
      ['Workflow', 'default', 'sdxl-illustrated-page'],
      ['Recipe', 'default', 'middle-grade-illustrated'],
    ] as const;

    for (const [kind, ns, name] of REFS) {
      const refStr = `${kind}:${ns}/${name}`;
      const out = runPluginOnText(`Use [[${refStr}]] for this.`);
      const link = out.find((n) => n.type === 'capabilityLink');
      expect(link, `missing capabilityLink for ${refStr}`).toBeDefined();
      expect(link?.kind).toBe(kind);
      expect(link?.namespace).toBe(ns);
      expect(link?.name).toBe(name);
      // REQ-DOC-5 anchor contract per kind: hName 'a', href built from
      // capabilityKindToRoute with encodeURIComponent on both segments,
      // className and data-capability-ref.
      expect(link?.data?.hName).toBe('a');
      expect(link?.data?.hProperties?.href).toBe(
        `/capabilities/${ROUTE_BY_KIND[kind]}/${encodeURIComponent(ns)}/${encodeURIComponent(name)}`
      );
      expect(link?.data?.hProperties?.className).toEqual(['doc-capability-link']);
      expect(link?.data?.hProperties?.['data-capability-ref']).toBe(refStr);
    }
  });

  it('does NOT emit a capabilityLink for a Provider kind (no instances today)', () => {
    const out = runPluginOnText('See [[Provider:default/none]] for details.');
    // Provider should NOT produce capabilityLink; either entityLink (if
    // parseable by m16) or plain text fallback.
    const link = out.find((n) => n.type === 'capabilityLink');
    expect(link, 'expected NO capabilityLink for Provider').toBeUndefined();
  });

  it('does NOT emit a capabilityLink for an unknown kind', () => {
    const out = runPluginOnText('See [[Unknown:default/foo]] for details.');
    const link = out.find((n) => n.type === 'capabilityLink');
    expect(link).toBeUndefined();
  });

  it('renders a capability ref without namespace as plain text (no anchor)', () => {
    // REQ-DOC-5 edge: [[Skill:narrative-arc]] has no ns/name pair — neither
    // tryParseCapabilityRef nor parseEntityRef accepts it, so it stays literal.
    const out = runPluginOnText('See [[Skill:narrative-arc]] for details.');
    const link = out.find((n) => n.type === 'capabilityLink');
    expect(link).toBeUndefined();
    const textNodes = out.filter((n) => n.type === 'text').map((n) => n.value);
    expect(textNodes.join('')).toContain('[[Skill:narrative-arc]]');
  });

  it('preserves non-link text segments before and after the match', () => {
    const out = runPluginOnText('Before [[Skill:default/x]] after.');
    const textNodes = out.filter((n) => n.type === 'text').map((n) => n.value);
    expect(textNodes).toContain('Before ');
    expect(textNodes).toContain(' after.');
  });
});
