import { describe, expect, it } from "vitest";
import { aggregateDuel, displayName, duelMunicipality, groupSummary, modeFrom, resolveDuel } from "./duel";
import { filtersSchema, resolveFilters } from "./filters";

const c2026 = [
  { candidate_id: 23, number: 22, ballot_name: "FLAVIO BOLSONARO", party: "PL", votes: 600 },
  { candidate_id: 34, number: 13, ballot_name: "LULA", party: "PT", votes: 300 },
  { candidate_id: 31, number: 30, ballot_name: "ZEMA", party: "NOVO", votes: 70 },
  { candidate_id: 28, number: 55, ballot_name: "RONALDO CAIADO", party: "PSD", votes: 30 },
];
const c2022 = [
  { candidate_id: 3, number: 22, ballot_name: "JAIR BOLSONARO", party: "PL", votes: 510 },
  { candidate_id: 10, number: 13, ballot_name: "LULA", party: "PT", votes: 480 },
  { candidate_id: 1, number: 12, ballot_name: "CIRO GOMES", party: "PDT", votes: 10 },
];

describe("Bolsonaro × Lula × Outros grouping", () => {
  it("B + L + Outros equals all valid votes, 2026 and 2022", () => {
    for (const rows of [c2026, c2022]) {
      const g = groupSummary(rows)!;
      expect(g.bolsonaro.votes! + g.lula.votes! + g.outros.votes!).toBe(rows.reduce((a, r) => a + r.votes, 0));
      expect(g.bolsonaro.share! + g.lula.share! + g.outros.share!).toBeCloseTo(100, 10);
    }
  });
  it("keeps the full denominator (does not renormalize the two to 100%)", () => {
    const g = groupSummary(c2026)!;
    expect(g.valid).toBe(1000);
    expect(g.bolsonaro.share).toBeCloseTo(60, 10);
    expect(g.lula.share).toBeCloseTo(30, 10);
    expect(g.outros.share).toBeCloseTo(10, 10);
  });
  it("aggregates as ratio of sums, not mean of percentages", () => {
    const rows = [
      { ibge_code: "1", name: "a", uf: "SP", b_votes: 90, l_votes: 5, valid_votes: 100 },
      { ibge_code: "2", name: "b", uf: "SP", b_votes: 100, l_votes: 800, valid_votes: 1000 },
    ];
    const [sp] = aggregateDuel(rows, (r) => r.uf);
    expect(sp!.b).toBeCloseTo((190 / 1100) * 100, 10);
    expect(sp!.o).toBeCloseTo((105 / 1100) * 100, 10);
  });
  it("missing data stays null, never zero, and advantage is B − L", () => {
    const m = duelMunicipality({ ibge_code: "1", name: "x", uf: "MT", b_votes: null, l_votes: 10, valid_votes: 50 });
    expect(m.b.share).toBeNull();
    expect(m.o.votes).toBeNull();
    expect(m.advantage).toBeNull();
    const n = duelMunicipality({ ibge_code: "2", name: "y", uf: "MT", b_votes: 30, l_votes: 10, valid_votes: 50 });
    expect(n.advantage).toBeCloseTo(40, 10);
    expect(n.o.votes).toBe(10);
  });
});

describe("identity by election", () => {
  it("resolves Flávio in 2026 and Jair in 2022 by name, never merging persons", () => {
    expect(resolveDuel(c2026).bolsonaro?.candidate_id).toBe(23);
    expect(resolveDuel(c2022).bolsonaro?.candidate_id).toBe(3);
    expect(displayName("bolsonaro", 2026, resolveDuel(c2026).bolsonaro)).toBe("Flávio Bolsonaro");
    expect(displayName("bolsonaro", 2022, resolveDuel(c2022).bolsonaro)).toBe("Jair Bolsonaro");
  });
  it("does not resolve by ballot number", () => {
    expect(resolveDuel([{ candidate_id: 9, number: 22, ballot_name: "OUTRA PESSOA", party: "XYZ" }]).bolsonaro).toBeNull();
  });
});

describe("mode and legacy links", () => {
  const pair = resolveDuel(c2026);
  it("defaults new visits to comparison 2026 1st round", () => {
    const f = resolveFilters(filtersSchema.parse({}));
    expect(f).toMatchObject({ ano: 2026, turno: 1, modo: null, outros: false });
    expect(modeFrom(undefined, f.cand, pair)).toBe("comparar");
  });
  it("preserves old links with cand", () => {
    expect(modeFrom(undefined, 13, pair)).toBe("lula");
    expect(modeFrom(undefined, 22, pair)).toBe("bolsonaro");
    expect(modeFrom(undefined, 30, pair)).toBe("comparar");
    expect(resolveFilters(filtersSchema.parse({ cand: "13", ano: "2022", turno: "2" }))).toMatchObject({ cand: 13, ano: 2022, turno: 2 });
  });
  it("explicit mode wins", () => {
    expect(modeFrom("bolsonaro", 13, pair)).toBe("bolsonaro");
    expect(filtersSchema.parse({ modo: "x" }).modo).toBeUndefined();
  });
});
