import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Search,
  Loader2,
  DollarSign,
  Download,
  Calendar,
  FileText,
  Filter,
  Settings,
  Save,
  Percent,
  User,
} from "lucide-react";

import { API_BASE_URL as BASE } from "../../utils/apiConfig";
const API_BASE_URL = `${BASE}/api`;

interface Props {
  filial: string;
}

interface FiscalConfig {
  inss_percent: number;
  gilrat_percent: number;
  senar_percent: number;
  tes_list: string;
}

export const RelatorioFunrural: React.FC<Props> = ({ filial }) => {
  const [dataInicio, setDataInicio] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [dataFim, setDataFim] = useState(new Date().toISOString().slice(0, 10));
  const [nota, setNota] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [buscou, setBuscou] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [salvandoConfig, setSalvandoConfig] = useState(false);

  const [resultados, setResultados] = useState<any[]>([]);
  const [tipoPessoa, setTipoPessoa] = useState("TODOS");
  const [config, setConfig] = useState<FiscalConfig>({
    inss_percent: 0.0120,
    gilrat_percent: 0.0010,
    senar_percent: 0.0020,
    tes_list: "130,141,222,224,225"
  });

  // Fetch config on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/fiscal/config`)
      .then(res => res.json())
      .then(data => {
        if (data) setConfig(data);
      })
      .catch(err => console.error("Erro ao carregar config fiscal:", err));
  }, []);

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
          tipoPessoa,
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

  const handleSalvarConfig = async () => {
    setSalvandoConfig(true);
    try {
      const response = await fetch(`${API_BASE_URL}/fiscal/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setShowConfig(false);
        // Se já buscou, talvez queira re-buscar para aplicar os novos valores
        // Mas o backend já faz o cálculo com os valores do banco, 
        // então o ideal é buscar de novo se o usuário quiser ver os dados atualizados.
      } else {
        alert("Erro ao salvar configuração.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão ao salvar config.");
    } finally {
      setSalvandoConfig(false);
    }
  };

  const handleExportarExcel = () => {
    const dadosExcel = resultados.map((r) => ({
      Filial: r.filial,
      Entrada: r.entrada,
      TES: r.tes,
      "Nota Fiscal": r.nota,
      Série: r.serie,
      "Código": r.cliefor,
      Cliente: r.nomeFornecedor,
      Loja: r.loja,
      "CNPJ/CPF": r.cgc,
      Tipo: r.tipoFornecedor === "F" ? "Física" : "Jurídica",
      "Soma de Total": r.total,
      [`INSS ${(r.percInss * 100).toFixed(1)}%`]: r.inss,
      [`GILRAT ${(r.percGilrat * 100).toFixed(1)}%`]: r.gilrat,
      [`SENAR ${(r.percSenar * 100).toFixed(1)}%`]: r.senar,
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

  // Use percentages from first result or current config
  const currentPerc = resultados.length > 0 ? {
    inss: resultados[0].percInss,
    gilrat: resultados[0].percGilrat,
    senar: resultados[0].percSenar
  } : {
    inss: config.inss_percent,
    gilrat: config.gilrat_percent,
    senar: config.senar_percent
  };

  return (
    <div className="w-full max-w-full mx-auto px-4 lg:px-8 space-y-6 animate-fade-in pb-10 font-sans">
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
            {/* Subtítulo removido pois já consta nos filtros */}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold transition-all dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          >
            <Settings className="w-5 h-5" />
            Parâmetros
          </button>
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
      </div>

      {/* Config Section (Expandable) */}
      {showConfig && (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl shadow-sm animate-in slide-in-from-top-4 duration-300 dark:bg-amber-950/20 dark:border-amber-900/30">
          <h3 className="text-amber-800 dark:text-amber-400 font-bold mb-4 flex items-center gap-2">
            <Percent className="w-5 h-5" /> Configuração de Alíquotas
          </h3>
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-full sm:w-24 space-y-1.5">
              <label className="text-[10px] font-bold text-amber-700/70 uppercase tracking-tighter">INSS (%)</label>
              <input
                type="number"
                step="0.01"
                value={(config.inss_percent * 100).toFixed(2)}
                onChange={(e) => setConfig({ ...config, inss_percent: parseFloat(e.target.value) / 100 })}
                className="w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all dark:text-white"
              />
            </div>
            <div className="w-full sm:w-24 space-y-1.5">
              <label className="text-[10px] font-bold text-amber-700/70 uppercase tracking-tighter">GILRAT (%)</label>
              <input
                type="number"
                step="0.01"
                value={(config.gilrat_percent * 100).toFixed(2)}
                onChange={(e) => setConfig({ ...config, gilrat_percent: parseFloat(e.target.value) / 100 })}
                className="w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all dark:text-white"
              />
            </div>
            <div className="w-full sm:w-24 space-y-1.5">
              <label className="text-[10px] font-bold text-amber-700/70 uppercase tracking-tighter">SENAR (%)</label>
              <input
                type="number"
                step="0.01"
                value={(config.senar_percent * 100).toFixed(2)}
                onChange={(e) => setConfig({ ...config, senar_percent: parseFloat(e.target.value) / 100 })}
                className="w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all dark:text-white"
              />
            </div>
            <div className="flex-1 min-w-[200px] space-y-1.5">
              <label className="text-[10px] font-bold text-amber-700/70 uppercase tracking-tighter">Lista de TES (Separadas por vírgula)</label>
              <input
                type="text"
                value={config.tes_list}
                onChange={(e) => setConfig({ ...config, tes_list: e.target.value })}
                placeholder="Ex: 130, 141, 222"
                className="w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all dark:text-white"
              />
            </div>
            <button
              onClick={handleSalvarConfig}
              disabled={salvandoConfig}
              className="h-[38px] px-6 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-xs whitespace-nowrap"
            >
              {salvandoConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Alterações
            </button>
          </div>
        </div>
      )}

      {/* Filter Section */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <form
          onSubmit={handleBuscar}
          className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 items-end"
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
             <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">TES: {config.tes_list || "Todas"}</span>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <User className="w-4 h-4 text-orange-500" /> Tipo
            </label>
            <select
              value={tipoPessoa}
              onChange={(e) => setTipoPessoa(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white text-sm font-bold"
            >
              <option value="TODOS">Todos</option>
              <option value="F">Física (CPF)</option>
              <option value="J">Jurídica (CNPJ)</option>
            </select>
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
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">INSS ({(currentPerc.inss * 100).toFixed(1)}%)</span>
                <p className="text-xl font-black text-blue-600 mt-1">R$ {fmt(totais.inss)}</p>
             </div>
             <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">GILRAT ({(currentPerc.gilrat * 100).toFixed(1)}%)</span>
                <p className="text-xl font-black text-emerald-600 mt-1">R$ {fmt(totais.gilrat)}</p>
             </div>
             <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">SENAR ({(currentPerc.senar * 100).toFixed(1)}%)</span>
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
                    <th className="px-5 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider min-w-[320px]">Fornecedor</th>
                    <th className="px-5 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Valor Total</th>
                    <th className="px-5 py-4 text-xs font-bold text-blue-500 uppercase tracking-wider text-right">INSS ({(currentPerc.inss * 100).toFixed(1)}%)</th>
                    <th className="px-5 py-4 text-xs font-bold text-emerald-500 uppercase tracking-wider text-right">GILRAT ({(currentPerc.gilrat * 100).toFixed(1)}%)</th>
                    <th className="px-5 py-4 text-xs font-bold text-indigo-500 uppercase tracking-wider text-right">SENAR ({(currentPerc.senar * 100).toFixed(1)}%)</th>
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
                      <td className="px-5 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                        {r.nota}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-800 dark:text-white leading-tight">
                            {r.nomeFornecedor}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-slate-500 font-bold">
                              {r.cgc} • {r.cliefor}
                            </span>
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${r.tipoFornecedor === 'F' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                              {r.tipoFornecedor === "F" ? "Física" : "Jurídica"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-right font-medium text-slate-600 dark:text-slate-400">
                        {fmt(r.total)}
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
                Análise baseada nas TES: {config.tes_list || "Todas as TES"}. Os percentuais de INSS, GILRAT e SENAR são configuráveis.
             </p>
          </div>
        </div>
      )}
    </div>
  );
};
