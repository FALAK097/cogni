# Cogni product design system

The live application uses the UserJot references supplied by Falak, adapted to Cogni's knowledge → AI answer → human handoff loop. The latest direction is minimal: open surfaces, clear typography, restrained icons, and progressive disclosure. The earlier Paper import files are exploration artifacts; this document and the application tokens describe the implemented direction.

## Foundations

| Role                  | Light     | Dark      |
| --------------------- | --------- | --------- |
| Canvas                | `#fcfbf9` | `#171615` |
| Conversation surface  | `#ffffff` | `#211f1d` |
| Text / primary action | `#282624` | `#f4f1eb` |
| Secondary text        | `#6b6865` | `#aaa59e` |
| Selection             | `#f0eeea` | `#302d29` |
| Incoming message      | `#f4f2ee` | `#2b2825` |
| Outgoing message      | `#f8f6f0` | `#24211d` |
| Structural divider    | `#e8e5e0` | `#3c3833` |
| Success text          | `#287454` | `#93c7a6` |

- Interface: locally hosted Inter, 400–700. Body 14–16px; metadata 12px; section headings 18px; page headings 24–32px.
- Public display: locally hosted Instrument Serif, regular and italic. Responsive hero 56–88px; section headings 36–60px. Never use editorial serif for dense app controls.
- Spacing: 4, 8, 12, 16, 24, 32, 48, 64, 96px. Separate sections with space; use tighter gaps within related controls.
- Buttons: charcoal primary action, quiet text/ghost utilities, pill radius. Fields: 10–12px radius. Messages and composer: 16–20px radius.
- The charcoal primary token is the filled-action treatment. Keep links, selection, and keyboard interaction perceptible through their component treatment: links use a clear hover/focus underline, selected navigation and rows use the listed selection surface plus a shape or icon cue, and every control keeps a visible focus ring. Do not rely on charcoal alone to communicate state.
- Keep borders for inputs, focus, and pane separation. Avoid decorative card outlines, nested cards, tinted icon tiles, and ornamental metric icons.
- Color communicates meaning: green for success, amber for attention, red for errors. Avatars supply small moments of personality.

## Product patterns

- **Navigation:** compact rail by default; expandable labels, keyboard shortcut, and mobile drawer. Inbox, Agent, Insights; Settings secondary.
- **Inbox:** views, conversation list, transcript, and optional contact panel. Five daily views; secondary views in a menu. Search and filters stay with the list.
- **Transcript:** incoming left, outgoing right; names and timestamps supply authorship. Resolve, take over, and the actions menu stay in the header. Per-message test buttons are removed; create a test through the conversation menu.
- **Composer:** one reply/internal-note selector, plain text area, saved-reply and Copilot utilities, one send action. Internal notes explicitly say “Team only.” Drafts remain isolated by conversation, workspace, and message type.
- **Contact panel:** identity stays visible. Technical details, assignment/workflow, and notes use native keyboard-accessible disclosure sections.
- **Agent:** Build, Test, Deploy. Knowledge and instructions first; optional behavior and booking disclosed on demand. Deployment controls first; appearance grouped under “Customize your widget.” Preview keeps its sandbox label. Publishing remains explicit.
- **Insights:** unboxed metrics and charts. Labels, numbers, and whitespace establish hierarchy. Keep actual empty/error states, date filters, and exports.
- **Settings:** people and connections are rows. Provider logos identify services without background tiles. Owner permissions and approval states remain explicit.
- **Avatars:** Blobatar 2.7.0 generates local SVG data URIs from stable identity seeds. Colors, faces, and shapes vary between identities, remain stable across renders, and require no remote avatar service. Existing profile photos are retained.

## Interaction and content

Remove repeated explanations and purely decorative icons. Retain labels, error recovery, publication boundaries, owner permissions, and private-note distinctions. Use no entrance animation for routine list navigation. Theme changes snap immediately; focus rings remain visible. Mobile uses one conversation pane and a contact drawer, rather than squeezing all desktop columns together.

Public examples are fictional and labeled. Marketing copy describes working capability without fabricated metrics, testimonials, certifications, or pricing claims. The customer-configured widget palette remains independent of dashboard chrome.
