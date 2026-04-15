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
