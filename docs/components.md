# Cogni Components v1.0

> Component Library & UI Specifications

---

# Design Principles

Every component should be:

- Consistent
- Predictable
- Accessible
- Minimal
- Enterprise-grade
- Keyboard friendly
- Responsive

---

# Buttons

## Primary

Usage

Main CTA only.

Examples

- Start Free Trial
- Create Agent
- Save Changes

Height

44px

Padding

24px Horizontal

Radius

12px

Font

16px
Medium

Background

Primary Blue

Text

White

Hover

Background becomes slightly darker.

Active

Scale 0.98

Disabled

50% opacity

Cursor

pointer

Maximum one primary button per section.

---

## Secondary

White background

1px Border

Primary Text

Hover

Light gray background.

---

## Ghost

Transparent

No Border

Hover

Very light gray background.

---

## Danger

Red background.

Only for destructive actions.

Delete

Remove

Disconnect

---

# Icon Button

Square

40x40

Radius

10px

Centered Icon

Hover

Light gray background

Never use icon-only buttons without tooltip.

---

# Input

Height

48px

Radius

12px

Border

1px

Padding

16px

Placeholder

Muted text

Focus

Primary Border

Never animate.

---

# Search Bar

Height

48px

Leading Search Icon

Optional Shortcut

Ctrl K

Clear Button

Optional

---

# Textarea

Minimum Height

120px

Auto Resize

Yes

Maximum

400px

---

# Select

Height

48px

Chevron Right

Animated 180°

Searchable

When options > 10

---

# Checkbox

18px

Rounded

4px

Label clickable.

---

# Radio Button

18px

Circle

Use only for mutually exclusive options.

---

# Toggle Switch

Width

44px

Height

24px

Smooth transition.

---

# Badge

Small

24px Height

Padding

12px

Radius

999px

Variants

Primary

Success

Warning

Danger

Neutral

---

# Avatar

Sizes

24

32

40

48

64

Rounded

Circle

Fallback

Initials

---

# Card

Radius

16px

Padding

24px

Border

1px

No heavy shadow.

Optional Header

Optional Footer

---

# Stat Card

Contains

Icon

Title

Value

Change Indicator

Optional Sparkline

---

# Sidebar

Width

280px

Collapsed

72px

Sticky

Yes

Icons Left

Labels Right

Active Item

Primary Background

Never use more than two navigation levels.

---

# Top Navigation

Height

72px

Contains

Logo

Workspace Switcher

Search

Notifications

Profile

---

# Breadcrumb

Maximum

4 Levels

Separator

/

---

# Tabs

Height

44px

Active

Primary Border Bottom

Hover

Light Gray

---

# Accordion

Default

Collapsed

Chevron rotates.

---

# Modal

Width

600px

Radius

20px

Padding

32px

Overlay

Black 50%

ESC closes.

---

# Drawer

Right Side

Width

480px

Mobile

Full Width

---

# Tooltip

Delay

300ms

Never place important information only inside tooltip.

---

# Toast

Top Right

Duration

4 Seconds

Variants

Success

Info

Warning

Danger

Maximum

3 visible

---

# Progress Bar

Height

8px

Rounded

Full

Animated

Only while active.

---

# Skeleton

Preferred loading state.

Never use spinner for page loads.

---

# Table

Row Height

56px

Header

Sticky

Border Bottom

Only

Hover

Light Gray

Selectable

Optional

Bulk Actions

Appear only after selection.

---

# Pagination

Buttons

40px

Show

Previous

Numbers

Next

---

# Empty State

Contains

Illustration

Title

Description

CTA

---

# Chat Message

User

Right

Primary Background

AI

Left

White Card

Timestamp

Small

---

# Chat Input

Sticky Bottom

Auto Grow

Voice Button

Optional

Attachment

Optional

Send Button

Primary

Enter

Send

Shift Enter

New Line

---

# Conversation List

Unread Indicator

Blue Dot

Hover

Light Gray

Selected

Primary Background

---

# Agent Card

Contains

Avatar

Name

Status

Channels

Quick Actions

---

# Notification

Small

Compact

Dismissible

Grouped by date.

---

# Timeline

Vertical Line

Timestamp

Title

Description

Optional Icon

---

# Command Palette

Shortcut

Ctrl + K

Centered

Search First

Keyboard Navigation Required

---

# File Upload

Drag & Drop

Click Upload

Progress

Preview

Retry

Remove

---

# Calendar

Week View

Month View

Today Highlight

Keyboard Accessible

---

# Charts

Minimal

No 3D

Rounded Corners

Consistent Colors

Show Tooltips

Do not overload with data.

---

# Dashboard Layout

Header

Stats Row

Charts

Recent Activity

Tasks

Responsive

---

# Mobile

Bottom Sheet instead of Modal

Bottom Navigation if needed

Minimum touch target

44px

---

# Responsive Breakpoints

Mobile

<640px

Tablet

640–1024px

Desktop

1024–1440px

Large Desktop

1440px+

---

# Hover Rules

Only interactive elements should change.

Hover should never distract.

Avoid bouncing.

Avoid glowing.

---

# Animation Rules

150–200ms

Ease Out

Fade

Opacity

Small Scale

Nothing else.

---

# Accessibility

Keyboard Navigation

Required

Focus Visible

Required

Screen Reader Labels

Required

ARIA

Required

Minimum Touch Target

44px

Contrast

WCAG AA

---

# Component Naming Convention

Button

Button.Primary

Button.Secondary

Button.Ghost

Input

Input.Text

Input.Search

Input.Password

Card

Card.Default

Card.Stat

Card.Agent

Chat

Chat.Message

Chat.Input

Chat.Sidebar

Modal

Modal.Default

Modal.Confirmation

Modal.Form

---

# Future Components

- Kanban Board
- Workflow Builder
- AI Agent Builder
- Analytics Dashboard
- Knowledge Base Editor
- Inbox
- Omnichannel Conversation Panel
- Ticket Detail Panel
- Customer Profile Drawer
- Agent Playground
- Prompt Editor
- API Keys Page
- Billing Components
- Team Management
- Audit Logs
- Usage Charts
- Notification Center

---

# Golden Rule

Every new component must:

✓ Reuse existing spacing

✓ Reuse typography

✓ Reuse colors

✓ Reuse border radius

✓ Reuse shadows

✓ Reuse interaction patterns

Never invent a new style if an existing one already solves the problem.
