const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");

module.exports = (db) => {
  // GET /usuarios
  router.get("/", (req, res) => {
    // Including 'origem', 'tipo', 'theme', 'podeTrocarLocal', 'email', and 'setor'
    const query = "SELECT id, username, origem, tipo, theme, podeTrocarLocal, email, setor FROM users";
    db.query(query, (err, results) => {
      if (err) {
        console.error("Erro ao buscar usuários:", err);
        return res.status(500).json({ error: "Erro interno" });
      }
      res.json(results);
    });
  });

  // GET /usuarios/me (Get current user details including theme) - Requires username passed in query or header usually, but here we might rely on ID if available context. 
  // Simplified for now: specific route for theme fetching by username
  router.get("/tema/:username", (req, res) => {
    const { username } = req.params;
    const query = "SELECT theme FROM users WHERE username = ?";
    db.query(query, [username], (err, results) => {
      if (err) return res.status(500).json({ error: "Erro interno" });
      if (results.length === 0) return res.status(404).json({ error: "Usuário não encontrado" });
      res.json({ theme: results[0].theme || 'light' });
    });
  });

  // PUT /usuarios/:username/tema
  router.put("/:username/tema", (req, res) => {
    const { username } = req.params;
    const { theme } = req.body;
    if (!['light', 'dark'].includes(theme)) return res.status(400).json({ error: "Tema inválido" });

    const query = "UPDATE users SET theme = ? WHERE username = ?";
    db.query(query, [theme, username], (err, result) => {
      if (err) {
        console.error("Erro ao atualizar tema:", err);
        return res.status(500).json({ error: "Erro ao atualizar tema" });
      }
      res.json({ message: "Tema atualizado com sucesso" });
    });
  });

  // PUT /usuarios/:username/local
  router.put("/:username/local", (req, res) => {
    const { username } = req.params;
    const { local, adminEdit } = req.body; // adminEdit indica que é um admin editando outro usuário

    if (!local) return res.status(400).json({ error: "Local inválido" });

    // Se for edição por admin (adminEdit = true), não verifica podeTrocarLocal
    if (adminEdit) {
      const query = "UPDATE users SET origem = ? WHERE username = ?";
      db.query(query, [local, username], (err, result) => {
        if (err) {
          console.error("Erro ao atualizar local:", err);
          return res.status(500).json({ error: "Erro ao atualizar local" });
        }
        res.json({ message: "Local atualizado com sucesso" });
      });
      return;
    }

    // Se não for admin editando, verifica se o usuário pode trocar seu próprio local
    const checkQuery = "SELECT podeTrocarLocal FROM users WHERE username = ?";
    db.query(checkQuery, [username], (err, results) => {
      if (err) return res.status(500).json({ error: "Erro interno" });
      if (results.length === 0) return res.status(404).json({ error: "Usuário não encontrado" });

      if (results[0].podeTrocarLocal != 1) { // Weak comparison for char/int flexibility
        return res.status(403).json({ error: "Usuário não tem permissão para trocar de local" });
      }

      const query = "UPDATE users SET origem = ? WHERE username = ?";
      db.query(query, [local, username], (err, result) => {
        if (err) {
          console.error("Erro ao atualizar local:", err);
          return res.status(500).json({ error: "Erro ao atualizar local" });
        }
        res.json({ message: "Local atualizado com sucesso" });
      });
    });
  });
  
  // PUT /usuarios/:username/setor
  router.put("/:username/setor", (req, res) => {
    const { username } = req.params;
    const { novoSetor } = req.body;

    const query = "UPDATE users SET setor = ? WHERE username = ?";
    db.query(query, [novoSetor || null, username], (err, result) => {
      if (err) {
        console.error("Erro ao atualizar setor:", err);
        return res.status(500).json({ error: "Erro ao atualizar setor" });
      }
      res.json({ message: "Setor atualizado com sucesso" });
    });
  });

  // POST /usuarios/adicionar
  router.post("/adicionar", async (req, res) => {
    const { username, password, origem, email, setor } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Dados inválidos" });

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const query = "INSERT INTO users (username, password, origem, email, setor, theme) VALUES (?, ?, ?, ?, ?, 'light')";
      db.query(query, [username, hashedPassword, origem || '01', email || null, setor || null], (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
            return res.status(400).json({ error: "Este nome de usuário já está em uso." });
          }
          console.error("Erro ao adicionar usuário:", err);
          return res.status(500).json({ error: "Erro ao criar usuário" });
        }
        res.json({ message: "Usuário criado com sucesso", id: result.insertId });
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro interno" });
    }
  });

  // PUT /usuarios/:id/senha
  router.put("/:id/senha", async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: "Senha inválida" });

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const query = "UPDATE users SET password = ? WHERE id = ?";
      db.query(query, [hashedPassword, id], (err, result) => {
        if (err) {
          console.error("Erro ao atualizar senha:", err);
          return res.status(500).json({ error: "Erro ao atualizar senha" });
        }
        res.json({ message: "Senha atualizada com sucesso" });
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro interno" });
    }
  });

  // PUT /usuarios/:username/alterar-senha (Alterar senha própria com validação)
  router.put("/:username/alterar-senha", async (req, res) => {
    const { username } = req.params;
    const { senhaAtual, novaSenha } = req.body;

    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({ error: "Senha atual e nova senha são obrigatórias" });
    }

    if (novaSenha.length < 4) {
      return res.status(400).json({ error: "A nova senha deve ter pelo menos 4 caracteres" });
    }

    try {
      // Busca o usuário pelo username
      const [users] = await db.promise().query("SELECT id, password FROM users WHERE username = ?", [username]);

      if (users.length === 0) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const user = users[0];

      // Valida a senha atual
      const senhaAtualValida = await bcrypt.compare(senhaAtual, user.password);
      if (!senhaAtualValida) {
        return res.status(401).json({ error: "Senha atual incorreta" });
      }

      // Hash da nova senha
      const hashedPassword = await bcrypt.hash(novaSenha, 10);

      // Atualiza a senha
      await db.promise().query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, user.id]);

      res.json({ message: "Senha alterada com sucesso" });
    } catch (e) {
      console.error("Erro ao alterar senha:", e);
      res.status(500).json({ error: "Erro interno ao alterar senha" });
    }
  });

  // GET /usuarios/origem/:username (Fix para NovaDevolucao.js)
  router.get("/origem/:username", (req, res) => {
    const { username } = req.params;
    // Se o username for "sistema" e não existir no banco, retornamos um default ou buscamos
    // Mas geralmente o usuário "sistema" deve existir.
    const query = "SELECT origem FROM users WHERE username = ?";
    db.query(query, [username], (err, results) => {
      if (err) {
        console.error("Erro ao buscar origem:", err);
        return res.status(500).json({ error: "Erro interno" });
      }
      if (results.length === 0) {
        // Fallback se usuário não existir (ex: dev environment)
        return res.json({ origem: "01" });
      }
      res.json({ origem: results[0].origem || "01" });
    });
  });

  return router;
};
