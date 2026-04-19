type DashboardCardProps = {
  title: string;
  value: string | number;
};

export default function DashboardCard({
  title,
  value,
}: DashboardCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-black/8 bg-white/88 px-5 py-4 shadow-sm shadow-black/8 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-app-primary/70" />
      <p className="text-[10px] uppercase tracking-[0.2em] text-black/45">{title}</p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <p className="text-3xl font-semibold leading-none tracking-tight text-app-text">{value}</p>
        <div className="h-6 w-16 rounded-full border border-app-primary/15 bg-app-primary/10" />
      </div>
    </div>
  );
}
