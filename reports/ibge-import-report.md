# Relatório de importação — indicadores municipais IBGE

Catálogo `2026.10.4` · inventário https://servicodados.ibge.gov.br/api/v3/agregados?periodo=2022&nivel=N6

- Indicadores antes: **12** · depois: **87** carregados de 87 no catálogo, em **16 temas**.
- Valores municipais válidos (não nulos): **479.670**
- Universo: 5.570 municípios do Censo 2022; Boa Esperança do Norte/MT (criado em 2025) sem dados do IBGE, nunca imputado; exterior (ZZ) excluído.
- Conferência independente: 435 comparações (5 capitais × indicadores, consulta SIDRA ao vivo por município, recálculo próprio) · **0 divergências**.
- Símbolos SIDRA: '-' = zero absoluto; '..', '...', 'X' = ausente (NULL). Correção aplicada: `sem_religiao_pct_2022` tinha 27 municípios '-' gravados como ausentes; agora 0.

## Cobertura por tema

| Tema | Indicadores | Fonte/ano |
|---|---|---|
| Renda e desigualdade | 6/6 | IBGE Censo Demográfico 2022 |
| Estrutura populacional | 13/13 | IBGE Censo Demográfico 2022 |
| Educação | 9/9 | IBGE Censo Demográfico 2022 |
| Raça/cor | 5/5 | IBGE Censo Demográfico 2022 |
| Religião | 3/3 | IBGE Censo Demográfico 2022 |
| Território | 4/4 | IBGE Censo Demográfico 2022 |
| Trabalho | 14/14 | IBGE Censo Demográfico 2022 |
| Mobilidade | 1/1 | IBGE Censo Demográfico 2022 |
| Moradia | 7/7 | IBGE Censo Demográfico 2022 |
| Famílias | 6/6 | IBGE Censo Demográfico 2022 |
| Saneamento | 8/8 | IBGE Censo Demográfico 2022 |
| Fecundidade | 1/1 | IBGE Censo Demográfico 2022 |
| Migração | 2/2 | IBGE Censo Demográfico 2022 |
| Deficiência | 2/2 | IBGE Censo Demográfico 2022 |
| Acesso digital e bens | 2/2 | IBGE Censo Demográfico 2022 |
| Economia local | 4/4 | IBGE PIB dos Municípios 2021 |

## Indicadores

| Indicador | Tipo | Tabela | Universo | Municípios com valor | Observações |
|---|---|---|---|---|---|
| Renda domiciliar per capita (média) (`renda`) | direto | 10295 (2022) | Moradores em domicílios particulares permanentes ocupados | 5570 | — |
| População (porte) (`populacao`) | direto | 4709 (2022) | População residente | 5570 | — |
| Alfabetização (15+) (`alfabetizacao`) | direto | 9543 (2022) | Pessoas de 15 anos ou mais | 5570 | — |
| Superior completo (25+) (`superior`) | direto | 10199 (2022) | Pessoas de 25 anos ou mais | 5570 | — |
| Cor ou raça branca (`branca`) | direto | 9605 (2022) | População residente | 5570 | — |
| Cor ou raça preta (`preta`) | direto | 9605 (2022) | População residente | 5570 | — |
| Cor ou raça parda (`parda`) | direto | 9605 (2022) | População residente | 5570 | — |
| Católicos (10+) (`catolica`) | direto | 9537 (2022) | Pessoas de 10 anos ou mais | 5570 | — |
| Evangélicos (10+) (`evangelica`) | direto | 9537 (2022) | Pessoas de 10 anos ou mais | 5570 | — |
| Sem religião (10+) (`semreligiao`) | direto | 9537 (2022) | Pessoas de 10 anos ou mais | 5570 | zero: 27 |
| Idade mediana (`idade`) | direto | 9756 (2022) | População residente | 5570 | — |
| População urbana (`urbanizacao`) | direto | 9923 (2022) | População residente | 5570 | — |
| Crianças e adolescentes (0–14) (`jovens014`) | derivado | 9514 (2022) | População residente | 5570 | — |
| Jovens (15–29) (`jovens1529`) | derivado | 9514 (2022) | População residente | 5570 | soma das categorias vs total: desvio máx. 0.0 |
| Adultos (30–59) (`adultos3059`) | derivado | 9514 (2022) | População residente | 5570 | soma das categorias vs total: desvio máx. 0.0 |
| Idosos (60+) (`idosos60`) | derivado | 9514 (2022) | População residente | 5570 | soma das categorias vs total: desvio máx. 0.0 |
| Pessoas de 65+ (`idosos65`) | derivado | 9514 (2022) | População residente | 5570 | soma das categorias vs total: desvio máx. 0.0 |
| Pessoas de 80+ (`idosos80`) | derivado | 9514 (2022) | População residente | 5570 | soma das categorias vs total: desvio máx. 0.0 |
| Razão de dependência (`dependencia`) | derivado | 9514 (2022) | População residente | 5570 | soma das categorias vs total: desvio máx. 0.0 |
| Mulheres na população (`mulheres`) | derivado | 9514 (2022) | População residente | 5570 | — |
| Índice de envelhecimento (`envelhecimento`) | direto | 9515 (2022) | População residente | 5570 | — |
| Razão de sexo (`razaosexo`) | direto | 9515 (2022) | População residente | 5570 | — |
| Densidade demográfica (`densidade`) | direto | 4714 (2022) | População residente / área | 5570 | — |
| Crescimento populacional 2010–2022 (`crescimento`) | direto | 4709 (2022) | População residente (2010 compatibilizada) | 5570 | — |
| Renda domiciliar per capita (mediana) (`rendamediana`) | direto | 10295 (2022) | Moradores em domicílios particulares permanentes ocupados | 5570 | — |
| Moradores sem rendimento domiciliar (`semrenda`) | derivado | 10296 (2022) | Moradores em domicílios particulares permanentes ocupados | 5570 | soma das categorias vs total: desvio máx. 0.001938 |
| Renda per capita de até ½ salário mínimo (`rendabaixa`) | derivado | 10296 (2022) | Moradores em domicílios particulares permanentes ocupados | 5570 | soma das categorias vs total: desvio máx. 0.001938 |
| Renda per capita acima de 5 salários mínimos (`rendaalta`) | derivado | 10296 (2022) | Moradores em domicílios particulares permanentes ocupados | 5570 | soma das categorias vs total: desvio máx. 0.001938 |
| Peso do trabalho na renda domiciliar (`rendatrabalho`) | direto | 10297 (2022) | Rendimento domiciliar dos moradores | 5570 | — |
| Rendimento médio do trabalho (`salariomedio`) | direto | 10289 (2022) | Ocupados de 14+ com rendimento de trabalho | 5570 | — |
| Rendimento mediano do trabalho (`salariomediano`) | direto | 10289 (2022) | Ocupados de 14+ com rendimento de trabalho | 5570 | — |
| Nível de ocupação (10+) (`ocupacao`) | direto | 10268 (2022) | Pessoas de 10 anos ou mais | 5570 | — |
| Taxa de desocupação (14+) (`desocupacao`) | derivado | 9517 (2022) | Força de trabalho de 14 anos ou mais | 5570 | — |
| Participação na força de trabalho (14+) (`participacao`) | derivado | 9517 (2022) | Pessoas de 14 anos ou mais | 5570 | — |
| Empregados com carteira (`carteira`) | derivado | 10261 (2022) | Ocupados de 14 anos ou mais | 5570 | — |
| Empregados sem carteira (`semcarteira`) | derivado | 10261 (2022) | Ocupados de 14 anos ou mais | 5570 | — |
| Trabalhadores por conta própria (`contapropria`) | derivado | 10261 (2022) | Ocupados de 14 anos ou mais | 5570 | — |
| Empregadores (`empregadores`) | derivado | 10261 (2022) | Ocupados de 14 anos ou mais | 5570 | — |
| Servidores públicos estatutários (`estatutarios`) | derivado | 10261 (2022) | Ocupados de 14 anos ou mais | 5570 | — |
| Ocupados que contribuem à previdência (`previdencia`) | derivado | 10264 (2022) | Ocupados de 14 anos ou mais | 5570 | — |
| Ocupados qualificados da agropecuária (`agro`) | derivado | 10264 (2022) | Ocupados de 14 anos ou mais | 5570 | — |
| Ocupações elementares (`elementares`) | derivado | 10264 (2022) | Ocupados de 14 anos ou mais | 5570 | — |
| Dirigentes e profissionais das ciências (`profissionais`) | derivado | 10264 (2022) | Ocupados de 14 anos ou mais | 5570 | — |
| Trabalha em outro município (`deslocamento`) | derivado | 10329 (2022) | Ocupados de 10+ em domicílios particulares | 5570 | — |
| Média de anos de estudo (11+) (`anosestudo`) | direto | 10062 (2022) | Pessoas de 11 anos ou mais | 5570 | — |
| Sem instrução ou fundamental incompleto (18+) (`fundincompleto`) | derivado | 10061 (2022) | Pessoas de 18 anos ou mais | 5570 | — |
| Médio completo ou mais (18+) (`mediocompleto`) | derivado | 10061 (2022) | Pessoas de 18 anos ou mais | 5570 | — |
| Frequência à creche (0–3) (`creche`) | direto | 10056 (2022) | Crianças de 0 a 3 anos | 5570 | zero: 31 |
| Frequência à escola (4–5) (`preescola`) | direto | 10056 (2022) | Crianças de 4 e 5 anos | 5570 | — |
| Frequência à escola (15–17) (`freq1517`) | direto | 10056 (2022) | Pessoas de 15 a 17 anos | 5570 | — |
| Frequência à escola (18–24) (`freq1824`) | direto | 10056 (2022) | Pessoas de 18 a 24 anos | 5570 | — |
| Domicílios próprios (`proprio`) | derivado | 9929 (2022) | Domicílios particulares permanentes ocupados | 5570 | — |
| Domicílios alugados (`aluguel`) | derivado | 9929 (2022) | Domicílios particulares permanentes ocupados | 5570 | — |
| Domicílios cedidos ou emprestados (`cedido`) | derivado | 9929 (2022) | Domicílios particulares permanentes ocupados | 5570 | — |
| Domicílios em apartamento (`apartamento`) | derivado | 6326 (2022) | Domicílios particulares permanentes ocupados | 5570 | — |
| Média de moradores por domicílio (`moradores`) | direto | 4712 (2022) | Domicílios particulares permanentes ocupados | 5570 | — |
| Domicílios com um só morador (`unipessoal`) | derivado | 9880 (2022) | Domicílios particulares (inclui improvisados) | 5570 | — |
| Mais de 3 moradores por dormitório (`adensamento`) | derivado | 9933 (2022) | Domicílios particulares permanentes ocupados | 5570 | — |
| Paredes de alvenaria com revestimento (`alvenaria`) | derivado | 9928 (2022) | Domicílios particulares permanentes ocupados | 5570 | — |
| Água da rede geral como principal (`agua`) | derivado | 6803 (2022) | Domicílios particulares permanentes ocupados | 5570 | — |
| Água canalizada dentro de casa (`aguacanalizada`) | derivado | 6804 (2022) | Domicílios particulares permanentes ocupados | 5570 | — |
| Esgoto por rede geral, pluvial ou fossa ligada (`esgoto`) | derivado | 6805 (2022) | Domicílios particulares permanentes ocupados | 5570 | — |
| Fossa rudimentar ou buraco (`fossa`) | derivado | 6805 (2022) | Domicílios particulares permanentes ocupados | 5570 | — |
| Sem banheiro nem sanitário (`sembanheiro`) | derivado | 6806 (2022) | Domicílios particulares permanentes ocupados | 5570 | — |
| Com banheiro de uso exclusivo (`banheiro`) | derivado | 6806 (2022) | Domicílios particulares permanentes ocupados | 5570 | — |
| Lixo coletado (`lixo`) | derivado | 6892 (2022) | Domicílios particulares permanentes ocupados | 5570 | — |
| Lixo queimado na propriedade (`lixoqueimado`) | derivado | 6892 (2022) | Domicílios particulares permanentes ocupados | 5570 | — |
| Domicílios com mulher responsável (`chefiafeminina`) | derivado | 9880 (2022) | Domicílios particulares | 5570 | — |
| Domicílios sem cônjuge do responsável (`semconjuge`) | derivado | 9881 (2022) | Domicílios particulares | 5570 | — |
| Responsável sem cônjuge, com filhos (`monoparental`) | derivado | 9882 (2022) | Domicílios particulares | 5570 | — |
| Casal sem filhos (`casalsemfilhos`) | derivado | 9882 (2022) | Domicílios particulares | 5570 | — |
| Vivem em união conjugal (10+) (`uniao`) | derivado | 10183 (2022) | Pessoas de 10 anos ou mais | 5568 | den_zero: 2 |
| Média de filhos tidos por mulher (12+) (`filhos`) | derivado | 10078 (2022) | Mulheres de 12 anos ou mais | 5570 | — |
| Nascidos fora da UF de residência (`migrantes`) | derivado | 631 (2022) | População residente | 5570 | — |
| Estrangeiros e naturalizados (`estrangeiros`) | derivado | 10157 (2022) | População residente | 5570 | — |
| Moradores em favelas e comunidades urbanas (`favela`) | derivado | 9884÷4709 (2022) | População residente (universo) | 656 | suppressed: 4914 |
| Moradores em Unidades de Conservação (`conservacao`) | derivado | 10211 (2022) | População residente | 5570 | — |
| Cor ou raça indígena (`indigena`) | direto | 9605 (2022) | População residente | 5570 | zero: 745 |
| Cor ou raça amarela (`amarela`) | direto | 9605 (2022) | População residente | 5570 | zero: 575 |
| Pessoas com deficiência (2+) (`deficiencia`) | direto | 10125 (2022) | Pessoas de 2 anos ou mais | 5570 | — |
| Diagnóstico de autismo declarado (`autismo`) | direto | 10145 (2022) | População residente | 5570 | zero: 14 |
| Domicílios com internet (`internet`) | derivado | 9936 (2022) | Domicílios particulares permanentes ocupados | 5570 | — |
| Domicílios com máquina de lavar (`maquinalavar`) | derivado | 9935 (2022) | Domicílios particulares permanentes ocupados | 5570 | — |
| Agropecuária no valor adicionado (`pibagro`) | derivado | 5938 (2021) | Valor adicionado bruto municipal | 5569 | invalid: 1 |
| Indústria no valor adicionado (`pibindustria`) | derivado | 5938 (2021) | Valor adicionado bruto municipal | 5569 | invalid: 1 |
| Serviços no valor adicionado (`pibservicos`) | derivado | 5938 (2021) | Valor adicionado bruto municipal | 5569 | invalid: 1 |
| Administração pública no valor adicionado (`pibpublico`) | derivado | 5938 (2021) | Valor adicionado bruto municipal | 5569 | invalid: 1 |

## Falhas e lacunas específicas

- `favela_pct_2022`: IBGE publica a tabela 9884 apenas para os 656 municípios com favelas e comunidades urbanas delimitadas; os demais ficam ausentes (não zero).
- `vab_*_2021`: Cachoeira Dourada/GO tem VAB total negativo (−227.726 mil R$); participações sem sentido ficam ausentes. PIB dos Municípios 2022/2023 consta nos períodos, mas sem valores municipais publicados na consulta (todos '...').
- `vive_em_uniao_10mais_pct_2022`: Pacaraima/RR e Marcação/PB vêm com denominador '-' na tabela 10183; ficam ausentes, não 0/0.

## Verificados e fora do app

- **Índice de Gini da renda domiciliar** (não publicado para município): Nenhuma tabela do Censo 2022 no inventário N6 (api/v3/agregados?periodo=2022&nivel=N6) publica Gini; não estimamos Gini a partir de faixas.
- **PIB per capita** (não importado): A tabela 5938 não traz PIB per capita; exige dividir pela estimativa populacional do mesmo ano (outra pesquisa).
- **Desocupação PNAD Contínua** (não publicado para município): PNAD Contínua não é representativa por município; usamos a desocupação do Censo 2022.
- **Migração recente entre UFs (5 anos)** (não importado): Tabelas 10159/10160 não trazem denominador de 5+ anos na mesma tabela.
- **População quilombola** (não importado): Publicada por localidades quilombolas; integração pendente de validação de cobertura municipal.
- **IDHM** (não importado): Fonte PNUD/IPEA/FJP; último IDHM municipal é do Censo 2010.
- **IDEB** (não importado): Fonte INEP, fora do IBGE; não importado.

Reprodução: `python3 scripts/ingest/build_ibge_manifest.py && python3 scripts/ingest/ibge_catalog.py && python3 scripts/ingest/verify_ibge_samples.py && python3 scripts/ingest/write_ibge_report.py`.
