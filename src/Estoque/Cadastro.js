import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TextField,
  MenuItem,
  CircularProgress,
  Snackbar,
  Alert,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import DefaultAppBar from "../components/DefaultAppBar";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from '../utils/apiConfig';

const API_BASE =
  API_BASE_URL || window.__API_BASE || "http://localhost:3001";

// Constrói a URL WS a partir do API_BASE (http->ws, https->wss)
const WS_BASE = (() => {
  try {
    const u = new URL(API_BASE);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    u.pathname = "/";
    u.search = "";
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return API_BASE.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
  }
})();

const CAM_OPTS = [
  "",
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
];
const PAGE_SIZE = 100;

const SEEN_KEY = "announcements_seen_ids";

const Cadastro = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "sistema";
  // Local só para exibir no TopBar
  const [local] = useState(localStorage.getItem("local") || "01");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState([]); // dados atuais renderizados
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // mapeia cod_produto -> { camera1 } (buffer de edição)
  const [editMap, setEditMap] = useState({});
  // mapeia cod_produto -> { camera1 } (estado "original" para diff)
  const [originalMap, setOriginalMap] = useState({});

  const [savingAll, setSavingAll] = useState(false);

  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState("");
  const [snackSeverity, setSnackSeverity] = useState("success");

  const [announce, setAnnounce] = useState(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((total || 0) / PAGE_SIZE)),
    [total]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/produtos-cameras/list`, {
        params: {
          user: username,
          search,
          page,
          pageSize: PAGE_SIZE,
          _ts: Date.now(),
        },
      });

      const arr = (data && data.data) || [];
      setRows(arr);
      setTotal(data?.total || 0);

      // buffers de edição e originais (apenas camera1)
      const nextEdit = {};
      const nextOrig = {};
      arr.forEach((r) => {
        const cam = r.camera1 || "";
        nextEdit[r.cod_produto] = { camera1: cam };
        nextOrig[r.cod_produto] = { camera1: cam };
      });
      setEditMap(nextEdit);
      setOriginalMap(nextOrig);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [username, search, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChangeCam = (cod, value) => {
    setEditMap((prev) => ({
      ...prev,
      [cod]: { ...(prev[cod] || {}), camera1: value },
    }));
  };

  // evita que Enter abra o dropdown (edição em lote — salvamos só no botão)
  const stopEnter = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // computa itens alterados (só a página atual) — agora só camera1
  const dirtyItems = useMemo(() => {
    const list = [];
    rows.forEach((row) => {
      const cod = row.cod_produto;
      const buf = editMap[cod] || { camera1: "" };
      const orig = originalMap[cod] || { camera1: "" };

      const camNow = (buf.camera1 || "").trim();
      const camOrig = (orig.camera1 || "").trim();

      if (camNow !== camOrig) {
        list.push({
          cod_produto: cod,
          camera1: camNow || null,
        });
      }
    });
    return list;
  }, [rows, editMap, originalMap]);

  const dirtyCount = dirtyItems.length;

  const saveAll = async () => {
    if (dirtyCount === 0) return;

    setSavingAll(true);
    try {
      await axios.post(`${API_BASE}/produtos-cameras/bulk-upsert`, {
        usuario: username,
        items: dirtyItems, // só camera1
      });

      // aplica os valores editados como "originais" e atualiza rows
      const nextOrig = { ...originalMap };
      const nextRows = rows.map((row) => {
        const hit = editMap[row.cod_produto];
        if (!hit) return row;
        nextOrig[row.cod_produto] = {
          camera1: hit.camera1 || "",
        };
        return {
          ...row,
          camera1: hit.camera1 || "",
        };
      });
      setOriginalMap(nextOrig);
      setRows(nextRows);

      setSnackSeverity("success");
      setSnackMsg("✅ Alterações salvas!");
      setSnackOpen(true);
    } catch (e) {
      console.error(e);
      setSnackSeverity("error");
      setSnackMsg("❌ Erro ao salvar alterações");
      setSnackOpen(true);
    } finally {
      setSavingAll(false);
    }
  };

  // WS anúncios (local aqui é só informativo)
  useEffect(() => {
    const ws = new WebSocket(
      `${WS_BASE}?username=${encodeURIComponent(
        username
      )}&local=${encodeURIComponent(local)}`
    );

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data?.tipo !== "announcement") return;

        if (data.ttlSec && data.createdAt) {
          const age = (Date.now() - new Date(data.createdAt).getTime()) / 1000;
          if (age > data.ttlSec) return;
        }

        const seen = new Set(
          JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")
        );
        if (data.id && seen.has(data.id)) return;

        setAnnounce({
          id: data.id || String(Date.now()),
          title: data.title || "Aviso",
          body: data.body || "",
          level: data.level || "info",
          requireAck: data.requireAck !== false,
        });
      } catch (err) {
        console.error("WS parse error:", err);
      }
    };

    return () => ws.close();
  }, [username, local]);

  const closeAnnouncement = () => {
    if (announce?.id) {
      const seen = new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"));
      seen.add(announce.id);
      localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
    }
    setAnnounce(null);
  };

  return (
    <>
      {/* TopBar já mostra Local e Data */}
      <DefaultAppBar
        title="Cadastro de Câmeras por Produto"
        usuario={username}
        local={local}
      />

      <Box sx={{ p: 4, pt: 2 }}>
        {/* Filtros + ação */}
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap" mb={2}>
          <Button variant="outlined" onClick={() => navigate(-1)}>
            Voltar
          </Button>

          <TextField
            label="Buscar (nome/código)"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            size="small"
            sx={{ minWidth: 280 }}
          />

          <Box sx={{ flex: 1 }} />

          <Button
            variant="contained"
            color="primary"
            disabled={dirtyCount === 0 || savingAll}
            onClick={saveAll}
          >
            {savingAll ? "Salvando..." : `Salvar alterações (${dirtyCount})`}
          </Button>
        </Box>

        <Paper
          sx={{
            position: "relative",
            maxWidth: 1100,
            mx: "auto",
            borderRadius: 2,
          }}
        >
          {loading && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "rgba(255,255,255,0.6)",
                zIndex: 1,
              }}
            >
              <CircularProgress />
            </Box>
          )}

          <TableContainer sx={{ maxHeight: "70vh" }}>
            <Table
              stickyHeader
              size="small"
              sx={{
                "th, td": { whiteSpace: "nowrap", p: "6px 12px" },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 160 }}>
                    <strong>CÓDIGO DO PRODUTO</strong>
                  </TableCell>
                  <TableCell>
                    <strong>NOME DO PRODUTO</strong>
                  </TableCell>
                  <TableCell align="center" sx={{ width: 160 }}>
                    <strong>CÂMERA</strong>
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {rows.map((row) => {
                  const buf = editMap[row.cod_produto] || { camera1: "" };

                  return (
                    <TableRow key={`${row.cod_produto}`}>
                      <TableCell>{row.cod_produto}</TableCell>
                      <TableCell>{row.nome_produto}</TableCell>

                      {/* CÂMERA */}
                      <TableCell align="center">
                        <TextField
                          select
                          size="small"
                          value={buf.camera1 ?? ""}
                          onChange={(e) =>
                            handleChangeCam(row.cod_produto, e.target.value)
                          }
                          sx={{ minWidth: 110 }}
                          SelectProps={{ onKeyDown: stopEnter }}
                        >
                          {CAM_OPTS.map((opt) => (
                            <MenuItem key={opt} value={opt}>
                              {opt === "" ? "—" : opt}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {rows.length === 0 && !loading && (
                  <TableRow>
                    {/* colSpan ajustado para 3 colunas */}
                    <TableCell colSpan={3}>
                      <Typography color="text.secondary" align="center">
                        Nenhum produto encontrado.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box display="flex" justifyContent="flex-end" p={2}>
            <Pagination
              page={page}
              count={totalPages}
              onChange={(_, p) => setPage(p)}
              color="primary"
              size="small"
              showFirstButton
              showLastButton
            />
          </Box>
        </Paper>
      </Box>

      {announce && (
        <Dialog open fullWidth maxWidth="sm" onClose={closeAnnouncement}>
          <DialogTitle>{announce.title || "Aviso"}</DialogTitle>
          <DialogContent dividers>
            <Alert severity={announce.level || "info"} sx={{ mb: 2 }}>
              {(announce.level || "info").toUpperCase()}
            </Alert>
            <Typography whiteSpace="pre-line">{announce.body}</Typography>
          </DialogContent>
          <DialogActions>
            <Button variant="contained" onClick={closeAnnouncement} autoFocus>
              {announce.requireAck ? "Entendi" : "Fechar"}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      <Snackbar
        open={snackOpen}
        autoHideDuration={2500}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackSeverity}
          variant="filled"
          onClose={() => setSnackOpen(false)}
        >
          {snackMsg}
        </Alert>
      </Snackbar>
    </>
  );
};

export default Cadastro;
