/** Motion tokens — single source for durations/easing (150–450ms range). */
export const DUR = { fast: 0.15, base: 0.25, slow: 0.4 } as const;
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const EASE_IN = [0.4, 0, 1, 1] as const;

/** Cubic ease-out for hand-rolled rAF tweens (canvas). */
export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
