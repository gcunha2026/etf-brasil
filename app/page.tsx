"use client";

import { useState, useEffect } from "react";
import ETFTable from "@/components/ETFTable";
import CompareChart from "@/components/CompareChart";
import ETFDetail from "@/components/ETFDetail";
import { fetchETFs, ETF } from "@/lib/api";

type Tab = "lista" | "comparador";

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
        setError("Erro ao carregar dados. Verifique se o backend esta rodando.");
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
    <div className="min-h-screen bg-[#0d0d0d]">
      {/* Header */}
      <header className="border-b border-[#2a2a2a] bg-[#0d0d0d]/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Fintrender logo mark */}
            <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 15 H80 V35 H45 V45 H70 V65 H45 V85 H20 V15Z" fill="#3d52ef"/>
              <path d="M55 25 Q75 25 75 35 Q75 45 55 50 L70 65 H45 L55 25Z" fill="#294199" opacity="0.6"/>
            </svg>
            <div>
              <h1 className="text-lg font-bold text-[#f3f3f3] tracking-tight">
                <span className="text-[#3d52ef]">Fin</span>trender
              </h1>
              <p className="text-[10px] text-[#515151] uppercase tracking-widest">ETF Brasil</p>
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex gap-1">
            {([
              { key: "lista", label: "Lista de ETFs" },
              { key: "comparador", label: "Comparador" },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? "bg-[#3d52ef] text-white"
                    : "text-[#515151] hover:text-[#f3f3f3] hover:bg-[#1c1c1c]"
                }`}
              >
                {tab.label}
                {tab.key === "comparador" && selectedTickers.length > 0 && (
                  <span className="ml-2 bg-[#294199] text-white text-xs rounded-full px-1.5 py-0.5">
                    {selectedTickers.length}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="text-xs text-[#515151] font-mono">
            {etfs.length} ETFs
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-[1400px] mx-auto px-4 py-6">
        {loading && (
          <div className="text-center py-20 text-[#515151]">
            <div className="inline-block w-6 h-6 border-2 border-[#3d52ef] border-t-transparent rounded-full animate-spin mb-4" />
            <p>Carregando ETFs...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <p className="text-[#fe5b00] mb-4">{error}</p>
            <p className="text-[#515151] text-sm">
              Inicie o backend com: <code className="bg-[#1c1c1c] px-2 py-1 rounded border border-[#2a2a2a]">cd backend && uvicorn main:app --reload</code>
            </p>
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
                  <div className="mb-4 flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab("comparador")}
                      className="px-4 py-2 bg-[#3d52ef] text-white rounded-lg text-sm font-medium hover:bg-[#294199] transition-colors"
                    >
                      Comparar {selectedTickers.length} ETFs selecionados
                    </button>
                    <button
                      onClick={() => setSelectedTickers([])}
                      className="px-3 py-2 text-[#515151] hover:text-[#f3f3f3] text-sm"
                    >
                      Limpar
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
      <footer className="border-t border-[#2a2a2a] py-4 mt-12">
        <div className="max-w-[1400px] mx-auto px-4 flex items-center justify-between text-[10px] text-[#515151] uppercase tracking-wider">
          <span>Dados: CVM | BRAPI | Yahoo Finance</span>
          <span className="font-medium">
            <span className="text-[#3d52ef]">Fin</span>trender
          </span>
        </div>
      </footer>
    </div>
  );
}
