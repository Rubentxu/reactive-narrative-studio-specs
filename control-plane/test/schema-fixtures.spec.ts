import { describe, it, expect, beforeAll } from 'vitest';
import { schemaIdFor, validate } from '../src/schema/registry';
import { loadFixtureText, parseYaml } from './support/fixtures';

describe('schema registry', () => {
  const PROJECT_FIXTURE_VALID = 'project-valid/cp-project.json';
  const CHAPTERS_FIXTURE_VALID = 'project-valid/cp-chapters.json';
  const CHARACTERS_FIXTURE_VALID = 'project-valid/cp-characters.json';
  const ASSETS_FIXTURE_VALID = 'project-valid/cp-assets.json';
  const UAT_FIXTURE_VALID = 'project-valid/cp-uat.json';

  beforeAll(() => {
    // Warm up lazy compile
    schemaIdFor({ schema: 'control-plane/project/v1', generatedAt: '', sourceRevision: '', project: { id: '', title: '' } });
  });

  it('dispatches cp-project via schema const', () => {
    const doc = JSON.parse(loadFixtureText(PROJECT_FIXTURE_VALID));
    const dispatch = schemaIdFor(doc);
    expect(dispatch).not.toBeNull();
    expect(dispatch!.source).toBe('const');
  });

  it('dispatches catalog-entity via apiVersion', () => {
    const doc = parseYaml(loadFixtureText('project-valid/narrative-project.yaml'));
    const dispatch = schemaIdFor(doc);
    expect(dispatch).not.toBeNull();
    expect(dispatch!.source).toBe('apiVersion');
  });

  it('validates cp-project fixture with ok: true', () => {
    const doc = JSON.parse(loadFixtureText(PROJECT_FIXTURE_VALID));
    const result = validate(doc);
    expect(result.valid).toBe(true);
  });

  it('validates cp-chapters fixture with ok: true', () => {
    const doc = JSON.parse(loadFixtureText(CHAPTERS_FIXTURE_VALID));
    const result = validate(doc);
    expect(result.valid).toBe(true);
  });

  it('validates cp-characters fixture with ok: true', () => {
    const doc = JSON.parse(loadFixtureText(CHARACTERS_FIXTURE_VALID));
    const result = validate(doc);
    expect(result.valid).toBe(true);
  });

  it('validates cp-assets fixture with ok: true', () => {
    const doc = JSON.parse(loadFixtureText(ASSETS_FIXTURE_VALID));
    const result = validate(doc);
    expect(result.valid).toBe(true);
  });

  it('validates cp-uat fixture with ok: true', () => {
    const doc = JSON.parse(loadFixtureText(UAT_FIXTURE_VALID));
    const result = validate(doc);
    expect(result.valid).toBe(true);
  });
});
