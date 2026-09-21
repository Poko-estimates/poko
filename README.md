# poko

A pnpm workspace split into two independent parts.

```
poko/
├── frontend/   Next.js app (App Router, Tailwind, shadcn)
└── backend/    Supabase project (config, migrations, functions)
```

The two are not wired together yet — that comes later.

## Setup

```bash
pnpm install
```

## Frontend

```bash
pnpm dev      # or: pnpm --filter poko-frontend dev
pnpm build
pnpm lint
```

## Backend

Requires the [Supabase CLI](https://supabase.com/docs/guides/cli) and Docker.

```bash
pnpm db start      # start local Supabase stack
pnpm db status     # show local URLs and keys
pnpm db stop
pnpm db reset      # re-apply migrations + seed
pnpm db migration <name>
```

Or run `supabase <cmd>` directly from `backend/`.

`pnpm db reset` wipes the database, so `backend/supabase/seed.sql` plants an
account to sign straight back in with:

```
pokoadmin@gmail.com / Poko1234
```

It comes with two sprints and six issues covering the states worth looking at:
a settled estimate, an open round, a timebox nobody has started, an
unfiled issue under Uncategorized, and one on a custom deck.

The fixtures only appear when the account has no issues, so re-running the
seed never duplicates them — and clearing the sidebar then re-running is how
you get them back.

Local only. The seed refuses to run unless the stack's JWT secret is the
Supabase development default, so it cannot put a known password into a real
project — not even via `supabase db reset --linked`.
