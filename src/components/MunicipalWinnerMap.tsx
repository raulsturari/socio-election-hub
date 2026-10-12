import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { meshQuery } from "@/services/queries";
import { winnersQuery } from "@/services/winner-queries";
import { projectMunicipalities } from "@/lib/map-geometry";
import { displayName } from "@/lib/duel";
import { fmtInt, fmtPct } from "@/lib/format";
import type { MunicipalWinner } from "@/lib/municipal-winners";
import { Button } from "./ui/button";
import { EmptyState } from "./ui-kit";

interface Props { electionId: number; year: number; uf: string | null; selected: string | null; onSelect: (code: string) => void }
const tokens = { bolsonaro: "--candidate-bolsonaro", pt: "--candidate-pt", outros: "--candidate-outros", tie: "--winner-tie", missing: "--data-missing" };

export function MunicipalWinnerMap({ electionId, year, uf, selected, onSelect }: Props) {
  const mesh = useQuery(meshQuery(uf));
  const results = useQuery(winnersQuery(electionId, uf));
  const canvas = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const winners = useMemo(() => new Map((results.data ?? []).map((row) => [row.ibge_code, row])), [results.data]);
  const geo = useMemo(() => mesh.data ? projectMunicipalities(mesh.data.features) : null, [mesh.data]);
  // Path2D is browser-only and instantiated after hydration, never during SSR.
  const paths = useRef<{ code: string; path: Path2D }[]>([]);
  useEffect(() => { setZoom(1); }, [uf, electionId]);
  useEffect(() => {
    const element = canvas.current;
    if (!element || !geo || !results.data) return;
    paths.current = geo.paths.map((row) => ({ code: row.code, path: new Path2D(row.path) }));
    const draw = () => drawMap(element, geo, paths.current, winners, selected, zoom);
    const observer = new ResizeObserver(draw);
    observer.observe(element); draw();
    return () => observer.disconnect();
  }, [geo, results.data, winners, selected, zoom]);

  if (mesh.isLoading || results.isLoading) return <div aria-label="Carregando mapa de vencedores" className="aspect-square skeleton rounded-lg bg-muted" />;
  if (mesh.error || results.error || !geo) return <EmptyState title="Mapa indisponível" description="Não foi possível carregar os resultados ou a malha municipal." action={<Button variant="secondary" onClick={() => { void mesh.refetch(); void results.refetch(); }}>Tentar de novo</Button>} />;
  if (!results.data?.length) return <EmptyState title="Sem resultados" description="Não há votos validados para esta eleição e região." />;
  const selectedWinner = selected ? winners.get(selected) : undefined;
  const covered = geo.paths.filter((row) => winners.has(row.code)).length;
  const withoutMesh = [...winners.keys()].filter((code) => !geo.paths.some((row) => row.code === code)).length;
  const legend = [
    { key: "bolsonaro", label: displayName("bolsonaro", year) }, { key: "pt", label: "Lula" },
    { key: "outros", label: "Outra candidatura" }, { key: "tie", label: "Empate" }, { key: "missing", label: "Sem dados" },
  ];
  return <div>
    <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
      <canvas ref={canvas} role="img" aria-label={`Mapa do ${uf ?? "Brasil"}: vencedor de votos por município · ${year}`} className="h-full w-full touch-pan-y"
        onClick={(event) => {
          const element = canvas.current, context = element?.getContext("2d");
          if (!element || !context) return;
          const rect = element.getBoundingClientRect();
          const point = mapPoint(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height, geo, zoom);
          const hit = paths.current.find((row) => context.isPointInPath(row.path, point.x, point.y));
          if (hit) onSelect(hit.code);
        }} />
      <div className="absolute right-2 top-2 flex gap-1">
        <Button variant="secondary" size="icon" className="size-11 rounded-full" aria-label="Ampliar mapa" title="Ampliar mapa" disabled={zoom >= 4} onClick={() => setZoom((value) => Math.min(4, value + .5))}><Plus /></Button>
        <Button variant="secondary" size="icon" className="size-11 rounded-full" aria-label="Reduzir mapa" title="Reduzir mapa" disabled={zoom <= 1} onClick={() => setZoom((value) => Math.max(1, value - .5))}><Minus /></Button>
        {zoom > 1 && <Button variant="secondary" size="icon" className="size-11 rounded-full" aria-label="Redefinir mapa" title="Redefinir mapa" onClick={() => setZoom(1)}><RotateCcw /></Button>}
      </div>
    </div>
    <ul aria-label="Legenda dos vencedores" className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
      {legend.map((item) => <li key={item.key} className="flex items-center gap-2"><span className={`winner-swatch winner-${item.key}`} aria-hidden />{item.label}</li>)}
    </ul>
    <p className="mt-3 text-xs tabular-nums text-muted-foreground">{fmtInt(covered)} de {fmtInt(geo.paths.length)} municípios da malha com resultados.{withoutMesh > 0 ? ` ${fmtInt(withoutMesh)} município com resultados ainda sem geometria nesta malha do IBGE.` : ""}</p>
    {selected && <WinnerDetail winner={selectedWinner} year={year} />}
  </div>;
}

function WinnerDetail({ winner, year }: { winner: MunicipalWinner | undefined; year: number }) {
  if (!winner || winner.series === "missing") return <p role="status" className="mt-3 text-sm text-muted-foreground">Sem resultado válido para este município.</p>;
  const names = winner.candidates.map((candidate) => winner.series === "bolsonaro" ? displayName("bolsonaro", year, candidate) : winner.series === "pt" ? "Lula" : candidate.ballot_name).join(" / ");
  return <div role="status" className="mt-3 border-t pt-3 text-sm">
    <p className="font-medium">{winner.name} · {winner.uf}</p>
    <p className="mt-1">{winner.series === "tie" ? "Empate na primeira posição" : "Mais votado"}: <strong>{names}</strong></p>
    <p className="mt-1 tabular-nums">{fmtInt(winner.votes)} votos · {fmtPct(100 * winner.votes / winner.valid)} dos válidos</p>
    <p className="mt-1 text-xs tabular-nums text-muted-foreground">Total de votos válidos: {fmtInt(winner.valid)}</p>
  </div>;
}

function mapPoint(x: number, y: number, width: number, height: number, geo: { width: number; height: number }, zoom: number) {
  const scale = Math.min(width / geo.width, height / geo.height) * .94 * zoom;
  return { x: (x - (width - geo.width * scale) / 2) / scale, y: (y - (height - geo.height * scale) / 2) / scale };
}

function drawMap(element: HTMLCanvasElement, geo: { width: number; height: number }, paths: { code: string; path: Path2D }[], winners: Map<string, MunicipalWinner>, selected: string | null, zoom: number) {
  const context = element.getContext("2d");
  if (!context) return;
  const rect = element.getBoundingClientRect(), ratio = window.devicePixelRatio || 1;
  element.width = Math.round(rect.width * ratio); element.height = Math.round(rect.height * ratio);
  const scale = Math.min(rect.width / geo.width, rect.height / geo.height) * .94 * zoom;
  const styles = getComputedStyle(element);
  context.setTransform(ratio * scale, 0, 0, ratio * scale, ratio * (rect.width - geo.width * scale) / 2, ratio * (rect.height - geo.height * scale) / 2);
  context.strokeStyle = styles.getPropertyValue("--background").trim(); context.lineWidth = .25 / scale;
  for (const row of paths) {
    context.fillStyle = styles.getPropertyValue(tokens[winners.get(row.code)?.series ?? "missing"]).trim();
    context.fill(row.path); context.stroke(row.path);
  }
  const focused = paths.find((row) => row.code === selected);
  if (focused) { context.strokeStyle = styles.getPropertyValue("--foreground").trim(); context.lineWidth = 2 / scale; context.stroke(focused.path); }
}