import type { CatalogEntity } from '../loader/ProjectSource';

export interface EntityRef {
  readonly kind: string;
  readonly namespace: string;
  readonly name: string;
}

export class EntityRefParseError extends Error {
  constructor(
    public readonly input: string,
    message?: string
  ) {
    super(message ?? `Invalid entity reference: ${input}`);
    this.name = 'EntityRefParseError';
  }
}

const ENTITY_REF_PATTERN = /^([^:/]+):([^:/]+)\/([^:/]+)$/;

export function parseEntityRef(input: string): EntityRef {
  const trimmed = input.trim();
  const match = ENTITY_REF_PATTERN.exec(trimmed);
  if (!match) {
    throw new EntityRefParseError(input, `Invalid entity reference format: ${input}. Expected Kind:namespace/name`);
  }
  const [, kind, namespace, name] = match;
  return { kind, namespace, name } as EntityRef;
}

export function formatEntityRef(ref: EntityRef): string {
  return `${ref.kind}:${ref.namespace}/${ref.name}`;
}

export function toEntityRef(entity: CatalogEntity): EntityRef {
  const name = entity.metadata?.name;
  const namespace = entity.metadata?.namespace;
  if (typeof name !== 'string' || typeof namespace !== 'string') {
    throw new EntityRefParseError(
      JSON.stringify(entity),
      'Cannot derive EntityRef from CatalogEntity: missing metadata.name or metadata.namespace'
    );
  }
  return { kind: entity.kind, namespace, name } as EntityRef;
}
