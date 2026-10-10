import { describe, it, expect } from 'vitest';
import { buildBands, territoryAdvantage, sortByAdvantage, readBands, type BandInput } from './duel-bands';

const r = (code: string, x: number | null, b: number | null, l: number | null, valid: number | null): BandInput => ({ ibge_code: code, x, b, l, valid });

describe('buildBands', () => {
  it('partitions every municipality exactly once with inclusive upper bounds and no gaps', () => {
    const rows = Array.from({ length: 100 }, (_, i) => r(String(i), i, 10, 20, 50));
    const { bands } = buildBands(rows, '%');
    expect(bands).toHaveLength(5);
    expect(bands.reduce((s, b) => s + b.count, 0)).toBe(100);
    for (let i = 1; i < bands.length; i++) { expect(bands[i]!.lowerExclusive).toBe(bands[i - 1]!.max); expect(bands[i]!.min).toBeGreaterThan(bands[i - 1]!.max); }
    expect(bands[0]!.label.startsWith('Até')).toBe(true);
    expect(bands[4]!.label.startsWith('Acima de')).toBe(true);
  });
  it('never splits ties and reduces bands when distinct values are few', () => {
    const rows = [...Array.from({ length: 60 }, (_, i) => r(`a${i}`, 0, 1, 1, 3)), ...Array.from({ length: 40 }, (_, i) => r(`b${i}`, 5, 1, 1, 3))];
    const res = buildBands(rows, '%');
    expect(res.bands).toHaveLength(2);
    expect(res.reduced).toBe(true);
    expect(res.bands.map((b) => b.count)).toEqual([60, 40]);
  });
  it('keeps genuine zeros, excludes missing X and missing votes without zero-fill', () => {
    const res = buildBands([r('1', 0, 5, 5, 10), r('2', null, 5, 5, 10), r('3', 3, null, 5, 10), r('4', 4, 1, 1, 2)], '%');
    expect(res.excludedNoX).toBe(1);
    expect(res.excludedNoVotes).toBe(1);
    expect(res.bands.reduce((s, b) => s + b.count, 0)).toBe(2);
    expect(res.bands[0]!.min).toBe(0);
  });
  it('weights by votes (giant + small city) and B+L+Outros = valid', () => {
    const { bands } = buildBands([r('big', 1, 600_000, 300_000, 1_000_000), r('small', 1, 10, 80, 100)], '%', 1);
    const b = bands[0]!;
    expect(b.b).toBeCloseTo((100 * 600_010) / 1_000_100, 10);
    expect(b.bVotes + b.lVotes + b.oVotes).toBe(b.valid);
    expect(b.b + b.l + b.o).toBeCloseTo(100, 10);
    expect(b.diffVotes).toBe(600_010 - 300_080);
  });
  it('is order-invariant for skewed (log-like) indicators', () => {
    const rows = Array.from({ length: 50 }, (_, i) => r(String(i), Math.exp(i / 5), 1, 2, 4));
    const a = buildBands(rows, 'R$'), c = buildBands([...rows].reverse(), 'R$');
    expect(a.bands.map((b) => b.max)).toEqual(c.bands.map((b) => b.max));
  });
});

describe('territoryAdvantage', () => {
  it('signs p.p. and vote balance from the same cut and sorts by the chosen scale', () => {
    const rows = [
      { ibge_code: '1', uf: 'SP', b_votes: 600, l_votes: 400, valid_votes: 1100 },
      { ibge_code: '2', uf: 'AC', b_votes: 5, l_votes: 90, valid_votes: 100 },
      { ibge_code: '3', uf: 'RR', b_votes: 80, l_votes: 10, valid_votes: 100 },
    ];
    const t = territoryAdvantage(rows, (x) => x.uf);
    expect(sortByAdvantage(t, 'pp').map((x) => x.key)).toEqual(['RR', 'SP', 'AC']);
    expect(sortByAdvantage(t, 'votes').map((x) => x.key)).toEqual(['SP', 'RR', 'AC']);
    const sp = t.find((x) => x.key === 'SP')!;
    expect(sp.diffVotes).toBe(200);
    expect(sp.oVotes).toBe(100);
  });
});

describe('readBands', () => {
  const band = (diff: number, o = 5) => ({ diffPp: diff, o }) as never;
  it('reports a reversal only with real leaders at both ends', () => {
    const t = readBands([band(-20), band(-5), band(10)], 'Flávio Bolsonaro', 'presença evangélica')!;
    expect(t.headline).toContain('Flávio lidera nas cidades com maior presença evangélica');
    expect(t.body).not.toMatch(/evangélicos votaram/);
  });
  it('says growth only when monotonic and falls back to no clear pattern on ties', () => {
    expect(readBands([band(2), band(5), band(9)], 'Jair Bolsonaro', 'renda')!.body).toContain('cresce');
    expect(readBands([band(2), band(9), band(5)], 'Jair Bolsonaro', 'renda')!.body).toContain('sem uma direção única');
    expect(readBands([band(-5), band(0.1), band(4)], 'Flávio Bolsonaro', 'renda')!.body).toContain('Lula fica à frente');
    expect(readBands([band(0.2), band(0.1)], 'Flávio Bolsonaro', 'renda')!.headline).toContain('equilibrada');
  });
});
