import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Grid, Button, Typography } from "@mui/material";
import DefaultAppBar from "../components/DefaultAppBar";

const EntradaEstoque = () => {
  const navigate = useNavigate();

  const botaoStyle = {
    width: 240,
    height: 110,
    backgroundColor: "#388e3c",
    color: "#fff",
    fontWeight: "bold",
    borderRadius: 3,
    textTransform: "none",
    boxShadow: 3,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    fontSize: 16,
    transition: "0.2s ease",
    "&:hover": {
      backgroundColor: "#2e7d32",
      transform: "translateY(-3px)",
    },
  };

  return (
    <>
      <DefaultAppBar title="Entrada de Estoque" />
      <Box sx={{ p: 4 }}>
        <Grid container spacing={4} justifyContent="center">
          <Grid item>
            <Button
              sx={botaoStyle}
              onClick={() => navigate("/estoque/entrada/mercadoria")}
            >
              <Typography>Compras de Mercadoria</Typography>
            </Button>
          </Grid>

          <Grid item>
            <Button
              sx={botaoStyle}
              onClick={() => navigate("/estoque/entrada/devolucao")}
            >
              <Typography>Devolução</Typography>
            </Button>
          </Grid>

          <Grid item>
            <Button
              sx={botaoStyle}
              onClick={() => navigate("/estoque/entrada/ceasa")}
            >
              <Typography>Compras Ceasa</Typography>
            </Button>
          </Grid>
        </Grid>
      </Box>
    </>
  );
};

export default EntradaEstoque;
