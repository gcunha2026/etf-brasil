import { readFileSync } from "fs";
import { join } from "path";

interface ETFRecord {
  ticker: string;
  nome: string;
  nome_curto: string;
  benchmark: string;
  taxa_adm: number | null;
  admin: string;
  gestor: string;
  data_inicio: string;
  patrimonio: number | null;
}

interface PriceRecord {
  d: string; // data
  o: number; // abertura
  h: number; // maxima
  l: number; // minima
  c: number; // fechamento
  v: number; // volume
}

interface BenchmarkRecord {
  d: string;
  v: number;
}

let _etfs: ETFRecord[] | null = null;
let _prices: Record<string, PriceRecord[]> | null = null;
let _benchmarks: Record<string, BenchmarkRecord[]> | null = null;

function loadJSON<T>(filename: string): T {
  const filePath = join(process.cwd(), "data", filename);
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

export function getETFs(): ETFRecord[] {
  if (!_etfs) _etfs = loadJSON<ETFRecord[]>("etfs.json");
  return _etfs;
}

export function getPrices(): Record<string, PriceRecord[]> {
  if (!_prices) _prices = loadJSON<Record<string, PriceRecord[]>>("prices.json");
  return _prices;
}

export function getBenchmarks(): Record<string, BenchmarkRecord[]> {
  if (!_benchmarks) _benchmarks = loadJSON<Record<string, BenchmarkRecord[]>>("benchmarks.json");
  return _benchmarks;
}

const RETURN_PERIODS: Record<string, number> = {
  "1m": 21, "3m": 63, "6m": 126, "1a": 252, "2a": 504,
};

export function calcReturns(closes: number[]): Record<string, number | null> {
  if (!closes.length) return {};
  const latest = closes[closes.length - 1];
  const returns: Record<string, number | null> = {};

  for (const [label, days] of Object.entries(RETURN_PERIODS)) {
    if (closes.length >= days && days > 0) {
      const oldPrice = closes.length > days ? closes[closes.length - days - 1] : closes[0];
      if (oldPrice && oldPrice > 0) {
        returns[label] = Math.round(((latest / oldPrice) - 1) * 10000) / 100;
      } else {
        returns[label] = null;
      }
    } else {
      returns[label] = null;
    }
  }
  return returns;
}
