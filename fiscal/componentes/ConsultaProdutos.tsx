import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  Search,
  Loader2,
  Tag,
  ChevronLeft,
  ChevronRight,
  Download,
  AlertCircle,
  Filter,
} from "lucide-react";

// --- Interface para o Produto ---
interface B1Product {
  B1_COD: string;
  B1_DESC: string;
  B1_TIPO: string;
  B1_POSIPI: string;
  B1_TE: string;
  B1_TS: string;
  B1_MSBLQL: string;
  B1_CONTA: string;
  B1_ORIGEM: string;
  B1_CLASFIS: string;
}

// --- Propriedades do Componente ---
interface Props {
  filial: string; // Mantida a prop para o roteamento do App.tsx
}

const API_BASE_URL = "http://192.168.10.49:4001/api";
const LIMITE_POR_PAGINA = 100;

export const ConsultaProdutos: React.FC<Props> = ({ filial }) => {
  // Estados de Busca por Texto
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");

  // NOVOS ESTADOS DE FILTRO
  const [filtroBloqueio, setFiltroBloqueio] = useState<"" | "1" | "2">("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroTE, setFiltroTE] = useState("");
  const [filtroTS, setFiltroTS] = useState("");

  // Estados de Paginação e Resultado
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [resultados, setResultados] = useState<B1Product[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [buscou, setBuscou] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Lógica de bloqueio: '1' é Bloqueado. '2' e '' são Desbloqueados.
  const isProdutoBloqueado = (msblql: string) => msblql === "1";

  const executarBusca = useCallback(
    async (page: number, exportAll: boolean = false) => {
      setCarregando(true);
      setErro(null);
      if (page === 1 && !exportAll) setResultados([]);

      try {
        const response = await fetch(`${API_BASE_URL}/consulta/produtos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            codigo,
            descricao,
            filtroBloqueio,
            filtroTipo,
            filtroTE,
            filtroTS,
            page: exportAll ? 1 : page,
            limit: exportAll ? totalRegistros || 99999 : LIMITE_POR_PAGINA,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          if (exportAll) {
            alert("Exportação de " + data.totalRegistros + " produtos pronta!");
          } else {
            setResultados(data.dados);
            setTotalRegistros(data.totalRegistros);
            setPaginaAtual(page);
            setBuscou(true);
          }
        } else {
          setErro("Erro: " + data.error);
        }
      } catch (error) {
        console.error("Erro no fetch:", error);
        setErro("Erro de conexão com o backend. Verifique o console.");
      } finally {
        setCarregando(false);
      }
    },
    [
      codigo,
      descricao,
      totalRegistros,
      filtroBloqueio,
      filtroTipo,
      filtroTE,
      filtroTS,
    ]
  );

  // CORREÇÃO DO FLICKER: Chama a busca inicial após a montagem.
  useEffect(() => {
    executarBusca(1);
  }, [executarBusca]);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    executarBusca(1);
  };

  const handleExportar = () => {
    executarBusca(1, true);
  };

  const mudarPagina = (novaPagina: number) => {
    const totalPaginas = Math.ceil(totalRegistros / LIMITE_POR_PAGINA);
    if (novaPagina >= 1 && novaPagina <= totalPaginas) {
      executarBusca(novaPagina);
    }
  };

  const totalPaginas = useMemo(() => {
    return Math.ceil(totalRegistros / LIMITE_POR_PAGINA);
  }, [totalRegistros]);

  // Loader centralizado na primeira carga
  if (carregando && !buscou) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
        <p className="ml-4 text-xl font-medium text-slate-600">
          Carregando lista inicial de produtos...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[95%] mx-auto space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-purple-100">
          <Tag className="w-8 h-8 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Consulta de Cadastro de Produtos
          </h1>
          <p className="text-slate-500 flex items-center gap-2">
            Tabela SB1140 (Cadastro Único)
          </p>
        </div>
      </div>

      {/* Formulário de Busca e Filtros - LAYOUT ALINHADO */}
      <form
        onSubmit={handleBuscar}
        className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4"
      >
        {/* LINHA PRINCIPAL: Código, Descrição e Botão */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Campo: Código do Produto */}
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Código do Produto
            </label>
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="EX: 100.001"
              className="w-full border rounded-lg p-2.5 text-sm uppercase"
            />
          </div>

          {/* Campo: Descrição */}
          <div className="md:col-span-6">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Descrição (Busca Parcial)
            </label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Pneu, Óleo, Parafuso..."
              className="w-full border rounded-lg p-2.5 text-sm"
            />
          </div>

          {/* Botão de Busca */}
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={carregando}
              className={`w-full text-white p-2.5 rounded-lg flex justify-center items-center gap-2 font-medium h-[42px] transition-colors ${
                carregando
                  ? "bg-slate-400"
                  : "bg-purple-600 hover:bg-purple-700"
              }`}
            >
              {carregando ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                <Search className="w-5 h-5" />
              )}{" "}
              Buscar
            </button>
          </div>
        </div>

        {/* NOVA SEÇÃO: FILTROS AVANÇADOS (Alinhamento em Grid) */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <Filter className="w-4 h-4 text-purple-600" />
            Filtros Avançados
          </h3>

          {/* Grid de 4 colunas para os filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filtro: Bloqueio (Select) */}
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-slate-500 mb-1">
                Bloqueio
              </label>
              <select
                value={filtroBloqueio}
                onChange={(e) =>
                  setFiltroBloqueio(e.target.value as "" | "1" | "2")
                }
                className="w-full border rounded-lg p-2.5 text-sm"
              >
                <option value="">Todos</option>
                <option value="1">Bloqueado</option>
                <option value="2">Desbloqueado</option>
              </select>
            </div>

            {/* Filtro: Tipo (Input) */}
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-slate-500 mb-1">
                Tipo
              </label>
              <input
                type="text"
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                placeholder="EX: PA"
                className="w-full border rounded-lg p-2.5 text-sm uppercase"
              />
            </div>

            {/* Filtro: TE (Input) */}
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-slate-500 mb-1">
                TE (Entrada)
              </label>
              <input
                type="text"
                value={filtroTE}
                onChange={(e) => setFiltroTE(e.target.value)}
                placeholder="EX: 101"
                className="w-full border rounded-lg p-2.5 text-sm uppercase"
              />
            </div>

            {/* Filtro: TS (Input) */}
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-slate-500 mb-1">
                TS (Saída)
              </label>
              <input
                type="text"
                value={filtroTS}
                onChange={(e) => setFiltroTS(e.target.value)}
                placeholder="EX: 900"
                className="w-full border rounded-lg p-2.5 text-sm uppercase"
              />
            </div>
          </div>
        </div>
      </form>

      {/* Exibição de Resultados (Mantida a lógica de bloqueio B1_MSBLQL) */}
      {buscou && !erro && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* 🚀 CORREÇÃO: Bloco do cabeçalho da tabela de resultados */}
          <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
            <div className="flex flex-col">
              <span className="font-bold text-slate-700">
                Total: {totalRegistros} produtos
              </span>
              <span className="text-xs text-slate-500">
                Página {paginaAtual} de {totalPaginas || 1}
              </span>
            </div>
            <button
              onClick={handleExportar}
              disabled={carregando || totalRegistros === 0}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Exportar Completo
            </button>
          </div>
          {/* Fim do bloco de cabeçalho */}

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">CÓDIGO</th>
                  <th className="p-3">DESCRIÇÃO</th>
                  <th className="p-3">TIPO</th>
                  <th className="p-3">POSIPI</th>
                  <th className="p-3">TE</th>
                  <th className="p-3">TS</th>
                  <th className="p-3">BLOQUEIO</th>
                  <th className="p-3">CONTA</th>
                  <th className="p-3">ORIGEM</th>
                  <th className="p-3">CLASFIS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* 🚀 Lógica de Carregamento/Resultado aqui */}
                {carregando && resultados.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />{" "}
                      Buscando produtos...
                    </td>
                  </tr>
                ) : resultados.length > 0 ? (
                  resultados.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono text-slate-700 font-bold">
                        {r.B1_COD}
                      </td>
                      <td className="p-3 truncate max-w-xs">{r.B1_DESC}</td>
                      <td className="p-3 text-center">{r.B1_TIPO}</td>
                      <td className="p-3 text-center">{r.B1_POSIPI}</td>
                      <td className="p-3 text-center">{r.B1_TE}</td>
                      <td className="p-3 text-center">{r.B1_TS}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isProdutoBloqueado(r.B1_MSBLQL)
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {isProdutoBloqueado(r.B1_MSBLQL)
                            ? "Bloqueado"
                            : "Desbloqueado"}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-xs">{r.B1_CONTA}</td>
                      <td className="p-3 text-center">{r.B1_ORIGEM}</td>
                      <td className="p-3 text-center">{r.B1_CLASFIS}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-500">
                      Nenhum produto encontrado com os filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalRegistros > LIMITE_POR_PAGINA && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <button
                onClick={() => mudarPagina(paginaAtual - 1)}
                disabled={paginaAtual === 1 || carregando}
                className="px-3 py-1 border rounded hover:bg-white disabled:opacity-50 flex items-center text-sm"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
              </button>
              <span className="text-sm font-medium text-slate-600">
                Página {paginaAtual} de {totalPaginas}
              </span>
              <button
                onClick={() => mudarPagina(paginaAtual + 1)}
                disabled={paginaAtual === totalPaginas || carregando}
                className="px-3 py-1 border rounded hover:bg-white disabled:opacity-50 flex items-center text-sm"
              >
                Próximo <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          )}
        </div>
      )}
      {erro && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {erro}
        </div>
      )}
    </div>
  );
};
