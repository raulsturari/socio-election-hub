import { useQuery } from "@tanstack/react-query";
import { CATALOG, PLANNED, sourceLine } from "@/lib/indicator-catalog";
import { indicatorCoverageQuery } from "@/services/queries";
import { fmtInt } from "@/lib/format";
import { Card } from "@/components/ui-kit";

const BADGE = {
  ok: { label: "Disponível no app", cls: "text-positive" },
  missing: { label: "Não importado", cls: "text-muted-foreground" },
  unpublished: { label: "Não publicado para município", cls: "text-negative" },
} as const;

/** Catalog grouped by theme with the real import status of each indicator. */
export function IndicatorCatalogCard() {
  const cov = useQuery(indicatorCoverageQuery());
  const byId = new Map((cov.data ?? []).map((c) => [c.indicator_id, c]));
  const themes = [...new Set([...CATALOG.map((c) => c.theme), ...PLANNED.map((p) => p.theme)])];
  const available = CATALOG.filter((c) => (byId.get(c.id)?.nonnull ?? 0) > 0).length;
  return (
    <Card title="Catálogo de indicadores municipais">
      <p className="mb-3 text-xs text-muted-foreground" role="status">
        {cov.isPending ? "Carregando cobertura…" : cov.error ? "Cobertura indisponível no momento." : `${available} de ${CATALOG.length} indicadores disponíveis no app · ${PLANNED.length} verificados e fora do app`}
      </p>
      <div className="space-y-2">
        {themes.map((t) => {
          const items = CATALOG.filter((c) => c.theme === t);
          const planned = PLANNED.filter((p) => p.theme === t);
          return (
            <details key={t} className="rounded-2xl bg-muted p-3">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-medium">
                {t}<span className="text-xs text-muted-foreground">{items.filter((c) => (byId.get(c.id)?.nonnull ?? 0) > 0).length}/{items.length + planned.length}</span>
              </summary>
              <ul className="mt-2 space-y-3">
                {items.map((c) => {
                  const k = byId.get(c.id);
                  const b = (k?.nonnull ?? 0) > 0 ? BADGE.ok : BADGE.missing;
                  return (
                    <li key={c.id} className="text-xs">
                      <p className="flex justify-between gap-2"><span className="text-sm text-foreground">{c.label}</span><span className={`shrink-0 ${b.cls}`}>{b.label}</span></p>
                      <p className="text-muted-foreground">{sourceLine(c)} · {c.year} · {c.unit} · universo: {c.universe}{k ? ` · ${fmtInt(k.nonnull)} municípios com valor` : ""}</p>
                      <p className="text-muted-foreground">{c.kind === "direct" ? "Valor publicado" : `Derivado: ${c.formula}`}. {c.definition}</p>
                    </li>
                  );
                })}
                {planned.map((p) => {
                  const b = p.status === "nao_publicado_municipio" ? BADGE.unpublished : BADGE.missing;
                  return (
                    <li key={p.label} className="text-xs">
                      <p className="flex justify-between gap-2"><span className="text-sm text-foreground">{p.label}</span><span className={`shrink-0 ${b.cls}`}>{b.label}</span></p>
                      <p className="text-muted-foreground">{p.reason}</p>
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}
      </div>
    </Card>
  );
}
