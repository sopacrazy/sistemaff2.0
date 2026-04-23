import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Typography,
} from "@mui/material";
import DefaultAppBar from "./components/DefaultAppBar";
import { API_BASE_URL } from './utils/apiConfig';

const ValidarCnpj = () => {
  const [clientes, setClientes] = useState([]);
  const [validando, setValidando] = useState(false);
  const navigate = useNavigate();

  const iniciarValidacaoLote = async () => {
    setClientes([]);
    setValidando(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/validar-clientes-lote`
      );
      const data = await response.json();
      setClientes(data); // agora retorna lista de clientes
    } catch (err) {
      console.error("Erro na requisição", err);
    }

    setValidando(false);
  };

  const exportarPDF = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/validacao-pdf`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientes }),
        }
      );

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "validacao-cnpjs.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Erro ao exportar PDF:", err);
    }
  };

  return (
    <Box>
      <DefaultAppBar title="Validação de CNPJ em Lote" />

      <Box sx={{ p: 4 }}>
        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => navigate("/")}
          >
            Voltar para Home
          </Button>

          <Button
            variant="contained"
            onClick={iniciarValidacaoLote}
            disabled={validando}
          >
            {validando ? "Validando..." : "Iniciar Validação"}
          </Button>

          {clientes.length > 0 && (
            <Button variant="outlined" color="success" onClick={exportarPDF}>
              Exportar PDF
            </Button>
          )}
        </Box>

        {clientes.length > 0 && (
          <Paper sx={{ mt: 4, overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Nome (ERP)</TableCell>
                  <TableCell>Campo</TableCell>
                  <TableCell>Valor (ERP)</TableCell>
                  <TableCell>Valor (Receita)</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {clientes.map((cli, index) =>
                  cli.divergencias?.length > 0 ? (
                    cli.divergencias.map((div, idx) => (
                      <TableRow key={`${cli.codigo}-${idx}`}>
                        <TableCell>{cli.codigo}</TableCell>
                        <TableCell>{cli.nome}</TableCell>
                        <TableCell>{div.campo}</TableCell>
                        <TableCell>{div.valorERP}</TableCell>
                        <TableCell>{div.valorReceita}</TableCell>
                        <TableCell>
                          <Chip
                            label={`${div.campo} diferente`}
                            color="error"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow key={`${cli.codigo}-ok`}>
                      <TableCell>{cli.codigo}</TableCell>
                      <TableCell>{cli.nome}</TableCell>
                      <TableCell colSpan={4}>
                        <Typography color="success.main">
                          Sem divergências
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default ValidarCnpj;
