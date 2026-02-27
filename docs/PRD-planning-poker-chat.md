# Phase 9: Planning Poker & Team Chat - PRD

## Vision

Extend Priori's collaborative capabilities with **Planning Poker** for team estimation and **Team Chat** for real-time discussion. These features transform Priori from a prioritisation tool into a complete sprint planning solution, allowing distributed teams to estimate work and discuss items without leaving the app.

## Target Users

- Product Managers running planning sessions
- Engineering leads facilitating estimation
- Agile teams doing remote sprint planning
- Anyone who needs collaborative estimation with discussion

## Success Metrics

- Team can complete estimation session with 4+ participants
- Estimates integrate seamlessly with existing Backlog/Roadmap views
- Chat messages sync in real-time across all participants
- Mobile participants can fully participate in estimation

---

## Feature Overview

### 9.1 Planning Poker (Estimates View)

A new view for collaborative team estimation using Fibonacci story points. The facilitator guides the team through items one-by-one, everyone votes simultaneously, and votes are revealed to reach consensus.

### 9.2 Team Chat

A persistent chat panel for real-time discussion during planning sessions. Particularly useful during estimation to discuss complexity, assumptions, and scope.

---

## 9.1 Planning Poker

### User Stories

**As a** facilitator
**I want** to guide my team through estimation
**So that** we can agree on story points for each item

**As a** team member
**I want** to vote on estimates without seeing others' votes
**So that** I give an unbiased opinion

**As a** remote participant
**I want** to join estimation from my phone
**So that** I can contribute from anywhere

### Acceptance Criteria

- [x] New "Estimates" tab between Scoring and Backlog
- [x] Fibonacci card selection (0, 1, 2, 3, 5, 8, 13, 21, ?, coffee break)
- [x] Votes hidden until facilitator reveals
- [x] All participants see same current item
- [x] Consensus indicator when votes align
- [x] Story points stored per-item
- [x] Estimates visible in Backlog view
- [x] Works fully on mobile

### Design Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Card sequence | Fibonacci (0-21) + ? + coffee | Industry standard, limits discussion to meaningful differences |
| Vote visibility | Hidden until reveal | Prevents anchoring bias |
| Facilitator role | Any participant can reveal | No special permissions needed, keeps it simple |
| Item flow | Queue-based, one at a time | Focus on single item, clear progress |
| Estimate storage | On item, not per-participant | Final agreed estimate is what matters |
| Mobile support | Full functionality | Remote participation is key use case |

### Data Model Changes

**items table additions:**
```sql
ALTER TABLE items ADD COLUMN story_points integer;
```

**New table: \****`estimation_votes`**
```sql
CREATE TABLE estimation_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES items(id) ON DELETE CASCADE,
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  participant_name text NOT NULL,
  vote integer, -- null = not voted, -1 = ?, -2 = coffee
  created_at timestamptz DEFAULT now(),
  UNIQUE(item_id, participant_name)
);

CREATE INDEX idx_estimation_votes_item ON estimation_votes(item_id);
CREATE INDEX idx_estimation_votes_session ON estimation_votes(session_id);
```

**sessions table additions:**
```sql
ALTER TABLE sessions ADD COLUMN current_estimation_item_id uuid REFERENCES items(id) ON DELETE SET NULL;
ALTER TABLE sessions ADD COLUMN estimation_revealed boolean DEFAULT false;
```

### Iterative Build Steps

#### Step 1: Database Schema & View Tab ✅
Set up the data model and enable navigation.

- [x] Create migration for `estimation_votes` table
- [x] Add `story_points` column to items
- [x] Add `current_estimation_item_id` and `estimation_revealed` to sessions
- [x] Add "Estimates" tab to ViewTabs (between Scoring and Backlog)
- [x] Update ViewMode type to include 'estimates'
- [x] Create empty EstimatesView component placeholder

**Tests:**
- Migration runs successfully
- Estimates tab visible on desktop and mobile
- View switches correctly

#### Step 2: Estimation Queue ✅
Display items in a queue for estimation.

- [x] Create `EstimationQueue` component
- [x] Show items sorted by position (or backlog_position if set)
- [x] Display estimation status per item: pending, in_progress, completed
- [x] Highlight current item being estimated
- [x] Show story points badge for completed items
- [x] "Start Estimation" button to set first item as current

**Tests:**
- Queue displays items correctly
- Status badges show correct state
- Start button sets current item

#### Step 3: Card Selection UI ✅
Create the voting interface for participants.

- [x] Create `EstimationCards` component
- [x] Display Fibonacci cards: 0, 1, 2, 3, 5, 8, 13, 21
- [x] Add special cards: ? (uncertain), coffee break icon
- [x] Tap card to select (highlight selected)
- [x] Selected card creates/updates vote in `estimation_votes`
- [x] Allow changing vote before reveal

**Mobile considerations:**
- 5x2 grid layout for thumb-friendly selection
- Cards sized for touch targets (min 44px)

**Tests:**
- Cards render correctly
- Selection updates database
- Can change selection
- Mobile layout works

#### Step 4: Current Item Display ✅
Show the item being estimated prominently.

- [x] Create `CurrentEstimationItem` component
- [x] Display item title and description
- [x] Show "Now estimating" label
- [x] Sync current item across all participants via Realtime

**Tests:**
- Current item displays correctly
- All participants see same item
- Updates when facilitator changes item

#### Step 5: Participant Votes Display ✅
Show voting status without revealing values.

- [x] Create `ParticipantVotes` component
- [x] Show card for each participant in session
- [x] Card states: waiting (dashed), voted (face-down), revealed (value shown)
- [x] Use presence data for participant list
- [x] Subscribe to `estimation_votes` for real-time updates
- [x] Show "X of Y voted" counter

**Tests:**
- Participant cards appear for all session members
- Vote status updates in real-time
- Counter is accurate

#### Step 6: Reveal Mechanism ✅
Allow facilitator to reveal all votes.

- [x] Add "Reveal Votes" button (enabled when at least 1 vote)
- [x] Clicking sets `estimation_revealed = true` on session
- [x] All clients flip cards to show values
- [x] Calculate and display consensus indicator
- [x] Highlight outliers (votes far from majority)

**Consensus logic:**
- If >50% same vote: "Consensus!" with that value
- If votes within 1 step (e.g., 5 and 8): "Close - discuss briefly"
- If votes spread: "No consensus - discuss"

**Tests:**
- Reveal button works
- All participants see revealed votes
- Consensus calculated correctly
- Outliers highlighted

#### Step 7: Accept & Next Flow ✅
Allow accepting estimate and moving to next item.

- [x] Show "Accept & Next" and "Re-vote" buttons after reveal
- [x] "Accept & Next" saves majority vote to item.story_points
- [x] Clear votes for current item
- [x] Set next unestimated item as current
- [x] Set `estimation_revealed = false`
- [x] "Re-vote" clears votes and hides cards again
- [x] "Skip" button to move to next without saving

**Tests:**
- Accept saves story points
- Moves to next item correctly
- Re-vote clears state
- Skip works without saving

#### Step 8: Queue Progress & Completion ✅
Show estimation progress and handle completion.

- [x] Update queue to show completed items with checkmarks
- [x] Show progress indicator "2 of 5 estimated"
- [x] When all items estimated, show completion message
- [x] Option to re-estimate any item (click in queue)

**Tests:**
- Progress updates correctly
- Completion state shown
- Can re-estimate completed items

#### Step 9: Backlog Integration ✅
Display story points in Backlog view.

- [x] Add "Estimate" column to BacklogList (next to Score)
- [x] Show "X SP" badge if estimated (hidden if not)
- ~~Roadmap view: show story points on item bars~~ (not needed)
- ~~Optional: Total story points above/below cutoff line~~ (not needed)

**Tests:**
- Story points display in Backlog

#### Step 10: Mobile Optimisation ✅
Ensure full functionality on mobile.

- [x] Update MobileBottomBar to include Estimates tab
- [x] Optimise card grid for mobile (4x3 layout, 5x2 on larger screens)
- [x] Participant votes use responsive 2-column grid on mobile
- [x] Action buttons use flex-wrap for mobile stacking
- [x] Touch-friendly card targets (aspect-[3/4] with min size)

**Tests:**
- Mobile layout verified with responsive grid tests
- MobileBottomBar tests cover Estimates tab

#### Step 11: Real-time Edge Cases ✅
Handle edge cases in real-time sync.

- [x] Late joiner sees current state correctly (session state synced via realtime)
- [x] Participant leaving mid-vote handled gracefully (vote persists, card disappears)
- [x] ~~Votes from disconnected users time out~~ (not needed - votes cleared on accept/revote)
- [x] Handle simultaneous reveal clicks (database handles, all clients sync)
- [x] Optimistic updates for responsiveness (implemented in useEstimationVotes)

**Tests:**
- 3 new edge case tests for participant leaving, late joiner, vote updates

---

## 9.2 Team Chat

### User Stories

**As a** participant
**I want** to discuss estimates with my team
**So that** we can clarify assumptions and reach consensus

**As a** remote team member
**I want** to communicate during planning
**So that** I can participate fully from anywhere

### Acceptance Criteria

- [ ] Chat accessible from participant indicator (tap to open)
- [ ] Desktop: collapsible right sidebar panel (320px)
- [ ] Mobile: full-screen modal overlay (matches existing app modal patterns)
- [ ] Messages persist and sync in real-time via Supabase Realtime
- [ ] Unread badge on participant indicator when new messages arrive (chat closed)
- [ ] Typing indicators show who is composing a message
- [ ] System messages for participant joins/leaves
- [ ] Works across all views (Scoring, Estimates, Backlog, Roadmap)

### UI Design (Updated January 2026)

**Desktop:**
- Participant indicator in header: `[green dot] 4 [chat icon]`
- Click opens 320px right sidebar panel
- Panel has header ("Team Chat" + close button), message list, input area
- Main content area shrinks to accommodate panel when open

**Mobile:**
- Single-row header: Logo | Session Name | `[green dot] N [chat icon] [unread badge]` | Kebab menu
- Tap participant/chat indicator opens full-screen modal
- Modal has: header with close button, scrollable message list, input with send button
- Keyboard handling: input stays above keyboard when focused
- Close via X button or swipe down

**Unread Badge:**
- Red circular badge with count (e.g., "2")
- Positioned top-right of the chat icon
- Shows when: chat panel/modal is closed AND new messages arrived since last viewed
- Clears when: user opens chat panel/modal

### Design Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Access point | Integrated participant/chat indicator | Single tap target, intuitive grouping of "people" features |
| Desktop layout | Right sidebar (320px) | Doesn't interfere with main content, consistent with SlideInPanel pattern |
| Mobile layout | Full-screen modal | Better UX than cramped sidebar, matches BottomSheet pattern |
| Persistence | Store all messages in database | Users expect chat history to persist |
| Message limit | Last 100 messages on initial load | Performance optimisation, older messages rarely needed |
| Typing indicator | Show for 3 seconds after keystroke | Standard UX pattern, uses existing Presence infrastructure |
| System messages | Store in same table with type flag | Simpler than separate events, consistent display |

### Data Model Changes

**New table: \****`messages`**
```sql
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  participant_name text NOT NULL,
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'user', -- 'user' | 'system'
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_messages_session_created ON messages(session_id, created_at DESC);

-- RLS Policies
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view messages in their session" ON messages
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert messages" ON messages
  FOR INSERT WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

### Iterative Build Steps

> **Development Approach:** TDD - write failing tests first, then implement. All work stays local until approved for deployment.

#### Step 1: Database Schema & Hook Foundation ✅
Set up the messages table and core data fetching hook.

**Tasks:**
- [ ] Create migration `011_add_chat_support.sql`
- [ ] Create `useMessages` hook with:
  - `messages` array state
  - `sendMessage(content: string)` function
  - `loading` and `error` states
  - Fetch last 100 messages on mount
  - Real-time subscription for new messages

**Tests:**
```typescript
// tests/hooks/useMessages.test.ts
describe('useMessages', () => {
  it('fetches messages for session on mount')
  it('returns empty array when no messages')
  it('sendMessage creates message in database')
  it('sendMessage adds message to local state optimistically')
  it('handles send failure gracefully')
  it('limits initial fetch to 100 messages')
})
```

#### Step 2: ChatPanel Component (Desktop) ✅
Create the basic chat UI structure for desktop.

**Tasks:**
- [ ] Create `ChatPanel` component
- [ ] Props: `isOpen`, `onClose`, `sessionId`, `currentUser`, `messages`, `loading`, `onSendMessage`
- [ ] Fixed 320px width sidebar
- [ ] Header: "Team Chat" title + close (×) button
- [ ] Message list area (flex-1, overflow-y-auto)
- [ ] Input area: text input + "Send" button
- [ ] Styled with Tailwind (matches app design system)

**Tests:**
```typescript
// tests/components/ChatPanel.test.tsx
describe('ChatPanel', () => {
  it('renders when isOpen is true')
  it('does not render when isOpen is false')
  it('calls onClose when close button clicked')
  it('displays message list area')
  it('displays input field and send button')
  it('has correct width (320px)')
})
```

#### Step 3: ChatMessage Component & Message Display ✅
Render individual messages in the chat panel.

**Tasks:**
- [ ] Create `ChatMessage` component
- [ ] Props: `message`, `isOwnMessage`
- [ ] Display: participant name, timestamp (relative, e.g., "2:34 PM"), content
- [ ] Own messages: right-aligned, indigo background (#eef2ff)
- [ ] Others' messages: left-aligned, grey background (#f3f4f6)
- [ ] System messages: centred, smaller text, grey colour
- [ ] Integrate into ChatPanel with auto-scroll to bottom

**Tests:**
```typescript
// tests/components/ChatMessage.test.tsx
describe('ChatMessage', () => {
  it('renders participant name and timestamp')
  it('renders message content')
  it('applies own message styling when isOwnMessage is true')
  it('applies other message styling when isOwnMessage is false')
  it('renders system messages with distinct styling')
  it('formats timestamp correctly')
})

// Update ChatPanel tests
describe('ChatPanel message display', () => {
  it('renders list of messages')
  it('auto-scrolls to bottom when messages change')
  it('shows empty state when no messages')
})
```

#### Step 4: Sending Messages ✅
Enable users to send messages.

**Tasks:**
- [ ] Send message on Enter key press (not Shift+Enter)
- [ ] Send message on Send button click
- [ ] Clear input after successful send
- [ ] Disable send button when input is empty
- [x] Optimistic updates for responsive UX

**Tests:**
```typescript
// tests/components/ChatPanel.test.tsx (additions)
describe('ChatPanel sending', () => {
  it('sends message when Enter pressed')
  it('does not send on Shift+Enter (allows multiline)')
  it('sends message when Send button clicked')
  it('clears input after sending')
  it('disables send button when input is empty')
  it('shows error state on send failure')
})
```

#### Step 5: Real-time Updates ✅
Sync messages across participants using Supabase Realtime.

**Tasks:**
- [ ] Add Realtime subscription to `useMessages` hook
- [ ] Subscribe to INSERT events on messages table
- [ ] Filter by session_id
- [ ] Append new messages to local state
- [ ] Deduplicate own messages (already added optimistically)
- [ ] Clean up subscription on unmount
- [x] State lifted to SessionPage to avoid multiple hook instances

**Tests:**
```typescript
// tests/hooks/useMessages.test.ts (additions)
describe('useMessages realtime', () => {
  it('subscribes to messages channel on mount')
  it('adds new messages from other participants')
  it('does not duplicate own messages')
  it('unsubscribes on unmount')
  it('maintains message order by created_at')
})
```

#### Step 6: Participant Indicator Integration (Desktop) ✅
Update the header participant indicator to include chat access.

**Tasks:**
- [ ] Combined button: `[green dot] [count] [chat icon]`
- [ ] Click toggles chat panel open/closed
- [ ] Add `isChatOpen` state to SessionPage
- [ ] Pass toggle handler to indicator
- [ ] Chat panel positioned alongside main content

**Tests:**
```typescript
// tests/components/ParticipantIndicator.test.tsx
describe('ParticipantIndicator with chat', () => {
  it('renders participant count')
  it('renders chat icon')
  it('renders online dot')
  it('calls onToggleChat when clicked')
  it('shows different style when chat is open')
})
```

#### Step 7: Unread Badge ✅
Show unread count when new messages arrive while chat is closed.

**Tasks:**
- [ ] Track `lastReadAt` timestamp in localStorage (per session)
- [ ] Update `lastReadAt` when chat panel opens
- [ ] Calculate unread count: messages after `lastReadAt`
- [ ] Display red badge with count on participant indicator
- [ ] Badge hidden when count is 0
- [x] Updates lastReadAt when messages arrive while chat is open

**Tests:**
```typescript
// tests/hooks/useUnreadCount.test.ts
describe('useUnreadCount', () => {
  it('returns 0 when no messages after lastReadAt')
  it('returns correct count of unread messages')
  it('updates lastReadAt in localStorage when markAsRead called')
  it('persists lastReadAt per session')
})

// tests/components/ParticipantIndicator.test.tsx (additions)
describe('ParticipantIndicator unread badge', () => {
  it('shows badge when unread count > 0')
  it('hides badge when unread count is 0')
  it('displays correct unread count')
})
```

#### Step 8: Typing Indicators ✅
Show when others are composing messages.

**Tasks:**
- [ ] Create `useTypingIndicator` hook
- [ ] Use Supabase Presence to broadcast typing state
- [ ] Clear typing state after 3 seconds of inactivity
- [ ] Display typing indicator at bottom of message list
- [ ] Format: "Sarah is typing..." or "Sarah and 2 others are typing..."

**Tests:**
```typescript
// tests/hooks/useTypingIndicator.test.ts
describe('useTypingIndicator', () => {
  it('broadcasts typing state when setTyping called')
  it('debounces rapid typing updates')
  it('clears typing state after timeout')
  it('returns list of currently typing participants')
  it('excludes self from typing list')
})

// tests/components/ChatPanel.test.tsx (additions)
describe('ChatPanel typing indicator', () => {
  it('shows typing indicator when others are typing')
  it('formats single typer correctly')
  it('formats multiple typers correctly')
  it('hides when no one is typing')
})
```

#### Step 9: System Messages ✅
Show join/leave events in the chat.

**Tasks:**
- [ ] Create system messages when participant joins (via presence)
- [ ] Create system messages when participant leaves
- [ ] Store with `message_type: 'system'`
- [ ] Style differently: centred, grey, smaller text
- [ ] Don't create system message for self joining
- [x] Debounced join/leave to prevent spam on page refresh

**Tests:**
```typescript
// tests/hooks/useMessages.test.ts (additions)
describe('useMessages system messages', () => {
  it('creates join message when participant enters')
  it('creates leave message when participant exits')
  it('does not create join message for self')
  it('system messages have correct type')
})
```

#### Step 10: Mobile Chat Modal ✅
Create full-screen chat experience for mobile.

**Tasks:**
- [ ] Create `MobileChatModal` component
- [ ] Full-screen overlay (uses existing modal pattern)
- [ ] Header: "Team Chat" title + close (×) button
- [ ] Reuse ChatMessage component
- [ ] Input with circular send button
- [ ] Typing indicator support
- [ ] Auto-scroll on open

**Tests:**
```typescript
// tests/components/MobileChatModal.test.tsx
describe('MobileChatModal', () => {
  it('renders as full-screen overlay')
  it('displays header with close button')
  it('renders message list')
  it('renders input with send button')
  it('calls onClose when close button clicked')
  it('sends messages correctly')
})
```

#### Step 11: Mobile Header Integration ✅
Add chat access to mobile header.

**Tasks:**
- [ ] Update mobile header to show participant/chat indicator
- [ ] Single row: Logo | Name | [dot N chat-icon badge?] | Kebab
- [ ] Tap indicator opens MobileChatModal
- [ ] Unread badge works same as desktop

**Tests:**
```typescript
// tests/components/MobileHeader.test.tsx (or SessionPage mobile tests)
describe('Mobile chat integration', () => {
  it('shows participant count with chat icon')
  it('opens chat modal when indicator tapped')
  it('shows unread badge when messages unread')
})
```

#### Step 12: Polish & Edge Cases ✅
Handle remaining edge cases and polish.

**Tasks:**
- [ ] Empty state: "No messages yet. Start the conversation!"
- [ ] Long messages wrap correctly (Tailwind break-words)
- [ ] Optimistic updates prevent duplicate sends

**Tests:**
```typescript
// tests/components/ChatPanel.test.tsx (additions)
describe('ChatPanel edge cases', () => {
  it('shows empty state when no messages')
  it('wraps long message content')
  it('truncates long participant names')
  it('handles rapid sends without duplicates')
  it('shows error state on network failure')
  it('has proper aria labels')
})
```

---

## Component Structure

```
src/
├── components/
│   ├── EstimatesView.tsx           # Main estimation container ✅
│   ├── EstimationQueue.tsx         # Item queue sidebar ✅
│   ├── EstimationCards.tsx         # Card selection grid ✅
│   ├── CurrentEstimationItem.tsx   # Current item display ✅
│   ├── ParticipantVotes.tsx        # Vote status display ✅
│   ├── EstimationResults.tsx       # Post-reveal results ✅
│   ├── ChatPanel.tsx               # Desktop chat sidebar (NEW)
│   ├── ChatMessage.tsx             # Single message component (NEW)
│   ├── MobileChatModal.tsx         # Mobile full-screen chat (NEW)
│   └── ParticipantIndicator.tsx    # Combined participant/chat button (UPDATE)
├── hooks/
│   ├── useEstimation.ts            # Estimation state management ✅
│   ├── useEstimationVotes.ts       # Vote CRUD and sync ✅
│   ├── useMessages.ts              # Chat message CRUD and sync (NEW)
│   ├── useUnreadCount.ts           # Unread badge logic (NEW)
│   └── useTypingIndicator.ts       # Typing status via Presence (NEW)
├── lib/
│   ├── estimation.ts               # Estimation helpers ✅
│   └── chat.ts                     # Chat helpers (NEW)
└── types/
    └── index.ts                    # Add Message type (UPDATE)
```

---

## Implementation Phases

### Phase 9a: Planning Poker Core (Steps 1-8) ✅ COMPLETE
- Database schema and view navigation
- Card selection and voting
- Reveal mechanism and consensus
- Accept/next flow
- Queue management

### Phase 9b: Planning Poker Integration (Steps 9-11) ✅ COMPLETE
- Backlog integration
- Mobile optimisation
- Real-time edge cases

### Phase 9c: Team Chat (Steps 1-12) ✅ COMPLETE
**Approach:** TDD, local development until approved

| Step | Description | Status |
| --- | --- | --- |
| 1 | Database Schema & Hook Foundation | ✅ |
| 2 | ChatPanel Component (Desktop) | ✅ |
| 3 | ChatMessage Component & Display | ✅ |
| 4 | Sending Messages | ✅ |
| 5 | Real-time Updates | ✅ |
| 6 | Participant Indicator Integration | ✅ |
| 7 | Unread Badge | ✅ |
| 8 | Typing Indicators | ✅ |
| 9 | System Messages | ✅ |
| 10 | Mobile Chat Modal | ✅ |
| 11 | Mobile Header Integration | ✅ |
| 12 | Polish & Edge Cases | ✅ |

**32+ unit tests passing**

---

## Out of Scope (Future)

- Timer for estimation rounds
- Anonymous voting mode
- Custom card sequences (T-shirt sizes, custom values)
- Vote weighting by role
- Chat message reactions
- Chat message threading
- Message search
- File/image sharing in chat
- @mentions and notifications
- Chat export

---

## Design Mockups

Visual mockups available at:
- `plans/planning-poker-and-chat.mockup.html`

Includes:
- Desktop Planning Poker view with chat sidebar
- Mobile Planning Poker layout
- Mobile chat modal
- Backlog view with estimates

---

*Document version: 2.1*
*Created: 2026-01-16*
*Updated: 2026-01-19 — Phase 9 complete: Planning Poker and Team Chat fully implemented*
