# Step 2 — Database Schema

## What was built

PostgreSQL schema defined with Prisma ORM, migrated against the local Docker database, and a `PrismaService` wired into NestJS's dependency injection.

## Prisma setup

Prisma v7 was used — the first major version with a WASM-based query engine. Key decisions:

**Generator:** `provider = "prisma-client"` (not `prisma-client-js`). This is the new v7 generator that produces a WASM client instead of a Rust binary. The generated output goes to `generated/prisma/` (outside `src/`).

**Driver adapter:** Prisma v7's WASM client requires an explicit driver adapter — it cannot read `DATABASE_URL` from the environment automatically. The `@prisma/adapter-pg` package is used, and the `PrismaService` constructor passes the URL via `ConfigService`:

```typescript
constructor(config: ConfigService) {
  const adapter = new PrismaPg({ connectionString: config.getOrThrow('DATABASE_URL') });
  super({ adapter });
}
```

**Config file:** `prisma.config.ts` handles the CLI side (migrations, introspect) and reads `DATABASE_URL` via `dotenv/config`.

## Models created

Four models mapping to the technical doc's PostgreSQL schema:

| Model | Table | Key decisions |
|---|---|---|
| `User` | `users` | `password_hash` added in Step 3 (not in original schema) |
| `CodeforcesSubmission` | `codeforces_submissions` | `submission_id` added in Step 4 for upsert key |
| `UserProblemActivity` | `user_problem_activity` | Unique on `(userId, problemId)` |
| `Problem` | `problems` | `concept_ids` is a PostgreSQL TEXT[] array |

All models use UUID primary keys (`@default(uuid())`) rather than auto-increment integers. This avoids coordination issues in a distributed setup and makes IDs safe to expose in URLs.

All column names use snake_case in the database (`@map`) with camelCase in the TypeScript model.

## Relations

```
User 1──* CodeforcesSubmission  (CASCADE DELETE)
User 1──* UserProblemActivity   (CASCADE DELETE)
Problem 1──* UserProblemActivity (CASCADE DELETE)
```

`CASCADE DELETE` means deleting a user removes all their submissions and activity. This is correct for a user deletion flow.

## PrismaService injection pattern

`PrismaModule` is marked `@Global()`:

```typescript
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

This means any NestJS module can inject `PrismaService` without explicitly importing `PrismaModule`. It's imported once in `AppModule` and available everywhere.

## Migrations

| Migration | What changed |
|---|---|
| `20260503162431_init` | All four tables created |
| `20260503163125_add_user_password_hash` | `password_hash` column added to `users` |
| `20260503_add_submission_id_unique` | `submission_id` column + unique constraint on `codeforces_submissions` |

`password_hash` was added in a second migration because it was missed in the initial schema design — auth wasn't implemented until Step 3, at which point the missing field became apparent.

## What was verified

`npx prisma migrate dev` applied successfully and `npx tsc --noEmit` passed with no errors.
