import { z } from "zod";
import { UFS } from "./constants";

/** Predictor catalog. `indicatorId: null` = source not yet imported (shown as unavailable, never simulated). */
export interface XVariable {
  id: string; label: string; group: string; unit: string; log: boolean; indicatorId: string | null; source: string;
}

export const X_VARIABLES: readonly XVariable[] = [
  { id: "renda", label: "Renda domiciliar per capita", group: "Renda", unit: "R$", log: true, indicatorId: "renda_domiciliar_pc_media_2022", source: "Censo 2022 · SIDRA 10295/v13431" },
  { id: "superior", label: "Superior completo (25+)", group: "Escolaridade", unit: "%", log: false, indicatorId: "superior_completo_25mais_2022", source: "Censo 2022 · SIDRA 10199/v1001643" },
  { id: "alfabetizacao", label: "Alfabetização (15+)", group: "Escolaridade", unit: "%", log: false, indicatorId: "alfabetizacao_15mais_2022", source: "Censo 2022 · SIDRA 9543/v2513" },
  { id: "branca", label: "Cor ou raça branca", group: "Raça/cor", unit: "%", log: false, indicatorId: "cor_branca_pct_2022", source: "Censo 2022 · SIDRA 9605/v1000093" },
  { id: "preta", label: "Cor ou raça preta", group: "Raça/cor", unit: "%", log: false, indicatorId: "cor_preta_pct_2022", source: "Censo 2022 · SIDRA 9605/v1000093" },
  { id: "parda", label: "Cor ou raça parda", group: "Raça/cor", unit: "%", log: false, indicatorId: "cor_parda_pct_2022", source: "Censo 2022 · SIDRA 9605/v1000093" },
  { id: "evangelica", label: "Evangélicos (10+)", group: "Religião", unit: "%", log: false, indicatorId: "religiao_evangelica_pct_2022", source: "Censo 2022 · SIDRA 9537/v1000140" },
  { id: "catolica", label: "Católicos (10+)", group: "Religião", unit: "%", log: false, indicatorId: "religiao_catolica_pct_2022", source: "Censo 2022 · SIDRA 9537/v1000140" },
  { id: "semreligiao", label: "Sem religião (10+)", group: "Religião", unit: "%", log: false, indicatorId: "sem_religiao_pct_2022", source: "Censo 2022 · SIDRA 9537/v1000140" },
  { id: "idade", label: "Idade mediana", group: "Idade", unit: "anos", log: false, indicatorId: "idade_mediana_2022", source: "Censo 2022 · SIDRA 9756/v10613" },
  { id: "urbanizacao", label: "População urbana", group: "Urbanização", unit: "%", log: false, indicatorId: "urbanizacao_pct_2022", source: "Censo 2022 · SIDRA 9923/v1000093" },
  { id: "populacao", label: "População (porte)", group: "Porte", unit: "pessoas", log: true, indicatorId: "populacao_residente_2022", source: "Censo 2022 · SIDRA 4709/v93" },
  { id: "idhm", label: "IDHM", group: "Desenvolvimento", unit: "índice", log: false, indicatorId: null, source: "PNUD/IPEA — não importado" },
  { id: "ideb", label: "IDEB", group: "Educação", unit: "índice", log: false, indicatorId: null, source: "INEP — não importado" },
];

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

/** Lab-only URL state, layered on the shared filters. */
export const labSearchSchema = z.object({
  x: z.enum(X_VARIABLES.map((v) => v.id) as [string, ...string[]]).optional().catch(undefined),
  y: z.enum(Y_METRICS.map((m) => m.id) as [YMetric, ...YMetric[]]).optional().catch(undefined),
  reg: z.enum(REGIONS.map((r) => r.id) as [string, ...string[]]).optional().catch(undefined),
});

export const labInputSchema = z.object({
  electionId: z.number().int(),
  baseElectionId: z.number().int().nullable(),
  metric: z.enum(Y_METRICS.map((m) => m.id) as [YMetric, ...YMetric[]]),
  candidateNumber: z.number().int().nullable(),
  x: z.enum(X_VARIABLES.map((v) => v.id) as [string, ...string[]]),
  uf: z.enum(UFS).nullable(),
  region: z.enum(REGIONS.map((r) => r.id) as [string, ...string[]]).nullable(),
});
export type LabInput = z.infer<typeof labInputSchema>;
