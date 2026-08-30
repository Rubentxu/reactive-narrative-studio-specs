# Control Plane — Slice 1

A static TypeScript/React SPA for the Reactive Narrative Studio.

## Prerequisites

```bash
node --version   # must be >= 24.0.0
cd control-plane
pnpm --version   # must be 11.9.0 (self-managed via packageManager pin)
```

## Install

```bash
pnpm install
```

## Build

```bash
pnpm build      # Produces static dist/ bundle
```

## Test

```bash
pnpm test       # Runs Vitest in node environment
```

## Preview

```bash
pnpm preview    # Serves dist/ on http://localhost:4173
```

## Loading a Project

1. Run `pnpm preview`
2. Open http://localhost:4173
3. Use the file picker to load a snapshot or directory

## Architecture

- **Loader**: `src/loader/` — `SnapshotProjectSource` + `DirectoryProjectSource`
- **Schema**: `src/schema/` — Ajv2020 registry, lazy compilation
- **Store**: `src/store/` — Zustand slice (the bottleneck)
- **Views**: `src/views/` — 5 views reading from the store
