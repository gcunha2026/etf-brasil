"""
Ingest ETF price data from BRAPI (brapi.dev) and Yahoo Finance direct.
No pandas/yfinance dependency — uses httpx only.
"""

import httpx
import sqlite3
import os
import time
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

DB_PATH = Path(__file__).parent / "etf_brasil.db"
BRAPI_TOKEN = os.getenv("BRAPI_TOKEN", "")
BRAPI_BASE = "https://brapi.dev/api"

# Known Brazilian ETFs
KNOWN_ETFS = {
    # iShares (BlackRock)
    "BOVA11": {"nome": "iShares Ibovespa", "benchmark": "IBOV", "admin": "BlackRock", "taxa": 0.10},
    "IVVB11": {"nome": "iShares S&P 500 BRL", "benchmark": "S&P 500", "admin": "BlackRock", "taxa": 0.23},
    "SMAL11": {"nome": "iShares Small Cap", "benchmark": "SMLL", "admin": "BlackRock", "taxa": 0.50},
    "BRAX11": {"nome": "iShares IBrX 100", "benchmark": "IBrX 100", "admin": "BlackRock", "taxa": 0.20},
    "ECOO11": {"nome": "iShares ICO2", "benchmark": "ICO2", "admin": "BlackRock", "taxa": 0.38},
    # Itau (It Now)
    "DIVO11": {"nome": "It Now IDIV", "benchmark": "IDIV", "admin": "Itau", "taxa": 0.50},
    "DIVD11": {"nome": "It Now IDIV Renda Dividendos", "benchmark": "IDIV", "admin": "Itau", "taxa": 0.50},
    "FIND11": {"nome": "It Now IFNC", "benchmark": "IFNC", "admin": "Itau", "taxa": 0.60},
    "GOVE11": {"nome": "It Now IGOV", "benchmark": "IGCT", "admin": "Itau", "taxa": 0.50},
    "MATB11": {"nome": "It Now IMAT", "benchmark": "IMAT", "admin": "Itau", "taxa": 0.50},
    "ISUS11": {"nome": "It Now ISE", "benchmark": "ISE", "admin": "Itau", "taxa": 0.40},
    "PIBB11": {"nome": "It Now PIBB IBrX-50", "benchmark": "IBrX 50", "admin": "Itau", "taxa": 0.059},
    "SPXI11": {"nome": "It Now S&P 500 TRN", "benchmark": "S&P 500", "admin": "Itau", "taxa": 0.21},
    "SPXR11": {"nome": "It Now S&P 500 Futures Quanto BRL", "benchmark": "S&P 500", "admin": "Itau", "taxa": 0.20},
    "BOVV11": {"nome": "It Now Ibovespa", "benchmark": "IBOV", "admin": "Itau", "taxa": 0.10},
    "SMAC11": {"nome": "It Now Small Cap", "benchmark": "SMLL", "admin": "Itau", "taxa": 0.50},
    "IMAB11": {"nome": "It Now IMA-B", "benchmark": "IMA-B", "admin": "Itau", "taxa": 0.25},
    "IRFM11": {"nome": "It Now IRF-M P2", "benchmark": "IRF-M P2", "admin": "Itau", "taxa": 0.20},
    "IDKA11": {"nome": "It Now IRF-M P3", "benchmark": "IRF-M P3", "admin": "Itau", "taxa": 0.20},
    "B5P211": {"nome": "It Now IMA-B5 P2", "benchmark": "IMA-B 5 P2", "admin": "Itau", "taxa": 0.20},
    "IB5M11": {"nome": "It Now IMA-B5+", "benchmark": "IMA-B 5+", "admin": "Itau", "taxa": 0.20},
    "FIXA11": {"nome": "It Now IRF-M 1", "benchmark": "IRF-M 1", "admin": "Itau", "taxa": 0.25},
    "TECK11": {"nome": "It Now NYSE FANG+", "benchmark": "NYSE FANG+", "admin": "Itau", "taxa": 0.50},
    "WRLD11": {"nome": "It Now FTSE Global Equities", "benchmark": "FTSE Global", "admin": "Itau", "taxa": 0.38},
    "BITI11": {"nome": "It Now Bloomberg Galaxy Bitcoin", "benchmark": "Bitcoin", "admin": "Itau", "taxa": 0.70},
    # Hashdex
    "HASH11": {"nome": "Hashdex Nasdaq Crypto", "benchmark": "NCI", "admin": "Hashdex", "taxa": 1.30},
    "BITH11": {"nome": "Hashdex Bitcoin", "benchmark": "Bitcoin", "admin": "Hashdex", "taxa": 0.70},
    "ETHE11": {"nome": "Hashdex Ethereum", "benchmark": "Ethereum", "admin": "Hashdex", "taxa": 0.70},
    "WEB311": {"nome": "Hashdex Web3", "benchmark": "CF Web 3.0", "admin": "Hashdex", "taxa": 1.30},
    "DEFI11": {"nome": "Hashdex DeFi", "benchmark": "CF DeFi", "admin": "Hashdex", "taxa": 1.30},
    # QR Asset
    "QBTC11": {"nome": "QR Bitcoin", "benchmark": "Bitcoin", "admin": "QR Asset", "taxa": 0.75},
    "QETH11": {"nome": "QR Ether", "benchmark": "Ethereum", "admin": "QR Asset", "taxa": 0.75},
    # XP / Trend
    "GOLD11": {"nome": "Trend Ouro", "benchmark": "LBMA Gold Price", "admin": "XP", "taxa": 0.30},
    "USDB11": {"nome": "Trend Dolar", "benchmark": "Dolar PTAX", "admin": "XP", "taxa": 0.25},
    "EURP11": {"nome": "Trend Euro", "benchmark": "Euro PTAX", "admin": "XP", "taxa": 0.25},
    "XINA11": {"nome": "Trend China", "benchmark": "MSCI China", "admin": "XP", "taxa": 0.30},
    "ACWI11": {"nome": "Trend MSCI ACWI", "benchmark": "MSCI ACWI", "admin": "XP", "taxa": 0.30},
    "NASD11": {"nome": "Trend Nasdaq 100", "benchmark": "Nasdaq 100", "admin": "XP", "taxa": 0.30},
    "SHOT11": {"nome": "Trend Small Caps US", "benchmark": "Russell 2000", "admin": "XP", "taxa": 0.30},
    "EMEG11": {"nome": "Trend Emergentes", "benchmark": "MSCI EM", "admin": "XP", "taxa": 0.30},
    "BOVX11": {"nome": "Trend Ibovespa", "benchmark": "IBOV", "admin": "XP", "taxa": 0.10},
    "XFIX11": {"nome": "Trend IFIX", "benchmark": "IFIX", "admin": "XP", "taxa": 0.30},
    "UTEC11": {"nome": "Trend US Tech", "benchmark": "Nasdaq 100", "admin": "XP", "taxa": 0.30},
    "USAL11": {"nome": "Trend CRSP US Large Cap", "benchmark": "CRSP US Large Cap", "admin": "XP", "taxa": 0.30},
    # Investo
    "LFTS11": {"nome": "Investo Tesouro Selic", "benchmark": "Selic", "admin": "Investo", "taxa": 0.19},
    "LFTB11": {"nome": "Investo Treasury Bond 760 Day", "benchmark": "Treasury Bond", "admin": "Investo", "taxa": 0.25},
    "NTNS11": {"nome": "Investo Tesouro IPCA+ 0-4 Anos", "benchmark": "IMA-B 5", "admin": "Investo", "taxa": 0.20},
    "ALUG11": {"nome": "Investo MSCI US Real Estate", "benchmark": "MSCI US REIT", "admin": "Investo", "taxa": 0.48},
    "FOOD11": {"nome": "Investo Food", "benchmark": "MVIS Agribusiness", "admin": "Investo", "taxa": 0.48},
    "CHIP11": {"nome": "Investo US Semiconductor 25", "benchmark": "US Semiconductor 25", "admin": "Investo", "taxa": 0.48},
    "USTK11": {"nome": "Investo MSCI US Technology", "benchmark": "MSCI US Tech", "admin": "Investo", "taxa": 0.48},
    "BEST11": {"nome": "Investo Brazil Best Quality", "benchmark": "Best Quality", "admin": "Investo", "taxa": 0.30},
    "GPUS11": {"nome": "Investo GP S&P 500", "benchmark": "S&P 500", "admin": "Investo", "taxa": 0.20},
    "HODL11": {"nome": "Investo Bitcoin Benchmark Rate", "benchmark": "Bitcoin", "admin": "Investo", "taxa": 0.60},
    "VWRA11": {"nome": "Investo FTSE All-World", "benchmark": "FTSE All-World", "admin": "Investo", "taxa": 0.30},
    "JOGO11": {"nome": "Investo GL Video Games & Esports", "benchmark": "Video Games & Esports", "admin": "Investo", "taxa": 0.48},
    "UTLL11": {"nome": "Investo B3 Utilidade Publica", "benchmark": "B3 Util. Publica", "admin": "Investo", "taxa": 0.30},
    "NUCL11": {"nome": "Investo Global Uranium & Nuclear", "benchmark": "MV Uranium & Nuclear", "admin": "Investo", "taxa": 0.48},
    "SVAL11": {"nome": "Investo S&P SmallCap 600 Value", "benchmark": "S&P SC 600 Value", "admin": "Investo", "taxa": 0.48},
    "GLDX11": {"nome": "Investo Solactive Gold Spot", "benchmark": "Solactive Gold", "admin": "Investo", "taxa": 0.30},
    # BTG Pactual
    "SPXB11": {"nome": "BTG Pactual S&P 500", "benchmark": "S&P 500", "admin": "BTG Pactual", "taxa": 0.20},
    "ESGB11": {"nome": "BTG Pactual ESG", "benchmark": "S&P/B3 ESG", "admin": "BTG Pactual", "taxa": 0.20},
    "DEBB11": {"nome": "BTG Pactual Teva Debentures DI", "benchmark": "Teva Debentures DI", "admin": "BTG Pactual", "taxa": 0.25},
    "AUVP11": {"nome": "BTG Pactual Teva AUVP Acoes", "benchmark": "Teva AUVP", "admin": "BTG Pactual", "taxa": 0.50},
    "GENB11": {"nome": "BTG Pactual Genomica & Biotech", "benchmark": "S&P Genomics", "admin": "BTG Pactual", "taxa": 0.50},
    "PACB11": {"nome": "BTG Pactual Teva Tesouro IPCA Ultra Longo", "benchmark": "Tesouro IPCA+", "admin": "BTG Pactual", "taxa": 0.20},
    "TIRB11": {"nome": "BTG Pactual Teva Dividendos Ativos Reais", "benchmark": "Teva Dividendos", "admin": "BTG Pactual", "taxa": 0.50},
    "CMDB11": {"nome": "BTG Pactual Teva Commodities Brasil", "benchmark": "Teva Commodities", "admin": "BTG Pactual", "taxa": 0.50},
    # Buena Vista
    "SPYI11": {"nome": "Buena Vista US High Income", "benchmark": "S&P 500", "admin": "Buena Vista", "taxa": 0.83},
    "QQQI11": {"nome": "Buena Vista QQQ Income", "benchmark": "Nasdaq 100", "admin": "Buena Vista", "taxa": 0.83},
    "COIN11": {"nome": "Buena Vista Neos Bitcoin High Income", "benchmark": "Bitcoin", "admin": "Buena Vista", "taxa": 0.83},
    "IWMI11": {"nome": "Buena Vista Neos Russell 2000 High Income", "benchmark": "Russell 2000", "admin": "Buena Vista", "taxa": 0.83},
    "CASA11": {"nome": "Buena Vista Neos Real Estate High Income", "benchmark": "Real Estate", "admin": "Buena Vista", "taxa": 0.83},
    "AURO11": {"nome": "Buena Vista Neos Gold High Income", "benchmark": "LBMA Gold Price", "admin": "Buena Vista", "taxa": 0.83},
    "ETHY11": {"nome": "Buena Vista Neos Ethereum High Income", "benchmark": "Ethereum", "admin": "Buena Vista", "taxa": 0.83},
    "QQQQ11": {"nome": "Buena Vista Nasdaq-100 High Beta", "benchmark": "Nasdaq 100 High Beta", "admin": "Buena Vista", "taxa": 0.83},
    # Nu Asset
    "NDIV11": {"nome": "Nu Renda Ibov Smart Dividendos", "benchmark": "IDIV", "admin": "Nu Asset", "taxa": 0.50},
    "NSDV11": {"nome": "Nu S&P 500 Dividendos", "benchmark": "S&P 500 Div. Aristocrats", "admin": "Nu Asset", "taxa": 0.50},
    "LVOL11": {"nome": "Nu Ibov Smart Low Volatility", "benchmark": "IBOV Low Vol", "admin": "Nu Asset", "taxa": 0.50},
    # Banco do Brasil
    "BBOV11": {"nome": "BB ETF Ibovespa", "benchmark": "IBOV", "admin": "Banco do Brasil", "taxa": 0.18},
    "BBSD11": {"nome": "BB ETF S&P Dividendos Brasil", "benchmark": "S&P Div. Brasil", "admin": "Banco do Brasil", "taxa": 0.50},
    "DOLA11": {"nome": "BB ETF Indice Futuro de Dolar", "benchmark": "Dolar Futuro", "admin": "Banco do Brasil", "taxa": 0.25},
    "BBOI11": {"nome": "BB ETF Indice Futuro Boi Gordo", "benchmark": "Boi Gordo Futuro", "admin": "Banco do Brasil", "taxa": 0.25},
    # Bradesco
    "BOVB11": {"nome": "Bradesco ETF Ibovespa", "benchmark": "IBOV", "admin": "Bradesco", "taxa": 0.20},
    # Caixa
    "XBOV11": {"nome": "Caixa ETF Ibovespa", "benchmark": "IBOV", "admin": "Caixa", "taxa": 0.50},
    # AUVP
    "AREA11": {"nome": "AUVP Renda Automatica", "benchmark": "Renda Automatica", "admin": "AUVP", "taxa": 0.50},
    # Cripto20
    "CRPT11": {"nome": "Cripto20 Empiricus", "benchmark": "Crypto Top 20", "admin": "Empiricus", "taxa": 1.00},
    # Galapagos
    "GLFT11": {"nome": "Galapagos Tesouro LFTs Pos Fixado", "benchmark": "Teva Tesouro LFTs", "admin": "Galapagos", "taxa": 0.20},
    "GXUS11": {"nome": "Galapagos FTSE Global ex US", "benchmark": "FTSE Global ex US", "admin": "Galapagos", "taxa": 0.30},
    "GBIT11": {"nome": "Galapagos Bitcoin", "benchmark": "CME CF Bitcoin", "admin": "Galapagos", "taxa": 0.50},
    "POSB11": {"nome": "Galapagos Tesouro Selic IPCA+", "benchmark": "Teva ITBR Selic IPCA+", "admin": "Galapagos", "taxa": 0.20},
}


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def fetch_brapi_etf_list():
    """Fetch ETF list from BRAPI."""
    print("Fetching ETF list from BRAPI...")
    params = {"sortBy": "name", "sortOrder": "asc", "type": "etf"}
    if BRAPI_TOKEN:
        params["token"] = BRAPI_TOKEN

    try:
        response = httpx.get(f"{BRAPI_BASE}/quote/list", params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        stocks = data.get("stocks", [])
        print(f"  BRAPI returned {len(stocks)} ETFs")
        return stocks
    except Exception as e:
        print(f"  Error fetching BRAPI list: {e}")
        return []


def scrape_investidor10_etfs():
    """Scrape ETF list from investidor10.com.br to discover new tickers."""
    print("Scraping investidor10.com.br for ETF list...")
    try:
        import re
        response = httpx.get(
            "https://investidor10.com.br/etfs/",
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
            timeout=30,
            follow_redirects=True,
        )
        response.raise_for_status()
        # Extract tickers from ETF-specific URL paths (/etfs/TICKER)
        tickers = re.findall(r'/etfs/([a-zA-Z0-9]{4,6}11)', response.text)
        unique = list(set(t.upper() for t in tickers))
        # Remove false positives (100011, etc)
        unique = [t for t in unique if t[0].isalpha()]
        print(f"  Found {len(unique)} ETFs on investidor10")
        return unique
    except Exception as e:
        print(f"  Error scraping investidor10: {e}")
        return []


def fetch_yahoo_history(ticker, period="2y"):
    """Fetch price history from Yahoo Finance directly via httpx."""
    symbol = f"{ticker}.SA"
    period_map = {"1y": 365, "2y": 730, "5y": 1825}
    days = period_map.get(period, 730)

    end_ts = int(datetime.now().timestamp())
    start_ts = int((datetime.now() - timedelta(days=days)).timestamp())

    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
    params = {"period1": str(start_ts), "period2": str(end_ts), "interval": "1d"}
    headers = {"User-Agent": "Mozilla/5.0"}

    try:
        response = httpx.get(url, params=params, headers=headers, timeout=30, follow_redirects=True)
        response.raise_for_status()
        data = response.json()

        result = data.get("chart", {}).get("result", [])
        if not result:
            return []

        timestamps = result[0].get("timestamp", [])
        quotes = result[0].get("indicators", {}).get("quote", [{}])[0]

        records = []
        for i, ts in enumerate(timestamps):
            try:
                dt = datetime.fromtimestamp(ts).strftime("%Y-%m-%d")
                close = quotes.get("close", [])[i]
                if close is None:
                    continue
                records.append({
                    "date": dt,
                    "open": round(quotes.get("open", [])[i] or 0, 2),
                    "high": round(quotes.get("high", [])[i] or 0, 2),
                    "low": round(quotes.get("low", [])[i] or 0, 2),
                    "close": round(close, 2),
                    "volume": int(quotes.get("volume", [])[i] or 0),
                })
            except (IndexError, TypeError):
                continue

        return records
    except Exception as e:
        print(f"    Yahoo error for {ticker}: {e}")
        return []


def fetch_brapi_history(ticker, range_period="2y"):
    """Fetch price history from BRAPI."""
    params = {"range": range_period, "interval": "1d"}
    if BRAPI_TOKEN:
        params["token"] = BRAPI_TOKEN

    try:
        response = httpx.get(f"{BRAPI_BASE}/quote/{ticker}", params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        results = data.get("results", [])
        if not results:
            return []

        hist = results[0].get("historicalDataPrice", [])
        records = []
        for h in hist:
            date_val = h.get("date")
            if isinstance(date_val, (int, float)):
                date_str = datetime.fromtimestamp(date_val).strftime("%Y-%m-%d")
            else:
                date_str = str(date_val)[:10]

            records.append({
                "date": date_str,
                "open": h.get("open", 0),
                "high": h.get("high", 0),
                "low": h.get("low", 0),
                "close": h.get("close", 0),
                "volume": h.get("volume", 0),
            })
        return records
    except Exception as e:
        print(f"    BRAPI error for {ticker}: {e}")
        return []


def save_prices(ticker, records):
    """Save price records to DB."""
    if not records:
        return 0

    conn = get_db()
    count = 0
    for r in records:
        try:
            conn.execute("""
                INSERT OR REPLACE INTO etf_precos (ticker, data, abertura, maxima, minima, fechamento, volume)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (ticker, r["date"], r["open"], r["high"], r["low"], r["close"], r["volume"]))
            count += 1
        except Exception:
            continue

    conn.commit()
    conn.close()
    return count


def enrich_etf_tickers():
    """Enrich DB with ticker info from BRAPI and known list."""
    conn = get_db()
    now = datetime.now().isoformat()

    for ticker, info in KNOWN_ETFS.items():
        conn.execute("""
            INSERT OR REPLACE INTO etf_cadastro (cnpj, ticker, nome, nome_curto, benchmark, admin, taxa_adm, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (f"TICKER_{ticker}", ticker, info["nome"], info["nome"], info["benchmark"],
              info.get("admin", ""), info.get("taxa"), now))

    brapi_etfs = fetch_brapi_etf_list()
    for etf in brapi_etfs:
        stock = etf.get("stock", "")
        name = etf.get("name", "")
        if stock and stock.endswith("11"):
            conn.execute("""
                INSERT OR IGNORE INTO etf_cadastro (cnpj, ticker, nome, nome_curto, updated_at)
                VALUES (?, ?, ?, ?, ?)
            """, (f"TICKER_{stock}", stock, name, name[:60], now))

    # Discover new ETFs from investidor10
    inv10_tickers = scrape_investidor10_etfs()
    new_count = 0
    for ticker in inv10_tickers:
        existing = conn.execute(
            "SELECT 1 FROM etf_cadastro WHERE ticker = ?", (ticker,)
        ).fetchone()
        if not existing:
            conn.execute("""
                INSERT OR IGNORE INTO etf_cadastro (cnpj, ticker, nome, nome_curto, updated_at)
                VALUES (?, ?, ?, ?, ?)
            """, (f"TICKER_{ticker}", ticker, ticker, ticker, now))
            new_count += 1
    if new_count:
        print(f"  Discovered {new_count} new ETFs from investidor10")

    conn.commit()
    conn.close()


def fetch_statusinvest_patrimonio(ticker):
    """Scrape patrimonio liquido from statusinvest.com.br."""
    import re
    url = f"https://statusinvest.com.br/etfs/{ticker.lower()}"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

    try:
        response = httpx.get(url, headers=headers, timeout=15, follow_redirects=True)
        if response.status_code != 200:
            return None

        match = re.search(
            r'Patrim[^\s]*nio\s*l[^\s]*quido.*?<strong\s+class="value">([\d.,]+)</strong>',
            response.text, re.DOTALL | re.IGNORECASE,
        )
        if not match:
            return None

        val_str = match.group(1).replace(".", "").replace(",", ".")
        val = float(val_str)
        return val if val > 0 else None
    except Exception:
        return None


def ingest_patrimonio():
    """Download patrimonio (AUM) for all ETFs from Status Invest."""
    conn = get_db()
    tickers = [
        r[0] for r in conn.execute(
            "SELECT DISTINCT ticker FROM etf_cadastro WHERE ticker IS NOT NULL AND ticker != ''"
        ).fetchall()
    ]

    # Add patrimonio column if not exists
    try:
        conn.execute("ALTER TABLE etf_cadastro ADD COLUMN patrimonio REAL")
        conn.commit()
    except Exception:
        pass  # Column already exists

    conn.close()

    print(f"\nDownloading patrimonio for {len(tickers)} ETFs...")
    updated = 0

    for i, ticker in enumerate(tickers):
        patrimonio = fetch_statusinvest_patrimonio(ticker)
        if patrimonio:
            conn2 = get_db()
            conn2.execute(
                "UPDATE etf_cadastro SET patrimonio = ? WHERE ticker = ?",
                (patrimonio, ticker),
            )
            conn2.commit()
            conn2.close()
            updated += 1
            print(f"  [{i+1}/{len(tickers)}] {ticker}: R$ {patrimonio:,.0f}")
        else:
            print(f"  [{i+1}/{len(tickers)}] {ticker}: not available")

        time.sleep(0.3)  # Rate limit

    print(f"  Patrimonio updated for {updated}/{len(tickers)} ETFs")


def ingest_all_prices():
    """Download price history for all ETFs."""
    conn = get_db()
    tickers = [
        r[0] for r in conn.execute(
            "SELECT DISTINCT ticker FROM etf_cadastro WHERE ticker IS NOT NULL AND ticker != ''"
        ).fetchall()
    ]
    conn.close()

    print(f"\nDownloading prices for {len(tickers)} ETFs...")

    for i, ticker in enumerate(tickers):
        print(f"  [{i+1}/{len(tickers)}] {ticker}...", end=" ", flush=True)

        records = fetch_yahoo_history(ticker, period="2y")

        if not records:
            records = fetch_brapi_history(ticker, range_period="2y")
            time.sleep(0.5)

        count = save_prices(ticker, records)
        print(f"{count} records")

        if i % 10 == 9:
            time.sleep(1)


def ingest_benchmarks():
    """Download benchmark index data."""
    print("\nDownloading benchmark data...")

    benchmarks = {"^BVSP": "IBOV", "^GSPC": "S&P 500"}

    for yf_ticker, name in benchmarks.items():
        print(f"  {name} ({yf_ticker})...", end=" ", flush=True)

        end_ts = int(datetime.now().timestamp())
        start_ts = int((datetime.now() - timedelta(days=730)).timestamp())

        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{yf_ticker}"
        params = {"period1": str(start_ts), "period2": str(end_ts), "interval": "1d"}
        headers = {"User-Agent": "Mozilla/5.0"}

        try:
            response = httpx.get(url, params=params, headers=headers, timeout=30, follow_redirects=True)
            response.raise_for_status()
            data = response.json()

            result = data.get("chart", {}).get("result", [])
            if not result:
                print("no data")
                continue

            timestamps = result[0].get("timestamp", [])
            closes = result[0].get("indicators", {}).get("quote", [{}])[0].get("close", [])

            conn = get_db()
            count = 0
            for j, ts in enumerate(timestamps):
                try:
                    if closes[j] is None:
                        continue
                    dt = datetime.fromtimestamp(ts).strftime("%Y-%m-%d")
                    conn.execute("""
                        INSERT OR REPLACE INTO benchmark_series (nome, data, valor)
                        VALUES (?, ?, ?)
                    """, (name, dt, round(closes[j], 2)))
                    count += 1
                except (IndexError, TypeError):
                    continue

            conn.commit()
            conn.close()
            print(f"{count} records")

        except Exception as e:
            print(f"Error: {e}")

    # CDI from BCB (Selic daily rate, series 11)
    print("  CDI (Banco Central)...", end=" ", flush=True)
    try:
        start_date = (datetime.now() - timedelta(days=730)).strftime("%d/%m/%Y")
        end_date = datetime.now().strftime("%d/%m/%Y")
        url = f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados?formato=json&dataInicial={start_date}&dataFinal={end_date}"
        response = httpx.get(url, timeout=60)
        response.raise_for_status()
        data = response.json()

        conn = get_db()
        base = 1000.0
        count = 0
        for item in data:
            date_str = item["data"]
            parts = date_str.split("/")
            iso_date = f"{parts[2]}-{parts[1]}-{parts[0]}"
            rate = float(item["valor"].replace(",", "."))
            daily_factor = (1 + rate / 100) ** (1 / 252)
            base *= daily_factor

            conn.execute("""
                INSERT OR REPLACE INTO benchmark_series (nome, data, valor)
                VALUES (?, ?, ?)
            """, ("CDI", iso_date, round(base, 4)))
            count += 1

        conn.commit()
        conn.close()
        print(f"{count} records")
    except Exception as e:
        print(f"Error: {e}")


def run_full_ingestion():
    """Run complete price ingestion."""
    print("=" * 60)
    print("BRAPI / Yahoo Finance Data Ingestion")
    print("=" * 60)

    print("\n[1/3] Enriching ETF list...")
    enrich_etf_tickers()

    print("\n[2/4] Downloading price history...")
    ingest_all_prices()

    print("\n[3/4] Downloading patrimonio (AUM)...")
    ingest_patrimonio()

    print("\n[4/4] Downloading benchmarks...")
    ingest_benchmarks()

    print("\nPrice ingestion complete!")


if __name__ == "__main__":
    from ingest_cvm import init_db
    init_db()
    run_full_ingestion()
