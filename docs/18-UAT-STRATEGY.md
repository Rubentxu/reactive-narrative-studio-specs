# UAT Strategy — Updated

## Principle

Milestones advance on observable user outcomes, not merged code.

## Existing UAT families

- Project
- Narrative
- Agent
- Visual
- Publishing
- Reader
- Control Plane

## Control Plane UAT additions

### Serverless
Static application can open a project/snapshot with no application backend.

### Contract
Invalid/stale projection is diagnosed correctly.

### Catalog
Project and entity relations/annotations resolve.

### Entity composition
Story/Visual/UAT features can contribute to one entity page without direct
feature coupling.

### Search
Search indexes content from independent collators and filters by project/type.

### Docs
Markdown is rendered safely; script/unsafe HTML fixtures do not execute.

### Graph
Large fixture renders through a scoped lens without universal graph lockup.

### Recipe parity
CLI and frontend wizard consume the same recipe schema.

### Multi-project
Two independent projects can appear in Studio Home without shared runtime DB.

## Evidence

Playwright UAT should capture:
- trace/steps;
- screenshots;
- console errors;
- network log;
- loaded schema versions.

For serverless UAT, a pass requires no mandatory application API call.

## Accessibility acceptance

At minimum:
- keyboard navigation;
- visible focus;
- accessible dialog behavior;
- semantic headings/tabs;
- no critical axe-class violations in core flows where tooling is integrated.

## Security acceptance

Fixtures:
- malicious Markdown;
- malformed projection;
- path traversal attempt in snapshot;
- unknown extension ID.

Expected:
- sanitized/rejected;
- no arbitrary script execution.
