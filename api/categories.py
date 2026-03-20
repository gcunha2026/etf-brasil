"""Vercel serverless function: /api/categories"""
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
        cats = conn.execute("""
            SELECT benchmark, COUNT(*) as count FROM etf_cadastro
            WHERE ticker IS NOT NULL AND ticker != '' AND benchmark IS NOT NULL AND benchmark != ''
            GROUP BY benchmark ORDER BY count DESC
        """).fetchall()
        conn.close()

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({"categories": [{"nome": c["benchmark"], "count": c["count"]} for c in cats]}).encode())
