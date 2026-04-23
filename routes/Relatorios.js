// src/pages/Relatorios.jsx
import React, { useState } from "react";
import {
  Box,
  Button,
  Stack,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import AssessmentIcon from "@mui/icons-material/Assessment";
import DescriptionIcon from "@mui/icons-material/Description";
import HomeIcon from "@mui/icons-material/Home";
import DefaultAppBar from "../components/DefaultAppBar";
import { getDataTrabalho } from "../utils/dataTrabalho";
import { Snackbar, Alert } from "@mui/material";

const API_BASE =
  process.env.REACT_APP_API_URL ||
  window.__API_BASE ||
  document.querySelector('meta[name="api-base"]')?.content ||
  "http://localhost:3001";

// tenta via iframe oculto; se falhar, navega na mesma aba
function baixarRelFaltasEmIframe({ data, local }) {
  const url = `${API_BASE}/relatorios-public/faltas/pdf?data=${encodeURIComponent(
    data
  )}&local=${encodeURIComponent(local)}`;

  const iframeId = "hidden-download-frame";
  let iframe = document.getElementById(iframeId);
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = iframeId;
    iframe.name = iframeId;
    iframe.style.display = "none";
    document.body.appendChild(iframe);
  }
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "error",
  });
  const showToast = (message, severity = "error") =>
    setToast({ open: true, message, severity });

  const form = document.createElement("form");
  form.method = "GET";
  form.action = `${API_BASE}/relatorios-public/faltas/pdf`;
  form.target = iframeId;

  const inputData = document.createElement("input");
  inputData.type = "hidden";
  inputData.name = "data";
  inputData.value = data;
  form.appendChild(inputData);

  const inputLocal = document.createElement("input");
  inputLocal.type = "hidden";
  inputLocal.name = "local";
  inputLocal.value = local;
  form.appendChild(inputLocal);

  document.body.appendChild(form);
  form.submit();
  form.remove();

  // fallback em 1.2s: se nada aconteceu (ex.: rota não encontrada),
  // navega na mesma aba para mostrar o erro/forçar download
  const fallback = setTimeout(() => {
    try {
      window.location.href = url;
    } catch {}
  }, 1200);

  // se o iframe carregar algo, cancela o fallback
  iframe.onload = () => clearTimeout(fallback);

  setTimeout(() => {
    try {
      iframe.src = "about:blank";
    } catch {}
  }, 8000);
}

const LOCAIS = [
  { id: "09", col: "PASSARELA 1" },
  { id: "06", col: "TORRES" },
  { id: "03", col: "BTF" },
  { id: "04", col: "BANANA" },
  { id: "07", col: "CD" },
  { id: "01", col: "LOJA" },
  { id: "05", col: "DEP. OVO" },
  { id: "02", col: "DEPOSITO" },
];

const Relatorios = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "sistema";
  const origemUsuario = localStorage.getItem("origem") || "-";

  const [openParams, setOpenParams] = useState(false);
  const [dataRel, setDataRel] = useState(getDataTrabalho());
  const [localRel, setLocalRel] = useState(String(origemUsuario || ""));

  const botaoStyle = {
    width: 240,
    height: 120,
    backgroundColor: "#228B22",
    color: "#fff",
    fontWeight: "bold",
    textTransform: "uppercase",
    borderRadius: 12,
    boxShadow: 2,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    transition: "0.2s ease-in-out",
    "&:hover": { backgroundColor: "#32CD32", transform: "translateY(-2px)" },
  };

  return (
    <>
      <DefaultAppBar
        title="Relatórios"
        usuario={username}
        local={origemUsuario}
      />
      <Box sx={{ p: 4 }}>
        <Box
          mb={4}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Button
            variant="contained"
            startIcon={<HomeIcon />}
            onClick={() => navigate(-1)}
            sx={{
              backgroundColor: "#228B22",
              color: "#fff",
              "&:hover": { backgroundColor: "#32CD32" },
            }}
          >
            Voltar
          </Button>
        </Box>

        <Stack
          direction="row"
          spacing={3}
          alignItems="center"
          justifyContent="center"
          sx={{ mt: 6, flexWrap: "wrap" }}
        >
          <Button sx={botaoStyle} onClick={() => setOpenParams(true)}>
            <AssessmentIcon sx={{ mb: 1 }} />
            <Typography variant="button">REL FALTAS</Typography>
          </Button>

          <Button
            sx={botaoStyle}
            onClick={() => navigate("/relatorios/fisico")}
          >
            <DescriptionIcon sx={{ mb: 1 }} />
            <Typography variant="button">REL FÍSICO</Typography>
          </Button>
        </Stack>
      </Box>

      <Dialog
        open={openParams}
        onClose={() => setOpenParams(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Parâmetros — Relatório de Faltas</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="Data"
              type="date"
              value={dataRel}
              onChange={(e) => setDataRel(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel id="local-rel-label">Local</InputLabel>
              <Select
                labelId="local-rel-label"
                label="Local"
                value={localRel}
                onChange={(e) => setLocalRel(e.target.value)}
              >
                {LOCAIS.map((l) => (
                  <MenuItem key={l.id} value={l.id}>
                    {l.col} ({l.id})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenParams(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => {
              baixarRelFaltasEmIframe({ data: dataRel, local: localRel });
              setOpenParams(false);
            }}
          >
            Gerar
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          severity={toast.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default Relatorios;
