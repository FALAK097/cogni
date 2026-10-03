# Cogni product design specification

2026-09-29. Owner-approved direction: AI agent + shared support inbox.

## Reference direction

Chatbase's public homepage uses a quiet neutral surface, strong black type/actions, selective
serif emphasis, a split hero, and product-led illustrations. Its product menu groups capabilities
rather than listing every implementation setting. The helpdesk page distinguishes async tickets
from live takeover. Intercom separates agent and helpdesk concepts while sharing customer
context. Chatwoot's routes separate conversations, inbox configuration, contacts, captain,
help center, campaigns and settings.

Adopt those information and interaction patterns in Cogni. Keep Geist, Tailwind v4, shadcn/Base
UI, Hugeicons, TanStack Query and the existing OKLCH token system. Do not copy competitor logos,
customer evidence or decorative assets. Exact private dashboard CSS/font metrics were not
inspected; the dimensions below are Cogni design decisions, not extracted competitor values.

## Visual system

Professional support software should spend attention on the conversation. Use one neutral ramp,
Cogni's blue interactive accent, and only needed success/warning/danger status ramps. Filled
accent marks one primary action in each task pane; selected rows use low-contrast neutral/accent
surfaces. Never use danger for benign actions. Status always has a word/icon, not color alone.

Use existing semantic tokens (`background`, `card`, `foreground`, `muted-foreground`, `border`,
`primary` and corresponding foreground). Add missing role tokens rather than borrowing a border
color for text. No independent hex palette per new page. Existing marketing colors require
separate measured migration; a value looking plausible does not prove contrast.

| Role               | Specification                                                                    |
| ------------------ | -------------------------------------------------------------------------------- |
| App body           | Geist 14px, weight 400+, line height 1.5                                         |
| Secondary metadata | 12–13px; preserve selectable text; measure real contrast                         |
| Page title         | 20–24px semibold; one semantic h1                                                |
| Long content       | 16px / 1.5–1.6; max 60–75ch                                                      |
| Mobile inputs      | 16px to avoid iOS focus zoom                                                     |
| Spacing            | 4px base; 8px within groups, 16–24px between groups                              |
| Controls           | 36–40px dense desktop; aim 44px touch; never below AA target/spacing requirement |
| Corners            | Reuse project radius; nested outer radius = inner radius + padding               |
| Elevation          | Existing layered surface shadows for overlays; borders for pane structure        |
| Icons              | One Hugeicons set; currentColor; 1.5px regular, 2px semibold neighbors           |
| Counts/time/cost   | Tabular numbers; stable width; zero is distinct from unavailable                 |
| Focus              | Visible 2px+ perimeter; forced-colors support; never remove without replacement  |

Keep native scrollbar cues on app panes so scrollable content is discoverable. Hide them only on
specific horizontal controls where the project already provides another clear overflow cue.

Contrast: measure foreground against its actual composite background. Normal text >=4.5:1,
large text >=3:1; relevant non-text/focus boundaries >=3:1. Test light/dark, selected/hover/error/
disabled states separately. No contrast numbers are asserted in this spec without a computation.

## App shell

Expanded workspace navigation: about 224px, collapsible icon rail about 56px. Content owns its
scroll region and one main landmark. Workspace switcher and search stay stable at top; member
menu/settings at bottom. Provide Skip to content. Active navigation has a shape plus text/icon
state and `aria-current`; long workspace names remain reachable in a tooltip/detail view.

Use three primary destinations: Inbox, Agent and Insights, with Settings at the bottom.
Knowledge belongs inside Agent Build; deployment contains widget and channels. Tickets are
Inbox views and customer history belongs in its Details panel. Business-tool connections belong
in Settings; reports belong in Insights. Preserve existing deep links during consolidation.
Keep future capabilities hidden until functional and avoid a separate page for every feature.
Search/command palette uses immediate keyboard feedback; no staged entry delay.
Persist layout preferences per user/workspace. Tenant change discards selected foreign records.

### Workspace permissions

Keep the current two-role model. Owners manage agent settings, knowledge sources and connections,
and approve or reject external actions. Members can work conversations and inspect agent and source
health, connection health and approval status; mutation controls explain when an owner is needed.
Deleting conversations or visitor sessions is owner-only because it permanently removes customer
history.
Enforce these boundaries in server routes and server actions as well as the interface. Add finer
roles only when customer workflows require them.

## Inbox

Desktop at widths where content fits: navigation → conversation list (300–340px) → flexible
transcript (min useful width about 400px) → context panel (280–320px). Under that width collapse
context into a clearly named Details drawer. At narrow widths use list/detail screens with a
visible Back to inbox action. Never simply hide assignment, approval, or contact information.

Conversation list:

- Saved views in a compact list: My inbox, Unassigned, All open, Snoozed, Closed. Counts clearly
  state whether they represent conversations or unread conversations.
- Search has a persistent accessible name; filtering has working controls for status, assignee,
  channel and labels. No decorative button masquerades as a filter.
- Rows show customer, channel, concise preview, latest time, unread count and explicit AI/human
  ownership. Selected and unread are distinguishable beyond color. No inferred Online indicator
  from last message time; use real presence with expiry or show Last active instead.
- DB cursor pagination. New data must not jump selection/scroll or lose a pending reply.
- Error has retry; filtered-empty has Clear filters; new-workspace-empty explains how to install
  the widget. Skeleton layout matches loaded rows. Retain stale data during background errors.

Transcript:

- Header: customer identity, channel, assignment, status, AI paused state and close/snooze action.
- Initial load lands on the latest reply. While an agent reads older messages, background updates
  preserve their position and offer a clear jump to new messages; repeated polling does not clear
  that cue before the agent catches up.
- Messages show author, public/internal treatment, time, delivery/failed/retrying state and source
  links where available. Render untrusted markdown safely; long URLs and code do not break panes.
- Composer: Reply / Internal note, explicit recipient/channel, attachments, editable copilot draft,
  one Send action. Draft survives background refresh; submission has client idempotency key.
- Internal note uses both label/icon and distinct surface. It must never enter public history,
  prompts intended for visitors, or channel outbound payloads accidentally.
- Human takeover pauses AI. Resume is explicit. Sending/closing/navigating is keyboard accessible.
- Copilot provides summary, sourced suggestions and editable draft; nothing auto-sends.

Context:

Contact identity/verification, attributes, previous conversations, labels, assignee/team, ticket,
source evidence and workflow/action outcomes. Order important information before rarely used
metadata. Privileged buttons follow role policy; denied states explain required capability.

## Agent lifecycle

Keep `/playground` working and label it Agent. Its four focused steps are **Build** (instructions,
behavior and connected actions), **Test** (safe sandbox conversations and evidence), **Customize**
(appearance and conversation prompts), and **Deploy** (installation and allowed domains). Keep the
live widget preview beside these steps. Legacy `subtab` URLs resolve to the matching step.

Test uses the authenticated preview sandbox: external actions stay disabled, preview messages stay
out of Inbox and Insights, and a reset starts a fresh preview session. Show retrieved source titles
for groundedness review and configured keyword matches for handoff review. Saved evaluation cases
and no-evidence prompt guidance are implemented; tool proposals and latency/cost measurements remain
future work. Insights now connects negative feedback and recurring older unanswered questions to an
owner-written verified source, with owner-managed open/resolved/ignored states on the same review card.
Weak-confidence and grounding signals plus a repeatable quality trend remain future work before
Optimize is considered complete.

The target lifecycle remains:

1. **Build**: instructions, language/tone, knowledge selection, escalation and allowed actions.
   Separate basic settings from advanced model/runtime policy; explicit validation and unsaved state.
2. **Test**: realistic conversation and reset; expose sources, tool proposals, handoff events,
   latency/cost and failure explanation. Test actions use sandbox/preview and do not execute live
   side effects by default. Save cases and expected outcomes.
3. **Deploy**: authorized domains, copy loader, installation verification, channels and readiness
   checklist. Draft saves stay private to preview; public requests resolve an immutable published
   version. Publishing records version, timestamp and author, and restoring a version creates a new
   publication. Show the current live version's author and publish time without hiding it in history.
   Domain authorization and the enable switch remain immediate safety controls; state that clearly
   beside each control. The setup checklist only reports ready when a version is published, current,
   and enabled. Explain each missing prerequisite beside its action.
4. **Optimize**: unanswered questions, negative feedback, eval results and source/policy gaps;
   one suggested next step, reviewed and accepted by a person.

Separate AI configuration from widget appearance. Appearance belongs inside Deploy with an
interactive preview. General-purpose builder panels must not hide the human inbox.

## Knowledge

Sources table: title/type, processing/ready/failed/stale, pages/chunks, last sync, next sync, health
and action menu. Clear add-source chooser: Website / Sitemap / File / Text / Q&A when supported.
Show file/type/size limits before upload. Close on durable acceptance, then surface progress in
table; success means indexed and retrievable, not just uploaded. Failures give Retry/Edit/View error.
Delete confirms impact and cancellation; sync controls do not reset healthy sources accidentally.
Source details show extracted preview, included/excluded URLs, versions and citations using it.

## Actions, channels and integrations

Connections and capabilities are separate. Gmail send-email capability does not imply inbound
email inbox. Channel setup shows signed-webhook verification, account/phone/guild identity,
provider permissions, test inbound, test reply and active/error state.

Approval detail: plain-language proposed effect, recipient/target, payload, requesting agent,
source conversation, expiry, risk, Approve and Reject. Distinguish Pending, Running, Completed,
Failed and Unknown outcome. Show Retry only when safe/reconciled. Disconnect confirms affected
workflows/channels. Provider secrets remain server-only and never appear in browser inspection.

## Support operations and reporting

Insights trend implementation uses the MIT-licensed [EvilCharts Recharts area component](https://evilcharts.com/docs/recharts/area-chart/static)
with Cogni's semantic theme colors, a dashed horizontal grid, restrained active points and a
gradient fill. Volume charts start at zero; satisfaction keeps its full 0–5 scale, and tooltips use
concise metric labels. Keep each plotted value exact, use a restrained 700ms reveal that turns off
for reduced-motion preferences, and provide an interactive tooltip plus a View data table. On desktop,
give the primary trend half the chart row and let source/status breakdowns keep their 180px chart
above the full-width legend; do not compress legends beside the donut. Keep the local adapter
limited to the chart features this screen uses rather than adding unused brush or series-selection
controls. Satisfaction uses the conversation-start cohort: KPI totals, daily and weekly buckets,
tooltips, accessible tables and exports include the same ratings attached to conversations created
inside the selected range, even when a rating is submitted later. Other chart styling and exact
palette matching await the owner's additional visual
references; do not claim pixel fidelity to screenshots that have not been provided.

Tickets use an Inbox queue and contextual detail view with linked conversation/contact, number/title, assignee/team,
priority/status, SLA due time, audit and customer-visible updates. Snooze and business hours use
workspace timezone. Macros show their effects before applying; bulk actions show selection count.
Customer search opens an Inbox drawer with full timeline; identity verified is explicit. A
dedicated contacts destination requires evidence that this contextual access is insufficient.

Insights consolidates overview and reports. Reports separate AI engagement, grounded-answer quality, genuine AI resolution, human first
response/resolution time, CSAT, reopened rate, volume and cost. Definitions and denominators are
visible. Empty/insufficient-data state must not show fictional trends. Export respects permissions,
redaction, timezone and selected filters. Small operational charts are accessible with text/table.

## Motion rules

Navigation, command palette and keyboard actions respond immediately. Hover color/opacity <=150ms.
Avoid marketing-style stagger in the inbox. Occasional overlays use Base UI's origin-aware
transitions; specify changed properties, never `transition: all`. Use CSS interruptible transitions.
Where tactile press makes sense use scale 0.96, disabled under reduced motion and with an opt-out
for dense/keyboard interactions. Keep static state cues. Decorative hover motion is fine-pointer
only. Reduced motion removes movement; no content starts permanently invisible without JS.

## Required QA states

For every shipped route record populated, empty, filtered-empty, loading, failure/retry,
permission-denied and slow-network states. For inbox also draft, attachment failure, reconnect,
AI handoff mid-generation, simultaneous teammate activity, internal note and provider failure.

Test 320px, representative phone/tablet/desktop widths, 200% zoom, keyboard-only, accessible
names/roles, long customer names/URLs, reduced motion and both themes. RTL and physical touch
are separately recorded; do not mark them passed from desktop code inspection.
