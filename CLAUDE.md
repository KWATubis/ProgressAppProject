# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Assistant Name

The user calls Claude "Nel". Respond to this name.

## Plan Vault — Read Before Every Task

**Vault location:** `C:\Users\jkond\Desktop\Claude's Progress App\`

**At the start of every session, read these two notes first:**
1. `10 - Session Handoff.md` — who the user is, repo state, key decisions already made, how to begin
2. `09 - Progress Log.md` — which phases are complete and what comes next

Then read whichever plan notes are relevant to the current task:

| Note | What it contains |
|------|-----------------|
| `00 - Overview & Context.md` | App concept, user flow, first user's goals |
| `01 - Tech Stack.md` | Full stack decision and rationale |
| `02 - Database Schema.md` | All Prisma models |
| `03 - Project Structure.md` | Complete folder/file layout |
| `04 - Implementation Phases.md` | 10 phases with files per phase |
| `05 - Claude AI Integration.md` | Prompts, streaming, task-generator |
| `06 - Seed Data.md` | Pre-populated data from Second Brain vault |
| `07 - Deployment Config.md` | Env vars, Vercel + Supabase setup |
| `08 - Verification.md` | End-to-end test steps per phase |

Do not re-plan. Do not ask the user to re-explain the project. Execute the plan.

## Project Overview

**Portion** is a personal goal-tracking and task-management web app with two pillars:
- **Health** — gym training, calisthenics, running, diet/macros, body metrics
- **Money** — TikTok growth, income tracking, coaching/dietary plans business

The app lives at: `C:\Users\jkond\Desktop\ProgressAppProject\portion\`

The first user's goals come from the Second Brain Obsidian vault at:
`C:\Users\jkond\Desktop\Second Brain\Second Brain\`

## Git Workflow

After every change to the codebase:
1. Commit to the local git repository with a descriptive commit message
2. Push to GitHub (`origin master`)

```
git add <specific files>
git commit -m "descriptive message"
git push origin master
```

## Development Commands

All commands run from inside the `portion/` directory:

```
dev:     npm run dev
build:   npm run build
lint:    npm run lint
migrate: npx prisma migrate dev
seed:    npx prisma db seed
studio:  npx prisma studio
```

## Architecture

Next.js 14+ App Router (TypeScript) + Tailwind CSS + shadcn/ui + Supabase (PostgreSQL + Auth) + Prisma ORM + Anthropic SDK + Recharts + Vercel deployment.

No separate backend — all server logic lives in Next.js API routes and Server Components.

## Key Features

- **Goal Management:** Two pillars (Health + Money); AI-coached goal definition on onboarding
- **Task Generation:** Claude AI generates structured daily/weekly task calendar from user goals
- **Progress Tracking:** Charts for weight, macros, workout volume, TikTok growth, income
- **Daily Check-In:** Tick tasks, log sets/reps, log meals, log body weight
- **User Accounts:** Supabase Auth; personalized dashboards and seeded data for developer
