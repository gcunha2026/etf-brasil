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

const COLORS = [
  "#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
];

const BENCHMARKS = ["IBOV", "S&P 500", "CDI"];

export default function CompareChart({ tickers, onRemove }: Props) {
  const [period, setPeriod] = useState("1a");
  const [benchmark, setBenchmark] = useState<string>("");
  const [data, setData] = useState<{ data: string; [key: string]: number | string }[]>([]);
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

      // Merge all series into a unified dataset by date
      const dateMap = new Map<string, Record<string, number | string>>();

      for (const [key, points] of Object.entries(result.series)) {
        for (const p of points) {
          if (!dateMap.has(p.data)) {
            dateMap.set(p.data, { data: p.data });
          }
          dateMap.get(p.data)![key] = p.valor;
        }
      }

      const merged = Array.from(dateMap.values()).sort((a, b) =>
        (a.data as string).localeCompare(b.data as string)
      );

      setData(merged);
    } catch (e) {
      console.error("Error loading compare data:", e);
    }
    setLoading(false);
  }, [tickers, period, benchmark]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const allKeys = Object.keys(series);

  if (tickers.length === 0) {
    return (
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-8 text-center text-gray-500">
        Selecione ETFs na tabela para comparar
      </div>
    );
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-sm text-gray-400">Periodo:</span>
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              period === p.value
                ? "bg-blue-600 text-white"
                : "bg-[#2a2a2a] text-gray-400 hover:text-white"
            }`}
          >
            {p.label}
          </button>
        ))}

        <span className="ml-4 text-sm text-gray-400">Benchmark:</span>
        <select
          value={benchmark}
          onChange={(e) => setBenchmark(e.target.value)}
          className="bg-[#2a2a2a] border border-[#3a3a3a] rounded px-3 py-1 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
        >
          <option value="">Nenhum</option>
          {BENCHMARKS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      {/* Selected tickers */}
      <div className="flex flex-wrap gap-2 mb-4">
        {tickers.map((t, i) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-mono"
            style={{ backgroundColor: COLORS[i % COLORS.length] + "20", color: COLORS[i % COLORS.length] }}
          >
            {t}
            <button
              onClick={() => onRemove(t)}
              className="ml-1 hover:text-white"
            >
              x
            </button>
          </span>
        ))}
        {benchmark && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-mono bg-gray-700/30 text-gray-400">
            {benchmark}
            <button onClick={() => setBenchmark("")} className="ml-1 hover:text-white">x</button>
          </span>
        )}
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-[400px] flex items-center justify-center text-gray-500">Carregando...</div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis
              dataKey="data"
              stroke="#666"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => {
                const d = new Date(v + "T00:00:00");
                return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
              }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#666"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${v.toFixed(1)}%`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px" }}
              labelStyle={{ color: "#999" }}
              formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name]}
              labelFormatter={(label) => {
                const d = new Date(label + "T00:00:00");
                return d.toLocaleDateString("pt-BR");
              }}
            />
            <Legend />
            <ReferenceLine y={0} stroke="#555" strokeDasharray="3 3" />
            {allKeys.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={key.startsWith("BM:") ? "#888" : COLORS[tickers.indexOf(key) % COLORS.length]}
                strokeWidth={key.startsWith("BM:") ? 1.5 : 2}
                strokeDasharray={key.startsWith("BM:") ? "5 5" : undefined}
                dot={false}
                connectNulls
                name={key.replace("BM:", "")}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}

      <p className="mt-2 text-xs text-gray-600 text-center">
        Retorno normalizado (%) a partir do inicio do periodo
      </p>
    </div>
  );
}
