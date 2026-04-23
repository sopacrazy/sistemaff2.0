// ProdutoAutocomplete.js

import React from "react";
import { Grid, TextField, Autocomplete } from "@mui/material";
import { useProdutosComSaldo } from "../hooks/useProdutosComSaldo";
import { formatCodigo } from "../utils/formatCodigo";

const ProdutoAutocomplete = ({
  produto,
  index,
  origem,
  handleProdutoChange,
}) => {
  const { data: produtosQuery = [] } = useProdutosComSaldo(
    produto.descricao,
    origem
  );

  return (
    <>
      <Grid item xs={4}>
        <TextField
          label="Código do Produto"
          value={produto.codProduto}
          fullWidth
          InputProps={{ readOnly: true }}
          variant="filled"
          tabIndex={-1}
        />
      </Grid>

      <Grid item xs={5}>
        <Autocomplete
          freeSolo
          fullWidth
          options={produtosQuery}
          getOptionLabel={(option) =>
            typeof option === "string" ? option : option.descricao || ""
          }
          value={produto.descricao}
          onInputChange={(e, newInput, reason) => {
            handleProdutoChange(index, "descricao", newInput);
            if (reason === "input") {
              handleProdutoChange(index, "unidade", "");
              handleProdutoChange(index, "codProduto", "");
            }
          }}
          onChange={(_, newValue) => {
            if (typeof newValue === "object" && newValue) {
              handleProdutoChange(index, "descricao", newValue.descricao);
              handleProdutoChange(
                index,
                "codProduto",
                formatCodigo(newValue.codigo_produto)
              );
              handleProdutoChange(
                index,
                "unidade",
                newValue.primeira_unidade || ""
              );
              handleProdutoChange(
                index,
                "fatorConversao",
                newValue.fatorConversao || newValue.fator_conversao || 1
              );
              handleProdutoChange(
                index,
                "segundaUnidade",
                newValue.segunda_unidade || ""
              );
            }
          }}
          renderInput={(params) => (
            <TextField {...params} label="Descrição" required />
          )}
        />
      </Grid>

      <Grid item xs={3}>
        <TextField
          label={`Quantidade ${produto.unidade || ""}`}
          type="number"
          inputProps={{ min: 1 }}
          value={produto.qtd}
          onChange={(e) => handleProdutoChange(index, "qtd", e.target.value)}
          fullWidth
          required
        />
      </Grid>

      <Grid item xs={3} sx={{ display: "none" }}>
        <TextField
          label="Fator Conversão"
          value={produto.fatorConversao || ""}
          fullWidth
          disabled
        />
      </Grid>
      <Grid item xs={3} sx={{ display: "none" }}>
        <TextField
          label="2ª Unidade"
          value={produto.segundaUnidade || ""}
          fullWidth
          disabled
        />
      </Grid>
    </>
  );
};

export default ProdutoAutocomplete;
