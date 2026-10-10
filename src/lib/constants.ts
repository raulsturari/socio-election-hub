// Domain constants — single source of truth.
export const ELECTION_YEARS = [2018, 2022, 2026] as const;
export type ElectionYear = (typeof ELECTION_YEARS)[number];

export const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;

export type SourceId = "TSE" | "IBGE_SIDRA" | "IPEA" | "INEP" | "DATASUS";

export interface DataSource {
  id: SourceId;
  name: string;
  scope: string;
  url: string;
}

export const DATA_SOURCES: readonly DataSource[] = [
  { id: "TSE", name: "TSE — Dados Abertos", scope: "Resultados eleitorais por município e zona", url: "https://dadosabertos.tse.jus.br" },
  { id: "IBGE_SIDRA", name: "IBGE SIDRA", scope: "População, renda, Censo 2022", url: "https://sidra.ibge.gov.br" },
  { id: "IPEA", name: "IPEA Data", scope: "Indicadores socioeconômicos municipais", url: "https://www.ipeadata.gov.br" },
  { id: "INEP", name: "INEP", scope: "Educação: IDEB, matrículas", url: "https://www.gov.br/inep" },
  { id: "DATASUS", name: "DATASUS", scope: "Saúde: mortalidade, cobertura", url: "https://datasus.saude.gov.br" },
];
