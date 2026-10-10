import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Mount with an analysis/filter key. Closed content is unmounted, not just visually clipped. */
export function StatisticalDetails({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <section className="rounded-xl border bg-card">
    <Button variant="ghost" className="min-h-12 h-auto w-full justify-between whitespace-normal px-4 py-3 text-left" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
      Ver detalhes estatísticos<ChevronDown aria-hidden className={open ? "rotate-180" : ""} />
    </Button>
    <div id={id} hidden={!open}>{open && <div className="space-y-4 border-t p-4">{children}</div>}</div>
  </section>;
}
