# Authentication

## Overview

Auth uses JWT (JSON Web Tokens) with bcrypt password hashing. There are no sessions — every protected request must carry a `Bearer` token in the `Authorization` header.

## Packages

| Package | Purpose |
|---|---|
| `@nestjs/jwt` | JWT sign/verify |
| `@nestjs/passport` | Passport integration for NestJS |
| `passport-jwt` | Extract + verify JWT from request headers |
| `bcrypt` | Password hashing (12 rounds) |
| `class-validator` | DTO field validation |

## Token lifecycle

```
Register/Login
     │
     ▼
AuthService signs a JWT:
  payload = { sub: userId, email }
  secret  = JWT_SECRET (env)
  expiry  = 7 days
     │
     ▼
Client stores token, sends it as:
  Authorization: Bearer <token>
     │
     ▼
JwtStrategy extracts + verifies token,
loads User from DB, attaches to request
     │
     ▼
JwtAuthGuard gates the route
```

## Endpoints

### POST /auth/register

Creates a new user account and returns a JWT.

**Request body:**
```json
{
  "email": "alice@example.com",
  "username": "alice_cp",
  "password": "securepassword"
}
```

**Validation rules:**
- `email` — valid email format
- `username` — 3–30 chars, alphanumeric + underscore only (`^[a-zA-Z0-9_]+$`)
- `password` — 8–72 chars (72 is bcrypt's effective max)

**Success (201):**
```json
{ "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

**Errors:**
- `400 Bad Request` — validation failure (message lists specific fields)
- `409 Conflict` — email already registered

### POST /auth/login

Returns a JWT for an existing user.

**Request body:**
```json
{
  "email": "alice@example.com",
  "password": "securepassword"
}
```

**Success (200):**
```json
{ "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

**Errors:**
- `400 Bad Request` — validation failure
- `401 Unauthorized` — wrong email or password (both return the same message to avoid user enumeration)

## Protecting a route

Apply `JwtAuthGuard` to any controller method or class:

```typescript
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UseGuards, Request } from '@nestjs/common';

@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@Request() req) {
  return req.user; // full User record from DB
}
```

## Security notes

- Passwords are hashed with bcrypt at cost factor 12 before storage. The plain-text password is never stored or logged.
- Login errors always return "Invalid credentials" regardless of whether the email exists, preventing user enumeration.
- JWT expiry is 7 days. There is no refresh token in V1 — users re-login after expiry.
- `JWT_SECRET` must be set in the environment. The app crashes on startup if it's missing (`config.getOrThrow`).
- The `ValidationPipe` is global with `whitelist: true` — any extra fields in the request body are silently stripped.
