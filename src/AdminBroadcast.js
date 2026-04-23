import React, { useMemo, useState } from "react";
import {
  Box,
  Paper,
  TextField,
  MenuItem,
  Button,
  Typography,
  Snackbar,
  Alert,
  Switch,
  FormControlLabel,
  Divider,
} from "@mui/material";
import axios from "axios";
import { API_BASE_URL } from './utils/apiConfig';

const API_BASE =
  API_BASE_URL || window.__API_BASE || "http://localhost:3001";

const niveis = ["info", "success", "warning", "error"];

// se você já tem essa lista em outro arquivo, pode importar de lá
const locais = [
  { id: "", nome: "Todos os locais" },
  { id: "09", nome: "PS1" },
  { id: "06", nome: "PS2" },
  { id: "03", nome: "BTF" },
  { id: "04", nome: "BAN-04" },
  { id: "07", nome: "CD" },
  { id: "01", nome: "LOJA" },
  { id: "05", nome: "DEP (OVO)" },
  { id: "02", nome: "DEP" },
];

export default function AdminBroadcast() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [level, setLevel] = useState("info");
  const [requireAck, setRequireAck] = useState(true);
  const [targetLocal, setTargetLocal] = useState("");
  const [loading, setLoading] = useState(false);

  const [snack, setSnack] = useState({ open: false, msg: "", sev: "success" });

  const token = useMemo(() => {
    // ajuste se seu token estiver com outro nome
    return localStorage.getItem("token") || "";
  }, []);

  const canSend = title.trim() && body.trim() && !loading;

  const handleSend = async () => {
    if (!canSend) return;
    try {
      setLoading(true);
      const payload = {
        title: title.trim(),
        body: body.trim(),
        level,
        requireAck,
        id: "ui-" + Date.now(), // id único pra evitar repetição
      };
      // envia para todos se targetLocal = "", senão envia só para o local escolhido
      if (targetLocal) payload.targetLocal = targetLocal;

      await axios.post(`${API_BASE}/admin/broadcast-dev`, payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      setSnack({ open: true, msg: "✅ Mensagem enviada!", sev: "success" });
      // opcional: limpar o formulário
      // setTitle(""); setBody(""); setLevel("info"); setRequireAck(true); setTargetLocal("");
    } catch (e) {
      console.error(e);
      let msg = "❌ Falha ao enviar broadcast.";
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        msg = "🔒 Sem autorização. Verifique o token/permite gestor.";
      }
      setSnack({ open: true, msg, sev: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} mb={2}>
        Painel — Broadcast (tempo real)
      </Typography>

      <Paper sx={{ p: 3, maxWidth: 720 }}>
        <Box display="grid" gap={2}>
          <TextField
            label="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            inputProps={{ maxLength: 120 }}
            helperText={`${title.length}/120`}
            required
          />

          <TextField
            label="Mensagem"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            multiline
            minRows={4}
            inputProps={{ maxLength: 2000 }}
            helperText={`${body.length}/2000`}
            required
          />

          <Box display="flex" gap={2} flexWrap="wrap">
            <TextField
              select
              label="Nível"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              sx={{ minWidth: 180 }}
            >
              {niveis.map((n) => (
                <MenuItem key={n} value={n}>
                  {n.toUpperCase()}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Alvo (Local)"
              value={targetLocal}
              onChange={(e) => setTargetLocal(e.target.value)}
              sx={{ minWidth: 220 }}
              helperText="Vazio = todos os locais"
            >
              {locais.map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {l.id ? `${l.id} - ${l.nome}` : l.nome}
                </MenuItem>
              ))}
            </TextField>

            <FormControlLabel
              control={
                <Switch
                  checked={requireAck}
                  onChange={(e) => setRequireAck(e.target.checked)}
                />
              }
              label="Exigir confirmação (Entendi)"
            />
          </Box>

          <Divider sx={{ my: 1 }} />

          <Box display="flex" gap={2}>
            <Button
              variant="contained"
              onClick={handleSend}
              disabled={!canSend}
            >
              {loading ? "Enviando..." : "Enviar broadcast"}
            </Button>

            {/* Botão de teste rápido */}
            <Button
              variant="outlined"
              onClick={() => {
                setTitle("Aviso de teste");
                setBody("Este é um broadcast de teste disparado pelo painel.");
                setLevel("warning");
              }}
            >
              Preencher teste
            </Button>
          </Box>
        </Box>
      </Paper>

      <Snackbar
        open={snack.open}
        autoHideDuration={2500}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snack.sev}
          variant="filled"
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
