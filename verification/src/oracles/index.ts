import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import AjvDefault from 'ajv';
import type { ScenarioOracle } from '../types.ts';
import { semanticCompare } from '../util/canonical.ts';
import type { FileEntry } from '../drivers/filesystem.ts';
import type { RunContext } from '../evidence/store.ts';

const Ajv = AjvDefault as unknown as new (options?: Record<string, unknown>) => import('ajv').Ajv;

import type { OracleResult } from '../types.ts';

export interface OracleContext {
  run: RunContext;
  /** Observation payloads produced by steps, keyed by step id. */
  stepOutputs: Map<string, Record<string, unknown>>;
}

export type OracleImpl = (oracle: ScenarioOracle, ctx: OracleContext) => Promise<OracleResult>;

async function readArtifactJson(run: RunContext, name: string): Promise<unknown> {
  const ref = run.artifactIds.get(name);
  if (!ref) throw new Error(`artifact "${name}" not found in evidence bundle`);
  const raw = await readFile(join(run.dir, ref.path), 'utf8');
  return JSON.parse(raw);
}

async function readArtifactText(run: RunContext, name: string): Promise<string> {
  const ref = run.artifactIds.get(name);
  if (!ref) throw new Error(`artifact "${name}" not found in evidence bundle`);
  return readFile(join(run.dir, ref.path), 'utf8');
}

function result(o: {
  id: string;
  type: ScenarioOracle['type'];
  verdict: 'passed' | 'failed';
  message: string;
  classification: OracleResult['classification'];
  proves: string;
  doesNotProve: string;
  expectedRef?: string;
  actualRef?: string;
  diffRef?: string;
}): OracleResult {
  return {
    id: o.id,
    type: o.type,
    classification: o.classification,
    proves: o.proves,
    doesNotProve: o.doesNotProve,
    verdict: o.verdict,
    message: o.message,
    ...(o.expectedRef ? { expectedRef: o.expectedRef } : {}),
    ...(o.actualRef ? { actualRef: o.actualRef } : {}),
    ...(o.diffRef ? { diffRef: o.diffRef } : {}),
  };
}

function ignoredFromConfig(config: Record<string, unknown>): Array<{ path: string; reason: string }> {
  const ignored = (config.ignoredPaths ?? []) as Array<{ path: string; reason: string }>;
  for (const entry of ignored) {
    if (!entry.path || !entry.reason) {
      throw new Error(`ignoredPaths entries require {path, reason} (VAH-013): ${JSON.stringify(entry)}`);
    }
  }
  return ignored;
}

/** SchemaOracle — structural conformance of a JSON artifact against a JSON Schema. */
export const schemaOracle: OracleImpl = async (oracle, ctx) => {
  const config = oracle.config ?? {};
  const schemaPath = config.schemaPath as string;
  const artifactName = config.artifact as string;
  const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
  const value = await readArtifactJson(ctx.run, artifactName);
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const ok = validate(value) as boolean;
  const message = ok
    ? `artifact "${artifactName}" conforms to ${schemaPath}`
    : `schema violations: ${ajv.errorsText(validate.errors)}`;
  return result({
    id: oracle.id,
    type: 'schema',
    verdict: ok ? 'passed' : 'failed',
    message,
    classification: 'structural',
    proves: 'the artifact matches the declared JSON Schema (structure only)',
    doesNotProve: 'semantic equivalence or functional behavior',
  });
};

/** SemanticJsonOracle — canonical semantic equality with declared ignored paths (VAH-013). */
export const semanticJsonOracle: OracleImpl = async (oracle, ctx) => {
  const config = oracle.config ?? {};
  const expectedName = config.expectedArtifact as string;
  const actualName = config.actualArtifact as string;
  const ignored = ignoredFromConfig(config);
  const expected = await readArtifactJson(ctx.run, expectedName);
  const actual = await readArtifactJson(ctx.run, actualName);
  const diff = semanticCompare(expected, actual, ignored);
  const expectedRef = await ctx.run.writeJson(`${oracle.id}.expected.json`, expected);
  const actualRef = await ctx.run.writeJson(`${oracle.id}.actual.json`, actual);
  const diffRef = await ctx.run.writeJson(`${oracle.id}.diff.json`, diff);
  const realDiffs = diff.differences.filter((d) => !d.ignored);
  const message = diff.equal
    ? `semantic JSON equal (ignored paths: ${ignored.length}, declared and justified)`
    : `semantic JSON differs in ${realDiffs.length} path(s): ${realDiffs.slice(0, 10).map((d) => d.path).join(', ')}`;
  return result({
    id: oracle.id,
    type: 'semantic-json',
    verdict: diff.equal ? 'passed' : 'failed',
    message,
    classification: 'functional-equivalence',
    proves: 'recipe-owned fields are semantically equivalent under declared normalization',
    doesNotProve: 'equivalence of fields outside the compared artifacts; narrative quality',
    expectedRef: expectedRef.path,
    actualRef: actualRef.path,
    diffRef: diffRef.path,
  });
};

/** FilesystemTreeOracle — compares produced tree snapshots (paths + hashes). */
export const filesystemTreeOracle: OracleImpl = async (oracle, ctx) => {
  const config = oracle.config ?? {};
  const expectedName = config.expectedArtifact as string;
  const actualName = config.actualArtifact as string;
  const ignored = ignoredFromConfig(config);
  const ignoredRegexes = ((config.ignoredPathPatterns ?? []) as Array<{ pattern: string; reason: string }>).map((e) => ({
    regex: new RegExp(e.pattern),
    reason: e.reason,
  }));
  const expectedWrap = (await readArtifactJson(ctx.run, expectedName)) as { root: string; files: FileEntry[] };
  const actualWrap = (await readArtifactJson(ctx.run, actualName)) as { root: string; files: FileEntry[] };
  const expected = new Map(expectedWrap.files.map((f) => [f.path, f]));
  const actual = new Map(actualWrap.files.map((f) => [f.path, f]));

  const problems: string[] = [];
  const ignoredCount = { n: 0 };
  const consider = (path: string): boolean => {
    if (ignoredRegexes.some(({ regex }) => regex.test(path))) {
      ignoredCount.n += 1;
      return false;
    }
    return true;
  };
  for (const [path, entry] of expected) {
    if (!consider(path)) continue;
    const other = actual.get(path);
    if (!other) problems.push(`missing file: ${path}`);
    else if (other.sha256 !== entry.sha256) problems.push(`content hash differs: ${path}`);
  }
  for (const path of actual.keys()) {
    if (!consider(path)) continue;
    if (!expected.has(path)) problems.push(`unexpected file: ${path}`);
  }

  const diffRef = await ctx.run.writeJson(`${oracle.id}.tree-diff.json`, {
    expectedRoot: expectedWrap.root,
    actualRoot: actualWrap.root,
    ignored,
    ignoredPathPatterns: (config.ignoredPathPatterns ?? []) as Array<{ pattern: string; reason: string }>,
    ignoredMatches: ignoredCount.n,
    problems,
  });
  return result({
    id: oracle.id,
    type: 'filesystem-tree',
    verdict: problems.length === 0 ? 'passed' : 'failed',
    message:
      problems.length === 0
        ? `trees equal (${expectedWrap.files.length} files; ${ignoredCount.n} paths ignored by declared patterns)`
        : `tree differs in ${problems.length} place(s): ${problems.slice(0, 10).join('; ')}`,
    classification: 'structural',
    proves: 'the produced file skeleton (paths + bytes) matches the expected skeleton',
    doesNotProve: 'semantic manifest equivalence or narrative content quality',
    diffRef: diffRef.path,
  });
};

/** FileContentOracle — byte-level equality of two artifacts or two real files. */
export const fileContentOracle: OracleImpl = async (oracle, ctx) => {
  const config = oracle.config ?? {};
  const expectedName = config.expectedArtifact as string | undefined;
  const actualName = config.actualArtifact as string | undefined;
  const expectedFile = config.expectedFile as string | undefined;
  const actualFile = config.actualFile as string | undefined;

  let expectedText: string;
  let actualText: string;
  let label: string;
  if (expectedName && actualName) {
    expectedText = await readArtifactText(ctx.run, expectedName);
    actualText = await readArtifactText(ctx.run, actualName);
    label = `${expectedName} vs ${actualName}`;
  } else if (expectedFile && actualFile) {
    expectedText = await readFile(expectedFile, 'utf8');
    actualText = await readFile(actualFile, 'utf8');
    label = `${expectedFile} vs ${actualFile}`;
  } else {
    throw new Error(
      `oracle "${oracle.id}" requires (expectedArtifact+actualArtifact) or (expectedFile+actualFile)`,
    );
  }

  const equal = expectedText === actualText;
  const diffRef = await ctx.run.writeArtifact(
    `${oracle.id}.content-diff.txt`,
    ['--- expected', ...(equal ? [] : splitDiff(expectedText.split('\n'), actualText.split('\n'))), '--- actual'].join('\n'),
  );
  return result({
    id: oracle.id,
    type: 'file-content',
    verdict: equal ? 'passed' : 'failed',
    message: equal ? `byte-equal: ${label}` : `content differs: ${label}`,
    classification: 'structural',
    proves: 'exact file content equality (hash-level)',
    doesNotProve: 'anything about files not compared',
    diffRef: diffRef.path,
  });
};

function splitDiff(expected: string[], actual: string[]): string[] {
  const lines: string[] = [];
  const max = Math.max(expected.length, actual.length);
  for (let i = 0; i < max; i++) {
    const e = expected[i];
    const a = actual[i];
    if (e === a) continue;
    if (e !== undefined) lines.push(`- <${i}> ${e}`);
    if (a !== undefined) lines.push(`+ <${i}> ${a}`);
  }
  return lines;
}

/** GoldenOracle — compares an artifact against a committed golden fixture. */
export const goldenOracle: OracleImpl = async (oracle, ctx) => {
  const config = oracle.config ?? {};
  const goldenPath = config.goldenPath as string;
  const artifactName = config.artifact as string;
  const mode = (config.mode as 'semantic-json' | 'raw') ?? 'semantic-json';
  const goldenText = await readFile(goldenPath, 'utf8');
  const actualText = await readArtifactText(ctx.run, artifactName);
  const ignored = ignoredFromConfig(config);

  let equal: boolean;
  let diffArtifact: string;
  if (mode === 'semantic-json') {
    const diff = semanticCompare(JSON.parse(goldenText), JSON.parse(actualText), ignored);
    equal = diff.equal;
    diffArtifact = JSON.stringify(diff, null, 2);
  } else {
    equal = goldenText === actualText;
    diffArtifact = splitDiff(goldenText.split('\n'), actualText.split('\n')).join('\n');
  }
  const diffRef = await ctx.run.writeArtifact(`${oracle.id}.golden-diff.json`, diffArtifact);
  return result({
    id: oracle.id,
    type: 'golden',
    verdict: equal ? 'passed' : 'failed',
    message: equal ? `matches golden ${goldenPath}` : `differs from golden ${goldenPath}`,
    classification: 'structural',
    proves: 'output matches the committed golden baseline',
    doesNotProve: 'the golden itself was produced by an independent runtime (see cross-language)',
    diffRef: diffRef.path,
  });
};

/** BrowserOracle — runtime health of the browser session (no console/page errors). */
export const browserOracle: OracleImpl = async (oracle, ctx) => {
  const config = oracle.config ?? {};
  const consoleArtifact = (config.consoleArtifact as string) ?? 'browser.console.json';
  const capture = (await readArtifactJson(ctx.run, consoleArtifact)) as {
    consoleErrors: string[];
    pageErrors: string[];
  };
  const failures = [...capture.pageErrors, ...capture.consoleErrors];
  return result({
    id: oracle.id,
    type: 'browser',
    verdict: failures.length === 0 ? 'passed' : 'failed',
    message:
      failures.length === 0
        ? 'browser session healthy (0 page errors, 0 console errors)'
        : `${failures.length} browser error(s): ${failures.slice(0, 5).join(' | ')}`,
    classification: 'runtime-health',
    proves: 'the UI surface completed the flow without runtime errors',
    doesNotProve: 'semantic equivalence of produced artifacts',
  });
};

/** CrossLanguageOracle — semantic equality between two real-runtime artifacts (T6). */
export const crossLanguageOracle: OracleImpl = async (oracle, ctx) => {
  const config = oracle.config ?? {};
  const expectedName = config.expectedArtifact as string;
  const actualName = config.actualArtifact as string;
  const ignored = ignoredFromConfig(config);
  const expected = await readArtifactJson(ctx.run, expectedName);
  const actual = await readArtifactJson(ctx.run, actualName);
  const diff = semanticCompare(expected, actual, ignored);
  const expectedRef = await ctx.run.writeJson(`${oracle.id}.expected.json`, expected);
  const actualRef = await ctx.run.writeJson(`${oracle.id}.actual.json`, actual);
  const diffRef = await ctx.run.writeJson(`${oracle.id}.diff.json`, diff);
  const realDiffs = diff.differences.filter((d) => !d.ignored);
  return result({
    id: oracle.id,
    type: 'cross-language',
    verdict: diff.equal ? 'passed' : 'failed',
    message: diff.equal
      ? `cross-runtime semantic equivalence holds (${expectedName} vs ${actualName})`
      : `cross-runtime equivalence FAILS: ${realDiffs.slice(0, 10).map((d) => d.path).join(', ')}`,
    classification: 'cross-runtime',
    proves: 'both real runtimes produced equivalent output (no manual construction of either side)',
    doesNotProve: 'runtimes are equivalent for inputs outside this scenario',
    expectedRef: expectedRef.path,
    actualRef: actualRef.path,
    diffRef: diffRef.path,
  });
};

/** BrowserContentOracle — declarative assertions over captured DOM artifacts (functional). */
export const browserContentOracle: OracleImpl = async (oracle, ctx) => {
  const config = oracle.config ?? {};
  const artifactName = (config.artifact as string) ?? '';
  const dom = (await readArtifactJson(ctx.run, artifactName)) as {
    url: string;
    title: string;
    h1s: string[];
    h2s: string[];
    links: string[];
    bodyText: string;
  };
  const failures: string[] = [];

  if (config.urlContains && !dom.url.includes(String(config.urlContains))) {
    failures.push(`url "${dom.url}" does not contain "${String(config.urlContains)}"`);
  }
  if (config.titleContains && !dom.title.includes(String(config.titleContains))) {
    failures.push(`title "${dom.title}" does not contain "${String(config.titleContains)}"`);
  }
  for (const expected of (config.h1Contains ?? []) as string[]) {
    if (!dom.h1s.some((h) => h.includes(expected))) failures.push(`no <h1> contains "${expected}"`);
  }
  for (const expected of (config.h2Contains ?? []) as string[]) {
    if (!dom.h2s.some((h) => h.includes(expected))) failures.push(`no <h2> contains "${expected}"`);
  }
  for (const expected of (config.linksContain ?? []) as string[]) {
    if (!dom.links.some((href) => href.includes(expected))) failures.push(`no link href contains "${expected}"`);
  }
  for (const expected of (config.textContains ?? []) as string[]) {
    if (!dom.bodyText.includes(expected)) failures.push(`body text does not contain "${expected}"`);
  }
  for (const forbidden of (config.noRawTextContains ?? []) as string[]) {
    if (dom.bodyText.includes(forbidden)) failures.push(`body text contains forbidden raw text "${forbidden}"`);
  }

  return result({
    id: oracle.id,
    type: 'browser-content',
    verdict: failures.length === 0 ? 'passed' : 'failed',
    message:
      failures.length === 0
        ? `DOM assertions hold on ${dom.url}`
        : `${failures.length} DOM assertion(s) failed: ${failures.slice(0, 6).join('; ')}`,
    classification: 'functional',
    proves: 'the rendered UI page satisfies the declared DOM expectations',
    doesNotProve: 'internal app semantics (store mutation, data provenance) or content quality',
    actualRef: artifactName || undefined,
  });
};

/** BrowserEvaluateOracle — semantic comparison of a page.evaluate result vs declared expectations. */
export const browserEvaluateOracle: OracleImpl = async (oracle, ctx) => {
  const config = oracle.config ?? {};
  const artifactName = config.artifact as string;
  const expected = config.expected as unknown;
  const ignored = ignoredFromConfig(config);
  const actual = await readArtifactJson(ctx.run, artifactName);
  const diff = semanticCompare(expected, actual, ignored);
  const actualRef = await ctx.run.writeJson(`${oracle.id}.actual.json`, actual);
  const diffRef = await ctx.run.writeJson(`${oracle.id}.diff.json`, diff);
  const realDiffs = diff.differences.filter((d) => !d.ignored);
  return result({
    id: oracle.id,
    type: 'browser-evaluate',
    verdict: diff.equal ? 'passed' : 'failed',
    message: diff.equal
      ? `evaluate result matches expectations (${artifactName})`
      : `evaluate result differs in ${realDiffs.length} path(s): ${realDiffs.slice(0, 8).map((d) => `${d.path} expected ${d.expected} got ${d.actual}`).join('; ')}`,
    classification: 'functional',
    proves: 'the declared in-page probe (DOM/storage/state) returns the expected observable result',
    doesNotProve: 'anything outside the probe script; probe correctness is reviewer-audited',
    actualRef: actualRef.path,
    diffRef: diffRef.path,
  });
};

/**
 * JsonlEntryOracle — parses a JSONL artifact (one JSON object per line) and
 * compares the parsed array against declared expected entries, with declared
 * ignoredPaths for volatile fields (ids, timestamps). Empty lines are skipped;
 * a malformed line fails with its line number.
 */
export const jsonlEntryOracle: OracleImpl = async (oracle, ctx) => {
  const config = oracle.config ?? {};
  const artifactName = config.artifact as string;
  const expected = config.expected as unknown;
  const ignored = ignoredFromConfig(config);
  const text = await readArtifactText(ctx.run, artifactName);

  let actual: unknown[];
  try {
    actual = text
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as unknown);
  } catch (err) {
    return result({
      id: oracle.id,
      type: 'jsonl-entry',
      verdict: 'failed',
      message: `malformed JSONL in ${artifactName}: ${err instanceof Error ? err.message : String(err)}`,
      classification: 'functional',
      proves: 'the exported round report parses as JSONL entries',
      doesNotProve: 'editorial quality of the feedback',
    });
  }

  const diff = semanticCompare(expected, actual, ignored);
  const actualRef = await ctx.run.writeJson(`${oracle.id}.actual.json`, actual);
  const diffRef = await ctx.run.writeJson(`${oracle.id}.diff.json`, diff);
  const realDiffs = diff.differences.filter((d) => !d.ignored);
  return result({
    id: oracle.id,
    type: 'jsonl-entry',
    verdict: diff.equal ? 'passed' : 'failed',
    message: diff.equal
      ? `${actual.length} JSONL entr${actual.length === 1 ? 'y' : 'ies'} match expectations (${artifactName})`
      : `JSONL entries differ in ${realDiffs.length} path(s): ${realDiffs.slice(0, 8).map((d) => `${d.path} expected ${d.expected} got ${d.actual}`).join('; ')}`,
    classification: 'functional',
    proves: 'the round-report artifact carries exactly the declared fields per entry',
    doesNotProve: 'that the feedback content is meaningful or that ids are unique across rounds',
    actualRef: actualRef.path,
    diffRef: diffRef.path,
  });
};

/**
 * ZipEntriesOracle — parses a store-mode ZIP artifact (e.g. a CBZ proof) and
 * verifies entry count, names and raw-text content (store mode keeps bytes
 * uncompressed, so dialogue text is directly searchable).
 */
export const zipEntriesOracle: OracleImpl = async (oracle, ctx) => {
  const config = oracle.config ?? {};
  const artifactName = config.artifact as string;
  const ref = ctx.run.artifactIds.get(artifactName);
  if (!ref) throw new Error(`artifact "${artifactName}" not found in evidence bundle`);
  const { readStoreZip } = await import('../audit/zip.ts');
  const bytes = await readFile(join(ctx.run.dir, ref.path));
  let entries;
  try {
    entries = readStoreZip(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength));
  } catch (err) {
    return result({
      id: oracle.id,
      type: 'zip-entries',
      verdict: 'failed',
      message: `unreadable zip: ${err instanceof Error ? err.message : String(err)}`,
      classification: 'structural',
      proves: 'the archive parses as a zip',
      doesNotProve: 'entry content',
    });
  }

  const failures: string[] = [];
  const minEntries = config.minEntries as number | undefined;
  if (minEntries !== undefined && entries.length < minEntries) {
    failures.push(`expected >= ${minEntries} entries, got ${entries.length}`);
  }
  for (const expectedName of (config.namesInclude ?? []) as string[]) {
    if (!entries.some((e) => e.name === expectedName)) failures.push(`missing entry "${expectedName}"`);
  }
  for (const rule of (config.entryContains ?? []) as Array<{ namePrefix: string; contains: string[] }>) {
    const matches = entries.filter((e) => e.name.startsWith(rule.namePrefix));
    if (matches.length === 0) {
      failures.push(`no entries matching prefix "${rule.namePrefix}"`);
      continue;
    }
    for (const needle of rule.contains) {
      if (!matches.some((e) => e.text.includes(needle))) {
        failures.push(`no entry matching "${rule.namePrefix}" contains "${needle.slice(0, 40)}…"`);
      }
    }
  }
  for (const forbiddenName of (config.forbiddenNames ?? []) as string[]) {
    if (entries.some((e) => e.name === forbiddenName)) failures.push(`forbidden entry "${forbiddenName}" present`);
  }

  const listing = await ctx.run.writeArtifact(`${oracle.id}.entries.txt`, entries.map((e) => `${e.name} (${e.size}B)`).join('\n') + '\n');
  return result({
    id: oracle.id,
    type: 'zip-entries',
    verdict: failures.length === 0 ? 'passed' : 'failed',
    message:
      failures.length === 0
        ? `zip ok: ${entries.length} entries [${entries.map((e) => e.name).join(', ').slice(0, 120)}${entries.length > 6 ? '…' : ''}]`
        : `${failures.length} zip assertion(s) failed: ${failures.slice(0, 6).join('; ')}`,
    classification: 'structural',
    proves: 'the exported archive carries the declared entries and searchable raw content',
    doesNotProve: 'visual rendering quality of the pages',
    actualRef: listing.path,
  });
};


/** EPUB OCF reader-entry checks (M15): mimetype first+exact, container.xml,
 *  optional FXL rendition meta, plus the zip-entries-style content rules. */
export const epubEntriesOracle: OracleImpl = async (oracle, ctx) => {
  const config = oracle.config ?? {};
  const artifactName = config.artifact as string;
  const ref = ctx.run.artifactIds.get(artifactName);
  if (!ref) throw new Error(`artifact "${artifactName}" not found in evidence bundle`);
  const { readStoreZip } = await import('../audit/zip.ts');
  const bytes = await readFile(join(ctx.run.dir, ref.path));
  let entries;
  try {
    entries = readStoreZip(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength));
  } catch (err) {
    return result({
      id: oracle.id,
      type: 'epub-entries',
      verdict: 'failed',
      message: `unreadable zip: ${err instanceof Error ? err.message : String(err)}`,
      classification: 'structural',
      proves: 'the EPUB parses as a zip',
      doesNotProve: 'entry content',
    });
  }

  const failures: string[] = [];
  const first = entries[0];
  if (!first || first.name !== 'mimetype') {
    failures.push(`first entry is "${first?.name ?? '<none>'}", expected "mimetype"`);
  } else if (first.text !== 'application/epub+zip') {
    failures.push(`mimetype content must be exactly "application/epub+zip", got "${first.text.slice(0, 40)}"`);
  }
  if (!entries.some((e) => e.name === 'META-INF/container.xml')) {
    failures.push('missing META-INF/container.xml');
  }
  const opfPath = (config.opfPath as string | undefined) ?? 'OEBPS/content.opf';
  const opf = entries.find((e) => e.name === opfPath);
  if (!opf) {
    failures.push(`missing package document "${opfPath}"`);
  } else {
    if (!opf.text.includes('unique-identifier=')) failures.push('OPF lacks unique-identifier');
    if (!opf.text.includes('<dc:title>')) failures.push('OPF lacks dc:title');
    if (config.fxl === true && !opf.text.includes('rendition:layout">pre-paginated')) {
      failures.push('FXL package lacks rendition:layout pre-paginated');
    }
    if (config.fxl === true && !opf.text.includes('properties="svg"')) {
      failures.push('FXL package lacks svg page properties');
    }
  }
  const minEntries = config.minEntries as number | undefined;
  if (minEntries !== undefined && entries.length < minEntries) {
    failures.push(`expected >= ${minEntries} entries, got ${entries.length}`);
  }
  for (const expectedName of (config.namesInclude ?? []) as string[]) {
    if (!entries.some((e) => e.name === expectedName)) failures.push(`missing entry "${expectedName}"`);
  }
  for (const rule of (config.entryContains ?? []) as Array<{ namePrefix: string; contains: string[] }>) {
    const matches = entries.filter((e) => e.name.startsWith(rule.namePrefix));
    if (matches.length === 0) {
      failures.push(`no entries matching prefix "${rule.namePrefix}"`);
      continue;
    }
    for (const needle of rule.contains) {
      if (!matches.some((e) => e.text.includes(needle))) {
        failures.push(`no entry matching "${rule.namePrefix}" contains "${needle.slice(0, 40)}…"`);
      }
    }
  }
  for (const forbiddenName of (config.forbiddenNames ?? []) as string[]) {
    if (entries.some((e) => e.name === forbiddenName)) failures.push(`forbidden entry "${forbiddenName}" present`);
  }

  const listing = await ctx.run.writeArtifact(`${oracle.id}.entries.txt`, entries.map((e) => `${e.name} (${e.size}B)`).join('\n') + '\n');
  return result({
    id: oracle.id,
    type: 'epub-entries',
    verdict: failures.length === 0 ? 'passed' : 'failed',
    message:
      failures.length === 0
        ? `epub ok: ${entries.length} entries [${entries.map((e) => e.name).join(', ').slice(0, 120)}${entries.length > 6 ? '…' : ''}]`
        : `${failures.length} epub assertion(s) failed: ${failures.slice(0, 6).join('; ')}`,
    classification: 'structural',
    proves: 'the EPUB satisfies the reader-entry contract (OCF layout, container→OPF, manifest/spine content searchable)',
    doesNotProve: 'rendering quality in third-party reader applications',
    actualRef: listing.path,
  });
};

export const ORACLES: Record<ScenarioOracle['type'], OracleImpl> = {
  schema: schemaOracle,
  'semantic-json': semanticJsonOracle,
  'filesystem-tree': filesystemTreeOracle,
  'file-content': fileContentOracle,
  golden: goldenOracle,
  browser: browserOracle,
  'browser-content': browserContentOracle,
  'browser-evaluate': browserEvaluateOracle,
  'jsonl-entry': jsonlEntryOracle,
  'zip-entries': zipEntriesOracle,
  'epub-entries': epubEntriesOracle,
  'cross-language': crossLanguageOracle,
};
