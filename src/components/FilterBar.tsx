import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import type { useFilters } from "@/hooks/use-filters";
import { FilterDrawer } from "./FilterDrawer";

/** Compact summary of active filters; tapping opens the drawer. */
export function FilterBar({ ctx }: { ctx: ReturnType<typeof useFilters> }) {
  const [open, setOpen] = useState(false);
  const { f, candidate } = ctx;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex min-h-12 w-full items-center gap-3 rounded-full border bg-card px-4 text-left"
      >
        <SlidersHorizontal className="size-4 shrink-0 text-primary" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-sm">
          {f.ano} · {f.turno}º turno · {f.uf ?? "Brasil"}{f.mun ? " · município" : ""}
          {candidate ? ` · ${candidate.ballot_name}` : ""}
        </span>
        <span className="text-xs text-muted-foreground">Filtros</span>
      </button>
      <FilterDrawer open={open} onClose={() => setOpen(false)} ctx={ctx} />
    </>
  );
}
