# ADR-001: Modular Monolith Architecture

**Status:** Accepted
**Date:** 2026-11-19
**Deciders:** Engineering team

## Context

Pak-Tele-Health targets rural healthcare settings with a small development team (1--3 engineers). The system needs to serve Healthcare Workers on low-end devices, Doctors reviewing alerts remotely, and Admins managing the platform. We needed to choose between a microservices architecture, a traditional monolith, or a modular monolith.

## Decision

We will build a **modular monolith** using Next.js App Router as the single deployable unit.

Domain logic is organized into discrete modules under `src/modules/` (alerts, audit, consultations, facilities, identity, observations, patients, referrals, screenings, sync). Each module exposes a service layer. Cross-cutting concerns (auth, database, errors, validation) live in `src/shared/`.

## Rationale

- **Operational simplicity.** A single Next.js deployment is far easier to operate than multiple services, especially given the target environment and team size. One container, one process, one database.
- **Module boundaries without network overhead.** Domain modules enforce separation of concerns through directory structure and import rules. Cross-module calls are in-process function calls, not HTTP or gRPC.
- **Extractability.** If a module (e.g., alerts) needs to scale independently in the future, its service layer can be extracted into a standalone service with minimal refactoring because the boundary already exists.
- **Full-stack co-location.** Next.js App Router lets us co-locate pages, API routes, and server-side data fetching, reducing context switching.

## Consequences

- **Positive:** Single deployment pipeline. Shared Prisma schema simplifies cross-module queries. Faster development velocity for a small team.
- **Negative:** All modules share a single process -- a memory leak or CPU-intensive alert evaluation affects the whole application. Horizontal scaling requires replicating the entire monolith.
- **Mitigated by:** Health check endpoints enable container orchestration restarts. Alert evaluation is designed to be fast (pure function over small data sets).
