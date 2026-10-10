import { useQuery } from "@tanstack/react-query";
import { turnoutQuery } from "@/services/queries";
import { fmtInt, fmtPct } from "@/lib/format";
import { Card, EmptyState } from "@/components/ui-kit";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";

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
          <Stat label="Aptos" value={<AnimatedNumber value={t.eligible} format={fmtInt} />} />
          <Stat label="Comparecimento" value={<AnimatedNumber value={t.turnout} format={fmtInt} />} sub={fmtPct(pct(t.turnout, t.eligible))} />
          <Stat label="Abstenções" value={<AnimatedNumber value={t.abstentions} format={fmtInt} />} sub={fmtPct(pct(t.abstentions, t.eligible))} />
          <Stat label="Válidos" value={<AnimatedNumber value={t.valid_votes} format={fmtInt} />} sub={fmtPct(pct(t.valid_votes, t.turnout))} />
          <Stat label="Brancos" value={<AnimatedNumber value={t.blank_votes} format={fmtInt} />} sub={fmtPct(pct(t.blank_votes, t.turnout))} />
          <Stat label="Nulos" value={<AnimatedNumber value={t.null_votes} format={fmtInt} />} sub={fmtPct(pct(t.null_votes, t.turnout))} />
        </dl>
      )}
    </Card>
  );
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-muted p-3">
      <dt className="label-caps">{label}</dt>
      <dd className="mt-1 truncate text-lg font-semibold tabular-nums">{value}</dd>
      {sub && <dd className="text-xs tabular-nums text-muted-foreground">{sub}</dd>}
    </div>
  );
}
