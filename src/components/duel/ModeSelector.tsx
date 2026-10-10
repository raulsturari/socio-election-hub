import type { FiltersCtx } from "@/hooks/use-filters";
import { bolsonaroName, type DuelMode } from "@/lib/duel";

/** Compact global segmented control. Writing `modo` clears the legacy `cand` param only when the user picks explicitly. */
export function ModeSelector({ ctx, showOutrosToggle = false }: { ctx: FiltersCtx; showOutrosToggle?: boolean }) {
  const options: { id: DuelMode; label: string; series: string }[] = [
    { id: "comparar", label: "Comparar os dois", series: "indicator" },
    { id: "bolsonaro", label: bolsonaroName(ctx.f.ano), series: "bolsonaro" },
    { id: "lula", label: "Lula", series: "pt" },
  ];
  return (
    <div className="space-y-2">
      <div role="radiogroup" aria-label="Modo de análise" className="grid grid-cols-[1.4fr_1fr_1fr] gap-1 rounded-full border bg-card p-1">
        {options.map((o) => {
          const active = ctx.mode === o.id;
          return (
            <button key={o.id} role="radio" aria-checked={active} data-series={o.series}
              onClick={() => ctx.set({ modo: o.id, cand: undefined })}
              className={`min-h-11 truncate rounded-full px-2 text-xs font-medium transition-colors ${active ? "bg-secondary text-foreground ring-1 ring-series" : "text-muted-foreground"}`}>
              {o.id !== "comparar" && <span className="mr-1.5 inline-block size-2 rounded-full bg-series align-middle" aria-hidden />}
              {o.label}
            </button>
          );
        })}
      </div>
      {showOutrosToggle && (
        <label className="flex min-h-11 items-center justify-between gap-3 rounded-full border bg-card px-4 text-xs text-muted-foreground">
          <span><span className="mr-2 inline-block size-2 rounded-full bg-[var(--candidate-outros)] align-middle" aria-hidden />Mostrar Outros (soma das demais candidaturas)</span>
          <input type="checkbox" className="size-5 accent-primary" checked={ctx.f.outros} onChange={(e) => ctx.set({ outros: e.target.checked ? 1 : undefined })} />
        </label>
      )}
    </div>
  );
}
