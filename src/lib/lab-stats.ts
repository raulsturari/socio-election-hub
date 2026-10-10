/**
 * Pure statistical routines for the lab (no I/O, deterministic).
 * Distribution functions follow Numerical Recipes (incomplete beta / gamma).
 */

const lanczos = [676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];

export function logGamma(z: number): number {
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  const x = z - 1;
  let a = 0.99999999999980993;
  const t = x + 7.5;
  lanczos.forEach((c, i) => { a += c / (x + i + 1); });
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

function betacf(a: number, b: number, x: number): number {
  const FPMIN = 1e-300, EPS = 3e-14;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 500; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Regularized incomplete beta I_x(a, b). */
export function incBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/** Regularized upper incomplete gamma Q(a, x). */
export function gammaQ(a: number, x: number): number {
  if (x <= 0) return 1;
  const gln = logGamma(a);
  if (x < a + 1) {
    let sum = 1 / a, del = sum, ap = a;
    for (let n = 0; n < 1000; n++) { ap += 1; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 3e-14) break; }
    return 1 - sum * Math.exp(-x + a * Math.log(x) - gln);
  }
  const FPMIN = 1e-300;
  let b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-14) break;
  }
  return Math.exp(-x + a * Math.log(x) - gln) * h;
}

export const tTwoSidedP = (t: number, df: number) => incBeta(df / (df + t * t), df / 2, 0.5);
export const fUpperP = (f: number, d1: number, d2: number) => (f <= 0 ? 1 : incBeta(d2 / (d2 + d1 * f), d2 / 2, d1 / 2));
export const chi2UpperP = (x: number, k: number) => gammaQ(k / 2, x / 2);

/** Two-sided critical t for a 95% interval (bisection). */
export function tCrit95(df: number): number {
  let lo = 0, hi = 200;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (tTwoSidedP(mid, df) > 0.05) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface CorrelationResult { r: number; n: number; p: number; ci: [number, number] }

function rawPearson(xs: readonly number[], ys: readonly number[]): number | null {
  const n = xs.length;
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += xs[i]!; my += ys[i]!; }
  mx /= n; my /= n;
  let cov = 0, vx = 0, vy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - mx, dy = ys[i]! - my;
    cov += dx * dy; vx += dx * dx; vy += dy * dy;
  }
  return vx === 0 || vy === 0 ? null : cov / Math.sqrt(vx * vy);
}

function corrTest(r: number, n: number, seZ: number): CorrelationResult {
  const rc = Math.max(-0.999999999, Math.min(0.999999999, r));
  const t = rc * Math.sqrt((n - 2) / (1 - rc * rc));
  const z = Math.atanh(rc), h = 1.959963984540054 * seZ;
  return { r, n, p: tTwoSidedP(t, n - 2), ci: [Math.tanh(z - h), Math.tanh(z + h)] };
}

/** Pearson r with t-test p-value and Fisher-z 95% CI. Null when n < 4 or zero variance. */
export function pearsonTest(xs: readonly number[], ys: readonly number[]): CorrelationResult | null {
  const n = xs.length;
  if (n < 4 || ys.length !== n) return null;
  const r = rawPearson(xs, ys);
  return r === null ? null : corrTest(r, n, 1 / Math.sqrt(n - 3));
}

/** Average ranks (ties share the mean rank), 1-based. */
export function ranks(v: readonly number[]): number[] {
  const idx = v.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
  const out = new Array<number>(v.length);
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1]![0] === idx[i]![0]) j++;
    const rank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) out[idx[k]![1]] = rank;
    i = j + 1;
  }
  return out;
}

/** Spearman rho (Pearson on ranks), t-approximation p-value, Fieller (1957) CI. */
export function spearmanTest(xs: readonly number[], ys: readonly number[]): CorrelationResult | null {
  const n = xs.length;
  if (n < 4 || ys.length !== n) return null;
  const r = rawPearson(ranks(xs), ranks(ys));
  return r === null ? null : corrTest(r, n, Math.sqrt(1.06 / (n - 3)));
}

/** Gauss-Jordan inverse with partial pivoting; null if (near) singular. */
export function invert(m: readonly number[][]): number[][] | null {
  const k = m.length;
  const a = m.map((row, i) => [...row, ...Array.from({ length: k }, (_, j) => (i === j ? 1 : 0))]);
  const scale = Math.max(...m.map((r, i) => Math.abs(r[i]!)), 1e-300);
  for (let c = 0; c < k; c++) {
    let p = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(a[r]![c]!) > Math.abs(a[p]![c]!)) p = r;
    if (Math.abs(a[p]![c]!) < 1e-12 * scale) return null;
    [a[c], a[p]] = [a[p]!, a[c]!];
    const piv = a[c]![c]!;
    for (let j = 0; j < 2 * k; j++) a[c]![j]! /= piv;
    for (let r = 0; r < k; r++) {
      if (r === c) continue;
      const f = a[r]![c]!;
      if (f !== 0) for (let j = 0; j < 2 * k; j++) a[r]![j] = a[r]![j]! - f * a[c]![j]!;
    }
  }
  return a.map((row) => row.slice(k));
}

export interface Coefficient {
  name: string; estimate: number; se: number; seRobust: number; t: number; p: number; ci: [number, number];
}
export interface OlsResult {
  n: number; k: number; df: number; r2: number; adjR2: number; f: number; fP: number; residualSe: number;
  coefficients: Coefficient[];
  /** Breusch-Pagan LM test for heteroskedasticity (Koenker form). */
  breuschPagan: { lm: number; df: number; p: number };
  residuals: number[];
}

/**
 * OLS via normal equations. X rows must include the intercept column.
 * Inference (t, p, CI) uses HC1 heteroskedasticity-robust errors; classic SE is reported too.
 */
export function ols(y: readonly number[], X: readonly number[][], names: readonly string[]): OlsResult | null {
  const n = y.length, k = names.length;
  if (n <= k + 1) return null;
  const xtx = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  const xty = new Array<number>(k).fill(0);
  for (let i = 0; i < n; i++) {
    const row = X[i]!;
    for (let a = 0; a < k; a++) {
      const va = row[a]!;
      if (va === 0) continue;
      xty[a]! += va * y[i]!;
      for (let b = a; b < k; b++) xtx[a]![b]! += va * row[b]!;
    }
  }
  for (let a = 0; a < k; a++) for (let b = 0; b < a; b++) xtx[a]![b] = xtx[b]![a]!;
  const inv = invert(xtx);
  if (!inv) return null;
  const beta = inv.map((row) => row.reduce((s, v, j) => s + v * xty[j]!, 0));
  const res = new Array<number>(n);
  let my = 0;
  for (let i = 0; i < n; i++) my += y[i]!;
  my /= n;
  let sse = 0, sst = 0;
  for (let i = 0; i < n; i++) {
    const fit = X[i]!.reduce((s, v, j) => s + v * beta[j]!, 0);
    res[i] = y[i]! - fit;
    sse += res[i]! ** 2; sst += (y[i]! - my) ** 2;
  }
  const df = n - k, s2 = sse / df;
  // HC1 sandwich: inv · X' diag(e²) X · inv · n/(n−k)
  const meat = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  for (let i = 0; i < n; i++) {
    const row = X[i]!, e2 = res[i]! ** 2;
    for (let a = 0; a < k; a++) {
      if (row[a] === 0) continue;
      for (let b = a; b < k; b++) meat[a]![b]! += row[a]! * row[b]! * e2;
    }
  }
  for (let a = 0; a < k; a++) for (let b = 0; b < a; b++) meat[a]![b] = meat[b]![a]!;
  const tc = tCrit95(df);
  const coefficients = names.map((name, j) => {
    let v = 0;
    for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) v += inv[j]![a]! * meat[a]![b]! * inv[b]![j]!;
    const seRobust = Math.sqrt((v * n) / df), se = Math.sqrt(s2 * inv[j]![j]!);
    const t = beta[j]! / seRobust;
    return { name, estimate: beta[j]!, se, seRobust, t, p: tTwoSidedP(t, df), ci: [beta[j]! - tc * seRobust, beta[j]! + tc * seRobust] as [number, number] };
  });
  const r2 = sst === 0 ? 0 : 1 - sse / sst;
  const f = k > 1 ? ((sst - sse) / (k - 1)) / s2 : 0;
  // Koenker BP: regress e² on X; LM = n·R²
  const e2 = res.map((e) => e * e);
  const aux = k > 1 ? auxR2(e2, X, inv) : 0;
  return {
    n, k, df, r2, adjR2: 1 - ((1 - r2) * (n - 1)) / df, f, fP: fUpperP(f, k - 1, df), residualSe: Math.sqrt(s2),
    coefficients, breuschPagan: { lm: n * aux, df: k - 1, p: chi2UpperP(n * aux, k - 1) }, residuals: res,
  };
}

function auxR2(y: readonly number[], X: readonly number[][], inv: number[][]): number {
  const k = inv.length, xty = new Array<number>(k).fill(0);
  let my = 0;
  for (let i = 0; i < y.length; i++) { my += y[i]!; for (let a = 0; a < k; a++) xty[a]! += X[i]![a]! * y[i]!; }
  my /= y.length;
  const b = inv.map((row) => row.reduce((s, v, j) => s + v * xty[j]!, 0));
  let sse = 0, sst = 0;
  for (let i = 0; i < y.length; i++) {
    const fit = X[i]!.reduce((s, v, j) => s + v * b[j]!, 0);
    sse += (y[i]! - fit) ** 2; sst += (y[i]! - my) ** 2;
  }
  return sst === 0 ? 0 : 1 - sse / sst;
}

/** VIF per column = diagonal of the inverse correlation matrix. Null if singular. */
export function vif(cols: readonly number[][]): number[] | null {
  const m = cols.length;
  if (m < 2) return m === 1 ? [1] : [];
  const R = cols.map((a) => cols.map((b) => rawPearson(a, b) ?? 0));
  const inv = invert(R);
  return inv ? inv.map((row, i) => row[i]!) : null;
}
