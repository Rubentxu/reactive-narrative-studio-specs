/**
 * useCapabilityManifest — React hook returning the cached CapabilityManifest.
 *
 * Synchronous, memoized, zero side-effects.
 * The manifest is computed once at module init and cached in the manifest module.
 * This hook just returns the cached value via useMemo.
 *
 * m10 invariant: no useEffect (zero side-effects), no async.
 */

import { useMemo } from 'react';
import { capabilityManifest } from './manifest';
import type { CapabilityManifest } from './manifest';

/**
 * Returns the CapabilityManifest synchronously.
 * The manifest is build-time static; this hook just provides React integration.
 */
export function useCapabilityManifest(): CapabilityManifest {
  return useMemo(() => capabilityManifest, []);
}
