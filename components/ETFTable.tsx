"use client";

import { useState } from "react";
import { ETF } from "@/lib/api";

interface Props {
  etfs: ETF[];
  onSelect: (ticker: string) => void;
  selectedTickers: string[];
  onToggleCompare: (ticker: string) => void;
}

const PERIODS = ["1m", "3m", "6m", "1a", "2a"] as const;

function ReturnCell({ value }: { value: number | null }) {
  if (value === null || value === undefined) return <td className="px-3 py-2 text-center text-gray-600">-</td>;
  const color = value >= 0 ? "text-green-400" : "text-red-400";
  return (
    <td className={`px-3 py-2 text-right font-mono text-sm ${color}`}>
      {value >= 0 ? "+" : ""}{value.toFixed(2)}%
    </td>
  );
}

function formatNumber(n: number | null, decimals = 2): string {
  if (n === null || n === undefined) return "-";
  if (n >= 1e9) return `R$ ${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `R$ ${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `R$ ${(n / 1e3).toFixed(1)}K`;
  return `R$ ${n.toFixed(decimals)}`;
}

type SortKey = "ticker" | "admin" | "taxa_adm" | "preco" | "patrimonio" | "ultima_cota" | "ret_1m" | "ret_3m" | "ret_6m" | "ret_1a" | "ret_2a";

export default function ETFTable({ etfs, onSelect, selectedTickers, onToggleCompare }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("ticker");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [search, setSearch] = useState("");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "ticker" ? "asc" : "desc");
    }
  };

  const filtered = etfs.filter((e) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      e.ticker.toLowerCase().includes(s) ||
      (e.nome || "").toLowerCase().includes(s) ||
      (e.benchmark || "").toLowerCase().includes(s) ||
      (e.admin || "").toLowerCase().includes(s)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    let va: number | string | null;
    let vb: number | string | null;

    if (sortKey.startsWith("ret_")) {
      const period = sortKey.replace("ret_", "");
      va = a.retornos[period];
      vb = b.retornos[period];
    } else {
      va = a[sortKey as keyof ETF] as number | string | null;
      vb = b[sortKey as keyof ETF] as number | string | null;
    }

    if (va === null || va === undefined) return 1;
    if (vb === null || vb === undefined) return -1;

    const cmp = typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-white select-none"
      onClick={() => handleSort(field)}
    >
      {label} {sortKey === field ? (sortDir === "asc" ? "▲" : "▼") : ""}
    </th>
  );

  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar ETF por ticker, nome ou benchmark..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        {selectedTickers.length > 0 && (
          <span className="ml-4 text-sm text-gray-400">
            {selectedTickers.length} selecionado(s) para comparar
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-[#2a2a2a]">
        <table className="w-full">
          <thead className="bg-[#141414]">
            <tr>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-400 w-10">
                <span title="Selecione para comparar">Comp.</span>
              </th>
              <SortHeader label="Ticker" field="ticker" />
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-400">Nome</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-400">Benchmark</th>
              <SortHeader label="Emissor" field="admin" />
              <SortHeader label="Preço" field="preco" />
              <SortHeader label="Taxa Adm" field="taxa_adm" />
              <SortHeader label="Patrimônio" field="patrimonio" />
              <SortHeader label="Últ. Cota" field="ultima_cota" />
              <SortHeader label="1M" field="ret_1m" />
              <SortHeader label="3M" field="ret_3m" />
              <SortHeader label="6M" field="ret_6m" />
              <SortHeader label="1A" field="ret_1a" />
              <SortHeader label="2A" field="ret_2a" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2a2a]">
            {sorted.map((etf) => (
              <tr
                key={etf.ticker}
                className="hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                onClick={() => onSelect(etf.ticker)}
              >
                <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedTickers.includes(etf.ticker)}
                    onChange={() => onToggleCompare(etf.ticker)}
                    className="rounded border-gray-600 bg-[#1a1a1a] text-blue-500 focus:ring-blue-500 cursor-pointer"
                  />
                </td>
                <td className="px-3 py-2 font-mono font-bold text-blue-400 text-sm">{etf.ticker}</td>
                <td className="px-3 py-2 text-sm text-gray-300 max-w-[200px] truncate" title={etf.nome}>
                  {etf.nome_curto || etf.nome}
                </td>
                <td className="px-3 py-2 text-sm text-gray-400">{etf.benchmark || "-"}</td>
                <td className="px-3 py-2 text-sm text-gray-400 max-w-[150px] truncate" title={etf.admin || ""}>
                  {etf.admin || "-"}
                </td>
                <td className="px-3 py-2 text-right font-mono text-sm">
                  {etf.preco ? `R$ ${etf.preco.toFixed(2)}` : "-"}
                </td>
                <td className="px-3 py-2 text-right font-mono text-sm text-gray-400">
                  {etf.taxa_adm !== null ? `${etf.taxa_adm.toFixed(2)}%` : "-"}
                </td>
                <td className="px-3 py-2 text-right text-sm text-gray-400">
                  {formatNumber(etf.patrimonio)}
                </td>
                <td className="px-3 py-2 text-center font-mono text-sm text-gray-400">
                  {etf.ultima_cota
                    ? new Date(etf.ultima_cota + "T00:00:00").toLocaleDateString("pt-BR")
                    : "-"}
                </td>
                {PERIODS.map((p) => (
                  <ReturnCell key={p} value={etf.retornos[p]} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs text-gray-600">{sorted.length} ETFs encontrados</p>
    </div>
  );
}
