import { CATALOG, PLANNED, searchCatalog, normalize } from './indicator-catalog';
import { X_VARIABLES, labSearchSchema } from './lab-variables';
import { cityTopic } from './graph-editorial';
import { analyze, VIF_LIMIT } from './lab-analysis';

describe('indicator catalog', () => {
  it('keeps every legacy alias so old links and presets still resolve', () => {
    for (const id of ['renda', 'superior', 'alfabetizacao', 'branca', 'preta', 'parda', 'evangelica', 'catolica', 'semreligiao', 'idade', 'urbanizacao', 'populacao'])
      expect(labSearchSchema.parse({ x: id }).x).toBe(id);
  });
  it('has unique ids/aliases, 60+ indicators and 10+ themes', () => {
    expect(new Set(CATALOG.map(c => c.id)).size).toBe(CATALOG.length);
    expect(new Set(CATALOG.map(c => c.alias)).size).toBe(CATALOG.length);
    expect(CATALOG.length).toBeGreaterThanOrEqual(60);
    expect(new Set(CATALOG.map(c => c.theme)).size).toBeGreaterThanOrEqual(10);
  });
  it('documents source, year, universe and formula for every entry', () => {
    for (const c of CATALOG) {
      expect(c.universe.length).toBeGreaterThan(3);
      expect(c.formula.length).toBeGreaterThan(3);
      expect(c.url).toMatch(/^https:\/\/sidra\.ibge\.gov\.br\/tabela\/\d+$/);
      expect([2021, 2022]).toContain(c.year);
    }
    expect(CATALOG.find(c => c.alias === 'pibagro')?.source).toContain('2021');
  });
  it('does not bound dependency/ageing ratios to 100', () => {
    expect(CATALOG.find(c => c.alias === 'envelhecimento')?.percentBounded).toBe(false);
    expect(CATALOG.find(c => c.alias === 'dependencia')?.percentBounded).toBe(false);
  });
  it('never labels a minimum-wage cut as an official poverty line', () => {
    const low = CATALOG.find(c => c.alias === 'rendabaixa');
    expect(low?.label).not.toMatch(/pobreza/i);
    expect(low?.definition).toMatch(/não linha oficial de pobreza/);
  });
  it('lists unavailable families separately with a reason', () => {
    expect(PLANNED.find(p => /Gini/.test(p.label))?.status).toBe('nao_publicado_municipio');
    for (const p of PLANNED) expect(p.reason.length).toBeGreaterThan(10);
  });
});

describe('search', () => {
  it('ignores accents and case and matches synonyms', () => {
    expect(normalize('Água Canalizada')).toBe('agua canalizada');
    expect(searchCatalog(X_VARIABLES, 'agua').map(v => v.id)).toContain('agua');
    expect(searchCatalog(X_VARIABLES, 'DESEMPREGO').map(v => v.id)).toContain('desocupacao');
    expect(searchCatalog(X_VARIABLES, 'idosos 60').map(v => v.id)).toEqual(['idosos60']);
    expect(searchCatalog(X_VARIABLES, 'zzzz')).toHaveLength(0);
  });
});

describe('editorial topic', () => {
  it('uses the catalog phrase for new indicators', () => {
    const x = X_VARIABLES.find(v => v.id === 'esgoto')!;
    expect(cityTopic(x.id, x.label, true, x.topic)).toBe('nas cidades com maior cobertura de esgoto');
  });
});

describe('collinearity guard', () => {
  it('withholds the adjusted model when X is nearly a control', () => {
    const x = X_VARIABLES.find(v => v.id === 'rendamediana')!;
    const rows = Array.from({ length: 200 }, (_, i) => {
      const renda = 300 + i * 10;
      return { ibge_code: String(1000000 + i), name: `M${i}`, uf: 'SP', y: 30 + (i % 7), x: renda * (1 + 1e-6 * (i % 3)), renda, superior: 5 + (i % 11), populacao: 1000 + i * 37, eligible: 1000 };
    });
    const a = analyze(rows, x, false);
    expect(a.model).toBeNull();
    expect(a.modelNote).toContain('Colinearidade');
    expect(a.modelNote).toContain(String(VIF_LIMIT));
  });
});
