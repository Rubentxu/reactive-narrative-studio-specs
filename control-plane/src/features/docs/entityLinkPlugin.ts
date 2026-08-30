/**
 * entityLinkPlugin — remark plugin that detects [[entityId]] text.
 *
 * Transforms [[entityId]] syntax into custom `entityLink` mdast nodes
 * that the rehype renderer can transform into proper links.
 *
 * Uses the existing parseEntityRef utility from the store module
 * to validate and parse entity references.
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

/**
 * Remark plugin that transforms [[entityId]] text into entityLink nodes.
 *
 * @example
 * ```markdown
 * See [[Character:demo/nora]] for details.
 * ```
 * Becomes an entityLink node with entityId "Character:demo/nora".
 */
export function entityLinkPlugin(): (tree: unknown) => void {
  return (tree: unknown) => {
    // Use unist-util-visit to traverse the tree
    // The tree is actually an mdast Root, but we use unknown to avoid type issues
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
          const entityId = match[1];
          const matchStart = match.index;

          // Add text before the match
          if (matchStart > lastIndex) {
            segments.push({
              type: 'text',
              value: text.slice(lastIndex, matchStart),
            });
          }

          // Try to parse the entity reference
          if (entityId) {
            try {
              parseEntityRef(entityId);

              // Valid entity reference - create custom node
              const entityLinkNode: EntityLinkNode = {
                type: 'entityLink',
                entityId,
                children: [{ type: 'text', value: entityId }],
                data: {
                  hName: 'span',
                  hProperties: {
                    className: ['doc-entity-link'],
                    'data-entity-ref': entityId,
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
