# scene-validator

## Purpose

The `scene-validator` skill provides a structured validation framework for individual scenes within a narrative. It audits scenes for structural integrity against canonical scene models — goal/conflict/outcome/disaster, Dwight Swain's scene-sequel, and motivation-reaction units (MRU) — and surfaces common failure patterns before they compound into structural problems at the act level.

## When to invoke

Invoke `scene-validator` when any of the following is true:

- A scene has been drafted and needs structural validation before proceeding to the next scene.
- An author reports that a scene "doesn't feel like it's doing anything" or "ends flat."
- A scene-by-scene outline audit is being performed during the planning phase.
- A story's act-level pacing is off; the validator is used to identify which scenes within the lagging act are the root cause.
- A scene transitions awkwardly to the next scene; the validator checks scene-ending hooks.

Do not invoke `scene-validator` for purely stylistic edits (word-level prose polish, dialogue refinement) or for structural decisions at the arc level — those belong to `narrative-arc` and `character-consistency` respectively.

## Inputs

- **Scene text** (raw or outline form): The complete scene draft, or for pre-draft validation, the scene's beat sheet entry.
- **Scene type**: One of `action`, `reaction`, `setup`, `payoff`, `complication`, `revelation`, or `transition`. Scene type is determined by the scene's primary narrative function.
- **Arc position**: Which act and approximately which beat within the act the scene occupies (e.g., "Act 1, setup beat," "Act 2, midpoint-adjacent complication"). Arc position informs the validation bar — scenes in the climax act have different expectations than scenes in the setup act.
- **POV character**: Which character's perspective the scene uses. Validation checks whether the scene is anchored to that character's sensory and cognitive experience.
- **Prior scene context**: What the previous scene ended with. Validation checks scene-to-scene causation — the ending of the prior scene must create conditions for the opening of this scene.
- **Planned next scene**: What the next scene is expected to deliver. Validation checks scene-ending hooks are correctly set up for the next scene's delivery.

## Outputs

- **Scene model compliance score**: For each of the three canonical scene models (goal/conflict/outcome/disaster, scene-sequel, MRU), a binary pass/fail and, on fail, a one-sentence description of which element is missing or underdeveloped.
- **Scene function check**: Confirmation that the scene's actual function matches its declared scene type. Mismatches are flagged as `type_drift`.
- **POV anchor check**: Confirmation that the scene is grounded in the declared POV character's sensory experience for at least the opening beat. POV drift (head-hopping) is flagged as `pov_breach`.
- **Scene hook audit**: Confirmation that the scene's final beat creates a specific, legible hook for the next scene. Scenes that end without a forward-driving question are flagged as `hook_missing`.
- **Scene-to-scene causation check**: Confirmation that the outcome of the prior scene logically leads to the opening of this scene. Missing causal links are flagged as `causal_gap`.
- **Dialogue density note**: For reaction-type scenes, a count of dialogue beats vs. internal-reaction beats to ensure the scene is not dialogue-heavy when it should be introspective.

## Workflow

### Step 1 — Declare scene type and position

Assign the scene a primary function from the taxonomy:

- **Action**: External conflict in real time; the character acts on the world.
- **Reaction**: Character's internal response to an event or revelation; the world acts on the character.
- **Setup**: Establishes conditions, context, or stakes for a future payoff.
- **Payoff**: Delivers the result of a previously established setup.
- **Complication**: Introduces a new obstacle, information reveal, or shift that raises stakes.
- **Revelation**: New information is delivered to the character or reader.
- **Transition**: Moves the narrative across time or space without significant plot development.

## Scene type taxonomy

The seven scene types form a functional taxonomy; they are not arbitrary labels but reflect the scene's primary narrative job:

| Scene type | Primary job | Typical arc position | G/C/O/D适用? | MRU适用? |
|------------|-------------|---------------------|-------------|---------|
| Action | External conflict delivery | Act 2–3 climax-adjacent | Yes | Yes |
| Reaction | Internal processing | Post-incident, Act 1/3 | Scene-sequel | Yes |
| Setup | Future payoff seeding | Act 1–early Act 2 | Partial | Yes |
| Payoff | Setup delivery | Act 2–3 | Yes | Yes |
| Complication | Stakes escalation | Any act | Yes | Yes |
| Revelation | Information delivery | Any act | No (O/D collapse) | Yes |
| Transition | Temporal/spatial move | Act boundaries | No | No |

Scene type is not fixed for the lifetime of a project — a scene's type can change during revision if its primary job changes. The validator flags scenes whose actual job diverges from their declared type.

### Step 2 — Goal/Conflict/Outcome/Disaster validation (G/C/O/D)

Apply the canonical G/C/O/D sequence to the scene:

```
Goal → Conflict → Outcome → Disaster
```

- **Goal** (scene opening, ~10% of scene length): What the POV character wants to accomplish in this specific scene. Not the overarching story goal — the scene-local goal. Must be concrete and achievable within the scene.
- **Conflict** (scene middle, ~60% of scene length): What prevents the character from achieving the goal. Conflict must be real and specific, not vague or easily resolved.
- **Outcome** (scene climax, ~15% of scene length): Whether the character achieves the goal. Outcome should be determined by the quality of the conflict confrontation.
- **Disaster** (scene ending, ~15% of scene length): The outcome creates a new, worse problem that propels the story forward. Disaster is not the same as failure — failure resolves; disaster complicates.

For each G/C/O/D element, mark: present, underdeveloped, or absent. If two or more elements are absent, the scene fails G/C/O/D validation.

### Step 3 — Scene-Sequel validation (Swain model)

For reaction-type scenes, validate using the scene-sequel pattern:

```
Reaction → Dilemma → Decision
```

- **Reaction** (1–2 paragraphs): The character processes the emotional impact of the prior scene's outcome. Must show specific emotional response, not generic mood.
- **Dilemma** (scene middle): The character faces a genuine choice between two or more paths, each with cost.
- **Decision** (scene ending): The character commits to a course of action. The decision must be non-obvious and costly.

Action scenes may skip scene-sequel validation. Setup and payoff scenes should use abbreviated scene-sequel: setup → anticipation → charged moment.

### Step 4 — MRU validation (Motivation-Reaction Unit)

Validate at the paragraph or beat level using MRU:

```
Motivation (stimulus) → Reaction (response)
```

Every significant narrative beat follows an MRU: something happens (motivation) and a character responds (reaction). Scenes that have motivation without reaction feel robotic; scenes that have reaction without motivation feel unmoored.

For each MRU pair, confirm:
- The motivation is externally anchored (something the character observes, not something they think in isolation).
- The reaction is proportionate and specific to the character's established psychology.
- The reaction moves the scene's local goal forward or creates a new goal.

Flag scenes where the ratio of reaction-to-motivation is below 1:3 as `mru_skewed`.

### Step 5 — Scene type drift check

Compare the declared scene type against the actual scene content:

- If declared `action` but the scene's longest section is reaction beats → `type_drift`.
- If declared `setup` but no future payoff is seeded → `setup_hollow`.
- If declared `revelation` but the reveal is delivered through dialogue summary rather than experienced → `revelation_cold`.

### Step 6 — Scene-to-scene and hook check

- Confirm the scene's opening resolves or acknowledges the prior scene's closing hook.
- Confirm the scene's closing hook poses a specific forward question (not a vague "and then things got worse").
- Confirm the next scene's opening is set up by the current scene's closing.

Flag any `causal_gap` or `hook_missing` as `BLOCK` for the scene to be considered structurally valid.

## Examples

### Example 1 — Action scene validation

**Scene type**: `action`
**Arc position**: Act 2, midpoint-adjacent complication
**POV**: Nora

**G/C/O/D analysis**:
- Goal: Nora wants to retrieve the silver key from the locked display case before the library guard returns.
- Conflict: The case lock requires a combination; Nora must deduce it from visual clues on the case while the guard's footsteps grow closer.
- Outcome: Nora solves the combination but the case is wired to an alarm — opening it triggers the library's silent alarm.
- Disaster: The guard is now on high alert; Nora must escape with the key before the secondary response team arrives.

**Result**: All four G/C/O/D elements present. PASS.

### Example 2 — Reaction scene validation

**Scene type**: `reaction`
**Arc position**: Act 1, aftermath of inciting incident
**POV**: Nora

**Scene-Sequel analysis**:
- Reaction: Nora processes the revelation that the library contains a dimensionally unstable archive. Her response is a mix of fear and intellectual fascination — shown through physical symptoms (trembling hands) and a specific obsessive thought ("I have to go back").
- Dilemma: Nora can walk away from the archive (safety, normal life) or return to it (risk, discovery).
- Decision: Nora decides to return, but not immediately — she needs to prepare, which sets up the next scene's planning beat.

**MRU check**: Opening MRU (Nora sees the archive door close → trembling, obsessive thought) is externally motivated and proportionally reactive. Subsequent MRUs maintain the 1:1 pairing. PASS.

### Example 3 — Setup scene validation failure

**Scene type**: `setup`
**Arc position**: Act 2, pre-midpoint
**POV**: Nora

**Problem found**: `setup_hollow` — the scene establishes a new location (the restricted stacks) but does not seed any future payoff. No object, person, or information introduced in this scene is referenced again within the next five scenes.

**Remediation**: Add a specific detail in the restricted stacks scene that will pay off at the midpoint (e.g., a specific book spine, a smell, a sound) that Nora will recognize at the midpoint as a clue.

## Edge cases

### Action scenes with extended dialogue

In action scenes, dialogue during physical conflict must be brief and purpose-driven. A common failure mode is long explanatory dialogue during an action sequence, which breaks the external-conflict rhythm. The validator flags dialogue beats exceeding 30% of an action scene's total length as `action_dialogue_bloat`.

### Reaction scenes that front-load backstory

A reaction scene's opening must process the prior scene's outcome before pivoting to backstory or internal reflection. Scenes that begin with extended backstory before addressing the triggering event fail the reaction validation for `reaction_delayed`. The reaction must be immediate and proportionate.

### Setup scenes with multiple payoffs

A single setup scene can seed multiple future payoffs, but each payoff must be independently trackable. The validator flags setups where multiple payoffs are seeded but only one is resolved, as `setup_overcommit`.

### Complication scenes that don't complicate

A scene declared as `complication` must genuinely raise stakes or shift the strategic landscape. Scenes that declare a complication but actually just delay resolution (no stakes change, no new information) fail as `complication_weak`.

## Acceptance criteria

- [ ] The skill produces a G/C/O/D compliance result for every validated scene.
- [ ] For reaction-type scenes, the skill produces a scene-sequel validation result.
- [ ] The MRU check flags any scene where reaction beats are fewer than 1 per 3 motivation beats.
- [ ] The `type_drift`, `pov_breach`, `hook_missing`, and `causal_gap` flags are produced when applicable.
- [ ] Scene-level validation failures are translated into a one-sentence remediation recommendation.
- [ ] The skill does not produce false positives on properly structured scenes.

## Failure modes

### G/C/O/D false pass

A scene that passes G/C/O/D validation because the goal is too vague to fail is a false pass. A goal must be concrete and achievable within the scene's time frame. Mitigation: phrase the goal as a specific observable action ("Nora wants to open the display case") rather than a thematic desire ("Nora wants to prove herself").

### Scene-sequel dilution

Reaction scenes are vulnerable to dilution — the reaction beats are real but the dilemma is false. The character appears to face a choice but the decision is obvious or costless. Mitigation: apply the "cost test": does each option in the dilemma have a significant cost that the character genuinely weighs?

### MRU ratio gaming

Authors can add artificial motivation beats to game the MRU ratio without improving scene structure. The MRU check must verify that motivation beats are narratively significant, not decorative setting description. Mitigation: each motivation beat must change the scene's tactical situation in a way that demands a reaction.

### Hook ambiguity

A scene-ending hook that poses an ambiguous question ("and then everything changed") is not a valid hook. The hook must be specific enough that the reader can anticipate what question the next scene will answer. Mitigation: validate each hook against the "next scene first line" test — if the next scene's opening doesn't answer the current scene's hook question, the hook is too vague.

## Cross-references

- **narrative-arc** (`examples/skills/narrative-arc/SKILL.md`): Arc provides the macro-structure within which scenes are placed; scene-validator validates micro-structure within each arc beat.
- **character-consistency** (`examples/skills/character-consistency/SKILL.md`): Scene-validator checks that character reactions are proportionate and consistent with the character's established psychology; character-consistency checks the broader voice and idiolect consistency across scenes.
- **docs/10-VISUAL-IR.md**: Scene-level decisions about action vs. reaction inform visual contract density; action scenes require more visual description per beat than reaction scenes.

## Evaluation cases

### Case 1 — Action scene at climax act

**Input**: Action scene, climax act, 1,200 words, POV: Nora.

**Evaluation**: Does the validator correctly identify that the goal must be externally simple and immediate (escape, defeat, choose) in the climax act? Does it flag a goal of "Nora wants to understand her feelings" in an action scene as `goal_type_mismatch`?

### Case 2 — Reaction scene with delayed reaction

**Input**: Reaction scene, aftermath of inciting incident, 950 words, declared as `reaction`, actual opening is two paragraphs of backstory about Nora's childhood library visits before any processing of the inciting incident.

**Evaluation**: Does the validator correctly flag `reaction_delayed`? Does it identify the specific backlog of motivation beats that should have preceded the reaction?

### Case 3 — Setup scene with hollow payoff

**Input**: Setup scene, Act 2 pre-midpoint, 800 words, declares it is setting up a future payoff. The next 5 scenes contain no reference to anything introduced in this setup scene.

**Evaluation**: Does the validator correctly flag `setup_hollow`? Does it name the specific elements that were introduced but not referenced?
