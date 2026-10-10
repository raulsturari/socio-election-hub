import { BottomSheet, Chip } from "@/components/ui-kit";
import { REGIONS, X_VARIABLES, Y_METRICS, type YMetric } from "@/lib/lab-variables";
import type { CandidateRow } from "@/lib/data.functions";

interface Props {
  open: "x" | "y" | "reg" | null; onClose: () => void;
  x: string; y: YMetric; reg: string | null; candNumber: number | null; candidates: CandidateRow[];
  onChange: (patch: { x?: string; y?: YMetric; reg?: string; cand?: number }) => void;
}

/** Touch bottom sheets for the lab's variable pickers. */
export function LabControls({ open, onClose, x, y, reg, candNumber, candidates, onChange }: Props) {
  const groups = [...new Set(X_VARIABLES.map((v) => v.group))];
  return (
    <>
      <BottomSheet open={open === "x"} onClose={onClose} title="Variável X (município)">
        <div className="space-y-4 pb-4">
          {groups.map((g) => (
            <div key={g}>
              <p className="label-caps mb-2">{g}</p>
              <div className="flex flex-wrap gap-2">
                {X_VARIABLES.filter((v) => v.group === g).map((v) => (
                  <Chip key={v.id} active={v.id === x} onClick={v.indicatorId ? () => { onChange({ x: v.id }); onClose(); } : undefined}>
                    <span className={v.indicatorId ? "" : "text-muted-foreground"}>{v.label}{v.indicatorId ? "" : " · indisponível"}</span>
                  </Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
      </BottomSheet>
      <BottomSheet open={open === "y"} onClose={onClose} title="Variável Y (resultado)">
        <div className="space-y-4 pb-4">
          <div className="flex flex-wrap gap-2">
            {Y_METRICS.map((m) => <Chip key={m.id} active={m.id === y} onClick={() => onChange({ y: m.id })}>{m.label}</Chip>)}
          </div>
          {Y_METRICS.find((m) => m.id === y)?.needsCandidate && (
            <div>
              <p className="label-caps mb-2">Candidato</p>
              <div className="flex flex-wrap gap-2">
                {candidates.map((c) => (
                  <Chip key={c.candidate_id} active={c.number === candNumber} onClick={() => { onChange({ cand: c.number }); onClose(); }}>
                    {c.ballot_name} · {c.number}
                  </Chip>
                ))}
              </div>
            </div>
          )}
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
