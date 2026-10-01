import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { loadWaivers, type Waiver } from '../evidence/waivers.ts';

const exec = promisify(execFile);

export interface RequirementRecord {
  id: string;
  sources: string[];
  scenarios: string[];
  /** Component/unit-test references (fitness separated from functional UAT). */
  testRefs: string[];
  status: 'MAPPED' | 'UNMAPPED';
}

export interface UatRecord {
  id: string;
  file: string;
  milestone: string;
  scenarios: string[];
  status: 'EXECUTABLE' | 'MANUAL_ONLY';
}

export interface MilestoneRecord {
  id: string;
  uats: UatRecord[];
  requirements: RequirementRecord[];
}

export interface BaselineGap {
  kind: 'uat-without-scenario' | 'requirement-unmapped' | 'requirement-unowned';
  ref: string;
  milestone: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  detail: string;
  waiverId?: string;
}

export interface TraceabilityRegistry {
  schemaVersion: 'traceability-registry/v1';
  generatedAt: string;
  gitSha: string;
  milestones: MilestoneRecord[];
  brokenReferences: string[];
  waivers: Waiver[];
  gaps: BaselineGap[];
  coverage: {
    requirements: number;
    mapped: number;
    unmapped: number;
    uats: number;
    executable: number;
    waived: number;
  };
}

const REQ_ID = /REQ-[A-Z0-9]+(?:-[A-Z0-9]+)*/g;

/** Wildcard prose like "REQ-CR-*" must not create a phantom bare id. */
export function isWildcardMatch(text: string, match: RegExpMatchArray): boolean {
  const end = (match.index ?? 0) + match[0].length;
  return text.slice(end, end + 2) === '-*';
}
const MILESTONE_LABELS: Record<string, string> = {
  M0: 'Foundations / specs',
  M1: 'Narrative workspace',
  M2: 'Profiles',
  M3: 'Skills & packs',
  M4: 'Generation pipeline',
  M5: 'Visual pipeline',
  M6: 'Editor workbench',
  M7: 'Export & publishing',
  M8: 'Git-native storage',
  M9: 'CLI',
  M10: 'Control Plane Foundation',
  'M10.1': 'Creation Recipes',
  'M10.2': 'Capability Catalog',
  'M10.2.1': 'Verification & Audit Harness',
  M11: 'Human Reader UAT',
  M12: 'Sequential Art Core',
  M13: 'Comic Renderer',
  M14: 'Manga Profile',
  M15: 'Digital Publishing',
  M16: 'Series Canon',
  M17: 'Write-capable Control Plane',
};

/** Canonical milestone order for range audits. */
export const MILESTONE_ORDER: string[] = Object.keys(MILESTONE_LABELS);

export function milestoneOfUat(filename: string): string {
  const id = filename.replace(/\.md$/, '');
  // The UAT-M10-* series is an umbrella: individual UATs belong to specific
  // milestones per repo history (m10.1 delivered UAT-M10-04; m10.2 UAT-M10-06).
  const overrides: Array<[string, string]> = [
    ['UAT-M10-04', 'M10.1'],
    ['UAT-M10-06', 'M10.2'],
    ['UAT-M10-07', 'M10.1'],
  ];
  for (const [prefix, milestone] of overrides) {
    if (id.startsWith(prefix)) return milestone;
  }
  const match = /^UAT-(M\d+(?:\.\d+)?)-/.exec(filename);
  return match?.[1] ?? 'UNKNOWN';
}

/**
 * Git-native traceability inventory (H1), scoped by the declared milestones:
 * - UAT docs from uat/ (milestone inferred from the UAT id);
 * - REQ ids harvested from changes/ + docs/ spec prose;
 * - executable scenarios from verification/scenarios/*.yaml;
 * - broken references: REQ ids cited nowhere / UAT ids with no doc / scenario→missing UAT.
 */
export async function buildRegistry(repoRoot: string): Promise<TraceabilityRegistry> {
  const { stdout } = await exec('git', ['rev-parse', 'HEAD'], { cwd: repoRoot });
  const generatedAt = new Date().toISOString();

  const uatDir = join(repoRoot, 'uat');
  const uatFiles = (await readdir(uatDir)).filter((f) => /^UAT-M\d+.*\.md$/.test(f));

  const scenariosDir = join(repoRoot, 'verification', 'scenarios');
  let scenarioFiles: string[] = [];
  try {
    scenarioFiles = (await readdir(scenariosDir)).filter((f) => f.endsWith('.yaml'));
  } catch {
    scenarioFiles = [];
  }
  const scenarioContents = await Promise.all(
    scenarioFiles.map(async (f) => ({ file: f, text: await readFile(join(scenariosDir, f), 'utf8') })),
  );

  // REQ ids from change specs + numbered docs
  const reqSources = new Map<string, string[]>();
  const harvest = async (dir: string, include: (f: string) => boolean): Promise<void> => {
    for (const f of await readdir(dir, { recursive: true })) {
      if (!include(String(f))) continue;
      const full = join(dir, String(f));
      const text = await readFile(full, 'utf8');
      for (const match of text.matchAll(REQ_ID)) {
        if (isWildcardMatch(text, match)) continue;
        const id = match[0];
        if (isPluralArtifact(id)) continue;
        const list = reqSources.get(id) ?? [];
        list.push(String(f));
        reqSources.set(id, [...new Set(list)]);
      }
    }
  };
  await harvest(join(repoRoot, 'changes'), (f) => f.endsWith('.md'));
  await harvest(join(repoRoot, 'docs'), (f) => f.endsWith('.md') && !f.includes('reactive-narrative-studio-openspec-evolutives') && !f.includes('seedance-blocking'));

  // requirement → scenario linkage
  const reqScenario = new Map<string, string[]>();
  for (const { file, text } of scenarioContents) {
    for (const match of text.matchAll(REQ_ID)) {
      if (isWildcardMatch(text, match)) continue;
      const id = match[0];
      if (isPluralArtifact(id)) continue;
      const list = reqScenario.get(id) ?? [];
      list.push(file);
      reqScenario.set(id, [...new Set(list)]);
    }
  }

  // requirement → test refs (component/unit level; keeps fitness separate from UAT)
  const reqTests = new Map<string, string[]>();
  const harvestTests = async (dir: string, include: (f: string) => boolean): Promise<void> => {
    let entries: string[] = [];
    try {
      entries = (await readdir(dir, { recursive: true })).map(String);
    } catch {
      return;
    }
    for (const f of entries) {
      if (!include(f)) continue;
      const text = await readFile(join(dir, f), 'utf8');
      for (const match of text.matchAll(REQ_ID)) {
        if (isWildcardMatch(text, match)) continue;
        const id = match[0];
        if (isPluralArtifact(id)) continue;
        const list = reqTests.get(id) ?? [];
        list.push(`${dir.replace(`${repoRoot}/`, '')}/${f}`);
        reqTests.set(id, [...new Set(list)]);
      }
    }
  };
  await harvestTests(join(repoRoot, 'control-plane', 'test'), (f) => /\.(ts|tsx)$/.test(f));
  await harvestTests(join(repoRoot, 'tools'), (f) => /tests?\/.*\.py$/.test(f));
  await harvestTests(join(repoRoot, 'verification', 'test'), (f) => /\.(ts|tsx)$/.test(f));

  const waivers = await loadWaivers(join(repoRoot, 'verification'));
  const waivedRequirements = new Map<string, string>();
  for (const waiver of waivers) waivedRequirements.set(waiver.requirement, waiver.id);

  const brokenReferences: string[] = [];

  // milestones in MILESTONE_LABELS order (the inventory scope is the declared set)
  const milestoneIds = [...Object.keys(MILESTONE_LABELS)];
  const milestones: MilestoneRecord[] = milestoneIds.map((id) => {
    const uats: UatRecord[] = uatFiles
      .filter((f) => milestoneOfUat(f) === id)
      .map((f) => {
        const uatId = f.replace(/\.md$/, '');
        // Scenarios reference the stable short id (UAT-M10-04), not the doc slug.
        const shortId = /^(UAT-M\d+(?:\.\d+)?-\d+)/.exec(uatId)?.[1] ?? uatId;
        const scenarios = scenarioContents
          .filter((s) => s.text.includes(shortId))
          .map((s) => s.file);
        return {
          id: uatId,
          file: `uat/${f}`,
          milestone: id,
          scenarios,
          status: scenarios.length > 0 ? ('EXECUTABLE' as const) : ('MANUAL_ONLY' as const),
        };
      });
    const requirements: RequirementRecord[] = [...reqSources.entries()]
      .filter(([reqId]) => reqBelongsToMilestone(reqId, id))
      .map(([reqId, sources]) => {
        const scenarios = reqScenario.get(reqId) ?? [];
        const testRefs = reqTests.get(reqId) ?? [];
        return {
          id: reqId,
          sources,
          scenarios,
          testRefs,
          status: scenarios.length + testRefs.length > 0 ? ('MAPPED' as const) : ('UNMAPPED' as const),
        };
      })
      .sort((a, b) => a.id.localeCompare(b.id));
    return { id, uats, requirements };
  });

  // Silent-drop guard (M11/REQ-DOC/REQ-DEI defect class): a harvested
  // requirement that belongs to no milestone would vanish from the inventory
  // without a trace. Surface every unowned requirement as a gap.
  const gaps: BaselineGap[] = findUnownedRequirements(reqSources, milestones).map(
    (entry) =>
      ({
        kind: 'requirement-unowned',
        ref: entry.reqId,
        milestone: '(none)',
        // LOW: these are historical declarations outside every milestone
        // inventory (pre-M10 eras mostly) — visibility for triage, not alarm.
        severity: 'LOW',
        detail: `harvested from ${entry.sources.join(', ')} but no reqBelongsToMilestone area/override maps it to a milestone`,
      }) satisfies BaselineGap,
  );
  for (const milestone of milestones) {
    for (const uat of milestone.uats) {
      if (uat.status === 'MANUAL_ONLY') {
        gaps.push({
          kind: 'uat-without-scenario',
          ref: uat.id,
          milestone: milestone.id,
          severity: milestone.id === 'M10' || milestone.id === 'M10.1' || milestone.id === 'M10.2' ? 'HIGH' : 'MEDIUM',
          detail: 'UAT doc exists but no executable scenario links it yet',
        });
      }
    }
    for (const req of milestone.requirements) {
      if (req.status === 'UNMAPPED') {
        const waiverId = waivedRequirements.get(req.id);
        gaps.push({
          kind: 'requirement-unmapped',
          ref: req.id,
          milestone: milestone.id,
          severity: waiverId ? 'LOW' : 'MEDIUM',
          detail: waiverId
            ? `no scenario/test refs; accepted gap under waiver ${waiverId}`
            : 'no scenario or test references this requirement',
          ...(waiverId ? { waiverId } : {}),
        });
      }
    }
  }

  // broken references
  for (const { file, text } of scenarioContents) {
    for (const match of text.matchAll(/UAT-[A-Z0-9-]+/g)) {
      const uatId = match[0];
      if (!uatFiles.some((f) => f.startsWith(uatId))) {
        brokenReferences.push(`scenario ${file} references missing UAT doc ${uatId}`);
      }
    }
  }
  for (const reqId of reqScenario.keys()) {
    if (!reqSources.has(reqId)) {
      brokenReferences.push(`scenarios reference unknown requirement ${reqId}`);
    }
  }

  const allRequirements = milestones.flatMap((m) => m.requirements);
  const allUats = milestones.flatMap((m) => m.uats);
  return {
    schemaVersion: 'traceability-registry/v1',
    generatedAt,
    gitSha: stdout.trim(),
    milestones,
    brokenReferences,
    waivers,
    gaps,
    coverage: {
      requirements: allRequirements.length,
      mapped: allRequirements.filter((r) => r.status === 'MAPPED').length,
      unmapped: allRequirements.filter((r) => r.status === 'UNMAPPED').length,
      uats: allUats.length,
      executable: allUats.filter((u) => u.status === 'EXECUTABLE').length,
      waived: waivers.length,
    },
  };
}

// Per-requirement owner overrides (checked before the area heuristic): areas
// like DOC span cycles (m10.2.1 added REQ-DOC-5; m16-doc-entity-links closed
// the REQ-DOC-3/4 debt items with a navigable anchor + source-path evidence),
// so only individually-owned requirements get inventory visibility. The DOC and
// CPS areas have no heuristic mapping (and must not: an area rule for CPS would
// pull REQ-CPS-* into the inventory as UNMAPPED).
const REQ_MILESTONE_OVERRIDES: Record<string, string> = {
  'REQ-DOC-5': 'M10.2.1',
  'REQ-DOC-3': 'M16',
  'REQ-DOC-4': 'M16',
  'REQ-M11-1': 'M11',
  'REQ-M11-2': 'M11',
  'REQ-M11-3': 'M11',
  'REQ-M11-4': 'M11',
};

function reqBelongsToMilestone(reqId: string, milestone: string): boolean {
  // PRAGMATIC heuristic for the inventory: REQ-<AREA>-* maps to the milestone that
  // owns the area. Areas are matched against milestone ids present in changes/.
  const override = REQ_MILESTONE_OVERRIDES[reqId];
  if (override) return milestone === override;
  const area = reqId.replace(/^REQ-/, '').replace(/-\d+.*$/, '');
  if (milestone === 'M10.2' && area.startsWith('CR-CAP')) return true;
  if (milestone === 'M10.2' && (area === 'CAP' || area === 'CEP')) return true;
  if (milestone === 'M10.1' && area === 'CR') return true;
  if (milestone === 'M10.1' && area.startsWith('RECIPE')) return true;
  if (milestone === 'M10' && area === 'CP') return true;
  if (milestone === 'M9' && area === 'CLI') return true;
  if (milestone === 'M10.2.1' && area.startsWith('VAH')) return true;
  // DEI = debt-evidence-integrity cycle (v0.24.0): verification-harness integrity reqs.
  if (milestone === 'M10.2.1' && area === 'DEI') return true;
  // Milestone-scoped requirement areas (M12+ cycles declare REQ-<MILESTONE>-n).
  if (milestone === 'M12' && area === 'M12') return true;
  if (milestone === 'M13' && area === 'M13') return true;
  if (milestone === 'M14' && area === 'M14') return true;
  if (milestone === 'M15' && area === 'M15') return true;
  if (milestone === 'M17' && area === 'M17') return true;
  return false;
}

/** Visible range label derived from the populated milestones (no hardcoded slice). */
function milestoneRangeLabel(registry: TraceabilityRegistry): string {
  const populated = registry.milestones.filter((m) => m.uats.length > 0 || m.requirements.length > 0);
  const first = populated[0]?.id;
  const last = populated[populated.length - 1]?.id;
  return first && last ? `${first}–${last}` : '(empty)';
}

/** Requirements harvested with sources but attached to no milestone (silent-drop class). */
/** Bare single-segment matches ('REQ-DEI' from plural prose) are not requirement ids. */
function isPluralArtifact(id: string): boolean {
  return /^REQ-[A-Z0-9]+$/.test(id);
}

export function findUnownedRequirements(
  reqSources: Map<string, string[]>,
  milestones: MilestoneRecord[],
): Array<{ reqId: string; sources: string[] }> {
  const owned = new Set(milestones.flatMap((m) => m.requirements.map((r) => r.id)));
  return [...reqSources.entries()]
    .filter(([reqId]) => !owned.has(reqId))
    .map(([reqId, sources]) => ({ reqId, sources }))
    .sort((a, b) => a.reqId.localeCompare(b.reqId));
}

export function renderCoverageMatrix(registry: TraceabilityRegistry): string {
  const lines: string[] = [];
  lines.push(`# Traceability Coverage Matrix (${milestoneRangeLabel(registry)})`);
  lines.push('');
  lines.push(`- generated: ${registry.generatedAt}`);
  lines.push(`- git: ${registry.gitSha}`);
  lines.push(
    `- coverage: ${registry.coverage.mapped}/${registry.coverage.requirements} requirements MAPPED · ${registry.coverage.unmapped} UNMAPPED · ${registry.coverage.executable}/${registry.coverage.uats} UATs executable · ${registry.coverage.waived} waivers`,
  );
  if (registry.brokenReferences.length > 0) {
    lines.push('');
    lines.push('## Broken references');
    for (const broken of registry.brokenReferences) lines.push(`- ⚠️ ${broken}`);
  }
  for (const milestone of registry.milestones) {
    if (milestone.uats.length === 0 && milestone.requirements.length === 0) continue;
    lines.push('');
    lines.push(`## ${milestone.id} — ${MILESTONE_LABELS[milestone.id] ?? ''}`);
    for (const uat of milestone.uats) {
      lines.push(`- ${uat.status === 'EXECUTABLE' ? '🟢' : '⚪'} ${uat.id} (${uat.status}) → scenarios: ${uat.scenarios.join(', ') || '—'}`);
    }
    const unmapped = milestone.requirements.filter((r) => r.status === 'UNMAPPED');
    if (unmapped.length > 0) {
      lines.push(`- UNMAPPED requirements (${unmapped.length}): ${unmapped.map((r) => r.id).join(', ')}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

/**
 * Baseline (H8): per-milestone status, gaps/backlog and applied waivers.
 * Regenerable from the registry — never rewrites history (VAH-019).
 */
export function renderBaseline(registry: TraceabilityRegistry): string {
  const lines: string[] = [];
  lines.push(`# Baseline ${milestoneRangeLabel(registry)} — Verification Coverage`);
  lines.push('');
  lines.push(`- generated: ${registry.generatedAt}`);
  lines.push(`- git: ${registry.gitSha}`);
  lines.push(
    `- coverage: ${registry.coverage.mapped}/${registry.coverage.requirements} requirements MAPPED (scenario or test) · ${registry.coverage.unmapped} UNMAPPED · ${registry.coverage.executable}/${registry.coverage.uats} UATs executable · ${registry.coverage.waived} waiver(s)`,
  );
  lines.push('');
  lines.push('## Per-milestone status');
  for (const milestone of registry.milestones) {
    if (milestone.uats.length === 0 && milestone.requirements.length === 0) continue;
    lines.push('');
    lines.push(`### ${milestone.id} — ${MILESTONE_LABELS[milestone.id] ?? ''}`);
    for (const uat of milestone.uats) {
      const icon = uat.status === 'EXECUTABLE' ? '🟢' : '⚪';
      lines.push(`- ${icon} ${uat.id} — ${uat.status}${uat.scenarios.length > 0 ? ` (${uat.scenarios.join(', ')})` : ''}`);
    }
    const mapped = milestone.requirements.filter((r) => r.status === 'MAPPED');
    const unmapped = milestone.requirements.filter((r) => r.status === 'UNMAPPED');
    if (mapped.length > 0) {
      lines.push(`- requirements MAPPED (${mapped.length}): ${mapped.map((r) => r.id).join(', ')}`);
    }
    if (unmapped.length > 0) {
      lines.push(`- requirements UNMAPPED (${unmapped.length}): ${unmapped.map((r) => r.id).join(', ')}`);
    }
  }
  lines.push('');
  lines.push('## Gaps / backlog');
  if (registry.gaps.length === 0) {
    lines.push('- none');
  } else {
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
    for (const gap of [...registry.gaps].sort((a, b) => order[a.severity] - order[b.severity])) {
      lines.push(
        `- [${gap.severity}] ${gap.kind}: ${gap.ref} (${gap.milestone})${gap.waiverId ? ` — WVR ${gap.waiverId}` : ''} — ${gap.detail}`,
      );
    }
  }
  if (registry.waivers.length > 0) {
    lines.push('');
    lines.push('## Waivers');
    for (const waiver of registry.waivers) {
      lines.push(`- ${waiver.id} — requirement ${waiver.requirement} — ${waiver.reason} (scope: ${waiver.scope}; owner: ${waiver.owner})`);
      for (const evidence of waiver.evidence) lines.push(`  - evidence: ${evidence}`);
    }
  }
  if (registry.brokenReferences.length > 0) {
    lines.push('');
    lines.push('## Broken references');
    for (const broken of registry.brokenReferences) lines.push(`- ⚠️ ${broken}`);
  }
  return `${lines.join('\n')}\n`;
}

export async function writeRegistryFiles(registry: TraceabilityRegistry, outDir: string): Promise<void> {
  await writeFile(join(outDir, 'registry.json'), `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
  await writeFile(join(outDir, 'coverage-matrix.md'), renderCoverageMatrix(registry), 'utf8');
}
