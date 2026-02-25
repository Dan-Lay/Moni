# Moni v2 — Finance Dashboard

A personal finance dashboard built with React, Vite, and PocketBase. Migrated from Lovable to Replit.

## Architecture

- **Frontend**: React 18 + TypeScript + Vite (port 5000)
- **Backend/DB**: PocketBase (external service — credentials configured via environment variables or app settings)
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
- `/login` — Login (PocketBase auth)
- `/verify-2fa` — Two-factor auth verification

## Structure

```
src/
  App.tsx           — Router and providers setup
  main.tsx          — Entry point
  pages/            — Page components
  components/       — Shared UI components
    auth/           — Auth-related components (ProtectedRoute, etc.)
    ui/             — shadcn/ui components
  contexts/
    AuthContext.tsx  — PocketBase auth state
    DataContext.tsx  — Finance data (FinanceProvider)
    ThemeContext.tsx — Dark/light theme
  hooks/            — Custom React hooks
  lib/              — Utilities
```

## Running

The workflow "Start application" runs `npm run dev` which starts Vite on port 5000.

## Environment

PocketBase connection is configured within the app's settings/context. See `.env.example` for reference variables.
