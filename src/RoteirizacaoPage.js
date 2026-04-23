import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Button,
  Box,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Divider,
  Collapse,
  LinearProgress,
  Switch,
  FormControlLabel,
  Backdrop,
  CircularProgress,
  Typography,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  Today as TodayIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Logout as LogoutIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Print as PrintIcon,
  Description as DescriptionIcon,
  StarBorder as StarBorderIcon,
  Star as StarIcon,
  Tune as TuneIcon,
  Search as SearchIcon,
  FilterAlt as FilterAltIcon,
  LocalShipping as LocalShippingIcon
} from "@mui/icons-material";
import axios from "axios";
import { API_BASE_URL } from './utils/apiConfig';
// Sub-components extracted
import MiniProgress from "./Roteirizacao/MiniProgress";
import InfoDialog from "./Roteirizacao/InfoDialog";
import ConfirmPrintDialog from "./Roteirizacao/ConfirmPrintDialog";
import MissingFilesDialog from "./Roteirizacao/MissingFilesDialog";
import OrderEntregaDialog from "./Roteirizacao/OrderEntregaDialog";
import { alpha } from "@mui/material/styles";

/* ---------- helpers ---------- teste */
const fmtDateBR = (yyyymmdd) => {
  if (!yyyymmdd) return "";
  const s = String(yyyymmdd);
  if (s.length !== 8) return s;
  return `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)}`;
};
const toYYYYMMDD = (ddmmyyyy) => {
  if (!ddmmyyyy) return "";
  const digits = ddmmyyyy.replace(/\D/g, "").slice(0, 8);
  if (digits.length < 8) return "";
  const dd = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);
  return `${yyyy}${mm}${dd}`;
};
const toDDMMYYYY = (yyyymmdd) => fmtDateBR(yyyymmdd);

const todayYYYYMMDD = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}${mm}${dd}`;
};
const addDaysYYYYMMDD = (yyyymmdd, delta) => {
  const y = Number(yyyymmdd.slice(0, 4));
  const m = Number(yyyymmdd.slice(4, 6)) - 1;
  const d = Number(yyyymmdd.slice(6, 8));
  const dt = new Date(y, m, d);
  dt.setDate(dt.getDate() + delta);
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}${mm}${dd}`;
};
// sort
function descendingComparator(a, b, orderBy) {
  if (b[orderBy] < a[orderBy]) return -1;
  if (b[orderBy] > a[orderBy]) return 1;
  return 0;
}
function getComparator(order, orderBy) {
  return order === "desc"
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}
function stableSort(array, comparator) {
  const stabilized = array.map((el, idx) => [el, idx]);
  stabilized.sort((a, b) => {
    const ord = comparator(a[0], b[0]);
    if (ord !== 0) return ord;
    return a[1] - b[1];
  });
  return stabilized.map((el) => el[0]);
}
const brMoney = (n) =>
  (Number(n) || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

// === Agente local de impressão ===
const LOCAL_AGENT = "http://127.0.0.1:3007";

/* ---------- Agrupamento por CLIENTE para o modal ---------- */
function groupByClienteDetalhe(linhas) {
  const map = new Map();
  (linhas || []).forEach((c) => {
    const clienteId = c.ZB_CLIENTE;
    const nome = c.ZB_NOMCLI || String(clienteId);
    const key = `${clienteId}::${nome}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        clienteId,
        nome,
        vendedor: c.ZB_VEND || null,
        total: 0,
        bilhetes: [],
        statusPreferencial: c.ZB_NUMSEQ ? "Faturada" : "Pendente",
      });
    }
    const g = map.get(key);
    g.total += Number(c.ZB_TOTBIL || 0);
    g.bilhetes.push({
      bilhete: c.ZB_NUMSEQ,
      nota: c.ZB_NOTA,
      total: Number(c.ZB_TOTBIL || 0),
      status: c.ZB_NUMSEQ ? "Faturada" : "Pendente",
      raw: c,
    });
  });
  return Array.from(map.values());
}

export default function RoteirizacaoPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const lastPrintRef = useRef(null);
  const agentPendingRef = useRef(null);

  // filial fixa
  const filial = "01";

  // data
  const [dtsaida, setDtsaida] = useState(todayYYYYMMDD());
  const [dateInput, setDateInput] = useState(toDDMMYYYY(dtsaida));
  const LS_FAV_KEY = `roteirizacao:favs:${filial}:${dtsaida}`;

  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  // filtro: 100% faturadas
  const [onlyFull, setOnlyFull] = useState(false);
  // Auto refresh
  const [isAuto, setIsAuto] = useState(false);

  // favoritos
  const [favorites, setFavorites] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_FAV_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(arr);
    } catch {
      return new Set();
    }
  });

  // paginação/ordenação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("ZH_ROTA");

  // expansão/cache
  const [expanded, setExpanded] = useState(() => new Set());
  const [clientesMap, setClientesMap] = useState({});

  // dialogs
  const [confirmData, setConfirmData] = useState(null);
  const [info, setInfo] = useState(null);
  const [missingDlg, setMissingDlg] = useState({ open: false, summary: [] });

  // modal organização
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderCarga, setOrderCarga] = useState(null);
  const [orderGrupos, setOrderGrupos] = useState([]);

  const username = localStorage.getItem("username") || "Usuário";
  const [fileStatus, setFileStatus] = useState({});

  // LOGOUT
  const logout = () => {
    sessionStorage.clear();
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  // --- Config Impressora ---
  const [printerConfigOpen, setPrinterConfigOpen] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState("");

  const handleOpenPrinterConfig = async () => {
    setSelectedPrinter(localStorage.getItem("printerName") || "");
    setPrinterConfigOpen(true);
    try {
      const res = await fetch(`${LOCAL_AGENT}/printers`);
      const json = await res.json();
      if (json.ok) {
        setAvailablePrinters(json.printers || []);
      } else {
        console.error("Erro listando impressoras:", json.error);
      }
    } catch (err) {
      console.error("Erro fetch impressoras:", err);
    }
  };

  const handleSavePrinter = () => {
    localStorage.setItem("printerName", selectedPrinter);
    setPrinterConfigOpen(false);
    setInfo({ title: "Configuração Salva", message: `Impressora definida: ${selectedPrinter || "Padrão do Windows"}` });
  };

  // --- Função do AGENTE local ---
  const sendToAgentWithConfirm = async (payload) => {
    try {
      const res1 = await fetch(`${LOCAL_AGENT}/store-and-print`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, force: false }),
      });
      const data1 = await res1.json();

      if (data1.needConfirm) {
        setMissingDlg({ open: true, summary: data1.foundSummary || [] });
        agentPendingRef.current = { ...payload, force: true };
        return { ok: false, pendingConfirm: true };
      }

      if (res1.ok && data1.ok) return { ok: true, result: data1 };
      return { ok: false, error: data1.error || "print_failed", detail: data1 };
    } catch (e) {
      return { ok: false, error: "agent_unreachable", detail: String(e) };
    }
  };

  // Cache local para duplicidade de impressão automática
  // Armazena no localStorage: `roteirizacao:printed:${dtsaida}` = JSON array de cargas
  const markAsPrinted = (carga) => {
    const key = `roteirizacao:printed:${dtsaida}`;
    try {
      const raw = localStorage.getItem(key);
      const arr = raw ? JSON.parse(raw) : [];
      if (!arr.includes(carga)) {
        arr.push(carga);
        localStorage.setItem(key, JSON.stringify(arr));
      }
    } catch { }
  };

  const isAlreadyPrinted = (carga) => {
    const key = `roteirizacao:printed:${dtsaida}`;
    try {
      const raw = localStorage.getItem(key);
      const arr = raw ? JSON.parse(raw) : [];
      return arr.includes(carga);
    } catch { return false; }
  };

  // --- FETCH DATA ---
  const fetchData = useCallback(async (isAutoRefresh = false) => {
    if (!isAutoRefresh) setLoading(true);
    setError("");
    try {
      const { data } = await axios.get(
        `${API_BASE_URL}/roteirizacao/protheus`,
        { params: { filial, dtsaida } }
      );
      const mapped = (data || []).map((r, idx) => ({
        id: `${r.ZH_CODIGO}-${idx}`,
        ...r,
        TOT_CLIENTES: Number(r.TOT_CLIENTES || 0),
        QT_FATURADAS: Number(r.QT_FATURADAS || 0),
        QT_PENDENTES: Number(r.QT_PENDENTES || 0),
        PCT_FATURADAS: Number(r.PCT_FATURADAS || 0),
      }));
      setRows(mapped);

      // Se for refresh automático, não reseta paginação/expansão
      if (!isAutoRefresh) {
        setPage(0);
        setExpanded(new Set());
        setClientesMap({});
      }
    } catch (e) {
      console.error(e);
      if (!isAutoRefresh) setError("Falha ao carregar dados de roteirização.");
      // Se falhar no auto, mantém dados antigos ou avisa sutilmente
    } finally {
      if (!isAutoRefresh) setLoading(false);
    }
  }, [filial, dtsaida]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // AUTO REFRESH LOGIC
  useEffect(() => {
    let interval;
    if (isAuto) {
      interval = setInterval(() => {
        fetchData(true);
      }, 10000); // 10 segundos
    }
    return () => clearInterval(interval);
  }, [isAuto, fetchData]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_FAV_KEY, JSON.stringify([...favorites]));
    } catch { }
  }, [favorites, LS_FAV_KEY]);

  const filteredRows = useMemo(() => {
    let base = rows;
    if (onlyFull) {
      base = base.filter((r) => Number(r.PCT_FATURADAS || 0) >= 100);
    }
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter((r) =>
      [r.ZH_NOME, r.ZH_ROTA, r.ZH_VEICULO, r.ZH_NOMVEI]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, search, onlyFull]);

  const sortedBase = useMemo(
    () => stableSort(filteredRows, getComparator(order, orderBy)),
    [filteredRows, order, orderBy]
  );

  const prioritized = useMemo(() => {
    if (!favorites.size) return sortedBase;
    const favs = [];
    const rest = [];
    for (const r of sortedBase) {
      (favorites.has(r.ZH_CODIGO) ? favs : rest).push(r);
    }
    return [...favs, ...rest];
  }, [sortedBase, favorites]);

  const paginatedRows = useMemo(() => {
    const start = page * rowsPerPage;
    return prioritized.slice(start, start + rowsPerPage);
  }, [prioritized, page, rowsPerPage]);

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const loadClientes = async (carga) => {
    setClientesMap((m) => ({
      ...m,
      [carga]: { loading: true, data: m[carga]?.data || [] },
    }));
    try {
      const { data } = await axios.get(
        `${API_BASE_URL}/roteirizacao/protheus/clientes`,
        { params: { filial, carga, dtsaida } }
      );
      setClientesMap((m) => ({
        ...m,
        [carga]: { loading: false, data: data || [] },
      }));
    } catch (e) {
      console.error(e);
      setClientesMap((m) => ({ ...m, [carga]: { loading: false, data: [] } }));
    }
  };

  const toggleExpand = (row) => {
    const carga = row.ZH_CODIGO;
    const next = new Set(expanded);
    if (next.has(carga)) next.delete(carga);
    else {
      next.add(carga);
      if (!clientesMap[carga]) loadClientes(carga);
    }
    setExpanded(next);
  };

  const toggleFavorite = (carga) => {
    setFavorites((old) => {
      const n = new Set(old);
      if (n.has(carga)) n.delete(carga);
      else n.add(carga);
      return n;
    });
  };

  const showBackendInfo = (data) => {
    if (data.needConfirm) {
      setMissingDlg({ open: true, summary: data.foundSummary || [] });
      return "confirm";
    }
    if (data.ok) return "ready_to_agent";

    if (data.error === "sumatra_missing") {
      setInfo({
        title: "Configuração necessária",
        message:
          (data.hint ||
            "Impressor de PDF ausente. Configure o SUMATRA_PATH no backend.") +
          "\n\nEx.: C:\\Tools\\SumatraPDF\\SumatraPDF.exe",
      });
      return "fail";
    }
    if (data.error === "no_files" || data.error === "no_files_for_bilhetes") {
      setInfo({
        title: "Nada para imprimir",
        message:
          "Nenhum arquivo encontrado para os bilhetes desta rota em C:\\relato.",
      });
      return "fail";
    }
    if (data.error === "sem_clientes") {
      setInfo({
        title: "Atenção",
        message: "Não há clientes para esta carga.",
      });
      return "fail";
    }
    if (data.error === "not_found") {
      setInfo({
        title: "Não encontrado",
        message: "Cabeçalho da rota não encontrado no Protheus.",
      });
      return "fail";
    }

    setInfo({ title: "Falha", message: data.hint || data.error || "Erro." });
    return "fail";
  };

  const postPrint = async ({ row, orderedBilhetes, force = false }) => {
    const body = {
      filial,
      dtsaida,
      carga: row.ZH_CODIGO,
      force,
      orderedBilhetes:
        orderedBilhetes && orderedBilhetes.length ? orderedBilhetes : undefined,
    };
    const { data } = await axios.post(
      `${API_BASE_URL}/roteirizacao/protheus/print`,
      body
    );
    return data;
  };

  const postCapa = async ({ row, orderedBilhetes }) => {
    const body = {
      filial,
      dtsaida,
      carga: row.ZH_CODIGO,
      orderedBilhetes:
        orderedBilhetes && orderedBilhetes.length ? orderedBilhetes : undefined,
    };
    const { data } = await axios.post(
      `${API_BASE_URL}/roteirizacao/protheus/capa`,
      body
    );
    return data;
  };

  // Nova função para forçar impressão (usada quando o usuário aceita faltas)
  const handleForcedPrint = async (last) => {
    try {
      setPrinting(true);
      const data2 = await postPrint({
        row: last.row,
        orderedBilhetes: last.orderedBilhetes,
        force: true,
      });

      const status2 = showBackendInfo(data2);

      if (status2 === "ready_to_agent" && data2.mergedPdf) {
        const preferred = localStorage.getItem("printerName") || "FATURAMENTO VI";
        const agentPayload = {
          capa: {
            name: `ROTA_COMPLETA_${last.row.ZH_CODIGO}.pdf`,
            base64: data2.mergedPdf
          },
          files: [],
          printer: preferred,
        };

        const agentRes = await sendToAgentWithConfirm(agentPayload);
        if (agentRes.pendingConfirm) return; // Nao deve acontecer com force=true, mas...

        if (!agentRes.ok) {
          setInfo({
            title: "Falha ao enviar ao agente local",
            message: agentRes.error === "agent_unreachable"
              ? "Agente indisponível."
              : JSON.stringify(agentRes, null, 2),
          });
        } else {
          setInfo({
            title: "Sucesso",
            message: "Impressão confirmada e enviada.",
          });
        }
      }
      else if (status2 === "ready_to_agent" && (data2?.capa || data2?.files)) {
        // Fallback legado
        const preferred = localStorage.getItem("printerName") || "";
        await sendToAgentWithConfirm({
          capa: data2.capa,
          files: data2.files,
          printer: preferred,
        });
        setInfo({ title: "Enviado", message: "Enviado para impressão" });
      }
    } catch (e) {
      console.error(e);
      setInfo({ title: "Erro", message: "Falha ao forçar impressão." });
    } finally {
      setPrinting(false);
    }
  };

  const handlePrint = async (row, isSilent = false) => {
    if (printing) return;
    lastPrintRef.current = { row, orderedBilhetes: undefined };
    setPrinting(true);
    try {
      const data = await postPrint({
        row,
        orderedBilhetes: undefined,
        force: false,
      });

      const status = showBackendInfo(data);

      // Lógica nova: Backend retorna PDF Mergeado
      if (status === "ready_to_agent" && data.mergedPdf) {
        const preferred = localStorage.getItem("printerName") || "";

        const agentPayload = {
          // Enviamos o PDF gigante como se fosse apenas a "Capa", pois o agente já sabe imprimir a capa.
          // O array de files vai vazio.
          capa: {
            name: `ROTA_COMPLETA_${row.ZH_CODIGO}.pdf`,
            base64: data.mergedPdf
          },
          files: [],
          printer: preferred,
        };

        const agentRes = await sendToAgentWithConfirm(agentPayload);
        if (agentRes.pendingConfirm) return;

        if (!agentRes.ok) {
          setInfo({
            title: "Falha ao enviar ao agente local",
            message: agentRes.error === "agent_unreachable"
              ? "Não consegui falar com o agente local (3007). Verifique se o FFPrint está rodando."
              : JSON.stringify(agentRes, null, 2),
          });
        } else {
          markAsPrinted(row.ZH_CODIGO);
          if (!isSilent) {
            setInfo({
              title: "Sucesso",
              message: `Pacote de impressão enviado (1 arquivo unificado) para ${preferred}.`,
            });
          }
        }
      }
      else if (status === "ready_to_agent" && (data?.capa || data?.files)) {
        const preferred = localStorage.getItem("printerName") || "";
        const agentRes = await sendToAgentWithConfirm({
          capa: data.capa,
          files: data.files,
          printer: preferred,
        });

        if (agentRes.pendingConfirm) return;

        if (!agentRes.ok) {
          setInfo({
            title: "Falha ao enviar ao agente local",
            message:
              agentRes.error === "agent_unreachable"
                ? "Não consegui falar com o agente (http://127.0.0.1:3007)."
                : JSON.stringify(agentRes, null, 2),
          });
        } else {
          markAsPrinted(row.ZH_CODIGO);
          if (!isSilent) {
            setInfo({
              title: "Impressão enviada",
              message:
                `Arquivos enviados para a impressora ${preferred || "padrão"}.\n` +
                (agentRes.details ? `\n${agentRes.details}` : ""),
            });
          }
        }
      }
    } finally {
      setPrinting(false);
    }
  };

  // --- EFEITO AUTO PRINT ---
  // Monitora [rows, fileStatus, isAuto] e dispara impressão se ARQUIVOS estiverem 100%
  useEffect(() => {
    if (!isAuto) return;

    const processAutoPrint = async () => {
      console.log(`AutoPrint: Buscando candidatos em ${rows.length} rotas...`);
      const candidates = rows.filter(r => {
        const already = isAlreadyPrinted(r.ZH_CODIGO);
        const st = fileStatus[r.ZH_CODIGO];

        if (already) return false;

        // Só imprime se já tivermos o status E estiver 100% (total > 0 e found == total)
        if (st && st.total > 0 && st.found >= st.total) { // >= por segurança
          return true;
        }
        return false;
      });

      if (candidates.length === 0) return;

      // Para evitar spam, pegamos o primeiro agora e imprimimos. 
      const cand = candidates[0];
      console.log("Auto-Print iniciado (files 100%) para:", cand.ZH_CODIGO);

      // Marca como impresso IMEDIATAMENTE para não tentar de novo no próximo render
      markAsPrinted(cand.ZH_CODIGO);

      // Dispara (sem await blocking para não travar a UI toda)
      setTimeout(() => {
        handlePrint(cand, true).catch(err => console.error("Erro no auto-print async:", err));
      }, 1000);
    };

    processAutoPrint();

  }, [rows, fileStatus, isAuto]); // Re-roda sempre que rows ou o status dos arquivos mudar

  const onConfirmClose = async (ok) => {
    const keep = confirmData;
    setConfirmData(null);
    if (!ok || !keep) return;

    const last = lastPrintRef.current;
    if (last?.row) {
      await handlePrintComOrdem({
        row: last.row,
        orderedBilhetes: undefined,
        forceIgnoreMissing: true // Flag ficticia, na pratica o handlePrint nao usa isso direto, mas o fluxo usa
      });
      // OBS: A logica de confirmacao mudou para o MissingFilesDialog
      // Essa aqui mantida so por compatibilidade legado se sobrar
    }
  };



  useEffect(() => {
    // Quando mudar a pagina ou os dados, checar status dos arquivos para as cargas VISIVEIS
    // paginatedRows contem o que ta na tela
    if (paginatedRows.length === 0) return;

    const cargasParaChecar = paginatedRows.map(r => r.ZH_CODIGO);

    // Evitar flood: debounce ou check simples
    const doCheck = async () => {
      try {
        const res = await axios.post(`${API_BASE_URL}/roteirizacao/protheus/check-files`, {
          filial,
          dtsaida,
          cargas: cargasParaChecar
        });
        if (res.data && res.data.ok) {
          setFileStatus(old => ({ ...old, ...res.data.results }));
        }
      } catch (e) { console.error("Erro check-files:", e); }
    };

    doCheck();

  }, [paginatedRows, dtsaida]); // Re-checa quando mudar pagina, dados ou data


  const handleGerarCapa = async (row) => {
    try {
      const data = await postCapa({ row, orderedBilhetes: undefined });
      if (data.ok) {
        setInfo({
          title: "Capa gerada",
          message: `Arquivo criado em:\n${data.file}`,
        });
      } else if (data.reason === "no_files") {
        setInfo({
          title: "Nada encontrado",
          message: "Não há arquivos desta rota em C:\\relato. Capa não gerada.",
        });
      } else if (data.reason === "not_found") {
        setInfo({
          title: "Não encontrado",
          message: "Cabeçalho da rota não encontrado no Protheus.",
        });
      } else {
        setInfo({ title: "Falha", message: "Falha ao gerar a capa." });
      }
    } catch {
      setInfo({ title: "Erro", message: "Erro ao gerar a capa." });
    }
  };

  const handlePrintComOrdem = async ({ row, orderedBilhetes }) => {
    lastPrintRef.current = { row, orderedBilhetes };
    if (printing) return;
    setPrinting(true);
    try {
      const data = await postPrint({ row, orderedBilhetes, force: false });

      const status = showBackendInfo(data);

      // Caminho principal: backend retorna PDF mergeado
      if (status === "ready_to_agent" && data.mergedPdf) {
        const preferred = localStorage.getItem("printerName") || "";
        const agentPayload = {
          capa: {
            name: `ROTA_COMPLETA_${row.ZH_CODIGO}.pdf`,
            base64: data.mergedPdf,
          },
          files: [],
          printer: preferred,
        };

        const agentRes = await sendToAgentWithConfirm(agentPayload);
        if (agentRes.pendingConfirm) return;

        if (!agentRes.ok) {
          setInfo({
            title: "Falha ao enviar ao agente local",
            message:
              agentRes.error === "agent_unreachable"
                ? "Não consegui falar com o agente local (3007). Verifique se o FFPrint está rodando."
                : JSON.stringify(agentRes, null, 2),
          });
        } else {
          markAsPrinted(row.ZH_CODIGO);
          setInfo({
            title: "Impressão enviada",
            message: `Pacote enviado para a impressora ${preferred || "padrão"}.`,
          });
        }
      }
      // Fallback legado: capa + files separados
      else if (status === "ready_to_agent" && (data?.capa || data?.files)) {
        const preferred = localStorage.getItem("printerName") || "";
        const agentRes = await sendToAgentWithConfirm({
          capa: data.capa,
          files: data.files,
          printer: preferred,
        });

        if (agentRes.pendingConfirm) return;

        if (!agentRes.ok) {
          setInfo({
            title: "Falha ao enviar ao agente local",
            message:
              agentRes.error === "agent_unreachable"
                ? "Não consegui falar com o agente (http://127.0.0.1:3007)."
                : JSON.stringify(agentRes, null, 2),
          });
        } else {
          markAsPrinted(row.ZH_CODIGO);
          setInfo({
            title: "Impressão enviada",
            message: `Arquivos enviados para a impressora ${preferred || "padrão"}.`,
          });
        }
      }
    } finally {
      setPrinting(false);
      setOrderOpen(false);
      setOrderCarga(null);
      setOrderGrupos([]);
    }
  };

  const uniq = (arr, key) =>
    [...new Set(arr.map((r) => r[key]).filter(Boolean))].length;

  const sumTotBil = (items) =>
    Number(items?.reduce((acc, it) => acc + Number(it.ZB_TOTBIL || 0), 0) || 0);

  const onDateChange = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 8);
    let shown = digits;
    if (digits.length >= 5)
      shown = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length >= 3)
      shown = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    setDateInput(shown);
    const ymd = toYYYYMMDD(shown);
    if (ymd) setDtsaida(ymd);
  };

  const abrirOrganizar = (row) => {
    const carga = row.ZH_CODIGO;
    const detalhes = clientesMap[carga]?.data || [];
    if (!detalhes.length) {
      loadClientes(carga);
      setInfo({
        title: "Aguarde",
        message:
          "Carregando clientes desta carga. Abra o organizador novamente em instantes.",
      });
      return;
    }
    const grupos = groupByClienteDetalhe(detalhes);
    setOrderCarga(row);
    setOrderGrupos(grupos);
    setOrderOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] pb-20 font-sans transition-colors duration-300">
      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-green-400/10 rounded-full blur-[120px] mix-blend-multiply" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[100px] mix-blend-multiply" />
      </div>

      {/* Header Glass */}
      <header className="sticky top-0 z-50 px-6 py-4">
        <div className="max-w-[1920px] mx-auto">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 px-6 py-3 flex items-center justify-between">

            {/* Esquerda: Logo/Voltar */}
            <div className="flex items-center gap-3">
              <IconButton
                onClick={() => window.history.back()}
                className="bg-white hover:bg-slate-100 shadow-sm border border-slate-200"
              >
                <ArrowBackIcon className="text-slate-600" />
              </IconButton>

              <div
                className="bg-gradient-to-tr from-blue-600 to-cyan-500 h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20"
              >
                <LocalShippingIcon />
              </div>

              <div>
                <h1 className="text-lg font-bold leading-tight text-slate-800">
                  Roteirização
                </h1>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  Gestão de Rotas
                </span>
              </div>
            </div>

            {/* Direita: User/Actions */}
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-bold text-slate-800">
                  {username}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Logística
                </span>
              </div>

              <IconButton
                onClick={logout}
                color="error"
                className="bg-red-50 hover:bg-red-100 border border-red-100"
              >
                <LogoutIcon />
              </IconButton>
            </div>

          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-[1920px] mx-auto px-6 py-4 relative z-10">

        {/* Painel de Filtros estilo Card */}
        <div className="bg-white/90 backdrop-blur rounded-3xl shadow-sm border border-slate-100 p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">

            {/* Controles de Data */}
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
              <IconButton
                size="small"
                onClick={() => {
                  const next = addDaysYYYYMMDD(dtsaida, -1);
                  setDtsaida(next);
                  setDateInput(fmtDateBR(next));
                }}
              >
                <ChevronLeftIcon />
              </IconButton>

              <div className="flex flex-col items-center min-w-[100px]">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Data</span>
                <input
                  value={dateInput}
                  onChange={(e) => onDateChange(e.target.value)}
                  className="bg-transparent text-center font-bold text-slate-700 outline-none w-24"
                />
              </div>

              <Tooltip title="Hoje">
                <IconButton size="small" onClick={() => {
                  const t = todayYYYYMMDD();
                  setDtsaida(t);
                  setDateInput(fmtDateBR(t));
                }}>
                  <TodayIcon fontSize="small" className="text-blue-500" />
                </IconButton>
              </Tooltip>

              <IconButton
                size="small"
                onClick={() => {
                  const next = addDaysYYYYMMDD(dtsaida, +1);
                  setDtsaida(next);
                  setDateInput(fmtDateBR(next));
                }}
              >
                <ChevronRightIcon />
              </IconButton>
            </div>

            {/* Barra de Busca Grande */}
            <div className="flex-1 max-w-2xl relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <SearchIcon />
              </div>
              <input
                placeholder="Buscar cliente, rota, veículo..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium text-slate-700 placeholder:text-slate-400"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center gap-3">
              <Tooltip title="Recarregar">
                <IconButton
                  onClick={() => fetchData(false)}
                  disabled={loading}
                  className="bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors"
                >
                  <RefreshIcon className={loading ? "animate-spin" : ""} />
                </IconButton>
              </Tooltip>
            </div>

          </div>

          <Divider className="my-4" />

          {/* Chips e Toggle Automático */}
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex flex-wrap gap-2">
              <Chip
                label={`Filial ${filial}`}
                className="bg-slate-100 font-bold text-slate-600"
              />
              <Chip
                label={`${filteredRows.length} registros`}
                className="bg-blue-50 text-blue-700 font-bold border border-blue-100"
              />
              <Chip
                label={`${uniq(filteredRows, "ZH_ROTA")} rotas`}
                className="bg-slate-50 text-slate-500 font-medium"
              />
              <Chip
                label={`${uniq(filteredRows, "ZH_VEICULO")} veículos`}
                className="bg-slate-50 text-slate-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-6">
              <FormControlLabel
                control={
                  <Switch
                    checked={onlyFull}
                    onChange={() => setOnlyFull(v => !v)}
                    color="success"
                  />
                }
                label={<span className="text-sm font-medium text-slate-600">100% Faturadas</span>}
              />

              <div className="bg-slate-100 px-3 py-1 rounded-full flex items-center border border-slate-200">
                <FormControlLabel
                  sx={{ mr: 0 }}
                  control={
                    <Switch
                      checked={isAuto}
                      onChange={() => setIsAuto(!isAuto)}
                      size="small"
                      color="primary"
                    />
                  }
                  label={
                    <span className="text-sm font-bold text-slate-600 ml-2">
                      Auto Imprimir {isAuto && <span className="text-green-500 text-[10px] animate-pulse">●</span>}
                    </span>
                  }
                />

              </div>

              <Tooltip title={`Impressora: ${localStorage.getItem("printerName") || "Padrão"}`}>
                <IconButton onClick={handleOpenPrinterConfig} className="bg-slate-100 hover:bg-slate-200 ml-2">
                  <TuneIcon fontSize="small" className="text-slate-600" />
                </IconButton>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Card da Tabela */}
        <Paper
          elevation={0}
          className="bg-white/90 backdrop-blur rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
        >
          <TableContainer sx={{ maxHeight: "calc(100vh - 380px)" }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell
                    width={56}
                    sx={{
                      backgroundColor: "#F8FAFC", // slate-50
                      fontWeight: 700,
                      color: "#64748B" // slate-500
                    }}
                  />
                  <TableCell
                    width={56}
                    sx={{
                      backgroundColor: "#F8FAFC",
                      fontWeight: 700,
                      color: "#64748B"
                    }}
                  />

                  {[
                    { id: "ZH_DTSAIDA", label: "Saída", width: 110, align: "center" },
                    { id: "ZH_ROTA", label: "Rota", width: 110, align: "center" },
                    { id: "ZH_CODIGO", label: "Carga", width: 120, align: "center" },
                    { id: "ZH_NOME", label: "Cliente (principal/rota)", flex: 1 },
                    { id: "ARQUIVOS", label: "Arquivos", width: 140, align: "center" },
                    { id: "ZH_VEICULO", label: "Veículo", width: 140, align: "center" },
                    { id: "ZH_NOMVEI", label: "Descrição Veículo", flex: 1 },
                  ].map((col) => (
                    <TableCell
                      key={col.id}
                      align={col.align || "left"}
                      sx={{
                        width: col.width,
                        backgroundColor: "#F8FAFC",
                        fontWeight: 700,
                        color: "#475569", // slate-600
                        whiteSpace: "nowrap"
                      }}
                    >
                      <TableSortLabel
                        active={orderBy === col.id}
                        direction={orderBy === col.id ? order : "asc"}
                        onClick={() => handleRequestSort(col.id)}
                      >
                        {col.label}
                      </TableSortLabel>
                    </TableCell>
                  ))}
                  <TableCell
                    width={180}
                    align="center"
                    sx={{
                      backgroundColor: "#F8FAFC",
                      fontWeight: 700,
                      color: "#475569"
                    }}
                  >
                    Ações
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedRows.map((r, idx) => {
                  const carga = r.ZH_CODIGO;
                  const isOpen = expanded.has(carga);
                  const clientes = clientesMap[carga]?.data || [];
                  const loadingClientes = clientesMap[carga]?.loading;
                  const totalCarga = sumTotBil(clientes);
                  const isFav = favorites.has(carga);

                  return (
                    <React.Fragment key={r.id}>
                      <TableRow
                        hover
                        sx={{
                          bgcolor: idx % 2 === 0 ? "white" : "rgba(248, 250, 252, 0.5)", // slate-50 alternating
                          "&:hover": { bgcolor: "#F1F5F9 !important" } // slate-100 hover
                        }}
                      >
                        <TableCell padding="checkbox">
                          <IconButton
                            size="small"
                            onClick={() => toggleFavorite(carga)}
                            sx={{
                              color: isFav ? "#F59E0B" : "#CBD5E1", // amber-500 : slate-300
                            }}
                          >
                            {isFav ? <StarIcon /> : <StarBorderIcon />}
                          </IconButton>
                        </TableCell>

                        <TableCell padding="checkbox">
                          <IconButton size="small" onClick={() => toggleExpand(r)}>
                            {isOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                          </IconButton>
                        </TableCell>

                        <TableCell align="center" sx={{ color: "#64748B", fontWeight: 500 }}>
                          {fmtDateBR(r.ZH_DTSAIDA)}
                        </TableCell>
                        <TableCell align="center">
                          <span className="px-2 py-1 bg-slate-100 rounded text-slate-600 font-mono text-xs">
                            {r.ZH_ROTA}
                          </span>
                        </TableCell>
                        <TableCell align="center">
                          <span className="font-bold text-blue-600">
                            {carga}
                          </span>
                        </TableCell>

                        <TableCell sx={{ maxWidth: 520 }}>
                          <Typography
                            title={r.ZH_NOME}
                            noWrap
                            sx={{ display: "block", fontWeight: 600, color: "#1E293B" }}
                          >
                            {r.ZH_NOME}
                          </Typography>
                          {r.TOT_CLIENTES > 0 && (
                            <MiniProgress
                              value={r.PCT_FATURADAS}
                              label={`${r.QT_FATURADAS}/${r.TOT_CLIENTES} (${r.PCT_FATURADAS.toFixed(0)}%)`}
                            />
                          )}
                          {isOpen && !loadingClientes && (
                            <div className="mt-1">
                              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                                {brMoney(totalCarga)}
                              </span>
                            </div>
                          )}
                        </TableCell>

                        {/* Coluna ARQUIVOS */}
                        <TableCell align="center" width={180}>
                          {(() => {
                            const st = fileStatus[carga] || { total: 0, found: 0 };
                            const pct = st.total > 0 ? (st.found / st.total) * 100 : 0;
                            if (st.total === 0) return <span className="text-slate-300">-</span>;
                            return (
                              <MiniProgress
                                value={pct}
                                color="info" // Azul
                                label={`${st.found}/${st.total}`}
                              />
                            );
                          })()}
                        </TableCell>

                        <TableCell align="center">
                          <span className="font-mono text-slate-600 text-sm">{r.ZH_VEICULO}</span>
                        </TableCell>

                        <TableCell sx={{ maxWidth: 360, color: "#64748B" }}>
                          <div className="truncate text-sm" title={r.ZH_NOMVEI}>
                            {r.ZH_NOMVEI}
                          </div>
                        </TableCell>

                        <TableCell align="center">
                          <Tooltip title="Organizar entrega (drag-and-drop por cliente)">
                            <IconButton
                              size="small"
                              onClick={() => abrirOrganizar(r)}
                              disabled={printing}
                              className="text-slate-400 hover:text-blue-500"
                            >
                              <TuneIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Gerar capa (padrão)">
                            <IconButton
                              size="small"
                              onClick={() => handleGerarCapa(r)}
                              disabled={printing}
                              className="text-slate-400 hover:text-blue-500"
                            >
                              <DescriptionIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Imprimir relatórios da rota (padrão)">
                            <IconButton
                              size="small"
                              onClick={() => handlePrint(r)}
                              disabled={printing}
                              className="text-slate-400 hover:text-blue-500"
                            >
                              {printing ? <CircularProgress size={18} thickness={5} /> : <PrintIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>

                      {/* Detalhes (clientes) */}
                      <TableRow>
                        <TableCell colSpan={9} sx={{ p: 0, border: 0 }}>
                          <Collapse in={isOpen} timeout="auto" unmountOnExit>
                            <Box sx={{ p: 2, background: "#F1F5F9" }}> {/* slate-100 */}
                              <Paper
                                elevation={0}
                                sx={{
                                  p: 0,
                                  border: "1px solid #E2E8F0", // slate-200
                                  borderRadius: 2,
                                  overflow: "hidden"
                                }}
                              >
                                {/* Header dos Detalhes */}
                                <div className="px-4 py-3 bg-white border-b border-slate-200 flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-slate-800 text-sm">
                                      Clientes da carga {carga}
                                    </h4>
                                    <span className="text-xs font-medium text-slate-400">
                                      {loadingClientes ? "Carregando..." : `(${clientes.length} itens)`}
                                    </span>
                                  </div>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<TuneIcon />}
                                    onClick={() => abrirOrganizar(r)}
                                    disabled={loadingClientes || !clientes.length}
                                    sx={{ textTransform: 'none', borderRadius: 2 }}
                                  >
                                    Organizar entrega
                                  </Button>
                                </div>

                                <Table size="small">
                                  <TableHead>
                                    <TableRow sx={{ "& th": { bgcolor: "#F8FAFC", fontWeight: 600, color: "#64748B" } }}>
                                      <TableCell width={90} align="center">Bilhete</TableCell>
                                      <TableCell width={120}>Cliente</TableCell>
                                      <TableCell>Nome</TableCell>
                                      <TableCell width={110} align="center">Vendedor</TableCell>
                                      <TableCell width={140} align="center">Nota</TableCell>
                                      <TableCell width={120} align="right">Total</TableCell>
                                      <TableCell width={110} align="center">Status</TableCell>
                                      <TableCell>Obs</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {clientes.map((c, i) => {
                                      const faturada = c.ZB_NUMSEQ != null && String(c.ZB_NUMSEQ).trim() !== "";
                                      return (
                                        <TableRow key={`${c.ZB_CARGA}-${c.ZB_NUMSEQ}-${i}`}>
                                          <TableCell align="center" sx={{ fontFamily: 'monospace' }}>{c.ZB_NUMSEQ}</TableCell>
                                          <TableCell>{c.ZB_CLIENTE}</TableCell>
                                          <TableCell sx={{ maxWidth: 300 }}>
                                            <div className="truncate font-medium text-slate-700">{c.ZB_NOMCLI}</div>
                                          </TableCell>
                                          <TableCell align="center">{c.ZB_VEND}</TableCell>
                                          <TableCell align="center">{c.ZB_NOTA}</TableCell>
                                          <TableCell align="right" sx={{ fontWeight: 600, color: "#334155" }}>
                                            {Number(c.ZB_TOTBIL || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                          </TableCell>
                                          <TableCell align="center">
                                            <span
                                              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${faturada
                                                ? "bg-green-100 text-green-700"
                                                : "bg-slate-100 text-slate-500"
                                                }`}
                                            >
                                              {faturada ? "Faturada" : "Pendente"}
                                            </span>
                                          </TableCell>
                                          <TableCell sx={{ maxWidth: 300, color: "#94A3B8" }}>
                                            <div className="truncate text-xs">{c.ZB_OBS}</div>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                    {!loadingClientes && !clientes.length && (
                                      <TableRow>
                                        <TableCell colSpan={8} align="center">
                                          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                            Nenhum cliente para esta carga.
                                          </Typography>
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </Paper>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}

                {!loading && !paginatedRows.length && (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <div className="py-8 flex flex-col items-center">
                        <FilterAltIcon className="text-slate-200 text-6xl mb-2" />
                        <Typography variant="body1" color="text.secondary">
                          Sem dados para exibir em {fmtDateBR(dtsaida)}
                        </Typography>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider />
          <TablePagination
            component="div"
            count={prioritized.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[25, 50, 100, 200]}
            sx={{
              ".MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows": {
                color: "#64748B",
                fontWeight: 500
              }
            }}
          />
        </Paper>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center gap-2">
            <span className="material-symbols-rounded">error</span>
            {error}
          </div>
        )}
      </main>

      {/* Dialogs */}
      <ConfirmPrintDialog
        open={!!confirmData}
        faltando={confirmData?.faltando || []}
        onClose={onConfirmClose}
      />
      <InfoDialog
        open={!!info}
        title={info?.title}
        message={info?.message}
        onClose={() => setInfo(null)}
      />

      {/* Modal Organizar */}
      <OrderEntregaDialog
        open={orderOpen}
        onClose={() => {
          setOrderOpen(false);
          setOrderCarga(null);
          setOrderGrupos([]);
        }}
        gruposOriginais={orderGrupos}
        onPrintWithOrder={(orderedBilhetes) =>
          handlePrintComOrdem({ row: orderCarga, orderedBilhetes })
        }
      />

      {/* Overlay */}
      <Backdrop
        open={printing}
        sx={{
          color: "#fff",
          zIndex: (t) => t.zIndex.drawer + 1,
          backdropFilter: "blur(4px)",
        }}
      >
        <Stack alignItems="center" spacing={2} className="bg-black/40 p-8 rounded-3xl">
          <CircularProgress color="inherit" />
          <Typography variant="body1" fontWeight={600}>Enviando para a impressora…</Typography>
        </Stack>
      </Backdrop>

      {/* Modal de faltas comum */}
      <MissingFilesDialog
        open={missingDlg.open}
        summary={missingDlg.summary}
        onClose={async (proceed) => {
          setMissingDlg({ open: false, summary: [] });

          if (proceed && agentPendingRef.current) {
            const payload = agentPendingRef.current;
            agentPendingRef.current = null;
            const res2 = await fetch(`${LOCAL_AGENT}/store-and-print`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            const data2 = await res2.json();
            if (!res2.ok || !data2.ok) {
              setInfo({
                title: "Falha ao enviar ao agente local",
                message:
                  data2.error === "agent_unreachable"
                    ? "Não consegui falar com o agente (http://127.0.0.1:3005). Abra o FFPrint ou libere a porta 3005."
                    : JSON.stringify(data2, null, 2),
              });
            } else {
              setInfo({
                title: "Impressão enviada",
                message: `Arquivos enviados para a impressora ${payload.printer || "padrão"}.`,
              });
            }
            return;
          }

          // Se confirmou a falta de arquivos no diálogo novo (missingDlg), forçamos a impressão direto
          // Ignoramos o onConfirmClose antigo que dependia de confirmData (agora obsoleto)
          if (proceed) {
            const last = lastPrintRef.current;
            if (last?.row) {
              // Chama direto o postPrint com force=true
              await handleForcedPrint(last);
            }
          }
        }}
      />

      <Dialog open={printerConfigOpen} onClose={() => setPrinterConfigOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Selecionar Impressora</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            O Agente usará esta impressora para impressões manuais e automáticas.
          </Typography>
          <TextField
            select
            fullWidth
            label="Impressora"
            value={selectedPrinter}
            onChange={(e) => setSelectedPrinter(e.target.value)}
            SelectProps={{ native: true }}
            variant="outlined"
          >
            <option value="">(Padrão do Windows)</option>
            {availablePrinters.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between" }}>
          <Button
            color="warning"
            size="small"
            onClick={() => {
              const key = `roteirizacao:printed:${dtsaida}`;
              localStorage.removeItem(key);
              alert(`Cache de impressões automáticas limpo para data ${dtsaida}.`);
            }}
          >
            Reset Cache
          </Button>
          <Box>
            <Button onClick={() => setPrinterConfigOpen(false)}>Cancelar</Button>
            <Button variant="contained" onClick={handleSavePrinter}>Salvar</Button>
          </Box>
        </DialogActions>
      </Dialog>
    </div>
  );
}
