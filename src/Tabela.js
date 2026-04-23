import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  TextField,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import axios from "axios";
import { API_BASE_URL } from './utils/apiConfig';

const Tabela = () => {
  // Estados para dados da NFE – ICMS – DEVOLUÇÃO
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);
  // Estados para paginação e filtros na tabela de devolução
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const [filtroFornecedor, setFiltroFornecedor] = useState("");
  const [filtroCodigo, setFiltroCodigo] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroTes, setFiltroTes] = useState([]); // Filtro para múltiplos TES

  // Estados para dados de Notas Sem Chave Fiscal
  const [dadosSemChave, setDadosSemChave] = useState([]);
  const [loadingSemChave, setLoadingSemChave] = useState(true);

  const navigate = useNavigate();

  // Buscar dados da NFE – ICMS – DEVOLUÇÃO
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/nfe`
        );
        setDados(response.data);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Buscar dados das Notas Sem Chave Fiscal
  useEffect(() => {
    const fetchSemChave = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/notasSemChave`
        );
        setDadosSemChave(response.data);
      } catch (error) {
        console.error("Erro ao buscar dados sem chave fiscal:", error);
      } finally {
        setLoadingSemChave(false);
      }
    };
    fetchSemChave();
  }, []);

  // Função para formatar datas (DD/MM/AAAA)
  const formatarData = (dataIso) => {
    if (!dataIso) return "-";
    const data = new Date(dataIso);
    return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  };

  // Função para formatar valores em moeda (R$)
  const formatarMoeda = (valor) => {
    if (isNaN(valor)) return "R$ 0,00";
    return Number(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  // Função para formatar percentual (2 casas decimais)
  const formatarPercentual = (valor) => {
    return valor ? `${Number(valor).toFixed(2).replace(".", ",")}%` : "0,00%";
  };

  // Obter valores únicos para TES (para o dropdown múltiplo)
  const uniqueTes = Array.from(new Set(dados.map((row) => row.tes))).filter(
    Boolean
  );

  // Função para converter string "AAAA-MM-DD" em timestamp (para comparação)
  const toTimestamp = (strData) => {
    // Se estiver vazio, retornamos null
    if (!strData) return null;
    // Esperamos que venha no formato "DD/MM/AAAA" (padrão BR)
    const [dia, mes, ano] = strData.split("/");
    return new Date(`${ano}-${mes}-${dia}`).getTime();
  };

  // Aplicar filtros na tabela de devolução
  const dadosFiltrados = dados.filter((row) => {
    // Converter dtdigit para timestamp
    const dataRegistro = new Date(row.dtdigit).getTime();
    const dataInicioTS = toTimestamp(filtroDataInicio);
    const dataFimTS = toTimestamp(filtroDataFim);

    // Filtro por data (range)
    const passaData =
      (!dataInicioTS || dataRegistro >= dataInicioTS) &&
      (!dataFimTS || dataRegistro <= dataFimTS);

    // Filtro por TES (múltiplo)
    const tesValue = row.tes ? row.tes.toLowerCase() : "";
    const passaTes =
      filtroTes.length === 0 ||
      filtroTes.map((t) => t.toLowerCase()).includes(tesValue);

    // Filtros gerais
    return (
      (filtroFornecedor === "" ||
        row.fornecedor
          .toLowerCase()
          .includes(filtroFornecedor.toLowerCase())) &&
      (filtroCodigo === "" ||
        row.cod.toLowerCase().includes(filtroCodigo.toLowerCase())) &&
      passaData &&
      passaTes
    );
  });

  // Manipuladores de paginação
  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Manipulador para o filtro de TES (múltiplo)
  const handleTesChange = (event) => {
    const {
      target: { value },
    } = event;
    setFiltroTes(typeof value === "string" ? value.split(",") : value);
  };

  return (
    <Box
      sx={{
        padding: 4,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Botão para voltar para a Home */}
      <Button
        variant="contained"
        color="primary"
        onClick={() => navigate("/")}
        sx={{ marginBottom: 2 }}
      >
        Voltar para Home
      </Button>

      {/* Tabela para Notas Fiscais Sem Chave Fiscal */}
      <Typography variant="h4" sx={{ marginBottom: 2 }}>
        Notas Fiscais Sem Chave Fiscal
      </Typography>
      {loadingSemChave ? (
        <Box sx={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer
          component={Paper}
          sx={{
            width: "70%",
            marginBottom: 4,
            borderRadius: 2,
            boxShadow: 3,
          }}
        >
          <Table>
            <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
              <TableRow>
                <TableCell>
                  <strong>Documento</strong>
                </TableCell>
                <TableCell>
                  <strong>Emissão</strong>
                </TableCell>
                <TableCell>
                  <strong>Série</strong>
                </TableCell>
                <TableCell>
                  <strong>Cliente</strong>
                </TableCell>
                <TableCell>
                  <strong>Condição</strong>
                </TableCell>
                <TableCell>
                  <strong>Valor Bruto</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dadosSemChave.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.doc}</TableCell>
                  <TableCell>{formatarData(row.emissao)}</TableCell>
                  <TableCell>{row.serie}</TableCell>
                  <TableCell>{row.cliente}</TableCell>
                  <TableCell>{row.cond}</TableCell>
                  <TableCell>{formatarMoeda(row.valbrut)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Filtros para a tabela de NFE – ICMS – DEVOLUÇÃO */}
      <Typography variant="h4" sx={{ marginBottom: 2 }}>
        NFE - ICMS - DEVOLUÇÃO
      </Typography>

      {/*
        Aqui está o Box que contém TODOS os filtros em uma linha só.
        size="small" deixa os campos mais compactos.
        flexWrap="nowrap" evita que quebrem linha.
        Se quiser que quebrem em telas pequenas, troque para "wrap".
      */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          marginBottom: 2,
          width: "70%",
          overflowX: "auto", // Se ficar muito grande, habilita scroll horizontal
          flexWrap: "nowrap", // Não quebra linha
        }}
      >
        <TextField
          label="Fornecedor"
          variant="outlined"
          size="small"
          value={filtroFornecedor}
          onChange={(e) => setFiltroFornecedor(e.target.value)}
        />

        <TextField
          label="Código"
          variant="outlined"
          size="small"
          value={filtroCodigo}
          onChange={(e) => setFiltroCodigo(e.target.value)}
        />

        <TextField
          label="Data Início (DD/MM/AAAA)"
          variant="outlined"
          size="small"
          value={filtroDataInicio}
          onChange={(e) => setFiltroDataInicio(e.target.value)}
        />

        <TextField
          label="Data Fim (DD/MM/AAAA)"
          variant="outlined"
          size="small"
          value={filtroDataFim}
          onChange={(e) => setFiltroDataFim(e.target.value)}
        />

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>TES</InputLabel>
          <Select
            multiple
            value={filtroTes}
            onChange={handleTesChange}
            label="TES"
          >
            {uniqueTes.map((tes) => (
              <MenuItem key={tes} value={tes}>
                {tes}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Tabela de NFE – ICMS – DEVOLUÇÃO */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer
          component={Paper}
          sx={{
            width: "70%",
            marginTop: 3,
            borderRadius: 2,
            boxShadow: 3,
          }}
        >
          <Table>
            <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
              <TableRow>
                <TableCell>
                  <strong>Fornecedor</strong>
                </TableCell>
                <TableCell>
                  <strong>Código</strong>
                </TableCell>
                <TableCell>
                  <strong>Descrição</strong>
                </TableCell>
                <TableCell>
                  <strong>Desconto</strong>
                </TableCell>
                <TableCell>
                  <strong>Total</strong>
                </TableCell>
                <TableCell>
                  <strong>TES</strong>
                </TableCell>
                <TableCell>
                  <strong>Valor ICMS</strong>
                </TableCell>
                <TableCell>
                  <strong>Percentual ICMS</strong>
                </TableCell>
                <TableCell>
                  <strong>Documento</strong>
                </TableCell>
                <TableCell>
                  <strong>Data</strong>
                </TableCell>
                <TableCell>
                  <strong>Base ICMS</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dadosFiltrados
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.fornecedor}</TableCell>
                    <TableCell>{row.cod}</TableCell>
                    <TableCell>{row.descricao}</TableCell>
                    <TableCell>{formatarMoeda(row.desconto)}</TableCell>
                    <TableCell
                      sx={{
                        backgroundColor:
                          row.total !== row.baseicm ? "#ffebee" : "transparent",
                      }}
                    >
                      {formatarMoeda(row.total)}
                    </TableCell>
                    <TableCell>{row.tes}</TableCell>
                    <TableCell>{formatarMoeda(row.valicm)}</TableCell>
                    <TableCell>
                      <Chip
                        label={formatarPercentual(row.picm)}
                        sx={{
                          backgroundColor:
                            Number(row.picm) !== 19 ? "#ff1744" : "#4caf50",
                          color: "#fff",
                          fontWeight: "bold",
                          padding: "5px",
                          borderRadius: "5px",
                        }}
                      />
                    </TableCell>
                    <TableCell>{row.doc}</TableCell>
                    <TableCell>{formatarData(row.dtdigit)}</TableCell>
                    <TableCell
                      sx={{
                        backgroundColor:
                          row.total !== row.baseicm ? "#ffebee" : "transparent",
                      }}
                    >
                      {formatarMoeda(row.baseicm)}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[10, 20, 50]}
            component="div"
            count={dadosFiltrados.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TableContainer>
      )}
    </Box>
  );
};

export default Tabela;
