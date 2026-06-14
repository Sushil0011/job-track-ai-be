# JobTrack AI Backend — Agent Guide

## Project Overview

**JobTrack AI** is a backend API for a job application tracker. Users sign up, log in, and manage job applications through a pipeline: `WISHLIST → APPLIED → ASSESSMENT → INTERVIEW → OFFER / REJECTED`. Each job can have notes and reminders.

This repo is the **Fastify API** that pairs with a **Next.js frontend**. The API runs on port **8080** with all routes under the `/v1` prefix.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js (ESM, TypeScript) |
| HTTP | Fastify 5 |
| Auth | `@fastify/jwt` (access tokens) + refresh token on `user` row |
| Passwords | bcrypt |
| ORM | Drizzle ORM |
| Database | PostgreSQL |
| Email | Resend (optional; not used for change-password flow) |
| Dev | `tsx watch` |

## Commands

```bash
npm run dev          # Start dev server (port 8080)
npm run db:generate  # Generate Drizzle migrations
npm run db:push      # Push schema to DB
npm test             # Run vitest integration tests
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection (runtime) |
| `DB_DRIZZLE_URL` | Postgres connection (Drizzle Kit migrations) |
| `JWT_SECRET` | Secret for signing access JWTs (min 32 chars in production) |
| `FRONTEND_URL` | CORS origin + password reset link base |
| `EMAIL_API_KEY` | Resend API key (required in production) |
| `EMAIL_FROM` | Sender address for transactional email |
| `NODE_ENV` | `development` / `production` / `test` |

## Folder Structure

```
app/
  config/env.ts      # Validated environment variables
  app.ts             # Fastify app factory (used by server + tests)
  api/
    auth/            # Auth routes under /v1/auth/*
    user/            # Authenticated user profile (/v1/user)
    job/             # Job routes (stub)
  db/                # Drizzle schema + client
  services/email.ts  # Password reset email delivery
  routes/index.ts    # Route registration
  utils/             # jwt, httpError, apiResponse helpers
  types/             # API + Fastify JWT type augmentations
  error.ts           # Global error handler
server.ts            # Entry point
```

## API Conventions

### Route layout

- Base: `http://localhost:8080/v1`
- Auth: `/v1/auth/*`
- User: `/v1/user` (requires JWT)
- Job: `/v1/job` (stub)

### Auth endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/auth/signup` | No | Create account, return tokens |
| POST | `/v1/auth/login` | No | Login, return tokens |
| POST | `/v1/auth/refresh-token` | No | Validate refresh token, return new access token |
| POST | `/v1/auth/logout` | JWT | Clear refresh token on user |
| POST | `/v1/auth/change-password` | JWT | Update password with `{ oldPassword, newPassword }` |

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
- **Refresh token**: Stored on `user` row as `refreshTokenHash` + `refreshTokenExpiry` (SHA-256 hash in DB); reused until expiry or logout/password change
- **One session per user**: New login overwrites the previous refresh token
- **Logout**: Clears refresh token fields on the user row

### Module pattern

Each feature follows **route → controller → service → schema**.

## Database Schema (key tables)

### `user`
- `id`, `name`, `email`, `password` (bcrypt hash)
- `refreshTokenHash`, `refreshTokenExpiry` — hashed refresh token session

### `job`, `note`, `reminder`
- Job tracking domain tables

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
- Use Drizzle (`db.select`, `db.update`, `eq`) — no raw SQL unless necessary
- Hash passwords with `bcrypt.hash(password, 10)`; never store or return plain passwords
- Use `httpError(message, statusCode)` from `app/utils/httpError.ts` for business errors
- Use `sendSuccess` from `app/utils/apiResponse.ts` for success responses
