# Hardware Lifecycle Management System - Project Guide

This guide is your step-by-step reference for building the Web-Based Hardware Lifecycle Management System using Next.js, Supabase, and TailwindCSS. Follow each step in order and check them off as you go.

---

## 0) Prerequisites

- Node.js LTS installed (18+ recommended)
- A Supabase account
- Basic familiarity with TypeScript and React

---

## 1) Project Setup (Next.js + TypeScript)

### 1.1 Create project

```bash
npx create-next-app@latest . --ts --app --eslint --no-tailwind
```

Why: Creates a clean Next.js App Router project with TypeScript and ESLint. We skip Tailwind so we can configure it manually.

### 1.2 Install dependencies

```bash
npm install tailwindcss postcss autoprefixer @supabase/supabase-js @heroicons/react
```

Why:
- Tailwind: utility-first styling
- PostCSS/Autoprefixer: build pipeline for Tailwind
- Supabase: database + auth
- Heroicons: clean UI icons

### 1.3 Initialize Tailwind config

```bash
npx tailwindcss init -p
```

Why: Generates Tailwind and PostCSS config files.

### 1.4 Configure Tailwind

- Update `tailwind.config.js` to include `./src/**/*.{js,ts,jsx,tsx,mdx}` in `content`.
- Extend theme colors with the project palette.

Why: Tailwind needs to scan your files to generate only used styles; custom colors keep a consistent design system.

### 1.5 Global styles

Add Tailwind directives to `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Why: Enables Tailwind utilities in the app.

---

## 2) Supabase Setup

### 2.1 Create Supabase project

- Go to https://supabase.com
- Create a new project
- Open **Project Settings > API**
- Copy **Project URL** and **anon public key**

### 2.2 Add environment variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key_here
```

Why: Next.js uses `NEXT_PUBLIC_` variables on the client to connect to Supabase.

### 2.3 Create Supabase client

Create `src/lib/supabaseClient.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

Why: Centralizes the Supabase connection for reuse in any page or component.

---

## 3) Database Design

### 3.1 Tables

Create these tables in Supabase:

**  **
- id (uuid primary key)
- asset_id
- device_name
- device_type
- serial_number
- purchase_date
- warranty_expiry
- assigned_to
- lifecycle_status
- created_at

**maintenance_logs**
- id (uuid primary key)
- hardware_id (foreign key -> hardware_assets.id)
- maintenance_date
- issue_description
- action_taken
- technician_name
- maintenance_status
- created_at

**lifecycle_history**
- id (uuid primary key)
- hardware_id (foreign key -> hardware_assets.id)
- old_status
- new_status
- changed_by
- changed_at

### 3.2 Relationships

- One hardware asset can have many maintenance logs.
- One hardware asset can have many lifecycle history records.

Why: This ensures you can track both maintenance events and status transitions over time without duplicating hardware data.

---

## 4) Application Structure

Recommended structure:

```
app/
  layout.tsx
  page.tsx
  dashboard/
  hardware/
  maintenance/
  warranty/

components/
  Sidebar.tsx
  Navbar.tsx
  DashboardCard.tsx
  DataTable.tsx
  HardwareForm.tsx

lib/
  supabaseClient.ts
```

Why: Keeps routes in `app/`, shared UI in `components/`, and external service logic in `lib/`.

---

## 5) Core Features (Implementation Order)

1) Authentication
- Supabase Auth for login and session

2) Dashboard
- Cards for total assets, active devices, under maintenance, expired warranties

3) Hardware CRUD
- Add, edit, delete, view details

4) Maintenance Logs
- Create and view logs per hardware item

5) Lifecycle Tracking
- Track status changes (New, Active, Under Maintenance, Retired, Disposed)

6) Warranty Monitoring
- Expired and expiring within 30 days

---

## 6) UI Guidelines

- Material Dashboard inspired layout
- Left sidebar, top navbar, cards, tables, and forms
- Use the palette:
  - Background: #f5f5f5
  - Sidebar: #eeeeee
  - Primary: #1976d2
  - Success: #388e3c
  - Warning: #f57c00
  - Danger: #d32f2f
  - Text: #333333

Why: Consistent, professional visuals and a clean admin dashboard feel.

---

## 7) Development Cycle

1. Build database tables
2. Add authentication pages
3. Build layout (Sidebar + Navbar)
4. Implement dashboard data
5. Add hardware CRUD
6. Add maintenance logs
7. Add lifecycle history
8. Add warranty monitoring
9. Polish UI and add validation

---

## 8) Verification

Start dev server:

```bash
npm run dev
```

Open http://localhost:3000

Suggested demo flow:
- Log in
- Create a hardware asset
- Update lifecycle status
- Add a maintenance log
- Check warranty page

---

## 9) Notes

- Keep components small and reusable.
- Prefer server components for data fetching where possible.
- Use client components only when you need interactivity (forms, tables, dialogs).

---

Use this guide as a checklist. When you finish a section, move to the next.
