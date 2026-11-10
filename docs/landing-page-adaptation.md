# Cogni landing page: adapting the UserJot reference

Prepared 7 October 2026. Design proposal for the next Paper session; no landing-page implementation is included.

For feature opportunities, product-development priorities, discovery and delivery gates, see [product-opportunities.md](./product-opportunities.md). Keep future concepts separate from the launch page's accepted capabilities.

## Product direction and evidence

The product direction is **AI agent + shared support inbox for small SaaS support teams**. A business adds knowledge, configures and tests an agent, installs a branded widget, and handles exceptions in Inbox. Insights helps the team review conversation activity, response times and feedback.

The landing page should make that journey concrete. Its main promise is continuity: a customer can get an answer from the company's knowledge and reach a teammate in the same conversation. Grounding, controlled handoff and deliberate testing are stronger differentiators than a generic claim that the AI understands everything.

Sources reviewed in the current checkout:

- [Product roadmap](./product-roadmap.md): audience, product promise, implementation gaps, phases and readiness gates.
- [Product assessment](./product-assessment.md): local validation, browser evidence and outstanding acceptance boundaries.
- [Product design](./product-design.md): Geist, Cogni blue, semantic tokens, compact navigation and interaction contracts.
- `src/app/page.tsx`, `src/components/landing/`: current public narrative and illustrative product UI.
- `src/features/navigation/app-routes.ts`: Inbox, Agent, Insights and Settings; Agent's Build, Test, Customize and Deploy steps.
- `src/features/integrations/registry.ts`: provider-specific integration descriptions.
- `src/app/globals.css`: current OKLCH palette and semantic roles.

These are repository observations, not a fresh production acceptance audit. The roadmap and assessment contain entries from several implementation passes. Their summaries and detailed evidence can differ in freshness; resolve a feature's exact status against current code and a focused runtime check before publishing a claim.

The visual reference is [UserJot](https://userjot.com/), inspected in the browser on 7 October 2026. Its extracted Paper file is [UserJot — Landing Page & Design System](https://app.paper.design/file/01M4AJ6ADFAXTH2340PGPRADFV/p-1-0). Paper's quota stopped the reference recreation after the first six sections and 42 tokens. The extraction is a reference, not a finished Cogni design.

## Narrative and conversion goal

The visitor should leave with five answers:

1. What is Cogni? An AI support agent and a shared inbox.
2. How does it answer? From the company's ready knowledge sources and configured behavior.
3. What happens when it cannot help? The conversation goes to the team, with its history intact.
4. How do I set it up? Build, Test, Customize, Deploy.
5. How do I stay in control? Review evidence, handle conversations and inspect feedback and activity.

Primary audience: a founder or support lead at a small SaaS company. Developers are installation and integration stakeholders, rather than the headline audience. Avoid leading with model providers, infrastructure or an agent-development platform.

Primary conversion: **Get started** → `/sign-in`. Google sign-in is the actual authentication flow. Secondary conversion: **See how it works** → an on-page product demonstration. A later **Talk to us** action can use the existing contact flow.

Do not use “free forever,” “no credit card,” a setup-time guarantee or new prices until the commercial offer and onboarding journey support them. A live “Try Cogni” action needs a working, isolated public demo; until then, the secondary action opens a clearly labeled illustrative walkthrough.

## What to carry across from UserJot

Preserve the reference's calm editorial register: ample white space, regular-weight display type, occasional italic serif emphasis, pill actions, fine warm borders, asymmetric text/demo layouts and one dark feature moment. Product UI should do most of the explaining.

Keep the proportions and relationships, then adapt the identity. Cogni keeps its own logo, blue interactive accent, product terminology and actual screen structure. The UserJot mascot, customer logos, quotes and support/product-feedback capabilities are not Cogni assets or evidence.

The current Cogni page uses a landscape hero, white display text, multiple colored feature illustrations and an analytics-first mockup. The proposal replaces those treatments with a light editorial hero and a conversation-first demonstration. Analytics moves later, where it answers the buyer's measurement question.

## Reference-section mapping

| UserJot reference            | Cogni adaptation                                                          | Decision                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Header                       | Cogni logo, Product, How it works, Integrations, FAQ, Log in, Get started | Keep the quiet horizontal layout; link only to real destinations           |
| Hero and tabbed product tour | AI answer, Human handoff and Team inbox states of one conversation        | Retain the large product frame; narrow the tour to the support loop        |
| Customer logo paragraph      | Omit at launch unless Cogni has permission and verified relationships     | Do not repurpose integration logos as customer proof                       |
| Right inside your app        | Branded Cogni widget in a fictional SaaS product                          | Preserve the split demo/text composition                                   |
| Meet Juno                    | An agent grounded in your knowledge                                       | Preserve the dark editorial panel; use Cogni identity and evidence visuals |
| Built for the everyday       | Shared views, internal notes, saved replies and snoozing                  | Reduce to four high-value details with authentic UI                        |
| Life of a request            | Life of a support conversation: Ask → Answer → Handoff → Review           | Rebuild around the same customer and transcript                            |
| See what matters             | Shared inbox and human ownership                                          | Preserve the large UI plus numbered annotations                            |
| Ship it, and say so          | Insights: volume, response times and feedback                             | Replace the changelog narrative completely                                 |
| Your agent works here too    | Optional connected actions and team tools                                 | Include only verified provider examples; no external MCP promise           |
| Everything else, A to Z      | Compact controls/capabilities strip                                       | Remove the exhaustive alphabet directory                                   |
| Testimonials                 | Later proof slots                                                         | Keep out of the launch composition until evidence exists                   |
| FAQ, CTA, footer             | Setup, knowledge, handoff, data handling and next step                    | Keep the editorial pattern; write Cogni-specific answers                   |

## Proposed page order and section briefs

Use a shorter composition than the reference. The sequence below is a narrative target, not a requirement to preserve every UserJot block.

### 1. Header and hero — understand the product immediately

**Working headline:** “AI support that knows your product. A team inbox when people are needed.”

Set the first idea in Geist and emphasize one short phrase in Instrument Serif italic. Avoid mixing typefaces across every sentence. At 1440px, aim for two or three comfortable lines within an approximately 900px headline lane; adjust wording before shrinking the type.

**Supporting copy:** “Answer customer questions from your knowledge, hand conversations to your team, and manage support in one place.”

Use Get started and See how it works. Under the actions, show a large Cogni product frame with three manually selectable states: AI answer, Human handoff, Team inbox. The last state should expose the real compact navigation: Inbox, Agent, Insights and Settings.

Default to the AI-answer state. The visitor sees a question, a concise answer and a source title. The second state shows the same customer asking for a person; the third shows the teammate handling that conversation. This makes the primary product promise visible before introducing feature names.

Use a discreet, readable “Demo workspace · illustrative conversation” caption. Any example counts are sample data, not customer outcomes. Do not autoplay the tabs at launch: manual switching is easier to inspect and cheaper to implement well.

### 2. Widget — support belongs in the customer's product

**Working heading:** “Right where your customers need you.”

Preserve UserJot's asymmetric layout: large app/window visual on one side and a short explanation on the other. Replace its feedback/roadmap navigation with Cogni's actual widget structure and recent-conversation behavior.

Show the Cogni launcher, branded welcome state, conversation starters and a short conversation. Use an original fictional SaaS screen around the widget. Four supporting points can cover branded appearance, knowledge-based answers, recent chats and requesting a teammate.

On mobile, show the widget at a readable width and place the surrounding fictional application second. Do not squeeze a desktop browser down until its text is illegible.

### 3. Agent — establish why the answer can be trusted

**Working heading:** “Your knowledge. Your support agent.”

Use the reference's single dark panel with a large mixed-type headline. Replace Juno's face with Cogni's mark or a small source-to-answer visual. Avoid inventing a named agent personality before the product has one.

The visual should connect three understandable things: a ready source, configured instructions and a test answer with visible source evidence. A source title and short excerpt are more useful than an ornamental knowledge graph or an unsupported confidence percentage.

Copy should explain that the business supplies its content and behavior, then tests what the agent says. Add a compact no-answer example: insufficient information leads to a clear fallback or configured handoff. Retrieval controls do not justify a promise that every answer is correct.

### 4. Setup — make the work predictable

**Working heading:** “Build it. Test it. Make it yours. Go live.”

Use the existing lifecycle labels exactly: Build, Test, Customize, Deploy. Present a short stepper with one focused screenshot or visual changing beneath it. This replaces the current setup sequence that suggests installing the widget before preparing and testing knowledge.

| Step      | Customer task                                                                          | Visual evidence                                                    |
| --------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Build     | Add URLs, sitemaps, pasted text or supported files; configure instructions and handoff | Ready/processing/source-error states and a small instruction field |
| Test      | Ask representative questions and inspect evidence and fallback                         | Grounded answer, no-evidence response and human-request test cases |
| Customize | Adjust widget appearance, welcome message and starters                                 | Real widget preview with Cogni-supported options                   |
| Deploy    | Publish the tested configuration, authorize a domain and install the loader            | Installation snippet, domain field and publish/version state       |

Make source readiness and testing visible without turning the page into an implementation manual. Avoid a fixed setup-time claim: source processing and provider configuration affect time to first useful answer.

### 5. Inbox and conversation lifecycle — prove the handoff

**Working heading:** “AI and people, in the same conversation.”

Combine the reference's request lifecycle and requests dashboard into one strong Cogni section. The core visual is a readable Inbox: conversation list, transcript and customer Details. Include three numbered annotations: conversation history, explicit AI/human ownership, and internal notes/customer context.

The sequence is Ask → Answer → Handoff → Review. Ask happens in the widget; Answer shows source evidence; Handoff shows AI paused and the teammate replying; Review shows status and feedback/activity. Review is a team task, not an automatic closed-conversation-to-knowledge-update promise.

Distinguish “AI paused,” “Assigned to Maya” and “Closed.” A closed status does not prove that an issue was resolved. Internal notes must be visibly separate from public replies; the marketing demo should preserve this boundary.

At narrow widths, show the selected transcript and a small list/context switch rather than four compressed panes. Keep the important ownership state visible.

### 6. Everyday support — useful detail without a feature wall

**Working heading:** “The details that keep support moving.”

Adapt the reference's varied feature-card sizes to four concrete support tasks:

- **Find the next conversation.** Show a saved view with explicit unread counts and a selected conversation.
- **Keep context with the team.** Show a clearly labeled internal note beside the public transcript.
- **Reuse a good reply.** Show a saved reply inserted into an editable composer; sending remains deliberate.
- **Come back at the right time.** Show a snoozed conversation and its return time; avoid implying an SLA system.

Use authentic snippets with one meaningful detail per card. Favor a larger inbox/notes card and smaller saved-reply/snooze examples rather than four equal cards. Attachments can replace a card once populated rendering is verified. Do not introduce live translation, voice dictation, email forwarding or collision detection merely because the reference illustrates them.

### 7. Integrations — explain the effect of a connection

**Working heading:** “Connect the tools behind your support.”

Separate team notifications, agent actions and inbound messaging in the wording. The current catalog includes providers with different capabilities and setup needs; a logo is not proof that every channel works end to end.

The most useful candidate examples are Slack escalation notifications, Gmail email actions and Calendar scheduling actions. Provider-specific acceptance decides which examples become launch content. If none are verified, keep the section brief and link to supported setup documentation rather than showing a completed action.

For an approved action demo, use Request → Approval → Result. A scheduled event or sent email must correspond to the provider's confirmed result. Do not illustrate refunds, subscription changes or CRM mutations without an implemented and accepted action.

WhatsApp, Teams and Google Chat should not appear as interchangeable ready-to-use support channels until their tenant-bound inbound/reply/handoff journeys are verified. Avoid an external-agent MCP section: that is UserJot's proposition, not an established Cogni launch capability.

### 8. Insights — understand what happened

**Working heading:** “See the conversations. Find the next improvement.”

Place a large, simplified Cogni Insights visual where UserJot has its changelog editor. Show a clear period, conversation volume, response times and available feedback. Use the current chart and metric terminology.

Use sample data only when visibly labeled. Keep metric definitions accessible. Closed conversations must retain that label; missing feedback must remain unavailable rather than becoming a zero satisfaction score. Do not add an AI resolution rate, ROI calculator or claimed reduction in ticket volume without measurement.

Pair the visual with a short operational narrative: review low-rated conversations, inspect their evidence and adjust sources or instructions before testing again. This describes the team's process. A durable improvement queue, automatic optimization and model-quality scoring remain separate capabilities requiring implementation and acceptance.

### 9. Controls and trust — remove concrete buyer uncertainty

**Working heading:** “Clear controls before you go live.”

Use a restrained editorial strip rather than a compliance-badge wall. Candidate points: test configuration before publishing, allow the intended website domains, restrict dashboard access through workspace membership, and keep external actions under the available approval controls.

Each point should link to a real explanation or setting where appropriate. Explain AI-provider processing in the data-handling FAQ. Do not substitute implementation names such as Neon or Cloudflare for a data-security promise. Retention, deletion, data residency, SSO and certifications need their own evidence before marketing inclusion.

### 10. FAQ, final action and footer — give a clear next step

Use UserJot's left heading/right question layout. Prioritize: how knowledge is added, what testing shows, what happens on handoff, how the widget is installed, which tools can connect, how data is handled and what the commercial offer includes once defined.

Keep native disclosure behavior and readable focus states. Answers should be concise and describe the available workflow rather than roadmap ambitions.

**Working final heading:** “Give your customers an answer. Give your team the context.”

Repeat Get started and provide Talk to us. End with Cogni's actual product, documentation/contact and legal destinations. No decorative links to unbuilt blogs, comparisons, pricing pages or help centers.

## A single demonstration story

Use one fictional workspace and one customer throughout the page. Example: a customer asks where to export project data; the agent answers from a fictional Data export guide. The customer then says the export failed and asks for a person. The configured handoff pauses AI replies, a teammate takes over and uses the conversation history. Later, the team reviews feedback and tests an updated instruction/source.

The export instruction is a synthetic fixture for a fictional SaaS product, not a statement about Cogni's own UI. Reuse identical names, wording, source title and times across hero, widget and inbox visuals. Keep a distinct successful-answer path and a handoff path. Do not depict the agent performing an export simply because it can explain a guide.

This continuity is the main visual device. It reduces the need for mascots, unrelated screenshots, stock photography and repeated testimonials.

## Adapting the design system

| Role                  | Extracted UserJot direction                  | Proposed Cogni treatment                                                             |
| --------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------ |
| Main surface          | White; cream feature/hero surfaces           | White as the main ground; restrained cream reference surface within marketing        |
| Text                  | Warm ink and regular display weights         | Existing Cogni foreground roles, regular display hierarchy                           |
| Primary action        | Near-black pills                             | Cogni blue primary token, with a tested foreground and hover/focus states            |
| Secondary action      | Plain text/pill                              | Quiet text action with clear hover and focus feedback                                |
| Sans type             | Inter / InterDisplay                         | Keep Geist per the existing product design contract; retune tracking and proportions |
| Serif emphasis        | Instrument Serif italic                      | Add only to marketing headlines and optional genuine quotes                          |
| Product illustrations | UserJot UI and status colors                 | Authentic Cogni labels, components, Hugeicons and semantic states                    |
| Corners               | Pills, soft demo shells, large feature radii | Separate marketing sizes from the app's 12px base radius                             |
| Motion                | Scroll reveals and cycling demos             | Short local transitions; immediately available copy; manual demo selection           |

Suggested marketing sizing: 1440px desktop canvas, 1120px principal content lane; 60–68px hero, 48–52px section headings, 22–24px feature titles, 18px body and 14–15px labels. Use 144–176px desktop section rhythm where the narrative benefits, 72–96px on mobile, and 16–24px within feature groups. These are starting design values, not measured Cogni acceptance results.

Reference cream is `#FAF7F2`, borders `#EEECE9`, heading ink `#282624`. Cogni's actual primary is `oklch(0.42 0.16 259)` in the current light theme. Use those observed values to start the Paper comparison; the implementation should map approved roles to semantic tokens rather than scatter literal values across components. Reference muted gray must not automatically become small body text: verify contrast against the actual surface.

Create namespaced marketing roles for display/accent typography, hero surface, quiet panel, editorial dark panel, demo shell and marketing radii. Reuse global primary, foreground, border and status roles where they fit. Keep the app's dense screen typography and dark theme intact; a marketing redesign does not authorize redesigning the operational interface.

Mobile artboards should be intentionally composed. Replace desktop panoramas with readable crops and sequential screens, stack asymmetric sections and keep 44px actions. Test at 390px, then check 320px and zoom. Reduced motion should show completed static states; primary content should be visible without waiting for a reveal.

## Claim and proof gates

| Candidate marketing statement                              | Repository evidence                                                         | Before launch                                                                               |
| ---------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Add knowledge from URLs, sitemap, text and supported files | Ingestion/UI present; named ready-source fixture observed in the assessment | Verify supported types, source states and successful answer against the launch environment  |
| Inspect source evidence                                    | Test guidance and persisted bounded inbox evidence documented               | Capture a successful provider-backed answer and populated rendered citations                |
| Human support in the same conversation                     | Takeover/pause/reply controls and transcript history documented             | Complete visitor-to-teammate round trip and verify competing AI replies stop                |
| Build, Test, Customize, Deploy                             | Canonical navigation and builder UI documented                              | Use current labels; verify publish/domain/install behavior before screenshots imply success |
| Saved views, notes, replies and snooze                     | Current implementation and focused evidence recorded                        | Capture the chosen populated states, including narrow viewport behavior                     |
| Connected actions and messaging                            | Registry, adapters, approvals and provider-specific code                    | Verify each advertised provider action/channel separately                                   |
| Volume, response times and feedback                        | Insights aggregation and empty-state evidence recorded                      | Reconcile chosen metrics to populated fixtures; label demonstrations as sample data         |
| Automatic improvement / guaranteed resolution              | Product ambition, not established measured capability                       | Omit launch guarantees and automated improvement claims                                     |

Code-level evidence can justify exploring a design; release copy should be backed by accepted behavior. The assessment explicitly blocks a production-parity claim. No new competitive-parity, certification, customer-count or performance claim is authorized by this design brief.

## Paper work plan when access returns

1. Preserve the extracted UserJot file as a reference. Create a separate Cogni adaptation file; retain the partial reference status rather than labeling it complete.
2. Build an annotated product-story board from this brief. Decide the core headline, demo story and launch-capability subset before fine visual work.
3. Create a Cogni marketing foundations board: role tokens, Geist/serif specimens, buttons and focus states, spacing, radii and demo components. Keep observed reference values separate from approved Cogni choices.
4. Design hero, widget and handoff first. These establish the page's identity and should pass a visual and narrative review before extending the rest.
5. Complete setup, inbox details, everyday support, Insights, FAQ and final action. Add the integrations section only for the launch-ready examples.
6. Design dedicated mobile compositions and key hover/focus/selected states. Review every section for hierarchy, contrast, alignment, clipping and continuity.
7. Review copy against the roadmap and assessment, then against current runtime evidence. Remove unsupported visual implications as well as unsupported written claims.
8. If implementation is requested, export exact Paper JSX/styles/assets and translate them into the existing landing components. Read installed Next.js documentation before code changes; preserve unrelated work in the checkout.

Paper deliverables: desktop landing artboard, mobile landing artboard, design-system board, editable product-demo components and a clearly separated capability/claim annotation board. Keep internal evidence notes outside the public page composition.

Implementation slices after design: foundations/header/hero; widget/agent/setup; inbox/support details; verified integrations/Insights; FAQ/footer and responsive polish. Verify formatting, lint, types, build and browser acceptance appropriate to the actual code change. Avoid adding substantial animation dependencies for an otherwise static page.

## Decisions to settle during design review

- Exact headline and which phrase receives serif emphasis.
- Whether integrations deserve a full section at the launch evidence level.
- Commercial offer and whether any “free” CTA is appropriate.
- Any genuine customer proof available for a later proof section.
- Whether the secondary CTA remains an illustrative tour or can become an isolated live demo.

These decisions do not block the initial design. Start with Get started, an illustrative tour, no invented customer proof and no new commercial promises.
