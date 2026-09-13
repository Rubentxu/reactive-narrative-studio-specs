import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadScenario } from '../src/scenario/loader.ts';

const REPO_ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..');

describe('bundled scenarios', () => {
  it('bootstrap scenario validates and references a declared requirement', async () => {
    const scenario = await loadScenario(join(REPO_ROOT, 'verification/scenarios/scn-harness-bootstrap.yaml'));
    expect(scenario.id).toBe('SCN-HARNESS-BOOTSTRAP-001');
    expect(scenario.requirements).toContain('REQ-VAH-BOOTSTRAP');
    expect(scenario.claims.doesNotProve.length).toBeGreaterThan(0);
  });

  it('UAT-M10-04 scenario matches the change example contract (VAH-012/VAH-021)', async () => {
    const scenario = await loadScenario(join(REPO_ROOT, 'verification/scenarios/scn-m10-04-001.yaml'));
    expect(scenario.uat).toBe('UAT-M10-04');
    const drivers = new Set(scenario.steps.map((s) => s.driver));
    expect(drivers.has('cli')).toBe(true);
    expect(drivers.has('browser')).toBe(true);
    const oracleTypes = new Set(scenario.oracles.map((o) => o.type));
    expect(oracleTypes.has('cross-language')).toBe(true);
    // The example contract requires manifest + skeleton oracles
    expect(scenario.oracles.some((o) => o.id.includes('skeleton'))).toBe(true);
  });
});

describe('VAH-001 production isolation (architecture fitness function)', () => {
  it('no production module imports anything from verification/', async () => {
    const { readdir } = await import('node:fs/promises');
    const violations: string[] = [];
    const scan = async (root: string, skip: (dir: string) => boolean): Promise<void> => {
      for (const entry of await readdir(root, { withFileTypes: true })) {
        if (skip(entry.name)) continue;
        const full = join(root, entry.name);
        if (entry.isDirectory()) {
          await scan(full, skip);
        } else if (/\.(ts|tsx|py|js|mjs|cjs)$/.test(entry.name)) {
          const text = await readFile(full, 'utf8');
          if (/(from\s+['"])((\.\.?\/)*verification\/|.*\/verification\/)/.test(text)) {
            violations.push(full);
          }
        }
      }
    };
    await scan(join(REPO_ROOT, 'control-plane/src'), (n) => n === 'node_modules' || n === 'dist');
    await scan(join(REPO_ROOT, 'tools'), (n) => n === 'node_modules' || n === '__pycache__' || n === '.venv');
    expect(violations).toEqual([]);
  });
});
