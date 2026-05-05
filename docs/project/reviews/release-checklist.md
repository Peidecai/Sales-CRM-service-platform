# Release Checklist

Use this only for release or deployment work.

- Build commands pass for affected packages.
- Server migrations are reviewed and rollback implications are understood.
- Environment variables are documented without exposing secrets.
- Swagger/API surface is acceptable for the environment.
- Frontend and backend URLs/CORS settings are correct.
- Smoke tests cover login and the affected workflow.
- Deployment artifacts and target environment are identified.
- Rollback or mitigation path is documented.
