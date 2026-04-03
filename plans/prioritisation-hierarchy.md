---
planStatus:
  planId: plan-prioritisation-hierarchy
  title: "Hierarchy Support for Prioritisation Scores"
  status: in-development
  planType: feature
  priority: high
  owner: jameslaw
  tags:
    - prioritisation
    - hierarchy
    - backlog
  created: "2026-04-03"
  updated: "2026-04-03T10:09:36.000Z"
  progress: 0
---

# Hierarchy Support for Prioritisation Scores

## Goals

- Display hierarchical items in the Prioritisation table with expand/collapse, indentation, and level badges
- Score leaf items directly; parent scores roll up as average of scored leaf descendants
- Show rolled-up scores with distinct visual treatment (lighter, "avg" label)
- Update backlog score tags to also show rolled-up scores for parent items

## Overview

The Prioritisation module currently shows a flat list. It needs the same hierarchy support as the backlog — tree structure with expand/collapse, indentation, and colour-coded level badges. Scoring follows the existing leaf-based roll-up pattern: only leaf items (no children) can be scored directly; parent items display the average score of their scored leaf descendants.

The backlog also shows prioritisation scores as tags on each item row. Parent items currently show "—" because they have no direct score. They should show the rolled-up average with a visual indicator.

## Design Decisions

### Score Roll-Up Pattern

| Item Type | Score Source | Display |
|-----------|------------|---------|
| Leaf (no children) | Direct — scored via inline pips | Normal score badge |
| Parent (has children) | Average of scored leaf descendants | Lighter badge with "avg" label |
| Unscored leaf | No score | "—" dash |
| Parent with no scored descendants | No data | "—" dash |

**Why average (not sum)?** Scores are normalised values (RICE gives a ratio, ICE gives 1-10 avg, Weighted gives weighted avg). Summing them is meaningless. Average preserves the scale.

**Why leaf-only scoring?** Same rationale as effort roll-up — scoring both parents and children creates ambiguity and double-counting risk. This is what Productboard, Airfocus, and Aha! do.

### MoSCoW Roll-Up

MoSCoW is categorical, not numeric. Roll-up shows the "highest priority" category among descendants:
- Any "Must" child → parent shows "Must"
- Else any "Should" → "Should"
- Else any "Could" → "Could"
- Else "Won't"

## Implementation

### 1. Add `getRolledUpScore` to hierarchy.ts

New function following the same pattern as `getRolledUpEstimate`:
- Get all descendants, filter to leaves only
- Filter to leaves that have a score with `calculated_score > 0`
- Return average of `calculated_score` values (or null if none scored)
- For MoSCoW: return highest-priority category string

### 2. Update PrioritisationPage with hierarchy

- Import `buildTree`, `flattenTree` from hierarchy.ts
- Add expand/collapse state
- Render tree with indentation, chevrons, level badges, accent bars
- Leaf rows: show pip controls (scorable)
- Parent rows: show rolled-up score badge (read-only), disable pip controls
- Child count badge on collapsed parents

### 3. Update BacklogList score display

- In `formatScore()`, check if item is a parent (has children)
- If parent: call `getRolledUpScore` and format with "avg" prefix
- If leaf: show direct score as before

### 4. Tests

- Unit tests for `getRolledUpScore` (leaf average, MoSCoW highest, no scored children, mixed)
- Update PrioritisationPage tests for hierarchy rendering
- Update BacklogList tests for rolled-up score display

## Acceptance Criteria

- [ ] Prioritisation table shows hierarchical items with expand/collapse
- [ ] Indentation, level badges, and accent bars match backlog
- [ ] Only leaf items have interactive scoring controls
- [ ] Parent items show rolled-up average score (read-only, visually distinct)
- [ ] MoSCoW parents show highest-priority child category
- [ ] Backlog score tags show rolled-up scores for parent items
- [ ] Unscored parents show "—"
- [ ] All tests passing
