"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { fetchCompare, CompareSeries } from "@/lib/api";

interface Props {
  tickers: string[];
  onRemove: (ticker: string) => void;
}

const PERIODS = [
  { label: "1M", value: "1m" },
  { label: "3M", value: "3m" },
  { label: "6M", value: "6m" },
  { label: "1A", value: "1a" },
  { label: "2A", value: "2a" },
];

// Fintrender brand palette
const COLORS = [
  "#3d52ef", "#3ef06b", "#fe5b00", "#f0eb3e", "#a649f0",
  "#1ad0e9", "#6982ff", "#294199", "#ec4899", "#14b8a6",
];

const BENCHMARKS = ["IBOV", "S&P 500", "CDI"];

export default function CompareChart({ tickers, onRemove }: Props) {
  const [period, setPeriod] = useState("1a");
  const [benchmark, setBenchmark] = useState<string>("");
  const [data, setData] = useState<Record<string, number | string>[]>([]);
  const [series, setSeries] = useState<CompareSeries>({});
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (tickers.length === 0) {
      setData([]);
      setSeries({});
      return;
    }

    setLoading(true);
    try {
      const result = await fetchCompare(tickers, period, benchmark || undefined);
      setSeries(result.series);

      const dateMap = new Map<string, Record<string, number | string>>();
      for (const [key, points] of Object.entries(result.series)) {
        for (const p of points) {
          if (!dateMap.has(p.data)) dateMap.set(p.data, { data: p.data });
          dateMap.get(p.data)![key] = p.valor;
        }
      }

      setData(Array.from(dateMap.values()).sort((a, b) =>
        (a.data as string).localeCompare(b.data as string)
      ));
    } catch (e) {
      console.error("Error loading compare data:", e);
    }
    setLoading(false);
  }, [tickers, period, benchmark]);

  useEffect(() => { loadData(); }, [loadData]);

  const allKeys = Object.keys(series);

  if (tickers.length === 0) {
    return (
      <div className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-12 text-center">
        <div className="text-[#3d52ef] font-mono text-lg mb-2">+++</div>
        <p className="text-[#515151] font-mono text-sm">Selecione ETFs na tabela para comparar</p>
      </div>
    );
  }

  return (
    <div className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg overflow-hidden">
      <div className="h-[2px] bg-gradient-to-r from-[#3d52ef] via-[#a649f0] to-[#3d52ef]" />

      <div className="p-5">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 mb-5">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-[#515151] uppercase tracking-widest">Periodo</span>
            <div className="flex gap-0.5 bg-[--bg-base] rounded-lg p-0.5 border border-[--border-subtle]">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-mono font-bold transition-all ${
                    period === p.value
                      ? "bg-[#3d52ef] text-white shadow-lg shadow-[#3d52ef]/20"
                      : "text-[#515151] hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-[#515151] uppercase tracking-widest">Bench</span>
            <select
              value={benchmark}
              onChange={(e) => setBenchmark(e.target.value)}
              className="bg-[--bg-base] border border-[--border-subtle] rounded-lg px-3 py-1.5 text-[11px] font-mono text-[#c6c6c6] focus:outline-none focus:border-[#3d52ef]"
            >
              <option value="">---</option>
              {BENCHMARKS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected tickers */}
        <div className="flex flex-wrap gap-2 mb-5">
          {tickers.map((t, i) => {
            const color = COLORS[i % COLORS.length];
            return (
              <span
                key={t}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-mono font-bold border transition-all hover:shadow-lg"
                style={{
                  backgroundColor: color + "10",
                  color: color,
                  borderColor: color + "25",
                  boxShadow: `0 0 0 0 ${color}00`,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                {t}
                <button onClick={() => onRemove(t)} className="hover:opacity-60 text-[10px]">x</button>
              </span>
            );
          })}
          {benchmark && (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-mono bg-[--bg-base] text-[#515151] border border-[--border-subtle]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#515151]" />
              {benchmark}
              <button onClick={() => setBenchmark("")} className="hover:text-white text-[10px]">x</button>
            </span>
          )}
        </div>

        {/* Chart */}
        {loading ? (
          <div className="h-[400px] flex items-center justify-center">
            <div className="inline-flex items-center gap-3">
              <div className="w-2 h-2 bg-[#3d52ef] rounded-full animate-pulse" />
              <div className="w-2 h-2 bg-[#6982ff] rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
              <div className="w-2 h-2 bg-[#294199] rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262840" />
              <XAxis
                dataKey="data"
                stroke="#262840"
                tick={{ fontSize: 10, fill: "#515151", fontFamily: "monospace" }}
                tickFormatter={(v) => {
                  const d = new Date(v + "T00:00:00");
                  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
                }}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#262840"
                tick={{ fontSize: 10, fill: "#515151", fontFamily: "monospace" }}
                tickFormatter={(v) => `${v.toFixed(1)}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#13141d",
                  border: "1px solid #3d52ef30",
                  borderRadius: "8px",
                  fontFamily: "monospace",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "#515151" }}
                formatter={(value, name) => [`${Number(value).toFixed(2)}%`, name]}
                labelFormatter={(label) => new Date(label + "T00:00:00").toLocaleDateString("pt-BR")}
              />
              <Legend
                wrapperStyle={{ fontFamily: "monospace", fontSize: "11px" }}
              />
              <ReferenceLine y={0} stroke="#262840" strokeWidth={1} />
              {allKeys.map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={key.startsWith("BM:") ? "#515151" : COLORS[tickers.indexOf(key) % COLORS.length]}
                  strokeWidth={key.startsWith("BM:") ? 1.5 : 2.5}
                  strokeDasharray={key.startsWith("BM:") ? "5 5" : undefined}
                  dot={false}
                  connectNulls
                  name={key.replace("BM:", "")}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}

        <div className="mt-3 flex items-center justify-between">
          <p className="text-[9px] font-mono text-[#515151] uppercase tracking-widest">
            Retorno normalizado (%) a partir do inicio do periodo
          </p>
          <p className="text-[9px] font-mono text-[#6982ff]/25">00983+++crYPt0)(</p>
        </div>
      </div>
    </div>
  );
}
