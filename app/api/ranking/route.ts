import { NextResponse } from "next/server";
import { getETFs, getPrices, calcReturns } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "1a";
  const limit = parseInt(searchParams.get("limit") || "20");
  const category = searchParams.get("category");

  const etfs = getETFs();
  const allPrices = getPrices();

  const ranked: { ticker: string; nome: string; benchmark: string; taxa_adm: number | null; retorno: number }[] = [];

  for (const etf of etfs) {
    if (category) {
      const bench = (etf.benchmark || "").toLowerCase();
      const nome = (etf.nome || "").toLowerCase();
      if (!bench.includes(category.toLowerCase()) && !nome.includes(category.toLowerCase())) continue;
    }

    const prices = allPrices[etf.ticker] || [];
    const closes = prices.map((p) => p.c);
    const returns = calcReturns(closes);
    const retVal = returns[period];

    if (retVal !== null && retVal !== undefined) {
      ranked.push({
        ticker: etf.ticker,
        nome: etf.nome,
        benchmark: etf.benchmark,
        taxa_adm: etf.taxa_adm,
        retorno: retVal,
      });
    }
  }

  ranked.sort((a, b) => b.retorno - a.retorno);

  return NextResponse.json({ ranking: ranked.slice(0, limit), period, total: ranked.length });
}
