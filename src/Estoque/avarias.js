import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getDataTrabalho } from "../utils/dataTrabalho";
import dayjs from "dayjs";
import { Tooltip, Snackbar } from "@mui/material";
import MuiAlert from "@mui/material/Alert";
import { API_BASE_URL } from "../utils/apiConfig";

// --- COMPONENTS MODERNOS ---

const Modal = ({ isOpen, onClose, title, children, maxWidth = "md" }) => {
  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
    "2xl": "max-w-7xl",
    full: "max-w-full mx-4",
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
              <span className="material-symbols-rounded group-hover:rotate-90 transition-transform">
                close
              </span>
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

const locaisMap = {
  "01": "Loja",
  "02": "Depósito",
  "03": "B.T.F",
  "04": "Depósito da Banana",
  "05": "Depósito do Ovo",
  "06": "Passarela 02 (torres)",
  "07": "Centro de Distribuição (C.D)",
  "09": "Passarela 01",
};

const Avarias = () => {
  const navigate = useNavigate();
  const userRole = (sessionStorage.getItem("role") || localStorage.getItem("role") || "").toLowerCase();

  // Estados de Dados
  const [avarias, setAvarias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [origemUsuario, setOrigemUsuario] = useState(null);

  // Logica de sessão
  const username =
    sessionStorage.getItem("username") ||
    localStorage.getItem("username") ||
    "sistema";
  const dataTrabalho = getDataTrabalho();

  // Modais de Controle
  const [modalVisualizarOpen, setModalVisualizarOpen] = useState(false);
  const [avariaParaVisualizar, setAvariaParaVisualizar] = useState(null);

  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [avariaSelecionada, setAvariaSelecionada] = useState(null);
  const [itensAvaria, setItensAvaria] = useState([]);
  const [validacoesItens, setValidacoesItens] = useState({});

  const [confirmReabrirOpen, setConfirmReabrirOpen] = useState(false);
  const [avariaParaReabrir, setAvariaParaReabrir] = useState(null);

  const [dialogDevolver, setDialogDevolver] = useState(false);
  const [motivoRecusa, setMotivoRecusa] = useState("");

  const [modalLogsOpen, setModalLogsOpen] = useState(false);
  const [logsTransferencia, setLogsTransferencia] = useState([]);

  // Feedback
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  // Estados de Fechamento
  const [fechamentoRealizado, setFechamentoRealizado] = useState(false);
  const [preFechamentoRealizado, setPreFechamentoRealizado] = useState(false);

  // Init
  useEffect(() => {
    const fetchDados = async () => {
      // 1. Tenta pegar do storage local primeiro
      const storedLocal =
        sessionStorage.getItem("local") || localStorage.getItem("origem");
      if (storedLocal) {
        setOrigemUsuario(storedLocal);
      }

      if (!username || username === "sistema") return;

      try {
        const resOrigem = await axios.get(
          `${API_BASE_URL}/usuarios/origem/${username}`
        );
        if (resOrigem.data?.origem) {
          setOrigemUsuario(resOrigem.data.origem);
          sessionStorage.setItem("local", resOrigem.data.origem);
        }
      } catch (err) {
        console.warn(
          "Aviso ao buscar origem (usando cache local se existir):",
          err
        );
        // Não seta erro na tela se já tivermos um local do storage, segue o jogo
        if (!storedLocal) {
          setError("Não foi possível carregar suas permissões.");
        }
      }
    };
    fetchDados();
  }, [username]);

  const fetchAvarias = useCallback(async () => {
    if (!origemUsuario) return;

    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/avarias/lancadas`);

      // Filtragem: Avaria do local (origem ou destino) E Data de Trabalho atual
      const dataTrabalhoBR = dataTrabalho.split("-").reverse().join("/"); // YYYY-MM-DD -> DD/MM/YYYY

      const avariasFiltradas = res.data.filter((avaria) => {
        const pertenceAoMeuLocal =
          avaria.origem === origemUsuario || avaria.destino === origemUsuario;
        const dataAvariaBR = dayjs(avaria.data_inclusao).add(12, 'hour').format('DD/MM/YYYY');
        return pertenceAoMeuLocal && dataAvariaBR === dataTrabalhoBR;
      });

      setAvarias(avariasFiltradas);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Erro ao carregar lista de avarias.");
    } finally {
      setLoading(false);
    }
  }, [origemUsuario, dataTrabalho]);

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

  useEffect(() => {
    fetchAvarias();
  }, [fetchAvarias]);

  // --- Actions ---

  const showSnackbar = (message, severity = "info") => {
    setSnackbar({ open: true, message, severity });
  };

  // Reabrir
  const handleReabrirAvaria = async () => {
    if (!avariaParaReabrir) return;
    try {
      await axios.put(
        `${API_BASE_URL}/avarias/${avariaParaReabrir.numero}/status`,
        {
          status: "Pendente",
          usuario: username,
        }
      );
      showSnackbar("Avaria reaberta com sucesso!", "success");
      fetchAvarias();
    } catch (err) {
      console.error(err);
      showSnackbar("Erro ao reabrir avaria.", "error");
    } finally {
      setConfirmReabrirOpen(false);
      setAvariaParaReabrir(null);
    }
  };

  // Visualizar / Editar (Logic combinada de fetch)
  const fetchDetalhesAvaria = async (id) => {
    const res = await axios.get(`${API_BASE_URL}/avarias/${id}`);
    return res.data; // { avaria, itens } ou flat
  };

  const handleVisualizarAvaria = async (id) => {
    try {
      const dados = await fetchDetalhesAvaria(id);
      // Normaliza estrutura
      const avariaData = dados.avaria
        ? dados
        : { avaria: dados, itens: dados.itens || [] };

      setAvariaParaVisualizar(avariaData);
      setModalVisualizarOpen(true);

      // Se for abrir visualização, pode ser p/ editar tb?
      // Aqui separamos: handleVisualizar é READ-ONLY modal
      // porem se o status for pendente E for o destino, vamos permitir abrir o modal de Edição/Validação
    } catch (err) {
      console.error(err);
      showSnackbar("Erro ao carregar detalhes.", "error");
    }
  };

  const handleAbrirValidacao = async (avaria) => {
    try {
      const dados = await fetchDetalhesAvaria(avaria.id);
      // Garante estrutura
      const avariaObj = dados.avaria || dados;
      const itensList = dados.itens || [];

      setAvariaSelecionada(avariaObj);
      setItensAvaria(itensList);

      // Preenche validações existentes
      const validacoesIniciais = itensList.reduce((acc, item) => {
        return {
          ...acc,
          [item.id]: {
            validacao: item.validacao != null ? item.validacao.toString() : "",
            conversao:
              item.validacao != null && item.fator_conversao
                ? (
                  parseFloat(item.validacao) /
                  parseFloat(item.fator_conversao)
                ).toFixed(2)
                : "",
          },
        };
      }, {});
      setValidacoesItens(validacoesIniciais);
      setModalEditarOpen(true);
    } catch (err) {
      console.error(err);
      showSnackbar("Erro ao abrir validação.", "error");
    }
  };

  // Alteração de inputs de validação
  const handleChangeValidacao = (itemId, value, fatorConversao) => {
    const floatValue = parseFloat(value);
    const conversao =
      !isNaN(floatValue) && fatorConversao
        ? (floatValue / fatorConversao).toFixed(2)
        : "";

    setValidacoesItens((prev) => ({
      ...prev,
      [itemId]: {
        validacao: value,
        conversao,
      },
    }));
  };

  const handleSalvarValidacoes = async (shouldClose = true) => {
    try {
      const payload = {
        id_avaria: avariaSelecionada.id,
        itens: itensAvaria.map((item) => ({
          id: item.id,
          validacao: validacoesItens[item.id]?.validacao || null,
          validacao_convertida: validacoesItens[item.id]?.conversao || null,
        })),
      };

      await axios.put(
        `${API_BASE_URL}/avarias/${avariaSelecionada.id}`,
        payload
      );
      if (shouldClose) {
        showSnackbar("Validações salvas com sucesso!", "success");
        setModalEditarOpen(false);
        fetchAvarias();
      }
    } catch (err) {
      console.error(err);
      showSnackbar("Erro ao salvar validações.", "error");
      throw err; // Propagate error to stop handleAprovarTotal if save fails
    }
  };

  // Impressão PDF
  const handleImprimirPdf = (avariaId) => {
    window.open(`${API_BASE_URL}/avarias/${avariaId}/pdf`, "_blank");
  };

  // Impressão
  const handleImprimir = async (avariaCompacta) => {
    try {
      // Busca full details para imprimir
      const dados = await fetchDetalhesAvaria(avariaCompacta.id);
      const avariaFull = dados.avaria || dados;
      const itensFull = dados.itens || [];

      const dh = dayjs(avariaFull.data_inclusao);
      const payload = {
        numero: avariaFull.numero,
        origem: avariaFull.origem,
        destino: avariaFull.destino,
        responsavel: avariaFull.responsavel,
        carregador: avariaFull.responsavel, // Adicionado p/ compatibilidade com padrão de transferência
        usuario: avariaFull.usuario,
        data_inclusao: dh.add(12, 'hour').format("DD/MM/YYYY"), // Seguindo padrão da transferência
        data: dh.add(12, 'hour').format("DD/MM/YYYY"),
        hora: new Date().toLocaleTimeString(), // Seguindo padrão da transferência (hora atual)
        produtos: itensFull.map((item) => {
          let qtdParaImprimir = Number(item.quantidade) || 0;
          let unidadeParaImprimir = item.unidade || "";
          const fator = Number(item.fator_conversao);

          if (item.validacao_convertida != null) {
            qtdParaImprimir = Number(item.validacao_convertida);
            unidadeParaImprimir = item.segunda_unidade || "UN";
          } else if (item.validacao != null && item.validacao !== "") {
            const val = parseFloat(item.validacao);
            if (!isNaN(val) && fator && fator > 0) {
              qtdParaImprimir = val / fator;
              unidadeParaImprimir = item.segunda_unidade || "UN";
            } else {
              qtdParaImprimir = val;
              if (item.segunda_unidade) unidadeParaImprimir = item.segunda_unidade;
            }
          } else {
            if (fator && fator > 0) {
              qtdParaImprimir = qtdParaImprimir / fator;
              unidadeParaImprimir = item.segunda_unidade || "UN";
            }
          }

          return {
            cod_produto: item.cod_produto || "",
            descricao: item.descricao,
            quantidade: qtdParaImprimir,
            unidade: unidadeParaImprimir,
          };
        }),
      };

      // Envia conforme padrão de transferências (que está funcionando)
      try {
        // Tenta agente local primeiro
        await axios.get("http://localhost:3005/ping", { timeout: 1500 });
        await axios.post("http://localhost:3005/imprimir-avaria-termica", payload, { timeout: 8000 });
        showSnackbar("✅ Impressão enviada (Local).", "success");
      } catch (e1) {
        console.warn("Agente local indisponível, tentando servidor...", e1?.message);
        try {
          // Fallback server
          await axios.post(`${API_BASE_URL}/imprimir-avaria-termica`, payload);
          showSnackbar("✅ Impressão enviada (Servidor).", "success");
        } catch (e2) {
          console.error("Falha na impressão:", e2);
          showSnackbar("❌ Erro na impressão (Local e Servidor).", "error");
        }
      }
    } catch (err) {
      console.error(err);
      showSnackbar("Erro ao preparar impressão.", "error");
    }
  };

  // Aprovação / Recusa
  const handleAprovarTotal = async () => {
    // Para aprovar, precisa ter validado tudo?
    // A regra diz: "só pode aprovar se DESTINO + PENDENTE + todas as validações > 0"
    // Vamos checar aqui ou no render do botao.
    // Assumindo chamada ao backend para mudar status p/ Concluido

    try {
      // Primeiro salva validações (SEM fechar modal)
      await handleSalvarValidacoes(false);
      // Depois muda status
      await axios.put(
        `${API_BASE_URL}/avarias/${avariaSelecionada.numero}/status`,
        {
          status: "Concluído",
          usuario: username,
        }
      );
      showSnackbar("Avaria CONCLUÍDA com sucesso!", "success");
      setModalEditarOpen(false);
      fetchAvarias();
    } catch (err) {
      console.error(err);
      showSnackbar("Erro ao concluir avaria.", "error");
    }
  };

  const handleRecusar = async () => {
    if (!motivoRecusa) {
      showSnackbar("Digite um motivo.", "warning");
      return;
    }
    try {
      await axios.post(
        `${API_BASE_URL}/avarias/${avariaSelecionada.id}/status`,
        {
          status: "Recusado (P)",
          motivo: motivoRecusa,
          usuario: username,
        }
      );
      showSnackbar("Devolução enviada para aprovação!", "info");
      setDialogDevolver(false);
      setModalEditarOpen(false);
      fetchAvarias();
    } catch (err) {
      console.error(err);
      showSnackbar("Erro ao devolver.", "error");
    }
  };

  // Aceitar recusa - Local origem aceita a recusa do destino
  const handleAceitarRecusa = async (avaria) => {
    try {
      await axios.put(`${API_BASE_URL}/avarias/${avaria.numero}/status`, {
        status: "Recusado",
        usuario: username,
      });
      showSnackbar(
        "Recusa aceita! Avaria finalizada como Recusada.",
        "success"
      );
      fetchAvarias();
    } catch (err) {
      console.error(err);
      showSnackbar("Erro ao aceitar recusa.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">
      {/* Header Glassmorphic */}
      <header className="sticky top-0 z-50 px-4 py-4">
        <div className="w-full max-w-[98vw] mx-auto">
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
                  Avarias
                </h1>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  Estoque
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              {/* Data Info */}
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
                    {dataTrabalho
                      ? dayjs(dataTrabalho).add(12, "hour").format("DD/MM/YYYY")
                      : dayjs().format("DD/MM/YYYY")}
                  </span>
                </div>
              </div>

              <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 hidden md:block"></div>

              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-bold text-slate-800 dark:text-white">
                    {username}
                  </span>
                  <div className="text-[10px] font-bold text-white bg-slate-800 dark:bg-slate-600 px-2 py-0.5 rounded flex items-center gap-1">
                    LOCAL: {origemUsuario}{" "}
                    <span className="material-symbols-rounded text-[10px]">
                      location_on
                    </span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 border-2 border-white dark:border-slate-600 flex items-center justify-center shadow-sm">
                  <span
                    className="material-symbols-rounded text-slate-500 dark:text-slate-300"
                    title={`Role: ${userRole}`}
                  >
                    person
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 md:px-6 py-8 relative z-10">

        {/* Banner de Bloqueio */}
        {(fechamentoRealizado || preFechamentoRealizado) && (
          <div className="mb-6 w-full bg-red-600 text-white text-center py-3 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-3 animate-pulse border-2 border-red-400">
            <span className="material-symbols-rounded text-2xl">lock</span>
            <span className="text-lg uppercase tracking-wider">Rotina Bloqueada - Estoque Fechado</span>
          </div>
        )}
        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 animate-in slide-in-from-bottom-5 duration-500">
          <button
            onClick={() => navigate("/estoque")}
            className="h-12 w-12 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white shadow-sm hover:shadow-md transition-all border border-slate-200 dark:border-slate-700"
            title="Voltar"
          >
            <span className="material-symbols-rounded text-2xl">
              arrow_back
            </span>
          </button>

          <button
            onClick={() => navigate("/nova-avaria")}
            disabled={fechamentoRealizado || preFechamentoRealizado}
            className="h-12 px-6 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-md shadow-green-600/20 flex items-center gap-2 text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-rounded text-lg">add_circle</span>
            Nova Avaria
          </button>
        </div>

        {/* Tabela */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-500">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400">
              <span className="material-symbols-rounded text-4xl animate-spin mb-4">
                progress_activity
              </span>
              <p>Carregando avarias...</p>
            </div>
          ) : error ? (
            <div className="p-12 flex flex-col items-center justify-center text-red-500">
              <span className="material-symbols-rounded text-4xl mb-4">
                error
              </span>
              <p>{error}</p>
              <button
                onClick={fetchAvarias}
                className="mt-4 px-4 py-2 bg-slate-100 rounded-lg text-slate-600 font-bold text-sm"
              >
                Tentar Novamente
              </button>
            </div>
          ) : avarias.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400">
              <span className="material-symbols-rounded text-4xl mb-4">
                assignment_turned_in
              </span>
              <p>Nenhuma avaria encontrada para hoje neste local.</p>
            </div>
          ) : (
            <div
              className="overflow-x-auto overflow-y-visible custom-scrollbar"
              style={{ maxWidth: "100%", WebkitOverflowScrolling: "touch" }}
            >
              <table className="w-full min-w-[1200px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-700/30 border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider text-slate-500 font-bold">
                    <th className="px-6 py-4">Nº</th>
                    <th className="px-6 py-4">Origem</th>
                    <th className="px-6 py-4">Destino</th>
                    <th className="px-6 py-4">Responsável</th>
                    <th className="px-6 py-4">Usuário</th>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {avarias.map((av) => (
                    <tr
                      key={av.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">
                        {av.numero}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">
                        {locaisMap[av.origem] || av.origem}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">
                        {locaisMap[av.destino] || av.destino}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {av.responsavel}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {av.usuario}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 md:whitespace-nowrap">
                        {dayjs(av.data_inclusao).add(12, 'hour').format("DD/MM, HH:mm")}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border whitespace-nowrap
                                            ${av.status === "Concluído"
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : av.status === "Pendente"
                                ? "bg-amber-100 text-amber-700 border-amber-200"
                                : av.status === "Recusado (P)"
                                  ? "bg-orange-100 text-orange-700 border-orange-200"
                                  : av.status.includes("Recusado")
                                    ? "bg-red-100 text-red-700 border-red-200"
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                        >
                          {av.status}
                          {av.status === "Recusado (P)" &&
                            av.origem === origemUsuario && (
                              <span
                                className="ml-1 text-orange-600"
                                title="Aguardando sua aprovação"
                              >
                                ⏳
                              </span>
                            )}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-1">
                          {/* Se for destino e pendente, abre edição/validação. Se não, só visualiza */}
                          {av.destino === origemUsuario &&
                            av.status === "Pendente" ? (
                            <button
                              onClick={() => handleAbrirValidacao(av)}
                              disabled={fechamentoRealizado || preFechamentoRealizado}
                              className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Validar / Conferir"
                            >
                              <span className="material-symbols-rounded">
                                edit_square
                              </span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleVisualizarAvaria(av.id)}
                              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Visualizar"
                            >
                              <span className="material-symbols-rounded">
                                visibility
                              </span>
                            </button>
                          )}

                          <button
                            onClick={() => handleImprimir(av)}
                            className="p-2 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Reimprimir Térmica"
                          >
                            <span className="material-symbols-rounded">
                              print
                            </span>
                          </button>

                          <button
                            onClick={() => handleImprimirPdf(av.id)}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Imprimir PDF"
                          >
                            <span className="material-symbols-rounded">
                              picture_as_pdf
                            </span>
                          </button>



                          {/* Aceitar Recusa - Se for origem e status Recusado (P) */}
                          {av.status === "Recusado (P)" &&
                            av.origem === origemUsuario && (
                              <button
                                onClick={() => handleAceitarRecusa(av)}
                                disabled={fechamentoRealizado || preFechamentoRealizado}
                                className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Aceitar Recusa"
                              >
                                <span className="material-symbols-rounded">
                                  check_circle
                                </span>
                              </button>
                            )}

                          {/* Gestor Unlock */}
                          {["concluido", "concluído"].includes(
                            av.status.toLowerCase()
                          ) &&
                            ["gestor", "admin"].includes(userRole) && (
                              <button
                                onClick={() => {
                                  setAvariaParaReabrir(av);
                                  setConfirmReabrirOpen(true);
                                }}
                                disabled={fechamentoRealizado || preFechamentoRealizado}
                                className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Reabrir"
                              >
                                <span className="material-symbols-rounded">
                                  lock_open
                                </span>
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* --- MODAIS --- */}

      {/* Visualizar */}
      <Modal
        isOpen={modalVisualizarOpen}
        onClose={() => setModalVisualizarOpen(false)}
        title="Detalhes da Avaria"
        maxWidth="lg"
      >
        <div className="space-y-6">
          {/* Header Info */}
          <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700 relative">
            <button
              onClick={async () => {
                try {
                  const res = await axios.get(
                    `${API_BASE_URL}/avarias/${avariaParaVisualizar.avaria.id}/logs`
                  );
                  // Se der 404 tenta rota antiga
                  setLogsTransferencia(res.data || []);
                } catch {
                  try {
                    const res2 = await axios.get(
                      `${API_BASE_URL}/avarias/logs/${avariaParaVisualizar.avaria.id}`
                    );
                    setLogsTransferencia(res2.data);
                  } catch (e) {
                    console.error(e);
                  }
                }
                setModalLogsOpen(true);
              }}
              className="absolute top-4 right-4 text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span className="material-symbols-rounded text-sm">history</span>{" "}
              Ver Logs
            </button>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-xs uppercase font-bold text-slate-400">
                  Número
                </span>
                <p className="font-bold text-slate-700 text-lg">
                  {avariaParaVisualizar?.avaria?.numero}
                </p>
              </div>
              <div>
                <span className="text-xs uppercase font-bold text-slate-400">
                  Origem
                </span>
                <p className="font-medium text-slate-700">
                  {locaisMap[avariaParaVisualizar?.avaria?.origem] ||
                    avariaParaVisualizar?.avaria?.origem}
                </p>
              </div>
              <div>
                <span className="text-xs uppercase font-bold text-slate-400">
                  Destino
                </span>
                <p className="font-medium text-slate-700">
                  {locaisMap[avariaParaVisualizar?.avaria?.destino] ||
                    avariaParaVisualizar?.avaria?.destino}
                </p>
              </div>
              <div>
                <span className="text-xs uppercase font-bold text-slate-400">
                  Responsável
                </span>
                <p className="font-medium text-slate-700">
                  {avariaParaVisualizar?.avaria?.responsavel}
                </p>
              </div>
            </div>
          </div>

          {/* Lista Itens */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold">
                <tr>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Quantidade</th>
                  <th className="px-4 py-3">Validação</th>
                  <th className="px-4 py-3">Conversão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {avariaParaVisualizar?.itens?.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {item.descricao}
                    </td>
                    <td className="px-4 py-3">
                      {item.quantidade} {item.unidade}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {item.validacao || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {item.validacao && item.fator_conversao
                        ? (
                          parseFloat(item.validacao) /
                          parseFloat(item.fator_conversao)
                        ).toFixed(2)
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Editar / Validar */}
      <Modal
        isOpen={modalEditarOpen}
        onClose={() => setModalEditarOpen(false)}
        title={`Conferência Avaria: ${avariaSelecionada?.numero}`}
        maxWidth="xl"
      >
        <div className="space-y-6">
          {/* Info Rápida */}
          <div className="flex gap-4 p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-800 text-sm">
            <span className="material-symbols-rounded">info</span>
            <p>
              Preencha a coluna <b>Validação</b> com a quantidade ou peso aferido. Se
              estiver tudo certo, clique em <b>Concluir</b>.
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Qtd Enviada</th>
                  <th className="px-4 py-3">Conversão Estimada</th>
                  <th className="px-4 py-3 w-40">Validação</th>
                  <th className="px-4 py-3">Conversão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itensAvaria.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {item.descricao}
                    </td>
                    <td className="px-4 py-3 font-bold">
                      {item.quantidade} {item.unidade}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {item.segunda_unidade
                        ? `${(
                          Number(item.quantidade) /
                          Number(item.fator_conversao || 1)
                        ).toFixed(2)} ${item.segunda_unidade}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 relative">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="0.00"
                          value={validacoesItens[item.id]?.validacao || ""}
                          onChange={(e) =>
                            handleChangeValidacao(
                              item.id,
                              e.target.value,
                              parseFloat(item.fator_conversao)
                            )
                          }
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <span className="text-xs font-black text-slate-700 dark:text-slate-200 whitespace-nowrap bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                          {item.unidade}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {validacoesItens[item.id]?.conversao ? (
                        <span className="font-bold">
                          {validacoesItens[item.id].conversao} <span className="text-[10px] text-slate-400">{item.segunda_unidade}</span>
                        </span>
                      ) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <button
              onClick={() => setDialogDevolver(true)}
              className="px-6 py-3 rounded-xl font-bold text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
            >
              Recusar / Devolver
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleSalvarValidacoes}
                className="px-6 py-3 rounded-xl font-bold text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors"
              >
                Salvar Parcialmente
              </button>
              <button
                onClick={handleAprovarTotal}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-600/30 transition-all transform active:scale-95"
              >
                Concluir Conferência
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Recusar (Dialog pequeno) */}
      <Modal
        isOpen={dialogDevolver}
        onClose={() => setDialogDevolver(false)}
        title="Motivo da Recusa"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <textarea
            className="w-full border border-slate-300 rounded-xl p-4 min-h-[120px] focus:ring-2 focus:ring-red-500 outline-none resize-none"
            placeholder="Descreva o motivo da devolução..."
            value={motivoRecusa}
            onChange={(e) => setMotivoRecusa(e.target.value)}
          ></textarea>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDialogDevolver(false)}
              className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              onClick={handleRecusar}
              className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700"
            >
              Confirmar Recusa
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Reabrir */}
      <Modal
        isOpen={confirmReabrirOpen}
        onClose={() => setConfirmReabrirOpen(false)}
        title="Reabrir Avaria"
        maxWidth="sm"
      >
        <div className="text-center space-y-4 py-2">
          <p className="text-slate-600">
            Deseja realmente reabrir a avaria <b>{avariaParaReabrir?.numero}</b>
            ?
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => setConfirmReabrirOpen(false)}
              className="px-4 py-2 text-slate-500 font-bold"
            >
              Não
            </button>
            <button
              onClick={handleReabrirAvaria}
              className="px-6 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600"
            >
              Sim, Reabrir
            </button>
          </div>
        </div>
      </Modal>

      {/* Logs */}
      <Modal
        isOpen={modalLogsOpen}
        onClose={() => setModalLogsOpen(false)}
        title="Histórico de Logs"
        maxWidth="md"
      >
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {logsTransferencia.length === 0 ? (
            <p className="text-slate-400 text-center italic">
              Nenhum log encontrado.
            </p>
          ) : (
            logsTransferencia.map((log, i) => (
              <div
                key={i}
                className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-sm"
              >
                <p className="font-bold text-slate-700">{log.acao}</p>
                <p className="text-xs text-slate-500">
                  {new Date(log.data_hora).toLocaleString()} - {log.usuario}
                </p>
                {log.detalhes && (
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    {log.detalhes}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </Modal>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <MuiAlert
          elevation={6}
          variant="filled"
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          sx={{ borderRadius: 3 }}
        >
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
    </div>
  );
};

export default Avarias;
