# PRD: Landing Page Redesign

## Overview

Redesign the Priori landing page to better showcase the full depth of features now available, while maintaining the established brand identity and familiar user experience for existing users.

## Background

The current landing page was designed when Priori was a simple prioritisation tool with basic scoring frameworks. Since then, significant features have been added:
- Planning Poker (story point estimation)
- Backlog Management (drag-and-drop with cutoff line)
- Visual Roadmap (timeline planning across periods)
- Team Chat (real-time messaging)
- Enhanced real-time collaboration

The current page only highlights "Multiple prioritisation frameworks", "Real-time collaboration", and "No authentication required" — it doesn't communicate the breadth of the product.

## Goals

1. **Showcase feature depth** — Communicate that Priori is more than just a scoring tool
2. **Maintain brand continuity** — Keep existing branding (colours, logo, typography) that users recognise
3. **Preserve simplicity** — Keep the clean, focused CTA above the fold
4. **Improve conversion** — Help visitors understand value before creating a session

## Non-Goals

- Changing the brand colours or logo
- Adding authentication or sign-up flows
- Adding pricing information
- Removing the instant "Create New Session" flow

## Design Reference

- Desktop mockup: `plans/landing-page-redesign.mockup.html`
- Mobile mockup: `plans/landing-page-redesign-mobile.mockup.html`
- Brand reference: `plans/branding-concepts.mockup.html`

## Brand Guidelines (Maintain Existing)

### Colours
| Token | Value | Usage |
| --- | --- | --- |
| Primary | `#6366f1` (indigo-500) | Buttons, accents |
| Primary Hover | `#4f46e5` (indigo-600) | Button hover state |
| Primary Dark | `#4338ca` (indigo-700) | Logo text |
| Background | `from-indigo-50 to-blue-100` | Page gradient |
| Card Background | `white` | Content cards |
| Text Primary | `#1f2937` (gray-800) | Headings |
| Text Secondary | `#4b5563` (gray-600) | Body text |
| Text Muted | `#6b7280` (gray-500) | Captions |

### Typography
| Element | Font | Weight | Size |
| --- | --- | --- | --- |
| Logo | Poppins | 700 | 56px (desktop), 36px (mobile) |
| Headings | Poppins | 600-700 | 28px section, 24px card |
| Body | Inter | 400-500 | 16px desktop, 14px mobile |

### Logo
- Indigo rounded square with white upward triangle
- Gradient: `#4f46e5` to `#6366f1`
- Border radius: 12px (desktop), 10px (mobile)

## Page Structure

### 1. Hero Section (Above the Fold)
**Purpose:** Quick recognition and immediate action

**Components:**
- Logo + "Priori" text (existing)
- "Product Prioritisation Tool" tagline (existing)
- Updated subtitle: "Score, estimate, plan and ship together in real-time."
- White "Get Started" card containing:
  - "Get Started" heading
  - Description text
  - "Create New Session" button (full width, primary style)

**Changes from current:**
- Remove the Features checklist from the Get Started card (moved below)
- Update subtitle to reflect broader capabilities

### 2. Features Grid Section
**Purpose:** Showcase product depth

**Layout:** 2-column grid (desktop), single column (mobile)

**Feature Cards:**

| Feature | Icon | Description |
| --- | --- | --- |
| Scoring Frameworks | Chart emoji | RICE, ICE, Value vs Effort, MoSCoW, or create your own weighted criteria. Pick the framework that fits your team. |
| Planning Poker | Cards emoji | Estimate story points as a team with Fibonacci cards. Reveal votes together and reach consensus faster. |
| Backlog Management | Clipboard emoji | Drag-and-drop prioritisation with a cutoff line. See what's in and what's out at a glance. |
| Visual Roadmap | Map emoji | Plan work across custom time periods. Drag items onto your timeline and resize them across quarters. |
| Team Chat | Speech emoji | Discuss priorities in real-time without leaving the session. See who's typing and never miss a message. |
| Real-Time Collaboration | People emoji | See changes instantly as your team works together. No refresh needed — everything syncs automatically. |

**Card Design:**
- White background, 16px border radius
- Coloured icon background (48x48px, 12px radius)
- Subtle hover lift effect (translateY -4px)
- Shadow: `0 4px 6px rgba(0,0,0,0.05)`

**Icon Background Colours:**
- Scoring: `#dbeafe` (blue-100)
- Planning Poker: `#d1fae5` (emerald-100)
- Backlog: `#fef3c7` (amber-100)
- Roadmap: `#fce7f3` (pink-100)
- Chat: `#e0e7ff` (indigo-100)
- Collaboration: `#f3e8ff` (purple-100)

### 3. Supported Frameworks Bar
**Purpose:** Social proof / credibility

**Layout:** Horizontal bar with badge pills

**Content:**
- Label: "SUPPORTED FRAMEWORKS"
- Badges: RICE, ICE, Value vs Effort, MoSCoW, Weighted Scoring

**Note:** Planning Poker is NOT included here as it's an estimation tool, not a prioritisation framework.

**Design:**
- White background section
- Grey badge pills (`#f3f4f6`)
- Hover state: indigo background (`#e0e7ff`)

### 4. How It Works Section
**Purpose:** Reduce friction, explain simplicity

**Layout:** Vertical steps with connecting line

**Steps:**
1. **Create a Session** — Click the button and you're in. No sign-up, no setup.
2. **Share the Link** — Send the unique URL to your team. Anyone with the link can join.
3. **Add Your Items** — Add features, bugs, or ideas to prioritise together.
4. **Score, Estimate & Plan** — Use scoring frameworks, run planning poker, and build your roadmap — all in real-time.

**Design:**
- Numbered circles (40px, indigo background)
- Vertical connecting line between steps (2px, `#e0e7ff`)
- Max width: 800px

### 5. Final CTA Section
**Purpose:** Capture visitors who scrolled

**Content:**
- Heading: "Ready to Prioritise Smarter?"
- Subtext: "Create a free session in seconds and start collaborating with your team."
- "Get Started Now" button
- Caption: "No account needed • Works on any device"

**Design:**
- Gradient background (white to light purple)
- Centred layout

## Mobile Considerations

### Layout Changes
- Features grid: Single column
- Framework badges: Smaller (12px font, 6px/12px padding)
- Step numbers: 36px instead of 40px
- Reduced padding throughout

### Typography Scaling
- Logo text: 36px
- Section titles: 22px
- Body text: 14-15px

### Touch Targets
- Buttons: Minimum 44px height
- Feature cards: Full width, adequate spacing

## Implementation Phases

### Phase 1: Hero Section Update ✅
1. ✅ Update subtitle text
2. ✅ Remove Features checklist from Get Started card
3. ✅ Ensure existing functionality unchanged

### Phase 2: Features Grid ✅
1. ✅ Add new section below hero
2. ✅ Create FeatureCard component
3. ✅ Implement responsive grid layout

### Phase 3: Frameworks Bar ✅
1. ✅ Add white section with badges
2. ✅ Implement hover states

### Phase 4: How It Works ✅
1. ✅ Add steps section
2. ✅ Implement connecting line CSS

### Phase 5: Final CTA ✅
1. ✅ Add bottom section
2. ✅ Wire up button to same action as hero

## Testing Requirements

### Unit Tests
- FeatureCard component renders correctly
- Button click triggers session creation
- All sections render on page

### E2E Tests
- Landing page loads successfully
- "Create New Session" button works (both hero and footer)
- Page is responsive at mobile breakpoints
- All feature cards visible

### Visual Regression
- Compare against mockups at key breakpoints (390px, 768px, 1280px)

## Success Metrics

- Session creation rate (baseline vs post-launch)
- Scroll depth on landing page
- Time on page before session creation

## Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| Existing users confused by change | Keep hero section nearly identical; changes are below fold |
| Page feels too long | Each section is concise; CTA repeated at bottom |
| Mobile performance | Use system fonts where possible; lazy load nothing (page is static) |

## Open Questions

1. Should we add screenshots or illustrations of the actual product?
2. Should the frameworks bar link to documentation or help content?
3. Do we want analytics on which feature cards get the most attention?

---

*Last updated: 2026-01-21*
*Status: COMPLETE - All 5 phases implemented*
*Mockups: landing-page-redesign.mockup.html, landing-page-redesign-mobile.mockup.html*
