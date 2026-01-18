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

- [ ] Chat accessible from participant indicator (click to open)
- [ ] Desktop: collapsible right sidebar panel
- [ ] Mobile: full-screen modal overlay
- [ ] Messages persist and sync in real-time
- [ ] Unread badge when new messages (chat closed)
- [ ] Typing indicators
- [ ] System messages for joins/leaves

### Design Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Access point | Participant indicator button | Natural location, combines two related concepts |
| Desktop layout | Right sidebar (320px) | Doesn't interfere with main content |
| Mobile layout | Full-screen modal | Better UX than cramped sidebar |
| Persistence | Store all messages | Users expect chat history |
| Message limit | Last 100 messages | Performance, older messages rarely needed |
| Typing indicator | Show for 3 seconds after keystroke | Standard UX pattern |

### Data Model Changes

**New table: \****`messages`**
```sql
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  participant_name text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_messages_created ON messages(session_id, created_at DESC);
```

### Iterative Build Steps

#### Step 1: Database Schema
Set up the messages table.

- [ ] Create migration for `messages` table
- [ ] Add RLS policies for session-based access
- [ ] Enable Realtime for messages table

**Tests:**
- Migration runs successfully
- RLS allows session members to read/write
- Realtime subscription works

#### Step 2: Chat Panel Component (Desktop)
Create the basic chat UI for desktop.

- [ ] Create `ChatPanel` component
- [ ] Collapsible sidebar (320px width)
- [ ] Header with "Team Chat" title and close button
- [ ] Message list area (scrollable)
- [ ] Input field with send button
- [ ] Open/close state stored in component (not persisted)

**Tests:**
- Panel opens and closes
- Layout is correct
- Input accepts text

#### Step 3: Message Display
Render messages in the chat panel.

- [ ] Create `ChatMessage` component
- [ ] Show: participant name, timestamp, message content
- [ ] Own messages styled differently (right-aligned, different colour)
- [ ] Auto-scroll to bottom on new messages
- [ ] Load last 100 messages on open

**Tests:**
- Messages display correctly
- Own vs others styled differently
- Auto-scroll works
- Older messages load

#### Step 4: Sending Messages
Allow users to send messages.

- [ ] Send on Enter key or Send button click
- [ ] Create message in database
- [ ] Optimistically add to local list
- [ ] Clear input on send
- [ ] Handle send failure gracefully

**Tests:**
- Messages send successfully
- Input clears
- Optimistic update works
- Failure shows error

#### Step 5: Real-time Updates
Sync messages across participants.

- [ ] Subscribe to messages table for session
- [ ] New messages appear instantly
- [ ] Handle message from self (don't duplicate)
- [ ] Order by created_at ascending

**Tests:**
- Messages from others appear
- No duplicates
- Order is correct

#### Step 6: Participant Indicator Integration
Merge chat access with participant count.

- [ ] Update participant indicator to include chat icon
- [ ] Single button: "[dot] 4 [chat icon]"
- [ ] Clicking opens chat panel
- [ ] Unread badge appears when new messages and panel closed
- [ ] Track last read timestamp in localStorage

**Tests:**
- Combined button works
- Unread badge appears correctly
- Badge clears when opened

#### Step 7: Typing Indicators
Show when others are typing.

- [ ] Use Supabase Presence for typing state
- [ ] Broadcast typing status on keystroke (debounced)
- [ ] Clear typing status after 3 seconds of inactivity
- [ ] Show "[Name] is typing..." at bottom of messages
- [ ] Multiple typers: "Sarah and 2 others are typing..."

**Tests:**
- Typing indicator appears
- Clears after timeout
- Multiple typers handled

#### Step 8: System Messages
Show join/leave events in chat.

- [ ] When participant joins: "Sarah K. joined the session"
- [ ] When participant leaves: "Sarah K. left"
- [ ] Styled differently (centred, grey, smaller)
- [ ] Use presence events (already implemented)

**Tests:**
- Join messages appear
- Leave messages appear
- Styling is distinct

#### Step 9: Mobile Chat Modal
Create full-screen chat for mobile.

- [ ] Create `MobileChatModal` component
- [ ] Opens as full-screen overlay
- [ ] Header with back button and title
- [ ] Same message list and input
- [ ] Proper keyboard handling (input above keyboard)
- [ ] Swipe down to close (optional)

**Tests:**
- Modal opens and closes
- Keyboard doesn't cover input
- Messages work same as desktop

#### Step 10: Polish & Edge Cases
Handle remaining edge cases.

- [ ] Empty state when no messages
- [ ] Long messages wrap correctly
- [ ] Names truncate if too long
- [ ] Handle rapid message sending
- [ ] Handle very long chat history (pagination if needed)
- [ ] Accessibility: keyboard navigation, screen reader support

**Tests:**
- Empty state shows helpful message
- Long content handled
- Performance with many messages

---

## Component Structure

```
src/
├── components/
│   ├── EstimatesView.tsx           # Main estimation container
│   ├── EstimationQueue.tsx         # Item queue sidebar
│   ├── EstimationCards.tsx         # Card selection grid
│   ├── CurrentEstimationItem.tsx   # Current item display
│   ├── ParticipantVotes.tsx        # Vote status display
│   ├── EstimationResults.tsx       # Post-reveal results
│   ├── ChatPanel.tsx               # Desktop chat sidebar
│   ├── ChatMessage.tsx             # Single message component
│   ├── MobileChatModal.tsx         # Mobile full-screen chat
│   └── ParticipantChatIndicator.tsx # Combined participant/chat button
├── hooks/
│   ├── useEstimation.ts            # Estimation state management
│   ├── useEstimationVotes.ts       # Vote CRUD and sync
│   ├── useChat.ts                  # Chat message management
│   └── useTypingIndicator.ts       # Typing status
└── lib/
    ├── estimation.ts               # Estimation helpers
    └── chat.ts                     # Chat helpers
```

---

## Implementation Phases

### Phase 9a: Planning Poker Core (Steps 1-8)
**Estimated scope:** Medium-High complexity
- Database schema and view navigation
- Card selection and voting
- Reveal mechanism and consensus
- Accept/next flow
- Queue management

### Phase 9b: Planning Poker Integration (Steps 9-11)
**Estimated scope:** Low-Medium complexity
- Backlog/Roadmap integration
- Mobile optimisation
- Real-time edge cases

### Phase 9c: Team Chat (Steps 1-10)
**Estimated scope:** Medium complexity
- Database schema
- Chat panel (desktop + mobile)
- Real-time messaging
- Typing indicators
- System messages

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

*Document version: 1.0*
*Created: 2026-01-16*
