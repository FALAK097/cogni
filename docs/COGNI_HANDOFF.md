# Cogni product and PR handoff

Updated: 9 October 2026. Canonical tracker: [PR #48](https://github.com/FALAK097/cogni/pull/48) and [product roadmap](./product-roadmap.md).

## Product direction

Cogni is an AI support agent with a shared human support inbox for small SaaS teams. Prioritize the continuous visitor → grounded answer/no-answer → human handoff → teammate reply → reviewed improvement journey. Keep primary destinations to Inbox, Agent, and Insights. Use the current product model, routes, design tokens, and Google-only authentication.

## Completed saved test history slice

Agent's saved tests support Run all with one or more checks. Completed suite runs record only workspace-scoped aggregate counts and an idempotency digest. Prompts, transcripts, evidence, model outputs, and provider payloads are excluded from history storage.

Insights shows saved test pass-rate snapshots for the latest 50 runs in the selected workspace/date range. The denominator includes passed and mismatch checks; errors and not-run checks are displayed separately. Edits can change the represented suite, so the chart is not a calibrated quality trend, confidence score, or live-conversation measure. Exports include saved run summaries.

The read API establishes workspace membership; writes require an owner. Responses use private/no-store caching. Input validation rejects duplicate case IDs and bounds suite/run sizes; the request body is capped at 1 MiB. Storage checks the complete saved suite/version and rejects changed suites and conflicting IDs without returning another workspace's record. History timestamps are normalized to ISO strings for the client contract.

Migration `0015_agent_test_run_history.sql` adds `agent_test_run`, nonnegative/count-sum checks, workspace/creator foreign keys, and the workspace/date index. Do not apply it to production Neon without an explicit release instruction. A suite change after validation can still occur before the insert; the stored aggregate describes the suite checked at validation, not a locked evaluation baseline.

The existing PR already implements the main checkout's empty-state/loading improvements in updated form. Retain compact empty states, differentiated filter/first-use copy, content-shaped accessible skeletons, reduced-motion support, safe retries, and loaded content during background refresh.

## Local verification

- Oxlint, TypeScript, Oxfmt across the repository, and diff checks passed.
- 37 focused Agent Test/history, analytics range/aggregation, Insights URL-state, and spreadsheet-export tests passed.
- A real PostgreSQL regression test covers concurrent duplicate saves, tenant isolation, suite-change rejection, date boundaries, and the ISO timestamp client contract. It runs in CI via `test:agent-test-history-db` and requires a local database URL.
- Drizzle generation found no schema/snapshot drift. All 16 migrations applied to a fresh disposable local database, `cogni_pr48_validation_20261009`.
- Widget bundling and Next.js production build passed with environment validation skipped. This proves compilation, not provider setup or customer acceptance.
- React Doctor reported 100/100 for the changed React files.

Recheck the PR head and current CI/deployment checks before treating these changes as deployed.

## Checkout preservation

Implementation was reconciled in `/Users/falakgala/.codex/worktrees/cogni-pr48-complete/cogni`, branch `agent/pr48-complete`, based on PR head `c2af319`. Its grouped commit is pushed to `agent/omnichannel-agent-platform` after validation.

The original main checkout `/Users/falakgala/projects/cogni` remains at `df4818b` with its uncommitted UI refinements and local design/product documents. The original managed checkout `/Users/falakgala/.codex/worktrees/cogni-pr48-ux/cogni` remains at `c2af319` with its uncommitted saved-history slice. Neither original working tree was reset, cleaned, or staged. Compare ancestry and diffs before updating either checkout; do not apply their old patches blindly to the newer PR.

## Remaining release gates

The collaborative in-app browser reached Vercel's login gate when opening the protected preview. Authenticated desktop/mobile, keyboard/focus, and runtime UI acceptance remain unverified. Use the shared preview or Codex in-app browser, never external Chrome.

Production migration/provider readiness is a separate release action. The local database check does not prove the application database or Neon has migration 0015. Verify the deployed schema before accepting the saved history runtime.

[Issue #32](https://github.com/FALAK097/cogni/issues/32) remains open for its calibrated evaluation baseline and authenticated browser acceptance. The new history chart alone does not complete those gates. Do not add navigation or expand into unrelated helpdesk features to satisfy them.

Read `AGENTS.md` and the relevant Next.js docs in `node_modules/next/dist/docs/` before further changes. Preserve workspace membership boundaries and schema invariants. Complete related work before one grouped Conventional Commit; keep build, CI, deploy, provider setup, and browser evidence distinct.
