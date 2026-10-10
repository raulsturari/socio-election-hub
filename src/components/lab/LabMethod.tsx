import { SourceNote } from "@/components/ui-kit";
import { READING_CONVENTION } from "@/lib/graph-reading";
import type { XVariable } from "@/lib/lab-variables";

export function LabMethod({ x }: { x: XVariable }) {
  return <div className="space-y-3"><h3 className="text-sm font-medium">Como calculamos</h3><SourceNote>
    Fonte X: {x.source}. Unidade: município, sem ponderação por eleitorado. X: Censo 2022, mesma referência em ambos os anos.
    Y: TSE; votos sobre todos os votos válidos, comparecimento e abstenção sobre aptos; brancos+nulos sobre comparecimento.
    Variações em pontos percentuais pelo mesmo número de urna, sem inferir continuidade pessoal ou transferência individual.
    Ausências: exclusão por pares no gráfico e completa no modelo; nada é imputado. Pearson na escala exibida, IC Fisher-z;
    Spearman em postos, IC Fieller. OLS com renda, escolaridade e porte, exceto quando a própria X é um desses controles;
    efeitos fixos de UF quando há mais de uma UF. EP robusto HC1, IC 95% t, Breusch-Pagan e VIF.
    Duas séries são calculadas separadamente, sem regressão conjunta nem duplicação de municípios dentro de uma estatística.
    Cálculos no servidor. R² descreve o modelo completo, não a variável X isolada nem chance de vitória.
    Falácia ecológica: associações municipais não permitem inferir voto individual ou causalidade.
  </SourceNote><SourceNote>{READING_CONVENTION}</SourceNote></div>;
}
