# Project Brief

## Summary

CRM Sales Platform is a full-stack sales CRM system with backend APIs, a PC web
frontend, a miniapp frontend, shared TypeScript types, Docker deployment assets,
and AI-assisted sales workflows.

## Primary Capabilities

- authentication and RBAC
- customer, opportunity, contact, call-record, follow-up, and sales workflows
- audit logging and notifications
- AI call analysis, knowledge base, customer insights, and related reporting
- PC web app for operations and sales management
- uni-app miniapp for mobile sales scenarios

## Repository Shape

This is a pnpm workspace monorepo:

- `packages/server`
- `packages/web`
- `packages/miniapp`
- `packages/shared`

## Current Takeover Note

The project has substantial implemented code and tests, but documentation is
uneven. Package-level docs exist; module-level docs cover only part of the
backend. Use fresh code inspection and verification commands for task decisions.
