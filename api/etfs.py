"""Vercel serverless function: /api/etfs"""
import json
import sqlite3
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from datetime import datetime, timedelta

DB_PATH = Path(__file__).parent.parent / "data" / "etf_brasil.db"

RETURN_PERIODS = {"1m": 21, "3m": 63, "6m": 126, "1a": 252, "2a": 504}


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def calc_returns(prices, periods):
    if not prices:
        return {}
    latest = prices[-1]["fechamento"]
    returns = {}
    for label, days in periods.items():
        if len(prices) >= days and days > 0:
            old_price = prices[-(days + 1)]["fechamento"] if len(prices) > days else prices[0]["fechamento"]
            if old_price and old_price > 0:
                returns[label] = round(((latest / old_price) - 1) * 100, 2)
            else:
                returns[label] = None
        else:
            returns[label] = None
    return returns


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        conn = get_db()
        qs = parse_qs(urlparse(self.path).query)
        search = qs.get("search", [None])[0]

        etfs = conn.execute("""
            SELECT DISTINCT c.ticker, c.nome, c.nome_curto, c.benchmark, c.taxa_adm, c.admin, c.gestor, c.data_inicio, c.patrimonio
            FROM etf_cadastro c
            WHERE c.ticker IS NOT NULL AND c.ticker != ''
            ORDER BY c.ticker
        """).fetchall()

        results = []
        for etf in etfs:
            ticker = etf["ticker"]
            if search and search.lower() not in (ticker + " " + (etf["nome"] or "")).lower():
                continue

            prices = conn.execute(
                "SELECT data, fechamento FROM etf_precos WHERE ticker = ? ORDER BY data",
                (ticker,),
            ).fetchall()

            price_list = [{"data": p["data"], "fechamento": p["fechamento"]} for p in prices]
            returns = calc_returns(price_list, RETURN_PERIODS)

            latest_price = price_list[-1]["fechamento"] if price_list else None
            volume_row = conn.execute(
                "SELECT volume FROM etf_precos WHERE ticker = ? ORDER BY data DESC LIMIT 1",
                (ticker,),
            ).fetchone()

            results.append({
                "ticker": ticker,
                "nome": etf["nome"],
                "nome_curto": etf["nome_curto"],
                "benchmark": etf["benchmark"],
                "taxa_adm": etf["taxa_adm"],
                "admin": etf["admin"],
                "preco": latest_price,
                "volume": volume_row["volume"] if volume_row else None,
                "patrimonio": etf["patrimonio"],
                "retornos": returns,
            })

        conn.close()

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({"etfs": results, "total": len(results)}).encode())
