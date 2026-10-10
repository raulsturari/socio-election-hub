import { Link } from "@tanstack/react-router";
import { Map, GitCompare, ScatterChart, Database, FlaskConical } from "lucide-react";

const ITEMS = [
  { to: "/", label: "Atlas", icon: Map },
  { to: "/comparar", label: "Comparar", icon: GitCompare },
  { to: "/correlacoes", label: "Correl.", icon: ScatterChart },
  { to: "/laboratorio", label: "Lab", icon: FlaskConical },
  { to: "/dados", label: "Dados", icon: Database },
] as const;

export function BottomNav() {
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 px-4" aria-label="Navegação principal">
      <div className="mx-auto flex max-w-md items-center justify-between rounded-full border bg-card/90 p-1.5 backdrop-blur-xl">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            search={true}
            activeOptions={{ exact: to === "/" }}
            className="flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] text-muted-foreground transition-colors"
            activeProps={{ className: "bg-secondary text-primary" }}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
