export interface ScatterCoordinate { x: number; y: number }
/** X bounds are in displayed (possibly log10) units; Y bounds are raw. */
export interface ScatterDomain { x: [number, number]; y: [number, number]; log: boolean }
export const transformScatterX = (x: number, log: boolean) => log ? Math.log10(x) : x;
export function scatterDomain(points: readonly ScatterCoordinate[], log: boolean, zeroY: boolean): ScatterDomain {
  const valid = points.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y) && (!log || p.x > 0));
  if (!valid.length) return { x: [0, 1], y: [0, 1], log };
  const xs = valid.map(p => transformScatterX(p.x, log)), ys = valid.map(p => p.y);
  const y0 = zeroY ? Math.min(0, ...ys) : Math.min(...ys);
  return { x: [Math.min(...xs), Math.max(...xs)], y: [y0, zeroY ? Math.max(...ys, y0 + 1) : Math.max(...ys)], log };
}
export function normalized(value: number, range: readonly [number, number]): number {
  return (value - range[0]) / (range[1] - range[0] || 1);
}