"""
Ingest ETF data from CVM (Comissão de Valores Mobiliários).
Downloads fund registration (cad_fi.csv) and daily NAV data (inf_diario).
No pandas dependency — uses stdlib csv module.
"""

import csv
import httpx
import sqlite3
from io import StringIO
from datetime import datetime, timedelta
from pathlib import Path

DB_PATH = Path(__file__).parent / "etf_brasil.db"
CVM_BASE = "https://dados.cvm.gov.br/dados/FI"

ETF_CLASSES = ["Fundo de Índice", "FI em Cotas de FI Índice", "ETF"]
ETF_KEYWORDS = ["ETF", "ÍNDICE", "INDEX", "ISHARES", "TREND ETF", "IT NOW"]


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS etf_cadastro (
            cnpj TEXT PRIMARY KEY,
            ticker TEXT,
            nome TEXT,
            nome_curto TEXT,
            classe TEXT,
            tipo TEXT,
            benchmark TEXT,
            admin TEXT,
            gestor TEXT,
            taxa_adm REAL,
            data_inicio TEXT,
            situacao TEXT,
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS etf_nav_diario (
            cnpj TEXT,
            data TEXT,
            nav REAL,
            patrimonio REAL,
            captacao REAL,
            resgate REAL,
            cotistas INTEGER,
            PRIMARY KEY (cnpj, data)
        );

        CREATE TABLE IF NOT EXISTS etf_precos (
            ticker TEXT,
            data TEXT,
            abertura REAL,
            maxima REAL,
            minima REAL,
            fechamento REAL,
            volume REAL,
            PRIMARY KEY (ticker, data)
        );

        CREATE TABLE IF NOT EXISTS benchmark_series (
            nome TEXT,
            data TEXT,
            valor REAL,
            PRIMARY KEY (nome, data)
        );

        CREATE INDEX IF NOT EXISTS idx_nav_data ON etf_nav_diario(data);
        CREATE INDEX IF NOT EXISTS idx_precos_data ON etf_precos(data);
        CREATE INDEX IF NOT EXISTS idx_benchmark_data ON benchmark_series(data);
    """)
    conn.close()


def parse_csv_from_text(text, delimiter=";"):
    """Parse CSV text into list of dicts."""
    reader = csv.DictReader(StringIO(text), delimiter=delimiter)
    rows = []
    for row in reader:
        try:
            rows.append(row)
        except Exception:
            continue
    return rows, reader.fieldnames or []


def download_cvm_cadastro():
    """Download fund registration file from CVM."""
    url = f"{CVM_BASE}/CAD/DADOS/cad_fi.csv"
    print(f"Downloading CVM cadastro from {url}...")

    response = httpx.get(url, timeout=120, follow_redirects=True)
    response.raise_for_status()

    rows, fields = parse_csv_from_text(response.text)
    print(f"  Total funds in CVM: {len(rows)}")
    return rows, fields


def matches_etf(row):
    """Check if a fund row is an ETF."""
    classe = (row.get("CLASSE") or "").upper()
    tp_fundo = (row.get("TP_FUNDO") or "").upper()
    nome = (row.get("DENOM_SOCIAL") or "").upper()

    for cls in ETF_CLASSES:
        if cls.upper() in classe:
            return True

    if "ETF" in tp_fundo:
        return True

    for kw in ETF_KEYWORDS:
        if kw.upper() in nome:
            return True

    return False


def is_active(row):
    """Check if fund is active."""
    sit = (row.get("SIT") or "").upper()
    return "FUNCIONAMENTO" in sit


def filter_etfs(rows):
    """Filter ETFs from the full fund list."""
    etfs = [r for r in rows if matches_etf(r) and is_active(r)]
    print(f"  ETFs found: {len(etfs)}")
    return etfs


def safe_float(val):
    """Convert string to float safely."""
    if not val or val.strip() == "":
        return None
    try:
        return float(val.replace(",", "."))
    except (ValueError, TypeError):
        return None


def save_cadastro(etfs):
    """Save ETF registration data to DB."""
    conn = get_db()
    now = datetime.now().isoformat()

    for row in etfs:
        cnpj = row.get("CNPJ_FUNDO", "")
        nome = row.get("DENOM_SOCIAL", "")
        taxa = safe_float(row.get("TAXA_ADM") or row.get("VL_TAXA_ADM", ""))

        conn.execute("""
            INSERT OR REPLACE INTO etf_cadastro
            (cnpj, ticker, nome, nome_curto, classe, tipo, benchmark, admin, gestor, taxa_adm, data_inicio, situacao, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            cnpj,
            "",  # ticker enriched later
            nome,
            nome[:60],
            row.get("CLASSE", ""),
            row.get("TP_FUNDO", ""),
            row.get("INDICE_REFER") or row.get("BENCHMARKS", ""),
            row.get("ADMIN", ""),
            row.get("GESTOR", ""),
            taxa,
            row.get("DT_INI_ATIV") or row.get("DT_REG", ""),
            row.get("SIT", ""),
            now,
        ))

    conn.commit()
    conn.close()
    print(f"  Saved {len(etfs)} ETFs to DB")


def download_nav_mensal(year, month):
    """Download monthly NAV data from CVM."""
    ym = f"{year}{month:02d}"
    url = f"{CVM_BASE}/DOC/INF_DIARIO/DADOS/inf_diario_fi_{ym}.csv"
    print(f"  Downloading NAV data for {ym}...")

    try:
        response = httpx.get(url, timeout=120, follow_redirects=True)
        response.raise_for_status()
        rows, _ = parse_csv_from_text(response.text)
        return rows
    except Exception as e:
        print(f"  Error downloading {ym}: {e}")
        return None


def save_nav_data(rows, etf_cnpjs):
    """Save NAV data for ETFs only."""
    if not rows:
        return 0

    # Filter only ETF CNPJs
    etf_rows = [r for r in rows if r.get("CNPJ_FUNDO") in etf_cnpjs]
    if not etf_rows:
        return 0

    conn = get_db()
    count = 0
    for row in etf_rows:
        try:
            cotistas_val = row.get("NR_COTST", "0")
            cotistas = int(cotistas_val) if cotistas_val and cotistas_val.strip() else 0

            conn.execute("""
                INSERT OR REPLACE INTO etf_nav_diario (cnpj, data, nav, patrimonio, captacao, resgate, cotistas)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                row.get("CNPJ_FUNDO", ""),
                row.get("DT_COMPTC", ""),
                safe_float(row.get("VL_QUOTA", "0")) or 0,
                safe_float(row.get("VL_PATRIM_LIQ", "0")) or 0,
                safe_float(row.get("CAPTC_DIA", "0")) or 0,
                safe_float(row.get("RESG_DIA", "0")) or 0,
                cotistas,
            ))
            count += 1
        except (ValueError, TypeError):
            continue

    conn.commit()
    conn.close()
    return count


def ingest_nav_history(months_back=6):
    """Download NAV data for the last N months."""
    conn = get_db()
    etf_cnpjs = set(
        r[0] for r in conn.execute("SELECT cnpj FROM etf_cadastro").fetchall()
    )
    conn.close()

    if not etf_cnpjs:
        print("No ETFs in DB. Run cadastro ingestion first.")
        return

    print(f"Downloading NAV for {len(etf_cnpjs)} ETFs, last {months_back} months...")

    today = datetime.now()
    total = 0
    for i in range(months_back):
        dt = today - timedelta(days=30 * i)
        rows = download_nav_mensal(dt.year, dt.month)
        count = save_nav_data(rows, etf_cnpjs)
        total += count
        print(f"    Saved {count} NAV records for {dt.year}-{dt.month:02d}")

    print(f"  Total NAV records saved: {total}")


def run_full_ingestion(months_back=6):
    """Run complete CVM data ingestion."""
    print("=" * 60)
    print("CVM Data Ingestion")
    print("=" * 60)

    init_db()

    # Step 1: Download and save cadastro
    print("\n[1/2] Downloading fund registration...")
    rows, fields = download_cvm_cadastro()
    etfs = filter_etfs(rows)
    save_cadastro(etfs)

    # Step 2: Download NAV history
    print(f"\n[2/2] Downloading NAV history ({months_back} months)...")
    ingest_nav_history(months_back)

    print("\nCVM ingestion complete!")


if __name__ == "__main__":
    run_full_ingestion(months_back=12)
