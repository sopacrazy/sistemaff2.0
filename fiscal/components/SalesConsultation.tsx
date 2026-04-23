import React, { useState } from "react";
import {
  Calendar,
  Search,
  Download,
  AlertCircle,
  FileWarning,
  ArrowRight,
} from "lucide-react";
import { FiscalIssue } from "../types";

// Mock generator for consultation results within a date range
const generateMockData = (
  startDate: string,
  endDate: string
): FiscalIssue[] => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Logic to determine number of mock items based on range duration
  // If range is large, more items, capped at 20 for demo
  const mockCount = Math.min(Math.max(Math.floor(diffDays / 2) + 2, 3), 20);

  const issues: FiscalIssue[] = [];

  for (let i = 0; i < mockCount; i++) {
    // Generate a random date within the range
    const randomTime =
      start.getTime() + Math.random() * (end.getTime() - start.getTime());
    const randomDate = new Date(randomTime).toISOString().split("T")[0];

    issues.push({
      id: `VND-${randomDate.replace(/-/g, "")}-${1000 + i}`,
      date: randomDate,
      customer: `Cliente Exemplo ${String.fromCharCode(65 + (i % 26))}`,
      value: Math.floor(Math.random() * 5000) + 150,
      description: "Venda de Mercadorias Variadas",
      status: Math.random() > 0.6 ? "Sem Nota" : "Erro Emissão",
    });
  }

  // Sort by date descending
  return issues.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
};

export const SalesConsultation: React.FC = () => {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [results, setResults] = useState<FiscalIssue[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = () => {
    if (!startDate || !endDate) return;

    // Simple validation
    if (new Date(startDate) > new Date(endDate)) {
      alert("A data inicial não pode ser maior que a data final.");
      return;
    }

    setIsLoading(true);
    setResults([]);

    // Simulate network delay
    setTimeout(() => {
      const data = generateMockData(startDate, endDate);
      setResults(data);
      setHasSearched(true);
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Consultar Pendências por Período
        </h1>
        <p className="text-slate-500 mt-1">
          Busque no banco de dados todas as vendas registradas que não possuem
          documento fiscal vinculado dentro de um intervalo de datas.
        </p>
      </div>

      {/* Filter Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row items-end gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full lg:w-auto flex-1">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-500" />
                Data Inicial
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-slate-700"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-500" />
                Data Final
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-slate-700"
              />
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={!startDate || !endDate || isLoading}
            className={`w-full lg:w-auto px-6 py-2.5 rounded-lg font-medium text-white flex items-center justify-center gap-2 shadow-sm transition-all whitespace-nowrap ${
              !startDate || !endDate || isLoading
                ? "bg-slate-300 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-700 hover:shadow-md"
            }`}
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            Consultar Registros
          </button>
        </div>
      </div>

      {/* Results Section */}
      {hasSearched && (
        <div className="space-y-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              Resultados Encontrados
              <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-0.5 rounded-full border border-slate-200">
                {results.length} registros
              </span>
            </h2>
            {results.length > 0 && (
              <button className="text-sm text-emerald-600 font-medium hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors">
                <Download className="w-4 h-4" /> Exportar Relatório
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">ID Venda</th>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Descrição</th>
                    <th className="px-6 py-4 text-right">Valor (R$)</th>
                    <th className="px-6 py-4">Situação</th>
                    <th className="px-6 py-4 text-center">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.length > 0 ? (
                    results.map((issue) => (
                      <tr
                        key={issue.id}
                        className="hover:bg-slate-50 transition-colors group"
                      >
                        <td className="px-6 py-3 font-medium text-slate-900">
                          {issue.date}
                        </td>
                        <td className="px-6 py-3 font-mono text-xs text-slate-500 font-medium">
                          {issue.id}
                        </td>
                        <td className="px-6 py-3 font-medium text-slate-900">
                          {issue.customer}
                        </td>
                        <td className="px-6 py-3 text-slate-500 truncate max-w-xs">
                          {issue.description}
                        </td>
                        <td className="px-6 py-3 text-right font-medium text-slate-900">
                          R${" "}
                          {issue.value.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                              issue.status === "Sem Nota"
                                ? "bg-red-50 text-red-700 border-red-100"
                                : "bg-amber-50 text-amber-700 border-amber-100"
                            }`}
                          >
                            <FileWarning className="w-3 h-3 mr-1" />
                            {issue.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <button className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                            <AlertCircle className="w-6 h-6 text-slate-300" />
                          </div>
                          <p className="font-medium text-slate-600">
                            Nenhuma pendência encontrada
                          </p>
                          <p className="text-sm mt-1">
                            Não há registros de vendas sem nota entre{" "}
                            <span className="font-mono text-slate-500">
                              {startDate}
                            </span>{" "}
                            e{" "}
                            <span className="font-mono text-slate-500">
                              {endDate}
                            </span>
                            .
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {results.length > 0 && (
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row justify-end gap-6 text-xs font-medium text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  Sem Nota:{" "}
                  {results.filter((r) => r.status === "Sem Nota").length}
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Erro Emissão:{" "}
                  {results.filter((r) => r.status === "Erro Emissão").length}
                </div>
                <div className="sm:pl-4 sm:border-l border-slate-200">
                  Total Pendente: R${" "}
                  {results
                    .reduce((acc, curr) => acc + curr.value, 0)
                    .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
