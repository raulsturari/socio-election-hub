import { useEffect, type ReactNode } from "react";
import { Database, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { DUR, EASE_IN, EASE_OUT } from "@/lib/motion";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="pt-safe flex items-end justify-between gap-3 px-4 pb-4">
      <div className="min-w-0">
        <p className="label-caps">Brasil Data Lab</p>
        <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Card({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <motion.section layout="position" transition={{ duration: DUR.base, ease: EASE_OUT }}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border bg-card p-4">
      <h2 className="label-caps">{title}</h2>
      <div className="mt-3">{children}</div>
      {footer && <div className="mt-3 border-t pt-3 text-xs text-muted-foreground">{footer}</div>}
    </motion.section>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-muted px-4 py-8 text-center">
      <Database className="size-6 text-muted-foreground" aria-hidden />
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Chip({ children, onClick, active }: { children: ReactNode; onClick?: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 shrink-0 rounded-full border px-4 text-sm transition-[color,border-color,transform] duration-150 active:scale-95 ${
        active ? "border-primary text-primary" : "bg-secondary text-foreground/90"
      }`}
    >
      {children}
    </button>
  );
}

export function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal aria-label={title}>
      <motion.button aria-label="Fechar" className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: DUR.base } }} exit={{ opacity: 0, transition: { duration: DUR.fast } }} />
      <motion.div className="pb-safe relative max-h-[85vh] w-full overflow-y-auto rounded-t-xl border-t bg-card px-4 pt-3"
        initial={{ y: "100%" }} animate={{ y: 0, transition: { duration: DUR.slow, ease: EASE_OUT } }} exit={{ y: "100%", transition: { duration: DUR.base, ease: EASE_IN } }}
        drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, i) => { if (i.offset.y > 120 || i.velocity.y > 600) onClose(); }}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-secondary" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Fechar" className="grid size-11 place-items-center rounded-full bg-secondary">
            <X className="size-4" />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
      )}
    </AnimatePresence>
  );
}

export function SourceNote({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>;
}
