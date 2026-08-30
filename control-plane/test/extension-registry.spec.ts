/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { extensionRegistry, EXTENSIONS_API_VERSION } from '../src/extensions';
import type { EntityTabExtension, EntityCardExtension } from '../src/extensions';

// Helper to create a minimal ReactElement-like object
const makeDiv = () => ({ type: 'div', props: {}, key: null } as any);

describe('extensionRegistry', () => {
  describe('register', () => {
    it('accepts a valid EntityTabExtension', () => {
      const id = `test/tab-${Date.now()}`;
      extensionRegistry.register({
        apiVersion: EXTENSIONS_API_VERSION,
        id,
        kind: 'tab',
        targetKind: 'Character',
        priority: 100,
        predicate: () => true,
        title: 'Test Tab',
        render: makeDiv,
      } as unknown as EntityTabExtension);

      const seededEntity = {
        apiVersion: 'narrative.dev/v1alpha1',
        kind: 'Character',
        metadata: { name: 'nora', namespace: 'demo', relations: [] },
      } as const;
      const tabs = extensionRegistry.resolveEntityTabs(seededEntity);
      expect(tabs.some((t) => t.id === id)).toBe(true);
    });

    it('accepts a valid EntityCardExtension', () => {
      const id = `test/card-${Date.now()}`;
      extensionRegistry.register({
        apiVersion: EXTENSIONS_API_VERSION,
        id,
        kind: 'card',
        targetKind: 'Character',
        priority: 100,
        predicate: () => true,
        render: makeDiv,
      } as unknown as EntityCardExtension);

      const seededEntity = {
        apiVersion: 'narrative.dev/v1alpha1',
        kind: 'Character',
        metadata: { name: 'nora', namespace: 'demo', relations: [] },
      } as const;
      const cards = extensionRegistry.resolveEntityCards(seededEntity);
      expect(cards.some((c) => c.id === id)).toBe(true);
    });

    it('does not throw on duplicate id (succeeds silently)', () => {
      const id = `test/dup-${Date.now()}`;
      extensionRegistry.register({
        apiVersion: EXTENSIONS_API_VERSION,
        id,
        kind: 'tab',
        targetKind: 'Character',
        priority: 100,
        predicate: () => true,
        title: 'First',
        render: makeDiv,
      } as unknown as EntityTabExtension);

      // Second registration with same id also succeeds (silent — array keeps both)
      extensionRegistry.register({
        apiVersion: EXTENSIONS_API_VERSION,
        id,
        kind: 'tab',
        targetKind: 'Character',
        priority: 100,
        predicate: () => true,
        title: 'Second',
        render: makeDiv,
      } as unknown as EntityTabExtension);

      const seededEntity = {
        apiVersion: 'narrative.dev/v1alpha1',
        kind: 'Character',
        metadata: { name: 'nora', namespace: 'demo', relations: [] },
      } as const;
      const tabs = extensionRegistry.resolveEntityTabs(seededEntity);
      // Both registrations are kept; silent success means no throw, not overwrite
      const matches = tabs.filter((t) => t.id === id);
      expect(matches).toHaveLength(2);
    });
  });

  describe('resolveEntityTabs', () => {
    it('returns tabs sorted by priority ascending', () => {
      const entity = {
        apiVersion: 'narrative.dev/v1alpha1',
        kind: 'Character',
        metadata: { name: 'test', namespace: 'demo', relations: [] },
      } as const;

      const tabAId = `test/tab-a-${Date.now()}`;
      const tabBId = `test/tab-b-${Date.now()}`;

      extensionRegistry.register({
        apiVersion: EXTENSIONS_API_VERSION,
        id: tabAId,
        kind: 'tab',
        targetKind: 'Character',
        priority: 30,
        predicate: () => true,
        title: 'Tab A',
        render: makeDiv,
      } as unknown as EntityTabExtension);

      extensionRegistry.register({
        apiVersion: EXTENSIONS_API_VERSION,
        id: tabBId,
        kind: 'tab',
        targetKind: 'Character',
        priority: 10,
        predicate: () => true,
        title: 'Tab B',
        render: makeDiv,
      } as unknown as EntityTabExtension);

      const tabs = extensionRegistry.resolveEntityTabs(entity);
      expect(tabs[0]!.id).toBe(tabBId);
      expect(tabs[1]!.id).toBe(tabAId);
    });

    it('excludes tabs whose predicate returns false', () => {
      const characterEntity = {
        apiVersion: 'narrative.dev/v1alpha1',
        kind: 'Character',
        metadata: { name: 'test', namespace: 'demo', relations: [] },
      } as const;

      const buildEntity = {
        apiVersion: 'narrative.dev/v1alpha1',
        kind: 'Build',
        metadata: { name: 'test', namespace: 'demo', relations: [] },
      } as const;

      const tabId = `test/char-only-${Date.now()}`;

      extensionRegistry.register({
        apiVersion: EXTENSIONS_API_VERSION,
        id: tabId,
        kind: 'tab',
        targetKind: 'Character',
        priority: 10,
        predicate: () => false,
        title: 'Should Not Appear',
        render: makeDiv,
      } as unknown as EntityTabExtension);

      const charTabs = extensionRegistry.resolveEntityTabs(characterEntity);
      const buildTabs = extensionRegistry.resolveEntityTabs(buildEntity);

      expect(charTabs.find((t) => t.id === tabId)).toBeUndefined();
      expect(buildTabs.find((t) => t.id === tabId)).toBeUndefined();
    });
  });

  describe('resolveEntityCards', () => {
    it('returns cards sorted by priority ascending', () => {
      const entity = {
        apiVersion: 'narrative.dev/v1alpha1',
        kind: 'Character',
        metadata: { name: 'test', namespace: 'demo', relations: [] },
      } as const;

      const cardAId = `test/card-a-${Date.now()}`;
      const cardBId = `test/card-b-${Date.now()}`;

      extensionRegistry.register({
        apiVersion: EXTENSIONS_API_VERSION,
        id: cardAId,
        kind: 'card',
        targetKind: 'Character',
        priority: 20,
        predicate: () => true,
        render: makeDiv,
      } as unknown as EntityCardExtension);

      extensionRegistry.register({
        apiVersion: EXTENSIONS_API_VERSION,
        id: cardBId,
        kind: 'card',
        targetKind: 'Character',
        priority: 5,
        predicate: () => true,
        render: makeDiv,
      } as unknown as EntityCardExtension);

      const cards = extensionRegistry.resolveEntityCards(entity);
      expect(cards[0]!.id).toBe(cardBId);
      expect(cards[1]!.id).toBe(cardAId);
    });
  });
});
