import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
} from "@mui/material";
import ActionCard from "../components/ActionCard";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Backdrop from "@mui/material/Backdrop";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AppRegistrationIcon from "@mui/icons-material/AppRegistration";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import MoveDownIcon from "@mui/icons-material/MoveDown";
import InventoryIcon from "@mui/icons-material/Inventory";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import DownloadIcon from "@mui/icons-material/Download";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import AddBoxIcon from "@mui/icons-material/AddBox";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import { getDataTrabalho } from "../utils/dataTrabalho";
import { exportFechamentoExcel } from "../utils/exportFechamentoExcel";
import { API_BASE_URL } from '../utils/apiConfig';

const locais = [
  {
    id: "09",
    nome: "PS1",
    colFisico: "ps1",
    colSistema: "ps1_sistema",
    colDif: "dif_09",
  },
  {
    id: "06",
    nome: "PS2",
    colFisico: "ps2",
    colSistema: "ps2_sistema",
    colDif: "dif_06",
  },
  {
    id: "03",
    nome: "BTF",
    colFisico: "btf_03",
    colSistema: "btf_03_sistema",
    colDif: "btf_03_dif",
  },
  {
    id: "04",
    nome: "BAN-04",
    colFisico: "ban_04",
    colSistema: "ban_04_sistema",
    colDif: "ban_04_dif",
  },
  {
    id: "07",
    nome: "CD",
    colFisico: "cd_07",
    colSistema: "cd_07_sistema",
    colDif: "cd_07_dif",
  },
  {
    id: "01",
    nome: "LOJA",
    colFisico: "loj_01",
    colSistema: "loj_01_sistema",
    colDif: "loj_01_dif",
  },
  {
    id: "05",
    nome: "DEP (OVO)",
    colFisico: "dep_ovo",
    colSistema: "dep_ovo_sistema",
    colDif: "dep_ovo_dif",
  },
  {
    id: "02",
    nome: "DEP",
    colFisico: "dep",
    colSistema: "dep_sistema",
    colDif: "dep_dif",
  },
  {
    id: "08",
    nome: "VAREJINHO",
    colFisico: "var_08",
    colSistema: "var_08_sistema",
    colDif: "var_08_dif",
  },
];

const FechamentoGeral = () => {
  const navigate = useNavigate();
  const username = sessionStorage.getItem("username") || localStorage.getItem("username") || "sistema";
  const [local, setLocal] = useState(localStorage.getItem("local") || "01");
  const [dadosFechamento, setDadosFechamento] = useState([]);
  const [filtroData, setFiltroData] = useState(getDataTrabalho());

  const [dashboardAberto, setDashboardAberto] = useState(false);

  const [modalTransferirProduto, setModalTransferirProduto] = useState(false);
  const [dadosTransferenciaProduto, setDadosTransferenciaProduto] = useState({
    data: filtroData,
    de: null,
    para: null,
    quantidade: "",
    local: local,
  });

  const [loadingFechamento, setLoadingFechamento] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("info");
  const [confirmarFechamento, setConfirmarFechamento] = useState(false);
  const [dataConfirmacao, setDataConfirmacao] = useState(null);
  const [localConfirmacao, setLocalConfirmacao] = useState(local);

  const [exportarAberto, setExportarAberto] = useState(false);
  const [localExportacao, setLocalExportacao] = useState("01");
  const [exportando, setExportando] = useState(false);
  const [mostrarSomenteComMovimentacao, setMostrarSomenteComMovimentacao] =
    useState(true);

  const [modalProdutoAberto, setModalProdutoAberto] = useState(false);
  const [novoProduto, setNovoProduto] = useState({
    data: filtroData,
    descricao: "",
    local: local,
    saldo: "",
  });

  const [modalEditarSaldoAberto, setModalEditarSaldoAberto] = useState(false);
  const [dadosSaldoFechamento, setDadosSaldoFechamento] = useState([]);

  const [produtosOpcoes, setProdutosOpcoes] = useState([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(false);

  // Estado para busca de produto
  const [buscaProduto, setBuscaProduto] = useState("");

  // 🆕 Estado do modal "Abrir Fechamento"
  const [abrirFechamentoAberto, setAbrirFechamentoAberto] = useState(false);
  const [dataAbrirFechamento, setDataAbrirFechamento] = useState(
    getDataTrabalho()
  );
  const [localAbrirFechamento, setLocalAbrirFechamento] = useState(local);

  const debounceRef = useRef(null);

  // 🆕 Estado para status dos locais (Aberto/Fechado)
  const [statusLocais, setStatusLocais] = useState([]);
  const [showStatusGrid, setShowStatusGrid] = useState(false);

  useEffect(() => {
    const fetchStatusLocais = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/saldos/status-locais`, {
          params: { data: filtroData },
        });
        setStatusLocais(res.data || []);
      } catch (err) {
        console.error("Erro ao buscar status dos locais:", err);
      }
    };
    fetchStatusLocais();

    // Atualiza status periodicamente ou quando o foco volta (opcional, aqui só na mudança de data)
  }, [filtroData, snackbarOpen]); // Recarrega se houver snackbar (ex: após fechar dia)

  const buscarProdutos = (textoBusca) => {
    if (!textoBusca) return;
    setCarregandoProdutos(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/produto`, {
          params: { search: textoBusca },
        });
        setProdutosOpcoes(res.data);
      } catch (err) {
        console.error("Erro ao buscar produtos:", err);
      } finally {
        setCarregandoProdutos(false);
      }
    }, 500);
  };

  const handleExportacao = async () => {
    setExportando(true);
    try {
      if (localExportacao === "TODOS") {
        // Exportar MÚLTIPLOS arquivos (um por local)
        let arquivosBaixados = 0;
        for (const l of locais) {
          try {
            const response = await axios.post(
              `${API_BASE_URL}/exportar-transferencias-csv`,
              { data: filtroData, local: l.id },
              { responseType: "blob" }
            );

            // Verifica se retornou conteúdo (status 204 = No Content)
            if (response.status === 204 || response.data.size === 0) {
              continue;
            }

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute(
              "download",
              `Transferencias_${l.id}_${filtroData}.csv`
            );
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link); // Limpeza do DOM
            arquivosBaixados++;

            // Pequeno delay para evitar bloqueio do navegador
            await new Promise((resolve) => setTimeout(resolve, 300));
          } catch (errLocal) {
            console.error(`Erro ao exportar local ${l.id}:`, errLocal);
          }
        }

        setSnackbarSeverity("success");
        setSnackbarMsg(
          arquivosBaixados > 0
            ? `✅ ${arquivosBaixados} arquivos baixados com sucesso!`
            : "⚠️ Nenhum dado encontrado para exportar."
        );
        setSnackbarOpen(true);
        setExportarAberto(false);
      } else {
        const response = await axios.post(
          `${API_BASE_URL}/exportar-transferencias-csv`,
          { data: filtroData, local: localExportacao },
          { responseType: "blob" }
        );
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          `Transferencias_${localExportacao}_${filtroData}.csv`
        );
        document.body.appendChild(link);
        link.click();
      }
      setSnackbarSeverity("success");
      setSnackbarMsg("✅ Exportação CSV realizada com sucesso!");
      setSnackbarOpen(true);
      setExportarAberto(false);
    } catch (err) {
      console.error("❌ Erro na exportação:", err);
      setSnackbarSeverity("error");
      setSnackbarMsg("❌ Falha ao exportar CSV.");
      setSnackbarOpen(true);
    } finally {
      setExportando(false);
    }
  };

  const scrollBottomRef = useRef(null);

  const buscarSaldosFisicos = async (data) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/estoque/saldo-fisico`,
        { params: { data } }
      );
      return res.data;
    } catch (err) {
      console.error("Erro ao buscar saldos físicos:", err);
      return [];
    }
  };

  const handleFechamentoDoDia = async () => {
    setLoadingFechamento(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/estoque/transferencias-pendentes`,
        { params: { data: filtroData } }
      );
      const pendentes = res.data.filter((t) => t.status === "Pendente");
      if (pendentes.length > 0) {
        setSnackbarSeverity("warning");
        setSnackbarMsg(
          `❌ Não é possível fechar o dia. Existem ${pendentes.length} transferência(s) pendente(s).`
        );
        setSnackbarOpen(true);
        return;
      }
      await axios.post(
        `${API_BASE_URL}/saldos/fechamento-do-dia`,
        {
          data: filtroData,
          local: localConfirmacao,
        }
      );
      setSnackbarSeverity("success");
      setSnackbarMsg("✅ Fechamento do dia salvo com sucesso!");
      setSnackbarOpen(true);
    } catch (err) {
      console.error("❌ Erro ao salvar fechamento:", err);
      setSnackbarSeverity("error");
      setSnackbarMsg("❌ Erro ao realizar o fechamento do dia.");
      setSnackbarOpen(true);
    } finally {
      setLoadingFechamento(false);
    }
  };

  // 🆕 Handler provisório para “Abrir Fechamento”
  const handleAbrirFechamento = async () => {
    if (!dataAbrirFechamento || !localAbrirFechamento) {
      setSnackbarSeverity("warning");
      setSnackbarMsg("⚠️ Informe data e local.");
      setSnackbarOpen(true);
      return;
    }
    try {
      await axios.post(
        `${API_BASE_URL}/saldos/abrir-fechamento`,
        {
          data: dataAbrirFechamento,
          local: localAbrirFechamento,
          usuario: username,
        }
      );

      setAbrirFechamentoAberto(false);
      setSnackbarSeverity("success");
      setSnackbarMsg(
        `✅ Fechamento aberto para ${new Date(
          `${dataAbrirFechamento}T12:00:00`
        ).toLocaleDateString("pt-BR")} - Local ${localAbrirFechamento}.`
      );
      setSnackbarOpen(true);

      // (opcional) recarregar a grade já nesse dia/local
      setFiltroData(dataAbrirFechamento);
      setLocal(localAbrirFechamento);
    } catch (err) {
      console.error(err);
      setSnackbarSeverity("error");
      setSnackbarMsg("❌ Falha ao abrir fechamento.");
      setSnackbarOpen(true);
    }
  };

  useEffect(() => {
    const buscarSistemaDiarioAgregado = async (data) => {
      try {
        const { data: linhas } = await axios.get(
          `${API_BASE_URL}/produtos/sb2-diario`,
          { params: { data, _ts: Date.now() } }
        );
        const map = new Map();
        (linhas || []).forEach((r) => {
          const codLimpo = String(r.cod_produto || "")
            .replace(/\./g, "")
            .trim();
          const key = `${codLimpo}|${r.local2}`;
          const prev = map.get(key) || 0;
          map.set(key, prev + Number(r.saldo_total || 0));
        });
        return map;
      } catch (err) {
        console.error("Erro ao buscar sistema diário:", err);
        return new Map();
      }
    };

    const fetchDados = async () => {
      setIsLoadingData(true);
      try {
        const [resFechamento, dadosFisico, mapSistema] = await Promise.all([
          axios
            .get(`${API_BASE_URL}/saldos/fechamento-geral`, {
              params: { local, data: filtroData },
            })
            .then((r) => r.data),
          buscarSaldosFisicos(filtroData),
          buscarSistemaDiarioAgregado(filtroData),
        ]);

        const dadosFechamentoArr = resFechamento;

        const merged = dadosFechamentoArr.map((item) => {
          const novo = { ...item };
          const codLimpo = String(item.cod_produto || "")
            .replace(/\./g, "")
            .trim();

          locais.forEach((l) => {
            novo[l.colFisico] = 0;
            novo[l.colSistema] = 0;

            const f = dadosFisico.find(
              (x) =>
                String(x.cod_produto || "")
                  .replace(/\./g, "")
                  .trim() === codLimpo && String(x.local) === String(l.id)
            );
            if (f) novo[l.colFisico] = Number(f.saldo_fisico) || 0;

            const key = `${codLimpo}|${l.id}`;
            const somaSistema = mapSistema.get(key) || 0;
            novo[l.colSistema] = somaSistema;
          });

          return novo;
        });

        setDadosFechamento(
          merged.sort((a, b) =>
            a.nome_produto?.localeCompare(b.nome_produto || "", "pt-BR", {
              sensitivity: "base",
            })
          )
        );
      } catch (err) {
        console.error("Erro ao buscar dados:", err);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchDados();
  }, [local, filtroData]);

  useEffect(() => {
    const sync = () => setFiltroData(getDataTrabalho());
    sync();
    window.addEventListener("dataTrabalhoChanged", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("dataTrabalhoChanged", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!modalEditarSaldoAberto) return;
    const fetchSaldos = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/saldos/fechamento`,
          {
            params: { data: filtroData, local: local },
          }
        );
        setDadosSaldoFechamento(res.data);
      } catch (err) {
        console.error("Erro ao buscar saldos de fechamento:", err);
      }
    };
    fetchSaldos();
  }, [modalEditarSaldoAberto, filtroData, local]);


  const actionsList = [
    { label: "DASHBOARD", color: "bg-purple-600", icon: DashboardIcon, onClick: () => navigate("/estoque/fechamento-geral/dashboard", { state: { dadosFechamento, locais, filtroData } }) },
    { label: "CADASTRO", color: "bg-fuchsia-600", icon: AppRegistrationIcon, onClick: () => navigate("/cadastro") },
    { label: "TRANSF. PRODUTO", color: "bg-red-500", icon: CompareArrowsIcon, onClick: () => setModalTransferirProduto(true) }, // Encurtei o nome
    { label: "TRANSFERÊNCIAS", color: "bg-amber-500", icon: MoveDownIcon, onClick: () => navigate("/estoque/transferencia") },
    { label: "FECHAR DIA", color: "bg-emerald-600", icon: InventoryIcon, onClick: () => { setDataConfirmacao(filtroData); setLocalConfirmacao(local); setConfirmarFechamento(true); } },
    { label: "ABRIR FECHAMENTO", color: "bg-indigo-600", icon: LockOpenIcon, onClick: () => { setDataAbrirFechamento(getDataTrabalho()); setLocalAbrirFechamento(local); setAbrirFechamentoAberto(true); } },
    { label: "EXPORTAÇÃO", color: "bg-blue-600", icon: DownloadIcon, onClick: () => setExportarAberto(true) },
    { label: "EXP. FECHAMENTO", color: "bg-sky-600", icon: FileDownloadIcon, onClick: () => { exportFechamentoExcel({ dados: dadosFechamento, locais, somenteComMov: mostrarSomenteComMovimentacao, nomeArquivo: `Fechamento_${filtroData}.xlsx` }); } },
    { label: "NOVO PRODUTO", color: "bg-pink-600", icon: AddBoxIcon, onClick: () => setModalProdutoAberto(true) },
  ];

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] pb-20 font-sans transition-colors duration-300">

      {/* Header Glass */}
      <header className="sticky top-0 z-50 px-4 md:px-6 py-4">
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-slate-700/50 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate("/estoque")}
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 'bold',
                color: 'text.secondary',
                minWidth: 'auto',
                mr: 1
              }}
            >
              Voltar
            </Button>
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <LockOpenIcon />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight text-slate-800 dark:text-white">Fechamento Geral</h1>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest hidden sm:inline-block">Controle Total de Estoque</span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600">
              <span className="text-xs font-bold text-slate-500 uppercase">Usuário</span>
              <span className="text-sm font-bold text-slate-800 dark:text-white">{username}</span>
              <span className="h-4 w-[1px] bg-slate-300 dark:bg-slate-600 mx-1"></span>
              <span className="text-xs font-bold text-slate-500 uppercase">Local</span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{local}</span>
              <span className="h-4 w-[1px] bg-slate-300 dark:bg-slate-600 mx-1"></span>
              <input
                type="date"
                value={filtroData}
                onChange={(e) => {
                  const novaData = e.target.value;
                  setFiltroData(novaData);
                  localStorage.setItem("data_trabalho", novaData);
                  window.dispatchEvent(new Event("dataTrabalhoChanged"));
                }}
                className="bg-transparent text-sm font-bold text-slate-800 dark:text-white outline-none border-none p-0 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 md:px-6 space-y-6">

        {/* Actions Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
          {actionsList.map((action, idx) => (
            <ActionCard
              key={idx}
              title={action.label}
              icon={action.icon}
              color={action.color}
              onClick={action.onClick}
            />
          ))}
        </div>

        {/* 🆕 Status dos Locais Grid */}
        {/* 🆕 Toggle Button for Status Grid */}
        <div className="flex justify-center">
          <button
            onClick={() => setShowStatusGrid(!showStatusGrid)}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors uppercase tracking-wider"
          >
            <span>Status dos Locais</span>
            <span className={`material-symbols-rounded text-lg transition-transform duration-300 ${showStatusGrid ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>
        </div>

        {/* 🆕 Status dos Locais Grid (Collapsible & Compact) */}
        <div className={`grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 transition-all duration-500 ease-in-out overflow-hidden ${showStatusGrid ? 'max-h-[500px] opacity-100 mb-6' : 'max-h-0 opacity-0 mb-0'}`}>
          {locais.map((l) => {
            const isFechado = statusLocais.includes(l.id);
            return (
              <div
                key={l.id}
                className={`relative rounded-lg border px-2 py-2 flex flex-col items-center justify-center transition-all shadow-sm ${isFechado
                  ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400"
                  }`}
              >
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-sm font-bold">{l.id}</span>
                  <span className="material-symbols-rounded text-[14px]">
                    {isFechado ? "lock" : "lock_open"}
                  </span>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-center truncate w-full">
                  {l.nome}
                </span>
              </div>
            );
          })}
        </div>

        {/* Toolbar da Tabela */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-t-2xl border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <span className="material-symbols-rounded text-blue-500">table_view</span>
            Visão Geral de Saldos
          </h2>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Campo de Busca */}
            <TextField
              placeholder="Buscar produto por código ou nome..."
              value={buscaProduto}
              onChange={(e) => setBuscaProduto(e.target.value)}
              size="small"
              sx={{
                minWidth: 300,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  backgroundColor: 'background.paper',
                }
              }}
              InputProps={{
                startAdornment: (
                  <Box sx={{ display: 'flex', alignItems: 'center', mr: 1, color: 'text.secondary' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>search</span>
                  </Box>
                ),
                endAdornment: buscaProduto && (
                  <Box
                    sx={{ cursor: 'pointer', color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
                    onClick={() => setBuscaProduto("")}
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>close</span>
                  </Box>
                )
              }}
            />
            <Button
              variant={mostrarSomenteComMovimentacao ? "contained" : "outlined"}
              color="primary"
              size="small"
              onClick={() => setMostrarSomenteComMovimentacao((prev) => !prev)}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold', whiteSpace: 'nowrap' }}
            >
              {mostrarSomenteComMovimentacao
                ? "Mostrar Tudo"
                : "Somente com Movimentação"}
            </Button>
          </div>
        </div>

        {/* Modern Table Container */}
        <div className="bg-white dark:bg-slate-800 rounded-b-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden -mt-6">
          {/* Recriando o TableContainer com estilos limpos */}
          <TableContainer
            component={Box}
            ref={scrollBottomRef}
            sx={{
              maxHeight: "70vh",
              "&::-webkit-scrollbar": { width: 8, height: 8 },
              "&::-webkit-scrollbar-track": { backgroundColor: "#f1f1f1" },
              "&::-webkit-scrollbar-thumb": { backgroundColor: "#c1c1c1", borderRadius: 4 },
            }}
          >
            <Table size="small" stickyHeader sx={{ minWidth: 1200 }}>
              <TableHead>
                <TableRow>
                  <TableCell
                    rowSpan={2}
                    sx={{
                      position: "sticky",
                      left: 0,
                      top: 0,
                      backgroundColor: "#f8fafc", // slate-50
                      zIndex: 10,
                      minWidth: 80,
                      borderBottom: '1px solid #e2e8f0',
                      fontWeight: 'bold',
                      color: '#475569'
                    }}
                  >
                    CÓD
                  </TableCell>
                  <TableCell
                    rowSpan={2}
                    sx={{
                      position: "sticky",
                      left: 80,
                      top: 0,
                      backgroundColor: "#f8fafc",
                      zIndex: 10,
                      minWidth: 250,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      borderBottom: '1px solid #e2e8f0',
                      borderRight: '1px solid #e2e8f0', // divisor
                      fontWeight: 'bold',
                      color: '#475569'
                    }}
                  >
                    PRODUTO
                  </TableCell>
                  {locais.map((l) => (
                    <TableCell
                      colSpan={3}
                      key={l.id}
                      align="center"
                      sx={{
                        backgroundColor: "#3b82f6", // blue-500
                        color: "white",
                        position: "sticky",
                        top: 0,
                        zIndex: 9,
                        border: '1px solid #2563eb', // blue-600
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    >
                      {l.nome}
                    </TableCell>
                  ))}
                  <TableCell rowSpan={2} sx={{ top: 0, zIndex: 9, bgcolor: '#f1f5f9', fontWeight: 'bold' }}>Total Físico</TableCell>
                  <TableCell rowSpan={2} sx={{ top: 0, zIndex: 9, bgcolor: '#f1f5f9', fontWeight: 'bold' }}>Total Sist.</TableCell>
                  <TableCell rowSpan={2} sx={{ top: 0, zIndex: 9, bgcolor: '#f1f5f9', fontWeight: 'bold' }}>DIF Total</TableCell>
                  <TableCell rowSpan={2} sx={{ top: 0, zIndex: 9, bgcolor: '#f1f5f9', fontWeight: 'bold', textAlign: 'center' }}>Status</TableCell>
                </TableRow>
                <TableRow>
                  {locais.map((l) => (
                    <React.Fragment key={`sub-${l.id}`}>
                      <TableCell
                        sx={{
                          position: "sticky",
                          top: 36, // ajustado visualmente
                          zIndex: 8,
                          backgroundColor: "#eff6ff", // blue-50
                          color: "#1e3a8a", // blue-900
                          borderBottom: "2px solid #bfdbfe",
                          borderLeft: "2px solid #ffffff",
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          textAlign: 'center'
                        }}
                      >
                        FÍSICO
                      </TableCell>
                      <TableCell
                        sx={{
                          position: "sticky",
                          top: 36,
                          zIndex: 8,
                          backgroundColor: "#eff6ff",
                          color: "#1e3a8a",
                          borderBottom: "2px solid #bfdbfe",
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          textAlign: 'center'
                        }}
                      >
                        SISTEMA
                      </TableCell>
                      <TableCell
                        sx={{
                          position: "sticky",
                          top: 36,
                          zIndex: 8,
                          backgroundColor: "#eff6ff",
                          color: "#1e3a8a",
                          borderBottom: "2px solid #bfdbfe",
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          borderRight: '1px solid #e2e8f0'
                        }}
                      >
                        DIF
                      </TableCell>
                    </React.Fragment>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {dadosFechamento
                  .filter((item) => {
                    // Filtro de busca por código ou nome
                    if (buscaProduto) {
                      const buscaLower = buscaProduto.toLowerCase().trim();
                      const codProduto = String(item.cod_produto || "").toLowerCase();
                      const nomeProduto = String(item.nome_produto || "").toLowerCase();
                      const codSemPontos = codProduto.replace(/\./g, "");
                      const buscaSemPontos = buscaLower.replace(/\./g, "");

                      if (
                        !codProduto.includes(buscaLower) &&
                        !nomeProduto.includes(buscaLower) &&
                        !codSemPontos.includes(buscaSemPontos)
                      ) {
                        return false;
                      }
                    }

                    // Filtro de movimentação
                    if (!mostrarSomenteComMovimentacao) return true;
                    const temMovimentacao = locais.some(
                      (l) =>
                        (Number(item[l.colFisico]) || 0) !== 0 ||
                        (Number(item[l.colSistema]) || 0) !== 0
                    );
                    return temMovimentacao;
                  })
                  .map((item, index) => {
                    const totalFisico = locais.reduce(
                      (total, l) => total + (Number(item[l.colFisico]) || 0),
                      0
                    );
                    const totalSistema = locais.reduce(
                      (total, l) => total + (Number(item[l.colSistema]) || 0),
                      0
                    );
                    const totalDif = totalFisico - totalSistema;
                    const isEven = index % 2 === 0;

                    return (
                      <TableRow
                        key={index}
                        sx={{
                          "&:hover": { backgroundColor: "#f8fafc" }, // slate-50
                        }}
                      >
                        <TableCell
                          sx={{
                            position: "sticky",
                            left: 0,
                            backgroundColor: isEven ? "#ffffff" : "#f8fafc",
                            zIndex: 1, // menor que header
                            borderRight: '1px solid #cbd5e1',
                            fontWeight: 'bold',
                            color: '#334155'
                          }}
                        >
                          {item.cod_produto}
                        </TableCell>

                        <TableCell
                          sx={{
                            position: "sticky",
                            left: 80,
                            backgroundColor: isEven ? "#ffffff" : "#f8fafc",
                            zIndex: 1,
                            borderRight: '2px solid #94a3b8',
                            color: '#1e293b',
                            maxWidth: 250,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                          title={item.nome_produto}
                        >
                          {item.nome_produto}
                        </TableCell>

                        {locais.map((l) => {
                          const fisico = Number(item[l.colFisico]) || 0;
                          const sistema = Number(item[l.colSistema]) || 0;
                          const dif = fisico - sistema;

                          // Estilos condicionais
                          const corDif = dif > 0 ? '#16a34a' : dif < 0 ? '#dc2626' : '#94a3b8'; // green-600, red-600, slate-400
                          const bgCell = isEven ? '#ffffff' : '#f8fafc';

                          return (
                            <React.Fragment key={`row-${l.id}`}>
                              <TableCell
                                align="center"
                                sx={{
                                  borderLeft: "1px solid #e2e8f0",
                                  fontWeight: fisico > 0 ? "bold" : "normal",
                                  color: fisico > 0 ? '#0f172a' : '#94a3b8',
                                  bgcolor: bgCell
                                }}
                              >
                                {fisico > 0 ? fisico.toFixed(2) : "-"}
                              </TableCell>
                              <TableCell
                                align="center"
                                sx={{
                                  fontWeight: sistema !== 0 ? "bold" : "normal",
                                  color: sistema !== 0 ? '#334155' : '#94a3b8',
                                  bgcolor: bgCell
                                }}
                              >
                                {sistema !== 0 ? sistema.toFixed(2) : "-"}
                              </TableCell>
                              <TableCell
                                align="center"
                                sx={{
                                  color: corDif,
                                  fontWeight: dif !== 0 ? "bold" : "normal",
                                  bgcolor: bgCell,
                                  borderRight: '1px solid #e2e8f0'
                                }}
                              >
                                {dif === 0 && fisico > 0 && sistema > 0 ? (
                                  <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-full">OK</span>
                                ) : dif !== 0 ? dif.toFixed(2) : "-"}
                              </TableCell>
                            </React.Fragment>
                          );
                        })}

                        <TableCell sx={{ fontWeight: 'bold' }}>
                          {totalFisico !== 0 ? totalFisico.toFixed(2) : "-"}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>
                          {totalSistema !== 0 ? totalSistema.toFixed(2) : "-"}
                        </TableCell>
                        <TableCell
                          sx={{
                            color: totalDif < 0 ? "#dc2626" : totalDif > 0 ? "#16a34a" : "inherit",
                            fontWeight: totalDif !== 0 ? "bold" : "normal",
                          }}
                        >
                          {totalDif !== 0 ? totalDif.toFixed(2) : "-"}
                        </TableCell>
                        <TableCell align="center">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${totalDif === 0
                            ? "bg-green-100 text-green-700 border-green-200"
                            : totalDif > 0
                              ? "bg-blue-100 text-blue-700 border-blue-200"
                              : "bg-red-100 text-red-700 border-red-200"
                            }`}>
                            {totalDif === 0 ? "CORRETO" : totalDif > 0 ? "SOBRA" : "FALTA"}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      </main>


      {/* Snackbar / Backdrop */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <MuiAlert
          elevation={6}
          variant="filled"
          severity={snackbarSeverity}
          onClose={() => setSnackbarOpen(false)}
          sx={{ width: "100%" }}
        >
          {snackbarMsg}
        </MuiAlert>
      </Snackbar>

      <Backdrop
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          flexDirection: "column",
        }}
        open={loadingFechamento}
      >
        <CircularProgress color="inherit" />
        <Typography variant="h6" mt={2}>
          Fechando o dia... Por favor, aguarde.
        </Typography>
      </Backdrop>

      {/* Confirmação fechar dia */}
      <Dialog
        open={confirmarFechamento}
        onClose={() => setConfirmarFechamento(false)}
        PaperProps={{ style: { borderRadius: 16 } }}
      >
        <DialogTitle sx={{ fontWeight: "bold", color: "#1e293b" }}>
          Confirmar Fechamento
        </DialogTitle>
        <DialogContent>
          <Typography mb={3} color="text.secondary">
            Deseja realmente <strong>fechar o estoque</strong> do dia{" "}
            <strong>
              {new Date(`${dataConfirmacao}T12:00:00`).toLocaleDateString(
                "pt-BR"
              )}
            </strong>
            ?
            <br />
            Isso irá registrar os saldos como base para o próximo dia.
          </Typography>

          <TextField
            select
            label="Local a ser fechado"
            value={localConfirmacao}
            onChange={(e) => setLocalConfirmacao(e.target.value)}
            fullWidth
            SelectProps={{ native: true }}
            variant="outlined"
            sx={{ mt: 1 }}
          >
            {locais.map((l) => (
              <option key={l.id} value={l.id}>
                {l.id} - {l.nome}
              </option>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setConfirmarFechamento(false)}
            sx={{ color: "text.secondary", fontWeight: "bold" }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="success"
            sx={{ borderRadius: 2, fontWeight: "bold", px: 3 }}
            onClick={async () => {
              setConfirmarFechamento(false);
              await handleFechamentoDoDia();
            }}
          >
            Confirmar Fechamento
          </Button>
        </DialogActions>
      </Dialog>

      {/* Exportação */}
      <Dialog open={exportarAberto} onClose={() => setExportarAberto(false)} PaperProps={{ style: { borderRadius: 16 } }}>
        <DialogTitle sx={{ fontWeight: "bold", color: "#1e293b" }}>Exportar Fechamento</DialogTitle>
        <DialogContent>
          <Typography mb={2} color="text.secondary">
            Selecione o local que deseja exportar para Excel:
          </Typography>
          <Box mt={2}>
            <select
              value={localExportacao}
              onChange={(e) => setLocalExportacao(e.target.value)}
              style={{ width: "100%", padding: "8px", fontSize: "16px" }}
            >
              <option value="TODOS">TODOS - Todos os Locais</option>
              {locais.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.id} - {l.nome}
                </option>
              ))}
            </select>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setExportarAberto(false)}
            sx={{ color: "text.secondary", fontWeight: "bold" }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleExportacao}
            disabled={exportando}
            sx={{ borderRadius: 2, fontWeight: "bold", px: 3 }}
          >
            {exportando ? "Exportando..." : "Confirmar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🆕 Novo Produto Manual */}
      <Dialog
        open={modalProdutoAberto}
        onClose={() => setModalProdutoAberto(false)}
        PaperProps={{ style: { borderRadius: 16 } }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: "bold", fontSize: "1.25rem", color: "#e91e63" }}>
          Novo Produto Manual
        </DialogTitle>
        <DialogContent sx={{ minWidth: 300 }}>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Data"
              type="date"
              value={novoProduto.data}
              onChange={(e) =>
                setNovoProduto({ ...novoProduto, data: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Código do Produto"
              value={
                novoProduto.cod_produto
                  ? novoProduto.cod_produto
                    .toString()
                    .padStart(6, "0")
                    .replace(/(\d{3})(\d{3})/, "$1.$2")
                  : ""
              }
              disabled
              fullWidth
            />
            <Autocomplete
              options={produtosOpcoes}
              getOptionLabel={(option) => option.descricao}
              value={novoProduto}
              isOptionEqualToValue={(option, value) =>
                option.codigo_produto === value?.codigo_produto
              }
              onInputChange={(event, newInputValue) => {
                buscarProdutos(newInputValue);
              }}
              onChange={(event, newValue) => {
                if (newValue) {
                  setNovoProduto({
                    ...novoProduto,
                    descricao: newValue.descricao,
                    cod_produto: String(newValue.codigo_produto).includes(".")
                      ? String(newValue.codigo_produto)
                      : String(newValue.codigo_produto).replace(
                        /(\d{3})(\d{3})/,
                        "$1.$2"
                      ),
                  });
                }
              }}
              loading={carregandoProdutos}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Descrição do Produto"
                  fullWidth
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {carregandoProdutos ? (
                          <CircularProgress color="inherit" size={20} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            <TextField
              select
              label="Local"
              value={novoProduto.local}
              onChange={(e) =>
                setNovoProduto({ ...novoProduto, local: e.target.value })
              }
              fullWidth
              SelectProps={{ native: true }}
            >
              <option value="">Selecione um local</option>
              {locais.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.id} - {l.nome}
                </option>
              ))}
            </TextField>
            <TextField
              label="Saldo"
              type="number"
              value={novoProduto.saldo}
              onChange={(e) =>
                setNovoProduto({ ...novoProduto, saldo: e.target.value })
              }
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setModalProdutoAberto(false)}
            sx={{ color: "text.secondary", fontWeight: "bold" }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="secondary"
            sx={{ borderRadius: 2, fontWeight: "bold", px: 3, bgcolor: "#e91e63", "&:hover": { bgcolor: "#c2185b" } }}
            onClick={async () => {
              const { data, cod_produto, descricao, local, saldo } =
                novoProduto;
              if (
                !data ||
                !cod_produto ||
                !descricao ||
                !local ||
                !saldo ||
                isNaN(saldo)
              ) {
                setSnackbarSeverity("warning");
                setSnackbarMsg("⚠️ Preencha todos os campos corretamente.");
                setSnackbarOpen(true);
                return;
              }
              try {
                await axios.post(
                  `${API_BASE_URL}/produtos/manual`,
                  {
                    data,
                    cod_produto,
                    nome_produto: descricao,
                    local,
                    saldo: parseFloat(saldo),
                  }
                );
                setSnackbarSeverity("success");
                setSnackbarMsg("✅ Produto adicionado com sucesso!");
                setSnackbarOpen(true);
                setModalProdutoAberto(false);
                const res = await axios.get(
                  `${API_BASE_URL}/saldos/fechamento-geral`,
                  {
                    params: { local, data },
                  }
                );
                setDadosFechamento(res.data);
                setNovoProduto({
                  data: filtroData,
                  descricao: "",
                  cod_produto: "",
                  local: local,
                  saldo: "",
                });
                setProdutosOpcoes([]);
              } catch (err) {
                console.error("❌ Erro ao adicionar produto manual:", err);
                setSnackbarSeverity("error");
                setSnackbarMsg("❌ Falha ao adicionar produto.");
                setSnackbarOpen(true);
              }
            }}
          >
            Salvar Produto
          </Button>
        </DialogActions>
      </Dialog>

      {/* Editar Saldos Fechamento */}
      <Dialog
        open={modalEditarSaldoAberto}
        onClose={() => setModalEditarSaldoAberto(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{ style: { borderRadius: 16 } }}
      >
        <DialogTitle sx={{ fontWeight: "bold", color: "#1e3a8a" }}>Editar Saldos Fechamento</DialogTitle>
        <DialogContent dividers>
          <Box display="flex" gap={2} mb={2}>
            <TextField
              label="Data de Referência"
              type="date"
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
              InputLabelProps={{ shrink: true }}
              className="flex-1"
            />
            <TextField
              select
              label="Local"
              value={local}
              onChange={(e) => {
                setLocal(e.target.value);
                localStorage.setItem("local", e.target.value);
              }}
              SelectProps={{ native: true }}
              className="flex-1"
            >
              {locais.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.id} - {l.nome}
                </option>
              ))}
            </TextField>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Código</strong>
                </TableCell>
                <TableCell>
                  <strong>Data</strong>
                </TableCell>
                <TableCell>
                  <strong>Local</strong>
                </TableCell>
                <TableCell>
                  <strong>Saldo Final</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dadosSaldoFechamento.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.cod_produto}</TableCell>
                  <TableCell>
                    {new Date(item.data).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>{item.local}</TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={item.saldo_final}
                      onChange={(e) => {
                        const novoValor = parseFloat(e.target.value);
                        setDadosSaldoFechamento((prev) =>
                          prev.map((linha, i) =>
                            i === index
                              ? {
                                ...linha,
                                saldo_final: isNaN(novoValor) ? 0 : novoValor,
                              }
                              : linha
                          )
                        );
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setModalEditarSaldoAberto(false)}
            sx={{ fontWeight: "bold", color: "text.secondary" }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="primary"
            sx={{ borderRadius: 2, fontWeight: "bold", px: 3 }}
            onClick={async () => {
              try {
                await axios.put(
                  `${API_BASE_URL}/saldos/fechamento/lote`,
                  {
                    dados: dadosSaldoFechamento,
                  }
                );
                setSnackbarSeverity("success");
                setSnackbarMsg("✅ Saldos atualizados com sucesso!");
                setSnackbarOpen(true);
                setModalEditarSaldoAberto(false);
              } catch (err) {
                console.error("Erro ao salvar edição de saldos:", err);
                setSnackbarSeverity("error");
                setSnackbarMsg("❌ Falha ao salvar os saldos.");
                setSnackbarOpen(true);
              }
            }}
          >
            Salvar Alterações
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🆕 Modal Abrir Fechamento */}
      <Dialog
        open={abrirFechamentoAberto}
        onClose={() => setAbrirFechamentoAberto(false)}
        PaperProps={{ style: { borderRadius: 16 } }}
      >
        <DialogTitle sx={{ fontWeight: "bold", color: "#6a1b9a" }}>Abrir Fechamento</DialogTitle>
        <DialogContent sx={{ minWidth: 320 }}>
          <Box display="flex" flexDirection="column" gap={3} mt={1}>
            <TextField
              label="Data de Abertura"
              type="date"
              value={dataAbrirFechamento}
              onChange={(e) => setDataAbrirFechamento(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              select
              label="Local"
              value={localAbrirFechamento}
              onChange={(e) => setLocalAbrirFechamento(e.target.value)}
              fullWidth
              SelectProps={{ native: true }}
            >
              {locais.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.id} - {l.nome}
                </option>
              ))}
            </TextField>
            <Typography variant="body2" color="text.secondary" sx={{ bgcolor: "yellow.50", p: 1, borderRadius: 1 }}>
              ⚠️ Isso permitirá editar/ajustar o fechamento desse dia e local.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setAbrirFechamentoAberto(false)}
            sx={{ fontWeight: "bold", color: "text.secondary" }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="secondary"
            sx={{ borderRadius: 2, fontWeight: "bold", px: 3, bgcolor: "#9c27b0" }}
            onClick={handleAbrirFechamento}
          >
            Confirmar Abertura
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transferir Saldo Entre Produtos */}
      <Dialog
        open={modalTransferirProduto}
        onClose={() => setModalTransferirProduto(false)}
        PaperProps={{ style: { borderRadius: 16 } }}
      >
        <DialogTitle sx={{ fontWeight: "bold", color: "#d32f2f" }}>Transferir Saldo Entre Produtos</DialogTitle>
        <DialogContent sx={{ minWidth: 420 }}>
          <Box display="flex" flexDirection="column" gap={3} mt={1}>
            <Box display="flex" gap={2}>
              <TextField
                label="Data"
                type="date"
                value={dadosTransferenciaProduto.data}
                onChange={(e) =>
                  setDadosTransferenciaProduto({
                    ...dadosTransferenciaProduto,
                    data: e.target.value,
                  })
                }
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                select
                label="Local"
                value={dadosTransferenciaProduto.local}
                onChange={(e) =>
                  setDadosTransferenciaProduto({
                    ...dadosTransferenciaProduto,
                    local: e.target.value,
                  })
                }
                fullWidth
                SelectProps={{ native: true }}
              >
                <option value="">Selecione um local</option>
                {locais.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.id} - {l.nome}
                  </option>
                ))}
              </TextField>
            </Box>

            <Autocomplete
              options={produtosOpcoes}
              getOptionLabel={(option) => option.descricao}
              onInputChange={(event, newInputValue) => {
                buscarProdutos(newInputValue);
              }}
              onChange={(event, newValue) => {
                setDadosTransferenciaProduto((prev) => ({
                  ...prev,
                  de: newValue,
                }));
              }}
              loading={carregandoProdutos}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Produto de (Origem)"
                  fullWidth
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {carregandoProdutos ? (
                          <CircularProgress color="inherit" size={20} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />

            <Autocomplete
              options={produtosOpcoes}
              getOptionLabel={(option) => option.descricao}
              onInputChange={(event, newInputValue) => {
                buscarProdutos(newInputValue);
              }}
              onChange={(event, newValue) => {
                setDadosTransferenciaProduto((prev) => ({
                  ...prev,
                  para: newValue,
                }));
              }}
              loading={carregandoProdutos}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Para o Produto (Destino)"
                  fullWidth
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {carregandoProdutos ? (
                          <CircularProgress color="inherit" size={20} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />

            <TextField
              label="Quantidade a transferir"
              type="number"
              value={dadosTransferenciaProduto.quantidade}
              onChange={(e) =>
                setDadosTransferenciaProduto({
                  ...dadosTransferenciaProduto,
                  quantidade: e.target.value,
                })
              }
              fullWidth
              variant="outlined"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setModalTransferirProduto(false)}
            sx={{ fontWeight: "bold", color: "text.secondary" }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            sx={{ borderRadius: 2, fontWeight: "bold", px: 3 }}
            onClick={async () => {
              const { data, de, para, quantidade } = dadosTransferenciaProduto;
              if (!data || !de || !para || !quantidade) {
                setSnackbarSeverity("warning");
                setSnackbarMsg("⚠️ Preencha todos os campos.");
                setSnackbarOpen(true);
                return;
              }
              const cod_origem = String(de.codigo_produto)
                .padStart(6, "0")
                .replace(/(\d{3})(\d{3})/, "$1.$2");
              const cod_destino = String(para.codigo_produto)
                .padStart(6, "0")
                .replace(/(\d{3})(\d{3})/, "$1.$2");
              const payload = {
                data,
                local,
                cod_origem,
                cod_destino,
                quantidade: parseFloat(quantidade),
              };
              const url = `${API_BASE_URL}/transferencia-saldo`;
              try {
                const response = await axios.post(url, payload);
                console.log("✅ Resposta da API:", response.data);
                setSnackbarSeverity("success");
                setSnackbarMsg("✅ Transferência realizada com sucesso!");
                setSnackbarOpen(true);
                setModalTransferirProduto(false);
              } catch (err) {
                console.error("❌ Erro ao transferir saldo:", err);
                setSnackbarSeverity("error");
                setSnackbarMsg("❌ Falha ao transferir saldo.");
                setSnackbarOpen(true);
              }
            }}
          >
            Confirmar Transferência
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal: Dashboard de Diferenças */}
      <Dialog
        open={dashboardAberto}
        onClose={() => setDashboardAberto(false)}
        fullWidth
        maxWidth="lg"
        PaperProps={{ style: { borderRadius: 16, backgroundColor: '#f8fafc' } }}
      >
        <DialogTitle sx={{ fontWeight: 'bold', borderBottom: '1px solid #e2e8f0', bgcolor: 'white' }}>
          Dashboard de Faltas e Sobras do Dia {filtroData && new Date(`${filtroData}T12:00:00`).toLocaleDateString('pt-BR')}
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
            {locais.map(l => {
              let qtdeFalta = 0;
              let qtdeSobra = 0;
              let diffFalta = 0;
              let diffSobra = 0;

              dadosFechamento.forEach(item => {
                const fisico = Number(item[l.colFisico]) || 0;
                const sistema = Number(item[l.colSistema]) || 0;
                const dif = fisico - sistema;
                if (dif < -0.01) { // margem pq flutuante pode ter erro minúsculo
                  qtdeFalta++;
                  diffFalta += Math.abs(dif);
                } else if (dif > 0.01) {
                  qtdeSobra++;
                  diffSobra += dif;
                }
              });

              return (
                <div key={l.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-800 text-lg mb-3 border-b border-slate-100 pb-2 flex items-center justify-between">
                    <span>{l.nome}</span>
                    <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 font-mono">ID {l.id}</span>
                  </h3>
                  <div className="flex justify-between gap-3">
                    <div className="flex-1 bg-red-50 p-3 rounded-lg border border-red-100 flex flex-col justify-between">
                      <div className="text-red-500 text-[10px] font-bold uppercase tracking-wider mb-1">Qtd Itens em Falta</div>
                      <div className="text-2xl font-black text-red-600 leading-none">{qtdeFalta}</div>
                      <div className="text-xs font-bold text-red-400 mt-2">Desfalque Total: <br /> -{diffFalta.toFixed(2)}</div>
                    </div>
                    <div className="flex-1 bg-emerald-50 p-3 rounded-lg border border-emerald-100 flex flex-col justify-between">
                      <div className="text-emerald-500 text-[10px] font-bold uppercase tracking-wider mb-1">Qtd Itens com Sobra</div>
                      <div className="text-2xl font-black text-emerald-600 leading-none">{qtdeSobra}</div>
                      <div className="text-xs font-bold text-emerald-400 mt-2">Excesso Total: <br /> +{diffSobra.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: 'white', borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setDashboardAberto(false)} variant="outlined" sx={{ fontWeight: 'bold', borderRadius: 2 }}>Fechar</Button>
        </DialogActions>
      </Dialog>
      {/* Loading Overlay */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={isLoadingData || loadingFechamento}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </div>
  );
};

export default FechamentoGeral;
