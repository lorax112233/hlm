# Web-Based Hardware Lifecycle Management System

This project is a Next.js + Supabase application for managing IT assets from registration to retirement/disposal.

## Features

- Supabase Auth login for protected dashboard routes
- Hardware registration and lifecycle status tracking
- Maintenance logging with CSV import/export
- Warranty monitoring (expired and expiring soon)
- Lifecycle history tracking per hardware asset
- Dedicated Admin Hub for system operations
- Role-aware UI behavior aligned with RLS policies

## Tech Stack

- Next.js (App Router, TypeScript)
- Supabase (Postgres, Auth, RLS)
- TailwindCSS

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env.local
```

3. Set real Supabase values in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key_here
```

4. Apply database setup in Supabase SQL Editor:

- Run `SUPABASE_RLS.sql`

This should be done before testing write operations in the app.

5. Start dev server:

```bash
npm run dev
```

6. Open:

- http://localhost:3000

## Backend Setup Notes

`SUPABASE_RLS.sql` includes:

- Table creation (if missing)
- Constraints and indexes
- Update timestamp triggers
- Row Level Security policies

This script is idempotent and can be re-run safely.

## Role Model

The app uses role values from Supabase JWT app metadata:

- `admin`
- `viewer` (default fallback)

UI and RLS behavior:

- Admin: full manage access
- Viewer: read-only access

### Example SQL for assigning roles

Run this in Supabase SQL Editor (replace user id and role):

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where id = 'YOUR-USER-UUID-HERE';
```

After changing roles, sign out and sign in again to refresh JWT claims.

## Quality Checks

```bash
npm run lint
npm run build
```

Both commands should pass before deployment.

## Deployment (Vercel)

1. Push repository to GitHub.
2. Import project in Vercel.
3. Use Node.js 20.x in Vercel (matches `package.json` engines).
4. Add environment variables in Vercel project settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy.
6. Confirm Supabase SQL setup has been applied in the target Supabase project.

`vercel.json` is included to make framework and build commands explicit.

## Important Notes

- Asset IDs are unique by design.
- Serial numbers are unique when present.
- If you see duplicate key errors, use a new unique `asset_id` or update the existing record.
