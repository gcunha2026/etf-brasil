const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export interface ETF {
  ticker: string;
  nome: string;
  nome_curto: string;
  benchmark: string;
  taxa_adm: number | null;
  admin: string;
  preco: number | null;
  volume: number | null;
  patrimonio: number | null;
  ultima_cota: string | null;
  retornos: Record<string, number | null>;
}

export interface ETFDetail extends ETF {
  gestor: string;
  data_inicio: string;
  preco_atual: number | null;
  precos: {
    data: string;
    abertura: number;
    maxima: number;
    minima: number;
    fechamento: number;
    volume: number;
  }[];
  nav_historico: {
    data: string;
    nav: number;
    patrimonio: number;
    cotistas: number;
  }[];
}

export interface CompareSeries {
  [ticker: string]: { data: string; valor: number }[];
}

export async function fetchETFs(search?: string, sortBy?: string, sortDir?: string): Promise<{ etfs: ETF[]; total: number }> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (sortBy) params.set("sort_by", sortBy);
  if (sortDir) params.set("sort_dir", sortDir);

  const res = await fetch(`${API_BASE}/api/etfs?${params}`, { cache: "no-store" });
  return res.json();
}

export async function fetchETFDetail(ticker: string): Promise<ETFDetail> {
  const res = await fetch(`${API_BASE}/api/etf/${ticker}`, { cache: "no-store" });
  return res.json();
}

export async function fetchCompare(
  tickers: string[],
  period: string,
  benchmark?: string
): Promise<{ series: CompareSeries; period: string; start_date: string }> {
  const params = new URLSearchParams({
    tickers: tickers.join(","),
    period,
  });
  if (benchmark) params.set("benchmark", benchmark);

  const res = await fetch(`${API_BASE}/api/compare?${params}`, { cache: "no-store" });
  return res.json();
}

export async function fetchRanking(
  period: string,
  limit: number = 20,
  category?: string
): Promise<{ ranking: { ticker: string; nome: string; benchmark: string; taxa_adm: number; retorno: number }[]; period: string; total: number }> {
  const params = new URLSearchParams({ period, limit: String(limit) });
  if (category) params.set("category", category);

  const res = await fetch(`${API_BASE}/api/ranking?${params}`, { cache: "no-store" });
  return res.json();
}

export async function fetchBenchmarks(): Promise<{ benchmarks: { nome: string; desde: string; ate: string; pontos: number }[] }> {
  const res = await fetch(`${API_BASE}/api/benchmarks`, { cache: "no-store" });
  return res.json();
}

export async function fetchCategories(): Promise<{ categories: { nome: string; count: number }[] }> {
  const res = await fetch(`${API_BASE}/api/categories`, { cache: "no-store" });
  return res.json();
}
