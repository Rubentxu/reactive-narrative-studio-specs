/** Secret redaction for process evidence (VAH-009). */

const DEFAULT_SECRET_PATTERNS: RegExp[] = [
  /[A-Za-z0-9_-]*(?:TOKEN|SECRET|PASSWORD|PASSWD|API_?KEY|KEY)[A-Za-z0-9_-]*=(?:[^\s]*)/gi,
  /(?:ghp|gho|github_pat)_[A-Za-z0-9_]+/g,
  /(?:Bearer\s+)[A-Za-z0-9._-]+/g,
];

export function redactSecrets(text: string, extraLiterals: string[] = []): string {
  let out = text;
  for (const literal of extraLiterals) {
    if (literal.length > 0) out = out.split(literal).join('***REDACTED***');
  }
  for (const pattern of DEFAULT_SECRET_PATTERNS) {
    out = out.replace(pattern, (match) => {
      const eq = match.indexOf('=');
      return eq === -1 ? '***REDACTED***' : `${match.slice(0, eq + 1)}***REDACTED***`;
    });
  }
  return out;
}
