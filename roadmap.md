# Explorar
- [x] Centralizar identidade eleitoral e aplicar a gráficos, mapas, séries históricas, galeria e legendas sem alterar dados.
- [x] Verificar cores no navegador mobile e executar testes de identidade.
- [x] Criar 14 presets com consultas reais e fontes, cobertura e dados ausentes explícitos.
- [x] Criar galeria mobile, mapas Canvas, dispersão e barras, controles temporais e tour.
- [x] Destacar Explorar na navegação sem perder filtros ou alterar dados.
- [x] Executar testes unitários e E2E e conferir screenshots mobile.

# Bolsonaro × Lula
- [x] Agrupamento B/L/Outros puro + RPC duel_dataset, modo global na URL com links antigos `cand`.
- [x] Atlas (vantagem, lado a lado, 3 grupos), Comparar, 2022×2026, Correlações, Lab (estatísticas separadas, CSV), Explorar (presets).
- [x] Testes unitários, conferência no banco e navegador 390/430px.

# Leitura acessível das análises
- [x] Motor determinístico contextual com testes de direção, incerteza, ajustes e séries independentes.
- [x] Lab e Correlações: gráfico → leitura → detalhes fechados; fontes e problemas essenciais visíveis.
- [x] Validar filtros, teclado, CSV e screenshots 390/430px, sem alterar dados ou publicação.

# Conclusão integrada e geometria
- [x] Revisão editorial: reportagem em dois parágrafos, testes focados, exemplos reais e checagem mobile.
- [x] Revisão pontual: residual zero/constante/variável, 52 testes focados aprovados, checagem automática de tipos limpa e exemplos reais agregados de QA salvos.
- [x] Compartilhar escalas reais e diagnosticar concentração, caudas, cruzamento pareado e abertura por série.
- [x] Substituir blocos por candidato por uma conclusão única; critérios auditáveis recolhidos.
- [x] Testar casos geométricos e ajustes; verificar renda/preta, filtros, CSV e screenshots 390/430px.

# Base IBGE ampliada
- [x] Inventário N6 e manifesto declarativo (87 indicadores, 16 temas) com metadados verificados.
- [x] Importador por catálogo: lotes ≤50 mil valores, retry/backoff, cache SHA-256, '-' = zero, logs por job.
- [x] Importar todos os indicadores e gerar relatório com cobertura e amostras conferidas (87 carregados, 435 conferências, 0 divergências).
- [x] Seletor com busca, temas, cobertura; /dados com status; 7 novos presets em Explorar.
- [x] Leitura usa tema/fonte/ano do indicador; modelo retido em colinearidade.
- [x] Verificação no navegador 390/430px e desktop.
- [x] Atualizar `tests/e2e/explore_mobile.py` para o seletor comparar/Bolsonaro/Lula.
- [x] Tour Explorar: tempo por gráfico (5–60 s, padrão 15) e avanço só com gráfico inteiro pronto.
