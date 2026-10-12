# Brasil Data Lab

Dashboard eleitoral e sociodemográfico do Brasil, construído para explorar como padrões de voto se relacionam com indicadores municipais de renda, educação, religião, população e território.

[Live app](https://socio-election-hub.lovable.app) · [Roadmap](roadmap.md) · [Como contribuir](CONTRIBUTING.md) · [Licença](LICENSE)

## Visão geral

O Brasil Data Lab reúne:
- Atlas eleitoral municipal
- Laboratório analítico para correlação, regressão e leitura editorial
- Catálogo de indicadores e fontes
- Experiência mobile-first para análise em celular

A proposta é apoiar jornalistas, pesquisadores, estudantes, analistas de políticas públicas e cidadãos a explorar dados eleitorais com contexto sociodemográfico, sem perder a rigorosidade metodológica.

## O que você encontra

| Área | Conteúdo |
| --- | --- |
| Atlas | Mapas municipais, filtros geográficos e resultados eleitorais |
| Laboratório | Gráficos de dispersão, estatísticas e interpretações analíticas |
| Dados | Indicadores municipais, cobertura e documentação de fontes |
| Mobile | Navegação adaptada ao toque e compartilhamento de recortes via URL |

## Metodologia e limites

- TSE e IBGE/SIDRA são as principais fontes de dados oficiais do projeto
- A integração usa código IBGE como chave de harmonização territorial
- Dados ausentes não são preenchidos automaticamente por zero
- Correlações agregadas não devem ser interpretadas como comportamento individual nem como causalidade
- O projeto é independente e não é um produto oficial do TSE ou do IBGE

## Dados e relatórios

O repositório inclui documentação de importação e conferência dos dados, em especial em:
- `reports/`
- `scripts/ingest/`
- `src/data/`
- `drizzle/` e `supabase/`

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
- Python para ingestão
- Vitest para testes

## Desenvolvimento local

O projeto usa Bun.

```bash
git clone https://github.com/raulsturari/socio-election-hub.git
cd socio-election-hub
bun install
bun run dev
```

Para rodar a aplicação com dados reais, é necessário configurar o ambiente local e o acesso a uma instância Supabase com as tabelas e importações correspondentes.

```bash
bun run lint
bun run test
bun run build
```

## Estrutura do repositório

- `src/routes/` — páginas do Atlas, Laboratório e Dados
- `src/components/` — mapas, gráficos e interface
- `src/lib/` — lógica analítica, filtros e acesso a dados
- `src/data/` — catálogo de indicadores
- `scripts/ingest/` — scripts de importação e validação
- `drizzle/` e `supabase/` — schema e infraestrutura
- `reports/` — relatórios e evidências de importação

## Contribuição

Contribuições são bem-vindas. Consulte o [CONTRIBUTING.md](CONTRIBUTING.md) para regras de issues, pull requests e qualidade analítica.

## Licença

Este projeto está licenciado sob a [MIT License](LICENSE).

## Roadmap

Consulte [roadmap.md](roadmap.md) para acompanhar recursos concluídos, em desenvolvimento e pendentes.

## Autor

Desenvolvido por [Raul Sturari](https://github.com/raulsturari).
