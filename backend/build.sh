#!/usr/bin/env bash
set -e

pip install -r requirements.txt

# Run ingestion if DB doesn't exist yet
if [ ! -f etf_brasil.db ]; then
    echo "First deploy — running data ingestion..."
    python ingest.py --skip-cvm --months 12
fi
