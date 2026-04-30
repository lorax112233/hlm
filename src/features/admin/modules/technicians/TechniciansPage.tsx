"use client";

import { useEffect, useMemo, useState } from "react";
import DataTable from "@/components/ui/DataTable";
import { supabase } from "@/lib/supabaseClient";

type Technician = {
  id: string;
  name: string;
  email: string;
};

type ActiveLog = {
  technician_name: string | null;
  maintenance_status: string;
};

const columns = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "availability", label: "Availability" },
  { key: "jobs", label: "Open Jobs" },
  { key: "actions", label: "" },
];

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [activeLogs, setActiveLogs] = useState<ActiveLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const loadData = async () => {
    const [techResult, logsResult] = await Promise.all([
      supabase
        .from("technicians")
        .select("id, name, email")
        .order("name", { ascending: true }),
      supabase
        .from("maintenance_logs")
        .select("technician_name, maintenance_status")
        .in("maintenance_status", ["Open", "In Progress"]),
    ]);

    if (techResult.data) setTechnicians(techResult.data);
    if (logsResult.data) setActiveLogs(logsResult.data);
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Count active jobs per technician name
  const jobCountByName = useMemo(() => {
    const counts: Record<string, number> = {};
    activeLogs.forEach((log) => {
      if (log.technician_name) {
        counts[log.technician_name] =
          (counts[log.technician_name] ?? 0) + 1;
      }
    });
    return counts;
  }, [activeLogs]);

  const handleAdd = async (event: { preventDefault(): void }) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const { error } = await supabase.from("technicians").insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
    });

    if (error) {
      setErrorMessage(
        error.code === "23505"
          ? "A technician with that email already exists."
          : error.message,
      );
      setIsLoading(false);
      return;
    }

    setName("");
    setEmail("");
    await loadData();
    setIsLoading(false);
  };

  const handleRemove = async (id: string) => {
    await supabase.from("technicians").delete().eq("id", id);
    await loadData();
  };

  const rows = technicians.map((tech) => {
    const openJobs = jobCountByName[tech.name] ?? 0;
    const isAvailable = openJobs === 0;

    return {
      name: (
        <span className="font-medium text-app-text">{tech.name}</span>
      ),
      email: (
        <span className="text-black/55">{tech.email}</span>
      ),
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
        <span
          className={`text-sm font-semibold ${
            openJobs === 0 ? "text-black/30" : "text-app-warning"
          }`}
        >
          {openJobs}
        </span>
      ),
      actions: (
        <button
          className="text-xs font-semibold text-app-danger transition hover:underline"
          type="button"
          onClick={() => handleRemove(tech.id)}
        >
          Remove
        </button>
      ),
    };
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-black/5 bg-white/90 p-6 shadow-sm shadow-black/5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-app-primary/70" />
        <p className="text-[10px] uppercase tracking-[0.3em] text-black/40">
          Admin
        </p>
        <h3 className="mt-2 text-xl font-semibold text-app-text">
          Technicians
        </h3>
        <p className="mt-1 text-sm text-black/50">
          Register technician accounts and track their availability in real time.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="space-y-4 rounded-3xl border border-black/5 bg-white/80 p-5 shadow-sm shadow-black/5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-black/40">
              Roster
            </p>
            <h3 className="text-lg font-semibold text-app-text">
              Registered Technicians
            </h3>
            <p className="mt-1 text-sm text-black/50">
              Availability is calculated live from open and in-progress
              maintenance jobs.
            </p>
          </div>
          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-app-warning/30 bg-app-warning/5 p-6 space-y-2">
              <p className="text-sm font-semibold text-app-warning">No technicians registered yet.</p>
              <p className="text-sm text-black/55">
                Use the form on the right to add each technician by name and email. Their name here must exactly match the <code className="rounded bg-black/5 px-1 font-mono text-xs">full_name</code> in their Supabase account — this is how maintenance jobs are linked to the right person.
              </p>
            </div>
          ) : (
            <DataTable columns={columns} rows={rows} />
          )}
        </section>

        <aside className="space-y-4 rounded-3xl border border-black/5 bg-white/80 p-5 shadow-sm shadow-black/5 xl:sticky xl:top-6 xl:self-start">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-black/40">
              Register
            </p>
            <h3 className="text-lg font-semibold text-app-text">
              Add Technician
            </h3>
          </div>

          {errorMessage ? (
            <p className="rounded-lg bg-app-danger/10 px-3 py-2 text-xs text-app-danger">
              {errorMessage}
            </p>
          ) : null}

          <form className="grid gap-4" onSubmit={handleAdd}>
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                Full Name
              </label>
              <input
                className="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/15"
                type="text"
                placeholder="e.g. Juan Dela Cruz"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-black/40">
                Email
              </label>
              <input
                className="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/15"
                type="email"
                placeholder="technician@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button
              className="rounded-lg bg-app-primary px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-app-primary/25 transition hover:opacity-90 disabled:opacity-70"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Adding..." : "Add Technician"}
            </button>
          </form>

          <div className="rounded-xl border border-black/8 bg-black/[0.02] p-4 space-y-2">
            <p className="text-xs font-semibold text-black/55">
              How to set up a technician account
            </p>
            <ol className="space-y-1.5 text-xs text-black/45 list-decimal list-inside">
              <li>Create the user in Supabase Auth dashboard</li>
              <li>
                In <code className="font-mono bg-black/5 px-1 rounded">app_metadata</code>, set{" "}
                <code className="font-mono bg-black/5 px-1 rounded">{`{"role":"technician"}`}</code>
              </li>
              <li>
                In <code className="font-mono bg-black/5 px-1 rounded">user_metadata</code>, set{" "}
                <code className="font-mono bg-black/5 px-1 rounded">{`{"full_name":"Their Name"}`}</code>
              </li>
              <li>
                Register them here using the <strong>exact same name</strong> — this is how their work queue is linked to jobs you assign
              </li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
