# NIRAMAY REDESIGN — Liquid Glass

## Design Philosophy

Silent luxury applied to infrastructure monitoring. The interface breathes through whitespace and restraint. Every element earns its place. Elevation through transparency — not opacity.

---

## Color System

### Light Theme
| Token | Value | Usage |
|-------|-------|-------|
| `bg` | `#FAFAFA` | Page background — warm off-white, never clinical |
| `surface` | `#FFFFFF` | Card surfaces |
| `border` | `rgba(10,22,40,0.06)` | Near-invisible borders |
| `textPrimary` | `#0A1628` | Deep navy text |
| `textSecondary` | `#4A5568` | Supporting text |
| `textTertiary` | `#8FA3BF` | Labels, captions |
| `navyAccent` | `#1B3A6B` | Primary interactive |
| `navyMid` | `#2E5090` | Hover states |
| `hoverBg` | `rgba(27,58,107,0.05)` | Hover backgrounds |

### Dark Theme
| Token | Value | Usage |
|-------|-------|-------|
| `bg` | `#070D18` | Deep navy-black canvas |
| `surface` | `#0D1929` | Card surfaces |
| `surfaceElevated` | `#112236` | Elevated panels |
| `border` | `rgba(255,255,255,0.06)` | Ghost borders |
| `textPrimary` | `#EEF2F7` | Light text |
| `interactive` | `#4A80C4` | Bright accent |
| `glow` | `rgba(74,128,196,0.15)` | Atmospheric glow |

---

## Liquid Glass Effect

The defining aesthetic. Applied to panels, navigation, tooltips, and the theme toggle.

**Light Mode:**
```css
background: rgba(255, 255, 255, 0.72);
backdrop-filter: blur(20px) saturate(180%);
border: 1px solid rgba(255, 255, 255, 0.5);
box-shadow: 0 4px 24px rgba(10,22,40,0.06), inset 0 1px 0 rgba(255,255,255,0.8);
```

**Dark Mode:**
```css
background: rgba(13, 25, 41, 0.75);
backdrop-filter: blur(24px) saturate(160%);
border: 1px solid rgba(255, 255, 255, 0.07);
box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05);
```

---

## Typography

- **Primary**: Inter (weights 300, 400, 500)
- **Monospace**: JetBrains Mono (weight 400) — for data values
- **Weight 700 banned** — max weight is 500
- **Modular scale**: 11 / 13 / 15 / 18 / 24 / 32 / 48px

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `hero` | 48px | 300 | Stat numbers |
| `h1` | 32px | 300 | Page titles |
| `h2` | 24px | 400 | Section headings |
| `label` | 11px | 500 | Uppercase categories, 0.08em tracking |
| `mono` | 13px | 400 | Status codes, latency, scores |

---

## Component Redesign Summary

### Stats Row
- **Before**: 5 bordered cards with shadows
- **After**: 5 editorial floating numbers — 48px weight 300, no boxes, just numbers + whispered labels, separated by near-invisible horizontal rules

### Theme Toggle
- **Before**: Navy accent toggle with track/knob
- **After**: 48×26px glass pill with spring-physics orb. Navy orb in light, glowing blue orb in dark. Spring easing: `cubic-bezier(0.34, 1.56, 0.64, 1)`

### Navigation
- **Before**: Inline header with controls
- **After**: Fixed 64px nav, transparent at rest, gains glass effect on scroll. "Niramay" wordmark weight 300

### Panels (Observation, Detection, Healing, AI Copilot)
- **Before**: Solid surface cards with borders
- **After**: Liquid glass containers — semi-transparent with backdrop-filter blur. Near-invisible borders. Headers with uppercase labels

### Table Rows
- Row borders: `1px solid rgba(10,22,40,0.06)` — barely there
- Row hover: `rgba(27,58,107,0.03)` — whisper background
- Status codes in JetBrains Mono
- Stagger entrance: 40ms between items

### Buttons
- Primary: Navy fill (#1B3A6B), spring hover lift `translateY(-1px)`, micro press `scale(0.985)`
- Ghost: Transparent with border, navy fill fades in on hover
- Focus: `outline: 2px solid rgba(46,80,144,0.5), offset: 3px`

---

## File Structure

```
src/
  designSystem.ts          — Tokens, glass helpers, theme context
  index.css                — Global styles, scrollbar, shimmer, reduced motion
  components/
    Toggle.tsx             — Glass pill theme toggle
    SkeletonBlock.tsx       — Shimmer loading
    EmptyState.tsx          — Thin-stroke icon + restrained text
    StatCard.tsx            — Editorial floating number
    ObservationFeed.tsx     — Glass panel, traffic table, sparkline
    DetectionAlerts.tsx     — Glass panel, anomaly cards, bar chart
    HealingActions.tsx      — Glass panel, healing items, SVG icons
    AICopilot.tsx           — Glass panel, AI features, chat
  pages/
    HealingDashboard.tsx    — Orchestrator, glass nav, layout
```

---

## Packages Added/Removed
- **Font added**: JetBrains Mono (Google Fonts, weight 400)
- **Font removed**: Plaifair Display
- **Font changed**: Inter reduced from 300-600 to 300-500
- **No npm packages added or removed**

---

## Easing Curves
| Name | Value | Usage |
|------|-------|-------|
| `standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | State transitions |
| `spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Entrance, hover lift |
| `out` | `cubic-bezier(0.0, 0, 0.2, 1)` | Exit animations |

## Durations
| Name | Value | Usage |
|------|-------|-------|
| `micro` | 80ms | Active/press states |
| `fast` | 150ms | Hover, focus |
| `default` | 220ms | State transitions |
| `slow` | 400ms | Theme switch, layout |

---

## Scrollbar
```css
width: 4px;
thumb: rgba(27, 58, 107, 0.15);  /* light */
thumb: rgba(74, 128, 196, 0.2);  /* dark */
```

---

## Accessibility
- WCAG AA contrast met on all text/background combinations
- `:focus-visible` outline on every interactive element
- `@media (prefers-reduced-motion: reduce)` disables all animations
- `role="switch"` and `aria-checked` on toggles
- `aria-label` on icon-only buttons

---

## Design Consistency Rules for New Features
1. All colors reference `designSystem.ts` — no hardcoded values
2. All spacing uses the `sp` scale — no 15px, 22px, 37px
3. Elevated surfaces use the `glass()` helper
4. Interactive elements MUST have hover + active + focus states
5. Text uses only Inter (body) or JetBrains Mono (data)
6. Maximum font weight is 500
7. Borders use rgba, never solid color tokens
8. No spinners — shimmer skeletons only
