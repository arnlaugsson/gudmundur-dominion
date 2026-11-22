"""Low-level cell readers shared by the sheet parsers."""

import datetime

# Cell text that means "nothing here".
PLACEHOLDERS = frozenset({"", "x"})


def read_cell(ws, row, col):
    """Read a cell value, returning None for empty-ish values."""
    val = ws.cell(row=row, column=col).value
    if val is None:
        return None
    if isinstance(val, str):
        stripped = val.strip()
        if stripped.lower() in PLACEHOLDERS:
            return None
        return stripped
    return val


def read_string_cell(ws, row, col):
    """Read a cell as a string, returning None for empty/placeholder values."""
    val = read_cell(ws, row, col)
    return val if isinstance(val, str) else None


def is_number(val):
    """True for int/float cell values (datetimes and bools excluded)."""
    return isinstance(val, (int, float)) and not isinstance(val, bool)


def is_valid_place(val):
    """Check if a cell value is a valid place number (not a datetime)."""
    if isinstance(val, datetime.datetime):
        return False
    return is_number(val)


def normalize_date(raw):
    """Convert date string like '2025.10.17' or '2025.10.17.' to 'YYYY-MM-DD'."""
    if raw is None:
        return None
    if isinstance(raw, datetime.datetime):
        return raw.strftime("%Y-%m-%d")
    s = str(raw).strip().rstrip(".")
    if not s:
        return None
    parts = s.split(".")
    if len(parts) == 3:
        return f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"
    return s


def block_rows(rng):
    """Turn an inclusive (start, end) block into a row range, or [] if absent."""
    if not rng:
        return []
    return range(rng[0], rng[1] + 1)
