// src/pages/FolhaDeFaltasPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import HomeIcon from "@mui/icons-material/Home";
import { useNavigate, useSearchParams } from "react-router-dom";
import DefaultAppBar from "../components/DefaultAppBar";
import { API_BASE_URL } from '../utils/apiConfig';

// Se você já tem esse util, importe-o:  import { getDataTrabalho } from "../utils/dataTrabalho";
function getDataTrabalho() {
  try {
    const raw = localStorage.getItem("data_trabalho");
    if (raw) return raw; // YYYY-MM-DD
  } catch {}
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const API_BASE =
  window.__API_BASE ||
  document.querySelector('meta[name="api-base"]')?.content ||
  API_BASE_URL ||
  "http://localhost:3001";

export default function FolhaDeFaltasPage() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "sistema";
  const origemUsuario = localStorage.getItem("origem") || "";
  const [searchParams] = useSearchParams();

  // diálogo de parâmetros
  const [openParams, setOpenParams] = useState(true);
  const [data, setData] = useState(
    searchParams.get("data") || getDataTrabalho()
  );
  const [localSel, setLocalSel] = useState(
    searchParams.get("local") || origemUsuario
  );
  const [tipo, setTipo] = useState(
    (searchParams.get("tipo") || "padrao").toLowerCase()
  ); // "padrao" | "compras"
  const [locais, setLocais] = useState([]);

  // dados do relatório (pré-visualização HTML quando vier por querystring)
  const [loading, setLoading] = useState(false);
  const [cabecalho, setCabecalho] = useState({
    localNome: "",
    usuario: username,
    data: "",
    fechadoAs: "",
  });
  const [itens, setItens] = useState([]);

  // 1) Buscar LOCais do backend
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/usuarios/${username}/locais`);
        if (!res.ok) throw new Error("Falha ao buscar locais");
        const body = await res.json(); // { locais: ["01","03","04", ...] }
        setLocais(Array.isArray(body?.locais) ? body.locais : []);
      } catch (e) {
        console.error(e);
        setLocais(origemUsuario ? [origemUsuario] : []);
      }
    })();
  }, [username, origemUsuario]);

  // 2) Buscar RELATÓRIO no backend (JSON) — usado só quando a página já entra com querystring
  async function carregarRelatorio(params) {
    const { data, local, tipo } = params;
    setLoading(true);
    try {
      const url = `${API_BASE}/relatorios/faltas?data=${encodeURIComponent(
        data
      )}&local=${encodeURIComponent(local)}&tipo=${encodeURIComponent(tipo)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Falha ao carregar relatório");

      const body = await res.json();
      setCabecalho({
        localNome: body?.cabecalho?.localNome ?? `LOCAL ${local}`,
        usuario: body?.cabecalho?.usuario ?? username,
        data: body?.cabecalho?.data ?? data,
        fechadoAs: body?.cabecalho?.fechadoAs ?? "",
      });
      setItens(Array.isArray(body?.itens) ? body.itens : []);
    } catch (e) {
      console.error(e);
      setCabecalho((c) => ({
        ...c,
        localNome: `LOCAL ${params.local}`,
        data: params.data,
      }));
      setItens([]);
    } finally {
      setLoading(false);
    }
  }

  // Confirmar parâmetros -> abre PDF gerado pelo backend (com tipo)
  const handleConfirmar = () => {
    const url = `${API_BASE}/relatorios/faltas/pdf?data=${encodeURIComponent(
      data
    )}&local=${encodeURIComponent(localSel)}&tipo=${encodeURIComponent(tipo)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setOpenParams(false);
  };

  // Se já vier com querystring, carrega direto (e não abre dialog)
  useEffect(() => {
    const qData = searchParams.get("data");
    const qLocal = searchParams.get("local");
    const qTipo = (searchParams.get("tipo") || "padrao").toLowerCase();
    if (qData && qLocal) {
      setOpenParams(false);
      setTipo(qTipo);
      carregarRelatorio({ data: qData, local: qLocal, tipo: qTipo });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Totais (para a pré-visualização HTML)
  const totalItensComFalta = useMemo(
    () => itens.filter((i) => Number(i?.falta) > 0).length,
    [itens]
  );
  const somaDasFaltas = useMemo(
    () => itens.reduce((acc, i) => acc + (Number(i?.falta) || 0), 0),
    [itens]
  );
  const somaTotalCompras = useMemo(() => {
    if (tipo !== "compras") return 0;
    return itens.reduce((acc, r) => {
      const falta = Number(r?.falta || 0);
      const compra = Number(r?.compra || 0); // quando o backend retornar
      const total = Number(r?.total);
      return acc + (Number.isFinite(total) ? total : falta * compra);
    }, 0);
  }, [itens, tipo]);

  return (
    <>
      <DefaultAppBar
        title="Folha de Faltas — Fechamento"
        usuario={username}
        local={origemUsuario}
      />
      <Box p={3}>
        <Stack direction="row" spacing={2} mb={2}>
          <Button
            variant="contained"
            startIcon={<HomeIcon />}
            onClick={() => navigate("/relatorios")}
            sx={{
              backgroundColor: "#228B22",
              "&:hover": { backgroundColor: "#32CD32" },
            }}
          >
            Voltar
          </Button>

          {!openParams && (
            <>
              <Button variant="outlined" onClick={() => setOpenParams(true)}>
                Alterar parâmetros
              </Button>
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={() => window.print()}
              >
                Imprimir
              </Button>
            </>
          )}
        </Stack>

        {/* Cabeçalho (pré-visualização) */}
        {!openParams && (
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Folha de Faltas — {tipo === "compras" ? "Compras" : "Padrão"}
            </Typography>
            <Typography variant="body2">
              <b>Local:</b> {cabecalho.localNome}
            </Typography>
            <Typography variant="body2">
              <b>Usuário:</b> {cabecalho.usuario}
            </Typography>
            <Typography variant="body2">
              <b>Data:</b> {cabecalho.data}
            </Typography>
            {cabecalho.fechadoAs && (
              <Typography variant="body2">
                <b>Fechado às:</b> {cabecalho.fechadoAs}
              </Typography>
            )}
          </Paper>
        )}

        {/* Tabela (pré-visualização) */}
        {!openParams && (
          <Paper sx={{ p: 0 }}>
            <Table size="small">
              <TableHead>
                {tipo === "compras" ? (
                  <TableRow>
                    <TableCell>
                      <b>Código</b>
                    </TableCell>
                    <TableCell>
                      <b>Produto</b>
                    </TableCell>
                    <TableCell>
                      <b>Unid.</b>
                    </TableCell>
                    <TableCell align="right">
                      <b>Falta</b>
                    </TableCell>
                    <TableCell align="right">
                      <b>Compra</b>
                    </TableCell>
                    <TableCell align="right">
                      <b>Total</b>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow>
                    <TableCell>
                      <b>Código</b>
                    </TableCell>
                    <TableCell>
                      <b>Produto</b>
                    </TableCell>
                    <TableCell>
                      <b>Unid.</b>
                    </TableCell>
                    <TableCell align="right">
                      <b>Saldo</b>
                    </TableCell>
                    <TableCell align="right">
                      <b>Físico</b>
                    </TableCell>
                    <TableCell align="right">
                      <b>Falta</b>
                    </TableCell>
                    <TableCell>
                      <b>Observação</b>
                    </TableCell>
                  </TableRow>
                )}
              </TableHead>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={tipo === "compras" ? 6 : 7}>
                      Carregando…
                    </TableCell>
                  </TableRow>
                )}

                {!loading &&
                  itens.map((row, idx) =>
                    tipo === "compras" ? (
                      <TableRow key={idx}>
                        <TableCell>{row.cod_produto || row.codigo}</TableCell>
                        <TableCell>{row.produto}</TableCell>
                        <TableCell>{row.unid || row.unidade}</TableCell>
                        <TableCell align="right">
                          <b>
                            {Number(row.falta).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </b>
                        </TableCell>
                        <TableCell align="right">
                          {Number(row.compra || 0).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell align="right">
                          <b>
                            {Number(
                              row.total ??
                                Number(row.falta || 0) * Number(row.compra || 0)
                            ).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </b>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={idx}>
                        <TableCell>{row.cod_produto || row.codigo}</TableCell>
                        <TableCell>{row.produto}</TableCell>
                        <TableCell>{row.unid || row.unidade}</TableCell>
                        <TableCell align="right">
                          {Number(row.saldo).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell align="right">
                          {Number(row.fisico).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell align="right">
                          <b>
                            {Number(row.falta).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </b>
                        </TableCell>
                        <TableCell>{row.observacao || ""}</TableCell>
                      </TableRow>
                    )
                  )}

                {!loading && (
                  <>
                    <TableRow>
                      <TableCell colSpan={tipo === "compras" ? 5 : 6}>
                        <b>Total de itens com falta</b>
                      </TableCell>
                      <TableCell>{totalItensComFalta}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell colSpan={tipo === "compras" ? 5 : 6}>
                        <b>Soma das faltas</b>
                      </TableCell>
                      <TableCell>
                        {somaDasFaltas.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                    </TableRow>

                    {tipo === "compras" && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <b>Soma total (R$)</b>
                        </TableCell>
                        <TableCell>
                          {somaTotalCompras.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>

            <Box sx={{ p: 1, textAlign: "right", fontSize: 12 }}>
              Página <span className="pageNumber"></span> /{" "}
              <span className="totalPages"></span>
            </Box>
          </Paper>
        )}
      </Box>

      {/* Dialog Parâmetros */}
      <Dialog open={openParams} fullWidth maxWidth="xs" disableEscapeKeyDown>
        <DialogTitle>Parâmetros — Folha de Faltas</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="Data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ max: getDataTrabalho() }}
            />
            <TextField
              select
              label="Local"
              value={localSel}
              onChange={(e) => setLocalSel(e.target.value)}
            >
              {locais.map((lc) => (
                <MenuItem key={lc} value={lc}>
                  {lc}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Tipo de Relatório"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              <MenuItem value="padrao">Padrão</MenuItem>
              <MenuItem value="compras">
                Compras (Falta × Compra = Total)
              </MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate("/relatorios")}>Cancelar</Button>
          <Button variant="contained" onClick={handleConfirmar}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
