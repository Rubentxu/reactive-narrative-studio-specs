import React from 'react';
import type { ExtensionContext } from '../../../extensions';

interface CharacterProjection {
  arc?: string;
}

export function ArcTab({ ctx }: { ctx: ExtensionContext }): React.ReactElement {
  const character = ctx.getProjection<CharacterProjection>('cp-characters');

  return (
    <div className="tab-arc">
      <h3>Character Arc</h3>
      <p>{character?.arc ?? 'No arc defined'}</p>
    </div>
  );
}
