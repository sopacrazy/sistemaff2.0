import React, { useState } from "react";
import * as XLSX from "xlsx";
import {
  Search,
  Loader2,
  DollarSign,
  Download,
  Calendar,
  FileText,
  Filter,
} from "lucide-react";

import { API_BASE_URL as BASE } from "../../utils/apiConfig";
const API_BASE_URL = `${BASE}/api`;

interface Props {
  filial: string;
}

export const RelatorioFunrural: React.FC<Props> = ({ filial }) => {
  const [dataInicio, setDataInicio] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [dataFim, setDataFim] = useState(new Date().toISOString().slice(0, 10));
  const [nota, setNota] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [buscou, setBuscou] = useState(false);

  const [resultados, setResultados] = useState<any[]>([]);

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setResultados([]);

    try {
      const response = await fetch(`${API_BASE_URL}/relatorios/funrural`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataInicio,
          dataFim,
          nota,
          filial,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setResultados(data);
        setBuscou(true);
      } else {
        alert("Erro: " + (data.error || "Erro ao buscar dados"));
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão.");
    } finally {
      setCarregando(false);
    }
  };

  const handleExportarExcel = () => {
    const dadosExcel = resultados.map((r) => ({
      Filial: r.filial,
      Entrada: r.entrada,
      TES: r.tes,
      "Nota Fiscal": r.nota,
      Série: r.serie,
      Cliente: r.cliefor,
      Loja: r.loja,
      "Soma de Total": r.total,
      Base: r.base,
      "INSS 1,2%": r.inss,
      "GILRAT 0,1%": r.gilrat,
      "SENAR 0,2%": r.senar,
      "Valor Funrural": r.valorFunrural,
    }));

    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório Funrural");
    XLSX.writeFile(wb, `RelatorioFunrural_${filial}.xlsx`);
  };

  const fmt = (valor: number) =>
    valor.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const totais = resultados.reduce(
    (acc, r) => ({
      total: acc.total + r.total,
      base: acc.base + r.base,
      inss: acc.inss + r.inss,
      gilrat: acc.gilrat + r.gilrat,
      senar: acc.senar + r.senar,
      funrural: acc.funrural + r.valorFunrural,
    }),
    { total: 0, base: 0, inss: 0, gilrat: 0, senar: 0, funrural: 0 }
  );

  return (
    <div className="max-w-[98%] mx-auto space-y-6 animate-fade-in pb-10 font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg shadow-orange-500/20">
            <DollarSign className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight dark:text-white">
              Relatório de Funrural (Entradas)
            </h1>
            <p className="text-slate-500 font-medium flex items-center gap-2 dark:text-slate-400">
              Análise de TES 130/141 •{" "}
              <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-700 font-bold dark:bg-slate-700 dark:text-slate-300">
                Filial {filial}
              </span>
            </p>
          </div>
        </div>

        {buscou && (
          <button
            onClick={handleExportarExcel}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md hover:scale-105 active:scale-95"
          >
            <Download className="w-5 h-5" />
            Exportar Excel
          </button>
        )}
      </div>

      {/* Filter Section */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <form
          onSubmit={handleBuscar}
          className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end"
        >
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-500" /> Data Início
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-500" /> Data Fim
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-500" /> Nota (Opcional)
            </label>
            <input
              type="text"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ex: 000553167"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white"
            />
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 flex items-center gap-3">
             <Filter className="w-5 h-5 text-slate-400" />
             <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">TES: 130, 141</span>
          </div>
          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-orange-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {carregando ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            Buscar
          </button>
        </form>
      </div>

      {buscou && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
             <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Base de Cálculo</span>
                <p className="text-xl font-black text-slate-800 dark:text-white mt-1">R$ {fmt(totais.base)}</p>
             </div>
             <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">INSS (1,2%)</span>
                <p className="text-xl font-black text-blue-600 mt-1">R$ {fmt(totais.inss)}</p>
             </div>
             <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">GILRAT (0,1%)</span>
                <p className="text-xl font-black text-emerald-600 mt-1">R$ {fmt(totais.gilrat)}</p>
             </div>
             <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">SENAR (0,2%)</span>
                <p className="text-xl font-black text-indigo-600 mt-1">R$ {fmt(totais.senar)}</p>
             </div>
             <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-orange-200 bg-orange-50/10 dark:bg-orange-950/20 dark:border-orange-900 shadow-sm">
                <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Valor Funrural</span>
                <p className="text-xl font-black text-orange-600 mt-1">R$ {fmt(totais.funrural)}</p>
             </div>
          </div>

          {/* Data Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                    <th className="px-5 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">TES</th>
                    <th className="px-5 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nota Fiscal</th>
                    <th className="px-5 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fornecedor</th>
                    <th className="px-5 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Valor Total</th>
                    <th className="px-5 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Base</th>
                    <th className="px-5 py-4 text-xs font-bold text-blue-500 uppercase tracking-wider text-right">INSS (1,2%)</th>
                    <th className="px-5 py-4 text-xs font-bold text-emerald-500 uppercase tracking-wider text-right">GILRAT (0,1%)</th>
                    <th className="px-5 py-4 text-xs font-bold text-indigo-500 uppercase tracking-wider text-right">SENAR (0,2%)</th>
                    <th className="px-5 py-4 text-xs font-bold text-orange-600 uppercase tracking-wider text-right">Total Funrural</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {resultados.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded text-xs font-bold">
                          {r.tes}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-orange-600 transition-colors">
                            {r.nota}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-700">
                          {r.cliefor}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-right font-medium text-slate-600 dark:text-slate-400">
                        {fmt(r.total)}
                      </td>
                      <td className="px-5 py-4 text-sm text-right font-bold text-slate-800 dark:text-white">
                        {fmt(r.base)}
                      </td>
                      <td className="px-5 py-4 text-sm text-right text-blue-600 font-semibold bg-blue-50/10">
                        {fmt(r.inss)}
                      </td>
                      <td className="px-5 py-4 text-sm text-right text-emerald-600 font-semibold bg-emerald-50/10">
                        {fmt(r.gilrat)}
                      </td>
                      <td className="px-5 py-4 text-sm text-right text-indigo-600 font-semibold bg-indigo-50/10">
                        {fmt(r.senar)}
                      </td>
                      <td className="px-5 py-4 text-sm text-right font-black text-orange-600 bg-orange-50/20 dark:bg-orange-900/10">
                        {fmt(r.valorFunrural)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900 text-white">
                  <tr className="font-bold">
                    <td colSpan={3} className="px-5 py-4 text-right uppercase tracking-widest text-[10px]">Totais</td>
                    <td className="px-5 py-4 text-right text-sm">R$ {fmt(totais.total)}</td>
                    <td className="px-5 py-4 text-right text-sm">R$ {fmt(totais.base)}</td>
                    <td className="px-5 py-4 text-right text-sm text-blue-300">R$ {fmt(totais.inss)}</td>
                    <td className="px-5 py-4 text-right text-sm text-emerald-300">R$ {fmt(totais.gilrat)}</td>
                    <td className="px-5 py-4 text-right text-sm text-indigo-300">R$ {fmt(totais.senar)}</td>
                    <td className="px-5 py-4 text-right text-lg text-orange-400">R$ {fmt(totais.funrural)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-center py-4 bg-orange-50 dark:bg-orange-950/10 rounded-2xl border border-orange-100 dark:border-orange-900/30">
             <p className="text-xs text-orange-700 dark:text-orange-400 font-bold flex items-center gap-2">
                <Filter className="w-4 h-4" /> 
                Dados Mockados para aprovação de layout • Colunas: Total, Base, INSS (1,2%), GILRAT (0,1%), SENAR (0,2%) e Funrural Total.
             </p>
          </div>
        </div>
      )}
    </div>
  );
};
