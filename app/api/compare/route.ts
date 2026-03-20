import { NextResponse } from "next/server";
import { getPrices, getBenchmarks } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tickersStr = searchParams.get("tickers") || "";
  const period = searchParams.get("period") || "1a";
  const benchmark = searchParams.get("benchmark") || "";

  const tickerList = tickersStr.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean);

  const daysMap: Record<string, number> = { "1m": 30, "3m": 90, "6m": 180, "1a": 365, "2a": 730 };
  const now = new Date();
  const startDate = new Date(now.getTime() - (daysMap[period] || 365) * 86400000)
    .toISOString().slice(0, 10);

  const allPrices = getPrices();
  const series: Record<string, { data: string; valor: number }[]> = {};

  for (const ticker of tickerList) {
    const prices = (allPrices[ticker] || []).filter((p) => p.d >= startDate);
    if (prices.length > 0) {
      const base = prices[0].c;
      if (base > 0) {
        series[ticker] = prices.map((p) => ({
          data: p.d,
          valor: Math.round(((p.c / base) - 1) * 10000) / 100,
        }));
      }
    }
  }

  if (benchmark) {
    const allBenchmarks = getBenchmarks();
    const benchPrices = (allBenchmarks[benchmark] || []).filter((p) => p.d >= startDate);
    if (benchPrices.length > 0) {
      const base = benchPrices[0].v;
      if (base > 0) {
        series[`BM:${benchmark}`] = benchPrices.map((p) => ({
          data: p.d,
          valor: Math.round(((p.v / base) - 1) * 10000) / 100,
        }));
      }
    }
  }

  return NextResponse.json({ series, period, start_date: startDate });
}
