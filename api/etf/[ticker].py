"""Vercel serverless function: /api/etf/[ticker]"""
import json
import sqlite3
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse

DB_PATH = Path(__file__).parent.parent.parent / "data" / "etf_brasil.db"

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
        # Extract ticker from path: /api/etf/BOVA11
        path = urlparse(self.path).path
        ticker = path.split("/")[-1].upper()

        conn = get_db()
        etf = conn.execute(
            "SELECT * FROM etf_cadastro WHERE ticker = ? LIMIT 1",
            (ticker,),
        ).fetchone()

        if not etf:
            conn.close()
            self.send_response(404)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "ETF not found"}).encode())
            return

        prices = conn.execute(
            "SELECT data, abertura, maxima, minima, fechamento, volume FROM etf_precos WHERE ticker = ? ORDER BY data",
            (ticker,),
        ).fetchall()

        price_list = [dict(p) for p in prices]
        returns = calc_returns(
            [{"fechamento": p["fechamento"]} for p in price_list],
            RETURN_PERIODS,
        )

        conn.close()

        result = {
            "ticker": etf["ticker"],
            "nome": etf["nome"],
            "benchmark": etf["benchmark"],
            "taxa_adm": etf["taxa_adm"],
            "admin": etf["admin"],
            "gestor": etf["gestor"],
            "data_inicio": etf["data_inicio"],
            "preco_atual": price_list[-1]["fechamento"] if price_list else None,
            "retornos": returns,
            "precos": price_list,
            "nav_historico": [],
        }

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(result).encode())
