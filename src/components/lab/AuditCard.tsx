import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { auditQuery } from "@/services/queries";
import { fmtDateTime, fmtInt } from "@/lib/format";

/** Shows the "validado" seal only when the flag AND both recorded reconciliations are true. */
export function AuditCard({ electionId, label }: { electionId: number; label: string }) {
  const q = useQuery(auditQuery(electionId));
  if (q.isLoading) return <div className="h-20 skeleton rounded-xl bg-muted" />;
  if (q.error) return <p role="alert" className="rounded-xl border p-3 text-xs text-muted-foreground">Auditoria indisponível: {q.error.message}</p>;
  const a = q.data;
  if (!a) return null;
  const ok = a.validated && a.resultsReconciled === true && a.turnoutReconciled === true;
  const Icon = ok ? ShieldCheck : ShieldAlert;
  const extra = a.municipalitiesInResults - 5570;
  return (
    <section className="rounded-xl border bg-card p-4" aria-label="Auditoria da eleição">
      <div className="flex items-center gap-2">
        <Icon className={`size-5 ${ok ? "text-primary" : "text-warning"}`} aria-hidden />
        <p className="text-sm font-medium">{label} · {ok ? "Validado" : "Não validado"}</p>
      </div>
      {!ok && <p role="alert" className="mt-2 text-xs text-warning">A conferência dos votos ou do comparecimento não está confirmada. Não interprete os resultados como validados.</p>}
      {extra > 0 && <p className="mt-2 text-xs text-muted-foreground">Boa Esperança do Norte/MT não tem dados do Censo 2022 e fica fora das análises que exigem esses indicadores.</p>}
      <details className="mt-2"><summary className="min-h-11 cursor-pointer py-3 text-xs text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Ver conferência e cobertura</summary>
      <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-muted-foreground tabular-nums">
        <li>Votos: arquivo nacional = zonas = municípios {a.resultsReconciled ? "✓" : "—"} · comparecimento/válidos {a.turnoutReconciled ? "✓" : "—"}</li>
        <li>{fmtInt(a.municipalitiesInResults)} municípios com resultado de {fmtInt(a.municipalitiesRegistered)} no cadastro IBGE atual.
          {extra > 0 && " Inclui Boa Esperança do Norte/MT (instalado em 2025), sem dados no Censo 2022 — aparece como ausente nos indicadores."}</li>
        <li>Exterior (UF ZZ) excluído{a.exteriorExcludedVotes != null ? `: ${fmtInt(a.exteriorExcludedVotes)} votos nominais` : ""}. Importado em {fmtDateTime(a.resultsJobAt)}.</li>
      </ul></details>
    </section>
  );
}
