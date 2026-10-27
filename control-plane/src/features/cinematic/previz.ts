/**
 * Client-side reading of the artifacts a previz run produced: the execution
 * metadata, the derivation provenance, and the rendered motion clip. Everything
 * happens in the browser from user-selected files — no fetch, no server, no
 * process execution (serverless invariants).
 */

export interface ArtifactRecord {
  path: string;
  sha256: string;
}

export interface MetadataView {
  shotId: string;
  mode: string;
  fps: number;
  fpsBase: number;
  frameStart: number;
  frameEnd: number;
  lensMm: number;
  objects: string[];
  outputs: ArtifactRecord[];
  render?: { engine: string; container: string; codec: string; width: number; height: number } | undefined;
}

export interface ProvenanceView {
  shotPlan: ArtifactRecord;
  generatedScript: ArtifactRecord;
  sceneMetadata: ArtifactRecord;
  outputs: ArtifactRecord[];
}

export interface PrevizBundle {
  metadata: MetadataView | null;
  metadataError: string | null;
  provenance: ProvenanceView | null;
  provenanceError: string | null;
  clipUrl: string | null;
  clipName: string | null;
}

export async function readPrevizBundle(files: File[], previousUrl: string | null): Promise<PrevizBundle> {
  if (previousUrl) URL.revokeObjectURL(previousUrl);
  const bundle: PrevizBundle = {
    metadata: null,
    metadataError: null,
    provenance: null,
    provenanceError: null,
    clipUrl: null,
    clipName: null,
  };

  for (const file of files) {
    if (file.name.endsWith('.mp4')) {
      bundle.clipUrl = URL.createObjectURL(file);
      bundle.clipName = file.name;
    } else if (file.name === 'scene-metadata.json') {
      try {
        bundle.metadata = toMetadataView(JSON.parse(await file.text()));
      } catch (error) {
        bundle.metadataError = `scene-metadata.json: ${String(error)}`;
      }
    } else if (file.name === 'provenance.json') {
      try {
        bundle.provenance = toProvenanceView(JSON.parse(await file.text()));
      } catch (error) {
        bundle.provenanceError = `provenance.json: ${String(error)}`;
      }
    }
  }
  return bundle;
}

function toMetadataView(raw: Record<string, unknown>): MetadataView {
  const render = raw.render as MetadataView['render'] | undefined;
  return {
    shotId: String(raw.shotId),
    mode: String(raw.mode),
    fps: Number(raw.fps),
    fpsBase: Number(raw.fps_base),
    frameStart: Number(raw.frame_start),
    frameEnd: Number(raw.frame_end),
    lensMm: Number((raw.camera as Record<string, unknown>).lensMm),
    objects: (raw.objects as string[]) ?? [],
    outputs: (raw.outputs as ArtifactRecord[]) ?? [],
    render,
  };
}

function toProvenanceView(raw: Record<string, unknown>): ProvenanceView {
  return {
    shotPlan: raw.shotPlan as ArtifactRecord,
    generatedScript: raw.generatedScript as ArtifactRecord,
    sceneMetadata: raw.sceneMetadata as ArtifactRecord,
    outputs: (raw.outputs as ArtifactRecord[]) ?? [],
  };
}
