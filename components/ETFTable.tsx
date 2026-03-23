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
  if (value === null || value === undefined) return <td className="px-3 py-2.5 text-center text-[#6982ff]/25">---</td>;
  const color = value >= 0 ? "text-[#3ef06b]" : "text-[#fe5b00]";
  return (
    <td className={`px-3 py-2.5 text-right font-mono text-[13px] ${color}`}>
      {value >= 0 ? "+" : ""}{value.toFixed(2)}%
    </td>
  );
}

function formatNumber(n: number | null): string {
  if (n === null || n === undefined) return "---";
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
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

  const SortHeader = ({ label, field, align }: { label: string; field: SortKey; align?: string }) => (
    <th
      className={`px-3 py-3 text-[9px] font-mono font-bold text-[#515151] uppercase tracking-[0.15em] cursor-pointer hover:text-[#3d52ef] select-none transition-colors ${align || "text-left"}`}
      onClick={() => handleSort(field)}
    >
      {label}
      <span className="text-[#3d52ef] ml-1">
        {sortKey === field ? (sortDir === "asc" ? "▲" : "▼") : ""}
      </span>
    </th>
  );

  return (
    <div>
      {/* Search */}
      <div className="mb-5 flex items-center gap-4">
        <div className="relative flex-1 max-w-lg">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3d52ef] font-mono text-xs">{">"}</span>
          <input
            type="text"
            placeholder="buscar ticker, nome, benchmark..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-4 py-2.5 bg-[--bg-surface] border border-[--border-subtle] rounded-lg text-[#f3f3f3] font-mono text-sm placeholder-[#6982ff]/25 focus:outline-none focus:border-[#3d52ef] focus:shadow-[0_0_0_1px_rgba(61,82,239,0.3)] transition-all"
          />
        </div>
        {selectedTickers.length > 0 && (
          <span className="text-[10px] font-mono text-[#3d52ef] bg-[#3d52ef]/10 px-3 py-1.5 rounded border border-[#3d52ef]/20">
            {selectedTickers.length} selecionado(s)
          </span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[--border-subtle] overflow-hidden glow-hover">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[--bg-surface] border-b border-[--border-subtle]">
                <th className="px-3 py-3 text-center text-[9px] font-mono text-[#515151] w-10">
                  <span className="text-[#3d52ef]">#</span>
                </th>
                <SortHeader label="Ticker" field="ticker" />
                <th className="px-3 py-3 text-left text-[9px] font-mono font-bold text-[#515151] uppercase tracking-[0.15em]">Nome</th>
                <th className="px-3 py-3 text-left text-[9px] font-mono font-bold text-[#515151] uppercase tracking-[0.15em]">Bench</th>
                <SortHeader label="Emissor" field="admin" />
                <SortHeader label="Preco" field="preco" align="text-right" />
                <SortHeader label="Taxa" field="taxa_adm" align="text-right" />
                <SortHeader label="PL" field="patrimonio" align="text-right" />
                <SortHeader label="Ult.Cota" field="ultima_cota" align="text-center" />
                {PERIODS.map(p => (
                  <SortHeader key={p} label={p.toUpperCase()} field={`ret_${p}` as SortKey} align="text-right" />
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((etf, idx) => (
                <tr
                  key={etf.ticker}
                  className={`border-b border-[#111114] cursor-pointer transition-all hover:bg-[--bg-hover] ${
                    selectedTickers.includes(etf.ticker) ? "bg-[#3d52ef]/[0.06]" : idx % 2 === 0 ? "bg-[--bg-base]" : "bg-[--bg-surface]/50"
                  }`}
                  onClick={() => onSelect(etf.ticker)}
                >
                  <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedTickers.includes(etf.ticker)}
                      onChange={() => onToggleCompare(etf.ticker)}
                      className="rounded-sm border-[--border-subtle] bg-transparent text-[#3d52ef] focus:ring-[#3d52ef] cursor-pointer accent-[#3d52ef] w-3.5 h-3.5"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono font-bold text-[13px] text-[#3d52ef]">{etf.ticker}</span>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-[#c6c6c6] max-w-[180px] truncate" title={etf.nome}>
                    {etf.nome_curto || etf.nome}
                  </td>
                  <td className="px-3 py-2.5 text-[11px] font-mono text-[#515151]">{etf.benchmark || "---"}</td>
                  <td className="px-3 py-2.5 text-[11px] text-[#515151] max-w-[120px] truncate" title={etf.admin || ""}>
                    {etf.admin || "---"}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-[13px] text-[#f3f3f3]">
                    {etf.preco ? `${etf.preco.toFixed(2)}` : "---"}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-[12px] text-[#515151]">
                    {etf.taxa_adm !== null ? `${etf.taxa_adm.toFixed(2)}%` : "---"}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-[12px] text-[#515151]">
                    {formatNumber(etf.patrimonio)}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono text-[11px] text-[#6982ff]/25">
                    {etf.ultima_cota
                      ? new Date(etf.ultima_cota + "T00:00:00").toLocaleDateString("pt-BR")
                      : "---"}
                  </td>
                  {PERIODS.map((p) => (
                    <ReturnCell key={p} value={etf.retornos[p]} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-[9px] font-mono text-[#515151] uppercase tracking-widest">{sorted.length} ETFs</p>
        <p className="text-[9px] font-mono text-[#6982ff]/25">00983+++crYPt0)(</p>
      </div>
    </div>
  );
}
