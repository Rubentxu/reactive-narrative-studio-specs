# SCM, Evidence and Provenance

## Git as project history

Git captures source evolution. It is not the sole runtime event log.

Use:
- Git commits for coherent project changes/checkpoints;
- JSONL events for fine-grained runtime evidence;
- decisions for accepted human choices;
- receipts for validation/build evidence.

## Candidate vs accepted

```text
generated candidate
      |
 human/approved policy
      |
      v
accepted asset/canon
```

Generated candidates SHOULD be cheap to delete.

## AI provenance

Track:
- text origin category;
- image generation provider/model;
- prompt/request hash;
- references;
- edits;
- human approval.

Suggested text categories:
- human-authored;
- AI-assisted;
- AI-generated-candidate;
- accepted-after-human-edit.

Do not invent legal percentages.

## Asset strategies

### approved-only
Git/LFS retains only accepted/reference assets.

### full-history
Git LFS retains candidates too.

### external
Binary store outside Git; source tracks hashes/URIs.

## Secrets

API keys MUST NOT enter:
- Git;
- event payloads;
- prompts;
- graph objects.

Use environment/secret adapters.

## Supply-chain mindset

Pin:
- ActiveGraph;
- skill packs;
- domain packs;
- Comfy workflows;
- Typst;
- critical templates.

Record hashes in lockfile.

## Time travel

Git tags/checkpoints + ActiveGraph fork/replay SHOULD support:
- compare manuscript milestone;
- compare visual bible versions;
- inspect UAT state at a release candidate.

## KDP/marketplace disclosure

Publishing adapters SHOULD produce an AI-content provenance summary so the author can complete platform disclosure requirements with recorded evidence instead of memory.
