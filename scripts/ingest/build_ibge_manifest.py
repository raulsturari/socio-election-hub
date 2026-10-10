#!/usr/bin/env python3
"""
Builds src/data/ibge-indicators.json — the single declarative catalog of municipal
IBGE indicators (consumed by scripts/ingest/ibge_catalog.py and by the web app).

Every table/variable/category id below was read from the official metadata
endpoint https://servicodados.ibge.gov.br/api/v3/agregados/{table}/metadados
(inventory: /api/v3/agregados?periodo=2022&nivel=N6) before use. Re-run this
script after editing; never hand-edit the JSON.

kinds:
  direct   value = V of the single cell (table/variable/classes)
  ratio    value = scale * sum(V[num categories]) / sum(V[den categories]) over one
           classification `cls`, same table/variable/year, other classes fixed at Total
  varratio value = scale * V[numVar] / V[denVar], same table/classes/year
  xratio   value = scale * V(num spec) / V(den spec) — two tables, same Census universe/year
  other_uf value = 100 * (Total - born in own UF - no declaration) / Total (table 631)
"""
import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[2] / "src/data/ibge-indicators.json"
SIDRA = "https://sidra.ibge.gov.br/tabela/{t}"

AGE_0_14 = [93070, 93084, 93085]
AGE_15_29 = [93086, 93087, 93088]
AGE_30_59 = [93089, 93090, 93091, 93092, 93093, 93094]
AGE_80 = [49108, 49109, 60040, 60041, 6653]
AGE_65 = [93096, 93097, 93098] + AGE_80
AGE_60 = [93095] + AGE_65
AGE_15_64 = AGE_15_29 + AGE_30_59 + [93095]
AGE_ALL5 = AGE_0_14 + AGE_15_64 + AGE_65
T9514 = dict(table="9514", variable="93", classes="c2/6794/c286/113635", cls="c287", den=[100362],
             universe="População residente", partition=AGE_ALL5)

UF_BIRTH = {"RO": 3256, "AC": 3257, "AM": 3258, "RR": 3259, "PA": 3260, "AP": 3261, "TO": 3262, "MA": 3263,
            "PI": 3264, "CE": 3265, "RN": 3266, "PB": 3267, "PE": 3268, "AL": 3269, "SE": 3270, "BA": 3271,
            "MG": 3272, "ES": 3273, "RJ": 3284, "SP": 3274, "PR": 3275, "SC": 3276, "RS": 3277, "MS": 3278,
            "MT": 3279, "GO": 3280, "DF": 3281}

def ind(id, alias, label, theme, unit, topic, kind, spec, *, name=None, log=False, universe=None, year=2022,
        definition="", synonyms=(), source="IBGE Censo Demográfico 2022", pct=None, formula=None):
    is_pct = unit == "%" if pct is None else pct
    return {"id": id, "alias": alias, "label": label, "name": name or label, "theme": theme, "unit": unit,
            "topic": topic, "log": log, "year": year, "source": source, "kind": kind,
            "universe": universe or spec.get("universe", ""), "definition": definition,
            "synonyms": list(synonyms), "percentBounded": is_pct, "formula": formula or default_formula(kind, spec),
            "spec": {k: v for k, v in spec.items() if k != "universe"}, "url": SIDRA.format(t=spec.get("table") or spec["num"]["table"])}

def default_formula(kind, s):
    if kind == "direct":
        return f"t{s['table']}/v{s['variable']}" + (f"/{s['classes']}" if s.get("classes") else "")
    if kind == "ratio":
        return f"{s.get('scale', 100)} × Σ {s['cls']}{s['num']} ÷ Σ {s['cls']}{s['den']} (t{s['table']}/v{s['variable']})"
    if kind == "varratio":
        return f"{s.get('scale', 100)} × v{s['numVar']} ÷ v{s['denVar']} (t{s['table']})"
    if kind == "xratio":
        return f"{s.get('scale', 100)} × t{s['num']['table']}/v{s['num']['variable']} ÷ t{s['den']['table']}/v{s['den']['variable']}"
    return "100 × (Total − nascidos na própria UF − sem declaração) ÷ Total (t631/v93)"

def r9514(num, den=None, **kw):
    s = dict(T9514, num=num)
    if den: s["den"] = den
    return s

P = []  # catalog
# ---------- existing 12 (aliases preserved) ----------
P += [
    ind("renda_domiciliar_pc_media_2022", "renda", "Renda domiciliar per capita (média)", "Renda e desigualdade", "R$", "renda", "direct",
        dict(table="10295", variable="13431", universe="Moradores em domicílios particulares permanentes ocupados"), log=True,
        name="Rendimento nominal médio mensal domiciliar per capita", synonyms=["renda media", "rendimento"],
        definition="Valores nominais de 2022; exclui pensionistas, empregados domésticos e parentes destes."),
    ind("populacao_residente_2022", "populacao", "População (porte)", "Estrutura populacional", "pessoas", "população", "direct",
        dict(table="4709", variable="93", universe="População residente"), log=True, synonyms=["porte", "habitantes", "tamanho"]),
    ind("alfabetizacao_15mais_2022", "alfabetizacao", "Alfabetização (15+)", "Educação", "%", "presença de moradores alfabetizados", "direct",
        dict(table="9543", variable="2513", classes="c2/6794/c86/95251/c287/100362", universe="Pessoas de 15 anos ou mais"), synonyms=["leitura", "analfabetismo"]),
    ind("superior_completo_25mais_2022", "superior", "Superior completo (25+)", "Educação", "%", "presença de moradores com ensino superior", "direct",
        dict(table="10199", variable="1001643", classes="c1568/99713/c2/6794/c133/95278", universe="Pessoas de 25 anos ou mais"), synonyms=["faculdade", "universidade", "escolaridade"]),
    ind("cor_branca_pct_2022", "branca", "Cor ou raça branca", "Raça/cor", "%", "presença de moradores de cor ou raça branca", "direct",
        dict(table="9605", variable="1000093", classes="c86/2776", universe="População residente")),
    ind("cor_preta_pct_2022", "preta", "Cor ou raça preta", "Raça/cor", "%", "presença de moradores de cor ou raça preta", "direct",
        dict(table="9605", variable="1000093", classes="c86/2777", universe="População residente"), definition="Somente a categoria preta; não inclui parda.", synonyms=["negra"]),
    ind("cor_parda_pct_2022", "parda", "Cor ou raça parda", "Raça/cor", "%", "presença de moradores de cor ou raça parda", "direct",
        dict(table="9605", variable="1000093", classes="c86/2779", universe="População residente")),
    ind("religiao_catolica_pct_2022", "catolica", "Católicos (10+)", "Religião", "%", "presença católica", "direct",
        dict(table="9537", variable="1000140", classes="c133/95263/c2/6794/c58/95253", universe="Pessoas de 10 anos ou mais")),
    ind("religiao_evangelica_pct_2022", "evangelica", "Evangélicos (10+)", "Religião", "%", "presença evangélica", "direct",
        dict(table="9537", variable="1000140", classes="c133/95277/c2/6794/c58/95253", universe="Pessoas de 10 anos ou mais"), synonyms=["igreja", "protestante"]),
    ind("sem_religiao_pct_2022", "semreligiao", "Sem religião (10+)", "Religião", "%", "presença de moradores sem religião", "direct",
        dict(table="9537", variable="1000140", classes="c133/2836/c2/6794/c58/95253", universe="Pessoas de 10 anos ou mais")),
    ind("idade_mediana_2022", "idade", "Idade mediana", "Estrutura populacional", "anos", "idade mediana", "direct",
        dict(table="9756", variable="10613", classes="c86/95251", universe="População residente"), synonyms=["envelhecimento"]),
    ind("urbanizacao_pct_2022", "urbanizacao", "População urbana", "Território", "%", "presença de moradores em áreas urbanas", "direct",
        dict(table="9923", variable="1000093", classes="c1/1", universe="População residente"), synonyms=["cidade", "rural"]),
]
# ---------- 1. Estrutura populacional ----------
P += [
    ind("pop_0_14_pct_2022", "jovens014", "Crianças e adolescentes (0–14)", "Estrutura populacional", "%", "presença de crianças e adolescentes", "ratio", r9514(AGE_0_14), synonyms=["criancas", "infancia"]),
    ind("pop_15_29_pct_2022", "jovens1529", "Jovens (15–29)", "Estrutura populacional", "%", "presença de jovens de 15 a 29 anos", "ratio", r9514(AGE_15_29), synonyms=["juventude"]),
    ind("pop_30_59_pct_2022", "adultos3059", "Adultos (30–59)", "Estrutura populacional", "%", "presença de adultos de 30 a 59 anos", "ratio", r9514(AGE_30_59)),
    ind("pop_60mais_pct_2022", "idosos60", "Idosos (60+)", "Estrutura populacional", "%", "presença de idosos", "ratio", r9514(AGE_60), synonyms=["terceira idade", "velhice", "aposentados"]),
    ind("pop_65mais_pct_2022", "idosos65", "Pessoas de 65+", "Estrutura populacional", "%", "presença de moradores de 65 anos ou mais", "ratio", r9514(AGE_65)),
    ind("pop_80mais_pct_2022", "idosos80", "Pessoas de 80+", "Estrutura populacional", "%", "presença de moradores de 80 anos ou mais", "ratio", r9514(AGE_80), synonyms=["longevos"]),
    ind("razao_dependencia_2022", "dependencia", "Razão de dependência", "Estrutura populacional", "por 100", "razão de dependência", "ratio",
        r9514(AGE_0_14 + AGE_65, AGE_15_64), pct=False, definition="(0–14 + 65+) por 100 pessoas de 15–64 anos; pode passar de 100.",
        formula="100 × (0–14 + 65+) ÷ (15–64), t9514/v93/c287 grupos quinquenais"),
    ind("mulheres_pct_2022", "mulheres", "Mulheres na população", "Estrutura populacional", "%", "presença de mulheres", "ratio",
        dict(table="9514", variable="93", classes="c287/100362/c286/113635", cls="c2", num=[5], den=[6794], universe="População residente"), synonyms=["sexo", "genero", "homens"]),
    ind("indice_envelhecimento_2022", "envelhecimento", "Índice de envelhecimento", "Estrutura populacional", "por 100", "índice de envelhecimento", "direct",
        dict(table="9515", variable="10612", universe="População residente"), pct=False, definition="Pessoas de 60+ por 100 de 0–14 anos (IBGE); pode passar de 100."),
    ind("razao_sexo_2022", "razaosexo", "Razão de sexo", "Estrutura populacional", "por 100", "razão de sexo", "direct",
        dict(table="9515", variable="8845", universe="População residente"), pct=False, definition="Homens por 100 mulheres."),
    ind("densidade_2022", "densidade", "Densidade demográfica", "Território", "hab/km²", "densidade demográfica", "direct",
        dict(table="4714", variable="614", universe="População residente / área"), log=True, pct=False),
    ind("crescimento_pop_2010_2022", "crescimento", "Crescimento populacional 2010–2022", "Estrutura populacional", "% a.a.", "crescimento populacional", "direct",
        dict(table="4709", variable="10605", universe="População residente (2010 compatibilizada)"), pct=False,
        definition="Taxa geométrica anual entre 2010 (geografia compatibilizada pelo IBGE) e 2022; pode ser negativa."),
]
# ---------- 2. Renda ----------
R10296 = dict(table="10296", variable="13604", classes="c2/6794/c86/95251", cls="c386", den=[9680],
              universe="Moradores em domicílios particulares permanentes ocupados",
              partition=[9681, 9682, 9683, 9684, 9685, 9686, 9687, 9688, 9689, 9690, 9692])
P += [
    ind("renda_domiciliar_pc_mediana_2022", "rendamediana", "Renda domiciliar per capita (mediana)", "Renda e desigualdade", "R$", "renda mediana", "direct",
        dict(table="10295", variable="13534", universe="Moradores em domicílios particulares permanentes ocupados"), log=True, synonyms=["renda tipica"]),
    ind("renda_sem_rendimento_pct_2022", "semrenda", "Moradores sem rendimento domiciliar", "Renda e desigualdade", "%", "presença de moradores em domicílios sem rendimento", "ratio",
        dict(R10296, num=[9692]), definition="Classe 'sem rendimento' da renda domiciliar per capita."),
    ind("renda_ate_meio_sm_pct_2022", "rendabaixa", "Renda per capita de até ½ salário mínimo", "Renda e desigualdade", "%", "presença de moradores com renda de até meio salário mínimo", "ratio",
        dict(R10296, num=[9681, 9682]), synonyms=["pobreza", "baixa renda"],
        definition="Classes 'até 1/4' e 'mais de 1/4 a 1/2 salário mínimo' per capita; exclui 'sem rendimento'. Faixa de salário mínimo, não linha oficial de pobreza."),
    ind("renda_mais_5sm_pct_2022", "rendaalta", "Renda per capita acima de 5 salários mínimos", "Renda e desigualdade", "%", "presença de moradores com renda acima de 5 salários mínimos", "ratio",
        dict(R10296, num=[9687, 9688, 9689, 9690]), synonyms=["ricos", "alta renda"]),
    ind("renda_trabalho_participacao_2022", "rendatrabalho", "Peso do trabalho na renda domiciliar", "Renda e desigualdade", "%", "participação do trabalho na renda", "direct",
        dict(table="10297", variable="13504", classes="c11308/79451", universe="Rendimento domiciliar dos moradores"), synonyms=["aposentadoria", "transferencias"],
        definition="Participação do rendimento de todos os trabalhos no rendimento domiciliar total; o restante vem de outras fontes (aposentadorias, programas sociais, aluguéis etc.)."),
    ind("rendimento_trabalho_medio_2022", "salariomedio", "Rendimento médio do trabalho", "Trabalho", "R$", "rendimento médio do trabalho", "direct",
        dict(table="10289", variable="13536", classes="c2/6794/c86/95251", universe="Ocupados de 14+ com rendimento de trabalho"), log=True, synonyms=["salario"]),
    ind("rendimento_trabalho_mediano_2022", "salariomediano", "Rendimento mediano do trabalho", "Trabalho", "R$", "rendimento mediano do trabalho", "direct",
        dict(table="10289", variable="13537", classes="c2/6794/c86/95251", universe="Ocupados de 14+ com rendimento de trabalho"), log=True),
]
# ---------- 3. Trabalho ----------
T9517 = dict(table="9517", variable="1641", classes="c2/6794/c86/95251/c1568/120704", cls="c629", universe="Pessoas de 14 anos ou mais")
T10261 = dict(table="10261", variable="4090", classes="c2/6794/c86/95251", cls="c11913", den=[96165], universe="Ocupados de 14 anos ou mais")
T10264 = dict(table="10264", variable="4090", classes="c2/6794/c86/95251", universe="Ocupados de 14 anos ou mais")
P += [
    ind("nivel_ocupacao_10mais_2022", "ocupacao", "Nível de ocupação (10+)", "Trabalho", "%", "nível de ocupação", "direct",
        dict(table="10268", variable="675", classes="c2/6794/c86/95251/c58/95253", universe="Pessoas de 10 anos ou mais"), synonyms=["emprego"]),
    ind("taxa_desocupacao_14mais_2022", "desocupacao", "Taxa de desocupação (14+)", "Trabalho", "%", "desocupação", "ratio",
        dict(T9517, num=[32446], den=[32386], universe="Força de trabalho de 14 anos ou mais"), synonyms=["desemprego"]),
    ind("taxa_participacao_14mais_2022", "participacao", "Participação na força de trabalho (14+)", "Trabalho", "%", "participação na força de trabalho", "ratio",
        dict(T9517, num=[32386], den=[32385])),
    ind("ocupados_com_carteira_pct_2022", "carteira", "Empregados com carteira", "Trabalho", "%", "presença de empregados com carteira", "ratio",
        dict(T10261, num=[31722, 79367, 79372, 79375]), synonyms=["formal", "clt"], definition="Setor privado, doméstico, público não estatutário e estatais com carteira assinada."),
    ind("ocupados_sem_carteira_pct_2022", "semcarteira", "Empregados sem carteira", "Trabalho", "%", "presença de empregados sem carteira", "ratio",
        dict(T10261, num=[31723, 79368, 79373, 79376]), synonyms=["informal"]),
    ind("conta_propria_pct_2022", "contapropria", "Trabalhadores por conta própria", "Trabalho", "%", "presença de trabalhadores por conta própria", "ratio",
        dict(T10261, num=[79378]), synonyms=["autonomo", "mei"]),
    ind("empregadores_pct_2022", "empregadores", "Empregadores", "Trabalho", "%", "presença de empregadores", "ratio", dict(T10261, num=[79377]), synonyms=["empresarios"]),
    ind("servidores_estatutarios_pct_2022", "estatutarios", "Servidores públicos estatutários", "Trabalho", "%", "presença de servidores estatutários", "ratio",
        dict(T10261, num=[79370]), synonyms=["funcionalismo"]),
    ind("contribui_previdencia_pct_2022", "previdencia", "Ocupados que contribuem à previdência", "Trabalho", "%", "contribuição previdenciária", "ratio",
        dict(T10264, classes="c2/6794/c86/95251/c12064/100971", cls="c526", num=[15350], den=[15349]), synonyms=["inss"]),
    ind("ocup_agropecuaria_pct_2022", "agro", "Ocupados qualificados da agropecuária", "Trabalho", "%", "presença de trabalhadores da agropecuária", "ratio",
        dict(T10264, classes="c2/6794/c86/95251/c526/15349", cls="c12064", num=[12635], den=[100971]), synonyms=["campo", "rural", "agricultura"],
        definition="Grande grupo de ocupação 6 (CBO-Domiciliar); não inclui ocupações elementares agrícolas."),
    ind("ocup_elementares_pct_2022", "elementares", "Ocupações elementares", "Trabalho", "%", "presença de ocupações elementares", "ratio",
        dict(T10264, classes="c2/6794/c86/95251/c526/15349", cls="c12064", num=[12638], den=[100971])),
    ind("ocup_dirigentes_profissionais_pct_2022", "profissionais", "Dirigentes e profissionais das ciências", "Trabalho", "%", "presença de dirigentes e profissionais de nível superior", "ratio",
        dict(T10264, classes="c2/6794/c86/95251/c526/15349", cls="c12064", num=[12630, 12631], den=[100971])),
    ind("trabalha_outro_municipio_pct_2022", "deslocamento", "Trabalha em outro município", "Mobilidade", "%", "presença de moradores que trabalham em outro município", "ratio",
        dict(table="10329", variable="13373", classes="c2/6794/c386/9680/c2087/79177", cls="c469", num=[12188], den=[79176],
             universe="Ocupados de 10+ em domicílios particulares"), synonyms=["pendular", "commuting"]),
]
# ---------- 4. Educação ----------
E10061 = dict(table="10061", variable="2667", classes="c58/95253/c2/6794/c86/95251", cls="c1568", den=[120704], universe="Pessoas de 18 anos ou mais")
FREQ = dict(table="10056", variable="3795")
P += [
    ind("anos_estudo_medio_2022", "anosestudo", "Média de anos de estudo (11+)", "Educação", "anos", "média de anos de estudo", "direct",
        dict(table="10062", variable="13285", classes="c58/95253/c2/6794/c86/95251", universe="Pessoas de 11 anos ou mais"), synonyms=["escolaridade"]),
    ind("sem_instrucao_fund_incompleto_18mais_2022", "fundincompleto", "Sem instrução ou fundamental incompleto (18+)", "Educação", "%", "presença de adultos sem o fundamental completo", "ratio",
        dict(E10061, num=[9493])),
    ind("medio_completo_ou_mais_18mais_2022", "mediocompleto", "Médio completo ou mais (18+)", "Educação", "%", "presença de adultos com ensino médio completo", "ratio",
        dict(E10061, num=[9495, 99713]), synonyms=["ensino medio"]),
    ind("freq_escolar_0_3_2022", "creche", "Frequência à creche (0–3)", "Educação", "%", "frequência à creche", "direct",
        dict(FREQ, classes="c58/99749/c2/6794/c86/95251", universe="Crianças de 0 a 3 anos"), definition="Taxa de frequência escolar bruta."),
    ind("freq_escolar_4_5_2022", "preescola", "Frequência à escola (4–5)", "Educação", "%", "frequência à pré-escola", "direct",
        dict(FREQ, classes="c58/47813/c2/6794/c86/95251", universe="Crianças de 4 e 5 anos")),
    ind("freq_escolar_15_17_2022", "freq1517", "Frequência à escola (15–17)", "Educação", "%", "frequência escolar de 15 a 17 anos", "direct",
        dict(FREQ, classes="c58/2792/c2/6794/c86/95251", universe="Pessoas de 15 a 17 anos")),
    ind("freq_escolar_18_24_2022", "freq1824", "Frequência à escola (18–24)", "Educação", "%", "frequência escolar de 18 a 24 anos", "direct",
        dict(FREQ, classes="c58/100052/c2/6794/c86/95251", universe="Pessoas de 18 a 24 anos"), synonyms=["universitarios"]),
]
# ---------- 5. Moradia ----------
OCC = dict(table="9929", variable="381", classes="c1986/73103/c1988/73108", cls="c63", den=[95826], universe="Domicílios particulares permanentes ocupados")
TOT_C63_C125 = "c63/95826/c125/2932"
P += [
    ind("domicilio_proprio_pct_2022", "proprio", "Domicílios próprios", "Moradia", "%", "presença de domicílios próprios", "ratio", dict(OCC, num=[73554]), synonyms=["casa propria"]),
    ind("domicilio_alugado_pct_2022", "aluguel", "Domicílios alugados", "Moradia", "%", "presença de domicílios alugados", "ratio", dict(OCC, num=[1055]), synonyms=["aluguel", "inquilinos"]),
    ind("domicilio_cedido_pct_2022", "cedido", "Domicílios cedidos ou emprestados", "Moradia", "%", "presença de domicílios cedidos", "ratio", dict(OCC, num=[73553])),
    ind("domicilio_apartamento_pct_2022", "apartamento", "Domicílios em apartamento", "Moradia", "%", "presença de apartamentos", "ratio",
        dict(table="6326", variable="381", cls="c125", num=[3247], den=[2932], universe="Domicílios particulares permanentes ocupados"), synonyms=["predio", "verticalizacao"]),
    ind("moradores_por_domicilio_2022", "moradores", "Média de moradores por domicílio", "Moradia", "pessoas", "média de moradores por domicílio", "direct",
        dict(table="4712", variable="5930", universe="Domicílios particulares permanentes ocupados"), pct=False),
    ind("domicilio_unipessoal_pct_2022", "unipessoal", "Domicílios com um só morador", "Famílias", "%", "presença de domicílios com um só morador", "ratio",
        dict(table="9880", variable="800", classes="c125/2932/c11561/100679/c12237/104570/c11562/72593", cls="c68", num=[1092], den=[9902],
             universe="Domicílios particulares (inclui improvisados)"), synonyms=["mora sozinho", "solteiros"]),
    ind("adensamento_3mais_dormitorio_pct_2022", "adensamento", "Mais de 3 moradores por dormitório", "Moradia", "%", "presença de domicílios com mais de três moradores por dormitório", "ratio",
        dict(table="9933", variable="381", classes=TOT_C63_C125, cls="c1975", num=[73090], den=[73086], universe="Domicílios particulares permanentes ocupados"), synonyms=["superlotacao"]),
    ind("paredes_alvenaria_revestida_pct_2022", "alvenaria", "Paredes de alvenaria com revestimento", "Moradia", "%", "presença de casas de alvenaria com revestimento", "ratio",
        dict(table="9928", variable="381", classes=TOT_C63_C125, cls="c137", num=[73073], den=[13233], universe="Domicílios particulares permanentes ocupados")),
]
# ---------- 6. Saneamento ----------
DPPO = "Domicílios particulares permanentes ocupados"
P += [
    ind("agua_rede_geral_pct_2022", "agua", "Água da rede geral como principal", "Saneamento", "%", "presença de domicílios abastecidos pela rede geral", "ratio",
        dict(table="6803", variable="381", cls="c1821", num=[72144], den=[72129], universe=DPPO), synonyms=["abastecimento"]),
    ind("agua_canalizada_dentro_pct_2022", "aguacanalizada", "Água canalizada dentro de casa", "Saneamento", "%", "presença de domicílios com água canalizada dentro de casa", "ratio",
        dict(table="6804", variable="381", classes="c301/72053", cls="c1817", num=[72126], den=[72125], universe=DPPO)),
    ind("esgoto_rede_ou_fossa_ligada_pct_2022", "esgoto", "Esgoto por rede geral, pluvial ou fossa ligada", "Saneamento", "%", "presença de domicílios ligados à rede de esgoto", "ratio",
        dict(table="6805", variable="381", cls="c11558", num=[46290], den=[46292], universe=DPPO), synonyms=["saneamento basico"]),
    ind("fossa_rudimentar_pct_2022", "fossa", "Fossa rudimentar ou buraco", "Saneamento", "%", "presença de domicílios com fossa rudimentar", "ratio",
        dict(table="6805", variable="381", cls="c11558", num=[72113], den=[46292], universe=DPPO)),
    ind("sem_banheiro_pct_2022", "sembanheiro", "Sem banheiro nem sanitário", "Saneamento", "%", "presença de domicílios sem banheiro", "ratio",
        dict(table="6806", variable="381", classes="c11558/46292", cls="c458", num=[12046], den=[72117], universe=DPPO)),
    ind("banheiro_exclusivo_pct_2022", "banheiro", "Com banheiro de uso exclusivo", "Saneamento", "%", "presença de domicílios com banheiro próprio", "ratio",
        dict(table="6806", variable="381", classes="c11558/46292", cls="c458", num=[12032], den=[72117], universe=DPPO)),
    ind("lixo_coletado_pct_2022", "lixo", "Lixo coletado", "Saneamento", "%", "presença de domicílios com coleta de lixo", "ratio",
        dict(table="6892", variable="381", cls="c67", num=[2520], den=[10972], universe=DPPO), synonyms=["coleta"]),
    ind("lixo_queimado_pct_2022", "lixoqueimado", "Lixo queimado na propriedade", "Saneamento", "%", "presença de domicílios que queimam o lixo", "ratio",
        dict(table="6892", variable="381", cls="c67", num=[72122], den=[10972], universe=DPPO)),
]
# ---------- 7. Famílias ----------
P += [
    ind("responsavel_mulher_pct_2022", "chefiafeminina", "Domicílios com mulher responsável", "Famílias", "%", "presença de domicílios chefiados por mulheres", "ratio",
        dict(table="9880", variable="800", classes="c125/2932/c68/9902/c12237/104570/c11562/72593", cls="c11561", num=[100681], den=[100679],
             universe="Domicílios particulares"), synonyms=["chefia feminina", "mulheres responsaveis"]),
    ind("domicilio_sem_conjuge_pct_2022", "semconjuge", "Domicílios sem cônjuge do responsável", "Famílias", "%", "presença de domicílios sem cônjuge", "ratio",
        dict(table="9881", variable="800", cls="c1885", num=[72602], den=[72599], universe="Domicílios particulares")),
    ind("monoparental_pct_2022", "monoparental", "Responsável sem cônjuge, com filhos", "Famílias", "%", "presença de domicílios monoparentais", "ratio",
        dict(table="9882", variable="800", classes="c11561/100679", cls="c1887", num=[72607], den=[72603], universe="Domicílios particulares"), synonyms=["mae solo", "pai solo"]),
    ind("casal_sem_filhos_pct_2022", "casalsemfilhos", "Casal sem filhos", "Famílias", "%", "presença de casais sem filhos", "ratio",
        dict(table="9882", variable="800", classes="c11561/100679", cls="c1887", num=[72604], den=[72603], universe="Domicílios particulares")),
    ind("vive_em_uniao_10mais_pct_2022", "uniao", "Vivem em união conjugal (10+)", "Famílias", "%", "presença de moradores que vivem em união", "ratio",
        dict(table="10183", variable="140", classes="c2/6794/c58/95253/c133/95278", cls="c464", num=[12108], den=[50292], universe="Pessoas de 10 anos ou mais"), synonyms=["casados"]),
    ind("filhos_por_mulher_12mais_2022", "filhos", "Média de filhos tidos por mulher (12+)", "Fecundidade", "filhos", "média de filhos por mulher", "varratio",
        dict(table="10078", classes="c12232/58896/c1568/120704/c12293/58898", numVar="13316", denVar="13315", scale=1, universe="Mulheres de 12 anos ou mais"), pct=False,
        definition="Filhos nascidos vivos ÷ mulheres de 12+; não é taxa de fecundidade total.", synonyms=["fecundidade", "natalidade"]),
]
# ---------- 8. Migração ----------
P += [
    ind("nascidos_outra_uf_pct_2022", "migrantes", "Nascidos fora da UF de residência", "Migração", "%", "presença de moradores nascidos em outro estado", "other_uf",
        dict(table="631", variable="93", classes="c2/0", cls="c183", total=0, nodecl=3283, ufCategory=UF_BIRTH, universe="População residente"), synonyms=["migracao", "nordestinos"],
        definition="Inclui nascidos em outro estado e no exterior; exclui sem declaração do numerador."),
    ind("estrangeiros_naturalizados_pct_2022", "estrangeiros", "Estrangeiros e naturalizados", "Migração", "%", "presença de estrangeiros e naturalizados", "ratio",
        dict(table="10157", variable="93", classes="c2/6794/c58/95253", cls="c302", num=[6832, 6833], den=[77794], universe="População residente"), synonyms=["imigrantes"]),
]
# ---------- 9. Território ----------
P += [
    ind("favela_pct_2022", "favela", "Moradores em favelas e comunidades urbanas", "Território", "%", "presença de moradores em favelas", "xratio",
        dict(num=dict(table="9884", variable="9612", classes="c86/95251/c2/6794/c58/95253"), den=dict(table="4709", variable="93"), universe="População residente (universo)"),
        synonyms=["comunidades", "periferia"], definition="Municípios sem favela publicada aparecem como ausentes, não como zero, a menos que o IBGE publique '-'."),
    ind("unidades_conservacao_pct_2022", "conservacao", "Moradores em Unidades de Conservação", "Território", "%", "presença de moradores em unidades de conservação", "ratio",
        dict(table="10211", variable="93", classes="c1/6795", cls="c2661", num=[50581], den=[32776], universe="População residente")),
    ind("cor_indigena_pct_2022", "indigena", "Cor ou raça indígena", "Raça/cor", "%", "presença de moradores de cor ou raça indígena", "direct",
        dict(table="9605", variable="1000093", classes="c86/2780", universe="População residente"), definition="Quesito cor ou raça; não equivale à população indígena por pertencimento étnico."),
    ind("cor_amarela_pct_2022", "amarela", "Cor ou raça amarela", "Raça/cor", "%", "presença de moradores de cor ou raça amarela", "direct",
        dict(table="9605", variable="1000093", classes="c86/2778", universe="População residente")),
]
# ---------- 10. Deficiência ----------
P += [
    ind("deficiencia_2mais_pct_2022", "deficiencia", "Pessoas com deficiência (2+)", "Deficiência", "%", "presença de pessoas com deficiência", "direct",
        dict(table="10125", variable="13403", classes="c2/6794/c58/95253", universe="Pessoas de 2 anos ou mais"), definition="Definição censitária por dificuldade funcional (Grupo de Washington)."),
    ind("autismo_pct_2022", "autismo", "Diagnóstico de autismo declarado", "Deficiência", "%", "presença de diagnóstico declarado de autismo", "direct",
        dict(table="10145", variable="13408", classes="c2/6794/c58/95253", universe="População residente"), definition="Diagnóstico de TEA declarado por profissional de saúde; não é prevalência clínica."),
]
# ---------- 11. Acesso digital / bens ----------
P += [
    ind("internet_domicilio_pct_2022", "internet", "Domicílios com internet", "Acesso digital e bens", "%", "presença de domicílios com internet", "ratio",
        dict(table="9936", variable="381", classes=TOT_C63_C125, cls="c2072", num=[77585], den=[77584], universe=DPPO), synonyms=["conectividade", "wifi"]),
    ind("maquina_lavar_pct_2022", "maquinalavar", "Domicílios com máquina de lavar", "Acesso digital e bens", "%", "presença de domicílios com máquina de lavar", "ratio",
        dict(table="9935", variable="381", classes=TOT_C63_C125, cls="c1977", num=[73092], den=[73091], universe=DPPO), synonyms=["bens duraveis"]),
]
# ---------- 12. Economia local (PIB dos Municípios 2021) ----------
PIB = dict(table="5938", denVar="498", scale=100, universe="Valor adicionado bruto municipal")
PIBSRC = "IBGE PIB dos Municípios 2021"
for id_, alias, label, topic, v, syn in [
    ("vab_agropecuaria_pct_2021", "pibagro", "Agropecuária no valor adicionado", "peso da agropecuária na economia", "513", ["agronegocio"]),
    ("vab_industria_pct_2021", "pibindustria", "Indústria no valor adicionado", "peso da indústria na economia", "517", ["fabricas"]),
    ("vab_servicos_pct_2021", "pibservicos", "Serviços no valor adicionado", "peso dos serviços na economia", "6575", ["comercio"]),
    ("vab_adm_publica_pct_2021", "pibpublico", "Administração pública no valor adicionado", "peso da administração pública na economia", "525", ["prefeitura", "estado"]),
]:
    P.append(ind(id_, alias, label, "Economia local", "%", topic, "varratio", dict(PIB, numVar=v), year=2021, source=PIBSRC, synonyms=syn,
                 definition="Participação no VAB total a preços correntes (VAB ≠ PIB; serviços excluem administração pública)."))

# ---------- planning list: verified unavailable / not imported ----------
PLANNED = [
    {"label": "Índice de Gini da renda domiciliar", "theme": "Renda e desigualdade", "status": "nao_publicado_municipio",
     "reason": "Nenhuma tabela do Censo 2022 no inventário N6 (api/v3/agregados?periodo=2022&nivel=N6) publica Gini; não estimamos Gini a partir de faixas."},
    {"label": "PIB per capita", "theme": "Economia local", "status": "nao_importado",
     "reason": "A tabela 5938 não traz PIB per capita; exige dividir pela estimativa populacional do mesmo ano (outra pesquisa)."},
    {"label": "Desocupação PNAD Contínua", "theme": "Trabalho", "status": "nao_publicado_municipio",
     "reason": "PNAD Contínua não é representativa por município; usamos a desocupação do Censo 2022."},
    {"label": "Migração recente entre UFs (5 anos)", "theme": "Migração", "status": "nao_importado",
     "reason": "Tabelas 10159/10160 não trazem denominador de 5+ anos na mesma tabela."},
    {"label": "População quilombola", "theme": "Território", "status": "nao_importado",
     "reason": "Publicada por localidades quilombolas; integração pendente de validação de cobertura municipal."},
    {"label": "IDHM", "theme": "Desenvolvimento", "status": "nao_importado", "reason": "Fonte PNUD/IPEA/FJP; último IDHM municipal é do Censo 2010."},
    {"label": "IDEB", "theme": "Educação", "status": "nao_importado", "reason": "Fonte INEP, fora do IBGE; não importado."},
]

if __name__ == "__main__":
    ids = [p["id"] for p in P]; aliases = [p["alias"] for p in P]
    assert len(set(ids)) == len(ids) and len(set(aliases)) == len(aliases), "duplicate id/alias"
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"version": "2026.10.4", "inventory": "https://servicodados.ibge.gov.br/api/v3/agregados?periodo=2022&nivel=N6",
                               "indicators": P, "planned": PLANNED}, ensure_ascii=False, indent=1) + "\n")
    print(len(P), "indicators,", len({p['theme'] for p in P}), "themes")
