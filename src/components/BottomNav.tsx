import { Link, useLocation } from "@tanstack/react-router";
import { motion } from "motion/react";
import { DUR, EASE_OUT } from "@/lib/motion";
import { Map, GitCompare, ScatterChart, Database, FlaskConical } from "lucide-react";

const ITEMS = [
  { to: "/", label: "Atlas", icon: Map },
  { to: "/comparar", label: "Comparar", icon: GitCompare },
  { to: "/correlacoes", label: "Correl.", icon: ScatterChart },
  { to: "/laboratorio", label: "Lab", icon: FlaskConical },
  { to: "/dados", label: "Dados", icon: Database },
] as const;

export function BottomNav() {
  const path = useLocation({ select: (l) => l.pathname });
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 px-4" aria-label="Navegação principal">
      <div className="mx-auto flex max-w-md items-center justify-between isolate rounded-full border bg-card/90 p-1.5 backdrop-blur-xl">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            search={true}
            activeOptions={{ exact: to === "/" }}
            className="relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] text-muted-foreground transition-[color,transform] duration-150 active:scale-95"
            activeProps={{ className: "text-primary" }}
          >
            {(to === "/" ? path === "/" : path.startsWith(to)) && (
              <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-secondary" transition={{ duration: DUR.base, ease: EASE_OUT }} />
            )}
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
