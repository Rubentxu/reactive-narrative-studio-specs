# character-consistency

## Purpose

The `character-consistency` skill provides a multi-layered validation framework for maintaining character integrity across a narrative project. It addresses the primary consistency failure modes — idiolect drift, profile cross-reference rupture, dialogue tag inconsistency, POV breach, and voice degradation — and provides a character arc tracking layer to ensure that character growth is earned rather than asserted.

## When to invoke

Invoke `character-consistency` when any of the following is true:

- A new character is being introduced to the project and no character profile exists in `docs/08-PROFILES.md`.
- A character's dialogue in a new scene differs noticeably in voice, vocabulary, or syntactic pattern from their established dialogue in earlier scenes.
- A character undergoes a significant belief or behavioral change and there is no documented intermediate arc beat to justify it.
- A multi-POV story shows inconsistent rendering of the same character across different POVs.
- A revision pass identifies scenes where a character's voice has drifted without authorial awareness.
- The `scene-validator` has flagged a `pov_breach` on scenes belonging to a specific character.

Do not invoke `character-consistency` for plot-level structural decisions (those belong to `narrative-arc`) or for scene-level beat validation (that belongs to `scene-validator`).

## Inputs

- **Character name**: The canonical character identifier as declared in `docs/08-PROFILES.md`.
- **Character profile** (from `docs/08-PROFILES.md`): The character's established voice parameters — idiolect markers, vocabulary range, syntactic preferences, emotional register, and background traits.
- **Scene text or scene list**: The scenes in which this character appears. For pre-draft validation, a scene outline; for post-draft validation, the complete scene text.
- **Arc position**: The character's current arc position (setup/recognition/change) as determined by the active `narrative-arc` decision.
- **POV status**: Whether this character is the POV character for the scenes under review, a secondary character within a POV scene, or a character in a non-POV scene.
- **Prior dialogue corpus**: All previous dialogue written for this character across the project. Used for voice drift detection.

## Outputs

- **Idiolect compliance report**: For each dialogue beat in the reviewed scenes, a pass/fail against the character's established idiolect markers (vocabulary tier, syntactic signature, filled-pause frequency, question-vs-statement ratio). Failures are tagged with the specific marker that violated the profile.
- **Profile cross-reference audit**: Confirmation that all references to this character's physical description, backstory facts, and behavioral traits in the reviewed scenes are consistent with the profile in `docs/08-PROFILES.md`. Inconsistencies are flagged with the specific profile entry that was violated.
- **Dialogue tag audit**: A count of dialogue attribution tags (he said / she whispered / etc.) with a determination of whether the tag's emotional register matches the dialogue content. Mismatches are flagged as `tag_tone_drift`.
- **POV consistency report** (for POV characters): Confirmation that all internal thoughts, sensory descriptions, and reactions in the POV scenes are filtered through this character's perceptual and cognitive lens. Cross-POV contamination is flagged as `pov_bleed`.
- **Voice drift score**: A longitudinal comparison of the character's voice across the reviewed scenes vs. their earlier scenes. A score above the drift threshold (configurable, default 0.3) triggers a `voice_drift` warning with the specific markers that have shifted.
- **Arc beat alignment check**: Confirmation that any belief or behavioral change in the reviewed scenes is anchored to a prior arc beat that earned it. Unearned changes are flagged as `arc_gap`.

## Workflow

1. **Load character profile** from `docs/08-PROFILES.md` (halt if missing).
2. **Assemble dialogue corpus** from existing project scenes; use profile baseline for first-appearance.
3. **Validate idiolect compliance** — vocabulary tier, syntactic signature, filled-pause frequency, question-to-statement ratio.
4. **Audit profile cross-references** for physical descriptors and backstory invariants.
5. **Check dialogue tags**, POV consistency (for POV characters), and voice drift score.
6. **Verify arc beat alignment** for any belief or behavioral change.

## Voice markers reference

The following markers define a character's voice profile and are used for idiolect compliance checking:

### Vocabulary tier

- **Formal**: Literary or educated register; complex vocabulary, precise terminology, minimal colloquialisms.
- **Semi-formal**: Neutral educated; precise where needed, accessible, occasional colloquialism.
- **Informal**: Conversational; contractions, casual vocabulary, regional expressions allowed.
- **Slang**: Youth subculture or in-group register; slang terms, abbreviations, code-switching.
- **Technical**: Domain-specific vocabulary; used when character is operating in their area of expertise.

### Syntactic signature

- **Simple**: Short declarative sentences; subject-verb-object as dominant structure; minimal subordination.
- **Moderate**: Mix of simple and complex sentences; some subordination, some compound structures.
- **Complex**: Long sentences with multiple subordinate clauses; participial phrases; conditional structures.
- **Fragment-heavy**: Frequent sentence fragments for effect; used in action or highly emotional scenes.
- **Mixed**: Sentence structure varies deliberately to match scene content and emotional state.

### Filled-pause frequency

Expressed as a percentage of total speech: `#` (um/uh), silent pause markers, or self-interruption patterns. High filled-pause frequency (>15%) signals anxiety or uncertainty; low frequency (<5%) signals confidence or emotional control.

### Question-to-statement ratio

Number of questions divided by total statements in a dialogue beat. High ratio (>0.5) signals curiosity, interrogation, or uncertainty. Low ratio (<0.2) signals confidence, directive speech, or emotional withdrawal.

### Emotional register

The character's baseline emotional state and range. Emotional register affects word choice, sentence length, and dialogue tag selection. Key register terms: guarded, open, warm, cold, anxious, confident, sarcastic, earnest.

### Step 1 — Load character profile

Retrieve the character's profile from `docs/08-PROFILES.md`. The profile should contain:

- **Idiolect signature**: Vocabulary tier (formal/informal/technical/slang), syntactic preferences (simple sentences / complex subordination / fragments), filled-pause frequency, question-to-statement ratio.
- **Emotional register**: Baseline emotional state, typical emotional range, and trigger conditions for significant emotional states.
- **Physical anchors**: Key physical descriptors that must remain consistent across all scenes.
- **Backstory invariants**: Facts about the character's history that must not contradict across scenes.
- **Behavioral signatures**: Consistent behavioral patterns (e.g., "always checks exits first," "nervous habit of adjusting glasses").

If no profile exists for the character in `docs/08-PROFILES.md`, the skill flags `profile_missing` and halts — do not proceed without a profile.

### Step 2 — Dialogue corpus assembly

Collect all dialogue for this character from the project's existing scene corpus. For pre-draft validation where no prior corpus exists, use the idiolect signature from the profile as the baseline instead.

### Step 3 — Idiolect validation

For each dialogue beat in the reviewed scenes:

1. Extract vocabulary tier: Does the word choice match the declared tier?
2. Extract syntactic signature: Does the sentence structure match the declared preference?
3. Extract filled-pause frequency: Are `#` or `um` or `uh` used at the declared frequency?
4. Extract question-to-statement ratio: Is the proportion of questions consistent with the profile?

Mark each beat: `idiolect_pass` or `idiolect_fail` with the specific violated marker.

### Step 4 — Profile cross-reference audit

For each factual claim about the character in the reviewed scenes:

1. Compare against the `docs/08-PROFILES.md` profile's backstory invariants and physical anchors.
2. Flag any contradiction: `profile_contradiction`.
3. Flag any physical descriptor that is absent from the profile: `profile_orphan_detail`.
4. Flag any profile detail that is referenced in the profile but never manifested in any scene: `profile_latent`.

### Step 5 — Dialogue tag audit

For each dialogue attribution tag:

1. Classify the tag's emotional register (e.g., "hissed" = aggressive, "whispered" = intimate/fearful, "muttered" = disgruntled).
2. Classify the dialogue content's emotional register (independent of the tag).
3. If the two registers are in conflict (e.g., tag says "said cheerfully" but content is a complaint), flag `tag_tone_drift`.

### Step 6 — POV consistency check (for POV characters)

For each scene where this character is the POV:

1. Confirm that all internal reactions are expressed through the character's established perceptual lens (e.g., a character who is myopic does not describe distant detail with precision).
2. Confirm that the character's emotional responses are proportionate to their established emotional register in the profile.
3. Flag any instance of `pov_bleed` where information or reaction is rendered that the character could not logically possess.

### Step 7 — Voice drift detection

Compare the idiolect signature of the reviewed scenes against the prior dialogue corpus:

1. Compute a drift vector: which idiolect markers have shifted and by how much.
2. If the drift magnitude exceeds the configured threshold, flag `voice_drift` with a list of the specific markers that have drifted.
3. Note whether the drift is progressive (getting worse in each successive scene) or stable (consistent shift from an earlier baseline).

### Step 8 — Arc beat alignment

For any significant belief or behavioral change in the reviewed scenes:

1. Identify the arc position (setup / recognition / change).
2. Confirm that the prior arc beats provide sufficient justification for the change.
3. If the change is not anchored to a prior beat, flag `arc_gap`.
4. If the change is anchored but the anchoring beat was insufficiently developed, flag `arc_underdeveloped`.

## Examples

### Example 1 — Idiolect drift in Nora's dialogue

**Character**: Nora
**Profile idiolect**: Informal to semi-formal; preference for simple declarative sentences; low filled-pause frequency (~5%); question-to-statement ratio 0.2.

**Reviewed scene**: Nora's dialogue in a tense confrontation scene.

**Findings**:
- Vocabulary tier: PASS (word choices consistent with informal tier)
- Syntactic signature: FAIL — three instances of complex subordination with embedded clauses; profile specifies simple declarative preference.
- Filled-pause frequency: PASS
- Question-to-statement ratio: FAIL — ratio is 0.8 (8 questions in 10 statements); profile specifies 0.2.

**Result**: `idiolect_fail` on syntactic and ratio markers. Remediation: revise the confrontation dialogue to use shorter declarative sentences and reduce the number of questions.

### Example 2 — Profile contradiction flagged

**Character**: Irene
**Profile in `docs/08-PROFILES.md`**: "Irene is left-handed."
**Reviewed scene**: Irene is described as "her right hand" in a scene-level physical description.

**Result**: `profile_contradiction` — the physical description in the scene contradicts the profile entry. The contradiction is not which hand she uses, but that the profile and scene description diverge. Remediation: align the scene description with the profile OR update the profile if the handedness was intentionally changed.

### Example 3 — Dialogue tag tone drift

**Character**: Marcus
**Profile**: Marcus uses "said" as his dominant dialogue tag; occasional "grunted" for dismissive responses. Emotional register: guarded, dry humor.

**Reviewed scene**: Marcus says something genuinely kind. The author uses "said warmly" as the dialogue tag.

**Result**: `tag_tone_drift` — the tag's emotional register (warm) conflicts with the dialogue's actual content and Marcus's established emotional register. The tag should be "said" or "said quietly" rather than "said warmly." Remediation: revise the tag to match Marcus's established voice.

## Edge cases

### First appearance with no prior corpus

When a character appears for the first time and there is no prior dialogue corpus, the idiolect validation uses the `docs/08-PROFILES.md` profile's declared idiolect signature as the baseline. The first scene sets the voice; subsequent scenes are compared against it. Flag the first scene explicitly as `voice_baseline_set` so subsequent reviews know this scene established the baseline.

### Characters who code-switch

Some characters intentionally shift their speech patterns depending on context (speaking formally to authority figures, informally to friends). The profile in `docs/08-PROFILES.md` should declare the code-switching matrix. When validating, apply the correct idiolect tier based on the scene's social context. If the profile doesn't declare the code-switching matrix and a code-switch is detected, flag `code_switch_undeclared`.

### Ensemble casts with overlapping voices

Characters in the same social group may have similar idiolect signatures (e.g., all teenagers in the same school). The validator flags characters whose voices are too similar (idiolect distance below threshold) as `voice_collision_risk`. The remediation is to exaggerate one or more idiolect markers to create sufficient differentiation.

### Rapid arc change in compressed format

In short fiction (under 7,500 words), character arc beats may be compressed to a single scene. The arc beat alignment check may flag `arc_gap` even when the arc is intentionally compressed. Apply genre-appropriate leniency: in short fiction, a single scene can carry the setup-recognition-change arc if the scene has a clear two-beat structure (old belief → disruption → new belief).

## Acceptance criteria

- [ ] The skill produces an idiolect compliance report for every dialogue beat in the reviewed scenes.
- [ ] The profile cross-reference audit identifies all contradictions between scene-level character facts and the `docs/08-PROFILES.md` profile.
- [ ] The dialogue tag audit flags any tag whose emotional register conflicts with the dialogue content.
- [ ] For POV characters, the POV consistency report identifies any instance of `pov_bleed`.
- [ ] The voice drift score is computed when a prior dialogue corpus exists; the first-scene baseline is flagged for future reference.
- [ ] Arc beat alignment is checked for all significant belief or behavioral changes.
- [ ] The skill does not produce false-positive idiolect failures for characters who intentionally code-switch, provided the `docs/08-PROFILES.md` profile declares the code-switching matrix.

## Failure modes

### Profile missing

A character without a `docs/08-PROFILES.md` profile cannot be validated. The skill halts with `profile_missing`. Mitigation: create the profile before running validation. A minimal profile (idiolect signature + one physical anchor + one backstory invariant) is sufficient for initial validation.

### Idiolect baseline drift without detection

If the first scene's dialogue was written with an inconsistent voice and set a wrong baseline, subsequent scenes that match the wrong baseline will pass validation even though the voice is wrong. Mitigation: audit the first three scenes specifically for idiolect compliance with the profile's declared signature; if all three fail, the baseline is wrong and should be corrected before the corpus grows.

### Profile-staleness gap

The `docs/08-PROFILES.md` profile may become stale as the character evolves across the narrative. The validator checks against the profile as written, not the author's current understanding of the character. Mitigation: update the profile whenever a significant arc beat changes the character's voice or behavioral signature.

### Tag audit creates false confidence

The dialogue tag audit is a mechanical tone check; it cannot detect when a dialogue tag is accurate but the dialogue itself is inconsistent. The tag audit is a secondary check, not a primary voice validation. Mitigation: always run idiolect validation alongside tag audit; do not use tag audit alone to validate character voice.

## Cross-references

- [[Skill:default/narrative-arc]]: Arc provides the macro-level character transformation beats that arc beat alignment is checked against.
- **narrative-arc** (`examples/skills/narrative-arc/SKILL.md`): Arc provides the macro-level character transformation beats that arc beat alignment is checked against.
- **scene-validator** (`examples/skills/scene-validator/SKILL.md`): Scene-validator's `pov_breach` flag triggers a character-consistency POV check as a downstream validation.
- **docs/08-PROFILES.md**: The canonical source of character profiles; all profile cross-reference checks are validated against this file.
- **docs/10-VISUAL-IR.md**: Character visual DNA (physical anchors) in `docs/10` must remain consistent with the physical anchors declared in `docs/08-PROFILES.md`.

## Evaluation cases

### Case 1 — New character first-appearance validation

**Input**: New character "Mira" is appearing for the first time. Profile exists in `docs/08-PROFILES.md`. No prior dialogue corpus. Scene contains 12 dialogue beats.

**Evaluation**: Does the skill correctly flag the first scene as `voice_baseline_set`? Does it validate each of the 12 dialogue beats against the profile's declared idiolect signature? Does it identify which idiolect markers are present in the first scene (setting the baseline)?

### Case 2 — Voice drift detection in a long project

**Input**: Nora has 40 scenes across a novel. Scenes 1–20 show consistent idiolect. Scenes 21–40 show progressive drift in syntactic signature (more complex sentences) and increasing filled-pause frequency.

**Evaluation**: Does the skill correctly compute a voice drift score that exceeds the threshold? Does it identify the specific markers that have drifted (syntactic complexity and filled-pause frequency)? Does it correctly identify that the drift is progressive (getting worse over time)?

### Case 3 — Arc gap in character transformation

**Input**: Marcus has been characterized as deeply distrustful of authority throughout the first 15 scenes. In scene 16, he accepts help from an authority figure without hesitation. The narrative-arc decision for Marcus's arc shows this change should occur at the "recognition" beat, which has not yet been written.

**Evaluation**: Does the skill correctly flag `arc_gap` — the belief change is unanchored to a prior arc beat? Does it identify that the "recognition" beat is missing and that scene 16's change is therefore unearned?
