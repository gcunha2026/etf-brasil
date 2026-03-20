import { NextResponse } from "next/server";
import { getETFs, getPrices, calcReturns } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const tickerUpper = ticker.toUpperCase();

  const etfs = getETFs();
  const etf = etfs.find((e) => e.ticker === tickerUpper);

  if (!etf) {
    return NextResponse.json({ error: "ETF not found" }, { status: 404 });
  }

  const allPrices = getPrices();
  const prices = allPrices[tickerUpper] || [];
  const closes = prices.map((p) => p.c);
  const returns = calcReturns(closes);

  const priceList = prices.map((p) => ({
    data: p.d,
    abertura: p.o,
    maxima: p.h,
    minima: p.l,
    fechamento: p.c,
    volume: p.v,
  }));

  return NextResponse.json({
    ticker: etf.ticker,
    nome: etf.nome,
    benchmark: etf.benchmark,
    taxa_adm: etf.taxa_adm,
    admin: etf.admin,
    gestor: etf.gestor,
    data_inicio: etf.data_inicio,
    preco_atual: prices.length > 0 ? prices[prices.length - 1].c : null,
    retornos: returns,
    precos: priceList,
    nav_historico: [],
  });
}
