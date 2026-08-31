/**
 * KindList — per-kind listing page for capability catalog.
 *
 * Generic component that lists all capabilities of a given kind.
 * Used for /capabilities/skills, /capabilities/packs, etc.
 */

import React from 'react';
import { Link } from '@tanstack/react-router';
import { useCapabilityManifest } from '../useCapabilityManifest';
import type { CapabilityEntry, ParsedSkill, ParsedPack, ParsedProfile, ParsedWorkflow, ParsedRecipe } from '../parser';

interface KindListProps {
  kind: CapabilityEntry['kind'];
}

const KIND_LABELS: Record<string, string> = {
  skill: 'Skills',
  pack: 'Packs',
  profile: 'Profiles',
  workflow: 'Comfy Workflows',
  provider: 'Image Providers',
  recipe: 'Recipes',
};

export function KindList({ kind }: KindListProps): React.ReactElement {
  const manifest = useCapabilityManifest();
  const entries = getEntries(manifest, kind);
  const label = KIND_LABELS[kind] || kind;

  if (kind === 'provider' && entries.length === 0) {
    return (
      <div className="view-kind-list">
        <h1>Image Providers</h1>
        <div className="empty-state">
          <h2>No image providers configured</h2>
          <p>
            Image provider capabilities are declared against{' '}
            <code>specs/provider-capability.schema.json</code> (provider-neutral descriptor,
            RE-IMG-7, ADR-011). Future authoring lands with the image-provider configuration cycle.
          </p>
          <p>
            <a href="/docs/12-IMAGE-PIPELINE.md" target="_blank" rel="noopener">
              View Image Pipeline Documentation
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="view-kind-list">
      <h1>{label}</h1>
      <p className="count">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</p>

      {entries.length === 0 ? (
        <p className="no-entries">No entries</p>
      ) : (
        <ul className="capability-list">
          {entries.map((entry) => (
            <li key={`${entry.namespace}/${entry.name}`} className="capability-list-item">
              <CapabilityEntry entry={entry} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CapabilityEntry({ entry }: { entry: CapabilityEntry }): React.ReactElement {
  const kind = entry.kind;
  const href = `/capabilities/${kind}s/${encodeURIComponent(entry.namespace)}/${encodeURIComponent(entry.name)}`;

  return (
    <div className="capability-entry">
      <div className="capability-header">
        {entry.namespace !== 'default' && (
          <span className="namespace-badge">{entry.namespace}</span>
        )}
        <Link to={href} className="capability-name">{entry.name}</Link>
      </div>

      <div className="capability-metadata">
        {renderMetadata(entry)}
      </div>

      <div className="capability-description">
        {renderDescription(entry)}
      </div>
    </div>
  );
}

function renderMetadata(entry: CapabilityEntry): React.ReactElement {
  switch (entry.kind) {
    case 'skill':
      return <span className="meta-badge">skill</span>;
    case 'pack':
      return <span className="meta-badge">pack</span>;
    case 'profile': {
      const profile = entry as ParsedProfile;
      return (
        <>
          <span className="meta-badge">profile</span>
          <span className="meta-item">audience: {profile.audience}</span>
          <span className="meta-item">format: {profile.format}</span>
        </>
      );
    }
    case 'workflow': {
      const workflow = entry as ParsedWorkflow;
      return (
        <>
          <span className="meta-badge">workflow</span>
          <span className="meta-item">provider: {workflow.provider}</span>
          <span className="meta-item">model: {workflow.model}</span>
        </>
      );
    }
    case 'recipe': {
      const recipe = entry as ParsedRecipe;
      return (
        <>
          <span className="meta-badge">recipe</span>
          {recipe.title && <span className="meta-item">title: {recipe.title}</span>}
        </>
      );
    }
    case 'provider':
      return <span className="meta-badge">provider</span>;
    default:
      return <></>;
  }
}

function renderDescription(entry: CapabilityEntry): React.ReactElement {
  switch (entry.kind) {
    case 'skill': {
      const skill = entry as ParsedSkill;
      return <p>{skill.purpose}</p>;
    }
    case 'pack': {
      const pack = entry as ParsedPack;
      return <p>{pack.description}</p>;
    }
    case 'profile': {
      const profile = entry as ParsedProfile;
      return (
        <p>
          Voice: {profile.voice}
          {profile.guardrails.length > 0 && (
            <> | Guardrails: {profile.guardrails.join(', ')}</>
          )}
        </p>
      );
    }
    case 'workflow': {
      const workflow = entry as ParsedWorkflow;
      return <p>{workflow.description}</p>;
    }
    case 'recipe': {
      const recipe = entry as ParsedRecipe;
      return <p>{recipe.description}</p>;
    }
    case 'provider':
      return <p>No provider instances configured.</p>;
    default:
      return <></>;
  }
}

function getEntries(manifest: ReturnType<typeof useCapabilityManifest>, kind: CapabilityEntry['kind']): CapabilityEntry[] {
  switch (kind) {
    case 'skill':
      return manifest.skills;
    case 'pack':
      return manifest.packs;
    case 'profile':
      return manifest.profiles;
    case 'workflow':
      return manifest.workflows;
    case 'provider':
      return manifest.providers;
    case 'recipe':
      return manifest.recipes;
    default:
      return [];
  }
}
