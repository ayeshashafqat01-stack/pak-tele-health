# ADR-003: NextAuth v5 with JWT Strategy

**Status:** Accepted
**Date:** 2026-11-19
**Deciders:** Engineering team

## Context

The application needs authentication for three roles (Healthcare Worker, Doctor, Admin) with facility-scoped access control. Users log in with email and password. The system must work over intermittent connections, so the auth mechanism should minimize round trips to the server after initial login.

## Decision

We will use **NextAuth v5 (Auth.js)** with the **Credentials provider** and **JWT session strategy**. Passwords are hashed with **argon2** (`@node-rs/argon2`). Role, permission, and facility data are embedded in the JWT.

## Rationale

### JWT over Database Sessions

- **Offline-friendly.** Once issued, the JWT validates locally without a database lookup on every request. This reduces latency and database load, which matters for intermittent connectivity.
- **Stateless scaling.** If we add more Next.js instances, no sticky sessions or shared session store is needed.
- **Embedded claims.** Roles, permissions, and facility IDs are included in the JWT payload. The middleware and service-layer authorization checks read from the token without additional queries.

### NextAuth v5

- **Framework integration.** NextAuth's App Router support provides middleware-level auth (`authorized` callback), server-side session access (`auth()`), and client-side hooks.
- **PrismaAdapter** handles the Account/Session/VerificationToken tables for future OAuth providers.
- **Credentials provider** supports email/password login natively.

### argon2

- **Memory-hard** algorithm resistant to GPU and ASIC attacks.
- **@node-rs/argon2** is a native Rust binding with no C compilation dependency, simplifying the Docker build.

## Alternatives Considered

- **Database sessions:** More secure revocation but requires a database query per request -- problematic over slow connections.
- **bcrypt:** Well-established but argon2 is the OWASP-recommended successor.
- **Custom JWT implementation:** More control but reinvents session management, CSRF protection, and cookie handling.

## Consequences

- **Positive:** Fast auth checks (no DB round trip). Roles/permissions available everywhere without extra queries. 8-hour TTL limits exposure window.
- **Negative:** JWTs cannot be revoked before expiry. If a user's role changes, the old JWT remains valid until it expires. JWT payload size grows with the number of facilities assigned to a user.
- **Mitigated by:** 8-hour TTL limits the stale-permission window. Admin can deactivate a user (`isActive = false`), and the next login attempt will fail. Future: add a token version check on critical operations.
