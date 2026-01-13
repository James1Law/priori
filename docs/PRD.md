# Priori - Product Requirements Document

## Vision
A simple, collaborative prioritisation tool that works like planning poker — share a URL, everyone can contribute, no login required.

## Target Users
- Product Managers
- Engineering leads
- Anyone running prioritisation sessions

## Success Metrics
- Session can be created in < 5 seconds
- Collaborators can join via URL with zero friction
- Supports 5 prioritisation frameworks

---

## Phase 1: Foundation (MVP)

### 1.1 Project Setup ✅
**As a** developer
**I want** the project scaffolded with all dependencies
**So that** I can start building features

**Acceptance Criteria:**
- [x] Vite + React + TypeScript initialised
- [x] Tailwind CSS configured
- [x] Vitest + React Testing Library configured
- [x] ESLint + Prettier configured
- [x] Folder structure matches CLAUDE.md spec
- [x] Dev server runs without errors

---

### 1.2 Session Creation ✅
**As a** user
**I want** to create a new prioritisation session
**So that** I get a unique URL to share

**Acceptance Criteria:**
- [x] Landing page with "Create Session" button
- [x] Clicking creates a new session with unique slug (6 chars, alphanumeric)
- [x] Redirects to `/s/{slug}`
- [x] Session stored in Supabase
- [x] URL is copyable/shareable

**Tests:**
- [x] Slug generation produces unique 6-char strings
- [x] Session is persisted to database
- [x] Navigation works correctly

---

### 1.3 Add Items ✅
**As a** user
**I want** to add items to prioritise
**So that** I can build my backlog

**Acceptance Criteria:**
- [x] Input field to add new item (title required)
- [x] Optional description field (expandable)
- [x] Items appear in a list below
- [x] Items persist to database
- [x] Items load when returning to session URL

**Tests:**
- [x] Can add item with title only
- [x] Can add item with title + description
- [x] Items persist and reload
- [x] Empty title is rejected

---

### 1.4 Edit & Delete Items ✅
**As a** user
**I want** to edit or remove items
**So that** I can manage my backlog

**Acceptance Criteria:**
- [x] Click item to edit inline
- [x] Delete button removes item (with confirmation)
- [x] Changes persist to database

**Tests:**
- [x] Edit updates item in DB
- [x] Delete removes item from DB
- [x] Confirmation prevents accidental deletion

---

## Phase 2: Scoring Frameworks

### 2.1 Framework Selector ✅
**As a** user  
**I want** to choose a prioritisation framework  
**So that** I can score items appropriately

**Acceptance Criteria:**
- [ ] Dropdown/tabs to select framework
- [ ] Options: RICE, ICE, Value vs Effort, MoSCoW, Weighted Scoring
- [ ] Selected framework persists to session
- [ ] UI updates to show relevant scoring inputs

**Tests:**
- Framework selection persists
- Correct inputs render for each framework

---

### 2.2 RICE Scoring ✅
**As a** user  
**I want** to score items using RICE  
**So that** I get a quantitative ranking

**Acceptance Criteria:**
- [ ] Each item shows: Reach, Impact, Confidence, Effort inputs
- [ ] Impact dropdown: Minimal (0.25), Low (0.5), Medium (1), High (2), Massive (3)
- [ ] Confidence dropdown: Low (50%), Medium (80%), High (100%)
- [ ] Reach and Effort are numeric inputs
- [ ] Score auto-calculates: (R × I × C) / E
- [ ] Items auto-sort by score (highest first)

**Tests:**
- Formula calculates correctly
- Sorting works
- Edge cases (zero effort) handled

**Bonus UX:**
- [x] Debounced sorting (1.5s delay) prevents jarring movements
- [x] "Updating..." indicator during pending saves

---

### 2.3 ICE Scoring ✅
**As a** user
**I want** to score items using ICE
**So that** I can quickly rank with less complexity

**Acceptance Criteria:**
- [x] Each item shows: Impact, Confidence, Ease sliders (1-10)
- [x] Score = average of three values
- [x] Items auto-sort by score

**Tests:**
- [x] Formula calculates correctly
- [x] Sliders update score in real-time

---

### 2.4 Value vs Effort Matrix ✅
**As a** user  
**I want** to plot items on a 2×2 matrix  
**So that** I can visualise quick wins vs big bets

**Acceptance Criteria:**
- [ ] Each item has Value (1-10) and Effort (1-10) inputs
- [ ] 2×2 grid visualisation shows items as dots/cards
- [ ] Quadrants labelled: Quick Wins (high value, low effort), Big Bets (high value, high effort), Fill-ins (low value, low effort), Avoid (low value, high effort)
- [ ] Clicking item in matrix highlights it in list

**Tests:**
- Items plot in correct quadrant
- Interaction between matrix and list works

---

### 2.5 MoSCoW Categorisation ✅
**As a** user  
**I want** to categorise items as Must/Should/Could/Won't  
**So that** I can scope releases

**Acceptance Criteria:**
- [ ] Each item has category dropdown
- [ ] Items grouped by category in display
- [ ] Drag-and-drop between categories (stretch - deferred)

**Tests:**
- Category assignment persists
- Grouping displays correctly

---

### 2.6 Weighted Scoring ✅
**As a** user
**I want** to define custom criteria and weights
**So that** I can prioritise by my own factors

**Acceptance Criteria:**
- [x] Add/remove custom criteria (name + weight 1-10)
- [x] Each item scored against each criterion (1-10)
- [x] Weighted average calculated
- [x] Items sorted by weighted score

**Tests:**
- [x] Custom criteria CRUD works
- [x] Weighted formula correct
- [x] Zero weights handled

---

## Phase 3: Collaboration

### 3.1 Real-time Sync ✅
**As a** collaborator
**I want** to see changes from others in real-time
**So that** we can work together

**Acceptance Criteria:**
- [x] Supabase Realtime subscribed to session changes
- [x] Item additions appear without refresh
- [x] Score changes appear without refresh
- [x] Optimistic updates for responsiveness

**Tests:**
- [x] Changes from one client appear on another
- [x] No data loss on concurrent edits

---

### 3.2 Participant Names ✅
**As a** collaborator
**I want** to set my name
**So that** others know who added/edited items

**Acceptance Criteria:**
- [x] Prompt for name on first visit (stored in localStorage)
- [x] Name shown next to items/edits
- [x] "X participants" indicator

**Tests:**
- [x] Name persists in localStorage
- [x] Name displays correctly

---

## Phase 4: Polish & Export

### 4.1 Export to CSV ✅
**As a** user  
**I want** to export my prioritised list  
**So that** I can use it elsewhere

**Acceptance Criteria:**
- [x] Export button downloads CSV
- [x] Includes: title, description, scores, rank

**Tests:**
- CSV format is valid
- All data included

---

### 4.2 New Session / Clear ✅
**As a** user  
**I want** to start fresh  
**So that** I can run a new prioritisation

**Acceptance Criteria:**
- [ ] "New Session" creates fresh URL
- [ ] "Clear Items" removes all items (with confirmation)

**Tests:**
- New session gets new slug
- Clear removes items but keeps session

---

### 4.3 Session Naming ✅
**As a** user
**I want** to name my session
**So that** I can identify it later

**Acceptance Criteria:**
- [x] Editable session title
- [x] Shows in browser tab

---

### 4.4 Mobile Responsive ✅
**As a** user
**I want** to use Priori on mobile
**So that** I can participate from anywhere

**Acceptance Criteria:**
- [x] All features work on mobile viewport
- [x] Touch-friendly inputs

---

## Phase 5: Production Readiness

### 5.1 Error Handling ✅
- [x] Graceful handling of network errors
- [x] Invalid session slugs show 404
- [x] Loading states throughout

### 5.2 Performance ✅
- [x] Lazy load frameworks not in use
- [x] Debounce score inputs (already implemented)
- [x] Lighthouse optimisation (meta tags, semantic HTML)

### 5.3 Analytics ❌ (Won't Do)
- Decided to skip analytics tracking

---

## Backlog / Future Ideas
- Team voting on scores (average multiple inputs)
- Session history / versioning
- Embed mode for Notion/Confluence
- Import from Jira/Linear
- AI-assisted scoring suggestions
- Dark mode

---

## ✅ Production Status

**Phase 1 (MVP) - COMPLETE**
- Deployed to Vercel
- https://github.com/James1Law/prioriGitHub: https://github.com/James1Law/priori
- All core features working in production
- Database: Supabase with RLS configured

**Phase 2 (Scoring Frameworks) - COMPLETE**
- [x] 2.1 Framework Selector (complete)
- [x] 2.2 RICE Scoring (complete)
- [x] 2.3 ICE Scoring (complete)
- [x] 2.4 Value vs Effort Matrix (complete)
- [x] 2.5 MoSCoW Categorisation (complete)
- [x] 2.6 Weighted Scoring (complete)

**Phase 3 (Collaboration) - COMPLETE**
- [x] 3.1 Real-time Sync (complete)
- [x] 3.2 Participant Names (complete)

**Phase 4 (Polish & Export) - COMPLETE**
- [x] 4.1 Export to CSV (complete)
- [x] 4.2 New Session / Clear (complete)
- [x] 4.3 Session Naming (complete)
- [x] 4.4 Mobile Responsive (complete)

**Phase 5 (Production Readiness) - COMPLETE**
- [x] 5.1 Error Handling (complete)
- [x] 5.2 Performance (complete)
- 5.3 Analytics (won't do)

**Current Status:**
- 134/134 tests passing
- All 5 prioritisation frameworks complete
- Real-time collaboration enabled via Supabase Realtime
- Participant presence tracking with names
- Mobile responsive UI with touch-friendly inputs
- CSV export with session naming
- Error boundary and 404 page
- Lazy loading for framework-specific components
- UK English spelling throughout

---

*Document version: 2.0*
*Last updated: 2026-01-13 - Phase 5 Production Readiness complete*
