# ADR-002: MySQL 8 with Prisma ORM

**Status:** Accepted
**Date:** 2026-11-19
**Deciders:** Engineering team

## Context

We needed a relational database and an ORM for the Pak-Tele-Health application. The data model is relational (users, roles, patients, observations, alerts, referrals with status histories). We evaluated MySQL, PostgreSQL, and SQLite, as well as Prisma, Drizzle, and Knex as the data-access layer.

## Decision

We will use **MySQL 8** (InnoDB, utf8mb4, UTC timestamps) as the database and **Prisma 6** as the ORM.

## Rationale

### MySQL 8

- **Operational familiarity.** The deployment target environment has existing MySQL expertise and infrastructure.
- **InnoDB** provides row-level locking, ACID transactions, and crash recovery.
- **utf8mb4** supports Urdu script for future localization.
- **Mature tooling** for backup, replication, and monitoring.

### Prisma

- **Type-safe schema.** The `schema.prisma` file is the single source of truth for the data model. Generated TypeScript client provides compile-time type safety.
- **Migration system.** `prisma migrate dev` generates SQL migration files that can be reviewed and versioned.
- **Parameterized queries.** All queries are parameterized by default, eliminating SQL injection.
- **Ecosystem fit.** `@auth/prisma-adapter` integrates directly with NextAuth.

## Alternatives Considered

- **PostgreSQL:** Richer feature set (JSONB indexing, row-level security), but less operational familiarity in the target environment.
- **SQLite:** Simpler deployment but unsuitable for concurrent multi-user access in production.
- **Drizzle:** Thinner abstraction but less mature migration tooling at the time of evaluation.

## Consequences

- **Positive:** Single schema file, type-safe queries, declarative migrations, strong NextAuth integration.
- **Negative:** Prisma's query engine adds a small runtime overhead. Some advanced MySQL features (stored procedures, triggers) are not accessible through Prisma. N+1 queries require careful use of `include`.
- **Mitigated by:** Strategic use of `include` and `select` in Prisma queries. Composite indexes on frequently queried columns (e.g., `[patientId, typeId, observedAt]` on observations).
