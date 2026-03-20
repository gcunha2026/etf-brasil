"""Vercel serverless function: /api/ranking"""
import json
import sqlite3
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, urlparse

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
        qs = parse_qs(urlparse(self.path).query)
        period = qs.get("period", ["1a"])[0]
        limit = int(qs.get("limit", ["20"])[0])
        category = qs.get("category", [None])[0]

        conn = get_db()
        etfs = conn.execute(
            "SELECT ticker, nome, benchmark, taxa_adm FROM etf_cadastro WHERE ticker IS NOT NULL AND ticker != ''"
        ).fetchall()

        ranked = []
        for etf in etfs:
            ticker = etf["ticker"]
            if category:
                bench = (etf["benchmark"] or "").lower()
                nome = (etf["nome"] or "").lower()
                if category.lower() not in bench and category.lower() not in nome:
                    continue

            prices = conn.execute(
                "SELECT data, fechamento FROM etf_precos WHERE ticker = ? ORDER BY data",
                (ticker,),
            ).fetchall()

            price_list = [{"fechamento": p["fechamento"]} for p in prices]
            returns = calc_returns(price_list, {period: RETURN_PERIODS.get(period, 252)})
            ret_val = returns.get(period)

            if ret_val is not None:
                ranked.append({
                    "ticker": ticker,
                    "nome": etf["nome"],
                    "benchmark": etf["benchmark"],
                    "taxa_adm": etf["taxa_adm"],
                    "retorno": ret_val,
                })

        ranked.sort(key=lambda x: x["retorno"], reverse=True)
        conn.close()

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({"ranking": ranked[:limit], "period": period, "total": len(ranked)}).encode())
