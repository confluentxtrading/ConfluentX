# ConfluentX

**Precision Meets Confluence. Professional Futures Trading Software.**

An institutional-grade futures trading platform: a cinematic marketing site, a complete
authentication system, branded transactional emails, and a Bloomberg-meets-Apple trading
dashboard — built on Next.js 15, React 19, and PostgreSQL.

---

## Stack

| Layer      | Technology |
| ---------- | ---------- |
| Framework  | Next.js 15 (App Router) · React 19 · TypeScript (strict) |
| Styling    | Tailwind CSS v4 · shadcn-style UI primitives · Framer Motion · React Three Fiber |
| Charts     | TradingView Lightweight Charts |
| Auth       | NextAuth v5 (Auth.js) — credentials + Google OAuth, email verification, email 2FA, device sessions, rate limiting |
| Database   | PostgreSQL · Prisma |
| Email      | Resend · React Email (dark-branded templates) |
| State      | Zustand · React Hook Form · Zod |

## Project layout

```
src/
├─ app/
│  ├─ (marketing)/        Landing page, privacy, terms, contact
│  ├─ (auth)/             Login, register, forgot/reset password, verify email, 2FA, welcome
│  ├─ dashboard/          Protected app: overview, charts, markets, journal, watchlist, alerts, settings, account
│  └─ api/                auth · user · dashboard · watchlist · chart · settings · alerts · account · subscription
├─ components/
│  ├─ ui/                 Design-system primitives (button, card, dialog, …)
│  ├─ marketing/          Cinematic landing sections
│  ├─ three/              R3F hero scene (CX emblem, particles, lightformers)
│  ├─ dashboard/          Shell, widgets, trading chart
│  └─ auth/               Auth forms
├─ emails/                React Email templates (welcome, verify, reset, 2FA code, new device, account created)
├─ lib/
│  ├─ market-data/        Provider interface + deterministic mock (swap point for live data)
│  ├─ validators/         Zod schemas
│  ├─ auth-adjacent:      tokens.ts · rate-limit.ts · device.ts · mail.ts · api.ts
│  └─ db.ts               Prisma singleton
├─ auth.ts / auth.config.ts / middleware.ts
└─ prisma/schema.prisma
```

## Local development

**Prerequisites:** Node.js 20+ and a PostgreSQL database (local, or free tiers from
[Neon](https://neon.tech) / [Supabase](https://supabase.com)).

```bash
git clone <your-repo-url> && cd ConfluentX
npm install

# 1. Configure environment
cp .env.example .env          # then fill in values (see below)

# 2. Create the database schema
npm run db:push

# 3. Run
npm run dev                   # http://localhost:3000
```

Without `RESEND_API_KEY`, all emails (verification links, 2FA codes) are **printed to
the server console** so the full auth flow is testable offline.

### Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `AUTH_SECRET` | ✅ | `openssl rand -base64 32` or `npx auth secret` |
| `AUTH_TRUST_HOST` | ✅ | `true` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | optional | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → OAuth client. Redirect URI: `{APP_URL}/api/auth/callback/google` |
| `RESEND_API_KEY` | optional | [resend.com](https://resend.com) — console logging fallback in dev |
| `MAIL_FROM` | optional | e.g. `ConfluentX <no-reply@yourdomain.com>` (domain must be verified in Resend) |
| `NEXT_PUBLIC_APP_URL` | ✅ | `http://localhost:3000` locally, your production URL when deployed |

## Deploying to production (Vercel + Neon)

1. **Database** — create a free Postgres at [neon.tech](https://neon.tech), copy the
   connection string (with `?sslmode=require`).
2. **Push the repo to GitHub.**
3. **Vercel** — [vercel.com/new](https://vercel.com/new) → import the repo. The build
   command (`prisma generate && next build`) is already configured in `package.json`.
4. **Set env vars** in Vercel → Project → Settings → Environment Variables: everything
   from the table above, with `NEXT_PUBLIC_APP_URL` set to your production URL and a
   freshly generated `AUTH_SECRET`.
5. **Create the schema** — locally run:
   ```bash
   DATABASE_URL="<neon-url>" npx prisma db push
   ```
6. **Google OAuth** — add `https://<your-domain>/api/auth/callback/google` as an
   authorized redirect URI.
7. **Resend** — verify your sending domain and set `MAIL_FROM` accordingly.
8. Deploy. Done.

> **Production note on rate limiting:** `src/lib/rate-limit.ts` is an in-memory sliding
> window (perfect for a single instance). On serverless, swap the store for Upstash
> Redis (`@upstash/ratelimit`) — the call-site API is already shaped for it.

## Integrating live market data

All market data flows through the `MarketDataProvider` interface
(`src/lib/market-data/types.ts`). The current implementation is a deterministic mock.
To go live (Databento, dxFeed, broker APIs):

1. Implement the interface in `src/lib/market-data/live-provider.ts`.
2. Change one line in `src/lib/market-data/index.ts`.

No UI, widget, or API-route changes required.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build (runs `prisma generate` first) |
| `npm run start` | Serve the production build |
| `npm run typecheck` | Strict TypeScript check |
| `npm run db:push` | Sync Prisma schema to the database |
| `npm run db:studio` | Prisma Studio (visual DB browser) |

---

Futures trading involves substantial risk of loss and is not suitable for all investors.
