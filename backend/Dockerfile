FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run ingestion on first start, then serve API
CMD python ingest.py --months 12 && uvicorn main:app --host 0.0.0.0 --port 8000
