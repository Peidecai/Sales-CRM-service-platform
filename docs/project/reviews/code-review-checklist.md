# Code Review Checklist

Use this checklist before marking implementation as reviewed.

- Scope matches the task and owned paths.
- No unrelated user changes were reverted or reformatted.
- New or changed API contracts are reflected on both sides of the boundary.
- DTO validation, guards, and permission checks are appropriate.
- Sensitive fields are not returned or logged.
- Cache invalidation and audit behavior are preserved for write paths.
- Tests cover changed behavior or an explicit reason is recorded.
- Relevant type checks and tests passed with fresh evidence.
