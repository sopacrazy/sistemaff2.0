// Polyfill para Node 20+ onde SlowBuffer foi removido
const { Buffer } = require("buffer");
if (!global.SlowBuffer) {
  global.SlowBuffer = Buffer;
}

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const sql = require("mssql");
const http = require("http");
const dotenv = require("dotenv");
const axios = require("axios");
const multer = require("multer");
const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { exec } = require("child_process");
const bodyParser = require("body-parser");
const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const ThermalPrinter = require("node-thermal-printer").printer;
const PrinterTypes = require("node-thermal-printer").types;
const router = express.Router();
const nodemailer = require("nodemailer");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const logger = require("./config/logger");
const authenticateToken = require("./authMiddleware"); // já existe
const ocorrenciaRoutes = require("./routes/ocorrenciaRoutes");
const relatoriosRoutes = require("./routes/relatoriosRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes"); // Importando as rotas do dashboard
const generatePdfReport = require("./routes/generatePdfReport");
const usuariosRoutes = require("./routes/usuariosRoutes");
const permissoesRoutes = require("./routes/permissoesRoutes");
const abastecimentoRoutes = require("./routes/abastecimentoRoutes"); // 🚨 Caminho correto
const deployRoutes = require("./routes/deploy");
const impressorasRoutes = require("./routes/impressoras");
const geralRoutes = require("./routes/geral");
const clientesRoute = require("./routes/clientes");
const chamadoRoutes = require("./routes/chamadoRoutes");
const relatoriosPublicRoutes = require("./routes/relatoriosPublicRoutes");

const generateFiadoVendedorSinteticoReport = require("./src/Financeiro/routes/generateFiadoVendedorSinteticoReport");
const generateFiadoVendedorAnaliticoReport = require("./src/Financeiro/routes/generateReport");
const generateVendedorReport = require("./src/Financeiro/routes/relvendedor");
const gerarPdfValidacao = require("./routes/pdfValidacao");
const exportarTransferencias = require("./routes/exportarTransferencias"); // ou o caminho correto
const relatoriosPublicFaltas = require("./routes/relatoriosPublicFaltas");
const roteirizacaoRoutes = require("./routes/roteirizacao");
const recruitAIRoutes = require("./routes/recruitAIRoutes");
const frotaRoutes = require("./routes/frotaRoutes");
const fiscalRoutes = require("./routes/fiscalRoutes");
const comprasRoutes = require("./routes/comprasRoutes");
const vendasReportRoutes = require("./routes/vendasReportRoutes");
const basquetaRoutes = require("./routes/basquetaRoutes");
const caixaRoutes = require("./routes/caixaRoutes");
const caixaAIRoutes = require("./routes/caixaAIRoutes");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
dayjs.extend(utc);
dayjs.extend(timezone);

dotenv.config();

// Credenciais do Azure AD (Microsoft Graph API)
const TENANT_ID = process.env.AZURE_TENANT_ID;
const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;

// Conectar ao banco de "registros"
const dbRegistros = mysql.createPool({
  host: process.env.DB_HOST_REGISTROS,
  user: process.env.DB_USER_REGISTROS,
  password: process.env.DB_PASSWORD_REGISTROS,
  database: process.env.DB_NAME_REGISTROS,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  timezone: 'Z',
});

// Conectar ao banco de "ocorrências"
const dbOcorrencias = mysql.createPool({
  host: process.env.DB_HOST_OCORRENCIAS,
  user: process.env.DB_USER_OCORRENCIAS,
  password: process.env.DB_PASSWORD_OCORRENCIAS,
  database: process.env.DB_NAME_OCORRENCIAS,
  waitForConnections: true,
  connectionLimit: 10, // Aumentado um pouco para evitar exaustão
  queueLimit: 0,
  connectTimeout: 20000,
  charset: "utf8mb4",
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  timezone: 'Z',
});

// Configurações do banco de dados PROTHEUS
const dbConfig = {
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  server: process.env.MSSQL_SERVER,
  database: process.env.MSSQL_DATABASE,
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === "true",
    trustServerCertificate: process.env.MSSQL_TRUST_SERVER_CERT === "true",
  },
  pool: {
    max: parseInt(process.env.MSSQL_POOL_MAX),
    min: parseInt(process.env.MSSQL_POOL_MIN),
    idleTimeoutMillis: parseInt(process.env.MSSQL_POOL_IDLE_TIMEOUT),
  },
  connectionTimeout: parseInt(process.env.MSSQL_CONNECTION_TIMEOUT),
  requestTimeout: parseInt(process.env.MSSQL_REQUEST_TIMEOUT),
};

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: true, // true para porta 465, false para outras
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ---- Permissão de Gestor (usa tabela users.tipo) ----
// ---- Permissão de Gestor (prefere dados do JWT; fallback no DB) ----
async function ensureGestor(req, res, next) {
  try {
    // 1) Se o authenticateToken preencheu req.user, usamos primeiro.
    const u = req.user || {};
    if (
      u &&
      (u.role === "gestor" ||
        (Array.isArray(u.permissoes) && u.permissoes.includes("GESTOR")))
    ) {
      return next();
    }

    // 2) Fallback: tentar identificar usuário para conferir no banco
    const username = (
      req.headers["x-user"] ||
      req.body?.username ||
      u?.username ||
      ""
    )
      .toString()
      .trim();

    if (!username) {
      return res.status(401).json({ erro: "Usuário não autenticado" });
    }

    const [rows] = await dbOcorrencias
      .promise()
      .query("SELECT tipo FROM users WHERE username = ?", [username]);

    if (!rows.length) {
      return res.status(403).json({ erro: "Usuário não encontrado" });
    }

    const tipo = (rows[0]?.tipo || "").toLowerCase();
    if (tipo === "gestor") {
      return next();
    }

    return res.status(403).json({ erro: "Acesso restrito a gestores" });
  } catch (err) {
    console.error("Erro em ensureGestor:", err);
    return res
      .status(500)
      .json({ erro: "Erro ao validar permissão de gestor" });
  }
}

// 1. Inicializar o APP e middlewares básicos antes de tudo
const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Pool global MSSQL mantido aberto e guardado no app.locals
let mssqlPool = null;

// Função resiliente para conectar ao Protheus (MSSQL)
async function connectToMSSQL(retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      if (mssqlPool) {
        try { await mssqlPool.close(); } catch (e) {}
      }
      
      const pool = await sql.connect(dbConfig);
      mssqlPool = pool;
      app.locals.mssqlPool = pool;

      // Listener para erros de conexão após o início
      pool.on('error', err => {
        logger.error('❌ Erro no pool MSSQL (Protheus):', err);
        mssqlPool = null;
        app.locals.mssqlPool = null;
        // Tenta reconectar em 5 segundos
        setTimeout(() => connectToMSSQL(3), 5000);
      });

      logger.info(`✅ Conectado ao banco PROTHEUS - Host: ${process.env.MSSQL_SERVER}`);
      return pool;
    } catch (err) {
      logger.error(`❌ Falha na tentativa ${i + 1} de conexão ao PROTHEUS:`, err.message);
      if (i < retries - 1) {
        logger.info(`Tentando reconectar em ${delay/1000}s...`);
        await new Promise(res => setTimeout(res, delay));
      }
    }
  }
  logger.error("🚫 Não foi possível conectar ao banco Protheus após várias tentativas.");
  return null;
}

// 2. Helper Global para obter o pool conectado
async function getMSSQLPool() {
  if (mssqlPool && mssqlPool.connected) return mssqlPool;
  return await connectToMSSQL();
}

// Iniciar conexão MSSQL
connectToMSSQL();

// Verificar conexão com os bancos de dados MySQL
dbRegistros.getConnection((err, connection) => {
  if (err) {
    logger.error("Erro ao conectar ao banco REGISTROS", {
      error: err.message,
      code: err.code,
    });
  } else {
    logger.info(
      `Conectado ao banco REGISTROS com sucesso! (Host: ${process.env.DB_HOST_REGISTROS})`
    );
    connection.release();
  }
});

dbOcorrencias.getConnection((err, connection) => {
  if (err) {
    logger.error("Erro ao conectar ao banco OCORRÊNCIAS", {
      error: err.message,
      code: err.code,
    });
  } else {
    logger.info(
      `Conectado ao banco OCORRÊNCIAS com sucesso! (Host: ${process.env.DB_HOST_OCORRENCIAS})`
    );
    connection.release();
  }
});

const checkPermission = require("./middleware/checkPermission")(dbOcorrencias);

// Configuração do multer para armazenar arquivos na pasta "uploads"
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

let cachedToken = null; // Token armazenado em cache
let tokenExpiry = null; // Tempo de expiração do token

// Função para obter o token de acesso do OneDrive
const getAccessToken = async () => {
  // Reutiliza o token se ele ainda for válido
  if (cachedToken && tokenExpiry > Date.now()) {
    return cachedToken;
  }

  // Solicita um novo token
  const response = await axios.post(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  // Armazena o token e a validade em cache
  cachedToken = response.data.access_token;
  tokenExpiry = Date.now() + response.data.expires_in * 1000; // Expira em 'expires_in' segundos
  return cachedToken;
};

// Aumentar limite de payload para permitir muitos produtos no pré-fechamento
// (Já configurado acima)

// CORS único e global
// CORS dinâmico para aceitar qualquer IP da rede local
const corsOptions = {
  origin: function (origin, callback) {
    // Lista de origens fixas (localhost, etc)
    const allowedOrigins = [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:3002",
      "http://127.0.0.1:3002",
      "http://localhost:3005",
      "http://127.0.0.1:3005",
      "http://localhost:3006",
      "http://127.0.0.1:3006",
      "http://localhost:3007",
      "http://127.0.0.1:3007",
    ];

    // Se não houver origin (ex: apps mobile ou ferramentas de teste), permite
    if (!origin) return callback(null, true);

    // Se estiver na lista fixa, permite
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    // Se for um IP de rede local (qualquer porta), permite dinamicamente
    if (origin.match(/^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/)) {
      return callback(null, true);
    }

    // BLOQUEIA outras origens desconhecidas por segurança
    console.warn(`[CORS] Origem bloqueada: ${origin}`);
    callback(new Error('Não permitido pelo CORS'));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-local",
    "x-user",
    "X-Local",
    "X-User",
    "Accept"
  ],
  exposedHeaders: ["x-local"],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ============================================
// RATE LIMITING - Proteção contra ataques
// ============================================

// Rate limiter RIGOROSO para rotas de autenticação (login)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Aumentei para 100 para evitar bloqueios frequentes
  standardHeaders: true, // Retorna info de rate limit nos headers `RateLimit-*`
  legacyHeaders: false, // Desabilita headers `X-RateLimit-*`
});

// Rate limiter MODERADO para APIs em geral
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máximo 100 requisições por IP
  message: {
    error: "Muitas requisições. Por favor, tente novamente mais tarde.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter SUAVE para rotas públicas
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // Máximo 200 requisições por IP
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// VALIDAÇÃO DE INPUTS
// ============================================

// Middleware para tratar erros de validação
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Dados inválidos",
      details: errors.array().map((err) => ({
        field: err.path || err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

// Validadores para rota de login
const loginValidation = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Usuário é obrigatório")
    .isLength({ min: 3, max: 50 })
    .withMessage("Usuário deve ter entre 3 e 50 caracteres")
    .matches(/^[a-zA-Z0-9._-]+$/)
    .withMessage("Usuário contém caracteres inválidos"),
  body("password")
    .notEmpty()
    .withMessage("Senha é obrigatória")
    .isLength({ min: 3 })
    .withMessage("Senha deve ter no mínimo 3 caracteres"),
  handleValidationErrors,
];

const wss = new WebSocket.Server({ noServer: true });

const url = require("url");

// Map para rastrear usuários online: { username: Set<ws> }
const usuariosOnlineMulti = new Map();

wss.on("connection", (ws, req) => {
  const { query } = url.parse(req.url, true);
  const username = (query.username || "").toString().trim();
  const local = (query.local || "").toString().trim();
  const ip = req.socket.remoteAddress || "desconhecido";
  const connectedAt = new Date();

  if (!username) {
    ws.close(1008, "Username obrigatório");
    return;
  }

  ws.meta = { username, local, connectedAt, ip };
  ws.isAlive = true;
  ws.on("pong", () => (ws.isAlive = true));

  const connectMsg = `[${new Date().toISOString()}] 🔌 WS CONNECT: ${username} | IP: ${ip}\n`;
  fs.appendFileSync("ws_logs.txt", connectMsg);

  // Adiciona ao Map de múltiplas conexões
  if (!usuariosOnlineMulti.has(username)) {
    usuariosOnlineMulti.set(username, new Set());
  }
  usuariosOnlineMulti.get(username).add(ws);



  // Remove usuário quando desconectar
  ws.on("close", () => {
    const disconnectMsg = `[${new Date().toISOString()}] ❌ WS CLOSE: ${username}\n`;
    fs.appendFileSync("ws_logs.txt", disconnectMsg);
    const userConnections = usuariosOnlineMulti.get(username);
    if (userConnections) {
      userConnections.delete(ws);
      if (userConnections.size === 0) {
        usuariosOnlineMulti.delete(username);
      }
    }

  });

  ws.on("error", (error) => {
    console.error(`Erro WebSocket para ${username}:`, error);
    const userConnections = usuariosOnlineMulti.get(username);
    if (userConnections) {
      userConnections.delete(ws);
      if (userConnections.size === 0) {
        usuariosOnlineMulti.delete(username);
      }
    }
  });
});

setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// 5) util de broadcast (depois do wss)
function sendAnnouncement(payload, targetLocal = null) {
  const msg = JSON.stringify({ tipo: "announcement", ...payload });
  wss.clients.forEach((client) => {
    if (client.readyState !== WebSocket.OPEN) return;
    if (targetLocal && client.meta?.local !== targetLocal) return;
    client.send(msg);
  });
}

// 4. Função para enviar notificações
function enviarNotificacao(cliente) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          tipo: "entregaConcluida",
          cliente: cliente.nome,
          entregaId: cliente.entregaId,
        })
      );
    }
  });
}

function notifyUserByUsername(username, payload) {
  const normalize = (s) => (s || "").toString().trim().toLowerCase();
  const searchName = normalize(username);

  const logMsg = `[${new Date().toISOString()}] Tentando notificar: ${username} | Payload: ${payload.tipo}\n`;
  fs.appendFileSync("ws_logs.txt", logMsg);



  // Tentar busca exata e busca case-insensitive
  let targetConnections = usuariosOnlineMulti.get(username);

  if (!targetConnections) {
    for (let [u, conns] of usuariosOnlineMulti.entries()) {
      if (normalize(u) === searchName) {
        targetConnections = conns;
        break;
      }
    }
  }

  if (targetConnections && targetConnections.size > 0) {
    let sentCount = 0;
    targetConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
        sentCount++;
      }
    });
    const successMsg = `✅ [WS] Sucesso: ${username} (${sentCount} conns)\n`;
    fs.appendFileSync("ws_logs.txt", successMsg);

    return sentCount > 0;
  } else {
    const online = Array.from(usuariosOnlineMulti.keys());
    const failMsg = `⚠️ [WS] Falha: ${username} não encontrado. Online: [${online.join(", ")}]\n`;
    fs.appendFileSync("ws_logs.txt", failMsg);

    return false;
  }
}

// --- MONITORAMENTO PROATIVO DE CHAMADOS (POLLING EXTERNO) ---
// Detecta alterações feitas por outros sistemas diretamente no banco de dados
const lastChamadoStatus = new Map();
let lastPolledChatId = 0;

async function initChamadoMonitor() {
  try {
    const [chamados] = await dbOcorrencias.promise().query('SELECT id, status FROM chamados');
    chamados.forEach(c => lastChamadoStatus.set(c.id, c.status));

    const [chat] = await dbOcorrencias.promise().query('SELECT MAX(id) as maxId FROM chamado_chat');
    lastPolledChatId = chat[0].maxId || 0;


  } catch (err) {
    console.error('❌ Erro ao inicializar monitor de chamados:', err);
  }
}

async function checkExternalChanges() {
  try {
    // 1. Monitorar mudanças de Status
    const [chamados] = await dbOcorrencias.promise().query('SELECT id, status, solicitante_nome, titulo FROM chamados');
    for (const c of chamados) {
      const oldStatus = lastChamadoStatus.get(c.id);

      // Se o status mudou e não é a primeira vez que vemos o chamado
      if (oldStatus !== undefined && oldStatus !== c.status) {
        console.log(`📢 [POLL] Status atualizado no banco: #${c.id} (${oldStatus} -> ${c.status})`);

        notifyUserByUsername(c.solicitante_nome, {
          tipo: 'movimentacao_chamado',
          chamado_id: c.id,
          titulo: c.titulo,
          status_novo: c.status,
          timestamp: new Date()
        });
      }
      lastChamadoStatus.set(c.id, c.status);
    }

    // 2. Monitorar Novas Mensagens (vinda de técnicos no outro sistema)
    const [mensagens] = await dbOcorrencias.promise().query(
      'SELECT id, chamado_id, remetente_tipo, remetente_nome FROM chamado_chat WHERE id > ?',
      [lastPolledChatId]
    );

    for (const m of mensagens) {
      // Registrar que já vimos este ID
      if (m.id > lastPolledChatId) lastPolledChatId = m.id;

      // Só notifica se a mensagem NÃO for do tipo 'usuario' (supostamente vinda do suporte)
      if (m.remetente_tipo !== 'usuario') {
        const [chamado] = await dbOcorrencias.promise().query('SELECT solicitante_nome, titulo FROM chamados WHERE id = ?', [m.chamado_id]);
        if (chamado.length > 0) {
          console.log(`📢 [POLL] Nova mensagem externa detectada: #${m.chamado_id} por ${m.remetente_nome}`);
          notifyUserByUsername(chamado[0].solicitante_nome, {
            tipo: 'mensagem_chamado',
            chamado_id: m.chamado_id,
            titulo: chamado[0].titulo,
            remetente: m.remetente_nome,
            timestamp: new Date()
          });
        }
      }
    }
  } catch (err) {
    console.error('❌ Erro no ciclo de polling de chamados:', err);
  }
}

// Iniciar polling (aguarda 10s para estabilizar conexões)
setTimeout(() => {
  initChamadoMonitor().then(() => {
    setInterval(checkExternalChanges, 10000); // Checa a cada 10 segundos
  });
}, 10000);

// Em seu arquivo server.js (ou onde a função estiver)

// Em seu arquivo server.js

function formatarEmailDevolucaoHTML(data) {
  // Função auxiliar para formatar valores como moeda brasileira
  const formatarMoeda = (valor) => {
    return new Number(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const dataFormatada = new Date(data.data).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });

  const produtosRows = data.produtos
    .map(
      (p) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${p.nome}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${p.quantidade
        } ${p.unidade}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatarMoeda(
          p.valor
        )}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatarMoeda(
          p.total
        )}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${p.motivo}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${p.tipo}</td>
    </tr>
  `
    )
    .join("");

  const valorTotalGeral = data.produtos.reduce(
    (acc, p) => acc + Number(p.total || 0),
    0
  );

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #f4f4f4; padding: 20px; }
        .container { max-width: 680px; margin: auto; background: #ffffff; padding: 20px; border: 1px solid #eee; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05); }
        .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eee; }
        .header img { max-width: 150px; height: auto; }
        .header h1 { margin: 10px 0; color: #333; font-size: 24px; }
        .header h2 { margin: 5px 0; color: #555; font-size: 18px; font-weight: bold; } /* Estilo para o Remetente */
        .content { margin-top: 20px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;}
        .info-item p { margin: 5px 0; color: #555; font-size: 14px; }
        .info-item strong { color: #000; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
        th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
        th { background-color: #f8f8f8; font-weight: bold; }
        tfoot td { font-weight: bold; text-align: right; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://i.imgur.com/t52j0rM.png" alt="Logo da Empresa"/>
          <h1>Notificação de Devolução</h1>
          <h2>${data.remetente}</h2>
        </div>
        <div class="content">
          <p>Uma nova ocorrência de devolução foi registrada no sistema.</p>
          <div class="info-grid">
            <div class="info-item">
              <p><strong>Nº da Ocorrência:</strong> ${data.numero}</p>
              <p><strong>Nº da Devolução (NF):</strong> ${data.notaFiscal}</p>
              <p><strong>Cliente:</strong> ${data.cliente}</p>
            </div>
            <div class="info-item">
              <p><strong>Data:</strong> ${dataFormatada}</p>
              <p><strong>Vendedor:</strong> ${data.vendedor}</p>
              <p><strong>Motorista:</strong> ${data.motorista}</p>
            </div>
          </div>
          <h3>Produtos Envolvidos</h3>
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Quantidade</th>
                <th>Valor</th>
                <th>Total</th>
                <th>Motivo</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              ${produtosRows}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="text-align: right; font-weight: bold;">Valor Total da Devolução:</td>
                <td colspan="3" style="text-align: right; font-weight: bold; background-color: #f8f8f8;">${formatarMoeda(
    valorTotalGeral
  )}</td>
              </tr>
            </tfoot>
          </table>
          ${data.descricao
      ? `<p style="margin-top: 20px;"><strong>Observação Geral:</strong> ${data.descricao}</p>`
      : ""
    }
        </div>
      </div>
    </body>
    </html>
  `;
}

app.use("/ocorrencias", authenticateToken, ocorrenciaRoutes(dbOcorrencias));
app.use("/relatorios", relatoriosRoutes(dbOcorrencias));
app.use("/dashboard", dashboardRoutes(dbOcorrencias));
app.use("/usuarios", usuariosRoutes(dbOcorrencias));
app.use("/permissoes", permissoesRoutes(dbOcorrencias));
app.use("/api", router);
app.use("/", deployRoutes);
app.use(impressorasRoutes);
app.use("/api", geralRoutes);
app.use("/api", clientesRoute);
app.use("/chamados", chamadoRoutes(dbOcorrencias, notifyUserByUsername));
app.use("/", exportarTransferencias);
app.use("/api", abastecimentoRoutes(dbOcorrencias, mssqlPool));
app.get("/api/debug-ws", (req, res) => {
  const online = {};
  usuariosOnlineMulti.forEach((set, user) => {
    online[user] = set.size;
  });
  res.json({
    online,
    totalUsers: Object.keys(online).length,
    timestamp: new Date().toISOString()
  });
});

app.get("/api/debug-notify", (req, res) => {
  const { username } = req.query;
  const success = notifyUserByUsername(username, {
    tipo: 'movimentacao_chamado',
    chamado_id: 999,
    titulo: 'TESTE DE NOTIFICAÇÃO',
    status_novo: 'TESTE',
    timestamp: new Date()
  });
  res.json({ success, username });
});

// Redundância para debug (sem /api)
app.get("/debug-notify", (req, res) => {
  const { username } = req.query;
  const success = notifyUserByUsername(username, {
    tipo: 'movimentacao_chamado',
    chamado_id: 999,
    titulo: 'TESTE DE NOTIFICAÇÃO',
    status_novo: 'TESTE',
    timestamp: new Date()
  });
  res.json({ success, username });
});

app.use(
  "/dashboard",
  authenticateToken,
  checkPermission("DASHBOARD"),
  dashboardRoutes(dbOcorrencias)
);
app.use("/relatorios-public", relatoriosPublicFaltas(dbOcorrencias));
app.use("/relatorios-public", relatoriosPublicRoutes(dbOcorrencias)); // ✅ esta
app.use("/relatorios-public", relatoriosPublicRoutes(dbOcorrencias)); // ✅ esta
app.use("/roteirizacao", roteirizacaoRoutes);
app.use("/frota", frotaRoutes(dbRegistros, dbOcorrencias));
app.use("/api", fiscalRoutes(() => mssqlPool));
app.use("/api/compras", comprasRoutes(() => mssqlPool));
app.use("/api/vendas-report", vendasReportRoutes(() => mssqlPool));
app.use("/api/basquetas", basquetaRoutes(dbOcorrencias, () => mssqlPool));
app.use("/api/caixa", caixaRoutes(() => mssqlPool, authenticateToken));
app.use("/api/caixa-ai", caixaAIRoutes(() => mssqlPool, authenticateToken));

// Rota pública para /api/rh/candidates (sem restrição de permissão, apenas autenticação)
app.get("/api/rh/candidates", authenticateToken, async (req, res) => {
  try {
    const fs = require("fs").promises;
    const path = require("path");
    const pdfParse = require("pdf-parse");

    // Configuração da pasta de candidatos
    let candidatosFolder =
      process.env.CANDIDATOS_FOLDER ||
      (process.platform === "win32"
        ? "C:\\candidatos"
        : path.join(__dirname, "uploads/candidatos"));

    // Verifica se a pasta existe
    try {
      await fs.access(candidatosFolder);
    } catch {
      candidatosFolder = path.join(__dirname, "uploads/candidatos");
      try {
        await fs.access(candidatosFolder);
      } catch {
        await fs.mkdir(candidatosFolder, { recursive: true });
        return res.json({
          success: true,
          candidatos: [],
          total: 0,
          message: `Pasta de candidatos não encontrada. Criada pasta em: ${candidatosFolder}. Por favor, adicione arquivos PDF nesta pasta.`,
        });
      }
    }

    // Importa funções necessárias do recruitAIRoutes
    const recruitAIRoutesModule = require("./routes/recruitAIRoutes");

    // Passo 1: Lista todos os arquivos PDF da pasta
    const files = await fs.readdir(candidatosFolder);
    const pdfFiles = files.filter(
      (file) => path.extname(file).toLowerCase() === ".pdf"
    );

    if (pdfFiles.length === 0) {
      return res.json({
        success: true,
        candidatos: [],
        total: 0,
        message: `Nenhum arquivo PDF encontrado na pasta: ${candidatosFolder}`,
      });
    }

    // Passo 2: Carrega o cache
    const cache = await recruitAIRoutesModule.loadTalentosCache();

    // Cria um mapa do cache usando o nome do arquivo como chave
    const cacheMap = new Map();
    cache.forEach((item) => {
      if (item.arquivo) {
        cacheMap.set(item.arquivo, item);
      }
    });

    // Passo 3: Identifica arquivos novos (não estão no cache)
    const novosArquivos = pdfFiles.filter((file) => !cacheMap.has(file));
    const arquivosEmCache = pdfFiles.filter((file) => cacheMap.has(file));

    console.log(
      `📄 Encontrados ${pdfFiles.length} arquivos PDF em ${candidatosFolder}`
    );
    console.log(
      `📦 ${arquivosEmCache.length} arquivos em cache, ${novosArquivos.length} arquivos novos`
    );

    // Passo 4: Processa apenas os arquivos novos
    const novosResultados = [];

    if (novosArquivos.length > 0) {
      console.log(
        `📊 Processando ${novosArquivos.length} arquivos novos`
      );

      for (let i = 0; i < novosArquivos.length; i++) {
        const pdfFile = novosArquivos[i];
        const filePath = path.join(candidatosFolder, pdfFile);

        try {
          console.log(`🔍 Processando: ${pdfFile} (${i + 1}/${novosArquivos.length})`);

          // Extrai texto do PDF
          const dadosPDF = await recruitAIRoutesModule.extractTextFromPDF(filePath);
          if (
            !dadosPDF ||
            !dadosPDF.texto ||
            dadosPDF.texto.trim().length === 0
          ) {
            console.warn(`⚠️  PDF vazio ou inválido: ${pdfFile}`);
            continue;
          }

          // Estrutura dados com IA
          const dadosEstruturados = await recruitAIRoutesModule.structureCandidateWithAI(
            dadosPDF.texto
          );

          novosResultados.push({
            id: pdfFile, // Usar nome do arquivo como ID
            arquivo: pdfFile,
            ...dadosEstruturados,
            texto_completo: dadosPDF.texto.substring(0, 5000), // Para o modal de detalhes
          });
        } catch (error) {
          console.error(`❌ Erro ao processar ${pdfFile}:`, error.message);
          continue;
        }
      }

      console.log(
        `✅ Processamento concluído: ${novosResultados.length} novos candidatos estruturados`
      );
    } else {
      console.log(`✅ Nenhum arquivo novo para processar. Usando apenas cache.`);
    }

    // Passo 5: Atualiza o cache com os novos resultados
    // Remove do cache arquivos que não existem mais na pasta
    const cacheAtualizado = cache.filter((item) => pdfFiles.includes(item.arquivo));

    // Adiciona os novos resultados ao cache
    cacheAtualizado.push(...novosResultados);

    // Salva o cache apenas se houver mudanças (novos resultados ou arquivos removidos)
    const houveMudancasTalentos = novosResultados.length > 0 || cacheAtualizado.length !== cache.length;
    if (houveMudancasTalentos) {
      await recruitAIRoutesModule.saveTalentosCache(cacheAtualizado);
    } else {
      console.log(`💾 Cache não precisa ser atualizado (sem mudanças)`);
    }

    // Passo 6: Combina cache e novos resultados, mas filtra apenas arquivos que existem na pasta
    const candidatosCompletos = cacheAtualizado.filter((item) =>
      pdfFiles.includes(item.arquivo)
    );

    console.log(
      `📊 Total de candidatos retornados: ${candidatosCompletos.length} (${arquivosEmCache.length} do cache + ${novosResultados.length} novos)`
    );

    res.json({
      success: true,
      candidatos: candidatosCompletos,
      total: candidatosCompletos.length,
      cache_info: {
        do_cache: arquivosEmCache.length,
        novos_processados: novosResultados.length,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao processar candidatos:", error);
    res.status(500).json({
      success: false,
      error: "Erro interno ao processar candidatos.",
      details: error.message,
    });
  }
});

// Rota pública para /api/rh/rank-candidates (sem restrição de permissão, apenas autenticação)
app.post("/api/rh/rank-candidates", authenticateToken, async (req, res) => {
  console.log("✅ [Rota Específica] POST /api/rh/rank-candidates chamada - SEM restrição de permissão");
  try {
    const { descricao_vaga } = req.body;

    if (!descricao_vaga || !descricao_vaga.trim()) {
      return res.status(400).json({
        error: "A descrição da vaga é obrigatória.",
      });
    }

    const fs = require("fs").promises;
    const path = require("path");

    // Limite de processamento por requisição (evita custos excessivos)
    const MAX_PDFS_PER_REQUEST = parseInt(
      process.env.MAX_PDFS_PER_REQUEST || "50"
    );

    // Configuração da pasta de candidatos
    let candidatosFolder =
      process.env.CANDIDATOS_FOLDER ||
      (process.platform === "win32"
        ? "C:\\candidatos"
        : path.join(__dirname, "uploads/candidatos"));

    // Verifica se a pasta existe
    try {
      await fs.access(candidatosFolder);
    } catch {
      candidatosFolder = path.join(__dirname, "uploads/candidatos");
      try {
        await fs.access(candidatosFolder);
      } catch {
        await fs.mkdir(candidatosFolder, { recursive: true });
        return res.status(404).json({
          error: `Pasta de candidatos não encontrada. Criada pasta em: ${candidatosFolder}. Por favor, adicione arquivos PDF nesta pasta e tente novamente.`,
        });
      }
    }

    // Importa funções necessárias do recruitAIRoutes
    const recruitAIRoutesModule = require("./routes/recruitAIRoutes");

    // Passo 1: Lista todos os arquivos PDF da pasta
    const files = await fs.readdir(candidatosFolder);
    const pdfFiles = files.filter(
      (file) => path.extname(file).toLowerCase() === ".pdf"
    );

    if (pdfFiles.length === 0) {
      return res.status(404).json({
        error: `Nenhum arquivo PDF encontrado na pasta: ${candidatosFolder}. Por favor, adicione arquivos PDF nesta pasta.`,
      });
    }

    // Passo 2: Carrega o cache
    const cache = await recruitAIRoutesModule.loadRankingCache();

    // Cria um mapa do cache usando o nome do arquivo como chave
    const cacheMap = new Map();
    cache.forEach((item) => {
      if (item.arquivo) {
        cacheMap.set(item.arquivo, item);
      }
    });

    // Passo 3: Identifica arquivos novos (não estão no cache)
    const novosArquivos = pdfFiles.filter((file) => !cacheMap.has(file));
    const arquivosEmCache = pdfFiles.filter((file) => cacheMap.has(file));

    console.log(
      `📄 Encontrados ${pdfFiles.length} arquivos PDF em ${candidatosFolder}`
    );
    console.log(
      `📦 ${arquivosEmCache.length} arquivos em cache, ${novosArquivos.length} arquivos novos`
    );

    // Passo 4: Processa apenas os arquivos novos (limitado)
    const novosParaProcessar = novosArquivos.slice(0, MAX_PDFS_PER_REQUEST);
    const novosResultados = [];

    if (novosParaProcessar.length > 0) {
      console.log(
        `📊 Processando ${novosParaProcessar.length} arquivos novos (limite: ${MAX_PDFS_PER_REQUEST})`
      );

      for (const pdfFile of novosParaProcessar) {
        const filePath = path.join(candidatosFolder, pdfFile);
        console.log(
          `🔍 Processando: ${pdfFile} (${novosResultados.length + 1}/${novosParaProcessar.length})`
        );

        try {
          // Extrai texto e informações do PDF
          const dadosPDF = await recruitAIRoutesModule.extractTextFromPDF(filePath);
          if (!dadosPDF || !dadosPDF.texto || dadosPDF.texto.trim().length === 0) {
            console.warn(`⚠️  PDF vazio ou inválido: ${pdfFile}`);
            continue;
          }

          // Limita o texto a 2000 caracteres para reduzir custos de tokens na IA
          const texto = dadosPDF.texto.substring(0, 2000);
          if (dadosPDF.texto.length > 2000) {
            console.log(
              `   ℹ️  Texto limitado a 2000 caracteres (original: ${dadosPDF.texto.length} caracteres)`
            );
          }

          // Limita a descrição da vaga também
          const descricaoLimitada = descricao_vaga.substring(0, 1000);

          // Analisa com IA
          const analise = await recruitAIRoutesModule.analyzeCandidateWithAI(
            texto,
            descricaoLimitada
          );

          // Usa o nome extraído do PDF se disponível, senão usa o da IA
          const nomeFinal =
            dadosPDF.informacoes?.nome || analise.nome_candidato || "Candidato";

          novosResultados.push({
            arquivo: pdfFile,
            nome_candidato: nomeFinal,
            match_score: analise.match_score,
            justificativa: analise.justificativa,
            pontos_fortes: analise.pontos_fortes || [],
            pontos_atencao: analise.pontos_atencao || [],
            informacoes_completas: dadosPDF.informacoes,
            texto_completo: dadosPDF.texto.substring(0, 5000),
          });
        } catch (error) {
          console.error(`❌ Erro ao processar ${pdfFile}:`, error.message);
          continue;
        }
      }

      console.log(
        `✅ Processamento concluído: ${novosResultados.length} novos candidatos processados`
      );
    } else {
      console.log(`✅ Nenhum arquivo novo para processar. Usando apenas cache.`);
    }

    // Passo 5: Atualiza o cache com os novos resultados
    // Remove do cache arquivos que não existem mais na pasta
    const cacheAtualizado = cache.filter((item) => pdfFiles.includes(item.arquivo));

    // Adiciona os novos resultados ao cache
    cacheAtualizado.push(...novosResultados);

    // Salva o cache apenas se houver mudanças (novos resultados ou arquivos removidos)
    const houveMudancasRanking = novosResultados.length > 0 || cacheAtualizado.length !== cache.length;
    if (houveMudancasRanking) {
      await recruitAIRoutesModule.saveRankingCache(cacheAtualizado);
    } else {
      console.log(`💾 Cache não precisa ser atualizado (sem mudanças)`);
    }

    // Passo 6: Combina cache e novos resultados, mas filtra apenas arquivos que existem na pasta
    const resultadosCompletos = cacheAtualizado.filter((item) =>
      pdfFiles.includes(item.arquivo)
    );

    // Ordena por match_score (maior primeiro)
    resultadosCompletos.sort((a, b) => b.match_score - a.match_score);

    console.log(
      `📊 Total de candidatos retornados: ${resultadosCompletos.length} (${arquivosEmCache.length} do cache + ${novosResultados.length} novos)`
    );

    // Aviso se houver mais PDFs novos não processados
    const aviso =
      novosArquivos.length > MAX_PDFS_PER_REQUEST
        ? ` (${novosArquivos.length - MAX_PDFS_PER_REQUEST
        } PDFs novos restantes não processados - limite de ${MAX_PDFS_PER_REQUEST} por requisição)`
        : "";

    res.json({
      success: true,
      total_candidatos: resultadosCompletos.length,
      total_pdfs_encontrados: pdfFiles.length,
      candidatos: resultadosCompletos,
      cache_info: {
        do_cache: arquivosEmCache.length,
        novos_processados: novosResultados.length,
        novos_pendentes: Math.max(0, novosArquivos.length - novosParaProcessar.length),
      },
      aviso: aviso || undefined,
    });
  } catch (error) {
    console.error("❌ Erro ao processar candidatos:", error);
    res.status(500).json({
      error: "Erro interno ao processar candidatos.",
      details: error.message,
    });
  }
});

// Rotas RH - apenas autenticação básica, sem restrição de permissão
app.use(
  "/api/rh",
  authenticateToken,
  recruitAIRoutes
);
app.use(
  "/ocorrencias",
  authenticateToken,
  checkPermission("OCORRÊNCIAS"),
  ocorrenciaRoutes(dbOcorrencias)
);
app.use("/relatorios", authenticateToken, checkPermission("EXP PDF"));
// 🔓 ROTAS PÚBLICAS (sem auth) – monte ANTES das protegidas
//app.use("/relatorios-public", relatoriosPublicRoutes(dbOcorrencias));

app.use("/gerenciador", authenticateToken, checkPermission("GERENCIADOR"));

app.post("/admin/broadcast-dev", (req, res) => {
  const { title, body, level = "info", targetLocal = null } = req.body || {};
  sendAnnouncement(
    {
      id: "dev-" + Date.now(),
      title,
      body,
      level,
      requireAck: true,
      createdAt: new Date().toISOString(),
    },
    targetLocal
  );

  res.json({ ok: true });
});

// Converte "YYYY-MM-DD" (ou Date) -> "YYYYMMDD" (Protheus). Se já vier "YYYYMMDD", mantém.
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

// ===================== PREÇOS DE COMPRA (SZ5140) =====================
async function buscarPrecosCompraPorCod(dataISO, codigos, poolMSSQL) {
  // Normaliza data "YYYY-MM-DD" → "YYYYMMDD"
  const dataProth = toProtheusDate(dataISO);
  if (!dataProth || !codigos?.length) {
    return new Map();
  }

  // Normaliza e deduplica códigos (remove não-dígitos)
  const codsSan = Array.from(
    new Set(codigos.map((c) => String(c).replace(/\D/g, "")).filter(Boolean))
  );
  if (!codsSan.length) {
    return new Map();
  }

  // Verifica se o pool está disponível
  if (!poolMSSQL) {
    return new Map();
  }

  // Monta parâmetros @c0, @c1, ...
  const values = codsSan.map((_, i) => `(@c${i})`).join(",");
  const request = new sql.Request(poolMSSQL);

  request.input("data", sql.VarChar(8), dataProth);
  codsSan.forEach((c, i) => request.input(`c${i}`, sql.VarChar(30), c));

  // Consulta melhorada: busca preços <= data (fallback para data mais recente)
  // Se não encontrar na data exata, busca o preço mais recente disponível
  const query = `
    WITH cods(cod) AS (SELECT * FROM (VALUES ${values}) v(cod)),
    base AS (
      SELECT
        cod   = REPLACE(LTRIM(RTRIM(SZ5.Z5_CODPRO)), '.', ''),
        data  = SZ5.Z5_DATA,
        preco = CAST(SZ5.Z5_COMPRA AS DECIMAL(18,4)),
        rn    = ROW_NUMBER() OVER (
                  PARTITION BY REPLACE(LTRIM(RTRIM(SZ5.Z5_CODPRO)), '.', '')
                  ORDER BY SZ5.Z5_DATA DESC, SZ5.R_E_C_N_O_ DESC
                )
      FROM SZ5140 AS SZ5 WITH (NOLOCK)
      WHERE SZ5.D_E_L_E_T_ = ''
        AND SZ5.Z5_DATA <= @data
        AND SZ5.Z5_FILIAL = '01'
        AND SZ5.Z5_COMPRA IS NOT NULL
        AND SZ5.Z5_COMPRA <> ''
        AND SZ5.Z5_COMPRA <> '0'
    )
    SELECT b.cod, b.preco, b.data AS data_preco
    FROM base b
    INNER JOIN cods c ON c.cod = b.cod
    WHERE b.rn = 1
  `;

  let recordset = [];
  try {
    const result = await request.query(query);
    recordset = result.recordset || [];
  } catch (error) {
    console.error(`[PREÇOS COMPRA] Erro ao executar query:`, error.message);
    throw error;
  }

  const mapa = new Map();
  for (const r of recordset) {
    const preco = Number(r.preco);
    if (preco > 0) {
      mapa.set(String(r.cod), preco);
    }
  }

  return mapa;
}

// No seu arquivo server.js

app.post("/api/enviar-email-devolucao", async (req, res) => {
  const ocorrenciaData = req.body;

  if (!ocorrenciaData) {
    return res
      .status(400)
      .json({ error: "Dados da ocorrência não fornecidos." });
  }

  try {
    const info = await transporter.sendMail({
      from: `"Sistema de Ocorrências" <${process.env.EMAIL_USER}>`,
      to: process.env.ETANA_EMAIL_RECIPIENT,
      // <<< ALTERAÇÃO AQUI >>>
      subject: `Devolução ${ocorrenciaData.remetente} - NF: ${ocorrenciaData.notaFiscal}`,
      html: formatarEmailDevolucaoHTML(ocorrenciaData),
    });
    res.status(200).json({ message: "E-mail enviado com sucesso!" });
  } catch (error) {
    console.error("Erro ao enviar e-mail:", error);
    res.status(500).json({ error: "Falha ao enviar e-mail." });
  }
});



// 7) rota admin de broadcast (depois de app existir)
app.post("/admin/broadcast", authenticateToken, ensureGestor, (req, res) => {
  const {
    title = "Aviso",
    body = "",
    level = "info",
    requireAck = true,
    ttlSec = 1800,
    id = Date.now().toString(),
    targetLocal = null,
  } = req.body || {};
  sendAnnouncement(
    {
      id,
      title,
      body,
      level,
      requireAck,
      ttlSec,
      createdAt: new Date().toISOString(),
    },
    targetLocal
  );
  res.json({ ok: true });
});

// TOPO DO ARQUIVO OU ANTES DAS ROTAS
async function syncComprasMercadoria(req, res) {
  const origemUsuario = req?.headers?.["x-local"] || null;

  console.log(
    `🔄 Iniciando sincronização de compras para LOCAL: ${origemUsuario}`
  );

  try {
    const sqlPool = await getMSSQLPool();
    if (!sqlPool) throw new Error("Banco Protheus indisponível");
    
    const request = sqlPool.request();
    const mysqlConn = await dbOcorrencias.promise().getConnection();

    // ---------------- COMPRAS ---------------- //
    // Busca compras do local do usuário (em aberto E efetivadas)
    const resultHeader = await request.query(`
    SELECT Z2_CODCAR, Z2_CHEGADA, Z2_DESCRI, Z2_MOTORIS, Z2_OBSCAPA, Z2_LOCAL, Z2_TM
    FROM SZ2140
    WHERE Z2_FILIAL = '01' 
      AND D_E_L_E_T_ = ''
      ${origemUsuario ? `AND Z2_LOCAL = '${origemUsuario}'` : ""}
  `);

    const headers = resultHeader.recordset;

    for (const head of headers) {
      const efetivada = head.Z2_TM === "S" ? 1 : 0;

      await mysqlConn.query(
        `INSERT INTO compras_mercadoria 
       (codigo, chegada, descricao, motorista, observacao, local)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         chegada = VALUES(chegada),
         descricao = VALUES(descricao),
         motorista = VALUES(motorista),
         observacao = VALUES(observacao),
         local = VALUES(local)`,
        [
          head.Z2_CODCAR,
          formatData(head.Z2_CHEGADA),
          head.Z2_DESCRI,
          head.Z2_MOTORIS,
          head.Z2_OBSCAPA,
          String(head.Z2_LOCAL || origemUsuario)
            .trim()
            .padStart(2, "0"),
        ]
      );

      // Busca itens (em aberto E efetivados)
      const itensResult = await request.query(`
      SELECT 
        Z1_CODCAR, 
        MAX(Z1_DATCAR) AS Z1_DATCAR, 
        Z1_CODPRO, 
        MAX(Z1_DESCPRO) AS Z1_DESCPRO, 
        MAX(Z1_CODFOR) AS Z1_CODFOR, 
        MAX(Z1_FORNEC) AS Z1_FORNEC, 
        SUM(Z1_QTDE) AS Z1_QTDE, 
        MIN(Z1_PRECO) AS Z1_PRECO, 
        SUM(Z1_TOTAL) AS Z1_TOTAL,
        MAX(Z1_PROC) AS Z1_PROC
      FROM SZ1140
      WHERE 
        Z1_FILIAL = '01' 
        AND D_E_L_E_T_ = ''
        AND Z1_CODCAR = '${head.Z2_CODCAR}'
      GROUP BY 
        Z1_CODCAR, 
        Z1_CODPRO
    `);

      const itens = itensResult.recordset;

      for (const item of itens) {
        const dataFormatada = formatData(item.Z1_DATCAR);
        const efetivadaItem = item.Z1_PROC === "1" ? 1 : 0;

        await mysqlConn.query(
          `INSERT INTO compras_mercadoria_itens 
         (codcar, datcar, codpro, descpro, codfor, fornec, qtde, preco, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           descpro = VALUES(descpro),
           codfor = VALUES(codfor),
           fornec = VALUES(fornec),
           qtde = VALUES(qtde),
           preco = VALUES(preco),
           total = VALUES(total)`,
          [
            item.Z1_CODCAR,
            dataFormatada,
            item.Z1_CODPRO?.trim(),
            item.Z1_DESCPRO,
            item.Z1_CODFOR,
            item.Z1_FORNEC,
            item.Z1_QTDE,
            item.Z1_PRECO,
            item.Z1_TOTAL,
          ]
        );
      }
    }

    console.log(
      `✅ Sincronização de compras concluída: ${headers.length} compras do LOCAL ${origemUsuario}`
    );

    // ---------------- SALDOS (COMENTADO - muito lento) ---------------- //
    // const dataSaldoHoje = req.body?.data || new Date().toISOString().slice(0, 10);
    // const resultSaldo = await request.query(`
    //   SELECT
    //     B2.B2_FILIAL AS filial,
    //     B2.B2_COD AS cod_produto,
    //     B2.B2_LOCAL AS local2,
    //     B1.B1_DESC AS nome_produto,
    //     SUM(B2.B2_QATU) AS saldo_total
    //   FROM SB2140 B2
    //   JOIN SB1140 B1 ON B2.B2_COD = B1.B1_COD
    //   WHERE B2.B2_FILIAL = '01' AND B2.D_E_L_E_T_ = '' AND B2.B2_QATU <> 0
    //   GROUP BY B2.B2_FILIAL, B2.B2_COD, B1.B1_DESC, B2.B2_LOCAL
    // `);

    // const saldos = resultSaldo.recordset;

    /* REMOVIDO: Sincronização de saldos (muito lento)
  for (const saldo of saldos) {
    const codProduto = saldo.cod_produto?.trim(); // <-- resolve espaços
 
    const [existeMesmoDia] = await mysqlConn.query(
      `SELECT 1 FROM saldo_produtos 
       WHERE filial = ? AND cod_produto = ? AND data_alteracao = ? AND \`local\` = ?`,
      [saldo.filial, codProduto, dataSaldoHoje, origemUsuario]
    );
 
    if (existeMesmoDia.length > 0) {
      await mysqlConn.query(
        `UPDATE saldo_produtos 
         SET nome_produto = ?, saldo_total = ? 
         WHERE filial = ? AND cod_produto = ? AND data_alteracao = ? AND \`local\` = ?`,
        [
          saldo.nome_produto,
          saldo.saldo_total,
          saldo.filial,
          codProduto,
          dataSaldoHoje,
          saldo.local2,
        ]
      );
    } else {
      await mysqlConn.query(
        `INSERT INTO saldo_produtos 
         (filial, cod_produto, nome_produto, saldo_total, data_alteracao, \`local\`) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          saldo.filial,
          codProduto,
          saldo.nome_produto,
          saldo.saldo_total,
          dataSaldoHoje,
          saldo.local2,
        ]
      );
    }
  }
  */

    // ---------------- VENDAS (COMENTADO - fora do escopo) ---------------- //
    /* REMOVIDO: Sincronização de vendas (não relacionado a compras)
  const dataVendas = req.body?.data || new Date().toISOString().slice(0, 10);
  const dataProtheus = dataVendas.replace(/-/g, "");
 
  const vendasResult = await request.query(`
    SELECT 
      s5.Z5_FILIAL,
      s4.Z4_COND,
      s5.Z5_BILHETE,
      s5.Z5_CLIENTE,
      s5.Z5_DATA,
      s4.Z4_LOCAL,
      s5.Z5_CODPRO,
      s5.Z5_DESPRO,
      s5.Z5_QTDE,
      s5.Z5_PRECO,
      s5.Z5_TOTAL
    FROM SZ5140 AS s5
    LEFT JOIN SZ4140 AS s4
      ON s4.Z4_FILIAL = s5.Z5_FILIAL
     AND s4.Z4_BILHETE = s5.Z5_BILHETE
     AND s4.Z4_DATA = s5.Z5_DATA
    WHERE 
      s5.Z5_FILIAL = '01'
      AND s5.D_E_L_E_T_ = ''
      AND s5.Z5_DATA = '${dataProtheus}'
      AND (s4.Z4_COND < '900' OR s4.Z4_COND IS NULL)
  `);
 
  const vendas = vendasResult.recordset;
 
  if (vendas.length > 0) {
    const valores = vendas.map((venda) => [
      venda.Z5_FILIAL,
      venda.Z5_BILHETE,
      venda.Z5_CLIENTE,
      formatData(venda.Z5_DATA),
      venda.Z4_LOCAL,
      venda.Z5_CODPRO?.trim(),
      venda.Z5_DESPRO,
      venda.Z5_QTDE,
      venda.Z5_PRECO,
      venda.Z5_TOTAL,
    ]);
 
    await mysqlConn.query(
      `INSERT INTO vendas_produtos 
       (filial, bilhete, cliente, data, local, codpro, descricao, qtde, preco, total)
       VALUES ?
       ON DUPLICATE KEY UPDATE 
        cliente = VALUES(cliente),
        data = VALUES(data),
        local = VALUES(local),
        descricao = VALUES(descricao),
        qtde = VALUES(qtde),
        preco = VALUES(preco),
        total = VALUES(total)`,
      [valores]
    );
  }
  */

    function formatData(dataString) {
      if (!dataString) return null;
      const str = dataString.toString();
      return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
    }

    mysqlConn.release();
    res.status(200).json({
      success: true,
      message: `${headers.length} compras sincronizadas`,
    });
  } catch (error) {
    console.error("❌ Erro na sincronização:", error);
    if (mysqlConn) mysqlConn.release();
    if (res && !res.headersSent) {
      res
        .status(500)
        .json({ error: "Erro ao sincronizar compras: " + error.message });
    }
  }
}

// Rota para identificar o ambiente (PRODUÇÃO ou DESENVOLVIMENTO)
app.get("/api/environment", (req, res) => {
  const environment = process.env.ENVIRONMENT || "development";
  const isDevelopment = environment.toLowerCase() === "development";

  res.json({
    environment: environment.toUpperCase(),
    isDevelopment,
    isProduction: !isDevelopment,
    warning: !isDevelopment ? "⚠️ ATENÇÃO: AMBIENTE DE PRODUÇÃO!" : null,
  });
});

// Rota para autenticação (com rate limiting e validação)
app.post("/login", authLimiter, loginValidation, (req, res) => {
  const { username, password } = req.body;

  dbOcorrencias.query(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, results) => {
      if (err) {
        logger.logDbError("login_query", err, { username });
        return res.status(500).json({ error: "Erro interno no servidor" });
      }

      if (results.length === 0) {
        logger.logAuth(username, false, req.ip, "Usuário não encontrado");
        return res.status(401).json({ error: "Usuário não encontrado" });
      }

      const user = results[0];

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        logger.logAuth(username, false, req.ip, "Senha incorreta");
        return res.status(401).json({ error: "Senha inválida" });
      }

      logger.logAuth(username, true, req.ip);

      // Cria lista de permissões
      const permissoes = [];
      if (user.podeTrocarLocal) permissoes.push("podeTrocarLocal");

      // Gera access token (curta duração - 1 hora)
      const token = jwt.sign(
        { id: user.id, username: user.username, tipo: user.tipo },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      // Gera refresh token (longa duração - 7 dias)
      const refreshToken = jwt.sign(
        { id: user.id, username: user.username, tipo: "refresh" },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      // Envia resposta com permissões e tokens
      res.json({
        token,
        refreshToken,
        username: user.username,
        origem: user.origem,
        setor: user.setor,
        permissoes,
        tipo: user.tipo,
      });
    }
  );
});

// Rota para renovar token usando refresh token
app.post("/refresh-token", apiLimiter, (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token não fornecido" });
  }

  try {
    // Verifica o refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    // Verifica se é um refresh token válido
    if (decoded.tipo !== "refresh") {
      return res.status(403).json({ error: "Token inválido" });
    }

    // Busca dados atualizados do usuário
    dbOcorrencias.query(
      "SELECT id, username, tipo FROM users WHERE id = ?",
      [decoded.id],
      (err, results) => {
        if (err) {
          console.error("Erro ao buscar usuário:", err);
          return res.status(500).json({ error: "Erro interno no servidor" });
        }

        if (results.length === 0) {
          return res.status(404).json({ error: "Usuário não encontrado" });
        }

        const user = results[0];

        // Gera novo access token
        const newToken = jwt.sign(
          { id: user.id, username: user.username, tipo: user.tipo },
          process.env.JWT_SECRET,
          { expiresIn: "1h" }
        );

        // Opcionalmente, gera novo refresh token (rotação)
        const newRefreshToken = jwt.sign(
          { id: user.id, username: user.username, tipo: "refresh" },
          process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );

        res.json({
          token: newToken,
          refreshToken: newRefreshToken,
        });
      }
    );
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ error: "Refresh token expirado. Faça login novamente." });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(403).json({ error: "Refresh token inválido" });
    }
    console.error("Erro ao renovar token:", error);
    return res.status(500).json({ error: "Erro ao renovar token" });
  }
});

app.post("/auth/token", authLimiter, async (req, res) => {
  try {
    const response = await axios.post(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    res.json({ token: response.data.access_token });
  } catch (error) {
    console.error("Erro ao obter o token:", error.response?.data || error);
    res.status(500).json({ error: "Erro ao autenticar" });
  }
});

// ---- Perfil do usuário (usado pelo front) ----
// Endpoint para listar usuários online
app.get("/usuarios/online", async (req, res) => {
  try {
    const usuariosOnlineList = [];

    usuariosOnlineMulti.forEach((conns, username) => {
      const activeConns = Array.from(conns).filter(ws => ws.readyState === WebSocket.OPEN);
      if (activeConns.length === 0) return;
      const info = activeConns[0].meta;
      const tempoOnline = Math.floor(
        (Date.now() - info.connectedAt.getTime()) / 1000
      ); // segundos
      const horas = Math.floor(tempoOnline / 3600);
      const minutos = Math.floor((tempoOnline % 3600) / 60);
      const segundos = tempoOnline % 60;

      usuariosOnlineList.push({
        username,
        local: info.local || "N/A",
        connectedAt: info.connectedAt.toISOString(),
        tempoOnline: {
          total: tempoOnline,
          formatado: `${horas}h ${minutos}m ${segundos}s`,
        },
        ip: info.ip,
      });
    });

    // Ordena por nome de usuário
    usuariosOnlineList.sort((a, b) => a.username.localeCompare(b.username));

    res.json({
      total: usuariosOnlineList.length,
      usuarios: usuariosOnlineList,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Erro ao listar usuários online:", err);
    res.status(500).json({ error: "Erro ao listar usuários online" });
  }
});

app.get("/usuarios/perfil/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const [rows] = await dbOcorrencias
      .promise()
      .query(
        "SELECT username, origem, tipo FROM users WHERE username = ? LIMIT 1",
        [username]
      );

    if (!rows.length) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    res.json(rows[0]); // { username, origem, tipo }
  } catch (err) {
    console.error("Erro /usuarios/perfil:", err);
    res.status(500).json({ erro: "Erro ao buscar perfil" });
  }
});

// Rota para buscar clientes - BUSCANDO DO PROTHEUS (MSSQL)
app.get("/clientes", async (req, res) => {
  const search = (req.query.search || "").trim();

  try {
    const pool = await getMSSQLPool();

    // Busca original com tabela SA1140XX e filtros de filial/bloqueio
    const sqlSearch = `
      SELECT TOP 50 A1_COD, A1_NREDUZ, A1_NOME
      FROM SA1140XX WITH(NOLOCK) 
      WHERE D_E_L_E_T_ = '' 
        AND A1_FILIAL = '01'
        AND (A1_MSBLQL IS NULL OR A1_MSBLQL <> '1')
        AND (
          A1_NREDUZ LIKE @searchTerm 
          OR A1_COD LIKE @searchTerm 
          OR A1_NOME LIKE @searchTerm
        )
      ORDER BY 
        CASE 
          WHEN RTRIM(A1_COD) = @term THEN 0
          WHEN RTRIM(A1_NREDUZ) = @term THEN 1
          WHEN RTRIM(A1_NOME) = @term THEN 2
          WHEN A1_COD LIKE @startTerm THEN 3
          WHEN A1_NREDUZ LIKE @startTerm THEN 4
          ELSE 5 
        END, 
        A1_NREDUZ
    `;

    const result = await pool
      .request()
      .input("searchTerm", sql.VarChar, `%${search}%`)
      .input("term", sql.VarChar, search)
      .input("startTerm", sql.VarChar, `${search}%`)
      .query(sqlSearch);

    const clientesFormatados = result.recordset.map((cliente) => ({
      codigo: cliente.A1_COD.trim(),
      nome_fantasia: `${cliente.A1_COD.trim()} - ${cliente.A1_NREDUZ.trim() || cliente.A1_NOME.trim()}`,
      nome_reduzido: cliente.A1_NREDUZ.trim(),
      nome_completo: cliente.A1_NOME.trim()
    }));

    res.send(clientesFormatados);
  } catch (err) {
    console.error("Erro ao buscar clientes no Protheus:", err);
    return res.status(500).send("Erro ao buscar clientes no Protheus.");
  }
});

// Rota para buscar conferentes
app.get("/conferentes", (req, res) => {
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

// Rota para buscar motoristas
app.get("/motoristas", (req, res) => {
  const sqlSearch = "SELECT nome FROM motoristas WHERE nome LIKE ?";
  dbOcorrencias.query(
    sqlSearch,
    [`%${req.query.search || ""}%`],
    (err, result) => {
      if (err) {
        console.error("Erro ao buscar motoristas:", err);
        return res.status(500).send(err);
      }
      res.send(result);
    }
  );
});

app.get("/produto", authenticateToken, async (req, res) => {
  const search = req.query.search;
  // Mínimo 2 caracteres para evitar queries desnecessárias
  if (!search || search.trim().length < 2) return res.json([]);

  try {
    // Reutiliza o pool global em vez de criar nova conexão a cada busca
    // sql.connect() com pool já configurado retorna o pool singleton
    const pool = await getMSSQLPool();

    const termo = search.trim().toUpperCase();
    const termoLike = `%${termo}%`;
    const termoNoSpecial = termo.replace(/[^A-Z0-9]/g, "");
    const termoNoSpecialLike = `%${termoNoSpecial}%`;

    const result = await pool.request()
      .input("termLike", sql.VarChar(100), termoLike)
      .input("termNoSpecialLike", sql.VarChar(100), termoNoSpecialLike)
      .query(`
        SELECT TOP 20
          RTRIM(B1.B1_COD)   AS codigo_produto,
          RTRIM(B1.B1_DESC)  AS descricao,
          RTRIM(B1.B1_UM)    AS primeira_unidade,
          RTRIM(B1.B1_SEGUM) AS segunda_unidade,
          B1.B1_CONV         AS fator_conversao
        FROM SB1140 B1 WITH(NOLOCK)
        WHERE B1.D_E_L_E_T_ = ''
          AND B1.B1_MSBLQL <> '1'
          AND (
            B1.B1_DESC LIKE @termLike
            OR B1.B1_COD  LIKE @termLike
            OR REPLACE(RTRIM(B1.B1_COD), '.', '') LIKE @termNoSpecialLike
          )
        ORDER BY B1.B1_DESC
      `);

    res.json(result.recordset.map((r) => ({
      codigo_produto: r.codigo_produto,
      codigo: r.codigo_produto,
      descricao: r.descricao,
      primeira_unidade: r.primeira_unidade,
      segunda_unidade: r.segunda_unidade,
      fator_conversao: r.fator_conversao,
      unidade: r.primeira_unidade,
    })));
  } catch (err) {
    console.error("❌ Erro ao buscar produtos do Protheus:", err);
    // Fallback para tabela MySQL local em caso de erro
    const searchWithoutDot = search.replace(/\./g, "");
    dbOcorrencias.query(
      `SELECT 
         codigo_produto, descricao,
         unidade AS primeira_unidade,
         segunda_unidade, fator_conversao
       FROM produto
       WHERE descricao LIKE ? OR REPLACE(codigo_produto, '.', '') LIKE ?
       LIMIT 20`,
      [`%${search}%`, `%${searchWithoutDot}%`],
      (errMySQL, results) => {
        if (errMySQL) return res.status(500).json({ error: errMySQL.message });
        res.json(results.map(r => ({ ...r, codigo: r.codigo_produto })));
      }
    );
  }
});

// Rota para buscar vendedores
app.get("/vendedores", (req, res) => {
  const search = req.query.search || "";
  const sqlSearch =
    "SELECT codigo_vendedor AS value, nome_vendedor AS label FROM vendedores WHERE nome_vendedor LIKE ?";
  dbOcorrencias.query(sqlSearch, [`%${search}%`], (err, result) => {
    if (err) {
      console.error("Erro ao buscar vendedores:", err);
      return res.status(500).send(err);
    }
    res.send(result);
  });
});

app.get("/verificar", (req, res) => {
  const { cliente, data, bilhete } = req.query;

  const sqlSearch =
    'SELECT id, numero FROM ocorrencias WHERE cliente = ? AND data = ? AND bilhete = ? AND (D_E_L_E_T_ IS NULL OR D_E_L_E_T_ = "")';
  dbOcorrencias.query(sqlSearch, [cliente, data, bilhete], (err, result) => {
    if (err) {
      console.error("Erro ao verificar ocorrência:", err);
      return res.status(500).send(err);
    }

    if (result.length > 0) {
      res.json({ exists: true, numero: result[0].numero });
    } else {
      res.json({ exists: false });
    }
  });
});
// Verificação de Cliente e Data
app.get("/verificar-cliente-data", (req, res) => {
  const { cliente, data } = req.query;

  const sqlSearch =
    'SELECT id, numero FROM ocorrencias WHERE cliente = ? AND data = ? AND (D_E_L_E_T_ IS NULL OR D_E_L_E_T_ = "")';
  dbOcorrencias.query(sqlSearch, [cliente, data], (err, result) => {
    if (err) {
      console.error("Erro ao verificar ocorrência:", err);
      return res.status(500).send(err);
    }

    if (result.length > 0) {
      res.json({ exists: true, numero: result[0].numero });
    } else {
      res.json({ exists: false });
    }
  });
});

app.get("/cliente/detalhes", (req, res) => {
  const { cliente } = req.query;

  const queryDetalhes = `
    SELECT 
      itens_produto.produto_nome,
      itens_produto.produto_unidade,
      itens_produto.quantidade,
      itens_produto.valor,
      (itens_produto.quantidade * itens_produto.valor) AS valor_total,
      ocorrencias.data,
      ocorrencias.descricao
    FROM itens_produto
    JOIN ocorrencias ON itens_produto.ocorrencia_id = ocorrencias.id
    WHERE ocorrencias.cliente = ?
    AND ocorrencias.D_E_L_E_T_ = ''
    ORDER BY valor_total DESC
  `;

  const querySomaTotal = `
    SELECT 
      SUM(itens_produto.quantidade * itens_produto.valor) AS soma_valor_total
    FROM itens_produto
    JOIN ocorrencias ON itens_produto.ocorrencia_id = ocorrencias.id
    WHERE ocorrencias.cliente = ?
  `;

  dbOcorrencias.query(queryDetalhes, [cliente], (err, detalhes) => {
    if (err) {
      console.error("[ERROR] Erro ao buscar detalhes do cliente:", err);
      return res.status(500).send({ error: "Erro interno no servidor." });
    }

    dbOcorrencias.query(querySomaTotal, [cliente], (err, soma) => {
      if (err) {
        console.error("[ERROR] Erro ao calcular soma do cliente:", err);
        return res.status(500).send({ error: "Erro interno no servidor." });
      }

      res.json({
        detalhes,
        soma_valor_total: soma[0]?.soma_valor_total || 0,
      });
    });
  });
});

app.get("/cliente/total", (req, res) => {
  const queryTotalPorCliente = `
    SELECT 
      ocorrencias.cliente,
      SUM(itens_produto.quantidade * itens_produto.valor) AS soma_valor_total
    FROM itens_produto
    JOIN ocorrencias ON itens_produto.ocorrencia_id = ocorrencias.id
    WHERE ocorrencias.D_E_L_E_T_ = ''
    GROUP BY ocorrencias.cliente
  `;

  dbOcorrencias.query(queryTotalPorCliente, (err, results) => {
    if (err) {
      console.error("[ERROR] Erro ao buscar total por cliente:", err);
      return res.status(500).send({ error: "Erro interno no servidor." });
    }

    res.json(results);
  });
});

// Verificação de Bilhete (ou Nota)
app.get("/verificar-bilhete", (req, res) => {
  const { bilhete } = req.query;
  const raw = String(bilhete || "").trim();
  const pad = raw.padStart(9, "0");

  const sqlSearch =
    'SELECT id, numero FROM ocorrencias WHERE (bilhete = ? OR nota_fiscal = ? OR nota_fiscal = ?) AND (D_E_L_E_T_ IS NULL OR D_E_L_E_T_ = "")';
  dbOcorrencias.query(sqlSearch, [raw, raw, pad], (err, result) => {
    if (err) {
      console.error("Erro ao verificar ocorrência:", err);
      return res.status(500).send(err);
    }

    if (result.length > 0) {
      res.json({ exists: true, numero: result[0].numero });
    } else {
      res.json({ exists: false });
    }
  });
});

app.get("/dashboard/tipo", (req, res) => {
  const { tipo, vendedor, startDate, endDate } = req.query;

  let query = `
    SELECT 
      tipo, 
      SUM(valor) AS totalValue
    FROM ocorrencias
    WHERE D_E_L_E_T_ = ''
  `;

  const params = [];

  if (tipo) {
    query += ` AND tipo = ?`;
    params.push(tipo);
  }

  if (vendedor) {
    query += ` AND vendedor = ?`;
    params.push(vendedor);
  }

  if (startDate && endDate) {
    query += ` AND data BETWEEN ? AND ?`;
    params.push(startDate, endDate);
  }

  query += ` GROUP BY tipo`;

  dbOcorrencias.query(query, params, (err, results) => {
    if (err) {
      console.error("Erro ao buscar tipos:", err);
      return res.status(500).send({ error: "Erro interno no servidor." });
    }
    res.json(results);
  });
});

// 🔹 Rota para buscar entregas incluindo Rota e Status
app.get("/entregas", (req, res) => {
  const sql = `
    SELECT 
      ZB_NOMCLI, 
      ZB_NUMSEQ, 
      ZB_NOTA, 
      ZH_FOTO_URL, 
      ZB_DTENTRE, 
      ZH_CODIGO,  -- Adicionada a coluna Rota
      ZH_STATUS   -- Adicionada a coluna Status
    FROM entregas 
    ORDER BY ZB_DTENTRE DESC`;

  dbRegistros.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao buscar entregas:", err);
      return res.status(500).json({ error: "Erro no servidor" });
    }
    res.json(results);
  });
});
// [VERSÃO FINAL E PRECISA] Substitua a rota por este código
app.get("/entregas-por-rota", async (req, res) => {
  try {
    // --- ALTERAÇÃO 1: CAPTURAR A DATA E DEFINIR UM PADRÃO ---
    // Pega o parâmetro 'data' da URL (ex: ?data=2025-10-17).
    const { data } = req.query;
    // Se a data não for fornecida, usa a data de hoje por padrão.
    const dataFiltro = data ? data : dayjs().format("YYYY-MM-DD");

    // --- ALTERAÇÃO 2: ATUALIZAR A QUERY PRINCIPAL PARA ACEITAR O FILTRO ---
    // Adicionamos a cláusula 'WHERE' para filtrar pela data ANTES de tudo.
    // O '?' é um placeholder para o parâmetro, o que nos protege contra SQL Injection.
    const sqlRotas = `
      -- CTE para buscar início e fim da rota nos logs
      WITH RotaTimestamps AS (
        SELECT
          codigo_rota, data_ref,
          MIN(CASE WHEN acao = 'INICIO' THEN data_hora END) as hora_inicio,
          MAX(CASE WHEN acao = 'ENCERRAR' THEN data_hora END) as hora_fim
        FROM rota_logs
        WHERE acao IN ('INICIO', 'ENCERRAR') AND codigo_rota IS NOT NULL
        GROUP BY codigo_rota, data_ref
      )
      -- Consulta Principal
      SELECT
        e.ZH_CODIGO, e.ZH_ROTA, e.ZB_DTENTRE, e.ZH_NOME, e.ZH_NOMMOT,
        e.ZH_VEICULO, e.ZB_NOMCLI, e.ZB_NUMSEQ, e.ZB_CARGA, e.ZB_NOTA, e.ZH_FOTO_URL,
        e.ZH_STATUS, IFNULL(e.ZH_OBS, '') AS ZH_OBS, 
        e.chegada_em, e.concluido_em AS hora_conclusao, -- Usando a coluna direta da tabela entregas
        rt.hora_inicio, rt.hora_fim
      FROM entregas e
      LEFT JOIN RotaTimestamps rt ON e.ZH_CODIGO = rt.codigo_rota AND e.ZB_DTENTRE = rt.data_ref
      WHERE CAST(e.ZB_DTENTRE AS DATE) = ?
      ORDER BY e.ZB_DTENTRE DESC, e.ZH_CODIGO, e.ZB_NUMSEQ
    `;

    // --- ALTERAÇÃO 3: NOVA QUERY PARA CALCULAR AS ESTATÍSTICAS ---
    // Esta query roda em paralelo para buscar as pendências do mês atual.
    const sqlStats = `
      SELECT COUNT(*) as pendencias
      FROM entregas
      WHERE (ZH_FOTO_URL IS NULL OR ZH_FOTO_URL = '')
      AND MONTH(ZB_DTENTRE) = MONTH(CURDATE())
      AND YEAR(ZB_DTENTRE) = YEAR(CURDATE())
    `;

    // --- NOVA QUERY: BUSCAR O HORARIO QUE A ROTA FICOU PRONTA NO BANCO LOCAL ---
    const protheusDataQuery = async () => {
      try {
        const mysqlQ = `SELECT rota as ZB_ROTA, hora_pronta FROM rota_pronta_logs WHERE dt_entrega = ?`;
        const [rows] = await dbRegistros.promise().query(mysqlQ, [dataFiltro]);
        return rows;
      } catch (err) {
        console.error("Erro ao buscar hora_pronta na rota_pronta_logs:", err);
        return [];
      }
    };

    // --- ALTERAÇÃO 4: EXECUTAR AMBAS AS QUERIES EM PARALELO E BUSCAR NO PROTHEUS ---
    const [rows, statsResult, protheusData] = await Promise.all([
      // Executa a query principal com o filtro de data
      new Promise((resolve, reject) => {
        dbRegistros.query(
          sqlRotas,
          [dataFiltro],
          (
            err,
            results // Passa a data como parâmetro seguro
          ) => (err ? reject(err) : resolve(results))
        );
      }),
      // Executa a query de estatísticas
      new Promise((resolve, reject) => {
        dbRegistros.query(sqlStats, (err, results) =>
          err ? reject(err) : resolve(results)
        );
      }),
      protheusDataQuery()
    ]);

    // O restante da lógica para agrupar as rotas permanece o mesmo
    const mapa = new Map();
    for (const r of rows) {
      const key = `${r.ZH_CODIGO}-${r.ZH_ROTA}-${r.ZB_DTENTRE}`;
      if (!mapa.has(key)) {
        // Encontrar as informações do banco para ter a hora pronta
        const infoProtheus = protheusData.find(p => p.ZB_ROTA === r.ZH_ROTA);
        // Agora só buscamos as que já constam na rota_pronta_logs
        const hora_pronta = infoProtheus ? infoProtheus.hora_pronta : null;

        mapa.set(key, {
          ZH_CODIGO: r.ZH_CODIGO,
          ZH_ROTA: r.ZH_ROTA,
          ZB_DTENTRE: r.ZB_DTENTRE,
          ZH_NOME: r.ZH_NOME,
          ZH_NOMMOT: r.ZH_NOMMOT,
          ZH_VEICULO: r.ZH_VEICULO,
          hora_inicio: r.hora_inicio,
          hora_fim: r.hora_fim,
          hora_pronta: hora_pronta,
          entregas: [],
        });
      }
      mapa.get(key).entregas.push({
        ZB_NOMCLI: r.ZB_NOMCLI,
        ZB_NUMSEQ: r.ZB_NUMSEQ,
        ZB_NOTA: r.ZB_NOTA,
        ZH_FOTO_URL: r.ZH_FOTO_URL,
        ZB_DTENTRE: r.ZB_DTENTRE,
        ZH_CODIGO: r.ZH_CODIGO,
        ZH_STATUS: r.ZH_STATUS,
        ZH_OBS: r.ZH_OBS,
        chegada_em: r.chegada_em,
        hora_conclusao: r.hora_conclusao,
      });
    }
    const rotas = Array.from(mapa.values());


    // --- ALTERAÇÃO 5: CALCULAR ESTATÍSTICAS DO DIA ---
    const totalEntregasReais = rows.length; // Total de itens (para cálculo de pendências)
    const totalCarregamentosDia = rotas.length; // Total de Caminhões/Rotas (Solicitado pelo usuário)
    const totalFinalizadosDia = rows.filter(r => r.ZH_STATUS === "CONCLUIDA").length;
    const totalEmRotaDia = totalEntregasReais - totalFinalizadosDia; // Total de Pendentes (Itens)

    // Pendentes agrupados por caminhão (rota)
    const pendentePorCaminhao = rotas
      .map((rota) => {
        const pendentes = rota.entregas.filter(
          (e) => e.ZH_STATUS !== "CONCLUIDA"
        ).length;
        return {
          rota: rota.ZH_ROTA,
          veiculo: rota.ZH_VEICULO || "S/PLACA",
          motorista: rota.ZH_NOMMOT || "",
          pendentes,
        };
      })
      .filter((r) => r.pendentes > 0)
      .sort((a, b) => b.pendentes - a.pendentes);

    // Caminhões totalmente finalizados (todas as entregas CONCLUÍDA)
    const totalCaminhoesFinalizado = rotas.filter((rota) =>
      rota.entregas.length > 0 &&
      rota.entregas.every((e) => e.ZH_STATUS === "CONCLUIDA")
    ).length;

    // --- ALTERAÇÃO 6: MONTAR O OBJETO DE RESPOSTA FINAL ---
    const stats = {
      pendenciasFotoMes: statsResult[0]?.pendencias || 0,
      totalCarregamentosDia,
      totalFinalizadosDia,
      totalCaminhoesFinalizado,
      totalEmRotaDia,
      totalCaminhoesPendentes: pendentePorCaminhao.length,
      pendentePorCaminhao,
    };

    res.json({ rotas, stats }); // Enviando a resposta no novo formato
  } catch (err) {
    console.error("Erro ao buscar entregas por rota:", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// 🔹 NOVA ROTA: Buscar detalhes completos de uma rota para ajuste (ADM)
app.get("/rota-completa-ajuste", async (req, res) => {
  const { codigo_rota, data_ref } = req.query;
  if (!codigo_rota || !data_ref) {
    return res.status(400).json({ error: "Código da rota e data de referência são necessários." });
  }

  try {
    // 1. Entregas da rota
    const sqlEntregas = `SELECT * FROM entregas WHERE ZH_CODIGO = ? AND ZB_DTENTRE = ?`;
    const [entregas] = await dbRegistros.promise().query(sqlEntregas, [codigo_rota, data_ref]);

    // 2. Logs de Início/Fim da rota
    const sqlLogs = `SELECT * FROM rota_logs WHERE codigo_rota = ? AND data_ref = ?`;
    const [logs] = await dbRegistros.promise().query(sqlLogs, [codigo_rota, data_ref]);

    // 3. Paradas (daily_logs) do motorista para esta rota/dia
    const sqlParadas = `
      SELECT *, 
             CONCAT(data, ' ', hora_inicio) as hora_inicio,
             CONCAT(data, ' ', hora_fim) as hora_fim
      FROM daily_logs 
      WHERE route_id = ? 
      AND CAST(data AS DATE) = CAST(? AS DATE)
      ORDER BY hora_inicio ASC
    `;
    const [paradas] = await dbRegistros.promise().query(sqlParadas, [codigo_rota, data_ref]);

    // bypass Protheus para testar velocidade
    let vehicle_info = { tipo_desc: 'CAMINHÕES', modelo: '---' };
    /*
    try {
      const plate = entregas.length > 0 ? entregas[0].ZH_VEICULO : '';
      // ... resto do código ...
    } catch (vErr) { ... }
    */

    res.json({
      entregas,
      logs,
      paradas,
      vehicle_info
    });
  } catch (err) {
    console.error("❌ Erro ao buscar rota completa para ajuste:", err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// 🔹 NOVA ROTA: Atualizar horários da rota (ADM)
app.post("/atualizar-rota-tempos", async (req, res) => {
  const { codigo_rota, data_ref, inicio_rota, inicio_km, fim_rota, fim_km, entregas, paradas, username } = req.body;

  if (!codigo_rota || !data_ref) {
    return res.status(400).json({ error: "Faltam identificadores da rota." });
  }

  const connection = await dbRegistros.promise().getConnection();
  try {
    await connection.beginTransaction();

    // 0. Verificar se a rota já está fechada antes de começar (Security check)
    const [statusLogs] = await connection.query(
      `SELECT 1 FROM rota_logs WHERE codigo_rota = ? AND data_ref = ? AND acao = 'FECHADA'`,
      [codigo_rota, data_ref]
    );

    if (statusLogs.length > 0) {
      await connection.rollback();
      return res.status(403).json({ error: "Esta rota está fechada e não permite mais alterações." });
    }

    // 1. Atualizar Início da Rota (rota_logs)
    if (inicio_rota !== undefined || inicio_km !== undefined) {
      const val = inicio_rota ? dayjs(inicio_rota).format('YYYY-MM-DD HH:mm:ss') : null;
      const [resultInicio] = await connection.query(
        `UPDATE rota_logs SET data_hora = ?, km = ? WHERE codigo_rota = ? AND data_ref = ? AND acao = 'INICIO'`,
        [val, inicio_km || null, codigo_rota, data_ref]
      );
      if (resultInicio.affectedRows === 0 && (val || inicio_km)) {
        await connection.query(
          `INSERT INTO rota_logs (codigo_rota, data_ref, acao, data_hora, km, motorista) VALUES (?, ?, 'INICIO', ?, ?, ?)`,
          [codigo_rota, data_ref, val, inicio_km || null, username || 'ADM']
        );
      }
    }

    // 2. Atualizar Fim da Rota (rota_logs)
    if (fim_rota !== undefined || fim_km !== undefined) {
      const val = fim_rota ? dayjs(fim_rota).format('YYYY-MM-DD HH:mm:ss') : null;
      const [resultFim] = await connection.query(
        `UPDATE rota_logs SET data_hora = ?, km = ? WHERE codigo_rota = ? AND data_ref = ? AND acao = 'ENCERRAR'`,
        [val, fim_km || null, codigo_rota, data_ref]
      );
      if (resultFim.affectedRows === 0 && (val || fim_km)) {
        await connection.query(
          `INSERT INTO rota_logs (codigo_rota, data_ref, acao, data_hora, km, motorista) VALUES (?, ?, 'ENCERRAR', ?, ?, ?)`,
          [codigo_rota, data_ref, val, fim_km || null, username || 'ADM']
        );
      }
    }

    // 3. Atualizar Entregas (Chegada e Conclusão)
    if (entregas && Array.isArray(entregas)) {
      for (const e of entregas) {
        const chegada = e.chegada_em ? dayjs(e.chegada_em).format('YYYY-MM-DD HH:mm:ss') : null;
        const conclusao = e.concluido_em ? dayjs(e.concluido_em).format('YYYY-MM-DD HH:mm:ss') : null;
        await connection.query(
          `UPDATE entregas SET chegada_em = ?, concluido_em = ? WHERE id = ?`,
          [chegada, conclusao, e.id]
        );
      }
    }

    // 4. Atualizar Paradas (daily_logs)
    if (paradas && Array.isArray(paradas)) {
      for (const p of paradas) {
        // Para daily_logs, salvamos apenas o horário (HH:mm:ss) se a data já estiver na coluna 'data'
        const h_inicio = p.hora_inicio ? dayjs(p.hora_inicio).format('HH:mm:ss') : null;
        const h_fim = p.hora_fim ? dayjs(p.hora_fim).format('HH:mm:ss') : null;
        await connection.query(
          `UPDATE daily_logs SET hora_inicio = ?, hora_fim = ? WHERE id = ?`,
          [h_inicio, h_fim, p.id]
        );
      }
    }

    await connection.commit();
    res.json({ success: true, message: "Horários atualizados com sucesso!" });
  } catch (err) {
    await connection.rollback();
    console.error("❌ Erro ao atualizar tempos da rota:", err);
    res.status(500).json({ error: "Erro ao salvar alterações" });
  } finally {
    connection.release();
  }
});

// 🔹 NOVA ROTA: Excluir uma parada individual (ADM)
app.delete("/excluir-parada/:id", async (req, res) => {
  const { id } = req.params;
  const { codigo_rota, data_ref } = req.query; // Para verificação de lock

  if (!id) return res.status(400).json({ error: "ID da parada é necessário." });

  try {
    // 1. Verificação de Lock (se a rota estiver fechada, não permite excluir)
    if (codigo_rota && data_ref) {
      const [statusLogs] = await dbRegistros.promise().query(
        `SELECT 1 FROM rota_logs WHERE codigo_rota = ? AND data_ref = ? AND acao = 'FECHADA'`,
        [codigo_rota, data_ref]
      );
      if (statusLogs.length > 0) {
        return res.status(403).json({ error: "Esta rota está fechada e não permite mais exclusões." });
      }
    }

    // 2. Excluir o registro
    const [result] = await dbRegistros.promise().query(`DELETE FROM daily_logs WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Registro não encontrado." });
    }

    res.json({ success: true, message: "Parada excluída com sucesso!" });
  } catch (err) {
    console.error("❌ Erro ao excluir parada:", err);
    res.status(500).json({ error: "Erro interno ao excluir parada" });
  }
});

// 🔹 NOVA ROTA: Fechar rota (ADM)
app.post("/fechar-rota", async (req, res) => {
  const { codigo_rota, data_ref, username } = req.body;

  if (!codigo_rota || !data_ref) {
    return res.status(400).json({ error: "Faltam identificadores da rota." });
  }

  try {
    // 1. Verificar se a rota já está fechada
    const [statusLogs] = await dbRegistros.promise().query(
      `SELECT 1 FROM rota_logs WHERE codigo_rota = ? AND data_ref = ? AND acao = 'FECHADA'`,
      [codigo_rota, data_ref]
    );

    if (statusLogs.length > 0) {
      return res.status(400).json({ error: "Esta rota já está fechada." });
    }

    // 2. Verificar se todas as entregas têm chegada e conclusão (Safe check)
    const [entregas] = await dbRegistros.promise().query(
      `SELECT id FROM entregas WHERE ZH_CODIGO = ? AND ZB_DTENTRE = ? AND (chegada_em IS NULL OR concluido_em IS NULL)`,
      [codigo_rota, data_ref]
    );

    if (entregas.length > 0) {
      return res.status(400).json({ error: "Não é possível fechar a rota: existem entregas sem horário de chegada ou conclusão." });
    }

    // 3. Registrar o fechamento
    await dbRegistros.promise().query(
      `INSERT INTO rota_logs (codigo_rota, data_ref, acao, data_hora, motorista) VALUES (?, ?, 'FECHADA', NOW(), ?)`,
      [codigo_rota, data_ref, username || 'ADM']
    );

    res.json({ success: true, message: "Rota encerrada com sucesso!" });
  } catch (err) {
    console.error("❌ Erro ao fechar rota:", err);
    res.status(500).json({ error: "Erro ao fechar rota." });
  }
});


// Rota para exportar entregas para Excel
app.get("/exportar-entregas-excel", async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;

    if (!dataInicio || !dataFim) {
      return res.status(400).json({
        error: "Data início e data fim são obrigatórias.",
        message:
          "Por favor, informe a data início e data fim no formato YYYY-MM-DD.",
      });
    }

    // Validar formato das datas
    const inicio = dayjs(dataInicio);
    const fim = dayjs(dataFim);

    if (!inicio.isValid() || !fim.isValid()) {
      return res.status(400).json({
        error: "Formato de data inválido.",
        message: "Use o formato YYYY-MM-DD para as datas.",
      });
    }

    if (inicio.isAfter(fim)) {
      return res.status(400).json({
        error: "Data início deve ser anterior à data fim.",
        message: "A data de início deve ser menor ou igual à data de fim.",
      });
    }

    // Query para buscar todas as entregas no período
    const sqlEntregas = `
      WITH RotaTimestamps AS (
        SELECT
          codigo_rota, data_ref,
          MIN(CASE WHEN acao = 'INICIO' THEN data_hora END) as hora_inicio,
          MAX(CASE WHEN acao = 'ENCERRAR' THEN data_hora END) as hora_fim
        FROM rota_logs
        WHERE acao IN ('INICIO', 'ENCERRAR') AND codigo_rota IS NOT NULL
        GROUP BY codigo_rota, data_ref
      )
      SELECT
        e.ZH_CODIGO,
        e.ZH_ROTA,
        DATE_FORMAT(e.ZB_DTENTRE, '%d/%m/%Y') AS DATA_ENTREGA,
        e.ZH_NOME AS NOME_ROTA,
        e.ZH_NOMMOT AS MOTORISTA,
        e.ZH_VEICULO AS PLACA,
        e.ZB_NOMCLI AS CLIENTE,
        e.ZB_NUMSEQ AS BILHETE,
        e.ZB_NOTA AS NOTA_FISCAL,
        e.ZH_STATUS AS STATUS,
        IFNULL(e.ZH_OBS, '') AS OBSERVACAO,
        CASE WHEN e.ZH_FOTO_URL IS NULL OR e.ZH_FOTO_URL = '' THEN 'NÃO' ELSE 'SIM' END AS TEM_FOTO,
        DATE_FORMAT(e.chegada_em, '%d/%m/%Y %H:%i:%s') AS HORA_CHEGADA,
        DATE_FORMAT(e.concluido_em, '%d/%m/%Y %H:%i:%s') AS HORA_CONCLUSAO,
        e.chegada_em,
        e.concluido_em,
        DATE_FORMAT(rt.hora_inicio, '%d/%m/%Y %H:%i:%s') AS HORA_INICIO_ROTA,
        DATE_FORMAT(rt.hora_fim, '%d/%m/%Y %H:%i:%s') AS HORA_FIM_ROTA,
        DATE_FORMAT(rpl.hora_pronta, '%d/%m/%Y %H:%i:%s') AS HORA_PRONTA
      FROM entregas e
      LEFT JOIN RotaTimestamps rt ON e.ZH_CODIGO = rt.codigo_rota AND e.ZB_DTENTRE = rt.data_ref
      LEFT JOIN rota_pronta_logs rpl ON e.ZH_ROTA = rpl.rota AND CAST(e.ZB_DTENTRE AS DATE) = CAST(rpl.dt_entrega AS DATE)
      WHERE CAST(e.ZB_DTENTRE AS DATE) BETWEEN ? AND ?
      ORDER BY e.ZB_DTENTRE DESC, e.ZH_CODIGO, e.ZB_NUMSEQ
    `;

    const [rows] = await new Promise((resolve, reject) => {
      dbRegistros.query(sqlEntregas, [dataInicio, dataFim], (err, results) =>
        err ? reject(err) : resolve([results])
      );
    });

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        error: "Nenhuma entrega encontrada.",
        message: `Não foram encontradas entregas no período de ${dataInicio} a ${dataFim}.`,
      });
    }

    // Criar workbook Excel
    const workbook = xlsx.utils.book_new();

    // Preparar dados para o Excel
    const dadosExcel = rows.map((row) => {
      // Cálculo de permanência no cliente
      let permanencia = "";
      if (row.chegada_em && row.concluido_em) {
        const c = dayjs(row.chegada_em);
        const f = dayjs(row.concluido_em);
        const diff = f.diff(c, "minute");
        if (diff >= 0) {
          const h = Math.floor(diff / 60);
          const m = diff % 60;
          permanencia = h > 0 ? `${h}h ${m}min` : `${m} min`;
        } else {
          permanencia = "0 min";
        }
      }

      return {
        "Data Entrega": row.DATA_ENTREGA,
        "Cód. Rota": row.ZH_CODIGO,
        Rota: row.ZH_ROTA,
        "Nome da Rota": row.NOME_ROTA,
        Motorista: row.MOTORISTA,
        Placa: row.PLACA,
        Cliente: row.CLIENTE,
        Bilhete: row.BILHETE,
        "Nota Fiscal": row.NOTA_FISCAL || "",
        Status: row.STATUS,
        "Tem Foto": row.TEM_FOTO,
        "Hora Chegada Cliente": row.HORA_CHEGADA || "",
        "Hora Conclusão Cliente": row.HORA_CONCLUSAO || "",
        "Permanência Cliente": permanencia,
        "Rota Pronta (Faturamento)": row.HORA_PRONTA || "",
        "Hora Início Rota": row.HORA_INICIO_ROTA || "",
        "Hora Fim Rota": row.HORA_FIM_ROTA || "",
        Observação: row.OBSERVACAO,
      };
    });

    // Criar worksheet
    const worksheet = xlsx.utils.json_to_sheet(dadosExcel);

    // Ajustar larguras das colunas
    const colWidths = [
      { wch: 12 }, // Data Entrega
      { wch: 10 }, // Cód. Rota
      { wch: 10 }, // Rota
      { wch: 40 }, // Nome da Rota
      { wch: 30 }, // Motorista
      { wch: 12 }, // Placa
      { wch: 40 }, // Cliente
      { wch: 12 }, // Bilhete
      { wch: 15 }, // Nota Fiscal
      { wch: 12 }, // Status
      { wch: 10 }, // Tem Foto
      { wch: 22 }, // Hora Chegada Cliente
      { wch: 22 }, // Hora Conclusão Cliente
      { wch: 18 }, // Permanência Cliente
      { wch: 25 }, // Rota Pronta (Faturamento)
      { wch: 20 }, // Hora Início Rota
      { wch: 20 }, // Hora Fim Rota
      { wch: 50 }, // Observação
    ];
    worksheet["!cols"] = colWidths;

    // Adicionar worksheet ao workbook
    const nomePlanilha = `Entregas ${dataInicio} a ${dataFim}`.substring(0, 31); // Excel limita a 31 caracteres
    xlsx.utils.book_append_sheet(workbook, worksheet, nomePlanilha);

    // Gerar buffer do Excel
    const excelBuffer = xlsx.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Configurar headers para download
    const nomeArquivo = `entregas_${dataInicio}_${dataFim}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${nomeArquivo}"`
    );

    // Enviar arquivo
    res.send(excelBuffer);

    console.log(
      `✅ Excel exportado: ${rows.length} entregas de ${dataInicio} a ${dataFim}`
    );
  } catch (err) {
    console.error("❌ Erro ao exportar entregas para Excel:", err);
    res.status(500).json({
      error: "Erro ao exportar entregas.",
      message: err.message || "Erro interno do servidor.",
    });
  }
});

function getTotalCount() {
  return new Promise((resolve, reject) => {
    dbRegistros.query(
      "SELECT COUNT(DISTINCT ZH_CODIGO) as total FROM entregas",
      (err, result) => {
        if (err) reject(err);
        else resolve(result[0].total);
      }
    );
  });
}
// Endpoint para upload e processamento do arquivo Excel
app.post("/upload-excel", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Nenhum arquivo enviado." });
  }

  const filePath = path.resolve(__dirname, req.file.path);
  const workbook = xlsx.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

  // Processamento dos dados do Excel (Ignorar cabeçalho)
  const records = data
    .slice(1) // Ignorar cabeçalho
    .map((row) => ({
      codigo: row[0] ? row[0].toString().trim() : null,
      nome: row[1] ? row[1].toString().trim() : null,
      nome_fantasia: row[2] ? row[2].toString().trim() : null,
    }))
    .filter((record) => record.codigo && record.nome && record.nome_fantasia); // Remover linhas vazias

  if (records.length === 0) {
    return res
      .status(400)
      .json({ error: "Nenhum dado válido encontrado no arquivo." });
  }

  // Iterar sobre os registros e verificar se já existem no banco
  const sqlSelect = `SELECT codigo FROM clientes WHERE codigo = ?`;
  const sqlInsert = `INSERT INTO clientes (codigo, nome, nome_fantasia) VALUES (?, ?, ?)`;
  const sqlUpdate = `UPDATE clientes SET nome = ?, nome_fantasia = ? WHERE codigo = ?`;

  records.forEach((record) => {
    dbOcorrencias.query(sqlSelect, [record.codigo], (err, results) => {
      if (err) {
        console.error("Erro ao buscar cliente:", err);
        return;
      }

      if (results.length > 0) {
        // Cliente já existe, então faz o update
        dbOcorrencias.query(
          sqlUpdate,
          [record.nome, record.nome_fantasia, record.codigo],
          (err) => {
            if (err) {
              console.error("Erro ao atualizar cliente:", err);
            } else {
            }
          }
        );
      } else {
        // Cliente não existe, então insere
        dbOcorrencias.query(
          sqlInsert,
          [record.codigo, record.nome, record.nome_fantasia],
          (err) => {
            if (err) {
              console.error("Erro ao inserir cliente:", err);
            } else {
              console.log(`Cliente ${record.codigo} inserido.`);
            }
          }
        );
      }
    });
  });

  // Remover o arquivo após o processamento
  fs.unlinkSync(filePath);

  res.json({ message: "Clientes atualizados/inseridos com sucesso!" });
});

app.post("/concluir-entrega", (req, res) => {
  const { entregaId, clienteNome } = req.body;

  const sqlUpdate = `UPDATE entregas SET ZH_STATUS = 'CONCLUIDA' WHERE id = ?`;
  dbRegistros.query(sqlUpdate, [entregaId], (err, result) => {
    if (err) {
      console.error("Erro ao concluir entrega:", err);
      return res.status(500).json({ error: "Erro no servidor" });
    }

    // Enviar notificação via WebSocket
    enviarNotificacao({ nome: clienteNome, entregaId });

    res.json({ message: "Entrega concluída com sucesso!" });
  });
});

// helper p/ usar await com dbRegistros
const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    dbRegistros.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });


app.post("/resetar-foto", (req, res) => {
  const { entregaId } = req.body;

  if (!entregaId) {
    return res.status(400).json({ error: "ID da entrega é obrigatório" });
  }

  const sqlUpdate = `
    UPDATE entregas 
       SET ZH_FOTO_URL = NULL, 
           ZH_OBS = NULL,             -- 🔹 limpa a observação junto
           ZH_STATUS = 'PENDENTE' 
     WHERE ZB_NUMSEQ = ? 
       AND (ZH_STATUS = 'CONCLUIDA' OR ZH_STATUS = 'NAO_ENTREGUE')
  `;

  dbRegistros.query(sqlUpdate, [entregaId], (err, result) => {
    if (err) {
      console.error("Erro ao resetar foto/status/obs:", err);
      return res.status(500).json({ error: "Erro no servidor" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "Entrega não encontrada ou status já é Pendente",
      });
    }

    // Notificação via WebSocket (mesmo padrão)
    enviarNotificacao({
      nome: "Desconhecido", // se tiver cliente, substitui aqui
      entregaId,
    });

    res.json({
      success: true,
      message: "Foto e observação resetadas; status alterado para PENDENTE",
    });
  });
});

// Rota para gerar o relatório em PDF
app.post(
  "/gerar-relatorio-pdf",
  upload.single("excelFile"),
  async (req, res) => {
    try {
      const excelFilePath = req.file.path; // caminho do arquivo salvo
      const selectedCompany = req.body.selectedCompany;
      const numColumns = parseInt(req.body.numColumns, 10);
      const numRows = parseInt(req.body.numRows, 10);

      // Chama a função que gera o PDF e retorna um Buffer
      const pdfBuffer = await generatePdfReport(
        excelFilePath,
        selectedCompany,
        numColumns,
        numRows
      );

      // Define headers para PDF e envia o buffer
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline; filename=relatorio.pdf");
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      res.status(500).json({ message: "Erro ao gerar PDF" });
    } finally {
      // Remove o arquivo Excel temporário
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Erro ao deletar arquivo temporário:", err);
        });
      }
    }
  }
);

// Endpoint para gerar análise com a DeepSeek
app.post("/generate-analysis", async (req, res) => {
  const { data } = req.body; // Dados enviados pelo frontend

  try {
    const apiKey = process.env.DEEPSEEK_API_KEY; // Chave da API em variáveis de ambiente
    const apiUrl = "https://api.deepseek.com/v1/analyze"; // Endpoint da DeepSeek

    const response = await axios.post(
      apiUrl,
      {
        data: data,
        prompt: "Analise os dados e gere um resumo com insights relevantes.",
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Retorna a análise para o frontend
    res.json({ analysis: response.data.analysis });
  } catch (error) {
    console.error("Erro ao chamar a API da DeepSeek:", error);
    res.status(500).json({ error: "Erro ao gerar análise." });
  }
});

app.get("/db-status", (req, res) => {
  dbOcorrencias.getConnection((err, connection) => {
    if (err) {
      console.error("Erro ao conectar ao banco OCORRÊNCIAS:", err);
      return res.json({ connected: false });
    } else {
      connection.release();
      return res.json({ connected: true });
    }
  });
});

// Rota para buscar os registros da tabela "registros_ocorrencias"
app.get("/nfe", async (req, res) => {
  try {
    const connection = await dbOcorrencias.promise().getConnection(); // 🔹 Usa ".promise()" para trabalhar com async/await
    const [rows] = await connection.query(
      "SELECT * FROM registros_ocorrencias ORDER BY dtdigit DESC"
    );
    connection.release();

    res.json(rows);
  } catch (error) {
    console.error("Erro ao buscar registros:", error);
    res.status(500).json({ error: "Erro ao buscar dados do banco" });
  }
});

// Rota para buscar os registros da tabela "notas_sem_chave"
app.get("/notasSemChave", async (req, res) => {
  try {
    const connection = await dbOcorrencias.promise().getConnection();
    const [rows] = await connection.query(
      "SELECT * FROM notas_sem_chave ORDER BY emissao DESC"
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error("Erro ao buscar registros das notas sem chave:", error);
    res.status(500).json({ error: "Erro ao buscar dados do banco" });
  }
});

app.post("/usuarios/adicionar", async (req, res) => {
  const { username, password, origem, email, setor } = req.body;
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Use the promise-based query interface
    await dbOcorrencias
      .promise()
      .query(
        "INSERT INTO users (username, password, origem, email, setor) VALUES (?, ?, ?, ?, ?)",
        [username, hashedPassword, origem || null, email || null, setor || null]
      );

    res.json({ message: "Usuário adicionado com sucesso" });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return res.status(400).json({ error: "Este nome de usuário já está em uso." });
    }
    console.error("Erro ao adicionar usuário:", error);
    res.status(500).json({ error: "Erro ao adicionar usuário" });
  }
});

app.get("/usuarios/:username/locais", async (req, res) => {
  const { username } = req.params;

  try {
    const [rows] = await dbOcorrencias
      .promise()
      .query("SELECT * FROM users WHERE username = ?", [username]);

    if (rows.length === 0) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    // Aqui está o problema: atualmente você envia só um local (o campo `origem`)
    // Para teste, vamos retornar todos os locais possíveis
    const [todosLocais] = await dbOcorrencias
      .promise()
      .query("SELECT DISTINCT origem FROM users WHERE origem IS NOT NULL");

    const locais = todosLocais.map((row) => row.origem);

    res.json({ locais });
  } catch (err) {
    console.error("Erro ao buscar locais:", err);
    res.status(500).json({ erro: "Erro ao buscar locais" });
  }
});

app.put("/usuarios/:username/local", async (req, res) => {
  const { username } = req.params;
  const { novoLocal } = req.body;

  if (!novoLocal) {
    return res.status(400).json({ erro: "Campo 'novoLocal' é obrigatório." });
  }

  try {
    const [result] = await dbOcorrencias
      .promise()
      .query("UPDATE users SET origem = ? WHERE username = ?", [
        novoLocal,
        username,
      ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    res.json({ sucesso: true, mensagem: "Local atualizado com sucesso!" });
  } catch (err) {
    console.error("Erro ao atualizar local:", err);
    res.status(500).json({ erro: "Erro ao atualizar local." });
  }
});

app.put("/usuarios/:username/setor", async (req, res) => {
  const { username } = req.params;
  const { novoSetor } = req.body;

  try {
    const [result] = await dbOcorrencias
      .promise()
      .query("UPDATE users SET setor = ? WHERE username = ?", [
        novoSetor || null,
        username,
      ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    res.json({ sucesso: true, mensagem: "Setor atualizado com sucesso!" });
  } catch (err) {
    console.error("Erro ao atualizar setor:", err);
    res.status(500).json({ erro: "Erro ao atualizar setor." });
  }
});

// Gerenciador protegido
app.get(
  "/gerenciador",
  authenticateToken,
  checkPermission("GERENCIADOR"),
  (req, res) => {
    res.status(200).json({ mensagem: "Acesso autorizado ao GERENCIADOR" });
  }
);

// ------------------ FINANCEIRO --------------------------------------------------

// Lista de vendedores
app.get("/vendedor", (req, res) => {
  const vendedores = [
    { codigo: "000001", nome: "MAURICIO" },
    //{ codigo: "000005", nome: "FELIPE - LOJA" },
    { codigo: "000016", nome: "FELIPE - LOJA" },
    { codigo: "000026", nome: "PAULINHO" },
    { codigo: "000028", nome: "SILVIO VULCAO DAS MERCES JUNIOR" },
    { codigo: "000067", nome: "JEFFERSON" },
    { codigo: "000068", nome: "ADEILTON" },
    { codigo: "000077", nome: "VENDAS CD" },
    { codigo: "000079", nome: "CEARA VIAGEM" },
    { codigo: "000086", nome: "ALEXANDRE AUGUSTO" },
    { codigo: "000088", nome: "WANDERSON JUNIOR" },
    { codigo: "000089", nome: "ANDERSON SANTOS" },
    { codigo: "000078", nome: "LUIZ NUNES" },
  ];

  res.json(vendedores); // Retorna a lista de vendedores como JSON
});

// Rota para gerar o relatório de clientes de um vendedor
app.get("/vendedor", async (req, res) => {
  const nomeVendedor = req.query.nome;

  if (!nomeVendedor) {
    return res.status(400).send("O nome do vendedor é obrigatório.");
  }

  try {
    await getMSSQLPool();
    const request = new sql.Request();
    const query = `
            SELECT 
                A1.A1_COD AS CodigoCliente,
                A1.A1_NREDUZ AS RSocial
            FROM SA1140 A1
            INNER JOIN SA3140 A3 ON A1.A1_VEND = A3.A3_COD
            WHERE A3.A3_NOME = @nomeVendedor
        `;

    request.input("nomeVendedor", sql.VarChar, nomeVendedor);
    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return res
        .status(404)
        .send("Nenhum cliente encontrado para este vendedor.");
    }

    const pdfBuffer = await generateClienteReport(
      nomeVendedor,
      result.recordset
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=relatorio_${nomeVendedor}.pdf`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Erro ao gerar o PDF:", error);
    res.status(500).send("Erro ao gerar o PDF.");
  }
});

// Definir a rota para o endpoint que vai chamar a função
app.get("/cliente", authenticateToken, getClientes);
app.get("/contas-pagar", authenticateToken, getContasPagar);

async function getContasPagar(req, res) {
  try {
    const pool = await getMSSQLPool();
    if (!pool) return res.status(500).json({ error: "Banco Protheus indisponível" });

    const query = `
      SELECT 
        E2_NUM, 
        E2_PARCELA, 
        E2_NATUREZ, 
        E2_FORNECE, 
        E2_NOMFOR, 
        E2_EMISSAO, 
        E2_VENCTO, 
        E2_VALOR,
        E2_SALDO
      FROM SE2140 
      WHERE E2_FILIAL = '01' 
        AND E2_VENCTO >= '20260101'
        AND D_E_L_E_T_ = ''
      ORDER BY E2_VENCTO DESC
    `;

    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error("Erro ao buscar Contas a Pagar:", error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
}

// --- SUPABASE SETUP (CONTAS A PAGAR) ---
const { createClient } = require("@supabase/supabase-js");
const supabasePagar = createClient(
  process.env.PAGAR_SUPABASE_URL || process.env.SUPABASE_URL, 
  process.env.PAGAR_SUPABASE_KEY || process.env.SUPABASE_KEY
);

// --- ANEXOS CONTAS A PAGAR ---

app.post("/contas-pagar/anexar", authenticateToken, upload.single("arquivo"), async (req, res) => {
  const titulo_num = req.body.titulo_num?.trim();
  const parcela = req.body.parcela?.trim();
  const fornecedor = req.body.fornecedor?.trim();
  const tipo_anexo = req.body.tipo_anexo;
  const file = req.file;

  logger.info(`[Anexo] Recebendo arquivo para Título: ${titulo_num}, Parcela: ${parcela}, Fornecedor: ${fornecedor}`);

  if (!file) {
    logger.error("[Anexo] Erro: Arquivo não recebido pelo Multer.");
    return res.status(400).json({ error: "Arquivo não recebido." });
  }

  if (!titulo_num || !fornecedor || !tipo_anexo) {
    logger.error("[Anexo] Erro: Dados incompletos no corpo da requisição.");
    return res.status(400).json({ error: "Dados incompletos para o anexo." });
  }

  try {
    const fileBuffer = fs.readFileSync(file.path);
    const fileName = `${Date.now()}_${file.originalname}`;
    const filePathInBucket = `anexos/${titulo_num}_${parcela}_${fornecedor}/${fileName}`;

    // Upload para o Supabase Storage
    const { data: uploadData, error: uploadError } = await supabasePagar.storage
      .from("contas-pagar")
      .upload(filePathInBucket, fileBuffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Obter URL pública
    const { data: urlData } = supabasePagar.storage
      .from("contas-pagar")
      .getPublicUrl(filePathInBucket);

    const arquivo_url = urlData.publicUrl;

    const query = `
      INSERT INTO contas_pagar_anexos 
      (titulo_num, parcela, fornecedor, tipo_anexo, arquivo_nome, arquivo_url) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    await dbOcorrencias.promise().query(query, [
      titulo_num, 
      parcela, 
      fornecedor, 
      tipo_anexo, 
      file.originalname, 
      arquivo_url
    ]);

    // Deletar arquivo temporário local
    fs.unlinkSync(file.path);

    res.json({ success: true, message: "Anexo salvo no Supabase!" });
  } catch (error) {
    logger.error("Erro ao salvar anexo no Supabase:", error);
    res.status(500).json({ 
      error: "Erro ao processar anexo.", 
      details: error.message, 
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
});

app.get("/contas-pagar/anexos/:titulo/:parcela/:fornecedor", authenticateToken, async (req, res) => {
  const titulo = (req.query.titulo || req.params.titulo)?.trim();
  const parcela = (req.query.parcela || req.params.parcela)?.trim() || "";
  const fornecedor = (req.query.fornecedor || req.params.fornecedor)?.trim();

  try {
    const [rows] = await dbOcorrencias.promise().query(
      "SELECT * FROM contas_pagar_anexos WHERE TRIM(titulo_num) = ? AND TRIM(parcela) = ? AND TRIM(fornecedor) = ?",
      [titulo, parcela, fornecedor]
    );
    res.json(rows);
  } catch (error) {
    logger.error("Erro ao buscar anexos:", error);
    res.status(500).json({ error: "Erro ao buscar anexos." });
  }
});

// Endpoint para retornar o resumo de anexos de todos os títulos
app.get("/contas-pagar/anexos-resumo", authenticateToken, async (req, res) => {
  try {
    const [rows] = await dbOcorrencias.promise().query(`
      SELECT TRIM(titulo_num) as titulo_num, 
             TRIM(parcela) as parcela, 
             TRIM(fornecedor) as fornecedor, 
             SUM(CASE WHEN tipo_anexo = 'NF' THEN 1 ELSE 0 END) as has_nf,
             MAX(CASE WHEN tipo_anexo = 'NF' THEN arquivo_url ELSE NULL END) as nf_url,
             SUM(CASE WHEN tipo_anexo = 'BOLETO' THEN 1 ELSE 0 END) as has_boleto,
             MAX(CASE WHEN tipo_anexo = 'BOLETO' THEN arquivo_url ELSE NULL END) as boleto_url
      FROM contas_pagar_anexos
      GROUP BY TRIM(titulo_num), TRIM(parcela), TRIM(fornecedor)
    `);
    res.json(rows);
  } catch (error) {
    console.error("Erro ao buscar resumo de anexos:", error);
    res.status(500).json({ error: "Erro ao buscar resumo." });
  }
});

app.delete("/contas-pagar/anexos/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await dbOcorrencias.promise().query("SELECT arquivo_url FROM contas_pagar_anexos WHERE id = ?", [id]);
    
    if (rows.length > 0) {
      const url = rows[0].arquivo_url;
      // Extrair o path relativo do bucket a partir da URL pública
      const pathPart = url.split('/storage/v1/object/public/contas-pagar/')[1];
      
      if (pathPart) {
        await supabasePagar.storage.from("contas-pagar").remove([pathPart]);
      }
    }

    await dbOcorrencias.promise().query("DELETE FROM contas_pagar_anexos WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir anexo:", error);
    res.status(500).json({ error: "Erro ao excluir anexo." });
  }
});

// Função para realizar a consulta SQL e retornar os resultados
async function getClientes(req, res) {
  try {
    await getMSSQLPool();

    // Primeira consulta principal para buscar todos os clientes
    const query = `
WITH UltimosTitulos AS (
  SELECT
    SE1.E1_NUM,
    SE1.E1_SALDO,
    SE1.E1_TIPO,
    SE1.E1_CLIENTE,
    SE1.E1_NOMCLI,
    SE1.E1_VENCREA,
    SE1.E1_VALOR,
    SA1.A1_MSBLQL AS STATUS_CLIENTE,
    Z4.Z4_NOTA,
    Z4.Z4_NOMVEN AS NOME_VENDEDOR,
    ROW_NUMBER() OVER (PARTITION BY SE1.E1_NUM ORDER BY SE1.R_E_C_N_O_ DESC) AS rn
  FROM
    SE1140 SE1
  JOIN
    SA1140 SA1 ON SE1.E1_CLIENTE = SA1.A1_COD
  OUTER APPLY (
    SELECT TOP 1 Z4.Z4_NOTA, Z4.Z4_NOMVEN
    FROM SZ4140 Z4
    WHERE Z4.Z4_BILHETE = SE1.E1_NUM
    ORDER BY Z4.R_E_C_N_O_ DESC
  ) Z4
  WHERE
    SE1.E1_FILIAL = '01'
    AND SE1.D_E_L_E_T_ = ''
    AND SE1.E1_SALDO <> 0
    AND SE1.E1_PREFIXO IN ('BIL', '001')
    AND SE1.E1_CLIENTE NOT IN ('0001', '1096','YDORZ3','YDOR8S','3745','YDOSPA')
    AND SE1.E1_VENCREA < DATEADD(DAY, -1, GETDATE())
    AND (SA1.A1_MSBLQL IN ('', '1', '2'))
)

SELECT *
FROM UltimosTitulos
WHERE rn = 1
ORDER BY E1_NOMCLI;


        `;

    const request = new sql.Request();
    const result = await request.query(query);
    const clientes = result.recordset;

    // Coleta todos os números E1_NUM dos títulos do tipo NCC
    const nccClientes = clientes.filter((cliente) => cliente.E1_TIPO === "NCC");
    const nccNumeros = nccClientes
      .map((cliente) => `'${cliente.E1_NUM}'`)
      .join(",");

    // Se houver títulos do tipo NCC, faz uma consulta única para buscar os bilhetes
    if (nccNumeros.length > 0) {
      const queryBilhete = `
            SELECT 
                SZ4140.Z4_BILHETE AS Numero_Bilhete,
                SZ4140.Z4_NOTA
            FROM 
                SZ4140
            JOIN 
                SD1140 ON SZ4140.Z4_NOTA = SD1140.D1_NFORI
            WHERE 
                SZ4140.Z4_BILHETE IN (${nccNumeros})
                AND SD1140.D1_FILIAL = '01';
            `;

      const bilheteRequest = new sql.Request();
      const bilheteResult = await bilheteRequest.query(queryBilhete);

      // Criar um mapa para associar bilhetes às notas NCC
      const bilheteMap = {};
      bilheteResult.recordset.forEach((row) => {
        bilheteMap[row.Z4_NOTA] = row.Numero_Bilhete;
      });

      // Substituir as notas pelos bilhetes no resultado principal
      clientes.forEach((cliente) => {
        if (cliente.E1_TIPO === "NCC" && bilheteMap[cliente.E1_NUM]) {
          cliente.Z4_NOTA = bilheteMap[cliente.E1_NUM];
        }
      });
    }

    res.json(clientes);
  } catch (error) {
    console.error(
      "Erro ao conectar ao banco de dados ou executar a query:",
      error
    );
    res.status(500).send("Erro no servidor");
  }
}

// Função para gerar o relatório de PDF
// Endpoint para gerar o relatório por vendedor (analítico ou sintético)
// Função para gerar o relatório de PDF
app.get("/relatorio-vendedor", async (req, res) => {
  const vendedor = req.query.vendedor;
  const tipoRelatorio = req.query.tipo;

  try {
    await getMSSQLPool();

    const query = `
SELECT DISTINCT
    SE1140.E1_NUM,
    SE1140.E1_CLIENTE, 
    SE1140.E1_NOMCLI, 
    SE1140.E1_VALOR,
    SE1140.E1_SALDO,
    SE1140.E1_EMISSAO,
    SE1140.E1_VENCREA,
    SZ4140.Z4_NOTA
FROM 
    SE1140
JOIN 
    SZ4140 ON SE1140.E1_NUM = SZ4140.Z4_BILHETE
WHERE 
    SE1140.E1_FILIAL = '01'
    AND SE1140.D_E_L_E_T_ = ''
    AND SE1140.E1_SALDO <> '0'
    AND SE1140.E1_TIPO <> 'NCC'
    AND SE1140.E1_NOMCLI <> 'A VISTA'
    AND SE1140.E1_VENCREA < DATEADD(DAY, -1, GETDATE())
    AND SZ4140.Z4_NOMVEN LIKE '%' + @vendedor + '%'  -- Faz a busca parcial pelo vendedor
ORDER BY SE1140.E1_CLIENTE;

        `;

    const request = new sql.Request();
    request.input("vendedor", sql.VarChar, `%${vendedor}%`);
    const result = await request.query(query);

    if (tipoRelatorio === "sintetico") {
      // Gera relatório sintético
      const pdfBuffer = await generateFiadoVendedorSinteticoReport(
        vendedor,
        result.recordset
      );
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=relatorio_sintetico_${vendedor}.pdf`
      );
      return res.send(pdfBuffer);
    } else if (tipoRelatorio === "analitico") {
      // Gera relatório analítico
      const pdfBuffer = await generateFiadoVendedorAnaliticoReport(
        vendedor,
        result.recordset
      );
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=relatorio_analitico_${vendedor}.pdf`
      );
      return res.send(pdfBuffer);
    } else {
      return res.status(400).send("Tipo de relatório inválido");
    }
  } catch (error) {
    console.error("Erro ao gerar o relatório PDF:", error);
    res.status(500).send("Erro ao gerar o relatório");
  }
});

const generateClienteReport = require("./src/Financeiro/routes/generateClienteReport");

// Endpoint para gerar o relatório PDF de um cliente específico
app.get("/relatorio-cliente", async (req, res) => {
  const cliente = req.query.cliente;

  try {
    await getMSSQLPool();
    const query = `
        SELECT DISTINCT 
            SE1140.E1_NUM, 
            SZ4140.Z4_NOTA,
            SE1140.E1_TIPO,
            SZ4140.Z4_NOTA, 
            SE1140.E1_EMISSAO, 
            SE1140.E1_VENCREA, 
            SE1140.E1_CLIENTE, 
            SE1140.E1_NOMCLI, 
            SE1140.E1_VALOR,
            SE1140.E1_SALDO,
            SZ4140.Z4_NOMVEN AS NOME_VENDEDOR
        FROM 
            SE1140
        JOIN 
            SA1140 ON SE1140.E1_CLIENTE = SA1140.A1_COD
        JOIN 
            SZ4140 ON SE1140.E1_NUM = SZ4140.Z4_BILHETE
        WHERE 
            SE1140.E1_FILIAL = '01'
            AND SE1140.D_E_L_E_T_ = ''
            AND SE1140.E1_SALDO <> '0'
            AND SE1140.E1_TIPO <> 'NCC'
            AND SE1140.E1_VENCREA < DATEADD(DAY, -1, GETDATE())
            AND SE1140.E1_NOMCLI = @cliente
        ORDER BY SE1140.E1_VENCREA;
        `;

    const request = new sql.Request();
    request.input("cliente", sql.VarChar, cliente);
    const result = await request.query(query);

    const pdfBuffer = await generateClienteReport(cliente, result.recordset);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=relatorio_${cliente}.pdf`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Erro ao gerar o relatório PDF:", error);
    res.status(500).send("Erro ao gerar o relatório");
  }
});

// Rota para gerar o relatório de carteira de clientes de um vendedor
app.get("/vendedor-cliente", async (req, res) => {
  const vendedor = req.query.vendedor;

  if (!vendedor) {
    return res.status(400).send("O nome ou código do vendedor é obrigatório.");
  }

  try {
    await getMSSQLPool();

    // Consulta SQL para buscar clientes relacionados ao vendedor
    const query = `
SELECT 
    A1.A1_COD AS CodigoCliente,
    A1.A1_NOME AS NomeCliente,
    A1.A1_NREDUZ AS RSocial,
    A1.A1_ULTCOM AS UltimaCompra,
    A1.A1_MSBLQL AS Bloqueado,
    COALESCE(SUM(E1.E1_VALOR), 0) AS TotalPendencias,
    COALESCE(AVG(DATEDIFF(DAY, E1.E1_VENCTO, GETDATE())), 0) AS MediaDiasAtraso,
    COALESCE(COUNT(CASE WHEN YEAR(E1.E1_EMISSAO) = YEAR(GETDATE()) THEN 1 END), 0) AS QuantidadeTitulosAnoAtual,
    COALESCE((
        SELECT AVG(E1_SUB.E1_VALOR)
        FROM SE1140 E1_SUB
        WHERE E1_SUB.E1_CLIENTE = A1.A1_COD
        AND E1_SUB.E1_EMISSAO >= DATEADD(YEAR, -5, GETDATE())
        AND E1_SUB.E1_FILIAL = '01'
        AND E1_SUB.D_E_L_E_T_ = ''
    ), 0) AS MediaValorPedido,
    E4.E4_DESCRI AS CondicaoPagamento  -- Adicionando a descrição da condição de pagamento
FROM 
    SA1140 A1
INNER JOIN 
    SA3140 A3 
    ON A1.A1_VEND = A3.A3_COD
LEFT JOIN 
    SE1140 E1 
    ON A1.A1_COD = E1.E1_CLIENTE
    AND E1.E1_FILIAL = '01'
    AND E1.D_E_L_E_T_ = ''
    AND E1.E1_SALDO <> '0'
    AND E1.E1_PREFIXO = 'BIL'
    AND E1.E1_VENCTO < GETDATE()
LEFT JOIN 
    SE4140 E4  -- Realizando o JOIN com a tabela SE4140
    ON A1.A1_COND = E4.E4_CODIGO
WHERE 
    A1.A1_FILIAL = '01'
    AND A1.D_E_L_E_T_ = ''
    AND A3.A3_FILIAL = '01'
    AND A3.A3_NOME = @vendedor
GROUP BY 
    A1.A1_COD, 
    A1.A1_NOME, 
    A1.A1_NREDUZ, 
    A1.A1_ULTCOM, 
    A1.A1_MSBLQL,
    E4.E4_DESCRI;  -- Adicionar


        `;

    const request = new sql.Request();
    request.input("vendedor", sql.VarChar, vendedor); // Passando o vendedor selecionado
    const result = await request.query(query);

    // Adicione um log para inspecionar os dados retornados pela consulta SQL

    if (result.recordset.length === 0) {
      return res
        .status(404)
        .send("Nenhum cliente encontrado para este vendedor.");
    }

    // Geração do PDF
    const pdfBuffer = await generateVendedorReport(vendedor, result.recordset); // Chama a função correta para gerar o relatório
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=carteira_${vendedor}.pdf`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Erro ao gerar o PDF:", error);
    res.status(500).send("Erro ao gerar o PDF.");
  }
});

app.get("/vendedor-relatorio", async (req, res) => {
  const vendedor = req.query.vendedor;

  if (!vendedor) {
    return res.status(400).send("O nome ou código do vendedor é obrigatório.");
  }

  try {
    await getMSSQLPool();

    // Primeira query - clientes do vendedor
    const queryClientes = `
SELECT 
    A1.A1_COD AS CodigoCliente,
    A1.A1_NOME AS NomeCliente,
    A1.A1_NREDUZ AS RSocial,
    A1.A1_ULTCOM AS UltimaCompra,
    A1.A1_MSBLQL AS Bloqueado,
    COALESCE(SUM(E1.E1_VALOR), 0) AS TotalPendencias,
    COALESCE(AVG(DATEDIFF(DAY, E1.E1_VENCTO, GETDATE())), 0) AS MediaDiasAtraso,
    COALESCE(COUNT(CASE WHEN YEAR(E1.E1_EMISSAO) = YEAR(GETDATE()) THEN 1 END), 0) AS QuantidadeTitulosAnoAtual,
    COALESCE((
        SELECT AVG(E1_SUB.E1_VALOR)
        FROM SE1140 E1_SUB
        WHERE E1_SUB.E1_CLIENTE = A1.A1_COD
        AND E1_SUB.E1_EMISSAO >= DATEADD(YEAR, -5, GETDATE())
        AND E1_SUB.E1_FILIAL = '01'
        AND E1_SUB.D_E_L_E_T_ = ''
    ), 0) AS MediaValorPedido,
    E4.E4_DESCRI AS CondicaoPagamento  -- Adicionando a descrição da condição de pagamento
FROM 
    SA1140 A1
INNER JOIN 
    SA3140 A3 
    ON A1.A1_VEND = A3.A3_COD
LEFT JOIN 
    SE1140 E1 
    ON A1.A1_COD = E1.E1_CLIENTE
    AND E1.E1_FILIAL = '01'
    AND E1.D_E_L_E_T_ = ''
    AND E1.E1_SALDO <> '0'
    AND E1.E1_PREFIXO = 'BIL'
    AND E1.E1_VENCTO < GETDATE()
LEFT JOIN 
    SE4140 E4  -- Realizando o JOIN com a tabela SE4140
    ON A1.A1_COND = E4.E4_CODIGO
WHERE 
    A1.A1_FILIAL = '01'
    AND A1.D_E_L_E_T_ = ''
    AND A3.A3_FILIAL = '01'
    AND A3.A3_NOME = @vendedor
GROUP BY 
    A1.A1_COD, 
    A1.A1_NOME, 
    A1.A1_NREDUZ, 
    A1.A1_ULTCOM, 
    A1.A1_MSBLQL,
    E4.E4_DESCRI;  -- Adicionar

        `;

    const request = new sql.Request();
    request.input("vendedor", sql.VarChar, vendedor);
    const resultClientes = await request.query(queryClientes);

    // Segunda query - ranking de pagadores
    // Segunda query - ranking de pagadores
    const queryRanking = `
SELECT 
    E1.E1_CLIENTE AS CodigoCliente,
    E1.E1_NOMCLI AS NomeCliente,
    COUNT(CASE WHEN DATEDIFF(DAY, E1.E1_VENCTO, COALESCE(E1.E1_BAIXA, GETDATE())) > 0 THEN 1 END) AS TitulosAtrasados,
    COUNT(CASE WHEN DATEDIFF(DAY, E1.E1_VENCTO, COALESCE(E1.E1_BAIXA, GETDATE())) <= 0 THEN 1 END) AS TitulosEmDia
FROM SE1140 E1
WHERE E1.E1_FILIAL = '01'
    AND E1.D_E_L_E_T_ = ''  -- Não deletado
GROUP BY E1.E1_CLIENTE, E1.E1_NOMCLI
ORDER BY TitulosAtrasados DESC, TitulosEmDia DESC;
`;

    const resultRanking = await request.query(queryRanking);

    console.log("Resultado do Ranking:", resultRanking.recordset);

    // Geração do PDF com as informações de clientes e ranking
    const pdfBuffer = await generateVendedorReport(
      vendedor,
      resultClientes.recordset,
      resultRanking.recordset
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=relatorio_${vendedor}.pdf`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Erro ao gerar o relatório:", error);
    res.status(500).send("Erro ao gerar o relatório");
  }
});

app.get("/entregas", (req, res) => {
  const sql = `
      SELECT 
        ZB_NOMCLI, 
        ZB_NUMSEQ, 
        ZB_NOTA, 
        ZH_FOTO_URL, 
        ZB_DTENTRE, 
        ZH_CODIGO,  -- Adicionada a coluna Rota
        ZH_STATUS   -- Adicionada a coluna Status
      FROM entregas 
      ORDER BY ZB_DTENTRE DESC`;

  dbRegistros.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao buscar entregas:", err);
      return res.status(500).json({ error: "Erro no servidor" });
    }
    res.json(results);
  });
});

// Exemplo de rota para checar conexão com o PROTHEUS
// Exemplo de rota para checar PROTHEUS
app.get("/check-protheus", async (req, res) => {
  try {
    await getMSSQLPool();
    // se chegou aqui, conectou
    return res.json({ connected: true });
  } catch (err) {
    console.error("Erro ao conectar ao PROTHEUS:", err);
    return res.json({ connected: false });
  }
});

// --------------------------------------------------------------------------------

// ------------------------------- ESTOQUE -----------------------------------------

app.get("/compras-mercadoria", async (req, res) => {
  try {
    const { data, local } = req.query; // Ex: data = '2025-05-01', local = '07'

    if (!data || !local) {
      return res.status(400).json({ error: "Data e local são obrigatórios." });
    }

    const connection = await dbOcorrencias.promise().getConnection();
    // Normalizar o local para garantir comparação correta (remover espaços, garantir formato com 2 dígitos)
    const localNormalizado = String(local).trim().padStart(2, "0");
    const [rows] = await connection.query(
      `
      SELECT 
        id, 
        codigo AS numero, 
        descricao AS fornecedor, 
        status,
        DATE(chegada) AS chegada
      FROM compras_mercadoria
      WHERE DATE(chegada) = ? 
        AND TRIM(local) = ?
      ORDER BY id DESC
      `,
      [data, localNormalizado]
    );

    connection.release();

    // Buscar status de efetivação do Protheus (Z2_TM) para todas as compras de uma vez
    // Z2_TM = '' (vazio) = EM ABERTO
    // Z2_TM = 'S' = EFETIVADA
    try {
      if (rows.length === 0) {
        return res.json([]);
      }

      const sqlPool = await getMSSQLPool();
      const request = sqlPool.request();

      // Criar lista de códigos de compra para buscar de uma vez
      const codigosCompras = rows
        .map((c) => c.numero)
        .map((cod) => `'${cod}'`)
        .join(",");

      // Buscar Z2_TM para todas as compras de uma vez
      const result = await request.query(`
        SELECT Z2_CODCAR, Z2_TM
        FROM SZ2140
        WHERE Z2_FILIAL = '01'
          AND D_E_L_E_T_ = ''
          AND Z2_LOCAL = '${localNormalizado}'
          AND Z2_CODCAR IN (${codigosCompras})
      `);

      // Criar mapa de efetivação: codigo -> efetivada (0 ou 1)
      const efetivacaoMap = {};
      result.recordset.forEach((row) => {
        const z2_tm = (row.Z2_TM || "").trim();
        // Z2_TM = '' (vazio) = EM ABERTO (0)
        // Z2_TM = 'S' = EFETIVADA (1)
        efetivacaoMap[row.Z2_CODCAR] = z2_tm === "S" ? 1 : 0;
      });

      // Adicionar campo efetivada a cada compra
      const comprasComEfetivacao = rows.map((compra) => ({
        ...compra,
        efetivada:
          efetivacaoMap[compra.numero] !== undefined
            ? efetivacaoMap[compra.numero]
            : 0,
      }));

      // Removido sqlPool.close() pois o pool é compartilhado
      res.json(comprasComEfetivacao);
    } catch (protheusError) {
      console.error("Erro ao buscar dados do Protheus:", protheusError);
      // Se falhar ao buscar do Protheus, retorna sem efetivada (assume 0)
      const comprasSemEfetivacao = rows.map((compra) => ({
        ...compra,
        efetivada: 0,
      }));
      res.json(comprasSemEfetivacao);
    }
  } catch (error) {
    console.error("Erro ao buscar compras:", error);
    res.status(500).json({ error: "Erro ao buscar dados de compras" });
  }
});

// Rota para buscar compras de todos os locais dos últimos 3 dias
app.get("/compras-mercadoria/todos-locais", async (req, res) => {
  try {
    const { data } = req.query; // Data de referência (ex: '2025-05-01')

    if (!data) {
      return res.status(400).json({ error: "Data é obrigatória." });
    }

    const connection = await dbOcorrencias.promise().getConnection();

    // Calcular as 3 datas (hoje, ontem, anteontem)
    const dataRef = new Date(data);
    const data1 = dataRef.toISOString().split("T")[0]; // Hoje
    const data2 = new Date(dataRef);
    data2.setDate(data2.getDate() - 1);
    const data2Str = data2.toISOString().split("T")[0]; // Ontem
    const data3 = new Date(dataRef);
    data3.setDate(data3.getDate() - 2);
    const data3Str = data3.toISOString().split("T")[0]; // Anteontem

    const [rows] = await connection.query(
      `
      SELECT 
        id, 
        codigo AS numero, 
        descricao AS fornecedor, 
        status,
        DATE(chegada) AS chegada,
        local
      FROM compras_mercadoria
      WHERE DATE(chegada) IN (?, ?, ?)
      ORDER BY chegada DESC, id DESC
      `,
      [data1, data2Str, data3Str]
    );

    connection.release();

    // Buscar status de efetivação do Protheus para todas as compras
    try {
      if (rows.length === 0) {
        return res.json([]);
      }

      const sqlPool = await getMSSQLPool();
      const request = sqlPool.request();

      // Agrupar compras por local para buscar efetivação
      const comprasPorLocal = {};
      rows.forEach((compra) => {
        const localNormalizado = String(compra.local || "")
          .trim()
          .padStart(2, "0");
        if (!comprasPorLocal[localNormalizado]) {
          comprasPorLocal[localNormalizado] = [];
        }
        comprasPorLocal[localNormalizado].push(compra.numero);
      });

      // Buscar efetivação para cada local
      const efetivacaoMap = {};

      for (const [localNormalizado, codigos] of Object.entries(
        comprasPorLocal
      )) {
        const codigosCompras = codigos.map((cod) => `'${cod}'`).join(",");

        try {
          const result = await request.query(`
            SELECT Z2_CODCAR, Z2_TM
            FROM SZ2140
            WHERE Z2_FILIAL = '01'
              AND D_E_L_E_T_ = ''
              AND Z2_LOCAL = '${localNormalizado}'
              AND Z2_CODCAR IN (${codigosCompras})
          `);

          result.recordset.forEach((row) => {
            const z2_tm = (row.Z2_TM || "").trim();
            efetivacaoMap[row.Z2_CODCAR] = z2_tm === "S" ? 1 : 0;
          });
        } catch (err) {
          console.error(
            `Erro ao buscar efetivação para local ${localNormalizado}:`,
            err
          );
        }
      }

      // Adicionar campo efetivada a cada compra
      const comprasComEfetivacao = rows.map((compra) => ({
        ...compra,
        efetivada:
          efetivacaoMap[compra.numero] !== undefined
            ? efetivacaoMap[compra.numero]
            : 0,
      }));

      // Removido sqlPool.close() pois o pool é compartilhado
      res.json(comprasComEfetivacao);
    } catch (protheusError) {
      console.error("Erro ao buscar dados do Protheus:", protheusError);
      // Se falhar ao buscar do Protheus, retorna sem efetivada (assume 0)
      const comprasSemEfetivacao = rows.map((compra) => ({
        ...compra,
        efetivada: 0,
      }));
      res.json(comprasSemEfetivacao);
    }
  } catch (error) {
    console.error("Erro ao buscar compras de todos os locais:", error);
    res.status(500).json({ error: "Erro ao buscar dados de compras" });
  }
});

// Rota para buscar detalhes de uma compra (cabeçalho SZ2140 + itens SZ1140)
app.get("/compras-mercadoria/detalhes/:numero/:local", async (req, res) => {
  try {
    const { numero, local } = req.params;

    if (!numero || !local) {
      return res
        .status(400)
        .json({ error: "Número da compra e local são obrigatórios." });
    }

    const localNormalizado = String(local).trim().padStart(2, "0");

    const sqlPool = await getMSSQLPool();
    const request = sqlPool.request();

    // Buscar cabeçalho da compra (SZ2140)
    const headerResult = await request.query(`
      SELECT 
        Z2_CODCAR,
        Z2_CHEGADA,
        Z2_DESCRI,
        Z2_MOTORIS,
        Z2_OBSCAPA,
        Z2_LOCAL,
        Z2_TM,
        Z2_FILIAL
      FROM SZ2140
      WHERE Z2_FILIAL = '01'
        AND D_E_L_E_T_ = ''
        AND Z2_LOCAL = '${localNormalizado}'
        AND Z2_CODCAR = '${numero}'
    `);

    if (headerResult.recordset.length === 0) {
      // Removido sqlPool.close() pois o pool é compartilhado
      return res.status(404).json({ error: "Compra não encontrada." });
    }

    const header = headerResult.recordset[0];

    // Buscar itens da compra (SZ1140)
    const itensResult = await request.query(`
      SELECT 
        Z1_CODCAR,
        Z1_DATCAR,
        Z1_CODPRO,
        Z1_DESCPRO,
        Z1_CODFOR,
        Z1_FORNEC,
        Z1_QTDE,
        Z1_PRECO,
        Z1_TOTAL,
        Z1_PROC
      FROM SZ1140
      WHERE Z1_FILIAL = '01'
        AND D_E_L_E_T_ = ''
        AND Z1_CODCAR = '${numero}'
      ORDER BY Z1_CODPRO
    `);

    const itens = itensResult.recordset;

    // Formatar data de chegada
    const formatarData = (dataProtheus) => {
      if (!dataProtheus) return null;
      const str = String(dataProtheus).trim();
      if (str.length === 8) {
        return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
      }
      return null;
    };

    // Removido sqlPool.close() pois o pool é compartilhado
    res.json({
      cabecalho: {
        numero: header.Z2_CODCAR,
        chegada: formatarData(header.Z2_CHEGADA),
        descricao: header.Z2_DESCRI || "",
        motorista: header.Z2_MOTORIS || "",
        observacao: header.Z2_OBSCAPA || "",
        local: header.Z2_LOCAL || "",
        efetivada: (header.Z2_TM || "").trim() === "S" ? 1 : 0,
      },
      itens: itens.map((item) => ({
        codigo: item.Z1_CODPRO || "",
        descricao: item.Z1_DESCPRO || "",
        codFornecedor: item.Z1_CODFOR || "",
        fornecedor: item.Z1_FORNEC || "",
        quantidade: parseFloat(item.Z1_QTDE || 0),
        preco: parseFloat(item.Z1_PRECO || 0),
        total: parseFloat(item.Z1_TOTAL || 0),
        efetivado: (item.Z1_PROC || "").trim() === "1" ? 1 : 0,
        dataCar: formatarData(item.Z1_DATCAR),
      })),
    });
  } catch (error) {
    console.error("Erro ao buscar detalhes da compra:", error);
    res.status(500).json({ error: "Erro ao buscar detalhes da compra" });
  }
});

// Rota para salvar nova compra manual (cabeçalho + itens)
app.post("/compras-mercadoria/nova", async (req, res) => {
  const conn = await dbOcorrencias.promise().getConnection();
  await conn.beginTransaction();

  try {
    const { numero, descricao, chegada, produtos, local } = req.body;

    if (!numero || !chegada || !produtos || !local) {
      return res.status(400).json({ erro: "Dados incompletos." });
    }

    // Insere no cabeçalho (tabela compras_mercadoria) com o campo local normalizado
    const localNormalizado = String(local).trim().padStart(2, "0");
    await conn.query(
      `INSERT INTO compras_mercadoria (codigo, chegada, descricao, status, local)
       VALUES (?, ?, ?, 'Pendente', ?)`,
      [numero, chegada, (descricao || "").toUpperCase(), localNormalizado]
    );

    // Insere os produtos na tabela compras_mercadoria_itens
    for (const item of produtos) {
      const codigoLimpo = String(item.codigo)
        .replace(/\D/g, "")
        .padStart(6, "0");
      const codigoComPonto = `${codigoLimpo.slice(0, 3)}.${codigoLimpo.slice(
        3
      )}`;

      await conn.query(
        `INSERT INTO compras_mercadoria_itens (
          codcar, datcar, codpro, descpro, codfor, fornec, qtde
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          numero,
          chegada,
          codigoComPonto,
          item.descricao,
          codigoComPonto,
          item.fornecedor,
          item.quantidade,
        ]
      );
    }

    await conn.commit();
    conn.release();
    res.status(200).json({ mensagem: "Compra salva com sucesso!" });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error("Erro ao salvar nova compra:", err);
    res.status(500).json({ erro: "Erro ao salvar nova compra." });
  }
});

app.get("/compras-mercadoria/:codigo/itens", async (req, res) => {
  const codigo = req.params.codigo;
  const data = req.query.data;

  try {
    const [rows] = await dbOcorrencias.promise().query(
      `
      SELECT 
        i.codpro AS codigo,
        i.descpro AS descricao,
        i.qtde,
        i.preco,
        i.total,
        (
          SELECT l.qtd_lancada 
          FROM compras_mercadoria_lancamentos l
          WHERE 
            l.compra_codigo = i.codcar 
            AND l.codpro = i.codpro 
            AND DATE(l.data) = ?
          ORDER BY l.data DESC
          LIMIT 1
        ) AS qtd_lancada,
        (
          SELECT l.criado_por 
          FROM compras_mercadoria_lancamentos l
          WHERE 
            l.compra_codigo = i.codcar 
            AND l.codpro = i.codpro 
            AND DATE(l.data) = ?
          ORDER BY l.data DESC
          LIMIT 1
        ) AS criado_por,
        (
          SELECT l.criado_em 
          FROM compras_mercadoria_lancamentos l
          WHERE 
            l.compra_codigo = i.codcar 
            AND l.codpro = i.codpro 
            AND DATE(l.data) = ?
          ORDER BY l.data DESC
          LIMIT 1
        ) AS criado_em
      FROM compras_mercadoria_itens i
      WHERE i.codcar = ?
      `,
      [data, data, data, codigo]
    );

    res.json(rows);
  } catch (err) {
    console.error("Erro ao buscar itens:", err);
    res.status(500).json({ error: "Erro ao buscar itens da compra" });
  }
});

app.post("/compras-mercadoria/lancar", async (req, res) => {
  let { dataEntrada, itens } = req.body;

  if (!dataEntrada || !Array.isArray(itens)) {
    return res
      .status(400)
      .send("Dados inválidos. Esperado { dataEntrada, itens }");
  }

  try {
    // Converte dataEntrada de '20250501' para '2025-05-01'
    const dataFormatada =
      dataEntrada.length === 8
        ? `${dataEntrada.slice(0, 4)}-${dataEntrada.slice(
          4,
          6
        )}-${dataEntrada.slice(6)}`
        : dataEntrada;

    const connection = await dbOcorrencias.promise().getConnection();

    for (const item of itens) {
      await connection.query(
        `
        INSERT INTO compras_mercadoria_lancamentos 
          (compra_codigo, codpro, qtd_lancada, local, data, criado_por) 
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          qtd_lancada = VALUES(qtd_lancada), 
          local = VALUES(local),
          data = VALUES(data),
          criado_por = VALUES(criado_por)
        `,
        [
          item.compra_codigo,
          item.codpro,
          item.qtd_lancada,
          item.local || null,
          dataFormatada,
          item.usuario || "sistema",
        ]
      );
    }

    const compra_codigo = itens[0].compra_codigo;

    const [itensCompra] = await connection.query(
      `SELECT codpro, qtde FROM compras_mercadoria_itens WHERE codcar = ?`,
      [compra_codigo]
    );

    const [lancs] = await connection.query(
      `SELECT codpro, qtd_lancada FROM compras_mercadoria_lancamentos WHERE compra_codigo = ?`,
      [compra_codigo]
    );

    const lancMap = {};
    lancs.forEach((l) => (lancMap[l.codpro] = l.qtd_lancada));

    const arredondar = (val) => Number(Number(val).toFixed(3)); // arredonda pra evitar diferenças como 0.1 vs 0.100

    let status = "Lançado";
    for (const item of itensCompra) {
      const esperado = arredondar(item.qtde);
      const lancado = arredondar(lancMap[item.codpro] || 0);

      if (esperado !== lancado) {
        status = "Pendências";
        break;
      }
    }

    await connection.query(
      `UPDATE compras_mercadoria SET status = ? WHERE codigo = ?`,
      [status, compra_codigo]
    );

    connection.release();
    res.status(200).send("Lançamentos salvos com sucesso.");
  } catch (err) {
    console.error("❌ Erro ao salvar lançamento:", err);
    res.status(500).send("Erro ao salvar lançamento.");
  }
});

// EM server.js

// Nova rota para gerar o próximo número de transferência sequencial (COM ANO)
app.get("/transferencias/proximo-numero", async (req, res) => {
  const { origem, destino } = req.query;

  if (!origem || !destino) {
    return res.status(400).json({ erro: "Origem e destino são obrigatórios." });
  }

  try {
    const conn = await dbOcorrencias.promise().getConnection();

    const hoje = new Date();
    const ano = hoje.getFullYear().toString().slice(-2); // NOVO: Pega os 2 últimos dígitos do ano (ex: "25")
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");

    // ALTERADO: Formato do prefixo agora inclui o ano
    const prefixo = `${String(destino).padStart(2, "0")}${String(
      origem
    ).padStart(2, "0")}${ano}${mes}${dia}`;

    const [rows] = await conn.query(
      `SELECT MAX(numero) as ultimoNumero 
       FROM transferencias_estoque 
       WHERE numero LIKE ?`,
      [`${prefixo}%`]
    );

    let proximoNumeroSequencial = 1;
    if (rows[0] && rows[0].ultimoNumero) {
      const ultimoSequencial = parseInt(rows[0].ultimoNumero.slice(-3));
      proximoNumeroSequencial = ultimoSequencial + 1;
    }

    const novoSequencialFormatado = String(proximoNumeroSequencial).padStart(
      3,
      "0"
    );

    const proximoNumeroCompleto = `${prefixo}${novoSequencialFormatado}`;

    conn.release();
    res.json({ numero: proximoNumeroCompleto });
  } catch (err) {
    console.error("Erro ao gerar próximo número de transferência:", err);
    res.status(500).json({ erro: "Erro no servidor ao gerar número." });
  }
});

// Nova rota para gerar o próximo número de AVARIA sequencial (COM ANO)
app.get("/avarias/proximo-numero", async (req, res) => {
  const { origem, destino } = req.query;

  if (!origem || !destino) {
    return res.status(400).json({ erro: "Origem e destino são obrigatórios." });
  }

  try {
    const conn = await dbOcorrencias.promise().getConnection();

    const hoje = new Date();
    const ano = hoje.getFullYear().toString().slice(-2); // NOVO: Pega os 2 últimos dígitos do ano (ex: "25")
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");

    // ALTERADO: Formato do prefixo agora inclui o ano
    const prefixo = `${String(destino).padStart(2, "0")}${String(
      origem
    ).padStart(2, "0")}${ano}${mes}${dia}`;

    const [rows] = await conn.query(
      `SELECT MAX(numero) as ultimoNumero 
       FROM avarias_estoque 
       WHERE numero LIKE ?`,
      [`${prefixo}%`]
    );

    let proximoNumeroSequencial = 1;
    if (rows[0] && rows[0].ultimoNumero) {
      const ultimoSequencial = parseInt(rows[0].ultimoNumero.slice(-3));
      proximoNumeroSequencial = ultimoSequencial + 1;
    }

    const novoSequencialFormatado = String(proximoNumeroSequencial).padStart(
      3,
      "0"
    );

    const proximoNumeroCompleto = `${prefixo}${novoSequencialFormatado}`;

    conn.release();
    res.json({ numero: proximoNumeroCompleto });
  } catch (err) {
    console.error("Erro ao gerar próximo número de avaria:", err);
    res
      .status(500)
      .json({ erro: "Erro no servidor ao gerar número de avaria." });
  }
});

app.post("/transferencias", async (req, res) => {
  const {
    numero,
    origem,
    destino,
    data_inclusao,
    hora,
    carregador,
    produtos,
    usuario,
  } = req.body;

  if (
    !numero ||
    !origem ||
    !destino ||
    !data_inclusao ||
    !hora ||
    !carregador ||
    !Array.isArray(produtos) ||
    produtos.length === 0 ||
    !usuario
  ) {
    console.warn("❗ Requisição com campos obrigatórios faltando.");
    return res.status(400).send("Todos os campos são obrigatórios.");
  }

  const camposValidos = produtos.every(
    (p) => p.cod_produto && p.descricao && p.quantidade
  );

  if (!camposValidos) {
    return res
      .status(400)
      .send("Todos os produtos devem ter código, descrição e quantidade.");
  }

  try {
    const conn = await dbOcorrencias.promise().getConnection();

    const [existing] = await conn.query(
      "SELECT 1 FROM transferencias_estoque WHERE numero = ? LIMIT 1",
      [numero]
    );
    if (existing.length > 0) {
      conn.release();
      return res.status(409).send("Número de transferência já existe.");
    }

    // ⛔ Aqui NADA de data atual — usa só o que veio do front
    const dataFinal = `${data_inclusao} ${hora}`;

    const insertPromises = produtos.map((p) =>
      conn.query(
        `INSERT INTO transferencias_estoque 
         (numero, origem, destino, data_inclusao, carregador, cod_produto, descricao, quantidade, usuario, unidade)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          numero,
          origem,
          destino,
          dataFinal,
          carregador,
          p.cod_produto,
          p.descricao,
          p.quantidade,
          usuario,
          p.unidade || "",
        ]
      )
    );

    await Promise.all(insertPromises);

    // ✅ Registra log de criação
    await conn.query(
      `INSERT INTO transferencias_logs (numero_transferencia, acao, usuario)
       VALUES (?, 'criado', ?)`,
      [numero, usuario]
    );
    conn.release();

    res.status(201).send({ numero });
  } catch (err) {
    console.error("💥 Erro ao inserir transferência:", err);
    res.status(500).send("Erro ao salvar transferência.");
  }
});

app.get("/transferencias", async (req, res) => {
  // 1. Pega a data que o frontend enviou na URL (ex: /transferencias?data=2025-10-05)
  const { data } = req.query;

  // 2. Adiciona uma validação: se a data não for enviada, retorna um erro.
  if (!data) {
    return res.status(400).json({ erro: "O parâmetro 'data' é obrigatório." });
  }

  try {
    const conn = await dbOcorrencias.promise().getConnection();

    // 3. ADICIONA O FILTRO "WHERE" NA CONSULTA SQL
    //    Isso faz o banco de dados retornar APENAS os registros do dia solicitado.
    const [rows] = await conn.query(
      `SELECT * FROM transferencias_estoque 
       WHERE DATE(data_inclusao) = ? 
       ORDER BY numero DESC, id ASC`,
      [data] // O valor de 'data' é passado aqui de forma segura
    );

    const agrupado = {};
    rows.forEach((linha) => {
      if (!agrupado[linha.numero]) {
        agrupado[linha.numero] = {
          numero: linha.numero,
          origem: linha.origem,
          destino: linha.destino,
          // 4. Melhoria na formatação de data para evitar problemas com fuso horário
          data: dayjs.utc(linha.data_inclusao).format("DD/MM/YYYY"),
          hora: dayjs.utc(linha.data_inclusao).format("HH:mm"),
          data_inclusao: linha.data_inclusao,
          atualizado_em: linha.atualizado_em,
          data_concluida: linha.data_concluida,
          carregador: linha.carregador,
          usuario: linha.usuario,
          status: linha.status || "Pendente",
          motivo: linha.motivo || "",
          produtos: [],
        };
      }
      agrupado[linha.numero].produtos.push({
        codProduto: linha.cod_produto,
        descricao: linha.descricao,
        qtd: linha.quantidade,
        unidade: linha.unidade || "",
      });
    });

    conn.release();
    res.send(Object.values(agrupado));
  } catch (err) {
    console.error("Erro ao buscar transferências:", err);
    res.status(500).send("Erro no servidor.");
  }
});

// ✅ EXEMPLO: Rota para retornar origem do usuário
app.get("/usuarios/origem/:username", async (req, res) => {
  const { username } = req.params;

  try {
    const conn = await dbOcorrencias.promise().getConnection();

    const [rows] = await conn.query(
      "SELECT origem FROM users WHERE username = ?",
      [username]
    );

    conn.release();

    if (rows.length === 0) {
      return res.status(404).send("Usuário não encontrado.");
    }

    res.send({ origem: rows[0].origem });
  } catch (err) {
    console.error("Erro ao buscar origem do usuário:", err);
    res.status(500).send("Erro interno no servidor.");
  }
});

const localMap = {
  "01": "Loja",
  "02": "Deposito",
  "03": "B.T.F",
  "04": "Deposito da Banana",
  "05": "Deposito do Ovo",
  "06": "Passarela 02 (torres)",
  "07": "Centro de Distribuiçao (C.D)",
  "08": "Varejinho",
  "09": "Passarela 01",
};

const configPath = path.join(__dirname, "config", "impressora.json");

app.get("/impressora/config", (req, res) => {
  if (!fs.existsSync(configPath)) {
    return res.json({ ip: "", printerName: "" });
  }

  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    res.json(config);
  } catch (error) {
    console.error("Erro ao ler config da impressora:", error.message);
    res.status(500).json({ erro: "Falha ao ler configuração da impressora" });
  }
});

app.post("/impressora/config", (req, res) => {
  const { ip, printerName } = req.body;

  if (!ip && !printerName) {
    return res
      .status(400)
      .json({ erro: "IP ou nome da impressora obrigatório." });
  }

  const config = {
    ip: ip || "",
    printerName: printerName || "",
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  res.json({ status: "Configurações salvas com sucesso!" });
});

app.get("/impressora/testar", (req, res) => {
  const configPath = path.join(__dirname, "config", "impressora.json");

  if (!fs.existsSync(configPath)) {
    return res
      .status(404)
      .json({ erro: "Arquivo de configuração não encontrado." });
  }

  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const printerName = config.printerName;

    if (!printerName) {
      return res
        .status(400)
        .json({ erro: "Nome da impressora não configurado." });
    }

    exec(`wmic printer get name`, (err, stdout) => {
      if (err) {
        return res.status(500).json({ erro: "Falha ao verificar impressora." });
      }

      const encontrada = stdout
        .toLowerCase()
        .includes(printerName.toLowerCase());
      if (!encontrada) {
        return res.json({ ok: false });
      }

      // Se encontrada, imprime teste:
      const cortar = "\x1D\x56\x00"; // comando de corte ESC/POS
      const agora = new Date().toLocaleString("pt-BR");
      const texto =
        "\n\n********** TESTE DE IMPRESSAO **********\n\n" +
        " Impressora conectada com sucesso!\n" +
        ` Data: ${agora}\n\n` +
        " Fort Fruit LTDA\n" +
        " www.fortfruit.com.br\n\n" +
        cortar;

      const tempPath = path.join(__dirname, "teste_impressora.txt");
      fs.writeFileSync(tempPath, texto, { encoding: "binary" });

      const comando = `print /d:"\\\\localhost\\${printerName}" "${tempPath}"`;
      exec(comando, (err2) => {
        if (err2) {
          console.error("Erro ao imprimir teste:", err2.message);
        }
        return res.json({ ok: true });
      });
    });
  } catch (error) {
    console.error("Erro ao testar impressora:", error.message);
    return res.status(500).json({ erro: "Erro geral ao testar impressora." });
  }
});

app.post("/imprimir-pre-fechamento-termica", async (req, res) => {
  const { data, local, usuario } = req.body;

  const localMap = {
    "01": "Loja",
    "02": "Deposito",
    "03": "B.T.F",
    "04": "Deposito da Banana",
    "05": "Deposito do Ovo",
    "06": "Passarela 02 (torres)",
    "07": "Centro de Distribuicao (C.D)",
    "08": "Varejinho",
    "09": "Passarela 01",
  };

  const nomeImpressora = "POS80";
  const cortar = "\x1D\x56\x00";

  try {
    // 🔍 Busca os produtos com saldo e físico
    const resSaldos = await axios.get(
      "http://127.0.0.1:3001/produtos-com-saldo",
      {
        params: { data, local },
      }
    );

    const produtos = resSaldos.data;

    const faltando = produtos.filter((p) => {
      const saldo = parseFloat(p.saldo_protheus ?? 0);
      const fisico =
        p.fisico === null || p.fisico === "" ? 0 : parseFloat(p.fisico);

      return saldo > fisico && fisico > 0;
    });

    console.log("📦 Produtos com falta:", faltando);

    const hoje = new Date();
    const hora = hoje.toLocaleTimeString("pt-BR");
    const dataFormatada = hoje.toLocaleDateString("pt-BR");

    let texto = "";
    texto += "===============================================\n";
    texto += "             FORT FRUIT LTDA                  \n";
    texto += "===============================================\n";
    texto += "ALAMEDA CEASA, SN - CURIO\n";
    texto += "BELEM - PA - 66.610-120\n";
    texto += "CNPJ: 02.338.006/0001-07\n";
    texto += "vendasfortfruit@fortfruit.com.br\n";
    texto += "------------------------------------------------\n";
    texto += "           *** PRODUTOS COM FALTA ***           \n";
    texto += "------------------------------------------------\n";
    texto += `Data: ${dataFormatada}  Hora: ${hora}\n`;
    texto += `Local: ${local} - ${localMap[local] || "Desconhecido"}\n`;
    texto += `Usuário: ${usuario}\n`;
    texto += "------------------------------------------------\n";

    if (faltando.length === 0) {
      texto += "\nTodos os produtos estão com contagem OK.\n";
    } else {
      for (const p of faltando) {
        const saldo = parseFloat(p.saldo_protheus ?? 0).toFixed(2);
        const fisico = parseFloat(p.fisico ?? 0).toFixed(2);
        texto += `${p.cod} - ${p.descricao}\n`;
        texto += `Saldo: ${saldo} | Físico: ${fisico}\n`;
        texto += "------------------------------------------------\n";
      }
    }

    texto += "\n\nAssinatura: __________________________\n\n\n";
    texto += cortar;

    const caminho = path.join(__dirname, "pre_fechamento.txt");
    fs.writeFileSync(caminho, texto, { encoding: "binary" });

    const comando = `print /d:"\\\\localhost\\${nomeImpressora}" "${caminho}"`;

    exec(comando, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Erro ao imprimir pré-fechamento:", error.message);
        return res.status(500).json({
          erro: "Erro ao imprimir pré-fechamento",
          detalhe: error.message,
        });
      }

      console.log("✅ Pré-fechamento impresso:", stdout);
      res.status(200).send("✅ Impressão de pré-fechamento concluída.");
    });
  } catch (err) {
    console.error("❌ Erro geral na impressão:", err);
    res.status(500).json({
      erro: "Erro ao imprimir pré-fechamento",
      detalhe: err.message,
    });
  }
});

// Rota para impressão térmica de transferência
app.post("/imprimir-transferencia-termica", async (req, res) => {
  const {
    numero,
    origem,
    destino,
    carregador,
    produtos,
    data_inclusao,
    hora,
    usuario,
  } = req.body;

  const localMap = {
    "01": "Loja",
    "02": "Deposito",
    "03": "B.T.F",
    "04": "Deposito da Banana",
    "05": "Deposito do Ovo",
    "06": "Passarela 02 (torres)",
    "07": "Centro de Distribuicao (C.D)",
    "08": "Varejinho",
    "09": "Passarela 01",
  };

  const nomeImpressora = "POS80";
  const cortar = "\x1D\x56\x00";

  try {
    if (
      !numero ||
      !origem ||
      !destino ||
      !produtos ||
      !Array.isArray(produtos)
    ) {
      return res.status(400).json({
        erro: "Dados incompletos para impressão",
        requerido: "numero, origem, destino, produtos (array)",
      });
    }

    const hoje = new Date();
    const dataFormatada = data_inclusao || hoje.toLocaleDateString("pt-BR");
    const horaFormatada =
      hora ||
      hoje.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    let texto = "";
    texto += "===============================================\n";
    texto += "             FORT FRUIT LTDA                  \n";
    texto += "===============================================\n";
    texto += "ALAMEDA CEASA, SN - CURIO\n";
    texto += "BELEM - PA - 66.610-120\n";
    texto += "CNPJ: 02.338.006/0001-07\n";
    texto += "vendasfortfruit@fortfruit.com.br\n";
    texto += "------------------------------------------------\n";
    texto += "            *** TRANSFERENCIA ***              \n";
    texto += "------------------------------------------------\n";
    texto += `Numero: ${numero}\n`;
    texto += `Data: ${dataFormatada}  Hora: ${horaFormatada}\n`;
    texto += `Origem: ${origem} - ${localMap[origem] || "Desconhecido"}\n`;
    texto += `Destino: ${destino} - ${localMap[destino] || "Desconhecido"}\n`;
    if (carregador) {
      texto += `Carregador: ${carregador}\n`;
    }
    texto += `Usuario: ${usuario || "N/A"}\n`;
    texto += "------------------------------------------------\n";
    texto += "PRODUTOS:\n";
    texto += "------------------------------------------------\n";

    produtos.forEach((produto, index) => {
      const cod = produto.cod_produto || produto.codProduto || "";
      const desc = produto.descricao || "";
      const qtd = produto.quantidade || produto.qtd || 0;
      const unidade = produto.unidade || "";

      texto += `${index + 1}. ${cod} - ${desc}\n`;
      texto += `   Qtd: ${qtd} ${unidade}\n`;
      texto += "------------------------------------------------\n";
    });

    texto += `\nTotal de itens: ${produtos.length}\n`;
    texto += "\n\nAssinatura: __________________________\n\n\n";
    texto += cortar;

    const caminho = path.join(__dirname, "transferencia_via1.txt");
    fs.writeFileSync(caminho, texto, { encoding: "binary" });

    const comando = `print /d:"\\\\localhost\\${nomeImpressora}" "${caminho}"`;

    exec(comando, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Erro ao imprimir transferência:", error.message);
        return res.status(500).json({
          erro: "Erro ao imprimir transferência",
          detalhe: error.message,
        });
      }

      console.log("✅ Transferência impressa:", stdout);
      res.status(200).json({
        ok: true,
        mensagem: "✅ Impressão de transferência concluída.",
        numero: numero,
      });
    });
  } catch (err) {
    console.error("❌ Erro geral na impressão de transferência:", err);
    res.status(500).json({
      erro: "Erro ao imprimir transferência",
      detalhe: err.message,
    });
  }
});

// ✅ Rota para retornar os saldos dos produtos (REFATORADO: Fonte PROTHEUS + Log Comparativo)
app.get("/produtos-com-saldo", async (req, res) => {
  const { search = "", local } = req.query;

  // 1. [MySQL] Log do Antigo (Apenas para comparação/Monitoramento)
  let countOld = 0;
  try {
    const connMySQL = await dbOcorrencias.promise().getConnection();
    let sqlOld = `SELECT COUNT(*) as total FROM saldo_produtos WHERE local = ?`;
    const paramsOld = [local];
    if (search && search.trim() !== "") {
      sqlOld += " AND (nome_produto LIKE ? OR cod_produto LIKE ?)";
      paramsOld.push(`%${search}%`, `%${search}%`);
    }
    const [rowsOld] = await connMySQL.query(sqlOld, paramsOld);
    countOld = rowsOld[0]?.total || 0;
    connMySQL.release();
  } catch (err) {
    console.warn(
      "⚠️ [Diagnóstico] Erro ao contar saldo_produtos (MySQL):",
      err.message
    );
  }

  // 2. [SQL Server] Busca do Novo (Fonte Oficial: Protheus SB2 + SB1)
  try {
    await getMSSQLPool();

    // Normalização básica de código para busca
    const termoBusca = search ? `%${search.toUpperCase()}%` : null;

    let queryProtheus = `
      SELECT TOP 5000
        B2.B2_FILIAL        AS filial,
        RTRIM(B2.B2_COD)    AS cod,
        B2.B2_LOCAL         AS local,
        RTRIM(B1.B1_DESC)   AS produto,
        RTRIM(B1.B1_DESC) + ' - ' + RTRIM(B1.B1_COD) AS descricao,
        SUM(B2.B2_QATU)     AS saldo_protheus,
        B1.B1_UM            AS primeira_unidade,
        B1.B1_SEGUM         AS segunda_unidade,
        B1.B1_CONV          AS fator_conversao
      FROM SB2140 B2 WITH (NOLOCK)
      INNER JOIN SB1140 B1 WITH (NOLOCK) 
        ON B1.B1_COD = B2.B2_COD
        AND B1.D_E_L_E_T_ = ''
      WHERE 
        B2.B2_FILIAL = '01'
        AND B2.D_E_L_E_T_ = ''
        AND B2.B2_LOCAL = @local
    `;

    if (termoBusca) {
      queryProtheus += ` AND (B1.B1_DESC LIKE @search OR B2.B2_COD LIKE @search) `;
    }

    queryProtheus += `
      GROUP BY 
        B2.B2_FILIAL, B2.B2_COD, B2.B2_LOCAL, 
        B1.B1_DESC, B1.B1_COD, B1.B1_UM, B1.B1_SEGUM, B1.B1_CONV
      ORDER BY B1.B1_DESC
    `;

    const request = new sql.Request();
    request.input("local", sql.VarChar, local || "");
    if (termoBusca) {
      request.input("search", sql.VarChar, termoBusca);
    }

    const result = await request.query(queryProtheus);
    const rowsProtheus = result.recordset || [];

    // [Log Comparativo]
    // console.log(
    //   `[ProdutosComSaldo] Local: ${local} | Search: "${search}" | MySQL (Antigo): ${countOld} | Protheus (Novo): ${rowsProtheus.length}`
    // );

    // Mapeamento extra (se necessário) para manter contrato com frontend
    const responseData = rowsProtheus.map((r) => ({
      filial: r.filial,
      cod: r.cod,
      local: r.local,
      produto: r.produto || "Produto Sem Nome",
      descricao: r.descricao,
      saldo_protheus: r.saldo_protheus || 0,
      primeira_unidade: r.primeira_unidade,
      segunda_unidade: r.segunda_unidade,
      fator_conversao: r.fator_conversao,
      // OBS: Não enviamos 'saldo_total' aqui pois o frontend calcula 'saldo' dinamicamente
      // baseando-se no saldoInicial + movimentos. O 'saldo_protheus' vai apenas para info.
    }));

    res.json(responseData);
  } catch (err) {
    console.error("❌ Erro ao buscar produtos com saldo (Protheus):", err);
    res.status(500).send("Erro ao buscar produtos do ERP.");
  }
});

// ——— Helpers ———
function normalizeCod(cod) {
  return String(cod ?? "")
    .toUpperCase()
    .replace(/[.\-_/ \s]/g, "");
}

// tenta formar "999.999" a partir de "999999"
function withDot(cod) {
  const s = normalizeCod(cod);
  return s.length > 3 ? `${s.slice(0, 3)}.${s.slice(3)}` : s;
}

async function buscarNomeNoProduto(mysqlConn, codRaw) {
  const norm = normalizeCod(codRaw);

  // 1) match exato (com ou sem ponto)
  const [r1] = await mysqlConn.query(
    `SELECT descricao FROM produto
     WHERE codigo_produto = ? OR REPLACE(codigo_produto, '.', '') = ?
     LIMIT 1`,
    [withDot(norm), norm]
  );
  if (r1.length) return (r1[0].descricao || "").trim();

  return null;
}

async function buscarNomeNoProtheus(sqlPool, codRaw) {
  // opcional: só se não encontrou na tabela produto
  const norm = normalizeCod(codRaw);
  const dotted = withDot(norm); // no Protheus costuma ser "999999" (sem ponto), mas fica a dupla tentativa
  const req = sqlPool.request();
  const q = `
    SELECT TOP 1 B1_DESC
    FROM SB1140 WITH (NOLOCK)
    WHERE D_E_L_E_T_ = '' AND (B1_COD = @cod1 OR B1_COD = @cod2)
  `;
  req.input("cod1", norm);
  req.input("cod2", dotted.replace(/\./g, "")); // só para garantir
  const rs = await req.query(q);
  return (rs.recordset?.[0]?.B1_DESC || "").trim() || null;
}

// ——— Rota: incluir/atualizar em saldo_produtos SEM usar nome do front ———
app.post("/saldo-produtos", async (req, res) => {
  const {
    filial = "01",
    cod_produto,
    local: bodyLocal,
    saldo_total = 0,
    data_alteracao, // opcional; se não vier usa hoje (YYYY-MM-DD)
  } = req.body || {};

  const origem = bodyLocal || req.headers["x-local"];
  if (!cod_produto || !origem) {
    return res.status(400).json({ erro: "Informe cod_produto e local." });
  }

  const dataHoje = data_alteracao || new Date().toISOString().slice(0, 10);
  const codComPonto = withDot(cod_produto); // vamos gravar como “999.999”

  const mysqlConn = await dbOcorrencias.promise().getConnection();
  let sqlPool = null;

  try {
    // 1) nome na tabela produto
    let nome = await buscarNomeNoProduto(mysqlConn, cod_produto);

    // 2) (opcional) fallback Protheus se não achou
    if (!nome) {
      sqlPool = await getMSSQLPool();
      nome = await buscarNomeNoProtheus(sqlPool, cod_produto);
    }

    // 3) fallback final
    if (!nome) nome = "Desconhecido";

    // UPSERT; sua tabela costuma ter unicidade por (filial, cod_produto, local, data_alteracao)
    await mysqlConn.query(
      `INSERT INTO saldo_produtos
        (filial, cod_produto, local, nome_produto, saldo_total, data_alteracao)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         nome_produto = VALUES(nome_produto),
         saldo_total = VALUES(saldo_total),
         data_alteracao = VALUES(data_alteracao)`,
      [
        filial,
        codComPonto,
        String(origem),
        nome,
        Number(saldo_total) || 0,
        dataHoje,
      ]
    );

    res.json({
      ok: true,
      filial,
      cod_produto: codComPonto,
      local: String(origem),
      nome_produto: nome,
      saldo_total: Number(saldo_total) || 0,
      data_alteracao: dataHoje,
    });
  } catch (err) {
    console.error("POST /saldo-produtos erro:", err);
    res.status(500).json({ erro: "Falha ao incluir em saldo_produtos." });
  } finally {
    // Removido sqlPool.close() pois o pool é compartilhado
    mysqlConn.release();
  }
});

// GET /estoque/avarias-pendentes?data=YYYY-MM-DD&local=07
app.get("/estoque/avarias-pendentes", async (req, res) => {
  const { data, local } = req.query;
  try {
    const sql = `
      SELECT id, numero, origem, destino, \`local\`, status, data_inclusao
      FROM avarias_estoque
      WHERE DATE(data_inclusao) = ?
        AND (\`local\` = ? OR origem = ? OR destino = ?)
        AND LOWER(status) = 'pendente'
    `;

    // ✅ use o wrapper de promises
    const [rows] = await dbOcorrencias
      .promise()
      .query(sql, [data, local, local, local]);

    res.json(rows); // o front já aceita array puro
  } catch (e) {
    console.error("erro ao consultar avarias pendentes:", e);
    res.status(500).json({ error: "erro ao consultar avarias pendentes" });
  }
});

// ✅ Rota de Busca Rápida (100% Protheus SB1/SB2)
app.get("/produtos-busca-rapida", async (req, res) => {
  const {
    search = "",
    filial = "01",
    local = null,
    limit = "20",
    agrupar,
    apenasComSaldo, // NOVO: Filtro opcional
  } = req.query;

  const LIM = Math.max(1, Math.min(parseInt(limit, 10) || 20, 100));
  const termo = search.trim().toUpperCase();
  const termoLike = `%${termo}%`;
  const termoNoSpecial = termo.replace(/[^A-Z0-9]/g, "");
  const termoNoSpecialLike = `%${termoNoSpecial}%`;

  if (!termo) return res.json([]);

  try {
    const pool = await getMSSQLPool();
    const request = pool.request();

    request.input("filial", sql.VarChar(2), filial);
    request.input("local", sql.VarChar(10), local || "");
    request.input("termLike", sql.VarChar(100), termoLike);
    request.input("termNoSpecialLike", sql.VarChar(100), termoNoSpecialLike);

    // Lógica Dinâmica:
    // Se "apenasComSaldo" for true: JOIN obrigatório com SB2 e Saldo > 0
    // Se false (padrão): Busca na SB1 e faz subquery só pra mostrar o saldo se tiver

    let query = "";

    if (String(apenasComSaldo) === "true") {
      // MODO RIGOROSO (Para Transferencias de Saída)
      query = `
        SELECT TOP (${LIM})
          RTRIM(B1.B1_COD)    AS cod,
          RTRIM(B1.B1_DESC)   AS produto,
          B1.B1_UM            AS primeira_unidade,
          RTRIM(B1.B1_SEGUM)  AS segunda_unidade,
          B1.B1_CONV          AS fator_conversao,
          ROUND(SUM(B2.B2_QATU), 2) AS saldo_protheus
        FROM SB1140 B1 WITH(NOLOCK)
        INNER JOIN SB2140 B2 WITH(NOLOCK) 
          ON B2.B2_COD = B1.B1_COD 
          AND B2.B2_FILIAL = @filial
          AND B2.B2_LOCAL = @local
          AND B2.D_E_L_E_T_ = ''
        WHERE 
          B1.D_E_L_E_T_ = ''
          AND B1.B1_MSBLQL <> '1'
          AND B2.B2_QATU > 0
          AND (
               B1.B1_DESC LIKE @termLike 
            OR B1.B1_COD LIKE @termLike 
            OR B1.B1_COD LIKE @termNoSpecialLike
          )
        GROUP BY 
          B1.B1_COD, B1.B1_DESC, B1.B1_UM, B1.B1_SEGUM, B1.B1_CONV
      `;
    } else {
      // MODO LIBERAL (Para Entradas / Buscas Gerais)
      // Se não passa local e agrupar=produto, verifica se tem saldo positivo em ALGUM local
      const temLocalEspecifico = local && local !== "";
      const deveVerificarSaldoPositivo =
        !temLocalEspecifico && agrupar === "produto";

      if (deveVerificarSaldoPositivo) {
        // Verifica se o produto tem saldo positivo em pelo menos um local
        query = `
          SELECT TOP (${LIM})
            RTRIM(B1.B1_COD)    AS cod,
            RTRIM(B1.B1_DESC)   AS produto,
            B1.B1_UM            AS primeira_unidade,
            RTRIM(B1.B1_SEGUM)  AS segunda_unidade,
            B1.B1_CONV          AS fator_conversao,
            ISNULL((
              SELECT ROUND(SUM(B2_QATU), 2) 
              FROM SB2140 B2 WITH(NOLOCK) 
              WHERE B2.B2_FILIAL = @filial 
                AND B2.B2_COD = B1.B1_COD 
                AND B2.D_E_L_E_T_ = ''
            ), 0) AS saldo_protheus
          FROM SB1140 B1 WITH(NOLOCK)
          WHERE 
            B1.D_E_L_E_T_ = ''
            AND B1.B1_MSBLQL <> '1'
            AND (
                 B1.B1_DESC LIKE @termLike 
              OR B1.B1_COD LIKE @termLike 
              OR B1.B1_COD LIKE @termNoSpecialLike
            )
            AND EXISTS (
              -- Verifica se tem saldo positivo em pelo menos um local
              SELECT 1
              FROM SB2140 B2 WITH(NOLOCK)
              WHERE B2.B2_FILIAL = @filial
                AND B2.B2_COD = B1.B1_COD
                AND B2.B2_QATU > 0
                AND B2.D_E_L_E_T_ = ''
            )
        `;
      } else {
        // Modo normal: soma todos os locais ou local específico
        query = `
          SELECT TOP (${LIM})
            RTRIM(B1.B1_COD)    AS cod,
            RTRIM(B1.B1_DESC)   AS produto,
            B1.B1_UM            AS primeira_unidade,
            RTRIM(B1.B1_SEGUM)  AS segunda_unidade,
            B1.B1_CONV          AS fator_conversao,
            ISNULL((
              SELECT ROUND(SUM(B2_QATU), 2) 
              FROM SB2140 B2 WITH(NOLOCK) 
              WHERE B2.B2_FILIAL = @filial 
                AND B2.B2_COD = B1.B1_COD 
                AND (@local = '' OR B2.B2_LOCAL = @local)
                AND B2.D_E_L_E_T_ = ''
            ), 0) AS saldo_protheus
          FROM SB1140 B1 WITH(NOLOCK)
          WHERE 
            B1.D_E_L_E_T_ = ''
            AND B1.B1_MSBLQL <> '1'
            AND (
                 B1.B1_DESC LIKE @termLike 
              OR B1.B1_COD LIKE @termLike 
              OR B1.B1_COD LIKE @termNoSpecialLike
            )
        `;
      }
    }
    // Ordenação: prioriza match exato no começo
    query += `
      ORDER BY 
        CASE WHEN B1.B1_DESC LIKE @termLike THEN 1 ELSE 2 END,
        B1.B1_DESC
    `;

    const result = await request.query(query);

    const mapped = result.recordset.map((r) => ({
      codigo_produto: r.cod, // Mantendo compatibilidade com front antigo
      cod: r.cod,
      produto: r.produto,
      descricao: `${r.produto} - ${r.cod}`, // Formato padrão dropdown
      saldo_protheus: r.saldo_protheus,
      primeira_unidade: r.primeira_unidade,
      segunda_unidade: r.segunda_unidade,
      fator_conversao: r.fator_conversao,
      // Se não veio local, mandamos undefined para não quebrar lógica
      local: local || undefined,
      em_compra: false, // Produtos do Protheus não estão em compra
    }));

    // Se não for modo rigoroso (apenasComSaldo !== true), também buscar produtos em compras do Protheus
    if (String(apenasComSaldo) !== "true") {
      try {
        // Calcular data atual e data + 2 dias no formato Protheus (YYYYMMDD)
        const hoje = new Date();
        const hojeProtheus = toProtheusDate(hoje.toISOString().split("T")[0]);
        const amanha = new Date(hoje);
        amanha.setDate(amanha.getDate() + 1);
        const amanhaProtheus = toProtheusDate(
          amanha.toISOString().split("T")[0]
        );
        const depoisAmanha = new Date(hoje);
        depoisAmanha.setDate(depoisAmanha.getDate() + 2);
        const depoisAmanhaProtheus = toProtheusDate(
          depoisAmanha.toISOString().split("T")[0]
        );

        // Normalizar termo para busca (remover pontos do código)
        const termoNormalizado = termo.replace(/\./g, "");
        const termoLike = `%${termoNormalizado}%`;
        const termoDescLike = `%${termo}%`;

        // Buscar produtos em compras do Protheus (SZ1 JOIN SZ2)
        // JOIN entre SZ1140 (itens) e SZ2140 (cabeçalho) para pegar Z2_CHEGADA
        const comprasRequest = pool.request();
        comprasRequest.input("filial", sql.VarChar(2), filial);
        comprasRequest.input("termLike", sql.VarChar(100), termoLike);
        comprasRequest.input("termDescLike", sql.VarChar(100), termoDescLike);
        comprasRequest.input("hoje", sql.Char(8), hojeProtheus);
        comprasRequest.input("amanha", sql.Char(8), amanhaProtheus);
        comprasRequest.input("depoisAmanha", sql.Char(8), depoisAmanhaProtheus);

        const comprasQuery = `
          SELECT DISTINCT TOP (${LIM})
            RTRIM(Z1.Z1_CODPRO) AS codpro,
            RTRIM(Z1.Z1_DESCPRO) AS descpro,
            Z2.Z2_CHEGADA AS chegada,
            RTRIM(Z1.Z1_UM) AS primeira_unidade
          FROM SZ1140 Z1 WITH(NOLOCK)
          INNER JOIN SZ2140 Z2 WITH(NOLOCK)
            ON Z2.Z2_FILIAL = Z1.Z1_FILIAL
            AND Z2.Z2_CODCAR = Z1.Z1_CODCAR
            AND Z2.D_E_L_E_T_ = ''
          WHERE 
            Z1.Z1_FILIAL = @filial
            AND Z1.D_E_L_E_T_ = ''
            AND Z1.Z1_PROC = '' -- Apenas compras não efetivadas
            AND Z2.Z2_CHEGADA IN (@hoje, @amanha, @depoisAmanha)
            AND (
              REPLACE(RTRIM(Z1.Z1_CODPRO), '.', '') LIKE @termLike
              OR RTRIM(Z1.Z1_CODPRO) LIKE @termDescLike
              OR UPPER(RTRIM(Z1.Z1_DESCPRO)) LIKE @termDescLike
            )
          ORDER BY Z2.Z2_CHEGADA DESC
        `;

        const comprasResult = await comprasRequest.query(comprasQuery);
        const comprasRows = comprasResult.recordset;

        // Criar um Map com os códigos já retornados do Protheus (normalizados sem ponto) para poder atualizar
        const produtosMap = new Map();
        mapped.forEach((p) => {
          const codNormalizado = p.cod.replace(/\./g, "");
          produtosMap.set(codNormalizado, p);
        });

        // Processar produtos de compras
        for (const compra of comprasRows) {
          const codNormalizado = String(compra.codpro || "")
            .replace(/\./g, "")
            .trim();

          if (!codNormalizado) continue;

          // Verificar se o produto já está na lista do Protheus
          const produtoExistente = produtosMap.get(codNormalizado);

          if (produtoExistente) {
            // Produto já existe no Protheus, mas está em compra também - marcar como em_compra
            produtoExistente.em_compra = true;
            // Atualizar descrição para indicar que está em compra
            produtoExistente.descricao = `${produtoExistente.produto} - ${produtoExistente.cod} (Em compra)`;
            // Se não tem unidade do Protheus, usa a da compra (Z1_UM)
            if (!produtoExistente.primeira_unidade && compra.primeira_unidade) {
              produtoExistente.primeira_unidade = compra.primeira_unidade;
            }
          } else {
            // Produto não está no Protheus, mas está em compra
            const codComPonto =
              codNormalizado.length === 6
                ? `${codNormalizado.slice(0, 3)}.${codNormalizado.slice(3)}`
                : codNormalizado;

            // A unidade vem diretamente da SZ1 (campo Z1_UM)
            const primeiraUnidade = compra.primeira_unidade || "";

            const produtoEmCompra = {
              codigo_produto: codComPonto,
              cod: codComPonto,
              produto: compra.descpro || "Produto sem descrição",
              descricao: `${compra.descpro || "Produto sem descrição"
                } - ${codComPonto} (Em compra - pode não estar no sistema)`,
              saldo_protheus: 0, // Sem saldo pois não está efetivado
              primeira_unidade: primeiraUnidade,
              segunda_unidade: "", // SZ1 não tem segunda unidade
              fator_conversao: 1,
              local: local || undefined,
              em_compra: true, // Indica que está em compra mas pode não estar no sistema
            };

            mapped.push(produtoEmCompra);
            produtosMap.set(codNormalizado, produtoEmCompra);
          }
        }
      } catch (compraErr) {
        console.error(
          "❌ Erro ao buscar produtos em compras Protheus:",
          compraErr
        );
        // Continua mesmo com erro, retornando só os produtos do Protheus
      }
    }

    // Limitar resultados finais ao LIM
    const resultadosFinais = mapped.slice(0, LIM);

    res.json(resultadosFinais);
  } catch (err) {
    console.error("❌ Erro /produtos-busca-rapida (Protheus):", err);
    res.status(500).json({ erro: "Erro ao buscar produtos no ERP" });
  }
});

// server.js ou routes/compras.js

app.get("/compras/entradas", async (req, res) => {
  const { data, local } = req.query;

  try {
    const conn = await dbOcorrencias.promise().getConnection();

    const [rows] = await conn.query(
      `
      SELECT codpro, SUM(qtd_lancada) AS total
      FROM compras_mercadoria_lancamentos
      WHERE DATE(data) = ? AND local = ?
      GROUP BY codpro
    `,
      [data, local]
    );

    conn.release();
    res.json(rows);
  } catch (err) {
    console.error("Erro ao buscar entradas de compras:", err);
    res.status(500).send("Erro ao buscar dados.");
  }
});

app.get("/vendas/produtos", async (req, res) => {
  const { data, local } = req.query;

  if (!data || !local) {
    return res.status(400).json({ erro: "Informe data e local." });
  }

  try {
    const pool = await getMSSQLPool();

    const query = `
      SELECT 
        s5.Z5_CODPRO AS codpro,
        SUM(s5.Z5_QTDE) AS total
      FROM SZ5140 s5
      LEFT JOIN SZ4140 s4 
        ON s4.Z4_FILIAL = s5.Z5_FILIAL 
        AND s4.Z4_BILHETE = s5.Z5_BILHETE 
        AND s4.Z4_DATA = s5.Z5_DATA
    WHERE 
        s5.Z5_FILIAL = '01'
        AND s5.D_E_L_E_T_ = ''
        AND s5.Z5_DATA = @data
        AND s4.Z4_COND <> '996'
        AND s4.Z4_COND <> '999'
        AND s4.Z4_COND <> '997'
        AND s4.Z4_COND <> '994'
        AND s4.Z4_COND <> '993'
        AND s4.Z4_COND <> '992'
        AND s4.Z4_COND <> '991'
        AND s4.Z4_LOCAL = @local
      GROUP BY s5.Z5_CODPRO
    `;

    const result = await pool
      .request()
      .input("data", sql.VarChar, data.replace(/-/g, "")) // transforma "2025-07-11" em "20250711"
      .input("local", sql.VarChar, local)
      .query(query);

    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Erro ao buscar vendas no Protheus:", err);
    res.status(500).send("Erro ao buscar dados de vendas.");
  }
});

app.get("/produtos/saldo-protheus", async (req, res) => {
  const { local } = req.query;

  if (!local) {
    return res.status(400).json({ erro: "Informe o local." });
  }

  try {
    const pool = await getMSSQLPool();

    // CORREÇÃO: Busca TODOS os produtos do SB1 (cadastro de produtos)
    // Não filtra por filial no SB1 pois pode não ter essa coluna
    const result = await pool
      .request()
      .input("filial", sql.VarChar, "01")
      .input("local", sql.VarChar, local).query(`
        SELECT 
          '01' AS filial,
          REPLACE(REPLACE(REPLACE(RTRIM(B1.B1_COD), '.', ''), '-', ''), ' ', '') AS cod_produto,
          @local AS local2,
          RTRIM(B1.B1_DESC) AS nome_produto,
          ISNULL((
            SELECT SUM(B2.B2_QATU)
            FROM SB2140 B2 WITH(NOLOCK)
            WHERE B2.B2_COD = B1.B1_COD
              AND B2.B2_FILIAL = @filial
              AND B2.B2_LOCAL = @local
              AND B2.D_E_L_E_T_ = ''
          ), 0) AS saldo_total
        FROM SB1140 B1 WITH(NOLOCK)
        WHERE 
          B1.D_E_L_E_T_ = ''
      `);

    // logger.info(
    //   `Produtos Protheus carregados: ${result.recordset.length} produtos para local ${local}`
    // );
    res.json(result.recordset);
  } catch (err) {
    logger.error("Erro ao buscar saldo Protheus", {
      error: err.message,
      local,
    });
    res.status(500).send("Erro ao buscar saldo.");
  }
});

app.get("/produtos/saldo-protheus-fechamento", async (req, res) => {
  try {
    const pool = await getMSSQLPool();

    const result = await pool.request().query(`
      SELECT 
        B2.B2_FILIAL AS filial,
        B2.B2_COD AS cod_produto,
        B2.B2_LOCAL AS local2,
        B1.B1_DESC AS nome_produto,
        SUM(B2.B2_QATU) AS saldo_total
      FROM SB2140 B2
      JOIN SB1140 B1 ON B2.B2_COD = B1.B1_COD
      WHERE 
        B2.B2_FILIAL = '01'
        AND B2.D_E_L_E_T_ = ''
        AND B2.B2_QATU <> 0
      GROUP BY 
        B2.B2_FILIAL, B2.B2_COD, B1.B1_DESC, B2.B2_LOCAL
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Erro ao buscar saldo Protheus:", err);
    res.status(500).send("Erro ao buscar saldo.");
  }
});

// GET /produtos/sb2-diario?data=YYYY-MM-DD&filial=01
app.get("/produtos/sb2-diario", async (req, res) => {
  try {
    const { data, filial = "01" } = req.query;
    const protheusDate = (
      data || new Date().toISOString().slice(0, 10)
    ).replace(/-/g, "");

    const pool = await getMSSQLPool();
    const result = await pool
      .request()
      .input("filial", sql.VarChar(2), filial)
      .input("data", sql.Char(8), protheusDate).query(`
        SELECT 
          B2.B2_FILIAL AS filial,
          B2.B2_COD    AS cod_produto,
          B2.B2_LOCAL  AS local2,
          B1.B1_DESC   AS nome_produto,
          B2.B2_QATU   AS saldo_total,
          B2.B2_DMOV   AS data_mov
        FROM SB2140 B2
        JOIN SB1140 B1 
          ON B2.B2_COD = B1.B1_COD
         AND B1.D_E_L_E_T_ = ''
        WHERE 
          B2.B2_FILIAL = @filial
          AND B2.D_E_L_E_T_ = ''
          AND B2.B2_QATU <> 0
          AND B2.B2_DMOV = @data
        ORDER BY B2.B2_COD, B2.B2_LOCAL;
      `);

    res.json(result.recordset);
  } catch (e) {
    console.error(e);
    res.status(500).send("Erro ao buscar SB2 do dia.");
  }
});

app.get("/estoque/contagem", async (req, res) => {
  const { data, local } = req.query;

  if (!data || !local) {
    return res.status(400).send("Data e local são obrigatórios.");
  }

  try {
    const [rows] = await dbOcorrencias.promise().query(
      `SELECT cod, qtd, local 
         FROM estoque_contagem 
         WHERE DATE(atualizado_em) = ? 
         AND local = ?`,
      [data, local]
    );

    res.json(rows);
  } catch (error) {
    console.error("❌ Erro ao buscar contagem física:", error);
    res.status(500).send("Erro ao buscar contagem física.");
  }
});

app.post("/estoque/contagem", async (req, res) => {
  const { data, local, itens = [], excluir = [] } = req.body;

  if (!data || !local || !Array.isArray(itens)) {
    return res.status(400).json({ error: "Dados inválidos." });
  }

  try {
    const conn = await dbOcorrencias.promise().getConnection();
    const dataHora = `${data} 12:00:00`;

    // Inserir ou atualizar os itens com qtd > 0
    for (const item of itens) {
      if (!item.cod || typeof item.qtd !== "number") continue;

      const [exists] = await conn.query(
        `SELECT 1 FROM estoque_contagem 
         WHERE cod = ? AND DATE(atualizado_em) = ? AND local = ?`,
        [item.cod, data, local]
      );

      if (exists.length > 0) {
        await conn.query(
          `UPDATE estoque_contagem 
           SET qtd = ?, atualizado_em = ? 
           WHERE cod = ? AND DATE(atualizado_em) = ? AND local = ?`,
          [item.qtd, dataHora, item.cod, data, local]
        );
      } else {
        await conn.query(
          `INSERT INTO estoque_contagem (cod, qtd, atualizado_em, local)
           VALUES (?, ?, ?, ?)`,
          [item.cod, item.qtd, dataHora, local]
        );
      }
    }

    // Excluir os itens com qtd = 0
    for (const item of excluir) {
      if (!item.cod) continue;

      await conn.query(
        `DELETE FROM estoque_contagem 
         WHERE cod = ? AND DATE(atualizado_em) = ? AND local = ?`,
        [item.cod, data, local]
      );
    }

    conn.release();
    res
      .status(201)
      .json({ success: true, message: "Contagem salva com sucesso." });
  } catch (err) {
    console.error("❌ Erro ao salvar contagem:", err);
    res.status(500).json({ error: "Erro ao salvar contagem." });
  }
});

app.get("/estoque/transferencias/:origem", async (req, res) => {
  const origemUsuario = req.params.origem;
  const { data } = req.query;

  try {
    const conn = await dbOcorrencias.promise().getConnection();

    const [rows] = await conn.query(
      `
SELECT cod_produto,
       SUM(CASE WHEN destino = ? AND origem <> ? THEN quantidade ELSE 0 END) AS entrada,
       SUM(CASE WHEN origem = ? AND destino <> ? THEN quantidade ELSE 0 END) AS saida
FROM transferencias_estoque
WHERE status = 'Concluido'
  AND DATE(data_inclusao) = ?
GROUP BY cod_produto

    `,
      [origemUsuario, origemUsuario, origemUsuario, origemUsuario, data]
    );

    conn.release();
    res.json(rows);
  } catch (err) {
    console.error("❌ Erro ao buscar transferências:", err);
    res.status(500).send("Erro ao buscar transferências.");
  }
});

// Rota para buscar a origem do usuário
app.get("/usuarios/origem/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const conn = await dbOcorrencias.promise().getConnection();
    // Supondo que existe uma tabela 'usuarios' com as colunas 'username' e 'origem'
    const [rows] = await conn.query(
      "SELECT origem FROM usuarios WHERE username = ?",
      [username]
    );
    conn.release();

    if (rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    res.json({ origem: rows[0].origem });
  } catch (err) {
    console.error("❌ Erro ao buscar origem do usuário:", err);
    res.status(500).send("Erro ao buscar origem do usuário.");
  }
});

// Atualizar avarias no estoque
app.put("/estoque/avarias", async (req, res) => {
  const { data, itens } = req.body;
  const usuario = req.headers["x-user"] || "sistema";
  const local = req.headers["x-local"] || "";

  if (!data || !Array.isArray(itens)) {
    return res.status(400).send("Formato de dados inválido");
  }
  const now = new Date();
  const dataFormatada = now.toISOString().slice(0, 19).replace("T", " ");

  try {
    const conn = await dbOcorrencias.promise().getConnection();

    for (const item of itens) {
      const { cod, avaria = 0, falta_peso = 0, desidratacao = 0 } = item;

      await conn.query(
        `INSERT INTO avarias_estoque 
           (cod_produto, avaria, falta_peso, desidratacao, usuario, local, data_inclusao)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           avaria = VALUES(avaria),
           falta_peso = VALUES(falta_peso),
           desidratacao = VALUES(desidratacao),
           usuario = VALUES(usuario),
           local = VALUES(local)`,
        [cod, avaria, falta_peso, desidratacao, usuario, local, dataFormatada]
      );
    }

    conn.release();
    res.status(200).send("✅ Avarias salvas ou atualizadas com sucesso.");
  } catch (err) {
    console.error("❌ Erro ao atualizar avarias:", err);
    res.status(500).send("Erro ao atualizar avarias.");
  }
});

// Registrar avarias no estoque
app.post("/estoque/avarias", async (req, res) => {
  const { data, itens } = req.body;
  const usuario = req.headers["x-user"] || "sistema";
  const local = req.headers["x-local"] || "";

  if (!data || !Array.isArray(itens)) {
    return res.status(400).send("Formato de dados inválido");
  }

  try {
    const conn = await dbOcorrencias.promise().getConnection();

    const insertPromises = itens.map((item) =>
      conn.query(
        `INSERT INTO avarias_estoque (cod_produto, avaria, falta_peso, desidratacao, usuario, local, data_inclusao)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          item.cod,
          item.avaria || 0,
          item.falta_peso || 0,
          item.desidratacao || 0,
          usuario,
          local,
          data,
        ]
      )
    );

    await Promise.all(insertPromises);
    conn.release();

    res.status(200).send("✅ Avarias registradas com sucesso.");
  } catch (err) {
    console.error("❌ Erro ao registrar avarias:", err);
    res.status(500).send("Erro interno ao registrar avarias.");
  }
});

// Buscar avarias do estoque
app.get("/estoque/avarias", async (req, res) => {
  const { data, local } = req.query;

  try {
    const conn = await dbOcorrencias.promise().getConnection();

    const [rows] = await conn.query(
      `
SELECT 
  ai.cod_produto,
  ae.origem,
  SUM(ai.validacao_convertida) AS total
FROM avarias_itens ai
INNER JOIN avarias_estoque ae ON ai.numero_avaria = ae.id
WHERE DATE(ae.data_inclusao) = ? 
  AND ae.origem = ? 
  AND (ae.status = 'Concluído' OR ae.status = 'Concluido')
GROUP BY ai.cod_produto

      `,
      [data, local]
    );

    conn.release();

    const avariasMap = {};
    rows.forEach((row) => {
      avariasMap[row.cod_produto.trim()] = Number(row.total) || 0;
    });

    res.json(avariasMap);
  } catch (err) {
    console.error("❌ Erro ao buscar avarias:", err);
    res.status(500).send("Erro ao buscar avarias.");
  }
});

// Registrar uma nova avaria
app.post("/avarias", async (req, res) => {
  try {
    const {
      numero,
      origem,
      destino,
      responsavel,
      produtos,
      data_inclusao,
      usuario,
    } = req.body;

    if (!numero || !origem || !responsavel || !produtos?.length) {
      return res.status(400).json({ error: "Dados obrigatórios faltando." });
    }

    const conn = await dbOcorrencias.promise().getConnection();
    await conn.beginTransaction();

    // Inserir cabeçalho
    const [result] = await conn.query(
      `INSERT INTO avarias_estoque (numero, origem, destino, responsavel, data_inclusao, usuario) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [numero, origem, destino, responsavel, data_inclusao, usuario]
    );

    const idAvaria = result.insertId;

    // Inserir itens
    for (const p of produtos) {
      await conn.query(
        `INSERT INTO avarias_itens 
          (numero_avaria, cod_produto, descricao, quantidade, unidade, fator_conversao, segunda_unidade)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          idAvaria,
          p.cod_produto,
          p.descricao,
          isNaN(Number(p.quantidade)) ? 0 : Number(p.quantidade),
          p.unidade || "",
          p.fator_conversao || 1,
          p.segunda_unidade || "",
        ]
      );
    }

    // Registrar log de criação
    await conn.query(
      `INSERT INTO avarias_logs (numero_avaria, acao, usuario, data_hora, observacao)
       VALUES (?, ?, ?, NOW(), ?)`,
      [numero, "Criado", usuario || "sistema", "Avaria registrada"]
    );

    await conn.commit();
    conn.release();

    res.status(201).send("✅ Avaria registrada com sucesso.");
  } catch (err) {
    console.error("❌ Erro ao registrar avaria:", err);
    res.status(500).send("Erro ao registrar avaria.");
  }
});

// Listar números de avarias
app.get("/avarias", async (req, res) => {
  try {
    const conn = await dbOcorrencias.promise().getConnection();
    const [rows] = await conn.query("SELECT numero FROM avarias_estoque");
    conn.release();
    res.json(rows.map((r) => ({ numero: r.numero })));
  } catch (err) {
    console.error("Erro ao buscar avarias:", err);
    res.status(500).send("Erro ao buscar avarias.");
  }
});

// Listar avarias lançadas
app.get("/avarias/lancadas", async (req, res) => {
  try {
    const conn = await dbOcorrencias.promise().getConnection();
    const [rows] = await conn.query(
      "SELECT * FROM avarias_estoque ORDER BY id DESC"
    );
    conn.release();
    res.json(rows);
  } catch (err) {
    console.error("Erro ao buscar listagem de avarias:", err);
    res
      .status(500)
      .json({ error: "Erro ao buscar listagem.", details: err.message });
  }
});

// Buscar detalhes de uma avaria
app.get("/avarias/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const conn = await dbOcorrencias.promise().getConnection();

    const [avariaRows] = await conn.query(
      "SELECT * FROM avarias_estoque WHERE id = ?",
      [id]
    );

    if (avariaRows.length === 0) {
      conn.release();
      return res.status(404).json({ error: "Avaria não encontrada." });
    }

    const [itensRows] = await conn.query(
      "SELECT * FROM avarias_itens WHERE numero_avaria = ?",
      [id]
    );

    conn.release();
    res.json({ avaria: avariaRows[0], itens: itensRows });
  } catch (err) {
    console.error("Erro ao buscar detalhes da avaria:", err);
    res.status(500).json({ error: "Erro interno.", details: err.message });
  }
});

// Gerar PDF de uma avaria individual
app.get("/avarias/:id/pdf", async (req, res) => {
  const id = req.params.id;
  try {
    const conn = await dbOcorrencias.promise().getConnection();

    const [avariaRows] = await conn.query(
      "SELECT * FROM avarias_estoque WHERE id = ?",
      [id]
    );

    if (avariaRows.length === 0) {
      conn.release();
      return res.status(404).json({ error: "Avaria não encontrada." });
    }

    const [itensRows] = await conn.query(
      `SELECT 
        id,
        numero_avaria,
        cod_produto,
        descricao,
        quantidade,
        COALESCE(unidade, '') AS unidade,
        COALESCE(segunda_unidade, '') AS segunda_unidade,
        fator_conversao,
        validacao,
        validacao_convertida
      FROM avarias_itens 
      WHERE numero_avaria = ? 
      ORDER BY id`,
      [id]
    );

    conn.release();

    const avaria = avariaRows[0];
    const itens = itensRows;

    // Mapa de locais
    const NOME_LOCAL = {
      "01": "Loja",
      "02": "Depósito",
      "03": "B.T.F",
      "04": "Depósito da Banana",
      "05": "Depósito do Ovo",
      "06": "Passarela 02 (torres)",
      "07": "Centro de Distribuição (C.D)",
      "08": "Varejinho",
      "09": "Passarela 01",
    };

    // Formatação de data
    const formatarData = (data) => {
      if (!data) return "-";
      const d = new Date(data);
      return d.toLocaleDateString("pt-BR");
    };

    const formatarHora = (data) => {
      if (!data) return "-";
      const d = new Date(data);
      return d.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    // Criar PDF
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="avaria_${avaria.numero}.pdf"`
    );

    doc.pipe(res);

    // Cabeçalho
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("AVARIA DE PRODUTO", 50, 50, { align: "center" });
    doc
      .fontSize(10)
      .font("Helvetica")
      .text("FORT FRUIT LTDA", 50, 75, { align: "center" });
    doc.text("ALAMEDA CEASA, SN - CURIO, BELEM - PA - 66.610-120", 50, 90, {
      align: "center",
    });
    doc.text("CNPJ: 02.338.006/0001-07", 50, 105, { align: "center" });
    doc.text("Email: vendasfortfruit@fortfruit.com.br", 50, 120, {
      align: "center",
    });

    let y = 160;

    // Dados da Avaria
    doc.fontSize(12).font("Helvetica-Bold").text("DADOS DA AVARIA", 50, y);
    y += 20;

    doc.fontSize(10).font("Helvetica");
    doc.text(`Número: ${avaria.numero}`, 50, y);
    y += 15;
    doc.text(`Data: ${formatarData(avaria.data_inclusao)}`, 50, y);
    y += 15;
    doc.text(`Hora: ${formatarHora(avaria.data_inclusao)}`, 50, y);
    y += 15;
    doc.text(
      `Origem: ${avaria.origem} - ${NOME_LOCAL[avaria.origem] || avaria.origem
      }`,
      50,
      y
    );
    y += 15;
    doc.text(
      `Destino: ${avaria.destino} - ${NOME_LOCAL[avaria.destino] || avaria.destino
      }`,
      50,
      y
    );
    y += 15;
    doc.text(`Responsável: ${avaria.responsavel || "-"}`, 50, y);
    y += 15;
    doc.text(`Usuário: ${avaria.usuario || "-"}`, 50, y);
    y += 20;

    // Tabela de Produtos
    doc.fontSize(12).font("Helvetica-Bold").text("PRODUTOS", 50, y);
    y += 20;

    // Cabeçalho da tabela
    doc.fontSize(9).font("Helvetica-Bold");
    doc.text("Código", 50, y);
    doc.text("Descrição", 120, y);
    doc.text("Quantidade", 400, y, { width: 80, align: "right" });
    doc.text("Unidade", 490, y);
    y += 15;

    // Linha separadora
    doc.moveTo(50, y).lineTo(550, y).stroke();
    y += 10;

    // Itens
    doc.fontSize(9).font("Helvetica");
    itens.forEach((item) => {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }

      let qtdParaImprimir = Number(item.quantidade) || 0;
      let unidadeParaImprimir = (item.unidade || "").trim();
      const fator = Number(item.fator_conversao);

      if (item.validacao_convertida != null) {
        qtdParaImprimir = Number(item.validacao_convertida);
        unidadeParaImprimir = item.segunda_unidade || "UN";
      } else if (item.validacao != null) {
        let val = Number(item.validacao);
        if (fator && fator > 0) {
          qtdParaImprimir = val / fator;
          unidadeParaImprimir = item.segunda_unidade || "UN";
        } else {
          qtdParaImprimir = val;
          if (item.segunda_unidade) unidadeParaImprimir = item.segunda_unidade;
        }
      } else {
        // Fallback: se não tiver validação mas tiver fator, converte a quantidade original
        if (fator && fator > 0) {
          qtdParaImprimir = qtdParaImprimir / fator;
          unidadeParaImprimir = item.segunda_unidade || "UN";
        }
      }

      doc.text(item.cod_produto || "-", 50, y);
      doc.text(item.descricao || "-", 120, y, { width: 270 });
      doc.text(qtdParaImprimir.toFixed(2), 400, y, {
        width: 80,
        align: "right",
      });
      doc.text(unidadeParaImprimir, 490, y);
      y += 15;
    });

    // Rodapé
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).font("Helvetica");
      doc.text(`Página ${i + 1} de ${pageCount}`, 50, doc.page.height - 30, {
        align: "center",
      });
      doc.text(
        "Sistema FF v2.0.1. © 2025 Adriano Martins",
        50,
        doc.page.height - 20,
        { align: "center" }
      );
    }

    doc.end();
  } catch (err) {
    console.error("Erro ao gerar PDF da avaria:", err);
    res.status(500).json({ error: "Erro ao gerar PDF.", details: err.message });
  }
});

/// ✅ Atualiza validações, salva segunda_unidade como 'KG' e validacao_convertida
app.put("/avarias/:id", async (req, res) => {
  const id = req.params.id;
  const { itens } = req.body;

  if (!Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ error: "Itens inválidos ou ausentes." });
  }

  const conn = await dbOcorrencias.promise().getConnection();

  try {
    await conn.beginTransaction();

    for (const item of itens) {
      const { id: itemId, validacao, validacao_convertida } = item;

      await conn.query(
        `
        UPDATE avarias_itens 
        SET 
          validacao = ?, 
          validacao_convertida = ?
        WHERE 
          id = ? AND numero_avaria = ?
        `,
        [
          validacao !== null ? Number(validacao) : null,
          validacao_convertida !== null ? Number(validacao_convertida) : null,
          itemId,
          id,
        ]
      );
    }

    await conn.commit();
    res.status(200).send("✅ Validações atualizadas com sucesso.");
  } catch (err) {
    await conn.rollback();
    console.error("❌ Erro ao atualizar validações:", err);
    res.status(500).json({
      error: "Erro ao atualizar validações.",
      details: err.message,
    });
  } finally {
    conn.release();
  }
});

app.put("/avarias/:numero/status", async (req, res) => {
  const { numero } = req.params;
  const { status, motivo } = req.body;
  const usuario = req.body.usuario || req.headers["x-usuario"] || "sistema";

  try {
    const conn = await dbOcorrencias.promise().getConnection();

    const validStatuses = [
      "Pendente",
      "Concluido",
      "Concluído",
      "Recusado",
      "Recusado (P)",
    ];

    if (!validStatuses.includes(status)) {
      conn.release();
      return res.status(400).json({ erro: "Status inválido." });
    }

    let query = `
      UPDATE avarias_estoque 
      SET 
        status = ?, 
        atualizado_por = ?, 
        atualizado_em = CONCAT(DATE(data_inclusao), ' ', DATE_FORMAT(NOW(), '%H:%i:%s'))
    `;

    const params = [status, usuario];

    if (motivo !== undefined && motivo !== null && motivo.trim() !== "") {
      query += `, motivo = ?`;
      params.push(motivo.trim());
    }

    if (
      status.toLowerCase() === "concluido" ||
      status.toLowerCase() === "concluído"
    ) {
      query += `, data_concluida = NOW()`;
    }

    query += ` WHERE numero = ?`;
    params.push(numero);

    const [result] = await conn.query(query, params);

    if (result.affectedRows === 0) {
      conn.release();
      return res.status(404).json({ erro: "Avaria não encontrada." });
    }

    let acaoLog = "";

    switch (status.toLowerCase()) {
      case "concluido":
      case "concluído":
        acaoLog = "concluido";
        break;
      case "recusado (p)":
        acaoLog = "recusado";
        break;
      case "recusado":
        acaoLog = "recusado_aprovado";
        break;
      case "pendente":
        acaoLog = "recusado_rejeitado";
        break;
      default:
        acaoLog = "status_atualizado";
    }

    await conn.query(
      `INSERT INTO avarias_logs (numero_avaria, acao, usuario, observacao)
       VALUES (?, ?, ?, ?)`,
      [numero, acaoLog, usuario, motivo || null]
    );

    conn.release();

    res.json({ mensagem: "Status da avaria atualizado com sucesso." });
  } catch (err) {
    console.error("❌ Erro ao atualizar status da avaria:", err);
    res.status(500).send("Erro ao atualizar status da avaria.");
  }
});

app.get("/avarias/logs/:id", async (req, res) => {
  const { id } = req.params;
  const [[{ numero } = {}]] = await dbOcorrencias
    .promise()
    .query("SELECT numero FROM avarias_estoque WHERE id = ?", [id]);

  if (!numero) return res.status(404).send("Avaria não encontrada.");

  const [rows] = await dbOcorrencias
    .promise()
    .query(
      `SELECT * FROM avarias_logs WHERE numero_avaria = ? ORDER BY data_hora DESC`,
      [numero]
    );

  res.json(rows);
});

app.get("/avarias/pendentes-recusa/:origem", async (req, res) => {
  const origem = req.params.origem;

  try {
    const [rows] = await dbOcorrencias.promise().query(
      `SELECT * FROM avarias_estoque 
         WHERE status = 'Recusado (P)' 
           AND origem = ? 
         ORDER BY data_inclusao DESC`,
      [origem]
    );

    res.json(rows);
  } catch (err) {
    console.error("❌ Erro ao buscar pendências de recusa de avarias:", err);
    res.status(500).send("Erro ao buscar pendências.");
  }
});

app.post("/avarias/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status, motivo, usuario } = req.body;

  try {
    const conn = await dbOcorrencias.promise().getConnection();

    const validStatuses = [
      "Pendente",
      "Concluido",
      "Concluído",
      "Recusado",
      "Recusado (P)",
    ];

    if (!validStatuses.includes(status)) {
      conn.release();
      return res.status(400).json({ erro: "Status inválido." });
    }

    let query = `
      UPDATE avarias_estoque 
      SET 
        status = ?, 
        atualizado_por = ?, 
        atualizado_em = CONCAT(DATE(data_inclusao), ' ', DATE_FORMAT(NOW(), '%H:%i:%s'))
    `;
    const params = [status, usuario || "sistema"];

    if (motivo?.trim()) {
      query += `, motivo = ?`;
      params.push(motivo.trim());
    }

    if (
      status.toLowerCase() === "concluido" ||
      status.toLowerCase() === "concluído"
    ) {
      query += `, data_concluida = NOW()`;
    }

    query += ` WHERE id = ?`;
    params.push(id);

    const [result] = await conn.query(query, params);

    if (result.affectedRows === 0) {
      conn.release();
      return res.status(404).json({ erro: "Avaria não encontrada." });
    }

    // Log de status
    let acaoLog = "";
    switch (status.toLowerCase()) {
      case "concluido":
      case "concluído":
        acaoLog = "concluido";
        break;
      case "recusado (p)":
        acaoLog = "recusado";
        break;
      case "recusado":
        acaoLog = "recusado_aprovado";
        break;
      case "pendente":
        acaoLog = "recusado_rejeitado";
        break;
      default:
        acaoLog = "status_atualizado";
    }

    // Buscar número da avaria para log
    const [[{ numero } = {}]] = await conn.query(
      `SELECT numero FROM avarias_estoque WHERE id = ?`,
      [id]
    );

    await conn.query(
      `INSERT INTO avarias_logs (numero_avaria, acao, usuario, observacao, data_hora)
       VALUES (?, ?, ?, ?, NOW())`,
      [numero, acaoLog, usuario || "sistema", motivo || null]
    );

    conn.release();
    res.json({ mensagem: "Status atualizado com sucesso." });
  } catch (err) {
    console.error("❌ Erro ao atualizar status da avaria:", err);
    res.status(500).send("Erro ao atualizar status.");
  }
});

// EM server.js

app.post("/transferencia-saldo", async (req, res) => {
  const { data, local, cod_origem, cod_destino, quantidade } = req.body;

  if (!data || !local || !cod_origem || !cod_destino || !quantidade) {
    return res
      .status(400)
      .json({ error: "Preencha todos os campos obrigatórios." });
  }

  const conn = await dbOcorrencias.promise().getConnection();

  try {
    await conn.beginTransaction();

    // 1. Busca o saldo atual do produto de origem
    const [origemRows] = await conn.query(
      `SELECT saldo_final FROM saldos_fechamento 
       WHERE data = ? AND local = ? AND cod_produto = ?`,
      [data, local, cod_origem]
    );

    if (origemRows.length === 0) {
      await conn.rollback();
      return res
        .status(404)
        .json({ error: "Produto de origem não encontrado." });
    }

    const saldoOrigem = parseFloat(origemRows[0].saldo_final);
    if (saldoOrigem < quantidade) {
      await conn.rollback();
      return res
        .status(400)
        .json({ error: "Saldo insuficiente no produto de origem." });
    }

    // 2. Subtrai do produto de origem
    await conn.query(
      `UPDATE saldos_fechamento 
       SET saldo_final = saldo_final - ? 
       WHERE data = ? AND local = ? AND cod_produto = ?`,
      [quantidade, data, local, cod_origem]
    );

    // 3. Verifica se já existe saldo do produto de destino
    const [destinoRows] = await conn.query(
      `SELECT saldo_final FROM saldos_fechamento 
       WHERE data = ? AND local = ? AND cod_produto = ?`,
      [data, local, cod_destino]
    );

    if (destinoRows.length > 0) {
      // Já existe: soma o saldo
      await conn.query(
        `UPDATE saldos_fechamento 
         SET saldo_final = saldo_final + ? 
         WHERE data = ? AND local = ? AND cod_produto = ?`,
        [quantidade, data, local, cod_destino]
      );
    } else {
      // Não existe: insere nova linha
      await conn.query(
        `INSERT INTO saldos_fechamento (data, cod_produto, local, saldo_final)
         VALUES (?, ?, ?, ?)`,
        [data, cod_destino, local, quantidade]
      );
    }

    await conn.commit();
    res.json({
      success: true,
      message: "Transferência realizada com sucesso.",
    });
  } catch (error) {
    await conn.rollback();
    console.error("❌ Erro ao transferir saldo:", error);
    res.status(500).json({ error: "Erro interno ao transferir saldo." });
  } finally {
    conn.release();
  }
});
app.get("/produto/movimentacoes", async (req, res) => {
  const { codpro, data } = req.query;
  if (!codpro || !data) {
    return res.status(400).send("Código do produto e data são obrigatórios.");
  }

  // helpers
  const normCod = (v) => String(v ?? "").replace(/\./g, "");
  const normLocal = (v) =>
    String(v ?? "")
      .trim()
      .padStart(2, "0");
  const toIsoDay = (d) => new Date(d).toISOString().slice(0, 10);

  const origemUsuario = normLocal(req.headers["x-local"] || req.query.local);
  const filial = (req.headers["x-filial"] || "01").toString().padStart(2, "0");
  const protheusDate = String(data).replace(/-/g, ""); // YYYYMMDD
  const codproNoDot = normCod(codpro); // 101.027 -> 101027

  let connMy = null;
  let pool = null;

  try {
    // --- MySQL (Ocorrências)
    connMy = await dbOcorrencias.promise().getConnection();

    // COMPRAS (entra no local atual)
    if (!origemUsuario) {
      return res.status(400).json({ error: "Local não informado" });
    }

    const [compras] = await connMy.query(
      `
      SELECT
        cml.compra_codigo                       AS nota,
        cmi.fornec                              AS fornecedor,
        cml.local                               AS destino,
        DATE(cml.data)                          AS data_br,
        REPLACE(cml.codpro, '.', '')            AS codpro,
        COALESCE(p.descricao, cmi.descpro, '-') AS nome_produto,
        cml.qtd_lancada                         AS qtd_lancada,
        cm.status                               AS status
      FROM compras_mercadoria_lancamentos cml
      LEFT JOIN compras_mercadoria cm
        ON cm.codigo = cml.compra_codigo
      LEFT JOIN compras_mercadoria_itens cmi
        ON cmi.codcar = cml.compra_codigo
       AND REPLACE(cmi.codpro, '.', '') = REPLACE(cml.codpro, '.', '')
      LEFT JOIN produtos p
        ON REPLACE(p.codigo_produto, '.', '') = REPLACE(cml.codpro, '.', '')
      WHERE REPLACE(cml.codpro, '.', '') = REPLACE(?, '.', '')
        AND cml.local = ?
        AND DATE(cml.data) = ?
      ORDER BY cml.compra_codigo
      `,
      [codproNoDot, origemUsuario, toIsoDay(data)]
    );

    // TRANSFERÊNCIAS (mesma tabela para entrada/saída; o front separa por origem/destino)
    const [transferencias] = await connMy.query(
      `
      SELECT
        t.id, t.numero, t.origem, t.destino, t.status, t.quantidade, t.unidade,
        t.data_inclusao,
        REPLACE(t.cod_produto, '.', '')                       AS cod_produto,
        COALESCE(p.descricao, '-')                            AS descricao
      FROM transferencias_estoque t
      LEFT JOIN produtos p
        ON REPLACE(p.codigo_produto, '.', '') = REPLACE(t.cod_produto, '.', '')
      WHERE REPLACE(t.cod_produto, '.', '') = REPLACE(?, '.', '')
        AND DATE(t.data_inclusao) = ?
        AND (t.origem = ? OR t.destino = ?)
      ORDER BY t.numero, t.id
      `,
      [codproNoDot, toIsoDay(data), origemUsuario, origemUsuario]
    );

    // AVARIAS (feito no local do usuário)
    const [avarias] = await connMy.query(
      `
      SELECT
        ai.*, ae.data_inclusao, ae.origem, ae.destino, ae.numero, ae.usuario,
        REPLACE(ai.cod_produto, '.', '') AS cod_produto
      FROM avarias_itens ai
      JOIN avarias_estoque ae ON ae.id = ai.numero_avaria
      WHERE REPLACE(ai.cod_produto, '.', '') = REPLACE(?, '.', '')
        AND DATE(ae.data_inclusao) = ?
        AND (ae.origem = ? OR ae.destino = ?)
      ORDER BY ae.numero, ai.id
      `,
      [codproNoDot, toIsoDay(data), origemUsuario, origemUsuario]
    );

    // DEVOLUÇÕES (no local do usuário)
    const [devolucoes] = await connMy.query(
      `
  SELECT
    di.*, 
    d.data_inclusao, 
    d.origem, 
    d.numero, 
    d.usuario,
    REPLACE(di.cod_produto, '.', '') AS cod_produto
  FROM estoque_devolucoes_itens di
  JOIN estoque_devolucoes d 
    ON d.id = di.devolucao_id
  WHERE REPLACE(di.cod_produto, '.', '') = REPLACE(?, '.', '')
    AND DATE(d.data_inclusao) = ?
    AND d.origem = ?
  ORDER BY d.numero, di.id
  `,
      [codproNoDot, toIsoDay(data), origemUsuario]
    );

    // --- MSSQL (Protheus) — VENDAS
    pool = await getMSSQLPool();
    const resultVendas = await pool
      .request()
      .input("filial", sql.VarChar(2), filial)
      .input("data", sql.Char(8), protheusDate)
      .input("codpro", sql.VarChar(20), codproNoDot).query(`
        SELECT
          Z5.Z5_FILIAL  AS filial,
          Z5.Z5_BILHETE AS bilhete,
          CONCAT(SUBSTRING(Z5.Z5_DATA,1,4),'-',SUBSTRING(Z5.Z5_DATA,5,2),'-',SUBSTRING(Z5.Z5_DATA,7,2),'T12:00:00') AS data_iso,
          CONCAT(SUBSTRING(Z5.Z5_DATA,7,2),'/',SUBSTRING(Z5.Z5_DATA,5,2),'/',SUBSTRING(Z5.Z5_DATA,1,4)) AS data_br,
          REPLACE(Z5.Z5_CODPRO, '.', '') AS codpro,
          Z5.Z5_DESPRO  AS nome_produto,
          Z5.Z5_QTDE    AS quantidade,
          Z5.Z5_PRECO   AS preco,
          Z5.Z5_TOTAL   AS total,
          Z4.Z4_LOCAL   AS local,
          Z4.Z4_NOMCLI  AS cliente
        FROM SZ5140 AS Z5
        LEFT JOIN SZ4140 AS Z4
          ON Z4.Z4_BILHETE = Z5.Z5_BILHETE AND Z4.D_E_L_E_T_ = ''
        WHERE Z5.Z5_FILIAL = @filial
          AND Z5.D_E_L_E_T_ = ''
          AND Z5.Z5_DATA    = @data
          AND REPLACE(Z5.Z5_CODPRO, '.', '') = @codpro
      `);

    const vendas = resultVendas.recordset;

    // resposta
    res.json({
      compras,
      // o front usa 'transferencia' e separa entrada/saída por origem/destino
      transferencia: transferencias,
      entrada: transferencias, // mantém por compatibilidade se decidir usar
      avaria: avarias,
      devolucao: devolucoes,
      venda: vendas,
    });
  } catch (err) {
    console.error("❌ Erro ao buscar movimentações:", err);
    res.status(500).send("Erro ao buscar movimentações.");
  } finally {
    if (connMy) connMy.release();
    // Removido pool.close() pois o pool é compartilhado
  }
});

app.get("/transferencias/:numero/itens", async (req, res) => {
  const numero = req.params.numero;

  try {
    const conn = await dbOcorrencias.promise().getConnection();

    const [rows] = await conn.query(
      `SELECT cod_produto AS codProduto, descricao, quantidade AS qtd, unidade 
       FROM transferencias_estoque 
       WHERE numero = ?`,
      [numero]
    );

    conn.release();
    res.json(rows);
  } catch (err) {
    console.error("❌ Erro ao buscar itens da transferência:", err);
    res.status(500).send("Erro ao buscar itens da transferência.");
  }
});

app.post("/saldos/fechamento", async (req, res) => {
  const { data, itens, usuario } = req.body;

  if (!data || !Array.isArray(itens) || itens.length === 0 || !usuario) {
    return res.status(400).send("Data, itens e usuário são obrigatórios.");
  }

  const local = itens[0]?.local; // 🧠 Considera o local do primeiro item (todos devem ser do mesmo local)

  if (!local) {
    return res.status(400).send("Local é obrigatório nos itens.");
  }

  const conn = await dbOcorrencias.promise().getConnection();
  await conn.beginTransaction();

  try {
    for (const item of itens) {
      if (!item.cod_produto || !item.local) continue;

      await conn.query(
        `INSERT INTO pre_fechamento (data, usuario, local)
   VALUES (?, ?, ?)
   ON DUPLICATE KEY UPDATE usuario = VALUES(usuario), criado_em = NOW()`,
        [data, usuario, local]
      );
    }

    await conn.commit();
    res.send("Fechamento salvo com sucesso.");
  } catch (error) {
    await conn.rollback();
    console.error("Erro ao salvar fechamento:", error);
    res.status(500).send("Erro ao salvar o fechamento.");
  } finally {
    conn.release();
  }
});

app.get("/saldos/fechamento/verifica", async (req, res) => {
  const { data, local } = req.query;

  if (!data || !local) {
    return res.status(400).json({ erro: "Data e local são obrigatórios." });
  }

  try {
    const [rows] = await dbOcorrencias
      .promise()
      .query(`SELECT 1 FROM pre_fechamento WHERE data = ? AND local = ?`, [
        data,
        local,
      ]);

    if (rows.length > 0) {
      res.json({ fechado: true });
    } else {
      res.json({ fechado: false });
    }
  } catch (error) {
    console.error("Erro ao verificar fechamento:", error);
    res.status(500).json({ erro: "Erro interno ao verificar fechamento." });
  }
});

app.post("/saldos/fechados", async (req, res) => {
  const { data, local } = req.body;

  try {
    const [result] = await dbOcorrencias
      .promise()
      .query(
        `SELECT COUNT(*) AS total FROM saldos_fechamento WHERE data = ? AND local = ?`,
        [data, local]
      );

    res.json({ fechado: result[0].total > 0 });
  } catch (err) {
    console.error("Erro ao verificar fechamento:", err);
    res.status(500).json({ error: "Erro na verificação do fechamento" });
  }
});

app.post("/saldos/fechamento-do-dia", async (req, res) => {
  const { data, local } = req.body;

  try {
    const [rows] = await dbOcorrencias
      .promise()
      .query(
        `SELECT cod AS cod_produto, qtd AS saldo_final FROM estoque_contagem WHERE DATE(atualizado_em) = ? AND local = ? AND qtd > 0`,
        [data, local]
      );

    const payload = rows.map((r) => ({
      ...r,
      local,
      data,
    }));

    // salva no saldos_fechamento
    for (const item of payload) {
      await dbOcorrencias.promise().query(
        `INSERT INTO saldos_fechamento (data, cod_produto, local, saldo_final)
         VALUES (?, ?, ?, ?)`,
        [item.data, item.cod_produto, item.local, item.saldo_final]
      );
    }

    res.json({ ok: true, salvos: payload.length });
  } catch (err) {
    console.error("❌ Erro ao salvar fechamento do dia:", err);
    res.status(500).json({ erro: "Erro no fechamento" });
  }
});

//app.get("/saldos/fechamento/:data", async (req, res) => {
//  const { data } = req.params;
//  try {
//    const [rows] = await dbOcorrencias
//      .promise()
//      .query("SELECT COUNT(*) AS total FROM saldos_fechamento WHERE data = ?", [
//        data,
//      ]);

//    res.json({ fechado: rows[0].total > 0 });
//  } catch (err) {
//    console.error("Erro ao verificar fechamento:", err);
//    res.status(500).send("Erro ao verificar fechamento");
//  }
//});

//app.get("/saldos/fechamento/:data", async (req, res) => {
//  const { data } = req.params;
//  const { local } = req.query;

//  if (!data || !local) {
//    return res.status(400).send("Data e local são obrigatórios.");
//  }

//  const localNormalizado = String(parseInt(local)); // '01' → '1'

//  try {
//    const [rows] = await dbOcorrencias
//      .promise()
//      .query(
//        `SELECT 1 FROM pre_fechamento WHERE data = ? AND local = ? LIMIT 1`,
//        [data, localNormalizado]
//      );

//    res.json({ fechado: rows.length > 0 });
//  } catch (err) {
//    console.error("Erro ao verificar fechamento:", err);
//    res.status(500).send("Erro ao verificar.");
//  }
//});

// GET /saldos/fechamento/:data?local=04
// GET /saldos/fechamento/:data?local=04
app.get("/saldos/fechamento/:data", async (req, res) => {
  const { data } = req.params;

  const normalizeLocal = (v) => {
    if (v == null) return "";
    const n = parseInt(String(v).trim(), 10);
    return Number.isFinite(n)
      ? String(n).padStart(2, "0")
      : String(v).padStart(2, "0");
  };

  const local = normalizeLocal(req.query.local);

  try {
    const [rows] = await dbOcorrencias.promise().query(
      `
        SELECT DISTINCT LPAD(CAST(local AS UNSIGNED), 2, '0') AS local
          FROM saldos_fechamento
         WHERE data = ?
      `,
      [data]
    );

    const locaisFechados = rows.map((r) => String(r.local).padStart(2, "0"));
    const fechado = local
      ? locaisFechados.includes(local)
      : locaisFechados.length > 0;

    res.json({ fechado, locaisFechados });
  } catch (err) {
    console.error("Erro ao verificar fechamento:", err);
    res.json({ fechado: false, locaisFechados: [] });
  }
});

app.get("/produtos/saldo-inicial", async (req, res) => {
  const { data, local } = req.query;

  if (!data || !local) {
    return res.status(400).send("Data e local são obrigatórios");
  }

  try {
    const [rows] = await dbOcorrencias.promise().query(
      `SELECT cod_produto AS cod, saldo_final 
         FROM saldos_fechamento 
         WHERE data = ? AND local = ?`,
      [data, local]
    );

    res.json(rows);
  } catch (err) {
    console.error("❌ Erro ao buscar saldo inicial:", err);
    res.status(500).send("Erro ao buscar saldo inicial");
  }
});

app.get("/estoque/transferencias-pendentes", async (req, res) => {
  const { data, local } = req.query;

  try {
    const [rows] = await dbOcorrencias.promise().query(
      `
      SELECT DISTINCT
        numero,
        status,
        origem,
        destino,
        DATE(data_inclusao) AS data
      FROM transferencias_estoque
      WHERE DATE(data_inclusao) = ?
        AND (
          CAST(origem  AS UNSIGNED) = CAST(? AS UNSIGNED) OR
          CAST(destino AS UNSIGNED) = CAST(? AS UNSIGNED)
        )
        -- ✅ tudo que NÃO é concluído bloqueia (inclui NULL e vazio)
        AND UPPER(TRIM(COALESCE(status, ''))) NOT IN ('CONCLUIDO','CONCLUÍDO', 'RECUSADO')
      ORDER BY numero
      `,
      [data, local, local]
    );

    res.json(rows);
  } catch (err) {
    console.error("Erro ao verificar transferências pendentes:", err);
    res.status(500).send("Erro ao verificar transferências.");
  }
});

app.put("/transferencias/:numero/status", async (req, res) => {
  const { numero } = req.params;
  const { status, motivo } = req.body;
  const usuario = req.body.usuario || req.headers["x-usuario"] || "sistema"; // ✅ prioriza body, depois header, depois "sistema"

  try {
    const conn = await dbOcorrencias.promise().getConnection();

    const validStatuses = [
      "Pendente",
      "Concluido",
      "Concluído",
      "Recusado",
      "Recusado (P)",
    ];

    if (!validStatuses.includes(status)) {
      conn.release();
      return res.status(400).json({ erro: "Status inválido." });
    }

    let query = `
      UPDATE transferencias_estoque 
      SET 
        status = ?, 
        atualizado_por = ?, 
        atualizado_em = CONCAT(DATE(data_inclusao), ' ', DATE_FORMAT(NOW(), '%H:%i:%s'))
    `;

    const params = [status, usuario];

    if (motivo !== undefined && motivo !== null && motivo.trim() !== "") {
      query += `, motivo = ?`;
      params.push(motivo.trim());
    }

    if (
      status.toLowerCase() === "concluido" ||
      status.toLowerCase() === "concluído"
    ) {
      query += `, data_concluida = NOW()`;
    }

    query += ` WHERE numero = ?`;
    params.push(numero);

    const [result] = await conn.query(query, params);

    if (result.affectedRows === 0) {
      conn.release();
      return res.status(404).json({ erro: "Transferência não encontrada." });
    }

    // 🧠 Determina a ação do log com base no novo status
    let acaoLog = "";

    switch (status.toLowerCase()) {
      case "concluido":
      case "concluído":
        acaoLog = "concluido";
        break;
      case "recusado (p)":
        acaoLog = "recusado";
        break;
      case "recusado":
        acaoLog = "recusado_aprovado";
        break;
      case "pendente":
        acaoLog = "recusado_rejeitado";
        break;
      default:
        acaoLog = "status_atualizado";
    }

    // ✅ Registra o log
    await conn.query(
      `INSERT INTO transferencias_logs (numero_transferencia, acao, usuario, observacao)
       VALUES (?, ?, ?, ?)`,
      [numero, acaoLog, usuario, motivo || null]
    );

    conn.release();

    res.json({ mensagem: "Status atualizado com sucesso." });
  } catch (err) {
    console.error("❌ Erro ao atualizar status da transferência:", err);
    res.status(500).send("Erro ao atualizar status.");
  }
});

app.get("/transferencias/:numero/logs", async (req, res) => {
  const { numero } = req.params;
  try {
    const [rows] = await dbOcorrencias
      .promise()
      .query(
        `SELECT * FROM transferencias_logs WHERE numero_transferencia = ? ORDER BY data_hora DESC`,
        [numero]
      );

    res.json(rows);
  } catch (err) {
    console.error("Erro ao buscar logs:", err);
    res.status(500).send("Erro ao buscar logs.");
  }
});

app.get("/transferencias/pendentes-recusa/:origem", async (req, res) => {
  const origem = req.params.origem;

  try {
    const [rows] = await dbOcorrencias.promise().query(
      `SELECT * FROM transferencias_estoque 
         WHERE status = 'Recusado (P)' 
           AND origem = ? 
         ORDER BY data_inclusao DESC`,
      [origem]
    );

    res.json(rows);
  } catch (err) {
    console.error("❌ Erro ao buscar pendências de recusa:", err);
    res.status(500).send("Erro ao buscar pendências.");
  }
});

// Rotas de devoluções
app.post("/devolucoes", async (req, res) => {
  const {
    numero,
    origem,
    cliente,
    clienteId, // ADICIONADO
    tipoDocumento,
    produtos,
    data_inclusao,
    usuario,
    movimentaEstoque = true, // ✅ Pega true por padrão se não vier do front
  } = req.body;

  // Validação
  if (!numero || !origem || !cliente || !produtos?.length || !usuario) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes." });
  }

  try {
    const conn = await dbOcorrencias.promise().getConnection();
    await conn.beginTransaction();

    // Inserção na tabela principal de devoluções
    const [devolucaoResult] = await conn.query(
      `INSERT INTO estoque_devolucoes 
        (numero, origem, cliente, cliente_id, tipo_documento, movimenta_estoque, data_inclusao, usuario)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        numero,
        origem,
        cliente,
        clienteId || null,
        tipoDocumento,
        movimentaEstoque ? 1 : 0,
        data_inclusao,
        usuario,
      ]
    );

    const idDevolucao = devolucaoResult.insertId;

    // Inserção dos itens da devolução
    for (const p of produtos) {
      await conn.query(
        `INSERT INTO estoque_devolucoes_itens 
    (devolucao_id, cod_produto, descricao, quantidade, fator_conversao, unidade, validacao, validacao_convertida)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          idDevolucao,
          p.codProduto,
          p.descricao,
          p.quantidade,
          p.fatorConversao || 1,
          p.unidade || "",
          p.validacao || null,
          p.validacao_convertida || null,
        ]
      );
    }

    await conn.commit();
    conn.release();

    res.status(201).send("✅ Devolução registrada com sucesso.");
  } catch (err) {
    console.error("Erro ao registrar devolução:", err);
    res.status(500).send("Erro ao registrar devolução.");
  }
});

app.get("/devolucoes", async (req, res) => {
  try {
    const { numero } = req.query;
    let query = `
      SELECT d.id, d.numero, d.origem, d.cliente, d.tipo_documento,d.movimenta_estoque, d.data_inclusao, d.usuario,
             COUNT(i.id) AS total_itens
      FROM estoque_devolucoes d
      LEFT JOIN estoque_devolucoes_itens i ON d.id = i.devolucao_id
    `;

    const params = [];
    if (numero) {
      query += ` WHERE d.numero = ? `;
      params.push(numero);
    }

    query += ` GROUP BY d.id ORDER BY d.id DESC`;

    const [rows] = await dbOcorrencias.promise().query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Erro ao listar devoluções:", err);
    res.status(500).send("Erro ao buscar devoluções.");
  }
});

app.get("/estoque/devolucoes", async (req, res) => {
  const { data, local } = req.query;

  if (!data || !local) {
    return res.status(400).json({ erro: "Data e local são obrigatórios" });
  }

  try {
    const [rows] = await dbOcorrencias.promise().query(
      `
      SELECT i.cod_produto, SUM(COALESCE(i.validacao_convertida, 0)) AS total
      FROM estoque_devolucoes d
      JOIN estoque_devolucoes_itens i ON d.id = i.devolucao_id
      WHERE DATE(d.data_inclusao) = ?
      AND d.local = ?
      AND d.movimenta_estoque = 1
      GROUP BY i.cod_produto
    `,
      [data, local]
    );

    res.json(rows);
  } catch (err) {
    console.error("Erro ao buscar devoluções agregadas:", err);
    res.status(500).json({ erro: "Erro ao buscar devoluções agregadas" });
  }
});

app.get("/devolucoes/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const conn = await dbOcorrencias.promise().getConnection();

    const [cab] = await conn.query(
      `SELECT d.*, c.nome_fantasia AS cliente_nome
       FROM estoque_devolucoes d
       LEFT JOIN clientes c ON d.cliente_id = c.codigo
       WHERE d.id = ?`,
      [id]
    );

    const [itens] = await conn.query(
      `SELECT * FROM estoque_devolucoes_itens WHERE devolucao_id = ?`,
      [id]
    );

    conn.release();

    if (cab.length === 0)
      return res.status(404).send("Devolução não encontrada.");

    res.json({ devolucao: cab[0], itens });
  } catch (err) {
    console.error("Erro ao buscar devolução:", err);
    res.status(500).send("Erro ao buscar devolução.");
  }
});

app.put("/devolucoes/:id", async (req, res) => {
  const { id } = req.params;
  const { numero, cliente, clienteId, tipoDocumento, produtos } = req.body;

  try {
    const conn = await dbOcorrencias.promise().getConnection();
    await conn.beginTransaction();

    await conn.query(
      `UPDATE estoque_devolucoes
       SET cliente = ?, cliente_id = ?, tipo_documento = ?
       WHERE id = ?`,
      [cliente, clienteId || null, tipoDocumento, id]
    );

    await conn.query(
      `DELETE FROM estoque_devolucoes_itens WHERE devolucao_id = ?`,
      [id]
    );

    for (const p of produtos) {
      await conn.query(
        `INSERT INTO estoque_devolucoes_itens (devolucao_id, cod_produto, descricao, quantidade, fator_conversao, unidade)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          p.codProduto,
          p.descricao,
          p.quantidade,
          p.fatorConversao || 1,
          p.unidade || "",
        ]
      );
    }

    await conn.commit();
    conn.release();

    res.send("✅ Devolução atualizada com sucesso.");
  } catch (err) {
    console.error("Erro ao atualizar devolução:", err);
    res.status(500).send("Erro ao atualizar devolução.");
  }
});

// Rota para DELETAR uma devolução e seus itens
app.delete("/devolucoes/:id", ensureGestor, async (req, res) => {
  const { id } = req.params;
  const username = req.headers["x-user"] || req.body?.username || "sistema";
  const usuario = username;

  if (!id) {
    return res.status(400).json({ error: "ID da devolução é obrigatório." });
  }

  const conn = await dbOcorrencias.promise().getConnection();
  try {
    // Inicia uma transação para garantir que ambas as exclusões ocorram com sucesso
    await conn.beginTransaction();

    // 1. Deleta primeiro os ITENS associados a essa devolução
    await conn.query(
      `DELETE FROM estoque_devolucoes_itens WHERE devolucao_id = ?`,
      [id]
    );

    // 2. Depois, deleta o registro principal da devolução
    const [result] = await conn.query(
      `DELETE FROM estoque_devolucoes WHERE id = ?`,
      [id]
    );

    // Confirma a transação
    await conn.commit();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Devolução não encontrada." });
    }

    console.log(`Devolução ID ${id} excluída por ${usuario}.`);
    res.json({ success: true, message: "Devolução excluída com sucesso." });
  } catch (err) {
    // Se der qualquer erro, desfaz tudo
    await conn.rollback();
    console.error("❌ Erro ao deletar devolução:", err);
    res
      .status(500)
      .json({ error: "Erro no servidor ao tentar excluir a devolução." });
  } finally {
    // Libera a conexão de volta para o pool
    conn.release();
  }
});

app.get("/saldos/fechamento-geral", async (req, res) => {
  const { data, dataFim } = req.query;
  if (!data) return res.status(400).send("Data é obrigatória.");

  const isRange = dataFim && dataFim !== data;

  try {
    const conn = await dbOcorrencias.promise().getConnection();

    const locais = [
      { id: "09", col: "ps1", nome: "PS1" },
      { id: "06", col: "ps2", nome: "PS2" },
      { id: "03", col: "btf_03", nome: "BTF_03" },
      { id: "04", col: "ban_04", nome: "BAN_04" },
      { id: "07", col: "cd_07", nome: "CD_07" },
      { id: "01", col: "loj_01", nome: "LOJ_01" },
      { id: "05", col: "dep_ovo", nome: "DEP_OVO" },
      { id: "02", col: "dep", nome: "DEP" },
      { id: "08", col: "var_08", nome: "VAR_08" },
    ];

    if (isRange) {
      // 📊 Lógica para Dashboard em Período - Detalhado (via faltas_fechamento)
      const [dadosAgg] = await conn.query(
        `SELECT 
          REPLACE(ff.cod_produto, '.', '') AS cod_produto,
          p.descricao AS nome_produto,
          ff.unidade AS um,
          ff.local,
          DATE_FORMAT(ff.data, '%Y-%m-%d') AS data_item,
          SUM(ff.fisico) AS total_fisico,
          SUM(ff.saldo_calc) AS total_sistema,
          SUM(ff.falta) AS falta_total
        FROM faltas_fechamento ff
        LEFT JOIN produto p ON REPLACE(p.codigo_produto, '.', '') = REPLACE(ff.cod_produto, '.', '')
        WHERE DATE(ff.data) BETWEEN ? AND ?
        GROUP BY REPLACE(ff.cod_produto, '.', ''), p.descricao, ff.unidade, ff.local, ff.data`,
        [data, dataFim]
      );

      const summaryMap = {};

      // 🔍 Buscar Custos no Protheus (SZ5140)
      let custosMap = {};
      try {
        const uniqueProds = [...new Set(dadosAgg.map(r => r.cod_produto))];
        if (uniqueProds.length > 0) {
          const pool = await getMSSQLPool();
          const pDataFim = dataFim.replace(/-/g, '');
          // Limitamos a busca aos últimos 180 dias para evitar ler a tabela toda (melhora performance)
          const pDataInicioJanela = dayjs(dataFim).subtract(180, 'days').format('YYYYMMDD');

          const custosRes = await pool.request()
            .query(`
              SELECT 
                LTRIM(RTRIM(REPLACE(Z5_CODPRO, '.', ''))) as cod,
                MAX(Z5_COMPRA) as custo
              FROM SZ5140 
              WHERE D_E_L_E_T_ = ''
                AND Z5_FILIAL = '01'
                AND Z5_DATA BETWEEN '${pDataInicioJanela}' AND '${pDataFim}'
                AND LTRIM(RTRIM(REPLACE(Z5_CODPRO, '.', ''))) IN (${uniqueProds.map(c => `'${c}'`).join(',')})
              GROUP BY LTRIM(RTRIM(REPLACE(Z5_CODPRO, '.', '')))
            `);

          custosRes.recordset.forEach(c => {
            custosMap[c.cod] = Number(c.custo);
          });
        }
      } catch (errCusto) {
        console.error("Erro ao buscar custos no Protheus:", errCusto);
      }

      const details = dadosAgg.map(r => {
        const fisico = Number(r.total_fisico);
        const sistema = Number(r.total_sistema);
        const dif = fisico - sistema;
        const nomeLocal = locais.find(l => l.id === r.local)?.nome || r.local;
        const custoUnitario = custosMap[r.cod_produto] || 0;
        return {
          ...r,
          data: r.data_item,
          nome_local: nomeLocal,
          dif: Math.round(dif * 100) / 100,
          custo: custoUnitario,
          total_custo_dif: Math.round(dif * custoUnitario * 100) / 100
        };
      }).filter(r => Math.abs(r.dif) > 0.01);

      dadosAgg.forEach(r => {
        const cod = r.cod_produto.trim();
        if (!summaryMap[cod]) {
          summaryMap[cod] = { cod_produto: cod, nome_produto: r.nome_produto || cod, um: r.um };
        }

        const localCfg = locais.find(l => l.id === r.local);
        if (localCfg) {
          summaryMap[cod][localCfg.col] = (summaryMap[cod][localCfg.col] || 0) + Number(r.total_fisico);
          summaryMap[cod][`${localCfg.col}_sistema`] = (summaryMap[cod][`${localCfg.col}_sistema`] || 0) + Number(r.total_sistema);
        }
      });

      conn.release();
      return res.json({ summary: Object.values(summaryMap), details });
    }

    const dataAnterior = new Date(data);
    dataAnterior.setDate(dataAnterior.getDate() - 1);
    const dataAnteriorStr = dataAnterior.toISOString().split("T")[0];

    // 🔍 Produtos envolvidos
    const [produtos] = await conn.query(
      `
      SELECT DISTINCT cod_produto FROM (
        SELECT codpro AS cod_produto, data FROM vendas_produtos
        UNION
        SELECT codpro AS cod_produto, data FROM compras_mercadoria_lancamentos
        UNION
        SELECT cod_produto, data_inclusao AS data FROM transferencias_estoque
        UNION
        SELECT ai.cod_produto, ae.data_inclusao AS data
          FROM avarias_itens ai
          JOIN avarias_estoque ae ON ae.numero = ai.numero_avaria
        UNION
        SELECT ei.cod_produto, ed.data_inclusao AS data
          FROM estoque_devolucoes_itens ei
          JOIN estoque_devolucoes ed ON ed.id = ei.devolucao_id
        UNION
        SELECT cod AS cod_produto, atualizado_em AS data
          FROM estoque_contagem
      ) AS todas
      WHERE DATE(data) >= DATE_SUB(?, INTERVAL 30 DAY)
      `,
      [data]
    );

    const produtoMap = {};
    for (const { cod_produto } of produtos) {
      const cod = cod_produto.replace(/\./g, "").trim();
      produtoMap[cod] = { cod_produto };
    }

    // 🔍 Nome dos produtos e UM
    const [nomes] = await conn.query(
      `SELECT REPLACE(codigo_produto, '.', '') AS codigo_produto, descricao, unidade FROM produto`
    );
    nomes.forEach((p) => {
      const cod = p.codigo_produto.trim();
      if (produtoMap[cod]) {
        produtoMap[cod].nome_produto = p.descricao;
        produtoMap[cod].um = p.unidade;
      }
    });

    // 🔍 Saldo atual do Protheus (saldo_produtos)
    const [saldosProtheus] = await conn.query(
      `SELECT 
    REPLACE(cod_produto, '.', '') AS cod_produto,
    local,
    SUM(saldo_total) AS saldo_protheus
  FROM saldo_produtos
  WHERE DATE(data_alteracao) = ?
  GROUP BY cod_produto, local`,
      [data]
    );

    saldosProtheus.forEach((r) => {
      const cod = r.cod_produto.trim();
      const col = locais.find((l) => l.id === r.local)?.col;
      if (col && produtoMap[cod]) {
        produtoMap[cod][`${col}_sistema`] = Number(r.saldo_protheus);
      }
    });

    // 🔍 Saldos Iniciais
    const [saldosIniciais] = await conn.query(
      `SELECT cod_produto, saldo_final, local FROM saldos_fechamento WHERE DATE(data) = ?`,
      [dataAnteriorStr]
    );
    saldosIniciais.forEach((r) => {
      const cod = r.cod_produto.replace(/\./g, "").trim();
      const col = locais.find((l) => l.id === r.local)?.col;
      if (col && produtoMap[cod]) {
        produtoMap[cod][`${col}_ini`] = Number(r.saldo_final);
      }
    });

    // 🔍 Contagem Física
    const [contagens] = await conn.query(
      `SELECT 
    REPLACE(cod, '.', '') AS cod_produto, 
    local, 
    SUM(qtd) AS saldo_fisico
   FROM estoque_contagem
   WHERE DATE(atualizado_em) = ?
   GROUP BY cod_produto, local`,
      [data]
    );

    contagens.forEach((r) => {
      const cod = r.cod_produto.replace(/\./g, "").trim();
      const col = locais.find((l) => l.id === r.local)?.col;
      if (col && produtoMap[cod]) {
        produtoMap[cod][`${col}_fisico`] = Number(r.saldo_fisico);
      }
    });

    // 🔍 Movimentações
    const movimentos = [
      {
        query: `SELECT codpro AS cod_produto, local, SUM(qtd_lancada) AS total
                FROM compras_mercadoria_lancamentos
                WHERE DATE(data) = ?
                GROUP BY codpro, local`,
        tipo: "compras",
      },

      {
        query: `SELECT codpro AS cod_produto, local, SUM(qtde) AS total
                FROM vendas_produtos
                WHERE DATE(data) = ?
                GROUP BY codpro, local`,
        tipo: "venda",
        sinal: -1,
      },

      {
        query: `SELECT ai.cod_produto, ae.local, SUM(ai.quantidade) AS total
                FROM avarias_itens ai
                JOIN avarias_estoque ae ON ae.numero = ai.numero_avaria
                WHERE DATE(ae.data_inclusao) = ?
                GROUP BY ai.cod_produto, ae.local`,
        tipo: "avaria",
        sinal: -1,
      },

      {
        query: `SELECT ei.cod_produto, ed.local, SUM(ei.quantidade) AS total
                FROM estoque_devolucoes_itens ei
                JOIN estoque_devolucoes ed ON ed.id = ei.devolucao_id
                WHERE DATE(ed.data_inclusao) = ?
                GROUP BY ei.cod_produto, ed.local`,
        tipo: "devolucao",
      },

      {
        query: `SELECT cod_produto, origem AS local, SUM(quantidade) AS total
                FROM transferencias_estoque
                WHERE DATE(data_inclusao) = ? AND status = 'Concluido'
                GROUP BY cod_produto, origem`,
        tipo: "transferencia",
        sinal: -1,
      },

      {
        query: `SELECT cod_produto, destino AS local, SUM(quantidade) AS total
                FROM transferencias_estoque
                WHERE DATE(data_inclusao) = ? AND status = 'Concluido'
                GROUP BY cod_produto, destino`,
        tipo: "entrada",
      },
    ];

    for (const mov of movimentos) {
      const [dados] = await conn.query(mov.query, [data]);
      dados.forEach((r) => {
        const cod = r.cod_produto.replace(/\./g, "").trim();
        const col = locais.find((l) => l.id === r.local)?.col;
        if (col && produtoMap[cod]) {
          produtoMap[cod][`${col}_${mov.tipo}`] =
            (produtoMap[cod][`${col}_${mov.tipo}`] || 0) +
            Number(r.total) * (mov.sinal || 1);
        }
      });
    }

    // 🔥 Cálculo final
    const resultado = Object.values(produtoMap)
      .filter((item) => !item.nome_produto?.startsWith("."))
      .map((item) => {
        let totalGeral = 0;

        locais.forEach((l) => {
          const ini = item[`${l.col}_ini`] || 0;
          const entrada = item[`${l.col}_entrada`] || 0;
          const compras = item[`${l.col}_compras`] || 0;
          const venda = item[`${l.col}_venda`] || 0;
          const transf = item[`${l.col}_transferencia`] || 0;
          const avaria = item[`${l.col}_avaria`] || 0;
          const devol = item[`${l.col}_devolucao`] || 0;

          const fisico = item[`${l.col}_fisico`] || null;

          item[l.col] = fisico;

          totalGeral += item[l.col] || 0;
        });

        let status = "Estoque OK";
        if (totalGeral < 0) status = "FALTA";
        else if (totalGeral > 0) status = "SOBRA";

        return {
          ...item,
          status,
          obs: "",
        };
      });

    conn.release();
    res.json(resultado);
  } catch (err) {
    console.error("❌ Erro no fechamento geral:", err);
    res.status(500).send("Erro ao gerar fechamento geral.");
  }
});

// helper bem simples (pega só a 1ª unidade)
async function getUnidadePrincipal(db, cod) {
  const clean = String(cod || "").replace(/[.\-_/ \s]/g, ""); // normaliza 210.018 -> 210018
  const [rows] = await db.query(
    `SELECT UPPER(unidade) AS unidade
       FROM produto
      WHERE REPLACE(codigo_produto, '.', '') = ?
      LIMIT 1`,
    [clean]
  );
  return rows?.[0]?.unidade || null; // só a 1ª unidade
}

// ===================== PREÇOS DE COMPRA (SZ5140) =====================
// Substitua a sua função por ESTA.
async function buscarPrecosCompraPorCod(dataISO, codigos, poolMSSQL) {
  // Normaliza data "YYYY-MM-DD" -> "YYYYMMDD"
  const yyyymmdd = String(dataISO).includes("-")
    ? dataISO.replace(/-/g, "")
    : String(dataISO);

  if (!codigos?.length) return new Map();

  // Normaliza e deduplica códigos (remove não dígitos)
  const codsSan = Array.from(
    new Set(codigos.map((c) => String(c).replace(/\D/g, "")).filter(Boolean))
  );
  if (!codsSan.length) return new Map();

  if (!poolMSSQL) {
    throw new Error("Pool MSSQL não disponível");
  }

  // Monta @c0,@c1,... para uma “tabela” de códigos
  const tempValues = codsSan.map((_, i) => `(@c${i})`).join(",");
  const request = new sql.Request(poolMSSQL);
  request.input("data", sql.VarChar(8), yyyymmdd);
  codsSan.forEach((c, i) => request.input(`c${i}`, sql.VarChar(30), c));

  // 1) Pega o ÚLTIMO preço (<= @data) por código.
  // Observação: se quiser travar por filial, adicione "AND SZ5.Z5_FILIAL='01'".
  const query = `
    WITH cods(cod) AS (SELECT * FROM (VALUES ${tempValues}) v(cod)),
    base AS (
      SELECT
        cod   = REPLACE(LTRIM(RTRIM(SZ5.Z5_CODPRO)), '.', ''),
        data  = SZ5.Z5_DATA,
        preco = CAST(SZ5.Z5_COMPRA AS DECIMAL(18,4)),
        rn    = ROW_NUMBER() OVER (
                  PARTITION BY REPLACE(LTRIM(RTRIM(SZ5.Z5_CODPRO)), '.', '')
                  ORDER BY SZ5.Z5_DATA DESC, SZ5.R_E_C_N_O_ DESC
                )
      FROM SZ5140 AS SZ5 WITH (NOLOCK)
      WHERE SZ5.D_E_L_E_T_ = ''
        AND SZ5.Z5_DATA <= @data
        AND SZ5.Z5_FILIAL = '01'   -- descomente se quiser fixar filial
    )
    SELECT b.cod, b.preco
    FROM base b
    JOIN cods c ON c.cod = b.cod
    WHERE b.rn = 1
  `;

  const { recordset } = await request.query(query);

  const map = new Map();
  for (const r of recordset) {
    map.set(String(r.cod), Number(r.preco));
  }

  // (Opcional) log de diagnóstico – quantos preços achamos
  console.log(
    `[SZ5140] preços obtidos: ${map.size}/${codsSan.length} (data<=${yyyymmdd})`
  );

  return map;
}

app.post("/estoque/faltas-fechamento", async (req, res) => {
  const { data, local, usuario, itens } = req.body;
  if (!data || !local || !Array.isArray(itens)) {
    return res.status(400).json({ erro: "Parâmetros obrigatórios ausentes." });
  }

  try {
    const conn = await dbOcorrencias.promise();

    // 1) Filtra itens com falta > 0 e coleta códigos p/ buscar preço
    const itensComFalta = itens.filter((i) => Number(i?.falta) > 0);
    const codigos = itensComFalta.map((i) => String(i.cod_produto));

    // 2) Lê pool MSSQL a partir do app.locals (configure no server.js)
    //    Se não existir, segue sem preço (gravará NULL)
    const poolMSSQL = req.app?.locals?.mssqlPool || null;

    // 3) Busca preços na SZ5140 (data do pré-fechamento)
    let mapaPrecos = new Map();
    if (poolMSSQL && codigos.length > 0) {
      try {
        mapaPrecos = await buscarPrecosCompraPorCod(data, codigos, poolMSSQL);
      } catch (e) {
        console.error("❌ Erro ao buscar preços na SZ5140:", e.message);
        // Continua sem preços, mas registra o erro
        mapaPrecos = new Map();
      }
    }

    // cache simples pra não consultar a mesma unidade várias vezes
    const unidadeCache = new Map();

    let saved = 0;
    for (const it of itens) {
      const cod = it.cod_produto;
      const codNorm = String(cod).replace(/\D/g, "");

      let unidade = unidadeCache.get(cod);
      if (unidade === undefined) {
        unidade = await getUnidadePrincipal(conn, cod); // 👈 só a 1ª unidade do produto
        unidadeCache.set(cod, unidade);
      }

      // Preço de compra do dia (ou NULL se não achou)
      const precoCompra = mapaPrecos.has(codNorm)
        ? mapaPrecos.get(codNorm)
        : null;

      await conn.query(
        `INSERT INTO faltas_fechamento
           (data, local, cod_produto, produto, saldo_calc, fisico, falta, observacao, unidade, usuario, preco_compra)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           produto       = VALUES(produto),
           saldo_calc    = VALUES(saldo_calc),
           fisico        = VALUES(fisico),
           falta         = VALUES(falta),
           observacao    = VALUES(observacao),
           unidade       = VALUES(unidade),
           usuario       = VALUES(usuario),
           preco_compra  = VALUES(preco_compra)`,
        [
          data,
          local,
          codNorm, // grava normalizado (sem pontos) p/ bater com SZ5140
          it.produto || null,
          Number(it.saldo_calc || 0),
          Number(it.fisico || 0),
          Number(it.falta || 0),
          (it.observacao || "").trim() || null,
          unidade, // 👈 grava só a 1ª unidade
          usuario || "sistema",
          precoCompra, // 👈 NOVO: preço do dia (ou NULL)
        ]
      );
      saved++;
    }

    res.json({ ok: true, saved });
  } catch (e) {
    console.error("❌ faltas-fechamento", e);
    res.status(500).json({ erro: "Falha ao salvar faltas." });
  }
});

// GET /estoque/saldo-fisico?data=YYYY-MM-DD
// GET /estoque/saldo-fisico?data=YYYY-MM-DD
app.get("/estoque/saldo-fisico", async (req, res) => {
  const { data } = req.query;
  if (!data) {
    return res.status(400).json({ error: "Data é obrigatória (YYYY-MM-DD)." });
  }

  try {
    // Se cada linha de contagem é o valor final do dia, use MAX(qtd).
    // Se você registra contagens parciais ao longo do dia, mas quer o total, use SUM(qtd).
    const usaValorFinalDoDia = true;

    const sql = usaValorFinalDoDia
      ? `
        SELECT
          REPLACE(cod, '.', '') AS cod_produto,
          local,
          MAX(qtd) AS saldo_fisico
        FROM estoque_contagem
        WHERE DATE(atualizado_em) = ?
        GROUP BY cod_produto, local
      `
      : `
        SELECT
          REPLACE(cod, '.', '') AS cod_produto,
          local,
          SUM(qtd) AS saldo_fisico
        FROM estoque_contagem
        WHERE DATE(atualizado_em) = ?
        GROUP BY cod_produto, local
      `;

    const [rows] = await dbOcorrencias.promise().query(sql, [data]);

    res.json(rows);
  } catch (err) {
    console.error("❌ Erro ao buscar saldo físico:", err);
    res.status(500).json({ error: "Erro ao buscar saldo físico." });
  }
});

app.post("/pre-fechamento", async (req, res) => {
  const { data, usuario, local, itens } = req.body;

  if (!data || !usuario || !local || !Array.isArray(itens)) {
    return res.status(400).json({
      error: "Data, usuário, local e itens são obrigatórios.",
      message: "Data, usuário, local e itens são obrigatórios.",
    });
  }

  try {
    const conn = await dbOcorrencias.promise();
    let salvos = 0;

    for (const item of itens) {
      const { cod_produto, saldo_final } = item;

      if (!cod_produto) {
        console.warn("⚠️ Item sem cod_produto ignorado:", item);
        continue;
      }

      const [result] = await conn.query(
        `INSERT INTO saldos_fechamento (data, cod_produto, local, saldo_final)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE saldo_final = VALUES(saldo_final)`,
        [data, cod_produto, local, saldo_final]
      );

      salvos++;
    }

    console.log(
      `✅ Pré-fechamento salvo: ${salvos} itens para local ${local} na data ${data}`
    );

    res.json({
      success: true,
      message: "Pré-fechamento (saldos) salvo com sucesso!",
      salvos: salvos,
      total: itens.length,
    });
  } catch (err) {
    console.error("❌ Erro ao salvar pré-fechamento (saldos):", err);
    res.status(500).json({
      error: "Erro ao salvar pré-fechamento.",
      message: err.message || "Erro ao salvar pré-fechamento.",
      details: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});

app.get("/pre-fechamento", async (req, res) => {
  const { data, local } = req.query;

  if (!data || !local) {
    return res.status(400).send("Data e local são obrigatórios.");
  }

  try {
    const [rows] = await dbOcorrencias
      .promise()
      .query(
        `SELECT 1 FROM saldos_fechamento WHERE data = ? AND local = ? LIMIT 1`,
        [data, local]
      );

    res.json({ existe: rows.length > 0 });
  } catch (err) {
    console.error("Erro ao verificar pré-fechamento:", err);
    res.status(500).send("Erro ao verificar.");
  }
});

// 🟣 Abrir Fechamento (reabrir dia/local)
app.post("/saldos/abrir-fechamento", async (req, res) => {
  const { data, local, usuario = "sistema" } = req.body || {};
  if (!data || !local) {
    return res.status(400).json({ error: "Informe data e local." });
  }

  const conn = await dbOcorrencias.promise().getConnection();
  try {
    await conn.beginTransaction();

    // 1) Apaga fechamentos do dia/local
    const [delFech] = await conn.query(
      "DELETE FROM saldos_fechamento WHERE data = ? AND `local` = ?",
      [data, local]
    );

    // 2) Apaga faltas do mesmo dia/local
    const [delFalt] = await conn.query(
      "DELETE FROM faltas_fechamento WHERE `data` = ? AND `local` = ?",
      [data, local]
    );

    // 3) Log “operacional” (tabela simples que você já tinha)
    await conn.query(
      `INSERT INTO saldos_logs (acao, data, local, usuario, criado_em)
       VALUES (?, ?, ?, ?, NOW())`,
      ["ABRIR_FECHAMENTO", data, local, usuario]
    );

    await conn.commit();

    // ✅ 4) Log “auditoria” rico (fechamento_logs)
    const payload = {
      removidos: {
        saldos_fechamento: delFech.affectedRows || 0,
        faltas_fechamento: delFalt.affectedRows || 0,
      },
      by: usuario,
    };

    // use o wrapper promise para await:
    await dbOcorrencias.promise().query(
      `INSERT INTO fechamento_logs
           (data_ref, \`local\`, usuario, tipo, status, mensagem, qtd_itens, is_fechamento, payload_json, criado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        data, // data_ref
        String(local), // local
        String(usuario), // usuario que reabriu
        "reabertura_fech", // tipo
        "success", // status
        "Fechamento reaberto e dados removidos.", // mensagem
        (delFech.affectedRows || 0) + (delFalt.affectedRows || 0), // qtd_itens
        0, // is_fechamento (false)
        JSON.stringify(payload), // payload_json
      ]
    );

    return res.json({
      ok: true,
      mensagem: "Fechamento reaberto; saldos e faltas do dia/local removidos.",
      removidos: payload.removidos,
    });
  } catch (err) {
    await conn.rollback();

    // log de erro também entra em fechamento_logs
    try {
      await dbOcorrencias.promise().query(
        `INSERT INTO fechamento_logs
             (data_ref, \`local\`, usuario, tipo, status, mensagem, qtd_itens, is_fechamento, payload_json, criado_em)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          data || null,
          String(local || ""),
          String(usuario || "sistema"),
          "reabertura_fech",
          "error",
          err?.message || "Falha ao abrir fechamento.",
          0,
          0,
          JSON.stringify({ error: String(err) }),
        ]
      );
    } catch (_) { }

    console.error("❌ Erro ao abrir fechamento:", err);
    return res.status(500).json({ error: "Falha ao abrir fechamento." });
  } finally {
    conn.release();
  }
});

// Lista os logs do dia/local
app.get("/fechamento/logs", async (req, res) => {
  const { data_ref, local } = req.query;
  if (!data_ref || !local) {
    return res
      .status(400)
      .json({ error: "Parâmetros obrigatórios: data_ref, local." });
  }
  try {
    const [rows] = await dbOcorrencias.promise().query(
      `SELECT id, data_ref, \`local\`, usuario, tipo, status, mensagem, qtd_itens, is_fechamento, payload_json, criado_em
           FROM fechamento_logs
          WHERE data_ref = ? AND \`local\` = ?
          ORDER BY criado_em DESC, id DESC`,
      [data_ref, String(local)]
    );
    res.json(rows);
  } catch (e) {
    console.error("❌ /fechamento/logs", e);
    res.status(500).json({ error: "Falha ao listar logs." });
  }
});

const moment = require("moment"); // se ainda não estiver usando, instale com npm install moment

app.post("/saldos/manual", (req, res) => {
  const { data, cod_produto, nome_produto = "", local, saldo_final } = req.body;

  const queryCheck = `
    SELECT * FROM saldo_produtos 
    WHERE cod_produto = ? AND local = ? AND data_alteracao = ?
  `;

  dbOcorrencias.query(
    queryCheck,
    [cod_produto, local, data],
    (err, results) => {
      if (err) {
        console.error("Erro ao verificar duplicação:", err);
        return res.status(500).json({ erro: "Erro ao verificar duplicação." });
      }

      if (results.length > 0) {
        return res
          .status(400)
          .json({ erro: "Produto já existe com essa data e local." });
      }

      const insertQuery = `
        INSERT INTO saldo_produtos 
        (cod_produto, nome_produto, local, saldo_total, data_alteracao)
        VALUES (?, ?, ?, ?, ?)
      `;

      dbOcorrencias.query(
        insertQuery,
        [cod_produto, nome_produto, local, saldo_final, data],
        (err) => {
          if (err) {
            console.error("Erro ao inserir saldo manual:", err);
            return res
              .status(500)
              .json({ erro: "Erro ao inserir saldo_produtos." });
          }

          // Data anterior
          const dataAnterior = moment(data)
            .subtract(1, "days")
            .format("YYYY-MM-DD");

          const insertFechamentoQuery = `
            INSERT INTO saldos_fechamento (data, cod_produto, local, saldo_final)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE saldo_final = VALUES(saldo_final)
          `;

          dbOcorrencias.query(
            insertFechamentoQuery,
            [dataAnterior, cod_produto, local, saldo_final],
            (err) => {
              if (err) {
                console.error(
                  "Erro ao inserir/atualizar saldos_fechamento:",
                  err
                );
                return res
                  .status(500)
                  .json({ erro: "Erro ao atualizar saldo inicial." });
              }

              res.json({
                mensagem:
                  "Produto adicionado com sucesso, incluindo saldo inicial!",
              });
            }
          );
        }
      );
    }
  );
});

app.get("/saldos/fechamento", (req, res) => {
  const { data, local } = req.query;

  if (!data || !local) {
    return res.status(400).json({ erro: "Data e local são obrigatórios." });
  }

  const query = `
    SELECT data, cod_produto, local, saldo_final
    FROM saldos_fechamento
    WHERE data = ? AND local = ?
    ORDER BY cod_produto
  `;

  dbOcorrencias.query(query, [data, local], (err, results) => {
    if (err) {
      console.error("Erro ao buscar saldos de fechamento:", err);
      return res.status(500).json({ erro: "Erro ao buscar dados." });
    }

    res.json(results);
  });
});

app.post("/fechamento/logs", async (req, res) => {
  try {
    const {
      data_ref,
      local,
      usuario,
      tipo,
      status,
      mensagem,
      qtd_itens,
      payload_json,
    } = req.body;

    const is_fechamento = tipo === "fechamento";

    const sqlInsert = `
      INSERT INTO fechamento_logs
        (data_ref, \`local\`, usuario, tipo, status, mensagem, qtd_itens, is_fechamento, payload_json)
      VALUES (?,?,?,?,?,?,?,?,?)
    `;
    const params = [
      data_ref,
      String(local),
      String(usuario),
      String(tipo),
      String(status),
      mensagem || null,
      Number(qtd_itens) || 0,
      is_fechamento ? 1 : 0,
      payload_json ? JSON.stringify(payload_json) : null,
    ];

    // 1) INSERT
    const [ok] = await dbOcorrencias.promise().query(sqlInsert, params); // OkPacket -> ok.insertId

    // 2) Busca o registro inserido (opcional, mas útil p/ retornar ao front)
    const [rows] = await dbOcorrencias
      .promise()
      .query("SELECT * FROM fechamento_logs WHERE id = ?", [ok.insertId]);

    return res.json({ ok: true, log: rows[0] || null });
  } catch (e) {
    console.error("Erro ao salvar log de fechamento:", e);
    return res.status(500).json({ ok: false, error: "Erro ao salvar log." });
  }
});

app.put("/saldos/fechamento/lote", async (req, res) => {
  const { dados } = req.body;

  if (!Array.isArray(dados) || dados.length === 0) {
    return res
      .status(400)
      .json({ erro: "Nenhum dado enviado para atualização." });
  }

  const conn = dbOcorrencias;

  const updateQuery = `
    UPDATE saldos_fechamento
    SET saldo_final = ?
    WHERE data = ? AND cod_produto = ? AND local = ?
  `;

  const promises = dados.map((item) => {
    const { data, cod_produto, local, saldo_final } = item;

    // ⚠️ Corrige a data para o formato 'YYYY-MM-DD'
    const dataFormatada = new Date(data).toISOString().slice(0, 10);

    return new Promise((resolve, reject) => {
      conn.query(
        updateQuery,
        [Number(saldo_final || 0), dataFormatada, cod_produto, local],
        (err, result) => {
          if (err) {
            console.error("Erro ao executar query:", err);
            return reject(err);
          }
          resolve(result);
        }
      );
    });
  });

  try {
    await Promise.all(promises);
    res.json({ sucesso: true, mensagem: "Saldos atualizados com sucesso." });
  } catch (err) {
    console.error("❌ Erro ao atualizar saldos em lote:", err.message);
    res.status(500).json({ erro: "Erro ao atualizar os saldos." });
  }
});

app.post("/produtos/manual", (req, res) => {
  const { data, cod_produto, nome_produto, local, saldo } = req.body;
  console.log("🔍 Buscando manual com:", data, local);

  const query = `
    INSERT INTO produtos_manualmente_adicionados (data, cod_produto, nome_produto, local, saldo)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      nome_produto = VALUES(nome_produto),
      saldo = VALUES(saldo)
  `;

  dbOcorrencias.query(
    query,
    [data, cod_produto, nome_produto, local, saldo],
    (err, result) => {
      if (err) {
        console.error("Erro ao inserir/atualizar produto manual:", err);
        return res.status(500).json({ erro: "Erro ao salvar produto manual." });
      }
      res.json({ sucesso: true });
    }
  );
});

app.get("/produtos/manual", (req, res) => {
  const { data, local } = req.query;

  if (!data || !local) {
    return res.status(400).json({ erro: "Informe a data e o local." });
  }

  const query = `
  SELECT 
    cod_produto,
    nome_produto,
    local,
    saldo AS saldo_manual
  FROM produtos_manualmente_adicionados
  WHERE DATE(data) = ? AND local = ?
`;

  dbOcorrencias.query(query, [data, local], (err, results) => {
    if (err) {
      console.error("Erro ao buscar saldo manual:", err);
      return res.status(500).json({ erro: "Erro ao buscar saldo manual." });
    }

    res.json(results);
  });
});

// ---------------------------------------------------------------------------------

// ------------------------------IMPORTAR DADOS-------------------------------------
app.post("/sincronizar/compras", async (req, res) => {
  try {
    console.log("🔁 Sincronização iniciada via botão");
    await syncComprasMercadoria(req, res);
    // não precisa fazer mais nada aqui
  } catch (err) {
    console.error("❌ Erro geral na rota /sincronizar/compras:", err.message);
    if (!res.headersSent) {
      res.status(500).send("Erro ao sincronizar compras.");
    }
  }
});

// -------------------------------------------------------------------------------
// ROTA PARA ADICIONAR COLUNA EFETIVADA (EXECUTAR UMA VEZ)
app.post("/migration/add-efetivada", async (req, res) => {
  try {
    const conn = await dbOcorrencias.promise().getConnection();

    await conn.query(`
      ALTER TABLE compras_mercadoria 
      ADD COLUMN IF NOT EXISTS efetivada TINYINT(1) DEFAULT 0
    `);

    await conn.query(`
      ALTER TABLE compras_mercadoria_itens 
      ADD COLUMN IF NOT EXISTS efetivada TINYINT(1) DEFAULT 0
    `);

    conn.release();
    res.json({ success: true, message: "Colunas adicionadas com sucesso!" });
  } catch (err) {
    console.error("Erro na migration:", err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------------------------

app.post("/atualizar-compras", async (req, res) => {
  const sql = require("mssql");
  const mysqlConn = await dbOcorrencias.promise().getConnection();
  const local = req.headers["x-local"]; // ou como estiver sendo enviado

  try {
    const request = new sql.Request(await getMSSQLPool());

    const { data } = req.body || {};
    let dataCorteStr;

    if (data) {
      // Se veio data (YYYY-MM-DD), usamos ela exata (convertendo para YYYYMMDD)
      const d = String(data).replace(/-/g, "");
      dataCorteStr = d;
    } else {
      // Fallback: últimos 120 dias se não veio data
      const dataCorte = new Date();
      dataCorte.setDate(dataCorte.getDate() - 120);
      dataCorteStr = dataCorte.toISOString().slice(0, 10).replace(/-/g, "");
    }

    // Busca compras do local do usuário (em aberto E efetivadas)
    // Se veio data específica, buscamos EXATAMENTE aquela data (chegada = data)
    // Se não, mantemos a lógica de corte (chegada >= dataCorte)
    const condicaoChegada = data
      ? `AND Z2_CHEGADA = '${dataCorteStr}'`
      : `AND Z2_CHEGADA >= '${dataCorteStr}'`;

    const resultHeader = await request.query(`
      SELECT Z2_CODCAR, Z2_CHEGADA, Z2_DESCRI, Z2_MOTORIS, Z2_OBSCAPA, Z2_LOCAL, Z2_TM
      FROM SZ2140 WITH (NOLOCK)
      WHERE Z2_FILIAL = '01' 
        AND D_E_L_E_T_ = ''
        ${condicaoChegada}
        ${local ? `AND Z2_LOCAL = '${local}'` : ""}
    `);

    const headers = resultHeader.recordset;

    // Coletar todos os códigos de carregamento para buscar itens em lote
    const codigosCarregamento = headers.map(h => `'${h.Z2_CODCAR}'`).join(",");

    // Buscar itens em lote se houver headers
    let itensMap = {};
    if (codigosCarregamento.length > 0) {
      try {
        const itensResult = await request.query(`
                SELECT 
                  Z1_CODCAR, 
                  MAX(Z1_DATCAR) AS Z1_DATCAR, 
                  Z1_CODPRO, 
                  MAX(Z1_DESCPRO) AS Z1_DESCPRO, 
                  MAX(Z1_CODFOR) AS Z1_CODFOR, 
                  MAX(Z1_FORNEC) AS Z1_FORNEC, 
                  SUM(Z1_QTDE) AS Z1_QTDE, 
                  MIN(Z1_PRECO) AS Z1_PRECO, 
                  SUM(Z1_TOTAL) AS Z1_TOTAL,
                  MAX(Z1_PROC) AS Z1_PROC
                FROM SZ1140 WITH (NOLOCK)
                WHERE 
                  Z1_FILIAL = '01' 
                  AND D_E_L_E_T_ = ''
                  AND Z1_CODCAR IN (${codigosCarregamento})
                GROUP BY Z1_CODCAR, Z1_CODPRO
            `);

        // Agrupar itens por Z1_CODCAR para acesso rápido
        itensResult.recordset.forEach(item => {
          if (!itensMap[item.Z1_CODCAR]) itensMap[item.Z1_CODCAR] = [];
          itensMap[item.Z1_CODCAR].push(item);
        });
      } catch (errItens) {
        console.error("Erro ao buscar itens rm lote, continuando sem itens:", errItens);
      }
    }

    for (const head of headers) {
      const [exist] = await mysqlConn.query(
        "SELECT chegada FROM compras_mercadoria WHERE codigo = ?",
        [head.Z2_CODCAR]
      );

      const novaChegada = formatData(head.Z2_CHEGADA);
      const efetivada = head.Z2_TM === "S" ? 1 : 0;

      const localNormalizado = String(head.Z2_LOCAL || local)
        .trim()
        .padStart(2, "0");

      if (exist.length === 0) {
        await mysqlConn.query(
          `INSERT INTO compras_mercadoria 
   (codigo, chegada, descricao, motorista, observacao, local, efetivada)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            head.Z2_CODCAR,
            novaChegada,
            head.Z2_DESCRI,
            head.Z2_MOTORIS,
            head.Z2_OBSCAPA,
            localNormalizado,
            efetivada
          ]
        );
      } else {
        // Atualiza TODOS os campos para refletir mudanças no Protheus
        // (local, descrição, motorista, observação, data de chegada)
        await mysqlConn.query(
          `UPDATE compras_mercadoria 
       SET chegada = ?, descricao = ?, motorista = ?, observacao = ?, local = ?, efetivada = ?
       WHERE codigo = ?`,
          [
            novaChegada,
            head.Z2_DESCRI,
            head.Z2_MOTORIS,
            head.Z2_OBSCAPA,
            localNormalizado,
            efetivada,
            head.Z2_CODCAR,
          ]
        );
      }

      // Busca itens do map já carregado
      const itens = itensMap[head.Z2_CODCAR] || [];
      const novosItens = [];

      for (const item of itens) {
        const dataFormatada = formatData(item.Z1_DATCAR);
        const efetivadaItem = item.Z1_PROC === "1" ? 1 : 0;

        const [existsItem] = await mysqlConn.query(
          "SELECT * FROM compras_mercadoria_itens WHERE codcar = ? AND codpro = ?",
          [item.Z1_CODCAR, item.Z1_CODPRO]
        );

        const existenteMesmaData = existsItem.find((i) => {
          const dataExistente = new Date(i.datcar).toISOString().split("T")[0];
          return dataExistente === dataFormatada;
        });

        if (existenteMesmaData) {
          await mysqlConn.query(
            `UPDATE compras_mercadoria_itens 
             SET descpro = ?, codfor = ?, fornec = ?, qtde = ?, preco = ?, total = ?
             WHERE codcar = ? AND codpro = ? AND datcar = ?`,
            [
              item.Z1_DESCPRO,
              item.Z1_CODFOR,
              item.Z1_FORNEC,
              item.Z1_QTDE,
              item.Z1_PRECO,
              item.Z1_TOTAL,
              item.Z1_CODCAR,
              item.Z1_CODPRO,
              dataFormatada,
            ]
          );
        } else {
          novosItens.push([
            item.Z1_CODCAR,
            dataFormatada,
            item.Z1_CODPRO,
            item.Z1_DESCPRO,
            item.Z1_CODFOR,
            item.Z1_FORNEC,
            item.Z1_QTDE,
            item.Z1_PRECO,
            item.Z1_TOTAL,
          ]);
        }
      }

      if (novosItens.length > 0) {
        await mysqlConn.query(
          `INSERT INTO compras_mercadoria_itens 
            (codcar, datcar, codpro, descpro, codfor, fornec, qtde, preco, total)
           VALUES ?`,
          [novosItens]
        );
      }
    }

    mysqlConn.release();
    res.json({ mensagem: "Compras atualizadas com sucesso." });
  } catch (err) {
    console.error("❌ Erro ao atualizar compras:", err);
    mysqlConn.release();
    res.status(500).json({ erro: "Erro ao atualizar compras." });
  }
});

app.post("/atualizar-fornecedores", async (req, res) => {
  const sql = require("mssql");
  const mysqlConn = await dbOcorrencias.promise().getConnection();

  try {
    const request = new sql.Request(await getMSSQLPool());

    const fornecedoresResult = await request.query(`
      SELECT A2_COD, A2_NREDUZ FROM SA2140
      WHERE A2_FILIAL = '01' AND D_E_L_E_T_ = ''
    `);

    for (const fornecedor of fornecedoresResult.recordset) {
      const { A2_COD, A2_NREDUZ } = fornecedor;

      const [existente] = await mysqlConn.query(
        "SELECT nome FROM fornecedores WHERE codigo = ?",
        [A2_COD]
      );

      if (existente.length === 0) {
        await mysqlConn.query(
          "INSERT INTO fornecedores (codigo, nome) VALUES (?, ?)",
          [A2_COD, A2_NREDUZ]
        );
      } else if (existente[0].nome !== A2_NREDUZ) {
        await mysqlConn.query(
          "UPDATE fornecedores SET nome = ? WHERE codigo = ?",
          [A2_NREDUZ, A2_COD]
        );
      }
    }

    mysqlConn.release();
    res.json({ mensagem: "Fornecedores atualizados com sucesso." });
  } catch (err) {
    console.error("❌ Erro ao atualizar fornecedores:", err);
    mysqlConn.release();
    res.status(500).json({ erro: "Erro ao atualizar fornecedores." });
  }
});

// Função auxiliar para formatar a data
function formatData(data) {
  if (!data) return null;
  const str = String(data);
  if (str.length === 8) {
    return `${str.substring(0, 4)}-${str.substring(4, 6)}-${str.substring(6)}`;
  }
  return str;
}

app.get("/fornecedores", async (req, res) => {
  const { search = "" } = req.query;
  try {
    const conn = await dbOcorrencias.promise().getConnection();
    const [fornecedores] = await conn.query(
      `SELECT codigo, nome FROM fornecedores
       WHERE nome LIKE ? OR codigo LIKE ?
       ORDER BY nome LIMIT 20`,
      [`%${search}%`, `%${search}%`]
    );
    conn.release();
    res.json(fornecedores);
  } catch (err) {
    console.error("Erro ao buscar fornecedores:", err);
    res.status(500).json({ erro: "Erro ao buscar fornecedores" });
  }
});

// ------------------------------CONFERENTE--------------------------------

app.get("/api/relatorios", async (req, res) => {
  const { date, productName, clientName } = req.query;

  if (!date) {
    return res.status(400).json({ error: "Data é necessária para a consulta" });
  }

  try {
    await getMSSQLPool();

    const query = `
      SELECT
          C.ZC_CODPRO,
          MAX(C.ZC_DESPRO) AS ZC_DESPRO,
          SUM(C.ZC_QTDE) AS TOTAL_QTDE,
          SUM(C.ZC_UNSVEN) AS ZC_UNSVEN
      FROM SZC140 AS C
      JOIN SZB140 AS B ON C.ZC_BILHETE = B.ZB_BILHETE
      WHERE C.ZC_FILIAL = '01'
        AND B.ZB_FILIAL = '01'
        AND B.ZB_DTENTRE = @date
        AND C.D_E_L_E_T_ = ''
        AND B.D_E_L_E_T_ = ''
        ${productName ? `AND C.ZC_DESPRO LIKE '%' + @productName + '%'` : ""}
        ${clientName ? `AND B.ZB_NOMCLI LIKE '%' + @clientName + '%'` : ""}
      GROUP BY C.ZC_CODPRO, C.ZC_FILIAL
      ORDER BY ZC_DESPRO ASC;
    `;

    const request = new sql.Request();
    request.input("date", sql.VarChar, date);
    if (productName) {
      request.input("productName", sql.VarChar, productName);
    }
    if (clientName) {
      request.input("clientName", sql.VarChar, clientName);
    }

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error("Erro ao buscar dados:", err);
    res.status(500).send("Erro ao buscar dados");
  }
});

app.post("/api/relatorios/detalhes", async (req, res) => {
  const { codProduto, date } = req.body;

  try {
    await getMSSQLPool();
    const query = `
      SELECT
          C.ZC_BILHETE AS NumeroBilhete,
          B.ZB_NOMCLI AS NomeCliente,
          B.ZB_NOMVEN AS Vendedor,
          C.ZC_OBS, -- <<< CAMPO CORRIGIDO E ADICIONADO
          SUM(C.ZC_QTDE) AS QuantidadeProduto,
          CASE 
            WHEN B.ZB_EMSEPAR = 'S' AND ISNULL(B.ZB_NUMSEQ, '') <> '' THEN 'Faturado'
            WHEN B.ZB_EMSEPAR = 'S' AND ISNULL(B.ZB_NUMSEQ, '') = '' THEN 'Em Separação'
            ELSE 'Pendente'
          END AS Status
      FROM SZB140 AS B
      JOIN SZC140 AS C ON B.ZB_BILHETE = C.ZC_BILHETE
      WHERE C.ZC_CODPRO = @codProduto
        AND B.ZB_DTENTRE = @date
        AND B.ZB_FILIAL = '01'
        AND C.ZC_FILIAL = '01'
        AND B.D_E_L_E_T_ = ''
        AND C.D_E_L_E_T_ = ''
      GROUP BY
          C.ZC_BILHETE,
          B.ZB_NOMCLI,
          B.ZB_NOMVEN,
          B.ZB_EMSEPAR,
          B.ZB_NUMSEQ,
          C.ZC_OBS; -- <<< CAMPO ADICIONADO AO AGRUPAMENTO
    `;

    const request = new sql.Request();
    request.input("codProduto", sql.VarChar, codProduto);
    request.input("date", sql.VarChar, date);

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error("Erro ao buscar detalhes do pedido:", err);
    res.status(500).send("Erro ao buscar detalhes do pedido");
  }
});

app.post("/api/relatorios/cliente-itens", async (req, res) => {
  const { nomeCliente, date } = req.body;

  if (!nomeCliente || !date) {
    return res
      .status(400)
      .json({ error: "Nome do cliente e data são obrigatórios." });
  }

  try {
    await getMSSQLPool();

    const query = `
      SELECT 
        B.ZB_NOMCLI,
        C.ZC_CODPRO,
        MAX(C.ZC_DESPRO) AS ZC_DESPRO,
        SUM(C.ZC_QTDE) AS ZC_QTDE,
        SUM(C.ZC_UNSVEN) AS ZC_UNSVEN
      FROM SZB140 B
      JOIN SZC140 C ON B.ZB_BILHETE = C.ZC_BILHETE
      WHERE
        B.ZB_FILIAL = '01'
        AND C.ZC_FILIAL = '01'
        AND B.ZB_DTENTRE = @date
        AND B.ZB_NOMCLI LIKE '%' + @nomeCliente + '%'
        AND B.D_E_L_E_T_ = ''
        AND C.D_E_L_E_T_ = ''
      GROUP BY B.ZB_NOMCLI, C.ZC_CODPRO
      ORDER BY B.ZB_NOMCLI, ZC_DESPRO
    `;

    const request = new sql.Request();
    request.input("nomeCliente", sql.VarChar, nomeCliente);
    request.input("date", sql.VarChar, date);

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error("Erro ao buscar itens por cliente:", error);
    res.status(500).send("Erro interno no servidor");
  }
});

app.post("/api/relatorios/pedidos-status", async (req, res) => {
  const { date, status } = req.body;

  if (!date) {
    return res.status(400).json({ error: "Data é obrigatória" });
  }

  try {
    await getMSSQLPool();

    let statusCondition = "";
    if (status === "Faturado") {
      statusCondition = "AND ZB_EMSEPAR = 'S' AND ISNULL(ZB_NUMSEQ, '') <> ''";
    } else if (status === "Em Separação") {
      statusCondition = "AND ZB_EMSEPAR = 'S' AND ISNULL(ZB_NUMSEQ, '') = ''";
    } else if (status === "Pendente") {
      statusCondition =
        "AND ISNULL(ZB_EMSEPAR, '') = '' AND ISNULL(ZB_NUMSEQ, '') = ''";
    }

    const query = `
      SELECT 
        ZB_BILHETE AS NumeroBilhete,
        ZB_NOMCLI AS NomeCliente,
        CASE 
          WHEN ZB_EMSEPAR = 'S' AND ISNULL(ZB_NUMSEQ, '') <> '' THEN 'Faturado'
          WHEN ZB_EMSEPAR = 'S' AND ISNULL(ZB_NUMSEQ, '') = '' THEN 'Em Separação'
          ELSE 'Pendente'
        END AS Status
      FROM SZB140
      WHERE 
        ZB_DTENTRE = @date
        AND ZB_FILIAL = '01'
        AND D_E_L_E_T_ = ''
        ${statusCondition}
    `;

    const request = new sql.Request();
    request.input("date", sql.VarChar, date);

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error("Erro ao buscar pedidos por status:", error);
    res.status(500).send("Erro ao buscar pedidos por status");
  }
});

// --- STATUS CHECKS ---
app.get("/db-status", async (req, res) => {
  try {
    // Teste simples SELECT 1
    await dbOcorrencias.promise().query("SELECT 1");
    res.json({ connected: true });
  } catch (err) {
    console.error("Health check db-status failed:", err);
    res.status(500).json({ connected: false, error: err.message });
  }
});

app.get("/check-protheus", async (req, res) => {
  try {
    // Tenta usar o pool global ou o guardado em locals
    const pool = mssqlPool || req.app.locals.mssqlPool;
    if (!pool) {
      throw new Error("Pool MSSQL não inicializado.");
    }
    // Teste simples
    await pool.request().query("SELECT 1");
    res.json({ connected: true });
  } catch (err) {
    console.error("Health check protheus failed:", err);
    res.status(500).json({ connected: false, error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("API online, funcionando!");
});

app.post("/api/validacao-pdf", (req, res) => {
  const { clientes } = req.body;

  if (!clientes || !Array.isArray(clientes)) {
    return res.status(400).send("Lista de clientes inválida.");
  }

  try {
    const pdfDoc = gerarPdfValidacao(clientes);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=validacao-cnpjs.pdf"
    );

    pdfDoc.pipe(res);
    pdfDoc.end();
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    res.status(500).send("Erro ao gerar o PDF");
  }
});

// ---------------------------------------------------------------------------------

// Helpers consistentes com o resto do código:
const normCod = (v) => String(v ?? "").replace(/\./g, "");
const normLocal = (v) =>
  String(v ?? "")
    .trim()
    .padStart(2, "0");
const toIsoDay = (d) => {
  // aceita "YYYY-MM-DD" ou Date/string convertível
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return String(d).slice(0, 10);
  }
};

/**
 * GET /produto/inversoes
 * params: data, local
 * Retorna um mapa { [cod_produto]: net_qty } com o saldo líquido de inversões:
 *   - Positivo: produto correto (recebeu quantidade via inversão)
 *   - Negativo: produto errado (perdeu quantidade via inversão)
 */
app.get("/produto/inversoes", async (req, res) => {
  const { data, local } = req.query;
  if (!data || !local) {
    return res.status(400).json({ error: "Parâmetros obrigatórios: data, local." });
  }

  const normLocal = (l) => String(l || "").padStart(2, "0");
  const toIsoDay = (d) => {
    if (!d) return null;
    const s = String(d);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return new Date(s).toISOString().slice(0, 10);
  };
  const normCodLocal = (c) =>
    String(c ?? "").toUpperCase().replace(/[.\-_/ \t]/g, "").replace(/^0+(?=\d)/, "");

  const dia = toIsoDay(data);
  const loc = normLocal(local);

  let conn = null;
  try {
    conn = await dbOcorrencias.promise().getConnection();

    // Busca todos os registros de inversão do dia/local
    const [rows] = await conn.query(
      `SELECT cod_produto, cod_produto_inversao, qtd_inversao
       FROM produto_observacoes
       WHERE data_ref = ? AND local = ? AND motivo = 'Inversão'
         AND cod_produto_inversao IS NOT NULL
         AND qtd_inversao IS NOT NULL AND qtd_inversao > 0`,
      [dia, loc]
    );

    // Monta mapa líquido: positivo = recebeu, negativo = deu
    const map = {};
    for (const r of rows) {
      const fonte = normCodLocal(r.cod_produto);          // produto errado: perde
      const destino = normCodLocal(r.cod_produto_inversao); // produto certo: ganha
      const qty = Number(r.qtd_inversao) || 0;

      map[fonte] = (map[fonte] || 0) - qty; // tira do errado
      map[destino] = (map[destino] || 0) + qty; // añade ao certo
    }

    return res.json(map);
  } catch (err) {
    console.error("❌ Erro em GET /produto/inversoes:", err);
    return res.status(500).json({ error: "Erro ao buscar inversões." });
  } finally {
    if (conn) conn.release();
  }
});

/**
 * GET /produto/observacao
 * params: cod, data
 * headers: x-local
 * retorna 200 {texto, atualizado_em, usuario} ou 200 {}
 */
// app.get("/produto/observacao", ...

app.get("/produto/observacao", async (req, res) => {
  const { cod, data } = req.query;
  const localHeader = req.headers["x-local"];

  if (!cod || !data) {
    return res
      .status(400)
      .json({ error: "Parâmetros obrigatórios: cod, data." });
  }
  if (!localHeader) {
    return res.status(400).json({ error: "Header x-local é obrigatório." });
  }

  const codNoDot = normCod(cod);
  const local = normLocal(localHeader);
  const dia = toIsoDay(data);

  let connMy = null;
  try {
    connMy = await dbOcorrencias.promise().getConnection();

    const querySql = `
      SELECT 
        t1.texto, 
        t1.usuario, 
        t1.atualizado_em,
        t1.cod_produto_inversao, 
        t1.qtd_inversao,
        t1.motivo,
        t2.descricao AS produto_inversao_nome
      FROM produto_observacoes t1
      LEFT JOIN produto t2 ON t2.codigo_produto = t1.cod_produto_inversao
      WHERE t1.data_ref = ? AND t1.local = ? AND t1.cod_produto = ?
    `.trim();

    const [rows] = await connMy.query(querySql, [dia, local, codNoDot]);

    if (!rows || rows.length === 0) {
      return res.status(200).json({});
    }

    // Se houver múltiplas linhas (ex: múltiplas inversões), agrupamos
    const first = rows[0];
    const item = {
      texto: first.texto,
      usuario: first.usuario,
      atualizado_em: first.atualizado_em,
      motivo: first.motivo,
      inversoes: []
    };

    rows.forEach(r => {
      if (r.cod_produto_inversao) {
        item.inversoes.push({
          cod_produto_inversao: r.cod_produto_inversao,
          qtd_inversao: r.qtd_inversao != null ? Number(r.qtd_inversao) : null,
          produto_inversao_nome: r.produto_inversao_nome || null
        });
      }
    });

    // Mantém compatibilidade com o front antigo que espera campos únicos
    item.cod_produto_inversao = first.cod_produto_inversao || null;
    item.qtd_inversao = first.qtd_inversao != null ? Number(first.qtd_inversao) : null;
    item.produto_inversao_nome = first.produto_inversao_nome || null;

    return res.json(item);
  } catch (err) {
    console.error("❌ Erro em GET /produto/observacao:", err);
    return res.status(500).json({ error: "Erro ao buscar observação." });
  } finally {
    if (connMy) connMy.release();
  }
});

/**
 * POST /produto/observacao
 * body:  { cod, data, texto, motivo, inversoes: [...] }
 * headers: x-local, x-user
 */
app.post("/produto/observacao", async (req, res) => {
  const { cod, data, texto, motivo, inversoes } = req.body || {};
  const localHeader = req.headers["x-local"];
  const userHeader = req.headers["x-user"] || "sistema";

  if (!cod || !data || !motivo) {
    return res
      .status(400)
      .json({ error: "Campos obrigatórios: cod, data, e motivo." });
  }
  if (!localHeader) {
    return res.status(400).json({ error: "Header x-local é obrigatório." });
  }

  const codNoDot = normCod(cod);
  const local = normLocal(localHeader);
  const dia = toIsoDay(data);
  const textoTrim = (texto ?? "").trim();
  const motivoVal = motivo;

  let connMy = null;
  try {
    connMy = await dbOcorrencias.promise().getConnection();
    await connMy.beginTransaction();

    // 1. Sempre remove as observações anteriores desse produto/dia/local
    // para garantir que a atualização seja limpa (suporta múltiplas linhas)
    await connMy.query(
      `DELETE FROM produto_observacoes WHERE data_ref = ? AND local = ? AND cod_produto = ?`,
      [dia, local, codNoDot]
    );

    // Se o motivo for vazio, já removemos acima, então retornamos
    if (motivoVal === "") {
      await connMy.commit();
      return res.json({ ok: true });
    }

    // 2. Insere a(s) nova(s) linha(s)
    if (motivoVal === "Inversão" && Array.isArray(inversoes) && inversoes.length > 0) {
      // Múltiplas inversões
      for (const inv of inversoes) {
        if (!inv.cod_produto_inversao) continue;
        const codInv = normCod(inv.cod_produto_inversao);
        const qtdInv = Number(inv.qtd_inversao) || 0;
        
        await connMy.query(
          `INSERT INTO produto_observacoes
            (data_ref, local, cod_produto, texto, usuario, cod_produto_inversao, qtd_inversao, motivo)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [dia, local, codNoDot, textoTrim, userHeader, codInv, qtdInv, motivoVal]
        );
      }
    } else {
      // Caso normal ou inversão única (legado)
      const codInversao = req.body.cod_produto_inversao ? normCod(req.body.cod_produto_inversao) : null;
      const qtdInversao = (motivoVal === "Inversão" && req.body.qtd_inversao != null)
        ? Number(req.body.qtd_inversao) || null
        : null;

      await connMy.query(
        `INSERT INTO produto_observacoes
          (data_ref, local, cod_produto, texto, usuario, cod_produto_inversao, qtd_inversao, motivo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [dia, local, codNoDot, textoTrim, userHeader, codInversao, qtdInversao, motivoVal]
      );
    }

    await connMy.commit();
    return res.json({ ok: true });
  } catch (err) {
    if (connMy) await connMy.rollback();
    console.error("❌ Erro em POST /produto/observacao:", err);
    return res.status(500).json({ error: "Erro ao salvar observação." });
  } finally {
    if (connMy) connMy.release();
  }
});


// helper para buscar o local/origem do usuário
async function getLocalDoUsuario(db, username) {
  const [rows] = await db
    .promise()
    .query("SELECT origem FROM users WHERE username = ? LIMIT 1", [username]);
  // garante string com 2 dígitos (ex: "01")
  const origem =
    rows?.[0]?.origem != null ? String(rows[0].origem).padStart(2, "0") : null;
  return origem;
}

// body: { usuario, items: [{ cod_produto, camera1, turno, prevTurno }] }
app.post("/produtos-cameras/bulk-upsert", async (req, res) => {
  const conn = await dbOcorrencias.promise().getConnection();
  try {
    const { usuario = "sistema", items = [] } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Lista de itens vazia" });
    }

    const localDoUsuario = await getLocalDoUsuario(dbOcorrencias, usuario);
    if (!localDoUsuario) {
      return res
        .status(403)
        .json({ error: "Não foi possível determinar o local do usuário" });
    }

    await conn.beginTransaction();

    const upsertSQL = `
      INSERT INTO produtos_cameras
        (local, cod_produto, turno, camera1, atualizado_por, atualizado_em)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        camera1        = VALUES(camera1),
        atualizado_por = VALUES(atualizado_por),
        atualizado_em  = CURRENT_TIMESTAMP
    `;

    for (const it of items) {
      const cod = it.cod_produto;
      if (!cod) continue;

      const turnoNew = Number(it.turno) === 2 ? 2 : 1;
      const turnoOld =
        it.prevTurno != null ? (Number(it.prevTurno) === 2 ? 2 : 1) : turnoNew;
      const cam1 =
        it.camera1 === "" || it.camera1 == null ? null : String(it.camera1);

      await conn.query(upsertSQL, [
        localDoUsuario,
        cod,
        turnoNew,
        cam1,
        usuario,
      ]);

      if (turnoOld !== turnoNew) {
        await conn.query(
          `DELETE FROM produtos_cameras WHERE local = ? AND cod_produto = ? AND turno = ?`,
          [localDoUsuario, cod, turnoOld]
        );
      }
    }

    await conn.commit();
    res.json({ ok: true, count: items.length });
  } catch (err) {
    await conn.rollback();
    console.error("❌ /produtos-cameras/bulk-upsert:", err);
    res.status(500).send("Erro ao salvar em lote");
  } finally {
    conn.release();
  }
});

// GET /produtos-cameras/list
// query: { search, page, pageSize, turno, user }
app.get("/produtos-cameras/list", async (req, res) => {
  try {
    const {
      search = "",
      page = 1,
      pageSize = 100,
      turno, // opcional: "1" | "2"
      user: usuario = "sistema",
    } = req.query;

    const localDoUsuario = await getLocalDoUsuario(dbOcorrencias, usuario);
    if (!localDoUsuario) {
      return res
        .status(403)
        .json({ error: "Não foi possível determinar o local do usuário" });
    }

    const p = Math.max(1, Number(page));
    const ps = Math.min(500, Math.max(1, Number(pageSize)));
    const off = (p - 1) * ps;

    const params = [];
    let whereBusca = "";
    if (search) {
      // ajuste os nomes de colunas conforme sua tabela 'produto'
      whereBusca = "AND (p.codigo_produto LIKE ? OR p.descricao LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    // Se turno foi informado, filtra; se não, faz join nas duas possibilidades e prefere 1
    let selectCamTurno, joinClause, joinParams;

    if (turno === "1" || turno === "2" || turno === 1 || turno === 2) {
      const turnoFiltro = Number(turno) === 2 ? 2 : 1;
      selectCamTurno = `
        pc.camera1,
        pc.turno
      `;
      joinClause = `
        LEFT JOIN produtos_cameras pc
          ON pc.local = ?
         AND pc.cod_produto = p.codigo_produto
         AND pc.turno = ?
      `;
      joinParams = [localDoUsuario, turnoFiltro];
    } else {
      // preferir turno 1; se não houver, usar turno 2
      selectCamTurno = `
        COALESCE(pc1.camera1, pc2.camera1) AS camera1,
        CASE
          WHEN pc1.camera1 IS NOT NULL THEN 1
          WHEN pc2.camera1 IS NOT NULL THEN 2
          ELSE NULL
        END AS turno
      `;
      joinClause = `
        LEFT JOIN produtos_cameras pc1
          ON pc1.local = ?
         AND pc1.cod_produto = p.codigo_produto
         AND pc1.turno = 1
        LEFT JOIN produtos_cameras pc2
          ON pc2.local = ?
         AND pc2.cod_produto = p.codigo_produto
         AND pc2.turno = 2
      `;
      joinParams = [localDoUsuario, localDoUsuario];
    }

    const sqlBase = `
      FROM produto p
      ${joinClause}
      WHERE 1=1
        ${whereBusca}
    `;

    // total
    const [rTot] = await dbOcorrencias
      .promise()
      .query(`SELECT COUNT(*) AS total ${sqlBase}`, [...joinParams, ...params]);
    const total = rTot?.[0]?.total || 0;

    // page
    const [rows] = await dbOcorrencias.promise().query(
      `
      SELECT
        p.codigo_produto AS cod_produto,
        p.descricao      AS nome_produto,
        ${selectCamTurno}
      ${sqlBase}
      ORDER BY p.codigo_produto
      LIMIT ?, ?
      `,
      [...joinParams, ...params, off, ps]
    );

    res.json({ data: rows, total });
  } catch (err) {
    console.error("❌ /produtos-cameras/list:", err);
    res.status(500).send("Erro ao listar produtos/câmeras");
  }
});

// GET /protheus/bilhete  — original router sem tratativas de "-/F" extras
app.get("/protheus/bilhete", async (req, res) => {
  try {
    await getMSSQLPool();

    let { bilhete, data, filial = "01", empresa = "140" } = req.query;
    if (!bilhete) return res.status(400).json({ error: "bilhete is required" });

    if (!/^\d{3}$/.test(empresa)) empresa = "140";

    const tableSZ4 = `SZ4${empresa}`;
    const tableSZ5 = `SZ5${empresa}`;
    const tableSZH = `SZH${empresa}`;
    const tableSB1 = `SB1${empresa}`;
    const tableSZB = `SZB${empresa}`;

    const rawTerms = String(bilhete).split(/[\s,;]+/);
    const terms = rawTerms.map((t) => t.trim()).filter((t) => t.length > 0);

    if (terms.length === 0) return res.json({ cabecalho: null, itens: [] });

    const results = [];
    const zDate = toProtheusDate(data);

    for (const term of terms) {
      const termPad = term.padStart(9, "0");

      const cabSQL = `
        SELECT TOP 1
          ISNULL(ZB.ZB_NUMSEQ, Z4.Z4_BILHETE) AS Z4_BILHETE,
          ISNULL(ZB.ZB_DATA, Z4.Z4_DATA) AS Z4_DATA, -- Prioridade para a data de inclusão definitiva (ZB_DATA)
          ISNULL(ZB.ZB_CLIENTE, Z4.Z4_CLIENTE) AS Z4_CLIENTE,
          ISNULL(ZB.ZB_NOMCLI, Z4.Z4_NOMCLI) AS Z4_NOMCLI,
          Z4.Z4_COND,
          Z4.Z4_DESCOND,
          ISNULL(ZB.ZB_VEND, Z4.Z4_VEND) AS Z4_VEND,
          Z4.Z4_NOMVEN,
          ISNULL(ZB.ZB_TOTBIL, Z4.Z4_TOTBIL) AS Z4_TOTBIL,
          ISNULL(ZB.ZB_CARGA, Z4.Z4_CARGA) AS Z4_CARGA,
          H.ZH_MOTOR,
          ISNULL(ZB.ZB_NOTA, Z4.Z4_NOTA) AS NOTA_ORIGEM,
          ZB.ZB_BILHETE AS ZB_BILHETE, -- Mantém para busca de itens se necessário
          H.ZH_NOMMOT  AS MOTORISTA,
          H.ZH_CONFERE AS CONFERENTE,
          H.ZH_VEICULO AS PLACA 
        FROM ${tableSZ4} AS Z4
        FULL OUTER JOIN ${tableSZB} AS ZB
          ON ZB.ZB_FILIAL = Z4.Z4_FILIAL
          AND ZB.ZB_NUMSEQ = Z4.Z4_BILHETE
          AND Z4.Z4_BILHETE <> ''
          AND ZB.D_E_L_E_T_ = ''
        LEFT JOIN ${tableSZH} AS H
          ON  H.ZH_FILIAL = ISNULL(ZB.ZB_FILIAL, Z4.Z4_FILIAL)
          AND H.D_E_L_E_T_ = ''
          AND H.ZH_CODIGO = ISNULL(ZB.ZB_CARGA, Z4.Z4_CARGA)
        WHERE (Z4.Z4_FILIAL = @filial OR ZB.ZB_FILIAL = @filial)
          AND (Z4.D_E_L_E_T_ = '' OR ZB.D_E_L_E_T_ = '')
          AND (
            Z4.Z4_BILHETE = @term OR Z4.Z4_NOTA = @term OR Z4.Z4_NOTA = @termPad OR
            ZB.ZB_NUMSEQ = @term OR ZB.ZB_NOTA = @term OR ZB.ZB_NOTA = @termPad OR ZB.ZB_BILHETE = @term
          )
          AND (@data IS NULL OR Z4.Z4_DATA = @data OR ZB.ZB_DATA = @data)
        ORDER BY ISNULL(ZB.ZB_DATA, Z4.Z4_DATA) DESC
      `;

      const reqCab = new sql.Request()
        .input("filial", sql.VarChar, filial)
        .input("term", sql.VarChar, term)
        .input("termPad", sql.VarChar, termPad)
        .input("data", sql.VarChar, zDate);

      const { recordset: rsCab } = await reqCab.query(cabSQL);
      const cab = rsCab?.[0];

      if (cab) {
        const realBilhete = String(cab.Z4_BILHETE || "").trim();
        const realZB = String(cab.ZB_BILHETE || "").trim();
        const realNota = String(cab.NOTA_ORIGEM || cab.Z4_NOTA || "").trim();
        const itensSQL = `
          SELECT
            Z5.Z5_BILHETE, Z5.Z5_CLIENTE, Z5.Z5_DATA, Z5.Z5_CODPRO, Z5.Z5_DESPRO,
            Z5.Z5_QTDE, Z5.Z5_PRECO, Z5.Z5_TOTAL, Z5.Z5_PRECO2, 
            ISNULL(NULLIF(LTRIM(RTRIM(Z5.Z5_UM)), ''), B1.B1_UM) AS Z5_UM, 
            ISNULL(NULLIF(LTRIM(RTRIM(Z5.Z5_SEGUM)), ''), ISNULL(B1.B1_SEGUM, '')) AS Z5_SEGUM
          FROM ${tableSZ5} Z5
          LEFT JOIN ${tableSB1} B1 
            ON B1.B1_COD = Z5.Z5_CODPRO 
            AND B1.D_E_L_E_T_ = ''
          WHERE Z5.Z5_FILIAL = @filial
            AND Z5.D_E_L_E_T_ = ''
            AND Z5.Z5_BILHETE IN (
              @realBilhete,
              @realZB,
              REPLACE(@realBilhete, '-', 'F'),
              REPLACE(@realBilhete, 'F', '-'),
              @realNota,
              @realBilhete + 'A',
              @term,
              @termPad
            )
            AND (@data IS NULL OR Z5.Z5_DATA = @data)
          ORDER BY Z5.Z5_CODPRO
        `;
        const reqItens = new sql.Request()
          .input("filial", sql.VarChar, filial)
          .input("realBilhete", sql.VarChar, realBilhete)
          .input("realZB", sql.VarChar, realZB)
          .input("realNota", sql.VarChar, realNota)
          .input("term", sql.VarChar, term)
          .input("termPad", sql.VarChar, termPad)
          .input("data", sql.VarChar, zDate);

        const { recordset: rsItens } = await reqItens.query(itensSQL);
        results.push({ cabecalho: cab, itens: rsItens || [] });
      }
    }

    if (results.length === 0) return res.json({ cabecalho: null, itens: [] });

    const firstClient = results[0].cabecalho.Z4_CLIENTE;
    const sameClient = results.every(r => r.cabecalho.Z4_CLIENTE === firstClient);
    if (!sameClient) {
      const clientesDiff = results.map(r => `${r.cabecalho.Z4_NOMCLI} (${r.cabecalho.Z4_BILHETE})`).join(", ");
      return res.status(400).json({ error: "CLIENTE_DIVERGENTE", message: `As notas pertences a clientes divergentes: ${clientesDiff}` });
    }

    const mergedCab = { ...results[0].cabecalho };
    let allItens = [];
    const fieldsToCheck = ["Z4_VEND", "Z4_NOMVEN", "Z4_CARGA", "ZH_MOTOR", "MOTORISTA", "CONFERENTE", "PLACA", "NOTA_ORIGEM", "Z4_DATA"];
    const distinctBilhetes = [...new Set(results.map((r) => r.cabecalho.Z4_BILHETE.trim()))];

    results.forEach((r, idx) => {
      allItens = [...allItens, ...r.itens];
      if (idx > 0) {
        fieldsToCheck.forEach(field => {
          if (mergedCab[field] && r.cabecalho[field] !== mergedCab[field]) mergedCab[field] = "";
        });
      }
    });

    mergedCab.Z4_TOTBIL = results.reduce((acc, r) => acc + (Number(r.cabecalho.Z4_TOTBIL) || 0), 0);
    if (results.length > 1) {
      mergedCab.Z4_BILHETE = distinctBilhetes.join(" / ");
      if (!mergedCab.NOTA_ORIGEM) mergedCab.NOTA_ORIGEM = [...new Set(results.map(r => r.cabecalho.NOTA_ORIGEM).filter(x => x))].join(" / ");
    }

    res.json({ cabecalho: mergedCab, itens: allItens });
  } catch (err) {
    console.error("Erro em GET /protheus/bilhete:", err);
    res.status(500).json({ error: "Erro ao consultar bilhete no Protheus" });
  }
});

// GET /protheus/bilhete-ocorrencia  — rota custom com tratativas para Ocorrencia Automatica (falta, avaria, etc)
app.get("/protheus/bilhete-ocorrencia", async (req, res) => {
  try {
    await getMSSQLPool();

    let { bilhete, data, filial = "01", empresa = "140" } = req.query;
    if (!bilhete) return res.status(400).json({ error: "bilhete is required" });

    // Validação básica para evitar injeção
    if (!/^\d{3}$/.test(empresa)) empresa = "140";

    const tableSZ4 = `SZ4${empresa}`;
    const tableSZ5 = `SZ5${empresa}`;
    const tableSZH = `SZH${empresa}`;
    const tableSB1 = `SB1${empresa}`;
    const tableSZB = `SZB${empresa}`;

    // 1) Separar múltiplos bilhetes (espaço, vírgula, ponto-e-vírgula)
    // Remove caracteres especiais extras, mantém letras/números
    const rawTerms = String(bilhete).split(/[\s,;]+/);
    const terms = rawTerms
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (terms.length === 0) return res.json({ cabecalho: null, itens: [] });

    // 2) Buscar dados de TODOS os termos
    const results = [];
    const zDate = toProtheusDate(data);

    for (const term of terms) {
      const termPad = term.padStart(9, "0");

      const cabSQL = `
        SELECT TOP 1
          ISNULL(ZB.ZB_NUMSEQ, Z4.Z4_BILHETE) AS Z4_BILHETE,
          ISNULL(ZB.ZB_DATA, Z4.Z4_DATA) AS Z4_DATA, -- Prioridade para a data de inclusão definitiva (ZB_DATA)
          ISNULL(ZB.ZB_CLIENTE, Z4.Z4_CLIENTE) AS Z4_CLIENTE,
          ISNULL(ZB.ZB_NOMCLI, Z4.Z4_NOMCLI) AS Z4_NOMCLI,
          Z4.Z4_COND,
          Z4.Z4_DESCOND,
          ISNULL(ZB.ZB_VEND, Z4.Z4_VEND) AS Z4_VEND,
          Z4.Z4_NOMVEN,
          ISNULL(ZB.ZB_TOTBIL, Z4.Z4_TOTBIL) AS Z4_TOTBIL,
          ISNULL(ZB.ZB_CARGA, Z4.Z4_CARGA) AS Z4_CARGA,
          H.ZH_MOTOR,
          ISNULL(ZB.ZB_NOTA, Z4.Z4_NOTA) AS NOTA_ORIGEM,
          ZB.ZB_BILHETE AS ZB_BILHETE,
          H.ZH_NOMMOT  AS MOTORISTA,
          H.ZH_CONFERE AS CONFERENTE,
          H.ZH_VEICULO AS PLACA 
        FROM ${tableSZ4} AS Z4
        FULL OUTER JOIN ${tableSZB} AS ZB
          ON ZB.ZB_FILIAL = Z4.Z4_FILIAL
          AND ZB.ZB_NUMSEQ = Z4.Z4_BILHETE
          AND Z4.Z4_BILHETE <> ''
          AND ZB.D_E_L_E_T_ = ''
        LEFT JOIN ${tableSZH} AS H
          ON  H.ZH_FILIAL = ISNULL(ZB.ZB_FILIAL, Z4.Z4_FILIAL)
          AND H.D_E_L_E_T_ = ''
          AND H.ZH_CODIGO = ISNULL(ZB.ZB_CARGA, Z4.Z4_CARGA)
        WHERE (Z4.Z4_FILIAL = @filial OR ZB.ZB_FILIAL = @filial)
          AND (Z4.D_E_L_E_T_ = '' OR ZB.D_E_L_E_T_ = '')
          AND (
            Z4.Z4_BILHETE = @term OR Z4.Z4_NOTA = @term OR Z4.Z4_NOTA = @termPad OR
            ZB.ZB_NUMSEQ = @term OR ZB.ZB_NOTA = @term OR ZB.ZB_NOTA = @termPad OR ZB.ZB_BILHETE = @term
          )
        ORDER BY ISNULL(ZB.ZB_DATA, Z4.Z4_DATA) DESC
      `;

      const reqCab = new sql.Request()
        .input("filial", sql.VarChar, filial)
        .input("term", sql.VarChar, term)
        .input("termPad", sql.VarChar, termPad)
        .input("data", sql.VarChar, zDate);

      const { recordset: rsCab } = await reqCab.query(cabSQL);
      const cab = rsCab?.[0];

      if (cab) {
        // Usa o bilhete original
        const realBilhete = String(cab.Z4_BILHETE || "").trim();
        const realZB = String(cab.ZB_BILHETE || "").trim();
        const realBilheteF = realBilhete.replace('-', 'F');
        const realBilheteTraco = realBilhete.replace('F', '-');
        const realBilheteLike = realBilhete + "A"; // Em vez de LIKE %%, tentamos apenas uma variação comum (ex: SAN-98A)
        const realNota = String(cab.NOTA_ORIGEM || cab.Z4_NOTA || "").trim();
        // console.log("realBilhete:", realBilhete, " | realBilheteF:", realBilheteF, " | realNota:", realNota);

        const dataFilter = zDate ? `AND Z5.Z5_DATA = @data` : "";

        // Busca Itens
        // Faz JOIN com SB1 para buscar a unidade (B1_UM e B1_SEGUM) caso a Z5_UM venha como espaços em branco ou vazia.
        const itensSQL = `
          SELECT
            Z5.Z5_BILHETE, Z5.Z5_CLIENTE, Z5.Z5_DATA, Z5.Z5_CODPRO, Z5.Z5_DESPRO,
            Z5.Z5_QTDE, Z5.Z5_PRECO, Z5.Z5_TOTAL, Z5.Z5_PRECO2, 
            ISNULL(NULLIF(LTRIM(RTRIM(Z5.Z5_UM)), ''), B1.B1_UM) AS Z5_UM, 
            ISNULL(NULLIF(LTRIM(RTRIM(Z5.Z5_SEGUM)), ''), ISNULL(B1.B1_SEGUM, '')) AS Z5_SEGUM
          FROM ${tableSZ5} Z5
          LEFT JOIN ${tableSB1} B1 
            ON B1.B1_COD = Z5.Z5_CODPRO 
            AND B1.D_E_L_E_T_ = ''
          WHERE Z5.Z5_FILIAL = @filial
            AND Z5.D_E_L_E_T_ = ''
            AND Z5.Z5_BILHETE IN (
              '${realBilhete.replace(/'/g, "''")}',
              '${realZB.replace(/'/g, "''")}',
              '${realBilheteF.replace(/'/g, "''")}',
              '${realBilheteTraco.replace(/'/g, "''")}',
              '${realNota.replace(/'/g, "''")}',
              '${realBilheteLike.replace(/'/g, "''")}',
              '${term.replace(/'/g, "''")}',
              '${termPad.replace(/'/g, "''")}'
            )
            ${dataFilter}
          ORDER BY Z5.Z5_CODPRO
        `;
        const reqItens = new sql.Request()
          .input("filial", sql.VarChar, filial)
          .input("realBilhete", sql.VarChar, realBilhete)
          .input("realZB", sql.VarChar, realZB)
          .input("realBilheteF", sql.VarChar, realBilheteF)
          .input("realBilheteTraco", sql.VarChar, realBilheteTraco)
          .input("realBilheteLike", sql.VarChar, realBilheteLike)
          .input("realNota", sql.VarChar, realNota)
          .input("data", sql.VarChar, zDate);

        console.log("Executando itensSQL para:", realBilhete);
        const { recordset: rsItens } = await reqItens.query(itensSQL);
        console.log("itensSQL finalizou! Total itens:", rsItens?.length);
        results.push({ cabecalho: cab, itens: rsItens || [] });
      }
    }

    if (results.length === 0) {
      return res.json({ cabecalho: null, itens: [] });
    }

    // 3) Validação: Mesmo Cliente
    const firstClient = results[0].cabecalho.Z4_CLIENTE;
    const sameClient = results.every(
      (r) => r.cabecalho.Z4_CLIENTE === firstClient
    );

    if (!sameClient) {
      const clientesDiff = results.map(r => `${r.cabecalho.Z4_NOMCLI} (${r.cabecalho.Z4_BILHETE})`).join(", ");
      return res.status(400).json({
        error: "CLIENTE_DIVERGENTE",
        message: `As notas informadas pertencem a clientes diferentes: ${clientesDiff}. Junte apenas notas do mesmo cliente.`,
      });
    }

    // 4) Merge (Unificar Ocorrência)
    // Base Header from first result
    const mergedCab = { ...results[0].cabecalho };
    let allItens = [];

    // Fields to check for consistency. If divergent, set to empty.
    const fieldsToCheck = [
      "Z4_VEND",
      "Z4_NOMVEN",
      "Z4_CARGA",
      "ZH_MOTOR",
      "MOTORISTA",
      "CONFERENTE",
      "PLACA",
      "NOTA_ORIGEM", // User explicitly asked for this behavior
      "Z4_DATA"
    ];

    // Combine distinct bilhetes
    const distinctBilhetes = [
      ...new Set(results.map((r) => r.cabecalho.Z4_BILHETE.trim())),
    ];
    // Se quiser concatenar bilhetes, ex: "123, 456"
    // ou manter apenas o primeiro como referência principal e os itens carregam o resto
    // mergedCab.Z4_BILHETE = distinctBilhetes.join(", "); 
    // ^ Melhor manter o primeiro para não quebrar constraints de tamanho se houver, 
    // mas o usuário pediu "unica ocorrencia". Vamos concatenar no campo observação ou apenas manter o array de itens.
    // Vamos manter Z4_BILHETE como o primeiro (ID principal) e talvez concatenar na NOTA_ORIGEM se não bater?
    // User strategy: "nesse caso salva vazio, e depois tratamos isso na edição".

    results.forEach((r, idx) => {
      // Accumulate items
      allItens = [...allItens, ...r.itens];

      if (idx > 0) {
        fieldsToCheck.forEach((field) => {
          if (mergedCab[field] && r.cabecalho[field] !== mergedCab[field]) {
            mergedCab[field] = ""; // Clear conflict
          }
        });
      }
    });

    // Recalcular total se necessário, ou somar Z4_TOTBIL
    const totalMerged = results.reduce((acc, r) => acc + (Number(r.cabecalho.Z4_TOTBIL) || 0), 0);
    mergedCab.Z4_TOTBIL = totalMerged;

    // Se houver mais de um bilhete, concatena no campo Z4_BILHETE ou avisa
    if (results.length > 1) {
      mergedCab.Z4_BILHETE = distinctBilhetes.join(" / ");
      // Se limpou a nota de origem por divergência, talvez seja útil mostrar todas
      if (!mergedCab.NOTA_ORIGEM) {
        const notas = [...new Set(results.map(r => r.cabecalho.NOTA_ORIGEM).filter(x => x))];
        mergedCab.NOTA_ORIGEM = notas.join(" / ");
      }
    }

    res.json({ cabecalho: mergedCab, itens: allItens });
  } catch (err) {
    console.error("Erro em GET /protheus/bilhete:", err);
    res.status(500).json({ error: "Erro ao consultar bilhete no Protheus" });
  }
});


// 🆕 Rota para buscar status de fechamento de todos os locais
app.get("/saldos/status-locais", (req, res) => {
  const { data } = req.query;
  const sql = "SELECT DISTINCT local FROM saldos_fechamento WHERE data = ?";
  dbOcorrencias.query(sql, [data], (err, results) => {
    if (err) {
      console.error("Erro ao buscar status locais:", err);
      return res.status(500).json({ error: "Erro ao buscar status locais" });
    }
    const fechados = results.map((r) => r.local);
    res.json(fechados);
  });
});

const port = process.env.PORT || 3001;

const server = app.listen(port, "0.0.0.0", () => {
  // Configurar timeouts para permitir geração de relatórios grandes
  server.timeout = 300000; // 5 minutos (300000ms) - timeout para requisições longas
  server.keepAliveTimeout = 65000; // 65 segundos - mantém conexão viva
  server.headersTimeout = 66000; // 66 segundos - timeout para headers (deve ser > keepAliveTimeout)
  const environment = process.env.ENVIRONMENT || "development";
  const isDev = environment.toLowerCase() === "development";


});

// Integrar WebSocket com o servidor HTTP
server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

// --- CRON JOB: Monitorar Rotas Prontas (Faturamento) a cada 3 minutos ---
async function monitorarFaturamentoRotas() {
  const dataHoje = dayjs().format("YYYYMMDD");
  const dataDB = dayjs().format("YYYY-MM-DD");

  try {
    const q = `
      SELECT 
        ZB_ROTA, 
        SUM(CASE WHEN ZB_NUMSEQ = '' OR ZB_NUMSEQ IS NULL THEN 1 ELSE 0 END) as pendentes 
      FROM SZB140 WITH(NOLOCK)
      WHERE ZB_FILIAL = '01' 
        AND ZB_DTENTRE = '${dataHoje}' 
        AND ZB_CARGA <> '' 
        AND ZB_DESCOND <> 'BONIFICACAO' 
        AND D_E_L_E_T_ = '' 
      GROUP BY ZB_ROTA
    `;
    const sqlPool = await getMSSQLPool();
    const res = await sqlPool.request().query(q);

    for (const rota of res.recordset) {
      if (rota.pendentes === 0 && rota.ZB_ROTA) {
        const checkQ = `SELECT rota FROM rota_pronta_logs WHERE rota = ? AND dt_entrega = ?`;
        const [rows] = await dbRegistros.promise().query(checkQ, [rota.ZB_ROTA, dataDB]);
        if (rows.length === 0) {
          const mysqlQ = `INSERT INTO rota_pronta_logs (rota, dt_entrega, hora_pronta) VALUES (?, ?, ?)`;
          const localTime = dayjs().tz("America/Sao_Paulo").format("YYYY-MM-DD HH:mm:ss");
          await dbRegistros.promise().query(mysqlQ, [rota.ZB_ROTA, dataDB, localTime]);
          console.log(`✅ Rota Pronta Detectada: ${rota.ZB_ROTA} na data ${dataDB} - Hora: ${localTime}`);
        }
      }
    }
  } catch (err) {
    // ignorar falha silenciosamente
  }
}

setTimeout(() => {
  setInterval(monitorarFaturamentoRotas, 180000);
}, 180000);


