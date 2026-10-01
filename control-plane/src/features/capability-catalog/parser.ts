/**
 * capability-catalog parser functions
 *
 * All parsers are synchronous pure functions. No fetch, no async, no globals.
 * Each parser takes raw content, source path and the item's build-time sha256
 * (computed by scripts/generate-capability-manifest.mjs, REQ-DEI-2) and returns
 * a typed CapabilityEntry. Parsers carry the hash; they never compute it.
 */

import { parse as parseYaml } from 'yaml';

// ============================================================================
// Types
// ============================================================================

export interface ParsedSkill {
  kind: 'skill';
  id: string;
  namespace: string;
  name: string;
  purpose: string;
  /** Full raw markdown of the SKILL.md — rendered by the docs feature via docsSafeMarkdown (REQ-CR-CAP-13). */
  content: string;
  path: string;
  sha256: string;
  origin: 'global';
}

export interface ParsedPack {
  kind: 'pack';
  id: string;
  namespace: string;
  name: string;
  description: string;
  path: string;
  sha256: string;
  origin: 'global' | `recipe:${string}`;
}

export interface ParsedProfile {
  kind: 'profile';
  id: string;
  namespace: string;
  name: string;
  audience: string;
  format: string;
  voice: string;
  guardrails: string[];
  path: string;
  sha256: string;
}

export interface ParsedWorkflow {
  kind: 'workflow';
  id: string;
  namespace: string;
  name: string;
  provider: string;
  model: string;
  description: string;
  path: string;
  sha256: string;
}

export interface ParsedProvider {
  kind: 'provider';
  id: string;
  namespace: string;
  name: string;
  path: string;
  sha256: string;
}

export interface ParsedRecipe {
  kind: 'recipe';
  id: string;
  namespace: string;
  name: string;
  title: string;
  description: string;
  path: string;
  sha256: string;
}

export type CapabilityEntry =
  | ParsedSkill
  | ParsedPack
  | ParsedProfile
  | ParsedWorkflow
  | ParsedProvider
  | ParsedRecipe;

// ============================================================================
// Skill parser
// ============================================================================

/**
 * Parse a SKILL.md markdown file.
 * Extracts H1 title and first ## Purpose section paragraph.
 */
export function parseSkill(content: string, path: string, sha256: string): ParsedSkill {
  const lines = content.split('\n');

  // Extract H1 title
  let name = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      name = trimmed.slice(2).trim();
      break;
    }
  }

  // Extract first ## Purpose section paragraph
  let purpose = '';
  let inPurposeSection = false;
  let paragraphLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === '## Purpose') {
      inPurposeSection = true;
      continue;
    }

    if (inPurposeSection) {
      // Stop at next ## heading or empty line after content
      if (trimmed.startsWith('## ') || trimmed === '') {
        if (paragraphLines.length > 0) {
          break;
        }
        continue;
      }

      if (trimmed) {
        paragraphLines.push(trimmed);
      }
    }
  }

  purpose = paragraphLines.join(' ').replace(/\s+/g, ' ').trim();

  const id = `skill-${name.replace(/\s+/g, '-').toLowerCase()}`;

  return {
    kind: 'skill',
    id,
    namespace: 'default',
    name,
    purpose,
    content,
    path,
    sha256,
    origin: 'global',
  };
}

// ============================================================================
// Pack parser
// ============================================================================

/**
 * Parse a pack markdown file.
 * Extracts H1 title and first paragraph.
 *
 * @param content - Raw markdown content
 * @param path - Source file path (used to derive namespace for recipe-scoped packs)
 * @param origin - 'global' or 'recipe:<recipe-id>'
 * @param sha256 - Build-time hash carried from the manifest bundle
 */
export function parsePack(
  content: string,
  path: string,
  origin: 'global' | `recipe:${string}` = 'global',
  sha256: string,
): ParsedPack {
  const lines = content.split('\n');

  // Extract H1 title (may have multiple # for headings)
  let name = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      name = trimmed.slice(2).trim();
      break;
    }
  }

  // Extract first paragraph after H1 (skip the H1 line itself and any blank lines)
  let description = '';
  let foundH1 = false;
  let paragraphLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!foundH1) {
      if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
        foundH1 = true;
      }
      continue;
    }

    // Stop at next ## heading
    if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      break;
    }

    if (trimmed) {
      paragraphLines.push(trimmed);
    }
  }

  description = paragraphLines.join(' ').replace(/\s+/g, ' ').trim();

  // Derive namespace from origin
  let namespace = 'default';
  if (origin.startsWith('recipe:')) {
    namespace = origin;
  }

  // Generate id from path
  const pathParts = path.split('/');
  const lastPart = pathParts[pathParts.length - 1] ?? 'unknown';
  const fileName = lastPart.replace('.md', '');
  const id = `pack-${fileName.replace(/\s+/g, '-').toLowerCase()}`;

  return {
    kind: 'pack',
    id,
    namespace,
    name,
    description,
    path,
    sha256,
    origin,
  };
}

// ============================================================================
// Profile parser
// ============================================================================

/**
 * Parse a profile YAML file.
 * Uses js-yaml for safe parsing.
 *
 * @param yamlContent - Raw YAML content
 * @param path - Source file path
 * @param sha256 - Build-time hash carried from the manifest bundle
 */
export function parseProfile(yamlContent: string, path: string, sha256: string): ParsedProfile {
  const data = parseYaml(yamlContent) as Record<string, unknown>;

  // Extract fields
  const profileId = (data['profileId'] as string) || '';
  const audienceData = data['audience'] as Record<string, unknown> || {};
  const formatData = data['format'] as Record<string, unknown> || {};
  const voiceData = data['voice'] as Record<string, unknown> || {};
  const guardrails = (data['guardrails'] as string[]) || [];

  // Format audience for display
  const ageBand = (audienceData['ageBand'] as string) || '';
  const audience = ageBand || 'unknown';

  // Format format for display
  const medium = (formatData['medium'] as string) || '';
  const format = medium || 'unknown';

  // Format voice for display
  const register = (voiceData['register'] as string) || '';
  const voice = register || 'unknown';

  // Derive namespace from path
  let namespace = 'default';
  if (path.includes('/recipes/')) {
    // Extract recipe id from path like /recipes/middle-grade-illustrated/skeleton/profiles/profile-xxx.yaml
    const match = path.match(/\/recipes\/([^/]+)\//);
    if (match) {
      namespace = `recipe:${match[1]}`;
    }
  }

  const id = profileId || `profile-${namespace.replace(/[^a-z0-9]/gi, '-')}`;

  return {
    kind: 'profile',
    id,
    namespace,
    name: profileId,
    audience,
    format,
    voice,
    guardrails,
    path,
    sha256,
  };
}

// ============================================================================
// Workflow parser
// ============================================================================

/**
 * Parse a workflow JSON file.
 *
 * @param jsonContent - Raw JSON content
 * @param path - Source file path
 * @param sha256 - Build-time hash carried from the manifest bundle
 */
export function parseWorkflow(jsonContent: string, path: string, sha256: string): ParsedWorkflow {
  const data = JSON.parse(jsonContent) as Record<string, unknown>;

  const workflowId = (data['workflowId'] as string) || '';
  const provider = (data['provider'] as string) || '';
  const model = (data['model'] as string) || '';
  const description = (data['description'] as string) || '';

  // Generate name from workflowId
  const name = workflowId.split('.').pop() || workflowId;

  return {
    kind: 'workflow',
    id: `workflow-${name.replace(/\s+/g, '-').toLowerCase()}`,
    namespace: 'default',
    name,
    provider,
    model,
    description,
    path,
    sha256,
  };
}

// ============================================================================
// Provider parser (empty-state stub)
// ============================================================================

/**
 * Provider parser - returns empty array always.
 * No provider yaml files exist yet; this is a stub for the explicit empty-state.
 */
export function parseProvider(): ParsedProvider[] {
  // DD-4: Empty-state decision - no provider instances exist
  return [];
}

// ============================================================================
// Recipe parser
// ============================================================================

/**
 * Parse a recipe.yaml file.
 * Wraps the loaded recipe in manifest entry shape.
 *
 * @param yamlContent - Raw YAML content
 * @param path - Source file path
 * @param sha256 - Build-time hash carried from the manifest bundle
 */
export function parseRecipe(yamlContent: string, path: string, sha256: string): ParsedRecipe {
  const data = parseYaml(yamlContent) as Record<string, unknown>;

  const metadata = (data['metadata'] as Record<string, unknown>) || {};
  const recipeId = (metadata['id'] as string) || '';
  const title = (metadata['title'] as string) || '';
  const description = (metadata['description'] as string) || '';

  // Generate name from id
  const name = recipeId;

  return {
    kind: 'recipe',
    id: `recipe-${name.replace(/\s+/g, '-').toLowerCase()}`,
    namespace: 'default',
    name,
    title,
    description,
    path,
    sha256,
  };
}
