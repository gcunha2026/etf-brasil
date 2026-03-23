"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { fetchETFDetail, ETFDetail as ETFDetailType } from "@/lib/api";

interface Props {
  ticker: string;
  onClose: () => void;
}

function ReturnBadge({ label, value }: { label: string; value: number | null }) {
  if (value === null || value === undefined) return null;
  const isPositive = value >= 0;
  return (
    <div className={`relative px-4 py-3 rounded-lg overflow-hidden text-center ${
      isPositive ? "bg-[#3ef06b]/5" : "bg-[#fe5b00]/5"
    }`}>
      {/* Side accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-[2px] ${isPositive ? "bg-[#3ef06b]" : "bg-[#fe5b00]"}`} />
      <div className="text-[9px] font-mono text-[#515151] uppercase tracking-widest mb-1">{label}</div>
      <div className={`font-mono font-bold text-lg ${isPositive ? "text-[#3ef06b]" : "text-[#fe5b00]"}`}>
        {isPositive ? "+" : ""}{value.toFixed(2)}%
      </div>
    </div>
  );
}

export default function ETFDetail({ ticker, onClose }: Props) {
  const [data, setData] = useState<ETFDetailType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchETFDetail(ticker)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ticker]);

  if (loading) {
    return (
      <div className="bg-[#111114] border border-[#1a1a1e] rounded-lg p-8 text-center">
        <div className="inline-flex items-center gap-3">
          <div className="w-2 h-2 bg-[#3d52ef] rounded-full animate-pulse" />
          <span className="text-xs font-mono text-[#515151]">Carregando {ticker}...</span>
        </div>
      </div>
    );
  }

  if (!data || "error" in data) {
    return (
      <div className="bg-[#111114] border border-[#1a1a1e] rounded-lg p-8 text-center">
        <span className="text-[#fe5b00] font-mono text-sm">ETF nao encontrado</span>
        <button onClick={onClose} className="ml-4 text-[#515151] hover:text-white font-mono text-xs">[fechar]</button>
      </div>
    );
  }

  const chartData = data.precos.map((p) => ({
    data: p.data,
    preco: p.fechamento,
  }));

  return (
    <div className="bg-[#111114] border border-[#1a1a1e] rounded-lg overflow-hidden">
      {/* Blue accent top bar */}
      <div className="h-[2px] bg-gradient-to-r from-[#3d52ef] via-[#6982ff] to-[#a649f0]" />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-baseline gap-4">
              <h2 className="text-3xl font-bold font-mono text-[#3d52ef]">{data.ticker}</h2>
              {data.preco_atual && (
                <span className="text-2xl font-mono text-white">
                  R$ {data.preco_atual.toFixed(2)}
                </span>
              )}
            </div>
            <p className="text-[#515151] text-sm mt-1 font-mono">{data.nome}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#515151] hover:text-[#3d52ef] font-mono text-xs px-3 py-1 rounded border border-[#1a1a1e] hover:border-[#3d52ef]/30 transition-all"
          >
            [fechar]
          </button>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Benchmark", value: data.benchmark || "---" },
            { label: "Taxa Adm", value: data.taxa_adm ? `${data.taxa_adm.toFixed(2)}% a.a.` : "---" },
            { label: "Administrador", value: data.admin || "---" },
            { label: "Inicio", value: data.data_inicio || "---" },
          ].map((item) => (
            <div key={item.label} className="bg-[#0a0a0c] rounded-lg px-4 py-3 border border-[#1a1a1e]">
              <div className="text-[9px] font-mono text-[#515151] uppercase tracking-widest mb-1">{item.label}</div>
              <div className="text-sm text-[#f3f3f3] font-mono truncate" title={item.value}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Returns */}
        <div className="grid grid-cols-5 gap-2 mb-6">
          <ReturnBadge label="1 Mes" value={data.retornos["1m"]} />
          <ReturnBadge label="3 Meses" value={data.retornos["3m"]} />
          <ReturnBadge label="6 Meses" value={data.retornos["6m"]} />
          <ReturnBadge label="1 Ano" value={data.retornos["1a"]} />
          <ReturnBadge label="2 Anos" value={data.retornos["2a"]} />
        </div>

        {/* Price chart */}
        {chartData.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-1 bg-[#3d52ef] rounded-full" />
              <h3 className="text-[9px] font-mono text-[#515151] uppercase tracking-widest">Historico de Precos</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3d52ef" stopOpacity={0.25} />
                    <stop offset="50%" stopColor="#6982ff" stopOpacity={0.08} />
                    <stop offset="95%" stopColor="#3d52ef" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1e" />
                <XAxis
                  dataKey="data"
                  stroke="#2a2a2e"
                  tick={{ fontSize: 10, fill: "#515151", fontFamily: "monospace" }}
                  tickFormatter={(v) => {
                    const d = new Date(v + "T00:00:00");
                    return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear().toString().slice(2)}`;
                  }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#2a2a2e"
                  tick={{ fontSize: 10, fill: "#515151", fontFamily: "monospace" }}
                  tickFormatter={(v) => `${v.toFixed(0)}`}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0a0a0c",
                    border: "1px solid #3d52ef30",
                    borderRadius: "8px",
                    fontFamily: "monospace",
                    fontSize: "12px",
                  }}
                  labelFormatter={(label) => new Date(label + "T00:00:00").toLocaleDateString("pt-BR")}
                  formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, "Preco"]}
                />
                <Area
                  type="monotone"
                  dataKey="preco"
                  stroke="#3d52ef"
                  strokeWidth={2}
                  fill="url(#colorPrice)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
