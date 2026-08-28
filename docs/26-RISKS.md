# Risk Register

| ID | Risk | Impact | Mitigation |
|---|---|---:|---|
| R-01 | ActiveGraph churn | High | adapter boundary, pin version, contract tests |
| R-02 | Character image drift | High | visual DNA, refs, QA, provider spike |
| R-03 | Multi-character generation | High | capability routing, layered approach, spike |
| R-04 | Agent prompt/skill duplication | Medium | SkillRegistry, one source of method |
| R-05 | Skill explosion | Medium | broad skills + references |
| R-06 | Overengineering | High | emergent architecture gates |
| R-07 | Git repo binary bloat | Medium | LFS/approved-only/content addressing |
| R-08 | Event log noise | Medium | event taxonomy/projection/retention |
| R-09 | Synthetic reader false confidence | High | label as synthetic, calibrate vs human |
| R-10 | Readability metric misuse | Medium | informational signals only |
| R-11 | Provider lock-in | High | capabilities + ports |
| R-12 | Local GPU limitations | Medium | hybrid routing, draft/final policies |
| R-13 | SaaS price changes | Medium | cost telemetry, alternative adapters |
| R-14 | IP/reference rights | High | provenance/licensing metadata |
| R-15 | Child UAT privacy | High | anonymous/minimal data |
| R-16 | Static Control Plane browser compatibility | Medium | snapshot fallback |
| R-17 | Build reproducibility | Medium | lock versions/hashes/source commit |
| R-18 | Story ontology too rigid | High | prose remains canonical creative text; structure only where useful |
| R-19 | Graph becomes hairball | Medium | scoped/moldable projections |
| R-20 | “AI writes everything” degrades authorship | High | human gates, candidate/accepted split |
