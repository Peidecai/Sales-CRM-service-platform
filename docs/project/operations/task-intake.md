# Task Intake

## Purpose

Translate informal requests into a bounded task before implementation.

## Intake Checklist

Record these before substantial work:

- task type: bugfix, feature, refactor, docs, test, release, audit
- target package or module
- owned paths
- acceptance criteria
- verification commands
- known risks or protected areas
- whether a spec or plan is required

## Fast Path

Use a fast path only when all are true:

- the task is narrow and low risk
- owned paths are clear
- no database, auth, payment, deployment, AI, or cross-package contract changes
- verification can be done with targeted type checks or tests

## Plan Required

Write a plan when the task:

- touches more than one package
- changes database schema, API contracts, auth, RBAC, audit, payment, AI,
  deployment, or background jobs
- has unclear acceptance criteria
- requires multi-step frontend/backend coordination
- changes generated artifacts or build tooling

## Output

For each task, final delivery should state:

- what changed
- what was verified
- what remains unverified
- any follow-up required before acceptance
