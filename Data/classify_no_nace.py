"""
Classifica i prospect senza settore NACE usando Claude API.
Aggiorna IMPORT_blaklader_NEW.csv con i settori trovati.

USO:
    ANTHROPIC_API_KEY=sk-ant-... python3 classify_no_nace.py

    oppure esporta la variabile prima di lanciare:
    export ANTHROPIC_API_KEY=sk-ant-...
    python3 classify_no_nace.py
"""

import json, csv, os, time, re
from pathlib import Path

try:
    import anthropic
except ImportError:
    raise SystemExit("Installa la libreria: pip3 install anthropic")

API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
if not API_KEY:
    raise SystemExit(
        "Imposta la variabile d'ambiente ANTHROPIC_API_KEY prima di lanciare.\n"
        "  export ANTHROPIC_API_KEY=sk-ant-..."
    )

BASE = Path(__file__).parent
NO_NACE_FILE  = BASE / "no_nace_pending.json"
IMPORT_FILE   = BASE / "IMPORT_blaklader_NEW.csv"
RESULT_FILE   = BASE / "no_nace_classified.json"

VALID_SECTORS = [
    "Edilizia",
    "Industria",
    "Trasporti e logistica",
    "Servizi",
    "Agricoltura",
    "Energia e utilities",
    "Altro",
]

PROMPT_SYSTEM = (
    "Sei un esperto di classificazione aziendale B2B italiana. "
    "Rispondi SOLO con un oggetto JSON valido, senza testo aggiuntivo."
)

def classify_batch(client: anthropic.Anthropic, companies: list[dict]) -> list[dict]:
    """Classifica un batch di aziende con una sola chiamata API."""
    lines = "\n".join(
        f'{i+1}. "{c["company"]}" – {c["city"]} ({c["province"]})'
        for i, c in enumerate(companies)
    )
    prompt = f"""Classifica ciascuna azienda in UNO dei seguenti settori:
{chr(10).join("- " + s for s in VALID_SECTORS)}

Aziende da classificare:
{lines}

Rispondi con un array JSON di oggetti con i campi "index" (1-based) e "sector".
Esempio: [{{"index": 1, "sector": "Edilizia"}}, ...]"""

    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
        system=PROMPT_SYSTEM,
    )
    text = msg.content[0].text.strip()
    # Estrai JSON anche se c'è testo extra
    m = re.search(r'\[.*\]', text, re.DOTALL)
    if not m:
        raise ValueError(f"Risposta non parsabile: {text}")
    return json.loads(m.group())


def main():
    client = anthropic.Anthropic(api_key=API_KEY)

    records: list[dict] = json.loads(NO_NACE_FILE.read_text(encoding="utf-8"))
    print(f"Aziende da classificare: {len(records)}")

    results: dict[str, str] = {}  # company → sector

    # Batch da 10 per efficienza
    BATCH = 10
    for start in range(0, len(records), BATCH):
        batch = records[start : start + BATCH]
        batch_n = start // BATCH + 1
        total_batches = (len(records) + BATCH - 1) // BATCH
        print(f"  Batch {batch_n}/{total_batches}...", end=" ", flush=True)
        try:
            classified = classify_batch(client, batch)
            for item in classified:
                idx = item["index"] - 1
                sector = item.get("sector", "Altro")
                if sector not in VALID_SECTORS:
                    sector = "Altro"
                company = batch[idx]["company"]
                results[company] = sector
            print(f"OK ({len(classified)} classificati)")
        except Exception as e:
            print(f"ERRORE: {e}")
            for rec in batch:
                results[rec["company"]] = "Altro"
        time.sleep(0.3)  # gentile verso rate limits

    # Salva risultati
    RESULT_FILE.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nRisultati salvati in: {RESULT_FILE}")

    # Aggiorna IMPORT_blaklader_NEW.csv
    rows = []
    fieldnames = []
    with open(IMPORT_FILE, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, delimiter=";")
        fieldnames = reader.fieldnames or []
        for row in reader:
            if row["Ragione Sociale"] in results and not row["Settore"]:
                row["Settore"] = results[row["Ragione Sociale"]]
            rows.append(row)

    with open(IMPORT_FILE, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=";")
        writer.writeheader()
        writer.writerows(rows)

    patched = sum(1 for r in rows if r["Ragione Sociale"] in results)
    print(f"Aggiornate {patched} righe nel CSV di import.")

    # Stampa distribuzione finale
    from collections import Counter
    dist = Counter(results.values())
    print("\nSettori assegnati:")
    for k, v in dist.most_common():
        print(f"  {v:3d} | {k}")


if __name__ == "__main__":
    main()
