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

### 2.1 Framework Selector ⬜
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

### 2.3 ICE Scoring ⬜
**As a** user  
**I want** to score items using ICE  
**So that** I can quickly rank with less complexity

**Acceptance Criteria:**
- [ ] Each item shows: Impact, Confidence, Ease sliders (1-10)
- [ ] Score = average of three values
- [ ] Items auto-sort by score

**Tests:**
- Formula calculates correctly
- Sliders update score in real-time

---

### 2.4 Value vs Effort Matrix ⬜
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

### 2.5 MoSCoW Categorisation ⬜
**As a** user  
**I want** to categorise items as Must/Should/Could/Won't  
**So that** I can scope releases

**Acceptance Criteria:**
- [ ] Each item has category dropdown
- [ ] Items grouped by category in display
- [ ] Drag-and-drop between categories (stretch)

**Tests:**
- Category assignment persists
- Grouping displays correctly

---

### 2.6 Weighted Scoring ⬜
**As a** user  
**I want** to define custom criteria and weights  
**So that** I can prioritise by my own factors

**Acceptance Criteria:**
- [ ] Add/remove custom criteria (name + weight 1-10)
- [ ] Each item scored against each criterion (1-10)
- [ ] Weighted average calculated
- [ ] Items sorted by weighted score

**Tests:**
- Custom criteria CRUD works
- Weighted formula correct
- Zero weights handled

---

## Phase 3: Collaboration

### 3.1 Real-time Sync ⬜
**As a** collaborator  
**I want** to see changes from others in real-time  
**So that** we can work together

**Acceptance Criteria:**
- [ ] Supabase Realtime subscribed to session changes
- [ ] Item additions appear without refresh
- [ ] Score changes appear without refresh
- [ ] Optimistic updates for responsiveness

**Tests:**
- Changes from one client appear on another
- No data loss on concurrent edits

---

### 3.2 Participant Names ⬜
**As a** collaborator  
**I want** to set my name  
**So that** others know who added/edited items

**Acceptance Criteria:**
- [ ] Prompt for name on first visit (stored in localStorage)
- [ ] Name shown next to items/edits
- [ ] "X participants" indicator

**Tests:**
- Name persists in localStorage
- Name displays correctly

---

## Phase 4: Polish & Export

### 4.1 Export to CSV ⬜
**As a** user  
**I want** to export my prioritised list  
**So that** I can use it elsewhere

**Acceptance Criteria:**
- [ ] Export button downloads CSV
- [ ] Includes: title, description, scores, rank

**Tests:**
- CSV format is valid
- All data included

---

### 4.2 New Session / Clear ⬜
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

### 4.3 Session Naming ⬜
**As a** user  
**I want** to name my session  
**So that** I can identify it later

**Acceptance Criteria:**
- [ ] Editable session title
- [ ] Shows in browser tab

---

### 4.4 Mobile Responsive ⬜
**As a** user  
**I want** to use Priori on mobile  
**So that** I can participate from anywhere

**Acceptance Criteria:**
- [ ] All features work on mobile viewport
- [ ] Touch-friendly inputs

---

## Phase 5: Production Readiness

### 5.1 Error Handling ⬜
- [ ] Graceful handling of network errors
- [ ] Invalid session slugs show 404
- [ ] Loading states throughout

### 5.2 Performance ⬜
- [ ] Lazy load frameworks not in use
- [ ] Debounce score inputs
- [ ] Lighthouse score > 90

### 5.3 Analytics (Optional) ⬜
- [ ] Track session creation
- [ ] Track framework usage

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
- GitHub: https://github.com/James1Law/priori
- All core features working in production
- Database: Supabase with RLS configured

**Phase 2 (Scoring Frameworks) - IN PROGRESS**
- [x] 2.1 Framework Selector (complete)
- [x] 2.2 RICE Scoring (complete)
- [ ] 2.3 ICE Scoring
- [ ] 2.4 Value vs Effort Matrix
- [ ] 2.5 MoSCoW Categorisation
- [ ] 2.6 Weighted Scoring

**Current Status:**
- 43/43 tests passing
- RICE scoring with debounced sorting live
- UK English spelling throughout

---

*Document version: 1.2*
*Last updated: 2026-01-09 - Phase 2.2 RICE scoring complete*
