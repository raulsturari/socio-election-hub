import { describe, expect, it } from "vitest";
import { interpretGraph, type ReadingContext } from "./graph-reading";
import type { LabAnalysis } from "./lab-analysis";
import { X_VARIABLES } from "./lab-variables";

const x = X_VARIABLES.find((v) => v.id === "renda");
if (!x) throw new Error("Missing test variable");
const context: ReadingContext = { x, metric: "share", year: 2026, round: 1, scope: "Brasil" };
function analysis(r = 0.6): LabAnalysis {
  return { totalRows: 30, missing: { x: 0, y: 0, covariates: 0, examples: [] },
    points: { c: [], n: [], u: [], x: [], y: Array(30).fill(50) as number[] },
    pearson: { r, n: 30, p: 0.01, ci: r > 0 ? [0.2, 0.8] : [-0.8, -0.2] },
    spearman: { r, n: 30, p: 0.01, ci: [-0.8, 0.8] }, model: null, modelNote: null };
}
function read(a: LabAnalysis, c = context) { return interpretGraph(c, [{ name: "Flávio Bolsonaro", id: "bolsonaro", analysis: a }]); }
function adjusted(a: LabAnalysis, estimate: number, ci: [number, number]): LabAnalysis {
  const coefficient = { name: `log10 ${context.x.label.toLowerCase()}`, estimate, ci, se: 1, seRobust: 1, t: 1, p: 0.1 };
  return { ...a, model: { label: "", fixedEffects: 1, n: 30, r2: 0.817, adjR2: 0.8, f: 1, fP: 0.1, residualSe: 1, breuschPagan: { lm: 1, df: 1, p: 0.1 }, vif: null, coefficients: [
    { ...coefficient, name: "intercepto", estimate: 900 }, coefficient,
    { ...coefficient, name: "superior completo (%)" }, { ...coefficient, name: "log10 população" },
  ] } };
}
describe("deterministic graph reading", () => {
  it("describes positive pattern", () => expect(read(analysis()).series[0]?.text).toContain("maior"));
  it("describes negative pattern independently", () => expect(read(analysis(-0.6)).series[0]?.text).toContain("menor"));
  it("near zero is not a strong direction", () => expect(read(analysis(0.03)).series[0]?.text).toContain("Não aparece uma relação linear clara"));
  it("conflicting rank/linear signs", () => { const a = analysis(); a.spearman = { r: -0.5, n: 30, p: 0.01, ci: [-0.8, -0.2] }; expect(read(a).series[0]?.text).toContain("direções diferentes"); });
  it("adjusted interval crosses zero", () => expect(read(adjusted(analysis(), 1, [-1, 2])).series[0]?.text).toContain("Isso não prova ausência"));
  it("reversal uses X coefficient not intercept", () => expect(read(adjusted(analysis(), -1, [-2, -0.1])).series[0]?.text).toContain("muda de direção"));
  it("excludes X from adjustment controls", () => { const text = read(adjusted(analysis(), 1, [0.1, 2])).series[0]?.text; expect(text).toContain("em escolaridade, porte da população, UF"); expect(text).not.toContain("em renda"); });
  it("null model visible limitation", () => expect(read(analysis()).limitations.join(" ")).toContain("indisponível"));
  it("collinearity translated", () => { const a = analysis(); a.modelNote = "Colinearidade perfeita"; expect(read(a).limitations.join(" ")).toContain("se sobrepõem"); });
  it("missing not zero", () => { const a = analysis(); a.missing.x = 2; expect(read(a).limitations.join(" ")).toContain("2 municípios"); expect(read(a).limitations.join(" ")).toContain("não é zero"); });
  it("small sample cautious", () => { const a = analysis(); a.points.y = [1, 2]; expect(read(a).series[0]?.text).toContain("poucos municípios"); });
  it("zero variance cautious", () => { const a = analysis(); a.pearson = null; expect(read(a).series[0]?.text).toContain("não varia"); });
  it("wide interval uncertain", () => { const a = analysis(); a.pearson = { r: 0.6, n: 30, p: 0.01, ci: [-0.3, 0.9] }; expect(read(a).series[0]?.text).toContain("incerteza"); });
  it("log coefficient has no fabricated numeric example", () => { const text = JSON.stringify(read(adjusted(analysis(), 50, [40, 60]))); expect(text).not.toContain("500"); expect(text).not.toContain("beta"); });
  it("nonpartisan metric", () => expect(read(analysis(), { ...context, metric: "abstention" }).series[0]?.text).toContain("percentual de abstenção"));
  it("delta not current vote share", () => { const r = read(analysis(), { ...context, metric: "share_delta" }); expect(r.introduction).toContain("Jair em 2022 com Flávio em 2026"); expect(r.series[0]?.text).toContain("variação do percentual"); expect(r.introduction).toContain("pontos percentuais"); });
  it("nonpartisan delta", () => expect(read(analysis(), { ...context, metric: "turnout_delta" }).series[0]?.text).toContain("variação do comparecimento"));
  it("two independent series with Jair in 2022", () => { const r = interpretGraph({ ...context, year: 2022 }, [{ name: "Jair Bolsonaro", analysis: analysis() }, { name: "Lula", analysis: analysis(-0.5) }]); expect(r.series[0]?.name).toBe("Jair Bolsonaro"); expect(r.series[0]?.text).toContain("maior"); expect(r.series[1]?.text).toContain("menor"); });
  it("preta is not parda or individual voter", () => { const variable = X_VARIABLES.find((v) => v.id === "preta"); if (!variable) throw new Error("Missing variable"); expect(read(analysis(), { ...context, x: variable }).series[0]?.text).toContain("não inclui a categoria parda"); });
  it.each([['superior', '25 anos'], ['evangelica', '10 anos'], ['alfabetizacao', '15 anos']])("population reference %s", (id, age) => { const variable = X_VARIABLES.find((v) => v.id === id); if (!variable) throw new Error("Missing variable"); expect(read(analysis(), { ...context, x: variable }).series[0]?.text).toContain(age); });
  it("no accuracy, numerical R2 or technical jargon in narrative", () => { const text = JSON.stringify(read(adjusted(analysis(), 1, [0.1, 2]))); for (const forbidden of ["acurácia", "81.7", "0.817", "Pearson", "Spearman", "OLS", "pessoas negras votam", "efeito da renda"]) expect(text).not.toContain(forbidden); });
});
