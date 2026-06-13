# System Context

## Runtime Components

- Browser users interact with the Vue web app.
- Mobile users interact with the uni-app miniapp / WeChat mini program.
- Both frontends call the NestJS backend API.
- Backend stores relational data in MySQL.
- Redis supports caching, queues, blacklists, and realtime support paths.
- Bull handles background work such as AI summaries.
- AI integrations use provider-specific configuration and may require secrets.

## Deployment Context

Docker Compose and deployment folders exist for local and production-style
deployment. Nginx, MySQL, Redis, backend, and frontend assets are represented in
the deployment files.

## Unknowns

- Current production topology and live environment credentials are not verified.
- E2E status was not verified during the first takeover pass.
- External AI provider availability depends on environment configuration.
