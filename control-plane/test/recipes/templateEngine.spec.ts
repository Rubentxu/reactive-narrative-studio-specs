/**
 * templateEngine.spec.ts — fixture-driven conformance for the TS template engine.
 *
 * Reads the REAL fixture corpus from tools/narrative_recipes/tests/fixtures/mustache-subset/
 * (PR-4, M10.2.1: no hand-mirrored fixtures — drift between the duplicated copies was
 * a false-green identified by the Verification & Audit Harness). The same YAML files
 * drive the Python engine tests, so both runtimes are held to one source of truth.
 */

import { describe, it, expect } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { TemplateEngine, TemplateError } from '../../src/recipes/templateEngine';

const FIXTURE_DIR = join(
  fileURLToPath(import.meta.url),
  '..',
  '..',
  '..',
  '..',
  'tools',
  'narrative_recipes',
  'tests',
  'fixtures',
  'mustache-subset',
);

interface FixtureCase {
  name?: string;
  params?: Record<string, unknown>;
  expected_output?: string;
}

interface Fixture {
  template?: string;
  params?: Record<string, unknown>;
  expected_output?: string;
  expected_error?: { code?: string };
  cases?: FixtureCase[];
}

describe('TemplateEngine — shared mustache-subset fixture corpus', () => {
  const engine = new TemplateEngine();

  async function loadFixtures(): Promise<Array<{ file: string; fixture: Fixture }>> {
    const files = (await readdir(FIXTURE_DIR)).filter((f) => f.endsWith('.yaml')).sort();
    return Promise.all(
      files.map(async (file) => ({
        file,
        fixture: parse(await readFile(join(FIXTURE_DIR, file), 'utf8')) as Fixture,
      })),
    );
  }

  it('fixture corpus is non-empty (guards against silent path drift)', async () => {
    const fixtures = await loadFixtures();
    expect(fixtures.length).toBeGreaterThanOrEqual(5);
  });

  it('every fixture passes on the TS engine exactly as on Python', async () => {
    const fixtures = await loadFixtures();
    for (const { file, fixture } of fixtures) {
      if (fixture.expected_error) {
        expect(() => engine.render(fixture.template ?? '', fixture.params ?? {}), file).toThrow(
          TemplateError,
        );
        continue;
      }
      const cases: FixtureCase[] =
        fixture.cases && fixture.cases.length > 0
          ? fixture.cases
          : [{ params: fixture.params ?? {}, expected_output: fixture.expected_output ?? '' }];
      for (const testCase of cases) {
        const result = engine.render(fixture.template ?? '', testCase.params ?? {});
        expect(result, `${file}${testCase.name ? ` [${testCase.name}]` : ''}`).toBe(
          testCase.expected_output,
        );
      }
    }
  });
});
