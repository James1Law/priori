# Priori - Bootstrap Prompt for Claude Code

Copy and paste this as your first message to Claude Code to initialise the project.

---

## Initial Prompt

```
I'm starting a new project called Priori - a collaborative product prioritisation web app.

Please read the CLAUDE.md and docs/PRD.md files I've added to this project. These contain:
- Full project context, tech stack, and development rules
- Phased PRD with user stories and acceptance criteria
- Database schema
- Custom commands you should recognise

Key rules to follow throughout this project:
1. **TDD** - Write failing tests before implementation
2. **No production deploys** - Only local dev until I explicitly say "deploy to production"
3. **Incremental** - One feature at a time from the PRD
4. **Ask before starting** - When I say "next feature", summarise it and confirm before coding

Please confirm you've read and understood both files, then let's start with "next feature" to begin Phase 1.
```

---

## Subsequent Session Prompts

When returning to the project in a new Claude Code session:

```
Continuing work on Priori. Please read CLAUDE.md for context and rules. 

Run "current status" to show me where we're at, then let's continue.
```

---

## Useful Commands During Development

| You say | Claude does |
| --- | --- |
| `next feature` | Reads PRD, finds next incomplete feature, summarises, asks confirmation |
| `current status` | Lists completed, in-progress, and remaining features |
| `test this` | Runs tests for current component/feature |
| `ship check` | Runs full test suite, lint, build |
| `mark complete` | Updates PRD to mark current feature as done (✅) |

---

## Before Your First Session

1. Create a new folder for the project
2. Copy `CLAUDE.md` to the root
3. Create `docs/` folder and copy `PRD.md` into it
4. Open the folder in Claude Code
5. Paste the initial prompt above

---

## Environment Setup (Claude will do this, but FYI)

You'll need:
- Node.js 18+
- A Supabase project (free tier) — Claude will prompt you for credentials
- Git initialised

---

## Tips for Smooth Vibe Coding

1. **Let Claude drive** — Don't micromanage. Say "next feature" and let it work.
2. **Review at checkpoints** — After each feature, run the app and tests before continuing.
3. **Commit often** — Ask Claude to commit after each completed feature.
4. **Stay in TDD rhythm** — If Claude skips tests, remind it: "tests first".
5. **Trust the PRD** — It's your source of truth. Edit it if priorities change.

---

## Customising the Project

Feel free to edit before starting:
- **CLAUDE.md** — Add any personal preferences, change framework configs
- **PRD.md** — Reorder features, add/remove items, adjust acceptance criteria
- **Project name** — Find/replace "Priori" if you want a different name

---

Good luck! 🎯
