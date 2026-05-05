# Project Operating Mode

## Active Mode

`progressive`

## Why

This is an existing multi-package CRM codebase with many backend modules,
partial module documentation, deployment assets, and a real test suite. A
lightweight mode is too optimistic for broad changes, while a multi-agent mode
is unnecessary until a task clearly has independent workstreams.

## How Progressive Mode Works Here

- Small, low-risk fixes can proceed with short intake, targeted edits, and
  targeted verification.
- Feature work needs task intake and at least a short written plan.
- Cross-package work, auth/security/data/migration changes, and release work
  need explicit spec or plan artifacts.
- If current repo state is unclear, write or update a repo-state or brownfield
  audit before touching code.
- If work is interrupted, write a handoff note under `memory/session-handoffs/`.

## Escalation Triggers

Escalate from a lightweight task loop to a written spec or plan when the task:

- touches more than one package
- changes database schema or migrations
- affects auth, RBAC, audit logging, payment, deployment, or AI behavior
- changes public API contracts
- requires frontend and backend coordination
- has unclear acceptance criteria
- cannot be verified by a small targeted test command
