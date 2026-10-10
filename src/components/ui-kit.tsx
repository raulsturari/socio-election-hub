import { useEffect, useRef, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "./ui/button";
import { Database, X } from "lucide-react";
import { motion } from "motion/react";
import { DUR, EASE_OUT } from "@/lib/motion";

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
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open && document.activeElement instanceof HTMLElement) returnFocus.current = document.activeElement;
  }, [open]);
  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: DUR.base } }} />
        </Dialog.Overlay>
        {/* Portal avoids page transforms; native content scrolling must not compete with dragging. */}
        <Dialog.Content asChild aria-describedby={undefined}
          onCloseAutoFocus={(event) => { event.preventDefault(); returnFocus.current?.focus({ preventScroll: true }); }}>
          <motion.div className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-t-xl border-t bg-card outline-none"
            initial={{ y: "100%" }} animate={{ y: 0, transition: { duration: DUR.slow, ease: EASE_OUT } }}>
            <div className="shrink-0 px-4 pt-3">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-secondary" />
              <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <Dialog.Title className="min-w-0 text-base font-semibold">{title}</Dialog.Title>
                <Dialog.Close asChild>
                  <Button variant="secondary" size="icon" aria-label="Fechar" className="size-11 shrink-0 rounded-full"><X /></Button>
                </Dialog.Close>
              </div>
            </div>
            <div data-testid="sheet-scroll" className="min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
              {children}
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function SourceNote({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>;
}
