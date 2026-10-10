"""SIDRA conventional symbols: '-' is absolute zero; '..', '...', 'X' are absence/suppression.
Run: python3 tests/ingest/test_sidra_parse.py"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts/ingest"))
from ibge_catalog import parse_value  # noqa: E402

assert parse_value("-") == (0.0, "zero")
assert parse_value("...") == (None, "suppressed")
assert parse_value("..") == (None, "suppressed")
assert parse_value("X") == (None, "suppressed")
assert parse_value(None) == (None, "suppressed")
assert parse_value("12.5") == (12.5, "ok")
assert parse_value("-227726") == (-227726.0, "ok")  # negative VAB is a real value, range-checked later
assert parse_value("abc") == (None, "invalid")
print("sidra parser: 8 checks passed")
