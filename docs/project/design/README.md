# Design Docs

## Purpose

Use this directory for user-facing workflow design, feature interaction notes,
and scenario descriptions before implementation. Keep design docs grounded in
the existing CRM product shape: operational, dense, role-aware, and workflow
oriented.

## When To Add A Design Doc

Add a design doc when a task changes:

- a full page or multi-step workflow
- frontend/backend interaction contracts
- permission-dependent UI behavior
- miniapp offline or mobile field-sales behavior
- AI-assisted user decisions or generated content

Small bugfixes and isolated copy changes usually do not need a design doc.

## Current Product UX Direction

- PC web is an operational CRM surface: prioritize clarity, data density,
  predictable forms/tables, and efficient repeated actions.
- Miniapp is a mobile sales surface: prioritize short flows, offline tolerance,
  quick customer context, and clear status feedback.
- Do not add marketing-style landing pages for internal CRM workflows.

## Feature Designs

- [Native Outbound Transcription Intake](./native-outbound-transcription.md)
