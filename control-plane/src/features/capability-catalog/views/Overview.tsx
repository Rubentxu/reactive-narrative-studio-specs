/**
 * CapabilitiesOverview — main capability catalog overview page.
 *
 * Renders 6 kind sections with counts and links to per-kind pages.
 * Uses useCapabilityManifest() which is synchronous and memoized.
 * Does NOT use useProjectionStore (m10 no-write invariant).
 */

import React from 'react';
import { Link } from '@tanstack/react-router';
import { useCapabilityManifest } from '../useCapabilityManifest';
import { selectCounts } from '../capabilitySelectors';

const KIND_LABELS: Record<string, string> = {
  skill: 'Skills',
  pack: 'Packs',
  profile: 'Profiles',
  workflow: 'Comfy Workflows',
  provider: 'Image Providers',
  recipe: 'Recipes',
};

const KIND_ROUTES: Record<string, string> = {
  skill: '/capabilities/skills',
  pack: '/capabilities/packs',
  profile: '/capabilities/profiles',
  workflow: '/capabilities/workflows',
  provider: '/capabilities/providers',
  recipe: '/capabilities/recipes',
};

export function CapabilitiesOverview(): React.ReactElement {
  const manifest = useCapabilityManifest();
  const counts = selectCounts(manifest);

  const kinds = [
    { key: 'skill', label: KIND_LABELS.skill, count: counts.skills },
    { key: 'pack', label: KIND_LABELS.pack, count: counts.packs },
    { key: 'profile', label: KIND_LABELS.profile, count: counts.profiles },
    { key: 'workflow', label: KIND_LABELS.workflow, count: counts.workflows },
    { key: 'provider', label: KIND_LABELS.provider, count: counts.providers },
    { key: 'recipe', label: KIND_LABELS.recipe, count: counts.recipes },
  ];

  return (
    <div className="view-capabilities-overview">
      <h1>Capability Catalog</h1>
      <p className="subtitle">Creative toolchain capabilities — skills, packs, profiles, workflows, providers, and recipes</p>

      <div className="capability-sections">
        {kinds.map(({ key, label, count }) => (
          <section key={key} className={`kind-section kind-section-${key}`}>
            <h2>
              {label} ({count})
            </h2>

            {count === 0 && key === 'provider' ? (
              <div className="empty-state">
                <p className="empty-state-body">
                  No image providers configured. See{' '}
                  <a href="/docs/specs/provider-capability.schema.json" target="_blank" rel="noopener">
                    provider-capability.schema.json
                  </a>{' '}
                  for configuration.
                </p>
              </div>
            ) : (
              <>
                <p>
                  <Link to={KIND_ROUTES[key] || '#'}>View all {label?.toLowerCase()}</Link>
                </p>
                {renderPreview(manifest, key)}
              </>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function renderPreview(manifest: ReturnType<typeof useCapabilityManifest>, kind: string): React.ReactElement {
  const entries = getEntries(manifest, kind);
  const preview = entries.slice(0, 5);

  if (preview.length === 0) {
    return <p className="no-entries">No entries</p>;
  }

  return (
    <ul className="capability-preview-list">
      {preview.map((entry) => {
        const href = `/capabilities/${kind}s/${encodeURIComponent(entry.namespace)}/${encodeURIComponent(entry.name)}`;
        return (
          <li key={`${entry.namespace}/${entry.name}`}>
            <Link to={href}>
              {entry.namespace !== 'default' && <span className="namespace-badge">{entry.namespace}</span>}
              {entry.name}
            </Link>
          </li>
        );
      })}
      {entries.length > 5 && (
        <li className="see-all">
          <Link to={KIND_ROUTES[kind] || '#'}>+{entries.length - 5} more</Link>
        </li>
      )}
    </ul>
  );
}

function getEntries(manifest: ReturnType<typeof useCapabilityManifest>, kind: string) {
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
