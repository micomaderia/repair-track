---
name: RepairTrack
description: Claim tickets on a lifecycle rail; a counter tool for a small computer repair shop.
colors:
  primary: "#2753E0"
  primary-pressed: "#1D43BE"
  primary-soft: "#E3EAFF"
  lavender: "#7A68EE"
  lavender-deep: "#5440CF"
  lavender-soft: "#EEEAFE"
  ink: "#13204A"
  ink-secondary: "#46527A"
  ink-tertiary: "#5F6A8E"
  ink-inverse: "#FFFFFF"
  background: "#F4F6FC"
  surface: "#FFFFFF"
  panel: "#E9EFFD"
  panel-strong: "#DCE5FB"
  border: "#DCE2F2"
  border-strong: "#BFC9E6"
  focus: "#2753E0"
  skeleton: "#E4E9F6"
  scrim: "rgba(19, 32, 74, 0.38)"
  danger: "#BE2638"
  danger-soft: "#FDE8EB"
  success: "#157347"
  success-soft: "#E0F4E9"
  warning: "#875300"
  warning-soft: "#FFF1D2"
  neutral-soft: "#ECEEF5"
typography:
  display:
    fontFamily: "System, Roboto, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: "34px"
    letterSpacing: "-0.4px"
  title:
    fontFamily: "System, Roboto, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: "28px"
    letterSpacing: "-0.2px"
  headline:
    fontFamily: "System, Roboto Medium, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: "24px"
  body:
    fontFamily: "System, Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "23px"
  body-strong:
    fontFamily: "System, Roboto Medium, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "23px"
  label:
    fontFamily: "System, Roboto Medium, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "19px"
  caption:
    fontFamily: "System, Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
  small:
    fontFamily: "System, Roboto Medium, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "16px"
  money:
    fontFamily: "System, Roboto Medium, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "22px"
    fontFeature: "tnum"
  money-large:
    fontFamily: "System, Roboto, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: "32px"
    letterSpacing: "-0.3px"
    fontFeature: "tnum"
  number:
    fontFamily: "System, Roboto Medium, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: "20px"
    letterSpacing: "0.2px"
    fontFeature: "tnum"
rounded:
  sm: "10px"
  md: "14px"
  lg: "20px"
  xl: "26px"
  pill: "999px"
spacing:
  xxs: "2px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "24px"
  xxxl: "32px"
  huge: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink-inverse}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "52px"
  button-tonal:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-pressed}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "52px"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "52px"
  button-ghost:
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "52px"
  button-danger:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "52px"
  button-compact:
    padding: "0 16px"
    height: "48px"
  text-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "52px"
  search-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: "50px"
  chip-filter:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "40px"
  chip-filter-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ink-inverse}"
  choice:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "48px"
  choice-selected:
    backgroundColor: "{colors.lavender-soft}"
    textColor: "{colors.lavender-deep}"
  status-badge:
    typography: "{typography.small}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "16px"
  ticket-header:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "16px"
  workbench-panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.xl}"
    padding: "16px"
  tab-bar:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "6px 4px"
  tab-action:
    backgroundColor: "{colors.lavender}"
    textColor: "{colors.ink-inverse}"
    rounded: "{rounded.pill}"
    size: "60px"
  sheet:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "8px 20px"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ink-inverse}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
---

# Design System: RepairTrack

## Overview

**Creative North Star: "The Claim Ticket on the Rail"**

Every repair is a paper claim ticket made calm and digital: a white ticket surface on a pale blue counter, navy type, and one visible lifecycle rail that says where the job is and what happens next. The system is built for a single operator at a shop counter, often with a customer waiting, so density is moderate and every screen leads with identity, status, and money, in that order. Light theme only.

Depth is soft and navy-tinted, never grey and never hard. Corners are generously rounded (14 to 26) so tickets, panels, and the floating tab bar read as objects laid on a counter, not cells in an admin grid. Colour is disciplined: one confident blue does the work of action and progress, lavender is reserved for "now" (the active lifecycle node, the current selection, the raised New Repair action), and status hues always arrive with a label and an icon. Figures are tabular so peso amounts and repair numbers line up.

The world rejects the admin-dashboard look: no grids of identical KPI tiles, no table-heavy chrome, no dark sidebars. Counts sit inside one tonal Workbench panel; repairs are tickets, not table rows.

**Key Characteristics:**
- Near-white pale-blue ground, white ticket surfaces, navy ink.
- One primary blue for actions, completed rail steps, and brand numbers.
- Lavender means "current": active rail node, selection, the raised + action.
- Notched, dashed divider separates a ticket's identity from its money.
- Soft navy-tinted shadows; hairline borders on every surface.
- System sans with tabular figures for every number and peso amount.
- 48dp minimum touch target; motion is short (120 to 220ms) and skipped under Reduce Motion.

## Colors

A cool, pale-blue palette: navy ink on near-white, one saturated blue, and a single lavender accent held back for the present moment.

### Primary
- **Counter Blue** (primary): primary buttons, completed lifecycle nodes and rail segments, repair and receipt numbers in brand tone, links ("View all"), chart bars, focus borders, cursor and selection colour.
- **Pressed Blue** (primary-pressed): text on tonal buttons, the active tab icon, the In Progress status foreground.
- **Blue Wash** (primary-soft): tonal button fill, the active-tab pill behind the icon, In Progress badge fill.

### Secondary
- **Now Lavender** (lavender): the raised New Repair action, the current lifecycle node and its core dot, the latest event dot on the activity timeline, the selected-choice border.
- **Deep Lavender** (lavender-deep): text on lavender surfaces (selected choice label, current rail label, avatar initials, Completed status foreground, the next-action arrow).
- **Lavender Mist** (lavender-soft): fill for the current rail node, selected choice, avatar, next-action icon well, Completed badge.

### Neutral
- **Navy Ink** (ink): all primary text; also the fill of a selected filter chip and of the toast.
- **Slate Ink** (ink-secondary): supporting text, field labels, unselected chip labels, info-row labels.
- **Mist Ink** (ink-tertiary): dates, hints, placeholders, inactive tab icons and labels, chevrons.
- **Counter Ground** (background): screen background; also the colour of a ticket's notch cut-outs and the tab action's 4px ring, so they read as holes through to the counter.
- **Ticket White** (surface): cards, tickets, fields, sheets, tab bar, footers.
- **Pale Panel** (panel): the tonal Workbench panel, empty-state icon wells, receipt icon wells, closed-repair notes.
- **Panel Edge** (panel-strong): unfilled step segments in New Repair progress and the border of tonal panels on Reports.
- **Hairline** (border) and **Strong Hairline** (border-strong): hairline outlines on every surface, dividers, unreached rail nodes, the sheet handle, outline-button border.
- **Skeleton** (skeleton): loading placeholders. **Scrim** (scrim): navy-tinted 38% overlay behind sheets.

### Semantic
- **Danger** (danger / danger-soft): unpaid badge, positive balance, inline error banners, danger button, field error border.
- **Success** (success / success-soft): paid and released badges, zero balance.
- **Warning** (warning / warning-soft): pending and partial badges.
- **Neutral Soft** (neutral-soft): fill for the Cancelled and Not set badges.

### Named Rules
**The Lavender Means Now Rule.** Lavender marks only what is current or chosen: the active lifecycle node, a selection, and the raised + action. It never decorates, and it is never a second primary button colour.

**The One Blue Rule.** Counter Blue carries action and progress. A screen has at most one filled primary button; secondary actions go tonal, outline, or ghost.

**The Never Colour Alone Rule.** Every status colour ships with an icon and a text label (badges, Workbench stage cells, status bars). Colour is a second signal, never the only one.

## Typography

**Body Font:** Platform system sans (San Francisco on iOS, Roboto on Android; Roboto Medium for 600-weight roles).
**Display Font:** the same family; hierarchy comes from size and weight, not a second face.

**Character:** Plain, legible, and native to the phone in the operator's hand. Weight (400 / 600 / 700) and tight negative tracking on the two largest roles do the shaping. Every number uses tabular figures.

### Hierarchy
- **Display** (700, 28/34, -0.4): Workbench stage counts. Not used for prose.
- **Title** (700, 22/28, -0.2): screen and shop titles, sheet titles, the repair number on the ticket header.
- **Headline** (600, 18/24): section headings ("Recent repairs"), customer name on a ticket, next-action title, empty-state titles.
- **Body** (400, 16/23) and **Body Strong** (600): running text, info rows, customer names in rows.
- **Label** (600, 14/19): buttons (set to 15 inside buttons), chips, field labels, links.
- **Caption** (400, 13/18): dates, hints, greeting, device lines in rows.
- **Small** (600, 12/16): badges, tab labels, rail step labels.
- **Money** (600, 16/22, tabular), **Money Large** (700, 26/32, tabular), **Number** (700, 15/20, +0.2, tabular): peso amounts and repair numbers.

### Named Rules
**The Tabular Money Rule.** Every peso amount, count, and repair or receipt number uses tabular figures (the money, money-large, and number roles, or an explicit tabular-nums variant). Final, paid, and balance always appear together.

**The Sentence Case Rule.** All app labels, headings, and badges are sentence or title case at their role's tracking. The app has no uppercase tracked micro-labels.

## Layout

Single column, phone first. Screen content is padded 16 horizontally and capped at 640 wide, centred, so web and tablets show a phone-width column. Vertical rhythm between screen blocks is 20; within a section, 12; inside cards, 8 to 16. The spacing scale is 2 / 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40, with occasional half-steps (6, 14) inside dense components.

Tab screens reserve 104 plus the bottom inset for the floating tab bar. Forms put their commit button in a white footer with a hairline top border, above the safe area. Sheets rise from the bottom, also capped at 640 and 92% of screen height. Every tappable thing is at least 48 high; primary buttons and fields are 52.

## Elevation & Depth

A hybrid: surfaces are separated first by tone (pale-blue ground, pale panels, white tickets) and a hairline border, then lifted by soft, wide, navy-tinted shadows at low opacity. There are three shadow levels and nothing else.

### Shadow Vocabulary
- **Card** (`0px 4px 14px rgba(27, 42, 107, 0.07)`): resting cards and repair rows.
- **Raised** (`0px 8px 22px rgba(27, 42, 107, 0.12)`): the ticket header on Repair Details, the receipt paper, the tab bar, the toast.
- **Action** (`0px 8px 18px rgba(84, 64, 207, 0.34)`): the lavender + action only.

### Named Rules
**The Navy Shadow Rule.** Shadows are tinted with the ink hue, blurred wide, and kept under 0.12 opacity. The lavender-tinted Action shadow belongs only to the raised + button.

**The Tone Before Shadow Rule.** Tonal panels (Workbench, icon wells) sit flat with no shadow; only white surfaces lift.

## Shapes

Soft, consistent rounding: 10 for small wells and compact controls, 14 for buttons, fields, choices, toasts, and banners, 20 for cards, rows, and the Workbench status strip, 26 for tickets, the Workbench panel, sheets, and the tab bar. Pills (999) for filter chips, badges, and the active-tab indicator. Circles for the avatar, rail nodes, icon wells, and the + action.

Borders are hairlines (platform hairline width) on surfaces, 1 on fields and outline buttons at rest, 1.5 for focus, error, and selection. The signature cut is the **ticket notch**: two circular cut-outs in the background colour at the card's left and right edges, joined by a dashed hairline, separating identity from money.

## Components

### Buttons
Confident, flat, full-width by default; they scale down to 0.97 on press over 120ms.
- **Shape:** gently rounded (14); compact variant 12.
- **Primary:** Counter Blue fill, white label (15, 600), 52 high, 20 horizontal padding, optional leading 20 icon with 8 gap.
- **Tonal:** Blue Wash fill with Pressed Blue label; the default secondary action and empty-state action.
- **Outline:** white with Strong Hairline border and ink label. **Ghost:** transparent with blue label. **Danger:** Danger soft fill, danger label.
- **Compact:** 48 high, 16 padding, 18 icon.
- **Disabled:** 45% opacity. **Loading:** spinner replaces the icon in the label colour; the button stays its size.

### Chips
- **Filter chips:** horizontally scrolling pills, 40 high, white with hairline border and slate label; selected inverts to a solid navy fill with white label.
- **Choice group:** equal-width segments, 48 high, 14 radius, 1.5 hairline border; selected takes a lavender border, Lavender Mist fill, and Deep Lavender label.

### Status Badges
Pill, 4 by 10 padding, tinted soft fill, 14 icon plus small label in the matching strong colour. Pending is warning, In Progress is blue, Completed is lavender, Released is success, Cancelled is neutral. Payment: Unpaid danger, Partial warning, Paid success, Not set neutral. Badges fade in over 180ms on change.

### Cards / Containers
- **Corner Style:** 20 (cards, rows), 26 (tickets, panels).
- **Background:** Ticket White on the counter ground; Pale Panel for tonal groupings.
- **Shadow Strategy:** Card level at rest; Raised for the hero ticket and receipt.
- **Border:** hairline in the border colour.
- **Internal Padding:** 16; receipt paper 20.

### Inputs / Fields
- **Style:** persistent label above (label role, slate), white field, 14 radius, 52 high, 14 horizontal padding, 1 hairline border. Optional prefix (peso sign) sits inside in body-strong slate.
- **Focus:** border turns Counter Blue at 1.5; the browser outline is suppressed because the border carries focus.
- **Error:** border turns danger at 1.5 and a caption error replaces the hint, announced politely. **Read-only:** fill drops to the counter ground.
- **Search:** same shell at 50 high with a leading search icon and a 48 clear button.

### Navigation
A floating white tab bar, 26 radius, hairline border, Raised shadow, inset 12 from the screen edges and capped at 640. Four tabs (Home, Repairs, Customers, Reports) with 22 icons over small labels; the active tab shows the filled icon in Pressed Blue on a Blue Wash pill that grows in over 180ms, label in ink. Inactive tabs use Mist Ink. The bar hides while the Android keyboard is open.

### New Repair Action (signature)
A 60 lavender circle with a white + (30), lifted 30 above the bar's centre, ringed 4 in the counter-ground colour and carrying the lavender Action shadow. It is an action, not a tab; it presses to 0.92.

### Lifecycle Rail (signature)
Four steps: Pending, In Progress, Completed, Released.
- **Full rail (Repair Details):** 28 circular nodes on a 2 line. Done nodes are solid blue with a white check; the current node is Lavender Mist with a 3 lavender ring and a 10 lavender core; future nodes are white with a Strong Hairline ring. Small labels under each node (current in Deep Lavender, done in ink, future in Mist Ink) plus a date stamp. The next-action block follows directly: a lavender arrow well, a headline, one line of body, and one primary button.
- **Mini rail (rows):** 10 dots joined by 16 by 2 lines; reached steps blue, current dot 14 lavender with a Lavender Mist ring. Cancelled greys the whole rail.

### Repair Ticket (signature)
Repair rows and the Repair Details header share one shape: number (brand blue, tabular) and date on top, customer and device in the middle, a notched dashed divider, then status and payment badges with the amount due. The Details header uses a 26 radius, the Raised shadow, and a three-column Final / Paid / Balance row; a positive balance is danger, zero is success.

### Workbench Panel
A Pale Panel (26 radius, 16 padding) holding a white status strip of three tappable stage cells (icon plus small label in the status colour, display-size count, caption), hairline-divided, and one line of "Collected in [month]" in money type beside a compact tonal New repair button.

### Sheets and Toasts
- **Sheet:** white, 26 top corners, 40 by 4 handle in Strong Hairline, title role heading, navy scrim behind.
- **Toast:** navy fill, white label, 14 radius, Raised shadow, leading 20 status icon; sits above the tab bar, fades up over 180ms, auto-dismisses at 3.2s.

### States
Empty and error states centre a 64 circular icon well (Pale Panel, or Danger soft for errors), a headline, body copy, and a compact tonal action. Skeletons pulse opacity 0.6 to 1 over 700ms and hold still under Reduce Motion.

## Do's and Don'ts

### Do:
- **Do** put the repair's identity, status, and money on one white ticket, with the notched dashed divider between identity and money.
- **Do** show where a repair is on the lifecycle rail and attach exactly one filled primary button for the next step.
- **Do** use lavender only for the current rail node, the current selection, and the raised + action.
- **Do** pair every status colour with its icon and text label.
- **Do** set every peso amount, count, and repair or receipt number in tabular figures.
- **Do** keep touch targets at 48 or more, primary buttons and fields at 52.
- **Do** keep motion between 120 and 220ms, ease-out, and skip it under Reduce Motion.
- **Do** use the supplied logo mark and wordmark as provided; never redraw them.

### Don't:
- **Don't** build dashboards from grids of identical KPI tiles or table-heavy chrome; group counts inside one tonal panel.
- **Don't** use lavender as decoration or as a second primary button colour.
- **Don't** use grey or hard-offset shadows; shadows are navy-tinted, wide, and under 0.12 opacity (the + action is the only exception).
- **Don't** put more than one filled primary button on a screen.
- **Don't** add uppercase tracked micro-labels above headings.
- **Don't** introduce a dark theme; v1 is light only.
