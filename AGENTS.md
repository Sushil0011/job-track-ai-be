# JobTrack AI Backend — Agent Guide

## Project Overview

**JobTrack AI** is a backend API for a job application tracker. Users sign up, log in, and manage job applications through a pipeline: `WISHLIST → APPLIED → ASSESSMENT → INTERVIEW → OFFER / REJECTED`. Each job can have notes and reminders.

This repo is the **Fastify API** that pairs with a **Next.js frontend** on `http://localhost:3000`. The API runs on port **8080** with all routes under the `/v1` prefix.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js (ESM, TypeScript) |
| HTTP | Fastify 5 |
| Auth | `@fastify/jwt` (access tokens) + DB-stored refresh tokens |
| Passwords | bcrypt |
| ORM | Drizzle ORM |
| Database | PostgreSQL |
| Dev | `tsx watch` |

## Commands

```bash
npm run dev          # Start dev server (port 8080)
npm run db:generate  # Generate Drizzle migrations
npm run db:push      # Push schema to DB
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection (runtime, used by `app/db/index.ts`) |
| `DB_DRIZZLE_URL` | Postgres connection (Drizzle Kit migrations) |
| `JWT_SECRET` | Secret for signing access JWTs |

## Folder Structure

```
app/
  api/
    auth/          # signup, login (+ refresh & reset password — TODO)
      route.ts     # Fastify route definitions + JSON schemas
      controller.ts# Request/response handlers
      service.ts   # DB + business logic
      schema.ts    # Fastify JSON Schema validation
      type.ts      # Request body types
    user/          # Authenticated user profile (GET/PATCH /v1/user)
    job/           # Job routes (stub)
  db/
    schema.ts      # Drizzle table definitions
    index.ts       # DB client
  routes/index.ts  # Registers all route modules under /v1
  utils/jwt.ts     # Token generation + verifyToken preHandler
  error.ts         # Global error handler (validation, Postgres codes)
server.ts          # App bootstrap (CORS, JWT, cookies)
```

## API Conventions

### Route layout

- Base: `http://localhost:8080/v1`
- Auth: `/v1/signup`, `/v1/login` (no `/auth` prefix — auth routes register at root of `/v1`)
- User: `/v1/user` (requires JWT)
- Job: `/v1/job` (stub)

### Module pattern

Each feature follows **route → controller → service → schema**:

1. **route.ts** — registers endpoints, attaches `schema` and `preHandler`
2. **controller.ts** — reads `req.body` / `req.user`, calls service, sends response
3. **service.ts** — Drizzle queries and business logic
4. **schema.ts** — Fastify JSON Schema for request validation

### Response shape

Success:
```json
{ "status": "success", "data": { ... } }
```

Errors (via `app/error.ts`):
```json
{ "success": false, "statusCode": 400, "message": "...", "details": [...] }
```

### Auth

- **Access token**: JWT signed with `@fastify/jwt`, 1h expiry, payload `{ id, email, name }`
- **Refresh token**: 32-byte hex string, 30-day expiry, stored in `users.refreshToken` / `users.refreshTokenExpiry`
- Protected routes use `preHandler: verifyToken` from `app/utils/jwt.ts`
- Authenticated user is available as `request.user`

## Database Schema (key tables)

### `user`
- `id`, `name`, `email`, `password` (bcrypt hash)
- `refreshToken`, `refreshTokenExpiry` — set on signup, not yet exposed via API
- Auth.js-compatible fields (`emailVerified`, `accounts` table) for future OAuth

### `job`
- Belongs to `userId`; fields: `companyName`, `position`, `jobUrl`, `location`, `salaryRange`, `status`, `applicationDate`

### `note`, `reminder`
- Belong to a `jobId`

## Current Auth State

| Endpoint | Status |
|----------|--------|
| `POST /v1/signup` | Done — creates user, stores refresh token in DB, returns access JWT |
| `POST /v1/login` | Done — validates credentials, returns access JWT |
| `POST /v1/refresh-token` | **TODO** |
| `POST /v1/forgot-password` | **TODO** |
| `POST /v1/reset-password` | **TODO** |

**Gap:** Signup generates a refresh token but does not return it to the client. Login does not rotate or return refresh tokens either. Both APIs below should align login/signup responses once implemented.

---

## TODO: Refresh Token API

**Endpoint:** `POST /v1/refresh-token`

**Request body:**
```json
{ "refreshToken": "<hex string>" }
```

**Expected behavior:**
1. Look up user by `refreshToken` in `users` table
2. Reject if token not found, expired (`refreshTokenExpiry < now`), or missing
3. Issue new access JWT via `generateToken(fastify, { id, email, name }, "1h")`
4. Rotate refresh token: call `generateRefreshToken()`, update DB, return new refresh token
5. Do **not** return password or other sensitive fields

**Files to touch:**
- `app/api/auth/schema.ts` — add `refreshTokenSchema`
- `app/api/auth/service.ts` — add `refreshAccessToken(refreshToken: string)`
- `app/api/auth/controller.ts` — add `refreshToken` handler
- `app/api/auth/route.ts` — register route

**Also consider:** Update `login` and `signup` controllers to return `refreshToken` in the response so clients can store it.

---

## TODO: Reset Password API

Typically a two-step flow:

### Step 1 — Request reset: `POST /v1/forgot-password`

**Request body:**
```json
{ "email": "user@example.com" }
```

**Expected behavior:**
1. Look up user by email (always return generic success to avoid email enumeration)
2. Generate a secure, time-limited reset token (store hashed token + expiry on user, or add a `passwordResetToken` / `passwordResetExpiry` column to schema)
3. Send reset link via email (email service not yet in project — may need env var + provider, or log token in dev)

### Step 2 — Set new password: `POST /v1/reset-password`

**Request body:**
```json
{ "token": "<reset token>", "password": "newpassword" }
```

**Expected behavior:**
1. Validate token exists and is not expired
2. Hash new password with bcrypt (same as signup — cost factor 10)
3. Update `users.password`, invalidate reset token, rotate refresh token (force re-login on other devices)
4. Return success

**Schema changes likely needed** in `app/db/schema.ts`:
```ts
passwordResetToken: text("passwordResetToken"),
passwordResetExpiry: timestamp("passwordResetExpiry", { mode: "date" }),
```

Run `npm run db:generate` and `npm run db:push` after schema changes.

**Files to touch:**
- `app/db/schema.ts` — reset token columns
- `app/api/auth/schema.ts`, `service.ts`, `controller.ts`, `route.ts`
- Optionally `app/utils/jwt.ts` — helper to generate reset tokens (similar to `generateRefreshToken`)

---

## Coding Guidelines

- Match existing patterns: thin controllers, logic in services, validation in schemas
- Use Drizzle (`db.select`, `db.update`, `eq`) — no raw SQL unless necessary
- Hash passwords with `bcrypt.hash(password, 10)`; never store or return plain passwords
- Use `throw new Error("message")` for business errors; global handler maps to HTTP status
- Keep CORS origin as `http://localhost:3000` with `credentials: true`
- Prefer `crypto.randomBytes(32).toString("hex")` for opaque tokens (already used for refresh tokens)

## Frontend Integration Notes

- Frontend: Next.js on port 3000
- Backend: port 8080, prefix `/v1`
- JWT should be sent as `Authorization: Bearer <token>` for protected routes
- Cookies are registered (`@fastify/cookie`) for potential Auth.js session support later
