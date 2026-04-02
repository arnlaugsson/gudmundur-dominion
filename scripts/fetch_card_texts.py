#!/usr/bin/env python3
"""
Fetch card text descriptions from the Dominion Strategy Wiki for all cards
in dominion_data.json. Saves to data/card_texts.json.

Usage:
    python3 scripts/fetch_card_texts.py
"""

import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data" / "dominion_data.json"
OUTPUT_FILE = ROOT / "data" / "card_texts.json"

WIKI_API = "https://wiki.dominionstrategy.com/api.php"


def fetch_wikitext(title):
    """Fetch raw wikitext for a page from the Dominion Strategy Wiki."""
    params = urllib.parse.urlencode({
        "action": "query",
        "titles": title.replace(" ", "_"),
        "prop": "revisions",
        "rvprop": "content",
        "format": "json",
    })
    url = f"{WIKI_API}?{params}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "DominionClubBot/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        pages = data.get("query", {}).get("pages", {})
        for page_id, page in pages.items():
            if page_id == "-1":
                return None
            revisions = page.get("revisions", [])
            if revisions:
                return revisions[0].get("*", "")
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        return None
    return None


def extract_card_text(wikitext):
    """Extract the card text from wikitext infobox template."""
    if not wikitext:
        return None

    # Look for |text = ... in the Card infobox
    # The text field can span multiple lines until the next |field or }}
    match = re.search(
        r"\|\s*text\s*=\s*(.*?)(?=\n\s*\||\n\}\})",
        wikitext,
        re.DOTALL,
    )
    if not match:
        return None

    text = match.group(1).strip()
    if not text:
        return None

    # Clean up wiki markup
    # Remove HTML tags
    text = re.sub(r"<[^>]+>", "", text)
    # Convert wiki links [[Page|display]] -> display, [[Page]] -> Page
    text = re.sub(r"\[\[[^\]]*\|([^\]]+)\]\]", r"\1", text)
    text = re.sub(r"\[\[([^\]]+)\]\]", r"\1", text)
    # Remove templates like {{Cost|5}} -> $5, {{Debt|4}} -> 4D
    text = re.sub(r"\{\{[Cc]ost\|(\d+)\}\}", r"$\1", text)
    text = re.sub(r"\{\{[Dd]ebt\|(\d+)\}\}", r"\1D", text)
    text = re.sub(r"\{\{[Pp]otion\}\}", "P", text)
    # Remove remaining templates {{...}}
    text = re.sub(r"\{\{[^}]*\}\}", "", text)
    # Clean up whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = text.strip()
    # Remove leading/trailing dashes used as dividers
    text = re.sub(r"^[-─—]+\s*", "", text)

    return text if text else None


def main():
    with open(DATA_FILE, encoding="utf-8") as f:
        data = json.load(f)

    card_names = [c["name"] for c in data["cards"]]
    print(f"Fetching text for {len(card_names)} cards...")

    # Load existing texts to avoid re-fetching
    existing = {}
    if OUTPUT_FILE.exists():
        with open(OUTPUT_FILE, encoding="utf-8") as f:
            existing = json.load(f)
        print(f"Loaded {len(existing)} existing texts")

    texts = dict(existing)
    fetched = 0
    skipped = 0
    failed = 0

    for i, name in enumerate(card_names):
        if name in texts:
            skipped += 1
            continue

        wikitext = fetch_wikitext(name)
        card_text = extract_card_text(wikitext)

        if card_text:
            texts[name] = card_text
            fetched += 1
        else:
            # Try with common name variants
            for variant in [name.replace("'", "'"), name.replace("'", "'")]:
                if variant != name:
                    wikitext = fetch_wikitext(variant)
                    card_text = extract_card_text(wikitext)
                    if card_text:
                        texts[name] = card_text
                        fetched += 1
                        break
            else:
                failed += 1

        if (i + 1) % 25 == 0:
            print(f"  Progress: {i + 1}/{len(card_names)} (fetched={fetched}, skipped={skipped}, failed={failed})")
            # Save progress
            with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
                json.dump(texts, f, ensure_ascii=False, indent=2)
                f.write("\n")

        # Rate limit: be polite to the wiki
        time.sleep(0.3)

    # Final save
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(texts, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"\nDone! Fetched={fetched}, Skipped={skipped}, Failed={failed}")
    print(f"Total texts: {len(texts)}")
    print(f"Saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
