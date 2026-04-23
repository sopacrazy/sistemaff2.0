const express = require("express");
const router = express.Router();
const ExcelJS = require("exceljs");
const sql = require("mssql");
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const multer = require("multer");
require("dotenv").config();

const STORAGE_DIR =
  process.env.KANBAN_STORAGE_DIR || path.join(__dirname, "..", "uploads");

// garante que a pasta existe
//fs.mkdirSync(STORAGE_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, STORAGE_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^\w\-]+/g, "_")
      .slice(0, 50);
    const unique = Date.now() + "_" + Math.floor(Math.random() * 1e6);
    cb(null, `${unique}_${base}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    const ok =
      file.mimetype === "application/pdf" || file.mimetype.startsWith("image/");
    cb(ok ? null : new Error("Somente imagens ou PDF"), ok);
  },
});

let protheusPool = null;
async function getProtheusPool() {
  if (protheusPool && protheusPool.connected) return protheusPool;
  const cfg = {
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_SERVER,
    database: process.env.MSSQL_DATABASE,
    options: {
      encrypt: String(process.env.MSSQL_ENCRYPT || "false") === "true",
      trustServerCertificate: true,
    },
    pool: {
      max: Number(process.env.MSSQL_POOL_MAX || 10),
      min: Number(process.env.MSSQL_POOL_MIN || 0),
      idleTimeoutMillis: Number(process.env.MSSQL_POOL_IDLE_TIMEOUT || 30000),
    },
  };
  protheusPool = await new sql.ConnectionPool(cfg).connect();
  return protheusPool;
}

const onlyDigits = (s) => String(s || "").replace(/\D/g, "");
const padLeft = (s, size) => {
  const d = onlyDigits(s);
  return d ? d.slice(0, size).padStart(size, "0") : null;
};

// Checa devolução no SD1140 por DOC + SÉRIE + FORNECE
async function checkDevolucao({
  filial = "01",
  fornecedor,
  notaFiscal,
  serie,
}) {
  if (!fornecedor || !notaFiscal || !serie) return { ok: false, total: 0 };

  const docPad = String(notaFiscal).replace(/\D/g, "").padStart(9, "0"); // D1_DOC
  const seriePad = String(serie).replace(/\D/g, "").padStart(3, "0"); // D1_SERIE

  try {
    const pool = await getProtheusPool();
    const reqM = pool.request();
    reqM.input("filial", sql.VarChar, filial);
    reqM.input("forn", sql.VarChar, fornecedor);
    reqM.input("doc", sql.VarChar, docPad);
    reqM.input("serie", sql.VarChar, seriePad);

    const q = `
      SELECT TOP 1 D1_DOC, D1_SERIE, D1_FORNECE, D1_TOTAL
        FROM SD1140 WITH (NOLOCK)
       WHERE D_E_L_E_T_ = ''
         AND D1_TIPO    = 'D'
         AND D1_FILIAL  = @filial
         AND D1_FORNECE = @forn
         AND D1_DOC     = @doc
         AND D1_SERIE   = @serie
       ORDER BY D1_DOC DESC
    `;
    const { recordset } = await reqM.query(q);
    if (recordset?.length) {
      return { ok: true, total: Number(recordset[0].D1_TOTAL || 0) };
    }
    return { ok: false, total: 0 };
  } catch (e) {
    console.error("Erro ao consultar SD1140:", e);
    return { ok: false, total: 0 };
  }
}

module.exports = (dbOcorrencias) => {
  // Helper para registrar logs
  const logOcorrencia = (ocorrenciaId, acao, usuario, detalhes = "") => {
    const sqlLog = `INSERT INTO ocorrencia_logs (ocorrencia_id, acao, usuario, detalhes) VALUES (?, ?, ?, ?)`;
    dbOcorrencias.query(sqlLog, [ocorrenciaId, acao, usuario, detalhes], (err) => {
      if (err) console.error("Erro ao registrar log:", err);
    });
  };

  // —— Clientes
  router.get("/clientes", (req, res) => {
    const search = req.query.search || "";
    const sqlSelect =
      "SELECT nome_fantasia FROM clientes WHERE nome_fantasia LIKE ? LIMIT 10";
    dbOcorrencias.query(sqlSelect, [`%${search}%`], (err, result) => {
      if (err) {
        console.error("Erro ao buscar clientes:", err);
        return res.status(500).send(err);
      }
      res.json(result.map((row) => row.nome_fantasia));
    });
  });

  // —— Listagem paginada — inclui `serie` para o check
  router.get("/", async (req, res) => {
    try {
      const {
        page = 1,
        showOnlyPendentes = false,
        showOverdueOnly = false,
        search = "",
        status = "",
      } = req.query;

      const jwt = require("jsonwebtoken");
      let restrictEtana = false;

      // Check Permissions
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      if (token) {
        try {
          // Use process.env.JWT_SECRET (ensure it matches authMiddleware)
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded && decoded.id) {
            const [permRows] = await dbOcorrencias.promise().query(
              "SELECT * FROM permissoes_usuario WHERE user_id = ? AND rotina = 'RESTRICAO_ETANA' AND permitido = 1",
              [decoded.id]
            );
            if (permRows.length > 0) {
              restrictEtana = true;
            }
          }
        } catch (e) {
          // console.error("Token/DB check failed in ocorrenciaRoutes:", e.message);
          if (e.name === 'JsonWebTokenError' || e.name === 'TokenExpiredError') {
            return res.status(401).json({ error: "Token expired or invalid" });
          }
          // For other errors (like DB), we log but don't crash or return 401, 
          // effectively failing open (no restriction) or closed? 
          // Failing closed (restrictEtana = true) might be safer but could block legitimate users on DB error.
          // Let's assume failing open is acceptable for now to avoid blocking everyone if DB hiccups, 
          // but getting the table name right will fix the root cause.
        }
      }

      // If user is supposed to be restricted but token expired (and we didn't catch above?), 
      // the 401 return above handles it. The frontend will refresh and retry.

      const limit = 20;
      const offset = (page - 1) * limit;

      // ATUALIZADO: Inclui 'departamento' na seleção, embora não seja usado aqui.
      let sqlSelect =
        'SELECT o.id, numero, remetente, data, cliente, fornecedor_cod, filial, descricao, nota_fiscal, serie, nota_origem, valor, status, acao, dataTratativa, bilhete, motorista, conferente, ajudante, vendedor, placa, created_at, updated_at, adicionado_pelo_app \
         FROM ocorrencias o WHERE o.D_E_L_E_T_ = ""';
      let sqlCount =
        'SELECT COUNT(*) AS total FROM ocorrencias WHERE D_E_L_E_T_ = ""';

      const params = [];
      const countParams = [];

      // Apply Restriction
      if (restrictEtana) {
        sqlSelect += " AND remetente = 'FORT FRUIT ETANA'";
        sqlCount += " AND remetente = 'FORT FRUIT ETANA'";
      }

      // Filtro por ocorrências atrasadas (pendentes com mais de 7 dias)
      if (showOverdueOnly === "true" || showOverdueOnly === true) {
        const now = new Date();
        const nowMidnight = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        const sevenDaysAgo = new Date(nowMidnight);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const dateLimit = sevenDaysAgo.toISOString().split('T')[0];

        sqlSelect += " AND status = 'PENDENTE' AND DATE(data) < ?";
        sqlCount += " AND status = 'PENDENTE' AND DATE(data) < ?";
        params.push(dateLimit);
        countParams.push(dateLimit);
      }
      // Filtro por status
      else if (status === "PENDENTE_APP") {
        sqlSelect += " AND status = 'PENDENTE' AND adicionado_pelo_app = 'S'";
        sqlCount += " AND status = 'PENDENTE' AND adicionado_pelo_app = 'S'";
      } else if (status && status !== "TODOS" && status !== "") {
        sqlSelect += " AND status = ?";
        sqlCount += " AND status = ?";
        params.push(status);
        countParams.push(status);
      } else if (showOnlyPendentes === "true" || showOnlyPendentes === true) {
        sqlSelect += ' AND status = "PENDENTE"';
        sqlCount += ' AND status = "PENDENTE"';
      }

      // Filtro de pesquisa (cliente, número, remetente, nota fiscal, bilhete)
      if (search && search.trim() !== "") {
        const searchTerm = `%${search.trim()}%`;
        sqlSelect += ` AND (
          numero LIKE ? OR 
          cliente LIKE ? OR 
          remetente LIKE ? OR 
          nota_fiscal LIKE ? OR 
          bilhete LIKE ? OR
          CAST(numero AS CHAR) LIKE ?
        )`;
        sqlCount += ` AND (
          numero LIKE ? OR 
          cliente LIKE ? OR 
          remetente LIKE ? OR 
          nota_fiscal LIKE ? OR 
          bilhete LIKE ? OR
          CAST(numero AS CHAR) LIKE ?
        )`;
        params.push(
          searchTerm,
          searchTerm,
          searchTerm,
          searchTerm,
          searchTerm,
          searchTerm
        );
        countParams.push(
          searchTerm,
          searchTerm,
          searchTerm,
          searchTerm,
          searchTerm,
          searchTerm
        );
      }

      sqlSelect += " ORDER BY id DESC LIMIT ? OFFSET ?";
      params.push(limit, offset);

      const [rows] = await dbOcorrencias.promise().query(sqlSelect, params);

      const enriched = await Promise.all(
        rows.map(async (row) => {
          const dev = await checkDevolucao({
            filial: row.filial || "01",
            fornecedor: row.fornecedor_cod || null,
            notaFiscal: row.nota_fiscal || null,
            serie: row.serie || null,
          });
          return {
            ...row,
            devolucao_ok: !!dev.ok,
            devolucao_total: Number(dev.total || 0),
          };
        })
      );

      const [countResult] = await dbOcorrencias
        .promise()
        .query(sqlCount, countParams);
      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      res.send({ ocorrencias: enriched, totalPages });
    } catch (err) {
      console.error("Erro ao obter ocorrências:", err);
      res.status(500).send(err);
    }
  });

  // Endpoint para contar ocorrências atrasadas (pendentes com mais de 7 dias)
  router.get("/count-overdue", async (req, res) => {
    try {
      const now = new Date();
      const nowMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      // Calcula a data limite (7 dias atrás)
      const sevenDaysAgo = new Date(nowMidnight);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Formata a data para MySQL (YYYY-MM-DD)
      const dateLimit = sevenDaysAgo.toISOString().split('T')[0];

      const sqlCount = `
        SELECT COUNT(*) AS total 
        FROM ocorrencias 
        WHERE D_E_L_E_T_ = '' 
          AND status = 'PENDENTE'
          AND DATE(data) < ?
      `;

      const [result] = await dbOcorrencias.promise().query(sqlCount, [dateLimit]);
      const total = result[0]?.total || 0;

      res.json({ count: total });
    } catch (err) {
      console.error("Erro ao contar ocorrências atrasadas:", err);
      res.status(500).json({ error: "Erro ao contar ocorrências atrasadas" });
    }
  });

  // —————————————————————————————————————————————————————————
  // —— NOVO ENDPOINT: Excel Relatório Faltas FF (Range de Datas)
  // —————————————————————————————————————————————————————————
  router.get("/excel-faltas-ff", async (req, res) => {
    const { startDate, endDate } = req.query; // Removido 'local' dos query params

    // Garante que as datas são válidas
    if (!startDate || !endDate) {
      return res.status(400).send("Datas (Início/Fim) são obrigatórias.");
    }

    // Consulta a tabela faltas_fechamento
    // CORRIGIDO: Removidas colunas id, saldo_calc_fisico, criado_em, atualizado_em.
    // CORRIGIDO: Nome da coluna 'preco_compra_observacao' (não 'preco_compra, observacao')
    const query = `
SELECT 
     data, local, cod_produto, produto, unidade, falta, 
     preco_compra, observacao, usuario
   FROM faltas_fechamento 
   WHERE data BETWEEN ? AND ?
   ORDER BY data DESC, local, produto
  `;

    try {
      // A consulta agora usa apenas startDate e endDate
      const [rows] = await dbOcorrencias
        .promise()
        .query(query, [startDate, endDate]);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(
        `Relatório Faltas FF (${startDate} a ${endDate})`
      );

      // Definição das Colunas - APENAS as colunas solicitadas
      worksheet.columns = [
        { header: "Data", key: "data", width: 12 },
        { header: "Local", key: "local", width: 15 },
        { header: "Cód. Produto", key: "cod_produto", width: 15 },
        { header: "Produto", key: "produto", width: 30 },
        { header: "Unid.", key: "unidade", width: 10 },
        {
          header: "Falta",
          key: "falta",
          width: 12,
          style: { numFmt: "#.##0,00" },
        },
        {
          header: "Preço Compra",
          key: "preco_compra",
          width: 15,
          style: { numFmt: "R$ #,##0.00" },
        },
        { header: "Usuário", key: "usuario", width: 15 },
      ];

      // Adição das Linhas
      rows.forEach((row) => {
        worksheet.addRow({
          ...row,
          // Formata data e preços
          data: row.data ? new Date(row.data).toLocaleDateString("pt-BR") : "",
          falta: parseFloat(row.falta) || 0,
          preco_compra: parseFloat(row.preco_compra) || 0,
          // Removido saldo_calc_fisico, criado_em e atualizado_em pois não estão no SELECT
        });
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=relatorio_faltas_ff_${startDate}_${endDate}.xlsx`
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error("❌ Erro ao gerar relatório Excel Faltas FF:", err);
      res.status(500).send("Erro ao gerar relatório Excel Faltas FF");
    }
  });

  // —— Excel por período (Mantido, mas atualizado para incluir 'departamento' na consulta)
  router.get("/excel", async (req, res) => {
    const { startDate, endDate } = req.query;

    const query = `
SELECT 
     o.cliente,
     o.remetente,
     o.data,
     o.descricao,
     o.nota_fiscal,
     o.nota_origem,
     o.vendedor, 
     ip.produto_nome,
     ip.produto_unidade,
     ip.quantidade,
     ip.valor,
     ip.total,
     ip.motivo,
     ip.tipo,
     ip.departamento,  -- NOVO CAMPO INCLUÍDO
     ip.obs, 
     o.conferente,
     o.motorista,
     o.numero,
     ip.created_at
   FROM ocorrencias o
      JOIN itens_produto ip ON o.id = ip.ocorrencia_id
      WHERE o.data BETWEEN ? AND ?
        AND o.D_E_L_E_T_ = '' 
        AND ip.D_E_L_E_T_ = ''
      ORDER BY o.data DESC, o.id DESC
    `;

    try {
      const [rows] = await dbOcorrencias
        .promise()
        .query(query, [startDate, endDate]);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Relatório");

      // Definição das Colunas - Adicionando DEPARTAMENTO
      worksheet.columns = [
        { header: "Cliente", key: "cliente", width: 25 },
        { header: "Remetente", key: "remetente", width: 20 },
        { header: "Descrição", key: "descricao", width: 30 },
        { header: "Nota Fiscal", key: "nota_fiscal", width: 16 },
        { header: "Nota de Origem", key: "nota_origem", width: 16 },
        { header: "Vendedor", key: "vendedor", width: 20 },
        { header: "Produto", key: "produto_nome", width: 25 },
        { header: "Unidade", key: "produto_unidade", width: 10 },
        {
          header: "Quantidade",
          key: "quantidade",
          width: 12,
          style: { numFmt: "#.##0,00" },
        },
        {
          header: "Valor",
          key: "valor",
          width: 12,
          style: { numFmt: "#.##0,00" },
        },
        {
          header: "Total",
          key: "total",
          width: 12,
          style: { numFmt: "#.##0,00" },
        },
        { header: "Motivo", key: "motivo", width: 20 },
        { header: "Tipo", key: "tipo", width: 12 },
        { header: "Departamento", key: "departamento", width: 15 }, // <-- NOVA COLUNA
        { header: "Observação", key: "obs", width: 30 },
        { header: "Conferente", key: "conferente", width: 20 },
        { header: "Data", key: "data", width: 15 },
        { header: "Motorista", key: "motorista", width: 20 },
        { header: "Romaneio", key: "numero", width: 15 },
      ];

      // CÓDIGO CORRIGIDO E FINAL
      rows.forEach((row) => {
        worksheet.addRow({
          ...row, // Mantém todos os outros campos (cliente, vendedor, etc.)

          // Garante que os valores sejam NÚMEROS antes de adicionar à planilha
          quantidade:
            row.quantidade != null ? parseFloat(row.quantidade) : null,
          valor: row.valor != null ? parseFloat(row.valor) : null,
          total: row.total != null ? parseFloat(row.total) : null,

          // Mantém a formatação da data que já funcionava
          data: row.data ? new Date(row.data).toLocaleDateString("pt-BR") : "",
        });
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=relatorio.xlsx"
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error("❌ Erro ao gerar relatório Excel:", err);
      res.status(500).send("Erro ao gerar relatório Excel");
    }
  });

  // —— Busca
  router.get("/search", (req, res) => {
    const { filterValue } = req.query;

    if (!filterValue) {
      return res.status(400).json({ error: "filterValue is required" });
    }

    let sqlSearch = 'SELECT * FROM ocorrencias WHERE D_E_L_E_T_ = ""';
    sqlSearch += ` AND (
      numero LIKE ? OR bilhete LIKE ? OR data LIKE ? OR cliente LIKE ? OR nota_fiscal LIKE ? OR nota_origem LIKE ?
    ) ORDER BY id DESC`;

    dbOcorrencias.query(
      sqlSearch,
      [
        `%${filterValue}%`,
        `%${filterValue}%`,
        `%${filterValue}%`,
        `%${filterValue}%`,
        `%${filterValue}%`,
        `%${filterValue}%`,
      ],
      (err, result) => {
        if (err) {
          console.error("Erro ao buscar ocorrências:", err);
          return res.status(500).send(err);
        }
        res.send(result);
      }
    );
  });

  router.get("/_fscheck", async (req, res) => {
    try {
      if (SKIP_DIR_CHECK) {
        return res.json({ ok: true, skipped: true, dir: STORAGE_DIR });
      }
      // (opcional) manter um teste leve apenas quando não estiver pulando
      if (!fs.existsSync(STORAGE_DIR)) {
        return res
          .status(404)
          .json({ ok: false, error: "dir_not_found", dir: STORAGE_DIR });
      }
      return res.json({ ok: true, dir: STORAGE_DIR });
    } catch (e) {
      console.error("FSCHECK ERRO:", e);
      res.status(500).json({ ok: false, error: e.code || e.message });
    }
  });

  // —— Inclusão
  router.post("/", (req, res) => {
    const {
      numero,
      remetente,
      data,
      dataInclusa, // Data inclusa pelo usuário
      cliente,
      fornecedorCod, // Z4_CLIENTE
      filial, // default '01'
      descricao,
      notaFiscal,
      serie, // vem do front
      notaOrigem,
      valorTotal,
      status,
      acao,
      dataTratativa,
      bilhete,
      motorista,
      conferente,
      ajudante,
      vendedor,
      placa,
      produtos,
      obs,
    } = req.body;

    const placaVal =
      placa && String(placa).trim() !== "" ? String(placa).trim() : null;

    const nfClean =
      notaFiscal != null && String(notaFiscal).trim() !== ""
        ? padLeft(notaFiscal, 9)
        : null;

    const serieClean =
      serie != null && String(serie).trim() !== "" ? padLeft(serie, 3) : null;

    const nfOrigemClean =
      notaOrigem != null && String(notaOrigem).trim() !== ""
        ? onlyDigits(notaOrigem).slice(0, 12)
        : null;

    const fornecedorVal =
      fornecedorCod && String(fornecedorCod).trim() !== ""
        ? String(fornecedorCod).trim()
        : null;

    const filialVal =
      filial && String(filial).trim() !== "" ? String(filial).trim() : "01";

    const numeroVal =
      numero && String(numero).trim() !== "" ? String(numero).trim() : "0";

    const sqlInsert = `
  INSERT INTO ocorrencias 
    (numero, remetente, data, cliente, fornecedor_cod, filial, descricao,
     nota_fiscal, serie, nota_origem, valor, status, acao, dataTratativa,
     bilhete, motorista, conferente, ajudante, vendedor, placa, obs)
  VALUES 
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;
    dbOcorrencias.query(
      sqlInsert,
      [
        numeroVal,
        remetente,
        data,
        cliente,
        fornecedorVal,
        filialVal,
        descricao,
        nfClean,
        serieClean,
        nfOrigemClean,
        Number(valorTotal || 0),
        status,
        acao,
        dataTratativa || null,
        bilhete,
        motorista,
        conferente,
        ajudante,
        vendedor,
        placaVal,
        obs || null, // aqui entra a observação
      ],
      (err, result) => {
        if (err) {
          console.error("Erro ao inserir ocorrência:", err);
          return res.status(500).send(err);
        }

        const ocorrenciaId = result.insertId;

        // Log específico da criação
        const usuarioLog = req.user?.username || req.body.adicionado_por || "SISTEMA";
        logOcorrencia(
          ocorrenciaId,
          "CRIACAO",
          usuarioLog,
          `Ocorrência #${numero} criada por ${usuarioLog}`
        );

        if (produtos && produtos.length > 0) {
          const produtosData = produtos.map((p) => [
            ocorrenciaId,
            p.nome,
            p.unidade,
            parseFloat(p.quantidade),
            parseFloat(p.valor),
            (parseFloat(p.quantidade) * parseFloat(p.valor)).toFixed(2),
            p.motivo,
            p.tipo,
            p.departamento, // <== NOVO CAMPO INCLUÍDO
            p.obs || null, // observação do item
          ]);

          const sqlInsertProdutos = `
  INSERT INTO itens_produto 
    (ocorrencia_id, produto_nome, produto_unidade, quantidade, valor, total, motivo, tipo, departamento, obs) 
  VALUES ?`; // <== NOVA COLUNA ADICIONADA: 'departamento'

          dbOcorrencias.query(sqlInsertProdutos, [produtosData], (err2) => {
            if (err2) {
              console.error("Erro ao inserir produtos:", err2);
              return res.status(500).send(err2);
            }
            res.send(result);
          });
        } else {
          res.send(result);
        }
      }
    );
  });

  // —— Dev helpers
  router.get("/_devping", async (req, res) => {
    try {
      const pool = await getProtheusPool();
      const { recordset } = await pool
        .request()
        .query("SELECT GETDATE() as now");
      res.json({
        ok: true,
        now: recordset?.[0]?.now,
        mssql: {
          user: process.env.MSSQL_USER,
          server: process.env.MSSQL_SERVER,
          database: process.env.MSSQL_DATABASE,
        },
      });
    } catch (e) {
      console.error("DEV PING ERRO:", e);
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get("/_devcheck", async (req, res) => {
    const { forn, nfori, filial = "01" } = req.query;
    if (!forn || !nfori)
      return res.status(400).json({ error: "Informe forn e nfori" });

    const raw = String(nfori).replace(/\D/g, "");
    const pad9 = raw.padStart(9, "0");
    const pad8 = raw.padStart(8, "0");
    const pad7 = raw.padStart(7, "0");

    const pool = await getProtheusPool();
    const reqM = pool.request();
    reqM.input("filial", sql.VarChar, String(filial));
    reqM.input("forn", sql.VarChar, String(forn));
    reqM.input("pad9", sql.VarChar, pad9);
    reqM.input("pad8", sql.VarChar, pad8);
    reqM.input("pad7", sql.VarChar, pad7);
    reqM.input("raw", sql.VarChar, raw);

    const query = `
  SELECT TOP 20
         D1_FILIAL, D1_FORNECE, D1_DOC, D1_NFORI, D1_SERIE, D1_TOTAL, D1_TIPO, D_E_L_E_T_
    FROM SD1140 WITH (NOLOCK)
   WHERE D_E_L_E_T_ = ''
     AND D1_TIPO    = 'D'
     AND D1_FILIAL  = @filial
     AND D1_FORNECE = @forn
     AND (D1_NFORI = @pad9 OR D1_NFORI = @pad8 OR D1_NFORI = @pad7 OR D1_NFORI = @raw)
   ORDER BY D1_DOC DESC
`;

    try {
      const { recordset } = await reqM.query(query);
      res.json({
        params: { filial, forn, nfori },
        tried: { raw, pad9, pad8, pad7 },
        found: recordset?.length || 0,
        rows: recordset || [],
      });
    } catch (e) {
      console.error("dev-check erro:", e);
      res
        .status(500)
        .json({ error: "Falha na consulta MSSQL", detail: e?.message });
    }
  });

  // —— Kanban tasks (CRUD + arquivos) — (inalterado) ——
  router.get("/tasks", async (_req, res) => {
    const [rows] = await dbOcorrencias.promise().query(
      `SELECT id, title, description, assignee, priority, status, order_index,
            dueDate, file_path, file_name, file_mime, created_at, updated_at
       FROM kanban_tasks
      WHERE D_E_L_E_T_ = ''
      ORDER BY status, order_index`
    );
    res.json(rows);
  });

  router.delete("/tasks/:id", async (req, res) => {
    const { id } = req.params;
    const conn = dbOcorrencias.promise();

    try {
      const [[row]] = await conn.query(
        "SELECT file_path FROM kanban_tasks WHERE id=? AND D_E_L_E_T_=''",
        [id]
      );

      if (row && row.file_path) {
        const fullPath = path.isAbsolute(row.file_path)
          ? row.file_path
          : path.join(STORAGE_DIR, row.file_path);

        try {
          await fsp.unlink(fullPath);
        } catch (e) {
          if (e.code !== "ENOENT") console.error("unlink error:", e);
        }
      }

      await conn.query(
        `UPDATE kanban_tasks
         SET D_E_L_E_T_='*', updated_at=NOW(),
             file_name=NULL, file_mime=NULL, file_path=NULL
       WHERE id=?`,
        [id]
      );

      res.json({ ok: true });
    } catch (e) {
      console.error("DELETE /tasks/:id", e);
      res.status(500).json({ error: "Falha ao excluir tarefa" });
    }
  });

  router.post("/tasks", upload.single("file"), async (req, res) => {
    const {
      title,
      description = "",
      assignee = "",
      priority = "MÉDIA",
      status = "todo",
      dueDate = null,
    } = req.body;
    if (!title || !title.trim())
      return res.status(400).json({ error: "title is required" });

    const [[{ maxOrd = -1 }]] = await dbOcorrencias
      .promise()
      .query(
        "SELECT IFNULL(MAX(order_index), -1) AS maxOrd FROM kanban_tasks WHERE status=? AND D_E_L_E_T_=''",
        [status]
      );
    const orderIndex = maxOrd + 1;

    const file = req.file || null;
    const [result] = await dbOcorrencias.promise().query(
      `INSERT INTO kanban_tasks
      (title, description, assignee, priority, status, order_index, dueDate, file_path, file_name, file_mime)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        description,
        assignee,
        priority,
        status,
        orderIndex,
        dueDate || null,
        file ? path.join(STORAGE_DIR, file.filename) : null,
        file ? file.originalname : null,
        file ? file.mimetype : null,
      ]
    );
    res.json({ id: result.insertId });
  });

  router.put("/tasks/:id", upload.single("file"), async (req, res) => {
    const { id } = req.params;
    const {
      title,
      description,
      assignee,
      priority,
      status,
      dueDate,
      clearFile,
    } = req.body;
    const file = req.file || null;

    const [[curr]] = await dbOcorrencias
      .promise()
      .query(
        "SELECT file_path FROM kanban_tasks WHERE id=? AND D_E_L_E_T_=''",
        [id]
      );

    let filePath = curr?.file_path || null;
    let fileName = null;
    let fileMime = null;

    if (clearFile === "true") {
      if (filePath) {
        try {
          fs.unlinkSync(filePath);
        } catch (_) { }
      }
      filePath = null;
    }

    if (file) {
      if (curr?.file_path) {
        try {
          fs.unlinkSync(curr.file_path);
        } catch (_) { }
      }
      filePath = path.join(STORAGE_DIR, file.filename);
      fileName = file.originalname;
      fileMime = file.mimetype;
    }

    await dbOcorrencias.promise().query(
      `UPDATE kanban_tasks SET
       title=?, description=?, assignee=?, priority=?, status=?, dueDate=?,
       file_path=?, file_name=?,
       file_mime=?, updated_at=NOW()
     WHERE id=? AND D_E_L_E_T_=''`,
      [
        title,
        description,
        assignee,
        priority,
        status,
        dueDate || null,
        filePath,
        file ? fileName : clearFile === "true" ? null : curr?.file_name,
        file ? fileMime : clearFile === "true" ? null : curr?.file_mime,
        id,
      ]
    );
    res.json({ ok: true });
  });

  router.get("/tasks/:id/file", async (req, res) => {
    const { id } = req.params;
    const [[row]] = await dbOcorrencias
      .promise()
      .query(
        "SELECT file_path, file_name, file_mime FROM kanban_tasks WHERE id=? AND D_E_L_E_T_=''",
        [id]
      );
    if (!row?.file_path) return res.status(404).send("Sem anexo");

    const abs = row.file_path;
    if (!fs.existsSync(abs))
      return res.status(404).send("Arquivo não encontrado");

    res.setHeader("Content-Type", row.file_mime || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(
        row.file_name || path.basename(abs)
      )}"`
    );
    res.sendFile(abs);
  });

  // —— Reorder kanban
  router.post("/reorder", async (req, res) => {
    const { moves = [] } = req.body;
    const conn = await dbOcorrencias.promise().getConnection();
    try {
      await conn.beginTransaction();
      for (const m of moves) {
        await conn.query(
          `UPDATE kanban_tasks SET status=?, order_index=?, updated_at=NOW() WHERE id=? AND D_E_L_E_T_=''`,
          [m.status, m.order_index, m.id]
        );
      }
      await conn.commit();
      res.json({ ok: true });
    } catch (e) {
      await conn.rollback();
      console.error(e);
      res.status(500).json({ error: "reorder failed" });
    } finally {
      conn.release();
    }
  });

  /// —— Atualização (PUT) — mantém itens
  router.put("/:id", async (req, res) => {
    const {
      numero,
      remetente,
      data,
      cliente,
      fornecedorCod,
      filial,
      descricao,
      notaFiscal,
      serie,
      notaOrigem,
      valor,
      status,
      acao,
      dataTratativa,
      bilhete,
      motorista,
      conferente,
      ajudante,
      vendedor,
      D_E_L_E_T_,
      produtos,
      placa,
      obs,
    } = req.body;
    const { id } = req.params;

    const onlyDigits = (s) => String(s || "").replace(/\D/g, "");
    const padLeft = (s, size) => {
      const d = onlyDigits(s);
      return d ? d.slice(0, size).padStart(size, "0") : null;
    };

    const nfClean =
      notaFiscal != null && String(notaFiscal).trim() !== ""
        ? padLeft(notaFiscal, 9)
        : null;
    const serieClean =
      serie != null && String(serie).trim() !== "" ? padLeft(serie, 3) : null;
    const nfOrigemClean =
      notaOrigem != null && String(notaOrigem).trim() !== ""
        ? onlyDigits(notaOrigem).slice(0, 12)
        : null;
    const fornecedorVal =
      fornecedorCod != null ? String(fornecedorCod).trim() : "";
    const filialVal = filial != null ? String(filial).trim() : "";
    const placaVal = placa != null ? String(placa).trim() : "";
    const obsVal = obs != null ? String(obs).trim() : "";

    const toNumber = (v) => {
      if (v === null || v === undefined || v === "") return 0;
      const n = parseFloat(String(v).replace(",", "."));
      return Number.isFinite(n) ? n : 0;
    };

    // Função para formatar data para MySQL (YYYY-MM-DD)
    const formatDateForMySQL = (dateValue) => {
      if (!dateValue) return null;
      try {
        // Se já for uma string YYYY-MM-DD, retorna direto para evitar shift de timezone
        if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
          return dateValue;
        }
        
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return null;
        
        // Se a string contiver apenas a data (sem T ou espaço), usamos os métodos UTC
        // para garantir que '2026-03-25' não vire '2026-03-24' em timezones negativos (ex: Brasil)
        const isDateOnly = typeof dateValue === 'string' && !dateValue.includes('T') && !dateValue.includes(' ');
        
        const year = isDateOnly ? date.getUTCFullYear() : date.getFullYear();
        const month = String((isDateOnly ? date.getUTCMonth() : date.getMonth()) + 1).padStart(2, "0");
        const day = String(isDateOnly ? date.getUTCDate() : date.getDate()).padStart(2, "0");
        
        return `${year}-${month}-${day}`;
      } catch (e) {
        return null;
      }
    };

    const dataFormatada = formatDateForMySQL(data);
    const dataTratativaFormatada = formatDateForMySQL(dataTratativa);

    const conn = await dbOcorrencias.promise().getConnection();
    try {
      await conn.beginTransaction();

      const [statusRows] = await conn.query(
        'SELECT status, adicionado_pelo_app FROM ocorrencias WHERE id = ? AND D_E_L_E_T_ = ""',
        [id]
      );
      if (!statusRows.length) {
        await conn.rollback();
        return res.status(404).json({ message: "Ocorrência não encontrada" });
      }
      const statusAtual = statusRows[0].status;
      const novoStatus = status || statusAtual;
      const adicionadoPeloApp = statusRows[0].adicionado_pelo_app;

      // Se for do app, usa remetente padrão "FORT FRUIT BELEM"
      const remetenteFinal = adicionadoPeloApp === "S"
        ? "FORT FRUIT BELEM"
        : (remetente || "");

      // Permite edição se:
      // 1. Status atual não é RESOLVIDO ou CONCLUIDO (edição normal)
      // 2. OU está reabrindo (RESOLVIDO -> PENDENTE ou CONCLUIDO -> PENDENTE)
      const estaReabrindo =
        (statusAtual === "RESOLVIDO" && novoStatus === "PENDENTE") ||
        (statusAtual === "CONCLUIDO" && novoStatus === "PENDENTE") ||
        (statusAtual === "CONCLUIDA" && novoStatus === "PENDENTE");

      if ((statusAtual === "RESOLVIDO" || statusAtual === "CONCLUIDO" || statusAtual === "CONCLUIDA") && !estaReabrindo) {
        await conn.rollback();
        return res
          .status(403)
          .json({
            message:
              "Ocorrências resolvidas ou concluídas não podem ser editadas. Use a opção de reabrir para tornar pendente.",
          });
      }

      // Se estiver apenas reabrindo, atualiza APENAS o status
      if (estaReabrindo) {
        const sqlReabrir = `
          UPDATE ocorrencias 
          SET status = 'PENDENTE', 
              dataTratativa = NULL,
              updated_at = NOW()
          WHERE id = ? AND D_E_L_E_T_ = ""
        `;

        await conn.query(sqlReabrir, [id]);

        // Recalcula o valor total baseado nos produtos existentes
        const [produtosRows] = await conn.query(
          `SELECT SUM(total) as total_sum FROM itens_produto 
           WHERE ocorrencia_id = ? AND D_E_L_E_T_ = ""`,
          [id]
        );
        const totalSum = produtosRows[0]?.total_sum;
        const novoValorTotal = totalSum != null ? parseFloat(totalSum) : 0;

        // Atualiza o valor total na ocorrência
        await conn.query(
          `UPDATE ocorrencias SET valor = ? WHERE id = ? AND D_E_L_E_T_ = ""`,
          [Number(novoValorTotal).toFixed(2), id]
        );

        await conn.commit();

        // Retorna a ocorrência atualizada
        const [[updated]] = await conn.query(
          `SELECT * FROM ocorrencias WHERE id = ? AND D_E_L_E_T_ = ""`,
          [id]
        );

        res.json(updated);
        return;
      }

      // Edição normal (não é reabertura)

      // Se foi adicionado pelo app e está sendo editado no sistema web, remove a flag
      // Isso faz com que deixe de aparecer como "PEND. APP" e vire "PENDENTE" normal
      let adicionadoPeloAppFinal = adicionadoPeloApp;
      if (adicionadoPeloApp === "S") {
        adicionadoPeloAppFinal = "N"; // Remove a marcação de "pendência do app"
      }

      const sqlUpdate = `
      UPDATE ocorrencias 
         SET numero = ?, remetente = ?, data = ?, cliente = ?,
             fornecedor_cod = COALESCE(NULLIF(?, ''), fornecedor_cod),
             filial = COALESCE(NULLIF(?, ''), filial),
             descricao = ?, 
             nota_fiscal = ?,
             serie = ?, 
             nota_origem = ?,
             valor = ?, status = ?, acao = ?, dataTratativa = ?,
             bilhete = ?, motorista = ?, conferente = ?, ajudante = ?,
             vendedor = ?, D_E_L_E_T_ = ?,
             placa = COALESCE(NULLIF(?, ''), placa),
             obs = COALESCE(NULLIF(?, ''), obs),
             adicionado_pelo_app = ?,
             updated_at = NOW()
       WHERE id = ? AND D_E_L_E_T_ = ""`;

      await conn.query(sqlUpdate, [
        numero || null,
        remetenteFinal, // Usa remetente padrão se for do app
        dataFormatada,
        cliente || "",
        fornecedorVal,
        filialVal,
        descricao || "",
        nfClean, // Permite null para limpar o campo
        serieClean, // Permite null para limpar o campo
        nfOrigemClean, // Permite null para limpar o campo
        toNumber(valor).toFixed(2),
        status || "PENDENTE",
        acao || "",
        dataTratativaFormatada,
        bilhete || "",
        motorista || "",
        conferente || "",
        ajudante || "",
        vendedor || "",
        D_E_L_E_T_ || "",
        placaVal,
        obsVal,
        adicionadoPeloAppFinal, // Atualiza a flag
        id,
      ]);

      // ================== INÍCIO DA ALTERAÇÃO (INCLUINDO DEPARTAMENTO) ==================
      // Primeiro, busca todos os produtos existentes da ocorrência
      const [produtosExistentes] = await conn.query(
        `SELECT id FROM itens_produto 
         WHERE ocorrencia_id = ? AND D_E_L_E_T_ = ""`,
        [id]
      );
      const idsExistentes = produtosExistentes.map((p) => p.id);

      // Coleta os IDs dos produtos enviados (que devem ser mantidos)
      const idsEnviados = [];

      if (Array.isArray(produtos)) {
        for (const p of produtos) {
          const itemId = p.id ?? p.item_id ?? null;
          const nome = p.produto_nome ?? p.nome ?? "";
          const unidade = p.produto_unidade ?? p.unidade ?? "";
          const qtd = toNumber(p.quantidade);
          const valorItem = toNumber(p.valor);
          const total = (qtd * valorItem).toFixed(2);
          const motivo = p.motivo ?? "";
          const tipo = p.tipo ?? "";
          const departamento = p.departamento ?? ""; // <== NOVO CAMPO
          const obsItem = p.obs || null;

          const temConteudo =
            nome ||
            unidade ||
            qtd > 0 ||
            valorItem > 0 ||
            motivo ||
            tipo ||
            departamento; // Inclui departamento
          if (!temConteudo) continue;

          if (itemId) {
            // Adiciona o ID à lista de produtos mantidos
            idsEnviados.push(Number(itemId));

            // Se o item já existe (UPDATE)
            await conn.query(
              `UPDATE itens_produto
               SET produto_nome=?, produto_unidade=?, quantidade=?, valor=?, total=?, motivo=?, tipo=?, departamento=?, obs=?
             WHERE id=? AND ocorrencia_id=? AND D_E_L_E_T_=""`, // <== NOVA COLUNA ADICIONADA: 'departamento'
              [
                nome,
                unidade,
                qtd,
                valorItem,
                total,
                motivo,
                tipo,
                departamento, // <== VALOR DO NOVO CAMPO
                obsItem,
                itemId,
                id,
              ]
            );
          } else if (nome && unidade && qtd > 0) {
            // Se é um item novo (INSERT)
            const [insertResult] = await conn.query(
              `INSERT INTO itens_produto
               (ocorrencia_id, produto_nome, produto_unidade, quantidade, valor, total, motivo, tipo, departamento, obs)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, // <== NOVA COLUNA ADICIONADA: 'departamento'
              [
                id,
                nome,
                unidade,
                qtd,
                valorItem,
                total,
                motivo,
                tipo,
                departamento, // <== VALOR DO NOVO CAMPO
                obsItem,
              ]
            );
            // Adiciona o novo ID à lista de produtos mantidos
            if (insertResult.insertId) {
              idsEnviados.push(insertResult.insertId);
            }
          }
        }
      }

      // Remove (marca como deletado) os produtos que existem no banco mas não foram enviados
      const idsParaRemover = idsExistentes.filter((idExistente) => !idsEnviados.includes(idExistente));
      if (idsParaRemover.length > 0) {
        const placeholders = idsParaRemover.map(() => "?").join(",");
        await conn.query(
          `UPDATE itens_produto 
           SET D_E_L_E_T_ = '*' 
           WHERE id IN (${placeholders}) AND ocorrencia_id = ? AND D_E_L_E_T_ = ""`,
          [...idsParaRemover, id]
        );
        console.log(`🗑️  Removidos ${idsParaRemover.length} produto(s) da ocorrência #${id}`);
      }
      // =================== FIM DA ALTERAÇÃO (INCLUINDO DEPARTAMENTO) ===================

      // Recalcula o valor total baseado nos produtos após inserir/atualizar
      const [produtosRows] = await conn.query(
        `SELECT SUM(total) as total_sum FROM itens_produto 
         WHERE ocorrencia_id = ? AND D_E_L_E_T_ = ""`,
        [id]
      );
      const totalSum = produtosRows[0]?.total_sum;
      const novoValorTotal = totalSum != null ? parseFloat(totalSum) : 0;

      // Atualiza o valor total na ocorrência
      await conn.query(
        `UPDATE ocorrencias SET valor = ? WHERE id = ? AND D_E_L_E_T_ = ""`,
        [Number(novoValorTotal).toFixed(2), id]
      );

      const usuarioLog = req.user?.username || "SISTEMA";
      if (estaReabrindo) {
        logOcorrencia(id, "REABERTURA", usuarioLog, `Ocorrência reaberta por ${usuarioLog}`);
      } else {
        logOcorrencia(id, "EDICAO", usuarioLog, "Ocorrência editada");
      }

      await conn.commit();

      // ATUALIZADO: Inclui 'departamento' na seleção de retorno
      const [[updated]] = await conn.query(
        `SELECT id, numero, remetente, data, cliente, fornecedor_cod, filial, descricao, 
             nota_fiscal, serie, nota_origem, valor, status, acao, dataTratativa, bilhete, 
             motorista, conferente, ajudante, vendedor, placa, obs, created_at, updated_at
       FROM ocorrencias
      WHERE id=?`,
        [id]
      );
      return res.json(updated || { ok: true });
    } catch (e) {
      try {
        await conn.rollback();
      } catch { }
      console.error("Erro ao atualizar ocorrência:", e);
      return res.status(500).json({ error: "Erro ao atualizar ocorrência" });
    } finally {
      conn.release();
    }
  });

  // —— Exclusão lógica
  router.delete("/:id", (req, res) => {
    const { id } = req.params;

    const sqlCheckStatus =
      'SELECT status FROM ocorrencias WHERE id = ? AND D_E_L_E_T_ = ""';
    dbOcorrencias.query(sqlCheckStatus, [id], (err, result) => {
      if (err) {
        console.error("Erro ao verificar status da ocorrência:", err);
        return res.status(500).send(err);
      }

      if (result.length === 0) {
        return res.status(404).send({ message: "Ocorrência não encontrada" });
      }

      if (result[0].status === "RESOLVIDO") {
        return res
          .status(403)
          .send({ message: "Ocorrências resolvidas não podem ser excluídas" });
      }

      const sqlMarkDeleteOcorrencia =
        'UPDATE ocorrencias SET D_E_L_E_T_ = "*" WHERE id = ?';
      const sqlMarkDeleteProdutos =
        'UPDATE itens_produto SET D_E_L_E_T_ = "*" WHERE ocorrencia_id = ?';

      dbOcorrencias.query(sqlMarkDeleteOcorrencia, [id], (errU) => {
        if (errU) {
          console.error("Erro ao marcar ocorrência como deletada:", errU);
          return res.status(500).send(errU);
        }

        dbOcorrencias.query(sqlMarkDeleteProdutos, [id], (errP, resultP) => {
          if (errP) {
            console.error("Erro ao marcar produtos como deletados:", errP);
            return res.status(500).send(errP);
          }
          res.send(resultP);
        });
      });
    });
  });

  // —— Motoristas / Conferentes
  router.get("/motoristas", (req, res) => {
    const search = req.query.search || "";
    const sqlSearch = "SELECT nome FROM motoristas WHERE nome LIKE ?";
    dbOcorrencias.query(sqlSearch, [`%${search}%`], (err, result) => {
      if (err) {
        console.error("Erro ao buscar motoristas:", err);
        return res.status(500).send(err);
      }
      res.send(result);
    });
  });

  router.get("/conferentes", (req, res) => {
    const search = req.query.search || "";
    const sqlSearch = "SELECT nome FROM conferentes WHERE nome LIKE ?";
    dbOcorrencias.query(sqlSearch, [`%${search}%`], (err, result) => {
      if (err) {
        console.error("Erro ao buscar conferentes:", err);
        return res.status(500).send(err);
      }
      res.send(result);
    });
  });

  // —— Vendedores (Via Protheus)
  router.get("/vendedores", async (req, res) => {
    const search = req.query.search || "";
    try {
      const pool = await getProtheusPool();
      const request = pool.request();

      // Usamos DISTINCT para evitar duplicatas (ex: mesmo vendedor em várias filiais)
      let query = `
        SELECT DISTINCT TOP 500 A3_NOME as nome 
        FROM SA3140 
        WHERE D_E_L_E_T_ = ''
      `;

      if (search) {
        request.input("search", sql.VarChar, `%${search}%`);
        query += " AND A3_NOME LIKE @search";
      }

      query += " ORDER BY A3_NOME";

      const { recordset } = await request.query(query);

      const vendedores = recordset.map((v) => ({
        // codigo: v.codigo.trim(), // Removido pois o DISTINCT foca no nome
        nome: v.nome ? v.nome.trim() : "",
      }));

      res.json(vendedores);
    } catch (err) {
      console.error("Erro ao buscar vendedores no Protheus:", err);
      // Fallback para tabela local
      const sqlSearch =
        "SELECT DISTINCT nome_vendedor as nome FROM vendedores WHERE nome_vendedor LIKE ? LIMIT 500";
      dbOcorrencias.query(
        sqlSearch,
        [`%${search}%`],
        (errMySQL, resultMySQL) => {
          if (errMySQL) {
            console.error("FALHA TOTAL: Erro também no MySQL:", errMySQL);
            // Retorna array vazio em vez de erro 500 para não quebrar o front
            return res.json([]);
          }
          res.json(resultMySQL.map((v) => ({ nome: v.nome })));
        }
      );
    }
  });

  // —— Marcar item de produto como deletado
  router.put("/ocorrencias/produto/:id", (req, res) => {
    const { id } = req.params;
    const { D_E_L_E_T_ } = req.body;

    if (!D_E_L_E_T_ || D_E_L_E_T_ !== "*") {
      return res.status(400).send({ message: "Invalid delete flag" });
    }

    const sqlCheckProduto = "SELECT * FROM itens_produto WHERE id = ?";
    dbOcorrencias.query(sqlCheckProduto, [id], (err, result) => {
      if (err) {
        console.error("Erro ao verificar se o produto existe:", err);
        return res.status(500).send(err);
      }

      if (result.length === 0) {
        return res.status(404).send({ message: "Produto não encontrado" });
      }

      const sqlUpdateProduto =
        "UPDATE itens_produto SET D_E_L_E_T_ = ? WHERE id = ?";
      dbOcorrencias.query(
        sqlUpdateProduto,
        [D_E_L_E_T_, id],
        (errU, resultU) => {
          if (errU) {
            console.error("Erro ao marcar produto como deletado:", errU);
            return res.status(500).send(errU);
          }
          if (resultU.affectedRows === 0) {
            return res.status(404).send({ message: "Produto não encontrado" });
          }
          res.send({ message: "Produto marcado como deletado com sucesso" });
        }
      );
    });
  });

  // —— Produtos da ocorrência (Atualizado para incluir 'departamento')
  router.get("/:id/produto", (req, res) => {
    const { id } = req.params;
    const sqlSelectProdutos =
      'SELECT id, produto_nome, produto_unidade, quantidade, valor, total, motivo, tipo, departamento, obs FROM itens_produto WHERE ocorrencia_id = ? AND D_E_L_E_T_ = ""'; // <== INCLUI 'departamento'
    dbOcorrencias.query(sqlSelectProdutos, [id], (err, result) => {
      if (err) {
        console.error("Erro ao buscar produtos da ocorrência:", err);
        return res.status(500).send(err);
      }
      res.send(result);
    });
  });

  // —— Reabrir ocorrência
  router.put("/:id/reabrir", (req, res) => {
    const { id } = req.params;

    const sqlUpdate =
      'UPDATE ocorrencias SET status = "PENDENTE", dataTratativa = NULL WHERE id = ? AND D_E_L_E_T_ = ""';

    dbOcorrencias.query(sqlUpdate, [id], (err, result) => {
      if (err) {
        console.error("Erro ao reabrir ocorrência:", err?.sqlMessage || err);
        return res.status(500).send({ message: "Erro ao reabrir ocorrência" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).send({ message: "Ocorrência não encontrada" });
      }

      const usuarioLog = req.user?.username || "SISTEMA";
      logOcorrencia(id, "REABERTURA", usuarioLog, `Ocorrência reaberta por ${usuarioLog}`);

      res.send({ message: "Ocorrência reaberta com sucesso" });
    });
  });

  // —— Detalhe da ocorrência — inclui `serie` para popular o modal
  router.get("/:id", (req, res) => {
    const { id } = req.params;

    const sqlSelectOcorrencia = `
  SELECT id, numero, remetente, data, cliente, fornecedor_cod, filial, descricao, 
         nota_fiscal, serie, nota_origem, valor, status, acao, dataTratativa, 
         bilhete, motorista, conferente, ajudante, vendedor, placa, obs, 
         created_at, updated_at, adicionado_pelo_app
   FROM ocorrencias
  WHERE id = ? AND D_E_L_E_T_ = ""`;

    const sqlSelectProdutos = `
  SELECT id, produto_nome, produto_unidade, quantidade, valor, total, motivo, tipo, departamento, obs 
    FROM itens_produto 
   WHERE ocorrencia_id = ? AND D_E_L_E_T_ = ""`; // <== INCLUI 'departamento'

    dbOcorrencias.query(sqlSelectOcorrencia, [id], (err, ocorrenciaResult) => {
      if (err) {
        console.error("Erro ao buscar ocorrência:", err);
        return res.status(500).send(err);
      }

      if (ocorrenciaResult.length === 0) {
        return res.status(404).send({ message: "Ocorrência não encontrada" });
      }

      dbOcorrencias.query(sqlSelectProdutos, [id], (err2, produtosResult) => {
        if (err2) {
          console.error("Erro ao buscar produtos:", err2);
          return res.status(500).send(err2);
        }

        const ocorrencia = ocorrenciaResult[0];
        ocorrencia.produtos = produtosResult;
        res.send(ocorrencia);
      });
    });
  });

  // —— Logs da Ocorrência
  router.get("/:id/logs", (req, res) => {
    const { id } = req.params;
    const sqlLogs = `SELECT * FROM ocorrencia_logs WHERE ocorrencia_id = ? ORDER BY data_hora DESC`;
    dbOcorrencias.query(sqlLogs, [id], (err, result) => {
      if (err) {
        console.error("Erro ao buscar logs da ocorrência:", err);
        return res.status(500).send(err);
      }
      res.send(result);
    });
  });

  return router;
};
