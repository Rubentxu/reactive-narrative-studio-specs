import type { Verdict } from '../types.ts';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** JUnit XML for one scenario run (VAH-024: JUnit optional — emitted per run). */
export function renderJUnit(verdict: Verdict): string {
  const failures = verdict.oracles.filter((o) => o.verdict === 'failed' && !o.waived).length
    + verdict.steps.filter((s) => s.status === 'failed').length;
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    `<testsuite name="${escapeXml(verdict.scenarioId)}" tests="${verdict.steps.length + verdict.oracles.length}" failures="${failures}" skipped="0" time="0">`,
  );
  for (const step of verdict.steps) {
    const time = (step.durationMs / 1000).toFixed(3);
    if (step.status === 'passed') {
      lines.push(`  <testcase classname="${escapeXml(`${verdict.scenarioId}.steps`)}" name="${escapeXml(step.id)}" time="${time}"/>`);
    } else {
      lines.push(`  <testcase classname="${escapeXml(`${verdict.scenarioId}.steps`)}" name="${escapeXml(step.id)}" time="${time}">`);
      lines.push(`    <failure message="${escapeXml(step.error ?? 'step failed')}"/>`);
      lines.push('  </testcase>');
    }
  }
  for (const oracle of verdict.oracles) {
    const name = `${oracle.id} [${oracle.type}]`;
    if (oracle.verdict === 'passed') {
      lines.push(`  <testcase classname="${escapeXml(`${verdict.scenarioId}.oracles`)}" name="${escapeXml(name)}" time="0"/>`);
    } else if (oracle.waived) {
      lines.push(`  <testcase classname="${escapeXml(`${verdict.scenarioId}.oracles`)}" name="${escapeXml(name)}" time="0">`);
      lines.push(`    <skipped message="${escapeXml(`waived by ${oracle.waiverId ?? 'unknown'}`)}"/>`);
      lines.push('  </testcase>');
    } else {
      lines.push(`  <testcase classname="${escapeXml(`${verdict.scenarioId}.oracles`)}" name="${escapeXml(name)}" time="0">`);
      lines.push(`    <failure message="${escapeXml(oracle.message)}"/>`);
      lines.push('  </testcase>');
    }
  }
  lines.push('</testsuite>');
  return `${lines.join('\n')}\n`;
}

export interface JUnitRunSummary {
  scenarioId: string;
  runId: string;
  overall: string;
}

/** Aggregate testsuites document for a `verify` (uat all) invocation. */
export function renderJUnitAggregate(summaries: JUnitRunSummary[], testsuites: string[]): string {
  const failures = summaries.filter((s) => s.overall === 'FAIL').length;
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(`<testsuites name="verification" tests="${summaries.length}" failures="${failures}">`);
  for (const suite of testsuites) lines.push(suite.trim());
  lines.push('</testsuites>');
  return `${lines.join('\n')}\n`;
}
