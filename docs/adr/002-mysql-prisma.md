# ADR-002: Supabase PostgreSQL with Prisma ORM

**Status:** Accepted
**Date:** 2026-11-22
**Deciders:** Engineering team

## Context

We need a relational database and ORM for the Pak-Tele-Health application. The original prototype used MySQL, but the hosted MVP requires a no-cost managed database that works reliably with Vercel serverless functions. The data model is relational (users, roles, patients, observations, alerts, referrals, and status histories).

## Decision

We will use **Supabase PostgreSQL** as database hosting and **Prisma 6** as the only application data-access layer. The Supabase Data API is disabled. Vercel runtime traffic uses Supavisor's transaction pooler; Prisma migrations use a direct or session-pooled connection.

## Rationale

### Supabase PostgreSQL

- **Free managed MVP hosting.** The Supabase free tier is sufficient for synthetic demonstration data.
- **Serverless-safe pooling.** Supavisor transaction pooling prevents Vercel function concurrency from exhausting direct database connections.
- **Relational integrity.** PostgreSQL provides ACID transactions, foreign keys, JSON support, and mature operational tooling.
- **Unicode by default.** PostgreSQL supports future Urdu localization without database-specific charset configuration.
- **Reduced attack surface.** Disabling the Data API means clinical tables are not exposed through generated REST or GraphQL endpoints.

### Prisma

- **Type-safe schema.** The `schema.prisma` file is the single source of truth for the data model. Generated TypeScript client provides compile-time type safety.
- **Migration system.** `prisma migrate dev` generates SQL migration files that can be reviewed and versioned.
- **Parameterized queries.** All queries are parameterized by default, eliminating SQL injection.
- **Ecosystem fit.** `@auth/prisma-adapter` integrates directly with NextAuth.

## Alternatives Considered

- **MySQL:** Compatible with the original implementation, but the available managed free-tier options were either more operationally complex or unsuitable for Vercel serverless connection patterns.
- **SQLite:** Simpler deployment but unsuitable for concurrent multi-user access in production.
- **Drizzle:** Thinner abstraction but less mature migration tooling at the time of evaluation.

## Consequences

- **Positive:** Single schema file, type-safe queries, declarative migrations, Auth.js integration, and hosted connection pooling.
- **Negative:** Moving from MySQL requires a new PostgreSQL baseline migration. The free plan has limited storage and backup guarantees and is suitable only for this synthetic MVP.
- **Mitigated by:** The idempotent seed recreates all synthetic data. Application traffic and migrations use separate URLs, and production use with real patient data requires a paid, reviewed hosting and backup plan.
