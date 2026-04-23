module.exports = (db) => {
  return (rotina) => {
    return (req, res, next) => {
      const userId = req.user?.id;
      const username = req.user?.username;
      const userTipo = req.user?.tipo;
      
      console.log(`[checkPermission] Verificando permissão para rotina: ${rotina}`, {
        userId,
        username,
        userTipo,
        hasUser: !!req.user,
        fullUser: req.user
      });

      if (!userId) {
        console.warn(`[checkPermission] Usuário não autenticado para rotina: ${rotina}`);
        return res.status(401).json({ error: "Não autenticado" });
      }

      // Função auxiliar para verificar permissão no banco
      const checkPermissionInDb = () => {
        const sql =
          "SELECT permitido FROM permissoes_usuario WHERE user_id = ? AND rotina = ?";
        db.query(sql, [userId, rotina], (err, results) => {
          if (err) {
            console.error(`[checkPermission] Erro ao verificar permissão para rotina ${rotina}:`, err);
            return res.status(500).json({ error: "Erro interno" });
          }

          const permitido = results[0]?.permitido;
          // Verifica se permitido é verdadeiro (aceita 1, true, "1", etc)
          const temPermissao = permitido === 1 || permitido === true || permitido === "1" || permitido === "true";

          console.log(`[checkPermission] Resultado da consulta para ${rotina}:`, {
            userId,
            rotina,
            found: results.length > 0,
            permitido: permitido,
            tipoPermitido: typeof permitido,
            temPermissao: temPermissao
          });

          if (results.length === 0 || !temPermissao) {
            console.warn(`[checkPermission] Acesso negado para usuário ${username} (ID: ${userId}) à rotina: ${rotina}`, {
              found: results.length > 0,
              permitido: permitido,
              tipoPermitido: typeof permitido
            });
            return res
              .status(403)
              .json({ 
                error: `Acesso negado à rotina: ${rotina}`,
                message: `Você não tem permissão para acessar ${rotina}. Entre em contato com o administrador.`
              });
          }

          console.log(`[checkPermission] Acesso autorizado para usuário ${username} (ID: ${userId}) à rotina: ${rotina}`);
          next(); // autorizado
        });
      };

      // Verifica se é admin ou gestor - permite acesso automático
      // Aceita "admin", "ADMIN", "Admin", "gestor", "GESTOR", etc
      const tipoLower = userTipo ? String(userTipo).toLowerCase().trim() : "";
      if (tipoLower === "admin" || tipoLower === "gestor") {
        console.log(`[checkPermission] Acesso automático concedido para ${userTipo} ${username} (ID: ${userId}) à rotina: ${rotina}`);
        return next();
      }

      // Fallback: Se não tiver tipo no JWT, verifica no banco
      if (!userTipo && username) {
        db.query("SELECT tipo FROM users WHERE id = ? OR username = ?", [userId, username], (err, tipoResults) => {
          if (!err && tipoResults.length > 0) {
            const tipoFromDb = String(tipoResults[0].tipo || "").toLowerCase().trim();
            if (tipoFromDb === "admin" || tipoFromDb === "gestor") {
              console.log(`[checkPermission] Acesso automático concedido (via DB) para ${tipoFromDb} ${username} (ID: ${userId}) à rotina: ${rotina}`);
              return next();
            }
          }
          // Continua com verificação de permissão normal
          checkPermissionInDb();
        });
        return; // Retorna aqui para não executar checkPermissionInDb duas vezes
      }

      // Executa verificação de permissão normal
      checkPermissionInDb();
    };
  };
};
