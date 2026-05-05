# Learned Rules

## Purpose

Record durable lessons that should affect future work. Keep this short and
evidence-based.

## Rules

- Do not use root or package lint scripts as read-only checks; they include
  `--fix` and can modify files.
- Treat local `docs/superpowers/` as a template source, not project policy.
- Use TypeORM entity property paths in query-builder test expectations unless
  implementation intentionally uses raw database column names.
- Keep harness changes separate from unrelated dirty business-code changes in
  reviews and commits.
- Reusable templates in this repo should start from CRM-specific defaults, not
  generic placeholders.
