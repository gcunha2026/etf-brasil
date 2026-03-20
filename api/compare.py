"""Vercel serverless function: /api/compare"""
import json
import sqlite3
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from datetime import datetime, timedelta

DB_PATH = Path(__file__).parent.parent / "data" / "etf_brasil.db"


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        qs = parse_qs(urlparse(self.path).query)
        tickers_str = qs.get("tickers", [""])[0]
        period = qs.get("period", ["1a"])[0]
        benchmark = qs.get("benchmark", [None])[0]

        ticker_list = [t.strip().upper() for t in tickers_str.split(",") if t.strip()]

        days_map = {"1m": 30, "3m": 90, "6m": 180, "1a": 365, "2a": 730}
        start_date = (datetime.now() - timedelta(days=days_map.get(period, 365))).strftime("%Y-%m-%d")

        conn = get_db()
        series = {}

        for ticker in ticker_list:
            prices = conn.execute(
                "SELECT data, fechamento FROM etf_precos WHERE ticker = ? AND data >= ? ORDER BY data",
                (ticker, start_date),
            ).fetchall()

            if prices:
                base = prices[0]["fechamento"]
                if base > 0:
                    series[ticker] = [
                        {"data": p["data"], "valor": round((p["fechamento"] / base - 1) * 100, 2)}
                        for p in prices
                    ]

        if benchmark:
            bench_prices = conn.execute(
                "SELECT data, valor FROM benchmark_series WHERE nome = ? AND data >= ? ORDER BY data",
                (benchmark, start_date),
            ).fetchall()

            if bench_prices:
                base = bench_prices[0]["valor"]
                if base > 0:
                    series[f"BM:{benchmark}"] = [
                        {"data": p["data"], "valor": round((p["valor"] / base - 1) * 100, 2)}
                        for p in bench_prices
                    ]

        conn.close()

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({"series": series, "period": period, "start_date": start_date}).encode())
