/** Core domain types of the Verification & Audit Harness (M10.2.1). */

export interface ScenarioClaim {
  proves: string[];
  doesNotProve: string[];
}

export type DriverKind = 'filesystem' | 'cli' | 'process' | 'git' | 'browser';

export interface ScenarioStep {
  id: string;
  driver: DriverKind;
  action: string;
  params?: Record<string, unknown>;
}

export type OracleType =
  | 'schema'
  | 'semantic-json'
  | 'filesystem-tree'
  | 'file-content'
  | 'golden'
  | 'browser'
  | 'browser-content'
  | 'browser-evaluate'
  | 'cross-language';

export interface ScenarioOracle {
  id: string;
  type: OracleType;
  config?: Record<string, unknown>;
}

export interface Scenario {
  id: string;
  uat: string;
  requirements: string[];
  claims: ScenarioClaim;
  steps: ScenarioStep[];
  oracles: ScenarioOracle[];
  /** Declared evidence captures, mirrored from the change design (documentation + validation). */
  evidence?: string[];
}

export interface EvidenceRef {
  artifactId: string;
  path: string;
  sha256: string;
  bytes: number;
}

export interface StepObservation {
  [key: string]: unknown;
}

export interface StepResult {
  id: string;
  driver: DriverKind;
  action: string;
  status: 'passed' | 'failed';
  observations: StepObservation;
  artifacts: EvidenceRef[];
  error?: string;
  durationMs: number;
}

export interface IgnoredDifference {
  path: string;
  reason: string;
}

/** Result of one oracle evaluation (VAH-006: classification + claims; VAH-023: refs). */
export interface OracleResult {
  id: string;
  type: OracleType;
  classification:
    | 'functional-equivalence'
    | 'structural'
    | 'static-fitness'
    | 'runtime-health'
    | 'cross-runtime'
    | 'functional';
  proves: string;
  doesNotProve: string;
  verdict: 'passed' | 'failed';
  message: string;
  /** Set when a failing oracle is covered by a valid waiver (VAH: PASS_WITH_WAIVER, never PASS). */
  waived?: boolean;
  waiverId?: string;
  expectedRef?: string;
  actualRef?: string;
  diffRef?: string;
}

export interface Verdict {
  runId: string;
  scenarioId: string;
  uat: string;
  requirements: string[];
  overall: 'PASS' | 'FAIL' | 'PASS_WITH_WAIVER';
  startedAt: string;
  finishedAt: string;
  steps: StepResult[];
  oracles: OracleResult[];
  /** Requirements NOT proven by this run when overall is FAIL/PASS_WITH_WAIVER (VAH-003/VAH-023). */
  unprovenRequirements: string[];
  appliedWaivers: string[];
  git: GitObservation;
  environment: EnvironmentObservation;
  evidenceIndex: EvidenceRef[];
}

export interface ProcessObservation {
  command: string;
  cwd: string;
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
}

export interface GitObservation {
  sha: string;
  branch: string;
  dirty: boolean;
  dirtyFiles?: string[];
}

export interface EnvironmentObservation {
  os: string;
  node: string;
  pnpm?: string;
  python?: string;
  browser?: string;
}
