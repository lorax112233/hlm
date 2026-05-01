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

  const loadData = async () => {
    const [techResult, logsResult] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email").eq("role", "technician").order("full_name"),
      supabase.from("maintenance_logs").select("technician_id, maintenance_status").in("maintenance_status", ["Open", "In Progress"]),
    ]);
    if (techResult.data) setTechnicians(techResult.data);
    if (logsResult.data) setActiveLogs(logsResult.data);
  };

  useEffect(() => { void loadData(); }, []);

  const jobCountById = useMemo(() => {
    const counts: Record<string, number> = {};
    activeLogs.forEach((log) => {
      if (log.technician_id) {
        counts[log.technician_id] = (counts[log.technician_id] ?? 0) + 1;
      }
    });
    return counts;
  }, [activeLogs]);

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
                Create a technician account in the Supabase Auth dashboard — they will appear here automatically.
              </p>
            </div>
          ) : (
            <DataTable columns={columns} rows={rows} />
          )}
        </section>

        <aside className="space-y-4 rounded-3xl border border-black/5 bg-white/80 p-5 shadow-sm shadow-black/5 xl:sticky xl:top-6 xl:self-start">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-black/40">Setup</p>
            <h3 className="text-lg font-semibold text-app-text">How to Add a Technician</h3>
          </div>
          <div className="space-y-2 rounded-xl border border-black/8 bg-black/[0.02] p-4">
            <p className="text-xs font-semibold text-black/55">Steps in Supabase Auth dashboard</p>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-black/45">
              <li>Go to <strong>Authentication → Users</strong> and click <strong>Add user</strong></li>
              <li>
                In <code className="rounded bg-black/5 px-1 font-mono">app_metadata</code>, set{" "}
                <code className="rounded bg-black/5 px-1 font-mono">{`{"role":"technician"}`}</code>
              </li>
              <li>
                In <code className="rounded bg-black/5 px-1 font-mono">user_metadata</code>, set{" "}
                <code className="rounded bg-black/5 px-1 font-mono">{`{"full_name":"Their Name"}`}</code>
              </li>
              <li>The technician appears here automatically — no further registration needed</li>
            </ol>
          </div>
          <div className="space-y-1 rounded-xl border border-black/8 bg-black/[0.02] p-4">
            <p className="text-xs font-semibold text-black/55">To remove a technician</p>
            <p className="text-xs text-black/40">
              Delete their account in the Supabase Auth dashboard. They will be removed from this list automatically.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
