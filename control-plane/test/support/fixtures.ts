import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

// Fixtures are at ../golden/control-plane/ from the control-plane directory
// Use process.cwd() since vitest runs from control-plane/
const GOLDEN_ROOT = resolve(process.cwd(), '../golden/control-plane');

export function loadFixtureBytes(relativePath: string): Uint8Array {
  const fullPath = join(GOLDEN_ROOT, relativePath);
  return new Uint8Array(readFileSync(fullPath));
}

export function loadFixtureText(relativePath: string): string {
  return readFileSync(join(GOLDEN_ROOT, relativePath), 'utf-8');
}

export function parseYaml<T>(text: string): T {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const YAML = require('yaml');
  return YAML.parse(text) as T;
}

export function newFileFromFixture(relativePath: string, fileName?: string): File {
  const bytes = loadFixtureBytes(relativePath);
  const name = fileName ?? relativePath;
  return new File([bytes], name);
}

export function newFileListFromDir(relativeDir: string, ext = '.json'): File[] {
  const fullDir = join(GOLDEN_ROOT, relativeDir);
  const files = readdirSync(fullDir, { recursive: true }).filter((f) => typeof f === 'string' && f.endsWith(ext));
  return (files as string[]).map((f) => {
    const fullPath = join(fullDir, f);
    const bytes = readFileSync(fullPath);
    return new File([bytes], f);
  });
}
