import React from 'react';
import { useProjectionStore } from '../store/projectionStore';

interface Chapter {
  id?: string;
  title?: string;
  synopsis?: string;
  order?: number;
}

interface ChaptersData {
  chapters?: Chapter[];
}

export function Story(): React.ReactElement {
  const bundle = useProjectionStore((s) => s.bundle);
  const status = useProjectionStore((s) => s.status);

  if (status === 'empty') {
    return <div className="view-story"><h1>Story</h1><p>No project loaded</p></div>;
  }

  const chapters = (bundle?.chapters as ChaptersData | null)?.chapters ?? [];

  return (
    <div className="view-story">
      <h1>Story — Chapters</h1>
      {chapters.length === 0 && <p>No chapters found</p>}
      <ol>
        {chapters.map((ch, i) => (
          <li key={ch.id ?? i}>
            <strong>{ch.title ?? `Chapter ${(ch.order ?? i + 1)}`}</strong>
            {ch.synopsis && <p>{ch.synopsis}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}
