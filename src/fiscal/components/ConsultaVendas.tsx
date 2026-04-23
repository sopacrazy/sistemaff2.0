import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  FileText,
  Search,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Store,
  Building,
} from "lucide-react";

export interface PendenciaFiscal {
  id: string;
  data: string;
  cliente: string;
  vendedor: string;
  local: string;
  valor: number;
  descricao: string;
  status: string;
  clienteCod: string;
  condicaoCod: string;
  condicaoDesc: string;
}

const baixarCSV = (dados: any[], nomeArquivo: string) => {
  if (!dados.length) return;
  const dadosParaCSV = dados.map((d) => ({
    Filial: d.Filial,
    "ID Pedido": d["ID Pedido"],
    Data: d.Data,
    Local: d.Local,
    "Cod Cliente": d["Cod Cliente"],
    Cliente: d.Cliente,
    "Cod Cond Pagto": d["Cod Cond Pagto"],
    "Desc Cond Pagto": d["Desc Cond Pagto"],
    Vendedor: d.Vendedor,
    Valor: d.Valor,
  }));

  const header = Object.keys(dadosParaCSV[0]).join(";");
  const body = dadosParaCSV
    .map((row) =>
      Object.values(row)
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(";")
    )
    .join("\n");
  const csvContent = "\uFEFF" + header + "\n" + body;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${nomeArquivo}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

import { API_BASE_URL as BASE } from "../../utils/apiConfig";
const API_BASE_URL = `${BASE}/api`;

interface ItemPedido {
  pedidoId: string;
  clienteCod: string;
  data: string;
  codpro: string;
  produtoNome: string;
  quantidade: number;
  precoUnitario: number;
  valorTotal: number;
  um: string;
}

interface Props {
  filial: string;
}

const obterDataAtual = () => {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
};

const obterDataInicialPadrao = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
};

export const ConsultaVendas: React.FC<Props> = ({ filial }) => {
  const [dataInicio, setDataInicio] = useState(obterDataInicialPadrao());
  const [dataFim, setDataFim] = useState(obterDataAtual());
  const [localSelecionado, setLocalSelecionado] = useState<
    "" | "CEASA" | "DIST"
  >("");
  const LIMITE_POR_PAGINA = 100;
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [pendencias, setPendencias] = useState<PendenciaFiscal[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [buscou, setBuscou] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [itensPedido, setItensPedido] = useState<ItemPedido[]>([]);
  const [pedidoSelecionado, setPedidoSelecionado] =
    useState<PendenciaFiscal | null>(null);
  const [carregandoItens, setCarregandoItens] = useState(false);

  useEffect(() => {
    setPendencias([]);
    setTotalRegistros(0);
    setBuscou(false);
    setErro(null);
  }, [filial]);

  const totalPaginas = useMemo(() => {
    return Math.ceil(totalRegistros / LIMITE_POR_PAGINA);
  }, [totalRegistros]);

  const buscarDados = useCallback(
    async (page: number) => {
      setCarregando(true);
      setErro(null);
      try {
        const response = await fetch(`${API_BASE_URL}/consulta/pendencias`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dataInicio,
            dataFim,
            local: localSelecionado,
            page,
            limit: LIMITE_POR_PAGINA,
            filial,
          }),
        });
        if (!response.ok) throw new Error("Erro na requisição");
        const resultado = await response.json();
        setPendencias(resultado.dados);
        setTotalRegistros(resultado.totalRegistros);
        setPaginaAtual(page);
        setBuscou(true);
      } catch (err) {
        setErro("Não foi possível carregar as vendas. Verifique a conexão.");
        setPendencias([]);
        setTotalRegistros(0);
      } finally {
        setCarregando(false);
      }
    },
    [dataInicio, dataFim, localSelecionado, filial]
  );

  const buscarItensPedido = useCallback(
    async (pedidoId: string) => {
      setCarregandoItens(true);
      setItensPedido([]);
      const url = `${API_BASE_URL}/consulta/itens-pedido/${pedidoId}?filial=${filial}`;
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Erro ${response.status}`);
        const data: ItemPedido[] = await response.json();
        setItensPedido(data);
      } catch (error) {
        console.error("Erro ao buscar itens:", error);
        setItensPedido([]);
      } finally {
        setCarregandoItens(false);
      }
    },
    [filial]
  );

  const handleVerDetalhes = (pedido: PendenciaFiscal) => {
    setPedidoSelecionado(pedido);
    setModalAberto(true);
    buscarItensPedido(pedido.id);
  };

  const handleBuscar = (e?: React.FormEvent) => {
    e?.preventDefault();
    buscarDados(1);
  };

  const handleExportar = async () => {
    if (totalRegistros === 0) return;
    setCarregando(true);
    try {
      const response = await fetch(`${API_BASE_URL}/consulta/pendencias`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataInicio,
          dataFim,
          local: localSelecionado,
          page: 1,
          limit: totalRegistros,
          filial,
        }),
      });
      const resultado = await response.json();
      const dadosParaExportar = resultado.dados.map((d: PendenciaFiscal) => ({
        Filial: filial,
        "ID Pedido": d.id,
        Data: d.data,
        Local: d.local,
        "Cod Cliente": d.clienteCod,
        Cliente: d.cliente,
        "Cod Cond Pagto": d.condicaoCod,
        "Desc Cond Pagto": d.condicaoDesc,
        Vendedor: d.vendedor,
        Valor: d.valor,
      }));
      baixarCSV(
        dadosParaExportar,
        `Relatorio_Pendencias_F${filial}_${dataInicio}`
      );
    } catch (err) {
      alert("Erro ao exportar dados.");
    } finally {
      setCarregando(false);
    }
  };

  const irParaPagina = (page: number) => {
    if (page >= 1 && page <= totalPaginas) {
      buscarDados(page);
    }
  };

  const handleLocalToggle = (local: "CEASA" | "DIST") => {
    setLocalSelecionado((prev) => (prev === local ? "" : local));
  };

  const getButtonClass = (
    local: "CEASA" | "DIST"
  ) => `flex items-center justify-center px-4 py-2 rounded-lg font-semibold shadow-sm transition-all text-sm h-full
    ${
      localSelecionado === local
        ? "bg-emerald-600 text-white hover:bg-emerald-700"
        : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-300"
    } disabled:opacity-50`;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center">
          <FileText className="w-6 h-6 inline mr-2 text-emerald-600" />
          Consulta Detalhada de Pendências
        </h1>
        <p className="text-slate-500 mt-1 flex items-center gap-2">
          Filtre os pedidos sem nota fiscal (SZ4140) -
          <span className="font-bold text-slate-700 bg-slate-100 px-2 rounded">
            Filial {filial}
          </span>
        </p>
      </div>
      <form
        onSubmit={handleBuscar}
        className="bg-white p-6 rounded-xl shadow-md border border-slate-200"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-3">
            <label
              htmlFor="dataInicio"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Data Início
            </label>
            <input
              type="date"
              id="dataInicio"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-700 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              required
            />
          </div>
          <div className="md:col-span-3">
            <label
              htmlFor="dataFim"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Data Fim
            </label>
            <input
              type="date"
              id="dataFim"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-700 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              required
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={carregando}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2.5 rounded-lg font-medium shadow-sm transition-all flex items-center justify-center gap-2 disabled:bg-slate-400 h-[42px]"
            >
              {carregando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              {carregando ? "..." : "Buscar"}
            </button>
          </div>
          <div className="md:col-span-4 mt-0 pt-0">
            <h3 className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-600" />
              Local:
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleLocalToggle("CEASA")}
                disabled={carregando}
                className={getButtonClass("CEASA")}
              >
                <Building className="w-4 h-4 mr-1" />
                Ceasa
              </button>
              <button
                type="button"
                onClick={() => handleLocalToggle("DIST")}
                disabled={carregando}
                className={getButtonClass("DIST")}
              >
                <Building className="w-4 h-4 mr-1" />
                Distribuidora
              </button>
              {localSelecionado !== "" && (
                <button
                  type="button"
                  onClick={() => setLocalSelecionado("")}
                  disabled={carregando}
                  className="flex items-center justify-center px-3 py-2 rounded-lg font-semibold shadow-sm transition-all text-xs bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-300"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
      {buscou && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {erro && (
            <div className="p-4 bg-red-100 text-red-800 border-l-4 border-red-500">
              <p className="font-medium">{erro}</p>
            </div>
          )}
          {!erro && !carregando && totalRegistros > 0 && (
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-semibold text-slate-800">
                Resultados encontrados: {totalRegistros}
              </h3>
              <button
                onClick={handleExportar}
                className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-600 text-sm font-medium transition-colors"
                disabled={carregando}
              >
                {carregando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Exportando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Exportar CSV
                  </>
                )}
              </button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4 w-[8%]">ID Pedido</th>
                  <th className="px-6 py-4 w-[8%]">Data</th>
                  <th className="px-6 py-4 w-[8%]">Local</th>
                  <th className="px-6 py-4 w-[16%]">Cliente</th>
                  <th className="px-6 py-4 w-[18%]">Cond. Pagto</th>
                  <th className="px-6 py-4 w-[12%]">Vendedor</th>
                  <th className="px-6 py-4 w-[10%] text-right">Valor (R$)</th>
                  <th className="px-6 py-4 w-[10%] text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {carregando && pendencias.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-12 text-center text-slate-400"
                    >
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Carregando página {paginaAtual}...
                    </td>
                  </tr>
                ) : (
                  pendencias.map((pedido) => (
                    <tr
                      key={pedido.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-3 font-mono text-xs text-slate-500">
                        {pedido.id}
                      </td>
                      <td className="px-6 py-3">{pedido.data}</td>
                      <td className="px-6 py-3 font-medium text-slate-800">
                        {pedido.local || "-"}
                      </td>
                      <td className="px-6 py-3 font-medium text-slate-900 truncate max-w-xs">
                        <span className="font-mono text-xs text-slate-500 block">
                          {pedido.clienteCod || "-"}
                        </span>
                        {pedido.cliente}
                      </td>
                      <td className="px-6 py-3 font-medium text-slate-900 truncate max-w-xs">
                        <span className="font-mono text-xs text-slate-500 block">
                          {pedido.condicaoCod || "-"}
                        </span>
                        {pedido.condicaoDesc || "-"}
                      </td>
                      <td className="px-6 py-3 text-slate-700 font-medium truncate max-w-xs">
                        {pedido.vendedor}
                      </td>
                      <td className="px-6 py-3 text-right font-medium">
                        {pedido.valor.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <button
                          onClick={() => handleVerDetalhes(pedido)}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 hover:underline flex items-center justify-center gap-1 mx-auto"
                        >
                          <ClipboardList className="w-3.5 h-3.5" /> Detalhes
                        </button>
                      </td>
                    </tr>
                  ))
                )}
                {!carregando && pendencias.length === 0 && !erro && buscou && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-8 text-center text-slate-400"
                    >
                      Nenhuma pendência encontrada no período selecionado na
                      Filial {filial}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalRegistros > LIMITE_POR_PAGINA && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-sm font-medium">
              <span className="text-slate-600">
                Página {paginaAtual} de {totalPaginas}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => irParaPagina(paginaAtual - 1)}
                  disabled={paginaAtual === 1 || carregando}
                  className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                <span className="text-slate-700 font-bold px-3 py-1 bg-white rounded-lg border border-emerald-500">
                  {paginaAtual}
                </span>
                <button
                  onClick={() => irParaPagina(paginaAtual + 1)}
                  disabled={paginaAtual === totalPaginas || carregando}
                  className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {modalAberto && (
        <div
          className="fixed inset-0 bg-slate-900 bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setModalAberto(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-emerald-600">
                Itens do Pedido:
                <span className="font-mono text-slate-800">
                  {pedidoSelecionado?.id}
                </span>
              </h3>
              <p className="text-sm text-slate-500">
                Cliente: {pedidoSelecionado?.cliente} | Data:
                {pedidoSelecionado?.data} | Filial: {filial}
              </p>
            </div>
            <div className="p-6">
              {carregandoItens ? (
                <div className="text-center py-12 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Carregando itens...
                </div>
              ) : itensPedido.length > 0 ? (
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                        Código
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase w-1/2">
                        Produto
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">
                        UM
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">
                        Qtd
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itensPedido.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {item.codpro}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {item.produtoNome}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500">
                          {item.um}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {item.quantidade.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700">
                          R$
                          {item.valorTotal.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-3 text-right font-bold text-slate-700 bg-slate-50 border-t"
                      >
                        Total Geral
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700 bg-slate-50 border-t">
                        R$
                        {itensPedido
                          .reduce((acc, item) => acc + item.valorTotal, 0)
                          .toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  Nenhum item encontrado.
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setModalAberto(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
