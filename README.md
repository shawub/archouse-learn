# archouse-learn

A learning management system for UK schools. Teachers create courses and assign them; students work through lessons and track progress. Built with Next.js 16, Tailwind CSS, NextAuth v5, Prisma, and Prisma Postgres.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Auth | NextAuth v5 (Auth.js) — credentials + JWT |
| Database | Prisma Postgres via `@prisma/adapter-pg` |
| Styling | Tailwind CSS |
| Runtime | Node.js 22, pnpm |

## Routes

| Path | Role | Description |
|---|---|---|
| `/` | public | Landing page |
| `/login` | public | Sign in |
| `/register` | public | Create account |
| `/teacher/dashboard` | TEACHER | Overview |
| `/teacher/courses` | TEACHER | Manage courses and lessons |
| `/teacher/students` | TEACHER | View enrolled students |
| `/student/dashboard` | STUDENT | Overview |
| `/student/courses` | STUDENT | Browse and continue courses |

---

## Local setup

### 1. Prerequisites

- Node.js 22+
- pnpm (`npm install -g pnpm`)
- A [Prisma Postgres](https://console.prisma.io) project (free tier is fine)

### 2. Install

```bash
git clone https://github.com/shawub/archouse-learn
cd archouse-learn
pnpm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Prisma Postgres connection string — from console.prisma.io → your project → Connection Details
DATABASE_URL="postgresql://user:password@pooled.db.prisma.io:5432/postgres?sslmode=require"

# Auth.js secret — generate once and keep it
AUTH_SECRET="$(openssl rand -base64 32)"

# Must match the URL you access the app on (update this when using a tunnel — see below)
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Set up the database

```bash
# Push the schema (no migration history, good for dev)
pnpm db:push

# Seed with demo users and sample courses
pnpm db:seed
```

### 5. Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

#### Seed credentials

| Role | Email | Password |
|---|---|---|
| Teacher | teacher@example.com | teacher123 |
| Student | alice@example.com | student123 |
| Student | bob@example.com | student123 |

---

## Publishing via Cloudflare Tunnel

Cloudflare Tunnel gives the app a public HTTPS URL without port forwarding or a static IP. Two modes:

### Quick tunnel (ad-hoc, no account needed)

```bash
cloudflared tunnel --url http://localhost:3000
```

Cloudflare prints a temporary URL like `https://random-words.trycloudflare.com`. It lives as long as the process does.

**Before sharing the URL**, update `.env`:

```env
NEXTAUTH_URL="https://random-words.trycloudflare.com"
ALLOWED_ORIGINS="random-words.trycloudflare.com"
```

Then restart `pnpm dev`.

### Named tunnel (persistent URL, requires Cloudflare account)

A named tunnel keeps the same hostname across restarts.

```bash
# One-time setup
cloudflared tunnel login
cloudflared tunnel create archouse-learn
cloudflared tunnel route dns archouse-learn learn.yourdomain.com
```

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: archouse-learn
credentials-file: ~/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: learn.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

Run the tunnel:

```bash
cloudflared tunnel run archouse-learn
```

Update `.env`:

```env
NEXTAUTH_URL="https://learn.yourdomain.com"
ALLOWED_ORIGINS="learn.yourdomain.com"
```

Restart `pnpm dev`.

> **Note:** `NEXTAUTH_URL` and `ALLOWED_ORIGINS` must always match the hostname you're accessing the app on. Mismatches cause auth redirects and CSRF errors.

---

## Shutting down

```bash
# Stop the dev server
Ctrl+C in the terminal running pnpm dev

# Stop the tunnel
Ctrl+C in the terminal running cloudflared tunnel run

# Kill both if running in the background
pkill -f "next dev"
pkill -f "cloudflared"
```

To delete the tunnel entirely (removes it from Cloudflare):

```bash
cloudflared tunnel delete archouse-learn
```

To recreate it later:

```bash
cloudflared tunnel create archouse-learn
cloudflared tunnel route dns archouse-learn learn.shoggs.org
cloudflared tunnel run archouse-learn
```

The DNS CNAME for `learn.shoggs.org` persists in Cloudflare after tunnel deletion — no need to re-route DNS if you recreate the tunnel with the same name.

---

## Database scripts

```bash
pnpm db:push       # sync schema without migrations (dev)
pnpm db:migrate    # create a migration file and apply it (production-style)
pnpm db:seed       # seed demo users and courses
pnpm db:studio     # open Prisma Studio (local DB browser)
pnpm db:generate   # regenerate Prisma client after schema changes
```

## Other scripts

```bash
pnpm dev           # start dev server (http://localhost:3000)
pnpm build         # production build
pnpm start         # serve production build
pnpm typecheck     # run tsc --noEmit
```
