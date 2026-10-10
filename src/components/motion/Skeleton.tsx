/** Shimmer skeleton; shape is given by className so it matches the real content box (no CLS). */
export function Skeleton({ className }: { className: string }) {
  return <div aria-hidden className={`skeleton rounded-lg bg-muted ${className}`} />;
}
