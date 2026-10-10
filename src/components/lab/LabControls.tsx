import { BottomSheet, Chip } from "@/components/ui-kit";
import { REGIONS, Y_METRICS, type YMetric } from "@/lib/lab-variables";
import { IndicatorPicker } from "./IndicatorPicker";

interface Props {
  open: "x" | "y" | "reg" | null; onClose: () => void;
  x: string; y: YMetric; reg: string | null;
  onChange: (patch: { x?: string; y?: YMetric; reg?: string | undefined; cand?: number }) => void;
}

/** Touch bottom sheets for the lab's variable pickers. */
export function LabControls({ open, onClose, x, y, reg, onChange }: Props) {
  return (
    <>
      <BottomSheet open={open === "x"} onClose={onClose} title="Variável X (município)">
        {open === "x" && <IndicatorPicker value={x} onSelect={(id) => { onChange({ x: id }); onClose(); }} />}
      </BottomSheet>
      <BottomSheet open={open === "y"} onClose={onClose} title="Variável Y (resultado)">
        <div className="space-y-4 pb-4">
          <div className="flex flex-wrap gap-2">
            {Y_METRICS.map((m) => <Chip key={m.id} active={m.id === y} onClick={() => onChange({ y: m.id })}>{m.label}</Chip>)}
          </div>
          <p className="text-xs text-muted-foreground">O foco (comparar os dois, Bolsonaro ou Lula) é escolhido no seletor acima do gráfico.</p>
        </div>
      </BottomSheet>
      <BottomSheet open={open === "reg"} onClose={onClose} title="Região">
        <div className="grid grid-cols-2 gap-2 pb-4">
          <Chip active={!reg} onClick={() => { onChange({ reg: undefined }); onClose(); }}>Todas</Chip>
          {REGIONS.map((r) => <Chip key={r.id} active={reg === r.id} onClick={() => { onChange({ reg: r.id }); onClose(); }}>{r.label}</Chip>)}
        </div>
      </BottomSheet>
    </>
  );
}
