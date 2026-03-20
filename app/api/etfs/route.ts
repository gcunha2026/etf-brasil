import { NextResponse } from "next/server";
import { getETFs, getPrices, calcReturns } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");

  const etfs = getETFs();
  const allPrices = getPrices();

  const results = [];

  for (const etf of etfs) {
    if (search && !(etf.ticker + " " + (etf.nome || "")).toLowerCase().includes(search.toLowerCase())) {
      continue;
    }

    const prices = allPrices[etf.ticker] || [];
    const closes = prices.map((p) => p.c);
    const returns = calcReturns(closes);

    const latest = prices.length > 0 ? prices[prices.length - 1] : null;

    results.push({
      ticker: etf.ticker,
      nome: etf.nome,
      nome_curto: etf.nome_curto,
      benchmark: etf.benchmark,
      taxa_adm: etf.taxa_adm,
      admin: etf.admin,
      preco: latest?.c ?? null,
      volume: latest?.v ?? null,
      patrimonio: etf.patrimonio,
      retornos: returns,
    });
  }

  return NextResponse.json({ etfs: results, total: results.length });
}
