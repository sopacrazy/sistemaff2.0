const express = require("express");
const router = express.Router();

module.exports = (db) => {
  // 🔹 POST: salvar permissões
  router.post("/salvar", (req, res) => {
    const permissoes = req.body.permissoes;

    const queries = permissoes.map(({ user_id, rotina, permitido }) => {
      // console.log(`Saving: User ${user_id}, Rotina ${rotina}, Permitido ${permitido}`); // Debug log
      return new Promise((resolve, reject) => {
        const sql = `
          INSERT INTO permissoes_usuario (user_id, rotina, permitido)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE permitido = ?
        `;
        db.query(sql, [user_id, rotina, permitido, permitido], (err) => {
          if (err) {
            console.error(`Erro ao salvar permissão (User: ${user_id}, Rotina: ${rotina}):`, err.message);
            reject(err);
          }
          else resolve();
        });
      });
    });

    Promise.all(queries)
      .then(() => res.json({ success: true }))
      .catch((err) => {
        console.error("Erro no Promise.all de salvar permissões:", err);
        res.status(500).json({ error: "Erro ao salvar permissões: " + err.message });
      });
  });

  router.get("/usuario/:userId", (req, res) => {
    const userId = req.params.userId;
    const sql =
      "SELECT rotina, permitido FROM permissoes_usuario WHERE user_id = ?";
    db.query(sql, [userId], (err, results) => {
      if (err) {
        console.error("Erro ao buscar permissões por usuário:", err);
        return res.status(500).json({ error: "Erro interno" });
      }
      const permissoes = {};
      results.forEach(({ rotina, permitido }) => {
        permissoes[rotina] = !!permitido;
      });
      res.json(permissoes);
    });
  });

  // 🔹 GET: buscar permissões salvas
  router.get("/", (req, res) => {
    const sql = "SELECT user_id, rotina, permitido FROM permissoes_usuario";
    db.query(sql, (err, results) => {
      if (err) {
        console.error("Erro ao buscar permissões:", err);
        return res.status(500).json({ error: "Erro ao buscar permissões" });
      }
      res.json(results);
    });
  });

  return router;
};
