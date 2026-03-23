"""
Daily update script for ETF Brasil.
Runs ingest, exports to JSON, and pushes to GitHub (triggers Vercel redeploy).
Usage: python update_daily.py
"""

import subprocess
import sys
import os
from datetime import datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.join(ROOT, "backend")


def run(cmd, cwd=None):
    print(f"  > {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd or ROOT)
    if result.returncode != 0:
        print(f"  WARNING: command exited with code {result.returncode}")
    return result.returncode


def main():
    print("=" * 50)
    print("ETF Brasil Daily Update")
    print(datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("=" * 50)

    # 1. Run ingestion
    print("\n[1/3] Running data ingestion...")
    run([sys.executable, "ingest.py", "--months", "3"], cwd=BACKEND)

    # 2. Export to JSON
    print("\n[2/3] Exporting to JSON...")
    run([sys.executable, "export_json.py"], cwd=BACKEND)

    # 3. Git push
    print("\n[3/3] Pushing to GitHub...")
    run(["git", "add", "data/etfs.json", "data/prices.json", "data/benchmarks.json"])

    today = datetime.now().strftime("%Y-%m-%d")
    rc = run(["git", "commit", "-m", f"chore: daily data update {today}"])
    if rc == 0:
        run(["git", "push"])
    else:
        print("  No changes to commit.")

    print("\n=== Update complete! ===")


if __name__ == "__main__":
    main()
