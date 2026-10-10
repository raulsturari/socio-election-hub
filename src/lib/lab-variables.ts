import { z } from "zod";
import { UFS } from "./constants";
import { CATALOG, PLANNED, sourceLine } from "./indicator-catalog";

/** Predictor catalog. `indicatorId: null` = source not yet imported (shown as unavailable, never simulated). */
export interface XVariable {
  id: string; label: string; group: string; unit: string; log: boolean; indicatorId: string | null; source: string;
  /** Natural phrase used by the reading: "nas cidades com maior {topic}". */
  topic?: string; year?: number; universe?: string; definition?: string; synonyms: readonly string[]; sourceShort?: string;
}

export const X_VARIABLES: readonly XVariable[] = [
  ...CATALOG.map((e) => ({
    id: e.alias, label: e.label, group: e.theme, unit: e.unit, log: e.log, indicatorId: e.id, source: sourceLine(e),
    topic: e.topic, year: e.year, universe: e.universe, definition: e.definition, synonyms: e.synonyms, sourceShort: e.source,
  })),
  { id: "idhm", label: "IDHM", group: "Desenvolvimento", unit: "índice", log: false, indicatorId: null, source: "PNUD/IPEA — não importado", synonyms: [] },
  { id: "ideb", label: "IDEB", group: "Educação", unit: "índice", log: false, indicatorId: null, source: "INEP — não importado", synonyms: [] },
];
export { PLANNED };

export const Y_METRICS = [
  { id: "share", label: "% votos do candidato", needsCandidate: true, needsBase: false },
  { id: "share_delta", label: "Variação 2022→2026 (p.p.)", needsCandidate: true, needsBase: true },
  { id: "turnout", label: "Comparecimento (%)", needsCandidate: false, needsBase: false },
  { id: "abstention", label: "Abstenção (%)", needsCandidate: false, needsBase: false },
  { id: "blank_null", label: "Brancos + nulos (%)", needsCandidate: false, needsBase: false },
  { id: "turnout_delta", label: "Var. comparecimento 2022→2026 (p.p.)", needsCandidate: false, needsBase: true },
] as const;
export type YMetric = (typeof Y_METRICS)[number]["id"];

export const REGIONS = [
  { id: "N", label: "Norte", prefix: "1" },
  { id: "NE", label: "Nordeste", prefix: "2" },
  { id: "SE", label: "Sudeste", prefix: "3" },
  { id: "S", label: "Sul", prefix: "4" },
  { id: "CO", label: "Centro-Oeste", prefix: "5" },
] as const;

const xIds = X_VARIABLES.map((v) => v.id) as [string, ...string[]];
/** Lab-only URL state, layered on the shared filters. */
export const labSearchSchema = z.object({
  x: z.enum(xIds).optional().catch(undefined),
  y: z.enum(Y_METRICS.map((m) => m.id) as [YMetric, ...YMetric[]]).optional().catch(undefined),
  reg: z.enum(REGIONS.map((r) => r.id) as [string, ...string[]]).optional().catch(undefined),
});

export const labInputSchema = z.object({
  electionId: z.number().int(),
  baseElectionId: z.number().int().nullable(),
  metric: z.enum(Y_METRICS.map((m) => m.id) as [YMetric, ...YMetric[]]),
  candidateNumber: z.number().int().nullable(),
  x: z.enum(xIds),
  uf: z.enum(UFS).nullable(),
  region: z.enum(REGIONS.map((r) => r.id) as [string, ...string[]]).nullable(),
});
export type LabInput = z.infer<typeof labInputSchema>;
