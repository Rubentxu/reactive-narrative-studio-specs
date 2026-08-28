# narrative-arc

## Purpose

The `narrative-arc` skill provides a structured decision framework for selecting and applying canonical story structure models. It helps authors and content systems choose the right narrative architecture for a given genre, target audience, and intended length — then execute that structure consistently from outline through final draft.

## When to invoke

Invoke `narrative-arc` when any of the following is true:

- A new project is being bootstrapped and no explicit structure has been chosen.
- A work-in-progress shows signs of structural drift (act boundaries bleeding, subplot crowding, pacing collapse).
- A creative brief specifies genre and length but leaves structure implicit.
- A story has been outlined but the author reports "it feels flat" or "the ending doesn't land."
- Choosing between competing structural models (e.g., 3-act vs. hero's journey) for a given submission.

Do not invoke `narrative-arc` as a substitute for character development, scene-level plotting, or dialogue polish. It governs the macro-level shape of the narrative, not the micro-level execution.

## Inputs

- **Genre**: One or more genre tags (e.g., `fantasy`, `mystery`, `romance`, `literary-fiction`). Genre influences which arcs are most legible to readers and which act-balance is expected.
- **Target length**: Word count or estimated runtime (short-story: <7,500 words; novella: 7,500–40,000; novel: 40,000–120,000; epic: >120,000). Length constrains how many beats each arc model can support without padding.
- **Audience band**: Target reader age and sophistication (e.g., `middle-grade-10-11`, `YA-14-17`, `adult-general`). Audience expectations for pacing, resolution completeness, and tonal range vary significantly.
- **Thematic intent**: One-sentence statement of the central question or change the story explores. A strong thematic intent anchors structural choices and prevents the arc from becoming a mechanical exercise.
- **Point-of-view constraint** (optional): Single-POV, tight-third limited, omniscient, or multi-POV. POV choice affects how much backstory can be surfaced during key structural beats.
- **Existing outline** (optional): A scene list or beat sheet if one has been started. The skill can audit an existing outline for structural gaps rather than scaffolding from zero.

## Outputs

- **Structural recommendation**: A specific named arc (3-act, hero's journey, kishōtenketsu, or a justified hybrid) with a written rationale explaining why that model fits the inputs.
- **Act breakdown**: For the chosen model, a beat sheet listing the canonical beats, their approximate positional weight (as a percentage of total length), and the narrative function of each beat.
- **Subplot mapping** (optional): If the story requires subplots, a note on how many subplots the target length can support and at which act positions they should be introduced/resolved.
- **Red-flag audit**: A short list of structural risks specific to the chosen model and the given genre/length combination (e.g., "3-act mystery at novel length risks telegraphing the reveal if Act 2 padding is needed").
- **Tonal guardrails**: Explicit notes on where the chosen arc model is most vulnerable to tonal shifts (e.g., "kishōtenketsu Act 3 pivot requires strong setup in Act 2 or readers experience the resolution as unearned").

## Workflow

### Step 1 — Genre and length triage

Map the input genre and target length to the structural models that have proven track records in that space:

| Genre cluster | Default model | Length caveats |
|---|---|---|
| Fantasy, science-fiction, adventure | Hero's journey or 3-act | Long epic (>120k) may need nested arcs |
| Mystery, thriller, crime | 3-act (tight) | Padding in Act 2 is the primary failure mode |
| Romance | 3-act with paired POV | HEA/HFN requirement constrains Act 3 |
| Literary fiction | Kishōtenketsu or modified 3-act | Ambiguous endings compatible with kishōtenketsu |
| Horror | 3-act or hero's journey | Pacing pressure in Act 2 is the primary failure mode |
| Coming-of-age | Hero's journey | Natural fit for the 12-stage progression |
| Satire, absurdist | Kishōtenketsu | The Act 3 pivot is the satirical engine |

### Step 2 — Structural comparison

For the top two candidate models, write a one-paragraph rationale for each. The rationale addresses:

1. **Beat budget**: Can the target length support all the model's canonical beats without padding or compression?
2. **Reader expectation**: Does the genre's readership expect the particular rhythm of beats this model provides?
3. **Thematic alignment**: Does the model's narrative shape reinforce the thematic intent?
4. **Subplot capacity**: If subplots are planned, does the model provide natural docking points?

### Step 3 — Beat sheet generation

For the selected model, produce a beat sheet in this format:

## [Model name] Beat Sheet — [Genre] — [Target length]

```
| Beat | Position | Narrative function | Typical word-count window |
|------|----------|-------------------|--------------------------|
| 1-Setup | 0–10% | Establish status quo and protagonist | 400–1,200 words |
| ... | ... | ... | ... |
```

Position ranges are guidelines; specific stories may compress or expand specific beats to serve the thematic intent.

### Step 4 — Red-flag audit

Scan the beat sheet for the three most common failure modes of the chosen model in the given genre:

- Which beats are most frequently under-developed?
- Which beats are most frequently padded?
- Where does the model typically lose readers in this genre?

Document each risk as a single-sentence warning and a one-line mitigation strategy.

## Examples

### Example 1 — Fantasy novel, 95,000 words, middle-grade-10-11

**Recommendation**: Hero's journey (all 12 stages, compressed for word count).

**Rationale**: Middle-grade readers respond strongly to the rite-of-passage shape of the hero's journey. At 95,000 words, all 12 stages can be fully realized without padding; the CALL TO ADVENTURE and CROSSING THE THRESHOLD beats anchor a clear forward momentum that keeps younger readers engaged.

**Beat sheet excerpt**:

| Beat | Position | Narrative function |
|------|----------|-------------------|
| Ordinary World | 0–5% | Nora's status quo: school, family, emerging abilities |
| Call to Adventure | 5–8% | Discovery of the stolen key |
| Refusal of the Call | 8–10% | Nora's initial reluctance (establishes stakes) |
| Crossing the Threshold | 10–15% | Entering the alternate library dimension |
| Tests, Allies, Enemies | 15–40% | Navigating the antagonist's domain; gathering companions |
| Approach to the Inmost Cave | 40–48% | Nora deduces the true nature of the key |
| The Ordeal | 48–55% | Confrontation with the antagonist |
| Reward | 55–58% | Partial success; the key is reclaimed |
| The Road Back | 58–70% | Escape from the alternate dimension |
| Resurrection | 70–80% | Final confrontation on return to the primary world |
| Return with the Elixir | 80–100% | Resolution: Nora's growth, changed status quo |

### Example 2 — Mystery novella, 28,000 words, adult-general

**Recommendation**: 3-act (tight variant, single-POV).

**Rationale**: At novella length, the hero's journey's 12 stages would compress individual beats below viable scene length. A tight 3-act with compressed midpoint keeps the reader's attention on the investigation without the subplot padding that the hero's journey requires. Single-POV maintains mystery-wall discipline.

**Beat sheet excerpt**:

| Beat | Position | Narrative function |
|------|----------|-------------------|
| Setup / Crime | 0–12% | Victim identified; detective introduced; status quo |
| Inciting Incident | 12–15% | The locked-room murder is revealed |
| Plot Turn 1 (Confrontation) | 15–25% | First investigative thread; initial suspect |
| Rising Action 1 | 25–35% | Second suspect emerges; personal stakes raised |
| Midpoint Reversal | 35–40% | The detective's theory is overturned |
| Rising Action 2 | 40–50% | True suspect identified; race against time |
| Crisis / Black Moment | 50–55% | Detective's failure; stakes peak |
| Climax | 55–60% | Confrontation with the killer |
| Denouement | 60–100% | Resolution; case closed; detective changed |

### Example 3 — Literary fiction short story, 6,500 words, adult-general

**Recommendation**: Kishōtenketsu (4-act East Asian arc).

**Rationale**: Literary short fiction prizes nuance and unexpected resonance over mechanical problem-solving. Kishōtenketsu's Act 3 pivot — where the fourth act introduces a element that re-contextualizes the first three acts without resolving them — is structurally suited to stories that end on ambiguity or thematic ambiguity. A 6,500-word story lacks the word count to execute a 3-act's rising action fully, but kishōtenketsu thrives in compressed spaces.

**Beat sheet excerpt**:

| Beat | Position | Narrative function |
|------|----------|-------------------|
| Ki (Setup) | 0–25% | Establish protagonist's ordinary situation |
| Shō (Development) | 25–50% | Introduce a second character or situation that complicates the first |
| Ten (Pivot) | 50–75% | A third element appears that the first two did not prepare the reader for |
| Ketsu (Conclusion) | 75–100% | The third element re-contextualizes the first two; resolution is tonal rather than plot-based |

## Edge cases

### Epic-length fantasy (>120,000 words) with multiple POVs

A single hero's journey is insufficient for epic-length works. Consider:
- **Nested arcs**: Each major character's arc follows a hero's journey, nested within the overarching arc.
- **Act-skipping**: Some characters enter the narrative at Act 2 of the main arc (already on their own journey).
- **Subplot arc saturation**: At >120k words, more than 3 significant subplot arcs can crowd the main arc's pacing. Audit subplot density before adding additional character threads.

### Romance with HEA/HFN constraint

The hero's journey's "Return with the Elixir" can produce a pyrrhic or bittersweet resolution, which conflicts with romance genre expectations for HEA (Happily Ever After) or HFN (Happy For Now). Use the 3-act romance variant, which builds the relationship arc as the primary plot and resolves it at the climax rather than in the denouement.

### Mystery where the detective is also the victim

Classic 3-act demands the detective solve the case externally. When the detective is personally implicated in the crime, the investigation becomes an internal arc as well. Use a **hybrid**: 3-act structure for the investigation plot, hero's journey beats for the detective's internal transformation. The midpoint reversal can serve both arcs simultaneously.

### Middle-grade readers and scary content

Middle-grade audiences (10–11) are developing tolerance for fear and ambiguity. The hero's journey's "Ordeal" beat can be calibrated to "danger faced" rather than "physical near-death." Kishōtenketsu is less suitable for middle-grade unless the pivot in Act 3 resolves cleanly, as unresolved ambiguity causes more distress in this audience band than in adults.

## Acceptance criteria

- [ ] The skill produces a named structural recommendation with a written rationale that references the input genre, length, and thematic intent.
- [ ] The generated beat sheet covers all canonical beats of the chosen model with positional percentages and narrative function descriptions.
- [ ] The red-flag audit names at least two failure modes specific to the chosen model in the given genre.
- [ ] The structural recommendation does not violate the HEA/HFN constraint when the genre is romance.
- [ ] The word-count windows in the beat sheet are consistent with the target length input (i.e., no beat is assigned more words than the total length can support).

## Failure modes

### Wrong model for genre

Applying kishōtenketsu to a genre whose readership expects explicit resolution (e.g., thriller, mystery) produces a story that feels unfinished. Mitigation: when in doubt, default to 3-act for plot-driven genres; use kishōtenketsu only when the thematic intent explicitly requires tonal rather than plot resolution.

### Beat compression in short formats

The hero's journey has 12 stages; at short-story length (<7,500 words) several stages must be compressed or merged. Attempting to preserve all 12 stages at short-story length results in shallow scenes that neither develop the protagonist nor land the thematic beats. Mitigation: explicitly name which stages are being merged and why.

### Subplot overloading

Stories with more than three significant subplot arcs at novel length crowd the main arc's pacing. Readers lose track of the primary narrative thread, and act boundaries become diffuse. Mitigation: apply the "one subplot per act" rule for stories under 80,000 words; audit subplot density in the red-flag step.

### Tonal drift across act transitions

The hero's journey's CROSSING THE THRESHOLD beat (Act 1 → Act 2 transition) often introduces tonal shift (from ordinary world to special world). If the tonal shift is too abrupt, readers disengage. Mitigation: use a "threshold guardian" scene to ease the transition.

## Cross-references

- **scene-validator** (`examples/skills/scene-validator/SKILL.md`): Narrative arc provides the macro-structure; scene-validator provides the micro-structure for individual scenes within each act.
- **character-consistency** (`examples/skills/character-consistency/SKILL.md`): Arc models define character transformation beats; character-consistency ensures the character's voice, idiolect, and behavior remain coherent across those transformation beats.
- **docs/08-PROFILES.md**: Audience band definitions used as inputs to the arc selection algorithm.
- **docs/10-VISUAL-IR.md**: Narrative arc decisions inform scene visual contracts, particularly the pacing of visual reveals relative to act transitions.

## Evaluation cases

### Case 1 — YA fantasy outline audit

**Input**: YA fantasy, 78,000 words, middle-grade-12-13 audience, hero's journey, existing outline with 14 scenes.

**Evaluation**: Does the skill correctly identify which of the 12 hero's journey stages are absent or compressed? Does the red-flag audit correctly identify the "Refusal of the Call" as the most commonly under-developed beat in YA fantasy? Does the subplot recommendation stay within the word-count budget?

### Case 2 — Romance novella structure selection

**Input**: Romance novella, 22,000 words, adult-general audience, HEA required.

**Evaluation**: Does the skill correctly recommend against the hero's journey in favor of a 3-act romance variant? Does the beat sheet place the relationship climax at the climax beat rather than in the denouement? Does the skill flag the "dark moment" as a potential genre-violation risk?

### Case 3 — Ambiguous-ending literary short

**Input**: Literary fiction short story, 5,500 words, adult avant-garde audience, thematic intent: "the inadequacy of language to capture grief."

**Evaluation**: Does the skill correctly recommend kishōtenketsu? Does the beat sheet describe Act 4 (Ketsu) as providing tonal rather than plot resolution? Does the skill warn about the risk that the kishōtenketsu pivot reads as structural weakness rather than intentional ambiguity?
