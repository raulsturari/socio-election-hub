# Brasil Data Lab

<div align="center">

![License](https://img.shields.io/badge/license-MIT-green.svg)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-orange)
![Stack](https://img.shields.io/badge/stack-React%20%7C%20TypeScript-blue)
![Data](https://img.shields.io/badge/data-TSE%20%2B%20IBGE-lightgrey)

</div>

Dashboard eleitoral e sociodemográfico do Brasil para explorar a geografia do voto em relação a indicadores municipais de renda, educação, religião, população, território e outras dimensões sociais.

[Live app](https://socio-election-hub.lovable.app) · [Roadmap](roadmap.md) · [Como contribuir](CONTRIBUTING.md) · [Licença](LICENSE)

## Visão geral

O Brasil Data Lab reúne três componentes principais:

- Atlas eleitoral: mapas municipais e visualização geográfica dos resultados
- Laboratório analítico: correlação, regressão e leitura editorial dos dados
- Catálogo de indicadores: documentação de fontes, cobertura e metodologia

O projeto foi pensado para ser acessível em celular, mantendo rigor analítico e transparência sobre as limitações das interpretações.

## Para quem é

- jornalistas
- pesquisadores
- estudantes
- analistas de políticas públicas
- cidadãos interessados em compreender padrões eleitorais e contextos sociodemográficos

## O que você encontra

| Área | Conteúdo |
| --- | --- |
| Atlas | Mapas municipais, filtros geográficos e resultados eleitorais |
| Laboratório | Gráficos de dispersão, estatísticas e análise editorial |
| Dados | Catálogo de indicadores, cobertura e documentação das fontes |
| Mobile | Navegação pensada para toque e compartilhamento via URL |

## Metodologia e limites

- Os dados eleitorais vêm do TSE
- Os indicadores sociodemográficos vêm principalmente do IBGE/SIDRA
- A integração territorial usa o código IBGE como chave de harmonização
- Dados ausentes não são preenchidos automaticamente por zero
- Correlações agregadas não devem ser interpretadas como comportamento individual nem como causalidade
- O projeto é independente e não é um produto oficial do TSE ou do IBGE

## Dados e rastreabilidade

O repositório inclui relatórios, scripts, dados e documentação de importação e conferência, com foco em transparência:

- `reports/`
- `scripts/ingest/`
- `src/data/`
- `drizzle/`
- `supabase/`

Esses artefatos ajudam a seguir a origem dos indicadores, a cobertura por ano e as regras de validação aplicadas.

## Stack

- React 19
- TypeScript
- TanStack Start / Router / Query
- Vite
- Tailwind CSS
- Radix + shadcn/ui
- Recharts
- Supabase / PostgreSQL
- Drizzle
- Python para ingestão e validação
- Vitest para testes

## Capturas do projeto

> Adicione aqui imagens reais do Atlas e do Laboratório para ilustrar a experiência do produto.

```md
![Atlas eleitoral](./assets/atlas.png)
![Laboratório analítico](./assets/laboratorio.png)
```

## Desenvolvimento local

O projeto usa Bun.

```bash
git clone https://github.com/raulsturari/socio-election-hub.git
cd socio-election-hub
bun install
bun run dev
```

Para rodar com dados reais, é necessário configurar o ambiente local e acessar uma instância Supabase com o schema e as importações correspondentes.

```bash
bun run lint
bun run test
bun run build
```

## Estrutura do repositório

- `src/routes/` — páginas do Atlas, Laboratório e Dados
- `src/components/` — mapa, gráficos e interface
- `src/lib/` — lógica analítica e filtros
- `src/data/` — catálogo de indicadores
- `scripts/ingest/` — importação e validação
- `drizzle/` e `supabase/` — schema e infraestrutura
- `reports/` — relatórios e evidências de importação

## Contribuição

Contribuições são bem-vindas. Consulte o [CONTRIBUTING.md](CONTRIBUTING.md) para regras de issues, pull requests e critérios analíticos.

## Licença

Este projeto está licenciado sob a [MIT License](LICENSE).

## Roadmap

Consulte [roadmap.md](roadmap.md) para acompanhar recursos concluídos, em desenvolvimento e pendentes.

## Autor

Desenvolvido por [Raul Sturari](https://github.com/raulsturari).
