/**
 * ReaderFeedbackForm — anonymized human-reader UAT form (M11, UAT-M11-01).
 *
 * No field is required: a completely empty submission still produces a valid
 * round-report entry (no PII is collected). The report is exported locally as
 * JSONL — it is never uploaded and never written to any database.
 *
 * ADR-019: this is HUMAN reader feedback, kept rigorously separate from
 * synthetic-reader panels (see the page note and the `source` marker).
 */

import React, { useMemo, useState } from 'react';
import {
  LIKERT_DIMENSIONS,
  MAX_FREE_TEXT_HIGHLIGHTS,
  type AgeBracket,
  type Engagement,
  type LikertDimension,
  type LikertValue,
  type RevisionImpact,
} from './types';
import { buildEntry, roundReportToJsonl } from './feedbackSerializer';
import { getOrCreateReaderId, newRoundId } from './readerId';
import { triggerDownload } from '../../lib/download';

interface FormState {
  ageBracket: AgeBracket | '';
  engagement: Engagement | '';
  likert: Partial<Record<LikertDimension, LikertValue>>;
  freeText: string;
  revisionImpact: RevisionImpact | '';
  manuscriptRevision: string;
}

const EMPTY_FORM: FormState = {
  ageBracket: '',
  engagement: '',
  likert: {},
  freeText: '',
  revisionImpact: '',
  manuscriptRevision: '',
};

export function ReaderFeedbackForm(): React.ReactElement {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [lastDownload, setLastDownload] = useState<{ filename: string; jsonl: string } | null>(null);
  const readerId = useMemo(() => getOrCreateReaderId(), []);

  const submit = (event: React.FormEvent): void => {
    event.preventDefault();
    const roundId = newRoundId();
    const highlights = form.freeText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .slice(0, MAX_FREE_TEXT_HIGHLIGHTS);

    const entry = buildEntry({
      roundId,
      readerId,
      ...(form.ageBracket ? { ageBracket: form.ageBracket } : {}),
      ...(form.engagement ? { engagement: form.engagement } : {}),
      ...(Object.keys(form.likert).length > 0 ? { likert: form.likert } : {}),
      ...(highlights.length > 0 ? { freeTextHighlights: highlights } : {}),
      ...(form.revisionImpact ? { revisionImpact: form.revisionImpact } : {}),
      ...(form.manuscriptRevision.trim() ? { manuscriptRevision: form.manuscriptRevision.trim() } : {}),
    });

    const jsonl = roundReportToJsonl([entry]);
    const filename = `reader-uat-${roundId}.jsonl`;
    triggerDownload(jsonl, filename, 'application/x-ndjson');

    setLastDownload({ filename, jsonl });
  };

  const setLikert = (dimension: LikertDimension, value: number): void => {
    setForm((s) => ({ ...s, likert: { ...s.likert, [dimension]: value as LikertValue } }));
  };

  return (
    <div className="view-reader-uat">
      <h1>Human Reader UAT</h1>
      <p className="reader-uat-note">
        Anonymous reader feedback round. No personal data is collected: every field is optional and
        the round report is exported as a local file, never uploaded. Human feedback is stored
        separately from synthetic reader panels (ADR-019).
      </p>

      <form onSubmit={submit} className="reader-uat-form">
        <fieldset>
          <legend>Reader context (optional)</legend>
          <label className="reader-uat-field">
            <span>Age bracket</span>
            <select
              name="ageBracket"
              value={form.ageBracket}
              onChange={(e) => setForm((s) => ({ ...s, ageBracket: e.target.value as AgeBracket | '' }))}
            >
              <option value="">(not disclosed)</option>
              <option value="child">child</option>
              <option value="middle_grade">middle_grade</option>
              <option value="ya">ya</option>
              <option value="adult">adult</option>
              <option value="undisclosed">undisclosed</option>
            </select>
          </label>
          <label className="reader-uat-field">
            <span>Engagement</span>
            <select
              name="engagement"
              value={form.engagement}
              onChange={(e) => setForm((s) => ({ ...s, engagement: e.target.value as Engagement | '' }))}
            >
              <option value="">(not disclosed)</option>
              <option value="cover_to_cover">cover_to_cover</option>
              <option value="selected_chapters">selected_chapters</option>
              <option value="first_chapter">first_chapter</option>
            </select>
          </label>
        </fieldset>

        <fieldset>
          <legend>Reading experience (optional)</legend>
          {LIKERT_DIMENSIONS.map((dimension) => (
            <label key={dimension} className="reader-uat-likert">
              <span>{dimension}</span>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`likert-dot${form.likert[dimension] === value ? ' selected' : ''}`}
                  aria-pressed={form.likert[dimension] === value}
                  onClick={() => setLikert(dimension, value)}
                >
                  {value}
                </button>
              ))}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Editorial impact (optional)</legend>
          <label className="reader-uat-field">
            <span>Revision impact</span>
            <select
              name="revisionImpact"
              value={form.revisionImpact}
              onChange={(e) => setForm((s) => ({ ...s, revisionImpact: e.target.value as RevisionImpact | '' }))}
            >
              <option value="">(not assessed)</option>
              <option value="none">none</option>
              <option value="minor">minor</option>
              <option value="major">major</option>
              <option value="blocker">blocker</option>
            </select>
          </label>
          <label className="reader-uat-field">
            <span>Manuscript revision (links the report to a revision decision)</span>
            <input
              type="text"
              name="manuscriptRevision"
              value={form.manuscriptRevision}
              placeholder="e.g. draft-v3"
              onChange={(e) => setForm((s) => ({ ...s, manuscriptRevision: e.target.value }))}
            />
          </label>
          <label className="reader-uat-field">
            <span>Highlights (one short paraphrased note per line, up to {MAX_FREE_TEXT_HIGHLIGHTS})</span>
            <textarea
              rows={4}
              name="highlights"
              value={form.freeText}
              onChange={(e) => setForm((s) => ({ ...s, freeText: e.target.value }))}
            />
          </label>
        </fieldset>

        <button type="submit" className="reader-uat-submit">Download round report (JSONL)</button>
      </form>

      {lastDownload && (
        <p className="reader-uat-downloaded" data-round-report={lastDownload.filename}>
          Round report ready: <code>{lastDownload.filename}</code> ({lastDownload.jsonl.length} bytes)
        </p>
      )}
    </div>
  );
}
