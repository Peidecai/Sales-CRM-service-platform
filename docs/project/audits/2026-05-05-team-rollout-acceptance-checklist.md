# Team Rollout Acceptance Checklist

## Rollout Summary

| Field              | Value                                                                     |
| ------------------ | ------------------------------------------------------------------------- |
| Project            | CRM Sales Platform                                                        |
| Reviewer           | Codex                                                                     |
| Review Date        | 2026-05-05                                                                |
| Selected Profile   | standard with selected full memory scaffolding                            |
| Embedding Strategy | control-only                                                              |
| Delivery State     | implemented / verified for previous type and unit baselines; not accepted |

## Root And Boundary Evidence

| Check                                           | Status | Evidence                                                                                                     |
| ----------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| `git repo root` is identified                   | Pass   | `D:/Develop/Sales CRM service platform/crm-sales-platform`                                                   |
| `project root` is identified                    | Pass   | same as git repo root                                                                                        |
| `runtime or command root` is identified         | Pass   | repository root for workspace commands; package roots for package-local commands                             |
| Dirty worktree state is recorded before rollout | Pass   | `git status --short --untracked-files=all` showed existing unrelated business changes on 2026-05-05          |
| Existing user changes are not overwritten       | Pass   | rollout edits are limited to project control docs, ignore rules, and prior targeted test expectation updates |

## Required Files

| Check                                                    | Status | Evidence                                                                                                                              |
| -------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `AGENTS.md` exists and reflects project reality          | Pass   | `AGENTS.md`                                                                                                                           |
| `PROJECT_OPERATING_MODE.md` exists                       | Pass   | `PROJECT_OPERATING_MODE.md`                                                                                                           |
| `docs/project/operations/task-intake.md` is filled       | Pass   | project-specific intake rules                                                                                                         |
| `docs/project/operations/delivery-contract.md` is filled | Pass   | project-specific delivery states and commands                                                                                         |
| `docs/project/operations/testing.md` is filled           | Pass   | includes Run From, read-only checks, mutating checks, and generated files                                                             |
| `docs/project/operations/memory-policy.md` is filled     | Pass   | project memory rules                                                                                                                  |
| `memory/MEMORY.md` exists                                | Pass   | project memory index                                                                                                                  |
| `.codex/prompts/**` exists                               | Pass   | prompt README and two project prompt helpers                                                                                          |
| CRM-specific templates are filled                        | Pass   | spec, plan, audit, design, handoff, topic, ADR, and incident templates use CRM package paths, roles, risks, and verification commands |

## Testing And Mutation Guard

| Check                                                        | Status | Evidence                                                          |
| ------------------------------------------------------------ | ------ | ----------------------------------------------------------------- |
| `testing.md` records `Run From`                              | Pass   | commands specify repository root                                  |
| `testing.md` separates read-only checks from mutating checks | Pass   | dedicated sections                                                |
| `testing.md` lists generated files                           | Pass   | generated-file section                                            |
| At least one read-only verification command ran              | Pass   | prior takeover run: shared/server/web/miniapp type checks passed  |
| Unit test verification ran                                   | Pass   | prior takeover run: server 1183, web 84, miniapp 125 tests passed |
| Worktree status after verification is reviewed               | Pass   | status reviewed; unrelated dirty business changes remain present  |

## Template Source Ownership

| Check                                                       | Status | Evidence                                                                     |
| ----------------------------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| Existing `docs/` directory is classified                    | Pass   | mixed: project-owned `docs/project/**` plus ignored external template source |
| External template source is not treated as project evidence | Pass   | `AGENTS.md` and takeover readiness note record this                          |
| Nested template `.git` is not accidentally committed        | Pass   | renamed to ignored `docs/.git.local-template-source/`                        |
| `superpowers/**` is not committed                           | Pass   | ignored by `.gitignore`                                                      |
| Project-owned docs and template source docs are separated   | Pass   | `docs/project/**` vs ignored template paths                                  |

## Commit Scope

| Check                                                     | Status | Evidence                                                                                      |
| --------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| Commit scope contains intended project-side control files | Pass   | `AGENTS.md`, `PROJECT_OPERATING_MODE.md`, `docs/project/**`, `memory/**`, `.codex/prompts/**` |
| Template source is excluded                               | Pass   | control-only strategy and `.gitignore`                                                        |
| Unrelated dirty worktree changes are listed separately    | Pass   | current status includes business code changes not created by this template rollout            |

## Delivery State

| Check                             | Status       | Evidence                                                           |
| --------------------------------- | ------------ | ------------------------------------------------------------------ |
| Delivery state is not overstated  | Pass         | rollout is not marked accepted                                     |
| `accepted` has owner confirmation | Not Verified | user has not explicitly accepted the rollout as final              |
| Missing verification is reported  | Pass         | E2E, production release, and production topology remain unverified |

## Decision

Accept With Follow-Ups.

## Follow-Ups

- Review and commit project-side control files separately from unrelated business changes.
- Run E2E and release smoke checks before any release claim.
- Consider adding topic memory files for deployment, domain terms, integration
  pitfalls, module quirks, and testing caveats as recurring evidence accumulates.
- Keep future templates project-specific. Do not reintroduce generic bracket
  placeholders except inside deliberate example snippets.
