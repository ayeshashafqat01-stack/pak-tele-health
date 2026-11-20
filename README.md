# Pak-Tele-Health

> **ALL DATA IN THIS SYSTEM IS SYNTHETIC.** Patient names, observations, screenings, facilities, and every other record are fabricated for development and demonstration purposes. No real patient data exists in this repository or its seed scripts.

Pak-Tele-Health is a telehealth platform designed for rural Pakistan. Healthcare workers at Basic Health Units (BHUs) collect patient vitals, symptoms, and mental-health screenings. Remote doctors review flagged alerts, record consultations, and issue referrals -- all over intermittent connectivity.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React 19) |
| Language | TypeScript 5 |
| Database | MySQL 8 (InnoDB, utf8mb4, UTC) |
| ORM | Prisma 6 |
| Auth | NextAuth v5 (JWT strategy, Credentials provider) |
| Offline | Dexie (IndexedDB) + sync queue with idempotency keys |
| Validation | Zod |
| UI | Tailwind CSS 4, Lucide icons, Recharts, CVA |
| State | TanStack React Query v5 |
| Forms | React Hook Form + @hookform/resolvers |
| Passwords | argon2 (@node-rs/argon2) |

---

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **Docker** and **Docker Compose** (for MySQL)
- **MySQL 8** (provided via docker-compose)

---

## Quick Start

```bash
# 1. Start MySQL
docker-compose up -d

# 2. Install dependencies
npm install

# 3. Copy environment file (adjust if needed)
cp .env.example .env

# 4. Run database migrations
npx prisma migrate dev

# 5. Seed synthetic demo data
npm run db:seed

# 6. Start the development server
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## Seeded Logins

> **WARNING: These credentials and all associated data are SYNTHETIC -- for development only.**

| Role | Email | Password |
|---|---|---|
| Healthcare Worker | `hw@demo.pth` | `demo-hw-pass` |
| Doctor | `doctor@demo.pth` | `demo-doctor-pass` |
| Admin | `admin@demo.pth` | `demo-admin-pass` |

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type checking (`tsc --noEmit`) |
| `npm run db:generate` | Regenerate Prisma Client |
| `npm run db:migrate` | Run Prisma migrations (dev) |
| `npm run db:push` | Push schema to database (no migration file) |
| `npm run db:seed` | Seed database with synthetic data |
| `npm run db:reset` | Reset database and re-seed (destructive) |

---

## Project Structure

```
src/
  app/                    # Next.js App Router (pages + API routes)
    (dashboard)/          # Authenticated layout group
      hw/                 # Healthcare Worker pages
      doctor/             # Doctor pages
      admin/              # Admin pages
    api/v1/               # Versioned REST endpoints
    login/                # Public login page
  modules/                # Domain modules
    alerts/               # Clinical alert rules and evaluation
    audit/                # Audit event logging
    consultations/        # Doctor consultations
    facilities/           # Facility management
    identity/             # User identity
    observations/         # Patient vitals and observations
    patients/             # Patient registry
    referrals/            # Referral state machine
    screenings/           # Mental-health questionnaires
    sync/                 # Offline sync coordination
  shared/                 # Cross-cutting concerns
    auth/                 # NextAuth config, RBAC, types
    db/                   # Prisma client singleton
    errors/               # Error types
    hooks/                # React hooks (connectivity, sync queue)
    lib/                  # Utilities
    validation/           # Zod schemas
prisma/
  schema.prisma           # Database schema
  seed.ts                 # Synthetic data seeder
docker/
  mysql/init.sql          # MySQL init script
tests/                    # Test suites
docs/                     # Project documentation
```

---

## Synthetic Data Warning

This project contains **only synthetic data**. Every record -- patients, observations, screenings, alerts, consultations, referrals, facilities, and users -- is fabricated. The `isSynthetic` flag is set on all seeded records. No real Protected Health Information (PHI) exists anywhere in this repository.

Do not deploy seed data to any environment accessible to end users.
