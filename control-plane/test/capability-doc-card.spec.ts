// @vitest-environment jsdom
/**
 * capability-doc-card.spec.ts
 *
 * Component-level proof for REQ-CR-CAP-13: the capability detail page renders
 * cross-reference-bearing content through the docs pipeline (CapabilityDocCard
 * → docsSafeMarkdown), so [[Kind:ns/name]] refs render as resolved anchors
 * (REQ-DOC-5) and no metadata key carrying markdown is dumped as flat text
 * (MetadataCard skip-list; keeps the detail.no-raw-crossref oracle of
 * SCN-M10-02-001 green).
 *
 * Built with React.createElement (not JSX literals) so this spec keeps the
 * plain .ts extension used by the harness-facing test naming convention.
 *
 * Requirements: REQ-CR-CAP-13 (testRefs source for the traceability registry),
 * REQ-DOC-5, REQ-VAH-CROSSREF-RENDER.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { createElement } from 'react';
import { CapabilityDocCard } from '../src/features/docs/capability/CapabilityDocCard';
import { MetadataCard } from '../src/features/catalog/entity/MetadataCard';
import type { CatalogEntity } from '../src/loader/ProjectSource';

const SKILL_CONTENT = [
  '# character-consistency',
  '',
  '## Purpose',
  '',
  'Multi-layered validation framework.',
  '',
  '## Cross-references',
  '',
  '- [[Skill:default/narrative-arc]]: Arc provides the macro-level beats.',
  '- docs/08-PROFILES.md: canonical profiles.',
  '',
].join('\n');

function skillEntity(content: string | undefined): CatalogEntity {
  const metadata: Record<string, unknown> = {
    namespace: 'default',
    name: 'character-consistency',
    path: '/examples/skills/character-consistency/SKILL.md',
    sha256: '',
    origin: 'global',
    purpose: 'Multi-layered validation framework.',
  };
  if (content !== undefined) metadata.content = content;
  return { apiVersion: 'control-plane/catalog-entity/v1', kind: 'skill', metadata };
}

describe('CapabilityDocCard (REQ-CR-CAP-13)', () => {
  it('renders skill content as markdown with the cross-reference resolved to an anchor', () => {
    const { container } = render(createElement(CapabilityDocCard, { entity: skillEntity(SKILL_CONTENT) }));
    const anchor = container.querySelector('a[data-capability-ref="Skill:default/narrative-arc"]');
    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute('href')).toBe('/capabilities/skills/default/narrative-arc');
    expect(anchor?.className).toContain('doc-capability-link');
    // Markdown structure rendered (heading), no raw cross-ref syntax visible.
    expect(container.querySelector('h1')?.textContent).toContain('character-consistency');
    const text = container.textContent ?? '';
    expect(text).toContain('docs/08-PROFILES.md: canonical profiles.');
    expect(text).not.toContain('[[');
  });

  it('renders nothing when metadata carries no content', () => {
    const { container } = render(createElement(CapabilityDocCard, { entity: skillEntity(undefined) }));
    expect(container.querySelector('.capability-doc-card')).toBeNull();
    expect(container.querySelector('a[data-capability-ref]')).toBeNull();
  });

  it('renders nothing for a non-skill entity without content (empty fragment, no markdown)', () => {
    const entity: CatalogEntity = {
      apiVersion: 'control-plane/catalog-entity/v1',
      kind: 'pack',
      metadata: { namespace: 'editorial', name: 'story_core' },
    };
    const { container } = render(createElement(CapabilityDocCard, { entity }));
    expect(container.querySelector('.capability-doc-card')).toBeNull();
  });
});

describe('MetadataCard content skip-list (REQ-CR-CAP-13 edge)', () => {
  it('does not dump the markdown content key as a flat metadata row', () => {
    const { container } = render(createElement(MetadataCard, { entity: skillEntity(SKILL_CONTENT) }));
    const text = container.textContent ?? '';
    expect(text).toContain('Kind');
    expect(text).toContain('character-consistency');
    // The raw markdown (with its [[...]] cross-ref) must not leak into the
    // flat dump — the docs/capability card is the only renderer for it.
    expect(text).not.toContain('[[');
    expect(text).not.toContain('Cross-references');
  });

  it('keeps rendering plain metadata rows for entities without content', () => {
    const entity: CatalogEntity = {
      apiVersion: 'control-plane/catalog-entity/v1',
      kind: 'pack',
      metadata: { namespace: 'editorial', name: 'story_core', description: 'Story core pack' },
    };
    const { container } = render(createElement(MetadataCard, { entity }));
    const text = container.textContent ?? '';
    expect(text).toContain('description');
    expect(text).toContain('Story core pack');
  });
});
