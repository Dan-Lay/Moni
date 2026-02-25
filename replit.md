# Moni v2 — Finance Dashboard

A personal finance dashboard built with React, Vite, and Supabase. Migrated from Lovable to Replit; data layer migrated from PocketBase to Supabase.

## Architecture

- **Frontend**: React 18 + TypeScript + Vite (port 5000)
- **Backend/DB**: Supabase (PostgreSQL + Auth + Realtime)
- **Styling**: Tailwind CSS + shadcn/ui components
- **State**: TanStack Query v5 for data fetching, React Context for auth/theme/finance data
- **Routing**: React Router v6

## Key Pages

- `/` — Dashboard (Index)
- `/expenses` — Expenses view
- `/transactions` — Transactions
- `/planned` — Planned entries
- `/upload` — Upload page
- `/desapego` — Desapego (declutter/sell) section
- `/settings` — Settings
- `/login` — Login (Supabase auth)
- `/verify-2fa` — Two-factor auth verification

## Structure

```
src/
  App.tsx            — Router and providers setup
  main.tsx           — Entry point
  pages/             — Page components
  components/        — Shared UI components
    auth/            — Auth-related components (ProtectedRoute, etc.)
    ui/              — shadcn/ui components
  contexts/
    AuthContext.tsx  — Supabase auth state (UserProfile includes isAdmin, familyId)
    DataContext.tsx  — Finance data (FinanceProvider) with Supabase Realtime
    ThemeContext.tsx — Dark/light theme
  hooks/             — Custom React hooks
  lib/
    supabase.ts      — Supabase client initialization
    pocketbase.ts    — Data CRUD functions (renamed, now uses Supabase)
    mock-pocketbase.ts — Mock API for demo mode (no secrets configured)
    category-cache.ts  — Category cache (Supabase-backed)
    rules-engine.ts    — Categorization rules (Supabase-backed)
    dashboard-layout.ts — Layout persistence (Supabase-backed)
```

## Environment Variables (Replit Secrets)

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key

If either variable is missing, the app falls back to **mock mode** (demo data, no persistence).

## Supabase Schema

The full schema SQL is in `supabase-schema.sql` at the project root.
Run it in the Supabase SQL Editor to create all tables, indexes, RLS policies, and default categories.

**Tables**: profiles, transactions, planned_entries, financial_config, desapego_items, categories, categorization_rules, user_preferences

**Admin setup**: After creating `contato.dan@gmail.com` account in the app, run:
```sql
UPDATE public.profiles SET is_admin = TRUE WHERE email = 'contato.dan@gmail.com';
```

**Family accounts**: Users sharing the same `family_id` in `profiles` are linked as a family unit.

## Running

The workflow "Start application" runs `npm run dev` which starts Vite on port 5000.
