import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import type { Scenario, ScenarioOracle, ScenarioStep } from '../types.ts';

const DRIVER_KINDS = new Set(['filesystem', 'cli', 'process', 'git', 'browser']);
const ORACLE_TYPES = new Set([
  'schema',
  'semantic-json',
  'filesystem-tree',
  'file-content',
  'golden',
  'browser',
  'cross-language',
]);

export class ScenarioValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScenarioValidationError';
  }
}

export async function loadScenario(path: string): Promise<Scenario> {
  const raw = await readFile(path, 'utf8');
  const doc = parse(raw) as Record<string, unknown>;
  return validateScenario(doc, path);
}

export function validateScenario(doc: unknown, source: string): Scenario {
  const d = doc as Record<string, unknown>;
  const fail = (msg: string): never => {
    throw new ScenarioValidationError(`${source}: ${msg}`);
  };
  if (typeof d.id !== 'string' || !d.id) fail('id is required');
  if (typeof d.uat !== 'string' || !d.uat) fail('uat is required');
  if (!Array.isArray(d.requirements) || d.requirements.length === 0) fail('requirements[] is required');
  const claims = d.claims as Record<string, unknown> | undefined;
  if (!claims || !Array.isArray(claims.proves) || !Array.isArray(claims.doesNotProve)) {
    fail('claims.proves[] and claims.doesNotProve[] are required (VAH-005)');
  }  if (!Array.isArray(d.steps) || d.steps.length === 0) fail('steps[] is required');
  if (!Array.isArray(d.oracles) || d.oracles.length === 0) fail('oracles[] is required');

  const steps: ScenarioStep[] = (d.steps as Record<string, unknown>[]).map((s, i) => {
    if (typeof s.id !== 'string' || !s.id) fail(`steps[${i}].id is required`);
    if (!DRIVER_KINDS.has(String(s.driver))) fail(`steps[${i}].driver "${String(s.driver)}" is not a known driver`);
    if (typeof s.action !== 'string' || !s.action) fail(`steps[${i}].action is required`);
    return {
      id: s.id as string,
      driver: s.driver as ScenarioStep['driver'],
      action: s.action as string,
      ...(s.params ? { params: s.params as Record<string, unknown> } : {}),
    };
  });

  const oracles: ScenarioOracle[] = (d.oracles as Record<string, unknown>[]).map((o, i) => {
    if (typeof o.id !== 'string' || !o.id) fail(`oracles[${i}].id is required`);
    if (!ORACLE_TYPES.has(String(o.type))) fail(`oracles[${i}].type "${String(o.type)}" is not a known oracle`);
    return {
      id: o.id as string,
      type: o.type as ScenarioOracle['type'],
      ...(o.config ? { config: o.config as Record<string, unknown> } : {}),
    };
  });

  return {
    id: d.id as string,
    uat: d.uat as string,
    requirements: d.requirements as string[],
    claims: claims as unknown as Scenario['claims'],
    steps,
    oracles,
    ...(Array.isArray(d.evidence) ? { evidence: d.evidence as string[] } : {}),
  };
}
