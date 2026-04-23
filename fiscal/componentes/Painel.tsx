import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  FileWarning,
  ArrowRight,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Loader2,
} from "lucide-react";

// Defina a URL base aqui, igual nos outros arquivos
const API_BASE_URL = "http://192.168.10.49:4001/api";

// Definições de tipos
interface PendenciaFiscal {
  id: string;
  data: string;
  cliente: string;
  vendedor: string;
  local?: string;
  valor: number;
  descricao: string;
  status: string;
}

interface ConformidadeStats {
  semNota: number;
  comNota: number;
  totalGeral: number;
  valorSemNota: number;
  valorComNota: number;
  taxaConformidade: number;
  variacaoMensal: number;
}

// Enum de Visualização (Importante manter sincronizado com o types.ts se houver)
enum EstadoVisualizacao {
  PAINEL = "PAINEL",
  CONSULTA = "CONSULTA",
  NOTAS = "NOTAS",
  CONSULTA_NF = "CONSULTA_NF",
  NOTAS_FALTANTES = "NOTAS_FALTANTES",
  RELATORIO_PIS_COFINS = "RELATORIO_PIS_COFINS",
  AUDITORIA = "AUDITORIA",
  AUDITORIA_FISCAL = "AUDITORIA_FISCAL",
  HISTORICO = "HISTORICO",
  LOGS = "LOGS",
  CONFIGURACOES = "CONFIGURACOES",
}

// 🚀 Agora recebe a Filial
interface PropsPainel {
  aoMudarTela: (tela: EstadoVisualizacao) => void;
  filial: string;
}

export const Painel: React.FC<PropsPainel> = ({ aoMudarTela, filial }) => {
  const [pendencias, setPendencias] = useState<PendenciaFiscal[]>([]);
  const [stats, setStats] = useState<ConformidadeStats>({
    semNota: 0,
    comNota: 0,
    totalGeral: 0,
    valorSemNota: 0,
    valorComNota: 0,
    taxaConformidade: 0,
    variacaoMensal: 0,
  });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // 🚀 EFEITO: Recarrega tudo quando a filial muda
  useEffect(() => {
    const carregarDados = async () => {
      setCarregando(true);
      setErro(null); // Reseta erro ao tentar novamente

      try {
        // 1. Busca Pendências (Top 10 lista)
        // Passando filial via Query String
        const respPendencias = await fetch(
          `${API_BASE_URL}/dashboard/pendencias?filial=${filial}`
        );
        if (!respPendencias.ok) throw new Error("Falha ao buscar pendências");
        const dadosPendentes = await respPendencias.json();
        setPendencias(dadosPendentes);

        // 2. Busca Estatísticas (KPIs)
        const respStats = await fetch(
          `${API_BASE_URL}/dashboard/conformidade?filial=${filial}`
        );
        if (!respStats.ok) throw new Error("Falha ao buscar estatísticas");
        const dadosStats = await respStats.json();

        // Cálculo da taxa no frontend (ou poderia vir do back)
        const totalValorCorrigido =
          dadosStats.valorComNota + dadosStats.valorSemNota;
        let taxa = 0;
        if (totalValorCorrigido > 0) {
          taxa = (dadosStats.valorComNota / totalValorCorrigido) * 100;
        }

        setStats({
          ...dadosStats,
          taxaConformidade: taxa,
          variacaoMensal: 0, // Mock ou implementar lógica de mês anterior no back
        });
      } catch (err) {
        console.error(err);
        setErro(
          `Não foi possível carregar os dados da Filial ${filial}. Verifique a conexão.`
        );
        // Reseta estados em caso de erro
        setPendencias([]);
        setStats({
          semNota: 0,
          comNota: 0,
          totalGeral: 0,
          valorSemNota: 0,
          valorComNota: 0,
          taxaConformidade: 0,
          variacaoMensal: 0,
        });
      } finally {
        setCarregando(false);
      }
    };

    carregarDados();
  }, [filial]); // 🚀 Array de dependência inclui filial

  const contagemTotal = stats.semNota;

  // Variação (Mock visual)
  const corVariacao =
    stats.variacaoMensal >= 0 ? "text-emerald-600" : "text-red-600";
  const iconeVariacao =
    stats.variacaoMensal >= 0 ? (
      <TrendingUp className="w-3 h-3" />
    ) : (
      <AlertCircle className="w-3 h-3" />
    );
  const sinalVariacao = stats.variacaoMensal >= 0 ? "+" : "";

  if (carregando) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="ml-3 text-lg text-slate-600">
          Carregando dados da Filial {filial}...
        </p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="max-w-7xl mx-auto p-6 bg-red-100 border-l-4 border-red-500 text-red-800 rounded-xl">
        <h2 className="font-bold text-xl mb-2">Erro de Conexão</h2>
        <p>{erro}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Dashboard Fiscal
          </h1>
          <p className="text-slate-500 mt-1">
            Visualizando dados da{" "}
            <span className="font-bold text-slate-700 bg-slate-100 px-2 rounded">
              Filial {filial}
            </span>
          </p>
        </div>
        <button
          onClick={() => aoMudarTela(EstadoVisualizacao.CONSULTA)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium shadow-md transition-colors flex items-center gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          Ir para Consulta Detalhada
        </button>
      </div>

      {/* Cartões de KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cartão 1: PEDIDOS SEM NOTA (Contagem visível) */}
        <div className="bg-white p-6 rounded-xl border-l-4 border-red-500 shadow-sm flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">
              Pedidos sem Nota
            </p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">
              {contagemTotal}
            </h3>
            <p className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Ação Imediata Necessária
            </p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg text-red-600">
            <FileWarning className="w-6 h-6" />
          </div>
        </div>

        {/* Cartão 2: RISCO FISCAL (Valor Oculto) */}
        <div className="bg-white p-6 rounded-xl border-l-4 border-orange-400 shadow-sm flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">
              Risco Fiscal (Valor)
            </p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2 tracking-widest">
              {/* 🔒 VALOR OCULTO AQUI */}
              R$ *********
            </h3>
            <p className="text-xs text-orange-600 mt-1 font-medium">
              Faturamento pendente de regularização
            </p>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg text-orange-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Cartão 3: Taxa de Conformidade (Percentual visível) */}
        <div className="bg-white p-6 rounded-xl border-l-4 border-emerald-500 shadow-sm flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">
              Taxa de Conformidade (Valor)
            </p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">
              {stats.taxaConformidade.toFixed(1)}%
            </h3>
            <p
              className={`text-xs ${corVariacao} mt-1 font-medium flex items-center gap-1`}
            >
              {iconeVariacao}
              {sinalVariacao}
              {stats.variacaoMensal.toFixed(1)}% vs mês anterior
            </p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabela de Alertas (Visualização Rápida) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <h2 className="text-xl font-semibold text-slate-800 p-6 border-b border-slate-100 flex justify-between">
          <span>Top 10 Maiores Alertas de Pendências</span>
          <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded">
            Filial {filial}
          </span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">ID Pedido</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Valor (R$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendencias
                .sort((a, b) => b.valor - a.valor)
                .slice(0, 10)
                .map((pedido) => (
                  <tr
                    key={pedido.id}
                    className="hover:bg-red-50/50 transition-colors"
                  >
                    <td className="px-6 py-3 font-mono text-xs text-slate-500">
                      {pedido.id}
                    </td>
                    <td className="px-6 py-3">{pedido.data}</td>
                    <td className="px-6 py-3 font-medium text-slate-900">
                      {pedido.cliente}
                    </td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {pedido.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-medium tracking-widest">
                      {/* 🔒 VALOR OCULTO AQUI TAMBÉM */}
                      R$ *********
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
          <p className="text-slate-400">
            Dados baseados em todos os pedidos sem nota da{" "}
            <strong>Filial {filial}</strong>.
          </p>
          <button
            onClick={() => aoMudarTela(EstadoVisualizacao.CONSULTA)}
            className="font-medium text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
          >
            Ver todos os {contagemTotal} pedidos
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
