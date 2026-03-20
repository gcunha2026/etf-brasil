"""
Unified ingestion script. Run this to populate the database.
Usage: python ingest.py [--months 12] [--skip-cvm] [--skip-prices]
"""

import argparse
import sys
from ingest_cvm import init_db, run_full_ingestion as run_cvm
from ingest_brapi import run_full_ingestion as run_brapi


def main():
    parser = argparse.ArgumentParser(description="ETF Brasil - Data Ingestion")
    parser.add_argument("--months", type=int, default=12, help="Months of NAV history to download")
    parser.add_argument("--skip-cvm", action="store_true", help="Skip CVM data download")
    parser.add_argument("--skip-prices", action="store_true", help="Skip price data download")
    args = parser.parse_args()

    print("=" * 60)
    print("ETF Brasil - Full Data Ingestion")
    print("=" * 60)

    init_db()

    if not args.skip_cvm:
        run_cvm(months_back=args.months)
    else:
        print("\nSkipping CVM ingestion.")

    if not args.skip_prices:
        run_brapi()
    else:
        print("\nSkipping price ingestion.")

    print("\n" + "=" * 60)
    print("All done! Database ready at: etf_brasil.db")
    print("Start the API with: uvicorn main:app --reload")
    print("=" * 60)


if __name__ == "__main__":
    main()
