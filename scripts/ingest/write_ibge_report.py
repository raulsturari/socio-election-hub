#!/usr/bin/env python3
"""Writes reports/ibge-import-report.md from the manifest, import results, sample check and live DB coverage."""
import json
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from pipeline import rest  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
m = json.loads((ROOT / "src/data/ibge-indicators.json").read_text())
res = json.loads((ROOT / "reports/ibge-import-results.json").read_text())
chk = json.loads((ROOT / "reports/ibge-sample-check.json").read_text())
cov = {r["indicator_id"]: r for r in rest("POST", "rpc/indicator_coverage", {}, prefer="")}

ind = m["indicators"]
loaded = [i for i in ind if cov.get(i["id"], {}).get("nonnull", 0) > 0]
values = sum(cov[i["id"]]["nonnull"] for i in loaded)
by_theme = defaultdict(list)
for i in ind:
    by_theme[i["theme"]].append(i)
L = ["# Relatório de importação — indicadores municipais IBGE", "",
     f"Catálogo `{m['version']}` · inventário {m['inventory']}", "",
     f"- Indicadores antes: **12** · depois: **{len(loaded)}** carregados de {len(ind)} no catálogo, em **{len(by_theme)} temas**.",
     f"- Valores municipais válidos (não nulos): **{values:,}**".replace(",", "."),
     f"- Universo: 5.570 municípios do Censo 2022; Boa Esperança do Norte/MT (criado em 2025) sem dados do IBGE, nunca imputado; exterior (ZZ) excluído.",
     f"- Conferência independente: {chk['checks']} comparações (5 capitais × indicadores, consulta SIDRA ao vivo por município, recálculo próprio) · **{chk['mismatches']} divergências**.",
     "- Símbolos SIDRA: '-' = zero absoluto; '..', '...', 'X' = ausente (NULL). Correção aplicada: `sem_religiao_pct_2022` tinha 27 municípios '-' gravados como ausentes; agora 0.", "",
     "## Cobertura por tema", "", "| Tema | Indicadores | Fonte/ano |", "|---|---|---|"]
for t, items in by_theme.items():
    L.append(f"| {t} | {sum(1 for i in items if i in loaded)}/{len(items)} | {', '.join(sorted({i['source'] for i in items}))} |")
L += ["", "## Indicadores", "", "| Indicador | Tipo | Tabela | Universo | Municípios com valor | Observações |", "|---|---|---|---|---|---|"]
for i in ind:
    r, c = res.get(i["id"], {}), cov.get(i["id"], {})
    st = r.get("status", {})
    notes = ", ".join(f"{k}: {v}" for k, v in st.items() if k != "ok")
    gap = r.get("integrity", {}).get("partition_max_relative_gap")
    if gap is not None:
        notes += f"{'; ' if notes else ''}soma das categorias vs total: desvio máx. {gap}"
    table = i["spec"].get("table") or f"{i['spec']['num']['table']}÷{i['spec']['den']['table']}"
    L.append(f"| {i['label']} (`{i['alias']}`) | {'direto' if i['kind'] == 'direct' else 'derivado'} | {table} ({i['year']}) | {i['universe']} | {c.get('nonnull', 0)} | {notes or '—'} |")
L += ["", "## Falhas e lacunas específicas", "",
      "- `favela_pct_2022`: IBGE publica a tabela 9884 apenas para os 656 municípios com favelas e comunidades urbanas delimitadas; os demais ficam ausentes (não zero).",
      "- `vab_*_2021`: Cachoeira Dourada/GO tem VAB total negativo (−227.726 mil R$); participações sem sentido ficam ausentes. PIB dos Municípios 2022/2023 consta nos períodos, mas sem valores municipais publicados na consulta (todos '...').",
      "- `vive_em_uniao_10mais_pct_2022`: Pacaraima/RR e Marcação/PB vêm com denominador '-' na tabela 10183; ficam ausentes, não 0/0.",
      "", "## Verificados e fora do app", ""]
L += [f"- **{p['label']}** ({'não publicado para município' if p['status'] == 'nao_publicado_municipio' else 'não importado'}): {p['reason']}" for p in m["planned"]]
L += ["", "Reprodução: `python3 scripts/ingest/build_ibge_manifest.py && python3 scripts/ingest/ibge_catalog.py && python3 scripts/ingest/verify_ibge_samples.py && python3 scripts/ingest/write_ibge_report.py`.", ""]
(ROOT / "reports/ibge-import-report.md").write_text("\n".join(L))
print(len(loaded), values)
