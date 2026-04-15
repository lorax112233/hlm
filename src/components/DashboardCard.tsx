type DashboardCardProps = {
  title: string;
  value: string | number;
  tone?: "primary" | "success" | "warning" | "danger";
};

const toneStyles: Record<NonNullable<DashboardCardProps["tone"]>, string> = {
  primary: "border-app-primary/40 bg-app-primary/5 text-app-primary",
  success: "border-app-success/40 bg-app-success/5 text-app-success",
  warning: "border-app-warning/40 bg-app-warning/5 text-app-warning",
  danger: "border-app-danger/40 bg-app-danger/5 text-app-danger",
};

export default function DashboardCard({
  title,
  value,
  tone = "primary",
}: DashboardCardProps) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-black/40">{title}</p>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-2xl font-semibold text-app-text">{value}</p>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneStyles[tone]}`}
        >
          {tone}
        </span>
      </div>
    </div>
  );
}
