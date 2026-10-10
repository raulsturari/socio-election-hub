#!/usr/bin/env python3
"""
Catalog-driven IBGE SIDRA importer (municipal level N6).

Reads src/data/ibge-indicators.json (built by build_ibge_manifest.py), downloads each
table once per distinct URL (disk cache + SHA-256), computes one value per
indicator/municipality, validates and upserts into indicators / indicator_values with
one import_jobs row per indicator and logs in import_job_logs.

SIDRA special symbols (https://sidra.ibge.gov.br/ — "Sinais convencionais"):
  "-"   zero absoluto, não resultante de arredondamento      -> 0
  ".."  não se aplica dado numérico                          -> NULL
  "..." dado numérico não disponível                         -> NULL
  "X"   dado numérico omitido (sigilo)                       -> NULL
Usage:
  python3 scripts/ingest/ibge_catalog.py [indicator_id ...]   # default: all
  python3 scripts/ingest/ibge_catalog.py --report             # write report only
"""
from __future__ import annotations

import gzip
import hashlib
import json
import sys
import time
import urllib.request
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from pipeline import Job, ensure_sources, rest, select_all, upsert  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "src/data/ibge-indicators.json"
CACHE = Path("/tmp/sidra-cache")
API = "https://apisidra.ibge.gov.br/values"
PIPELINE_VERSION = "ibge-catalog-2026.10.4"
ZERO, MISSING = {"-"}, {"..", "...", "X", ""}


def parse_value(raw: str | None) -> tuple[float | None, str]:
    """Returns (value, status) — status in ok|zero|suppressed|invalid."""
    if raw is None:
        return None, "suppressed"
    s = raw.strip()
    if s in ZERO:
        return 0.0, "zero"
    if s in MISSING:
        return None, "suppressed"
    try:
        return float(s), "ok"
    except ValueError:
        return None, "invalid"


def fetch_json(url: str, attempts: int = 5) -> tuple[list, str]:
    CACHE.mkdir(exist_ok=True)
    path = CACHE / (hashlib.sha256(url.encode()).hexdigest() + ".json")
    if path.exists():
        raw = path.read_bytes()
    else:
        for i in range(attempts):
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "BrasilDataLab/1.0"}), timeout=240) as r:
                    raw = r.read()
                if raw[:2] == b"\x1f\x8b":
                    raw = gzip.decompress(raw)
                json.loads(raw)
                break
            except Exception as e:  # network or SIDRA throttling: exponential backoff
                if i == attempts - 1:
                    raise RuntimeError(f"SIDRA falhou após {attempts} tentativas: {url}: {e}") from e
                time.sleep(2 ** i * 3)
        path.write_bytes(raw)
    return json.loads(raw), hashlib.sha256(raw).hexdigest()


def url_for(table: str, variables: str, period: str, classes: str | None, extra: str | None = None) -> str:
    u = f"{API}/t/{table}/n6/all/v/{variables}/p/{period}"
    for part in (classes, extra):
        if part:
            u += "/" + part
    return u


def cells(rows: list, cat_key: str | None) -> dict:
    """Map (ibge, variable, category) -> raw V."""
    header = rows[0]
    var_key = next(k for k, v in header.items() if k.startswith("D") and k.endswith("C") and v.startswith("Variável"))
    return {(r["D1C"], r[var_key], r[cat_key] if cat_key else None): r["V"] for r in rows[1:]}


def class_key(rows: list, wanted: set[str]) -> str:
    """The dimension column of the varying classification: several distinct codes, containing the wanted ones."""
    keys = [k for k in rows[0] if k.startswith("D") and k.endswith("C") and k not in ("D1C",)]
    for k in keys:
        vals = {r.get(k) for r in rows[1:2000]}
        if len(vals) > 1 and wanted & vals and not rows[0][k].startswith(("Variável", "Ano")):
            return k
    raise RuntimeError("classificação variável não encontrada na resposta")


def compute(ind: dict, uf_of: dict[str, str]) -> tuple[dict[str, tuple[float | None, str]], list[str], dict]:
    s, kind, period = ind["spec"], ind["kind"], str(ind["year"])
    integrity: dict = {}
    if kind == "direct":
        u = url_for(s["table"], s["variable"], period, s.get("classes"))
        rows, sha = fetch_json(u)
        c = cells(rows, None)
        return {k[0]: parse_value(v) for k, v in c.items()}, [u], {"sha256": [sha]}
    if kind in ("ratio", "other_uf"):
        cls = s["cls"]
        cat_ids = sorted({s["total"], s["nodecl"], *s["ufCategory"].values()} if kind == "other_uf"
                         else set(s["num"] + s["den"] + s.get("partition", [])))
        # SIDRA caps a response at 50 000 values: request ≤8 categories × 5 571 municipalities at a time
        rows, shas, urls_ = [], [], []
        for i in range(0, len(cat_ids), 8):
            u = url_for(s["table"], s["variable"], period, s.get("classes"), f"{cls}/" + ",".join(map(str, cat_ids[i:i + 8])))
            part, sh = fetch_json(u)
            rows = part if not rows else rows + part[1:]
            shas.append(sh); urls_.append(u)
        u, sha = urls_[0], shas[0]
        wanted = {str(x) for x in s.get("num", []) + s.get("den", [])} or {str(s["total"]), str(s["nodecl"])}
        c = cells(rows, class_key(rows, wanted))
        by = defaultdict(dict)
        for (code, _var, cat), v in c.items():
            by[code][int(cat)] = v
        out, worst = {}, 0.0
        for code, vals in by.items():
            parsed = {k: parse_value(v) for k, v in vals.items()}
            if kind == "other_uf":
                uf = uf_of.get(code)
                tot, own, nod = (parsed.get(x, (None, "suppressed")) for x in (s["total"], s["ufCategory"].get(uf or "", -1), s["nodecl"]))
                if None in (tot[0], own[0]) or nod[0] is None:
                    out[code] = (None, "suppressed"); continue
                out[code] = (None, "den_zero") if tot[0] == 0 else (100 * (tot[0] - own[0] - nod[0]) / tot[0], "ok")
                continue
            num = [parsed.get(x, (None, "suppressed"))[0] for x in s["num"]]
            den = [parsed.get(x, (None, "suppressed"))[0] for x in s["den"]]
            if any(v is None for v in num + den):
                out[code] = (None, "suppressed"); continue
            if sum(den) == 0:
                out[code] = (None, "den_zero"); continue
            out[code] = (s.get("scale", 100) * sum(num) / sum(den), "ok")
            if s.get("partition") and len(s["den"]) == 1:
                part = [parsed.get(x, (None, ""))[0] for x in s["partition"]]
                if all(p is not None for p in part):
                    worst = max(worst, abs(sum(part) - den[0]) / den[0])
        if s.get("partition"):
            integrity["partition_max_relative_gap"] = round(worst, 6)
        integrity["sha256"] = shas
        return out, urls_, integrity
    if kind == "varratio":
        u = url_for(s["table"], f"{s['numVar']},{s['denVar']}", period, s.get("classes"))
        rows, sha = fetch_json(u)
        c = cells(rows, None)
        out = {}
        for code in {k[0] for k in c}:
            n, d = parse_value(c.get((code, s["numVar"], None))), parse_value(c.get((code, s["denVar"], None)))
            out[code] = (None, "suppressed") if n[0] is None or d[0] is None else (None, "den_zero") if d[0] == 0 else (s.get("scale", 100) * n[0] / d[0], "ok")
        return out, [u], {"sha256": [sha]}
    if kind == "xratio":
        un = url_for(s["num"]["table"], s["num"]["variable"], period, s["num"].get("classes"))
        ud = url_for(s["den"]["table"], s["den"]["variable"], period, s["den"].get("classes"))
        (rn, shn), (rd, shd) = fetch_json(un), fetch_json(ud)
        cn, cd = cells(rn, None), cells(rd, None)
        nmap, dmap = {k[0]: parse_value(v) for k, v in cn.items()}, {k[0]: parse_value(v) for k, v in cd.items()}
        out = {}
        for code, d in dmap.items():
            n = nmap.get(code)
            if n is None or n[0] is None or d[0] is None:
                out[code] = (None, "suppressed"); continue
            out[code] = (None, "den_zero") if d[0] == 0 else (s.get("scale", 100) * n[0] / d[0], "ok")
        return out, [un, ud], {"sha256": [shn, shd], "num_rows": len(nmap)}
    raise ValueError(kind)


def run(only: set[str] | None) -> list[dict]:
    manifest = json.loads(MANIFEST.read_text())
    ensure_sources()
    rest("POST", "data_sources?on_conflict=id", [{"id": "IBGE_PIB_MUN", "name": "IBGE — PIB dos Municípios", "url": "https://sidra.ibge.gov.br/tabela/5938",
                                                  "description": "Produto Interno Bruto dos Municípios, valores correntes"}], "resolution=merge-duplicates,return=minimal")
    munis = select_all("municipalities?select=ibge_code,uf&order=ibge_code")
    valid = {m["ibge_code"]: m["uf"] for m in munis if m["uf"] != "ZZ"}
    results = []
    for ind in manifest["indicators"]:
        if only and ind["id"] not in only:
            continue
        before = rest("GET", f"indicator_values?select=ibge_code,value&indicator_id=eq.{ind['id']}&limit=10000", prefer="")
        prev = {r["ibge_code"]: r["value"] for r in before or []}
        values, urls, integrity = compute(ind, valid)
        job = Job("IBGE_PIB_MUN" if ind["spec"].get("table") == "5938" else "IBGE_SIDRA", f"ibge_catalog_{ind['id']}", urls[0], None,
                  integrity["sha256"][0], None)
        counts = defaultdict(int)
        rows, bad = [], []
        unknown = 0
        for code, (v, st) in values.items():
            if code not in valid:
                unknown += 1; continue
            if v is not None and (v != v or (ind["percentBounded"] and (v < -1e-9 or v > 100 + 1e-9))):
                bad.append(code); v, st = None, "invalid"
            counts[st] += 1
            rows.append({"indicator_id": ind["id"], "ibge_code": code, "year": ind["year"], "value": None if v is None else round(v, 6), "import_job_id": job.id})
        absent = sorted(set(valid) - set(values))
        upsert("indicators", [{"id": ind["id"], "name": ind["name"], "unit": ind["unit"],
                               "source_id": "IBGE_PIB_MUN" if ind["spec"].get("table") == "5938" else "IBGE_SIDRA",
                               "source_table": ind["spec"].get("table") or f"{ind['spec']['num']['table']}+{ind['spec']['den']['table']}",
                               "source_variable": ind["spec"].get("variable") or ind["spec"].get("numVar") or ind["spec"]["num"]["variable"],
                               "methodology": f"{ind['source']}. {ind['formula']}. Universo: {ind['universe']}. {ind['definition']}".strip()}], "id")
        # replace whole indicator for this year: delete stale rows only after new rows are ready
        upsert("indicator_values", rows, "indicator_id,ibge_code,year")
        changed = sum(1 for r in rows if r["ibge_code"] in prev and _differs(prev[r["ibge_code"]], r["value"]))
        nonnull = sum(1 for r in rows if r["value"] is not None)
        diff = {"rows_before": len(prev), "rows_after": len(rows), "values_changed": changed,
                "null_to_value": sum(1 for r in rows if prev.get(r["ibge_code"], 0) is None and r["value"] is not None)}
        if bad:
            job.log("warning", "valores fora do intervalo 0–100 descartados", {"count": len(bad), "examples": bad[:5]})
        if absent:
            job.log("warning", "municípios sem linha na resposta SIDRA (ficam ausentes, não zero)", {"count": len(absent), "examples": absent[:5]})
        ok = nonnull >= 0.95 * len(valid) - 1 or ind["id"] in ("favela_pct_2022",)
        status = dict(counts)
        job.finish(ok, len(values), len(rows), {"year": ind["year"], "municipalities_nonnull": nonnull, "expected": len(valid), "absent": len(absent)},
                   {**integrity, "status_counts": status, "unknown_codes": unknown, "out_of_range": len(bad), "diff": diff, "urls": urls,
                    "pipeline": PIPELINE_VERSION}, None if ok else "cobertura abaixo de 95%")
        results.append({"id": ind["id"], "alias": ind["alias"], "theme": ind["theme"], "year": ind["year"], "kind": ind["kind"],
                        "nonnull": nonnull, "expected": len(valid), "status": status, "absent": len(absent), "diff": diff,
                        "integrity": {k: v for k, v in integrity.items() if k != "sha256"}, "sha256": integrity["sha256"], "urls": urls, "ok": ok})
        print(f"{ind['id']}: {nonnull}/{len(valid)} {status} diff={diff}", flush=True)
    return results


def _differs(a, b) -> bool:
    if a is None or b is None:
        return (a is None) != (b is None)
    return abs(float(a) - float(b)) > 1e-6


if __name__ == "__main__":
    out = run(set(sys.argv[1:]) or None)
    p = ROOT / "reports/ibge-import-results.json"
    p.parent.mkdir(exist_ok=True)
    prev = json.loads(p.read_text()) if p.exists() else {}
    prev.update({r["id"]: r for r in out})
    p.write_text(json.dumps(prev, ensure_ascii=False, indent=1) + "\n")
