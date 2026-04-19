# Presentation Guide - Hardware Lifecycle Management System

This guide helps you explain the project clearly during a presentation and answer common technical questions.

---

## 1) One-Minute Project Summary

This project is a Web-Based Hardware Lifecycle Management System. It helps an organization track hardware assets, maintenance work, warranty status, and lifecycle changes. The frontend is built with Next.js (App Router) and TailwindCSS for a clean dashboard UI. Supabase provides the database and authentication so data is secure and easy to manage. The system lets users log in, add hardware, record maintenance, and see warranty risks in one place.

---

## 2) Problem and Solution

**Problem:** Hardware tracking is often spread across spreadsheets, making it hard to maintain accurate records, warranties, and maintenance history.

**Solution:** A centralized dashboard with structured data and clear workflows:
- One source of truth for assets
- Maintenance logs tied to each asset
- Warranty monitoring for proactive replacements
- Lifecycle tracking for auditability

---

## 3) Tech Stack and Why

- **Next.js (App Router)**: fast routing, component-based UI, and easy layout composition.
- **TypeScript**: prevents type errors and makes data structures clear.
- **Supabase**: managed Postgres database + Auth, so no custom backend needed.
- **TailwindCSS**: quick, consistent styling for admin dashboards.

---

## 4) Core Features (How They Work)

### A) Authentication
- Supabase Auth handles login.
- Login page calls `supabase.auth.signInWithPassword()`.
- `AuthGate` checks for a valid session and redirects to `/login` if missing.

Where to point:
- Login logic: [src/app/login/page.tsx](src/app/login/page.tsx)
- Auth check: [src/components/AuthGate.tsx](src/components/AuthGate.tsx)

### B) Hardware CRUD
- Add hardware via form.
- Form submits to Supabase `hardware_assets` table.
- List is refreshed from Supabase after insert and delete.

Where to point:
- Hardware page logic: [src/app/(app)/hardware/page.tsx](src/app/(app)/hardware/page.tsx)
- Form UI: [src/components/HardwareForm.tsx](src/components/HardwareForm.tsx)

### C) Maintenance Logs
- Each maintenance record references a hardware asset by `hardware_id` (foreign key).
- Page loads assets for dropdown, then logs for the table.
- Inserts go to `maintenance_logs`.

Where to point:
- Maintenance page: [src/app/(app)/maintenance/page.tsx](src/app/(app)/maintenance/page.tsx)

### D) Lifecycle Tracking
- When a hardware status changes, the new status is saved on the asset.
- A history row is written to `lifecycle_history` for auditing.

Where to point:
- Status change logic: [src/app/(app)/hardware/page.tsx](src/app/(app)/hardware/page.tsx)

### E) Warranty Monitoring
- Uses `warranty_expiry` date from assets.
- Calculates expired and expiring soon (within 30 days) on the client.

Where to point:
- Warranty page: [src/app/(app)/warranty/page.tsx](src/app/(app)/warranty/page.tsx)

---

## 5) Database Relationships (Explain Simply)

- **hardware_assets** is the main table.
- **maintenance_logs** references `hardware_assets.id` with `hardware_id`.
- **lifecycle_history** also references `hardware_assets.id`.

Why this matters: one asset can have many maintenance records and many lifecycle changes without duplicating asset details.

---

## 6) UI Structure (What to Say)

- The App Router uses a folder-per-route system.
- Shared layout elements live in `components/`.
- The dashboard layout is in a nested layout file so it only wraps app pages.

---

## 7) Why There Are Two layout.tsx Files

This is normal in Next.js App Router:

1) **Root Layout**: [src/app/layout.tsx](src/app/layout.tsx)
   - Wraps the entire application.
   - Sets global fonts, metadata, and global CSS.

2) **App Layout**: [src/app/(app)/layout.tsx](src/app/(app)/layout.tsx)
   - Wraps only the authenticated dashboard pages.
   - Adds the sidebar and navbar so every dashboard page shares the same shell.

You can explain it like:
> The root layout is for global setup, and the nested layout is for the dashboard UI shell. That is why they have the same file name but different folder scopes.

---

## 8) Likely Instructor Questions + Short Answers

**Q: Why Next.js App Router?**
A: It makes layouts and routing clean, and lets me share the same dashboard shell across multiple pages without repeating code.

**Q: Why Supabase instead of building a backend?**
A: Supabase already provides database and auth, so I can focus on the frontend and logic without writing a custom API.

**Q: What does `AuthGate` do?**
A: It checks if a user session exists. If not, it redirects to `/login` to protect the app.

**Q: What happens when I add hardware?**
A: The form sends data to Supabase, and the page reloads the list from the database.

**Q: What is the foreign key for?**
A: It links maintenance and lifecycle logs to the asset so the history stays connected to the right hardware.

**Q: Why Tailwind?**
A: Fast styling and consistent design with small, reusable classes.

---

## 9) How to Present the Flow Live

1. Show Login
2. Add a hardware asset
3. Show it appears in the list
4. Add a maintenance log
5. Show warranty monitoring

This shows full CRUD and tracking in under 2 minutes.

---

Use this guide as your talking points. If you want, I can make a shorter 1-page version or add a Q&A cheat sheet.

---

## 10) Important Code Blocks You Should Know (Defense Map)

Use this section when panelists ask "where is that logic in your code?"

### A) Supabase Connection Layer

File:
- [src/lib/supabaseClient.ts](src/lib/supabaseClient.ts)

What to say:
- This is the shared database client used by all pages.
- It reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- It throws an error if env values are missing, so misconfiguration fails early.

Why important:
- Centralized setup means every page uses the same trusted connection.

### B) Route Protection (Session Guard)

File:
- [src/components/AuthGate.tsx](src/components/AuthGate.tsx)

What to say:
- On app load, it checks Supabase session.
- If no session, it redirects to `/login`.
- It also listens to auth state changes (like sign out).

Why important:
- Prevents unauthenticated access to dashboard routes.

### C) Role Extraction and Permission Helpers

File:
- [src/lib/roles.ts](src/lib/roles.ts)

What to say:
- Role is derived from Supabase JWT metadata (`app_metadata.role`).
- Fallback role is `viewer` if none is defined.
- Permission helpers keep UI conditions readable and consistent.

Why important:
- Keeps role logic reusable and avoids hardcoding conditions per page.

### D) Hardware CRUD + Lifecycle History Write

File:
- [src/app/(app)/hardware/page.tsx](src/app/(app)/hardware/page.tsx)

What to say:
- `handleCreate` inserts into `hardware_assets`.
- `handleUpdate` updates existing rows.
- On status change, `recordLifecycleChange` writes to `lifecycle_history`.
- Input is normalized (`asset_id` uppercase/trimmed) to reduce duplicates.

Why important:
- Demonstrates core lifecycle traceability requirement.

### E) Maintenance Workflow

File:
- [src/app/(app)/maintenance/page.tsx](src/app/(app)/maintenance/page.tsx)

What to say:
- Loads asset options and maintenance logs.
- Supports create/update/delete with role checks.
- Supports CSV import/export for operational workflows.

Why important:
- Shows practical maintainability features used in real operations.

### F) Warranty Risk Logic

File:
- [src/app/(app)/warranty/page.tsx](src/app/(app)/warranty/page.tsx)

What to say:
- Computes `Expired` and `Expiring Soon` (next 30 days).
- This supports preventive maintenance and budgeting decisions.

Why important:
- Directly ties project output to decision-making value.

### G) Database Security and Constraints

File:
- [SUPABASE_RLS.sql](SUPABASE_RLS.sql)

What to say:
- Defines tables, constraints, indexes, and RLS policies.
- RLS enforces who can read/write/delete per role.
- Script is idempotent, so setup can be repeated safely.

Why important:
- This is the backend security foundation of the project.

---

## 11) One UI, Multiple Roles (How to Explain)

You currently use a single UI shell (same pages), but behavior changes by role:

1. Admin
- Full CRUD on hardware and maintenance
- Can delete hardware
- Can delete maintenance logs

2. Viewer
- Read-only access
- Forms hidden/blocked in hardware and maintenance pages

This is a realistic approach for dashboards because:
- UI stays consistent and easy to maintain
- Security still enforced at DB level via RLS
- Users only see actions they are allowed to perform

---

## 12) Role Assignment Demo Query (If Asked)

Use this in Supabase SQL Editor (replace values):

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where id = 'YOUR-USER-UUID';
```

After running it, sign out and sign in to refresh JWT claims.
