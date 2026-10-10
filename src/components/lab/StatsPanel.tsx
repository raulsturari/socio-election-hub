import type { LabAnalysis } from "@/lib/lab-analysis";
import type { CorrelationResult } from "@/lib/lab-stats";
import { fmtInt, fmtNum, fmtP } from "@/lib/format";

export function CorrelationGrid({ a }: { a: LabAnalysis }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Corr label="Pearson r" c={a.pearson} />
      <Corr label="Spearman ρ" c={a.spearman} />
    </div>
  );
}

function Corr({ label, c }: { label: string; c: CorrelationResult | null }) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <p className="label-caps">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{c ? fmtNum(c.r, 3) : "—"}</p>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground tabular-nums">
        {c ? <>IC95% [{fmtNum(c.ci[0], 3)}; {fmtNum(c.ci[1], 3)}]<br />p {fmtP(c.p)} · n {fmtInt(c.n)}</> : "Indefinido"}
      </p>
    </div>
  );
}

export function ModelTable({ a }: { a: LabAnalysis }) {
  const m = a.model;
  if (!m) return <p className="text-sm text-muted-foreground">{a.modelNote ?? "—"}</p>;
  return (
    <div className="space-y-3">
      <p className="break-words font-mono text-[11px] leading-relaxed text-muted-foreground">{m.label}</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Mini label="R²" value={fmtNum(m.r2, 3)} />
        <Mini label="R² aj." value={fmtNum(m.adjR2, 3)} />
        <Mini label="n" value={fmtInt(m.n)} />
      </div>
      <ul className="divide-y rounded-lg border">
        {m.coefficients.map((c) => (
          <li key={c.name} className="p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate text-sm" title={c.name}>{c.name}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">{fmtNum(c.estimate, 3)}</span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
              IC95% [{fmtNum(c.ci[0], 3)}; {fmtNum(c.ci[1], 3)}] · EP rob. {fmtNum(c.seRobust, 3)} · p {fmtP(c.p)}
            </p>
          </li>
        ))}
      </ul>
      <div className="space-y-1 rounded-lg bg-muted p-3 text-[11px] leading-relaxed text-muted-foreground tabular-nums">
        <p className="label-caps mb-1">Diagnósticos</p>
        <p>F = {fmtNum(m.f, 1)} · p {fmtP(m.fP)} · EP resíduos {fmtNum(m.residualSe, 2)}</p>
        <p>Breusch-Pagan LM = {fmtNum(m.breuschPagan.lm, 1)} (gl {m.breuschPagan.df}) · p {fmtP(m.breuschPagan.p)}
          {m.breuschPagan.p < 0.05 ? " → heterocedasticidade; inferência usa EP robusto HC1." : ""}</p>
        {m.vif && <p>VIF: {m.vif.map((v) => `${v.name} ${fmtNum(v.value, 1)}`).join(" · ")}{m.vif.some((v) => v.value > 5) ? " → colinearidade relevante." : ""}</p>}
        {m.fixedEffects > 0 && <p>Efeitos fixos de UF: {m.fixedEffects} dummies (coeficientes omitidos).</p>}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted p-2">
      <p className="label-caps">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
