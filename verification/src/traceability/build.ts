import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

export interface RequirementRecord {
  id: string;
  sources: string[];
  scenarios: string[];
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

export interface TraceabilityRegistry {
  schemaVersion: 'traceability-registry/v1';
  generatedAt: string;
  gitSha: string;
  milestones: MilestoneRecord[];
  brokenReferences: string[];
  coverage: { requirements: number; mapped: number; unmapped: number; uats: number; executable: number };
}

const REQ_ID = /REQ-[A-Z0-9]+(?:-[A-Z0-9]+)*/g;
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
};

export function milestoneOfUat(filename: string): string {
  const id = filename.replace(/\.md$/, '');
  // The UAT-M10-* series is an umbrella: individual UATs belong to specific
  // milestones per repo history (m10.1 delivered UAT-M10-04; m10.2 UAT-M10-06).
  const overrides: Array<[string, string]> = [
    ['UAT-M10-04', 'M10.1'],
    ['UAT-M10-06', 'M10.2'],
  ];
  for (const [prefix, milestone] of overrides) {
    if (id.startsWith(prefix)) return milestone;
  }
  const match = /^UAT-(M\d+(?:\.\d+)?)-/.exec(filename);
  return match?.[1] ?? 'UNKNOWN';
}

/**
 * Git-native traceability inventory for M0–M10.2 (H1):
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
        const id = match[0];
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
      const id = match[0];
      const list = reqScenario.get(id) ?? [];
      list.push(file);
      reqScenario.set(id, [...new Set(list)]);
    }
  }

  const brokenReferences: string[] = [];

  // milestones M0..M10.2 (slice scope)
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
        return {
          id: reqId,
          sources,
          scenarios,
          status: scenarios.length > 0 ? ('MAPPED' as const) : ('UNMAPPED' as const),
        };
      })
      .sort((a, b) => a.id.localeCompare(b.id));
    return { id, uats, requirements };
  });

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
    coverage: {
      requirements: allRequirements.length,
      mapped: allRequirements.filter((r) => r.status === 'MAPPED').length,
      unmapped: allRequirements.filter((r) => r.status === 'UNMAPPED').length,
      uats: allUats.length,
      executable: allUats.filter((u) => u.status === 'EXECUTABLE').length,
    },
  };
}

function reqBelongsToMilestone(reqId: string, milestone: string): boolean {
  // PRAGMATIC heuristic for the inventory: REQ-<AREA>-* maps to the milestone that
  // owns the area. Areas are matched against milestone ids present in changes/.
  const area = reqId.replace(/^REQ-/, '').replace(/-\d+.*$/, '');
  const areaToMilestone: Record<string, string> = {
    CR: 'M10.1',
    'CR-CAP': 'M10.2',
    CAP: 'M10.2',
    CP: 'M10',
    CPS: 'M16',
    CEP: 'M10.2',
    CLI: 'M9',
  };
  if (milestone === 'M10.2' && area.startsWith('CR-CAP')) return true;
  if (milestone === 'M10.2' && (area === 'CAP' || area === 'CEP')) return true;
  if (milestone === 'M10.1' && area === 'CR') return true;
  if (milestone === 'M10' && area === 'CP') return true;
  if (milestone === 'M9' && area === 'CLI') return true;
  void areaToMilestone;
  return false;
}

export function renderCoverageMatrix(registry: TraceabilityRegistry): string {
  const lines: string[] = [];
  lines.push('# Traceability Coverage Matrix (M0–M10.2)');
  lines.push('');
  lines.push(`- generated: ${registry.generatedAt}`);
  lines.push(`- git: ${registry.gitSha}`);
  lines.push(
    `- coverage: ${registry.coverage.mapped}/${registry.coverage.requirements} requirements MAPPED · ${registry.coverage.unmapped} UNMAPPED · ${registry.coverage.executable}/${registry.coverage.uats} UATs executable`,
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

export async function writeRegistryFiles(registry: TraceabilityRegistry, outDir: string): Promise<void> {
  await writeFile(join(outDir, 'registry.json'), `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
  await writeFile(join(outDir, 'coverage-matrix.md'), renderCoverageMatrix(registry), 'utf8');
}
