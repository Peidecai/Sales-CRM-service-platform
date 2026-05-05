# CRM Takeover Readiness Template

## Date

Use current date in `YYYY-MM-DD`.

## Scope

CRM project, package, module, or active thread.

Examples:

- whole repo
- `packages/server/src/modules/customer`
- `packages/web/src/views/customer`
- `native outbound call transcription`

## Takeover State

Choose one:

- `not-ready`
- `ready-with-boundaries`
- `ready-for-docs-only`
- `ready-for-active-thread`
- `ready-for-broad-work`

## Evidence Reviewed

- root/package docs:
- source files:
- tests:
- migrations:
- Git state:
- verification commands:
- handoffs or memory:

## Allowed Lanes

- docs-only:
- checkpoint first:
- bounded implementation:
- broad implementation:

Mark each as allowed or blocked for this scope.

## Blocked Lanes

List blocked lanes and reasons. Common blockers:

- dirty worktree overlap
- failing tests
- stale docs
- missing migration evidence
- unclear acceptance criteria
- production or external provider dependency

## Verified

Fresh evidence only.

## Unverified

Likely true, present in code/docs, but not freshly proven.

## Unknown

Cannot honestly state yet.

## Next Safe Action

Smallest safe next step, with owned paths and verification command.
