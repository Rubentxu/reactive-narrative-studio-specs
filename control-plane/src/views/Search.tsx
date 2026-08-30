import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useSearchIndex } from '../store/useSearchIndex';

/**
 * Search view — lists results and links to entity pages.
 * Renders empty-state when useSearchIndex returns [] (no bundle loaded).
 * No telemetry (AC-INV-serverless).
 */
export function Search(): React.ReactElement {
  const searchFn = useSearchIndex();
  const [query, setQuery] = useState('');

  const results = query.trim().length > 0 ? searchFn(query) : [];

  return (
    <div className="view-search">
      <h1>Search</h1>
      <div className="search-input-wrapper">
        <input
          type="search"
          className="search-input"
          placeholder="Search entities..."
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
            const { entity } = result;
            const kind = entity.kind;
            const namespace = String(entity.metadata?.namespace ?? '');
            const name = String(entity.metadata?.name ?? '');
            const description = String(entity.metadata?.description ?? '');
            const href = `/entity/${encodeURIComponent(kind)}/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`;
            return (
              <li key={`${kind}:${namespace}/${name}`} className="search-result">
                <span className="search-result-kind">{kind}</span>
                <Link to={href} className="search-result-link">
                  {namespace}/{name}
                </Link>
                {description && (
                  <p className="search-result-desc">{description}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
