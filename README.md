# JobTrack AI backend

Fastify 5 + TypeScript API for the JobTrack AI application. The API base prefix is `/v1`; PostgreSQL access uses Drizzle ORM.

## Run locally

1. Install Node.js 20+ and PostgreSQL.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` and a long random `JWT_SECRET`.
3. Install and update the existing database schema:

   ```bash
   npm install
   npm run db:push
   ```

   The additive SQL migration for recruiter/reminder fields and the single-use GitHub session handoff table is in `drizzle/0001_application_features.sql` if you manage SQL migrations yourself.
4. Start the API with `npx tsx watch server.ts` (or set the `DATABASE_URL`, `JWT_SECRET`, and `FRONTEND_URL` environment variables before `npm run dev`).

The default port is `4000`. Configure `FRONTEND_URL` to the frontend origin for CORS and password-reset links.

## Auth and sessions

The existing backend JWT session is retained. Email/password signup and login, Google ID-token login, and GitHub OAuth all create or find a PostgreSQL user. Access JWTs expire after one hour; refresh tokens are random, stored hashed, and expire after 30 days. The frontend's server proxy refreshes the access token when needed. GitHub OAuth hands off a short-lived, hashed, single-use exchange code so the frontend can set its own HttpOnly session cookies without exposing refresh tokens in the redirect URL. Logout, password change, and password reset revoke refresh sessions.

## Implemented endpoints

All protected routes require `Authorization: Bearer <access-token>` unless noted.

| Method | Path | Purpose |
|---|---|---|
| POST | `/v1/auth/signup` | Create an account |
| POST | `/v1/auth/login` | Sign in with email/password |
| POST | `/v1/auth/google-login` | Verify a Google ID token and sign in |
| GET | `/v1/auth/github` | Start GitHub OAuth |
| GET | `/v1/auth/github/callback` | Complete GitHub OAuth and redirect with a single-use handoff code |
| POST | `/v1/auth/github/exchange` | Exchange the five-minute, single-use GitHub code for a session (frontend server-to-server) |
| POST | `/v1/auth/refresh-token` | Exchange a refresh token for an access token |
| POST | `/v1/auth/logout` | Revoke refresh session |
| POST | `/v1/auth/change-password` | Change password |
| POST | `/v1/auth/forgot-password` | Email a one-hour reset link |
| POST | `/v1/auth/reset-password` | Reset password using the one-time token |
| GET / PATCH | `/v1/user` | Read profile / update name |
| GET / POST | `/v1/jobs` | List/filter/sort applications / create one |
| GET / PATCH / DELETE | `/v1/jobs/:jobId` | Read, update, or delete an owned application |
| GET / POST | `/v1/notes?jobId=...` | List or add notes for an owned job |
| PATCH / DELETE | `/v1/notes/:noteId` | Edit or delete an owned note |
| GET / POST | `/v1/reminders` | List or create reminders |
| PATCH / DELETE | `/v1/reminders/:reminderId` | Update/complete or delete an owned reminder |
| GET | `/v1/analytics` | Application counts, status breakdown, rates, and six-month trend |
| POST | `/v1/ai/questions` | Generate role-specific interview practice |
| POST | `/v1/ai/resume-analysis` | Analyze resume text or uploaded PDF/DOCX/TXT/MD against a job |
| POST | `/v1/ai/followup-email` | Generate follow-up, thank-you, or negotiation email draft |
| POST | `/v1/cron/reminders` | Process due reminder emails; requires `x-cron-secret` |

The old singular `/v1/job` prefix remains as a compatibility alias for the jobs endpoints.

## AI provider

AI routes use the OpenAI-compatible Chat Completions API. Set these backend-only environment variables:

- `AI_API_KEY` — provider API key (required to use AI endpoints)
- `AI_BASE_URL` — defaults to `https://api.openai.com/v1`
- `AI_MODEL` — defaults to `gpt-4o-mini`

The resume analyzer accepts multipart field `resume` (PDF, DOCX, TXT, or Markdown; max 5 MB) plus `jobTitle` and `jobDescription`. PDF extraction is limited to the first 30 pages. Uploads are parsed in memory and not saved to disk or the database.

## Reminder email scheduler

The cron endpoint processes due, incomplete reminders that have not been emailed. Configure `CRON_SECRET` and call this endpoint on a schedule (for example every 5–15 minutes) from your hosting provider's cron service:

```http
POST /v1/cron/reminders
x-cron-secret: <CRON_SECRET>
```

Configure SMTP variables in `.env` to send password-reset and reminder emails. In development, when SMTP is not configured, email URLs/reminders are logged instead.

## API response shape

Success responses use `{ "success": true, "statusCode": 200, "data": { ... }, "message": "optional" }`. Errors use `{ "success": false, "statusCode": 400, "message": "..." }`.

## Tests

`npm test` runs Vitest tests. Existing auth integration tests require a PostgreSQL test database configured through `DATABASE_URL`.
