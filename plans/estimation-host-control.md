---
planStatus:
  planId: plan-estimation-host-control
  title: "Estimation: Host Control, Realtime Sync & Chat Access"
  status: completed
  planType: feature
  priority: high
  owner: jameslaw
  tags:
    - estimation
    - planning-poker
    - realtime
    - ux
  created: "2026-04-02"
  updated: "2026-04-02T12:03:12.000Z"
  progress: 100
---

# Estimation: Host Control, Realtime Sync & Chat Access

## Background

During a live estimation session with 11 participants, several issues surfaced:

1. **Blank screen for participants** — When the host returned to backlog after estimating one item, added a new item, and re-entered estimation, other participants saw a blank screen and had to refresh. Root cause: `handleBackToBacklog()` clears all estimation session state (`estimation_item_ids = []`, `current_estimation_item_id = null`), and when the host re-navigates to `/s/:slug/estimate` with new items, participants already on that URL receive the state wipe but don't cleanly recover when new state arrives.

2. **No chat in estimation view** — Participants could see the online count (11 people) but couldn't access chat during estimation. The `EstimationFlowPage` doesn't render a chat panel.

3. **No host control** — Any participant can Reveal, Accept, Skip, Re-vote, or Start. This is confusing in practice — the session facilitator should control the flow while others just vote.

## Goals

- Introduce a **host/participant role model** for estimation sessions
- Fix the **blank screen bug** so participants stay in sync across estimation rounds
- Add **chat access** during estimation
- Make the overall estimation flow feel less clunky for multi-round usage

## Implementation Plan

### 1. Host Role for Estimation Sessions

**Concept:** The person who clicks "Estimate" from the backlog becomes the **host**. Their participant name is stored on the session. All other participants on the estimation URL are **voters**.

**Database change:**
- Add `estimation_host` (text, nullable) column to `sessions` table
- Set when entering estimation, cleared when returning to backlog

**UI changes — Host sees:**
- All current controls: Start, Reveal, Accept, Re-vote, Skip
- A "Host" badge next to their name
- Ability to transfer host role (stretch goal)

**UI changes — Participants see:**
- Voting cards only (can vote, change vote)
- Disabled/hidden action buttons (Reveal, Accept, Skip, Re-vote)
- Status text like "Waiting for host to reveal..." / "Waiting for host to accept..."
- Clear indication of who the host is

**Components to modify:**
- `EstimationFlowPage.tsx` — pass host status down, set host on session entry
- `EstimationResults.tsx` — conditionally render Accept/Re-vote/Skip buttons
- `EstimationQueue.tsx` — conditionally render Start button, item selection
- `ParticipantVotes.tsx` — show host badge

### 2. Fix Blank Screen / Realtime Sync

**Root cause:** When the host goes back to backlog, the session clears `estimation_item_ids` and `current_estimation_item_id`. Participants on `/s/:slug/estimate` receive these updates via the realtime subscription but the page renders a broken empty state rather than gracefully handling the transition.

When the host re-enters estimation with new items, the session state updates again but participants may not re-initialise properly because `EstimationFlowPage` already mounted with empty state.

**Fix approach — estimation session IDs:**
- Add `estimation_session_id` (uuid, nullable) to `sessions` table
- Each time the host enters estimation, generate a new UUID for this field
- Participants detect when `estimation_session_id` changes and re-initialise their local state
- When the host clears estimation (back to backlog), participants see a "Session ended — waiting for host to start next round" state instead of a blank screen

**This solves the "different URL" question** — rather than changing the browser URL, each estimation round gets a unique session ID that triggers proper state resets on all clients. The URL stays the same (`/s/:slug/estimate`) but the internal session boundary is clear.

**Components to modify:**
- `EstimationFlowPage.tsx` — detect `estimation_session_id` changes, reset local state, show "session ended" state
- `SessionPage.tsx` — generate new `estimation_session_id` when navigating to estimate

### 3. Chat Access in Estimation View

**Approach:** Add the same chat integration that exists in `SessionPage` to `EstimationFlowPage`.

- Desktop: collapsible chat panel on the right side (similar to backlog view)
- Mobile: chat modal accessible via the participant count / chat button in the header

**Components to add/modify:**
- `EstimationFlowPage.tsx` — integrate `ChatPanel` and `MobileChatModal`
- Reuse existing `useMessages` and `useTypingIndicator` hooks

### 4. Migration

New SQL migration adding to `sessions` table:
```sql
ALTER TABLE sessions ADD COLUMN estimation_host text;
ALTER TABLE sessions ADD COLUMN estimation_session_id uuid;
```

## Acceptance Criteria

- [ ] Host role assigned when entering estimation; stored on session
- [ ] Only the host can Reveal, Accept, Re-vote, Skip, and select items
- [ ] Participants can only vote; action buttons are hidden/disabled for non-hosts
- [ ] Clear UI indication of who the host is
- [ ] Participants see "Waiting for host..." status messages
- [ ] No blank screen when host starts a new estimation round
- [ ] Participants auto-sync when a new estimation session begins (no refresh needed)
- [ ] "Session ended" state shown to participants when host returns to backlog
- [ ] Chat accessible during estimation (desktop panel + mobile modal)
- [ ] All existing estimation tests updated
- [ ] New tests for host/participant role logic
- [ ] New tests for session transition handling

## Implementation Order

1. Database migration (new columns)
2. Host role logic + UI gating (biggest impact on UX)
3. Estimation session ID + blank screen fix
4. Chat integration in estimation view
5. Test updates and new tests

## Open Questions

- Should the host be able to transfer control to another participant mid-session?
- If the host disconnects, should another participant be able to claim host?
- Should we show a participant list with roles in the estimation sidebar?
