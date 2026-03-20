import { NextResponse } from "next/server";
import { getBenchmarks } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const allBenchmarks = getBenchmarks();

  const benchmarks = Object.entries(allBenchmarks).map(([nome, records]) => ({
    nome,
    desde: records[0]?.d || "",
    ate: records[records.length - 1]?.d || "",
    pontos: records.length,
  }));

  return NextResponse.json({ benchmarks });
}
