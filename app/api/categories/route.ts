import { NextResponse } from "next/server";
import { getETFs } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const etfs = getETFs();

  const countMap: Record<string, number> = {};
  for (const etf of etfs) {
    if (etf.benchmark) {
      countMap[etf.benchmark] = (countMap[etf.benchmark] || 0) + 1;
    }
  }

  const categories = Object.entries(countMap)
    .map(([nome, count]) => ({ nome, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ categories });
}
