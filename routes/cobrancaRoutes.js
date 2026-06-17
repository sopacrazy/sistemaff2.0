const express = require("express");
const { enviarMensagemWhatsApp } = require("../services/whatsappSender");

// Templates mockados — substituir por busca no banco ou na Meta quando aprovado.
// Variáveis disponíveis: {nome}, {valor}, {titulos}
// Templates — variáveis disponíveis: {nome}, {titulos}
// {titulos} lista cada título com número, valor e vencimento individualmente (sem somar)
const TEMPLATES = [
  {
    id: "padrao",
    nome: "Cobrança Padrão",
    mensagem:
      "Olá, *{nome}*! Identificamos os seguintes títulos em aberto:\n\n{titulos}\n\nPor favor, entre em contato para regularizar sua situação. Agradecemos sua atenção!",
  },
  {
    id: "amigavel",
    nome: "Lembrete Amigável",
    mensagem:
      "Oi, *{nome}*! Passando para te lembrar dos seguintes valores pendentes:\n\n{titulos}\n\nCaso já tenha efetuado o pagamento, por favor desconsidere esta mensagem. Qualquer dúvida, estamos à disposição!",
  },
  {
    id: "urgente",
    nome: "Última Notificação",
    mensagem:
      "*{nome}*, aviso importante sobre seus títulos em aberto:\n\n{titulos}\n\nPara evitar restrições em sua conta, solicite a regularização o quanto antes. Entre em contato conosco imediatamente.",
  },
];

function substituirVariaveis(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

module.exports = (dbOcorrencias) => {
  const router = express.Router();
  const db = () => dbOcorrencias.promise();

  // Garante que a coluna data_previsao existe (idempotente)
  db().query(`ALTER TABLE cobranca_kanban ADD COLUMN data_previsao DATE NULL DEFAULT NULL`)
    .catch(() => {}); // Ignora erro 1060 se a coluna já existe

  // ── GET /api/cobranca/templates ─────────────────────────────────────────
  router.get("/templates", (req, res) => {
    res.json(TEMPLATES);
  });

  // ── GET /api/cobranca/historico/:cliente_codigo ──────────────────────────
  router.get("/historico/:cliente_codigo", async (req, res) => {
    const { cliente_codigo } = req.params;
    try {
      const [cobrancas] = await db().query(
        `SELECT
           c.id,
           c.cliente_codigo,
           c.cliente_nome,
           c.titulo_numero,
           c.template_usado,
           c.valor,
           c.data_envio,
           c.enviado_por,
           c.status_entrega,
           c.status_resposta
         FROM cobrancas c
         WHERE c.cliente_codigo = ?
         ORDER BY c.data_envio DESC`,
        [cliente_codigo]
      );

      const [mensagens] = await db().query(
        `SELECT
           m.id,
           m.cliente_codigo,
           m.direcao,
           m.conteudo,
           m.criado_em,
           m.cobranca_id
         FROM mensagens_cobranca m
         WHERE m.cliente_codigo = ?
         ORDER BY m.criado_em ASC`,
        [cliente_codigo]
      );

      const [conversa] = await db().query(
        `SELECT telefone, ultima_interacao
         FROM conversas_whatsapp
         WHERE cliente_codigo = ?`,
        [cliente_codigo]
      );

      res.json({
        cobrancas,
        mensagens,
        conversa: conversa[0] || null,
      });
    } catch (err) {
      console.error("[cobrancaRoutes] GET historico:", err);
      res.status(500).json({ erro: "Falha ao buscar histórico." });
    }
  });

  // ── GET /api/cobranca/lista-enviadas ─────────────────────────────────────
  // Retorna a última cobrança por cliente + total de cobranças feitas
  router.get("/lista-enviadas", async (req, res) => {
    try {
      const [rows] = await db().query(
        `SELECT
           c.cliente_codigo,
           c.cliente_nome,
           c.data_envio,
           c.enviado_por,
           c.status_entrega,
           c.status_resposta,
           c.valor,
           cnt.total_cobrancas
         FROM cobrancas c
         INNER JOIN (
           SELECT cliente_codigo, MAX(data_envio) AS ultima
           FROM cobrancas
           GROUP BY cliente_codigo
         ) ult ON c.cliente_codigo = ult.cliente_codigo AND c.data_envio = ult.ultima
         LEFT JOIN (
           SELECT cliente_codigo, COUNT(*) AS total_cobrancas
           FROM cobrancas
           GROUP BY cliente_codigo
         ) cnt ON c.cliente_codigo = cnt.cliente_codigo
         ORDER BY c.data_envio DESC`
      );
      res.json(rows);
    } catch (err) {
      console.error("[cobrancaRoutes] GET lista-enviadas:", err);
      res.status(500).json({ erro: "Falha ao buscar lista de enviadas." });
    }
  });

  // ── POST /api/cobranca/enviar ────────────────────────────────────────────
  router.post("/enviar", async (req, res) => {
    const {
      cliente_codigo,
      cliente_nome,
      titulos_selecionados = [],   // [{ numero, valor, vencimento }]
      template_id,
      valor,
      telefone = null,
    } = req.body || {};

    const enviado_por = req.user?.nome || req.user?.username || "sistema";

    if (!cliente_codigo || !cliente_nome || !template_id || valor == null) {
      return res.status(400).json({ erro: "Campos obrigatórios: cliente_codigo, cliente_nome, template_id, valor." });
    }

    const template = TEMPLATES.find((t) => t.id === template_id);
    if (!template) {
      return res.status(400).json({ erro: "Template não encontrado." });
    }

    const valorFormatado = Number(valor).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    // Monta lista de títulos para a variável {titulos} — cada um com número e valor individual (sem somar)
    const listaTexto = titulos_selecionados.length > 0
      ? titulos_selecionados
          .map((t) => `• ${t.numero}  →  R$ ${Number(t.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}  |  venc: ${t.vencimento}`)
          .join("\n")
      : "(sem títulos específicos)";

    // Número(s) dos títulos para armazenar em banco (comma-separated)
    const titulo_numero = titulos_selecionados.length > 0
      ? titulos_selecionados.map((t) => t.numero).join(", ")
      : null;

    const mensagemFinal = substituirVariaveis(template.mensagem, {
      nome: cliente_nome,
      valor: valorFormatado,
      titulos: listaTexto,
    });

    try {
      // 1. Chama o serviço de envio (mock)
      const resultado = await enviarMensagemWhatsApp({
        telefone: telefone || "sem_telefone",
        clienteNome: cliente_nome,
        templateNome: template.nome,
        mensagem: mensagemFinal,
        valor: Number(valor),
      });

      if (!resultado.sucesso) {
        return res.status(502).json({ erro: resultado.erro || "Falha no envio." });
      }

      // 2. Salva em cobrancas
      const [ins] = await db().query(
        `INSERT INTO cobrancas
           (cliente_codigo, cliente_nome, titulo_numero, template_usado, valor, enviado_por, status_entrega, status_resposta)
         VALUES (?, ?, ?, ?, ?, ?, 'enviado', 'sem_resposta')`,
        [cliente_codigo, cliente_nome, titulo_numero, template.nome, Number(valor), enviado_por]  // titulo_numero já é a string "BIL001, BIL002..."
      );
      const cobrancaId = ins.insertId;

      // 3. Salva em mensagens_cobranca
      await db().query(
        `INSERT INTO mensagens_cobranca (cliente_codigo, direcao, conteudo, cobranca_id)
         VALUES (?, 'enviada', ?, ?)`,
        [cliente_codigo, mensagemFinal, cobrancaId]
      );

      // 4. Upsert em conversas_whatsapp
      await db().query(
        `INSERT INTO conversas_whatsapp (cliente_codigo, telefone, ultima_interacao)
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE telefone = VALUES(telefone), ultima_interacao = NOW()`,
        [cliente_codigo, telefone || null]
      );

      // 5. Upsert no kanban — move automaticamente para "cobrado" ao enviar
      await db().query(
        `INSERT INTO cobranca_kanban (cliente_codigo, cliente_nome, coluna, valor_divida, ultima_cobranca, atualizado_por)
         VALUES (?, ?, 'cobrado', ?, NOW(), ?)
         ON DUPLICATE KEY UPDATE
           ultima_cobranca = NOW(),
           valor_divida = VALUES(valor_divida),
           atualizado_por = VALUES(atualizado_por),
           coluna = IF(coluna IN ('pago'), coluna, 'cobrado')`,
        [cliente_codigo, cliente_nome, Number(valor), enviado_por]
      );

      res.json({
        sucesso: true,
        cobranca_id: cobrancaId,
        message_id: resultado.messageId,
        mensagem_enviada: mensagemFinal,
        data_envio: new Date().toISOString(),
      });
    } catch (err) {
      console.error("[cobrancaRoutes] POST enviar:", err);
      res.status(500).json({ erro: "Falha ao registrar cobrança." });
    }
  });

  // ── GET /api/cobranca/kanban ─────────────────────────────────────────────
  // Retorna todos os cards do kanban (exceto "pendente" que vem do Protheus)
  router.get("/kanban", async (req, res) => {
    try {
      // Auto "sem_retorno": cobrado há >24h sem resposta
      await db().query(`
        UPDATE cobranca_kanban k
        SET k.coluna = 'sem_retorno', k.atualizado_em = NOW()
        WHERE k.coluna = 'cobrado'
          AND k.ultima_cobranca < NOW() - INTERVAL 24 HOUR
          AND NOT EXISTS (
            SELECT 1 FROM mensagens_cobranca m
            WHERE m.cliente_codigo = k.cliente_codigo
              AND m.direcao = 'recebida'
              AND m.criado_em > k.ultima_cobranca
          )
      `);

      // Auto "sem_retorno": data de previsão expirou sem pagamento (estava em negociação)
      await db().query(`
        UPDATE cobranca_kanban
        SET coluna = 'sem_retorno', atualizado_em = NOW()
        WHERE coluna = 'negociando'
          AND data_previsao IS NOT NULL
          AND data_previsao < CURDATE()
      `);

      const [rows] = await db().query(
        `SELECT
           k.*,
           COUNT(c.id) AS total_cobrancas
         FROM cobranca_kanban k
         LEFT JOIN cobrancas c ON c.cliente_codigo = k.cliente_codigo
         GROUP BY k.cliente_codigo
         ORDER BY k.ultima_cobranca DESC`
      );
      res.json(rows);
    } catch (err) {
      console.error("[cobrancaRoutes] GET kanban:", err);
      res.status(500).json({ erro: "Falha ao buscar kanban." });
    }
  });

  // ── PUT /api/cobranca/kanban/:cliente_codigo ─────────────────────────────
  // Move um card para outra coluna
  router.put("/kanban/:cliente_codigo", async (req, res) => {
    const { cliente_codigo } = req.params;
    const { coluna, observacao, cliente_nome, valor_divida, vendedor } = req.body || {};
    const atualizado_por = req.user?.nome || req.user?.username || "sistema";

    const colunas = ["cobrado", "negociando", "pago", "sem_retorno"];
    if (!colunas.includes(coluna)) {
      return res.status(400).json({ erro: "Coluna inválida." });
    }

    try {
      await db().query(
        `INSERT INTO cobranca_kanban
           (cliente_codigo, cliente_nome, coluna, valor_divida, vendedor, atualizado_por)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           coluna = VALUES(coluna),
           atualizado_por = VALUES(atualizado_por),
           atualizado_em = NOW()`,
        [cliente_codigo, cliente_nome || cliente_codigo, coluna, Number(valor_divida || 0), vendedor || null, atualizado_por]
      );

      if (observacao !== undefined) {
        await db().query(
          `UPDATE cobranca_kanban SET observacao = ? WHERE cliente_codigo = ?`,
          [observacao, cliente_codigo]
        );
      }

      res.json({ ok: true });
    } catch (err) {
      console.error("[cobrancaRoutes] PUT kanban:", err);
      res.status(500).json({ erro: "Falha ao mover card." });
    }
  });

  // ── DELETE /api/cobranca/kanban/:cliente_codigo ─────────────────────────
  // Remove tudo: kanban, cobranças, mensagens e conversa — cliente volta para Pendente zerado
  router.delete("/kanban/:cliente_codigo", async (req, res) => {
    const { cliente_codigo } = req.params;
    try {
      await db().query(`DELETE FROM mensagens_cobranca  WHERE cliente_codigo = ?`, [cliente_codigo]);
      await db().query(`DELETE FROM cobrancas           WHERE cliente_codigo = ?`, [cliente_codigo]);
      await db().query(`DELETE FROM conversas_whatsapp  WHERE cliente_codigo = ?`, [cliente_codigo]);
      await db().query(`DELETE FROM cobranca_kanban     WHERE cliente_codigo = ?`, [cliente_codigo]);
      res.json({ ok: true });
    } catch (err) {
      console.error("[cobrancaRoutes] DELETE kanban:", err);
      res.status(500).json({ erro: "Falha ao remover card." });
    }
  });

  // ── PATCH /api/cobranca/kanban/:cliente_codigo/previsao ─────────────────
  // Define data de previsão de pagamento e move para "negociando"
  router.patch("/kanban/:cliente_codigo/previsao", async (req, res) => {
    const { cliente_codigo } = req.params;
    const { data_previsao } = req.body || {};
    const atualizado_por = req.user?.nome || req.user?.username || "sistema";
    try {
      if (data_previsao) {
        // Seta data e move para negociando (exceto se já "pago")
        await db().query(
          `UPDATE cobranca_kanban
           SET data_previsao = ?, coluna = IF(coluna = 'pago', 'pago', 'negociando'),
               atualizado_em = NOW(), atualizado_por = ?
           WHERE cliente_codigo = ?`,
          [data_previsao, atualizado_por, cliente_codigo]
        );
      } else {
        // Limpa a data sem mover de coluna
        await db().query(
          `UPDATE cobranca_kanban SET data_previsao = NULL, atualizado_em = NOW() WHERE cliente_codigo = ?`,
          [cliente_codigo]
        );
      }
      res.json({ ok: true });
    } catch (err) {
      console.error("[cobrancaRoutes] PATCH previsao:", err);
      res.status(500).json({ erro: "Falha ao salvar previsão." });
    }
  });

  // ── PATCH /api/cobranca/kanban/:cliente_codigo/obs ───────────────────────
  // Atualiza observação de um card sem mover de coluna
  router.patch("/kanban/:cliente_codigo/obs", async (req, res) => {
    const { cliente_codigo } = req.params;
    const { observacao } = req.body || {};
    try {
      await db().query(
        `UPDATE cobranca_kanban SET observacao = ?, atualizado_em = NOW() WHERE cliente_codigo = ?`,
        [observacao ?? null, cliente_codigo]
      );
      res.json({ ok: true });
    } catch (err) {
      console.error("[cobrancaRoutes] PATCH kanban obs:", err);
      res.status(500).json({ erro: "Falha ao salvar observação." });
    }
  });

  return router;
};
