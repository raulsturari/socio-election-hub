#!/usr/bin/env python3
"""
Brasil Data Lab — reproducible ingestion pipeline (official sources only).

Runs outside the web app. Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
(server-side only; never ship to the browser). Every run creates a row in
import_jobs with file hash, source Last-Modified, coverage and integrity
checks, and writes logs to import_job_logs. Re-running is idempotent
(upserts on natural keys; election results are replaced atomically per job).

Usage:
  python3 scripts/ingest/pipeline.py municipalities
  python3 scripts/ingest/pipeline.py tse-munzona /path/votacao_candidato_munzona_2022.zip
  python3 scripts/ingest/pipeline.py sidra
"""
from __future__ import annotations

import csv
import gzip
import hashlib
import io
import json
import os
import sys
import urllib.parse
import urllib.request
import zipfile
from collections import defaultdict
from email.utils import parsedate_to_datetime

PIPELINE_VERSION = "2026.10.1"
UA = {"User-Agent": "BrasilDataLab-ingest/1.0"}
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
        "methodology": "Censo Demográfico 2022, SIDRA tabela 10295, variável 13431. Moradores em domicílios particulares permanentes ocupados; valores nominais.",
    },
    {
        "id": "populacao_residente_2022",
        "name": "População residente",
        "unit": "pessoas",
        "table": "4709", "variable": "93", "period": "2022",
        "methodology": "Censo Demográfico 2022, SIDRA tabela 4709, variável 93.",
    },
]


# ---------- data API helpers (service role, server-side only) ----------
def rest(method: str, path: str, body=None, prefer: str = "return=minimal"):
    base, key = os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    req = urllib.request.Request(
        f"{base}/rest/v1/{path}", method=method,
        data=None if body is None else json.dumps(body).encode(),
        headers={"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json",
                 "Prefer": prefer},
    )
    with urllib.request.urlopen(req, timeout=300) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def select_all(path: str) -> list[dict]:
    """Offset pagination; callers MUST include a deterministic order= on a unique key."""
    out, step = [], 1000
    while True:
        sep = "&" if "?" in path else "?"
        page = rest("GET", f"{path}{sep}limit={step}&offset={len(out)}", prefer="")
        out += page
        if len(page) < step:
            return out


def upsert(table: str, rows: list[dict], on_conflict: str, batch: int = 5000) -> None:
    for i in range(0, len(rows), batch):
        rest("POST", f"{table}?on_conflict={on_conflict}", rows[i:i + batch],
             "resolution=merge-duplicates,return=minimal")


class Job:
    def __init__(self, source_id: str, kind: str, url: str, file_name=None, sha256=None, last_modified=None):
        self.id = rest("POST", "import_jobs", {
            "source_id": source_id, "kind": kind, "status": "running", "source_url": url,
            "file_name": file_name, "file_sha256": sha256, "source_last_modified": last_modified,
            "pipeline_version": PIPELINE_VERSION,
        }, "return=representation")[0]["id"]
        self.log("info", "job started", {"kind": kind})

    def log(self, level: str, message: str, context: dict | None = None) -> None:
        print(f"[{level}] {message} {json.dumps(context or {}, ensure_ascii=False)}")
        rest("POST", "import_job_logs", {"job_id": self.id, "level": level, "message": message,
                                         "context": context or {}})

    def finish(self, ok: bool, rows_read: int, rows_written: int, coverage: dict, integrity: dict, error=None):
        rest("PATCH", f"import_jobs?id=eq.{self.id}", {
            "status": "succeeded" if ok else "failed", "rows_read": rows_read, "rows_written": rows_written,
            "coverage": coverage, "integrity": integrity, "error": error, "finished_at": "now()",
        })
        self.log("info" if ok else "error", "job finished", {"ok": ok})


def fetch(url: str) -> tuple[bytes, str | None]:
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300) as r:
        lm = r.headers.get("Last-Modified")
        body = r.read()
        if body[:2] == b"\x1f\x8b":  # IBGE APIs may gzip regardless of Accept-Encoding
            body = gzip.decompress(body)
        return body, (parsedate_to_datetime(lm).isoformat() if lm else None)


def head_last_modified(url: str) -> str | None:
    with urllib.request.urlopen(urllib.request.Request(url, method="HEAD", headers=UA), timeout=60) as r:
        lm = r.headers.get("Last-Modified")
        return parsedate_to_datetime(lm).isoformat() if lm else None


def ensure_sources() -> None:
    upsert("data_sources", [
        {"id": "TSE", "name": "TSE — Portal de Dados Abertos", "url": "https://dadosabertos.tse.jus.br/dataset/resultados-2022",
         "description": "Resultados eleitorais oficiais (votacao_candidato_munzona)"},
        {"id": "IBGE_LOCALIDADES", "name": "IBGE — API de Localidades", "url": IBGE_MUNICIPIOS_URL,
         "description": "Cadastro oficial de municípios (código de 7 dígitos)"},
        {"id": "TSE_IBGE_MAP", "name": "Correspondência TSE↔IBGE (betafcc/Municipios-Brasileiros-TSE)", "url": TSE_IBGE_MAP_URL,
         "description": "Tabela comunitária; cada linha é validada contra código e UF da API do IBGE"},
        {"id": "IBGE_SIDRA", "name": "IBGE SIDRA", "url": "https://sidra.ibge.gov.br",
         "description": "Indicadores municipais do Censo 2022"},
    ], "id")


# ---------- municipalities ----------
def import_municipalities() -> None:
    ensure_sources()
    raw, lm = fetch(IBGE_MUNICIPIOS_URL)
    job = Job("IBGE_LOCALIDADES", "municipalities", IBGE_MUNICIPIOS_URL, "municipios.json",
              hashlib.sha256(raw).hexdigest(), lm)
    ibge = {}
    for m in json.loads(raw):
        uf = ((m.get("microrregiao") or {}).get("mesorregiao") or {}).get("UF", {}).get("sigla") \
            or ((m.get("regiao-imediata") or {}).get("regiao-intermediaria") or {}).get("UF", {}).get("sigla")
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

    rows = [{"ibge_code": c, "tse_code": tse_by_ibge.get(c), "name": n, "uf": uf, "is_capital": c in capitals}
            for c, (n, uf) in ibge.items()]
    upsert("municipalities", rows, "ibge_code")
    unmapped = [c for c in ibge if c not in tse_by_ibge]
    job.finish(True, len(ibge), len(rows),
               {"ibge_municipalities": len(ibge), "with_tse_code": len(tse_by_ibge), "without_tse_code": len(unmapped)},
               {"rejected_mapping_rows": len(rejected), "unmapped_ibge_codes": unmapped[:50],
                "mapping_source_last_modified": map_lm})


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


def _parse_tse(job: Job, zip_path: str, year: int, office: str):
    tse_to_ibge = {m["tse_code"]: m["ibge_code"]
                   for m in select_all("municipalities?select=tse_code,ibge_code&tse_code=not.is.null&order=ibge_code")}
    zf = zipfile.ZipFile(zip_path)
    member = next(n for n in zf.namelist() if n.endswith(f"_{year}_BR.csv"))
    job.log("info", "reading member", {"member": member})
    p = {"zone": defaultdict(int), "cands": {}, "file": defaultdict(int), "ext": defaultdict(int),
         "unmapped": defaultdict(int), "dates": {}, "rows": 0}
    with zf.open(member) as fh:
        reader = csv.DictReader(io.TextIOWrapper(fh, encoding="latin-1"), delimiter=";")
        vote_col = "QT_VOTOS_NOMINAIS_VALIDOS" if "QT_VOTOS_NOMINAIS_VALIDOS" in reader.fieldnames else "QT_VOTOS_NOMINAIS"
        for r in reader:
            if r["DS_CARGO"].strip().lower() != office.lower():
                continue
            p["rows"] += 1
            rnd, votes, num = int(r["NR_TURNO"]), int(r[vote_col]), int(r["NR_CANDIDATO"])
            p["cands"][num] = (r["NM_URNA_CANDIDATO"].strip(), r["SG_PARTIDO"].strip())
            p["dates"][rnd] = r["DT_ELEICAO"]
            p["file"][rnd] += votes
            if r["SG_UF"] == "ZZ":
                p["ext"][rnd] += votes
                continue
            ibge = tse_to_ibge.get(int(r["CD_MUNICIPIO"]))
            if ibge is None:
                p["unmapped"][int(r["CD_MUNICIPIO"])] += votes
                continue
            p["zone"][(rnd, ibge, int(r["NR_ZONA"]), num)] += votes
    job.log("info", "file parsed", {"rows": p["rows"], "vote_column": vote_col, "exterior_excluded": dict(p["ext"])})
    for code, v in p["unmapped"].items():
        job.log("warn", "TSE municipality without IBGE mapping", {"tse_code": code, "votes": v})
    return p


def _run_tse(job: Job, zip_path: str, year: int, office: str) -> None:
    p = _parse_tse(job, zip_path, year, office)
    label = office.upper()
    d2iso = lambda d: f"{d[6:10]}-{d[3:5]}-{d[0:2]}"
    upsert("elections", [{"year": year, "round": r, "office": label, "election_date": d2iso(d),
                          "validated": False, "import_job_id": job.id} for r, d in p["dates"].items()],
           "year,round,office")
    upsert("candidates", [{"year": year, "office": label, "number": n, "ballot_name": nm, "party": pt}
                          for n, (nm, pt) in p["cands"].items()], "year,office,number")
    elections = {e["round"]: e["id"] for e in select_all(f"elections?select=id,round&year=eq.{year}&office=eq.{label}")}
    cands = {c["number"]: c["id"] for c in select_all(f"candidates?select=id,number&year=eq.{year}&office=eq.{label}")}

    ids = ",".join(str(i) for i in elections.values())
    rest("DELETE", f"municipal_results?election_id=in.({ids})")
    rest("DELETE", f"zone_results?election_id=in.({ids})")

    zone_rows = [{"election_id": elections[r], "ibge_code": m, "zone": z, "candidate_id": cands[n],
                  "votes": v, "import_job_id": job.id} for (r, m, z, n), v in p["zone"].items()]
    upsert("zone_results", zone_rows, "election_id,ibge_code,zone,candidate_id")

    # Deterministic aggregation zone → municipality.
    mun_votes, mun_zones, mun_valid = defaultdict(int), defaultdict(set), defaultdict(int)
    for (r, m, z, n), v in p["zone"].items():
        mun_votes[(r, m, n)] += v
        mun_zones[(r, m)].add(z)
        mun_valid[(r, m)] += v
    upsert("municipal_results", [
        {"election_id": elections[r], "ibge_code": m, "candidate_id": cands[n], "votes": v,
         "valid_votes": mun_valid[(r, m)], "zones_count": len(mun_zones[(r, m)]), "import_job_id": job.id}
        for (r, m, n), v in mun_votes.items()], "election_id,ibge_code,candidate_id")

    # Reconciliation, re-read from the database: file − exterior − unmapped = Σ zones = Σ municipalities.
    checks, ok = {}, not p["unmapped"]
    for rnd, eid in sorted(elections.items()):
        zsum = sum(x["votes"] for x in select_all(f"zone_results?select=votes&election_id=eq.{eid}&order=ibge_code,zone,candidate_id"))
        mrows = select_all(f"municipal_results?select=votes,ibge_code&election_id=eq.{eid}&order=ibge_code,candidate_id")
        msum = sum(x["votes"] for x in mrows)
        expected = p["file"][rnd] - p["ext"][rnd] - sum(p["unmapped"].values())
        rok = zsum == msum == expected
        ok &= rok
        checks[f"round_{rnd}"] = {"file_total_nominal": p["file"][rnd], "exterior_excluded": p["ext"][rnd],
                                  "expected_domestic": expected, "zone_sum": zsum, "municipal_sum": msum,
                                  "municipalities": len({x["ibge_code"] for x in mrows}), "reconciled": rok}
    if ok:
        rest("PATCH", f"elections?year=eq.{year}&office=eq.{label}", {"validated": True})
    job.finish(ok, p["rows"], len(zone_rows),
               {"year": year, "office": label, "rounds": sorted(elections),
                "municipalities": checks.get("round_1", {}).get("municipalities"),
                "excludes": "votos no exterior (UF ZZ); brancos e nulos não constam deste arquivo"},
               {**checks, "unmapped_tse_codes": len(p["unmapped"])},
               None if ok else "reconciliation failed — election left unvalidated")


# ---------- SIDRA ----------
def import_sidra() -> None:
    ensure_sources()
    valid = {m["ibge_code"] for m in select_all("municipalities?select=ibge_code&order=ibge_code")}
    for ind in SIDRA_INDICATORS:
        url = f"https://apisidra.ibge.gov.br/values/t/{ind['table']}/n6/all/v/{ind['variable']}/p/{ind['period']}"
        raw, lm = fetch(url)
        job = Job("IBGE_SIDRA", f"sidra_{ind['table']}_{ind['variable']}", url, None, hashlib.sha256(raw).hexdigest(), lm)
        data = json.loads(raw)[1:]  # first row is the header
        upsert("indicators", [{"id": ind["id"], "name": ind["name"], "unit": ind["unit"], "source_id": "IBGE_SIDRA",
                               "source_table": ind["table"], "source_variable": ind["variable"],
                               "methodology": ind["methodology"]}], "id")
        rows, missing, unknown = [], 0, 0
        for d in data:
            if d["D1C"] not in valid:
                unknown += 1
                continue
            try:
                val = float(d["V"])
            except ValueError:  # SIDRA uses '-', '...', 'X' for unavailable / suppressed
                missing += 1
                val = None
            rows.append({"indicator_id": ind["id"], "ibge_code": d["D1C"], "year": int(ind["period"]),
                         "value": val, "import_job_id": job.id})
        upsert("indicator_values", rows, "indicator_id,ibge_code,year")
        job.finish(True, len(data), len(rows),
                   {"year": int(ind["period"]), "municipalities": len(rows), "table": ind["table"], "variable": ind["variable"]},
                   {"values_unavailable": missing, "unknown_codes": unknown, "expected_municipalities": len(valid),
                    "dimension_rows_in_response": sorted({d.get("D2N", "") for d in data})[:5]})


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "municipalities":
        import_municipalities()
    elif cmd == "sidra":
        import_sidra()
    elif cmd == "tse-munzona" and len(sys.argv) > 2:
        import_tse_munzona(sys.argv[2])
    else:
        print(__doc__)
        sys.exit(1)
