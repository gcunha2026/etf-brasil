"""Vercel serverless function: /api/benchmarks"""
import json
import sqlite3
from http.server import BaseHTTPRequestHandler
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data" / "etf_brasil.db"


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        conn = get_db()
        benchmarks = conn.execute("""
            SELECT DISTINCT nome, MIN(data) as desde, MAX(data) as ate, COUNT(*) as pontos
            FROM benchmark_series GROUP BY nome
        """).fetchall()
        conn.close()

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({"benchmarks": [dict(b) for b in benchmarks]}).encode())
