import { useEffect, useRef } from "react";
import { animate } from "motion/react";
import { DUR, EASE_OUT, prefersReducedMotion } from "@/lib/motion";

/**
 * Counts between real values only. Null/undefined renders the formatter's "—" without
 * animation; the tween always ends exactly on format(value), and aria-label carries the final value.
 */
export function AnimatedNumber({ value, format, className }: {
  value: number | null | undefined; format: (n: number | null) => string; className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef<number | null>(null);
  const final = format(value ?? null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = prev.current;
    prev.current = value ?? null;
    // Animate only from one real value to another — never count up from an invented 0.
    if (value == null || from == null || from === value || prefersReducedMotion()) {
      el.textContent = final;
      return;
    }
    const ctl = animate(from, value, {
      duration: DUR.slow, ease: EASE_OUT,
      onUpdate: (v) => { el.textContent = format(v); },
      onComplete: () => { el.textContent = final; },
    });
    return () => ctl.stop();
  }, [value, final, format]);

  return <span ref={ref} className={`tabular-nums ${className ?? ""}`} aria-label={final}>{final}</span>;
}
