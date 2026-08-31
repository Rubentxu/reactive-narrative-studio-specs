/**
 * Search view — renders search results grouped by type (REQ-ROU-1).
 *
 * Calls useSearchIndex(query) directly (hook returns SearchResult[]).
 * Result shape per REQ-SID-1: { id, type, title, snippet, score }.
 *
 * - character / asset / decision → /entity/{kind}/{namespace}/{name}
 * - scene-chapter → /entity/{kind}/{namespace}/{name} (same entity route)
 * - docs → /docs/{basename} (anchor navigation)
 *
 * AC-INV-serverless: zero fetch(, telemetry, or remote code.
 * AC-INV-no-Dexie: pure in-memory index.
 */

import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useSearchIndex } from '../store/useSearchIndex';

/** Derive href for a SearchResult based on its type and id. */
function resultHref(result: { id: string; type: string }): string {
  const parts = result.id.split(':');
  if (parts.length < 2) return '/search';

  if (result.type === 'docs') {
    // id = 'docs:narrative' → /docs/narrative
    const basename = parts[1] ?? '';
    return `/docs/${basename}`;
  }

  // character:demo/nora → /entity/Character/demo/nora
  const kind = parts[0] ?? '';
  const nsName = parts.slice(1).join(':'); // handles cases like asset:ns:name
  if (!kind || !nsName) return '/search';
  const capitalizedKind = kind.charAt(0).toUpperCase() + kind.slice(1);
  return `/entity/${encodeURIComponent(capitalizedKind)}/${nsName}`;
}

export function Search(): React.ReactElement {
  const [query, setQuery] = useState('');
  const results = useSearchIndex(query);

  return (
    <div className="view-search">
      <h1>Search</h1>
      <div className="search-input-wrapper">
        <input
          type="search"
          className="search-input"
          placeholder="Search entities…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search entities"
        />
      </div>

      {results.length === 0 && query.trim().length > 0 && (
        <p className="search-empty">No entities match &ldquo;{query}&rdquo;</p>
      )}

      {results.length === 0 && query.trim().length === 0 && (
        <p className="search-hint">Type a query to search across all entities.</p>
      )}

      {results.length > 0 && (
        <ul className="search-results">
          {results.map((result) => {
            const href = resultHref(result);
            return (
              <li
                key={result.id}
                className={`search-result result-type-${result.type}`}
              >
                <span className="search-result-kind">{result.type}</span>
                <Link to={href} className="search-result-link">
                  {result.title}
                </Link>
                {result.snippet && (
                  <p className="search-result-desc">{result.snippet}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
