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

export function VisualDNATab({ ctx }: { ctx: ExtensionContext }): React.ReactElement {
  const character = ctx.getProjection<CharacterProjection>('cp-characters');
  const visualDNA = character?.visualDNA;

  return (
    <div className="tab-visual-dna">
      <h3>Visual DNA Detail</h3>
      {visualDNA ? (
        <dl>
          <dt>Hue (Munsell)</dt><dd>{visualDNA.hue ?? '—'}</dd>
          <dt>Color Palette</dt>
          <dd>
            {visualDNA.palette ? (
              <ul>
                {(visualDNA.palette ?? []).map((color, i) => <li key={i}>{color}</li>)}
              </ul>
            ) : '—'}
          </dd>
          <dt>Narrative Motifs</dt>
          <dd>
            {visualDNA.motif ? (
              <ul>
                {(visualDNA.motif ?? []).map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            ) : '—'}
          </dd>
        </dl>
      ) : (
        <p>No visual DNA defined</p>
      )}
    </div>
  );
}
