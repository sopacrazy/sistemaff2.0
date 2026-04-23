import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx"; // Importação necessária para o Excel
import {
  FileWarning,
  Search,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Download,
} from "lucide-react";

const API_BASE_URL = "http://192.168.10.49:4001/api";

interface NotaFaltante {
  numero: number;
  serie: string;
  status: string;
  intervalo: string;
}

// 🚀 Interface para receber a filial do App.tsx
interface Props {
  filial: string;
}

export const RelatorioNotasFaltantes: React.FC<Props> = ({ filial }) => {
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [serie, setSerie] = useState("1"); // Padrão 1

  const [resultados, setResultados] = useState<NotaFaltante[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [buscou, setBuscou] = useState(false);

  // 🚀 EFEITO: Limpa os resultados se trocar a filial
  useEffect(() => {
    setResultados([]);
    setBuscou(false);
  }, [filial]);

  const buscarNotasFaltantes = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setBuscou(false);
    setResultados([]);

    try {
      const response = await fetch(
        `${API_BASE_URL}/relatorios/notas-faltantes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // 🚀 ENVIANDO A FILIAL NO BODY
          body: JSON.stringify({ dataInicio, dataFim, serie, filial }),
        }
      );

      if (!response.ok) throw new Error("Erro ao buscar dados");

      const data = await response.json();
      setResultados(data);
      setBuscou(true);
    } catch (error) {
      console.error(error);
      alert("Erro ao processar sequência.");
    } finally {
      setCarregando(false);
    }
  };

  // --- FUNÇÃO DE EXPORTAR PARA EXCEL ---
  const exportarParaExcel = () => {
    if (resultados.length === 0) return;

    // Formata os dados para ficarem bonitos no Excel
    const dadosFormatados = resultados.map((item) => ({
      Filial: filial, // Adicionei a filial no Excel
      "Nota Faltante": item.numero.toString().padStart(9, "0"),
      Série: item.serie,
      "Intervalo Detectado": item.intervalo,
      "Status Sugerido": item.status,
    }));

    // Cria a planilha e o arquivo
    const worksheet = XLSX.utils.json_to_sheet(dadosFormatados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Notas Faltantes");

    // Gera o arquivo com nome dinâmico (incluindo as datas e filial)
    XLSX.writeFile(
      workbook,
      `Gaps_Notas_F${filial}_${dataInicio}_ate_${dataFim}.xlsx`
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-orange-100 rounded-xl">
          <FileWarning className="w-8 h-8 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Relatório de Notas Faltantes
          </h1>
          <p className="text-slate-500 flex items-center gap-2">
            Identifique falhas na sequência (SF2) -{" "}
            <span className="font-bold text-slate-700 bg-slate-100 px-2 rounded">
              Filial {filial}
            </span>
          </p>
        </div>
      </div>

      {/* Filtros */}
      <form
        onSubmit={buscarNotasFaltantes}
        className="bg-white p-6 rounded-xl shadow-sm border border-slate-200"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Data Início
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-700 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Data Fim
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-700 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Série
            </label>
            <input
              type="text"
              value={serie}
              onChange={(e) => setSerie(e.target.value)}
              maxLength={3}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-700 uppercase focus:ring-orange-500 focus:border-orange-500"
              placeholder="Ex: 1"
            />
          </div>
          <button
            type="submit"
            disabled={carregando}
            className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {carregando ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            Verificar Sequência
          </button>
        </div>
      </form>

      {/* Resultados */}
      {buscou && (
        <div className="space-y-4">
          {resultados.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-green-800">
                Sequência Perfeita!
              </h3>
              <p className="text-green-600">
                Nenhuma nota foi pulada no período selecionado para a série{" "}
                {serie} na filial {filial}.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 bg-orange-50 border-b border-orange-100 flex justify-between items-center">
                <h3 className="font-bold text-orange-800 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Foram encontradas {resultados.length} notas puladas
                </h3>

                {/* BOTÃO EXCEL */}
                <button
                  onClick={exportarParaExcel}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Exportar Excel
                </button>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Nota Faltante</th>
                    <th className="px-6 py-3">Série</th>
                    <th className="px-6 py-3">Detectado no Intervalo</th>
                    <th className="px-6 py-3">Status Sugerido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resultados.map((item, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-orange-50/30 transition-colors"
                    >
                      <td className="px-6 py-3 font-mono font-bold text-red-600 text-base">
                        {item.numero.toString().padStart(9, "0")}
                      </td>
                      <td className="px-6 py-3 text-slate-700">{item.serie}</td>
                      <td className="px-6 py-3 text-slate-500 flex items-center gap-2">
                        {item.intervalo}
                      </td>
                      <td className="px-6 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
