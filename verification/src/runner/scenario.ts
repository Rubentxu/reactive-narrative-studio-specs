import { join } from 'node:path';
import { mkdir, rm } from 'node:fs/promises';
import type {
  OracleResult,
  Scenario,
  StepResult,
  Verdict,
} from '../types.ts';
import { EvidenceStore, type RunContext } from '../evidence/store.ts';
import { probeEnvironment, probeGit } from '../evidence/probes.ts';
import { FilesystemDriver } from '../drivers/filesystem.ts';
import { CliDriver } from '../drivers/cli.ts';
import { GitDriver } from '../drivers/git.ts';
import { ProcessDriver } from '../drivers/process.ts';
import { BrowserDriver, PreviewServer } from '../drivers/browser.ts';
import { ORACLES } from '../oracles/index.ts';

export interface RunnerConfig {
  repoRoot: string;
  verificationRoot: string;
  headless?: boolean;
}

export interface RunOutcome {
  verdict: Verdict;
  runDir: string;
}

/**
 * RunScenario use case: executes one scenario against the real system and
 * produces an immutable evidence bundle + verdict.
 */
export class ScenarioRunner {
  private readonly config: RunnerConfig;

  constructor(config: RunnerConfig) {
    this.config = config;
  }

  async run(scenario: Scenario): Promise<RunOutcome> {
    const store = new EvidenceStore(join(this.config.verificationRoot, 'evidence'));
    const run = await store.createRun();
    const startedAt = new Date().toISOString();

    await run.emitEvent('scenario.loaded', {
      scenarioId: scenario.id,
      uat: scenario.uat,
      requirements: scenario.requirements,
    });

    const environment = await probeEnvironment();
    const git = await probeGit(this.config.repoRoot);
    await run.writeJson('environment.json', environment);
    await run.writeJson('git.observation.json', git);
    if (git.dirty) {
      const files = await new GitDriver(run, this.config.repoRoot).diffFiles();
      await run.writeJson('git.dirty-files.json', { files });
    }

    const stepOutputs = new Map<string, Record<string, unknown>>();
    const browser = new BrowserDriver(run, {
      baseURL: 'http://localhost:4173',
      headless: this.config.headless ?? true,
    });
    const preview = new PreviewServer();
    const filesystem = new FilesystemDriver(run);
    const cli = new CliDriver(run, { repoRoot: this.config.repoRoot });
    const processDriver = new ProcessDriver(run);
    const gitDriver = new GitDriver(run, this.config.repoRoot);

    const steps: StepResult[] = [];
    let previewStarted = false;

    try {
      for (const step of scenario.steps) {
        const started = Date.now();
        try {
          const interpolated = interpolateParams(step.params ?? {}, stepOutputs);
          const observations = await this.executeStep(step, interpolated, {
            run,
            scenario,
            filesystem,
            cli,
            processDriver,
            gitDriver,
            browser,
            preview: previewStarted ? null : preview,
            markPreviewStarted: () => {
              previewStarted = true;
            },
          });
          stepOutputs.set(step.id, observations);
          steps.push({
            id: step.id,
            driver: step.driver,
            action: step.action,
            status: 'passed',
            observations,
            artifacts: [...run.artifactIds.values()].slice(-8),
            durationMs: Date.now() - started,
          });
          await run.emitEvent('step.passed', { stepId: step.id, durationMs: Date.now() - started });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          steps.push({
            id: step.id,
            driver: step.driver,
            action: step.action,
            status: 'failed',
            observations: {},
            artifacts: [...run.artifactIds.values()].slice(-8),
            error: message,
            durationMs: Date.now() - started,
          });
          await run.emitEvent('step.failed', { stepId: step.id, error: message });
          if (step.driver === 'browser') {
            await browser.captureFailureEvidence(step.id);
          }
          break; // fail-fast: later steps depend on earlier state
        }
      }
    } finally {
      const anyBrowserStep = scenario.steps.some((s) => s.driver === 'browser');
      if (anyBrowserStep && previewStarted) {
        await preview.stop();
      }
    }

    // Oracles run even if a step failed: partial evidence is still evidence,
    // but every oracle that cannot find its artifacts fails with a clear message.
    const oracles: OracleResult[] = [];
    const ctx = { run, stepOutputs };
    for (const oracle of scenario.oracles) {
      try {
        const impl = ORACLES[oracle.type];
        oracles.push(await impl(oracle, ctx));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        oracles.push({
          id: oracle.id,
          type: oracle.type,
          classification: 'structural',
          proves: 'n/a',
          doesNotProve: 'n/a',
          verdict: 'failed',
          message: `oracle error: ${message}`,
        });
        await run.emitEvent('oracle.error', { oracleId: oracle.id, error: message });
      }
    }

    const ok = steps.every((s) => s.status === 'passed') && oracles.every((o) => o.verdict === 'passed');
    const unproven = ok ? [] : scenario.requirements;

    const verdict: Verdict = {
      runId: run.runId,
      scenarioId: scenario.id,
      uat: scenario.uat,
      requirements: scenario.requirements,
      overall: ok ? 'PASS' : 'FAIL',
      startedAt,
      finishedAt: new Date().toISOString(),
      steps,
      oracles,
      unprovenRequirements: unproven,
      git,
      environment,
      evidenceIndex: [...run.artifactIds.values()],
    };

    await browser.close(ok);
    await run.writeJson('verdict.json', verdict);
    await run.writeJson('run.json', {
      runId: run.runId,
      scenarioId: scenario.id,
      uat: scenario.uat,
      overall: verdict.overall,
      startedAt,
      finishedAt: verdict.finishedAt,
      evidenceDir: run.dir,
    });
    const report = renderMarkdownReport(verdict);
    await run.writeArtifact('report.md', report);
    await run.finalize();
    await run.emitEvent('run.finished', { overall: verdict.overall });

    return { verdict, runDir: run.dir };
  }

  private async executeStep(
    step: Scenario['steps'][number],
    params: Record<string, unknown>,
    deps: {
      run: RunContext;
      scenario: Scenario;
      filesystem: FilesystemDriver;
      cli: CliDriver;
      processDriver: ProcessDriver;
      gitDriver: GitDriver;
      browser: BrowserDriver;
      preview: PreviewServer | null;
      markPreviewStarted: () => void;
    },
  ): Promise<Record<string, unknown>> {
    switch (`${step.driver}.${step.action}`) {
      case 'filesystem.temp-workspace': {
        const dir = await deps.filesystem.tempWorkspace(String(params.prefix ?? 'ws'));
        await deps.run.writeArtifact(`filesystem.${step.id}.path.txt`, dir);
        return { dir };
      }
      case 'cli.create-project': {
        const out = String(params.out);
        const result = await deps.cli.init(
          params.recipe ? String(params.recipe) : undefined,
          params.plan ? String(params.plan) : undefined,
          (params.params ?? {}) as Record<string, string>,
          out,
          `cli.${step.id}`,
        );
        const treeName = `filesystem.${step.id}.tree.json`;
        await deps.filesystem.writeTreeArtifact(treeName, out);
        const planPath = `${out}/.narrative/create-plan.json`;
        try {
          await deps.run.registerFile(`cli.${step.id}.create-plan.json`, planPath);
        } catch {
          await deps.run.emitEvent('artifact.missing', { artifact: `cli.${step.id}.create-plan.json`, path: planPath });
        }
        return {
          exitCode: result.exitCode,
          timedOut: result.timedOut,
          out,
          treeArtifact: treeName,
          planArtifact: `cli.${step.id}.create-plan.json`,
        };
      }
      case 'cli.run': {
        const result = await deps.cli.run(
          (params.args ?? []) as string[],
          String(params.cwd ?? deps.run.dir),
          `cli.${step.id}`,
        );
        return { exitCode: result.exitCode, stdout: result.stdout.slice(0, 4000) };
      }
      case 'process.run': {
        const result = await deps.processDriver.execute(
          {
            cmd: String(params.cmd),
            args: (params.args ?? []) as string[],
            cwd: String(params.cwd),
            envAllowlist: (params.envAllowlist ?? ['PATH', 'HOME']) as string[],
            timeoutMs: params.timeoutMs ? Number(params.timeoutMs) : undefined,
          },
          `process.${step.id}`,
        );
        return { exitCode: result.exitCode, timedOut: result.timedOut };
      }
      case 'git.observe': {
        const observation = await deps.gitDriver.observe(`git.${step.id}.json`);
        return { sha: observation.sha, dirty: observation.dirty };
      }
      case 'browser.start-preview': {
        if (deps.preview) {
          await deps.preview.start(this.config.repoRoot, Number(params.port ?? 4173));
          deps.markPreviewStarted();
        }
        return { preview: 'running' };
      }
      case 'browser.navigate': {
        await deps.browser.launch();
        await deps.browser.goto(String(params.path ?? '/'));
        await deps.browser.screenshot(`${step.id}.png`);
        return { url: String(params.path ?? '/') };
      }
      case 'browser.fill-wizard': {
        const page = deps.browser.page;
        if (!page) throw new Error('browser page not launched');
        const fields = (params.fields ?? {}) as Record<string, string>;
        for (const [name, value] of Object.entries(fields)) {
          const selector = `#${name}, input[name="${name}"], select[name="${name}"], textarea[name="${name}"]`;
          await page.fill(selector, value);
        }
        return { filled: Object.keys(fields) };
      }
      case 'browser.select-option': {
        const page = deps.browser.page;
        if (!page) throw new Error('browser page not launched');
        await page.selectOption(String(params.selector ?? 'select'), String(params.value));
        return { selected: String(params.value) };
      }
      case 'browser.submit': {
        const page = deps.browser.page;
        if (!page) throw new Error('browser page not launched');
        const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
        await page.click(String(params.buttonSelector ?? 'button[type="submit"]'));
        const download = await downloadPromise;
        const target = join(deps.run.dir, 'browser', `${step.id}-create-plan.json`);
        await mkdir(join(target, '..'), { recursive: true });
        await download.saveAs(target);
        const ref = await deps.run.registerFile(`browser.${step.id}.create-plan.json`, target);
        await deps.browser.screenshot(`${step.id}.png`);
        await deps.browser.captureConsole(`browser.${step.id}.console.json`);
        return { planArtifact: ref.artifactId, planPath: target, suggestedFilename: download.suggestedFilename() };
      }
      default:
        throw new Error(`no executor for step ${step.driver}.${step.action}`);
    }
  }
}

/**
 * Resolve `{{stepId.key}}` placeholders in step params against prior step
 * observations. A string that is exactly one placeholder resolves to the raw
 * observed value; otherwise string interpolation.
 */
export function interpolateParams(
  params: Record<string, unknown>,
  stepOutputs: Map<string, Record<string, unknown>>,
): Record<string, unknown> {
  const resolve = (value: unknown): unknown => {
    if (typeof value === 'string') {
      const exact = /^\{\{([^}]+)\}\}$/.exec(value.trim());
      if (exact) {
        const observed = lookup(exact[1] ?? '', stepOutputs);
        if (observed !== undefined) return observed;
      }
      return value.replace(/\{\{([^}]+)\}\}/g, (match, key: string) => {
        const observed = lookup(key, stepOutputs);
        return observed === undefined ? match : String(observed);
      });
    }
    if (Array.isArray(value)) return value.map(resolve);
    if (value !== null && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, resolve(v)]));
    }
    return value;
  };
  return Object.fromEntries(Object.entries(params).map(([k, v]) => [k, resolve(v)]));
}

function lookup(key: string, stepOutputs: Map<string, Record<string, unknown>>): unknown {
  const dot = key.indexOf('.');
  if (dot === -1) return undefined;
  const stepId = key.slice(0, dot);
  const field = key.slice(dot + 1);
  return stepOutputs.get(stepId)?.[field];
}

export function renderMarkdownReport(verdict: Verdict): string {
  const lines: string[] = [];
  lines.push(`# Verification Report — ${verdict.scenarioId}`);
  lines.push('');
  lines.push(`- **Run**: \`${verdict.runId}\``);
  lines.push(`- **UAT**: ${verdict.uat}`);
  lines.push(`- **Requirements**: ${verdict.requirements.join(', ')}`);
  lines.push(`- **Overall**: **${verdict.overall}**`);
  lines.push(`- **Git**: ${verdict.git.sha} (${verdict.git.branch})${verdict.git.dirty ? ' — DIRTY' : ''}`);
  lines.push(
    `- **Environment**: ${verdict.environment.os}, node ${verdict.environment.node}, python ${verdict.environment.python ?? 'n/a'}`,
  );
  lines.push('');
  lines.push('## Steps');
  for (const step of verdict.steps) {
    lines.push(
      `- ${step.status === 'passed' ? '✅' : '❌'} \`${step.id}\` (${step.driver}.${step.action}, ${step.durationMs}ms)${step.error ? ` — ${step.error}` : ''}`,
    );
  }
  lines.push('');
  lines.push('## Oracles');
  for (const oracle of verdict.oracles) {
    lines.push(`- ${oracle.verdict === 'passed' ? '✅' : '❌'} \`${oracle.id}\` [${oracle.type}/${oracle.classification}] ${oracle.message}`);
    lines.push(`  - proves: ${oracle.proves}`);
    lines.push(`  - doesNotProve: ${oracle.doesNotProve}`);
    if (oracle.diffRef) lines.push(`  - diff: ${oracle.diffRef}`);
  }
  if (verdict.overall === 'FAIL') {
    lines.push('');
    lines.push(`## Unproven requirements`);
    for (const req of verdict.unprovenRequirements) lines.push(`- ${req}`);
  }
  lines.push('');
  lines.push('## Evidence index');
  for (const ref of verdict.evidenceIndex) {
    lines.push(`- \`${ref.artifactId}\` — ${ref.path} (sha256:${ref.sha256.slice(0, 12)}…, ${ref.bytes}B)`);
  }
  return `${lines.join('\n')}\n`;
}

export { rm };
