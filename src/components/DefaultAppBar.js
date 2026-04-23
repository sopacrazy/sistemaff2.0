import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  TextField,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import axios from "axios";
import { getDataTrabalho, setDataTrabalho } from "../utils/dataTrabalho";
import useIdleLogout from "../hooks/useIdleLogout";

const DefaultAppBar = ({ title = "SistemaFF - Sistema de Controle" }) => {
  const navigate = useNavigate();
  const dataTrabalho = getDataTrabalho();

  // AGORA SIM: dentro do corpo do componente
  const usuario = sessionStorage.getItem("username") || localStorage.getItem("username") || "Usuário";
  const local = sessionStorage.getItem("origem") || localStorage.getItem("origem") || "";

  // Leitura de permissões compatível com session/local
  const permissoesStr = sessionStorage.getItem("permissoes") || localStorage.getItem("permissoes") || "[]";
  let permissoes = [];
  try {
    permissoes = JSON.parse(permissoesStr);
  } catch (e) {
    permissoes = [];
  }

  // Em outras rotinas (DefaultAppBar), nós travamos a troca de local conforme solicitado.
  const podeTrocarLocal = false;

  const [dialogLocais, setDialogLocais] = useState(false);
  const [locaisPermitidos, setLocaisPermitidos] = useState([]);

  const abrirDialogLocais = async () => {
    // Desativado
  };

  const trocarLocal = async (novoLocal) => {
    // Desativado
  };

  const handleLogout = () => {
    const hoje = new Date().toISOString().split("T")[0];
    localStorage.setItem("data_trabalho", hoje);

    // Limpa ambos storages
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("permissoes");
    localStorage.removeItem("origem");
    sessionStorage.clear();

    navigate("/login");
  };

  useIdleLogout(30 * 60 * 1000, handleLogout);

  return (
    <>
      <AppBar position="static" sx={{ backgroundColor: "#2e7d32" }}>
        <Toolbar variant="dense" sx={{ gap: 2 }}>
          <IconButton edge="start" color="inherit" aria-label="menu">
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>

          <Box display="flex" alignItems="center" gap={2}>
            <TextField
              type="date"
              size="small"
              value={dataTrabalho}
              onChange={(e) => {
                setDataTrabalho(e.target.value);
                window.location.reload();
              }}
              sx={{ backgroundColor: "white", borderRadius: 1 }}
            />

            {/* Botão de Local apenas informativo */}
            <Button
              disableRipple
              sx={{
                fontWeight: "bold",
                textTransform: "none",
                backgroundColor: "transparent",
                color: "white",
                cursor: "default",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 1,
                px: 2,
                "&:hover": {
                  backgroundColor: "transparent",
                },
              }}
            >
              {usuario} | Local: {local}
            </Button>

            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Dialog removido visualmente/lógico pois não é mais acessível aqui */}
    </>
  );
};

export default DefaultAppBar;
