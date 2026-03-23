"""
Export SQLite data to JSON files for the Next.js frontend.
Usage: python export_json.py
"""

import json
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "etf_brasil.db"
DATA_DIR = Path(__file__).parent.parent / "data"


def export():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    # --- etfs.json ---
    etfs = conn.execute("""
        SELECT DISTINCT ticker, nome, nome_curto, benchmark, taxa_adm, admin, gestor, data_inicio, patrimonio
        FROM etf_cadastro
        WHERE ticker IS NOT NULL AND ticker != ''
        ORDER BY ticker
    """).fetchall()

    etfs_list = [
        {
            "ticker": r["ticker"],
            "nome": r["nome"],
            "nome_curto": r["nome_curto"],
            "benchmark": r["benchmark"],
            "taxa_adm": r["taxa_adm"],
            "admin": r["admin"],
            "gestor": r["gestor"],
            "data_inicio": r["data_inicio"],
            "patrimonio": r["patrimonio"],
        }
        for r in etfs
    ]
    DATA_DIR.mkdir(exist_ok=True)
    with open(DATA_DIR / "etfs.json", "w", encoding="utf-8") as f:
        json.dump(etfs_list, f, ensure_ascii=False)
    print(f"Exported {len(etfs_list)} ETFs to etfs.json")

    # --- prices.json ---
    tickers = [e["ticker"] for e in etfs_list]
    prices_dict = {}
    for ticker in tickers:
        rows = conn.execute("""
            SELECT data, abertura, maxima, minima, fechamento, volume
            FROM etf_precos WHERE ticker = ? ORDER BY data
        """, (ticker,)).fetchall()
        if rows:
            prices_dict[ticker] = [
                {
                    "d": r["data"],
                    "o": r["abertura"],
                    "h": r["maxima"],
                    "l": r["minima"],
                    "c": r["fechamento"],
                    "v": r["volume"],
                }
                for r in rows
            ]

    with open(DATA_DIR / "prices.json", "w", encoding="utf-8") as f:
        json.dump(prices_dict, f, ensure_ascii=False)
    print(f"Exported prices for {len(prices_dict)} tickers to prices.json")

    # --- benchmarks.json ---
    bench_names = [r[0] for r in conn.execute("SELECT DISTINCT nome FROM benchmark_series").fetchall()]
    bench_dict = {}
    for name in bench_names:
        rows = conn.execute("""
            SELECT data, valor FROM benchmark_series WHERE nome = ? ORDER BY data
        """, (name,)).fetchall()
        if rows:
            bench_dict[name] = [{"d": r["data"], "v": r["valor"]} for r in rows]

    with open(DATA_DIR / "benchmarks.json", "w", encoding="utf-8") as f:
        json.dump(bench_dict, f, ensure_ascii=False)
    print(f"Exported {len(bench_dict)} benchmarks to benchmarks.json")

    conn.close()
    print("Export complete!")


if __name__ == "__main__":
    export()
