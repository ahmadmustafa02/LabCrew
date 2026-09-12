# Phase 7 notes — director + student walkthrough

**Date:** 11 Sep 2026  
**Lab:** Northwater (local `http://localhost:3000`)  
**People:** Dr Basit Raza (director, COMSATS) and Ahmad Mustafa (student, COMSATS)

## What this is

A click-through of the MITACS demo path with a director seat and a student seat. Notes below are what we hit on that path.

Do **not** claim a measured time-to-competence number, System Usability Scale scores, or a large-N study from this file.

## Accounts (password `labcrew`)

| Role | Name | Email |
| --- | --- | --- |
| Director | Dr Basit Raza | `basit.raza@faculty.comsats.lab` |
| Student | Ahmad Mustafa | `ahmad.mustafa@students.comsats.lab` |

Also still seeded: `director@northwater.lab`, `ayesha.rahman@students.northwater.lab`.

## Path that worked

### Director — Dr Basit Raza

1. Signed in. Landed on Monday Brief. Nav shows **Who has what** (not Desk).
2. **Plan** → topic `Speech emotion datasets for student comparison writeups` → **Draft roadmap** (model `openai/gpt-oss-20b`) → **Add these assignments** (4 weeks: catalog / collect / writeup / review).
3. **Catalog → Add from paper → Load sample paragraph → Extract and verify** → CREMA-D saved, **5 trusted / 1 held**.
4. **Who has what** → **Add starter tasks** (Week 0) → added **laptop 3** (front desk).

### Student — Ahmad Mustafa

1. Signed in. Home **Do this next** = **Week 0 — Account works** (not the later catalog/collect weeks).
2. Opened Week 0, wrote a one-line note, turned in → **pending review**.
3. **Catalog** listed the CREMA-D record the director just added.
4. **Who has what** → **I took this** on laptop 3 → **You have it · due 9/18/2026**.

## Friction notes (10)

1. **Stale cookie after a DB wipe.** An old Ayesha session opened **Set up your lab** even though she is a student. After a seed, leftover sessions look like a broken product.
2. **Find papers / Find datasets failed** on the first pass (`POST /api/research/plans/:id/find` returned HTML 404). Later fixed via `POST /api/research/search`; papers and hub datasets then loaded.
3. **Catalog extract crashed on `page: ""`.** The model sent an empty string; Prisma wants `Int | null`. Fixed during the session (`asCatalogPage`).
4. **Second catalog crash:** LLM `value` was not a string; `.trim()` threw. Fixed during the session (`asCatalogText`).
5. **Human ratings stayed held** as value `true` even though the quote is “Clips were rated by humans…”. Verifier is strict; the held flag is honest but looks like a miss to a professor.
6. **Draft week-1 catalog instructions** said to paste a CSV/JSON file. That is the wrong object (this catalog is paper → checked fields).
7. **Browser tab still said “Sign-out”** while the page title and nav said “Who has what”. Easy to mix with account **Sign out**. Tab title updated after the walkthrough.
8. **Old Week 4 assignment (due 21 Aug)** still appears on a new student’s Home task list as ACTIVE. Next-step card ignored it (good); the list still shouts “you are late.”
9. **Assignment attachments said “Upload attack docs.”** Leftover copy. Changed to “Upload PDFs…”.
10. **`docker compose up` without only `postgres redis` re-ran migrate/seed** and emptied catalog/gear. Operator issue, but it made the demo look empty until we re-added accounts and data.

## What this session did not cover

- Field (Flutter) phone collect — web only.
- CyberEd drills / Human Risk Score.
- Alslaity coding ITS / Flow recommender.

## SOI sentence

LabCrew has a director + student walkthrough (Dr Basit Raza, Ahmad Mustafa) with **10 friction notes**. The product can plan, assign, collect a turn-in, hold unsourced catalog fields, and sign out gear. This file does **not** report a measured onboarding-time result.
