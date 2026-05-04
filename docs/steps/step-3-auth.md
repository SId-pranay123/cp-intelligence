# Step 3 — Auth

## What was built

Full JWT authentication: registration, login, password hashing, passport strategy, and a reusable guard.

## Packages installed

- `class-validator` and `class-transformer` — not present from Step 1; added here for DTO validation

The following were already declared in `package.json` from Step 1: `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcrypt`, `@types/bcrypt`, `@types/passport-jwt`.

## Module structure

```
src/
├── users/
│   ├── users.service.ts    # findByEmail, findById, create
│   └── users.module.ts     # exports UsersService
└── auth/
    ├── dto/
    │   ├── register.dto.ts
    │   └── login.dto.ts
    ├── auth.service.ts      # register, login, JWT signing
    ├── auth.controller.ts   # POST /auth/register, POST /auth/login
    ├── jwt.strategy.ts      # passport-jwt strategy
    ├── jwt-auth.guard.ts    # AuthGuard('jwt') wrapper
    └── auth.module.ts
```

## JWT configuration

Configured async via `JwtModule.registerAsync` so `JWT_SECRET` is read at runtime from `ConfigService`:

```typescript
JwtModule.registerAsync({
  useFactory: (config: ConfigService) => ({
    secret: config.getOrThrow<string>('JWT_SECRET'),
    signOptions: { expiresIn: '7d' },
  }),
})
```

`config.getOrThrow` crashes the app on startup if the secret is missing — deliberate fail-fast behaviour.

## Password hashing

bcrypt with cost factor 12. Cost 12 takes ~250ms on a modern machine, making brute-force attacks expensive while keeping login latency acceptable.

The `password_hash` column was added in a new migration (the Step 2 schema omitted it).

## DTO validation

| Field | Rules |
|---|---|
| `email` | `@IsEmail()` |
| `username` | `@IsString`, 3–30 chars, `/^[a-zA-Z0-9_]+$/` |
| `password` | `@IsString`, 8–72 chars |

The 72-char max on password matches bcrypt's effective input limit.

The global `ValidationPipe` is configured with:
- `whitelist: true` — extra fields stripped silently
- `forbidNonWhitelisted: true` — actually, this throws if extra fields are sent (stricter than whitelist alone)
- `transform: true` — class-transformer applies type coercions

## JwtStrategy

On each request to a guarded route, `passport-jwt` extracts the Bearer token, verifies it against `JWT_SECRET`, and calls `validate(payload)`. The strategy loads the full `User` record from the database and attaches it to `req.user`. This means controllers always get a fresh user object — stale JWTs for deleted users return 401.

## Smoke test results

```
POST /auth/register   {"email":"test@example.com","username":"testuser","password":"password123"}
→ 201 {"accessToken": "eyJ..."}

POST /auth/register   (same email)
→ 409 {"message":"Email already in use"}

POST /auth/login      (wrong password)
→ 401 {"message":"Invalid credentials"}

POST /auth/register   {"password":"short"}
→ 400 {"message":["password must be longer than or equal to 8 characters"]}
```

## What was verified

TypeScript compile clean (`npx tsc --noEmit`). All four cases above tested live with curl against the running server.
