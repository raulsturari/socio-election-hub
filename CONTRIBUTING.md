# Brasil Data Lab
### Dashboard eleitoral e sociodemográfico do Brasil

**Explore a geografia do voto e sua relação com os indicadores sociais dos municípios brasileiros.** O Brasil Data Lab reúne mapas eleitorais, indicadores do IBGE e análise estatística em uma aplicação web pensada primeiro para o celular.

**[Acessar o painel →](https://socio-election-hub.lovable.app)** · [Roadmap](roadmap.md) · [Como contribuir](CONTRIBUTING.md)

Criado por **[Raul Sturari](https://github.com/raulsturari)**. Repositório técnico: `socio-election-hub`.

## Para quem é

Para jornalistas, pesquisadores, estudantes, analistas de políticas públicas e cidadãos interessados em explorar resultados eleitorais e o contexto social do Brasil. O objetivo é tornar os dados mais acessíveis, com visualizações e leituras em linguagem clara, preservando as limitações da análise.

## O que você encontra

| Área | Recursos |
| --- | --- |
| **Atlas** | Mapas municipais, resultados eleitorais, filtros geográficos e visualizações de candidaturas. |
| **Laboratório** | Relações entre votação e indicadores municipais, gráficos de dispersão, estatísticas e leitura editorial dos resultados. |
| **Dados** | Catálogo de indicadores, cobertura e informações sobre as fontes. |
| **Experiência mobile** | Navegação inferior, filtros adaptados ao toque e parâmetros na URL para compartilhar recortes. |

A disponibilidade de eleições e indicadores depende da importação e validação das respectivas bases. O roadmap distingue recursos concluídos e pendentes.

## Base sociodemográfica

O [relatório de importação versionado](reports/ibge-import-report.md) documenta **87 indicadores em 16 temas**, **479.670 valores municipais válidos** e **435 conferências amostrais sem divergências** na execução registrada. Esses números descrevem aquela importação, não uma auditoria permanente do serviço.

Os temas incluem renda e desigualdade, população, educação, raça/cor, religião, território, trabalho, mobilidade, moradia, famílias, saneamento, fecundidade, migração, deficiência, acesso digital e economia local. A cobertura varia conforme o indicador e o ano.

## Fontes e metodologia

- **TSE:** resultados eleitorais provenientes das bases oficiais. Uma eleição só é exposta quando marcada como validada pelo importador, após reconciliação dos totais.
- **IBGE / SIDRA:** indicadores municipais, principalmente do Censo Demográfico 2022, além de PIB dos Municípios 2021 no catálogo documentado.
- **Integração territorial:** código IBGE de sete dígitos; os códigos do TSE são mapeados e validados.
- **Rastreabilidade:** catálogo de indicadores, scripts de importação e relatórios de conferência ficam no repositório.
- **Dados ausentes:** não são substituídos automaticamente por zero. Os símbolos das fontes recebem tratamento explícito.
- **Estatística:** o Laboratório implementa correlações de Pearson e Spearman e regressão linear, com verificações e testes de referência.

**Correlação municipal não demonstra causalidade nem permite concluir como uma pessoa votou.** Municípios com maior proporção de um grupo e maior votação de um candidato não provam a preferência individual daquele grupo. Anos, universos populacionais e cobertura devem ser considerados na interpretação.

O projeto é independente e não é um produto oficial do TSE ou do IBGE. IPEA, INEP e DATASUS constam como fontes futuras no [roadmap](roadmap.md), não como integrações concluídas.

## English overview

**Brasil Data Lab is a mobile-first Brazilian election and sociodemographic dashboard.** It combines municipal electoral maps with IBGE indicators to explore relationships between voting patterns and income, education, religion, race, population and other social dimensions.

The application includes an electoral atlas, a statistical laboratory and a data catalog. Source reconciliation, municipal identifiers and documented import checks support traceability. Aggregate correlations must not be interpreted as individual voting behavior or causal effects.

[Open the live dashboard](https://socio-election-hub.lovable.app).

## Tecnologias

React 19, TypeScript, TanStack Start/Router/Query, Vite, Tailwind CSS, componentes Radix/shadcn, Recharts, Supabase/PostgreSQL, Drizzle e scripts Python para ingestão. Testes com Vitest.

## Desenvolvimento local

O projeto utiliza Bun e inclui `bun.lock`. Instale uma versão de Bun compatível com as dependências do projeto.

```sh
git clone https://github.com/raulsturari/socio-election-hub.git
cd socio-election-hub
bun install
bun run dev
```

A execução com dados exige configuração do ambiente e acesso a uma instância Supabase com o schema e as bases correspondentes. Clonar o código não reproduz automaticamente o banco publicado. Consulte os clientes de conexão em `src/lib/`, as migrações e os scripts de ingestão. Nunca publique chaves privilegiadas.

```sh
bun run lint
bun run test
bun run build
```

### Organização

| Caminho | Conteúdo |
| --- | --- |
| `src/routes/` | Páginas Atlas, Laboratório e Dados. |
| `src/components/` | Mapas, gráficos, filtros e interface. |
| `src/lib/` | Acesso a dados, filtros e lógica analítica. |
| `src/data/` | Catálogo de indicadores. |
| `scripts/ingest/` | Importação e conferência de dados. |
| `drizzle/migrations/` e `supabase/` | Schema e infraestrutura de dados. |
| `reports/` | Relatórios e evidências de importação. |

O projeto está conectado ao [Lovable](https://lovable.dev/projects/4783c511-9c49-4dc9-aeac-c85ec287356a). Alterações na branch conectada são sincronizadas com o editor; preserve o histórico publicado.

## Colaboração e autoria

Encontrou um problema ou quer propor uma melhoria? [Abra uma issue](https://github.com/raulsturari/socio-election-hub/issues) com o recorte analisado, a fonte e o comportamento esperado. Consulte [CONTRIBUTING.md](CONTRIBUTING.md) antes de enviar alterações.

Ao mencionar o projeto, use **Brasil Data Lab, de Raul Sturari**, com o link deste repositório e as fontes oficiais pertinentes. Para citar dados, identifique também a base, o ano e a data de consulta.

## Licença

Este repositório está licenciado sob a [MIT License](LICENSE).

---

## Roadmap e status

Consulte [roadmap.md](roadmap.md) para consultar recursos concluídos, em desenvolvimento e pendentes.

