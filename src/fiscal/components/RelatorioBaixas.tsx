import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Search,
  Loader2,
  Download,
  Calendar,
  FileText,
  Filter,
  DollarSign,
  Wallet,
  ArrowRightLeft,
} from "lucide-react";

import { API_BASE_URL as BASE } from "../../utils/apiConfig";
const API_BASE_URL = `${BASE}/api`;

interface Props {
  filial: string;
}

export const RelatorioBaixas: React.FC<Props> = ({ filial }) => {
  const [dataInicio, setDataInicio] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [dataFim, setDataFim] = useState(new Date().toISOString().slice(0, 10));
  const [nota, setNota] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [buscou, setBuscou] = useState(false);
  const [resultados, setResultados] = useState<any[]>([]);

  const [todosPrefixos, setTodosPrefixos] = useState<string[]>([]);
  const [prefixosSelecionados, setPrefixosSelecionados] = useState<string[]>([]);
  const [buscaPrefixo, setBuscaPrefixo] = useState("");
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const getLabelPrefixos = () => {
    if (prefixosSelecionados.length === 0) return "Todos";
    if (prefixosSelecionados.length <= 2) return prefixosSelecionados.join(", ");
    return `${prefixosSelecionados.length} prefixos`;
  };

  const prefixosFiltrados = todosPrefixos.filter((p) =>
    p.toLowerCase().includes(buscaPrefixo.toLowerCase())
  );

  // Limpa busca ao mudar a filial no topo
  useEffect(() => {
    setResultados([]);
    setBuscou(false);
  }, [filial]);

  // Carrega prefixos
  useEffect(() => {
    const carregarPrefixos = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/relatorios/baixas/prefixos?filial=${filial}`);
        if (res.ok) {
          const data = await res.json();
          setTodosPrefixos(data);
          setPrefixosSelecionados([]);
        }
      } catch (err) {
        console.error("Erro ao carregar prefixos:", err);
      }
    };
    carregarPrefixos();
  }, [filial]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownAberto(false);
      }
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setResultados([]);

    try {
      const response = await fetch(`${API_BASE_URL}/relatorios/baixas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataInicio,
          dataFim,
          nota,
          filial,
          prefixos: prefixosSelecionados,
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
      alert("Erro de conexão com o servidor.");
    } finally {
      setCarregando(false);
    }
  };

  const handleExportarExcel = () => {
    const dadosExcel = resultados.map((r) => ({
      Filial: r.filial,
      Prefixo: r.prefixo,
      Número: r.numero,
      Tipo: r.tipo,
      Código: r.clifor,
      "Nome Fornecedor": r.nomeFornecedor,
      "Cta. Contábil": r.contaContabil,
      Natureza: r.natureza,
      Vencimento: r.vencimento ? formatDateDisplay(r.vencimento) : "",
      Histórico: r.historico,
      "Data Baixa": r.dataBaixa ? formatDateDisplay(r.dataBaixa) : "",
      "Valor Original Título": r.valorOriginalTitulo,
      "Total Baixado": r.valorBaixado,
      Banco: r.banco,
      "Data Digitação": r.dataDigitacao ? formatDateDisplay(r.dataDigitacao) : "",
      "Ref N° (NFe)": r.refNfe,
      "Valor NFe (Soma)": r.valorNfe,
      "Valores Detalhados NFe": r.valoresNfeDet,
    }));

    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório Baixas");
    XLSX.writeFile(wb, `RelatorioBaixas_${filial}_${dataInicio}_a_${dataFim}.xlsx`);
  };

  const fmt = (valor: number) =>
    valor.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr || dateStr.length !== 10) return dateStr;
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const totais = resultados.reduce(
    (acc, r) => ({
      totalBaixado: acc.totalBaixado + (r.valorBaixado || 0),
      valorOriginalTitulo: acc.valorOriginalTitulo + (r.valorOriginalTitulo || 0),
      valorNfe: acc.valorNfe + (r.valorNfe || 0),
    }),
    { totalBaixado: 0, valorOriginalTitulo: 0, valorNfe: 0 }
  );

  return (
    <div className="w-full max-w-full mx-auto px-0 space-y-6 animate-fade-in pb-10 font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl shadow-lg shadow-indigo-500/20">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight dark:text-white">
              Relatório de Baixas (Título X NF Fiscal)
            </h1>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Conciliação de pagamentos com fornecedores na Filial {filial}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {buscou && resultados.length > 0 && (
            <button
              onClick={handleExportarExcel}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Download className="w-5 h-5" />
              Exportar Excel
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <form
          onSubmit={handleBuscar}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end"
        >
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" /> Data Início
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" /> Data Fim
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" /> Título ou Nota (Opcional)
            </label>
            <input
              type="text"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ex: 000051074"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
            />
          </div>
          
          <div className="space-y-2 relative" ref={dropdownRef}>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-500" /> Prefixo(s)
            </label>
            <button
              type="button"
              onClick={() => setDropdownAberto(!dropdownAberto)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white text-left flex justify-between items-center text-sm cursor-pointer"
            >
              <span className="truncate">{getLabelPrefixos()}</span>
              <span className="text-slate-400 dark:text-slate-500 text-xs">▼</span>
            </button>

            {dropdownAberto && (
              <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 z-30 animate-in fade-in zoom-in-95 duration-200 max-w-[280px] md:max-w-none">
                <input
                  type="text"
                  placeholder="Pesquisar prefixo..."
                  value={buscaPrefixo}
                  onChange={(e) => setBuscaPrefixo(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 outline-none mb-2 dark:text-white"
                />
                <div className="max-h-[180px] overflow-y-auto space-y-1 px-0.5">
                  {prefixosFiltrados.length === 0 ? (
                    <span className="text-[11px] text-slate-400 block text-center py-2">Nenhum encontrado</span>
                  ) : (
                    prefixosFiltrados.map((p) => {
                      const checked = prefixosSelecionados.includes(p);
                      return (
                        <label key={p} className="flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 p-1 rounded cursor-pointer text-xs select-none">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              if (checked) {
                                setPrefixosSelecionados(prefixosSelecionados.filter(x => x !== p));
                              } else {
                                setPrefixosSelecionados([...prefixosSelecionados, p]);
                              }
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 h-3.5 w-3.5"
                          />
                          <span className="text-slate-700 dark:text-slate-300 font-medium">{p}</span>
                        </label>
                      );
                    })
                  )}
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-2 mt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPrefixosSelecionados([])}
                    className="font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    Limpar Todos
                  </button>
                  <span className="font-semibold text-slate-400">
                    {prefixosSelecionados.length} sel.
                  </span>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {carregando ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            Buscar Baixas
          </button>
        </form>
      </div>

      {buscou && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor Original Títulos</span>
              <p className="text-xl font-black text-slate-800 dark:text-white mt-1">R$ {fmt(totais.valorOriginalTitulo)}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-indigo-200 bg-indigo-50/10 dark:bg-indigo-950/20 dark:border-indigo-900 shadow-sm">
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Total Baixado / Pago</span>
              <p className="text-xl font-black text-indigo-600 mt-1">R$ {fmt(totais.totalBaixado)}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Notas Fiscais (NFe)</span>
              <p className="text-xl font-black text-slate-800 dark:text-white mt-1">R$ {fmt(totais.valorNfe)}</p>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left border-collapse table-auto">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-2 py-2.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-px">F</th>
                    <th className="px-2 py-2.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-px">Número</th>
                    <th className="px-2 py-2.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-px">Tp</th>
                    <th className="px-2 py-2.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-full min-w-[180px]">Fornecedor</th>
                    <th className="px-2 py-2.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-px whitespace-nowrap">Cta. Contábil</th>
                    <th className="px-2 py-2.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-px">Natureza</th>
                    <th className="px-2 py-2.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-px">Vencto</th>
                    <th className="px-2 py-2.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-px max-w-[120px]">Histórico</th>
                    <th className="px-2 py-2.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-px">Dt Baixa</th>
                    <th className="px-2 py-2.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right w-px">Val. Original</th>
                    <th className="px-2 py-2.5 text-[11px] font-bold text-indigo-600 uppercase tracking-wider text-right w-px">Total Baixado</th>
                    <th className="px-2 py-2.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center w-px">Bco</th>
                    <th className="px-2 py-2.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-px">Dt. Lg.</th>
                    <th className="px-2 py-2.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-px whitespace-nowrap">Ref N°</th>
                    <th className="px-2 py-2.5 text-[11px] font-bold text-emerald-600 uppercase tracking-wider text-right w-px">Valor NFe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {resultados.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="px-5 py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                        Nenhum registro encontrado para o filtro selecionado.
                      </td>
                    </tr>
                  ) : (
                    resultados.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">
                          {r.prefixo}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {r.numero}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">
                          {r.tipo}
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex flex-col max-w-[280px] lg:max-w-none" title={`${r.nomeFornecedor} (${r.clifor})`}>
                            <span className="text-xs font-bold text-slate-800 dark:text-white leading-tight truncate">
                              {r.nomeFornecedor}
                            </span>
                            <span className="text-[9px] text-slate-500 mt-0.5">
                              {r.clifor}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs font-mono text-slate-600 dark:text-slate-400">
                          {r.contaContabil || "-"}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">
                          {r.natureza}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">
                          {r.vencimento ? formatDateDisplay(r.vencimento) : "-"}
                        </td>
                        <td className="px-2 py-2 text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-[120px]" title={r.historico}>
                          {r.historico}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">
                          {r.dataBaixa ? formatDateDisplay(r.dataBaixa) : "-"}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-right font-medium text-slate-600 dark:text-slate-400">
                          {fmt(r.valorOriginalTitulo)}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-right font-bold text-indigo-600 bg-indigo-50/5 dark:text-indigo-400">
                          {fmt(r.valorBaixado)}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400 text-center">
                          {r.banco}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">
                          {r.dataDigitacao ? formatDateDisplay(r.dataDigitacao) : "-"}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs font-mono text-slate-700 dark:text-slate-300">
                          {r.refNfe || "-"}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-right font-bold text-emerald-600 bg-emerald-50/5 dark:text-emerald-400" title={`Soma: R$ ${r.valorNfe !== null ? fmt(r.valorNfe) : '-'}`}>
                          {r.valoresNfeDet || (r.valorNfe !== null ? fmt(r.valorNfe) : "-")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {resultados.length > 0 && (
                  <tfoot className="bg-slate-900 text-white font-bold sticky bottom-0 z-10 text-xs">
                    <tr>
                      <td colSpan={9} className="px-2 py-2 text-right uppercase tracking-widest text-[10px]">Totais</td>
                      <td className="px-2 py-2 text-right">R$ {fmt(totais.valorOriginalTitulo)}</td>
                      <td className="px-2 py-2 text-right text-indigo-300">R$ {fmt(totais.totalBaixado)}</td>
                      <td colSpan={2} className="px-2 py-2 text-right uppercase tracking-widest text-[10px]">Total NFe</td>
                      <td className="px-2 py-2"></td>
                      <td className="px-2 py-2 text-right text-emerald-400">R$ {fmt(totais.valorNfe)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          <div className="flex items-center justify-center py-4 bg-indigo-50 dark:bg-indigo-950/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
            <p className="text-xs text-indigo-700 dark:text-indigo-400 font-bold flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4" /> 
              Conciliação baseada na junção do Movimento Bancário (SE5) com o Contas a Pagar (SE2) e a Nota Fiscal de Entrada (SF1).
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
