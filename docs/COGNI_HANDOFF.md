# Cogni product and PR handoff

Updated: 9 October 2026. Canonical tracker: [PR #48](https://github.com/FALAK097/cogni/pull/48) and [product roadmap](./product-roadmap.md).

## Product direction

Cogni is an AI support agent with a shared human support inbox for small SaaS teams. Prioritize the continuous visitor → grounded answer/no-answer → human handoff → teammate reply → reviewed improvement journey. Keep primary destinations to Inbox, Agent, and Insights. Use the current product model, routes, design tokens, and Google-only authentication.

## Completed saved test history slice

Agent's saved tests support Run all with one or more checks. Completed suite runs record only workspace-scoped aggregate counts and an idempotency digest. Prompts, transcripts, evidence, model outputs, and provider payloads are excluded from history storage.

Insights shows saved test pass-rate snapshots for the latest 50 runs in the selected workspace/date range. The denominator includes passed and mismatch checks; errors and not-run checks are displayed separately. Edits can change the represented suite, so the chart is not a calibrated quality trend, confidence score, or live-conversation measure. Exports include saved run summaries.

The read API establishes workspace membership; writes require an owner. Responses use private/no-store caching. Input validation rejects duplicate case IDs and bounds suite/run sizes; the request body is capped at 1 MiB. Storage checks the complete saved suite/version and rejects changed suites and conflicting IDs without returning another workspace's record. History timestamps are normalized to ISO strings for the client contract.

Migration `0016_agent_test_suite_versions.sql` adds a nullable SHA-256 suite fingerprint. New runs fingerprint the validated saved-case IDs and edit timestamps; no test content is stored. Insights has a URL-backed all-suites/latest-suite-in-period comparison control, version and unversioned counts, and suite identity in exports. Filtering happens after the latest-50 cap. Legacy runs remain unversioned and are excluded from same-suite comparisons. Agent configuration and source revisions still are not captured, and this does not constitute calibrated answer-quality evaluation.

Migration `0015_agent_test_run_history.sql` adds `agent_test_run`, nonnegative/count-sum checks, workspace/creator foreign keys, and the workspace/date index. Do not apply it to production Neon without an explicit release instruction. A suite change after validation can still occur before the insert; the stored aggregate describes the suite checked at validation, not a locked evaluation baseline.

The existing PR already implements the main checkout's empty-state/loading improvements in updated form. Retain compact empty states, differentiated filter/first-use copy, content-shaped accessible skeletons, reduced-motion support, safe retries, and loaded content during background refresh.

## Conversation-to-test and knowledge-gap workflow

Owners can now convert customer questions into repeatable regression tests directly from Inbox triage and Insights knowledge-gap review:

- **Inbox:** Added a contextual "Create test" action to visitor message turns and a "Create test case" action to the conversation menu in `src/components/widget/conversation-detail.tsx`.
- **Insights:** Added a contextual "Create test" action alongside "Add answer" for negative feedback items and open knowledge gaps in `src/components/dashboard/dashboard-page.tsx`. Gaps with a `NO_SOURCE_MATCH` signal automatically default to the `no_evidence` expected outcome.
- **Test creation modal:** `CreateAgentTestCaseDialog` in `src/features/agent-tests/components/create-agent-test-case-dialog.tsx` provides bounded title and prompt editing with explicit redaction guidance for sensitive customer details, expected outcome selection (`grounded_answer`, `no_evidence`, `human_handoff`), and required-source selection (up to 4 indexed workspace sources).
- **Navigation alignment:** `WidgetCustomizer` in `src/components/widget/widget-customizer.tsx` synchronizes its active tab with window hash changes (`agentHref("test")` / `/agent#test`), enabling seamless deep linking from test creation toasts and triage directly into the Agent Test suite.
- **Validation and tests:** Added `buildAgentTestCaseFromQuestion` in `src/features/agent-tests/input.ts` with comprehensive unit and regression tests in `scripts/test-conversation-to-test.mjs` integrated into `pnpm test:agent-tests` (34/34 passing). React Doctor reported 100/100 across changed React components.

## Required-source retrieval checks

Migration `0017_agent_test_expected_sources.sql` adds an empty-by-default JSONB list of expected source IDs to saved cases. Owners can optionally require up to four ready sources for a sources-retrieved check. Case writes validate UUIDs, uniqueness, workspace ownership, and ready status. Deleted or unready selections remain visible for explicit removal. Source IDs travel only through authenticated preview evidence; title-only legacy evidence cannot satisfy an annotated case.

Individual checks and Run all require every selected document ID to appear in retrieved evidence. Additional retrieved sources are allowed. This is retrieval coverage, not a judge of answer correctness or citation faithfulness. Existing unannotated cases keep their behavior. Case edits advance their database timestamps, changing suite identity. Case write bodies are bounded to 16 KiB, and responses disable caching. PostgreSQL regression coverage includes foreign, unready, missing, and deleted sources and annotation removal. Preview-evidence transport checks now run in CI.

## Local verification

- Oxlint, TypeScript, Oxfmt across the repository, and diff checks passed.
- 48 focused Agent Test/history, source-evidence transport, preview isolation, and route permission tests passed for the required-source slice.
- A real PostgreSQL regression test covers concurrent duplicate saves, tenant isolation, suite-change rejection, date boundaries, and the ISO timestamp client contract. It runs in CI via `test:agent-test-history-db` and requires a local database URL.
- Drizzle generation found no schema/snapshot drift. All 18 migrations applied to a fresh disposable local database, `cogni_pr48_validation_20261009`.
- Widget bundling and Next.js production build passed with environment validation skipped. This proves compilation, not provider setup or customer acceptance.
- React Doctor reported 100/100 for the changed React files.

Recheck the PR head and current CI/deployment checks before treating these changes as deployed.

## Ongoing support-loop iteration

An active goal continues PR #48 through correctness, evaluation, and authenticated runtime acceptance. The widget response monitor now awaits its initial workspace-scoped state read before exposing model text and interrupts on resolved, escalated, paused, missing, or unreadable conversations. Subsequent checks remain once per second; this does not establish a zero-latency streaming takeover guarantee. Checks do not overlap, and response completion/cancellation stops polling and ignores an in-flight result.

Ten deterministic monitor regressions join the existing 12 SSE/SDK tests under `test:widget-stream`, including the public widget client rejecting interrupted responses without recording successful completion. The transcript/database concurrency suite remains the separate persistence gate.

AI persistence and channel delivery now independently reject `ESCALATED` conversations even if `aiPaused` is false. The check applies both to the atomic transcript UPDATE and the locked provider-delivery transaction; the channel intake also stops before agent work. A PostgreSQL regression verifies rejected AI appends, `recordAiMessage`, no provider call, and allowed teammate replies after escalation. This aligns final writes with the existing widget stream monitor and avoids relying on the pause flag alone.

Final model-answer persistence also opts into rejecting inactive conversations. If takeover, escalation, or closure wins the final database write after the last stream poll, the completion callback throws instead of acknowledging an unsaved answer. The agent completion fails before marking the run successful, and the existing SSE error path prevents the visitor client from treating partial text as a completed response. Local PostgreSQL-to-SSE regressions cover paused, escalated, and closed states. Fixed handoff notices keep their existing best-effort persistence path; this change applies to generated answers.

A repeatable opt-in synthetic model baseline now exercises production `streamWidgetAgent` with fixed retrieval fixtures and actions disabled. Live OpenAI `gpt-4o-mini` calls completed five cases using locally configured credentials, without touching application data or external actions. Source-injection testing exposed omission of a real policy contact address; the prompt now explicitly treats retrieved knowledge as untrusted reference facts and rejects assistant-directed commands inside it. A rerun recovered the correct address. See [baseline evidence](./validation/widget-agent-baseline-2026-10-09.md) for observed answers, review limits, and reproduction. This is provider/model evidence and an evaluation harness foundation, not calibrated production quality or retrieval/provider deployment proof.

## Checkout preservation

Implementation was reconciled in `/Users/falakgala/.codex/worktrees/cogni-pr48-complete/cogni`, branch `agent/pr48-complete`, based on PR head `c2af319`. Its grouped commit is pushed to `agent/omnichannel-agent-platform` after validation.

The original main checkout `/Users/falakgala/projects/cogni` remains at `df4818b` with its uncommitted UI refinements and local design/product documents. The original managed checkout `/Users/falakgala/.codex/worktrees/cogni-pr48-ux/cogni` remains at `c2af319` with its uncommitted saved-history slice. Neither original working tree was reset, cleaned, or staged. Compare ancestry and diffs before updating either checkout; do not apply their old patches blindly to the newer PR.

## Remaining release gates

A fresh collaborative browser tab recovered automation and verified the user's signed-in Vercel project dashboard and the latest preview landing page. Cogni's preview showed its Google sign-in page; clicking sign-in did not establish an authenticated app session. The desktop automation host subsequently disconnected and explicitly reported no available host. The sign-in attempt subsequently surfaced `Invalid origin`. A branch-specific Vercel Preview override now sets `BETTER_AUTH_URL` to `https://cogni-git-agent-omnichannel-agent-platform-falaks-projects.vercel.app`; the saved UI confirmed only `agent/omnichannel-agent-platform` is targeted. The `989b106` Preview deployment activated the override; a browser retry reached Google and confirmed `redirect_uri_mismatch` for the stable branch callback. The current Google Cloud browser account opens onboarding rather than the owning project; account/project clarification is pending. Authenticated desktop/mobile, keyboard/focus, and runtime UI acceptance remain unverified. Use the shared preview or Codex in-app browser, never external Chrome.

Production migration/provider readiness is a separate release action. The local database check does not prove the application database or Neon has migrations 0015–0017. Verify the deployed schema before accepting the saved history runtime.

[Issue #32](https://github.com/FALAK097/cogni/issues/32) remains open for its calibrated evaluation baseline and authenticated browser acceptance. The new history chart alone does not complete those gates. Do not add navigation or expand into unrelated helpdesk features to satisfy them.

Read `AGENTS.md` and the relevant Next.js docs in `node_modules/next/dist/docs/` before further changes. Preserve workspace membership boundaries and schema invariants. Complete related work before one grouped Conventional Commit; keep build, CI, deploy, provider setup, and browser evidence distinct.

## Independent review and preview auth

A fresh reviewer independently audited `c2af319..7d82173`, found no actionable defects, and reran 73 focused regressions, including real PostgreSQL concurrency/tenant and SDK-to-SSE failure checks. The verdict was Approve for the changed code, not GitHub approval or readiness acceptance.

Use the stable branch preview for Google OAuth testing. Its callback URI is `https://cogni-git-agent-omnichannel-agent-platform-falaks-projects.vercel.app/api/auth/callback/google`. Google must register that exact URI for the Preview OAuth client. Merely trusting preview origins while retaining a different auth base URL does not establish a working callback/session. Do not allow `*.vercel.app`, disable origin checking, or share production cookies as a workaround. Production environment settings and database migrations were not changed.

Better Auth's [dynamic-base-URL guidance](https://better-auth.com/docs/guides/dynamic-base-url) explains strict host validation; its [OAuth Proxy guide](https://better-auth.com/docs/plugins/oauth-proxy) requires coordinated plugin/version/secret setup on both callback and preview servers. No OAuth proxy was installed: this PR's preview uses its own stable callback host.
