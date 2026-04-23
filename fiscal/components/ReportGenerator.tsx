import React, { useState, useMemo } from 'react';
    import { 
      Loader2, Upload, Search, Calendar, AlertTriangle, FileWarning, 
      Filter, Download, CheckCircle, AlertCircle 
    } from 'lucide-react';
    import { generateFiscalAudit } from '../services/geminiService';
    import { FiscalAuditResult, FiscalIssue } from '../types';
    
    export const ReportGenerator: React.FC = () => {
      const [inputText, setInputText] = useState<string>('');
      const [isLoading, setIsLoading] = useState<boolean>(false);
      const [auditResult, setAuditResult] = useState<FiscalAuditResult | null>(null);
      const [error, setError] = useState<string | null>(null);
    
      // Filter states
      const [startDate, setStartDate] = useState<string>('');
      const [endDate, setEndDate] = useState<string>('');
    
      const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
    
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          setInputText(text);
        };
        reader.readAsText(file);
      };
    
      const handleAudit = async () => {
        if (!inputText.trim()) {
          setError("Por favor, insira os dados de vendas para auditar.");
          return;
        }
    
        setIsLoading(true);
        setError(null);
        setAuditResult(null);
    
        try {
          const result = await generateFiscalAudit(inputText);
          setAuditResult(result);
        } catch (err) {
          setError("Erro ao processar auditoria. Verifique o formato dos dados.");
        } finally {
          setIsLoading(false);
        }
      };
    
      // Filter logic
      const filteredIssues = useMemo(() => {
        if (!auditResult) return [];
        return auditResult.issues.filter(issue => {
          if (!startDate && !endDate) return true;
          const issueDate = new Date(issue.date);
          const start = startDate ? new Date(startDate) : new Date('1970-01-01');
          const end = endDate ? new Date(endDate) : new Date('2099-12-31');
          return issueDate >= start && issueDate <= end;
        });
      }, [auditResult, startDate, endDate]);
    
      return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
          
          {!auditResult && (
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Auditoria de Vendas sem Fiscal</h1>
              <p className="text-slate-600 max-w-3xl">
                Identifique automaticamente pedidos sem Nota Fiscal emitida. Cole a lista de vendas do seu ERP ou carregue um arquivo CSV para visualizar as pendências do mês e ano.
              </p>
            </div>
          )}
    
          {/* Input Panel */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 p-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
                Dados de Venda (Entrada)
              </h2>
            </div>
            
            <div className="p-6 space-y-4">
              <textarea
                className="w-full h-32 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono text-xs bg-slate-50 transition-colors"
                placeholder="Cole aqui os dados (CSV ou Texto)... Exemplo:&#10;ID: 1001, Data: 2024-03-10, Cliente: João Silva, Valor: 150.00, NF: Pendente&#10;ID: 1002, Data: 2024-03-12, Cliente: Maria Souza, Valor: 300.00, NF: 55012..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
    
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative group">
                  <input
                    type="file"
                    accept=".csv,.txt,.json"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <button className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-2 transition-all shadow-sm group-hover:border-slate-400 text-sm">
                    <Upload className="w-4 h-4 text-slate-500" />
                    Importar Arquivo
                  </button>
                </div>
                
                <button
                  onClick={handleAudit}
                  disabled={isLoading || !inputText.trim()}
                  className={`w-full sm:w-auto px-6 py-2 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-all shadow-md ${
                    isLoading || !inputText.trim()
                      ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                      : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg hover:-translate-y-0.5'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analisando Compliance...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Executar Auditoria
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
    
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}
    
          {/* RESULTS DASHBOARD */}
          {auditResult && (
            <div className="space-y-6 animate-fade-in">
              
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Monthly Card */}
                <div className="bg-white p-6 rounded-xl border border-red-100 shadow-sm relative overflow-hidden group hover:border-red-300 transition-colors">
                  <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <FileWarning size={100} className="text-red-600" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Sem Fiscal (Mês Atual)
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-slate-900">
                        {auditResult.stats.missingInMonth}
                      </span>
                      <span className="text-sm text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-full">
                        Ação Necessária
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-4">
                      Pedidos recentes pendentes de emissão.
                    </p>
                  </div>
                </div>
    
                {/* Yearly Card */}
                <div className="bg-white p-6 rounded-xl border border-orange-100 shadow-sm relative overflow-hidden group hover:border-orange-300 transition-colors">
                   <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <AlertCircle size={100} className="text-orange-600" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Sem Fiscal (Ano Atual)
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-slate-900">
                        {auditResult.stats.missingInYear}
                      </span>
                      <span className="text-sm text-orange-600 font-medium bg-orange-50 px-2 py-0.5 rounded-full">
                        Acumulado
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-4">
                      Total de pendências no exercício fiscal atual.
                    </p>
                  </div>
                </div>
              </div>
    
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg flex items-start gap-3">
                 <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                 <div>
                   <h4 className="font-semibold text-emerald-900 text-sm">Resumo da Análise</h4>
                   <p className="text-emerald-800 text-sm leading-relaxed">{auditResult.periodAnalysis}</p>
                 </div>
              </div>
    
              {/* Filter & List Section */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
                
                {/* Toolbar */}
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-emerald-500" />
                    <h3 className="font-semibold text-slate-800">
                      Vendas sem Fiscal no Período
                    </h3>
                  </div>
    
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-transparent text-sm text-slate-600 focus:outline-none"
                      />
                      <span className="text-slate-300">-</span>
                      <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-transparent text-sm text-slate-600 focus:outline-none"
                      />
                    </div>
                    <button className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 text-sm font-medium transition-colors">
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">Exportar Lista</span>
                    </button>
                  </div>
                </div>
    
                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 uppercase tracking-wider text-xs">
                      <tr>
                        <th className="px-6 py-4">Data</th>
                        <th className="px-6 py-4">Pedido / ID</th>
                        <th className="px-6 py-4">Cliente</th>
                        <th className="px-6 py-4 text-right">Valor (R$)</th>
                        <th className="px-6 py-4">Status / Motivo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredIssues.length > 0 ? (
                        filteredIssues.map((issue) => (
                          <tr key={issue.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-3 whitespace-nowrap font-medium text-slate-900">
                              {issue.date}
                            </td>
                            <td className="px-6 py-3 font-mono text-xs text-slate-500">
                              {issue.id}
                            </td>
                            <td className="px-6 py-3">
                              {issue.customer}
                            </td>
                            <td className="px-6 py-3 text-right font-medium text-slate-900">
                              {issue.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-3">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                {issue.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                            {auditResult.issues.length === 0 
                              ? "Nenhuma venda sem fiscal encontrada nos dados." 
                              : "Nenhuma venda encontrada neste período selecionado."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Footer Stats for Filtered Data */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
                   <span>
                     Exibindo {filteredIssues.length} de {auditResult.issues.length} pendências encontradas
                   </span>
                   {filteredIssues.length > 0 && (
                     <span className="font-semibold">
                       Total Filtrado: R$ {filteredIssues.reduce((acc, curr) => acc + curr.value, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                     </span>
                   )}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    };