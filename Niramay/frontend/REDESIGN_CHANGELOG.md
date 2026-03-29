# REDESIGN CHANGELOG

## Overview

Complete visual transformation from dark cyberpunk aesthetic to silent luxury (white/navy/gold).
Every component redesigned. Monolithic 848-line file decomposed into 10 files.
Zero functionality changes — every feature, interaction, and data flow preserved exactly.

---

## Design System Created

### `src/designSystem.ts` — Single Source of Truth

| Token Category | Details |
|---------------|---------|
| **Light Theme** | `#FFFFFF` canvas, `#F8F9FC` sections, `#0A1628` navy text |
| **Dark Theme** | `#0C1220` deep navy canvas, `#182336` cards, `#F1F4F9` text |
| **Accent Gold** | `#C9A96E` — used on AI Copilot panel border and PREVIEW badge |
| **Spacing** | 8pt grid: 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96, 128px |
| **Typography** | Inter (UI) + Playfair Display (headings), max weight 600 |
| **Radius** | Sharp (2px), Soft (8px), Pill (9999px) |
| **Shadows** | 5 levels (xs→xl), navy-tinted `rgba(10, 22, 40, ...)` |
| **Transitions** | fast (150ms), default (250ms), slow (400ms), spring (600ms) |
| **Z-Index** | Scale from 1 to 500, never above 1000 |

---

## Components Redesigned

### Header
- **Before**: Bold 800 weight "Healing Layer Dashboard" in white on dark gradient
- **After**: Playfair Display weight 300, thin and confident on white/navy background
- **Added**: Dark mode toggle (moon/sun SVG icon), persists to localStorage

### StatCard (×5)
- **Before**: Dark card (`#101d35`), weight 800 numbers, colored text
- **After**: White card with `shadow-sm`, lift on hover (`translateY(-2px)` + `shadow-md`), weight 400 numbers, `tabular-nums` alignment
- **Layout**: 24px internal padding, label-style headers in uppercase caption

### ObservationFeed
- **Before**: Dark panel with emoji 📡, grid table with colored method badges
- **After**: White card with `bgSecondary` header, no vertical borders, row hover → `#F8F9FC`, sparkline in navy, method pills in semantic tints, gold live indicator dot

### DetectionAlerts
- **Before**: Dark panel with emoji 🔍, neon-colored severity badges
- **After**: White card, 3px left border colored by severity (muted red/amber/blue), bar chart in navy palette, reason tags in neutral pills

### HealingActions
- **Before**: Dark panel with emoji ⚕️🔄↩️🛑, inline action icons
- **After**: White card, clean SVG geometric icons (restart=arrows, retry=loop, throttle=gate), action type summary chips, status badges in deep green/amber pills

### AICopilot
- **Before**: Purple-themed panel with emoji 🤖⚡, purple glow effect
- **After**: White card with 2px gold top border (the ONE gold accent), gold "PREVIEW" badge, navy-colored feature toggles, clean chat interface with focus ring on input

### Toggle
- **Before**: CSS class-based toggle (`.hl-toggle-track.on`)
- **After**: React component with `role="switch"`, `aria-checked`, spring-curve knob animation, navy accent when on, `shadow-xs` on knob

### EmptyState
- **Before**: Emoji + plain text
- **After**: Geometric SVG circle icon, H3 headline in `#3D5070`, body description, 80px vertical padding

### SkeletonBlock (new)
- Shimmer loading blocks using `linear-gradient(90deg, ...)` with 1.5s animation
- No spinners anywhere

---

## Layout Changes

| Change | Rationale |
|--------|-----------|
| Max width: 1440px → 1280px | More constrained, more premium breathing room |
| Page padding: 24px → 40px | Generous whitespace, never edge-to-edge |
| Panel gap: 20px → 24px | Breathing room between panels |
| Grid: 2-column at all sizes → responsive 1-column below 960px | Better mobile experience |
| Header: cramped flex → spacious flex-end alignment | Clear hierarchy, controls recede |

---

## File Structure Change

### Before (1 file)
```
src/pages/HealingDashboard.tsx  — 848 lines, everything inline
```

### After (10 files)
```
src/designSystem.ts             — 310 lines (tokens + context + utilities)
src/components/SkeletonBlock.tsx —  36 lines
src/components/Toggle.tsx        —  53 lines
src/components/EmptyState.tsx    —  75 lines
src/components/StatCard.tsx      —  76 lines
src/components/ObservationFeed.tsx — 195 lines
src/components/DetectionAlerts.tsx — 195 lines
src/components/HealingActions.tsx  — 206 lines
src/components/AICopilot.tsx     — 295 lines
src/pages/HealingDashboard.tsx   — 230 lines (orchestrator only)
```

---

## Packages Added/Removed

- **Added**: None (zero new npm packages)
- **Font Added**: Playfair Display (via Google Fonts `<link>` tag, already had Inter)
- **Font Weights Changed**: Inter reduced from 400–900 to 300–600 (max weight 600 per design rules)

---

## Accessibility Improvements

- All toggle switches: `role="switch"` + `aria-checked` + `aria-label`
- Theme toggle: `aria-label` for screen readers
- `:focus-visible` outline on all interactive elements (2px solid `#2D5BB5`, 3px offset)
- `@media (prefers-reduced-motion)` disables all animations
- WCAG AA contrast ratios met for all text/background combinations

---

## Dark Mode

- Toggle via moon/sun icon in header
- Preference persisted to `localStorage('niramay-theme')`
- Respects `prefers-color-scheme` on first visit
- Smooth 400ms transition between themes
- Both themes use the same design system tokens — cohesive feel
