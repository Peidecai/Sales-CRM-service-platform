# Skill Bootstrap

## Required First Reads

Before substantial work, read:

1. `AGENTS.md`
2. `PROJECT_OPERATING_MODE.md`
3. `docs/project/operations/task-intake.md`
4. `docs/project/operations/delivery-contract.md`
5. Relevant package or module docs, such as `packages/server/CLAUDE.md`

## Local Template Source

`docs/` currently contains an external Codex harness template source. It is
ignored as product documentation except for project-owned paths under
`docs/project/`.

Do not copy more template files just because they exist. Add files only when the
project needs them and fill them from current repository facts.

## Missing Skill Fallback

If a workflow skill referenced by a task is unavailable:

- use `task-intake.md` for request translation
- use `planning-triggers.md` to decide whether a written plan is required
- use `delivery-contract.md` for completion language and evidence
- use `memory-policy.md` for durable notes and handoffs

## Command Safety

Prefer non-mutating commands for inspection. The repo lint scripts use `--fix`,
so do not run them merely to gather information.
