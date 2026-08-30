import React from 'react';
import type { ExtensionContext } from '../../../extensions';

interface VisualDNA {
  hue?: string;
  palette?: string[];
  motif?: string[];
}

interface CharacterProjection {
  visualDNA?: VisualDNA;
}

export function VisualCard({ ctx }: { ctx: ExtensionContext }): React.ReactElement {
  const character = ctx.getProjection<CharacterProjection>('cp-characters');
  const visualDNA = character?.visualDNA;

  return (
    <div className="visual-card">
      <h3>Visual DNA</h3>
      {visualDNA ? (
        <dl>
          <dt>Hue</dt><dd>{visualDNA.hue ?? '—'}</dd>
          <dt>Palette</dt><dd>{(visualDNA.palette ?? []).join(', ') || '—'}</dd>
          <dt>Motif</dt><dd>{(visualDNA.motif ?? []).join(', ') || '—'}</dd>
        </dl>
      ) : (
        <p>No visual DNA defined</p>
      )}
    </div>
  );
}
