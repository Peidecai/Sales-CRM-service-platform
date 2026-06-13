# Native Outbound Transcription Intake

## Feature

Native mobile outbound calls with cloud transcription callback intake.

The CRM no longer depends on a cloud call provider to initiate calls. The miniapp
records local outbound call metadata, and the server uses that metadata to verify
and bind cloud transcription callback data to the correct customer call history.

## Users And Jobs

- Sales user: tap an assigned customer phone number in the miniapp, complete the
  native mobile call, and record the call result without manually linking the
  later transcription.
- Sales manager: review customer call history and AI summaries generated from
  transcript content.
- Backend operator: receive third-party transcription callbacks safely without
  reintroducing cloud-call initiation dependencies.

## Current Flow

Before this design, the CRM had two competing concepts:

- cloud call initiation and cloud call callback modules
- native mobile dialing plus manual after-call notes

The product direction is now native data intake only:

- miniapp customer detail calls `makeCall()` from
  `packages/miniapp/src/native/phone-call.ts`
- miniapp stores pending call state in
  `packages/miniapp/src/stores/call-state.ts`
- after-call submission uses
  `POST /call-records/native-outbound`
- transcription callback enters through
  `POST /recordings/transcription/callback`

## Proposed Flow

1. Sales user opens a customer detail page in the miniapp.
2. Sales user taps the assigned customer phone number.
3. Miniapp records:
   - `clientCallId`
   - `customerId`
   - `customerName`
   - customer outbound phone number
   - call start time
   - preferred SIM slot, when available
4. Miniapp opens the native phone dialer.
5. When the user returns to the miniapp, `App.onShow` records the return/end
   time and routes to the after-call page.
6. Sales user selects call result and notes.
7. Miniapp submits native outbound metadata to
   `POST /call-records/native-outbound`.
8. Server validates:
   - authenticated user is the caller
   - sales user owns the assigned customer
   - submitted customer phone matches the customer record
   - end time is not earlier than start time
9. Server creates a local `call_records` row as the source of truth.
10. Server enqueues a `cloud-transcription-match` job so any existing pending
    transcription callbacks can be retried against the new local record.
11. Cloud transcription provider later posts the callback to
    `POST /recordings/transcription/callback`.
12. Server verifies the callback signature, parses the documented payload, and
    stores the raw callback in `cloud_transcription_callbacks`.
13. Server matches callback data to a local call record.
14. If exactly one match exists, server writes:
    - `recording_files`
    - `asr_tasks`
    - `call_transcripts`
15. Server enqueues `call-summary`, which runs existing AI call analysis.

## Matching Rules

The local outbound `call_records` row is the source of truth. Cloud transcription
data is supplementary.

Matching order:

1. Direct match by `call_records.provider_call_id = callback.callSid`.
2. Fuzzy match against native outbound call records:
   - `call_type = manual`
   - `provider_call_id` is null/empty or equals the callback `callSid`
   - `call_at` falls inside the callback request/start-time window
   - duration or estimated duration is within tolerance when available
3. If exactly one candidate exists, bind the callback.
4. If zero candidates exist, mark callback `pending` and schedule retry.
5. If multiple candidates exist, mark callback `ambiguous` and do not write
   transcripts to customer history.

Config knobs:

- `CLOUD_TRANSCRIPTION_MATCH_WINDOW_MS`, default `600000`
- `CLOUD_TRANSCRIPTION_MATCH_DURATION_TOLERANCE_SECONDS`, default `120`
- `CLOUD_TRANSCRIPTION_PENDING_MATCH_LOOKAHEAD_MS`, default `7200000`
- `CLOUD_TRANSCRIPTION_CALLBACK_TIMESTAMP_TOLERANCE_MS`, default `900000`

## Callback Contract

Callback endpoint:

```text
POST /api/v1/recordings/transcription/callback?token=...&timestamp=...&sign=...
```

Required query fields:

- `token`
- `timestamp`
- `sign`

Required body fields:

- `bizDuration`
- `enableCallback`
- `requestTime`
- `result`
- `solveTime`
- `statusCode`
- `statusText`
- `taskId`
- `callSid`

Result segment fields:

- `beginTime`
- `channelId`
- `emotionValue`
- `endTime`
- `silenceDuration`
- `speechRate`
- `text`

Success response required by provider:

```json
{ "message": "success", "success": true, "code": 1, "data": true }
```

## UI States

- Empty: customer detail page shows no dial action when customer phone is absent.
- Loading: existing page loading states remain unchanged.
- Error: after-call save failure shows a miniapp toast and keeps pending state.
- Permission denied: server rejects sales users creating call records for
  unassigned customers.
- Success: after-call page clears pending state, emits `call-record-created`,
  and navigates back.

## API / Data Dependencies

- Miniapp:
  - `packages/miniapp/src/pages-sub/customer/detail.vue`
  - `packages/miniapp/src/pages-sub/call/after-call.vue`
  - `packages/miniapp/src/stores/call-state.ts`
  - `packages/miniapp/src/api/call-record.ts`
  - `packages/miniapp/src/native/phone-call.ts`
- Server API:
  - `POST /call-records/native-outbound`
  - `POST /recordings/transcription/callback`
- Server entities:
  - `call_records`
  - `cloud_transcription_callbacks`
  - `recording_files`
  - `asr_tasks`
  - `call_transcripts`
- Queues:
  - `cloud-transcription-match`
  - `call-summary`
- Migration:
  - `packages/server/database/migrations/1709000111000-CreateCloudTranscriptionCallbacks.ts`

## Data Model Notes

`call_records` stores the user-facing call history:

- `client_call_id`
- `customer_id`
- `user_id`
- `call_at`
- `duration`
- `estimated_duration`
- `call_type = manual`
- `call_result`
- `sim_slot`
- `sim_number`
- `provider_call_id`

`cloud_transcription_callbacks` stores callback intake state:

- `task_id`
- `call_sid`
- provider status
- callback request/solve times
- raw payload
- transcript text
- segment JSON
- matched call record id
- match status: `pending`, `matched`, `ambiguous`, `failed`
- match reason

## Failure Modes

- Invalid callback signature: reject with `{ success: false, code: 0 }` and do
  not write callback data.
- Malformed callback body: reject with `{ success: false, code: 0 }` and do not
  write callback data.
- Provider failed transcription: persist callback/task status, but do not write
  transcripts or enqueue AI analysis.
- No local call match: persist callback as `pending`, retry by task id, and retry
  again when a native outbound call record is created.
- Multiple local matches: persist callback as `ambiguous`; human review or a
  future manual bind tool is required.
- AI provider unavailable: `call-summary` queue retry/failure behavior follows
  the existing AI processor.

## Acceptance Criteria

- Sales user can tap a customer phone number and complete a native call.
- Server creates a call record using the authenticated user, not client-provided
  user identity.
- Server rejects a sales user creating a call record for an unassigned customer.
- Server rejects a submitted phone number that does not match the selected
  customer.
- Repeated native outbound submissions with the same `clientCallId` return the
  existing call record instead of creating duplicates.
- Valid transcription callbacks are persisted even when no call record matches.
- A unique callback match writes transcript segments to `call_transcripts`.
- Ambiguous callback matches do not alter customer call history.
- Matched transcripts enqueue AI call analysis.
- Callback and native outbound flows do not depend on the removed cloud-call
  initiation module.

## Verification

```powershell
pnpm --filter @crm/server test -- --runInBand test/call-record/call-record.service.spec.ts test/recording/cloud-transcription-callback.service.spec.ts test/common/middleware/sql-injection.middleware.spec.ts test/common/middleware/csrf.middleware.spec.ts
pnpm --filter @crm/server exec tsc -p tsconfig.json --noEmit
pnpm --filter @crm/miniapp type-check
pnpm --filter @crm/miniapp test -- src/stores/call-state.spec.ts
git diff --check
```

## Open Follow-Up

A future admin tool can expose `ambiguous` and long-lived `pending` callbacks for
manual binding. The current implementation prevents unsafe automatic writes and
keeps the callback payload available for later resolution.
