"""
FastAPI backend for ETF Brasil consolidator.
Serves ETF data, returns, and comparison endpoints.
"""

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

DB_PATH = Path(__file__).parent / "etf_brasil.db"

app = FastAPI(title="ETF Brasil API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def calc_returns(prices: list[dict], periods: dict[str, int]) -> dict:
    """Calculate returns for given periods (in trading days)."""
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


RETURN_PERIODS = {
    "1m": 21,
    "3m": 63,
    "6m": 126,
    "1a": 252,
    "2a": 504,
}


@app.get("/api/etfs")
def list_etfs(
    search: Optional[str] = None,
    sort_by: str = Query("ticker", regex="^(ticker|nome|taxa_adm|patrimonio|ret_1m|ret_3m|ret_6m|ret_1a|ret_2a)$"),
    sort_dir: str = Query("asc", regex="^(asc|desc)$"),
):
    """List all ETFs with basic info and returns."""
    conn = get_db()

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

        # Get price history for return calculations
        prices = conn.execute("""
            SELECT data, fechamento FROM etf_precos
            WHERE ticker = ? ORDER BY data
        """, (ticker,)).fetchall()

        price_list = [{"data": p["data"], "fechamento": p["fechamento"]} for p in prices]
        returns = calc_returns(price_list, RETURN_PERIODS)

        latest_price = price_list[-1]["fechamento"] if price_list else None
        volume_row = conn.execute("""
            SELECT volume FROM etf_precos WHERE ticker = ? ORDER BY data DESC LIMIT 1
        """, (ticker,)).fetchone()

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

    # Sort
    def sort_key(item):
        if sort_by.startswith("ret_"):
            period = sort_by.replace("ret_", "")
            val = item["retornos"].get(period)
            return val if val is not None else float("-inf")
        val = item.get(sort_by)
        if val is None:
            return "" if isinstance(sort_by, str) and sort_by in ("ticker", "nome") else float("-inf")
        return val

    results.sort(key=sort_key, reverse=(sort_dir == "desc"))

    conn.close()
    return {"etfs": results, "total": len(results)}


@app.get("/api/etf/{ticker}")
def get_etf_detail(ticker: str):
    """Get detailed ETF info with full price history."""
    conn = get_db()

    etf = conn.execute("""
        SELECT * FROM etf_cadastro WHERE ticker = ? LIMIT 1
    """, (ticker.upper(),)).fetchone()

    if not etf:
        conn.close()
        return {"error": "ETF not found"}

    prices = conn.execute("""
        SELECT data, abertura, maxima, minima, fechamento, volume
        FROM etf_precos WHERE ticker = ? ORDER BY data
    """, (ticker.upper(),)).fetchall()

    price_list = [dict(p) for p in prices]
    returns = calc_returns(
        [{"fechamento": p["fechamento"]} for p in price_list],
        RETURN_PERIODS,
    )

    # NAV history
    nav_data = conn.execute("""
        SELECT data, nav, patrimonio, cotistas
        FROM etf_nav_diario
        WHERE cnpj = ?
        ORDER BY data
    """, (etf["cnpj"],)).fetchall()

    conn.close()

    return {
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
        "nav_historico": [dict(n) for n in nav_data],
    }


@app.get("/api/compare")
def compare_etfs(
    tickers: str = Query(..., description="Comma-separated tickers"),
    period: str = Query("1a", regex="^(1m|3m|6m|1a|2a)$"),
    benchmark: Optional[str] = None,
):
    """Compare multiple ETFs by normalized returns."""
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]

    conn = get_db()

    # Determine date range
    days_map = {"1m": 30, "3m": 90, "6m": 180, "1a": 365, "2a": 730}
    start_date = (datetime.now() - timedelta(days=days_map[period])).strftime("%Y-%m-%d")

    series = {}
    for ticker in ticker_list:
        prices = conn.execute("""
            SELECT data, fechamento FROM etf_precos
            WHERE ticker = ? AND data >= ?
            ORDER BY data
        """, (ticker, start_date)).fetchall()

        if prices:
            base = prices[0]["fechamento"]
            series[ticker] = [
                {"data": p["data"], "valor": round((p["fechamento"] / base - 1) * 100, 2)}
                for p in prices if base > 0
            ]

    # Add benchmark if requested
    if benchmark:
        bench_prices = conn.execute("""
            SELECT data, valor FROM benchmark_series
            WHERE nome = ? AND data >= ?
            ORDER BY data
        """, (benchmark, start_date)).fetchall()

        if bench_prices:
            base = bench_prices[0]["valor"]
            series[f"BM:{benchmark}"] = [
                {"data": p["data"], "valor": round((p["valor"] / base - 1) * 100, 2)}
                for p in bench_prices if base > 0
            ]

    conn.close()

    return {"series": series, "period": period, "start_date": start_date}


@app.get("/api/benchmarks")
def list_benchmarks():
    """List available benchmarks."""
    conn = get_db()
    benchmarks = conn.execute("""
        SELECT DISTINCT nome, MIN(data) as desde, MAX(data) as ate, COUNT(*) as pontos
        FROM benchmark_series GROUP BY nome
    """).fetchall()
    conn.close()
    return {"benchmarks": [dict(b) for b in benchmarks]}


@app.get("/api/ranking")
def ranking(
    period: str = Query("1a", regex="^(1m|3m|6m|1a|2a)$"),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
):
    """Rank ETFs by return in a given period."""
    conn = get_db()

    etfs = conn.execute("""
        SELECT ticker, nome, benchmark, taxa_adm FROM etf_cadastro
        WHERE ticker IS NOT NULL AND ticker != ''
    """).fetchall()

    ranked = []
    for etf in etfs:
        ticker = etf["ticker"]

        if category:
            bench = (etf["benchmark"] or "").lower()
            nome = (etf["nome"] or "").lower()
            cat_lower = category.lower()
            if cat_lower not in bench and cat_lower not in nome:
                continue

        prices = conn.execute("""
            SELECT data, fechamento FROM etf_precos
            WHERE ticker = ? ORDER BY data
        """, (ticker,)).fetchall()

        price_list = [{"fechamento": p["fechamento"]} for p in prices]
        returns = calc_returns(price_list, {period: RETURN_PERIODS[period]})
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

    return {"ranking": ranked[:limit], "period": period, "total": len(ranked)}


@app.get("/api/categories")
def list_categories():
    """List ETF categories based on benchmarks."""
    conn = get_db()
    cats = conn.execute("""
        SELECT benchmark, COUNT(*) as count FROM etf_cadastro
        WHERE ticker IS NOT NULL AND ticker != '' AND benchmark IS NOT NULL AND benchmark != ''
        GROUP BY benchmark ORDER BY count DESC
    """).fetchall()
    conn.close()

    return {"categories": [{"nome": c["benchmark"], "count": c["count"]} for c in cats]}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
