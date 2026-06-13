# Agent Authority

## Allowed Without Further Approval

The agent may:

- inspect files and run non-destructive commands
- update project governance docs under `docs/project/`, `memory/`, and `.codex/`
- make narrow code or test fixes requested by the user
- run targeted type checks and test commands
- add focused tests for changed behavior

## Requires Explicit Care And Usually A Plan

The agent may proceed after a plan when work touches:

- database migrations or production data
- auth, RBAC, audit, security, payment, contracts, approvals, or deployment
- public API contracts
- cross-package workflows
- large UI or architecture changes

## Not Allowed Without Explicit User Direction

The agent must not:

- delete or rewrite unrelated user changes
- run destructive git operations such as hard reset or checkout of user files
- commit, push, deploy, or publish artifacts unless asked
- expose secrets from `.env` files
- treat stale docs as proof of completion

## Dirty Worktree Rule

If unrelated changes are present, preserve them. If changes overlap with the
current task, inspect carefully and work with them rather than reverting them.
