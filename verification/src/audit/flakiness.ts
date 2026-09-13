import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export interface FlakinessRecord {
  scenarioId: string;
  classification: 'STABLE_PASS' | 'STABLE_FAIL' | 'FLAKY' | 'WAIVED_ONLY';
  runs: number;
  passed: number;
  failed: number;
  passWithWaiver: number;
  lastRunId: string;
  lastOverall: string;
}

/**
 * Historical classification per scenario, scanned from evidence bundles.
 * FLAKY = the same scenario produced both PASS and FAIL across runs.
 */
export interface FlakinessOptions {
  /** Restrict to runs carrying ALL of these tags (canonical history filter). */
  onlyTags?: string[];
}

export async function classifyFlakiness(verificationRoot: string, options: FlakinessOptions = {}): Promise<FlakinessRecord[]> {
  const evidenceDir = join(verificationRoot, 'evidence');
  const byScenario = new Map<string, { runIds: string[]; verdicts: string[] }>();
  if (!existsSync(evidenceDir)) return [];

  for (const entry of await readdir(evidenceDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const verdictPath = join(evidenceDir, entry.name, 'artifacts', 'verdict.json');
    if (!existsSync(verdictPath)) continue;
    try {
      const verdict = JSON.parse(await readFile(verdictPath, 'utf8')) as { runId: string; scenarioId: string; overall: string };
      if (options.onlyTags && options.onlyTags.length > 0) {
        const runJsonPath = join(evidenceDir, entry.name, 'artifacts', 'run.json');
        let tags: string[] = [];
        try {
          tags = ((JSON.parse(await readFile(runJsonPath, 'utf8')) as { tags?: string[] }).tags) ?? [];
        } catch {
          tags = [];
        }
        if (!options.onlyTags.every((tag) => tags.includes(tag))) continue;
      }
      const record = byScenario.get(verdict.scenarioId) ?? { runIds: [], verdicts: [] };
      record.runIds.push(verdict.runId);
      record.verdicts.push(verdict.overall);
      byScenario.set(verdict.scenarioId, record);
    } catch {
      // unreadable bundles are integrity's concern, not flakiness
    }
  }

  const records: FlakinessRecord[] = [];
  for (const [scenarioId, record] of byScenario) {
    const passed = record.verdicts.filter((v) => v === 'PASS').length;
    const failed = record.verdicts.filter((v) => v === 'FAIL').length;
    const waived = record.verdicts.filter((v) => v === 'PASS_WITH_WAIVER').length;
    const classification: FlakinessRecord['classification'] =
      passed > 0 && failed > 0
        ? 'FLAKY'
        : failed > 0
          ? 'STABLE_FAIL'
          : passed > 0
            ? 'STABLE_PASS'
            : 'WAIVED_ONLY';
    const lastIdx = record.runIds.length - 1;
    records.push({
      scenarioId,
      classification,
      runs: record.verdicts.length,
      passed,
      failed,
      passWithWaiver: waived,
      lastRunId: record.runIds[lastIdx] ?? '',
      lastOverall: record.verdicts[lastIdx] ?? '',
    });
  }
  return records.sort((a, b) => a.scenarioId.localeCompare(b.scenarioId));
}

export function renderFlakiness(records: FlakinessRecord[]): string {
  const lines = ['# Flakiness Classification', ''];
  if (records.length === 0) {
    lines.push('- no runs recorded');
    return `${lines.join('\n')}\n`;
  }
  for (const record of records) {
    const icon = record.classification === 'FLAKY' ? '🔀' : record.classification === 'STABLE_FAIL' ? '❌' : '✅';
    lines.push(
      `- ${icon} ${record.scenarioId} — ${record.classification} (${record.passed}P/${record.failed}F/${record.passWithWaiver}W of ${record.runs} runs; last ${record.lastOverall})`,
    );
  }
  return `${lines.join('\n')}\n`;
}
