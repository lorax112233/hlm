# Hardware Lifecycle Management System Study Guide

This guide is designed for presentation prep and code defense. It focuses on:

- What each major file is for
- Why each block exists
- How the full system flows from login to database
- What to say when someone points at a specific code area

## 1) System In One Minute

The system is a Next.js App Router web app with Supabase for auth and database.

- Users sign in on the login page.
- Protected pages are wrapped by an auth gate.
- User role is read from Supabase metadata.
- UI routes choose admin or Technician module variants.
- Data operations (assets, maintenance, lifecycle, warranty) are done through Supabase.
- Row Level Security in the database enforces real authorization.

## 2) Core Architecture Map

### 2.1 App Shell

- [src/app/layout.tsx](src/app/layout.tsx): root HTML/body wrapper, global CSS import, font, metadata.
- [src/app/globals.css](src/app/globals.css): global visual system and shared utility classes.
- [src/app/page.tsx](src/app/page.tsx): redirects root URL to dashboard.

### 2.2 Protected App Area

- [src/app/(app)/layout.tsx](src/app/(app)/layout.tsx): protected shell with auth gate, role provider, sidebar, navbar.
- [src/components/layout/AuthGate.tsx](src/components/layout/AuthGate.tsx): session check and redirect if unauthenticated.
- [src/components/layout/Navbar.tsx](src/components/layout/Navbar.tsx): role switch between admin/Technician navbar.
- [src/components/layout/Sidebar.tsx](src/components/layout/Sidebar.tsx): role switch between admin/Technician sidebar.

### 2.3 Auth and Role Layer

- [src/lib/supabaseClient.ts](src/lib/supabaseClient.ts): creates Supabase client and validates env vars.
- [src/lib/roleContext.tsx](src/lib/roleContext.tsx): role state container for the app.
- [src/lib/roles.ts](src/lib/roles.ts): role normalization and permission helper functions.

### 2.4 Route Wrappers

Each main route delegates to admin or Technician module implementation:

- [src/app/(app)/dashboard/page.tsx](src/app/(app)/dashboard/page.tsx)
- [src/app/(app)/hardware/page.tsx](src/app/(app)/hardware/page.tsx)
- [src/app/(app)/maintenance/page.tsx](src/app/(app)/maintenance/page.tsx)
- [src/app/(app)/warranty/page.tsx](src/app/(app)/warranty/page.tsx)
- [src/app/(app)/profile/page.tsx](src/app/(app)/profile/page.tsx)

### 2.5 Feature Modules

Admin modules:

- [src/features/admin/modules/dashboard/DashboardPage.tsx](src/features/admin/modules/dashboard/DashboardPage.tsx)
- [src/features/admin/modules/hardware/HardwarePage.tsx](src/features/admin/modules/hardware/HardwarePage.tsx)
- [src/features/admin/modules/maintenance/MaintenancePage.tsx](src/features/admin/modules/maintenance/MaintenancePage.tsx)
- [src/features/admin/modules/warranty/WarrantyPage.tsx](src/features/admin/modules/warranty/WarrantyPage.tsx)
- [src/features/admin/modules/profile/ProfilePage.tsx](src/features/admin/modules/profile/ProfilePage.tsx)

Technician modules:

- [src/features/Technician/modules/dashboard/DashboardPage.tsx](src/features/Technician/modules/dashboard/DashboardPage.tsx)
- [src/features/Technician/modules/hardware/HardwarePage.tsx](src/features/Technician/modules/hardware/HardwarePage.tsx)
- [src/features/Technician/modules/maintenance/MaintenancePage.tsx](src/features/Technician/modules/maintenance/MaintenancePage.tsx)
- [src/features/Technician/modules/warranty/WarrantyPage.tsx](src/features/Technician/modules/warranty/WarrantyPage.tsx)
- [src/features/Technician/modules/profile/ProfilePage.tsx](src/features/Technician/modules/profile/ProfilePage.tsx)

Shared UI and utilities:

- [src/components/forms/HardwareForm.tsx](src/components/forms/HardwareForm.tsx)
- [src/components/ui/DataTable.tsx](src/components/ui/DataTable.tsx)
- [src/components/ui/DashboardCard.tsx](src/components/ui/DashboardCard.tsx)
- [src/lib/csv.ts](src/lib/csv.ts)

Database and policies:

- [SUPABASE_RLS.sql](SUPABASE_RLS.sql)

## 3) End-to-End Flow (What Happens At Runtime)

### 3.1 Login Flow

1. User enters credentials on [src/app/login/page.tsx](src/app/login/page.tsx).
2. App calls Supabase signInWithPassword.
3. On success, router pushes to dashboard.
4. Protected shell checks session in AuthGate before rendering app pages.

### 3.2 Protected Navigation Flow

1. AuthGate verifies session.
2. RoleProvider fetches current user and resolves role.
3. Route wrapper checks isAdmin.
4. Wrapper renders admin module or Technician module accordingly.

### 3.3 Hardware CRUD Flow

1. Hardware module fetches assets from hardware_assets table.
2. Create and update write to hardware_assets.
3. If lifecycle status changes, module writes to lifecycle_history.
4. Delete removes the asset record.
5. CSV import/export uses parse and serialize helpers.

### 3.4 Maintenance Flow

1. Fetch hardware options and maintenance logs.
2. Insert/update/delete maintenance rows.
3. Link between maintenance and hardware is hardware_id FK.
4. CSV import supports hardware_id or asset_id mapping.

### 3.5 Warranty Flow

1. Load assets with warranty_expiry.
2. Compute status client-side: OK, Expiring Soon, Expired.
3. Aggregate summary counters for quick status visibility.

## 4) Code Block Explanations You Can Reuse

### 4.1 Root Layout Block

File: [src/app/layout.tsx](src/app/layout.tsx)

What it does:

- Imports global CSS once at app root.
- Defines metadata for browser tab and SEO.
- Applies global font variable.

Why it is done this way:

- App Router requires a root layout.
- Global CSS should be imported at the app root for consistent styling.

How to explain quickly:

- This is the global page frame and style setup for every route.

### 4.2 Supabase Client Block

File: [src/lib/supabaseClient.ts](src/lib/supabaseClient.ts)

What it does:

- Reads env vars.
- Throws a clear error if missing.
- Exports one reusable Supabase client.

Why it is done this way:

- Centralized setup avoids duplication.
- Fail-fast behavior catches deployment misconfiguration early.

How to explain quickly:

- This file is the single source of truth for database/auth connectivity.

### 4.3 AuthGate useEffect Block

File: [src/components/layout/AuthGate.tsx](src/components/layout/AuthGate.tsx)

What it does:

- On mount, checks current session.
- Redirects to login when no valid session.
- Subscribes to auth state change events.
- Cleans up listener on unmount.

Why it is done this way:

- Prevents unauthenticated access.
- Keeps UI in sync with sign-out/sign-in events.

How to explain quickly:

- It is a route guard that blocks protected UI until auth state is confirmed.

### 4.4 Role Context Block

File: [src/lib/roleContext.tsx](src/lib/roleContext.tsx)

What it does:

- Stores role, userId, and loading state.
- Resolves role from current user.
- Exposes isAdmin and isTechnician convenience flags.

Why it is done this way:

- Prevents repeated role lookup in every page.
- Enables clean role-based route/module switching.

How to explain quickly:

- Centralized app-wide role state for predictable permission-aware rendering.

### 4.5 Route Wrapper Block

File: [src/app/(app)/hardware/page.tsx](src/app/(app)/hardware/page.tsx)

What it does:

- Reads isAdmin from role context.
- Chooses admin module or Technician module.

Why it is done this way:

- Keeps routing simple and module boundaries clear.
- Makes role split obvious and maintainable.

How to explain quickly:

- The route is a selector layer; business UI lives in role-specific modules.

## 5) Backend Model and Security (Critical Defense Topic)

Reference: [SUPABASE_RLS.sql](SUPABASE_RLS.sql)

### 5.1 Tables

- hardware_assets: core inventory records.
- maintenance_logs: maintenance events tied to hardware.
- lifecycle_history: status transition audit trail.

### 5.2 Data Integrity

- Allowed lifecycle status enforced by check constraint.
- Allowed maintenance status enforced by check constraint.
- Unique asset_id index.
- Unique serial_number when present.

### 5.3 Automation

- Triggers for updated_at.
- Triggers for created_by.

### 5.4 Authorization

- RLS enabled on all main tables.
- Authenticated users can select.
- Only admins can insert/update/delete via policy checks.

Best defense sentence:

- UI permissions improve user experience, but database RLS is the real authorization boundary.

## 6) Common Questions and Strong Answers

### Q1: Why split admin and Technician modules?

Answer:

- To isolate role-specific UI behavior, reduce conditional noise in large components, and keep module intent clear.

### Q2: How do you prevent unauthorized writes?

Answer:

- Frontend checks block UI actions, and Supabase RLS policies enforce write permissions at database level.

### Q3: Why default role to Technician?

Answer:

- Least privilege by default is safer if metadata is missing or malformed.

### Q4: Why maintain lifecycle_history when status exists in hardware_assets?

Answer:

- hardware_assets stores current state, lifecycle_history stores change history for audit and traceability.

### Q5: Why fail build on missing env vars?

Answer:

- It prevents deploying a broken app and surfaces configuration mistakes immediately.

## 7) Known Improvement Areas (Say This If Asked)

1. Some role-specific modules still hardcode role constants internally; wrappers already decide role.
2. Further cleanup can remove duplicated role assumptions and rely fully on context inputs.
3. More automated tests can be added for role paths and RLS behavior verification.

## 8) Quick Study Plan (Repeatable)

### Session A: Structure (20 min)

- Read architecture map sections and open each linked file once.

### Session B: Auth + Role (20 min)

- Explain AuthGate and RoleProvider out loud without notes.

### Session C: Data Features (30 min)

- Walk through hardware and maintenance flows from fetch to write.

### Session D: Security Defense (20 min)

- Practice the RLS explanation and answer the common questions section.

## 9) Self-Test Prompts

Use these to train your defense:

1. Explain why [src/components/layout/AuthGate.tsx](src/components/layout/AuthGate.tsx) needs both session check and auth listener.
2. Explain how [src/lib/roles.ts](src/lib/roles.ts) prevents accidental privilege escalation.
3. Explain the difference between current state and event history in hardware lifecycle design.
4. Explain why CSV parsing is a utility and not embedded directly in page components.
5. Explain where real authorization happens when a Technician attempts write operations.

