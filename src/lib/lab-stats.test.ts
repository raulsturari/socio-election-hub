import { describe, expect, it } from "vitest";
import { chi2UpperP, fUpperP, ols, pearsonTest, ranks, spearmanTest, tCrit95, tTwoSidedP, vif } from "./lab-stats";
import { analyze, type LabRow } from "./lab-analysis";
import { X_VARIABLES } from "./lab-variables";

// Reference values computed with scipy.stats / numpy (documented inline).
describe("distributions", () => {
  it("t two-sided p", () => expect(tTwoSidedP(2.228, 10)).toBeCloseTo(0.05, 3));
  it("t critical 95%", () => expect(tCrit95(30)).toBeCloseTo(2.0423, 3));
  it("F upper p", () => expect(fUpperP(4.0, 2, 20)).toBeCloseTo(0.034572, 5));
  it("chi2 upper p", () => expect(chi2UpperP(3.841, 1)).toBeCloseTo(0.05, 3));
});

describe("correlations", () => {
  const x = [1, 2, 3, 4, 5, 6, 7, 8], y = [2, 1, 4, 3, 7, 8, 6, 9];
  it("pearson matches scipy.stats.pearsonr", () => {
    const r = pearsonTest(x, y)!;
    expect(r.r).toBeCloseTo(0.896421, 5);
    expect(r.p).toBeCloseTo(0.0025668, 5);
  });
  it("spearman matches scipy.stats.spearmanr", () => {
    const r = spearmanTest(x, y)!;
    expect(r.r).toBeCloseTo(0.880952, 5);
  });
  it("ties get average ranks", () => expect(ranks([10, 20, 20, 30])).toEqual([1, 2.5, 2.5, 4]));
  it("undefined with zero variance or tiny n", () => {
    expect(pearsonTest([1, 1, 1, 1], [1, 2, 3, 4])).toBeNull();
    expect(pearsonTest([1, 2, 3], [1, 2, 3])).toBeNull();
  });
});

describe("ols", () => {
  it("recovers exact coefficients", () => {
    const X = Array.from({ length: 20 }, (_, i) => [1, i, (i * 7) % 5]);
    const y = X.map((r) => 3 + 2 * r[1]! - 1.5 * r[2]!);
    const f = ols(y, X, ["c", "a", "b"])!;
    expect(f.coefficients.map((c) => c.estimate)).toEqual([expect.closeTo(3, 8), expect.closeTo(2, 8), expect.closeTo(-1.5, 8)]);
    expect(f.r2).toBeCloseTo(1, 10);
  });
  it("matches statsmodels on noisy data (classic SE)", () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8], y = [2, 1, 4, 3, 7, 8, 6, 9];
    const f = ols(y, x.map((v) => [1, v]), ["c", "x"])!;
    expect(f.coefficients[1]!.estimate).toBeCloseTo(1.071429, 5);
    expect(f.coefficients[0]!.estimate).toBeCloseTo(0.178571, 5);
    expect(f.coefficients[1]!.se).toBeCloseTo(0.216261, 5);
    expect(f.r2).toBeCloseTo(0.803571, 5);
  });
  it("returns null on perfect collinearity", () => {
    const X = Array.from({ length: 10 }, (_, i) => [1, i, 2 * i]);
    expect(ols(X.map((r) => r[1]!), X, ["c", "a", "b"])).toBeNull();
  });
  it("vif = 1 for orthogonal columns", () => {
    const v = vif([[1, -1, 1, -1], [1, 1, -1, -1]])!;
    expect(v[0]).toBeCloseTo(1); expect(v[1]).toBeCloseTo(1);
  });
});

describe("analyze", () => {
  const xv = X_VARIABLES.find((v) => v.id === "superior")!;
  const rows: LabRow[] = Array.from({ length: 60 }, (_, i) => ({
    ibge_code: String(1100000 + i), name: `M${i}`, uf: i % 2 ? "SP" : "RJ",
    y: i === 0 ? null : 10 + i * 0.5 + (i % 3), x: i === 1 ? null : 5 + (i % 11),
    renda: 800 + i * 13, superior: 5 + (i % 11), populacao: i === 2 ? null : 5000 + i * 97,
  }));
  it("listwise deletion is counted, never imputed", () => {
    const a = analyze(rows, xv, true);
    expect(a.missing.y).toBe(1);
    expect(a.missing.x).toBe(1);
    expect(a.missing.covariates).toBe(1);
    expect(a.points.y.length).toBe(58);
    expect(a.model?.n).toBe(57);
    expect(a.model?.fixedEffects).toBe(1);
  });
  it("drops X from covariates when X is a covariate", () => {
    expect(analyze(rows, xv, false).model?.coefficients.map((c) => c.name)).not.toContain("superior completo (%)");
  });
});
