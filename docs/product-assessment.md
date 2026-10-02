# Cogni product assessment

2026-09-29. Scope: current branch and PR #48 architecture, public landing/sign-in,
widget settings, and shared inbox. Next.js 16, React 19, Tailwind 4, Base UI/shadcn,
Geist, Hugeicons, TanStack Query, Better Auth and Drizzle/Postgres. Conventions:
AGENTS.md and the owner-confirmed AI agent + shared inbox direction.

The owner requested implementation as well as review. The initial corrections below
are local changes. This is a product/screen assessment, not a formal change-scoped
`interface-review` verdict on PR #48. Backend risk details and delivery gates live in
[the roadmap](product-roadmap.md); interaction specifications live in
[the design specification](product-design.md).

## Coverage

| Domain        | Evidence inspected                                                                                 | Result                                                                                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accessibility | Landing FAQ markup, signed-in settings accessibility tree, inbox search and error branches         | Native disclosure and names fixed; broader field associations/keyboard testing remain                                                                       |
| Layout        | Public/reference screenshots, sign-in viewport constraints, settings screenshot, inbox pane source | Sign-in can scroll; navigation and pane redesign specified; full responsive acceptance remains                                                              |
| Writing       | Metadata, hero, features, FAQ, sign-in, integration registry, CTA, inbox errors                    | Unsupported outcomes/customer claims removed from active pages; retry and setup expectations made explicit                                                  |
| Typography    | Geist tokens, rendered settings/reference hierarchy, inbox sizes                                   | Inbox previews and channel, timestamp, ownership and assignee metadata use a readable 12px hierarchy; transcript detail metadata still needs a density pass |
| Colors        | Existing OKLCH ramps, hard-coded purple landing/widget colors, theme rules                         | Blue app/purple widget ownership documented; rendered contrast measurements remain required                                                                 |
| UI            | FAQ interaction source, settings controls, inbox affordances/presence, public sample cards         | Fake actions/presence removed; sample data labeled; delivery/reconnect states remain                                                                        |

## Findings and first corrections

| Severity | Domain        | Location                                                                                                                               | Before                                                                                                                 | After                                                                                                                                                                                    | Why                                                                                                             |
| -------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| HIGH     | Writing       | `src/components/landing/faq.tsx`, `features.tsx`, `how-it-works.tsx`, `final-cta.tsx`, `src/app/(auth)/layout.tsx`, `src/app/page.tsx` | Unsupported certification, resolution/language/customer counts and auto-sync promises                                  | **Fixed locally:** describe implemented behavior and provider setup without outcome guarantees                                                                                           | Customers should be able to trust product and security claims                                                   |
| HIGH     | Accessibility | `src/components/widget/widget-settings-panels.tsx`                                                                                     | Four switches have no accessible name in settings                                                                      | **Fixed locally:** explicit names for branding, suggestions, lead capture and brochure switches                                                                                          | Assistive technology cannot identify an unnamed setting                                                         |
| HIGH     | UI            | `public/widget/ui.js`, `src/features/widget/server/widget-utils.ts`, `widget-agent.ts`                                                 | Empty/aborted model streams could finish as blank success; network fragments and multiline payloads were not preserved | **Fixed locally:** buffered complete SSE events, multiline framing, error instead of empty completion, abort logging, remove blank bubble and show recovery copy; input/send names added | Customers must distinguish a real answer from a failed or interrupted response                                  |
| HIGH     | Colors        | `src/app/globals.css:119,138`                                                                                                          | White dark-theme primary labels calculate at 3.02:1                                                                    | **Fixed locally:** dark neutral foreground calculates at 6.62:1                                                                                                                          | Normal text requires at least 4.5:1; calculation uses OKLCH-to-linear-sRGB luminance, not a full rendered audit |
| MEDIUM   | Accessibility | `src/components/landing/faq.tsx:45`                                                                                                    | Custom JavaScript disclosure removed keyboard focus styling                                                            | **Fixed locally:** native `details`/`summary`, keyboard focus and independent disclosure                                                                                                 | Native disclosure supplies keyboard behavior and visible focus without custom state bookkeeping                 |
| MEDIUM   | Layout        | `src/app/(auth)/layout.tsx:7`                                                                                                          | Fixed viewport height and hidden overflow could clip short screens/zoomed content                                      | **Fixed locally:** minimum viewport height with natural scrolling                                                                                                                        | Authentication must remain reachable when content grows                                                         |
| MEDIUM   | UI            | `src/components/widget/conversations-list.tsx:162`                                                                                     | Query failure could look like an empty inbox                                                                           | **Fixed locally:** distinguish failure, expose retry, retain loaded results after refresh failure                                                                                        | Empty and failed are different customer states                                                                  |
| MEDIUM   | UI            | `src/components/widget/conversations-list.tsx`                                                                                         | Inert filter button and recent-message timestamp used as online presence                                               | **Fixed locally:** remove both; existing working filter tabs remain                                                                                                                      | Avoid promising actions or presence that the data cannot support                                                |
| MEDIUM   | Writing       | `src/components/landing/integrations.tsx:7`, `hero.tsx`, `features.tsx`                                                                | Unbacked integration logos and illustrative metrics resembled live capabilities/data                                   | **Fixed locally:** use integration registry, qualify channel setup, visibly label sample illustrations, remove inert illustration button                                                 | Marketing must distinguish registered tools, configured channels and sample data                                |
| MEDIUM   | Accessibility | `src/components/widget/conversations-list.tsx:152`                                                                                     | Search depended on placeholder for identification                                                                      | **Fixed locally:** persistent accessible name                                                                                                                                            | A placeholder disappears as the user types                                                                      |
| MEDIUM   | Colors        | `src/app/globals.css`, `src/components/landing/features.tsx`                                                                           | App blue and hard-coded purple/alpha marketing colors have separate systems                                            | **Planned:** semantic ownership, measured rendered contrast in each theme and state                                                                                                      | Source color values alone do not establish readable contrast                                                    |
| MEDIUM   | Typography    | `src/components/widget/conversations-list.tsx`                                                                                         | Channel metadata was 9px                                                                                               | **Fixed in PR #48:** channel labels, timestamps, AI ownership and assignee metadata use 12px text; unread counts use tabular numerals                                                    | Support agents need to scan conversation ownership and timing quickly                                           |

## Verification record

Follow-up inbox pass: preserve customer replies, copilot, assignment, notes and export while
removing inert formatting, emoji, attachment, link, send-options and contact-edit controls.
Timestamp-based Online/Offline is replaced with Last activity. The context column appears
only at 1280px and above; narrower layouts expose the existing Details drawer. Conversation
rows have visible focus, selected state and readable channel labels; reply/note fields have
accessible names. Workspace destinations are native links. Main metric trend labels no longer
wrap, and chart default formatters are compatible with React Compiler. Independent source
review approved this incremental follow-up; it does not establish missing feature parity.
Production-build browser checks at 1024px and 375px confirmed the Details drawer is
reachable; Escape closes it and restores focus to its trigger. At 375px, an unsent draft
enabled Send and clearing it disabled Send. The transcript and composer fit the viewport.
The temporary viewport override was reset; no reply was sent.

Navigation follow-up: the mobile sidebar now uses the existing Base UI Sheet instead of
an off-screen translated aside. Closed mobile navigation leaves the tab order; the open
drawer uses modal focus management, Escape dismissal and a named close button. Desktop
navigation stays inline. Skip to content precedes workspace chrome, the brand is no longer
a page heading, and the sidebar toggle exposes its expanded state. The keyboard shortcut
ignores text fields, editable content and both ordinary and confirmation dialogs. The drawer
uses reduced-motion overrides. This adds no product pages or primary destinations.
Production-build checks at 375px and 320px confirmed closed navigation is absent from the
accessibility tree; first Tab reaches Skip to content and Enter focuses workspace content.
The open drawer wraps focus in both directions, Escape restores the toggle after its exit
transition, Agent navigation closes it, and resizing to 1024px closes it. Cmd+B leaves the
reply field and delete confirmation unchanged; the confirmation was cancelled. The 320px
document stayed 320px wide. Independent review approved the scoped source changes.

Contact-tag follow-up keeps customer labels in the existing Contact card: agents can add or
remove tags, and the same workspace-scoped update service is used by the AI tag action. The
service normalizes case, tolerates malformed legacy JSON, serializes concurrent edits under a
row lock and enforces the 50-tag limit. Local PostgreSQL tests cover concurrent writes,
workspace isolation and limits. A localhost Inbox browser pass added a temporary tag, confirmed
it appeared in the card, removed it and confirmed the empty state returned. No tag remained.

Conversation labels are separate from contact tags and stay on the conversation. Agents can
add/remove up to 50 labels in the existing Details card; the Inbox shows compact labels, supports
an exact label filter, and persists that filter in workspace-shared views. Local PostgreSQL tests
cover concurrent updates, case normalization, limits, cross-workspace denial, combined label/status/
channel filtering and saved-view persistence. A localhost browser pass added a temporary label in the existing Details card, confirmed it on the Inbox row, applied the exact label filter, and removed the test label afterward. This workspace has one conversation, so the browser pass confirmed a match; database tests cover non-matches and combined facets.

Saved replies keep frequent customer answers inside the existing composer. Members can create and
edit their own workspace replies, owners can manage all replies, and choosing a reply appends it to
the current draft without sending. Content and names are bounded and saved replies remain plain
text. PostgreSQL tests cover workspace isolation, duplicate names, creator/owner permissions and
input bounds. A localhost browser pass created a temporary reply, appended it after an existing
draft, confirmed the text remained unsent with focus in the composer, then cleared the draft and
deleted the temporary reply through the confirmation dialog.

Agent setup follow-up keeps all configuration in the existing page:

| Before                                                                                    | After                                                                                 | Why                                                                 |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Configure & test opens appearance; the current section is hidden behind an icon           | Opens instructions; the settings trigger names the current section                    | Start with agent behavior and make its settings discoverable        |
| Custom popup has no roving keyboard behavior; local section state ignores browser history | Base UI radio menu and section derived from route props                               | Keyboard navigation and Back/Forward agree with the visible section |
| Model provider/name omitted from the save payload                                         | Both included in the actual request body; two serializer regression tests added to CI | Model choices must survive a save                                   |
| Load errors can remain a skeleton; autosave errors are silent                             | Load retry, save status and Retry save                                                | Show whether changes reached the server and provide recovery        |

The mutation callback now depends on its stable mutate function so status rerenders do
not restart the debounce or automatically repeat a failed save. Existing queued saves remain.
The serializer tests verify request JSON for both supported providers, not live provider
availability or model-answer quality. Browser testing on localhost PostgreSQL confirmed a
temporary Google/Gemini 2.5 Flash selection survived reload; the original OpenAI/GPT-4o mini
choice was restored and verified after reload. No model call was made. Back/Forward restored
Instructions and Appearance, and the preview toggle worked at 320px. The browser pass also
led to menu dismissal on selection, human-readable model labels and four booking-field label
associations. A controlled local server outage retained an edited agent-name draft and
showed Changes not saved with Retry save. After restart, Retry save completed successfully;
the original name was restored. Query-load error recovery remains unverified.
At 1024px the labeled settings trigger initially squeezed the form when placed in its
own column. Controls now sit above the form/preview split, and model fields use the form
container's width for their two-column breakpoint.
The final production build showed the model selector fully visible at 1024px. At 320px,
the document remained 320px wide and the model control stayed inside the viewport. The
temporary viewport override was reset after capturing the final Agent view.

| Location                                     | Before                                                                                                                      | After                                                                                                                              | Why                                                                                                          |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/lib/menu-list.ts`, app navigation       | Five peer destinations plus a detached widget menu                                                                          | Three primary destinations, bottom Settings, contextual Agent sections                                                             | Keep everyday work easy to locate and preserve existing routes                                               |
| `insights-trend-chart.tsx`                   | Static SVG trends without inspectable point values                                                                          | Responsive Recharts trends, tooltips and View data table                                                                           | Follow the EvilCharts visual reference while preserving real data and accessible inspection                  |
| `dashboard-analytics.ts`, metric cards       | Empty samples displayed as 0s and 0/5; unchanged counts appeared positive                                                   | Missing samples have an explicit empty value; main unchanged comparisons are neutral                                               | Missing evidence and genuine zero measurements have different meanings                                       |
| `integration-card.tsx`, connections          | Accessible View details name started a connection flow; failed load could resemble disconnected state                       | Connect/Manage names match the effect; initial load failure exposes retry                                                          | Set expectations before external navigation and distinguish failure from state                               |
| `public/widget/ui.js`, embedded widget       | Launcher and menu icons had no accessible names/state, no Escape dismissal, and a document click listener survived teardown | Named launcher/menu/upload controls with disclosure state; Escape dismisses the top widget layer; destroy removes global listeners | Make everyday visitor interactions understandable and keyboard reachable without adding product surface area |
| `insights-trend-chart.tsx`, zero period      | All-zero periods drew a flat zero line across an otherwise empty chart                                                      | A short no-conversations state replaces the graph while View data keeps exact zero values                                          | A no-activity period should not read as an analytics trend                                                   |
| `dashboard-page.tsx`, engagement comparisons | Zero or unavailable comparisons showed a green upward arrow                                                                 | Shared trend treatment now shows neutral `No change` or `—` without a direction arrow                                              | Missing or unchanged measurements must not imply improvement                                                 |

- Embedded widget browser check on the production build verified the menu's accessible name and expanded state, Escape dismissal with focus return, Recent chats panel dismissal, and Escape close from the composer returning focus to the launcher. The dashboard preview now increments its bundle version so the latest widget controls are loaded. No message was sent.
- Widget buttons and links now expose a visible keyboard focus ring; reduced-motion preferences disable animations and transitions, including infinite decorative loops. The browser pass checked the preview at its desktop layout; complete touch and screen-reader acceptance remains outstanding.
- Insights production browser check verified the empty-period copy, daily zero rows, and weekly aggregation in View data. This workspace currently has no conversations in the selected date range, so populated chart styling remains a code-level check against the [EvilCharts area-chart reference](https://evilcharts.com/docs/recharts/area-chart/static), not a rendered populated-data acceptance result.
- Local browser verification after the engagement comparison fix showed neutral `No change` labels without green direction arrows for zero message counts, engagement rate, and conversations per user. No populated comparison period was available in this workspace.

- `pnpm build` completed successfully: widget bundle, optimized Next.js build, TypeScript, static generation and traces.
- Initial repository checks passed: Oxlint, TypeScript and Oxfmt. A later check exposed
  unformatted new Markdown files; those were formatted before final verification.
- React Doctor: `npx -y react-doctor@latest . --verbose --diff` scanned 107 branch
  files against `origin/main`, scored **100/100**, and reported no diagnostics.
  This is static analysis, not a security audit or runtime acceptance test.
- Google OAuth initially rejected the preview on port 3001 because Better Auth was
  configured for 3000. The owner confirmed Google is registered for 3000. Cogni was
  moved to 3000; the browser subsequently reached the authenticated playground.
  `pnpm dev` now explicitly binds 3000 to prevent silent port fallback.
- Browser: the signed-in inbox loaded and the Mine filter selected correctly; the manual text dialog accepted the synthetic source and ingestion later logged `document.ready`. The initial preview ended with an empty assistant bubble and no persisted AI reply. This failure prompted the stream corrections below; the rebuilt preview showed recovery copy instead of an empty bubble on a repeated question. The server reported an empty model response. A successful grounded model answer remains a separate acceptance gate.
- Production Inbox after the AI-state UI change exposed `Widget`, `AI enabled` and `Unassigned` on the conversation row, plus `AI replies Enabled` in Details. This used the real QA-only workspace conversation; a paused conversation was not available for rendered verification.
- `pnpm test:widget-stream`: ten regression cases passed, covering arbitrary byte boundaries/UTF-8, multiline/leading-space preservation, empty streams, explicit errors, interrupted responses, and installed-SDK partial-then-error/abort events and successful/failed persistence completion gates. CI now includes this command.
- FAQ: Enter expanded the native disclosure; computed focus outline was 2px at 320px, and document width was 320px. This confirms that tested state, not every responsive page.
- Dark theme: browser-computed primary/foreground matched `oklch(66% .16 251)` and `oklch(10% .012 264)` after the correction. Full rendered contrast coverage remains pending.
- Public reference browser inspection covered Chatbase navigation/home/helpdesk and
  Intercom homepage; Chatwoot's public repository/routes were inspected. Private
  competitor dashboards and exact private CSS were not accessed.
- A local integration control redirected to a private Google account page. Automatic approval
  review blocked inspection of that page; the flow was stopped and connector OAuth remains
  unverified. No provider access was granted during this test.
- The owner requested a compact product. The sidebar now exposes Inbox, Agent and Insights,
  with Settings at the bottom. Agent sections link configuration/testing and knowledge;
  Settings currently contains connections. Existing URLs are preserved. Tickets, expanded
  customer tools and the other roadmap capabilities remain future work, not hidden shipped features.
- Insights trend charts now use Recharts with EvilCharts-inspired gradient areas, sparse axes,
  active points and tooltips. A native View data disclosure provides the underlying values.
  Values come from workspace analytics; animation is disabled for repeated operational use.
  Reference: https://evilcharts.com/docs/recharts/area-chart/static.
- Additional UI designs mentioned in the implementation request were not attached or linked
  in the available message. Exact matching against those designs requires the references;
  the current changes do not establish pixel-perfect fidelity to unseen designs.
- Inbox list polish in PR #48 raises secondary timestamps and ownership metadata to the 12px
  density contract, aligns supporting icons, and replaces the unmarked load-more text with the
  shared plus/loading icons and an exposed busy state. Formatting, lint, typecheck, cursor tests,
  conversation draft/scroll tests and React Doctor 100/100 passed. Browser verification of these
  latest changes is not verified because local-app navigation was blocked by the browser policy.
- Inbox now supports workspace-shared saved filter views inside the existing view picker. Members
  can save channel/assignee filters with an optional built-in status view; list and detail caches
  are keyed by workspace to avoid stale cross-workspace display. Creation validates assignee
  membership, names are case-insensitively unique per workspace, and deletion is limited to the
  creator or an owner. Migration `0005_inbox_saved_views.sql` and three local PostgreSQL tests
  cover workspace isolation, foreign assignees, uniqueness, and delete permissions. Formatting,
  lint, typecheck and production build pass. Browser interaction for this UI remains unverified.
- Final production-build browser check confirmed all three sidebar destinations, Agent →
  Knowledge navigation with the indexed QA source, Settings → Connections and explicit
  Connect names. Insights displayed No data for missing response/feedback samples and
  neutral No change for unchanged main metrics. View data expanded the seven-day values
  table. At 375px the document width was 375px; the temporary viewport override was reset.
  This used an empty real analytics period, not a populated-chart acceptance dataset.

Not verified by these checks: paid provider actions, live channel handoff, concurrent
writers, cross-tenant negative tests, production deploy/restore, complete keyboard and
screen-reader acceptance, physical touch, RTL, and all-theme rendered contrast.
Synthetic testing added one clearly named QA-only Atlas policy source and a local widget conversation. No test sends were made to customers or external channels. Keep this fixture separate from real customer knowledge.

Independent review of the incremental diff found the SDK error/abort and terminal-persistence gaps. Both were corrected and verified with installed-SDK mocks; the reviewer approved the scoped changes after those fixes. This does not establish full product readiness.

The knowledge URL SSRF boundary is implemented in the current PR branch for both website crawling
and direct URL extraction. One server-only fetcher rejects credentials, local names, nonstandard
ports, and non-public IPv4/IPv6 answers; pins the selected DNS address per request; rechecks each
redirect; and caps streamed bodies. Seven focused tests cover address ranges, mixed-answer DNS,
redirect rebinding, redirect policy, and byte limits. The CI workflow now runs them. This proves
local policy behavior; external-host runtime acceptance and deployment remain unverified.

## Verdict

**Block production parity claim.** The first corrections improve trust and usability.
The URL-ingestion boundary has focused local tests, while production acceptance remains
unverified. High-priority concurrency, distributed-budget and human-handoff risks in the
roadmap remain. Ship subsequent slices only after their specific gates pass. This assessment
does not approve untested domains or certify security.
