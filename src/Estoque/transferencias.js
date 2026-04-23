
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  TextField,
  Snackbar,
  Button,
  Alert as MuiAlert,
  Tooltip as MuiTooltip
} from "@mui/material";
import { getDataTrabalho } from "../utils/dataTrabalho";
import dayjs from "dayjs";
import { API_BASE_URL } from '../utils/apiConfig';

// Componente de Tooltip Simples
const Tooltip = ({ title, children }) => (
  <MuiTooltip title={title} arrow>
    {children}
  </MuiTooltip>
);

// Componente Modal Moderno
const Modal = ({ isOpen, onClose, title, children, maxWidth = "md" }) => {
  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
    "2xl": "max-w-7xl",
    "full": "max-w-full mx-4"
  };

  return (
    <React.Fragment>
      <div
        className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto pointer-events-none">
        <div
          className={`bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full ${maxWidthClasses[maxWidth]} overflow-hidden animate-in zoom-in-95 duration-300 pointer-events-auto flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-700`}
        >
          {/* Header */}
          <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white/50 dark:bg-slate-800/50 backdrop-blur-md sticky top-0 z-10">
            <h3 className="font-bold text-xl text-slate-800 dark:text-white flex items-center gap-2">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 group"
            >
              <span className="material-symbols-rounded group-hover:rotate-90 transition-transform">close</span>
            </button>
          </div>

          {/* Content */}
          <div className="p-8 overflow-y-auto text-slate-600 dark:text-slate-300 custom-scrollbar">
            {children}
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

const Transferencias = () => {
  const navigate = useNavigate();
  // Auth & Session
  const username = sessionStorage.getItem("username") || "sistema";
  const userRole = sessionStorage.getItem("role");
  const [origemUsuario, setOrigemUsuario] = useState(sessionStorage.getItem("local") || "08");

  // Data Global
  const dataTrabalho = getDataTrabalho();

  // Estados de Interface
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [isLoading, setIsLoading] = useState(false);

  // Estados de Dados e Filtros
  const [transferencias, setTransferencias] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

  // Modais de Visualização e Logs (Mantidos)
  const [modalVisualizarOpen, setModalVisualizarOpen] = useState(false);
  const [modalLogsOpen, setModalLogsOpen] = useState(false);

  // Dialogs de Confirmação
  const [confirmOpen, setConfirmOpen] = useState(false); // Reabrir
  const [confirmarRecusaOpen, setConfirmarRecusaOpen] = useState(false);

  // Dados Selecionados
  const [transferenciaSelecionada, setTransferenciaSelecionada] = useState(null);
  const [transferenciaParaReabrir, setTransferenciaParaReabrir] = useState(null);
  const [transferenciaParaRecusar, setTransferenciaParaRecusar] = useState(null);
  const [logsTransferencia, setLogsTransferencia] = useState([]);
  const [motivoRecusa, setMotivoRecusa] = useState("");

  // Estados de Fechamento
  const [fechamentoRealizado, setFechamentoRealizado] = useState(false);
  const [preFechamentoRealizado, setPreFechamentoRealizado] = useState(false);

  // Mapeamentos
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

  const showSnackbar = (message, severity = "success") => {
    setSnackbarMsg(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  // --- Efeitos ---

  // Buscar transferências
  useEffect(() => {
    setIsLoading(true);
    axios
      .get(`${API_BASE_URL}/transferencias`, {
        params: { data: dataTrabalho },
      })
      .then((res) => {
        setTransferencias(res.data);
      })
      .catch((err) => {
        console.error("Erro ao buscar transferências:", err);
        showSnackbar("Erro ao carregar dados.", "error");
      })
      .finally(() => setIsLoading(false));
  }, [dataTrabalho]);

  // Buscar origem atualizada do usuário
  useEffect(() => {
    if (!username) return;
    axios
      .get(`${API_BASE_URL}/usuarios/origem/${username}`)
      .then((res) => {
        const origem = res.data.origem || "";
        setOrigemUsuario(origem);
        sessionStorage.setItem("local", origem);
      })
      .catch((err) => console.error("Erro ao buscar origem:", err));
  }, [username]);

  useEffect(() => {
    if (!origemUsuario || !dataTrabalho) return;
    
    // Verificar fechamento
    axios.post(`${API_BASE_URL}/saldos/fechados`, {
      data: dataTrabalho,
      local: origemUsuario
    })
    .then(res => setFechamentoRealizado(res.data?.fechado || false))
    .catch(err => console.error("Erro ao verificar fechamento:", err));

    // Verificar pré-fechamento
    axios.get(`${API_BASE_URL}/pre-fechamento`, {
      params: { data: dataTrabalho, local: origemUsuario }
    })
    .then(res => setPreFechamentoRealizado(res.data?.existe || false))
    .catch(err => console.error("Erro ao verificar pré-fechamento:", err));
  }, [dataTrabalho, origemUsuario]);

  // --- Helpers e Funções de Lógica ---

  const normalizeDate = (date, inputFormat = "DD/MM/YYYY", outputFormat = "YYYY-MM-DD") => {
    if (!date) return "";
    try {
      if (inputFormat === "DD/MM/YYYY" && outputFormat === "YYYY-MM-DD") {
        const [day, month, year] = date.split("/");
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
      return date;
    } catch (e) { return date; }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "pendente": return "bg-amber-100 text-amber-700 border-amber-200";
      case "concluido": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "recusado": return "bg-red-100 text-red-700 border-red-200";
      case "recusado (p)": return "bg-orange-100 text-orange-700 border-orange-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const abrirLogsTransferencia = async (numero) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/transferencias/${numero}/logs`);
      setLogsTransferencia(res.data);
      setModalLogsOpen(true);
    } catch {
      showSnackbar("Erro ao buscar logs.", "error");
    }
  };

  const imprimirTransferencia = async (payload) => {
    try {
      // Tenta agente local primeiro (máquina do usuário)
      await axios.get("http://localhost:3005/ping", { timeout: 1500 });
      await axios.post("http://localhost:3005/imprimir-transferencia-termica", payload, { timeout: 8000 });
      showSnackbar("✅ Impressão enviada (Local).", "success");
    } catch (e1) {
      console.warn("Agente local indisponível, tentando servidor...", e1?.message);
      try {
        // Fallback para servidor central
        await axios.post(`${API_BASE_URL}/imprimir-transferencia-termica`, payload);
        showSnackbar("✅ Impressão enviada (Servidor).", "success");
      } catch (e2) {
        console.error("Falha na impressão:", e2);
        showSnackbar("❌ Erro na impressão.", "error");
      }
    }
  };

  const handleLogout = () => { sessionStorage.clear(); navigate("/login"); };

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">

      {/* Background Ambient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-green-400/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
      </div>

      {/* Header Glassmorphic */}
      <header className="sticky top-0 z-50 px-4 py-4">
        <div className="w-full max-w-[98vw] mx-auto">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-slate-700/50 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/estoque")}>
              <div className="bg-gradient-to-tr from-green-600 to-emerald-400 h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-600/20">
                <span className="font-bold text-xl italic tracking-tighter">SF</span>
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight text-slate-800 dark:text-white">Transferências</h1>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Estoque</span>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              {/* Data Only-Read */}
              <Tooltip title="Alterar data na Home">
                <div className="hidden md:flex items-center gap-2 mr-2 bg-transparent px-3 py-2 rounded-xl group border border-transparent">
                  <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-1.5 rounded-lg">
                    <span className="material-symbols-rounded text-lg">calendar_today</span>
                  </div>
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {dataTrabalho ? dayjs(dataTrabalho).add(12, 'hour').format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY')}
                    </span>
                  </div>
                </div>
              </Tooltip>

              <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 hidden md:block"></div>

              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-bold text-slate-800 dark:text-white">{username}</span>
                  <div className="text-[10px] font-bold text-white bg-slate-800 dark:bg-slate-600 px-2 py-0.5 rounded flex items-center gap-1">
                    LOCAL: {origemUsuario} <span className="material-symbols-rounded text-[10px]">location_on</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 border-2 border-white dark:border-slate-600 flex items-center justify-center shadow-sm">
                  <span className="material-symbols-rounded text-slate-500 dark:text-slate-300">person</span>
                </div>
              </div>

              <button onClick={handleLogout} className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-all border border-transparent hover:border-red-200 dark:hover:border-red-800">
                <span className="material-symbols-rounded text-xl">logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-[98vw] mx-auto px-4 py-8 relative z-10">

        {/* Banner de Bloqueio */}
        {(fechamentoRealizado || preFechamentoRealizado) && (
          <div className="mb-6 w-full bg-red-600 text-white text-center py-3 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-3 animate-pulse border-2 border-red-400">
            <span className="material-symbols-rounded text-2xl">lock</span>
            <span className="text-lg uppercase tracking-wider">Rotina Bloqueada - Estoque Fechado</span>
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 animate-in slide-in-from-bottom-5 duration-500">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button onClick={() => navigate("/estoque")} className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white shadow-sm hover:shadow-md transition-all">
              <span className="material-symbols-rounded text-2xl">arrow_back</span>
            </button>

            {/* Filter Group */}
            <div className="flex p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto no-scrollbar hidden-scrollbar">
              {["", "Pendente", "Recusado (P)", "Concluido", "Recusado"].map((st) => (
                <button
                  key={st}
                  onClick={() => setFiltroStatus(st)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${filtroStatus === st
                    ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                    }`}
                >
                  {st === "" ? "TODOS" : st === "Recusado (P)" ? "PENDENTE (P)" : st.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="flex p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              {["", "entrada", "saida"].map((tp) => (
                <button
                  key={tp}
                  onClick={() => setFiltroTipo(tp)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filtroTipo === tp
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                    }`}
                >
                  {tp === "" ? "TIPO: GERAL" : tp.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <button
              onClick={() => navigate("/transferencias/nova")}
              disabled={fechamentoRealizado || preFechamentoRealizado}
              className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-md shadow-green-600/20 flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-rounded text-lg">add_circle</span>
              Nova Transferência
            </button>
          </div>
        </div>

        {/* Tabela Modernizada */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-500">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-700/30 border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider text-slate-500 font-bold">
                  <th className="px-6 py-4">Nº</th>
                  <th className="px-6 py-4 text-center">Tipo</th>
                  <th className="px-6 py-4">Origem / Destino</th>
                  <th className="px-6 py-4">Data Inclusão</th>
                  <th className="px-6 py-4">Carregador</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {isLoading ? (
                  <tr><td colSpan="7" className="p-8 text-center text-slate-500">Carregando...</td></tr>
                ) : transferencias.filter(transf => {
                  const pertence = transf.origem === origemUsuario || transf.destino === origemUsuario;
                  const statusMatch = filtroStatus === "" || transf.status.toLowerCase() === filtroStatus.toLowerCase();
                  const tipoMatch = filtroTipo === "" || (filtroTipo === "entrada" && transf.destino === origemUsuario) || (filtroTipo === "saida" && transf.origem === origemUsuario);
                  const dataMatch = normalizeDate(transf.data) === dataTrabalho;
                  return pertence && statusMatch && tipoMatch && dataMatch;
                }).length === 0 ? (
                  <tr><td colSpan="7" className="p-8 text-center text-slate-500">Nenhuma transferência encontrada.</td></tr>
                ) : (
                  transferencias.filter(transf => {
                    const pertence = transf.origem === origemUsuario || transf.destino === origemUsuario;
                    const statusMatch = filtroStatus === "" || transf.status.toLowerCase() === filtroStatus.toLowerCase();
                    const tipoMatch = filtroTipo === "" || (filtroTipo === "entrada" && transf.destino === origemUsuario) || (filtroTipo === "saida" && transf.origem === origemUsuario);
                    const dataMatch = normalizeDate(transf.data) === dataTrabalho;
                    return pertence && statusMatch && tipoMatch && dataMatch;
                  })
                    .sort((a, b) => new Date(`${b.data} ${b.hora}`) - new Date(`${a.data} ${a.hora}`))
                    .map((transf) => {
                      const isSaida = transf.origem === origemUsuario;
                      return (
                        <tr key={transf.numero} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                          <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">#{transf.numero}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase border ${isSaida ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                              {isSaida ? 'Saída 📤' : 'Entrada 📥'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex flex-col">
                              <span className="text-slate-500 text-xs">DE: <b className="text-slate-700 dark:text-slate-300">{locaisMap[transf.origem]}</b></span>
                              <span className="text-slate-500 text-xs">PARA: <b className="text-slate-700 dark:text-slate-300">{locaisMap[transf.destino]}</b></span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                            {transf.data} <span className="text-xs opacity-70">às {transf.hora}</span>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium">{transf.carregador}</td>
                          <td className="px-6 py-4 text-center">
                            <span
                              onClick={() => { setTransferenciaSelecionada(transf); setModalVisualizarOpen(true); }}
                              className={`px-3 py-1 rounded-full text-xs font-bold border cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(transf.status)}`}
                            >
                              {transf.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 text-slate-400">
                              <Tooltip title="Visualizar">
                                <button onClick={() => { setTransferenciaSelecionada(transf); setModalVisualizarOpen(true); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg hover:text-blue-600 transition-colors">
                                  <span className="material-symbols-rounded">visibility</span>
                                </button>
                              </Tooltip>
                              <Tooltip title="Imprimir">
                                <button
                                  onClick={async () => {
                                    const res = await axios.get(`${API_BASE_URL}/transferencias/${transf.numero}/itens`);
                                    imprimirTransferencia({
                                      numero: transf.numero, origem: transf.origem, destino: transf.destino, carregador: transf.carregador,
                                      produtos: res.data, data_inclusao: dataTrabalho, hora: new Date().toLocaleTimeString(), usuario: transf.usuario
                                    });
                                  }}
                                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg hover:text-purple-600 transition-colors"
                                >
                                  <span className="material-symbols-rounded">print</span>
                                </button>
                              </Tooltip>

                              {transf.status.toLowerCase() === "concluido" && userRole === "gestor" && (
                                <Tooltip title="Reabrir">
                                  <button
                                    onClick={() => { setTransferenciaParaReabrir(transf); setConfirmOpen(true); }}
                                    className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg text-amber-500 hover:text-amber-600 transition-colors"
                                  >
                                    <span className="material-symbols-rounded">lock_open</span>
                                  </button>
                                </Tooltip>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Visualizar */}
      <Modal isOpen={modalVisualizarOpen} onClose={() => setModalVisualizarOpen(false)} title="Detalhes da Transferência" maxWidth="lg">
        {transferenciaSelecionada && (
          <div className="space-y-6">
            {/* Info Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Número</span>
                <p className="text-2xl font-bold text-slate-700 dark:text-white">#{transferenciaSelecionada.numero}</p>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</span>
                <div className="mt-1">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(transferenciaSelecionada.status)}`}>
                    {transferenciaSelecionada.status}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Movimentação</span>
                <div className="flex flex-col mt-1">
                  <span className="text-sm font-semibold">DE: {locaisMap[transferenciaSelecionada.origem]}</span>
                  <span className="text-sm font-semibold">PARA: {locaisMap[transferenciaSelecionada.destino]}</span>
                </div>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data/Hora</span>
                <div className="flex flex-col mt-1">
                  <span className="text-sm">{transferenciaSelecionada.data}</span>
                  <span className="text-xs text-slate-500">{transferenciaSelecionada.hora} (Saída) / {transferenciaSelecionada.atualizado_em ? new Date(transferenciaSelecionada.atualizado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'} (Final)</span>
                </div>
              </div>
            </div>

            {/* Table of Products */}
            <div>
              <h4 className="font-bold text-slate-700 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-rounded text-green-600">inventory_2</span>
                Produtos Transferidos
              </h4>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="px-6 py-3">Código</th>
                      <th className="px-6 py-3">Descrição</th>
                      <th className="px-6 py-3 text-right">Qtd</th>
                      <th className="px-6 py-3 text-center">Un</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {transferenciaSelecionada.produtos?.map((p, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-3 text-slate-600 font-mono text-sm">{p.codProduto}</td>
                        <td className="px-6 py-3 font-medium text-slate-700 dark:text-slate-200">{p.descricao}</td>
                        <td className="px-6 py-3 text-right font-bold">{p.qtd}</td>
                        <td className="px-6 py-3 text-center text-xs opacity-70">{p.unidade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button onClick={() => abrirLogsTransferencia(transferenciaSelecionada.numero)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-semibold transition-colors">
                Ver Logs
              </button>

              {/* Lógica de Botões de Ação (Receber/Recusar) */}
              {transferenciaSelecionada.status.toLowerCase() === "pendente" && transferenciaSelecionada.destino === origemUsuario && (
                <button
                  onClick={async () => {
                    await axios.put(`${API_BASE_URL}/transferencias/${transferenciaSelecionada.numero}/status`, { status: "Concluido", usuario: username });
                    const res = await axios.get(`${API_BASE_URL}/transferencias`, { params: { data: dataTrabalho } });
                    setTransferencias(res.data);
                    setModalVisualizarOpen(false);
                  }}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-lg shadow-green-600/20"
                >
                  RECEBER TRANSFERÊNCIA
                </button>
              )}

              {transferenciaSelecionada.status.toLowerCase() === "recusado (p)" && transferenciaSelecionada.origem === origemUsuario && (
                <>
                  <button
                    onClick={async () => {
                      await axios.put(`${API_BASE_URL}/transferencias/${transferenciaSelecionada.numero}/status`, { status: "Recusado", usuario: username });
                      // Refresh
                      const res = await axios.get(`${API_BASE_URL}/transferencias`, { params: { data: dataTrabalho } });
                      setTransferencias(res.data);
                      setModalVisualizarOpen(false);
                    }}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-lg shadow-red-600/20"
                  >
                    CONFIRMAR RECUSA
                  </button>
                  <button
                    onClick={async () => {
                      await axios.put(`${API_BASE_URL}/transferencias/${transferenciaSelecionada.numero}/status`, { status: "Pendente" });
                      // Refresh
                      const res = await axios.get(`${API_BASE_URL}/transferencias`, { params: { data: dataTrabalho } });
                      setTransferencias(res.data);
                      setModalVisualizarOpen(false);
                    }}
                    className="px-6 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg font-bold"
                  >
                    Retornar para Pendente
                  </button>
                </>
              )}

              {transferenciaSelecionada.status.toLowerCase() !== "recusado (p)" && transferenciaSelecionada.status.toLowerCase() !== "recusado" && transferenciaSelecionada.status.toLowerCase() !== "concluido" && transferenciaSelecionada.destino === origemUsuario && (
                <button
                  onClick={() => {
                    setTransferenciaParaRecusar(transferenciaSelecionada);
                    setModalVisualizarOpen(false);
                    setTimeout(() => setConfirmarRecusaOpen(true), 200);
                  }}
                  className="px-6 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-bold border border-red-200"
                >
                  Devolver / Recusar
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Logs Modal */}
      <Modal isOpen={modalLogsOpen} onClose={() => setModalLogsOpen(false)} title="Logs de Auditoria">
        <div className="overflow-hidden bg-white border border-slate-200 rounded-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2">Ação</th>
                <th className="px-4 py-2">Usuário</th>
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2">Obs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logsTransferencia.map((log, i) => (
                <tr key={i}>
                  <td className="px-4 py-2">{log.acao}</td>
                  <td className="px-4 py-2 font-medium">{log.usuario}</td>
                  <td className="px-4 py-2 text-slate-500">{new Date(log.data_hora).toLocaleString()}</td>
                  <td className="px-4 py-2">{log.observacao || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* Dialog Recusa */}
      <Dialog open={confirmarRecusaOpen} onClose={() => setConfirmarRecusaOpen(false)}>
        <DialogTitle>Confirmar Devolução</DialogTitle>
        <DialogContent>
          <TextField fullWidth multiline rows={4} label="Motivo" value={motivoRecusa} onChange={e => setMotivoRecusa(e.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmarRecusaOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              await axios.put(`${API_BASE_URL}/transferencias/${transferenciaParaRecusar.numero}/status`, {
                status: "Recusado (P)", motivo: motivoRecusa, usuario: username
              });
              const res = await axios.get(`${API_BASE_URL}/transferencias`, { params: { data: dataTrabalho } });
              setTransferencias(res.data);
              setConfirmarRecusaOpen(false);
            }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Reabrir */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Reabrir Transferência?</DialogTitle>
        <DialogContent>
          <p>Deseja alterar o status da transferência <b>{transferenciaParaReabrir?.numero}</b> para <b>PENDENTE</b>?</p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={async () => {
            await axios.put(`${API_BASE_URL}/transferencias/${transferenciaParaReabrir.numero}/status`, { status: "Pendente", usuario: username });
            const res = await axios.get(`${API_BASE_URL}/transferencias`, { params: { data: dataTrabalho } });
            setTransferencias(res.data);
            setConfirmOpen(false);
          }}>Confirmar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <MuiAlert elevation={6} variant="filled" severity={snackbarSeverity} onClose={() => setSnackbarOpen(false)}>
          {snackbarMsg}
        </MuiAlert>
      </Snackbar>
    </div>
  );
};

export default Transferencias;
