import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadScenario } from './scenario/loader.ts';
import { ScenarioRunner } from './runner/scenario.ts';
import { buildRegistry, renderCoverageMatrix, renderBaseline } from './traceability/build.ts';
import { auditRequirements, milestoneRange, writeAuditArtifacts } from './audit/audit.ts';
import { verifyEvidenceBundle, verifyRetainedBundles } from './audit/integrity.ts';
import { classifyFlakiness, renderFlakiness } from './audit/flakiness.ts';
import { renderJUnitAggregate, type JUnitRunSummary } from './report/junit.ts';

const REPO_ROOT = resolveRepoRoot();
const VERIFICATION_ROOT = join(REPO_ROOT, 'verification');

function resolveRepoRoot(): string {
  // verification/src/index.ts → repo root is three levels up
  const here = fileURLToPath(import.meta.url);
  return join(here, '..', '..', '..');
}

interface CliArgs {
  command: string;
  positional: string[];
  flags: Map<string, string>;
}

function parseArgs(argv: string[]): CliArgs {
  const command = argv[0] ?? 'help';
  const positional: string[] = [];
  const flags = new Map<string, string>();
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i] ?? '';
    if (arg.startsWith('--')) {
      const value = argv[i + 1];
      flags.set(arg.slice(2), value ?? '');
      i += 1;
    } else {
      positional.push(arg);
    }
  }
  return { command, positional, flags };
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));

  switch (args.command) {
    case 'uat': {
      // uat scenario <file> | uat all
      const sub = args.positional[0];
      if (sub === 'scenario' && args.positional[1]) {
        const result = await runOne(args.positional[1], args);
        return result.code;
      }
      if (sub === 'all') return runAll(args);
      console.error('usage: uat scenario <file.yaml> | uat all');
      return 2;
    }
    case 'verify': {
      // canonical entry point: runs every scenario under scenarios/ (VAH-015)
      return runAll(args);
    }
    case 'audit': {
      return runAudit(args);
    }
    case 'verify-evidence': {
      const dir = args.positional[0];
      if (!dir) {
        console.error('usage: verify-evidence <bundle-dir>');
        return 2;
      }
      const report = await verifyEvidenceBundle(dir);
      console.log(`bundle: ${report.bundle}`);
      console.log(`checked: ${report.checked} file(s) — ${report.ok ? 'OK' : `${report.problems.length} problem(s)`}`);
      for (const problem of report.problems) console.log(`  ❌ [${problem.kind}] ${problem.path}: ${problem.detail}`);
      return report.ok ? 0 : 1;
    }
    case 'traceability': {
      const sub = args.positional[0] ?? 'build';
      const registry = await buildRegistry(REPO_ROOT);
      const { jsonPath, matrixPath } = await writeTraceabilityArtifacts(registry);
      if (sub === 'report') console.log(renderCoverageMatrix(registry));
      else if (sub === 'baseline') console.log(renderBaseline(registry));
      else console.log(`traceability registry: ${jsonPath}\ncoverage matrix: ${matrixPath}\nbaseline: ${join(VERIFICATION_ROOT, 'traceability', 'baseline-m0-m10-2.md')}`);
      return 0;
    }
    case 'help':
    default:
      console.log(`verification harness — M10.2.1

commands:
  uat scenario <file.yaml>     run one UAT scenario
  uat all                      run every scenario in scenarios/
  verify                       canonical entry point (== uat all)
  audit milestone <id>         Audit Gate for one milestone (exit 0/1)
  audit range <a>..<b>         Audit Gate across a milestone range
  audit flakiness              historical flakiness classification
  audit retention              verify retained release evidence bundles
  verify-evidence <bundle>     recompute hashes / detect tampering
  traceability build|report    registry + coverage matrix + baseline
`);
      return 0;
  }
}

async function runAudit(args: CliArgs): Promise<number> {
  const sub = args.positional[0];

  if (sub === 'flakiness') {
    // Canonical history only (VAH-014): development runs (--tag dev) are not
    // acceptance evidence and must not fail the flakiness gate.
    const records = await classifyFlakiness(VERIFICATION_ROOT, { onlyTags: ['canonical'] });
    console.log(renderFlakiness(records));
    const outDir = join(VERIFICATION_ROOT, 'audit');
    await writeFile(join(outDir, 'flakiness.json'), `${JSON.stringify(records, null, 2)}\n`, 'utf8').catch(async () => {
      const { mkdir } = await import('node:fs/promises');
      await mkdir(outDir, { recursive: true });
      await writeFile(join(outDir, 'flakiness.json'), `${JSON.stringify(records, null, 2)}\n`, 'utf8');
    });
    return records.some((r) => r.classification === 'FLAKY' || r.classification === 'STABLE_FAIL') ? 1 : 0;
  }

  if (sub === 'retention') {
    const reports = await verifyRetainedBundles(REPO_ROOT);
    let bad = 0;
    for (const report of reports) {
      if (!report.ok) {
        bad += 1;
        console.log(`❌ ${report.bundle}`);
        for (const problem of report.problems) console.log(`   [${problem.kind}] ${problem.path}: ${problem.detail}`);
      } else {
        console.log(`✅ ${report.bundle} (${report.checked} files)`);
      }
    }
    console.log(`retained bundles: ${reports.length}, problems: ${bad}`);
    return bad === 0 ? 0 : 1;
  }

  let ids: string[] = [];
  if (sub === 'milestone' && args.positional[1]) {
    ids = [args.positional[1]];
  } else if (sub === 'range' && args.positional[1]) {
    const [from, to] = args.positional[1].split('..');
    if (!from || !to) {
      console.error('usage: audit range <from>..<to>  (e.g. M10.1..M10.2)');
      return 2;
    }
    ids = milestoneRange(from, to);
  } else if (sub === 'all') {
    const report = await auditRequirements(REPO_ROOT, VERIFICATION_ROOT, { all: true });
    const { jsonPath, mdPath } = await writeAuditArtifacts(report, VERIFICATION_ROOT);
    console.log(`audit all → ${report.overall} (json: ${jsonPath}, md: ${mdPath})`);
    console.log(`  proven ${report.proven.length} · waived ${report.waived.length} · blocking ${report.blocking.length}`);
    for (const req of report.blocking.slice(0, 20)) console.log(`  ❌ ${req.id}: ${req.status} — ${req.detail}`);
    return report.overall === 'FAIL' ? 1 : 0;
  } else {
    console.error('usage: audit milestone <id> | audit range <a>..<b> | audit all | audit flakiness | audit retention');
    return 2;
  }

  const report = await auditRequirements(REPO_ROOT, VERIFICATION_ROOT, { milestones: ids });
  const { jsonPath, mdPath } = await writeAuditArtifacts(report, VERIFICATION_ROOT);
  console.log(`audit ${report.target} → ${report.overall} (json: ${jsonPath}, md: ${mdPath})`);
  console.log(`  proven ${report.proven.length} · waived ${report.waived.length} · blocking ${report.blocking.length}`);
  for (const req of report.blocking.slice(0, 20)) {
    console.log(`  ❌ ${req.id}: ${req.status} — ${req.detail}`);
  }
  return report.overall === 'FAIL' ? 1 : 0;
}

interface RunOneResult {
  code: number;
  junit: string;
  summary: JUnitRunSummary;
}

async function runOne(file: string, args: CliArgs, tags: string[] = []): Promise<RunOneResult> {
  const scenario = await loadScenario(file);
  const extraTag = args.flags.get('tag');
  const runner = new ScenarioRunner({
    repoRoot: REPO_ROOT,
    verificationRoot: VERIFICATION_ROOT,
    headless: !args.flags.has('headed'),
    tags: extraTag ? [...new Set([...tags, extraTag])] : tags,
  });
  const { verdict, runDir } = await runner.run(scenario);
  console.log(`[${verdict.overall}] ${verdict.scenarioId} — evidence: ${runDir}`);
  printOracleSummary(verdict);
  const junit = await readFile(join(runDir, 'artifacts', 'junit.xml'), 'utf8');
  return {
    code: verdict.overall === 'FAIL' ? 1 : 0,
    junit,
    summary: { scenarioId: verdict.scenarioId, runId: verdict.runId, overall: verdict.overall },
  };
}

async function runAll(args: CliArgs): Promise<number> {
  const dir = join(VERIFICATION_ROOT, 'scenarios');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.yaml')).sort();
  let failures = 0;
  const suites: string[] = [];
  const summaries: JUnitRunSummary[] = [];
  // --tag <name> REPLACES the default 'canonical' tag: development iterations
  // of a scenario under construction run with --tag dev so they never pollute
  // the canonical flakiness history (VAH-014).
  const tagFlag = args.flags.get('tag');
  const baseTags = tagFlag ? [tagFlag] : ['canonical'];
  for (const file of files) {
    const result = await runOne(join(dir, file), args, baseTags);
    if (result.code !== 0) failures += 1;
    suites.push(result.junit);
    summaries.push(result.summary);
  }
  const aggregatePath = join(VERIFICATION_ROOT, 'evidence', 'junit-all.xml');
  await writeFile(aggregatePath, renderJUnitAggregate(summaries, suites), 'utf8');
  console.log(`junit: ${aggregatePath}`);
  return failures === 0 ? 0 : 1;
}

function printOracleSummary(verdict: Awaited<ReturnType<ScenarioRunner['run']>>['verdict']): void {
  for (const oracle of verdict.oracles) {
    const icon = oracle.verdict === 'passed' ? '✅' : oracle.waived ? '⚠️' : '❌';
    console.log(`  ${icon} ${oracle.id}: ${oracle.message}`);
  }
  for (const step of verdict.steps) {
    if (step.status === 'failed') console.log(`  ❌ step ${step.id}: ${step.error ?? 'failed'}`);
  }
}

async function writeTraceabilityArtifacts(registry: Awaited<ReturnType<typeof buildRegistry>>): Promise<{ jsonPath: string; matrixPath: string }> {
  const { mkdir } = await import('node:fs/promises');
  const outDir = join(VERIFICATION_ROOT, 'traceability');
  await mkdir(outDir, { recursive: true });
  const jsonPath = join(outDir, 'registry.json');
  const matrixPath = join(outDir, 'coverage-matrix.md');
  const baselinePath = join(outDir, 'baseline-m0-m10-2.md');
  await writeFile(jsonPath, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
  await writeFile(matrixPath, renderCoverageMatrix(registry), 'utf8');
  await writeFile(baselinePath, renderBaseline(registry), 'utf8');
  return { jsonPath, matrixPath };
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
