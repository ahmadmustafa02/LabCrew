# Free self-host (no paid cloud required)

LabCrew runs fully offline on your machine with Docker. **$0**.

## One-command stack

```bash
cp .env.example .env
docker compose up --build
```

Then open http://localhost:3000/signup

- Postgres + Redis + web + worker included
- Uploads stored **in Postgres** (survive restarts, no S3)
- Email defaults to **console** (free). Optional free Gmail SMTP below.

## Local Node (also free)

```bash
docker compose up -d postgres redis
npm install
cp .env.example .env
npx prisma migrate deploy   # or: npm run db:push
npm run worker
npm run dev
```

## Free email (optional)

Without SMTP, password-reset links appear **on the forgot-password page** and in the server console.

To actually send mail for $0, use a Gmail **App Password**:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM="LabCrew <you@gmail.com>"
```

Approved nudges go to each student’s real email when known.

## Free Google login (optional)

Google OAuth is free. Create credentials in Google Cloud Console and set:

```
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
```

Redirect URI: `http://localhost:3000/api/auth/callback/google`

## Production on a free VPS

Any free/cheap always-on box works (Oracle Cloud free tier, school VM, old laptop):

1. Install Docker
2. Copy the repo + `.env` with a strong `AUTH_SECRET`
3. `docker compose up --build -d`
4. Point a free domain (DuckDNS / Cloudflare) at the box

You do **not** need Vercel, Railway, Resend, or S3 to ship a working product.
