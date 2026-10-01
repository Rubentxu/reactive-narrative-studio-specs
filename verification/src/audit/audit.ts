import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildRegistry, MILESTONE_ORDER, type TraceabilityRegistry, type RequirementRecord } from '../traceability/build.ts';
import { loadWaivers, type Waiver } from '../evidence/waivers.ts';

export type RequirementStatus = 'PROVEN' | 'WAIVED' | 'PARTIALLY_VERIFIED' | 'FAILED' | 'UNMAPPED';

export interface RequirementAudit {
  id: string;
  milestone: string;
  level: 'functional' | 'fitness';
  status: RequirementStatus;
  scenarioRefs: string[];
  testRefs: string[];
  waiverId?: string;
  detail: string;
}

export interface AuditReport {
  schemaVersion: 'audit-report/v1';
  generatedAt: string;
  gitSha: string;
  target: string;
  overall: 'PASS' | 'PASS_WITH_WAIVER' | 'FAIL';
  blocking: RequirementAudit[];
  waived: RequirementAudit[];
  proven: RequirementAudit[];
  requirements: RequirementAudit[];
}

interface LevelConfig {
  level: 'functional' | 'fitness';
  rationale: string;
}

const LEVEL_FILE = 'requirement-levels.json';

/**
 * Declared verification levels (default functional — strict). A malformed file
 * is a hard error: silent downgrades would weaken the gate invisibly.
 */
export async function loadRequirementLevels(verificationRoot: string): Promise<Map<string, LevelConfig>> {
  const path = join(verificationRoot, 'traceability', LEVEL_FILE);
  if (!existsSync(path)) return new Map();
  const parsed = JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
  const out = new Map<string, LevelConfig>();
  for (const [reqId, raw] of Object.entries(parsed)) {
    const cfg = raw as Record<string, unknown>;
    if (cfg.level !== 'functional' && cfg.level !== 'fitness') {
      throw new Error(`${path}: requirement ${reqId} has invalid level "${String(cfg.level)}" (functional|fitness)`);
    }
    if (typeof cfg.rationale !== 'string' || cfg.rationale.trim().length < 10) {
      throw new Error(`${path}: requirement ${reqId} needs a rationale (>= 10 chars)`);
    }
    out.set(reqId, { level: cfg.level, rationale: cfg.rationale });
  }
  return out;
}

interface ScenarioVerdict {
  runId: string;
  scenarioId: string;
  overall: string;
  requirements: string[];
  gitSha?: string;
}

/** scenario file basename (e.g. scn-m10-02-001.yaml) → declared scenario id (SCN-M10-02-001). */
async function loadScenarioIdIndex(verificationRoot: string): Promise<Map<string, string>> {
  const index = new Map<string, string>();
  const scenariosDir = join(verificationRoot, 'scenarios');
  if (!existsSync(scenariosDir)) return index;
  for (const entry of await readdir(scenariosDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.yaml')) continue;
    const text = await readFile(join(scenariosDir, entry.name), 'utf8');
    const match = /^id:\s*(\S+)\s*$/m.exec(text);
    if (match?.[1]) index.set(entry.name, match[1]);
  }
  return index;
}

/** Latest verdict per scenario, scanned from the evidence directory. */
export async function loadLatestVerdicts(verificationRoot: string): Promise<Map<string, ScenarioVerdict>> {
  const evidenceDir = join(verificationRoot, 'evidence');
  const latest = new Map<string, ScenarioVerdict>();
  if (!existsSync(evidenceDir)) return latest;
  for (const entry of await readdir(evidenceDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const verdictPath = join(evidenceDir, entry.name, 'artifacts', 'verdict.json');
    if (!existsSync(verdictPath)) continue;
    try {
      const verdict = JSON.parse(await readFile(verdictPath, 'utf8')) as ScenarioVerdict;
      const current = latest.get(verdict.scenarioId);
      if (!current || verdict.runId > current.runId) latest.set(verdict.scenarioId, verdict);
    } catch {
      // an unreadable bundle is reported by verify-evidence, not here
    }
  }
  return latest;
}

function scenarioVerdictsFor(
  requirement: RequirementRecord,
  verdicts: Map<string, ScenarioVerdict>,
  scenarioIds: Map<string, string>,
): ScenarioVerdict[] {
  return requirement.scenarios.flatMap((scenarioFile) => {
    // Registry stores scenario file names; verdicts are keyed by declared id.
    const declaredId = scenarioIds.get(scenarioFile) ?? scenarioFile.replace(/\.yaml$/, '');
    const verdict = verdicts.get(declaredId);
    return verdict ? [verdict] : [];
  });
}

/**
 * Pure status derivation for one requirement (VAH-003/020):
 * evidence verdicts + declared level + waiver → status. Exported for unit tests;
 * the gate has no hidden heuristics beyond this function.
 */
export function deriveRequirementStatus(input: {
  level: 'functional' | 'fitness';
  scenarioVerdicts: ScenarioVerdict[];
  testRefs: string[];
  waiver?: Waiver;
}): { status: RequirementStatus; detail: string } {
  const { level, scenarioVerdicts, testRefs, waiver } = input;
  if (scenarioVerdicts.some((v) => v.overall === 'FAIL')) {
    return { status: waiver ? 'WAIVED' : 'FAILED', detail: 'latest scenario verdict is FAIL' };
  }
  if (scenarioVerdicts.some((v) => v.overall === 'PASS' || v.overall === 'PASS_WITH_WAIVER')) {
    return { status: 'PROVEN', detail: `scenario evidence: ${scenarioVerdicts.map((v) => v.scenarioId).join(', ')}` };
  }
  if (level === 'fitness' && testRefs.length > 0) {
    return { status: 'PROVEN', detail: `fitness level: ${testRefs.length} test ref(s)` };
  }
  if (testRefs.length > 0) {
    return {
      status: waiver ? 'WAIVED' : 'PARTIALLY_VERIFIED',
      detail: 'only component test refs; functional requirement needs a scenario verdict',
    };
  }
  if (waiver) {
    return { status: 'WAIVED', detail: `accepted gap under ${waiver.id}` };
  }
  return { status: 'UNMAPPED', detail: 'no scenario or test references' };
}

/**
 * Audit Gate (VAH-003/020): derives status from traceability + evidence, never
 * from commit text or agent claims. functional requirements need a scenario
 * verdict; fitness requirements accept test refs.
 */
export async function auditRequirements(
  repoRoot: string,
  verificationRoot: string,
  scope: { milestones?: string[]; all?: boolean },
): Promise<AuditReport> {
  const registry: TraceabilityRegistry = await buildRegistry(repoRoot);
  const waivers: Waiver[] = await loadWaivers(verificationRoot);
  const levels = await loadRequirementLevels(verificationRoot);
  const verdicts = await loadLatestVerdicts(verificationRoot);
  const scenarioIds = await loadScenarioIdIndex(verificationRoot);
  const waiverByRequirement = new Map(waivers.map((w) => [w.requirement, w]));

  const milestones = scope.all
    ? registry.milestones.filter((m) => m.requirements.length > 0)
    : registry.milestones.filter((m) => scope.milestones?.includes(m.id));

  const audited: RequirementAudit[] = [];
  for (const milestone of milestones) {
    for (const requirement of milestone.requirements) {
      const level = levels.get(requirement.id)?.level ?? 'functional';
      const scenarioVerdicts = scenarioVerdictsFor(requirement, verdicts, scenarioIds);
      const waiver = waiverByRequirement.get(requirement.id);
      const { status, detail } = deriveRequirementStatus({
        level,
        scenarioVerdicts,
        testRefs: requirement.testRefs,
        ...(waiver ? { waiver } : {}),
      });

      audited.push({
        id: requirement.id,
        milestone: milestone.id,
        level,
        status,
        scenarioRefs: requirement.scenarios,
        testRefs: requirement.testRefs,
        ...(waiver ? { waiverId: waiver.id } : {}),
        detail,
      });
    }
  }

  const blocking = audited.filter((r) => r.status === 'PARTIALLY_VERIFIED' || r.status === 'FAILED' || r.status === 'UNMAPPED');
  const waived = audited.filter((r) => r.status === 'WAIVED');
  const proven = audited.filter((r) => r.status === 'PROVEN');
  const overall: AuditReport['overall'] = blocking.length === 0
    ? (waived.length > 0 ? 'PASS_WITH_WAIVER' : 'PASS')
    : 'FAIL';

  const target = scope.all
    ? 'all'
    : scope.milestones && scope.milestones.length > 1
      ? `range ${scope.milestones[0]}..${scope.milestones[scope.milestones.length - 1]}`
      : `milestone ${scope.milestones?.[0] ?? '?'}`;

  return {
    schemaVersion: 'audit-report/v1',
    generatedAt: new Date().toISOString(),
    gitSha: registry.gitSha,
    target,
    overall,
    blocking,
    waived,
    proven,
    requirements: audited,
  };
}

export interface RegistryFreshness {
  fresh: boolean;
  diskGitSha: string;
}

/**
 * REQ-DEI-7: the audit gate reads the registry it rebuilds in memory, but the
 * canonical artifacts on disk (traceability/registry.json etc.) may describe a
 * different revision — silent evidence degradation. This guard compares the
 * committed registry's gitSha against the in-memory rebuild's gitSha (== HEAD).
 * A malformed on-disk file is a hard error: silent downgrades would weaken the
 * gate invisibly (same policy as loadRequirementLevels / loadWaivers). It never
 * regenerates: the fix is an explicit `traceability build` on the committed tree.
 */
export async function checkRegistryFreshness(verificationRoot: string, headGitSha: string): Promise<RegistryFreshness> {
  const path = join(verificationRoot, 'traceability', 'registry.json');
  if (!existsSync(path)) {
    return { fresh: false, diskGitSha: '(missing)' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(path, 'utf8'));
  } catch (err) {
    throw new Error(`${path}: malformed registry.json (${err instanceof Error ? err.message : String(err)}) — run 'node verification/src/index.ts traceability build'`);
  }
  const diskGitSha = (parsed as { gitSha?: unknown }).gitSha;
  if (typeof diskGitSha !== 'string' || diskGitSha.length === 0) {
    throw new Error(`${path}: registry.json has no gitSha string — run 'node verification/src/index.ts traceability build'`);
  }
  return { fresh: diskGitSha === headGitSha, diskGitSha };
}

export function milestoneRange(from: string, to: string): string[] {
  const startIdx = MILESTONE_ORDER.indexOf(from);
  const endIdx = MILESTONE_ORDER.indexOf(to);
  if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) {
    throw new Error(`invalid milestone range ${from}..${to} (known: ${MILESTONE_ORDER.join(', ')})`);
  }
  return MILESTONE_ORDER.slice(startIdx, endIdx + 1);
}

export function renderAuditMarkdown(report: AuditReport): string {
  const lines: string[] = [];
  lines.push(`# Audit Gate — ${report.target}`);
  lines.push('');
  lines.push(`- generated: ${report.generatedAt}`);
  lines.push(`- git: ${report.gitSha}`);
  lines.push(
    `- overall: **${report.overall}** — proven ${report.proven.length} · waived ${report.waived.length} · blocking ${report.blocking.length}`,
  );
  if (report.blocking.length > 0) {
    lines.push('');
    lines.push('## Blocking (VAH-003)');
    for (const req of report.blocking) {
      lines.push(`- ❌ ${req.id} (${req.milestone}, ${req.level}) — ${req.status}: ${req.detail}`);
    }
  }
  if (report.waived.length > 0) {
    lines.push('');
    lines.push('## Waived');
    for (const req of report.waived) {
      lines.push(`- ⚠️ ${req.id} (${req.milestone}) — ${req.waiverId}: ${req.detail}`);
    }
  }
  if (report.proven.length > 0) {
    lines.push('');
    lines.push('## Proven');
    for (const req of report.proven) {
      lines.push(`- ✅ ${req.id} (${req.milestone}, ${req.level}) — ${req.detail}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

export async function writeAuditArtifacts(report: AuditReport, verificationRoot: string): Promise<{ jsonPath: string; mdPath: string }> {
  const dir = join(verificationRoot, 'audit');
  await mkdir(dir, { recursive: true });
  const slug = report.target.replace(/[^A-Za-z0-9.-]+/g, '-');
  const jsonPath = join(dir, `${slug}.json`);
  const mdPath = join(dir, `${slug}.md`);
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(mdPath, renderAuditMarkdown(report), 'utf8');
  return { jsonPath, mdPath };
}
