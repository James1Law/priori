---
planStatus:
  planId: plan-poker-mobile-compact
  title: Poker Planner Mobile Compact Redesign
  status: in-development
  planType: feature
  priority: high
  owner: james
  tags:
    - mobile
    - estimation
    - ux
  created: "2026-04-10"
  updated: "2026-04-10T15:17:22.000Z"
  progress: 0
---

# Poker Planner Mobile Compact Redesign

## Goals
- Everything visible without scrolling on mobile (Reveal button always reachable)
- Team status visible at a glance via compact pills
- Voting cards remain tactile but use space efficiently
- Desktop layout unchanged

## Overview

The Poker Planner mobile view has excessive vertical space consumption. Team vote cards are large 2-column cards (~240px+), the queue sidebar takes full width at the top, and spacing is generous. The Reveal button is pushed below the fold, making it unreachable without scrolling. See mockup: `plans/poker-mobile-compact.mockup.html`.

## Implementation Steps

### Step 1: Team Votes — Cards to Pills
**File:** `src/components/ParticipantVotes.tsx`

- [ ] Replace `grid grid-cols-2` card layout with `flex flex-wrap` pill layout on mobile
- [ ] Each pill: status icon (14px circle) + name + optional host star
- [ ] Pill states: voted (green), waiting (grey), revealed (indigo with vote value)
- [ ] Outliers get red styling when revealed with no consensus
- [ ] Keep current user ring highlight
- [ ] Desktop (lg:) can keep the card layout or also use pills — pills work well at all sizes

### Step 2: Voting Cards — 5-column grid on mobile
**File:** `src/components/EstimationCards.tsx`

- [ ] Change mobile grid from `grid-cols-4` to `grid-cols-5`
- [ ] Reduce container padding from `p-4` to `p-3` on mobile
- [ ] Cards remain tappable (min ~56px wide on 390px screen)

### Step 3: Queue — Collapse to progress bar on mobile
**File:** `src/pages/EstimationFlowPage.tsx`

- [ ] On mobile, replace full queue sidebar with a collapsible single-line toggle
- [ ] Toggle shows: "Queue" label + mini progress bar + "X of Y" count + chevron
- [ ] Tap to expand/collapse the full queue + participants list
- [ ] Desktop (lg:) retains the sidebar layout unchanged

### Step 4: End Session — Move to header on mobile
**File:** `src/pages/EstimationFlowPage.tsx`

- [ ] On mobile, show "End Session" as a compact button in the header row (host only)
- [ ] Remove the full-width "End Session" from bottom of sidebar on mobile
- [ ] Desktop retains current placement

### Step 5: Spacing & sizing tightened
**Files:** `EstimationFlowPage.tsx`, `CurrentEstimationItem.tsx`, `EstimationResults.tsx`

- [ ] Reduce section margins from `mb-6`/`mt-6` to `mb-3`/`mt-3` on mobile
- [ ] Card container padding: `p-3 sm:p-6` (was `p-4 sm:p-6`)
- [ ] Reveal button: full-width on mobile
- [ ] Item title: keep `text-xl` but can reduce to `text-lg` if needed

### Step 6: Write tests
**File:** `tests/components/ParticipantVotes.test.tsx` (and others as needed)

- [ ] Test pill rendering for voted/waiting/revealed states
- [ ] Test outlier highlighting
- [ ] Test host star display
- [ ] Test current user ring
- [ ] Verify existing estimation tests still pass

## Acceptance Criteria
- [ ] On iPhone 12 Pro (390px), all content from item title through Reveal button visible without scrolling
- [ ] Team vote pills show correct states (voted/waiting/revealed)
- [ ] Outliers highlighted in red when votes are spread
- [ ] Queue collapses to progress bar on mobile, expands on tap
- [ ] End Session accessible from header on mobile
- [ ] Desktop layout unchanged
- [ ] All existing tests pass
- [ ] New tests for pill component pass
