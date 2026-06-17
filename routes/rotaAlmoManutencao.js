const express = require("express");

module.exports = (dbOcorrencias) => {
  const router = express.Router();

  // GET /api/almo-manutencao - Listar todas as solicitações de manutenção
  router.get("/", async (req, res) => {
    try {
      const [rows] = await dbOcorrencias.promise().query(
        "SELECT * FROM almo_manutencao ORDER BY data_solicitacao DESC"
      );
      res.json(rows);
    } catch (error) {
      console.error("Erro ao buscar solicitações de manutenção (almo_manutencao):", error);
      res.status(500).json({ error: "Erro ao buscar solicitações de manutenção" });
    }
  });

  // POST /api/almo-manutencao - Criar nova solicitação de manutenção
  router.post("/", async (req, res) => {
    try {
      const { tipo_manutencao, urgencia, local_setor, descricao, solicitante, status } = req.body;
      const query = `
        INSERT INTO almo_manutencao 
        (tipo_manutencao, urgencia, local_setor, descricao, solicitante, status, data_solicitacao)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
      `;
      const [result] = await dbOcorrencias.promise().query(query, [
        tipo_manutencao,
        urgencia,
        local_setor,
        descricao,
        solicitante,
        status || 'PENDENTE'
      ]);
      res.status(201).json({ id: result.insertId, message: "Manutenção solicitada com sucesso!" });
    } catch (error) {
      console.error("Erro ao salvar solicitação de manutenção (almo_manutencao):", error);
      res.status(500).json({ error: "Erro ao salvar solicitação de manutenção" });
    }
  });

  // PUT /api/almo-manutencao/:id - Atualizar/concluir solicitação de manutenção
  router.put("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { tipo_manutencao, urgencia, local_setor, descricao, solicitante, status, data_conclusao, observacao_encerramento } = req.body;
      
      let query = `
        UPDATE almo_manutencao 
        SET tipo_manutencao = ?, urgencia = ?, local_setor = ?, descricao = ?, solicitante = ?, status = ?
      `;
      const params = [tipo_manutencao, urgencia, local_setor, descricao, solicitante, status];

      if (status === 'CONCLUIDO' || status === 'RESOLVIDO') {
        query += `, data_conclusao = ?, observacao_encerramento = ?`;
        params.push(data_conclusao ? new Date(data_conclusao) : new Date(), observacao_encerramento);
      } else {
        query += `, data_conclusao = NULL, observacao_encerramento = NULL`;
      }

      query += ` WHERE id = ?`;
      params.push(id);

      await dbOcorrencias.promise().query(query, params);
      res.json({ message: "Solicitação de manutenção atualizada com sucesso!" });
    } catch (error) {
      console.error("Erro ao atualizar solicitação de manutenção (almo_manutencao):", error);
      res.status(500).json({ error: "Erro ao atualizar solicitação de manutenção" });
    }
  });

  // DELETE /api/almo-manutencao/:id - Remover solicitação de manutenção
  router.delete("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await dbOcorrencias.promise().query("DELETE FROM almo_manutencao WHERE id = ?", [id]);
      res.json({ message: "Solicitação de manutenção removida com sucesso!" });
    } catch (error) {
      console.error("Erro ao remover solicitação de manutenção (almo_manutencao):", error);
      res.status(500).json({ error: "Erro ao remover solicitação de manutenção" });
    }
  });

  return router;
};
