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
  const color = value >= 0
    ? "bg-[#3ef06b]/10 text-[#3ef06b] border-[#3ef06b]/20"
    : "bg-[#fe5b00]/10 text-[#fe5b00] border-[#fe5b00]/20";
  return (
    <div className={`px-3 py-2 rounded-lg border ${color} text-center`}>
      <div className="text-[10px] text-[#515151] mb-1 uppercase tracking-wider">{label}</div>
      <div className="font-mono font-bold">{value >= 0 ? "+" : ""}{value.toFixed(2)}%</div>
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
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg p-8 text-center text-[#515151]">
        <div className="inline-block w-5 h-5 border-2 border-[#3d52ef] border-t-transparent rounded-full animate-spin mb-3" />
        <p>Carregando {ticker}...</p>
      </div>
    );
  }

  if (!data || "error" in data) {
    return (
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg p-8 text-center text-[#fe5b00]">
        ETF nao encontrado
        <button onClick={onClose} className="ml-4 text-[#515151] hover:text-[#f3f3f3]">Fechar</button>
      </div>
    );
  }

  const chartData = data.precos.map((p) => ({
    data: p.data,
    preco: p.fechamento,
  }));

  return (
    <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-[#3d52ef]">{data.ticker}</h2>
            {data.preco_atual && (
              <span className="text-xl font-mono text-[#f3f3f3]">
                R$ {data.preco_atual.toFixed(2)}
              </span>
            )}
          </div>
          <p className="text-[#c6c6c6] mt-1">{data.nome}</p>
        </div>
        <button
          onClick={onClose}
          className="text-[#515151] hover:text-[#f3f3f3] text-2xl leading-none transition-colors"
        >
          x
        </button>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
        <div>
          <span className="text-[10px] text-[#515151] uppercase tracking-wider">Benchmark</span>
          <p className="text-[#f3f3f3]">{data.benchmark || "-"}</p>
        </div>
        <div>
          <span className="text-[10px] text-[#515151] uppercase tracking-wider">Taxa Adm</span>
          <p className="text-[#f3f3f3]">{data.taxa_adm ? `${data.taxa_adm.toFixed(2)}% a.a.` : "-"}</p>
        </div>
        <div>
          <span className="text-[10px] text-[#515151] uppercase tracking-wider">Administrador</span>
          <p className="text-[#f3f3f3] truncate" title={data.admin}>{data.admin || "-"}</p>
        </div>
        <div>
          <span className="text-[10px] text-[#515151] uppercase tracking-wider">Inicio</span>
          <p className="text-[#f3f3f3]">{data.data_inicio || "-"}</p>
        </div>
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
          <h3 className="text-[10px] font-medium text-[#515151] uppercase tracking-wider mb-3">Historico de Precos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3d52ef" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3d52ef" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis
                dataKey="data"
                stroke="#515151"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => {
                  const d = new Date(v + "T00:00:00");
                  return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear().toString().slice(2)}`;
                }}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#515151"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `R$${v.toFixed(0)}`}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#161616", border: "1px solid #2a2a2a", borderRadius: "8px", fontFamily: "monospace" }}
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
  );
}
