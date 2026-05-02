# HLM System — Student Study Guide
**Hardware Lifecycle Management · 2-Day Exam Prep**

> This guide is written assuming you can read code but freeze up when asked to explain it.
> Every section gives you the code, walks through it line by line, and tells you exactly what to say.

---

## HOW TO USE THIS GUIDE

**Day 1** — Read Parts 1–4 (the big picture, React basics, Supabase basics, authentication)
**Day 2** — Read Parts 5–8 (all the business logic, then do the Quick Answer Cards at the end)

When you see a code block, read the comments — every important line is annotated.
When you see a **"Say it like this"** box, that's the answer you'd give out loud.

---

# PART 1 — WHAT THIS SYSTEM IS

## The One-Sentence Summary

This is a web app where a company tracks its hardware (laptops, desktops) from the day it's bought to the day it's thrown away, and manages who is fixing what.

## The Two Users

| User | What they can do |
|------|-----------------|
| **Admin** | Add hardware, create maintenance jobs, assign technicians, invite new users, see everything |
| **Technician** | See only their assigned jobs, document what they did, mark jobs done or give up |

## How Data Flows Through the System

```
Admin adds a device          →  saved in hardware_assets table
Admin creates a repair job   →  saved in maintenance_logs table (linked to that device)
Admin assigns technician     →  technician_id in maintenance_logs = that technician's id
Technician adds a note       →  action_taken column is updated
Technician clicks Resolve    →  maintenance_status = "Resolved"
                             →  if no other open jobs: hardware goes back to "Active"
Technician clicks Can't Fix  →  maintenance_status = "Escalated"
                             →  hardware stays "Under Maintenance"
Admin deletes a job          →  same check: if no more open jobs → hardware back to "Active"
```

**Say it like this:**
> "The system has two tables that work together — hardware_assets stores the devices, maintenance_logs stores the repair jobs. When a job's status changes, the code also checks whether the device's status needs to change too."

---

# PART 2 — THE TECH STACK

Think of it like layers of a building:

| Layer | Tool | Plain English |
|-------|------|--------------|
| **Foundation** | Supabase | The database and login system. Lives on the internet, not our computer. |
| **Structure** | Next.js | The framework that handles pages and routes. Think of it as the skeleton. |
| **Rooms** | React | Makes each page interactive — buttons click, data loads without refreshing |
| **Walls** | TypeScript | Adds rules to JavaScript so you catch mistakes before running the code |
| **Paint** | Tailwind CSS | Styles the UI using class names written directly in the HTML-like code |

## The Folder Structure

```
src/
├── app/                   ← "Where are the pages?" — Here
│   ├── (app)/             ← All pages that REQUIRE login to see
│   │   ├── dashboard/     ← The /dashboard URL
│   │   ├── hardware/      ← The /hardware URL
│   │   ├── maintenance/   ← The /maintenance URL
│   │   └── layout.tsx     ← Runs on EVERY logged-in page (auth check + sidebar)
│   ├── api/               ← Server-side code (runs on the server, not browser)
│   └── login/             ← The /login URL (public, no login needed)
│
├── features/              ← The ACTUAL logic for each page
│   ├── admin/modules/     ← What the admin sees
│   └── technician/modules/← What the technician sees
│
├── components/            ← Reusable pieces used across many pages
│   ├── ui/                ← Small display pieces (table, badge)
│   ├── forms/             ← Form components
│   └── layout/            ← Navbar, Sidebar, AuthGate
│
└── lib/                   ← Shared tools
    ├── supabaseClient.ts  ← Creates the database connection
    ├── roles.ts           ← Functions to check if someone is admin or technician
    └── roleContext.tsx    ← Shares the role across all pages
```

**Key rule:** The files in `app/(app)/` are just wrappers. They do nothing except import the real component from `features/`. All the actual code lives in `features/`.

---

# PART 3 — REACT: HOW PAGES WORK

Every page in this project follows the same pattern. Once you understand this pattern, you can read any page.

## The Template Every Page Uses

```typescript
"use client";  // This page runs in the BROWSER (not on the server)

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SomePage() {

  // ─── STEP 1: DECLARE STATE ────────────────────────────────────────────────
  // State = variables that, when changed, cause the page to visually update
  const [logs, setLogs] = useState([]);           // starts as empty array
  const [isLoading, setIsLoading] = useState(true); // starts as true = "still loading"
  const [errorMessage, setErrorMessage] = useState(null); // starts as null = no error

  // ─── STEP 2: LOAD DATA WHEN THE PAGE OPENS ───────────────────────────────
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from("maintenance_logs").select("*");
      if (error) setErrorMessage(error.message); // something went wrong
      else setLogs(data);                        // save the data
      setIsLoading(false);                       // done loading
    };
    void load(); // run it
  }, []);        // [] = run only ONCE when the page first appears

  // ─── STEP 3: HANDLE USER ACTIONS ─────────────────────────────────────────
  const handleClick = async () => {
    await supabase.from("maintenance_logs").update({ maintenance_status: "Resolved" }).eq("id", "123");
    // after changing data, re-fetch to show the updated version
  };

  // ─── STEP 4: DISPLAY ──────────────────────────────────────────────────────
  return (
    <div>
      {isLoading ? <p>Loading...</p> : null}          // show "Loading..." while waiting
      {errorMessage ? <p>{errorMessage}</p> : null}   // show error if one exists
      {logs.map((log) => <div key={log.id}>{log.issue_description}</div>)}
    </div>
  );
}
```

## The Three React Hooks You Must Know

### useState — Storing a value that changes

```typescript
const [count, setCount] = useState(0);
//     ^        ^                   ^
//  current  function to        starting value
//   value   change it
```

**Analogy:** It's like a whiteboard. `count` is what's written on it. `setCount(5)` erases it and writes 5. The moment you write something new, the page re-draws itself.

**Say it like this:**
> "useState stores a value in memory. When I call the setter function with a new value, React re-renders the component so the screen shows the updated value."

---

### useEffect — Running code at the right time

```typescript
useEffect(() => {
  // code here runs AFTER the component appears on screen
  void loadData();
}, []); // ← the [] is the dependency array
```

- `[]` = run once, when the component first mounts
- `[someVariable]` = run again every time `someVariable` changes
- No array = run after every single render (rarely used)

**Analogy:** It's like setting an alarm. `[]` means "ring once when I first open the app." `[userId]` means "ring again whenever userId changes."

**Say it like this:**
> "useEffect runs code after the component renders. The empty array means it only runs once, when the page first loads — which is when we want to fetch data from Supabase."

---

### useMemo — Calculating something without redoing it every render

```typescript
// From MaintenancePage.tsx — technician
const hardwareLookup = useMemo(
  () => new Map(hardwareOptions.map((h) => [h.id, `${h.asset_id} – ${h.device_name}`])),
  [hardwareOptions],  // only recalculate when hardwareOptions changes
);
```

**What this does:** It builds a lookup table (Map) so you can instantly find a device name by its ID. Without `useMemo`, it would rebuild this Map on every single re-render, which is wasteful.

**Analogy:** It's like making a phone book once and keeping it. `useMemo` says "only reprint the phone book when the list of people changes."

**Say it like this:**
> "useMemo caches the result of an expensive calculation. It only recalculates when its dependencies change. Here it's building a Map from hardware IDs to display names so we don't rebuild it on every render."

---

## isMounted — Preventing Errors After Leaving a Page

You'll see this in multiple pages:

```typescript
useEffect(() => {
  let isMounted = true;               // flag: is this page still open?

  const load = async () => {
    const { data } = await supabase.from("...").select("*");
    if (!isMounted) return;           // user already left the page — stop
    setLogs(data);                    // safe to update state
  };

  void load();
  return () => { isMounted = false; }; // cleanup: page is closing
}, []);
```

**Why this exists:** If a user navigates away while data is still loading, and then the data arrives — React would try to update the state of a component that no longer exists. This causes an error. Setting `isMounted = false` on cleanup prevents that.

---

# PART 4 — SUPABASE: THE DATABASE CONNECTION

## The Client Setup

```typescript
// src/lib/supabaseClient.ts

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;       // the database address
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // the public key

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables."); // crash early if missing
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
// One shared connection used by every page in the app
```

**Why `NEXT_PUBLIC_`?** That prefix tells Next.js it's safe to share this value with the browser. Never put secrets (like the service role key) with that prefix — they'd be visible to anyone.

**Say it like this:**
> "supabaseClient.ts creates one shared connection to the database using the public URL and anonymous key from the environment variables. Every page imports this same connection."

---

## Reading Supabase Queries

Think of every Supabase query as a sentence: **from** (table) → **what to do** → **filters** → **options**.

### SELECT — Read data

```typescript
const { data, error } = await supabase
  .from("maintenance_logs")              // FROM maintenance_logs
  .select("id, hardware_id, maintenance_status") // SELECT these columns
  .eq("technician_id", userId)           // WHERE technician_id = userId
  .in("maintenance_status", ["Open", "In Progress"]) // AND status IN ('Open','In Progress')
  .order("maintenance_date", { ascending: false }); // ORDER BY date DESC
```

### SELECT with COUNT — Just count, don't return rows

```typescript
const { count } = await supabase
  .from("maintenance_logs")
  .select("id", { count: "exact", head: true }) // count: "exact" = give me the number
  .eq("hardware_id", someId)                    // head: true = don't return actual rows
  .in("maintenance_status", ["Open", "In Progress", "Escalated"]);
// count will be a number like 2 or 0
```

### INSERT — Add a new row

```typescript
const { error } = await supabase
  .from("maintenance_logs")
  .insert({
    hardware_id: "abc-123",
    issue_description: "Screen cracked",
    maintenance_status: "Open",
  });
```

### UPDATE — Change existing row(s)

```typescript
const { error } = await supabase
  .from("maintenance_logs")
  .update({ maintenance_status: "Resolved" }) // SET maintenance_status = 'Resolved'
  .eq("id", logId);                          // WHERE id = logId
```

### DELETE — Remove a row

```typescript
const { error } = await supabase
  .from("maintenance_logs")
  .delete()
  .eq("id", logId); // WHERE id = logId
```

### The `{ data, error }` Pattern

Every query returns `{ data, error }`. One of them will be null:

```typescript
const { data, error } = await supabase.from("...").select("*");

if (error) {
  setErrorMessage(error.message); // something went wrong, show the message
  return;                         // stop — don't try to use data
}

// if we get here, data is safe to use
setLogs(data);
```

**Say it like this:**
> "Supabase always returns a data-and-error pair. If there's an error, we show the message and stop. If there's no error, we use the data. We never use data when error exists."

---

# PART 5 — AUTHENTICATION: WHO IS LOGGED IN AND WHAT CAN THEY DO?

## The Login Flow

```
User opens any page in (app)/
          ↓
    AuthGate runs first
          ↓
    "Is there a session?"
     /            \
   No              Yes
    ↓               ↓
Redirect        setReady(true)
to /login     → show the page
```

## AuthGate — The Bouncer

```typescript
// src/components/layout/AuthGate.tsx
export default function AuthGate({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false); // start: NOT ready = show nothing

  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession(); // ask Supabase: logged in?

      if (error || !data.session) {   // no session = not logged in
        router.replace("/login");     // send them to login page
        return;
      }

      setReady(true); // session exists = safe to show the page
    };

    // Also listen for logout events in real time
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        router.replace("/login"); // logged out? kick to login
        return;
      }
      if (session) setReady(true);
    });

    checkSession();

    return () => { listener.subscription.unsubscribe(); }; // cleanup
  }, [router]);

  if (!ready) return <div>Checking session...</div>; // show nothing until confirmed

  return <>{children}</>; // show the actual page
}
```

**Say it like this:**
> "AuthGate wraps every logged-in page. When it mounts, it asks Supabase if there's an active session. If not, it redirects to /login. If yes, it renders the children — the actual page. It also listens for logout events so it can redirect immediately if the user signs out."

---

## Where the Role Comes From

When Supabase logs someone in, it returns a **JWT token** — a signed blob of data. Inside that token is `app_metadata.role`. This is set when the account is created and only the server can change it.

```typescript
// src/lib/roles.ts
export const getUserRole = (user) => {
  if (!user) return "technician";          // no user = default to least privilege

  const appRole = user.app_metadata?.role; // read from JWT: "admin" or "technician"
  if (appRole) return normalizeRole(appRole); // clean and return it

  return normalizeRole(user.user_metadata?.role); // fallback if app_metadata is empty
};
```

The `?.` is **optional chaining** — if `app_metadata` is null or undefined, it returns `undefined` instead of crashing with an error.

**Why `app_metadata` and not `user_metadata`?**
- `user_metadata` — the user themselves can write to this. Not safe for roles.
- `app_metadata` — only the server (using the service role key) can write to this. Safe for roles.

**Say it like this:**
> "The role is stored inside the JWT token in app_metadata.role. getUserRole reads it from there. We use app_metadata because users can't tamper with it — only the server can write to it."

---

## RoleProvider — Sharing the Role Across All Pages

After AuthGate confirms login, `RoleProvider` fetches the user once and makes their role available to every component on the page.

```typescript
// src/lib/roleContext.tsx — simplified

export function RoleProvider({ children }) {
  const [role, setRole] = useState("technician"); // safe default
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const syncRole = async () => {
      const { data } = await supabase.auth.getUser(); // get the logged-in user
      setRole(getUserRole(data.user));               // set their role
      setUserId(data.user?.id ?? null);
      setIsLoading(false);
    };
    void syncRole();
  }, []);

  const value = useMemo(() => ({
    role,
    userId,
    isAdmin: role === "admin",       // convenience flag
    isTechnician: role === "technician",
    isLoading,
  }), [isLoading, role, userId]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

// Any component calls this to get the role:
export function useRole() {
  const context = useContext(RoleContext);
  if (!context) throw new Error("useRole must be used inside RoleProvider.");
  return context; // returns { role, isAdmin, isTechnician, userId, isLoading }
}
```

**How it's used in pages:**

```typescript
const { isAdmin, role } = useRole();

if (isAdmin) {
  // show admin-only buttons
}
```

**Say it like this:**
> "RoleProvider fetches the user once and stores their role in a React Context. Any component wrapped inside it can call useRole() to instantly get the role without making another database call. It's a shared state container for auth info."

---

## The Layout That Wraps Everything

```typescript
// src/app/(app)/layout.tsx
export default function AppLayout({ children }) {
  return (
    <AuthGate>           {/* 1. Checks login — blocks or allows */}
      <RoleProvider>     {/* 2. Fetches user role once */}
        <div ...>
          <Sidebar />    {/* 3. Uses role to show/hide menu items */}
          <Navbar />
          <main>{children}</main>  {/* 4. The actual page */}
        </div>
      </RoleProvider>
    </AuthGate>
  );
}
```

This file runs for EVERY page inside `(app)/`. So every page automatically gets the login check and the role system.

---

# PART 6 — THE MAINTENANCE STATUS SYSTEM

## All Possible Statuses and Their Meaning

| Status | What it means |
|--------|--------------|
| `Open` | Job created, no technician assigned yet |
| `In Progress` | Technician assigned and working on it |
| `Resolved` | Technician fixed it and documented the fix |
| `Escalated` | Technician can't fix it — needs admin attention |

These are enforced at the DATABASE level:
```sql
CHECK (maintenance_status IN ('Open', 'In Progress', 'Resolved', 'Escalated'))
```
If any code tries to save a different value (like a typo "Resolvd"), the database rejects it.

## Auto-Status on Create

When the admin creates a new maintenance job:

```typescript
// Admin Maintenance Page — on submit
const autoStatus = formValues.technician_id ? "In Progress" : "Open";
// If a technician is already assigned → "In Progress" (makes sense, someone has the job)
// If no technician yet → "Open" (waiting to be assigned)
```

**Say it like this:**
> "When a job is created with a technician already assigned, the status automatically becomes In Progress. If no technician is assigned yet, it starts as Open. This prevents the illogical state of a job being Open while someone is already working on it."

---

## The action_taken Guard

Before a technician can mark a job Resolved or Escalated, the system requires them to document what they did:

```typescript
// From technician's MaintenancePage.tsx — handleQuickStatus()

// First, fetch the latest version from the database (in case they saved notes
// in another tab and the local state is stale)
const { data: fresh } = await supabase
  .from("maintenance_logs")
  .select("action_taken")
  .eq("id", logId)
  .single();

// Use the fresh value if it exists, otherwise fall back to local state
const actionTaken = fresh?.action_taken ?? log.action_taken;

if (!actionTaken?.trim()) {
  // .trim() removes spaces — so "   " (just spaces) counts as empty
  setErrorMessage("Document what you did under Action Taken before marking this job resolved.");
  handleOpenNote(log); // automatically open the note panel
  return;              // STOP — do not update the status
}
```

**Why fetch fresh from DB?** If the technician added a note in the Work Orders tab and then went to Dashboard — the Dashboard still has old data with `action_taken = null`. Fetching fresh ensures we check the real value.

**Say it like this:**
> "The guard fetches the action_taken value directly from the database before checking it. This is because local state might be stale if the user added a note from a different page. The .trim() means a note of only spaces doesn't count."

---

## The handleEscalate Function (Can't Fix Button)

This is the most complex single function in the app. Here it is annotated:

```typescript
// src/features/technician/modules/maintenance/MaintenancePage.tsx

const handleEscalate = async (logId: string) => {
  try {
    const log = logs.find((l) => l.id === logId); // find the job in local state
    if (!log) return;                              // safety: job not found, stop

    // Guard: must have documented their work first
    if (!log.action_taken?.trim()) {
      setErrorMessage("Document what you tried under Action Taken before escalating.");
      setEditingLog(log);                // open the note panel automatically
      setActionNote(log.action_taken ?? "");
      return;                            // stop here
    }

    setErrorMessage(null);     // clear any previous error
    setUpdatingId(logId);      // set button to show "..."

    // Create a timeout promise that resolves with an error after 8 seconds
    // This prevents the button from being stuck on "..." forever
    const timeout = new Promise((resolve) =>
      setTimeout(
        () => resolve({ error: { message: "Update timed out." } }),
        8000 // 8 seconds
      )
    );

    // Race the actual DB update against the timeout
    // Whichever finishes first "wins" and we use that result
    const { error } = await Promise.race([
      supabase.from("maintenance_logs")
        .update({ maintenance_status: "Escalated" })
        .eq("id", logId),
      timeout,
    ]);

    if (error) {
      setErrorMessage(error.message); // show the error (could be DB error or timeout)
      setUpdatingId(null);            // re-enable the button
      return;
    }

    setUpdatingId(null);                // re-enable the button
    void loadMyLogs(currentUserId);    // reload data (void = fire and forget, don't wait)

  } catch (err) {
    // catch any unexpected JavaScript errors
    setErrorMessage(err instanceof Error ? err.message : "Unexpected error.");
    setUpdatingId(null);
  }
};
```

**What is `Promise.race`?**

Imagine two horses racing. `Promise.race` starts both promises at the same time and uses the result of whichever one finishes first. If the DB update finishes in 2 seconds, it wins. If the DB takes longer than 8 seconds, the timeout wins and we get an error message instead of an infinite "..." button.

**Say it like this:**
> "handleEscalate checks the action_taken guard first. Then it races the Supabase update against an 8-second timeout using Promise.race. This ensures the UI never freezes indefinitely. The winning promise provides the result — if either returns an error, we show it and re-enable the button."

---

# PART 7 — HARDWARE LIFECYCLE SYNC

Hardware lifecycle sync is handled entirely by the **`trg_maintenance_logs_sync_hardware` database trigger** (see Part 10 — Database Triggers). The trigger fires automatically at the database level whenever a maintenance job is inserted, updated, or deleted — no frontend code does this anymore.

**The logic:**
- Job status → `Resolved` (or job deleted): count remaining unresolved jobs for this device. If zero, and device is `Under Maintenance` → flip to `Active`
- Job status → `Open`, `In Progress`, or `Escalated`: if device is not `Retired` or `Disposed` → set to `Under Maintenance`

**Why a trigger instead of frontend code?** The original frontend sync code worked for the admin (who has full database permissions) but silently failed for technicians because Row Level Security blocks technicians from updating `hardware_assets`. A database trigger runs as the database owner (`SECURITY DEFINER`), bypassing RLS entirely — so it works regardless of who makes the change.

---

# PART 8 — REAL-TIME UPDATES

Three admin pages update automatically when data changes — no page refresh needed.

## Admin Maintenance Page — listens to `maintenance_logs`

```typescript
useEffect(() => {
  const channel = supabase
    .channel("maintenance-admin-sync")  // name for this subscription
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "maintenance_logs" },
      () => {
        void loadLogs(); // reload ALL logs when anything changes
      }
    )
    .subscribe();

  return () => { void supabase.removeChannel(channel); }; // cleanup on unmount
}, []);
```

`event: "*"` catches INSERT, UPDATE, and DELETE.

## Admin Hardware Page — listens to `hardware_assets`

Same pattern, but on `hardware_assets` with `event: "UPDATE"` only. When the database trigger updates a device's lifecycle_status, this fires and the hardware table refreshes automatically.

## Technicians Page — listens to `maintenance_logs`

```typescript
useEffect(() => {
  const channel = supabase
    .channel("technicians-page-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "maintenance_logs" }, () => {
      void loadData(); // reloads technician list + job counts
    })
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}, []);
```

This keeps the Busy/Available badges accurate in real time. Without this, the badges would only reflect the state from when the page was first opened.

## The Technician Count in the Maintenance Dropdown

The maintenance form shows how many active jobs each technician has (e.g. `John Smith (2 active jobs)`). This count is derived directly from the `logs` state using `useMemo`:

```typescript
const activeLogCounts = useMemo(() => {
  const counts: Record<string, number> = {};
  logs.forEach((log) => {
    if (log.technician_id && (log.maintenance_status === "Open" || log.maintenance_status === "In Progress")) {
      counts[log.technician_id] = (counts[log.technician_id] ?? 0) + 1;
    }
  });
  return counts;
}, [logs]); // recalculates whenever logs changes
```

Because it's derived from `logs` (not a separate fetch), it automatically stays in sync with the real-time subscription — when `logs` refreshes, the counts update too.

**Say it like this:**
> "The admin pages use Supabase real-time subscriptions to listen for changes to the database. When anything changes in the watched table, the callback fires and re-fetches the data. The subscription is cleaned up when the component unmounts to prevent memory leaks."

---

# PART 9 — THE INVITE TECHNICIAN API ROUTE

This is the only piece of code that runs on the **server**, not in the browser.

```typescript
// src/app/api/admin/invite-technician/route.ts

// This is a server-only Supabase client using the SERVICE ROLE KEY
// It has admin powers — it can create users and bypass security rules
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // ← NEVER in browser code
);

export async function POST(req: NextRequest) {

  // Step 1: Get the Authorization header (the calling user's token)
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7); // removes "Bearer " (7 characters) to get just the token

  // Step 2: Verify the token — who is calling this?
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);

  // Step 3: Only admins can use this endpoint
  if (user.app_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 }); // 403 = not allowed
  }

  // Step 4: Read the form data from the request body
  const { fullName, email, password } = await req.json();

  // Step 5: Create the new technician account
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,                         // skip the email confirmation step
    user_metadata: { full_name: fullName },      // stored, editable by user
    app_metadata: { role: "technician" },        // role — server-only, cannot be faked
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ id: data.user.id }); // success: return the new user's ID
}
```

**Why does this need to be a server route?**
The `SUPABASE_SERVICE_ROLE_KEY` bypasses all security. If it were in browser code, anyone could open DevTools and steal it — then they could do anything to the database. By putting it in a `route.ts` file, Next.js runs it on the server only. The browser never sees the key.

**HTTP status codes used:**
- `401 Unauthorized` — no token provided
- `403 Forbidden` — token is valid but the user isn't admin
- `400 Bad Request` — missing required fields

**Say it like this:**
> "This is the only server-side endpoint. It uses the service role key which has admin powers over Supabase. It verifies the caller is an admin by checking their JWT token, then creates a new technician account with the role locked to technician in app_metadata. The service role key never touches the browser."

---

# PART 10 — THE DATABASE

## Tables and Their Purpose

### `hardware_assets` — Every physical device

```
id               UUID  — unique auto-generated ID
asset_id         Text  — human-readable, e.g. "HW-001"
device_name      Text  — e.g. "Lenovo ThinkPad X1"
device_type      Text  — "Laptop", "Desktop", etc.
lifecycle_status Text  — "New" | "Active" | "Under Maintenance" | "Retired" | "Disposed"
serial_number    Text  — optional
purchase_date    Date  — optional
warranty_expiry  Date  — optional
```

### `maintenance_logs` — Every repair job

```
id                  UUID
hardware_id         UUID → points to hardware_assets.id  (which device?)
technician_id       UUID → points to profiles.id          (who's assigned?)
maintenance_date    Date
issue_description   Text — what is broken
action_taken        Text — what the technician did (null until they write it)
maintenance_status  Text — "Open" | "In Progress" | "Resolved" | "Escalated"
```

### `profiles` — User display info (linked to auth)

```
id        UUID → matches auth.users.id exactly
full_name Text
role      Text — "admin" | "technician"
```

### `lifecycle_history` — Audit trail

```
id          UUID
hardware_id UUID → points to hardware_assets.id
old_status  Text — what it was before
new_status  Text — what it changed to
changed_by  Text — email of who changed it
changed_at  Timestamp
```

## Database Constraints — Rules the DB Enforces

```sql
-- Only these values are allowed in maintenance_status
CHECK (maintenance_status IN ('Open', 'In Progress', 'Resolved', 'Escalated'))
```

If any code tries to save a value not in that list, the database rejects it and returns an error.

**This was the root cause of the "Can't Fix" button not working.** The original constraint only had `('Open', 'In Progress', 'Resolved')` — missing `'Escalated'`. The database was silently rejecting the update. Fixed by:

```sql
ALTER TABLE maintenance_logs DROP CONSTRAINT maintenance_logs_status_check;
ALTER TABLE maintenance_logs ADD CONSTRAINT maintenance_logs_status_check
  CHECK (maintenance_status IN ('Open', 'In Progress', 'Resolved', 'Escalated'));
```

## Database Triggers — Automatic Actions

Triggers are functions the database runs automatically when data changes — no frontend code needed.

| Trigger | Table | When | What It Does |
|---------|-------|------|-------------|
| `trg_maintenance_logs_set_created_by` | maintenance_logs | BEFORE INSERT | Records who created the row |
| `trg_maintenance_logs_set_updated_at` | maintenance_logs | BEFORE UPDATE | Sets `updated_at` to current time |
| `trg_hardware_assets_set_updated_at` | hardware_assets | BEFORE UPDATE | Sets `updated_at` to current time |
| `trg_maintenance_logs_sync_hardware` | maintenance_logs | AFTER INSERT / UPDATE / DELETE | Syncs `hardware_assets.lifecycle_status` automatically |

### The Hardware Lifecycle Sync Trigger

This is the most important trigger. When any maintenance job is created, its status is updated, or it is deleted — the database automatically updates the hardware's lifecycle_status. No frontend code is involved.

```sql
CREATE OR REPLACE FUNCTION sync_hardware_lifecycle()
RETURNS TRIGGER AS $$
DECLARE
  unresolved_count INTEGER;
  current_lifecycle TEXT;
  target_hardware_id UUID;
BEGIN
  -- For DELETE use old row; for INSERT/UPDATE use new row
  IF TG_OP = 'DELETE' THEN
    target_hardware_id := OLD.hardware_id;
  ELSE
    target_hardware_id := NEW.hardware_id;
  END IF;

  SELECT lifecycle_status INTO current_lifecycle
  FROM hardware_assets WHERE id = target_hardware_id;

  IF TG_OP = 'DELETE' OR NEW.maintenance_status = 'Resolved' THEN
    -- Count jobs still unresolved for this device
    SELECT COUNT(*) INTO unresolved_count
    FROM maintenance_logs
    WHERE hardware_id = target_hardware_id
      AND maintenance_status IN ('Open', 'In Progress', 'Escalated');

    -- No active jobs left AND device is Under Maintenance → flip to Active
    IF unresolved_count = 0 AND current_lifecycle = 'Under Maintenance' THEN
      UPDATE hardware_assets SET lifecycle_status = 'Active'
      WHERE id = target_hardware_id;
    END IF;

  ELSE
    -- Job is Open, In Progress, or Escalated → device needs maintenance
    -- Guard: never flip Retired or Disposed devices
    IF current_lifecycle NOT IN ('Retired', 'Disposed') THEN
      UPDATE hardware_assets SET lifecycle_status = 'Under Maintenance'
      WHERE id = target_hardware_id;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**`SECURITY DEFINER`** makes the trigger run as the database owner, bypassing Row Level Security completely. This is critical — the old approach had frontend code doing this sync, but technicians can't update `hardware_assets` due to RLS, so their sync calls silently failed. The trigger runs at the database level regardless of which user triggered the change.

**`TG_OP`** is a special PostgreSQL variable inside triggers that tells you which operation fired it: `'INSERT'`, `'UPDATE'`, or `'DELETE'`.

**Say it like this:**
> "Database triggers are automatic functions attached to a table. When a row is inserted, updated, or deleted, the trigger fires. The sync_hardware_lifecycle trigger runs after any change to maintenance_logs and updates the related hardware asset's status. It uses SECURITY DEFINER so it bypasses RLS and works for any user."

---

## Row Level Security (RLS)

RLS policies control who can read or write each row. Even if someone bypasses the frontend, the database itself enforces these rules.

Examples:
- Technicians can only read their own maintenance logs (`technician_id = auth.uid()`)
- Only admins can delete hardware assets
- The `is_admin()` and `is_technician()` functions are used inside policies to check the current user's role

**Say it like this:**
> "RLS (Row Level Security) policies are database-level access rules. When a technician queries maintenance_logs, the database automatically filters to only return rows where technician_id matches their user ID. They can't even see other technicians' jobs."

---

# PART 11 — REUSABLE COMPONENTS

## DataTable

Takes a list of columns and a list of row objects. Renders a table.

```typescript
const columns = [
  { key: "asset", label: "Asset" },    // key matches the key in the row object below
  { key: "status", label: "Status" },
];

const rows = data.map((item) => ({
  asset: item.asset_id,                           // plain text
  status: <StatusBadge status={item.lifecycle_status} />, // JSX is allowed too
}));

<DataTable columns={columns} rows={rows} />
```

## StatusBadge

Displays a colored pill based on the status string:

```typescript
<StatusBadge status="Active" />       // green
<StatusBadge status="Escalated" />    // red
<StatusBadge status="In Progress" />  // yellow
<StatusBadge status="Resolved" />     // green
<StatusBadge status="Open" />         // red/orange
```

## HardwareForm

Reusable form for both creating and editing hardware:

```typescript
<HardwareForm
  onSubmit={handleSubmit}          // what to do when form is submitted
  initialValues={existingData}     // pre-fills fields when editing (null = empty form)
  submitLabel="Save Hardware"      // text on the submit button
/>
```

---

# PART 12 — ENVIRONMENT VARIABLES

Stored in `.env.local` — this file is NEVER committed to Git.

```
NEXT_PUBLIC_SUPABASE_URL      = https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...   ← safe to expose in browser
SUPABASE_SERVICE_ROLE_KEY     = eyJ...   ← NEVER in browser, server only
```

**Rule:** If the variable name starts with `NEXT_PUBLIC_`, Next.js puts it in the browser bundle. Everyone can see it. Only public values go there.

If there's no `NEXT_PUBLIC_` prefix, Next.js keeps it server-side only.

---

# PART 13 — TRACING ONE COMPLETE ACTION

**Scenario: Technician marks a job as Escalated**

1. **User clicks "Can't Fix"** in Work Orders page
2. **`handleEscalate(logId)`** runs in `technician/modules/maintenance/MaintenancePage.tsx`
3. **Guard check**: fetches fresh `action_taken` from DB — if empty, shows error and opens the note panel
4. **`Promise.race`**: starts the Supabase update and an 8-second timeout simultaneously
5. **Supabase update**: `UPDATE maintenance_logs SET maintenance_status='Escalated' WHERE id=logId`
6. **Database CHECK constraint** validates `'Escalated'` is an allowed value — passes
7. **Database trigger** `trg_maintenance_logs_set_updated_at` fires — sets `updated_at` to now
8. **Database trigger** `trg_maintenance_logs_sync_hardware` fires — checks device status, sets `hardware_assets.lifecycle_status = 'Under Maintenance'` (if not Retired/Disposed)
9. **Hardware page real-time subscription** fires (because `hardware_assets` was updated) → admin's hardware table refreshes
10. **`setUpdatingId(null)`** → button re-enabled
11. **`void loadMyLogs(currentUserId)`** → re-fetches this technician's logs → React re-renders → table shows "Escalated" badge
12. **Admin maintenance real-time subscription** fires → admin's maintenance table refreshes → red "Escalated" warning banner appears
13. **Admin technicians page real-time subscription** fires → "Busy" badge updates with new job count

---

# QUICK ANSWER CARDS

Use these to practice out loud. Cover the answer, read the code, try to explain it, then check.

---

**Card 1 — What does this do?**
```typescript
const [logs, setLogs] = useState<MaintenanceLog[]>([]);
```
> Creates a state variable called `logs`, starts as an empty array. `setLogs` is the function to change it. Whenever it changes, the component re-renders.

---

**Card 2 — What does this do?**
```typescript
useEffect(() => {
  void load();
}, []);
```
> Runs the `load` function once when the component first mounts. The empty `[]` means it never runs again after that. `void` means we don't care about the returned promise.

---

**Card 3 — What does this do?**
```typescript
const { data, error } = await supabase
  .from("maintenance_logs")
  .select("*")
  .eq("technician_id", userId);
```
> Reads all rows from maintenance_logs where technician_id equals userId. Returns the rows in `data`. If something went wrong, `error` contains the message.

---

**Card 4 — What does this do?**
```typescript
if (!actionTaken?.trim()) {
  setErrorMessage("Document your work first.");
  return;
}
```
> Checks if actionTaken is empty or just spaces. `?.` means if actionTaken is null, return undefined instead of crashing. `.trim()` removes leading/trailing spaces. If it's empty, shows an error and stops.

---

**Card 5 — What does this do?**
```typescript
const { error } = await Promise.race([
  supabase.from("maintenance_logs").update({ maintenance_status: "Escalated" }).eq("id", logId),
  timeout,
]);
```
> Starts two promises at the same time: the DB update and a timer. Whichever finishes first provides the result. If the DB takes more than 8 seconds, the timeout wins and returns an error.

---

**Card 6 — What does this do?**
```typescript
if ((count ?? 0) === 0) {
  await supabase.from("hardware_assets")
    .update({ lifecycle_status: "Active" })
    .eq("id", log.hardware_id)
    .eq("lifecycle_status", "Under Maintenance");
}
```
> If there are zero unresolved jobs left for this device (`count ?? 0` handles null), sets its status back to Active — but ONLY if it's currently Under Maintenance. The second `.eq` prevents accidentally changing Retired/Disposed devices.

---

**Card 7 — What does this do?**
```typescript
const hardwareLookup = useMemo(
  () => new Map(hardwareOptions.map((h) => [h.id, `${h.asset_id} – ${h.device_name}`])),
  [hardwareOptions],
);
```
> Builds a Map from hardware ID → display name. `useMemo` caches this map and only rebuilds it when `hardwareOptions` changes. Used for fast lookups instead of searching the array every render.

---

**Card 8 — What does this do?**
```typescript
if (user.app_metadata?.role !== "admin") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```
> Checks if the calling user is an admin. If not, immediately returns a 403 Forbidden response and stops — the rest of the function doesn't run.

---

**Card 9 — What does this do?**
```typescript
return () => { isMounted = false; };
```
> This is the cleanup function returned from useEffect. When the component unmounts (user navigates away), this runs and sets isMounted to false, preventing async callbacks from updating state after the component is gone.

---

**Card 10 — What does this do?**
```typescript
const autoStatus = formValues.technician_id ? "In Progress" : "Open";
```
> Ternary: if a technician is assigned, use "In Progress"; otherwise use "Open". This is the auto-status logic that makes it illogical to have an "Open" job that already has someone assigned to it.

---

# GLOSSARY — WORDS YOUR TEACHER MIGHT USE

| Word | What it means |
|------|--------------|
| **Component** | A React function that returns JSX (the UI building block) |
| **State** | A variable in React that triggers a re-render when changed |
| **Hook** | A React function starting with `use` — useState, useEffect, etc. |
| **JSX** | HTML-like syntax written inside JavaScript |
| **Async/Await** | JavaScript syntax for waiting on slow operations (like DB calls) |
| **JWT** | A signed token containing user data — like a digital ID card |
| **app_metadata** | Part of the JWT only the server can write to — used for role |
| **RLS** | Row Level Security — database rules controlling who sees which rows |
| **Trigger** | A database function that runs automatically on INSERT or UPDATE |
| **CHECK constraint** | A database rule limiting what values a column can hold |
| **Context** | React's way of sharing data without passing it down as props |
| **Promise** | Represents an operation that will finish in the future |
| **Promise.race** | Runs multiple promises and uses the first one to finish |
| **UUID** | A unique auto-generated ID, e.g. `a3f9-...` — used as primary keys |
| **RLS Policy** | A specific rule inside Row Level Security (e.g. "technicians see only their rows") |
| **Service Role Key** | Supabase key that bypasses all security — server use only |
| **Anon Key** | Supabase public key safe for the browser — respects RLS |
| **onAuthStateChange** | Supabase listener that fires when user logs in or out |
| **useMemo** | React hook that caches a computed value until its dependencies change |
