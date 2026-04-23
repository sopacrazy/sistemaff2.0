import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Search,
  Loader2,
  DollarSign,
  Filter,
  ChevronLeft,
  ChevronRight,
  Download,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";

const API_BASE_URL = "http://192.168.10.49:4001/api";

// 🚀 Recebendo a Filial via props
interface Props {
  filial: string;
}

export const RelatorioPisCofins: React.FC<Props> = ({ filial }) => {
  const [dataInicio, setDataInicio] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [dataFim, setDataFim] = useState(new Date().toISOString().slice(0, 10));
  const [nota, setNota] = useState("");
  const [tipoMovimento, setTipoMovimento] = useState<"saida" | "entrada">(
    "saida"
  );
  const [apenasPis, setApenasPis] = useState(true);
  const [apenasCofins, setApenasCofins] = useState(true);

  const [paginaAtual, setPaginaAtual] = useState(1);
  const LIMITE_POR_PAGINA = 100;
  const [totalRegistros, setTotalRegistros] = useState(0);

  const [resultados, setResultados] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [buscou, setBuscou] = useState(false);
  const [exportando, setExportando] = useState(false);

  // 🚀 EFEITO: Se mudar a filial lá no topo, limpa a busca ou refaz (opcional)
  useEffect(() => {
    // Por padrão, vou apenas limpar os resultados para evitar confusão de dados de filiais diferentes
    setResultados([]);
    setBuscou(false);
    setTotalRegistros(0);
  }, [filial]);

  const mostrarPis =
    apenasPis || (!apenasPis && !apenasCofins) || (apenasPis && apenasCofins);
  const mostrarCofins =
    apenasCofins ||
    (!apenasPis && !apenasCofins) ||
    (apenasPis && apenasCofins);

  const executarBusca = async (pagina: number) => {
    setCarregando(true);
    if (pagina === 1) setResultados([]);

    try {
      const response = await fetch(`${API_BASE_URL}/relatorios/pis-cofins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataInicio,
          dataFim,
          nota,
          apenasPis,
          apenasCofins,
          tipo: tipoMovimento,
          page: pagina,
          limit: LIMITE_POR_PAGINA,
          filial: filial, // 🚀 ENVIANDO A FILIAL PARA O BACKEND
        }),
      });

      const data = await response.json();
      if (response.ok) {
        // 🚀 CORREÇÃO APLICADA: Agrupamento dos resultados para evitar repetição por Item/Nota
        const resultadosAgrupados = data.dados.reduce(
          (acc: any[], current: any) => {
            const key = `${current.nota}-${current.produto}`;

            // Verifica se a combinação Nota + Produto já foi adicionada
            if (!acc.some((item) => `${item.nota}-${item.produto}` === key)) {
              acc.push(current);
            }
            return acc;
          },
          []
        );

        setResultados(resultadosAgrupados); // <--- Usa a lista AGRUPADA para exibição
        setTotalRegistros(data.totalRegistros);
        setPaginaAtual(pagina);
        setBuscou(true);
      } else {
        alert("Erro: " + data.error);
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão.");
    } finally {
      setCarregando(false);
    }
  };

  const handleExportarExcel = async () => {
    setExportando(true);
    try {
      const response = await fetch(`${API_BASE_URL}/relatorios/pis-cofins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataInicio,
          dataFim,
          nota,
          apenasPis,
          apenasCofins,
          tipo: tipoMovimento,
          page: 1,
          limit: 999999,
          filial: filial, // 🚀 ENVIANDO A FILIAL NO EXCEL TAMBÉM
        }),
      });

      const data = await response.json();

      if (response.ok && data.dados) {
        // Garantir que a exportação também use dados únicos (mesma lógica de agrupamento)
        const dadosUnicos = data.dados.reduce((acc: any[], current: any) => {
          const key = `${current.nota}-${current.produto}`;
          if (!acc.some((item) => `${item.nota}-${item.produto}` === key)) {
            acc.push(current);
          }
          return acc;
        }, []);

        const dadosExcel = dadosUnicos.map((r: any) => {
          const linha: any = {
            Filial: filial, // Adicionei no Excel pra ficar claro
            Emissão: r.emissao,
            Nota: r.nota,
            Produto: r.produto,
            Descrição: r.descricao,
            TES: r.tes,
            CFOP: r.cfop,
            "Total Item": r.valorTotal,
          };

          if (mostrarPis) {
            linha["CST PIS"] = r.cstPis;
            linha["Base PIS"] = r.basePIS;
            linha["Aliq PIS"] = r.aliqPIS / 100;
            linha["Valor PIS"] = r.valPIS;
          }

          if (mostrarCofins) {
            linha["CST COFINS"] = r.cstCofins;
            linha["Base COFINS"] = r.baseCOFINS;
            linha["Aliq COFINS"] = r.aliqCOFINS / 100;
            linha["Valor COFINS"] = r.valCOFINS;
          }

          return linha;
        });

        const ws = XLSX.utils.json_to_sheet(dadosExcel);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Relatório PIS COFINS");
        const nomeArquivo = `PisCofins_${filial}_${tipoMovimento.toUpperCase()}.xlsx`;
        XLSX.writeFile(wb, nomeArquivo);
      } else {
        alert("Erro ao baixar dados para exportação.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar Excel.");
    } finally {
      setExportando(false);
    }
  };

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    executarBusca(1);
  };

  const mudarPagina = (novaPagina: number) => {
    const totalPaginas = Math.ceil(totalRegistros / LIMITE_POR_PAGINA);
    if (novaPagina >= 1 && novaPagina <= totalPaginas) {
      executarBusca(novaPagina);
    }
  };

  const totalPaginas = Math.ceil(totalRegistros / LIMITE_POR_PAGINA);
  const fmt = (valor: number) =>
    valor.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const totalBasePIS = resultados.reduce((acc, r) => acc + r.basePIS, 0);
  const totalValPIS = resultados.reduce((acc, r) => acc + r.valPIS, 0);
  const totalBaseCOF = resultados.reduce((acc, r) => acc + r.baseCOFINS, 0);
  const totalValCOF = resultados.reduce((acc, r) => acc + r.valCOFINS, 0);
  const totalItens = resultados.reduce((acc, r) => acc + r.valorTotal, 0);

  return (
    <div className="max-w-[95%] mx-auto space-y-6 animate-fade-in pb-10">
      <div className="flex items-center gap-3">
        <div
          className={`p-3 rounded-xl ${
            tipoMovimento === "saida" ? "bg-blue-100" : "bg-emerald-100"
          }`}
        >
          <DollarSign
            className={`w-8 h-8 ${
              tipoMovimento === "saida" ? "text-blue-600" : "text-emerald-600"
            }`}
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Relatório PIS e COFINS (
            {tipoMovimento === "saida" ? "Saídas SD2" : "Entradas SD1"})
          </h1>
          <p className="text-slate-500 flex items-center gap-2">
            Análise detalhada -{" "}
            <span className="font-bold text-slate-700 bg-slate-100 px-2 rounded">
              Filial {filial}
            </span>
          </p>
        </div>
      </div>

      <form
        onSubmit={handleBuscar}
        className="bg-white p-6 rounded-xl shadow-sm border border-slate-200"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-12 flex gap-4 mb-2 p-2 bg-slate-50 rounded-lg w-fit border border-slate-100">
            <button
              type="button"
              onClick={() => setTipoMovimento("saida")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
                tipoMovimento === "saida"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-500 hover:bg-slate-200"
              }`}
            >
              <ArrowUpCircle className="w-4 h-4" /> Saídas (SD2)
            </button>
            <button
              type="button"
              onClick={() => setTipoMovimento("entrada")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
                tipoMovimento === "entrada"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-slate-500 hover:bg-slate-200"
              }`}
            >
              <ArrowDownCircle className="w-4 h-4" /> Entradas (SD1)
            </button>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Data Início
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Data Fim
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nota (Opcional)
            </label>
            <input
              type="text"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ex: 000553167"
              className="w-full border rounded-lg p-2 text-sm"
            />
          </div>

          <div className="md:col-span-4 flex gap-4 px-4 py-2 bg-slate-50 rounded-lg border border-slate-100 h-[42px] items-center">
            <span className="text-sm font-semibold text-slate-500 flex items-center gap-1">
              <Filter className="w-4 h-4" /> Filtrar:
            </span>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={apenasPis}
                onChange={(e) => setApenasPis(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-slate-700">Somente com PIS</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={apenasCofins}
                onChange={(e) => setApenasCofins(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-slate-700">Somente com COFINS</span>
            </label>
          </div>

          <div className="md:col-span-2">
            <button
              disabled={carregando}
              className={`w-full text-white p-2 rounded-lg flex justify-center items-center gap-2 font-medium h-[42px] transition-colors ${
                tipoMovimento === "saida"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
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
      </form>

      {buscou && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
            <div className="flex flex-col">
              <span className="font-bold text-slate-700">
                Total: {totalRegistros}
              </span>
              <span className="text-xs text-slate-500">
                Página {paginaAtual} de {totalPaginas || 1}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleExportarExcel}
                disabled={exportando || totalRegistros === 0}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                {exportando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}{" "}
                Exportar Completo
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3 border-r border-slate-200">Emissão</th>
                  <th className="p-3 border-r border-slate-200">Nota</th>
                  <th className="p-3 border-r border-slate-200">Produto</th>
                  <th className="p-3 border-r border-slate-200 w-16">TES</th>
                  <th className="p-3 border-r border-slate-200 w-16">CFOP</th>
                  <th className="p-3 text-right bg-slate-200 border-r border-white">
                    Total Item
                  </th>
                  {mostrarPis && (
                    <>
                      <th className="p-3 text-center bg-blue-50 border-r border-blue-100">
                        CST
                      </th>
                      <th className="p-3 text-right bg-blue-50 border-r border-blue-100">
                        Base COF
                      </th>
                      <th className="p-3 text-right bg-blue-50 border-r border-blue-100">
                        %
                      </th>
                      <th className="p-3 text-right bg-blue-100 border-r border-white text-blue-900">
                        Val COF
                      </th>
                    </>
                  )}
                  {mostrarCofins && (
                    <>
                      <th className="p-3 text-center bg-indigo-50 border-r border-indigo-100">
                        CST
                      </th>
                      <th className="p-3 text-right bg-indigo-50 border-r border-indigo-100">
                        Base PIS
                      </th>
                      <th className="p-3 text-right bg-indigo-50 border-r border-indigo-100">
                        %
                      </th>
                      <th className="p-3 text-right bg-indigo-100 text-indigo-900">
                        Val PIS
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {carregando && resultados.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="p-8 text-center text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />{" "}
                      Carregando...
                    </td>
                  </tr>
                ) : (
                  resultados.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 whitespace-nowrap">{r.emissao}</td>
                      <td className="p-3 font-medium">{r.nota}</td>
                      <td
                        className="p-3 truncate max-w-[200px]"
                        title={r.descricao}
                      >
                        <span className="font-mono text-slate-500 mr-2 font-bold text-[10px]">
                          {r.produto}
                        </span>
                        {r.descricao}
                      </td>
                      <td className="p-3 text-center">{r.tes}</td>
                      <td className="p-3 text-center">{r.cfop}</td>
                      <td className="p-3 text-right bg-slate-50 font-medium border-l border-slate-200">
                        {fmt(r.valorTotal)}
                      </td>
                      {mostrarPis && (
                        <>
                          <td className="p-3 text-center border-l border-slate-200 text-slate-500 font-mono text-[10px]">
                            {r.cstPis}
                          </td>
                          <td className="p-3 text-right text-slate-600">
                            {fmt(r.basePIS)}
                          </td>
                          <td className="p-3 text-right text-slate-400">
                            {r.aliqPIS}%
                          </td>
                          <td className="p-3 text-right font-bold text-blue-700 bg-blue-50/30">
                            {fmt(r.valPIS)}
                          </td>
                        </>
                      )}
                      {mostrarCofins && (
                        <>
                          <td className="p-3 text-center border-l border-slate-200 text-slate-500 font-mono text-[10px]">
                            {r.cstCofins}
                          </td>
                          <td className="p-3 text-right text-slate-600">
                            {fmt(r.baseCOFINS)}
                          </td>
                          <td className="p-3 text-right text-slate-400">
                            {r.aliqCOFINS}%
                          </td>
                          <td className="p-3 text-right font-bold text-indigo-700 bg-indigo-50/30">
                            {fmt(r.valCOFINS)}
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-800 text-white font-bold text-xs uppercase">
                <tr>
                  <td colSpan={5} className="p-3 text-right">
                    Totais:
                  </td>
                  <td className="p-3 text-right bg-slate-700">
                    {fmt(totalItens)}
                  </td>
                  {mostrarPis && (
                    <>
                      <td className="p-3 bg-slate-700"></td>
                      <td className="p-3 text-right bg-slate-700 text-blue-200">
                        {fmt(totalBasePIS)}
                      </td>
                      <td className="p-3 text-right bg-slate-700">-</td>
                      <td className="p-3 text-right bg-blue-900 text-white border-t-4 border-blue-500">
                        {fmt(totalValPIS)}
                      </td>
                    </>
                  )}
                  {mostrarCofins && (
                    <>
                      <td className="p-3 bg-slate-700"></td>
                      <td className="p-3 text-right bg-slate-700 text-indigo-200">
                        {fmt(totalBaseCOF)}
                      </td>
                      <td className="p-3 text-right bg-slate-700">-</td>
                      <td className="p-3 text-right bg-indigo-900 text-white border-t-4 border-indigo-500">
                        {fmt(totalValCOF)}
                      </td>
                    </>
                  )}
                </tr>
              </tfoot>
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
    </div>
  );
};
