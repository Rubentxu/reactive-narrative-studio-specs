import React from 'react';
import type { ExtensionContext } from '../../../extensions';

interface ChaptersProjection {
  chapters?: Array<{
    id?: string;
    title?: string;
    relations?: Array<{ target?: string }>;
  }>;
}

export function ScenesTab({ ctx }: { ctx: ExtensionContext }): React.ReactElement {
  const chapters = ctx.getProjection<ChaptersProjection>('cp-chapters');
  const entityName = String(ctx.entity.metadata?.name ?? '');

  const relevantChapters = chapters?.chapters?.filter(
    (ch) => ch.relations?.some((rel) => rel.target === entityName)
  ) ?? [];

  return (
    <div className="tab-scenes">
      <h3>Scenes</h3>
      {relevantChapters.length === 0 && <p>No scenes found</p>}
      <ol>
        {relevantChapters.map((ch, i) => (
          <li key={ch.id ?? i}>{ch.title ?? `Chapter ${i + 1}`}</li>
        ))}
      </ol>
    </div>
  );
}
