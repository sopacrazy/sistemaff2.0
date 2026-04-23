import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import axios from "axios";
import { API_BASE_URL } from './utils/apiConfig';

const ReportDialog = ({ open, onClose, type }) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tipoRelatorio, setTipoRelatorio] = useState("analitico");
  const [motivo, setMotivo] = useState("");

  const handleExport = async () => {
    try {
      const params = { startDate, endDate };
      const token = localStorage.getItem("token");

      if (type === "excel") {
        const response = await axios.get(
          `${API_BASE_URL}/ocorrencias/excel`,
          {
            params,
            responseType: "blob",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "relatorio.xlsx");
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else if (type === "pdf") {
        params.tipoRelatorio = tipoRelatorio;
        params.motivo = motivo;

        const response = await axios.get(
          `${API_BASE_URL}/relatorios/pdf`,
          {
            params,
            responseType: "arraybuffer",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const blob = new Blob([response.data], { type: "application/pdf" });
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.setAttribute("download", "relatorio.pdf");
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (error) {
      console.error("❌ Erro ao exportar relatório:", error);
      alert("Erro ao exportar relatório.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {type === "excel" ? "Exportar para Excel" : "Exportar para PDF"}
      </DialogTitle>
      <DialogContent>
        <TextField
          margin="dense"
          label="Data de Início"
          type="date"
          fullWidth
          InputLabelProps={{ shrink: true }}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />

        <TextField
          margin="dense"
          label="Data de Fim"
          type="date"
          fullWidth
          InputLabelProps={{ shrink: true }}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />

        {type === "pdf" && (
          <FormControl fullWidth margin="dense">
            <InputLabel>Tipo de Relatório</InputLabel>
            <Select
              value={tipoRelatorio}
              label="Tipo de Relatório"
              onChange={(e) => setTipoRelatorio(e.target.value)}
            >
              <MenuItem value="analitico">Analítico</MenuItem>
              <MenuItem value="sintetico">Sintético</MenuItem>
            </Select>
          </FormControl>
        )}

        {type === "pdf" && (
          <FormControl fullWidth margin="dense">
            <InputLabel>Motivo</InputLabel>
            <Select
              value={motivo}
              label="Motivo"
              onChange={(e) => setMotivo(e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="ACORDO COMERCIAL">ACORDO COMERCIAL</MenuItem>
              <MenuItem value="CRITERIO DO CLIENTE">
                CRITERIO DO CLIENTE
              </MenuItem>
              <MenuItem value="DIV. DE BALANÇA">DIV. DE BALANÇA</MenuItem>
              <MenuItem value="ERRO DE FATURAMENTO">
                ERRO DE FATURAMENTO
              </MenuItem>
              <MenuItem value="ERRO DO MOTORISTA">ERRO DO MOTORISTA</MenuItem>
              <MenuItem value="ERRO DO VENDEDOR">ERRO DO VENDEDOR</MenuItem>
              <MenuItem value="ERRO OPERACIONAL">ERRO OPERACIONAL</MenuItem>
              <MenuItem value="HORARIO DE ENTREGA">HORARIO DE ENTREGA</MenuItem>
              <MenuItem value="HORARIO ENCERRADO">HORARIO ENCERRADO</MenuItem>
              <MenuItem value="IMPROPRIA P/ CONSUMO">
                IMPROPRIA P/ CONSUMO
              </MenuItem>
              <MenuItem value="PEDIDO LANÇADO ERRADO">
                PEDIDO LANÇADO ERRADO
              </MenuItem>
            </Select>
          </FormControl>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Cancelar
        </Button>
        <Button onClick={handleExport} color="primary" variant="contained">
          Exportar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReportDialog;
