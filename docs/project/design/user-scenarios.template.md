# CRM User Scenarios Template

## Scenario

`<role> completes <CRM job>`

## Primary Actor

Choose one or more:

- Admin
- Manager
- Sales
- Miniapp/mobile user
- Background/system actor

## Preconditions

- authenticated user and role:
- required customer/opportunity/call/record data:
- environment variables or provider config:
- network/offline state:
- existing dirty worktree or feature flag:

## Steps

1. Open the relevant CRM entry point.
2. Perform the business action.
3. Confirm the expected UI/API/data result.

Replace these with concrete CRM steps.

## Expected Result

- UI:
- API response:
- database state:
- audit/log/cache/queue:
- notification or AI result:

## Edge Cases

- no permission
- missing required data
- validation error
- duplicate or stale data
- provider failure
- offline retry, if miniapp
