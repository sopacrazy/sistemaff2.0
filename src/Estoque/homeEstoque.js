import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Grid,
  Chip,
  Tooltip,
  Button,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  Autocomplete,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import InventoryIcon from "@mui/icons-material/Inventory";
import MoveDownIcon from "@mui/icons-material/MoveDown";
import ReplayIcon from "@mui/icons-material/Replay";
import WarningIcon from "@mui/icons-material/Warning";
import StorageIcon from "@mui/icons-material/Storage";
import EditNoteIcon from "@mui/icons-material/EditNote";
import HistoryIcon from "@mui/icons-material/History";
import PrintIcon from "@mui/icons-material/Print";
import LibraryAddIcon from "@mui/icons-material/LibraryAdd"; // ícone do botão novo
import IconButton from "@mui/material/IconButton";
import Badge from "@mui/material/Badge";
import ViewInArIcon from "@mui/icons-material/ViewInAr";
import HomeIcon from "@mui/icons-material/Home";
import axios from "axios";
import Link from "@mui/material/Link"; // Keep existing if needed, but we prefer react-router-dom Link for navigation if used.
// Remove DefaultAppBar import
import { Link as RouterLink } from "react-router-dom";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import VisibilityIcon from "@mui/icons-material/Visibility";
import Alert from "@mui/material/Alert";
import MuiAlert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import { getDataTrabalho, setDataTrabalho } from "../utils/dataTrabalho";
import dayjs from "dayjs";
import { API_BASE_URL } from "../utils/apiConfig";

const MOTIVOS_OBRIGATORIOS = [
  "Falta",
  "Inversão",
  "Faltou comprar",
  "Faturamento Errado",
];

const getMotivoLabel = (motivo) => {
  if (motivo === "Faturamento Errado") return "Fat Errado";
  return motivo;
};

// --- Components ---

const Modal = ({ isOpen, onClose, title, children, maxWidth = "sm" }) => {
  if (!isOpen) return null;

  const widthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    full: "max-w-full mx-4",
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className={`bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full ${widthClasses[maxWidth] || "max-w-sm"
          } overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]`}
      >
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

const ActionCard = ({ title, icon, color, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`relative overflow-hidden group p-6 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-xl transition-all duration-300 text-left w-full h-full flex flex-col justify-between ${disabled
      ? "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800"
      : "bg-white dark:bg-slate-800 cursor-pointer"
      }`}
  >
    <div className={`p-3 rounded-2xl w-fit mb-4 ${color} text-white shadow-lg`}>
      <span className="material-symbols-rounded text-2xl">{icon}</span>
    </div>
    <div>
      <h3 className="text-lg font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {title}
      </h3>
      <div className="h-1 w-12 rounded-full mt-2 bg-slate-100 dark:bg-slate-700 group-hover:bg-blue-500 transition-all duration-500 group-hover:w-full"></div>
    </div>
    <div className="absolute -bottom-6 -right-6 text-9xl opacity-5 group-hover:scale-110 transition-transform duration-500 pointer-events-none text-slate-800 dark:text-white">
      <span className="material-symbols-rounded">{icon}</span>
    </div>
  </button>
);

const HomeEstoque = () => {
  const navigate = useNavigate();
  const [saldos, setSaldos] = useState([]);
  // Moved state declarations to top to avoid TDZ errors
  const [openAvariaModal, setOpenAvariaModal] = useState(false);
  const [avarias, setAvarias] = useState({});
  const username = sessionStorage.getItem("username") || "sistema";
  const [origemUsuario, setOrigemUsuario] = useState(null);
  const filtroData = getDataTrabalho();
  const [confirmarFechamento, setConfirmarFechamento] = useState(false);
  const [confirmarPreFechamento, setConfirmarPreFechamento] = useState(false);
  const [dataFechamentoAnterior, setDataFechamentoAnterior] = useState(null);
  const [locaisPermitidos] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [openModal, setOpenModal] = useState(false);
  const [search, setSearch] = useState("");
  const [fisico, setFisico] = useState({});
  const [loadingSync] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [openDevolucaoModal, setOpenDevolucaoModal] = useState(false);
  const [devolucoes, setDevolucoes] = useState({});
  const [openDetalhesModal, setOpenDetalhesModal] = useState(false);
  const [detalhesProduto, setDetalhesProduto] = useState(null);
  const [saldosProtheus, setSaldosProtheus] = useState([]);
  const [presentesSaldoProdutos, setPresentesSaldoProdutos] = useState(
    new Set()
  );
  const [movimentacoes, setMovimentacoes] = useState({
    entrada: [],
    compras: [],
    venda: [],
    transferencia: [],
    avaria: [],
    devolucao: [],
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [contagemComPendencias, setContagemComPendencias] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("info"); // "success", "warning", "error"
  const [loadingFechamento, setLoadingFechamento] = useState(false);
  const [loadingFechamentoMsg, setLoadingFechamentoMsg] = useState(
    "Fechando o dia... Por favor, aguarde."
  );
  const [preFechamentoRealizado, setPreFechamentoRealizado] = useState(false);
  const [mostrarTodos, setMostrarTodos] = useState(false);

  const [editingCod, setEditingCod] = useState(null);
  const [editingValue, setEditingValue] = useState("");

  const [askRelFaltas, setAskRelFaltas] = useState(false);
  const [fechamentoParams, setFechamentoParams] = useState(null);

  // Observações por item (chave = cod)
  const [observacoes, setObservacoes] = useState({}); // { [cod]: { texto, atualizadoEm } }

  const [openObsModal, setOpenObsModal] = useState(false);
  const [obsItem, setObsItem] = useState(null); // item selecionado
  const [obsText, setObsText] = useState("");
  const [salvandoObs, setSalvandoObs] = useState(false);
  const [motivoSelecionado, setMotivoSelecionado] = useState("");
  const [produtosInversao, setProdutosInversao] = useState([]);
  const [searchProdutoInversao, setSearchProdutoInversao] = useState("");
  const [listaInversoes, setListaInversoes] = useState([{ produto: null, qtd: "" }]);

  // [NOVO] controla perfil e permissão
  const [perfilUsuario, setPerfilUsuario] = useState(null);
  const [perfilLoading, setPerfilLoading] = useState(true);
  const isGestor = (() => {
    const tipo = (perfilUsuario?.tipo || "").trim().toLowerCase();
    return tipo === "gestor" || tipo === "admin";
  })();

  // --- Header & Layout States ---
  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [tempLocal, setTempLocal] = useState("08");
  const [tempDate, setTempDate] = useState("");

  // Header Handlers
  const permissoesStr =
    sessionStorage.getItem("permissoes") ||
    localStorage.getItem("permissoes") ||
    "[]";
  // Permite trocal local se for gestor
  const podeTrocarLocal = isGestor;

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login");
  };
  const toggleDarkMode = () =>
    document.documentElement.classList.toggle("dark");
  const openLocalModal = () => {
    setIsLocalModalOpen(true);
  };
  const saveLocal = async () => {
    try {
      // Atualiza no banco de dados para persistir
      await axios.put(`${API_BASE_URL}/usuarios/${username}/local`, {
        local: tempLocal
      });

      sessionStorage.setItem("local", tempLocal);
      sessionStorage.setItem("origem", tempLocal);
      setIsLocalModalOpen(false);

      // Recarrega para aplicar mudanças em todos os componentes
      window.location.reload();
    } catch (error) {
      console.error("Erro ao salvar local:", error);
      setSnackbarSeverity("error");
      setSnackbarMsg(error.response?.data?.error || "Falha ao salvar local.");
      setSnackbarOpen(true);
    }
  };
  const openDateModal = () => {
    // initialize with current global date (filtroData) if available, else today
    setTempDate(filtroData || new Date().toISOString().split("T")[0]);
    setIsDateModalOpen(true);
  };
  const saveDate = () => {
    setDataTrabalho(tempDate);
    setIsDateModalOpen(false);
    window.location.reload();
  };

  // Sync Local Storage for Origem logic if needed
  useEffect(() => {
    const storedLocal =
      sessionStorage.getItem("local") ||
      sessionStorage.getItem("origem") ||
      "08";
    if (!origemUsuario && storedLocal) setOrigemUsuario(storedLocal);
  }, [origemUsuario]);

  const produtosPendentes = saldos.filter((item) => {
    const saldoInicial = Number(item.saldoInicial);
    const valorFisico = fisico[item.cod];
    const valorFisicoNormalizado = (() => {
      if (valorFisico === undefined || valorFisico === "") return null;
      const numero = Number(
        typeof valorFisico === "string"
          ? valorFisico.replace(",", ".")
          : valorFisico
      );
      return isNaN(numero) ? null : numero;
    })();

    // Considera pendente se:
    // 1. Saldo inicial é diferente de 0
    // 2. Valor físico é undefined, vazio, 0 ou "0,00"
    const isPendente =
      saldoInicial !== 0 &&
      (valorFisicoNormalizado === null || valorFisicoNormalizado === 0);

    return isPendente;
  });

  const formatCodParaProtheus = (cod) => {
    const s = normalizeCod(cod || "");
    return s.length > 3 ? `${s.slice(0, 3)}.${s.slice(3)}` : s;
  };

  const [fechamentoRealizado, setFechamentoRealizado] = useState(false);
  const itemsPerPage = 50;
  // controla se mostra a coluna do Protheus
  const SHOW_PROTHEUS = false;

  // substitua a sua atual
  // substitua sua normalizeCod por esta
  const normalizeCod = (cod) =>
    String(cod ?? "")
      .toUpperCase()
      .replace(/[.\-_/ \t]/g, "") // remove ponto, traço, barra e espaços
      .replace(/^0+(?=\d)/, ""); // remove zeros à esquerda (opcional)

  const [openLogModal, setOpenLogModal] = useState(false);
  const [logsFechamento, setLogsFechamento] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [modalTransfLogsOpen, setModalTransfLogsOpen] = useState(false);
  const [logsTransf, setLogsTransf] = useState([]);

  const abrirLogsTransferencia = async (numero) => {
    if (!numero || numero === "-") return;
    try {
      const res = await axios.get(`${API_BASE_URL}/transferencias/${numero}/logs`);
      setLogsTransf(res.data);
      setModalTransfLogsOpen(true);
    } catch (err) {
      setSnackbarSeverity("error");
      setSnackbarMsg("Erro ao buscar logs da transferência.");
      setSnackbarOpen(true);
    }
  };

  const carregarLogsFechamento = async () => {
    if (!origemUsuario || !filtroData) return;
    setLoadingLogs(true);
    try {
      const { data } = await axios.get(`${API_BASE_URL}/fechamento/logs`, {
        params: { data_ref: filtroData, local: String(origemUsuario) },
      });
      // ordena mais novos primeiro, caso o back não ordene
      const ordenados = Array.isArray(data)
        ? [...data].sort(
          (a, b) => new Date(b.criado_em) - new Date(a.criado_em)
        )
        : [];
      setLogsFechamento(ordenados);
      setOpenLogModal(true);
    } catch (e) {
      setSnackbarSeverity("error");
      setSnackbarMsg("Não foi possível carregar o log.");
      setSnackbarOpen(true);
    } finally {
      setLoadingLogs(false);
    }
  };

  // helpers só pra texto bonito
  const labelTipo = (t) => {
    switch ((t || "").toLowerCase()) {
      case "pre":
        return "Pré-fechamento";
      case "fechamento":
        return "Fechamento";
      case "reabertura_pre":
        return "Reabertura (pré)";
      case "reabertura_fech":
        return "Reabertura (fech.)";
      default:
        return t || "-";
    }
  };

  // helper em memória para pegar nome do Protheus pelo código
  const nomesFromProtheus = useMemo(() => {
    const map = {};
    (saldosProtheus || []).forEach((r) => {
      // Backend já normaliza o código (remove pontos, traços, espaços)
      const cod = r.cod_produto || "";
      map[cod] = (r.nome_produto || "").trim();

      // DEBUG: Log dos produtos carregados do Protheus
      if (cod && !map[cod]) {
        console.log(`📦 Protheus: ${cod} = ${r.nome_produto}`);
      }
    });
    return map;
  }, [saldosProtheus]);

  const nomeExibidoProduto = (item) =>
    (item?.produto && item.produto !== "Desconhecido"
      ? item.produto
      : nomesFromProtheus[normalizeCod(item.cod)]) || "Desconhecido";

  // nome do produto (preferindo o do Protheus quando "Desconhecido")
  const nomeDoProduto = (item) =>
    item?.produto && item.produto !== "Desconhecido"
      ? item.produto
      : nomesFromProtheus[normalizeCod(item.cod)] || "Desconhecido";
  // Busca (só o que faltar) e devolve um mapa completo de observações { [cod]: { texto, atualizadoEm } }
  const coletarObservacoes = async (codigos) => {
    const faltando = codigos.filter((c) => observacoes[c] === undefined);

    // copia local do estado atual para usar já nesta impressão
    const obsMap = { ...observacoes };

    if (faltando.length > 0) {
      try {
        const reqs = faltando.map((cod) =>
          axios
            .get(`${API_BASE_URL}/produto/observacao`, {
              params: { cod, data: filtroData },
              headers: { "x-local": origemUsuario },
            })
            .then(({ data }) => ({ cod, data }))
            .catch(() => ({ cod, data: {} }))
        );

        const res = await Promise.all(reqs);
        res.forEach(({ cod, data }) => {
          const texto = (data?.texto || "").trim();
          obsMap[cod] = texto
            ? { texto, atualizadoEm: data.atualizado_em }
            : { texto: "" };
        });

        // atualiza cache do estado (assíncrono, mas ok para a tela)
        setObservacoes((prev) => ({ ...prev, ...obsMap }));
      } catch {
        // silencioso
      }
    }

    return obsMap;
  };

  // arredonda para 2 casas
  const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

  // normaliza status com/sem acento
  const norm = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();

  const fetchProdutoInversao = async (search) => {
    if (!search || search.length < 3) {
      setProdutosInversao([]);
      return;
    }
    try {
      const response = await axios.get(`${API_BASE_URL}/produto`, {
        params: { search: search },
      });
      setProdutosInversao(response.data);
    } catch (error) {
      console.error("Erro ao buscar produtos para inversão:", error);
      setProdutosInversao([]);
    }
  };

  // retorna { total: number, numeros: string[] } das avarias "Pendente" do dia/local
  const fetchAvariasPendentes = async () => {
    try {
      const { data } = await axios.get(
        `${API_BASE_URL}/estoque/avarias-pendentes`,
        { params: { data: filtroData, local: origemUsuario } }
      );
      // aceita lista cheia ou objetos; dedup por "numero"
      const lista = Array.isArray(data) ? data : data?.rows || [];
      const pendentes = (lista || []).filter(
        (a) => norm(a.status) === "pendente"
      );

      const numerosUnicos = Array.from(new Set(pendentes.map((a) => a.numero)));
      return { total: numerosUnicos.length, numeros: numerosUnicos };
    } catch (err) {
      console.error("❌ Erro ao buscar avarias pendentes:", err);
      // em caso de erro, não bloqueia por segurança (retorna 0)
      return { total: 0, numeros: [] };
    }
  };

  // itens com status "Falta" => saldo > físico
  const produtosComFalta = useMemo(() => {
    return (saldos || [])
      .map((it) => {
        const fis = fisico[it.cod] ?? it.fisico ?? 0;
        const fisVal = Number(String(fis).replace(",", ".")) || 0;
        const saldoVal = Number(it.saldo || 0);
        const falta = saldoVal - fisVal;
        return { ...it, _fisico: fisVal, _saldo: saldoVal, _falta: falta };
      })
      .filter((it) => it._falta > 0)
      .sort((a, b) => b._falta - a._falta);
  }, [saldos, fisico]);

  const [dialogLocais, setDialogLocais] = useState(false);

  const trocarLocal = (novoLocal) => {
    localStorage.setItem("origem", novoLocal);
    window.location.reload(); // força atualização com novo local
  };

  // === helper para abrir o PDF de faltas ===
  const API_BASE =
    API_BASE_URL ||
    window.__API_BASE ||
    document.querySelector('meta[name="api-base"]')?.content ||
    "http://localhost:3001";

  // 🔔 helper para registrar log de fechamento/pré/reabertura
  const registrarLogFechamento = async ({
    tipo, // 'pre' | 'fechamento' | 'reabertura_pre' | 'reabertura_fech'
    status = "success", // 'success' | 'error'
    mensagem = "",
    qtd_itens = 0,
    payload = null,
  }) => {
    try {
      await axios.post(`${API_BASE}/fechamento/logs`, {
        data_ref: filtroData,
        local: String(origemUsuario),
        usuario: username,
        tipo,
        status,
        mensagem,
        qtd_itens,
        payload_json: payload,
      });
    } catch (e) {
      // não quebra UX se o log falhar; apenas reporta no console
      console.error(
        "Falha ao registrar log de fechamento:",
        e?.response?.data || e
      );
    }
  };

  function abrirRelatorioFaltas({ data, local }) {
    const qs = new URLSearchParams({ data, local }).toString();
    window.open(`${API_BASE}/relatorios-public/faltas/pdf?${qs}`, "_blank");
  }

  const podeEditar = !(fechamentoRealizado || preFechamentoRealizado);
  // OBS em somente leitura apenas quando HOUVE FECHAMENTO (pré-fechamento não bloqueia)
  const somenteLeituraObs = Boolean(fechamentoRealizado);

  const startEdit = (cod, current) => {
    if (!podeEditar) return;
    setEditingCod(cod);
    setEditingValue(
      current === undefined || current === null
        ? ""
        : String(current).replace(".", ",")
    );
  };

  const cancelEdit = () => {
    setEditingCod(null);
    setEditingValue("");
  };

  const saveInlineFisico = async (cod, raw, indexAtual) => {
    const str = String(raw ?? "").trim();
    if (str === "") {
      cancelEdit();
      return;
    }

    const valorNorm = str.replace(",", ".");
    const qtd = Number(valorNorm);

    if (!Number.isFinite(qtd) || qtd < 0) {
      cancelEdit();
      return;
    }

    const atual = (() => {
      const linha = saldos.find((p) => p.cod === cod);
      if (linha && linha.fisico !== undefined && linha.fisico !== null) {
        return Number(linha.fisico);
      }
      const f = fisico[cod];
      if (f === undefined || f === "") return 0;
      return Number(String(f).replace(",", "."));
    })();

    if (Number(atual) === qtd) {
      // Mesmo sem alteração, pula pro próximo
      const proximoIndex = indexAtual + 1;
      if (proximoIndex < paginatedSaldos.length) {
        const proxItem = paginatedSaldos[proximoIndex];
        setTimeout(() => startEdit(proxItem.cod, proxItem.fisico), 30);
      }
      return cancelEdit();
    }

    const payload = {
      data: filtroData,
      local: origemUsuario,
      itens: qtd > 0 ? [{ cod, qtd }] : [],
      excluir: qtd === 0 ? [{ cod }] : [],
    };

    try {
      await axios.post(`${API_BASE_URL}/estoque/contagem`, payload);

      setSaldos((prev) =>
        prev.map((p) => (p.cod === cod ? { ...p, fisico: qtd } : p))
      );
      setFisico((prev) => ({ ...prev, [cod]: qtd }));

      setSnackbarSeverity("success");
      setSnackbarMsg("Contagem salva.");
      setSnackbarOpen(true);

      // 🔹 Pula para o próximo item na lista
      const proximoIndex = indexAtual + 1;
      if (proximoIndex < paginatedSaldos.length) {
        const proxItem = paginatedSaldos[proximoIndex];
        setTimeout(() => {
          startEdit(proxItem.cod, proxItem.fisico);
        }, 50);
      }
    } catch (err) {
      console.error("Erro ao salvar contagem inline:", err);
      setSnackbarSeverity("error");
      setSnackbarMsg("Falha ao salvar contagem.");
      setSnackbarOpen(true);
    } finally {
      // Só cancela se não for pular
    }
  };

  const handleAbrirObs = async (item) => {
    setObsItem(item);

    // 1. Limpa o estado
    setObsText("");
    setMotivoSelecionado("");
    setListaInversoes([{ produto: null, qtd: "" }]);
    setProdutosInversao([]);

    setOpenObsModal(true);

    // Tenta pré-carregar do back
    try {
      const { data } = await axios.get(`${API_BASE_URL}/produto/observacao`, {
        params: { cod: item.cod, data: filtroData },
        headers: { "x-local": origemUsuario },
      });

      if (data) {
        // Carrega o motivo e o texto (Motivo agora vem em data.motivo)
        const fullText = (data.texto || "").trim();
        const motivoFound = (data.motivo || "").trim();

        // Se houver motivo salvo, preenche o Radio Button
        if (MOTIVOS_OBRIGATORIOS.includes(motivoFound)) {
          setMotivoSelecionado(motivoFound);
        } else {
          setMotivoSelecionado("");
        }

        setObsText(fullText); // O texto agora é o texto limpo

        // Lógica para Inversão
        if (motivoFound === "Inversão") {
          if (Array.isArray(data.inversoes) && data.inversoes.length > 0) {
            setListaInversoes(data.inversoes.map(inv => ({
              produto: {
                codigo_produto: inv.cod_produto_inversao,
                descricao: inv.produto_inversao_nome || `Produto Invertido (Cód: ${inv.cod_produto_inversao})`
              },
              qtd: inv.qtd_inversao != null ? String(inv.qtd_inversao) : ""
            })));
          } else if (data.cod_produto_inversao) {
            // Fallback legacy
            setListaInversoes([{
              produto: {
                codigo_produto: data.cod_produto_inversao,
                descricao: data.produto_inversao_nome || `Produto Invertido (Cód: ${data.cod_produto_inversao})`
              },
              qtd: data.qtd_inversao != null ? String(data.qtd_inversao) : ""
            }]);
          }
        }

        // Atualiza a memória
        setObservacoes((prev) => ({
          ...prev,
          [item.cod]: { texto: fullText, atualizadoEm: data.atualizado_em },
        }));
      }
    } catch (e) {
      // silencioso
    }
  };

  const handleSalvarObs = async () => {
    if (!obsItem) return;

    // 1. VALIDAÇÃO OBRIGATÓRIA (garante que há um motivo)
    if (!motivoSelecionado) {
      setSnackbarSeverity("error");
      setSnackbarMsg("Selecione um motivo obrigatório.");
      setSnackbarOpen(true);
      return;
    }

    // 2. VALIDAÇÃO ESPECÍFICA PARA INVERSÃO
    if (motivoSelecionado === "Inversão") {
      const temInversaoValida = listaInversoes.some(inv => inv.produto?.codigo_produto && Number(inv.qtd) > 0);
      if (!temInversaoValida) {
        setSnackbarSeverity("error");
        setSnackbarMsg("Se o motivo é Inversão, informe ao menos um produto e quantidade.");
        setSnackbarOpen(true);
        return;
      }
    }

    // evita salvar se estiver fechado (somente leitura)
    if (somenteLeituraObs) {
      setSnackbarSeverity("warning");
      setSnackbarMsg("Observações bloqueadas após o fechamento deste local.");
      setSnackbarOpen(true);
      return;
    }

    setSalvandoObs(true);
    try {
      const textoTrim = (obsText || "").trim();

      // 3. Monta o Payload para a API (sem concatenação no texto)
      const payload = {
        cod: obsItem.cod,
        data: filtroData,
        texto: textoTrim,
        usuario: username,
        motivo: motivoSelecionado,
        // Envia a lista filtrada (somente inversões completas)
        inversoes: motivoSelecionado === "Inversão" 
          ? listaInversoes
              .filter(inv => inv.produto?.codigo_produto && Number(inv.qtd) > 0)
              .map(inv => ({
                cod_produto_inversao: inv.produto.codigo_produto,
                qtd_inversao: Number(inv.qtd)
              }))
          : []
      };

      // Rota POST original (agora suporta o payload novo)
      await axios.post(`${API_BASE_URL}/produto/observacao`, payload, {
        headers: { "x-local": origemUsuario },
      });

      // 4. Atualiza o estado local (usando o texto LIMPO, sem concatenação)
      setObservacoes((prev) => {
        const novo = { ...prev };
        if (textoTrim || motivoSelecionado) {
          // Salva se houver texto ou motivo
          novo[obsItem.cod] = {
            texto: textoTrim,
            atualizadoEm: new Date().toISOString(),
          };
        } else {
          delete novo[obsItem.cod];
        }
        return novo;
      });

      setSnackbarSeverity("success");
      setSnackbarMsg("Observação salva.");
      setSnackbarOpen(true);
      setOpenObsModal(false);
      setObsItem(null);
      setObsText("");
      setMotivoSelecionado("");
      setListaInversoes([{ produto: null, qtd: "" }]);

      // Se foi uma inversão, recarrega os saldos para atualizar a coluna Inv. na hora
      if (motivoSelecionado === "Inversão") {
        fetchAllData();
      }

    } catch (err) {
      console.error("❌ Erro ao salvar observação:", err);
      setSnackbarSeverity("error");
      setSnackbarMsg("Falha ao salvar observação.");
      setSnackbarOpen(true);
    } finally {
      setSalvandoObs(false);
    }
  };

  const addInversaoRow = () => {
    setListaInversoes([...listaInversoes, { produto: null, qtd: "" }]);
  };

  const updateInversaoRow = (idx, field, value) => {
    const nova = [...listaInversoes];
    nova[idx] = { ...nova[idx], [field]: value };
    setListaInversoes(nova);
  };

  const removeInversaoRow = (idx) => {
    if (listaInversoes.length > 1) {
      setListaInversoes(listaInversoes.filter((_, i) => i !== idx));
    } else {
      setListaInversoes([{ produto: null, qtd: "" }]);
    }
  };

  const handleFisicoKeyDown = (e, cod, index) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveInlineFisico(cod, editingValue, index); // agora passo o index atual
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search, mostrarTodos]);

  useEffect(() => {
    setObservacoes({});
  }, [origemUsuario, filtroData]);

  const buscarUltimoFechamento = useCallback(
    async (dataReferencia) => {
      const data = new Date(dataReferencia);
      for (let i = 1; i <= 25; i++) {
        const tentativa = new Date(data);
        tentativa.setDate(data.getDate() - i);
        const tentativaStr = tentativa.toISOString().split("T")[0];

        try {
          const res = await axios.get(
            `${API_BASE_URL}/saldos/fechamento/${tentativaStr}`,
            {
              params: { local: origemUsuario },
            }
          );
          if (res.data?.fechado) {
            setDataFechamentoAnterior(tentativaStr);
            return tentativaStr;
          }
        } catch (err) {
          console.warn("Tentativa falhou para data:", tentativaStr);
        }
      }
      return null;
    },
    [origemUsuario]
  ); // 👈 Dependências aqui

  // 🔧 HELPER: salva faltas do fechamento e retorna quantos itens foram gravados
  const salvarFaltasDoFechamento = async (minFalta = 0.0) => {
    try {
      // pega itens com falta (saldo > físico) e opcionalmente ignora micro-diferenças
      const itensBase = (produtosComFalta || []).filter(
        (it) => (it?._falta || 0) > minFalta
      );

      // carrega observações destes códigos (best effort)
      const cods = itensBase.map((it) => it.cod);
      let obsMap = {};
      try {
        obsMap = await coletarObservacoes(cods);
      } catch {
        obsMap = {};
      }

      // monta payload
      const itens = itensBase.map((it) => ({
        cod_produto: it.cod,
        produto: nomeDoProduto(it),
        saldo_calc: Number(it._saldo || 0),
        fisico: Number(it._fisico || 0),
        falta: Number(it._falta || 0),
        observacao: (
          obsMap[it.cod]?.texto ||
          observacoes[it.cod]?.texto ||
          ""
        ).trim(),
        local: String(origemUsuario), // 👈 incluir local por item
        data: filtroData, // 👈 opcional, se o back usa por linha
      }));

      if (!itens.length) {
        setSnackbarSeverity("info");
        setSnackbarMsg("Nenhum item em falta para salvar.");
        setSnackbarOpen(true);
        return 0;
      }

      const body = {
        data: filtroData,
        local: origemUsuario,
        usuario: username,
        itens,
      };

      const { data: resp } = await axios.post(
        `${API_BASE_URL}/estoque/faltas-fechamento`,
        body,
        {
          headers: {
            "x-user": username || "sistema", // 👈 coerente com o resto do app
            "x-local": String(origemUsuario || ""),
          },
        }
      );

      const saved = Number(resp?.saved ?? 0);
      setSnackbarSeverity("success");
      setSnackbarMsg(`Faltas enviadas: ${itens.length} • gravadas: ${saved}`);
      setSnackbarOpen(true);
      return saved;
    } catch (err) {
      console.error(
        "❌ salvarFaltasDoFechamento ERRO:",
        err?.response?.data || err
      );
      setSnackbarSeverity("error");
      setSnackbarMsg("Falha ao salvar faltas do fechamento.");
      setSnackbarOpen(true);
      return 0;
    }
  };

  const handlePrintContagem = () => {
    // 1) dados que iremos imprimir (somente o necessário)
    // use produtosFiltrados (todos os itens conforme busca/filtros)
    // ou troque por paginatedSaldos para imprimir só a página atual
    const base = produtosFiltrados; // ou: const base = paginatedSaldos;
    const rows = (base || []).map((p) => ({
      cod: p.cod ?? p.cod_produto ?? p.codigo ?? "",
      nome: p.produto ?? p.nome_produto ?? p.nome ?? "",
    }));

    // 2) meta (opcional)
    const dataTrabalho =
      typeof getDataTrabalho === "function"
        ? getDataTrabalho()
        : dayjs().format("YYYY-MM-DD");

    const titulo = "Contagem Física de Produtos";
    const subtitulo = `Data de trabalho: ${dayjs(dataTrabalho).format(
      "DD/MM/YYYY"
    )}`;

    // 3) HTML de impressão
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${titulo}</title>
<style>
  :root { --ink:#111; --muted:#666; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: var(--ink); margin: 16px; }
  h1 { font-size: 18px; margin: 0; }
  .sub { color: var(--muted); margin-top: 2px; font-size: 12px; }
  .hint { color: var(--muted); font-size: 11px; margin-top: 8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; font-size: 12px; }
  th { text-align: left; background:#f6f6f6; }
  .box { height: 18px; width: 90px; border: 1px solid #000; display: inline-block; }
  @page { size: A4; margin: 12mm; }
  @media print { .no-print { display: none !important; } body { margin: 0; } }
</style>
</head>
<body>
  <div style="display:flex; justify-content:space-between; align-items:flex-start;">
    <div>
      <h1>${titulo}</h1>
      <div class="sub">${subtitulo}</div>
      <div class="hint">Preencha a quantidade física na coluna “Contagem”.</div>
    </div>
    <div class="no-print"><button onclick="window.print()">Imprimir</button></div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 90px;">Cod</th>
        <th>Produto</th>
        <th style="width: 120px; text-align:center;">Contagem</th>
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (r) => `
        <tr>
          <td>${String(r.cod || "")
              .replaceAll("&", "&amp;")
              .replaceAll("<", "&lt;")}</td>
          <td>${String(r.nome || "")
              .replaceAll("&", "&amp;")
              .replaceAll("<", "&lt;")}</td>
          <td style="text-align:center;"><span class="box"></span></td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>

  <div style="margin-top:14px; font-size:11px; color:#666;">
    Total de itens: ${rows.length}
  </div>
</body>
</html>
  `.trim();

    // 4) abre janela e imprime
    const w = window.open("", "_blank");
    if (!w)
      return alert("Bloqueador de pop-up ativo. Libere pop-ups para imprimir.");
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const FILIAL_PADRAO = "01"; // se tiver dinâmica de filial em outro lugar, pode trocar aqui

  const handleAdicionarAoSaldoProdutos = async (item) => {
    if (!origemUsuario) {
      setSnackbarSeverity("warning");
      setSnackbarMsg("Origem do usuário não definida.");
      setSnackbarOpen(true);
      return;
    }

    const codNorm = normalizeCod(item.cod);
    // se já existe para o local atual, não deixa
    if (presentesSaldoProdutos.has(codNorm)) {
      setSnackbarSeverity("info");
      setSnackbarMsg("Este produto já está em saldo_produtos para este local.");
      setSnackbarOpen(true);
      return;
    }

    const payload = {
      filial: FILIAL_PADRAO,
      cod_produto: formatCodParaProtheus(codNorm), // opcionalmente sem ponto: codNorm
      local: String(origemUsuario),
      nome_produto: nomeExibidoProduto(item),
      saldo_total: 0,
    };

    try {
      await axios.post(`${API_BASE}/saldo-produtos`, payload, {
        headers: {
          "x-user": username || "sistema",
          "x-local": origemUsuario,
        },
      });

      // marca como presente (evita clique duplo)
      setPresentesSaldoProdutos((prev) => {
        const novo = new Set(prev);
        novo.add(codNorm);
        return novo;
      });

      setSnackbarSeverity("success");
      setSnackbarMsg("Produto incluído em saldo_produtos.");
      setSnackbarOpen(true);

      // atualiza tudo na hora
      await fetchAllData();
    } catch (err) {
      console.error(
        "❌ Erro ao incluir em saldo_produtos:",
        err?.response?.data || err
      );
      setSnackbarSeverity("error");
      setSnackbarMsg("Falha ao incluir produto em saldo_produtos.");
      setSnackbarOpen(true);
    }
  };

  const fetchAllData = useCallback(async () => {
    setLoadingData(true);
    setFisico({});
    if (!origemUsuario) {
      setLoadingData(false);
      return;
    }
    const dataAnteriorStr = await buscarUltimoFechamento(filtroData);
    if (!dataAnteriorStr) {
      console.warn("Nenhum fechamento anterior encontrado.");
      setLoadingData(false);
      return;
    }

    const entradaTransferenciasMap = {};
    const saidaTransferenciasMap = {};

    let resSaldos,
      resManuais,
      resEntradas,
      resVendas,
      resContagem,
      resTransferencias,
      resAvarias,
      resDevolucoes,
      resSaldosDiaAnterior,
      resSaldosProtheus,
      resInversoes;

    let nomeProtheus = {};

    try {
      [
        resSaldos,
        resManuais,
        resEntradas,
        resVendas,
        resContagem,
        resTransferencias,
        resAvarias,
        resDevolucoes,
        resSaldosDiaAnterior,
        resSaldosProtheus,
        resInversoes,
      ] = await Promise.all([
        axios.get(`${API_BASE_URL}/produtos-com-saldo`, {
          params: { data: filtroData, local: origemUsuario },
        }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/produtos/manual`, {
          params: { data: filtroData, local: origemUsuario },
        }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/compras/entradas`, {
          params: { data: filtroData, local: origemUsuario },
        }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/vendas/produtos`, {
          params: { data: filtroData, local: origemUsuario },
        }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/estoque/contagem`, {
          params: { data: filtroData, local: origemUsuario },
        }).catch(() => ({ data: [] })),
        axios.get(
          `${API_BASE_URL}/estoque/transferencias/${origemUsuario}?data=${filtroData}`
        ).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/estoque/avarias`, {
          params: { data: filtroData, local: origemUsuario },
        }).catch(() => ({ data: {} })),
        axios.get(`${API_BASE_URL}/estoque/devolucoes`, {
          params: { data: filtroData, local: origemUsuario },
        }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/produtos/saldo-inicial`, {
          params: { data: dataAnteriorStr, local: origemUsuario },
        }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/produtos/saldo-protheus`, {
          params: { local: origemUsuario },
        }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/produto/inversoes`, {
          params: { data: filtroData, local: origemUsuario },
        }).catch(() => ({ data: {} })), // não bloqueia se falhar
      ]);


      nomeProtheus = {};
      (resSaldosProtheus?.data || []).forEach((r) => {
        nomeProtheus[normalizeCod(r.cod_produto)] = (
          r.nome_produto || ""
        ).trim();
      });

      // Agora salva no estado, se a API respondeu certinho
      if (resSaldosProtheus?.data) {
        setSaldosProtheus(resSaldosProtheus.data);
      }
    } catch (err) {
      console.error("❌ Erro ao buscar dados principais:", err);
      setSnackbarSeverity("error");
      setSnackbarMsg("Erro ao buscar dados do estoque.");
      setSnackbarOpen(true);
    }

    // marca os códigos que já estão em saldo_produtos para este local
    try {
      const jaNoSaldo = new Set(
        (resSaldos?.data || [])
          .filter((i) => String(i.local) === String(origemUsuario))
          .map((i) => normalizeCod(i.cod))
      );
      setPresentesSaldoProdutos(jaNoSaldo);
    } catch (e) {
      setPresentesSaldoProdutos(new Set());
    }

    try {
      const entradasMap = {};
      resEntradas.data.forEach((entrada) => {
        entradasMap[normalizeCod(entrada.codpro)] = entrada.total || 0;
      });

      const vendasMap = {};
      resVendas.data.forEach((venda) => {
        const cod = normalizeCod(venda.codpro);
        vendasMap[cod] = (vendasMap[cod] || 0) + Number(venda.total || 0);
      });

      const contagemMap = {};
      resContagem.data.forEach((c) => {
        if (String(c.local) === String(origemUsuario)) {
          contagemMap[normalizeCod(c.cod)] = Number(c.qtd) || 0;
        }
      });

      const devolucoesMap = {};
      resTransferencias.data.forEach((item) => {
        const cod = normalizeCod(item.cod_produto);
        entradaTransferenciasMap[cod] = item.entrada || 0;
        saidaTransferenciasMap[cod] = item.saida || 0;
      });

      if (Array.isArray(resDevolucoes.data)) {
        resDevolucoes.data.forEach((item) => {
          const cod = normalizeCod(item.cod_produto);
          devolucoesMap[cod] =
            (devolucoesMap[cod] || 0) + (Number(item.total) || 0);
        });
      } else if (typeof resDevolucoes.data === "object") {
        Object.entries(resDevolucoes.data).forEach(([cod, dados]) => {
          devolucoesMap[normalizeCod(cod)] = Number(dados.unidade) || 0;
        });
      }

      const avariasMap = {};
      if (resAvarias.data && typeof resAvarias.data === "object") {
        Object.entries(resAvarias.data).forEach(([cod, total]) => {
          avariasMap[normalizeCod(cod)] = Number(total) || 0;
        });
      }

      const manuaisMap = {};
      (resManuais.data || []).forEach((item) => {
        const cod = normalizeCod(item.cod_produto || item.cod);
        manuaisMap[cod] = Number(item.saldo_manual || 0);
      });

      // Mapa de inversões líquidas (positivo = recebeu, negativo = deu)
      const inversoesMap = resInversoes?.data && typeof resInversoes.data === 'object'
        ? Object.fromEntries(
          Object.entries(resInversoes.data).map(([k, v]) => [normalizeCod(k), Number(v) || 0])
        )
        : {};

      const saldosComDados = resSaldos.data
        .filter((item) => item != null && item.local === origemUsuario)
        .map((item) => {
          const cod = normalizeCod(item.cod);
          const saldoAnterior = resSaldosDiaAnterior.data.find(
            (s) => normalizeCod(s.cod) === cod
          );

          const saldoInicial = Number(saldoAnterior?.saldo_final || 0);
          const entradaTransferencia = Number(entradaTransferenciasMap[cod] || 0);
          const entradaCompra = Number(entradasMap[cod] || 0);
          const entrada = entradaTransferencia || 0;
          const compras = entradaCompra || 0;
          const manual = Number(manuaisMap[cod] || 0);
          const transferencia = Number(saidaTransferenciasMap[cod] || 0);
          const venda = Number(vendasMap[cod] || 0);
          const avaria = Number(avariasMap[cod] || 0);
          const devolucao = Number(devolucoesMap[cod] || 0);
          const inversao = Number(inversoesMap[cod] || 0);

          const saldo =
            saldoInicial +
            entrada +
            manual +
            compras -
            transferencia -
            venda -
            avaria +
            devolucao +
            inversao;

          return {
            ...item,
            cod,
            produto:
              item.produto && item.produto !== "Desconhecido"
                ? item.produto
                : nomeProtheus[cod] || "Desconhecido",
            saldoInicial,
            saldoProtheus: Number(item.saldo_protheus || 0),
            entrada: entrada || 0,
            manual: manual || 0,
            compras: compras || 0,
            transferencia: transferencia || 0,
            venda: venda || 0,
            avaria: avaria || 0,
            devolucao: devolucao || 0,
            inversao: inversao || 0,
            saldo: isNaN(saldo) ? 0 : round2(saldo),
            fisico: contagemMap[cod] || 0,
            local: item.local,
          };
        });

      const codigosJaAdicionados = new Set(
        saldosComDados.map((p) => normalizeCod(p.cod))
      );

      (resManuais.data || []).forEach((item) => {
        const cod = normalizeCod(item.cod_produto || item.cod);
        if (!codigosJaAdicionados.has(cod)) {
          saldosComDados.push({
            cod,
            produto: item.nome_produto || "Desconhecido",
            saldoInicial: 0,
            saldoProtheus: 0,
            entrada: 0,
            manual: Number(item.saldo_manual || 0),
            compras: 0,
            transferencia: 0,
            venda: 0,
            avaria: 0,
            devolucao: 0,
            saldo: round2(item.saldo_manual || 0),
            fisico: contagemMap[cod] || 0,
            local: item.local || origemUsuario,
          });
          codigosJaAdicionados.add(cod);
        }
      });

      // Mapa auxiliar para descobrir nome do produto por código
      const nomesPorCod = {};
      (resSaldos.data || []).forEach(
        (i) => (nomesPorCod[normalizeCod(i.cod)] = i.produto)
      );
      (resEntradas.data || []).forEach((i) => {
        const c = normalizeCod(i.codpro);
        if (!nomesPorCod[c])
          nomesPorCod[c] = i.nome_produto || i.descricao || "Desconhecido";
      });
      (resVendas.data || []).forEach((i) => {
        const c = normalizeCod(i.codpro);
        if (!nomesPorCod[c])
          nomesPorCod[c] = i.nome_produto || i.descricao || "Desconhecido";
      });
      (resTransferencias.data || []).forEach((i) => {
        const c = normalizeCod(i.cod_produto);
        if (!nomesPorCod[c])
          nomesPorCod[c] = i.nome_produto || i.descricao || "Desconhecido";
      });

      // ✅ TRAZER TUDO QUE FOI FECHADO ONTEM (carry-over), MESMO SE NÃO VEIO DO PROTHEUS HOJE
      (resSaldosDiaAnterior.data || []).forEach((prev) => {
        const cod = normalizeCod(prev.cod || prev.cod_produto);
        if (!cod) return;

        // garante mesmo local
        const localPrev = String(prev.local || origemUsuario);
        if (localPrev !== String(origemUsuario)) return;

        if (codigosJaAdicionados.has(cod)) return;

        const saldoInicial = Number(prev.saldo_final || prev.saldoInicial || 0);
        const inversao = Number(inversoesMap[cod] || 0);
        const saldo = round2(saldoInicial + inversao);

        saldosComDados.push({
          cod,
          produto: nomesPorCod[cod] || nomeProtheus[cod] || "Desconhecido",
          saldoInicial,
          saldoProtheus: 0,
          entrada: 0,
          manual: 0,
          compras: 0,
          transferencia: 0,
          venda: 0,
          avaria: 0,
          devolucao: 0,
          inversao,
          saldo: isNaN(saldo) ? 0 : saldo,
          fisico: contagemMap[cod] || 0,
          local: origemUsuario,
        });

        codigosJaAdicionados.add(cod);
      });

      // Incluir produtos que tiveram ENTRADA por transferência mesmo sem saldo
      Object.entries(entradaTransferenciasMap).forEach(([cod, qtd]) => {
        const codNormalizado = normalizeCod(cod);
        if (Number(qtd) > 0 && !codigosJaAdicionados.has(codNormalizado)) {
          const key = codNormalizado;
          const entrada = Number(qtd) || 0;
          const compras = Number(entradasMap[codNormalizado] || 0);
          const manual = Number(manuaisMap[codNormalizado] || 0);
          const transferencia = Number(
            saidaTransferenciasMap[codNormalizado] || 0
          );
          const venda = Number(vendasMap[codNormalizado] || 0);
          const avaria = Number(avariasMap[codNormalizado] || 0);
          const devolucao = Number(devolucoesMap[codNormalizado] || 0);
          const inversao = Number(inversoesMap[codNormalizado] || 0);

          const saldoInicial = 0;
          const saldo =
            saldoInicial +
            entrada +
            manual +
            compras -
            transferencia -
            venda -
            avaria +
            devolucao +
            inversao;

          saldosComDados.push({
            cod: codNormalizado,
            produto: nomesPorCod[key] || nomeProtheus[key] || "Desconhecido",
            saldoInicial,
            saldoProtheus: 0,
            entrada,
            manual,
            compras,
            transferencia,
            venda,
            avaria,
            devolucao,
            inversao,
            saldo: isNaN(saldo) ? 0 : saldo,
            fisico: contagemMap[codNormalizado] || 0,
            local: origemUsuario,
          });

          codigosJaAdicionados.add(codNormalizado);
        }
      });

      // Atualizar movimentações em produtos que já estão na lista
      saldosComDados.forEach((produto) => {
        const codNorm = normalizeCod(produto.cod);
        let atualizado = false;

        // Atualizar entrada por transferência se não estiver atribuída
        if (
          entradaTransferenciasMap[codNorm] &&
          Number(entradaTransferenciasMap[codNorm]) > 0 &&
          Number(produto.entrada || 0) === 0
        ) {
          produto.entrada = Number(entradaTransferenciasMap[codNorm] || 0);
          atualizado = true;
        }

        // Atualizar saída por transferência se não estiver atribuída
        if (
          saidaTransferenciasMap[codNorm] &&
          Number(saidaTransferenciasMap[codNorm]) > 0 &&
          Number(produto.transferencia || 0) === 0
        ) {
          produto.transferencia = Number(saidaTransferenciasMap[codNorm] || 0);
          atualizado = true;
        }

        // Atualizar venda se não estiver atribuída
        if (
          vendasMap[codNorm] &&
          Number(vendasMap[codNorm]) > 0 &&
          Number(produto.venda || 0) === 0
        ) {
          produto.venda = Number(vendasMap[codNorm] || 0);
          atualizado = true;
        }

        // Atualizar compra se não estiver atribuída
        if (
          entradasMap[codNorm] &&
          Number(entradasMap[codNorm]) > 0 &&
          Number(produto.compras || 0) === 0
        ) {
          produto.compras = Number(entradasMap[codNorm] || 0);
          atualizado = true;
        }

        // Atualizar avaria se não estiver atribuída
        if (
          avariasMap[codNorm] &&
          Number(avariasMap[codNorm]) > 0 &&
          Number(produto.avaria || 0) === 0
        ) {
          produto.avaria = Number(avariasMap[codNorm] || 0);
          atualizado = true;
        }

        // Atualizar devolução se não estiver atribuída
        if (
          devolucoesMap[codNorm] &&
          Number(devolucoesMap[codNorm]) > 0 &&
          Number(produto.devolucao || 0) === 0
        ) {
          produto.devolucao = Number(devolucoesMap[codNorm] || 0);
          atualizado = true;
        }

        // Recalcular saldo sempre (incluindo inversão)
        produto.inversao = Number(inversoesMap[normalizeCod(produto.cod)] || 0);
        produto.saldo = round2(
          (produto.saldoInicial || 0) +
          (produto.entrada || 0) +
          (produto.manual || 0) +
          (produto.compras || 0) -
          (produto.transferencia || 0) -
          (produto.venda || 0) -
          (produto.avaria || 0) +
          (produto.devolucao || 0) +
          (produto.inversao || 0)
        );
      });

      // Coletar todos os códigos que têm movimentação
      const codigosComMovimentacao = new Set();

      // Entrada por transferência
      Object.keys(entradaTransferenciasMap).forEach((cod) => {
        if (Number(entradaTransferenciasMap[cod]) > 0) {
          codigosComMovimentacao.add(normalizeCod(cod));
        }
      });

      // Saída por transferência
      Object.keys(saidaTransferenciasMap).forEach((cod) => {
        if (Number(saidaTransferenciasMap[cod]) > 0) {
          codigosComMovimentacao.add(normalizeCod(cod));
        }
      });

      // Vendas
      Object.keys(vendasMap).forEach((cod) => {
        if (Number(vendasMap[cod]) > 0) {
          codigosComMovimentacao.add(normalizeCod(cod));
        }
      });

      // Compras
      Object.keys(entradasMap).forEach((cod) => {
        if (Number(entradasMap[cod]) > 0) {
          codigosComMovimentacao.add(normalizeCod(cod));
        }
      });

      // Avarias
      Object.keys(avariasMap).forEach((cod) => {
        if (Number(avariasMap[cod]) > 0) {
          codigosComMovimentacao.add(normalizeCod(cod));
        }
      });

      // Devoluções
      Object.keys(devolucoesMap).forEach((cod) => {
        if (Number(devolucoesMap[cod]) > 0) {
          codigosComMovimentacao.add(normalizeCod(cod));
        }
      });

      // Incluir produtos que tiveram QUALQUER movimentação mesmo sem saldo
      codigosComMovimentacao.forEach((codNormalizado) => {
        if (!codigosJaAdicionados.has(codNormalizado)) {
          const key = codNormalizado;
          const entrada = Number(entradaTransferenciasMap[codNormalizado] || 0);
          const compras = Number(entradasMap[codNormalizado] || 0);
          const manual = Number(manuaisMap[codNormalizado] || 0);
          const transferencia = Number(
            saidaTransferenciasMap[codNormalizado] || 0
          );
          const venda = Number(vendasMap[codNormalizado] || 0);
          const avaria = Number(avariasMap[codNormalizado] || 0);
          const devolucao = Number(devolucoesMap[codNormalizado] || 0);
          const inversao = Number(inversoesMap[codNormalizado] || 0);

          const saldoInicial = 0;
          const saldo =
            saldoInicial +
            entrada +
            manual +
            compras -
            transferencia -
            venda -
            avaria +
            devolucao +
            inversao;

          // Buscar nome do produto em todas as fontes possíveis
          let nomeProduto = nomesPorCod[key] || nomeProtheus[key];

          // Se ainda não encontrou, buscar nas respostas
          if (!nomeProduto) {
            const vendaComNome = resVendas.data?.find(
              (v) => normalizeCod(v.codpro) === codNormalizado
            );
            if (vendaComNome) {
              nomeProduto = vendaComNome.nome_produto || vendaComNome.descricao;
            }
          }

          if (!nomeProduto) {
            const entradaComNome = resEntradas.data?.find(
              (e) => normalizeCod(e.codpro) === codNormalizado
            );
            if (entradaComNome) {
              nomeProduto =
                entradaComNome.nome_produto || entradaComNome.descricao;
            }
          }

          if (!nomeProduto) {
            const transfComNome = resTransferencias.data?.find(
              (t) => normalizeCod(t.cod_produto) === codNormalizado
            );
            if (transfComNome) {
              nomeProduto =
                transfComNome.descricao || transfComNome.nome_produto;
            }
          }

          saldosComDados.push({
            cod: codNormalizado,
            produto: nomeProduto || "Desconhecido",
            saldoInicial,
            saldoProtheus: 0,
            entrada,
            manual,
            compras,
            transferencia,
            venda,
            avaria,
            devolucao,
            inversao,
            saldo: isNaN(saldo) ? 0 : saldo,
            fisico: contagemMap[codNormalizado] || 0,
            local: origemUsuario,
          });

          codigosJaAdicionados.add(codNormalizado);
        }
      });

      // ─── Garantir que produtos DESTINO de inversão apareçam na tabela ───
      // Se o produto correto (que recebeu a inversão) não tem nenhum outro
      // movimento, ele não estaria na lista — mas precisa aparecer com o +N.
      Object.entries(inversoesMap).forEach(([cod, inv]) => {
        if (inv <= 0) return; // só os destinos (positivos)
        if (codigosJaAdicionados.has(cod)) return; // já está na lista

        // Tenta descobrir o nome a partir do mapa de nomes
        const nomeProduto =
          nomesPorCod[cod] ||
          nomeProtheus[cod] ||
          "Desconhecido";

        const saldo = round2(inv); // saldo = apenas a inversão

        saldosComDados.push({
          cod,
          produto: nomeProduto,
          saldoInicial: 0,
          saldoProtheus: 0,
          entrada: 0,
          manual: 0,
          compras: 0,
          transferencia: 0,
          venda: 0,
          avaria: 0,
          devolucao: 0,
          inversao: inv,
          saldo,
          fisico: contagemMap[cod] || 0,
          local: origemUsuario,
        });

        codigosJaAdicionados.add(cod);
      });
      // ────────────────────────────────────────────────────────────────────

      setSaldos(saldosComDados);
      setFisico(contagemMap);
      setAvarias(avariasMap);
      setDevolucoes(
        Object.fromEntries(
          Object.entries(devolucoesMap).map(([cod, unidade]) => [
            cod,
            { unidade },
          ])
        )
      );
      setLoadingData(false);
    } catch (err) {
      console.error("❌ Erro ao processar os dados:", err);
      setLoadingData(false);
      throw err;
    }
  }, [origemUsuario, filtroData, buscarUltimoFechamento]);

  const verificarPreFechamento = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/pre-fechamento`, {
        params: { data: filtroData, local: origemUsuario },
      });

      setPreFechamentoRealizado(res.data?.existe === true);
    } catch (err) {
      console.error("Erro ao verificar pré-fechamento:", err);
    }
  }, [filtroData, origemUsuario]);

  const handlePreFechamento = async () => {
    setLoadingFechamento(true);
    setLoadingFechamentoMsg("Fechando o dia... Por favor, aguarde.");
    try {
      // 0) Se já estiver FECHADO, não deixa pré-fechar
      if (fechamentoRealizado) {
        setSnackbarSeverity("info");
        setSnackbarMsg("Este dia já está fechado para este local.");
        setSnackbarOpen(true);
        return;
      }
      await assertSemPendencias();

      // 1) PENDÊNCIAS (transferências + avarias)
      const resTransf = await axios.get(
        `${API_BASE_URL}/estoque/transferencias-pendentes`,
        { params: { data: filtroData, local: origemUsuario } }
      );

      // números únicos (só por segurança)
      const bloqueios = Array.from(
        new Set((resTransf.data || []).map((t) => String(t.numero).trim()))
      );

      const avPend = await fetchAvariasPendentes(); // { total, numeros }

      if (bloqueios.length > 0 || avPend.total > 0) {
        const partes = [];
        if (bloqueios.length > 0) {
          partes.push(
            `${bloqueios.length
            } transferência(s) não concluída(s): ${bloqueios.join(", ")}`
          );
        }
        if (avPend.total > 0) {
          partes.push(`${avPend.total} avaria(s) pendente(s)`);
        }
        setSnackbarSeverity("warning");
        setSnackbarMsg(`❌ Não é possível prosseguir: ${partes.join(" · ")}.`);
        setSnackbarOpen(true);
        return; // NÃO faz snapshot, NÃO gera faltas
      }

      // 2) Snapshot dos saldos (pré-fechamento)
      const toNum = (v) => {
        const n = Number(String(v ?? 0).replace(",", "."));
        return Number.isFinite(n) ? n : 0;
      };

      const getFisico = (item) => {
        const v = fisico[item.cod] ?? item.fisico;
        if (v === undefined || v === null || v === "") return null;
        const n = Number(String(v).replace(",", "."));
        return Number.isFinite(n) ? n : null;
      };

      const itens = (saldos || [])
        .filter((it) => it?.cod)
        .map((item) => {
          const f = getFisico(item);
          return {
            cod_produto: item.cod,
            saldo_final: f !== null ? f : toNum(item.saldo), // FÍSICO -> fallback SALDO
          };
        });

      if (itens.length === 0) {
        setSnackbarSeverity("warning");
        setSnackbarMsg("Não há itens para pré-fechar.");
        setSnackbarOpen(true);
        setLoadingFechamento(false);
        return;
      }

      // 3) Salva o PRÉ-FECHAMENTO (snapshot)
      setLoadingFechamentoMsg(
        `Processando ${itens.length} produto(s)... Isso pode levar alguns minutos.`
      );
      let preFechamentoSalvo = false;
      try {
        const response = await axios.post(
          `${API_BASE_URL}/pre-fechamento`,
          {
            data: filtroData,
            usuario: username,
            local: String(origemUsuario),
            itens,
          },
          {
            headers: {
              "x-user": username || "sistema",
              "x-local": String(origemUsuario || ""),
            },
            timeout: 180000, // 3 minutos de timeout (aumentado para locais com muitos produtos)
          }
        );

        if (response.data && response.data.success) {
          preFechamentoSalvo = true;
          console.log(
            `✅ Pré-fechamento salvo: ${response.data.salvos || itens.length
            } itens`
          );
        } else {
          throw new Error(
            response.data?.message || "Resposta inválida do servidor"
          );
        }
      } catch (err) {
        // Se a requisição falhou mas o backend pode ter salvado parcialmente
        if (err.code === "ECONNABORTED" || err.code === "ERR_NETWORK") {
          console.error("❌ Erro de conexão no pré-fechamento:", err.message);
          // Verifica se o pré-fechamento foi salvo mesmo com erro de conexão
          try {
            const checkResponse = await axios.get(
              `${API_BASE_URL}/pre-fechamento`,
              { params: { data: filtroData, local: String(origemUsuario) } }
            );
            if (checkResponse.data?.existe) {
              preFechamentoSalvo = true;
              console.log(
                "⚠️ Pré-fechamento já existe (pode ter sido salvo antes do erro)"
              );
            }
          } catch (checkErr) {
            console.error("❌ Erro ao verificar pré-fechamento:", checkErr);
          }
        }

        if (!preFechamentoSalvo) {
          throw err; // Re-lança o erro se não foi salvo
        }
      }

      // 4) Gera / salva FALTAS após o snapshot (só se o pré-fechamento foi salvo)
      if (preFechamentoSalvo) {
        setLoadingFechamentoMsg("Calculando faltas...");
        await salvarFaltasDoFechamento(0.0);
      }

      setPreFechamentoRealizado(true);
      await verificarPreFechamento();
      setFechamentoParams({ data: filtroData, local: String(origemUsuario) });
      setAskRelFaltas(true);

      await registrarLogFechamento({
        tipo: "pre",
        status: "success",
        mensagem: "Pré-fechamento gravado (snapshot) e faltas calculadas.",
        qtd_itens: (saldos || []).length,
        payload: { itens_snapshot: (saldos || []).length },
      });

      setSnackbarSeverity("success");
      setSnackbarMsg(
        "✅ Pré-fechamento salvo com sucesso! (snapshot de saldos registrado)"
      );
      setSnackbarOpen(true);
    } catch (err) {
      const msgBack =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Falha ao processar o pré-fechamento.";

      await registrarLogFechamento({
        tipo: "pre",
        status: "error",
        mensagem: `Falha no pré-fechamento: ${msgBack}`,
        qtd_itens: (saldos || []).length,
      });

      console.error("❌ Erro no pré-fechamento:", err?.response?.data || err);
      setSnackbarSeverity("error");
      setSnackbarMsg(`❌ ${msgBack}`);
      setSnackbarOpen(true);
    } finally {
      setLoadingFechamento(false);
    }
  };

  // ✔ Helper único: dispara erro/alerta se houver pendências
  const assertSemPendencias = async () => {
    // 1) transf. não concluídas (rota já devolve o que bloqueia)
    const { data: transf } = await axios.get(
      `${API_BASE_URL}/estoque/transferencias-pendentes`,
      { params: { data: filtroData, local: origemUsuario } }
    );
    const numsUnicos = Array.from(
      new Set((transf || []).map((t) => String(t.numero).trim()))
    );

    // 2) avarias pendentes
    const avPend = await fetchAvariasPendentes(); // { total, numeros }

    // 3) se houver algo, avisa e interrompe
    if (numsUnicos.length > 0 || avPend.total > 0) {
      const partes = [];
      if (numsUnicos.length > 0)
        partes.push(
          `${numsUnicos.length} transferência(s): ${numsUnicos.join(", ")}`
        );
      if (avPend.total > 0) partes.push(`${avPend.total} avaria(s)`);

      setSnackbarSeverity("warning");
      setSnackbarMsg(`❌ Não é possível prosseguir: ${partes.join(" · ")}.`);
      setSnackbarOpen(true);
    }
  };

  // [NOVO] busca perfil (tipo/origem) do usuário logado
  useEffect(() => {
    const fetchPerfilUsuario = async () => {
      try {
        const username =
          sessionStorage.getItem("username") ||
          localStorage.getItem("username");
        if (!username) return;
        const res = await axios.get(
          `${API_BASE_URL}/usuarios/perfil/${username}`
        );
        setPerfilUsuario(res.data);
        if (res.data?.origem) {
          // Só define a origem do perfil se não houver uma definida manualmente na sessão
          const stored = sessionStorage.getItem("local") || sessionStorage.getItem("origem");
          if (!stored) {
            setOrigemUsuario(res.data.origem);
          }
        }
      } catch (e) {
        console.error("❌ Erro ao buscar perfil do usuário:", e);
      } finally {
        setPerfilLoading(false);
      }
    };
    fetchPerfilUsuario();
  }, []);



  const verificarFechamento = useCallback(async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/saldos/fechados`, {
        data: filtroData,
        local: origemUsuario,
      });
      setFechamentoRealizado(res.data.fechado);
    } catch (error) {
      console.error("Erro ao verificar fechamento:", error);
    }
  }, [filtroData, origemUsuario]);

  useEffect(() => {
    if (origemUsuario) {
      fetchAllData();
      verificarFechamento();
      verificarPreFechamento(); // está aqui ✅
    }
  }, [
    origemUsuario,
    fetchAllData,
    verificarFechamento,
    verificarPreFechamento,
  ]);

  useEffect(() => {
    const carregarSaldoProtheus = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/produtos/saldo-protheus?local=${origemUsuario}`
        );
        const data = await response.json();
        setSaldosProtheus(data);
      } catch (error) {
        console.error("Erro ao buscar saldo Protheus:", error);
      }
    };

    carregarSaldoProtheus();
  }, [origemUsuario]); // <- sem [usuario]

  const produtosFiltrados = useMemo(() => {
    const s = (search || "").trim().toLowerCase();

    const getNomeExibido = (item) => {
      // Se tem nome válido, usa ele
      if (item?.produto && item.produto !== "Desconhecido") {
        return item.produto;
      }

      // Tenta buscar no Protheus com código normalizado
      const codNorm = normalizeCod(item.cod);
      let nome = nomesFromProtheus[codNorm];

      // Se não encontrou, tenta também com o código original (sem normalizar)
      if (!nome && item.cod) {
        nome = nomesFromProtheus[item.cod];
      }

      // DEBUG: Log quando não encontra o nome
      if (!nome && item.cod) {
        console.log(
          `⚠️ Produto sem nome - Código: "${item.cod}" | Normalizado: "${codNorm}"`
        );
      }

      return nome || "⚠️ Produto Sem Nome";
    };

    return [...saldos]
      .filter((item) => {
        const nomeExibido = getNomeExibido(item);
        const nomeOk = nomeExibido.toLowerCase().includes(s);
        const codOk = (item.cod || "").toLowerCase().includes(s);

        // se há texto, filtra SÓ por nome/código
        const passouBusca = s ? nomeOk || codOk : true;

        // regra do botão "Somente com saldo"
        const passouSaldo = mostrarTodos
          ? true
          : Number(item.saldo) !== 0 ||
          Number(item.fisico) !== 0 ||
          Number(item.entrada) > 0;

        return passouBusca && passouSaldo;
      })
      .sort((a, b) => {
        const A = getNomeExibido(a);
        const B = getNomeExibido(b);

        // Produtos sem nome vão para o FINAL da lista
        const aTemNome = !A.startsWith("⚠️");
        const bTemNome = !B.startsWith("⚠️");

        if (aTemNome && !bTemNome) return -1; // A vem antes
        if (!aTemNome && bTemNome) return 1; // B vem antes

        // Ambos tem ou não tem nome, ordena alfabeticamente
        return A.localeCompare(B);
      });
  }, [saldos, search, mostrarTodos, nomesFromProtheus]);

  const paginatedSaldos = produtosFiltrados.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    if (!origemUsuario || !filtroData || paginatedSaldos.length === 0) return;

    // só busque o que ainda não temos em memória
    const faltando = paginatedSaldos
      .map((i) => i.cod)
      .filter((cod) => observacoes[cod] === undefined);

    if (faltando.length === 0) return;

    (async () => {
      try {
        const reqs = faltando.map((cod) =>
          axios
            .get(`${API_BASE_URL}/produto/observacao`, {
              params: { cod, data: filtroData },
              headers: { "x-local": origemUsuario },
            })
            .then((r) => ({ cod, data: r.data }))
            .catch(() => ({ cod, data: {} }))
        );

        const res = await Promise.all(reqs);

        setObservacoes((prev) => {
          const novo = { ...prev };
          res.forEach(({ cod, data }) => {
            const texto = (data?.texto || "").trim();
            if (texto) {
              novo[cod] = { texto, atualizadoEm: data.atualizado_em };
            } else {
              // marcar como sem obs para não ficar refazendo GET
              novo[cod] = { texto: "" };
            }
          });
          return novo;
        });
      } catch {
        /* silencioso */
      }
    })();
  }, [paginatedSaldos, origemUsuario, filtroData, observacoes]);

  const totalPages = Math.ceil(produtosFiltrados.length / itemsPerPage);

  const botaoStyle = {
    width: 200,
    height: 100,
    backgroundColor: "#228B22",
    color: "#fff",
    fontWeight: "bold",
    textTransform: "uppercase",
    borderRadius: 2,
    boxShadow: 2,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    transition: "0.2s ease-in-out",
    "&:hover": {
      backgroundColor: "#32CD32",
      transform: "translateY(-2px)",
    },
  };

  // [NOVO] navegação protegida no front
  const handleAbrirFechamentoGeral = () => {
    if (!isGestor) {
      setSnackbarSeverity("warning");
      setSnackbarMsg(
        "Acesso restrito: apenas gestores podem abrir o Fechamento Geral."
      );
      setSnackbarOpen(true);
      return;
    }

    navigate("/estoque/fechamento-geral", { state: { data: filtroData } });
  };

  const handleFechamentoDoDia = async () => {
    setLoadingFechamento(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/estoque/transferencias-pendentes`,
        { params: { data: filtroData, local: origemUsuario } }
      );

      const pendentes = (res.data || []).filter((t) => {
        const isPendente =
          (t.status || "")
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .toLowerCase() === "pendente";
        const doMeuLocal =
          String(t.origem) === String(origemUsuario) ||
          String(t.destino) === String(origemUsuario);
        const mesmaData =
          !t.data && !t.data_inclusao
            ? true
            : new Date(t.data_br || t.data_inclusao || t.data)
              .toISOString()
              .slice(0, 10) === filtroData;
        return isPendente && doMeuLocal && mesmaData;
      });

      const pendenciasUnicas = Array.from(
        new Set(pendentes.map((t) => t.numero))
      );
      if (pendenciasUnicas.length > 0) {
        setSnackbarSeverity("warning");
        setSnackbarMsg(
          `❌ Não é possível fechar o dia. Existe(m) ${pendenciasUnicas.length} transferência(s) pendente(s).`
        );
        setSnackbarOpen(true);
        return;
      }

      // --- Fechamento ---
      const payload = {
        data: filtroData,
        local: origemUsuario,
        usuario: username,
        itens: saldos.map((item) => ({
          cod_produto: item.cod, // ou 'cod'
          saldo_final: Number(item.saldo),
          local: String(origemUsuario), // 👈 adiciona aqui
        })),
      };

      await axios.post(`${API_BASE_URL}/saldos/fechamento`, payload);

      // --- Gera faltas somente após fechar ---
      await salvarFaltasDoFechamento(0.0);

      // Atualiza flag de fechado e abre diálogo do relatório
      await verificarFechamento();
      setFechamentoParams({ data: filtroData, local: String(origemUsuario) });
      setAskRelFaltas(true);

      setSnackbarSeverity("success");
      setSnackbarMsg("✅ Fechamento do dia salvo com sucesso!");
      setSnackbarOpen(true);
    } catch (err) {
      console.error("❌ Erro ao salvar fechamento do dia:", err);
      setSnackbarSeverity("error");
      setSnackbarMsg("❌ Falha ao salvar o fechamento.");
      setSnackbarOpen(true);
    } finally {
      setLoadingFechamento(false);
    }
  };

  const handleChangeFisico = (cod, value) => {
    setFisico((prev) => ({
      ...prev,
      [cod]: value === "" ? "" : Number(value),
    }));
  };

  const handleAbrirDetalhes = async (produto) => {
    setDetalhesProduto(produto);
    try {
      const res = await axios.get(`${API_BASE_URL}/produto/movimentacoes`, {
        params: {
          codpro: produto.cod,
          data: filtroData,
        },
        headers: {
          "x-local": origemUsuario,
        },
      });

      if (res?.data) {
        const transferencias = res.data.transferencia || [];
        const avariasFiltradas = (res.data.avaria || []).filter(
          (avaria) => String(avaria.origem) === String(origemUsuario)
        );

        // Filtra transferências em entrada e saída com base no local do usuário
        const entradaPorTransferencia = transferencias.filter(
          (t) => String(t.destino) === String(origemUsuario)
        );
        const saidaPorTransferencia = transferencias.filter(
          (t) => String(t.origem) === String(origemUsuario)
        );

        // Filtra as vendas pelo local do usuário
        const vendasFiltradas = (res.data.venda || []).filter(
          (venda) => venda.local === origemUsuario
        );

        // Buscar nome do produto nas movimentações retornadas
        let nomeProduto = produto.produto;

        // Se o nome é "Desconhecido", tenta buscar nas movimentações
        if (!nomeProduto || nomeProduto === "Desconhecido") {
          // Busca nas vendas
          const vendaComNome = vendasFiltradas.find(
            (v) => v.nome_produto || v.descricao
          );
          if (vendaComNome) {
            nomeProduto = vendaComNome.nome_produto || vendaComNome.descricao;
          }

          // Se ainda não encontrou, busca nas transferências
          if (!nomeProduto || nomeProduto === "Desconhecido") {
            const transfComNome = transferencias.find(
              (t) => t.descricao || t.nome_produto
            );
            if (transfComNome) {
              nomeProduto =
                transfComNome.descricao || transfComNome.nome_produto;
            }
          }

          // Se ainda não encontrou, busca nas compras
          if (!nomeProduto || nomeProduto === "Desconhecido") {
            const compraComNome = (res.data.compras || []).find(
              (c) => c.nome_produto || c.descricao
            );
            if (compraComNome) {
              nomeProduto =
                compraComNome.nome_produto || compraComNome.descricao;
            }
          }

          // Se encontrou o nome, atualiza o produto
          if (nomeProduto && nomeProduto !== "Desconhecido") {
            setDetalhesProduto({ ...produto, produto: nomeProduto });
          }
        }

        // Calcula soma e quantidade para cada tipo de movimentação
        const calculateSummary = (data, campo = "quantidade") => {
          return {
            total: data.reduce(
              (sum, item) => sum + (Number(item[campo]) || 0),
              0
            ),
            count: data.length,
          };
        };

        setMovimentacoes({
          entrada: entradaPorTransferencia,
          compras: res.data.compras || [],
          transferencia: saidaPorTransferencia,
          venda: vendasFiltradas,
          avaria: avariasFiltradas,
          devolucao: res.data.devolucao || [],
          summaries: {
            entrada: calculateSummary(entradaPorTransferencia),
            compras: calculateSummary(res.data.compras || [], "qtd_lancada"),
            transferencia: calculateSummary(saidaPorTransferencia),
            venda: calculateSummary(vendasFiltradas),
            avaria: calculateSummary(avariasFiltradas),
            devolucao: calculateSummary(res.data.devolucao || []),
          },
        });

        setOpenDetalhesModal(true);
      } else {
        console.warn("❗ Nenhum dado retornado");
      }
    } catch (err) {
      console.error(
        "❌ Erro ao buscar detalhes do produto:",
        err.response?.data || err.message
      );
      alert("Erro ao buscar movimentações. Verifique o console.");
    }
  };

  const handleChangeDevolucao = (cod, value) => {
    setDevolucoes((prev) => ({
      ...prev,
      [cod]: {
        unidade: Number(value),
      },
    }));
  };

  const handleSalvarDevolucoes = async () => {
    const payload = {
      data: filtroData,
      itens: Object.entries(devolucoes).map(([cod, dados]) => ({
        cod,
        unidade: dados.unidade || 0,
        kg: dados.kg || 0, // caso você esteja usando
        local: origemUsuario || "desconhecido",
      })),
    };

    try {
      const metodo = "post";
      await axios[metodo](`${API_BASE_URL}/estoque/devolucoes`, payload, {
        headers: {
          "x-user": username,
          "x-local": origemUsuario,
        },
      });

      await fetchAllData();
      setOpenDevolucaoModal(false);
    } catch (err) {
      console.error("❌ Erro ao salvar devoluções:", err);
    }
  };

  const salvarContagemFinal = async () => {
    const todosItens = Object.entries(fisico);

    const itensParaSalvar = todosItens
      .filter(([_, qtd]) => Number(qtd) > 0)
      .map(([cod, qtd]) => ({ cod, qtd }));

    const itensParaExcluir = todosItens
      .filter(([_, qtd]) => Number(qtd) === 0)
      .map(([cod]) => ({ cod }));

    const payload = {
      data: filtroData,
      local: origemUsuario,
      itens: itensParaSalvar,
      excluir: itensParaExcluir,
    };

    try {
      await axios.post(`${API_BASE_URL}/estoque/contagem`, payload);
      await fetchAllData();
      setOpenModal(false);

      if (contagemComPendencias) {
        setSnackbarSeverity("warning");
        setSnackbarMsg(
          `Contagem salva com ${produtosPendentes.length} pendência(s).`
        );
      } else {
        setSnackbarSeverity("success");
        setSnackbarMsg("Contagem salva com sucesso!");
      }

      setSnackbarOpen(true);
      setContagemComPendencias(false);
    } catch (err) {
      console.error("❌ Erro ao salvar contagem:", err);
      setSnackbarSeverity("error");
      setSnackbarMsg("Erro ao salvar contagem.");
      setSnackbarOpen(true);
    }
  };

  const handleSalvarContagem = async () => {
    if (produtosPendentes.length > 0) {
      setContagemComPendencias(true);
      setShowConfirmDialog(true);
      return;
    }

    const payload = {
      data: filtroData,
      local: origemUsuario, // <-- aqui está o que faltava
      itens: Object.entries(fisico).map(([cod, qtd]) => ({ cod, qtd })),
    };

    try {
      await axios.post(`${API_BASE_URL}/estoque/contagem`, payload);
      await fetchAllData();
      setOpenModal(false);
    } catch (err) {
      console.error("❌ Erro ao salvar contagem:", err);
    }

    await salvarContagemFinal();
  };

  const renderStatusChip = (item) => {
    const saldo = Number(item.saldo);
    const fisicoVal = Number(item.fisico);

    if (item.fisico === undefined) return null;

    if (saldo === fisicoVal) {
      return <Chip label="OK" color="success" variant="outlined" />;
    }

    if (saldo > fisicoVal) {
      return <Chip label="Falta" color="error" variant="outlined" />;
    }

    if (saldo < fisicoVal) {
      return <Chip label="Sobra" color="warning" variant="outlined" />;
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] pb-20 font-sans transition-colors duration-300">
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0"
        rel="stylesheet"
      />

      {/* Modals Injetados */}
      <Modal
        isOpen={isLocalModalOpen}
        onClose={() => setIsLocalModalOpen(false)}
        title="Alterar Local"
      >
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Novo Local:
        </label>
        <div className="flex gap-2">
          <select
            value={tempLocal}
            onChange={(e) => setTempLocal(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-green-500 outline-none transition-all dark:text-white font-bold"
          >
            {[...Array(9)].map((_, i) => {
              const val = String(i + 1).padStart(2, "0");
              return (
                <option key={val} value={val}>
                  {val}
                </option>
              );
            })}
          </select>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Dica: 01 = Matriz, 08 = CD...
        </p>
        <button
          onClick={saveLocal}
          className="mt-6 w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-600/20"
        >
          Confirmar
        </button>
      </Modal>

      <Modal
        isOpen={isDateModalOpen}
        onClose={() => setIsDateModalOpen(false)}
        title="Alterar Data"
      >
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Data de Trabalho:
        </label>
        <input
          type="date"
          value={tempDate}
          onChange={(e) => setTempDate(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-green-500 outline-none transition-all dark:text-white dark:[color-scheme:dark]"
        />
        <button
          onClick={saveDate}
          className="mt-6 w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-600/20"
        >
          Confirmar
        </button>
      </Modal>

      {/* Header Glass */}
      <header className="sticky top-0 z-50 px-6 py-4">
        <div className="max-w-[95%] mx-auto">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-slate-700/50 px-6 py-3 flex items-center justify-between">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate("/")}
            >
              <div className="bg-gradient-to-tr from-emerald-500 to-teal-400 h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <span className="material-symbols-rounded">inventory_2</span>
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight text-slate-800 dark:text-white">
                  Estoque
                </h1>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  Gestão de Materiais
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <Tooltip title="Alterar Data">
                <div
                  onClick={openDateModal}
                  className="hidden md:flex items-center gap-2 mr-2 bg-transparent px-3 py-2 rounded-xl group border border-transparent cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 p-1.5 rounded-lg">
                    <span className="material-symbols-rounded text-lg">
                      calendar_today
                    </span>
                  </div>
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Data
                    </span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {filtroData
                        ? dayjs(filtroData).add(12, "hour").format("DD/MM/YYYY")
                        : dayjs().format("DD/MM/YYYY")}
                    </span>
                  </div>
                </div>
              </Tooltip>

              <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 hidden md:block"></div>

              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-bold text-slate-800 dark:text-white">
                    {username || "Admin"}
                  </span>
                  <button
                    onClick={openLocalModal}
                    disabled={!podeTrocarLocal}
                    className={`text-[10px] font-bold text-white px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${podeTrocarLocal
                      ? "bg-slate-800 dark:bg-slate-600 hover:bg-emerald-600 cursor-pointer"
                      : "bg-slate-400 cursor-not-allowed opacity-80"
                      }`}
                  >
                    LOCAL: {origemUsuario}{" "}
                    <span className="material-symbols-rounded text-[10px]">
                      {podeTrocarLocal ? "edit" : "lock"}
                    </span>
                  </button>
                </div>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 border-2 border-white dark:border-slate-600 flex items-center justify-center shadow-sm">
                  <span className="material-symbols-rounded text-slate-500 dark:text-slate-300">
                    person
                  </span>
                </div>
              </div>

              <button
                onClick={toggleDarkMode}
                className="ml-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-600 dark:text-slate-300 border border-transparent hover:border-slate-300 dark:hover:border-slate-500"
              >
                <span className="material-symbols-rounded block dark:hidden text-xl">
                  dark_mode
                </span>
                <span className="material-symbols-rounded hidden dark:block text-xl">
                  light_mode
                </span>
              </button>

              <button
                onClick={handleLogout}
                className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-all border border-transparent hover:border-red-200 dark:hover:border-red-800"
              >
                <span className="material-symbols-rounded text-xl">logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[95%] mx-auto px-6 py-8">
        {/* Banner de Bloqueio */}
        {(fechamentoRealizado || preFechamentoRealizado) && (
          <div className="mb-6 w-full bg-red-600 text-white text-center py-3 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-3 animate-pulse border-2 border-red-400">
            <span className="material-symbols-rounded text-2xl">lock</span>
            <span className="text-lg uppercase tracking-wider">Movimentação Bloqueada - Estoque Fechado para o Dia</span>
          </div>
        )}

        {/* Actions Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <ActionCard
            title="Transferência"
            icon="move_down"
            color="bg-blue-500"
            onClick={() => navigate("/estoque/transferencia")}
          />
          <ActionCard
            title="Ent. Mercadoria"
            icon="inventory_2"
            color="bg-emerald-500"
            onClick={() => navigate("/estoque/entrada/mercadoria")}
          />
          <ActionCard
            title="Devolução"
            icon="replay"
            color="bg-orange-500"
            onClick={() => navigate("/estoque/devolucao")}
          />
          <ActionCard
            title="Avaria"
            icon="warning"
            color="bg-red-500"
            onClick={() => navigate("/estoque/avarias")}
          />
          <ActionCard
            title="Relatórios"
            icon="analytics"
            color="bg-indigo-500"
            onClick={() => navigate("/relatorios")}
          />
          {!perfilLoading && isGestor && (
            <ActionCard
              title="Fech. Geral"
              icon="lock"
              color="bg-slate-800"
              onClick={handleAbrirFechamentoGeral}
            />
          )}
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 sticky top-24 z-30 bg-[#F3F4F6] dark:bg-[#0B1120] py-2 transition-colors duration-300">
          <div className="relative w-full md:w-96">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-rounded">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar produto por nome ou código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700 dark:text-white transition-all shadow-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setMostrarTodos((prev) => !prev)}
              className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${mostrarTodos
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500"
                }`}
            >
              {mostrarTodos ? "Exibindo Tudo" : "Somente com Saldo"}
            </button>
            <Tooltip title="Imprimir contagem física">
              <button
                onClick={handlePrintContagem}
                className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all"
              >
                <span className="material-symbols-rounded">print</span>
              </button>
            </Tooltip>
            <Tooltip title="Ver logs">
              <button
                onClick={carregarLogsFechamento}
                className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all"
              >
                <span className="material-symbols-rounded">history</span>
              </button>
            </Tooltip>
            <button
              onClick={() => setConfirmarPreFechamento(true)}
              disabled={fechamentoRealizado || preFechamentoRealizado}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Pré-Fechamento
            </button>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden">
          <div className="overflow-auto max-h-[calc(100vh-320px)] min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 shadow-sm">
                    Cod
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 shadow-sm">
                    Produto
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 shadow-sm">
                    Saldo Inic.
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-purple-500 dark:text-purple-400 uppercase tracking-wider text-right sticky top-0 z-20 bg-purple-50 dark:bg-purple-900/20 shadow-sm" title="Quantidade ajustada por inversão">
                    Inv.
                  </th>
                  {SHOW_PROTHEUS && (
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 shadow-sm">
                      Protheus
                    </th>
                  )}
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 shadow-sm">
                    Compra
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 shadow-sm">
                    Manual
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 shadow-sm">
                    Entrada
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 shadow-sm">
                    Transf.
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 shadow-sm">
                    Venda
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 shadow-sm">
                    Avaria
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 shadow-sm">
                    Dev
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 shadow-sm">
                    Saldo
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-32 text-center sticky top-0 z-20 bg-blue-50 dark:bg-slate-800 shadow-sm">
                    Físico
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 shadow-sm">
                    Diferença
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 shadow-sm">
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 shadow-sm">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {loadingData ? (
                  <tr>
                    <td colSpan={17} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <CircularProgress size={40} className="text-blue-500" />
                        <p className="text-slate-500 font-medium animate-pulse">Carregando estoque...</p>
                      </div>
                    </td>
                  </tr>
                ) : (paginatedSaldos
                  .filter((item) => item != null && typeof item === "object")
                  .map((item, index) => {
                    const saldoProtheus = SHOW_PROTHEUS
                      ? saldosProtheus.find(
                        (s) =>
                          normalizeCod(s.cod_produto) ===
                          normalizeCod(item.cod)
                      ) ?? { saldo_total: 0 }
                      : null;

                    return (
                      <tr
                        key={index}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                          {item?.cod || "-"}
                        </td>
                        <td
                          className="px-4 py-3 text-sm font-bold text-slate-800 dark:text-white whitespace-normal break-words"
                          title={item?.produto}
                        >
                          {(() => {
                            // Usa a mesma lógica de getNomeExibido
                            if (
                              item?.produto &&
                              item.produto !== "Desconhecido"
                            ) {
                              return item.produto;
                            }
                            const codNorm = normalizeCod(item.cod);
                            return (
                              nomesFromProtheus[codNorm] ||
                              nomesFromProtheus[item.cod] ||
                              "⚠️ Produto Sem Nome"
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-slate-600 dark:text-slate-400">
                          {Number(item?.saldoInicial || 0).toFixed(2)}
                        </td>
                        {/* Coluna Inversão */}
                        <td className={`px-4 py-3 text-sm text-right font-semibold ${(item?.inversao || 0) > 0
                          ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-900/10'
                          : (item?.inversao || 0) < 0
                            ? 'text-red-500 dark:text-red-400 bg-red-50/40 dark:bg-red-900/10'
                            : 'text-slate-300 dark:text-slate-600'
                          }`} title="Ajuste por inversão">
                          {(item?.inversao || 0) !== 0
                            ? `${(item.inversao > 0 ? '+' : '')}${Number(item.inversao).toFixed(2)}`
                            : '-'}
                        </td>
                        {SHOW_PROTHEUS && (
                          <td className="px-4 py-3 text-sm text-right text-slate-600 dark:text-slate-400">
                            {Number(saldoProtheus?.saldo_total || 0).toFixed(2)}
                          </td>
                        )}

                        <td className="px-4 py-3 text-sm text-right text-slate-600 dark:text-slate-400">
                          {Number(item?.compras || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-slate-600 dark:text-slate-400">
                          {Number(item?.manual || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">
                          {Number(item?.entrada || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-blue-600 font-medium">
                          {Number(item?.transferencia || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-orange-600 font-medium">
                          {Number(item?.venda || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-red-600 font-medium">
                          {Number(avarias[item?.cod] || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-purple-600 font-medium">
                          {Number(item?.devolucao || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-700/20">
                          {Number(item?.saldo || 0).toFixed(2)}
                        </td>

                        {/* Editable Column */}
                        <td
                          className="px-2 py-2 bg-blue-50/30 dark:bg-blue-900/10"
                          onClick={() => startEdit(item.cod, item.fisico)}
                        >
                          <div className="flex justify-center">
                            {editingCod === item.cod ? (
                              <input
                                autoFocus
                                type="text"
                                inputMode="decimal"
                                value={editingValue}
                                onChange={(e) =>
                                  setEditingValue(e.target.value)
                                }
                                onBlur={cancelEdit}
                                onKeyDown={(e) =>
                                  handleFisicoKeyDown(e, item.cod, index)
                                }
                                onFocus={(e) => e.target.select()}
                                className="w-20 px-2 py-1 text-center text-sm font-bold border-2 border-blue-500 rounded focus:outline-none dark:bg-slate-700 dark:text-white"
                              />
                            ) : (
                              <div
                                className={`h-8 min-w-[3rem] px-2 flex items-center justify-center rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer transition-all ${!podeEditar
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                                  }`}
                              >
                                <span className="font-bold text-blue-700 dark:text-blue-300 text-sm">
                                  {(item?.fisico ?? "") !== ""
                                    ? Number(item.fisico).toFixed(2)
                                    : "-"}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Coluna Diferença (Físico - Saldo) */}
                        <td className="px-4 py-3 text-center">
                          {(() => {
                            const saldo = Number(item?.saldo || 0);
                            const fisico =
                              (item?.fisico ?? "") !== ""
                                ? Number(item.fisico)
                                : 0;
                            const diferenca = fisico - saldo;
                            const cor =
                              diferenca < 0
                                ? "text-red-600 dark:text-red-400" // Falta (físico < saldo = negativo)
                                : diferenca > 0
                                  ? "text-green-600 dark:text-green-400" // Sobra (físico > saldo = positivo)
                                  : "text-slate-600 dark:text-slate-400"; // OK (físico = saldo)
                            return (
                              <span className={`font-bold text-sm ${cor}`}>
                                {diferenca > 0 ? "+" : ""}
                                {diferenca.toFixed(2)}
                              </span>
                            );
                          })()}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center">
                            {renderStatusChip(item)}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex justify-center items-center gap-1">
                            {/* Botão removido conforme solicitação: saldo_produtos não é mais utilizado manualmente */}
                            <button
                              onClick={() => handleAbrirDetalhes(item)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 transition-colors"
                              title="Detalhes"
                            >
                              <span className="material-symbols-rounded text-lg">
                                visibility
                              </span>
                            </button>
                            <button
                              onClick={() => handleAbrirObs(item)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-amber-600 transition-colors relative"
                              title="Observações"
                            >
                              <span className="material-symbols-rounded text-lg">
                                edit_note
                              </span>
                              {observacoes[item.cod]?.texto?.trim() && (
                                <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full"></span>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-4 py-4 border-t border-slate-100 dark:border-slate-700">
            <button
              onClick={() => setCurrentPage((prev) => prev - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        </div>
      </main>
      <Dialog
        open={openAvariaModal}
        onClose={() => setOpenAvariaModal(false)}
        fullWidth
        maxWidth="md"
      ></Dialog>
      <Dialog
        open={openDevolucaoModal}
        onClose={() => setOpenDevolucaoModal(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Lançamento de Devoluções</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Buscar produto"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Cod</strong>
                </TableCell>
                <TableCell>
                  <strong>Produto</strong>
                </TableCell>
                <TableCell>
                  <strong>Cx</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(search
                ? produtosFiltrados
                : produtosFiltrados.slice(0, 20)
              ).map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.cod}</TableCell>
                  <TableCell>
                    {(() => {
                      if (item?.produto && item.produto !== "Desconhecido") {
                        return item.produto;
                      }
                      const codNorm = normalizeCod(item.cod);
                      return (
                        nomesFromProtheus[codNorm] ||
                        nomesFromProtheus[item.cod] ||
                        "⚠️ Produto Sem Nome"
                      );
                    })()}
                  </TableCell>

                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={devolucoes[item.cod]?.unidade || ""}
                      onChange={(e) =>
                        handleChangeDevolucao(item.cod, e.target.value)
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDevolucaoModal(false)}>Fechar</Button>
          <Button variant="contained" onClick={handleSalvarDevolucoes}>
            Salvar Devoluções
          </Button>
        </DialogActions>
      </Dialog>
      <Modal
        isOpen={openDetalhesModal}
        onClose={() => setOpenDetalhesModal(false)}
        title={`Movimentação do Produto - ${detalhesProduto?.produto}`}
        maxWidth="5xl"
      >
        {[
          "entrada",
          "compras",
          "transferencia",
          "venda",
          "avaria",
          "devolucao",
        ].map((tipo) => {
          const icones = {
            entrada: "move_to_inbox",
            compras: "shopping_bag",
            transferencia: "swap_horiz",
            venda: "sell",
            avaria: "warning",
            devolucao: "keyboard_return",
          };

          const colors = {
            entrada: "text-green-500",
            compras: "text-blue-500",
            transferencia: "text-indigo-500",
            venda: "text-orange-500",
            avaria: "text-red-500",
            devolucao: "text-purple-500",
          };

          const dados = movimentacoes[tipo] || [];
          const summary = movimentacoes.summaries?.[tipo] || {
            total: 0,
            count: 0,
          };

          return (
            <div
              key={tipo}
              className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 mb-6 border border-slate-100 dark:border-slate-700 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`material-symbols-rounded text-2xl ${colors[tipo]}`}
                >
                  {icones[tipo]}
                </span>
                <h4 className="text-lg font-bold capitalize text-slate-800 dark:text-white">
                  {tipo}
                </h4>
              </div>

              {dados.length === 0 ? (
                <p className="text-sm text-slate-500 italic">
                  Nenhuma movimentação encontrada.
                </p>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                          {tipo === "venda" ? (
                            <>
                              <th className="p-2 text-xs font-bold text-slate-500 uppercase">
                                Bilhete
                              </th>
                              <th className="p-2 text-xs font-bold text-slate-500 uppercase">
                                Filial
                              </th>
                              <th className="p-2 text-xs font-bold text-slate-500 uppercase">
                                Cliente
                              </th>
                              <th className="p-2 text-xs font-bold text-slate-500 uppercase">
                                Data
                              </th>
                              <th className="p-2 text-xs font-bold text-slate-500 uppercase">
                                Cód. Produto
                              </th>
                              <th className="p-2 text-xs font-bold text-slate-500 uppercase">
                                Produto
                              </th>
                              <th className="p-2 text-xs font-bold text-slate-500 uppercase">
                                Qtd
                              </th>
                              <th className="p-2 text-xs font-bold text-slate-500 uppercase">
                                Un
                              </th>
                            </>
                          ) : tipo === "compras" ? (
                            <>
                              <th className="p-2 text-xs font-bold text-slate-500 uppercase">
                                Nota
                              </th>
                              <th className="p-2 text-xs font-bold text-slate-500 uppercase">
                                Fornecedor
                              </th>
                              <th className="p-2 text-xs font-bold text-slate-500 uppercase">
                                Destino
                              </th>
                              <th className="p-2 text-xs font-bold text-slate-500 uppercase">
                                Data
                              </th>
                              <th className="p-2 text-xs font-bold text-slate-500 uppercase">
                                Cód. Produto
                              </th>
                              <th className="p-2 text-xs font-bold text-slate-500 uppercase">
                                Produto
                              </th>
                              <th className="p-2 text-xs font-bold text-slate-500 uppercase">
                                Qtd
                              </th>
                              <th className="p-2 text-xs font-bold text-slate-500 uppercase">
                                Status
                              </th>
                              <th className="p-2 text-xs font-bold text-slate-500 uppercase">
                                Un
                              </th>
                            </>
                          ) : (
                            <>
                              <th className="p-2 text-xs font-bold text-slate-500 uppercase">
                                Número
                              </th>
                              <th className="p-2 text-xs font-bold text-slate-500 uppercase">
                                Origem
                              </th>
                              <th className="p-2 text-xs font-bold text-slate-500 uppercase">
                                Destino
                              </th>
                              <th className="p-2 text-xs font-bold text-slate-500 uppercase">
                                Data
                              </th>
                              <th className="p-2 text-xs font-bold text-slate-500 uppercase">
                                Cód. Produto
                              </th>
                              <th className="p-2 text-xs font-bold text-slate-500 uppercase">
                                Produto
                              </th>
                              <th className="p-2 text-xs font-bold text-slate-500 uppercase">
                                Qtd
                              </th>
                              <th className="p-2 text-xs font-bold text-slate-500 uppercase">
                                Status
                              </th>
                              <th className="p-2 text-xs font-bold text-slate-500 uppercase">
                                Un
                              </th>
                              <th className="p-2 text-xs font-bold text-slate-500 uppercase">
                                Log
                              </th>
                            </>
                          )}
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {["transferencia", "entrada"].includes(tipo)
                          ? (() => {
                            const agrupadoPorDestino = dados.reduce(
                              (acc, item) => {
                                const destino =
                                  item.destino || "Desconhecido";
                                if (!acc[destino]) acc[destino] = [];
                                acc[destino].push(item);
                                return acc;
                              },
                              {}
                            );

                            return Object.entries(agrupadoPorDestino).map(
                              ([destino, registros], idx) => (
                                <React.Fragment key={idx}>
                                  <tr className="bg-slate-50 dark:bg-slate-700/50">
                                    <td
                                      colSpan={10}
                                      className="p-2 text-sm font-bold text-slate-700 dark:text-slate-200"
                                    >
                                      Destino: {destino}
                                    </td>
                                  </tr>

                                  {registros.map((row, i) => (
                                    <tr
                                      key={i}
                                      className="hover:bg-slate-50 dark:hover:bg-slate-700/20"
                                    >
                                      <td className="p-2 text-sm text-slate-600 dark:text-slate-300">
                                        {row.numero || "-"}
                                      </td>
                                      <td className="p-2 text-sm text-slate-600 dark:text-slate-300">
                                        {row.origem || "-"}
                                      </td>
                                      <td className="p-2 text-sm text-slate-600 dark:text-slate-300">
                                        {row.destino || "-"}
                                      </td>
                                      <td className="p-2 text-sm text-slate-600 dark:text-slate-300">
                                        {row.data_inclusao
                                          ? new Date(
                                            row.data_inclusao
                                          ).toLocaleDateString("pt-BR")
                                          : "-"}
                                      </td>
                                      <td className="p-2 text-sm text-slate-600 dark:text-slate-300">
                                        {row.cod_produto || row.codpro || "-"}
                                      </td>
                                      <td className="p-2 text-sm text-slate-600 dark:text-slate-300 whitespace-normal break-words max-w-xs">
                                        {row.descricao ||
                                          row.nome_produto ||
                                          row.produto ||
                                          "-"}
                                      </td>
                                      <td className="p-2 text-sm font-medium text-slate-800 dark:text-white">
                                        {Number(row.quantidade || 0).toFixed(
                                          2
                                        )}
                                      </td>
                                      <td className="p-2 text-sm text-slate-600 dark:text-slate-300">
                                        {(() => {
                                          const status = (row.status || "")
                                            .normalize("NFD")
                                            .replace(/\p{Diacritic}/gu, "")
                                            .toLowerCase();

                                          switch (status) {
                                            case "concluido":
                                              return (
                                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                                                  Concluído
                                                </span>
                                              );
                                            case "pendente":
                                              return (
                                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                                  Pendente
                                                </span>
                                              );
                                            case "recusado":
                                              return (
                                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                                                  Recusado
                                                </span>
                                              );
                                            default:
                                              return row.status || "-";
                                          }
                                        })()}
                                      </td>
                                      <td className="p-2 text-sm text-slate-600 dark:text-slate-300">
                                        {row.unidade || "-"}
                                      </td>
                                      <td className="p-2 text-sm text-slate-600 dark:text-slate-300">
                                        <button
                                          onClick={() => abrirLogsTransferencia(row.numero)}
                                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-blue-600 transition-colors"
                                          title="Ver logs da transferência"
                                        >
                                          <span className="material-symbols-rounded text-lg">history</span>
                                        </button>
                                      </td>
                                    </tr>
                                  ))}

                                  {/* total do grupo */}
                                  <tr className="bg-slate-50 dark:bg-slate-700/30 border-t border-slate-200 dark:border-slate-600">
                                    <td colSpan={5} />
                                    <td className="p-2 text-right text-sm font-bold text-slate-600 dark:text-slate-300">
                                      Total:
                                    </td>
                                    <td className="p-2 text-sm font-bold text-slate-800 dark:text-white">
                                      {registros
                                        .filter((r) =>
                                          (r.status || "")
                                            .normalize("NFD")
                                            .replace(/\p{Diacritic}/gu, "")
                                            .toLowerCase()
                                            .includes("concluido")
                                        )
                                        .reduce(
                                          (soma, r) =>
                                            soma + Number(r.quantidade || 0),
                                          0
                                        )
                                        .toFixed(2)}
                                    </td>
                                    <td colSpan={3} />
                                  </tr>
                                </React.Fragment>
                              )
                            );
                          })()
                          : tipo === "compras"
                            ? dados.map((row, idx) => (
                              <tr
                                key={idx}
                                className="hover:bg-slate-50 dark:hover:bg-slate-700/20"
                              >
                                <td className="p-2 text-sm text-slate-600 dark:text-slate-300">
                                  {row.nota || "-"}
                                </td>
                                <td className="p-2 text-sm text-slate-600 dark:text-slate-300">
                                  {row.fornecedor || "-"}
                                </td>
                                <td className="p-2 text-sm text-slate-600 dark:text-slate-300">
                                  {row.destino || "-"}
                                </td>
                                <td className="p-2 text-sm text-slate-600 dark:text-slate-300">
                                  {row.data_br || "-"}
                                </td>
                                <td className="p-2 text-sm text-slate-600 dark:text-slate-300">
                                  {row.codpro || row.cod_produto || "-"}
                                </td>
                                <td className="p-2 text-sm text-slate-600 dark:text-slate-300 whitespace-normal break-words max-w-xs">
                                  {row.nome_produto ||
                                    row.descricao ||
                                    row.produto ||
                                    "-"}
                                </td>
                                <td className="p-2 text-sm font-medium text-slate-800 dark:text-white">
                                  {Number(
                                    row.qtd_lancada || row.quantidade || 0
                                  ).toFixed(2)}
                                </td>
                                <td className="p-2 text-sm text-slate-600 dark:text-slate-300">
                                  {row.status || "-"}
                                </td>
                                <td className="p-2 text-sm text-slate-600 dark:text-slate-300">
                                  {row.unidade || "-"}
                                </td>
                              </tr>
                            ))
                            : // vendas (padrão)
                            dados.map((row, idx) => (
                              <tr
                                key={idx}
                                className="hover:bg-slate-50 dark:hover:bg-slate-700/20"
                              >
                                <td className="p-2 text-sm text-slate-600 dark:text-slate-300">
                                  {row.numero || row.bilhete || "-"}
                                </td>
                                <td className="p-2 text-sm text-slate-600 dark:text-slate-300">
                                  {row.origem || row.filial || "-"}
                                </td>
                                <td className="p-2 text-sm text-slate-600 dark:text-slate-300">
                                  {row.destino || row.cliente || "-"}
                                </td>
                                <td className="p-2 text-sm text-slate-600 dark:text-slate-300">
                                  {row.data_br || "-"}
                                </td>
                                <td className="p-2 text-sm text-slate-600 dark:text-slate-300">
                                  {row.cod_produto || row.codpro || "-"}
                                </td>
                                <td className="p-2 text-sm text-slate-600 dark:text-slate-300 whitespace-normal break-words max-w-xs">
                                  {row.descricao ||
                                    row.nome_produto ||
                                    row.produto ||
                                    "-"}
                                </td>
                                <td className="p-2 text-sm font-medium text-slate-800 dark:text-white">
                                  {Number(
                                    row.qtd_lancada || row.quantidade || 0
                                  ).toFixed(2)}
                                </td>
                                <td className="p-2 text-sm text-slate-600 dark:text-slate-300">
                                  {row.status || "-"}
                                </td>
                                <td className="p-2 text-sm text-slate-600 dark:text-slate-300">
                                  {row.unidade || "-"}
                                </td>
                              </tr>
                            ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-2 text-right text-sm text-slate-600 dark:text-slate-300">
                    <strong>Quantidade:</strong> {summary.count} |{" "}
                    <strong>Total:</strong>{" "}
                    <span className="font-bold text-slate-800 dark:text-white">
                      {Number(summary.total || 0).toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </Modal>

      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Contagem Física de Produtos</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Buscar produto"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Cod</strong>
                </TableCell>
                <TableCell>
                  <strong>Produto</strong>
                </TableCell>
                <TableCell>
                  <strong>Físico</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {saldos
                .filter(
                  (item) =>
                    item.produto.toLowerCase().includes(search.toLowerCase()) &&
                    Number(item.saldo) !== 0
                )

                .sort((a, b) => a.produto.localeCompare(b.produto))
                //.slice(0, 50) // ← se quiser limitar pra performance
                .map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.cod}</TableCell>
                    <TableCell>{item.produto}</TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={
                          fisico[item.cod] === undefined ? "" : fisico[item.cod]
                        }
                        onChange={(e) =>
                          handleChangeFisico(item.cod, e.target.value)
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions
          sx={{
            flexDirection: "column",
            alignItems: "stretch",
            gap: 1,
            px: 3,
            pb: 2,
          }}
        >
          {Object.entries(fisico).length > 0 &&
            produtosPendentes.length > 0 && (
              <Alert severity="warning">
                Existem <strong>{produtosPendentes.length}</strong> produtos com
                saldo inicial diferente de zero sem contagem física preenchida.
              </Alert>
            )}

          <Box display="flex" justifyContent="space-between">
            <Button onClick={() => setOpenModal(false)}>Fechar</Button>
            <Box display="flex" gap={1}>
              <Button
                variant="contained"
                onClick={() => {
                  handleSalvarContagem();
                }}
              >
                Salvar Contagem
              </Button>
            </Box>
          </Box>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmarFechamento}
        onClose={() => setConfirmarFechamento(false)}
      >
        <DialogTitle>Confirmação</DialogTitle>
        <DialogContent>
          <Typography>
            Deseja realmente <strong>fechar o estoque do dia</strong>?<br />
            Após isso, o saldo atual será gravado como saldo inicial do próximo
            dia.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmarFechamento(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={async () => {
              setConfirmarFechamento(false);
              await handleFechamentoDoDia();
            }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
      >
        <DialogTitle>Confirmar Contagem com Pendências</DialogTitle>
        <DialogContent>
          <Typography>
            Existem <strong>{produtosPendentes.length}</strong> produtos sem
            contagem física preenchida.
            <br />
            Deseja salvar a contagem mesmo assim?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)} color="primary">
            Não
          </Button>
          <Button
            onClick={() => {
              setShowConfirmDialog(false);
              salvarContagemFinal();
            }}
            variant="contained"
            color="warning"
          >
            Sim, continuar
          </Button>
        </DialogActions>
      </Dialog>

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
        open={loadingSync}
      >
        <CircularProgress color="inherit" />
        <Typography variant="h6" mt={2}>
          Atualizando dados... Por favor, aguarde.
        </Typography>
      </Backdrop>

      <Backdrop
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer + 2,
          flexDirection: "column",
        }}
        open={loadingFechamento}
      >
        <CircularProgress color="inherit" />
        <Typography
          variant="h6"
          mt={2}
          sx={{ textAlign: "center", maxWidth: "400px" }}
        >
          {loadingFechamentoMsg}
        </Typography>
        <Typography
          variant="body2"
          mt={1}
          sx={{ textAlign: "center", opacity: 0.8, maxWidth: "400px" }}
        >
          Não feche esta janela durante o processo.
        </Typography>
      </Backdrop>
      <Modal
        isOpen={confirmarPreFechamento}
        onClose={() => setConfirmarPreFechamento(false)}
        title="Pré-Fechamento"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-300">
            Deseja realmente realizar o{" "}
            <strong className="text-slate-800 dark:text-white">
              pré-fechamento
            </strong>{" "}
            do dia{" "}
            <strong>
              {new Date(`${filtroData}T12:00:00`).toLocaleDateString("pt-BR")}
            </strong>
            ?
            <br />O saldo será salvo para conferência.
          </p>

          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={() => setConfirmarPreFechamento(false)}
              className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={async () => {
                setConfirmarPreFechamento(false);
                await handlePreFechamento();
              }}
              className="px-4 py-2 text-sm font-bold bg-pink-600 hover:bg-pink-700 text-white rounded-xl transition-colors shadow-sm"
            >
              Confirmar
            </button>
          </div>
        </div>
      </Modal>
      <Dialog open={dialogLocais} onClose={() => setDialogLocais(false)}>
        <DialogTitle>Trocar Local</DialogTitle>
        <DialogContent>
          <Typography>Selecione o local desejado:</Typography>
          <Stack spacing={2} mt={2}>
            {locaisPermitidos.map((local) => (
              <Button
                key={local}
                variant="contained"
                fullWidth
                onClick={() => trocarLocal(local)}
              >
                Local: {local}
              </Button>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogLocais(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
      <Modal
        isOpen={openObsModal}
        onClose={() => {
          if (!salvandoObs) {
            setOpenObsModal(false);
            setObsItem(null);
            setObsText("");
          }
        }}
        title={`Observação — ${obsItem?.cod || ""} • ${obsItem
          ? obsItem.produto ||
          nomesFromProtheus[normalizeCod(obsItem.cod)] ||
          "Produto"
          : ""
          }`}
        maxWidth="4xl"
      >
        <div className="space-y-6">
          <div className="text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
            Local:{" "}
            <strong className="text-slate-700 dark:text-slate-200">
              {origemUsuario}
            </strong>{" "}
            | Data:{" "}
            <strong className="text-slate-700 dark:text-slate-200">
              {new Date(`${filtroData}T12:00:00`).toLocaleDateString("pt-BR")}
            </strong>
          </div>

          {/* GRUPO DE MOTIVOS */}
          <div>
            <label
              className={`block text-sm font-bold mb-3 ${somenteLeituraObs || motivoSelecionado
                ? "text-slate-700 dark:text-slate-200"
                : "text-red-500"
                }`}
            >
              Selecione o Motivo (Obrigatório)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {MOTIVOS_OBRIGATORIOS.map((motivo) => {
                const isSelected = motivoSelecionado === motivo;
                return (
                  <button
                    key={motivo}
                    disabled={somenteLeituraObs}
                    onClick={() => {
                      if (!somenteLeituraObs) {
                        setMotivoSelecionado(motivo);
                        setListaInversoes([{ produto: null, qtd: "" }]);
                      }
                    }}
                    className={`px-3 py-3 rounded-xl border text-sm font-medium transition-all ${isSelected
                      ? "bg-blue-600 text-white border-blue-600 shadow-md transform scale-[1.02]"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                      } ${somenteLeituraObs ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                  >
                    {getMotivoLabel(motivo)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* INVERSÃO */}
          <div
            className={`transition-all duration-500 overflow-hidden ${motivoSelecionado === "Inversão"
              ? "opacity-100 max-h-[1000px] mb-4"
              : "opacity-0 max-h-0"
              }`}
          >
            <div className="bg-amber-50 dark:bg-amber-900/10 p-5 rounded-2xl border border-amber-100 dark:border-amber-900/20 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
                  <span className="material-symbols-rounded text-lg">swap_horiz</span>
                  Detalhamento de Inversões
                </h4>
                <button
                  type="button"
                  onClick={addInversaoRow}
                  disabled={somenteLeituraObs}
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  <span className="material-symbols-rounded text-sm">add</span>
                  Adicionar Outro
                </button>
              </div>

              <div className="space-y-3">
                {listaInversoes.map((inv, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row gap-3 p-3 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm animate-in fade-in slide-in-from-top-1 duration-300">
                    <div className="flex-grow">
                      <Autocomplete
                        options={produtosInversao}
                        getOptionLabel={(option) =>
                          `${option.codigo_produto} - ${option.descricao}`
                        }
                        value={inv.produto}
                        isOptionEqualToValue={(option, value) =>
                          option.codigo_produto === value.codigo_produto
                        }
                        onChange={(event, newValue) => {
                          if (!somenteLeituraObs) {
                            updateInversaoRow(idx, 'produto', newValue);
                          }
                        }}
                        onInputChange={(event, newInputValue) => {
                          if (!somenteLeituraObs) {
                            setSearchProdutoInversao(newInputValue);
                            fetchProdutoInversao(newInputValue);
                          }
                        }}
                        disabled={somenteLeituraObs}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Produto Invertido"
                            variant="outlined"
                            size="small"
                            fullWidth
                            required
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                borderRadius: "0.75rem",
                                backgroundColor: "white",
                              },
                            }}
                          />
                        )}
                        filterOptions={(options) =>
                          options.filter((o) => o.codigo_produto !== obsItem.cod)
                        }
                      />
                    </div>

                    <div className="w-full sm:w-32">
                      <TextField
                        label="Quantidade"
                        type="number"
                        size="small"
                        fullWidth
                        required
                        disabled={somenteLeituraObs}
                        value={inv.qtd}
                        onChange={(e) => !somenteLeituraObs && updateInversaoRow(idx, 'qtd', e.target.value)}
                        inputProps={{ min: 0, step: "0.01" }}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                                borderRadius: "0.75rem",
                                backgroundColor: "white",
                              },
                        }}
                      />
                    </div>

                    {!somenteLeituraObs && (
                      <button
                        type="button"
                        onClick={() => removeInversaoRow(idx)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                        title="Remover este produto"
                      >
                        <span className="material-symbols-rounded text-xl">delete</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>


          {/* TEXTO */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Observação Adicional
            </label>
            <textarea
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
              rows={5}
              placeholder="Escreva aqui detalhes adicionais..."
              value={obsText}
              onChange={(e) => !somenteLeituraObs && setObsText(e.target.value)}
              disabled={somenteLeituraObs}
            />

            {somenteLeituraObs && (
              <p className="text-xs text-amber-600 mt-2 font-medium">
                ⚠ Este local já foi fechado. Modo somente leitura.
              </p>
            )}

            {observacoes[obsItem?.cod]?.atualizadoEm && (
              <p className="text-xs text-slate-400 mt-2">
                Última atualização:{" "}
                {new Date(observacoes[obsItem.cod].atualizadoEm).toLocaleString(
                  "pt-BR"
                )}
              </p>
            )}
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button
              onClick={() => {
                setOpenObsModal(false);
                setObsItem(null);
                setObsText("");
                setMotivoSelecionado("");
              }}
              disabled={salvandoObs}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              Fechar
            </button>
            {!somenteLeituraObs && (
              <button
                onClick={handleSalvarObs}
                disabled={salvandoObs || !motivoSelecionado}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {salvandoObs ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Salvando...
                  </>
                ) : (
                  "Salvar Observação"
                )}
              </button>
            )}
          </div>
        </div>
      </Modal>
      <Dialog
        open={askRelFaltas}
        disableEscapeKeyDown
        onClose={(e, reason) => {
          // bloqueia fechar por ESC ou clique fora
          if (reason === "backdropClick" || reason === "escapeKeyDown") return;
          setAskRelFaltas(false);
        }}
      >
        <DialogTitle>Gerar relatório de faltas (obrigatório)</DialogTitle>
        <DialogContent>
          <Typography>
            {fechamentoParams ? (
              <>
                Operação concluída para o{" "}
                <strong>local {fechamentoParams.local}</strong> na data{" "}
                <strong>
                  {new Date(
                    `${fechamentoParams.data}T12:00:00`
                  ).toLocaleDateString("pt-BR")}
                </strong>
                .
              </>
            ) : (
              <>Operação concluída.</>
            )}
            <br />
            Abra o <em>Relatório de Faltas</em> para impressão e conferência.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            disabled={!fechamentoParams}
            onClick={() => {
              if (fechamentoParams) abrirRelatorioFaltas(fechamentoParams);
              setAskRelFaltas(false);
            }}
          >
            Abrir relatório
          </Button>
        </DialogActions>
      </Dialog>

      <Modal
        isOpen={openLogModal}
        onClose={() => setOpenLogModal(false)}
        title={`Log do Fechamento — Local ${origemUsuario} • ${new Date(
          `${filtroData}T12:00:00`
        ).toLocaleDateString("pt-BR")}`}
        maxWidth="4xl"
      >
        {loadingLogs ? (
          <div className="flex justify-center py-4">
            <CircularProgress />
          </div>
        ) : logsFechamento.length === 0 ? (
          <p className="text-slate-500 text-center">
            Nenhum registro encontrado para esta data e local.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3 text-xs font-bold text-slate-500 uppercase">
                      Quando
                    </th>
                    <th className="p-3 text-xs font-bold text-slate-500 uppercase">
                      Ação
                    </th>
                    <th className="p-3 text-xs font-bold text-slate-500 uppercase">
                      Status
                    </th>
                    <th className="p-3 text-xs font-bold text-slate-500 uppercase">
                      Usuário
                    </th>
                    <th className="p-3 text-xs font-bold text-slate-500 uppercase">
                      Mensagem
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {logsFechamento.map((l) => (
                    <tr
                      key={l.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/30"
                    >
                      <td className="p-3 text-sm text-slate-600 dark:text-slate-300">
                        {l.criado_em
                          ? new Date(l.criado_em).toLocaleString("pt-BR")
                          : "-"}
                      </td>
                      <td className="p-3 text-sm text-slate-600 dark:text-slate-300">
                        {labelTipo(l.tipo)}
                      </td>
                      <td className="p-3">
                        {l.status === "success" ? (
                          <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                            Sucesso
                          </span>
                        ) : l.status === "error" ? (
                          <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                            Erro
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {l.status || "-"}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-sm text-slate-600 dark:text-slate-300 font-medium">
                        {l.usuario || "-"}
                      </td>
                      <td
                        className="p-3 text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate"
                        title={
                          l.tipo === "pre"
                            ? "Fechamento realizado com sucesso"
                            : l.mensagem || ""
                        }
                      >
                        {l.tipo === "pre"
                          ? "Fechamento realizado com sucesso"
                          : l.mensagem || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Resumo */}
            {(() => {
              const pre = logsFechamento.find((x) => x.tipo === "pre");
              const reabPre = logsFechamento.find(
                (x) => x.tipo === "reabertura_pre"
              );
              const reabFech = logsFechamento.find(
                (x) => x.tipo === "reabertura_fech"
              );
              const temResumo = pre || reabPre || reabFech;

              if (!temResumo) return null;

              return (
                <div className="mt-6 bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                  <h4 className="font-bold text-slate-800 dark:text-white mb-2">
                    Resumo da Operação
                  </h4>
                  <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                    {pre && (
                      <li>
                        • <strong>Pré-fechado por:</strong> {pre.usuario} em{" "}
                        {new Date(pre.criado_em).toLocaleString("pt-BR")}
                      </li>
                    )}
                    {reabPre && (
                      <li>
                        • <strong>Reaberto (pré) por:</strong> {reabPre.usuario}{" "}
                        em {new Date(reabPre.criado_em).toLocaleString("pt-BR")}
                      </li>
                    )}
                    {reabFech && (
                      <li>
                        • <strong>Reaberto (fech.) por:</strong>{" "}
                        {reabFech.usuario} em{" "}
                        {new Date(reabFech.criado_em).toLocaleString("pt-BR")}
                      </li>
                    )}
                  </ul>
                </div>
              );
            })()}
          </>
        )}
      </Modal>
      <Modal
        isOpen={modalTransfLogsOpen}
        onClose={() => setModalTransfLogsOpen(false)}
        title="Logs de Auditoria"
        maxWidth="2xl"
      >
        <div className="overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-2 font-bold text-slate-500">Ação</th>
                <th className="px-4 py-2 font-bold text-slate-500">Usuário</th>
                <th className="px-4 py-2 font-bold text-slate-500">Data</th>
                <th className="px-4 py-2 font-bold text-slate-500">Obs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {logsTransf.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500 italic">
                    Nenhum log encontrado para esta transferência.
                  </td>
                </tr>
              ) : (
                logsTransf.map((log, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{log.acao}</td>
                    <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-200">{log.usuario}</td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                      {new Date(log.data_hora).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{log.observacao || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
};

export default HomeEstoque;
