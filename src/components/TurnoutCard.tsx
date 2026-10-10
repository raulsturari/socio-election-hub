import { useQuery } from "@tanstack/react-query";
import { turnoutQuery } from "@/services/queries";
import { fmtInt, fmtPct } from "@/lib/format";
import { Card, EmptyState } from "@/components/ui-kit";

const pct = (a: number, b: number) => (b > 0 ? (a * 100) / b : null);

/** Eligible voters, turnout, abstention, blank and null — official TSE detalhe file only. */
export function TurnoutCard({ electionId, uf, ibge }: { electionId: number; uf: string | null; ibge: string | null }) {
  const q = useQuery(turnoutQuery(electionId, uf, ibge));
  const t = q.data;
  return (
    <Card title="Comparecimento e abstenção" footer="TSE detalhe_votacao_munzona · exclui eleitorado no exterior">
      {q.isLoading ? <div className="h-24 skeleton rounded-lg bg-muted" /> : q.error ? (
        <EmptyState title="Erro ao carregar" description={q.error.message} />
      ) : !t ? (
        <EmptyState title="Não importado" description="Comparecimento e abstenção ainda não foram importados para esta eleição." />
      ) : (
        <dl className="grid grid-cols-2 gap-3">
          <Stat label="Aptos" value={fmtInt(t.eligible)} />
          <Stat label="Comparecimento" value={fmtInt(t.turnout)} sub={fmtPct(pct(t.turnout, t.eligible))} />
          <Stat label="Abstenções" value={fmtInt(t.abstentions)} sub={fmtPct(pct(t.abstentions, t.eligible))} />
          <Stat label="Válidos" value={fmtInt(t.valid_votes)} sub={fmtPct(pct(t.valid_votes, t.turnout))} />
          <Stat label="Brancos" value={fmtInt(t.blank_votes)} sub={fmtPct(pct(t.blank_votes, t.turnout))} />
          <Stat label="Nulos" value={fmtInt(t.null_votes)} sub={fmtPct(pct(t.null_votes, t.turnout))} />
        </dl>
      )}
    </Card>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-muted p-3">
      <dt className="label-caps">{label}</dt>
      <dd className="mt-1 truncate text-lg font-semibold tabular-nums">{value}</dd>
      {sub && <dd className="text-xs tabular-nums text-muted-foreground">{sub}</dd>}
    </div>
  );
}
