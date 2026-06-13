# QA Checklist

## Functional

- Primary happy path works.
- Permission-specific behavior works for affected roles.
- Empty, loading, error, and validation states are handled where applicable.
- Pagination, sorting, filtering, and export/import behavior are preserved when
  touched.

## Regression

- Existing related tests pass.
- Cross-package contracts still align.
- No generated-file noise is included unless intended.

## Evidence

Record:

- commands run
- manual flows checked
- skipped checks and reason
- residual risk
