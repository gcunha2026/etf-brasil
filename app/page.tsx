"use client";

import { useState, useEffect } from "react";
import ETFTable from "@/components/ETFTable";
import CompareChart from "@/components/CompareChart";
import ETFDetail from "@/components/ETFDetail";
import { fetchETFs, ETF } from "@/lib/api";

type Tab = "lista" | "comparador";

const TAPE_TEXT = "00983+++crYPt0)(  ETF BRASIL  00983+++crYPt0)(  TURNING DATA INTO INTELLIGENCE  ";

export default function Home() {
  const [etfs, setEtfs] = useState<ETF[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);
  const [detailTicker, setDetailTicker] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("lista");

  useEffect(() => {
    fetchETFs()
      .then((data) => {
        setEtfs(data.etfs);
        setLoading(false);
      })
      .catch((e) => {
        setError("Erro ao carregar dados.");
        setLoading(false);
        console.error(e);
      });
  }, []);

  const toggleCompare = (ticker: string) => {
    setSelectedTickers((prev) =>
      prev.includes(ticker)
        ? prev.filter((t) => t !== ticker)
        : prev.length < 10
        ? [...prev, ticker]
        : prev
    );
  };

  const removeFromCompare = (ticker: string) => {
    setSelectedTickers((prev) => prev.filter((t) => t !== ticker));
  };

  return (
    <div className="min-h-screen bg-[--bg-base] pixel-pattern">
      {/* Ticker tape bar */}
      <div className="bg-[#202020] overflow-hidden whitespace-nowrap">
        <div className="ticker-tape inline-block py-3">
          <span className="text-[12px] font-mono text-[#6982ff] tracking-widest">
            {TAPE_TEXT.repeat(12)}
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-[--border-subtle]">
        <div className="max-w-[1400px] mx-auto px-4 py-5">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-4 mb-1">
                {/* Pixel block logo mark */}
                <div className="w-10 h-10 relative">
                  <div className="absolute top-0 left-0 w-4 h-4 bg-[#3d52ef] rounded-[2px]" />
                  <div className="absolute top-0 left-5 w-5 h-4 bg-[#3d52ef] rounded-[2px]" />
                  <div className="absolute top-5 left-0 w-4 h-5 bg-[#3d52ef] rounded-[2px]" />
                  <div className="absolute top-5 left-5 w-3 h-3 bg-[#6982ff] rounded-[2px]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#202020]">
                    <span className="text-[#3d52ef]">Fin</span>trender
                  </h1>
                </div>
              </div>
              <p className="text-[11px] font-mono text-[#c6c6c6] ml-14">
                turning <span className="text-[#3d52ef]">ETF</span> intelligence <span className="font-bold text-[#515151]">UP</span>
              </p>
            </div>

            <div className="flex items-center gap-6">
              <nav className="flex gap-1 bg-[--bg-raised] rounded-lg p-1 border border-[--border-subtle]">
                {([
                  { key: "lista", label: "Lista" },
                  { key: "comparador", label: "Comparador" },
                ] as const).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-5 py-2 rounded-md text-xs font-mono font-bold uppercase tracking-wider transition-all ${
                      activeTab === tab.key
                        ? "bg-[#3d52ef] text-white shadow-md shadow-[#3d52ef]/20"
                        : "text-[#999] hover:text-[#202020]"
                    }`}
                  >
                    {tab.label}
                    {tab.key === "comparador" && selectedTickers.length > 0 && (
                      <span className="ml-2 bg-white/20 text-white text-[10px] rounded px-1.5 py-0.5">
                        {selectedTickers.length}
                      </span>
                    )}
                  </button>
                ))}
              </nav>

              <div className="text-right">
                <div className="text-xl font-bold font-mono text-[#202020]">{etfs.length}</div>
                <div className="text-[9px] text-[#c6c6c6] uppercase tracking-widest">ETFs</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-[1400px] mx-auto px-4 py-6">
        {loading && (
          <div className="text-center py-20">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-lg bg-white border border-[--border-subtle]">
              <div className="w-2 h-2 bg-[#3d52ef] rounded-full animate-pulse" />
              <div className="w-2 h-2 bg-[#6982ff] rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
              <div className="w-2 h-2 bg-[#294199] rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
              <span className="text-xs font-mono text-[#999] ml-2">Carregando ETFs...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <div className="inline-block px-6 py-4 rounded-lg bg-white border border-red-200">
              <p className="text-red-600 font-mono text-sm mb-2">{error}</p>
              <p className="text-[#999] text-xs font-mono">
                <code className="bg-[--bg-raised] px-2 py-1 rounded border border-[--border-subtle]">cd backend && uvicorn main:app --reload</code>
              </p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {detailTicker && (
              <div className="mb-6">
                <ETFDetail
                  ticker={detailTicker}
                  onClose={() => setDetailTicker(null)}
                />
              </div>
            )}

            {activeTab === "lista" && (
              <div>
                {selectedTickers.length > 0 && (
                  <div className="mb-4 flex items-center gap-3">
                    <button
                      onClick={() => setActiveTab("comparador")}
                      className="px-5 py-2 bg-[#3d52ef] text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider hover:shadow-lg hover:shadow-[#3d52ef]/20 transition-all"
                    >
                      Comparar {selectedTickers.length} ETFs +++
                    </button>
                    <button
                      onClick={() => setSelectedTickers([])}
                      className="px-3 py-2 text-[#999] hover:text-[#202020] text-xs font-mono"
                    >
                      [limpar]
                    </button>
                  </div>
                )}
                <ETFTable
                  etfs={etfs}
                  onSelect={(t) => setDetailTicker(t)}
                  selectedTickers={selectedTickers}
                  onToggleCompare={toggleCompare}
                />
              </div>
            )}

            {activeTab === "comparador" && (
              <CompareChart
                tickers={selectedTickers}
                onRemove={removeFromCompare}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <div className="mt-12 border-t border-[--border-subtle]">
        <div className="overflow-hidden whitespace-nowrap bg-[#202020]">
          <div className="ticker-tape inline-block py-3" style={{ animationDirection: "reverse", animationDuration: "40s" }}>
            <span className="text-[12px] font-mono text-[#6982ff] tracking-widest">
              {TAPE_TEXT.repeat(12)}
            </span>
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-[9px] font-mono text-[#c6c6c6] uppercase tracking-widest">
            Dados: CVM | BRAPI | Yahoo Finance
          </span>
          <span className="text-xs font-mono font-bold">
            <span className="text-[#3d52ef]">Fin</span><span className="text-[#c6c6c6]">trender</span>
            <span className="text-[9px] text-[#dddddd] ml-2">2026</span>
          </span>
        </div>
      </div>
    </div>
  );
}
