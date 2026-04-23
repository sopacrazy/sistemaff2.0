import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  FileText,
  Search,
  Download,
  Loader2,
  Calendar,
  AlertTriangle,
  Tag,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { NotaFiscal } from "../tipos";

// Defina a URL base
const API_BASE_URL = "http://192.168.10.49:4001/api";

// 🚀 Interface para receber a filial do App.tsx
interface Props {
  filial: string;
}

// --- Função de Exportação (Página Atual) ---
const exportarParaCSVNotasFiscais = (
  data: NotaFiscal[],
  filial: string, // Recebe a filial para o nome do arquivo
  filename: string = "relatorio_notas_fiscais"
) => {
  if (data.length === 0) {
    console.warn("Não há dados para exportar.");
    return;
  }

  const headers = [
    "Filial", // Adicionado
    "NF",
    "Série",
    "Emissão",
    "CFOP",
    "Cliente Código",
    "Cliente Nome",
    "Valor Total (R$)",
    "Situação",
    "Chave NFe",
    "Observação",
  ];

  const keys: Array<keyof NotaFiscal> = [
    "nf",
    "serie",
    "emissao",
    "cfop",
    "clienteCodigo",
    "clienteNome",
    "valorTotal",
    "situacao",
    "chaveNfe",
    "observacao",
  ];

  let csvContent = headers.join(";") + "\n";

  data.forEach((item) => {
    // Adiciona a coluna Filial na linha
    const rowData = [filial];

    keys.forEach((key) => {
      let value = String(item[key as keyof NotaFiscal] || "").trim();
      if (key === "valorTotal" && typeof item.valorTotal === "number") {
        value = item.valorTotal.toFixed(2).replace(".", ",");
      }
      rowData.push(value);
    });

    csvContent += rowData.join(";") + "\n";
  });

  const blob = new Blob(["\ufeff", csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute(
    "download",
    `${filename}_F${filial}_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const obterDataAtual = () => {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
};

const STATUS_OPTIONS = [
  "Autorizado o uso da NF-e",
  "Cancelamento autorizado",
  "Rejeicao: Irregularidade fiscal do destinatario",
  "Irregularidade fiscal do destinatario",
  "Autorizado o uso da NF-e, autorizacao fora de prazo",
  "Rejeicao: Destinatario nao habilitado a operar na UF",
  "Rejeicao: Informado NCM inexistente [nItem:1]",
  "Rejeicao: Falha no schema XML (Elemento: inutNFe/infInut/xJust)",
  "Rejeicao: CPF do destinatario invalido",
];

const LIMIT_PER_PAGE = 100;

export const ConsultaNotaFiscal: React.FC<Props> = ({ filial }) => {
  const obterDataInicialPadrao = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${month}-${day}`;
  };

  const [dataInicio, setDataInicio] = useState(obterDataInicialPadrao());
  const [dataFim, setDataFim] = useState(obterDataAtual());

  const [seriesSelecionadas, setSeriesSelecionadas] = useState(["1", "5"]);
  const [situacoesSelecionadas, setSituacoesSelecionadas] = useState<string[]>(
    STATUS_OPTIONS.slice(0, 3)
  );
  const [comOuSemChave, setComOuSemChave] = useState<"com" | "sem" | "todos">(
    "todos"
  );

  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [buscou, setBuscou] = useState(false);

  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);

  // 🚀 EFEITO: Limpa resultados ao trocar de filial
  useEffect(() => {
    setNotas([]);
    setTotalRegistros(0);
    setBuscou(false);
    setErro(null);
    setPaginaAtual(1);
  }, [filial]);

  const totalPaginas = useMemo(() => {
    return Math.max(1, Math.ceil(totalRegistros / LIMIT_PER_PAGE));
  }, [totalRegistros]);

  const handleBuscar = useCallback(
    async (e: React.FormEvent, page: number = 1) => {
      e.preventDefault();
      setCarregando(true);
      setErro(null);
      setNotas([]);
      setPaginaAtual(page);

      if (
        !dataInicio ||
        !dataFim ||
        seriesSelecionadas.length === 0 ||
        situacoesSelecionadas.length === 0
      ) {
        setErro(
          "Por favor, preencha o range de datas, selecione pelo menos uma Série e pelo menos uma Situação."
        );
        setCarregando(false);
        return;
      }

      try {
        // 🚀 REQUISIÇÃO DIRETA COM FILIAL
        const response = await fetch(`${API_BASE_URL}/consulta/notas-fiscais`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dataInicio,
            dataFim,
            series: seriesSelecionadas,
            situacoes: situacoesSelecionadas,
            comOuSemChave,
            page,
            limit: LIMIT_PER_PAGE,
            filial, // 🚀 Enviando a filial
          }),
        });

        if (!response.ok) throw new Error("Erro na requisição");

        const resultado = await response.json();

        setNotas(resultado.dados);
        setTotalRegistros(resultado.totalRegistros);
        setBuscou(true);
      } catch (err) {
        setErro(
          `Erro ao carregar Notas Fiscais. Verifique a conexão com o servidor. Detalhes: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      } finally {
        setCarregando(false);
      }
    },
    [
      dataInicio,
      dataFim,
      seriesSelecionadas,
      situacoesSelecionadas,
      comOuSemChave,
      filial, // 🚀 Dependência atualizada
    ]
  );

  const handleMudarPagina = (novaPagina: number) => {
    handleBuscar({ preventDefault: () => {} } as React.FormEvent, novaPagina);
  };

  const handleToggleSerie = (serie: string) => {
    setSeriesSelecionadas((prev) =>
      prev.includes(serie) ? prev.filter((s) => s !== serie) : [...prev, serie]
    );
  };

  const handleToggleSituacao = (situacao: string) => {
    setSituacoesSelecionadas((prev) =>
      prev.includes(situacao)
        ? prev.filter((s) => s !== situacao)
        : [...prev, situacao]
    );
  };

  const handleToggleAllSituacoes = () => {
    setSituacoesSelecionadas((prev) =>
      prev.length === STATUS_OPTIONS.length ? [] : STATUS_OPTIONS
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center">
          <FileText className="w-6 h-6 inline mr-2 text-emerald-600" />
          Consulta de Notas Fiscais (Entrada)
        </h1>
        <p className="text-slate-500 mt-1 flex items-center gap-2">
          Busca de Notas Fiscais (SF3140) -{" "}
          <span className="font-bold text-slate-700 bg-slate-100 px-2 rounded">
            Filial {filial}
          </span>
        </p>
      </div>

      {/* Formulário de Filtro */}
      <form
        onSubmit={(e) => handleBuscar(e, 1)}
        className="bg-white p-6 rounded-xl shadow-md border border-slate-200 space-y-4"
      >
        {/* Filtro de Datas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
              <Calendar className="w-4 h-4 text-emerald-500" /> Data Início
              (Emissão)
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-700 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
              <Calendar className="w-4 h-4 text-emerald-500" /> Data Fim
              (Emissão)
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-700 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              required
            />
          </div>
        </div>

        {/* Filtro de Série e Com/Sem Chave */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col space-y-2 col-span-1">
            <span className="text-sm font-medium text-slate-700 flex-shrink-0 flex items-center gap-1">
              <Tag className="w-4 h-4 text-emerald-500" />
              Séries (NF):
            </span>
            <div className="flex flex-wrap gap-3">
              {/* Série 1 - NOTA FISCAL */}
              <button
                type="button"
                key="1"
                onClick={() => handleToggleSerie("1")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  seriesSelecionadas.includes("1")
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                Série 1 (Nota Fiscal)
              </button>
              {/* Série 5 - CUPOM FISCAL */}
              <button
                type="button"
                key="5"
                onClick={() => handleToggleSerie("5")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  seriesSelecionadas.includes("5")
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                Série 5 (Cupom Fiscal)
              </button>
            </div>
          </div>

          {/* Filtro Com/Sem Chave */}
          <div className="flex flex-col space-y-2 col-span-2">
            <span className="text-sm font-medium text-slate-700 flex-shrink-0 flex items-center gap-1">
              <HelpCircle className="w-4 h-4 text-emerald-500" />
              Filtro por Chave NFe:
            </span>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setComOuSemChave("todos")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  comOuSemChave === "todos"
                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                Todas (Com/Sem Chave)
              </button>
              <button
                type="button"
                onClick={() => setComOuSemChave("com")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  comOuSemChave === "com"
                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                Com Chave NFe
              </button>
              <button
                type="button"
                onClick={() => setComOuSemChave("sem")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  comOuSemChave === "sem"
                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                Sem Chave NFe
              </button>
            </div>
          </div>
        </div>

        {/* Filtro de Situação */}
        <div className="pt-4 border-t border-slate-100">
          <span className="text-sm font-medium text-slate-700 flex-shrink-0 flex items-center gap-1 mb-2">
            <Tag className="w-4 h-4 text-emerald-500" />
            Filtrar por Situação (Status da NF):
            <button
              type="button"
              onClick={handleToggleAllSituacoes}
              className="ml-3 text-xs px-2 py-0.5 rounded border border-slate-300 bg-slate-50 text-slate-500 hover:bg-slate-100"
            >
              {situacoesSelecionadas.length === STATUS_OPTIONS.length
                ? "Desmarcar Todas"
                : "Marcar Todas"}
            </button>
          </span>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 border border-dashed border-slate-200 p-2 rounded-lg">
            {STATUS_OPTIONS.map((status) => (
              <button
                type="button"
                key={status}
                onClick={() => handleToggleSituacao(status)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors border whitespace-nowrap ${
                  situacoesSelecionadas.includes(status)
                    ? "bg-fuchsia-600 text-white border-fuchsia-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                {status} (
                {situacoesSelecionadas.includes(status) ? "ON" : "OFF"})
              </button>
            ))}
          </div>
        </div>

        {/* Botão de Consulta */}
        <div className="pt-6 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            // Desabilita se estiver carregando, sem séries ou sem situações selecionadas
            disabled={
              carregando ||
              seriesSelecionadas.length === 0 ||
              situacoesSelecionadas.length === 0
            }
            className="w-full md:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm transition-all flex items-center justify-center gap-2 disabled:bg-slate-400"
          >
            {carregando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Consultar NF ({seriesSelecionadas.length} séries,{" "}
                {situacoesSelecionadas.length} situações)
              </>
            )}
          </button>
        </div>
      </form>

      {/* Exibição dos Resultados */}
      {buscou && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {erro && (
            <div className="p-4 bg-red-100 text-red-800 border-l-4 border-red-500 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold">Erro na Consulta:</h4>
                <p className="text-sm mt-1">{erro}</p>
                <p className="text-xs mt-1 text-red-600">
                  Verifique se o seu servidor Node.js está rodando e se o
                  endpoint '/api/consulta/notas-fiscais' foi implementado.
                </p>
              </div>
            </div>
          )}

          {!erro && (
            <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
              <h3 className="font-semibold text-slate-800">
                {notas.length} Notas Fiscais Exibidas ({totalRegistros} total)
              </h3>
              <div className="flex items-center gap-4">
                <span className="text-base font-bold text-slate-800">
                  Valor Total Exibido: R${" "}
                  {notas
                    .reduce((acc, nf) => acc + nf.valorTotal, 0)
                    .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
                {/* Botão de Exportação */}
                <button
                  onClick={() => exportarParaCSVNotasFiscais(notas, filial)}
                  className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-600 text-sm font-medium transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" /> Exportar CSV (Página Atual)
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4 w-[12%]">NF / Série</th>
                  <th className="px-6 py-4 w-[10%]">Emissão</th>
                  <th className="px-6 py-4 w-[8%]">CFOP</th>
                  <th className="px-6 py-4 w-[20%]">Cliente (Nome)</th>
                  <th className="px-6 py-4 w-[15%]">Situação</th>
                  <th className="px-6 py-4 w-[15%] text-right">
                    Valor Total (R$)
                  </th>
                  <th className="px-6 py-4 w-[20%]">Chave NFe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {carregando ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-slate-400"
                    >
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Buscando notas...
                    </td>
                  </tr>
                ) : (
                  notas.map((nf) => (
                    <tr
                      key={`${nf.nf}-${nf.serie}`}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-3 font-mono text-xs text-slate-500">
                        {nf.nf.trim()}-{nf.serie.trim()}
                      </td>
                      <td className="px-6 py-3">{nf.emissao}</td>
                      <td className="px-6 py-3 font-mono text-xs text-slate-600">
                        {nf.cfop}
                      </td>
                      <td className="px-6 py-3 font-medium text-slate-900 truncate max-w-xs">
                        {nf.clienteNome}
                      </td>
                      <td className="px-6 py-3 text-slate-600">
                        {nf.situacao}
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-slate-800">
                        {nf.valorTotal.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </td>
                      <td className="px-6 py-3 font-mono text-xs text-slate-500 break-all">
                        {nf.chaveNfe || "N/A"}
                      </td>
                    </tr>
                  ))
                )}

                {!carregando && notas.length === 0 && !erro && buscou && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-slate-400"
                    >
                      Nenhuma Nota Fiscal encontrada para o período e séries
                      selecionadas na Filial {filial}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Paginação */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-sm text-slate-600">
            <p className="text-xs text-slate-500">
              Exibindo {notas.length} notas (Página {paginaAtual} de{" "}
              {totalPaginas}). Total de {totalRegistros} registros encontrados.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleMudarPagina(paginaAtual - 1)}
                disabled={paginaAtual === 1 || carregando}
                className="p-2 border border-slate-300 rounded-md disabled:opacity-50 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-medium">Página {paginaAtual}</span>
              <button
                type="button"
                onClick={() => handleMudarPagina(paginaAtual + 1)}
                disabled={
                  paginaAtual === totalPaginas ||
                  carregando ||
                  totalRegistros === 0
                }
                className="p-2 border border-slate-300 rounded-md disabled:opacity-50 hover:bg-slate-100 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
