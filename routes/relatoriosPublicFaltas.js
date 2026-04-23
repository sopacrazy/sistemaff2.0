// routes/relatoriosPublicRoutes.js
const express = require("express");
const sql = require("mssql"); // MSSQL (Protheus)
const { gerarRelatorioFaltas } = require("./relatorioFaltas");

module.exports = (dbOcorrencias) => {
  const router = express.Router();
  const jsonParser = express.json();

  // ---------- util: YYYY-MM-DD -> YYYYMMDD ----------
  const toProtheusDate = (v) => {
    if (!v) return null;
    const s = String(v).trim();
    if (/^\d{8}$/.test(s)) return s;
    const d = new Date(s);
    if (isNaN(d)) return null;
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}${mm}${dd}`;
  };

  // Normalizador JS: mantém só dígitos
  const norm = (c) => String(c).replace(/\D/g, "");

  // Expressão SQL para normalizar o código (remover . - / e espaço)
  // REPLACE(REPLACE(REPLACE(REPLACE(col, '.', ''), '-', ''), ' ', ''), '/', '')
  const COD_NORMALIZADO_SQL =
    "REPLACE(REPLACE(REPLACE(REPLACE(Z5_CODPRO, '.', ''), '-', ''), ' ', ''), '/', '')";

  /**
   * Busca preços na SZ5140 por data e lista de códigos.
   * - Normaliza código no SQL e nos parâmetros (só dígitos)
   * - Considera D_E_L_E_T_ = '' ou ' '
   * - 1) data exata; 2) último <= data (por código)
   * Retorna Map<codigoNormalizado, preco>
   */
  async function buscarPrecosProtheusSZ5140(pool, dataISO, codigos) {
    const data = toProtheusDate(dataISO);
    if (!pool || !data || !Array.isArray(codigos) || !codigos.length) {
      return new Map();
    }

    const cods = Array.from(new Set(codigos.map(norm).filter(Boolean)));
    if (!cods.length) return new Map();

    // ---- 1) Data exata ----
    const inParams = cods.map((_, i) => `@c${i}`).join(",");
    const req1 = new sql.Request(pool);
    req1.input("data", sql.VarChar(8), data);
    cods.forEach((c, i) => req1.input(`c${i}`, sql.VarChar(30), c));

    const qExact = `
      ;WITH s AS (
        SELECT
          CODN = ${COD_NORMALIZADO_SQL},
          Z5_COMPRA
        FROM SZ5140 WITH (NOLOCK)
        WHERE (D_E_L_E_T_ = '' OR D_E_L_E_T_ = ' ')
          AND Z5_DATA = @data
      )
      SELECT CODN, MAX(Z5_COMPRA) AS preco
        FROM s
       WHERE CODN IN (${inParams})
       GROUP BY CODN
    `;
    const { recordset: rsExact } = await req1.query(qExact);
    const map = new Map(rsExact.map((r) => [norm(r.CODN), Number(r.preco)]));

    // ---- faltantes da data exata ----
    const missing = cods.filter((c) => !map.has(c));
    if (!missing.length) return map;

    // ---- 2) Fallback: último <= data ----
    const inParams2 = missing.map((_, i) => `@m${i}`).join(",");
    const req2 = new sql.Request(pool);
    req2.input("data", sql.VarChar(8), data);
    missing.forEach((c, i) => req2.input(`m${i}`, sql.VarChar(30), c));

    const qLTE = `
      ;WITH s AS (
        SELECT
          CODN = ${COD_NORMALIZADO_SQL},
          Z5_COMPRA,
          Z5_DATA
        FROM SZ5140 WITH (NOLOCK)
        WHERE (D_E_L_E_T_ = '' OR D_E_L_E_T_ = ' ')
          AND Z5_DATA <= @data
      ),
      r AS (
        SELECT CODN, Z5_COMPRA,
               ROW_NUMBER() OVER (PARTITION BY CODN ORDER BY Z5_DATA DESC) AS rn
          FROM s
         WHERE CODN IN (${inParams2})
      )
      SELECT CODN, Z5_COMPRA AS preco
        FROM r
       WHERE rn = 1
    `;
    const { recordset: rsLTE } = await req2.query(qLTE);
    rsLTE.forEach((r) => {
      const c = norm(r.CODN);
      if (!map.has(c)) map.set(c, Number(r.preco));
    });

    return map;
  }

  // ---------- validação simples para o PDF ----------
  async function validateFaltasReq(req) {
    const { data, local } = req.query;
    if (!data || !local) {
      return { status: 400, msg: "Parâmetros obrigatórios: data e local" };
    }
    return { status: 204, msg: "" };
  }

  // ---------- HEAD: checagem ----------
  router.head("/faltas/pdf", async (req, res) => {
    try {
      const v = await validateFaltasReq(req);
      return v.status === 204
        ? res.status(204).end()
        : res.status(v.status).end();
    } catch (err) {
      console.error("HEAD faltas/pdf:", err);
      return res.status(500).end();
    }
  });

  // ---------- GET: PDF ----------
  router.get("/faltas/pdf", async (req, res) => {
    try {
      const v = await validateFaltasReq(req);
      if (v.status !== 204) return res.status(v.status).send(v.msg);
      const { data, local, tipo = "padrao" } = req.query;
      console.log(`[ROTA /faltas/pdf] Recebido - Data: ${data}, Local: ${local}, Tipo: ${tipo}`);
      
      // Passa o pool MSSQL para a função de gerar relatório
      const poolMSSQL = req.app?.locals?.mssqlPool || null;
      await gerarRelatorioFaltas(
        dbOcorrencias,
        { data, local, tipo: String(tipo).toLowerCase(), poolMSSQL },
        res
      );
    } catch (err) {
      console.error("Erro ao gerar PDF público de faltas:", err);
      res.status(500).send("Erro ao gerar PDF");
    }
  });

  // ================== PREÇOS – FALTAS ==================

  // Lista itens com preco_compra vazio/zero na data/local
  router.get("/faltas/precos-pendentes", async (req, res) => {
    try {
      const { data, local } = req.query;
      if (!data || !local) {
        return res
          .status(400)
          .json({ error: "Parâmetros obrigatórios: data e local" });
      }
      const [rows] = await dbOcorrencias.promise().query(
        `SELECT cod_produto AS codigo, produto, unidade, falta,
                COALESCE(preco_compra, 0) AS preco_compra
           FROM faltas_fechamento
          WHERE data = ? AND local = ?
            AND (falta IS NOT NULL AND falta <> 0)
            AND (preco_compra IS NULL OR preco_compra = 0)
          ORDER BY produto`,
        [data, local]
      );
      res.json({ items: rows });
    } catch (err) {
      console.error("GET /faltas/precos-pendentes:", err);
      res.status(500).json({ error: "Erro ao listar pendências" });
    }
  });

  // Salva preços editados manualmente
  router.post("/faltas/precos", jsonParser, async (req, res) => {
    try {
      const { data, local, items } = req.body || {};
      if (!data || !local || !Array.isArray(items)) {
        return res
          .status(400)
          .json({ error: "Parâmetros obrigatórios: data, local e items[]" });
      }

      let updated = 0,
        failed = [];
      for (const it of items) {
        const codigo = it?.codigo;
        const preco = Number(it?.preco_compra);
        if (!codigo || !Number.isFinite(preco) || preco <= 0) {
          failed.push(codigo ?? null);
          continue;
        }
        const [r] = await dbOcorrencias.promise().query(
          `UPDATE faltas_fechamento
              SET preco_compra = ?
            WHERE data = ? AND local = ? AND cod_produto = ?`,
          [preco, data, local, codigo]
        );
        updated += r.affectedRows || 0;
      }
      res.json({ updated, failed });
    } catch (err) {
      console.error("POST /faltas/precos:", err);
      res.status(500).json({ error: "Erro ao salvar preços" });
    }
  });

  // Handler compartilhado do autofill (Protheus)
  async function autofillFromProtheusHandler(req, res) {
    try {
      const { data, local } = req.body || {};
      if (!data || !local) {
        return res
          .status(400)
          .json({ error: "Parâmetros obrigatórios: data e local" });
      }

      const pool = req.app.locals.mssqlPool;
      if (!pool) {
        return res
          .status(500)
          .json({ error: "Pool MSSQL (Protheus) indisponível" });
      }

      const [pend] = await dbOcorrencias.promise().query(
        `SELECT DISTINCT cod_produto AS codigo
           FROM faltas_fechamento
          WHERE data = ? AND local = ?
            AND (preco_compra IS NULL OR preco_compra = 0)`,
        [data, local]
      );
      if (!pend.length)
        return res.json({ updated: 0, totalPend: 0, foundOnSZ: 0 });

      const codigos = pend.map((p) => p.codigo);

      const mapa = await buscarPrecosProtheusSZ5140(pool, data, codigos);

      let updated = 0;
      const notFound = [];
      for (const cod of codigos) {
        const key = norm(cod);
        const preco = mapa.get(key);
        if (!preco || !(preco > 0)) {
          notFound.push(cod);
          continue;
        }
        const [u] = await dbOcorrencias.promise().query(
          `UPDATE faltas_fechamento
              SET preco_compra = ?
            WHERE data = ? AND local = ? AND cod_produto = ?
              AND (preco_compra IS NULL OR preco_compra = 0)`,
          [preco, data, local, cod]
        );
        updated += u.affectedRows || 0;
      }

      res.json({
        updated,
        totalPend: codigos.length,
        foundOnSZ: mapa.size,
        notFound: notFound.slice(0, 20),
      });
    } catch (err) {
      console.error("autofill-protheus:", err);
      res
        .status(500)
        .json({ error: "Erro no autopreenchimento pelo Protheus" });
    }
  }

  // 🔄 Autopreenche usando SZ5140 (mantém alias)
  router.post(
    "/faltas/precos/autofill-protheus",
    jsonParser,
    autofillFromProtheusHandler
  );
  router.post(
    "/faltas/precos/autofill",
    jsonParser,
    autofillFromProtheusHandler
  );

  return router;
};
