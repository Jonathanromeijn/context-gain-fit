# Your AI Fitness Coach

Product Requirements Document

AI-Driven Workout Tracker (name TBD)

Version: 0.1 — Concept Date: August 6, 2026 Authors: Jonathan + co-founder Status: Concept for validation (blueprint + pitch + test material)

0. A note on naming

Hevy (H-E-V-Y) is the established competitor (9M+ users) this document benchmarks against — it is not the name of our own app. Our app doesn't have a name yet. When choosing one, it's worth avoiding something phonetically too close to "Hevy," to prevent confusion for users and in app store search results. For the rest of this document, "[App Name TBD]" is used as a placeholder.








1. Vision & Problem Statement

Hevy has solved the "workout logging" category: fast logging, clean UI, a social layer, and a genuinely good free tier. Where Hevy falls short is intelligence. Its "AI" features (Hevy Trainer, HevyGPT) are bolted-on additions: Hevy Trainer is a rule-based progression algorithm (no real understanding of the user), and HevyGPT is a separate ChatGPT tab with no access to your training data, recovery, or history.




Our vision: a workout tracker where AI isn't a bolted-on feature, but a layer that runs through the entire app — from how you log, to how you get feedback, to who you see on social. A coach that actually understands your data, rather than an algorithm that just checks whether you stayed within a rep range.

2. Goals & Success Metrics

Goal

Metric (MVP phase)

Prove AI coaching drives better outcomes/retention than rule-based progression

Week-4 retention higher than the Hevy benchmark (~25-30% industry average)

Frictionless logging

Average time to log a set ≤ Hevy's time

AI coach is actually used, not ignored

>40% of active users engage with the coach layer weekly

Validate whether people switch from Hevy

At least a handful of test users indicating they'd replace Hevy

3. Target Audience

MVP audience: general lifters — comparable to Hevy's core audience. People training 2-5x per week, comfortable using an app to log their training, who struggle with plateaus or don't know when/how to progress.




Not the initial focus (but potential later niches): powerlifters/competitive athletes, complete beginners, coaches with clients. These are good phase-2 expansions once the core is validated.

4. The Wedge: why someone switches

Two things together form the core of the differentiation:




An AI coach with context about you — not a separate chat window, but something that already knows your volume, RPE trends, recovery signals, and history before you ask a question.

We're deliberately keeping this point open for further validation — before committing fully, we want to validate with a few test users and peers which part of "AI everywhere" adds the most value. This MVP is partly meant to figure that out.

5. Scope: MVP vs. Later Phases

Platform strategy: web app (PWA) first — aligns with existing skills (GitHub/Netlify hosting) and is the fastest path to a testable version. A native mobile app (iOS/Android) is phase 2, once the core experience is validated. Important: a PWA can already do a lot (offline use, "add to home screen," push notifications on Android), but not everything a native app can (e.g., Apple Watch integration, background location). That's a deliberate trade-off for speed.

Phase 1 — MVP (core + AI layer)

Goal: prove the AI coach adds value beyond bare logging.

Phase 2 — Social & growth

Goal: the community layer that drives retention and viral growth.

Phase 3 — Platform expansion

Goal: native app, wearables, coach/B2B features.








6. Feature Overview

6.1 Core features (parity with Hevy — this is the baseline, not the differentiator)

Feature

Description

Phase

Workout logging

Sets, reps, weight, RPE; superset/drop-set/rest-pause set types

MVP

Rest timer

Automatic after each set

MVP

Previous-value auto-fill

Shows your last performance per exercise

MVP

Exercise library

Searchable by muscle group/equipment, custom exercises

MVP

Routines/templates

Save and reuse workouts

MVP

Progress charts

Volume, weight, estimated 1RM per exercise

MVP

PR detection

Automatic recognition of personal records

MVP

Progress photos

Private photos linked to date/weight

Phase 2

Body weight tracking

Independent of workouts

MVP

Activity log (non-gym)

Quick logging of running, climbing, sports, etc. with duration/intensity — feeds the cross-training AI feature (see 6.2)

MVP

6.2 AI-driven features (the differentiator)

Feature

Description

Why better than Hevy

Phase

Contextual AI coach

Chat/advice interface with full access to your training history, trends, and notes — not a separate chat window

Hevy's HevyGPT has no access to your data; Hevy Trainer is purely rule-based

MVP

Natural-language logging

Typing or speaking "3x8 squat at 60kg, felt heavy" instead of tapping through menus

Faster logging, lower friction during busy gym sessions

MVP

Smart progression rationale

Not just what to do this week, but why — explained in plain language

Hevy Trainer gives you a number, no reasoning

MVP

Plateau & fatigue detection

AI flags trends (stagnating volume, rising RPE, frequent missed reps) before the user notices themselves

Proactive rather than reactive

Phase 1 (later in MVP)

AI-generated tailored routines

Based on goal, available time/equipment — optionally recognizing gym equipment from a photo

Hevy Trainer requires manual input; we make it smarter

Phase 2

Recovery & nutrition suggestions

Light, non-medical suggestions tied to training volume (e.g., "you did a lot of leg volume this week")

Completely absent in Hevy

Phase 2

AI-curated social feed

Filters/ranks by relevance (similar level/goal), not just chronologically

Hevy's feed is purely chronological/follow-based

Phase 2

Form feedback on video (exploratory)

AI analysis of uploaded technique videos

Technically ambitious — to be validated separately, no MVP promise

Phase 3 / research

Cross-training logging & recovery-aware advice

Users can log non-gym activities (running, climbing/bouldering, padel, soccer, etc.) with duration/intensity. The AI coach factors this into advice for the next gym session — e.g., "You ran 10km yesterday, focus less on legs today" or "You went bouldering, your grip is likely fatigued, keep that in mind for pulling exercises"

Hevy has no understanding of activity outside the gym at all — its Strava integration shows data but doesn't adjust training advice based on it. This makes our coach genuinely holistic instead of gym-only

MVP

6.3 Social features (Phase 2)

Follow/be followed, feed, likes/comments

Copy other users' routines/workouts

Leaderboards (optional, lightweight) — Hevy's leaderboards are sometimes seen by users as "gimmicky," so keep this small deliberately or skip it

Shareables for outside the app (Instagram/Stories)

6.4 Explicitly out of scope for MVP

Native mobile app

Wearable integrations (Apple Watch/Wear OS)

Coach/B2B dashboard for personal trainers

Strava sync








7. Technical Considerations

This is an important point given the existing background: prior projects were static sites (HTML/CSS/JS, GitHub + Netlify, no backend). This app does require a backend, because:




User accounts & data storage are needed (workouts, history, profiles) — this can't stay client-side.

The Claude API key must never live in browser/client code — this requires a serverless function or lightweight backend acting as a middle layer between the app and the Anthropic API.




Recommended stack (aligned with existing workflow):




Frontend: React or similar, hosted on Netlify (familiar territory)

Backend/API layer: Netlify Functions (serverless) — no separate hosting platform needed, fits existing Netlify habits

Database & auth: Supabase (Postgres + auth + realtime, generous free tier, fits well with an AI-tool-driven development workflow) — alternative: Firebase

AI layer: Claude API (Anthropic) — for coach chat, natural-language logging parsing, and trend analysis

PWA layer: service worker for offline use and "installable on home screen"




This is a bigger technical step than previous projects, but achievable with AI-assisted development (Lovable, Claude Code, etc.) as used before.








8. Monetization

Proposal: freemium, similar to the market, but with AI coach usage as the clear Pro differentiator (rather than Hevy's approach, where Pro is mostly about limits — more routines, more history).




Tier

Includes

Free

Full logging, routines, basic charts, limited AI coach queries per week

Pro

Unlimited AI coach, plateau detection, advanced analytics, unlimited history




This is explicitly a starting point, not a final decision — worth testing with real users.

9. Risks

Risk

Notes

Naming

See section 0 — potential confusion/trademark conflict with Hevy

AI costs

Claude API calls per coach interaction cost money; needs modeling at scale (rate limits per tier)

Backend learning curve

First project with a real backend/database — plan time for this, not just the frontend

"AI fatigue" among users

If the AI coach feels shallow (like HevyGPT), the differentiation loses its power — quality of the coach interaction is the core of the wedge

Data migration friction

Users with years of Hevy history won't switch easily — an import feature (CSV/Hevy export) can lower that barrier

10. Open Questions for Validation

This MVP is also meant to answer these questions:

Which specific part of "AI everywhere" actually adds value versus what's mostly a gimmick?

Is natural-language logging actually faster in practice, or does tapping still feel faster (given how fast Hevy's auto-fill already is)?

How much free AI coach usage is enough to demonstrate value without undermining the Pro upgrade?

Final name and brand identity

build an mvp for the app

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d2de290e-1a52-4ceb-9a81-003fa55ac403).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
