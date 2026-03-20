#!/bin/bash
# ETF Brasil - Run locally
# Usage: bash run_local.sh [ingest|backend|frontend|all]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

ingest() {
    echo "=== Running data ingestion ==="
    cd "$SCRIPT_DIR/backend"
    pip install -r requirements.txt -q
    python ingest.py --months 12
}

backend() {
    echo "=== Starting backend (port 8000) ==="
    cd "$SCRIPT_DIR/backend"
    pip install -r requirements.txt -q
    uvicorn main:app --reload --port 8000
}

frontend() {
    echo "=== Starting frontend (port 3000) ==="
    cd "$SCRIPT_DIR/frontend"
    npm install
    npm run dev
}

case "${1:-all}" in
    ingest)   ingest ;;
    backend)  backend ;;
    frontend) frontend ;;
    all)
        echo "Step 1: Ingesting data..."
        ingest
        echo ""
        echo "Step 2: Starting backend..."
        cd "$SCRIPT_DIR/backend"
        uvicorn main:app --reload --port 8000 &
        BACKEND_PID=$!
        sleep 2
        echo ""
        echo "Step 3: Starting frontend..."
        frontend
        kill $BACKEND_PID 2>/dev/null
        ;;
    *)
        echo "Usage: bash run_local.sh [ingest|backend|frontend|all]"
        ;;
esac
