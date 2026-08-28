# Security, Privacy and Rights

## Secrets

Never persist provider credentials in:
- Git;
- graph objects;
- JSONL events;
- prompts;
- projection files.

Use environment variables or secret-provider references.

## Untrusted external content

Any imported external content SHOULD be marked with provenance/trust level.

Agent tools that fetch external data SHOULD treat it as untrusted.

## Child-reader privacy

For reader UAT:
- use anonymous reader IDs;
- avoid names, birthdays, addresses and unnecessary personal data;
- store only feedback needed for editorial evaluation;
- make raw feedback deletable.

## Local-only mode

`provider_policy=local_only` MUST make a network provider call a validation error, not a suggestion.

## AI provenance

Track enough information to:
- identify AI-generated vs assisted assets;
- answer platform disclosure questions;
- reproduce/reference generation conditions where possible.

## Copyright-aware style policy

Visual skills SHOULD describe visual properties:
- medium;
- line;
- palette;
- lighting;
- composition;

rather than instructing direct imitation of a living artist.

## Source/reference rights

Each reference asset SHOULD optionally track:
- owner/source;
- license;
- allowed use;
- derivative restrictions.

## Publishing responsibility

The system can prepare reports/preflight, but the author remains responsible for:
- rights;
- platform terms;
- legal disclosure;
- final publication decisions.
