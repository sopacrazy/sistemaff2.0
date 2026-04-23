import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tooltip as MuiTooltip } from "@mui/material";
import Swal from "sweetalert2";
import axios from "axios";
import { getDataTrabalho } from "../utils/dataTrabalho";
import dayjs from "dayjs";

import { API_BASE_URL } from "../utils/apiConfig";
const API_URL = API_BASE_URL;

// Componente de Tooltip
const Tooltip = ({ title, children }) => (
  <MuiTooltip title={title} arrow>
    {children}
  </MuiTooltip>
);

// Função para converter data YYYY-MM-DD para DD/MM/YYYY
const formatDateToBR = (dateStr) => {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
};

// Função para converter data DD/MM/YYYY para YYYY-MM-DD
const formatDateToUS = (dateStr) => {
  if (!dateStr) return "";
  const [day, month, year] = dateStr.split("/");
  return `${year}-${month}-${day}`;
};

const RelatoriosPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const usuario =
    sessionStorage.getItem("username") ||
    localStorage.getItem("username") ||
    "admin";
  const local =
    sessionStorage.getItem("origem") || localStorage.getItem("origem") || "01";

  // Estados de data
  const dataHoje = getDataTrabalho();
  const [dataRel, setDataRel] = useState(dataHoje);
  const [dataInicioExcel, setDataInicioExcel] = useState(dataHoje);
  const [dataFimExcel, setDataFimExcel] = useState(dataHoje);

  // Mapeamento de locais
  const locaisMap = {
    "01": "Loja",
    "02": "Depósito",
    "03": "B.T.F",
    "04": "Depósito da Banana",
    "05": "Depósito do Ovo",
    "06": "Passarela 02 (torres)",
    "07": "Centro de Distribuição (C.D)",
    "08": "Varejinho",
    "09": "Passarela 01",
  };
  const localLabel = locaisMap[local] || local;

  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.clear();
    navigate("/login");
  };

  // ========== RELATÓRIOS DISPONÍVEIS ==========
  const relatoriosDisponiveis = [
    {
      id: "faltas",
      title: "Relatório de Faltas",
      description: "Lista produtos com falta para a data/local",
      icon: "article",
      color: "blue",
    },
    {
      id: "faltasProduto",
      title: "Faltas por Produto",
      description: "Detalha faltas produto × local",
      icon: "description",
      color: "indigo",
    },
    {
      id: "avarias",
      title: "Relatório de Avarias",
      description: "Lista itens avariados no período",
      icon: "warning_amber",
      color: "orange",
    },
  ];

  // ========== AÇÕES ADICIONAIS ==========
  const acoesAdicionais = [
    {
      id: "faltasExcel",
      title: "Relatório Faltas FF (Excel)",
      description: "Exportar faltas por período em Excel",
      icon: "table_chart",
      color: "green",
    },
  ];

  // ========== ABRIR DIÁLOGO DE PARÂMETROS ==========
  const abrirDialogParams = async (report) => {
    const result = await Swal.fire({
      title: report.title,
      html: `
        <div class="space-y-4 text-left">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Data</label>
            <input type="text" id="swal-data-display" value="${formatDateToBR(
              dataRel
            )}" placeholder="DD/MM/AAAA" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Local</label>
            <select id="swal-local" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900">
              <option value="01" ${
                local === "01" ? "selected" : ""
              }>01 - Loja</option>
              <option value="02" ${
                local === "02" ? "selected" : ""
              }>02 - Depósito</option>
              <option value="03" ${
                local === "03" ? "selected" : ""
              }>03 - B.T.F</option>
              <option value="04" ${
                local === "04" ? "selected" : ""
              }>04 - Depósito da Banana</option>
              <option value="05" ${
                local === "05" ? "selected" : ""
              }>05 - Depósito do Ovo</option>
              <option value="06" ${
                local === "06" ? "selected" : ""
              }>06 - Passarela 02 (torres)</option>
              <option value="07" ${
                local === "07" ? "selected" : ""
              }>07 - Centro de Distribuição (C.D)</option>
              <option value="08" ${
                local === "08" ? "selected" : ""
              }>08 - Varejinho</option>
              <option value="09" ${
                local === "09" ? "selected" : ""
              }>09 - Passarela 01</option>
            </select>
          </div>
          ${
            report.id === "faltas"
              ? `
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de Relatório</label>
            <select id="swal-tipo" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900">
              <option value="padrao">Padrão</option>
              <option value="compras">Compras (Falta × Compra = Total)</option>
            </select>
          </div>
          `
              : ""
          }
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Gerar PDF",
      cancelButtonText: "Cancelar",
      customClass: {
        popup: "rounded-2xl",
        confirmButton:
          "bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg",
        cancelButton:
          "bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-lg",
      },
      didOpen: () => {
        const inputData = document.getElementById("swal-data-display");
        inputData.addEventListener("input", (e) => {
          let value = e.target.value.replace(/\D/g, "");
          if (value.length >= 2) {
            value = value.substring(0, 2) + "/" + value.substring(2);
          }
          if (value.length >= 5) {
            value = value.substring(0, 5) + "/" + value.substring(5, 9);
          }
          e.target.value = value;
        });
      },
      preConfirm: () => {
        const dataDisplay = document.getElementById("swal-data-display").value;
        const localSelecionado = document.getElementById("swal-local").value;
        const tipo = document.getElementById("swal-tipo")?.value || "padrao";

        const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        if (!dateRegex.test(dataDisplay)) {
          Swal.showValidationMessage("Data inválida! Use o formato DD/MM/AAAA");
          return false;
        }

        const dataUS = formatDateToUS(dataDisplay);
        return { data: dataUS, local: localSelecionado, tipo };
      },
    });

    if (result.isConfirmed) {
      gerarRelatorio(
        report.id,
        result.value.data,
        result.value.local,
        result.value.tipo
      );
    }
  };

  // ========== ABRIR DIÁLOGO EXCEL FALTAS FF ==========
  const abrirDialogExcelFaltasFF = async () => {
    const result = await Swal.fire({
      title: "Relatório Faltas FF (Excel)",
      html: `
        <div class="space-y-4 text-left">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Data Início</label>
            <input type="text" id="swal-data-inicio-excel" value="${formatDateToBR(
              dataInicioExcel
            )}" placeholder="DD/MM/AAAA" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Data Fim</label>
            <input type="text" id="swal-data-fim-excel" value="${formatDateToBR(
              dataFimExcel
            )}" placeholder="DD/MM/AAAA" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Gerar Excel",
      cancelButtonText: "Cancelar",
      customClass: {
        popup: "rounded-2xl",
        confirmButton:
          "bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg",
        cancelButton:
          "bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-lg",
      },
      didOpen: () => {
        const inputInicio = document.getElementById("swal-data-inicio-excel");
        const inputFim = document.getElementById("swal-data-fim-excel");

        [inputInicio, inputFim].forEach((input) => {
          input.addEventListener("input", (e) => {
            let value = e.target.value.replace(/\D/g, "");
            if (value.length >= 2) {
              value = value.substring(0, 2) + "/" + value.substring(2);
            }
            if (value.length >= 5) {
              value = value.substring(0, 5) + "/" + value.substring(5, 9);
            }
            e.target.value = value;
          });
        });
      },
      preConfirm: () => {
        const dataInicioDisplay = document.getElementById(
          "swal-data-inicio-excel"
        ).value;
        const dataFimDisplay = document.getElementById(
          "swal-data-fim-excel"
        ).value;

        const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        if (
          !dateRegex.test(dataInicioDisplay) ||
          !dateRegex.test(dataFimDisplay)
        ) {
          Swal.showValidationMessage("Data inválida! Use o formato DD/MM/AAAA");
          return false;
        }

        const dataInicio = formatDateToUS(dataInicioDisplay);
        const dataFim = formatDateToUS(dataFimDisplay);

        return { dataInicio, dataFim };
      },
    });

    if (result.isConfirmed) {
      gerarExcelFaltasFF(result.value.dataInicio, result.value.dataFim);
    }
  };

  // ========== GERAR EXCEL FALTAS FF ==========
  const gerarExcelFaltasFF = async (startDate, endDate) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/ocorrencias/excel-faltas-ff`,
        {
          params: { startDate, endDate },
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `relatorio_faltas_ff_${startDate}_${endDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      Swal.fire({
        icon: "success",
        title: "Excel Gerado!",
        text: "Download iniciado.",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Erro ao gerar Excel:", error);
      Swal.fire({
        icon: "error",
        title: "Erro",
        text: "Erro ao gerar relatório Excel",
      });
    } finally {
      setLoading(false);
    }
  };

  // ========== GERAR RELATÓRIO ==========
  const gerarRelatorio = async (
    tipo,
    data,
    localParam,
    tipoRelatorio = "padrao"
  ) => {
    setLoading(true);
    try {
      let endpoint = "";
      const params = { data, local: localParam };

      if (tipo === "faltas") {
        endpoint = "/relatorios-public/faltas/pdf";
        params.tipo = tipoRelatorio; // Adiciona o tipo (padrao ou compras)
      } else if (tipo === "faltasProduto") {
        endpoint = "/relatorios-public/faltas-mov/pdf";
      } else if (tipo === "avarias") {
        endpoint = "/relatorios-public/avarias/pdf";
      }

      const response = await axios.get(`${API_URL}${endpoint}`, {
        params,
        responseType: "blob",
        timeout: 300000, // 5 minutos (300000ms) - timeout aumentado para relatórios grandes
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");

      Swal.fire({
        icon: "success",
        title: "Relatório Gerado!",
        text: "PDF aberto em nova aba.",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      Swal.fire({
        icon: "error",
        title: "Erro",
        text:
          error.response?.data?.error ||
          error.response?.data?.message ||
          "Erro ao gerar relatório",
      });
    } finally {
      setLoading(false);
    }
  };

  // ========== HANDLERS ==========
  const handleAcao = (acaoId) => {
    if (acaoId === "faltasExcel") {
      abrirDialogExcelFaltasFF();
      return;
    }

    const acao = acoesAdicionais.find((a) => a.id === acaoId);
    if (acao?.action) {
      acao.action();
    }
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: "from-blue-600 to-blue-400 shadow-blue-600/20",
      indigo: "from-indigo-600 to-indigo-400 shadow-indigo-600/20",
      orange: "from-orange-600 to-orange-400 shadow-orange-600/20",
      green: "from-green-600 to-green-400 shadow-green-600/20",
      purple: "from-purple-600 to-purple-400 shadow-purple-600/20",
      red: "from-red-600 to-red-400 shadow-red-600/20",
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">
      {/* Background Ambient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-green-400/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
      </div>

      {/* Header Glassmorphic */}
      <header className="sticky top-0 z-50 px-4 md:px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-slate-700/50 px-6 py-3 flex items-center justify-between">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate("/estoque")}
            >
              <div className="bg-gradient-to-tr from-green-600 to-emerald-400 h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-600/20">
                <span className="font-bold text-xl italic tracking-tighter">
                  SF
                </span>
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight text-slate-800 dark:text-white">
                  Relatórios
                </h1>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  Estoque
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              {/* Data Only-Read */}
              <Tooltip title="Alterar data na Home">
                <div className="hidden md:flex items-center gap-2 mr-2 bg-transparent px-3 py-2 rounded-xl group border border-transparent">
                  <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-1.5 rounded-lg">
                    <span className="material-symbols-rounded text-lg">
                      calendar_today
                    </span>
                  </div>
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Data
                    </span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {dataHoje
                        ? dayjs(dataHoje).add(12, "hour").format("DD/MM/YYYY")
                        : dayjs().format("DD/MM/YYYY")}
                    </span>
                  </div>
                </div>
              </Tooltip>

              <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 hidden md:block"></div>

              {/* User Info */}
              <div className="flex items-center gap-2">
                <div className="bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 p-1.5 rounded-lg">
                  <span className="material-symbols-rounded text-lg">
                    person
                  </span>
                </div>
                <div className="hidden md:flex flex-col items-start leading-none">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {usuario}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Local:
                    </span>
                    <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase">
                      {local}
                    </span>
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <Tooltip title="Sair">
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <span className="material-symbols-rounded">logout</span>
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-4 md:px-6 pb-8">
        <div className="max-w-7xl mx-auto">
          {/* Relatórios Disponíveis */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">
              Relatórios disponíveis
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatoriosDisponiveis.map((report) => (
                <div
                  key={report.id}
                  onClick={() => abrirDialogParams(report)}
                  className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-slate-700/50 p-6 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`bg-gradient-to-tr ${getColorClasses(
                        report.color
                      )} h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0`}
                    >
                      <span className="material-symbols-rounded text-2xl">
                        {report.icon}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                        {report.title}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {report.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Ações Adicionais */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">
              Ações Adicionais
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {acoesAdicionais.map((acao) => (
                <div
                  key={acao.id}
                  onClick={() => handleAcao(acao.id)}
                  className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-slate-700/50 p-6 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`bg-gradient-to-tr ${getColorClasses(
                        acao.color
                      )} h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0`}
                    >
                      <span className="material-symbols-rounded text-2xl">
                        {acao.icon}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                        {acao.title}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {acao.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-2xl text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
            <p className="text-lg font-semibold text-slate-800 dark:text-white">
              Gerando relatório...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RelatoriosPage;
