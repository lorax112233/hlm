type Config = {
  bg: string;
  text: string;
  border: string;
  dot: string;
};

const statusMap: Record<string, Config> = {
  // Lifecycle statuses
  New:                 { bg: "bg-app-primary/10",  text: "text-app-primary",  border: "border-app-primary/25",  dot: "bg-app-primary"  },
  Active:              { bg: "bg-app-success/10",  text: "text-app-success",  border: "border-app-success/25",  dot: "bg-app-success"  },
  "Under Maintenance": { bg: "bg-app-warning/10",  text: "text-app-warning",  border: "border-app-warning/25",  dot: "bg-app-warning"  },
  Retired:             { bg: "bg-black/5",          text: "text-black/50",     border: "border-black/12",         dot: "bg-black/35"     },
  Disposed:            { bg: "bg-app-danger/10",   text: "text-app-danger",   border: "border-app-danger/25",   dot: "bg-app-danger"   },
  // Maintenance statuses
  Open:                { bg: "bg-app-danger/10",   text: "text-app-danger",   border: "border-app-danger/25",   dot: "bg-app-danger"   },
  "In Progress":       { bg: "bg-app-warning/10",  text: "text-app-warning",  border: "border-app-warning/25",  dot: "bg-app-warning"  },
  Resolved:            { bg: "bg-app-success/10",  text: "text-app-success",  border: "border-app-success/25",  dot: "bg-app-success"  },
  Escalated:           { bg: "bg-app-danger/15",   text: "text-app-danger",   border: "border-app-danger/40",   dot: "bg-app-danger"   },
  // Warranty statuses
  OK:                  { bg: "bg-app-success/10",  text: "text-app-success",  border: "border-app-success/25",  dot: "bg-app-success"  },
  "Expiring Soon":     { bg: "bg-app-warning/10",  text: "text-app-warning",  border: "border-app-warning/25",  dot: "bg-app-warning"  },
  Expired:             { bg: "bg-app-danger/10",   text: "text-app-danger",   border: "border-app-danger/25",   dot: "bg-app-danger"   },
  Unknown:             { bg: "bg-black/5",          text: "text-black/50",     border: "border-black/12",         dot: "bg-black/35"     },
};

const fallback: Config = {
  bg: "bg-black/5",
  text: "text-black/50",
  border: "border-black/10",
  dot: "bg-black/30",
};

type StatusBadgeProps = {
  status: string;
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = statusMap[status] ?? fallback;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
}
