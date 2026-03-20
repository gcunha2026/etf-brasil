"use client";

import { useState, useEffect } from "react";
import ETFTable from "@/components/ETFTable";
import CompareChart from "@/components/CompareChart";
import ETFDetail from "@/components/ETFDetail";
import { fetchETFs, ETF } from "@/lib/api";

type Tab = "lista" | "comparador" | "ranking";

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
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-[#2a2a2a] bg-[#0a0a0a] sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">ETF Brasil</h1>
            <p className="text-xs text-gray-500">Consolidador de ETFs da B3</p>
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
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
                }`}
              >
                {tab.label}
                {tab.key === "comparador" && selectedTickers.length > 0 && (
                  <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5">
                    {selectedTickers.length}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="text-xs text-gray-600">
            {etfs.length} ETFs
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-[1400px] mx-auto px-4 py-6">
        {loading && (
          <div className="text-center py-20 text-gray-500">Carregando ETFs...</div>
        )}

        {error && (
          <div className="text-center py-20">
            <p className="text-red-400 mb-4">{error}</p>
            <p className="text-gray-500 text-sm">
              Inicie o backend com: <code className="bg-[#1a1a1a] px-2 py-1 rounded">cd backend && uvicorn main:app --reload</code>
            </p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Detail modal */}
            {detailTicker && (
              <div className="mb-6">
                <ETFDetail
                  ticker={detailTicker}
                  onClose={() => setDetailTicker(null)}
                />
              </div>
            )}

            {/* Tab content */}
            {activeTab === "lista" && (
              <div>
                {selectedTickers.length > 0 && (
                  <div className="mb-4 flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab("comparador")}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Comparar {selectedTickers.length} ETFs selecionados
                    </button>
                    <button
                      onClick={() => setSelectedTickers([])}
                      className="px-3 py-2 text-gray-400 hover:text-white text-sm"
                    >
                      Limpar selecao
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
        <div className="max-w-[1400px] mx-auto px-4 text-center text-xs text-gray-600">
          Dados: CVM (dados.cvm.gov.br) | BRAPI (brapi.dev) | Yahoo Finance
        </div>
      </footer>
    </div>
  );
}
