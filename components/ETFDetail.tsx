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
  const color = value >= 0 ? "bg-green-900/40 text-green-400" : "bg-red-900/40 text-red-400";
  return (
    <div className={`px-3 py-2 rounded-lg ${color} text-center`}>
      <div className="text-xs text-gray-400 mb-1">{label}</div>
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
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-8 text-center text-gray-500">
        Carregando {ticker}...
      </div>
    );
  }

  if (!data || "error" in data) {
    return (
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-8 text-center text-red-400">
        ETF nao encontrado
        <button onClick={onClose} className="ml-4 text-gray-400 hover:text-white">Fechar</button>
      </div>
    );
  }

  const chartData = data.precos.map((p) => ({
    data: p.data,
    preco: p.fechamento,
  }));

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">{data.ticker}</h2>
            {data.preco_atual && (
              <span className="text-xl font-mono text-gray-300">
                R$ {data.preco_atual.toFixed(2)}
              </span>
            )}
          </div>
          <p className="text-gray-400 mt-1">{data.nome}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white text-2xl leading-none"
        >
          x
        </button>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
        <div>
          <span className="text-gray-500">Benchmark</span>
          <p className="text-white">{data.benchmark || "-"}</p>
        </div>
        <div>
          <span className="text-gray-500">Taxa Administracao</span>
          <p className="text-white">{data.taxa_adm ? `${data.taxa_adm.toFixed(2)}% a.a.` : "-"}</p>
        </div>
        <div>
          <span className="text-gray-500">Administrador</span>
          <p className="text-white truncate" title={data.admin}>{data.admin || "-"}</p>
        </div>
        <div>
          <span className="text-gray-500">Inicio</span>
          <p className="text-white">{data.data_inicio || "-"}</p>
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
          <h3 className="text-sm font-medium text-gray-400 mb-2">Historico de Precos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis
                dataKey="data"
                stroke="#666"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => {
                  const d = new Date(v + "T00:00:00");
                  return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear().toString().slice(2)}`;
                }}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#666"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `R$${v.toFixed(0)}`}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px" }}
                labelFormatter={(label) => new Date(label + "T00:00:00").toLocaleDateString("pt-BR")}
                formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, "Preco"]}
              />
              <Area
                type="monotone"
                dataKey="preco"
                stroke="#3b82f6"
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
