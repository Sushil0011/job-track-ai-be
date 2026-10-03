# JobTrack AI Backend — Agent Guide

## Project overview

This is the Fastify API for a job-application tracker. Applications move through `WISHLIST → APPLIED → ASSESSMENT → INTERVIEW → OFFER / REJECTED`; users can attach notes and reminders, review analytics, and use AI-assisted interview, resume, and email tools.

## Stack

## Tech Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js (ESM, TypeScript) |
| HTTP | Fastify 5 |
| Auth | `@fastify/jwt` (access tokens) + refresh token on `user` document |
| Passwords | bcrypt |
| ORM | Mongoose |
| Database | MongoDB |
| Email | Nodemailer SMTP for reset/reminder messages |
| AI | OpenAI-compatible Chat Completions API for AI tools |
| Dev | `tsx watch` |

## Commands

```bash
npm run dev          # Start dev server via Doppler (tsx watch)
npm test             # Run vitest integration tests
```

The default server port is `4000`; routes use the `/v1` prefix.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB connection string (defaults to `mongodb://127.0.0.1:27017/jobtrack`) |
| `JWT_SECRET` | Access JWT signing secret (min 32 chars in production) |
| `FRONTEND_URL` | CORS origin and password-reset link base |
| `BACKEND_URL` | Public backend URL for OAuth callback |
| `AI_API_KEY` | Optional OpenAI-compatible provider key |
| `AI_BASE_URL` | Provider base URL; defaults to OpenAI `/v1` |
| `AI_MODEL` | Provider model; defaults to `gpt-4o-mini` |
| `CRON_SECRET` | Protects the reminder-processing endpoint |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | SMTP configuration; required in production |
| `GOOGLE_CLIENT_ID` | Google ID-token verification |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | GitHub OAuth |
| `NODE_ENV` | `development` / `production` / `test` |

See `.env.example` for a complete template.

```
app/
  config/env.ts      # Validated environment variables
  app.ts             # Fastify app factory (used by server + tests)
  api/
    auth/            # Auth routes under /v1/auth/*
    user/            # Authenticated user profile (/v1/user)
    jobs/            # Job application CRUD (/v1/jobs)
    notes/           # Notes (/v1/notes)
    reminders/       # Reminders (/v1/reminders)
    analytics/       # Analytics (/v1/analytics)
    ai/              # AI tools (/v1/ai/*)
    cron/            # Reminder scheduler (/v1/cron/reminders)
  db/                # Mongoose schemas + connection
  services/email.ts  # Password reset email delivery
  routes/index.ts    # Route registration
  utils/             # jwt, httpError, apiResponse helpers
  types/             # API + Fastify JWT type augmentations
  error.ts           # Global error handler
server.ts            # Entry point
```

## API modules

All normal endpoints return the standard envelope `{ success, statusCode, data, message? }`.

- `/v1/auth/*` — email, Google, and GitHub authentication; refresh/logout; password reset/change.
- `/v1/user` — authenticated profile read and name update.
- `/v1/jobs` — authenticated application CRUD, filters, sorting, and pagination. `/v1/job` is retained as a compatibility alias.
- `/v1/notes` — notes scoped to jobs owned by the authenticated user.
- `/v1/reminders` — reminders scoped to owned jobs.
- `/v1/analytics` — per-user counts, rates, status breakdown, and six-month application trend.
- `/v1/ai/questions`, `/v1/ai/resume-analysis`, `/v1/ai/followup-email` — authenticated, rate-limited AI routes.
- `/v1/cron/reminders` — scheduler endpoint protected by `x-cron-secret`.

## Database

The schema uses `user`, `job`, `note`, `reminder`, and `github_login_exchange_code` collections. Jobs, notes, and reminders are scoped through the owning user and cascade when a job is deleted.

## Implementation conventions

### Response shape

Success:
```json
{ "success": true, "statusCode": 200, "data": { ... }, "message": "optional" }
```

Error:
```json
{ "success": false, "statusCode": 401, "message": "..." }
```

### Auth model

- **Access token**: JWT, 1h expiry, payload `{ id, email, name }`
- **Refresh token**: Stored on `user` document as `refreshTokenHash` + `refreshTokenExpiry` (SHA-256 hash in DB); reused until expiry or logout/password change
- **One session per user**: New login overwrites the previous refresh token
- **Logout**: Clears refresh token fields on the user document

### Module pattern

Each feature follows **route → controller → service → schema**.

## Database Schema (key collections)

### `user`
- `name`, `email` (unique index), `authProvider` (`EMAIL`/`GOOGLE`/`GITHUB`), `password` (bcrypt hash)
- `refreshTokenHash`, `refreshTokenExpiry` — hashed refresh token session
- `passwordResetTokenHash`, `passwordResetTokenExpiry` — hashed reset token

### `job`, `note`, `reminder`
- Job tracking domain collections; `job.userId` → `user._id`, `note.jobId`/`reminder.jobId` → `job._id` (ObjectId references)
- Jobs carry recruiter contact fields; reminders carry `title`, `notificationSentAt`, and a due-date index

### `github_login_exchange_code`
- Short-lived single-use codes for handing a GitHub OAuth session to the frontend; keyed by `codeHash` with `expiresAt` index

## Frontend Integration Checklist

1. Store `data.refreshToken` after **login** and **signup** only
2. On **refresh-token**, replace the stored access token with `data.token` only
3. Send access token as `Authorization: Bearer <token>` on protected routes
4. On **logout**, call `POST /v1/auth/logout` with JWT header — clears refresh token (must log in again)
5. If access token is expired and refresh also fails, redirect to login
6. Auth URLs use `/v1/auth/*` prefix (not flat `/v1/login`)
7. Parse unified response shape: `success`, `statusCode`, `data`, `message`

## Coding Guidelines

- Match existing patterns: thin controllers, logic in services, validation in schemas
- Use Mongoose models (`User.findOne`, `User.updateOne`, `User.create`) — no raw driver calls unless necessary
- Hash passwords with `bcrypt.hash(password, 10)`; never store or return plain passwords
- Use `httpError(message, statusCode)` from `app/utils/httpError.ts` for business errors
- Use `sendSuccess` from `app/utils/apiResponse.ts` for success responses
- Always scope job, note, and reminder reads/updates/deletes to the authenticated user.
- Never return password hashes, access tokens, refresh-token hashes, reset-token hashes, or provider secrets from profile APIs.
- Keep AI keys on the backend; limit and validate uploaded resume size and content types.
