import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

const OcorrenciaTable = ({ ocorrencias }) => {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Nº</TableCell>
            <TableCell>Remetente</TableCell>
            <TableCell>Data</TableCell>
            <TableCell>Cliente</TableCell>
            <TableCell>Descrição</TableCell>
            <TableCell>Valor</TableCell>
            <TableCell>Tipo</TableCell>
            <TableCell>Motivo</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Ação a Ser Tomada</TableCell>
            <TableCell>Data Tratativa</TableCell>
            <TableCell>Bilhete</TableCell>
            <TableCell>Motorista</TableCell>
            <TableCell>Conferente</TableCell>
            <TableCell>Ajudante</TableCell>
            <TableCell>Vendedor</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {ocorrencias.map((ocorrencia, index) => (
            <TableRow key={index}>
              <TableCell>{ocorrencia.numero}</TableCell>
              <TableCell>{ocorrencia.remetente}</TableCell>
              <TableCell>{ocorrencia.data}</TableCell>
              <TableCell>{ocorrencia.cliente}</TableCell>
              <TableCell>{ocorrencia.descricao}</TableCell>
              <TableCell>{ocorrencia.valor}</TableCell>
              <TableCell>{ocorrencia.tipo}</TableCell>
              <TableCell>{ocorrencia.motivo}</TableCell>
              <TableCell>{ocorrencia.status}</TableCell>
              <TableCell>{ocorrencia.acao}</TableCell>
              <TableCell>{ocorrencia.dataTratativa}</TableCell>
              <TableCell>{ocorrencia.statusInterno}</TableCell>
              <TableCell>{ocorrencia.bilhete}</TableCell>
              <TableCell>{ocorrencia.motorista}</TableCell>
              <TableCell>{ocorrencia.conferente}</TableCell>
              <TableCell>{ocorrencia.ajudante}</TableCell>
              <TableCell>{ocorrencia.vendedor}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default OcorrenciaTable;
