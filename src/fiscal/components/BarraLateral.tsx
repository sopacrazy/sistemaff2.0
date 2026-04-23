import React from "react";
import {
  FileSearch,
  History,
  Settings,
  ShieldCheck,
  LayoutDashboard,
  Search,
  FileText,
  FileWarning,
  DollarSign,
  Tag,
} from "lucide-react";
import { ItemBarraLateral, EstadoVisualizacao } from "../tipos";

interface PropsBarraLateral {
  telaAtual: EstadoVisualizacao;
  aoMudarTela: (tela: EstadoVisualizacao) => void;
}

export const BarraLateral: React.FC<PropsBarraLateral> = ({
  telaAtual,
  aoMudarTela,
}) => {
  const itens: ItemBarraLateral[] = [
    {
      id: EstadoVisualizacao.PAINEL,
      rotulo: "Visão Geral",
      icone: <LayoutDashboard size={20} />,
    },
    {
      id: EstadoVisualizacao.CONSULTA,
      rotulo: "Consultar Vendas",
      icone: <Search size={20} />,
    },
    {
      id: EstadoVisualizacao.CONSULTA_NF,
      rotulo: "Consultar Notas",
      icone: <FileText size={20} />,
    },
    {
      id: EstadoVisualizacao.CONSULTA_PRODUTOS, // <-- NOVO ITEM
      rotulo: "Consultar Produtos",
      icone: <Tag size={20} />,
    },
    {
      id: EstadoVisualizacao.NOTAS_FALTANTES,
      rotulo: "Auditoria Sequência",
      icone: <FileWarning size={20} />,
    },
    {
      id: EstadoVisualizacao.RELATORIO_PIS_COFINS,
      rotulo: "Relatório PIS/COF",
      icone: <DollarSign size={20} />,
    },
    {
      id: EstadoVisualizacao.AUDITORIA_FISCAL,
      rotulo: "Auditoria Manual",
      icone: <FileSearch size={20} />,
    },
    {
      id: EstadoVisualizacao.HISTORICO,
      rotulo: "Histórico de Logs",
      icone: <History size={20} />,
    },
    {
      id: EstadoVisualizacao.CONFIGURACOES,
      rotulo: "Configurações",
      icone: <Settings size={20} />,
    },
  ];

  return (
    // 🚀 MUDANÇA 1: Fundo Branco, texto escuro e borda na direita
    <aside className="w-64 bg-white text-slate-700 flex flex-col h-screen fixed left-0 top-0 z-20 border-r border-slate-200 shadow-sm transition-all duration-300">
      {/* Cabeçalho */}
      <div className="p-6 border-b border-slate-100 flex items-center gap-3">
        <div className="bg-emerald-600 p-2 rounded-lg shadow-sm">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold tracking-tight leading-tight text-slate-900">
            FiscalFF
          </span>
          <span className="text-xs text-slate-500 font-medium">
            Portal Contábil
          </span>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        {itens.map((item) => (
          <button
            key={item.id}
            onClick={() => aoMudarTela(item.id)}
            // 🚀 MUDANÇA 2: Lógica de cores para o tema claro
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group font-medium ${
              telaAtual === item.id
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-200" // Ativo: Verde vibrante
                : "text-slate-500 hover:bg-slate-50 hover:text-emerald-700" // Inativo: Cinza suave, hover sutil
            }`}
          >
            <span
              className={`${
                telaAtual === item.id
                  ? "text-white"
                  : "text-slate-400 group-hover:text-emerald-600"
              }`}
            >
              {item.icone}
            </span>
            <span className="text-sm">{item.rotulo}</span>

            {/* Indicador de ativo (bolinha) */}
            {telaAtual === item.id && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80 shadow-sm"></div>
            )}
          </button>
        ))}
      </nav>

      {/* Rodapé do Usuário */}
      <div className="p-4 border-t border-slate-100">
        {/* 🚀 MUDANÇA 3: Card do usuário mais clean */}
        <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-3 border border-slate-200">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
            AD
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold text-slate-700 truncate">
              Admin
            </span>
            <span className="text-xs text-slate-500 truncate">
              Contador Admin
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
