import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  Box,
  Button,
  Stack,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  TableContainer,
  TextField,
  MenuItem,
  InputAdornment,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import { useNavigate } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import DownloadIcon from "@mui/icons-material/Download";
import { API_BASE_URL } from "../utils/apiConfig";

const API_BASE = `${API_BASE_URL}/api`;

const LOCAL_OPTIONS = [
  { value: "01", label: "Local 01" },
  { value: "02", label: "Local 02" },
  { value: "03", label: "Local 03" },
  { value: "04", label: "Local 04" },
  { value: "05", label: "Local 05" },
  { value: "06", label: "Local 06" },
  { value: "07", label: "Local 07" },
  { value: "08", label: "Varejinho" },
  { value: "09", label: "Local 09" },
];

const DIAS_PADRAO_CALCULO = 25;
const todayISO = new Date().toISOString().slice(0, 10);

const formatarQuantidade = (valor) =>
  Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 0 });

const getMesAnoAnterior = (dataISO) => {
  try {
    const date = new Date(dataISO);
    date.setFullYear(date.getFullYear() - 1);
    return date.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch (e) {
    return "Ano Anterior";
  }
};

function EstoquePadraoCell({ item, onSaveEdit }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(item.estoquePadrao));
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setEditValue(String(Math.ceil(item.estoquePadrao)));
    if (!isEditing) {
      setIsEditing(false);
    }
  }, [item.estoquePadrao, isEditing]);

  const handleSave = () => {
    const newInt = parseInt(editValue, 10);
    const currentInt = Math.ceil(item.estoquePadrao);

    if (isNaN(newInt) || newInt < 0) {
      console.error(
        "Por favor, insira um número válido para o Estoque Padrão."
      );
      return;
    }

    if (newInt === currentInt) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    onSaveEdit(item.id, newInt, () => setIsLoading(false));
  };

  return (
    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="flex-end"
        spacing={1}
        className="no-print"
      >
        {isEditing ? (
          <TextField
            size="small"
            type="text"
            value={editValue}
            onChange={(e) =>
              setEditValue(e.target.value.replace(/[^0-9]/g, ""))
            }
            onKeyPress={(e) => e.key === "Enter" && handleSave()}
            sx={{ width: 80 }}
            disabled={isLoading}
            autoFocus
          />
        ) : (
          <Typography fontWeight={500}>
            {formatarQuantidade(item.estoquePadrao)} {item.unidade}
          </Typography>
        )}
        <IconButton
          size="small"
          onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
          color={isEditing ? "success" : "default"}
          disabled={isLoading}
        >
          {isLoading ? (
            <CircularProgress size={20} />
          ) : isEditing ? (
            <SaveIcon fontSize="small" />
          ) : (
            <EditIcon fontSize="small" />
          )}
        </IconButton>
      </Stack>
      <Typography sx={{ display: { xs: "none", print: "block" } }}>
        {formatarQuantidade(item.estoquePadrao)} {item.unidade}
      </Typography>
    </TableCell>
  );
}

function NativeExportButton({ isLoading, csvData, onExportClick }) {
  return (
    <Tooltip title="Exportar para Excel (CSV)" placement="top">
      <Button
        variant="contained"
        startIcon={<DownloadIcon />}
        onClick={onExportClick}
        disabled={isLoading || csvData.length === 0}
      >
        EXPORTAR EXCEL
      </Button>
    </Tooltip>
  );
}

export default function SugestaoAbastecimento() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "Operador de Estoque";

  const [selectedLocal, setSelectedLocal] = useState(
    localStorage.getItem("origem") || "01"
  );
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [searchQuery, setSearchQuery] = useState("");

  const [filterZeroStock, setFilterZeroStock] = useState("false");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("");

  const [dataEstoque, setDataEstoque] = useState(
    new Date().toLocaleDateString("pt-BR")
  );

  const [productData, setProductData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [reloadDataToggle, setReloadDataToggle] = useState(0);

  const [diasCobertura, setDiasCobertura] = useState(2.5);

  const localLabel =
    LOCAL_OPTIONS.find((l) => l.value === selectedLocal)?.label ||
    `Local ${selectedLocal.padStart(2, "0")}`;

  const handleSnack = (message, severity = "success") =>
    setSnack({ open: true, message, severity });

  const csvHeaders = [
    { label: "Cód. Produto", key: "codigo_produto" },
    { label: "Produto", key: "produto" },
    { label: "Unidade", key: "unidade" },
    { label: "Estoque Atual", key: "estoqueAtual" },
    { label: "Vendas Mês", key: "vendasMensais" },
    { label: "Vendas/Dia", key: "vendasMediaDiaria" },
    { label: "Estoque Padrão", key: "estoquePadrao" },
    { label: "Sugestão Abastecimento", key: "sugestao" },
    { label: "Status", key: "status" },
  ];

  const csvFileName = `SugestaoAbastecimento_${localLabel}_${selectedDate}.csv`;

  const processData = useCallback((data) => {
    return data.map((item) => ({
      ...item,
      estoqueAtual: Number(item.estoqueAtual).toFixed(0),
      vendasMensais: Number(item.vendasMensais).toFixed(2),
      vendasMediaDiaria: Number(item.vendasMediaDiaria).toFixed(2),
      estoquePadrao: Number(item.estoquePadrao).toFixed(0),
      sugestao: Number(item.sugestao).toFixed(0),
    }));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      const url = `${API_BASE}/estoque-sugestao?local=${selectedLocal}&data=${selectedDate}`;

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Falha ao carregar dados: ${response.statusText}`);
        }

        const result = await response.json();

        const dataArray = Array.isArray(result) ? result : result.data || [];
        const dataRef =
          typeof result === "object" && result !== null
            ? result.dataReferencia
            : null;

        const dataComValoresBase = dataArray.map((item) => {
          const vendasMediaDiaria =
            (item.vendasMensais || 0) / DIAS_PADRAO_CALCULO;
          const estoquePadraoInicial = Math.ceil(vendasMediaDiaria);

          const estoquePadrao = item.estoquePadrao || estoquePadraoInicial;
          const itemId = item.codigo_produto || `${item.local}-${item.produto}`;

          return {
            ...item,
            id: itemId,
            codigo_produto: item.codigo_produto,
            vendasMensais: item.vendasMensais || 0,
            estoquePadrao: parseFloat(estoquePadrao),
          };
        });

        setProductData(dataComValoresBase);

        if (dataRef) {
          const dataFormatada = new Date(dataRef).toLocaleDateString("pt-BR", {
            timeZone: "UTC",
          });
          setDataEstoque(dataFormatada);
        } else {
          setDataEstoque("N/D");
        }
      } catch (err) {
        setError(err.message || "Erro desconhecido ao carregar dados.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedLocal, selectedDate, reloadDataToggle, localLabel]);

  const handleSaveEstoquePadrao = useCallback(
    async (itemId, newPadrao, onFinished) => {
      const itemToUpdate = productData.find((p) => p.id === itemId);

      if (!itemToUpdate) {
        if (onFinished) onFinished();
        return;
      }

      const payload = {
        codigo_produto: itemToUpdate.codigo_produto,
        local: itemToUpdate.local.replace("Local ", "").trim(),
        estoque_padrao: newPadrao,
      };

      try {
        const response = await fetch(`${API_BASE}/estoque-padrao`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user": username,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: "Erro desconhecido ao salvar." }));
          throw new Error(errorData.message || "Falha ao salvar no servidor.");
        }

        setProductData((currentData) =>
          currentData.map((item) =>
            item.id === itemId ? { ...item, estoquePadrao: newPadrao } : item
          )
        );

        setReloadDataToggle((prev) => prev + 1);

        handleSnack("Estoque Padrão salvo com sucesso!", "success");
      } catch (err) {
        handleSnack(`Erro ao salvar: ${err.message}`, "error");
      } finally {
        if (onFinished) onFinished();
      }
    },
    [productData, username]
  );

  const handleDiasChange = (e) => {
    const rawValue = e.target.value;

    const cleanedValue = rawValue.replace(/[^\d,.]/g, "");
    const normalizedValue = cleanedValue.replace(",", ".");
    const num = parseFloat(normalizedValue);

    if (rawValue === "") {
      setDiasCobertura(0);
    } else if (Number.isFinite(num) && num >= 0) {
      setDiasCobertura(num);
    } else if (normalizedValue.endsWith(".") && cleanedValue.length > 1) {
      setDiasCobertura(num || 0);
    }
  };

  const filteredDataComSugestao = useMemo(() => {
    const dias = diasCobertura || 0;

    let calculatedData = productData.map((item) => {
      const vendasMediaDiaria = item.vendasMensais / DIAS_PADRAO_CALCULO;
      const estoquePadraoUsado = item.estoquePadrao;

      const estoqueNecessarioProjetado = vendasMediaDiaria * dias;
      const sugestaoBase = estoqueNecessarioProjetado - item.estoqueAtual;

      const projecaoVendasFolga = 0;

      let sugestao = 0;
      let status = "OK";
      let corStatus = "#32CD32";

      if (sugestaoBase > 0) {
        sugestao = Math.ceil(sugestaoBase);
        status = "Reabastecer";
        corStatus = "#ff9800";
      } else if (item.estoqueAtual > estoquePadraoUsado + projecaoVendasFolga) {
        const excesso = item.estoqueAtual - estoquePadraoUsado;
        sugestao = Math.ceil(excesso);
        status = "Excesso";
        corStatus = "#00BFFF";
      } else {
        sugestao = 0;
        status = "OK";
        corStatus = "#32CD32";
      }

      return {
        ...item,
        vendasMediaDiaria: vendasMediaDiaria,
        estoquePadrao: estoquePadraoUsado,
        sugestao: sugestao,
        status: status,
        corStatus: corStatus,
      };
    });

    if (filterZeroStock === "true") {
      calculatedData = calculatedData.filter((item) => item.estoqueAtual > 0);
    }

    if (selectedStatusFilter) {
      calculatedData = calculatedData.filter(
        (item) => item.status === selectedStatusFilter
      );
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      calculatedData = calculatedData.filter(
        (item) =>
          item.produto.toLowerCase().includes(q) ||
          String(item.codigo_produto).includes(q)
      );
    }

    return calculatedData.sort((a, b) => b.sugestao - a.sugestao);
  }, [
    productData,
    diasCobertura,
    filterZeroStock,
    searchQuery,
    selectedStatusFilter,
  ]);

  const handleNativeExport = useCallback(() => {
    if (filteredDataComSugestao.length === 0) return;

    const processedData = processData(filteredDataComSugestao);

    const headers = csvHeaders.map((h) => h.label).join(";") + "\n";
    const rows = processedData
      .map((row) =>
        csvHeaders
          .map((h) => {
            const value = String(row[h.key] === undefined ? "" : row[h.key]);
            if (
              value.includes(";") ||
              value.includes('"') ||
              value.includes("\n")
            ) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(";")
      )
      .join("\n");

    const csvContent = headers + rows;

    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", csvFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    handleSnack("Exportação CSV concluída.", "success");
  }, [
    filteredDataComSugestao,
    csvHeaders,
    csvFileName,
    processData,
    handleSnack,
  ]);

  return (
    <>
      <Box
        component="style"
        sx={{
          "@media print": {
            ".no-print": {
              display: "none !important",
              visibility: "hidden !important",
              height: "0 !important",
            },
            ".MuiAppBar-root, .MuiSnackbar-root, .StatusBar": {
              display: "none !important",
            },
            "body, #root, .MuiBox-root": {
              margin: "0 !important",
              padding: "0 !important",
              maxWidth: "100% !important",
              minWidth: "100% !important",
              boxShadow: "none !important",
              backgroundColor: "white !important",
              "& > div:first-of-type": {
                padding: "0 !important",
              },
            },
            ".print-content": {
              maxHeight: "none !important",
              overflow: "visible !important",
              height: "auto !important",
              minHeight: "auto !important",
              padding: "0 !important",
              margin: "0 auto !important",
            },
            tr: {
              pageBreakInside: "avoid",
              borderLeft: "none !important",
            },
            "table, .MuiTableContainer-root, .MuiPaper-root.MuiTableContainer-root":
              {
                boxShadow: "none !important",
                border: "1px solid #000",
                marginTop: "5px !important",
                width: "100% !important",
                height: "auto !important",
                maxHeight: "none !important",
                overflow: "visible !important",
                backgroundColor: "white !important",
              },
            "td, th": {
              padding: "4px !important",
              fontSize: "10pt !important",
              lineHeight: "1.2",
              color: "#000 !important",
              backgroundColor: "white !important",
            },
            "thead th": {
              borderBottom: "2px solid #000 !important",
            },
            ".status-badge": {
              border: "1px solid #000 !important",
              color: "#000 !important",
              backgroundColor: "white !important",
              padding: "2px 8px !important",
              boxShadow: "none !important",
            },
            ".print-header::before": {
              content: `'Relatório Gerado por: ${username} - Em: ${new Date().toLocaleDateString(
                "pt-BR"
              )}'`,
              display: "block",
              textAlign: "right",
              fontSize: "8pt",
              marginBottom: "5px",
            },
          },
        }}
      />
      <Box
        sx={{
          p: 2,
          bgcolor: "#3f51b5",
          color: "white",
          boxShadow: 3,
          display: { xs: "none", print: "none", sm: "block" },
        }}
        className="no-print"
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h6" fontWeight={700}>
            Sugestão de Abastecimento
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="body1">
              Local: {selectedLocal.padStart(2, "0")}
            </Typography>
            <Typography variant="body1">{username}</Typography>
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              sx={{ ml: 2 }}
              onClick={() => {}}
            >
              LOGOUT
            </Button>
          </Stack>
        </Stack>
      </Box>
      <Box
        sx={{ p: { xs: 2, md: 4 }, pt: 3, maxWidth: 1200, mx: "auto" }}
        className="print-content"
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          sx={{ mb: 3 }}
          className="no-print"
        >
          <Button
            variant="contained"
            startIcon={<HomeIcon />}
            onClick={() => navigate("/relatorios")}
            sx={{
              backgroundColor: "#228B22",
              "&:hover": { backgroundColor: "#32CD32" },
            }}
          >
            VOLTAR PARA RELATÓRIOS
          </Button>
          <Stack direction="row" spacing={2}>
            <NativeExportButton
              csvData={filteredDataComSugestao}
              isLoading={isLoading}
              onExportClick={handleNativeExport}
            />
          </Stack>
        </Stack>
        <Paper
          elevation={3}
          sx={{ p: 3, mb: 4, borderRadius: 2 }}
          className="no-print"
        >
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{ flexWrap: "wrap", gap: 2 }}
          >
            <TextField
              select
              label="Local"
              value={selectedLocal}
              onChange={(e) => setSelectedLocal(e.target.value)}
              size="small"
              sx={{ width: 100 }}
              disabled={isLoading}
            >
              {LOCAL_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Data do Estoque"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              size="small"
              sx={{ width: 150 }}
              InputLabelProps={{ shrink: true }}
              disabled={isLoading}
            />
            <TextField
              select
              label="Filtro Estoque"
              value={filterZeroStock}
              onChange={(e) => setFilterZeroStock(e.target.value)}
              size="small"
              sx={{ minWidth: 160 }}
              disabled={isLoading}
            >
              <MenuItem value="true">Estoque Atual &gt; 0</MenuItem>
              <MenuItem value="false">Mostrar Todos</MenuItem>
            </TextField>
            <TextField
              select
              label="Status"
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              size="small"
              sx={{ minWidth: 140 }}
              disabled={isLoading}
            >
              <MenuItem value="">Mostrar Todos</MenuItem>
              <MenuItem value="Reabastecer">Reabastecer</MenuItem>
              <MenuItem value="Excesso">Excesso</MenuItem>
              <MenuItem value="OK">OK</MenuItem>
            </TextField>
            <TextField
              label="Buscar Produto/Código"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              sx={{ flexGrow: 1, minWidth: 200 }}
              disabled={isLoading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Dias de Cobertura"
              value={String(diasCobertura).replace(".", ",")}
              onChange={handleDiasChange}
              size="small"
              sx={{ width: 140, flexShrink: 0 }}
              placeholder="Ex: 1,5"
              disabled={isLoading}
            />
          </Stack>
        </Paper>
        <div className="print-header">
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="baseline"
            sx={{ mb: 1, p: { xs: 0, print: "10px 0 5px 0" } }}
          >
            <Typography variant="h5" fontWeight={700}>
              Sugestões de Abastecimento para {localLabel}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Fechamento:
              <strong style={{ color: "#ff9800", fontWeight: 700 }}>
                {dataEstoque}
              </strong>
            </Typography>
          </Stack>
        </div>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Carregando dados de estoque...
            </Typography>
          </Box>
        ) : (
          <TableContainer
            component={Paper}
            elevation={3}
            sx={{ borderRadius: 2 }}
          >
            <Table size="small">
              <TableHead>
                <TableRow
                  sx={{
                    "& th": {
                      fontWeight: 800,
                      backgroundColor: "#f5f5f5",
                      borderBottom: "2px solid #ddd",
                      fontSize: "0.8rem",
                    },
                  }}
                >
                  <TableCell style={{ width: "10%" }}>Cód.</TableCell>
                  <TableCell style={{ width: "20%" }}>Produto</TableCell>
                  <TableCell align="center" style={{ width: "5%" }}>
                    Unid.
                  </TableCell>
                  <TableCell align="right" style={{ width: "15%" }}>
                    Estoque Atual
                  </TableCell>
                  <TableCell align="right" style={{ width: "15%" }}>
                    Vendas/Dia ({DIAS_PADRAO_CALCULO}D)
                  </TableCell>
                  <TableCell align="right" style={{ width: "15%" }}>
                    Estoque Padrão
                  </TableCell>
                  <TableCell align="right" style={{ width: "10%" }}>
                    Sugestão
                  </TableCell>
                  <TableCell align="center" style={{ width: "10%" }}>
                    Status
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDataComSugestao.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        Nenhum produto encontrado.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDataComSugestao.map((item) => (
                    <TableRow
                      key={item.id}
                      sx={{
                        "@media print": { pageBreakInside: "avoid" },
                        backgroundColor: "inherit",
                        borderLeft: `5px solid ${item.corStatus}`,
                        "&:hover": {
                          backgroundColor:
                            item.status === "Reabastecer"
                              ? "rgba(255, 152, 0, 0.05)"
                              : "action.hover",
                        },
                      }}
                    >
                      <TableCell component="th" scope="row">
                        <Typography variant="body2" color="text.secondary">
                          {item.codigo_produto}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          fontWeight={600}
                          sx={{ fontSize: "0.95rem" }}
                        >
                          {item.produto}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">{item.unidade}</TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color:
                            item.estoqueAtual < item.estoquePadrao * 0.5
                              ? "error.main"
                              : "inherit",
                          fontWeight: 700,
                        }}
                      >
                        {formatarQuantidade(item.estoqueAtual)} {item.unidade}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip
                          title={`Total Mês (${getMesAnoAnterior(
                            selectedDate
                          )}): ${item.vendasMensais.toLocaleString("pt-BR", {
                            maximumFractionDigits: 2,
                          })} ${item.unidade}`}
                          placement="top"
                          className="no-print"
                        >
                          <Typography fontWeight={500} color="info.main">
                            {item.vendasMediaDiaria.toLocaleString("pt-BR", {
                              maximumFractionDigits: 1,
                            })}{" "}
                            {item.unidade}
                          </Typography>
                        </Tooltip>
                        <Typography
                          sx={{
                            display: { xs: "none", print: "block" },
                            fontWeight: 500,
                          }}
                        >
                          {item.vendasMediaDiaria.toLocaleString("pt-BR", {
                            maximumFractionDigits: 1,
                          })}{" "}
                          {item.unidade}
                        </Typography>
                      </TableCell>
                      <EstoquePadraoCell
                        item={item}
                        onSaveEdit={handleSaveEstoquePadrao}
                      />
                      <TableCell align="right">
                        <Typography
                          fontWeight={900}
                          color={
                            item.status === "Reabastecer"
                              ? "error.main"
                              : "success.main"
                          }
                        >
                          {item.status === "Excesso" ? "+" : ""}
                          {formatarQuantidade(item.sugestao)} {item.unidade}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box
                          className="status-badge"
                          sx={{
                            display: "inline-block",
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 999,
                            fontWeight: 600,
                            fontSize: "0.75rem",
                            backgroundColor:
                              item.status === "Reabastecer"
                                ? "#FFD0D0"
                                : item.status === "Excesso"
                                ? "#E0FFFF"
                                : "#D0FFD0",
                            color:
                              item.status === "Reabastecer"
                                ? "error.dark"
                                : item.status === "Excesso"
                                ? "#00008B"
                                : "success.dark",
                          }}
                        >
                          {item.status}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        className="no-print"
      >
        <Alert
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.severity}
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </>
  );
}
