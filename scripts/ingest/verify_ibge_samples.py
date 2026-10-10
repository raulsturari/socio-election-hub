#!/usr/bin/env python3
"""
Independent check: for 5 municipalities (one per region) re-query SIDRA live, per
municipality (different request shape than the importer, no cache), recompute each
indicator and compare with the database. Writes reports/ibge-sample-check.json.
"""
import json
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from ibge_catalog import parse_value  # noqa: E402
from pipeline import select_all  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
SAMPLE = {"1302603": "Manaus/AM", "2611606": "Recife/PE", "3106200": "Belo Horizonte/MG", "4314902": "Porto Alegre/RS", "5208707": "Goiânia/GO"}
UF = {"1302603": "AM", "2611606": "PE", "3106200": "MG", "4314902": "RS", "5208707": "GO"}


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "BrasilDataLab-verify/1.0"}), timeout=120) as r:
        rows = json.loads(r.read())
    return rows


def vals(table, variables, period, classes, muni, cls=None):
    u = f"https://apisidra.ibge.gov.br/values/t/{table}/n6/{muni}/v/{variables}/p/{period}" + (f"/{classes}" if classes else "") + (f"/{cls}/all" if cls else "")
    rows = get(u)
    h = rows[0]
    ck = None
    if cls:
        ck = next(k for k in h if k.startswith("D") and k.endswith("C") and k not in ("D1C", "D2C", "D3C") and len({r[k] for r in rows[1:]}) > 1)
    vk = next(k for k, v in h.items() if k.startswith("D") and k.endswith("C") and v.startswith("Variável"))
    return {(r[vk], r[ck] if ck else None): parse_value(r["V"])[0] for r in rows[1:]}


def recompute(ind, muni):
    s, p = ind["spec"], str(ind["year"])
    if ind["kind"] == "direct":
        return next(iter(vals(s["table"], s["variable"], p, s.get("classes"), muni).values()))
    if ind["kind"] == "varratio":
        v = vals(s["table"], f"{s['numVar']},{s['denVar']}", p, s.get("classes"), muni)
        return s.get("scale", 100) * v[(s["numVar"], None)] / v[(s["denVar"], None)]
    if ind["kind"] == "xratio":
        n = next(iter(vals(s["num"]["table"], s["num"]["variable"], p, s["num"].get("classes"), muni).values()))
        d = next(iter(vals(s["den"]["table"], s["den"]["variable"], p, s["den"].get("classes"), muni).values()))
        return None if n is None else 100 * n / d
    v = vals(s["table"], s["variable"], p, s.get("classes"), muni, s["cls"])
    by = {int(k[1]): x for k, x in v.items()}
    if ind["kind"] == "other_uf":
        t = by[s["total"]]
        return 100 * (t - by[s["ufCategory"][UF[muni]]] - by[s["nodecl"]]) / t
    return s.get("scale", 100) * sum(by[c] for c in s["num"]) / sum(by[c] for c in s["den"])


def main():
    m = json.loads((ROOT / "src/data/ibge-indicators.json").read_text())
    out, mismatches = [], 0
    for ind in m["indicators"]:
        db = {r["ibge_code"]: r["value"] for r in select_all(
            f"indicator_values?select=ibge_code,value&indicator_id=eq.{ind['id']}&ibge_code=in.({','.join(SAMPLE)})&order=ibge_code")}
        for muni, label in SAMPLE.items():
            try:
                ref = recompute(ind, muni)
            except Exception as e:  # record, never hide
                out.append({"indicator": ind["id"], "municipality": label, "error": str(e)[:120]}); mismatches += 1; continue
            got = db.get(muni)
            ok = (ref is None and got is None) or (ref is not None and got is not None and abs(float(got) - ref) <= 1e-4 * max(1, abs(ref)))
            mismatches += not ok
            out.append({"indicator": ind["id"], "municipality": label, "db": got, "recomputed": None if ref is None else round(ref, 6), "ok": ok})
        print(ind["id"], all(r.get("ok") for r in out if r["indicator"] == ind["id"]), flush=True)
    (ROOT / "reports/ibge-sample-check.json").write_text(json.dumps({"municipalities": SAMPLE, "checks": len(out), "mismatches": mismatches, "results": out}, ensure_ascii=False, indent=1) + "\n")
    print("checks", len(out), "mismatches", mismatches)


if __name__ == "__main__":
    main()
