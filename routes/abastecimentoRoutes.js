// C:\Sistema\ocorrencia\routes\abastecimentoRoutes.js
const express = require("express");

// Exportamos uma função que configura as rotas, recebendo as dependências
module.exports = (dbOcorrencias, mssqlPool) => {
  const router = express.Router();

  // O require agora CHAMA o módulo do controller, que retorna as funções.
  const { getEstoqueAtual, updateEstoquePadrao } =
    require("../controllers/abastecimentoController")(dbOcorrencias, mssqlPool);

  // Rota GET existente
  router.get("/estoque-sugestao", getEstoqueAtual);

  // 🚨 ROTA POST CORRIGIDA: Adiciona a rota de salvamento /estoque-padrao
  router.post("/estoque-padrao", updateEstoquePadrao);

  return router;
};
