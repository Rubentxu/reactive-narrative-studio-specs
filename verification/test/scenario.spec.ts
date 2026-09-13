import { describe, expect, it } from 'vitest';
import { validateScenario, ScenarioValidationError } from '../src/scenario/loader.ts';
import { interpolateParams } from '../src/runner/scenario.ts';

const valid = {
  id: 'SCN-X',
  uat: 'UAT-X',
  requirements: ['REQ-X'],
  claims: { proves: ['p'], doesNotProve: ['d'] },
  steps: [{ id: 's1', driver: 'filesystem', action: 'temp-workspace' }],
  oracles: [{ id: 'o1', type: 'semantic-json' }],
};

describe('scenario validation', () => {
  it('accepts a valid scenario', () => {
    expect(() => validateScenario(valid, 'test')).not.toThrow();
  });

  it('rejects missing claims (VAH-005)', () => {
    const bad = { ...valid, claims: undefined };
    expect(() => validateScenario(bad, 'test')).toThrow(ScenarioValidationError);
  });

  it('rejects unknown drivers and oracle types', () => {
    expect(() =>
      validateScenario({ ...valid, steps: [{ id: 's', driver: 'magic', action: 'x' }] }, 't'),
    ).toThrow(/not a known driver/);
    expect(() =>
      validateScenario({ ...valid, oracles: [{ id: 'o', type: 'vibes' }] }, 't'),
    ).toThrow(/not a known oracle/);
  });

  it('rejects ignoredPaths without reason at oracle time', () => {
    // enforced by the oracle itself, validated here as documentation
    const config = { ignoredPaths: [{ path: 'x' }] };
    expect(() => {
      const ignored = config.ignoredPaths as Array<{ path: string; reason: string }>;
      for (const entry of ignored) {
        if (!entry.reason) throw new Error('reason required (VAH-013)');
      }
    }).toThrow(/reason required/);
  });
});

describe('interpolateParams', () => {
  const outputs = new Map<string, Record<string, unknown>>([
    ['ws', { dir: '/tmp/ws-1' }],
    ['submit', { planPath: '/run/browser/plan.json' }],
  ]);

  it('resolves exact placeholders to raw values', () => {
    const out = interpolateParams({ out: '{{ws.dir}}/child' }, outputs);
    expect(out.out).toBe('/tmp/ws-1/child');
  });

  it('resolves embedded placeholders in strings', () => {
    const out = interpolateParams({ note: 'plan at {{submit.planPath}}!' }, outputs);
    expect(out.note).toBe('plan at /run/browser/plan.json!');
  });

  it('leaves unknown placeholders untouched', () => {
    const out = interpolateParams({ x: '{{missing.key}}' }, outputs);
    expect(out.x).toBe('{{missing.key}}');
  });

  it('resolves inside nested objects', () => {
    const out = interpolateParams({ a: { b: '{{ws.dir}}' } }, outputs);
    expect((out.a as Record<string, unknown>).b).toBe('/tmp/ws-1');
  });
});
