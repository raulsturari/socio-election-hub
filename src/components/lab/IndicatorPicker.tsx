import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Search } from "lucide-react";
import { X_VARIABLES, type XVariable } from "@/lib/lab-variables";
import { searchCatalog } from "@/lib/indicator-catalog";
import { indicatorCoverageQuery } from "@/services/queries";
import { fmtInt } from "@/lib/format";

const RECENT_KEY = "bdl:recent-x";

/** Searchable, theme-grouped indicator list; only indicators with imported values are selectable. */
export function IndicatorPicker({ value, onSelect }: { value: string; onSelect: (id: string) => void }) {
  const coverage = useQuery(indicatorCoverageQuery());
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    try { setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]").filter((x: unknown) => typeof x === "string").slice(0, 5)); } catch { setRecent([]); }
  }, []);
  const cov = useMemo(() => new Map((coverage.data ?? []).map((c) => [c.indicator_id, c])), [coverage.data]);
  const available = (v: XVariable) => !!v.indicatorId && (cov.get(v.indicatorId)?.nonnull ?? 0) > 0;
  const results = searchCatalog(X_VARIABLES, query);
  const groups = [...new Set(results.map((v) => v.group))];
  const pick = (v: XVariable) => {
    if (!available(v)) return;
    const next = [v.id, ...recent.filter((r) => r !== v.id)].slice(0, 5);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* storage unavailable: recents are optional */ }
    onSelect(v.id);
  };
  const Item = ({ v }: { v: XVariable }) => {
    const c = v.indicatorId ? cov.get(v.indicatorId) : undefined;
    const ok = available(v);
    return (
      <button type="button" onClick={() => pick(v)} disabled={!ok} aria-pressed={v.id === value}
        className={`flex min-h-12 w-full flex-col items-start rounded-2xl px-3 py-2 text-left transition-colors duration-150 ${v.id === value ? "bg-secondary ring-1 ring-primary" : "hover:bg-secondary/70"} disabled:opacity-50`}>
        <span className="text-sm">{v.label}</span>
        <span className="text-[11px] text-muted-foreground">
          {ok && c ? `${v.unit} · ${v.year ?? ""} · ${fmtInt(c.nonnull)} municípios` : coverage.isPending ? v.unit : v.indicatorId ? "Não importado" : v.source}
        </span>
      </button>
    );
  };
  const recentVars = recent.map((r) => X_VARIABLES.find((v) => v.id === r)).filter((v): v is XVariable => !!v);
  const nAvailable = X_VARIABLES.filter(available).length;
  return (
    <div className="space-y-3 pb-4">
      <label className="flex h-12 items-center gap-2 rounded-full bg-secondary px-4">
        <Search className="size-4 text-muted-foreground" aria-hidden />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar: idosos, esgoto, internet…" aria-label="Buscar indicador"
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground" />
      </label>
      <p className="text-xs text-muted-foreground" role="status">
        {coverage.isPending ? "Carregando cobertura…" : coverage.error ? "Cobertura indisponível; tente novamente." : `${nAvailable} indicadores disponíveis no app${query ? ` · ${results.length} encontrados` : ""}`}
      </p>
      {!query && recentVars.length > 0 && (
        <div><p className="label-caps mb-1">Recentes</p>{recentVars.map((v) => <Item key={`r-${v.id}`} v={v} />)}</div>
      )}
      {results.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum indicador com esse nome.</p>}
      {groups.map((g) => {
        const items = results.filter((v) => v.group === g);
        const open = !!query || items.some((v) => v.id === value);
        return (
          <details key={`${g}-${open}`} open={open} className="group rounded-2xl bg-card/40">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-3">
              <span className="text-sm font-medium">{g}</span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {items.filter(available).length}/{items.length}
                <ChevronDown className="size-4 transition-transform duration-200 group-open:rotate-180" aria-hidden />
              </span>
            </summary>
            <div className="px-1 pb-2">{items.map((v) => <Item key={v.id} v={v} />)}</div>
          </details>
        );
      })}
    </div>
  );
}
