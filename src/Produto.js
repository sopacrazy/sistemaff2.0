import React from 'react';
import { TextField, Grid, IconButton } from '@mui/material';
import { RemoveCircle } from '@mui/icons-material';

const Produto = ({ index, produto, handleProdutoChange, handleRemoveProduto, canRemove }) => {
  return (
    <Grid container spacing={2} alignItems="center">
      <Grid item xs={6}>
        <TextField
          label={`Produto ${index + 1}`}
          name={`produto${index + 1}`}
          value={produto.nome || ''}
          onChange={(e) => handleProdutoChange(e, index, 'nome', e.target.value)}
          fullWidth
          required
        />
      </Grid>
      <Grid item xs={2}>
        <TextField
          label={`Quantidade ${index + 1}`}
          name={`quantidade${index + 1}`}
          value={produto.quantidade || ''}
          onChange={(e) => handleProdutoChange(e, index, 'quantidade', e.target.value)}
          type="number"
          fullWidth
          required
        />
      </Grid>
      <Grid item xs={2}>
        <TextField
          label={`Unidade ${index + 1}`}
          name={`unidade${index + 1}`}
          value={produto.unidade || ''}
          onChange={(e) => handleProdutoChange(e, index, 'unidade', e.target.value)}
          fullWidth
          required
        />
      </Grid>
      <Grid item xs={2}>
        <TextField
          label={`Valor ${index + 1}`}
          name={`valor${index + 1}`}
          value={produto.valor || ''}
          onChange={(e) => handleProdutoChange(e, index, 'valor', e.target.value)}
          type="number"
          fullWidth
          required
        />
      </Grid>
      {canRemove && (
        <Grid item xs={1}>
          <IconButton onClick={() => handleRemoveProduto(index)}>
            <RemoveCircle />
          </IconButton>
        </Grid>
      )}
    </Grid>
  );
};

export default Produto;
