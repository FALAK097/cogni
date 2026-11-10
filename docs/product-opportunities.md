# Cogni product opportunities and delivery direction

Prepared 7 October 2026. Recommendations, not an implementation or release-status claim.

Read alongside [product-roadmap.md](./product-roadmap.md), [product-assessment.md](./product-assessment.md), [product-design.md](./product-design.md) and [the landing-page adaptation](./landing-page-adaptation.md). The roadmap remains the implementation plan; this document adds prioritization, product hypotheses and extensions without silently changing its accepted scope.

## Recommended product thesis

**Cogni helps a small SaaS team turn its product knowledge into dependable support, with a clear path from AI answer to human help and reviewed improvement.**

The proposed wedge is a compact support system for teams that have useful documentation but limited support capacity. Sell a complete daily workflow: prepare knowledge, test answers, respond to customers, handle exceptions and improve the weak points. Validate this audience with design partners before treating it as market evidence.

The long-term differentiator should be a clear, controlled improvement loop. A team can see why an answer failed, correct the underlying knowledge or behavior, replay the relevant customer question and publish an evaluated change. That is a hypothesis about where Cogni can be especially useful, not a claim of unique competitive capability.

Current official references reinforce two baseline expectations. Intercom documents reusable tests based on real customer questions and inspection of source/guidance evidence; it also says test ratings do not directly train the agent. Its unresolved-question workflow groups related failures for source improvements. Chatwoot presents ownership, routing, SLAs and reviewed assistance as support-team workflows. These are public capability descriptions, not comparative performance measurements. [Intercom batch testing](https://www.intercom.com/help/en/articles/10521711-batch-test-fin-ai-agent), [unresolved questions](https://intercom.help/fin4all/en/articles/10672146-analyze-unresolved-questions), [Chatwoot support teams](https://www.chatwoot.com/solutions/teams/support).

## Three product layers

1. **Dependable answer:** ready sources, relevant retrieval, understandable evidence, no-answer behavior and controlled publication.
2. **Dependable handoff:** preserved history, explicit ownership, working teammate response and clear customer expectations.
3. **Reviewed improvement:** feedback and failures become prioritized work, test cases and approved changes.

Keep these inside Inbox, Agent and Insights. Settings holds workspace controls and connections. New capability does not automatically deserve a new top-level page.

## Prioritized opportunities

| Priority | Opportunity                              | Current starting point                                                           | Smallest useful increment                                                                | Where it belongs                                          |
| -------- | ---------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Complete | Guided readiness checklist               | 4-stage checklist across knowledge, tests, publish, and install                  | Interactive checklist card with contextual actions in Deploy & Insights cue              | Agent Deploy; temporary setup cue in Insights             |
| Complete | Source health and answer evidence        | Ingestion records, ready-source retrieval and bounded evidence exist             | Last successful ingestion, actionable failure/retry and source evidence linking          | Agent Build; Test evidence; Inbox source detail           |
| Complete | Explicit handoff expectations            | Requested/queued/assigned states & truthful messaging in Widget & Inbox          | Requested/queued/assigned states and a truthful message about next steps                 | Widget and Inbox                                          |
| Complete | Conversation-to-test workflow            | Bounded modal with prompt redaction, outcome presets & ready-source requirements | Save from Inbox message or Insights gap directly into Agent Test suite                   | Inbox contextual action & Insights gap → Agent Test       |
| Next     | Reviewed improvement queue               | Negative feedback and conversation evidence exist; complete queue remains a gap  | Link a failed answer to an owned source/instruction task and a test case                 | Agent Build contextual Improve view; Insights entry point |
| Next     | Source-change impact review              | Agent versions exist; source versioning/impact needs more work                   | Show changed content and affected approved test cases before publishing                  | Agent Build/Test/Deploy                                   |
| Complete | Structured handoff brief                 | Structured brief synthesized from intent, contacts, sources and next steps       | Editable summary of request, attempted steps and unresolved issue, linked to evidence    | Inbox Details; private note                               |
| Next     | Usage visibility and limits              | Telemetry, shared rate limits and plan helpers exist; spend budgets remain a gap | Clear usage breakdown plus durable budget enforcement and alerts                         | Insights; Settings usage                                  |
| Later    | Customer context and plan-aware answers  | Contact identity/notes/tags exist; verified identity/attributes incomplete       | Signed identity and explicit, server-trusted attributes for source/action decisions      | Widget identification; Inbox Details; Agent tests         |
| Later    | Email support and richer team operations | Channel adapters and provider actions exist; round trips incomplete              | One verified email receive/reply/handoff journey, then demand-led routing/business hours | Agent Deploy; Inbox; Settings                             |

“First,” “Next” and “Later” indicate recommended sequencing. They do not replace the roadmap's P0–P4 engineering phases or assert that every starting point is production accepted.

## Feature definitions and acceptance

### Guided launch readiness

_Status (October 2026):_ Implemented. 4-stage readiness checklist computes live progress across knowledge base indexing, regression test verification, configuration publication, and authorized domain installation. Provides interactive checklist card in Agent Deploy with direct actions and a compact progress cue on empty Insights page.

The owner sees which task prevents launch and can act on it directly. For example: knowledge is still processing; an unanswered-question test needs review; there is no published agent; the intended domain is not authorized; or the loader has not been observed.

Compute status from durable records and real events. A successful snippet-copy click is not an installed widget. An installed widget is not a successful answer. Owners may proceed with a clearly explained configuration choice where appropriate; the checklist should guide rather than create arbitrary product gates.

Acceptance: a new design partner reaches an indexed source, an inspected test answer, a published configuration, an authorized website and a real conversation without interpreting infrastructure errors. Keep source ingestion and provider errors actionable.

### Knowledge health and provenance

_Status (October 2026):_ Implemented. WidgetKnowledgeManager shows a live source health breakdown (ready, indexing, failed), failure alert banners, actionable one-click retry on failed source rows and cards, last-synced timestamps, and exact error messages. Test evidence links retrieved sources directly to the Knowledge Base (#build), and Inbox conversation citations link back to inspect the underlying source document in Knowledge Base.

Show the last successful processing event, current readiness and any failed update. A recent crawl time alone does not prove that content is accurate. Let a teammate inspect the source title and bounded evidence used in the answer; reserve source mutation for authorized roles.

Start with manual retry/resync and clear failure states. Add scheduled resync only after job ownership, retries, deleted-source handling and retrieval consistency work. Later, reviewed source priorities and conflict warnings could help with outdated policies, but avoid silently favoring a document merely because it is newer.

Acceptance: broken and stale updates are visible; failed processing does not replace working knowledge with an unready source; evidence is scoped to the conversation's workspace; removed sources cannot keep supplying new answers.

### Conversation-to-test

Add a contextual action to a reviewed conversation: Create test from this question. The owner can edit/redact the question, add the expected factual points or expected handoff, select relevant sources and save it to an evaluation group.

Replay against the draft and record configuration version, source revisions, model settings, run time and results. Show before/after answers for review. Tests must use a sandbox and prevent real email, message, booking or other provider side effects.

An automated grader can assist with checks; source retrieval by itself does not prove the answer is supported. An independent reviewer should evaluate consequential factual and handoff behavior. Do not compare entire answers with exact string matching when valid wording can vary.

Acceptance: a real failure becomes a repeatable case; expected escalation and no-evidence behavior are checked; previous test results remain traceable; the same source/model/configuration context is identified in comparisons.

_Status (October 2026):_ Implemented. Owners can create test cases directly from visitor messages in Inbox or negative feedback / open gaps in Insights via `CreateAgentTestCaseDialog`, select expected behaviors (grounded answer, missing knowledge/no evidence, human handoff), bound and redact prompts, require up to 4 indexed sources, and deep-link directly into Agent Test (`#test`).

### Reviewed improvement queue

Create work from an explicit signal: no matching evidence, negative feedback, teammate correction or failed test. Start with user-confirmed grouping rather than a large automatic clustering pipeline.

Each item has a source conversation, reason, proposed change, owner and state: Open → In review → Ready to test → Applied/Dismissed. Keep distinct reasons for missing content, incorrect content, ambiguous question, behavior problem and unsupported action. A handoff can be the correct outcome, so it must not automatically become a failure.

The first useful flow is: review the failed answer → write/edit a source or instruction → run the linked case → approve → publish. Generated suggestions are drafts. Customer messages and human replies are inputs for review, not automatically authoritative knowledge.

Acceptance: applied changes have evidence and an approved test result; dismissed items remain auditable; the owner can recover an earlier configuration; no model updates its own live knowledge without the authorized review step.

### Source impact and release review

Extend the existing draft/publish/version foundation. Source content can change independently of agent configuration; test results must therefore identify source revisions as well as agent versions.

A source update can show a content diff, the questions that previously retrieved it, and relevant test cases. Begin with an explicit set of saved cases, not an unsupported guarantee that every possible affected conversation was found.

Acceptance: source and instruction changes are understandable; the owner can run affected cases before publication; rollback behavior states exactly which configuration/source revisions it restores. Configuration rollback alone must not imply that old knowledge was restored.

### Handoff expectations and brief

_Status (October 2026):_ Implemented. When human escalation triggers, the conversation state seamlessly reflects "queued" (unassigned in queue) or "assigned" (teammate assigned, AI paused). The public widget session delivers truthful handoff indicators to visitors without generic promises or fake online indicators. The Inbox transcript presents a high-priority Handoff Cue Banner with instant "Take over & reply" or "Resume AI" controls, alongside a structured Handoff Brief in the Details sidebar summarizing customer intent, verified contact info, consulted knowledge sources (with deep-links to #build), and recommended actions with 1-click export to internal private notes.

The customer should know whether a human request has been recorded, assigned or answered. If operating hours are introduced, use the workspace timezone and real availability rules. Do not display a promised response time derived from a generic average or fake online dot.

For the teammate, offer an editable private brief: what the customer wants, verified details they supplied, what the agent tried, relevant sources, and what remains unresolved. Link claims back to messages. Model-derived interpretation should be distinguishable from the customer's statements.

Acceptance: AI stops when takeover is committed, the customer receives a truthful state, the teammate can review the full history, and private notes never enter visitor or outbound-channel payloads. Test takeover during active generation and reconnect, not only after a completed AI reply.

### Budget and usage controls

Make usage understandable at the workspace, agent and conversation levels where data supports it. Separate measured provider usage/cost, estimated cost and any later Cogni billing units. Show unavailable values honestly.

Add durable budgets before paid calls, including concurrent requests and external-action costs. Define the visitor experience when the budget is reached: a helpful message and a human route where available. Alerts and replenishment must not create duplicate charges or restart unsafe operations.

Acceptance: concurrent requests respect the shared limit, provider failures do not manufacture success, and operators can understand why a conversation used resources. This supports a future commercial offer; it does not define pricing yet.

### Customer context and connected work

Verified identity makes context-sensitive support valuable: plan-specific guides, a known customer history or an approved scheduling action. Browser-provided attributes must not authorize private knowledge or privileged actions.

Start with signed identity and read-only trusted context. Test answers for different supported customer profiles. Add one confirmed, approved provider action only after identity, permissions, reconciliation and uncertain-outcome handling are accepted.

Acceptance: one customer cannot access another customer's private context, stale plan data is visible where it matters, and provider timeouts do not lead to duplicate actions. Keep untrusted visitor content separate from system authority.

## How to carry the product forward

### Stage A — make the existing promise work

Complete the roadmap's foundation and core-loop release gates. Record current evidence for source ingestion, successful grounded answers, no-answer handling, installed widget, handoff under active generation, teammate reply, feedback and workspace isolation.

Prepare a compact, realistic example workspace with known content and expected outcomes. Use it for QA, product screenshots and onboarding demonstrations; keep it labeled as a demonstration. The website redesign and product reliability can advance in parallel, but website claims follow accepted behavior.

Exit gate: a new team can complete the support loop, recover a failure and understand ownership without a developer explaining each screen. Provider availability and production acceptance are explicit requirements, not assumed from local checks.

### Stage B — validate everyday value with a small cohort

Recruit a small initial cohort, for example three to five SaaS design partners with usable documentation and recurring support questions. This is a proposed discovery plan, not an existing customer count. Select a similar problem profile so feedback is comparable.

Observe onboarding and a real support day. Ask where the AI helps, when humans intervene, what information is missing and which control causes confusion. Track activation and repeated use alongside quality. Request permission before using quotes, logos or customer conversations in public materials.

Exit gate: multiple teams repeatedly use the workflow, can identify a concrete benefit and expose a manageable list of recurring blockers. Revise the audience hypothesis if demand is primarily for another workflow.

### Stage C — close the reviewed improvement loop

Prioritize conversation-to-test, source health and the small improvement queue. Link operational evidence to Agent work without adding a new application destination. Add change-impact review once source revisions and evaluation context can be recorded reliably.

Exit gate: a teammate can turn a weak answer into a reviewed change, prove the fix on relevant cases and release it with traceability. Demonstrate whether repeat failures actually decrease; do not infer that from edits alone.

### Stage D — expand where customers encounter friction

Use observed demand to choose the first additional channel and support operation. The existing roadmap suggests email first; validate that with the cohort. Add routing, business hours and SLAs when teams need them. Expand actions individually with confirmed provider results and clear approvals.

Build the commercial platform when usage economics and willingness to pay are understood. Evaluate a predictable subscription with a clearly defined usage allowance as a hypothesis, then model provider costs and high-volume cases. Pricing, overages, retention and service expectations need explicit product decisions.

Exit gate: each added channel/action has its own accepted receive/respond/retry/handoff story and operating evidence. Breadth is not a substitute for dependable behavior.

## First six delivery slices

1. Record the current visitor-to-AI-to-human acceptance matrix and fix blockers in that path.
2. Add one guided source/test/publish/install readiness state using existing surfaces.
3. Capture source-health and evidence states, then improve recovery from processing/search failures.
4. Add the contextual conversation-to-test workflow to the existing evaluation foundation.
5. Add a small owner-reviewed improvement queue, linked to sources and tests.
6. Add source/configuration impact review and actionable usage controls; prioritize their order from cohort evidence.

Each slice should include a complete workflow and its failure recovery. Exact engineering estimates should follow a scoped code review; the existing roadmap's timings are historical planning ranges, not new delivery commitments.

## What to measure

| Question                    | Metric / evidence                                                                                   | Important boundary                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Can teams activate?         | Workspaces reaching ready source → inspected test → publish → installed widget → first conversation | Measure each step; avoid interpreting a click as successful activation                   |
| Are answers useful?         | Human-reviewed factual/grounding outcomes on a defined sample; explicit helpful ratings and reasons | Report sample size, eligible population and missing ratings                              |
| Is handoff working?         | Requested-to-first-human-reply time and conversations waiting for assignment/reply                  | Distinguish business hours; neither assignment nor closure proves resolution             |
| Is improvement working?     | Linked failures fixed on tests; recurrence of reviewed failure categories after release             | Account for changed traffic/questions and source/model versions                          |
| Can we operate sustainably? | Provider usage/cost, response latency, failure/retry rate and support effort                        | Separate estimates from measured cost and distinguish model latency from end-to-end time |
| Do teams return?            | Cohort retention and repeated Inbox/Agent use plus interviews                                       | Activity alone does not demonstrate customer benefit                                     |

Define customer-confirmed resolution separately if introduced. Use explicit confirmation, review disputed outcomes and state the denominator; silence, thumbs-up on a message and closed status are different signals.

## Ideas to hold for later

Public help center and search are a plausible extension once knowledge health and publishing are sound. Lightweight feature-request tagging/export could connect support to a team's existing issue tracker without building a second product-management suite. Multilingual evaluation can strengthen the core agent when real customers need it. Proactive in-app guidance and mobile teammate access need demand and their own delivery design.

Defer voice, campaigns, a generic workflow canvas, a public roadmap/changelog suite, an agent marketplace and broad enterprise promises. They are independent products or operational investments; add them only when the core audience and usage justify the cost. UserJot's broader page should not dictate Cogni's feature roadmap.

## Connection to the landing page

Keep two distinct design tracks: **launch page** for accepted capabilities and **future concept board** for proposals. Future concepts must not appear as shipped UI on the launch page.

- Readiness and source evidence strengthen the Agent/setup story.
- Handoff expectations and briefs strengthen the widget/Inbox story.
- Conversation-to-test and reviewed improvements can become a future standout section: “Every conversation can make the next answer better.” Publish it only once the end-to-end workflow exists.
- Usage and quality definitions make Insights useful evidence rather than decorative charts.
- Genuine design-partner outcomes can later replace empty testimonial/customer-proof slots with permission and measurement context.

The first design should remain compact. Improve the product behind the page, then update the page as each useful capability becomes demonstrable.
