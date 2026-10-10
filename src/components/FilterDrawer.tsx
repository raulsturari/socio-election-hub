import { useQuery } from "@tanstack/react-query";
import { ELECTION_YEARS, UFS } from "@/lib/constants";
import { municipalitiesQuery } from "@/services/queries";
import type { useFilters } from "@/hooks/use-filters";
import { BottomSheet, Chip } from "./ui-kit";

type Ctx = ReturnType<typeof useFilters>;

export function FilterDrawer({ open, onClose, ctx }: { open: boolean; onClose: () => void; ctx: Ctx }) {
  const { f, set, candidates, elections } = ctx;
  const muns = useQuery({ ...municipalitiesQuery(f.uf ?? ""), enabled: open && !!f.uf });
  const available = (y: number, r: number) => elections.some((e) => e.year === y && e.round === r);

  return (
    <BottomSheet open={open} onClose={onClose} title="Filtros">
      <div className="space-y-5 pb-4">
        <Group label="Ano">
          <div className="grid grid-cols-3 gap-2">
            {ELECTION_YEARS.map((y) => (
              <Chip key={y} active={f.ano === y} onClick={() => set({ ano: y, cand: undefined })}>{y}</Chip>
            ))}
          </div>
        </Group>
        <Group label="Turno">
          <div className="grid grid-cols-2 gap-2">
            {[1, 2].map((t) => (
              <Chip key={t} active={f.turno === t} onClick={() => set({ turno: t, cand: undefined })}>
                {t}º turno{available(f.ano, t) ? "" : " · sem dados"}
              </Chip>
            ))}
          </div>
        </Group>
        <Group label="UF">
          <div className="grid grid-cols-5 gap-2">
            <Chip active={!f.uf} onClick={() => set({ uf: undefined, mun: undefined })}>BR</Chip>
            {UFS.map((uf) => (
              <Chip key={uf} active={f.uf === uf} onClick={() => set({ uf, mun: undefined })}>{uf}</Chip>
            ))}
          </div>
        </Group>
        <Group label="Município">
          <select
            disabled={!f.uf}
            value={f.mun ?? ""}
            onChange={(e) => set({ mun: e.target.value || undefined })}
            className="min-h-11 w-full rounded-full border bg-secondary px-4 text-base disabled:opacity-50"
          >
            <option value="">{f.uf ? (muns.isLoading ? "Carregando…" : "Todos") : "Escolha uma UF primeiro"}</option>
            {(muns.data ?? []).map((m) => <option key={m.ibge_code} value={m.ibge_code}>{m.name}</option>)}
          </select>
        </Group>
        <Group label="Candidato (mapa e dispersão)">
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : (
            <select
              value={ctx.candidate?.number ?? ""}
              onChange={(e) => set({ cand: Number(e.target.value) })}
              className="min-h-11 w-full rounded-full border bg-secondary px-4 text-base"
            >
              {candidates.map((c) => <option key={c.number} value={c.number}>{c.ballot_name} ({c.party})</option>)}
            </select>
          )}
        </Group>
        <button onClick={onClose} className="min-h-12 w-full rounded-full bg-primary font-medium text-primary-foreground">
          Ver resultados
        </button>
      </div>
    </BottomSheet>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="label-caps mb-2">{label}</p>{children}</div>;
}
