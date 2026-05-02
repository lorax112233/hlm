"use client";

import { useEffect, useMemo, useState } from "react";
import DataTable from "@/components/ui/DataTable";
import { supabase } from "@/lib/supabaseClient";

type TechnicianProfile = {
  id: string;
  full_name: string;
  email: string;
};

type ActiveLog = {
  technician_id: string | null;
  maintenance_status: string;
};

const columns = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "availability", label: "Availability" },
  { key: "jobs", label: "Open Jobs" },
];

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState<TechnicianProfile[]>([]);
  const [activeLogs, setActiveLogs] = useState<ActiveLog[]>([]);
  const [inviteValues, setInviteValues] = useState({ fullName: "", email: "", password: "" });
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const loadData = async () => {
    const [techResult, logsResult] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email").eq("role", "technician").order("full_name"),
      supabase.from("maintenance_logs").select("technician_id, maintenance_status").in("maintenance_status", ["Open", "In Progress"]),
    ]);
    if (techResult.data) setTechnicians(techResult.data);
    if (logsResult.data) setActiveLogs(logsResult.data);
  };

  useEffect(() => { void loadData(); }, []);

  useEffect(() => {
    const channel = supabase
      .channel("technicians-page-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "maintenance_logs" }, () => {
        void loadData();
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);

  const jobCountById = useMemo(() => {
    const counts: Record<string, number> = {};
    activeLogs.forEach((log) => {
      if (log.technician_id) {
        counts[log.technician_id] = (counts[log.technician_id] ?? 0) + 1;
      }
    });
    return counts;
  }, [activeLogs]);

  const handleInvite = async (event: { preventDefault(): void }) => {
    event.preventDefault();
    setIsInviting(true);
    setInviteError(null);
    setInviteSuccess(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setInviteError("Not authenticated.");
      setIsInviting(false);
      return;
    }

    const res = await fetch("/api/admin/invite-technician", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(inviteValues),
    });

    const json = await res.json() as { error?: string; id?: string };

    if (!res.ok) {
      setInviteError(json.error ?? "Failed to create account.");
      setIsInviting(false);
      return;
    }

    setInviteSuccess(`${inviteValues.fullName} has been added as a technician.`);
    setInviteValues({ fullName: "", email: "", password: "" });
    setIsInviting(false);
    await loadData();
  };

  const rows = technicians.map((tech) => {
    const openJobs = jobCountById[tech.id] ?? 0;
    const isAvailable = openJobs === 0;
    return {
      name: <span className="font-medium text-app-text">{tech.full_name || <span className="italic text-black/30">No name set</span>}</span>,
      email: <span className="text-black/55">{tech.email}</span>,
      availability: isAvailable ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-app-success/30 bg-app-success/10 px-2.5 py-0.5 text-xs font-semibold text-app-success">
          <span className="h-1.5 w-1.5 rounded-full bg-app-success" />
          Available
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-app-warning/30 bg-app-warning/10 px-2.5 py-0.5 text-xs font-semibold text-app-warning">
          <span className="h-1.5 w-1.5 rounded-full bg-app-warning" />
          Busy
        </span>
      ),
      jobs: (
        <span className={`text-sm font-semibold ${openJobs === 0 ? "text-black/30" : "text-app-warning"}`}>
          {openJobs}
        </span>
      ),
    };
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-black/5 bg-white/90 p-6 shadow-sm shadow-black/5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-app-primary/70" />
        <p className="text-[10px] uppercase tracking-[0.3em] text-black/40">Admin</p>
        <h3 className="mt-2 text-xl font-semibold text-app-text">Technicians</h3>
        <p className="mt-1 text-sm text-black/50">
          Registered technician accounts and their live availability.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="space-y-4 rounded-3xl border border-black/5 bg-white/80 p-5 shadow-sm shadow-black/5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-black/40">Roster</p>
            <h3 className="text-lg font-semibold text-app-text">Registered Technicians</h3>
            <p className="mt-1 text-sm text-black/50">
              Availability is calculated live from open and in-progress maintenance jobs.
            </p>
          </div>
          {rows.length === 0 ? (
            <div className="space-y-2 rounded-2xl border border-dashed border-app-warning/30 bg-app-warning/5 p-6">
              <p className="text-sm font-semibold text-app-warning">No technicians registered yet.</p>
              <p className="text-sm text-black/55">
                Use the form on the right to add your first technician.
              </p>
            </div>
          ) : (
            <DataTable columns={columns} rows={rows} />
          )}
        </section>

        <aside className="space-y-4 rounded-3xl border border-black/5 bg-white/80 p-5 shadow-sm shadow-black/5 xl:sticky xl:top-6 xl:self-start">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-black/40">Invite</p>
            <h3 className="text-lg font-semibold text-app-text">Add Technician</h3>
            <p className="mt-1 text-sm text-black/50">
              Create a new technician account. They can log in immediately with their email and password.
            </p>
          </div>
          <form className="space-y-3" onSubmit={handleInvite}>
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-black/40">Full Name</label>
              <input
                className="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/15"
                type="text"
                placeholder="e.g. John Smith"
                value={inviteValues.fullName}
                onChange={(e) => setInviteValues((prev) => ({ ...prev, fullName: e.target.value }))}
                required
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-black/40">Email</label>
              <input
                className="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/15"
                type="email"
                placeholder="technician@company.com"
                value={inviteValues.email}
                onChange={(e) => setInviteValues((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-black/40">Temporary Password</label>
              <input
                className="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/15"
                type="password"
                placeholder="Min. 6 characters"
                value={inviteValues.password}
                onChange={(e) => setInviteValues((prev) => ({ ...prev, password: e.target.value }))}
                minLength={6}
                required
              />
            </div>
            {inviteError ? (
              <p className="rounded-lg bg-app-danger/10 px-3 py-2 text-xs text-app-danger">{inviteError}</p>
            ) : null}
            {inviteSuccess ? (
              <p className="rounded-lg bg-app-success/10 px-3 py-2 text-xs text-app-success">{inviteSuccess}</p>
            ) : null}
            <button
              className="w-full rounded-lg bg-app-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-app-primary/90 disabled:opacity-70"
              type="submit"
              disabled={isInviting}
            >
              {isInviting ? "Creating Account..." : "Create Technician Account"}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
