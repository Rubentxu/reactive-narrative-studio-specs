import React from 'react';
import type { ExtensionContext } from '../../../extensions';

interface CharacterProjection {
  name?: string;
  arc?: string;
  role?: string;
  notes?: string;
}

interface ChaptersProjection {
  chapters?: Array<{ id?: string; title?: string; relations?: Array<{ target?: string }> }>;
}

export function OverviewTab({ ctx }: { ctx: ExtensionContext }): React.ReactElement {
  const character = ctx.getProjection<CharacterProjection>('cp-characters');
  const chapters = ctx.getProjection<ChaptersProjection>('cp-chapters');

  return (
    <div className="tab-overview">
      <h3>Character Overview</h3>
      <dl>
        <dt>Name</dt><dd>{character?.name ?? '—'}</dd>
        <dt>Arc</dt><dd>{character?.arc ?? '—'}</dd>
        <dt>Role</dt><dd>{character?.role ?? '—'}</dd>
        <dt>Notes</dt><dd>{character?.notes ?? '—'}</dd>
      </dl>
      <p>Appears in {chapters?.chapters?.length ?? 0} chapters</p>
    </div>
  );
}
