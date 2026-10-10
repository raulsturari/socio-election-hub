#!/usr/bin/env python3
"""
Brasil Data Lab — reproducible ingestion pipeline (official sources only).

Runs outside the web app (needs network + a privileged Postgres connection via
standard PG* env vars). Every run creates a row in import_jobs with file hash,
source Last-Modified, coverage and integrity checks, and writes logs to
import_job_logs. Re-running is idempotent (upserts on natural keys).

Usage:
  python3 scripts/ingest/pipeline.py municipalities
  python3 scripts/ingest/pipeline.py tse-munzona /path/votacao_candidato_munzona_2022.zip
  python3 scripts/ingest/pipeline.py sidra
"""
from __future__ import annotations

import csv
import hashlib
import io
import json
import subprocess
import sys
import tempfile
import urllib.request
import zipfile
from collections import defaultdict
from email.utils import parsedate_to_datetime

PIPELINE_VERSION = "2026.10.1"
IBGE_MUNICIPIOS_URL = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios"
TSE_IBGE_MAP_URL = "https://raw.githubusercontent.com/betafcc/Municipios-Brasileiros-TSE/master/municipios_brasileiros_tse.csv"
TSE_MUNZONA_URL = "https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2022.zip"

# SIDRA indicators: table / variable / period explicitly documented.
SIDRA_INDICATORS = [
    {
        "id": "renda_domiciliar_pc_media_2022",
        "name": "Rendimento nominal médio mensal domiciliar per capita",
        "unit": "R$",
        "table": "10295", "variable": "13431", "period": "2022",
        "methodology": "Censo Demográfico 2022, SIDRA tabela 10295, variável 13431. Moradores em domicílios particulares permanentes ocupados; valores nominais de 2022.",
    },
    {
        "id": "populacao_residente_2022",
        "name": "População residente",
        "unit": "pessoas",
        "table": "4709", "variable": "93", "period": "2022",
        "methodology": "Censo Demográfico 2022, SIDRA tabela 4709, variável 93.",
    },
]


# ---------- db helpers ----------
def sql_literal(v) -> str:
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, (dict, list)):
        v = json.dumps(v, ensure_ascii=False)
    return "'" + str(v).replace("'", "''") + "'"


def psql(sql: str) -> str:
    res = subprocess.run(
        ["psql", "-v", "ON_ERROR_STOP=1", "-X", "-q", "-t", "-A", "-f", "-"],
        input=sql, capture_output=True, text=True,
    )
    if res.returncode != 0:
        raise RuntimeError(res.stderr.strip())
    return res.stdout.strip()


def copy_rows(table: str, columns: list[str], rows: list[tuple]) -> str:
    """Return a psql \\copy block loading rows into a temp staging table."""
    tmp = tempfile.NamedTemporaryFile("w", delete=False, suffix=".csv", newline="", encoding="utf-8")
    csv.writer(tmp).writerows(rows)
    tmp.close()
    return f"\\copy {table} ({', '.join(columns)}) FROM '{tmp.name}' WITH (FORMAT csv)\n"


class Job:
    def __init__(self, source_id: str, kind: str, url: str, file_name: str | None = None,
                 sha256: str | None = None, last_modified: str | None = None):
        self.id = psql(
            "INSERT INTO import_jobs (source_id, kind, status, source_url, file_name, file_sha256, "
            "source_last_modified, pipeline_version) VALUES ("
            f"{sql_literal(source_id)}, {sql_literal(kind)}, 'running', {sql_literal(url)}, "
            f"{sql_literal(file_name)}, {sql_literal(sha256)}, {sql_literal(last_modified)}, "
            f"{sql_literal(PIPELINE_VERSION)}) RETURNING id;"
        ).splitlines()[0]
        self.log("info", "job started", {"kind": kind})

    def log(self, level: str, message: str, context: dict | None = None) -> None:
        print(f"[{level}] {message} {json.dumps(context or {}, ensure_ascii=False)}")
        psql(
            "INSERT INTO import_job_logs (job_id, level, message, context) VALUES ("
            f"{sql_literal(self.id)}, {sql_literal(level)}, {sql_literal(message)}, "
            f"{sql_literal(context or {})}::jsonb);"
        )

    def finish(self, ok: bool, rows_read: int, rows_written: int, coverage: dict, integrity: dict,
               error: str | None = None) -> None:
        psql(
            "UPDATE import_jobs SET "
            f"status = {sql_literal('succeeded' if ok else 'failed')}, rows_read = {rows_read}, "
            f"rows_written = {rows_written}, coverage = {sql_literal(coverage)}::jsonb, "
            f"integrity = {sql_literal(integrity)}::jsonb, error = {sql_literal(error)}, "
            f"finished_at = now() WHERE id = {sql_literal(self.id)};"
        )
        self.log("info" if ok else "error", "job finished", {"ok": ok})


def fetch(url: str) -> tuple[bytes, str | None]:
    req = urllib.request.Request(url, headers={"User-Agent": "BrasilDataLab-ingest/1.0"})
    with urllib.request.urlopen(req, timeout=300) as r:
        lm = r.headers.get("Last-Modified")
        return r.read(), (parsedate_to_datetime(lm).isoformat() if lm else None)


def head_last_modified(url: str) -> str | None:
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "BrasilDataLab-ingest/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        lm = r.headers.get("Last-Modified")
        return parsedate_to_datetime(lm).isoformat() if lm else None


def ensure_sources() -> None:
    sources = [
        ("TSE", "TSE — Portal de Dados Abertos", "https://dadosabertos.tse.jus.br", "Resultados eleitorais oficiais"),
        ("IBGE_LOCALIDADES", "IBGE — API de Localidades", IBGE_MUNICIPIOS_URL, "Cadastro oficial de municípios (código de 7 dígitos)"),
        ("TSE_IBGE_MAP", "Tabela de correspondência TSE↔IBGE (betafcc/Municipios-Brasileiros-TSE)", TSE_IBGE_MAP_URL, "Correspondência comunitária, validada contra a API do IBGE durante a importação"),
        ("IBGE_SIDRA", "IBGE SIDRA", "https://sidra.ibge.gov.br", "Indicadores municipais (Censo 2022)"),
    ]
    values = ",".join(f"({', '.join(sql_literal(x) for x in s)})" for s in sources)
    psql(f"INSERT INTO data_sources (id, name, url, description) VALUES {values} "
         "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, url = EXCLUDED.url, description = EXCLUDED.description;")


# ---------- municipalities ----------
def import_municipalities() -> None:
    ensure_sources()
    raw, lm = fetch(IBGE_MUNICIPIOS_URL)
    job = Job("IBGE_LOCALIDADES", "municipalities", IBGE_MUNICIPIOS_URL, "municipios.json",
              hashlib.sha256(raw).hexdigest(), lm)
    ibge = {}
    for m in json.loads(raw):
        uf = (m.get("microrregiao") or {}).get("mesorregiao", {}).get("UF", {}).get("sigla") \
            or (m.get("regiao-imediata") or {}).get("regiao-intermediaria", {}).get("UF", {}).get("sigla")
        ibge[str(m["id"])] = (m["nome"], uf)

    map_raw, map_lm = fetch(TSE_IBGE_MAP_URL)
    mapping = list(csv.DictReader(io.StringIO(map_raw.decode("utf-8"))))
    job.log("info", "mapping file loaded", {"rows": len(mapping), "sha256": hashlib.sha256(map_raw).hexdigest()})

    tse_by_ibge, capitals, rejected = {}, set(), []
    for r in mapping:
        code = r["codigo_ibge"].strip()
        if code not in ibge or ibge[code][1] != r["uf"].strip():
            rejected.append({"tse": r["codigo_tse"], "ibge": code, "uf": r["uf"]})
            continue
        tse_by_ibge[code] = int(r["codigo_tse"])
        if r["capital"].strip() == "1":
            capitals.add(code)
    for rj in rejected:
        job.log("warn", "mapping row rejected (IBGE code/UF mismatch)", rj)

    rows = [(code, tse_by_ibge.get(code), name, uf, code in capitals) for code, (name, uf) in ibge.items()]
    script = "BEGIN;\nCREATE TEMP TABLE stg (ibge_code text, tse_code int, name text, uf text, is_capital boolean);\n"
    script += copy_rows("stg", ["ibge_code", "tse_code", "name", "uf", "is_capital"], rows)
    script += ("INSERT INTO municipalities (ibge_code, tse_code, name, uf, is_capital) SELECT * FROM stg "
               "ON CONFLICT (ibge_code) DO UPDATE SET tse_code = EXCLUDED.tse_code, name = EXCLUDED.name, "
               "uf = EXCLUDED.uf, is_capital = EXCLUDED.is_capital;\nCOMMIT;\n")
    psql(script)
    unmapped = [c for c in ibge if c not in tse_by_ibge]
    coverage = {"ibge_municipalities": len(ibge), "with_tse_code": len(tse_by_ibge), "without_tse_code": len(unmapped)}
    integrity = {"rejected_mapping_rows": len(rejected), "unmapped_ibge_codes": unmapped[:50],
                 "mapping_source_last_modified": map_lm}
    job.finish(True, len(ibge), len(rows), coverage, integrity)


# ---------- TSE votacao_candidato_munzona ----------
def import_tse_munzona(zip_path: str, year: int = 2022, office: str = "Presidente") -> None:
    ensure_sources()
    h = hashlib.sha256()
    with open(zip_path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    job = Job("TSE", f"votacao_candidato_munzona_{year}_{office.lower()}", TSE_MUNZONA_URL,
              zip_path.rsplit("/", 1)[-1], h.hexdigest(), head_last_modified(TSE_MUNZONA_URL))
    try:
        _run_tse(job, zip_path, year, office)
    except Exception as exc:  # noqa: BLE001 — recorded on the job, then re-raised
        job.finish(False, 0, 0, {}, {}, str(exc)[:2000])
        raise


def _run_tse(job: Job, zip_path: str, year: int, office: str) -> None:
    tse_to_ibge = dict(
        (int(a), b) for a, b in (l.split("|") for l in psql(
            "SELECT tse_code, ibge_code FROM municipalities WHERE tse_code IS NOT NULL;").splitlines())
    )
    zf = zipfile.ZipFile(zip_path)
    member = next(n for n in zf.namelist() if n.endswith(f"_{year}_BR.csv"))
    job.log("info", "reading member", {"member": member})

    zone_votes: dict[tuple, int] = defaultdict(int)
    candidates: dict[int, tuple[str, str]] = {}
    file_totals: dict[int, int] = defaultdict(int)
    exterior: dict[int, int] = defaultdict(int)
    unmapped: dict[int, int] = defaultdict(int)
    dates: dict[int, str] = {}
    rows_read = 0
    with zf.open(member) as fh:
        reader = csv.DictReader(io.TextIOWrapper(fh, encoding="latin-1"), delimiter=";")
        vote_col = "QT_VOTOS_NOMINAIS_VALIDOS" if "QT_VOTOS_NOMINAIS_VALIDOS" in reader.fieldnames else "QT_VOTOS_NOMINAIS"
        for r in reader:
            if r["DS_CARGO"].strip().lower() != office.lower():
                continue
            rows_read += 1
            rnd, votes = int(r["NR_TURNO"]), int(r[vote_col])
            num = int(r["NR_CANDIDATO"])
            candidates[num] = (r["NM_URNA_CANDIDATO"].strip(), r["SG_PARTIDO"].strip())
            dates[rnd] = r["DT_ELEICAO"]
            file_totals[rnd] += votes
            if r["SG_UF"] == "ZZ":
                exterior[rnd] += votes
                continue
            ibge = tse_to_ibge.get(int(r["CD_MUNICIPIO"]))
            if ibge is None:
                unmapped[int(r["CD_MUNICIPIO"])] += votes
                continue
            zone_votes[(rnd, ibge, int(r["NR_ZONA"]), num)] += votes
    job.log("info", "file parsed", {"rows": rows_read, "vote_column": vote_col,
                                    "exterior_votes_excluded": dict(exterior)})
    for code, v in unmapped.items():
        job.log("warn", "TSE municipality without IBGE mapping", {"tse_code": code, "votes": v})

    office_label = office.upper()
    cand_rows = [(year, office_label, n, nm, p) for n, (nm, p) in candidates.items()]
    elec_sql = ",".join(
        f"({year}, {rnd}, {sql_literal(office_label)}, to_date({sql_literal(d)}, 'DD/MM/YYYY'), false, {sql_literal(job.id)})"
        for rnd, d in dates.items())
    script = "BEGIN;\n"
    script += (f"INSERT INTO elections (year, round, office, election_date, validated, import_job_id) VALUES {elec_sql} "
               "ON CONFLICT (year, round, office) DO UPDATE SET election_date = EXCLUDED.election_date, "
               "import_job_id = EXCLUDED.import_job_id, validated = false;\n")
    script += "CREATE TEMP TABLE stg_c (year smallint, office text, number int, ballot_name text, party text);\n"
    script += copy_rows("stg_c", ["year", "office", "number", "ballot_name", "party"], cand_rows)
    script += ("INSERT INTO candidates (year, office, number, ballot_name, party) SELECT * FROM stg_c "
               "ON CONFLICT (year, office, number) DO UPDATE SET ballot_name = EXCLUDED.ballot_name, party = EXCLUDED.party;\n")
    script += "CREATE TEMP TABLE stg_z (round smallint, ibge_code text, zone int, number int, votes int);\n"
    script += copy_rows("stg_z", ["round", "ibge_code", "zone", "number", "votes"],
                        [(k[0], k[1], k[2], k[3], v) for k, v in zone_votes.items()])
    script += f"""
DELETE FROM municipal_results WHERE election_id IN (SELECT id FROM elections WHERE year={year} AND office={sql_literal(office_label)});
DELETE FROM zone_results WHERE election_id IN (SELECT id FROM elections WHERE year={year} AND office={sql_literal(office_label)});
INSERT INTO zone_results (election_id, ibge_code, zone, candidate_id, votes, import_job_id)
SELECT e.id, s.ibge_code, s.zone, c.id, s.votes, {sql_literal(job.id)}
FROM stg_z s
JOIN elections e ON e.year={year} AND e.round=s.round AND e.office={sql_literal(office_label)}
JOIN candidates c ON c.year={year} AND c.office={sql_literal(office_label)} AND c.number=s.number;
INSERT INTO municipal_results (election_id, ibge_code, candidate_id, votes, valid_votes, zones_count, import_job_id)
SELECT z.election_id, z.ibge_code, z.candidate_id, sum(z.votes),
       sum(sum(z.votes)) OVER (PARTITION BY z.election_id, z.ibge_code), count(DISTINCT z.zone), {sql_literal(job.id)}
FROM zone_results z JOIN elections e ON e.id = z.election_id
WHERE e.year={year} AND e.office={sql_literal(office_label)}
GROUP BY z.election_id, z.ibge_code, z.candidate_id;
COMMIT;
"""
    psql(script)

    # ---- reconciliation: file → zone → municipality, per round ----
    checks, ok = {}, True
    for rnd in sorted(dates):
        out = psql(f"""
SELECT (SELECT coalesce(sum(z.votes),0) FROM zone_results z JOIN elections e ON e.id=z.election_id
        WHERE e.year={year} AND e.round={rnd} AND e.office={sql_literal(office_label)}),
       (SELECT coalesce(sum(r.votes),0) FROM municipal_results r JOIN elections e ON e.id=r.election_id
        WHERE e.year={year} AND e.round={rnd} AND e.office={sql_literal(office_label)}),
       (SELECT count(DISTINCT r.ibge_code) FROM municipal_results r JOIN elections e ON e.id=r.election_id
        WHERE e.year={year} AND e.round={rnd} AND e.office={sql_literal(office_label)});""")
        zone_sum, mun_sum, mun_count = (int(x) for x in out.split("|"))
        expected = file_totals[rnd] - exterior[rnd] - sum(unmapped.values())
        round_ok = zone_sum == mun_sum == expected
        ok &= round_ok
        checks[f"round_{rnd}"] = {
            "file_total_nominal": file_totals[rnd], "exterior_excluded": exterior[rnd],
            "expected_domestic": expected, "zone_sum": zone_sum, "municipal_sum": mun_sum,
            "municipalities": mun_count, "reconciled": round_ok,
        }
    ok &= not unmapped
    if ok:
        psql(f"UPDATE elections SET validated = true WHERE year={year} AND office={sql_literal(office_label)};")
    coverage = {"year": year, "office": office_label, "rounds": sorted(dates),
                "municipalities_round_1": checks.get("round_1", {}).get("municipalities"),
                "excludes": "votos no exterior (UF ZZ)"}
    job.finish(ok, rows_read, len(zone_votes), coverage, {**checks, "unmapped_tse_codes": len(unmapped)},
               None if ok else "reconciliation failed — election left unvalidated")


# ---------- SIDRA ----------
def import_sidra() -> None:
    ensure_sources()
    valid = set(psql("SELECT ibge_code FROM municipalities;").splitlines())
    for ind in SIDRA_INDICATORS:
        url = (f"https://apisidra.ibge.gov.br/values/t/{ind['table']}/n6/all/v/{ind['variable']}"
               f"/p/{ind['period']}?formato=json")
        raw, lm = fetch(url)
        job = Job("IBGE_SIDRA", f"sidra_{ind['table']}_{ind['variable']}", url, None,
                  hashlib.sha256(raw).hexdigest(), lm)
        data = json.loads(raw)[1:]  # first row is the header
        rows, missing, unknown = [], 0, 0
        for d in data:
            code, val = d["D1C"], d["V"]
            if code not in valid:
                unknown += 1
                continue
            try:
                num = float(val)
            except ValueError:  # SIDRA uses '-', '...', 'X' for unavailable/suppressed
                missing += 1
                num = None
            rows.append((ind["id"], code, int(ind["period"]), num))
        psql(
            "INSERT INTO indicators (id, name, unit, source_id, source_table, source_variable, methodology) VALUES ("
            + ", ".join(sql_literal(x) for x in (ind["id"], ind["name"], ind["unit"], "IBGE_SIDRA",
                                                 ind["table"], ind["variable"], ind["methodology"]))
            + ") ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, unit=EXCLUDED.unit, "
              "methodology=EXCLUDED.methodology, source_table=EXCLUDED.source_table, source_variable=EXCLUDED.source_variable;"
        )
        script = "BEGIN;\nCREATE TEMP TABLE stg (indicator_id text, ibge_code text, year smallint, value numeric);\n"
        script += copy_rows("stg", ["indicator_id", "ibge_code", "year", "value"], rows)
        script += (f"INSERT INTO indicator_values (indicator_id, ibge_code, year, value, import_job_id) "
                   f"SELECT indicator_id, ibge_code, year, value, {sql_literal(job.id)} FROM stg "
                   "ON CONFLICT (indicator_id, ibge_code, year) DO UPDATE SET value = EXCLUDED.value, "
                   "import_job_id = EXCLUDED.import_job_id;\nCOMMIT;\n")
        psql(script)
        job.finish(True, len(data), len(rows),
                   {"year": int(ind["period"]), "municipalities": len(rows), "table": ind["table"], "variable": ind["variable"]},
                   {"values_unavailable": missing, "unknown_codes": unknown, "expected_municipalities": len(valid)})


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "municipalities":
        import_municipalities()
    elif cmd == "tse-munzona":
        import_tse_munzona(sys.argv[2])
    elif cmd == "sidra":
        import_sidra()
    else:
        print(__doc__)
        sys.exit(1)
