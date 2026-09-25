/**
 * entityLinkPlugin — remark plugin that detects [[entityId]] text AND capability references.
 *
 * Transforms [[entityId]] syntax into custom `entityLink` mdast nodes
 * that the rehype renderer can transform into proper links.
 *
 * Also handles capability references, emitted as real anchors (REQ-DOC-5):
 * the href reuses the exact /capabilities/{route}/{namespace}/{name} format of
 * the routes registered in routes/router.tsx and of KindList.tsx links.
 * - [[Skill:default/character-consistency]] → /capabilities/skills/default/character-consistency
 * - [[Pack:editorial/story_core]] → /capabilities/packs/editorial/story_core
 * - [[Profile:default/middle-grade-10-11]] → /capabilities/profiles/default/middle-grade-10-11
 * - [[Workflow:default/sdxl-illustrated-page]] → /capabilities/workflows/default/sdxl-illustrated-page
 * - [[Recipe:default/middle-grade-illustrated]] → /capabilities/recipes/default/middle-grade-illustrated
 * - Provider pattern omitted (no instances today): falls through to plain text
 *
 * m16 entity refs (Character, Chapter, etc.) continue to work.
 */

import { parseEntityRef } from '../../store/entityRef';

// Re-export the EntityLinkNode type for use in rehype plugins
export interface EntityLinkNode {
  type: 'entityLink';
  entityId: string;
  children: [{ type: 'text'; value: string }];
  data: {
    hName: 'span';
    hProperties: {
      className: string[];
      'data-entity-ref': string;
    };
  };
}

// Capability link node for capability cross-references
export interface CapabilityLinkNode {
  type: 'capabilityLink';
  capabilityRef: string;
  kind: string;
  namespace: string;
  name: string;
  children: [{ type: 'text'; value: string }];
  data: {
    hName: 'a';
    hProperties: {
      href: string;
      className: string[];
      'data-capability-ref': string;
    };
  };
}

// Capability kinds that map to capability catalog routes
const CAPABILITY_KINDS = ['Skill', 'Pack', 'Profile', 'Workflow', 'Recipe'] as const;

// Map capability kind to route path segment
function capabilityKindToRoute(kind: string): string {
  switch (kind) {
    case 'Skill': return 'skills';
    case 'Pack': return 'packs';
    case 'Profile': return 'profiles';
    case 'Workflow': return 'workflows';
    case 'Recipe': return 'recipes';
    default: return 'unknown';
  }
}

// Try to parse a capability reference
// Returns the parsed parts if valid, null if not a capability ref
function tryParseCapabilityRef(ref: string): { kind: string; namespace: string; name: string } | null {
  // Pattern: Kind:namespace/name
  const match = ref.match(/^([A-Za-z]+):([^/]+)\/(.+)$/);
  if (!match) return null;

  const kind = match[1] ?? '';
  const namespace = match[2] ?? '';
  const name = match[3] ?? '';

  if (!CAPABILITY_KINDS.includes(kind as typeof CAPABILITY_KINDS[number])) {
    return null;
  }

  return { kind, namespace, name };
}

/**
 * Remark plugin that transforms [[entityId]] text into entityLink nodes.
 * Also handles capability references like [[Skill:default/character-consistency]].
 *
 * @example
 * ```markdown
 * See [[Character:demo/nora]] for details.
 * Use [[Skill:default/character-consistency]] for validation.
 * ```
 * Becomes entityLink and capabilityLink nodes respectively.
 */
export function entityLinkPlugin(): (tree: unknown) => void {
  return (tree: unknown) => {
    const visitTree = tree as { type: string; children?: unknown[] };

    if (!visitTree.children) return;

    function walk(node: { type: string; value?: string; children?: unknown[] }, index: number, parent: { children: unknown[] }): void {
      if (node.type === 'text' && node.value) {
        const ENTITY_REF_PATTERN = /\[\[([^\]]+)\]\]/g;
        const text = node.value;
        const segments: unknown[] = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;
        let hasMatch = false;

        // Reset regex state
        ENTITY_REF_PATTERN.lastIndex = 0;

        while ((match = ENTITY_REF_PATTERN.exec(text)) !== null) {
          hasMatch = true;
          const fullMatch = match[0];
          const ref = match[1];
          const matchStart = match.index;

          // Add text before the match
          if (matchStart > lastIndex) {
            segments.push({
              type: 'text',
              value: text.slice(lastIndex, matchStart),
            });
          }

          if (ref) {
            // First, try to parse as capability reference
            const capabilityParsed = tryParseCapabilityRef(ref);
            if (capabilityParsed) {
              // Create capability link node — an <a> whose href matches the
              // /capabilities/{route}/{ns}/{name} routes registered in
              // routes/router.tsx and the links built by KindList.tsx (REQ-DOC-5).
              const href =
                `/capabilities/${capabilityKindToRoute(capabilityParsed.kind)}/` +
                `${encodeURIComponent(capabilityParsed.namespace)}/` +
                `${encodeURIComponent(capabilityParsed.name)}`;
              const capabilityLinkNode: CapabilityLinkNode = {
                type: 'capabilityLink',
                capabilityRef: ref,
                kind: capabilityParsed.kind,
                namespace: capabilityParsed.namespace,
                name: capabilityParsed.name,
                children: [{ type: 'text', value: ref }],
                data: {
                  hName: 'a',
                  hProperties: {
                    href,
                    className: ['doc-capability-link'],
                    'data-capability-ref': ref,
                  },
                },
              };
              segments.push(capabilityLinkNode);
            } else {
              // Try to parse as entity reference (m16 pattern)
              try {
                parseEntityRef(ref);

                // Valid entity reference - create custom node
                const entityLinkNode: EntityLinkNode = {
                  type: 'entityLink',
                  entityId: ref,
                  children: [{ type: 'text', value: ref }],
                  data: {
                    hName: 'span',
                    hProperties: {
                      className: ['doc-entity-link'],
                      'data-entity-ref': ref,
                    },
                  },
                };
                segments.push(entityLinkNode);
              } catch {
                // Invalid entity reference - keep as plain text
                segments.push({
                  type: 'text',
                  value: fullMatch,
                });
              }
            }
          } else {
            segments.push({
              type: 'text',
              value: fullMatch,
            });
          }

          lastIndex = matchStart + fullMatch.length;
        }

        // If we found any matches, replace the text node
        if (hasMatch) {
          // Add remaining text after last match
          if (lastIndex < text.length) {
            segments.push({
              type: 'text',
              value: text.slice(lastIndex),
            });
          }

          // Replace the text node with the segmented content
          parent.children.splice(index, 1, ...segments);
        }
      }

      // Recurse into children
      if (node.children) {
        node.children.forEach((child, i) => {
          walk(child as { type: string; value?: string; children?: unknown[] }, i, node as { children: unknown[] });
        });
      }
    }

    visitTree.children.forEach((child, i) => {
      walk(child as { type: string; value?: string; children?: unknown[] }, i, visitTree as { children: unknown[] });
    });
  };
}
