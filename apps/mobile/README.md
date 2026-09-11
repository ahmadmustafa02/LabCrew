# LabCrew Field

Companion app for **collect → clean → visualize**. The website stays the full lab OS. This app is the daily field action: sign in, fill schema rows, chart your series.

Not a Teams clone. Four tabs: **Home · Collect · Insights · You**.

## Design

Apple product site × Linear — charcoal + Apple blue. Tokens match `docs/DESIGN.md`. Details: [design-system/MASTER.md](./design-system/MASTER.md).

## Run

1. Start the LabCrew web API (`npm run dev` in the repo root).
2. Install the Flutter SDK, then from this folder:

```bash
flutter create . --project-name labcrew_field --org lab.labcrew
flutter pub get
flutter run
```

`flutter create .` only adds Android / iOS / web folders. It does not replace `lib/`.

### Server URL

| Where you run the app | Default API |
| --------------------- | ----------- |
| Chrome / desktop | `http://localhost:3000` |
| Android emulator | `http://10.0.2.2:3000` |
| Physical phone | your machine LAN IP, set under **Advanced** on sign-in |

### Demo seed

`ayesha.rahman@students.northwater.lab` / `labcrew` after `npm run db:seed`.

**Preview the field kit** on the login screen uses a local catalog so you can screenshot the UI without a server.

## Auth

`POST /api/auth/mobile/login` returns a lab-scoped bearer token (`lc_…`). All other calls send `Authorization: Bearer`. Same tenancy path as the web app (`requireLabScope`).

Offline drafts stay on the phone. If the server already has a newer version, the student chooses **keep mine** or **view theirs**. Nothing is silently discarded.

## MITACS #2

This is the mobile half of DataForge: collect structured data, basic clean flags from the existing server, visualize own vs cohort mean when the privacy floor allows.
