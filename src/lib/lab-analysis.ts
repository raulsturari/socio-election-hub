import { ols, pearsonTest, spearmanTest, vif, type CorrelationResult, type OlsResult } from "./lab-stats";
import type { XVariable } from "./lab-variables";

export interface LabRow {
  ibge_code: string; name: string; uf: string; y: number | null; x: number | null;
  renda: number | null; superior: number | null; populacao: number | null;
}

export interface ModelSummary {
  label: string; fixedEffects: number; n: number; r2: number; adjR2: number; f: number; fP: number;
  residualSe: number; coefficients: OlsResult["coefficients"]; breuschPagan: OlsResult["breuschPagan"];
  vif: { name: string; value: number }[] | null;
}

export interface LabAnalysis {
  totalRows: number;
  missing: { y: number; x: number; covariates: number; examples: string[] };
  points: { c: string[]; n: string[]; u: string[]; x: number[]; y: number[] };
  pearson: CorrelationResult | null;
  spearman: CorrelationResult | null;
  model: ModelSummary | null;
  modelNote: string | null;
}

const log10 = (v: number) => (v > 0 ? Math.log10(v) : null);
/** Conventional variance-inflation threshold above which X is treated as redundant with the controls. */
export const VIF_LIMIT = 10;

/**
 * Listwise deletion, bivariate correlations (Pearson on the displayed scale, Spearman on ranks)
 * and multivariate OLS: y ~ x + log10(renda) + superior + log10(população) [+ UF fixed effects].
 */
export function analyze(rows: readonly LabRow[], xv: XVariable, useFixedEffects: boolean): LabAnalysis {
  const missing = { y: 0, x: 0, covariates: 0, examples: [] as string[] };
  const pts = { c: [] as string[], n: [] as string[], u: [] as string[], x: [] as number[], y: [] as number[] };
  const tx: number[] = [];
  for (const r of rows) {
    const t = r.x == null ? null : xv.log ? log10(r.x) : r.x;
    if (r.y == null) { missing.y++; continue; }
    if (t == null) {
      missing.x++;
      if (missing.examples.length < 5) missing.examples.push(`${r.name}/${r.uf}`);
      continue;
    }
    pts.c.push(r.ibge_code); pts.n.push(r.name); pts.u.push(r.uf); pts.x.push(r.x!); pts.y.push(r.y);
    tx.push(t);
  }

  const covs = [
    { key: "renda", name: "log10 renda", get: (r: LabRow) => (r.renda == null ? null : log10(r.renda)) },
    { key: "superior", name: "superior completo (%)", get: (r: LabRow) => r.superior },
    { key: "populacao", name: "log10 população", get: (r: LabRow) => (r.populacao == null ? null : log10(r.populacao)) },
  ].filter((c) => c.key !== xv.id);

  const ys: number[] = [], design: number[][] = [], ufs: string[] = [];
  for (const r of rows) {
    const t = r.x == null ? null : xv.log ? log10(r.x) : r.x;
    if (r.y == null || t == null) continue;
    const cv = covs.map((c) => c.get(r));
    if (cv.some((v) => v == null)) { missing.covariates++; continue; }
    ys.push(r.y); design.push([1, t, ...(cv as number[])]); ufs.push(r.uf);
  }

  const ufList = [...new Set(ufs)].sort();
  const fe = useFixedEffects && ufList.length >= 2;
  const dummies = fe ? ufList.slice(1) : []; // first UF is the reference
  const X = design.map((row, i) => [...row, ...dummies.map((u) => (ufs[i] === u ? 1 : 0))]);
  const xName = xv.log ? `log10 ${xv.label.toLowerCase()}` : xv.label;
  const names = ["intercepto", xName, ...covs.map((c) => c.name), ...dummies.map((u) => `UF=${u}`)];
  const rawFit = ys.length > names.length + 10 ? ols(ys, X, names) : null;

  let modelNote: string | null = null;
  if (!rawFit) modelNote = ys.length <= names.length + 10 ? "Amostra insuficiente para o modelo multivariado." : "Colinearidade perfeita: modelo não estimável.";
  const continuous = design.length ? design[0]!.slice(1).map((_, j) => design.map((r) => r[j + 1]!)) : [];
  const v = rawFit ? vif(continuous) : null;
  // X almost reproduced by the controls (e.g. median vs mean income): the adjusted coefficient
  // is unstable, so the model is withheld instead of being presented as evidence.
  const xVif = v?.[0];
  const fit = rawFit && !(xVif != null && Number.isFinite(xVif) && xVif > VIF_LIMIT) ? rawFit : null;
  if (rawFit && !fit) modelNote = `Colinearidade: ${xName} é quase redundante com os controles (VIF ${xVif!.toFixed(1)} > ${VIF_LIMIT}); o modelo ajustado não é exibido.`;

  return {
    totalRows: rows.length, missing, points: pts,
    pearson: pearsonTest(tx, pts.y), spearman: spearmanTest(tx, pts.y),
    model: fit && {
      label: `y ~ ${[xName, ...covs.map((c) => c.name)].join(" + ")}${fe ? ` + EF UF (${dummies.length})` : ""}`,
      fixedEffects: dummies.length, n: fit.n, r2: fit.r2, adjR2: fit.adjR2, f: fit.f, fP: fit.fP,
      residualSe: fit.residualSe, breuschPagan: fit.breuschPagan,
      coefficients: fit.coefficients.filter((c) => !c.name.startsWith("UF=")),
      vif: v && names.slice(1, 1 + continuous.length).map((name, i) => ({ name, value: v[i]! })),
    },
    modelNote,
  };
}
