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
