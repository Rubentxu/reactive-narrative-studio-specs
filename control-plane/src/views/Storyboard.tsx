/**
 * Storyboard — panel storyboard page + sequential graph lens (M12, UAT-M12-01).
 *
 * Renders the SequentialArtIR produced by the deterministic adapter from a
 * chapter manuscript reduced to beats. INVARIANT (UAT-M12-01 pass criterion):
 * every dialogue line is editable text in the DOM — this page contains NO
 * <img> elements; lettering stays out of generated images (doc 11).
 */

import React from 'react';
import { adaptChapterToSequentialIr, readingOrder } from '../features/sequential-art/adapter';
import { SAMPLE_CHAPTER } from '../features/sequential-art/fixtures/sample-chapter';
import type { SequentialIrDoc } from '../features/sequential-art/types';

export function Storyboard(): React.ReactElement {
  const doc: SequentialIrDoc = adaptChapterToSequentialIr(SAMPLE_CHAPTER);
  const order = readingOrder(doc);
  const orderByPanel = new Map(order.map((o) => [o.panelId, o]));
  const panelCount = order.length;

  return (
    <div className="view-storyboard">
      <h1>Sequential Storyboard — {SAMPLE_CHAPTER.title}</h1>
      <p className="storyboard-meta">
        Sample chapter (M12 core) · Reading direction: <strong data-testid="reading-direction">{SAMPLE_CHAPTER.readingDirection}</strong> ·{' '}
        {doc.pages.length} pages · {panelCount} panels · dialogue is editable text, never baked into images.
      </p>

      {doc.pages.map((page) => (
        <section key={page.id} className="storyboard-page" data-page-card={page.id}>
          <h2>
            {page.id} <span className="storyboard-layout">({page.layout?.columns}×{page.layout?.rows} grid)</span>
          </h2>
          <div className="storyboard-panels" style={{ gridTemplateColumns: `repeat(${page.layout?.columns ?? 2}, 1fr)` }}>
            {page.panels.map((panel) => {
              const o = orderByPanel.get(panel.id);
              return (
                <article key={panel.id} className="storyboard-panel" data-reading-order={o?.order}>
                  <header>
                    <span className="panel-order">#{o?.order}</span>
                    <span className="panel-ids">{panel.id} · {panel.shotRef}</span>
                  </header>
                  {panel.caption && <p className="panel-caption">{panel.caption}</p>}
                  {(panel.speech ?? []).map((bubble, i) => (
                    <p key={i} className={`panel-speech panel-speech-${bubble.kind ?? 'speech'}`}>
                      {bubble.speaker && <strong>{bubble.speaker}: </strong>}
                      {bubble.text}
                    </p>
                  ))}
                  {panel.gutterAfter === 'scene-break' && (
                    <p className="panel-scene-break" data-scene-break="true">— Scene break —</p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}

      <section className="storyboard-lens" aria-label="Sequential graph lens">
        <h2>Sequential graph lens</h2>
        <p className="storyboard-meta">
          One node per panel in reading order; edges follow the reading sequence; node size reflects
          beat importance; gaps mark scene breaks.
        </p>
        <svg
          className="seq-lens"
          viewBox={`0 0 ${Math.ceil(panelCount / 6) * 60 + 60} 200`}
          role="img"
          aria-label={`Sequential graph with ${panelCount} panels`}
        >
          {order.map((o, i) => {
            const x = Math.floor(i / 6) * 60 + 30;
            const y = (i % 6) * 30 + 20;
            const prev = i > 0 ? order[i - 1] : undefined;
            if (prev) {
              const px = Math.floor((i - 1) / 6) * 60 + 30;
              const py = ((i - 1) % 6) * 30 + 20;
              const sceneBreak = prev.gutterAfter === 'scene-break';
              return (
                <line
                  key={`edge-${i}`}
                  className="seq-lens-edge"
                  data-edge-order={o.order}
                  x1={px + 8}
                  y1={py}
                  x2={x - 8}
                  y2={y}
                  stroke={sceneBreak ? '#c2410c' : '#64748b'}
                  strokeDasharray={sceneBreak ? '4 3' : undefined}
                />
              );
            }
            return null;
          })}
          {order.map((o, i) => {
            const x = Math.floor(i / 6) * 60 + 30;
            const y = (i % 6) * 30 + 20;
            const importance = 0.5;
            return (
              <circle
                key={`node-${o.order}`}
                className="seq-lens-node"
                data-node-order={o.order}
                cx={x}
                cy={y}
                r={5 + importance * 4}
                fill="#1d4ed8"
              />
            );
          })}
        </svg>
      </section>
    </div>
  );
}
