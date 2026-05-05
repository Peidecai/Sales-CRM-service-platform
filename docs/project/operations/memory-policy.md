# Memory Policy

## Durable Memory

Use `memory/MEMORY.md` as the index for durable project knowledge. Use topic
files under `memory/topics/` only when a recurring issue or project convention
is worth preserving.

Repo-visible memory and fresh verification evidence outrank `.codex/local`
notes. Local notes are machine-specific orientation only.

## What To Record

Record:

- verified command baselines
- known flaky or hazardous areas
- project-specific rules not obvious from code
- handoffs for interrupted work
- corrections to stale docs that could mislead future work

Do not record:

- secrets or values from `.env`
- one-off command noise
- speculation that has not been verified
- generic language or framework knowledge

## Raw Memory Logs

Use `memory/observations.jsonl` and `memory/corrections.jsonl` only for stable,
evidence-backed entries. Keep entries JSONL and avoid secrets.

## Handoffs

If work is interrupted, create a handoff under `memory/session-handoffs/` using
the handoff template. Include objective, current state, changed paths, commands
run, and the next safe action.
