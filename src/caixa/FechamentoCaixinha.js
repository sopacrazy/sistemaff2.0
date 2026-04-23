import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../utils/apiConfig";
import Swal from "sweetalert2";

const FechamentoCaixinha = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ 
    sections: { fiado: [], diversosC: [], despesas: [] }, 
    summary: {} 
  });
  const [loadingIA, setLoadingIA] = useState(false);
  
  // Parâmetros vindos do Protheus/Usuário (Sincronizado com o sistema)
  const [filterDate, setFilterDate] = useState(() => {
    const saved = localStorage.getItem("data_trabalho");
    return saved || new Date().toISOString().split('T')[0];
  });
  const [bankInfo, setBankInfo] = useState({
    banco: "CX1",
    agencia: "00001",
    conta: "0000000001"
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const local = sessionStorage.getItem("local") || localStorage.getItem("local") || "01";
      
      const response = await axios.get(`${API_BASE_URL}/api/caixa/fechamento-caixinha`, {
        params: {
          data: filterDate,
          local: local,
          ...bankInfo
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setData(response.data);
    } catch (error) {
      console.error("Erro ao buscar fechamento:", error);
      Swal.fire({
        icon: "error",
        title: "Erro",
        text: "Não foi possível carregar os dados do fechamento."
      });
    } finally {
      setLoading(false);
    }
  };

  const analisarComIA = async () => {
    if (loadingIA) return;
    
    setLoadingIA(true);
    
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      // Enviamos o resumo completo e as movimentações para a IA analisar
      const response = await axios.post(`${API_BASE_URL}/api/caixa-ai/analisar-divergencia`, {
        data: filterDate,
        resumo: data.summary,
        movimentos: [
          ...(data.sections.fiado || []),
          ...(data.sections.diversosC || []),
          ...(data.sections.despesas || [])
        ]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        // Formatar Markdown simples para HTML básico para o SweetAlert
        const htmlContent = response.data.analise
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\n/g, '<br/>')
          .replace(/- (.*?)(<br\/>|$)/g, '<li>$1</li>');

        Swal.fire({
          title: '<span style="color: #6366f1">Assistente de Auditoria</span>',
          html: `<div style="text-align: left; font-size: 14px; line-height: 1.6; color: #cbd5e1;">${htmlContent}</div>`,
          icon: 'info',
          background: '#1e293b',
          color: '#f8fafc',
          confirmButtonColor: '#6366f1',
          width: '600px'
        });
      }
    } catch (error) {
      console.error("Erro na análise da IA:", error);
      Swal.fire({
        icon: 'error',
        title: 'Falha na Auditoria',
        text: 'Não foi possível conectar com o serviço de Inteligência Artificial no momento.',
        background: '#1e293b',
        color: '#f8fafc'
      });
    } finally {
      setLoadingIA(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterDate]);

  const formatCurrency = (val) => {
    return (val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    return `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}/${dateStr.substring(0, 4)}`;
  };

  const [expandedSections, setExpandedSections] = useState({
    fiado: false,
    diversosC: false,
    despesas: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const calculateTotal = (items) => {
    return items.reduce((acc, item) => acc + (item.valor || 0), 0);
  };

  const TableSection = ({ title, items, type, sectionId }) => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden mb-6">
      <div 
        onClick={() => toggleSection(sectionId)}
        className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
      >
        <div className="flex items-center gap-4">
          <span className={`material-symbols-rounded text-slate-400 transition-transform ${expandedSections[sectionId] ? 'rotate-180' : ''}`}>
            expand_more
          </span>
          <h3 className="font-bold text-slate-700 dark:text-white flex items-center gap-2 uppercase text-xs tracking-widest">
            <span className={`w-2 h-2 rounded-full ${type === 'in' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            {title}
          </h3>
          <span className="text-[10px] font-black text-slate-400 bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded-full uppercase tabular-nums">
            {items.length} ITENS
          </span>
        </div>
        
        <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">Total da Seção</span>
            <span className={`text-sm font-black tabular-nums ${type === 'in' ? 'text-emerald-500' : 'text-rose-500'}`}>
                {formatCurrency(calculateTotal(items))}
            </span>
        </div>
      </div>

      {expandedSections[sectionId] && (
        <div className="overflow-x-auto animate-in fade-in slide-in-from-top-2 duration-300">
            <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-50/30 dark:bg-slate-900/30">
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Data</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Beneficiário</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Prefixo / Título</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Mot.</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {items.length === 0 ? (
                <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-400 text-sm italic uppercase font-bold tracking-tighter opacity-50">Nenhuma movimentação para listar nesta seção.</td>
                </tr>
                ) : (
                items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-3 text-xs text-slate-500 dark:text-slate-400 font-medium text-center">{formatDate(item.data)}</td>
                    <td className="px-6 py-3 text-sm font-bold text-slate-800 dark:text-white truncate max-w-[250px]">{item.beneficiario}</td>
                    <td className="px-6 py-3 text-[11px] font-mono text-slate-500 font-bold uppercase">{item.doc}</td>
                    <td className="px-6 py-3 text-sm font-black text-right tabular-nums text-slate-700 dark:text-slate-200">{formatCurrency(item.valor)}</td>
                    <td className="px-6 py-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black border border-slate-200 dark:border-slate-700">
                        {item.motBaixa}
                        </span>
                    </td>
                    </tr>
                ))
                )}
            </tbody>
            </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 transition-colors duration-300 pb-20">
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0"
        rel="stylesheet"
      />

      {/* Header */}
      <header className="sticky top-0 z-50 p-4 sm:p-6 no-print">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-sm border border-white/20 dark:border-slate-700/50 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate("/financeiro/contas-receber")}>
              <div className="bg-gradient-to-tr from-indigo-600 to-violet-500 h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                <span className="material-symbols-rounded text-3xl">account_balance_wallet</span>
              </div>
              <div>
                <h1 className="text-xl font-black leading-tight text-slate-800 dark:text-white tracking-tight">
                  Fechamento <span className="text-indigo-500">Caixinha</span>
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                        PROTHEUS
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        RFINR02 - Analítico
                    </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative group">
                <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">calendar_today</span>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>
              <button
                onClick={fetchData}
                disabled={loading}
                className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
              >
                <span className={`material-symbols-rounded block ${loading ? 'animate-spin' : ''}`}>refresh</span>
              </button>
              <button
                onClick={() => navigate("/financeiro/contas-receber")}
                className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
              >
                <span className="material-symbols-rounded block">close</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Voltar para Home */}
      <div className="max-w-7xl mx-auto px-6 mt-6 no-print">
        <button onClick={() => navigate("/financeiro/contas-receber")} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-semibold group">
          <span className="material-symbols-rounded group-hover:-translate-x-1 transition-transform">arrow_back</span>
          Voltar para Início
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Info do Banco */}
        <div className="mb-6 flex flex-wrap gap-2 items-center justify-center sm:justify-start no-print">
            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-full border border-indigo-100 dark:border-indigo-800/50 text-[11px] font-black uppercase tracking-tighter shadow-sm">
                <span className="material-symbols-rounded text-[18px]">account_balance</span>
                BANCO: {bankInfo.banco}
            </div>
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700/50 text-[11px] font-black uppercase tracking-tighter">
                AGÊNCIA: {bankInfo.agencia}
            </div>
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700/50 text-[11px] font-black uppercase tracking-tighter">
                CONTA: {bankInfo.conta}
            </div>
        </div>

        {/* Wide Summary at Top */}
        <div className="mb-8">
          <div className="bg-slate-900 dark:bg-slate-950 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none"></div>
            
            <div className="px-10 py-8 border-b border-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                  <span className="material-symbols-rounded">analytics</span>
                </div>
                <div>
                  <h4 className="font-black text-white uppercase tracking-[0.2em] text-sm">Resumo Financeiro</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Consolidação de Movimentações Bancárias</p>
                </div>
              </div>
              
              <div className="no-print">
                <button 
                  onClick={() => window.print()}
                  className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  <span className="material-symbols-rounded text-sm">print</span>
                  Imprimir Relatório
                </button>
              </div>
            </div>

            <div className="p-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
                
                {/* BLOCO 1: ENTRADAS (SUBTOTAL 1) */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entradas e Disponibilidade</span>
                  </div>
                  {[
                    { label: "Saldo Inicial", value: data.summary.saldoInicial },
                    { label: "Recebimentos Diversos", value: data.summary.recebimentosDiversos },
                    { label: "Venda Prazo", value: data.summary.vendaPrazo },
                    { label: "Venda Vista", value: data.summary.vendaVista },
                    { label: "Recebido (Fiado)", value: data.summary.recebido },
                  ].map((row, idx) => (
                    <div key={idx} className="flex justify-between items-center group/row">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover/row:text-slate-300 transition-colors">
                        {row.label}
                      </span>
                      <span className="text-md font-black tabular-nums text-slate-100">
                        {formatCurrency(row.value)}
                      </span>
                    </div>
                  ))}
                  <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                    <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Sub-Total 1</span>
                    <span className="text-xl font-black tabular-nums text-emerald-400">
                      {formatCurrency(data.summary.saldoInicial + data.summary.recebimentosDiversos + data.summary.vendaPrazo + data.summary.vendaVista + data.summary.recebido)}
                    </span>
                  </div>
                </div>

                {/* BLOCO 2: SAÍDAS E DEDUÇÕES (SUBTOTAL 2) */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saídas e Compensações</span>
                  </div>
                  {[
                    { label: "Venda Fiado (Dedução)", value: data.summary.vendaPrazo },
                    { label: "Despesas / Pagamentos", value: data.summary.despesas },
                  ].map((row, idx) => (
                    <div key={idx} className="flex justify-between items-center group/row">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover/row:text-slate-300 transition-colors">
                        {row.label}
                      </span>
                      <span className="text-md font-black tabular-nums text-rose-400/80">
                        {formatCurrency(row.value)}
                      </span>
                    </div>
                  ))}
                  <div className="pt-[5.5rem] border-t border-slate-800 flex justify-between items-center">
                    <span className="text-xs font-black text-rose-500 uppercase tracking-widest">Sub-Total 2</span>
                    <span className="text-xl font-black tabular-nums text-rose-500">
                      {formatCurrency(data.summary.vendaPrazo + data.summary.despesas)}
                    </span>
                  </div>
                </div>

                {/* BLOCO 3: RESULTADO FINAL (CAIXA REAL) */}
                <div className="lg:col-span-4 h-full flex flex-col gap-4">
                  <div className="bg-indigo-600/10 rounded-[2rem] border border-indigo-500/20 p-8 relative overflow-hidden flex-1 flex flex-col justify-center">
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 bg-indigo-500/10 blur-3xl rounded-full"></div>
                    
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-8 w-8 rounded-xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                        <span className="material-symbols-rounded text-xl">account_balance_wallet</span>
                      </div>
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.25em]">Saldo Real Final</span>
                    </div>
                    
                    <span className="text-4xl font-black text-white tabular-nums tracking-tighter block mt-2">
                      {formatCurrency(data.summary.saldoFinal)}
                    </span>
                    
                    <div className="mt-8 flex items-center gap-2 text-[10px] font-bold text-indigo-300/60 uppercase tracking-widest">
                      <span className="material-symbols-rounded text-emerald-400 text-sm">verified</span>
                      Conferência Protheus RFINR02
                    </div>
                  </div>

                  {/* Diferença e Status */}
                  <div className={`rounded-2xl border p-4 flex items-center justify-between ${
                    Math.abs(data.summary.saldoFinal - (data.summary.conferido?.total || 0)) <= 0.05 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }`}>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Status do Fechamento</span>
                      <span className="text-xs font-black uppercase mt-1">
                         {Math.abs(data.summary.saldoFinal - (data.summary.conferido?.total || 0)) <= 0.05 
                            ? (data.summary.conferido?.status || 'CAIXA CORRETO') 
                            : 'CAIXA DIVERGENTE'}
                      </span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-60 block">Diferença</span>
                      <span className="text-sm font-black tabular-nums">
                        {formatCurrency(data.summary.saldoFinal - (data.summary.conferido?.total || 0))}
                      </span>
                      
                      {/* Botão da IA - Apenas se houver divergência relevante (> 0.05) */}
                      {Math.abs(data.summary.saldoFinal - (data.summary.conferido?.total || 0)) > 0.05 && (
                        <button 
                          onClick={analisarComIA}
                          className={`mt-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
                            loadingIA 
                              ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 active:scale-95'
                          }`}
                        >
                          {loadingIA ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Analisando...
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-rounded text-sm">search_insights</span>
                              Localizar Diferença
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* BLOCO 4: DETALHAMENTO DE VALORES CONFERIDOS (SZ8) */}
              <div className="mt-12 pt-10 border-t border-slate-800/80">
                  <div className="flex items-center gap-2 mb-8">
                    <span className="h-1.5 w-8 rounded-full bg-indigo-500/30"></span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valores Físicos Conferidos (Dinheiro / Cartões / Cheques)</span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {[
                      { label: "Cheque à Vista", value: data.summary.conferido?.cheque || 0 },
                      { label: "Dinheiro Rec.", value: data.summary.conferido?.dinheiro || 0 },
                      { label: "Cheque Pré", value: data.summary.conferido?.chequePre || 0 },
                      { label: "Rec. Boleto", value: data.summary.conferido?.boleto || 0 },
                      { label: "C. Crédito", value: data.summary.conferido?.cartaoCredito || 0 },
                      { label: "C. Débito", value: data.summary.conferido?.cartaoDebito || 0 },
                      { label: "Ticket", value: data.summary.conferido?.ticket || 0 },
                      { label: "Outros", value: data.summary.conferido?.outros || 0 },
                      { label: "Total Valores", value: data.summary.conferido?.total || 0, isMain: true },
                    ].map((item, idx) => (
                      <div key={idx} className={`p-4 rounded-2xl flex flex-col justify-between ${item.isMain ? 'bg-white text-slate-900 md:col-span-2 lg:col-span-2' : 'bg-slate-800/30 border border-slate-800/50'}`}>
                        <span className={`text-[9px] font-black uppercase tracking-widest mb-1 ${item.isMain ? 'text-indigo-600' : 'text-slate-500'}`}>
                          {item.label}
                        </span>
                        <span className={`text-lg font-black tabular-nums ${item.isMain ? 'text-slate-900' : 'text-slate-200'}`}>
                          {formatCurrency(item.value)}
                        </span>
                      </div>
                    ))}
                  </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Layout - Tables Only */}
        <div className="space-y-6">
          <TableSection title="Recebimento Fiado" items={data.sections.fiado} type="in" sectionId="fiado" />
          <TableSection title="Recebimento Diversos" items={data.sections.diversosC} type="in" sectionId="diversosC" />
          <TableSection title="Despesas Gerais e Pagamentos" items={data.sections.despesas} type="out" sectionId="despesas" />
        </div>
      </main>
      <style>{`
        @media print {
          /* Reset de Dimensões e Rolagem */
          html, body {
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          @page {
            size: A4;
            margin: 15mm 10mm;
          }

          /* Ocultar Elementos de Tela */
          header, 
          nav, 
          button, 
          footer,
          .no-print,
          .material-symbols-rounded:not(.text-emerald-400):not(.text-rose-500) { 
            display: none !important; 
          }

          /* Container Principal */
          main { 
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }

          /* Forçar Visibilidade de Tudo */
          div, section, table {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            position: static !important;
          }

          /* Forçar expansão dos Accordions */
          main > div.space-y-6 > div > div:nth-child(2) {
            display: block !important;
            opacity: 1 !important;
            visibility: visible !important;
          }

          /* Estilo dos Blocos de Conteúdo */
          .bg-white, .dark\\:bg-slate-800, .bg-slate-900, .dark\\:bg-slate-950 { 
            background: white !important; 
            color: black !important;
            border: 1px solid #000 !important;
            border-radius: 4px !important;
            margin-bottom: 20px !important;
            box-shadow: none !important;
            break-inside: avoid; /* Evita quebrar o bloco no meio */
          }

          /* Ajuste do Resumo (Cabeçalho do Relatório) */
          .grid { 
            display: block !important; 
          }
          .lg\\:col-span-4, .lg\\:col-span-12 {
            width: 100% !important;
            margin-bottom: 15px !important;
            padding: 10px !important;
            border-bottom: 1px solid #eee !important;
          }

          /* Saldo Final Destacado */
          .bg-indigo-600\\/10 {
            background: #f8fafc !important;
            border: 2px solid #000 !important;
            padding: 20px !important;
          }
          .text-4xl { font-size: 28pt !important; color: black !important; }

          /* Tabelas e Dados */
          table { 
            width: 100% !important; 
            border-collapse: collapse !important;
            page-break-inside: auto;
          }
          tr { 
            page-break-inside: avoid; 
            page-break-after: auto;
          }
          thead { 
            display: table-header-group; /* Repete cabeçalho em cada página */
          }
          th { 
            background: #f1f5f9 !important; 
            border: 1px solid #000 !important;
            font-size: 8pt !important;
            color: black !important;
            padding: 6px !important;
          }
          td { 
            border: 1px solid #eee !important;
            font-size: 8pt !important;
            color: black !important;
            padding: 6px !important;
          }

          /* Textos e Cores */
          .text-white, .text-slate-100, .text-slate-200, .text-slate-300 { color: black !important; }
          .text-slate-500, .text-slate-400 { color: #333 !important; }
          .text-emerald-400, .text-emerald-500 { color: #059669 !important; font-weight: bold !important; }
          .text-rose-400, .text-rose-500 { color: #dc2626 !important; font-weight: bold !important; }
          
          /* Remover animações na impressão */
          * {
            transition: none !important;
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default FechamentoCaixinha;
