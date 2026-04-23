import React, { useState, useMemo } from 'react';
import { 
  Loader2, Upload, Search, Calendar, AlertTriangle, FileWarning, 
  Filter, Download, CheckCircle, AlertCircle 
} from 'lucide-react';
import { gerarAuditoriaFiscal } from '../servicos/servicoGemini';
import { ResultadoAuditoria } from '../tipos';

export const AuditoriaFiscal: React.FC = () => {
  const [textoEntrada, setTextoEntrada] = useState<string>('');
  const [carregando, setCarregando] = useState<boolean>(false);
  const [resultadoAuditoria, setResultadoAuditoria] = useState<ResultadoAuditoria | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Estados de Filtro
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');

  const manipularUploadArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = (evento) => {
      const texto = evento.target?.result as string;
      setTextoEntrada(texto);
    };
    leitor.readAsText(arquivo);
  };

  const executarAuditoria = async () => {
    if (!textoEntrada.trim()) {
      setErro("Por favor, insira os dados de vendas para auditar.");
      return;
    }

    setCarregando(true);
    setErro(null);
    setResultadoAuditoria(null);

    try {
      const resultado = await gerarAuditoriaFiscal(textoEntrada);
      setResultadoAuditoria(resultado);
    } catch (err) {
      setErro("Erro ao processar auditoria. Verifique o formato dos dados.");
    } finally {
      setCarregando(false);
    }
  };

  // Lógica de Filtro
  const pendenciasFiltradas = useMemo(() => {
    if (!resultadoAuditoria) return [];
    return resultadoAuditoria.pendencias.filter(pendencia => {
      if (!dataInicio && !dataFim) return true;
      const dataPendencia = new Date(pendencia.data);
      const inicio = dataInicio ? new Date(dataInicio) : new Date('1970-01-01');
      const fim = dataFim ? new Date(dataFim) : new Date('2099-12-31');
      return dataPendencia >= inicio && dataPendencia <= fim;
    });
  }, [resultadoAuditoria, dataInicio, dataFim]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      
      {!resultadoAuditoria && (
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Auditoria de Vendas sem Fiscal</h1>
          <p className="text-slate-600 max-w-3xl">
            Identifique automaticamente pedidos sem Nota Fiscal emitida. Cole a lista de vendas do seu ERP ou carregue um arquivo CSV para visualizar as pendências do mês e ano.
          </p>
        </div>
      )}

      {/* Painel de Entrada */}
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
            value={textoEntrada}
            onChange={(e) => setTextoEntrada(e.target.value)}
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative group">
              <input
                type="file"
                accept=".csv,.txt,.json"
                onChange={manipularUploadArquivo}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <button className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-2 transition-all shadow-sm group-hover:border-slate-400 text-sm">
                <Upload className="w-4 h-4 text-slate-500" />
                Importar Arquivo
              </button>
            </div>
            
            <button
              onClick={executarAuditoria}
              disabled={carregando || !textoEntrada.trim()}
              className={`w-full sm:w-auto px-6 py-2 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-all shadow-md ${
                carregando || !textoEntrada.trim()
                  ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                  : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg hover:-translate-y-0.5'
              }`}
            >
              {carregando ? (
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

      {erro && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          {erro}
        </div>
      )}

      {/* PAINEL DE RESULTADOS */}
      {resultadoAuditoria && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Cartões KPI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mensal */}
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
                    {resultadoAuditoria.estatisticas.pendentesNoMes}
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

            {/* Anual */}
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
                    {resultadoAuditoria.estatisticas.pendentesNoAno}
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
               <p className="text-emerald-800 text-sm leading-relaxed">{resultadoAuditoria.analisePeriodo}</p>
             </div>
          </div>

          {/* Seção de Filtro e Lista */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
            
            {/* Barra de Ferramentas */}
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
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="bg-transparent text-sm text-slate-600 focus:outline-none"
                  />
                  <span className="text-slate-300">-</span>
                  <input 
                    type="date" 
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="bg-transparent text-sm text-slate-600 focus:outline-none"
                  />
                </div>
                <button className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 text-sm font-medium transition-colors">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Exportar Lista</span>
                </button>
              </div>
            </div>

            {/* Tabela */}
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
                  {pendenciasFiltradas.length > 0 ? (
                    pendenciasFiltradas.map((pendencia) => (
                      <tr key={pendencia.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-3 whitespace-nowrap font-medium text-slate-900">
                          {pendencia.data}
                        </td>
                        <td className="px-6 py-3 font-mono text-xs text-slate-500">
                          {pendencia.id}
                        </td>
                        <td className="px-6 py-3">
                          {pendencia.cliente}
                        </td>
                        <td className="px-6 py-3 text-right font-medium text-slate-900">
                          {pendencia.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {pendencia.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        {resultadoAuditoria.pendencias.length === 0 
                          ? "Nenhuma venda sem fiscal encontrada nos dados." 
                          : "Nenhuma venda encontrada neste período selecionado."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Rodapé da Tabela */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
               <span>
                 Exibindo {pendenciasFiltradas.length} de {resultadoAuditoria.pendencias.length} pendências encontradas
               </span>
               {pendenciasFiltradas.length > 0 && (
                 <span className="font-semibold">
                   Total Filtrado: R$ {pendenciasFiltradas.reduce((acc, atual) => acc + atual.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                 </span>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};