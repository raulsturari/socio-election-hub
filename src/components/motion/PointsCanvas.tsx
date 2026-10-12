import { useEffect, useRef, useState } from "react";
import { DUR, easeOutCubic, prefersReducedMotion } from "@/lib/motion";

export interface CanvasPoint { key: string; x: number; y: number }

interface Drawn { x: number; y: number; a: number }

/**
 * Draws thousands of points on one <canvas> (no per-point DOM). Points whose key (IBGE code)
 * exists before and after a change glide to the new position; new keys fade in in place and
 * removed keys fade out in place — no motion implies continuity between unrelated observations.
 */
export function PointsCanvas({ points, width, height, alpha = 0.45, radius = 1.6, duration = DUR.slow, replay = 0 }: {
  points: CanvasPoint[]; width: number; height: number; alpha?: number; radius?: number; duration?: number; replay?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const shown = useRef(new Map<string, Drawn>());
  const [drawn, setDrawn] = useState(false);
  useChartReady(drawn);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    setDrawn(false);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = width * dpr; cv.height = height * dpr;
    const color = getComputedStyle(cv).color;

    const from = shown.current;
    const target = new Map<string, Drawn>();
    for (const p of points) target.set(p.key, { x: p.x, y: p.y, a: 1 });
    const leaving = [...from].filter(([k]) => !target.has(k));

    const draw = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = color;
      const next = new Map<string, Drawn>();
      const dot = (x: number, y: number, a: number) => {
        ctx.globalAlpha = alpha * a;
        ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
      };
      for (const [k, to] of target) {
        const f = from.get(k);
        const d = f
          ? { x: f.x + (to.x - f.x) * t, y: f.y + (to.y - f.y) * t, a: f.a + (1 - f.a) * t }
          : { x: to.x, y: to.y, a: t };
        next.set(k, d); dot(d.x, d.y, d.a);
      }
      for (const [, f] of leaving) dot(f.x, f.y, f.a * (1 - t));
      shown.current = next;
    };

    if (prefersReducedMotion()) { draw(1); setDrawn(true); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      draw(easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(tick); else setDrawn(true);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [points, width, height, alpha, radius, duration, replay]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full text-series" />;
}
