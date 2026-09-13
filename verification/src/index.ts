import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadScenario } from './scenario/loader.ts';
import { ScenarioRunner } from './runner/scenario.ts';
import { buildRegistry, renderCoverageMatrix } from './traceability/build.ts';

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
        return runOne(args.positional[1], args);
      }
      if (sub === 'all') return runAll(args);
      console.error('usage: uat scenario <file.yaml> | uat all');
      return 2;
    }
    case 'verify': {
      // canonical entry point: runs every scenario under scenarios/ (VAH-015 partial)
      return runAll(args);
    }
    case 'traceability': {
      const sub = args.positional[0] ?? 'build';
      const registry = await buildRegistry(REPO_ROOT);
      const { jsonPath, matrixPath } = await writeTraceabilityArtifacts(registry);
      if (sub === 'report') console.log(renderCoverageMatrix(registry));
      else console.log(`traceability registry: ${jsonPath}\ncoverage matrix: ${matrixPath}`);
      return 0;
    }
    case 'help':
    default:
      console.log(`verification harness — M10.2.1

commands:
  uat scenario <file.yaml>   run one UAT scenario
  uat all                    run every scenario in scenarios/
  verify                     canonical entry point (== uat all)
  traceability build|report  traceability registry + coverage matrix
`);
      return 0;
  }
}

async function runOne(file: string, args: CliArgs): Promise<number> {
  const scenario = await loadScenario(file);
  const runner = new ScenarioRunner({
    repoRoot: REPO_ROOT,
    verificationRoot: VERIFICATION_ROOT,
    headless: !args.flags.has('headed'),
  });
  const { verdict, runDir } = await runner.run(scenario);
  console.log(`[${verdict.overall}] ${verdict.scenarioId} — evidence: ${runDir}`);
  printOracleSummary(verdict);
  return verdict.overall === 'PASS' ? 0 : 1;
}

async function runAll(args: CliArgs): Promise<number> {
  const dir = join(VERIFICATION_ROOT, 'scenarios');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.yaml')).sort();
  let failures = 0;
  for (const file of files) {
    const code = await runOne(join(dir, file), args);
    if (code !== 0) failures += 1;
  }
  return failures === 0 ? 0 : 1;
}

function printOracleSummary(verdict: Awaited<ReturnType<ScenarioRunner['run']>>['verdict']): void {
  for (const oracle of verdict.oracles) {
    console.log(`  ${oracle.verdict === 'passed' ? '✅' : '❌'} ${oracle.id}: ${oracle.message}`);
  }
  for (const step of verdict.steps) {
    if (step.status === 'failed') console.log(`  ❌ step ${step.id}: ${step.error ?? 'failed'}`);
  }
}

async function writeTraceabilityArtifacts(registry: Awaited<ReturnType<typeof buildRegistry>>): Promise<{ jsonPath: string; matrixPath: string }> {
  const { writeFile, mkdir } = await import('node:fs/promises');
  const outDir = join(VERIFICATION_ROOT, 'traceability');
  await mkdir(outDir, { recursive: true });
  const jsonPath = join(outDir, 'registry.json');
  const matrixPath = join(outDir, 'coverage-matrix.md');
  await writeFile(jsonPath, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
  await writeFile(matrixPath, renderCoverageMatrix(registry), 'utf8');
  return { jsonPath, matrixPath };
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
