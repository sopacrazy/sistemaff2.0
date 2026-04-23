import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import axios from "axios";
import InputMask from "react-input-mask";
import { API_BASE_URL } from './utils/apiConfig';

const OcorrenciaDialog = ({ open, onClose, ocorrencia, onSave }) => {
  const [form, setForm] = useState({
    numero: "",
    remetente: "",
    data: "",
    cliente: "",
    descricao: "",
    valor: "",
    tipo: "",
    motivo: "",
    status: "",
    acao: "",
    dataTratativa: "",
    bilhete: "",
    motorista: "",
    conferente: "",
    ajudante: "",
    vendedor: "",
    produtos: [],
  });

  useEffect(() => {
    if (ocorrencia) {
      axios
        .get(`${API_BASE_URL}/ocorrencias/${ocorrencia.id}`)
        .then((response) => {
          setForm(response.data);
        })
        .catch((error) =>
          console.error("Erro ao buscar detalhes da ocorrência:", error)
        );
    }
  }, [ocorrencia]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSave = () => {
    onSave(form);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {ocorrencia ? "Editar Ocorrência" : "Visualizar Ocorrências"}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              name="numero"
              label="Nº"
              value={form.numero}
              onChange={handleChange}
              fullWidth
              disabled={!onSave}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="remetente"
              label="Remetente"
              value={form.remetente}
              onChange={handleChange}
              fullWidth
              disabled={!onSave}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <InputMask
              mask="99/99/9999"
              value={form.data}
              onChange={handleChange}
            >
              {() => (
                <TextField
                  name="data"
                  label="Data"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  disabled={!onSave}
                />
              )}
            </InputMask>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="cliente"
              label="Cliente"
              value={form.cliente}
              onChange={handleChange}
              fullWidth
              disabled={!onSave}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="descricao"
              label="Descrição"
              value={form.descricao}
              onChange={handleChange}
              fullWidth
              multiline
              rows={4}
              disabled={!onSave}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="valor"
              label="Valor"
              value={form.valor}
              onChange={handleChange}
              fullWidth
              disabled={!onSave}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth disabled={!onSave}>
              <InputLabel>Tipo</InputLabel>
              <Select name="tipo" value={form.tipo} onChange={handleChange}>
                <MenuItem value="DIVERGENCIA">Divergência</MenuItem>
                <MenuItem value="FALTA">Falta</MenuItem>
                <MenuItem value="AVARIA">Avaria</MenuItem>
                <MenuItem value="SOBRA">Sobra</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth disabled={!onSave}>
              <InputLabel>Motivo</InputLabel>
              <Select name="motivo" value={form.motivo} onChange={handleChange}>
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
                <MenuItem value="HORARIO DE ENTREGA">
                  HORARIO DE ENTREGA
                </MenuItem>
                <MenuItem value="HORARIO ENCERRADO">HORARIO ENCERRADO</MenuItem>
                <MenuItem value="IMPROPRIA P/ CONSUMO">
                  IMPROPRIA P/ CONSUMO
                </MenuItem>
                <MenuItem value="PEDIDO LANÇADO ERRADO">
                  PEDIDO LANÇADO ERRADO
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth disabled={!onSave}>
              <InputLabel>Ação a Ser Tomada</InputLabel>
              <Select name="acao" value={form.acao} onChange={handleChange}>
                <MenuItem value="ENVIAR REPOSIÇÃO">ENVIAR REPOSIÇÃO</MenuItem>
                <MenuItem value="EXCLUIR NOTA">EXCLUIR NOTA</MenuItem>
                <MenuItem value="FAZER COMPRA">FAZER COMPRA</MenuItem>
                <MenuItem value="FAZER TROCA">FAZER TROCA</MenuItem>
                <MenuItem value="REFAZER NF E BOLETO">
                  REFAZER NF E BOLETO
                </MenuItem>
                <MenuItem value="REPOSIÇÃO">REPOSIÇÃO</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="bilhete"
              label="Bilhete"
              value={form.bilhete}
              onChange={handleChange}
              fullWidth
              disabled={!onSave}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="motorista"
              label="Motorista"
              value={form.motorista}
              onChange={handleChange}
              fullWidth
              disabled={!onSave}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="conferente"
              label="Conferente"
              value={form.conferente}
              onChange={handleChange}
              fullWidth
              disabled={!onSave}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="ajudante"
              label="Ajudante"
              value={form.ajudante}
              onChange={handleChange}
              fullWidth
              disabled={!onSave}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="vendedor"
              label="Vendedor"
              value={form.vendedor}
              onChange={handleChange}
              fullWidth
              disabled={!onSave}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h6" style={{ marginTop: "16px" }}>
              Produtos:
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Produto</TableCell>
                    <TableCell>Quantidade</TableCell>
                    <TableCell>Unidade</TableCell>
                    <TableCell>Valor</TableCell>
                    <TableCell>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {form.produtos.map((produto, index) => (
                    <TableRow key={index}>
                      <TableCell>{produto.produto_nome}</TableCell>
                      <TableCell>{produto.quantidade}</TableCell>
                      <TableCell>{produto.produto_unidade}</TableCell>
                      <TableCell>R${produto.valor}</TableCell>
                      <TableCell>R${produto.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      </DialogContent>
      {onSave && (
        <DialogActions>
          <Button onClick={onClose} color="secondary" variant="contained">
            Cancelar
          </Button>
          <Button onClick={handleSave} color="primary" variant="contained">
            Salvar
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default OcorrenciaDialog;
