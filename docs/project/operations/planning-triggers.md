# Planning Triggers

## Always Plan

Use an explicit written plan before implementation for:

- database migrations or data repair
- auth, JWT, RBAC, permissions, audit logging, and data masking
- payment, contract, approval, signing, and customer ownership flows
- AI provider behavior, embedding/vector storage, or queue processors
- deployment, Docker, Kubernetes, Nginx, or production environment changes
- cross-package API contract changes
- broad refactors or module reorganizations

## Usually Plan

Use a short plan for:

- new backend endpoints
- new frontend views or workflows
- miniapp pages touching offline behavior
- changes that require both server and client updates
- test infrastructure changes

## Plan Can Be Skipped

A plan can be skipped for small documentation edits, single-test expectation
updates, or isolated bugfixes with obvious verification.

## Plan Contents

Plans should include:

- objective and non-goals
- owned paths
- implementation steps
- verification commands
- rollback or containment notes if risk is high
