/**
 * Bundled sample plans for the shot-planning view: the canonical operator
 * example and a physically impossible shot. The parity between what these
 * samples do here and what the CLI does with its own fixtures is guaranteed
 * by the cross-runtime oracle in the verification scenario, not by sharing
 * files.
 */

export const CANONICAL_EXAMPLE_YAML = `id: SC12-SH03
sceneRef: SC12
sequenceRef: SEQ04
durationSeconds: 6
fps: 24
subjects:
  - id: maya
    representation: capsule
    action: walk
    start: [0, -8, 0]
    end: [0, 6, 0]
camera:
  lensMm: 50
  segments:
    - { frames: [1, 48], move: tracking_backward, height: 0.45 }
    - { frames: [49, 96], move: tracking_backward, height: 1.20 }
    - { frames: [97, 144], move: crane_up, heightFrom: 1.20, heightTo: 5.00 }
styleReferences: [visual-bible/noir-rainy-city.png]
characterReferences: [characters/maya/approved-front.png]
`;

export const IMPOSSIBLE_SHOT_YAML = `# A locked-off camera while the subject walks the full path, crossing the
# camera plane. The geometry is legal; the physics is not.
id: PHYS-BAD-01
sceneRef: SC1
sequenceRef: SQ1
durationSeconds: 4
fps: 24
subjects:
  - id: hero
    representation: capsule
    action: walk
    start: [0, 0, 0]
    end: [0, -10, 0]
camera:
  lensMm: 50
  segments:
    - { frames: [1, 96], move: static, height: 1.0 }
`;
