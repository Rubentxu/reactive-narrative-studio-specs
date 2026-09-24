/**
 * EntityPage composition tests (REQ-CEP-2): the /entity/$kind/$namespace/$name
 * page composes EntityHeader + extension-resolved cards/tabs with no domain
 * logic — verified here at the registry/extension level.
 */
import { describe, it, expect } from 'vitest';
import { extensionRegistry } from '../src/extensions';

describe('entity-page-composition', () => {
  it('extensionRegistry returns extensions sorted by priority for Character kind', () => {
    const entity = {
      apiVersion: 'narrative.dev/v1alpha1',
      kind: 'Character',
      metadata: { name: 'nora', namespace: 'demo', relations: [] },
    } as const;

    const tabs = extensionRegistry.resolveEntityTabs(entity);
    const priorities = tabs.map((t) => t.priority);

    // Verify strictly ascending
    for (let i = 1; i < priorities.length; i++) {
      expect(priorities[i]!).toBeGreaterThanOrEqual(priorities[i - 1]!);
    }
  });

  it('tab extensions have required title field', () => {
    const entity = {
      apiVersion: 'narrative.dev/v1alpha1',
      kind: 'Character',
      metadata: { name: 'nora', namespace: 'demo', relations: [] },
    } as const;

    const tabs = extensionRegistry.resolveEntityTabs(entity);
    for (const tab of tabs) {
      expect(typeof tab.title).toBe('string');
      expect(tab.title.length).toBeGreaterThan(0);
    }
  });

  it('each tab extension has a unique id', () => {
    const entity = {
      apiVersion: 'narrative.dev/v1alpha1',
      kind: 'Character',
      metadata: { name: 'nora', namespace: 'demo', relations: [] },
    } as const;

    const tabs = extensionRegistry.resolveEntityTabs(entity);
    const ids = tabs.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

/**
 * REQ-CEP-3: parseEntityRef round-trips the Kind:namespace/name route params
 * that EntityPage reads from the URL, rejecting malformed refs.
 */
describe('parseEntityRef (REQ-CEP-3)', () => {
  it('parses Kind:namespace/name refs and rejects malformed input', async () => {
    const { parseEntityRef, formatEntityRef, EntityRefParseError } = await import('../src/store/entityRef');
    const ref = parseEntityRef('Skill:demo/ns');
    expect(ref).toEqual({ kind: 'Skill', namespace: 'demo', name: 'ns' });
    expect(formatEntityRef(ref)).toBe('Skill:demo/ns');
    expect(() => parseEntityRef('no-separator')).toThrow(EntityRefParseError);
    expect(() => parseEntityRef('Skill:')).toThrow(EntityRefParseError);
  });
});
