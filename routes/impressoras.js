const express = require("express");
const router = express.Router();
const dbOcorrencias = require("../db"); // 🔥 ajusta conforme seu arquivo de conexão

// ✔️ Listar todas as impressoras
router.get("/impressoras", async (req, res) => {
  try {
    const [rows] = await dbOcorrencias
      .promise()
      .query("SELECT * FROM impressoras WHERE ativo = 1");
    res.json(rows);
  } catch (err) {
    console.error("Erro ao buscar impressoras:", err);
    res.status(500).send("Erro ao buscar impressoras");
  }
});

// ✔️ Buscar impressora por local
router.get("/impressoras/:local", async (req, res) => {
  const { local } = req.params;
  try {
    const [rows] = await dbOcorrencias
      .promise()
      .query(
        "SELECT * FROM impressoras WHERE local = ? AND ativo = 1 LIMIT 1",
        [local]
      );
    res.json(rows[0] || {});
  } catch (err) {
    console.error("Erro ao buscar impressora:", err);
    res.status(500).send("Erro ao buscar impressora");
  }
});

// ✔️ Adicionar impressora
router.post("/impressoras", async (req, res) => {
  const { local, ip, nome_impressora } = req.body;

  if (!local || !ip || !nome_impressora) {
    return res.status(400).send("Dados incompletos.");
  }

  try {
    await dbOcorrencias
      .promise()
      .query(
        "INSERT INTO impressoras (local, ip, nome_impressora) VALUES (?, ?, ?)",
        [local, ip, nome_impressora]
      );
    res.send("Impressora adicionada com sucesso");
  } catch (err) {
    console.error("Erro ao adicionar impressora:", err);
    res.status(500).send("Erro ao adicionar impressora");
  }
});

// ✔️ Editar impressora
router.put("/impressoras/:id", async (req, res) => {
  const { id } = req.params;
  const { local, ip, nome_impressora } = req.body;

  if (!local || !ip || !nome_impressora) {
    return res.status(400).send("Dados incompletos.");
  }

  try {
    await dbOcorrencias
      .promise()
      .query(
        "UPDATE impressoras SET local = ?, ip = ?, nome_impressora = ? WHERE id = ?",
        [local, ip, nome_impressora, id]
      );
    res.send("Impressora atualizada com sucesso");
  } catch (err) {
    console.error("Erro ao atualizar impressora:", err);
    res.status(500).send("Erro ao atualizar impressora");
  }
});

// ✔️ Deletar impressora
router.delete("/impressoras/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await dbOcorrencias
      .promise()
      .query("DELETE FROM impressoras WHERE id = ?", [id]);
    res.send("Impressora removida com sucesso");
  } catch (err) {
    console.error("Erro ao remover impressora:", err);
    res.status(500).send("Erro ao remover impressora");
  }
});

module.exports = router;
