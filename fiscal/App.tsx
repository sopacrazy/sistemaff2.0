import React, { useState } from "react";
import { BarraLateral } from "./componentes/BarraLateral";
import { AuditoriaFiscal } from "./componentes/AuditoriaFiscal";
import { Painel } from "./componentes/Painel";
import { ConsultaVendas } from "./componentes/ConsultaVendas";
import { ConsultaNotaFiscal } from "./componentes/ConsultaNotaFiscal";
import { ConsultaProdutos } from "./componentes/ConsultaProdutos"; // <-- NOVA LINHA
import { RelatorioNotasFaltantes } from "./componentes/RelatorioNotasFaltantes";
import { RelatorioPisCofins } from "./componentes/RelatorioPisCofins";
import { Login } from "./componentes/Login";
import { EstadoVisualizacao } from "./tipos";
import { FileSearch, Building2 } from "lucide-react";

// 🚀 LISTA DE FILIAIS ATUALIZADA
const FILIAIS = [
  { codigo: "01", nome: "Matriz - Belém" },
  { codigo: "04", nome: "Filial - Castanhal" },
  { codigo: "06", nome: "Filial - Piedade" },
  { codigo: "22", nome: "Filial - Passarela" }, // 🚀 NOVA FILIAL ADICIONADA
];

export default function App() {
  const [autenticado, setAutenticado] = useState<boolean>(false);
  const [telaAtual, setTelaAtual] = useState<EstadoVisualizacao>(
    EstadoVisualizacao.PAINEL
  );

  // 🚀 ESTADO GLOBAL DA FILIAL (Começa com 01)
  const [filialSelecionada, setFilialSelecionada] = useState("01");

  const realizarLogin = () => {
    setAutenticado(true);
  };

  // 🚀 PASSANDO A PROPRIEDADE 'filial' PARA OS FILHOS
  const renderizarTela = () => {
    switch (telaAtual) {
      case EstadoVisualizacao.PAINEL:
        // @ts-ignore
        return <Painel aoMudarTela={setTelaAtual} filial={filialSelecionada} />;
      case EstadoVisualizacao.CONSULTA:
        // @ts-ignore
        return <ConsultaVendas filial={filialSelecionada} />;
      case EstadoVisualizacao.CONSULTA_NF:
        // @ts-ignore
        return <ConsultaNotaFiscal filial={filialSelecionada} />;
      case EstadoVisualizacao.NOTAS_FALTANTES:
        // @ts-ignore
        return <RelatorioNotasFaltantes filial={filialSelecionada} />;
      case EstadoVisualizacao.RELATORIO_PIS_COFINS:
        return <RelatorioPisCofins filial={filialSelecionada} />;
      case EstadoVisualizacao.CONSULTA_PRODUTOS: // <-- NOVO CASO
        return <ConsultaProdutos filial={filialSelecionada} />;
      case EstadoVisualizacao.AUDITORIA_FISCAL:
        return <AuditoriaFiscal />;
      case EstadoVisualizacao.HISTORICO:
        return (
          <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
                <FileSearch className="w-10 h-10 text-slate-300" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900">
                Histórico Vazio
              </h2>
              <p className="text-slate-500 mt-2 max-w-md mx-auto">
                Você ainda não realizou nenhuma auditoria manual completa neste
                período.
              </p>
              <button
                onClick={() =>
                  setTelaAtual(EstadoVisualizacao.AUDITORIA_FISCAL)
                }
                className="mt-8 px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm hover:shadow-md"
              >
                Iniciar Nova Auditoria
              </button>
            </div>
          </div>
        );
      case EstadoVisualizacao.CONFIGURACOES:
        return (
          <div className="flex items-center justify-center h-96 text-slate-400 animate-fade-in">
            <div className="text-center">
              <p className="mb-2 font-medium">
                Configurações de Regras Fiscais
              </p>
              <p className="text-sm opacity-70">Módulo em desenvolvimento</p>
            </div>
          </div>
        );
      default:
        // @ts-ignore
        return <Painel aoMudarTela={setTelaAtual} filial={filialSelecionada} />;
    }
  };

  const obterTituloCabecalho = () => {
    switch (telaAtual) {
      case EstadoVisualizacao.PAINEL:
        return "Dashboard Fiscal";
      case EstadoVisualizacao.CONSULTA:
        return "Consultar Pendências";
      case EstadoVisualizacao.CONSULTA_NF:
        return "Consultar Notas Fiscais";
      case EstadoVisualizacao.NOTAS_FALTANTES:
        return "Auditoria de Sequência (Gaps)";
      case EstadoVisualizacao.RELATORIO_PIS_COFINS:
        return "Relatório PIS e COFINS";
      case EstadoVisualizacao.CONSULTA_PRODUTOS: // <-- NOVO TÍTULO
        return "Consulta de Produtos";
      case EstadoVisualizacao.AUDITORIA_FISCAL:
        return "Auditoria de Vendas";
      case EstadoVisualizacao.HISTORICO:
        return "Histórico de Auditorias";
      case EstadoVisualizacao.CONFIGURACOES:
        return "Configurações";
      default:
        return "Portal Fiscal";
    }
  };

  if (!autenticado) {
    return <Login aoLogar={realizarLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      <BarraLateral telaAtual={telaAtual} aoMudarTela={setTelaAtual} />

      <main className="flex-1 ml-64 transition-all duration-300 flex flex-col min-h-screen">
        <header className="bg-white border-b border-slate-200 h-16 sticky top-0 z-10 px-8 flex items-center justify-between shadow-sm">
          {/* Título e Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            <span className="uppercase tracking-wider text-xs font-semibold">
              Sistema
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-semibold">
              {obterTituloCabecalho()}
            </span>
          </div>

          <div className="flex items-center gap-6">
            {/* 🚀 SELETOR DE FILIAL */}
            <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <div className="p-1.5 bg-white rounded-md shadow-sm text-slate-500">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Filial Ativa
                </span>
                <select
                  value={filialSelecionada}
                  onChange={(e) => setFilialSelecionada(e.target.value)}
                  className="bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer min-w-[140px]"
                >
                  {FILIAIS.map((f) => (
                    <option key={f.codigo} value={f.codigo}>
                      {f.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status Online */}
            <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-semibold text-emerald-700">
                Online
              </span>
            </div>
          </div>
        </header>

        <div className="p-8 flex-1">{renderizarTela()}</div>
      </main>
    </div>
  );
}
