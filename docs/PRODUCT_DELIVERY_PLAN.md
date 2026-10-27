# Cogni product delivery plan

Updated: 27 October 2026. This plan turns the existing [product roadmap](./product-roadmap.md) and [opportunities](./product-opportunities.md) into independently reviewable product releases. It does not replace either document's engineering status or release gates.

## Product direction

Cogni serves small SaaS support teams that need one dependable loop: prepare knowledge, test an AI agent, publish it to a website, handle exceptions with a teammate, and use reviewed failures to improve the next answer. The product's advantage should come from keeping AI behavior explainable and controllable inside a usable shared inbox, not from matching every competitor checkbox.

Keep the product's existing visual identity and familiar interaction patterns. Use competitor research to inform onboarding, states, mobile behavior, operator workflows, and deployment. Do not copy another product's colors, brand, or private UI.

### Competitor evidence and product implications

Research below uses official public product and deployment material reviewed on 26 October 2026. It identifies product claims and documented setup, not independently measured performance or hands-on private dashboard behavior.

| Reference                                      | Useful pattern for Cogni                                                                                                                | Self-host evidence and limit                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Chatwoot](https://www.chatwoot.com/features)  | Mature shared inbox: assignment, notes, labels, automation, customer context, reporting; also native agent apps.                        | [Community edition](https://www.chatwoot.com/pricing/self-hosted-plans) is self-hostable. Its [deployment guide](https://www.chatwoot.com/deploy) documents Linux, Docker and Kubernetes paths. Requirements vary by guide; use the current deployment page for sizing.                                                                                     |
| [Crisp](https://crisp.chat/en/)                | A cohesive support suite: inbox, channels, workflows, knowledge, customer context, integrations, and polished operator/mobile surfaces. | Official product pages reviewed describe a managed service; no supported whole-platform self-host installation guide was found. Its [“self-hosted” AI](https://crisp.chat/en/chatbot/crisp-self-hosted/) means Crisp hosts and operates private inference, not that customers run the support platform. Private app-hosting arrangements remain unverified. |
| [Chatbase](https://www.chatbase.co/docs)       | Clear agent lifecycle: add knowledge, configure, test, deploy, monitor; tools/actions, handoff, and testable behavior.                  | Public docs reviewed describe managed accounts and deployments; no supported self-host guide was found. Private/enterprise arrangements are unverified.                                                                                                                                                                                                     |
| [Cossistant](https://cossistant.com/docs/what) | Open-source, code-owned React support UI and an AI-native agent/inbox workflow; strong developer integration patterns.                  | Its [self-host guide](https://cossistant.com/docs/self-host) documents a multi-service install and says production requires manual setup. Storage, [email](https://cossistant.com/docs/self-host/email-setup), analytics, billing, and job delivery each add operations. A guide is not evidence of production maturity.                                    |

Product implications:

- Make the operator inbox and visitor widget usable at narrow widths, with separate acceptance for each.
- Make first value a guided sequence: add a source, inspect/test an answer, publish, install, receive a question, and complete a human reply.
- Keep the agent testable, show evidence, make handoff state truthful, and never claim resolution from silence or closure alone.
- Turn self-host setup into a supported product workflow with documented dependencies, diagnostics, backups, upgrades, and recovery.
- Prioritize a standard Linux VPS deployment first. Treat a Cloudflare Worker app runtime as a separate compatibility project. Running Cloudflare DNS, Tunnel, R2, or the existing ingestion worker alongside a VPS deployment does not make the Next.js app Worker-compatible.
- Choose channel and support-operation work from observed customer friction; do not implement breadth solely to match a feature matrix.

## Existing work and sequencing constraints

PR [#48](https://github.com/FALAK097/cogni/pull/48) is the active broad platform foundation (Inbox, Agent, Insights, integrations, knowledge, deployment, and support workflows). Keep it distinct from follow-up PRs and refresh its CI, preview, and owner-setup state before treating any release gates as closed. The current checkout also has uncommitted design/product work. Review and reconcile that work separately; do not silently stage it into a phase branch.

Waitlyze's [foundation PR #88](https://github.com/FALAK097/waitlyze/pull/88) and [product PR #89](https://github.com/FALAK097/waitlyze/pull/89) are process references: research and a stable foundation were separated from product implementation, with an explicit merge order and evidence in each PR. Apply that planning discipline to Cogni's dependencies and product model; do not copy Waitlyze's visual design or waitlist-specific features.

The repository's existing roadmap already records the core support loop and many implemented foundations. The phases below close remaining acceptance gaps and define new investment; they are not a claim that every listed gap is still open. Each implementation PR must refresh the evidence table before scope is finalized.

## Delivery phases and PR boundaries

Phases are sequenced by dependency. Each phase can contain several narrow PRs; a PR should deliver a complete user-visible slice and merge only after its prerequisite branch is available. Prefer the current design work where it passes review and acceptance. All UI changes must preserve the existing product model and work at mobile widths. A dependent follow-up starts at the exact accepted prerequisite head and sets that prerequisite branch as its GitHub base, so its diff stays narrow. If the prerequisite merges first, rebase or retarget the follow-up to `main`. Independent work targets `main` after confirming its dependencies are there.

### Phase 0 — Foundation and design acceptance

**Purpose:** establish an honest release baseline on top of PR #48 and reconcile the current in-progress UI work.

- Refresh PR #48 head, CI, review findings, preview, migrations, and remaining provider setup.
- Reconcile stale roadmap status rows (including ticket lifecycle) against later completion notes and current PR/CI evidence.
- Review the uncommitted design refresh as a coherent candidate; preserve unrelated generated/design files and submit only an explicitly scoped slice.
- Walk the visitor-to-grounded-answer-to-human-reply journey, including failure recovery, workspace isolation, and narrow-screen behavior.
- Maintain separate proof for local checks, CI, provider configuration/deployment, authenticated desktop/mobile browser behavior, and customer acceptance.

**Exit:** no duplicate platform work; each claim has current evidence; the accepted core journey has an owner and reproducible checks. OAuth/provider setup that needs account-owner action stays explicit.

### Phase 1 — Mobile-first support experience

**PR slices:** (1) visitor widget narrow-screen and keyboard behavior; (2) operator Inbox triage, conversation detail, and reply at phone widths; (3) responsive Agent setup and source management only where the audit finds real friction. Keep changes in existing routes and shared primitives.

**Acceptance:** at 320, 390, and desktop widths, no horizontal page overflow; navigation, conversation selection, composer, attachments, takeover, and status are reachable and clear; software keyboard/safe-area behavior does not hide the active composer; keyboard and screen-reader paths remain usable; no destructive action depends on hover. Verify an authenticated Inbox session and a real widget round trip where available. Screenshots alone do not prove interaction.

**Dependency:** Phase 0 baseline and a reviewable UI change set. Do not duplicate uncommitted work before its contents and tests are reconciled.

### Phase 2 — Reviewed AI improvement loop

**PR slices:** (1) define stable, privacy-bounded source revisions (content hash/version, lifecycle, deletion behavior, and legacy/unsupported-source handling); (2) attach reproducible evaluation context (agent/config version, source revisions, model/settings, suite identity) to new test runs; (3) link an explicit failure signal to an owner-reviewed improvement item; (4) compare affected saved cases before publish and preserve rollback semantics. Keep generated edits as drafts. Isolate provider side effects from test runs.

**Acceptance:** a teammate traces a reviewed failure to its source/configuration, edits a draft, replays relevant cases, sees before/after evidence, and approves publication; unchanged legacy records remain correctly labeled; cross-workspace data is inaccessible; tests do not send messages, create bookings, or execute other external actions. Source retrieval coverage is not represented as proof of answer correctness.

**Dependency:** agent publication versions, saved tests, and Phase 0 core-loop acceptance. Phase 2 slice 1 establishes the source-revision contract before test-run metadata or impact comparisons depend on it.

**Merge blocker:** Cloudflare may accept a provider item upload before the source revision transaction commits. A process crash in that window can leave an item under a revision-specific key that was never persisted, so neither the cleanup outbox nor immediate compensation can discover it. Keep the source lifecycle change draft-only until Cloudflare provides verified idempotent overwrite/discovery semantics for the chosen item key, or a durable intent/reconciliation design closes this crash window. Do not claim atomic provider erasure.

### Phase 3 — Dependable team operations

Select work with design partners. Candidate PRs are (1) business hours and time-zone-correct SLA measurement; (2) capacity-aware routing and collision handling; (3) operational reporting with clear denominators and export. Existing tickets, assignment, saved views, snooze, labels, and notes should be extended before adding parallel concepts.

**Acceptance:** agents can handle a working day without manual spreadsheet workarounds; ownership and timers remain correct through reassignment, reopen, and time-zone boundaries; reports reconcile to workspace-scoped durable records; each workflow has an audit/recovery path.

**Dependency:** Phase 0 usage evidence and repeated partner demand. Do not ship a large helpdesk suite based only on competitors' feature lists.

### Phase 4 — Supported self-hosting on a Linux VPS

**PR slices:** (1) provider/runtime dependency inventory and supported configuration contract; (2) Docker image and Compose stack with PostgreSQL, health/readiness, migrations, and persistent storage; (3) replace or explicitly document Cloudflare-only search/job/storage dependencies and provide a supported alternative where feasible; (4) operator setup, backups/restore, upgrades/rollback, TLS, secrets, troubleshooting, and a reproducible clean-install verification.

The current application targets the Vercel Node.js runtime and uses PostgreSQL/Neon, Cloudflare R2, Cloudflare AI Search, and a Cloudflare Queue worker; local mode has some different paths. Therefore, a Compose file alone is not a self-host release. Specify what remains a paid external provider (Google OAuth, AI/model keys, email, integrations) and what can be disabled. Do not imply that Cloudflare credentials are unnecessary until every runtime path is proven.

**Acceptance:** a clean Linux host can install using documented steps, run health checks and database migrations, ingest and retrieve knowledge, serve the widget, handle human replies, restart without losing durable data, restore from backup, and upgrade with a documented rollback. CI runs the documented compose smoke path. Limits and external-service requirements are visible before setup.

**Dependency:** provider abstraction/configuration contract and an accepted core workflow. VPS is first because Node APIs, PostgreSQL, PDF parsing, and the existing worker architecture align more directly with a conventional container host.

### Phase 5 — Cloudflare deployment compatibility

**PR slices:** (1) compatibility inventory and deployable proof-of-concept; (2) only if viable, isolate Node-only fetch/PDF/storage/search/job functions behind runtime-safe adapters; (3) publish a supported deployment recipe after end-to-end acceptance. Evaluate Cloudflare's current official Next.js guidance and runtime limits at implementation time; do not choose a beta adapter based solely on a successful compile.

**Acceptance:** clean deployment and migrations; durable sessions, Postgres access, storage, search, ingestion/background work, streaming, and human takeover work under the selected runtime; cold start, execution limits, logs, and service costs are documented. If any requirement depends on a separately hosted service, state that clearly. A failed compatibility spike is a useful stopping result, not a reason to claim support.

**Dependency:** Phase 4's provider boundary and a runtime spike. The current source includes Node APIs (`node:dns/promises`, `node:http`/`https`, `node:module`, `node:fs/promises`); treat portability as unproven.

### Phase 6 — Channel and ecosystem expansion

Choose one customer-requested channel at a time, likely email only if design-partner evidence confirms it. Each channel gets separate PRs for tenant-bound connection/setup, inbound verification, outbound response/delivery states, retries/reconciliation, handoff, and operator-visible health. Keep API keys/signed webhooks and public help-center publishing as separately scoped releases.

**Acceptance:** a real provider receive/reply/retry/handoff round trip; signature and tenant-binding tests; no AI reply after takeover; duplicate/uncertain delivery is visible and does not auto-replay unsafe actions; customer-visible channel state is truthful.

**Dependency:** Phase 0, operational recovery, and demonstrated channel demand. Chatwoot/Crisp channel breadth is a reference, not the sequence.

### Phase 7 — Commercialization and broader suite

Usage budgets, pricing, billing, multilingual evaluation, proactive guidance, voice, and broad enterprise controls are separate investments. Start usage limits only after durable provider reconciliation and define measured versus estimated cost. Begin billing after customer willingness-to-pay and support economics are understood. Hold voice/campaigns/marketplace until evidence supports them.

**Acceptance:** each proposal has a user need, cost model, trustworthy metering, permission/data-retention model, support plan, and a rollout/rollback gate.

## PR quality contract

Every phase PR must:

- state the user outcome and the smallest complete workflow;
- map changed routes, APIs, tables, permissions, and provider boundaries;
- include failure, empty, loading, retry, and permission-denied states;
- be mobile-first where it changes user-facing UI and include keyboard/accessibility review;
- include focused regression coverage for changed behavior, tenancy, concurrency, and privacy as applicable;
- run the repository's formatting, lint, type, build, and relevant DB checks;
- receive independent review before opening or updating the PR;
- report local, CI, deployment/provider, authenticated browser, and customer evidence separately;
- avoid claims of deployment, production readiness, or customer acceptance beyond the evidence.

PRs may be stacked only when implementation dependencies require it. For a child of open PR #48, use head `agent/omnichannel-agent-platform` at reviewed commit `4db5408` as the initial base and set that same branch as the GitHub PR base; refresh the SHA before starting if #48 changes. Do not open a branch based on #48 while targeting `main`, which would repeat the full platform diff. After #48 merges, retarget/rebase children to `main`. Use a branch per cohesive slice and explicit merge order; do not merge on behalf of the owner. Keep reviewer findings and follow-up gates with the relevant PR, not as one oversized omnibus change.
