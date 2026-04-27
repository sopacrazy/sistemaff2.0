const express = require("express");
const cors = require("cors");
const { sql, getPool } = require("./mssql");
const { createPool } = require("mysql2/promise");
require("dotenv").config();
// 💡 IMPORTAR BIBLIOTECAS NECESSÁRIAS
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ==========================================================
// 💡 FUNÇÃO AUXILIAR PARA CORRIGIR O FORMATO DA DATA
// ==========================================================
const formatarDataParaSQL = (dataString) => {
  if (!dataString) return null;
  const partes = dataString.split("/");
  if (partes.length === 3) {
    const [dia, mes, ano] = partes;
    return `${ano}-${mes}-${dia}`;
  }
  return dataString;
};

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
    max: 10,
    min: 0,
    idleTimeoutMillis: 60000,
  },
  connectionTimeout: 30000,
  requestTimeout: 60000,
};

let dbMySQL;
let pingInterval; // Variável para controlar o intervalo de ping

async function criarPoolMySQL() {
  // 1. Limpa intervalo anterior para evitar loops duplicados
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }

  // 2. Tenta fechar pool anterior se existir
  if (dbMySQL) {
    try {
      await dbMySQL.end();
    } catch (e) {
      // Ignora erro de fechamento
    }
  }

  try {
    dbMySQL = await createPool({
      host: process.env.DB_HOST_OCORRENCIAS,
      user: process.env.DB_USER_OCORRENCIAS,
      password: process.env.DB_PASSWORD_OCORRENCIAS,
      database: process.env.DB_NAME_OCORRENCIAS,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 10000,
    });

    // 💡 TESTE DE CONEXÃO REAL (Evita falso positivo)
    const connectionTest = await dbMySQL.getConnection();
    connectionTest.release();

    console.log("✅ Conectado ao MySQL (ocorrências)");

    pingInterval = setInterval(async () => {
      try {
        const conn = await dbMySQL.getConnection();
        await conn.ping();
        conn.release();
      } catch (err) {
        console.error(`⚠️ Ping MySQL falhou: ${err.message}. Tentando recriar pool...`);
        // Para o intervalo atual imediatamente para não acumular
        clearInterval(pingInterval);
        pingInterval = null;
        await criarPoolMySQL();
      }
    }, 30000);
  } catch (err) {
    console.error("❌ Erro ao criar pool MySQL:", err);
    setTimeout(criarPoolMySQL, 5000);
  }
}

// 🛠️ FUNÇÃO PARA INICIALIZAR TABELAS DO FINANCEIRO
async function inicializarTabelasFinanceiras() {
  if (!dbMySQL) return;
  try {
    const conn = await dbMySQL.getConnection();

    // 1. Tabela de Cadastros Auxiliares (Locais/Destinos)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS almo_financeiro_cadastros (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tipo VARCHAR(50) NOT NULL, 
        nome VARCHAR(255) NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Tabela de Lançamentos
    await conn.query(`
      CREATE TABLE IF NOT EXISTS almo_financeiro_lancamentos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        razao_social VARCHAR(255),
        nf VARCHAR(100),
        emissao DATE,
        vencimento_original DATE,
        forma_pagamento VARCHAR(100),
        parcelas INT DEFAULT 1,
        valor_total DECIMAL(15,2),
        natureza VARCHAR(255),
        destino VARCHAR(255),
        estabelecimento VARCHAR(255),
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Tabela de Vencimentos (Detalhes dos lançamentos)
    await conn.query(`
       CREATE TABLE IF NOT EXISTS almo_financeiro_vencimentos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lancamento_id INT NOT NULL,
        mes_referencia VARCHAR(10),
        data_vencimento DATE,
        FOREIGN KEY (lancamento_id) REFERENCES almo_financeiro_lancamentos(id) ON DELETE CASCADE
       )
    `);

    // 4. Tabela de Controle Semanal (Caixinha)
    await conn.query(`
       CREATE TABLE IF NOT EXISTS almo_financeiro_semanas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        data_inicio DATE,
        data_fim DATE,
        status VARCHAR(20) DEFAULT 'ABERTO',
        saldo_inicial DECIMAL(15,2) DEFAULT 0,
        entrada_total DECIMAL(15,2) DEFAULT 0,
        saida_total DECIMAL(15,2) DEFAULT 0,
        saldo_final DECIMAL(15,2) DEFAULT 0,
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
       )
    `);

    // 5. Tabela de Movimentos da Semana
    await conn.query(`
       CREATE TABLE IF NOT EXISTS almo_financeiro_movimentos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        semana_id INT,
        data_movimento DATE,
        descricao VARCHAR(255),
        fornecedor VARCHAR(255),
        nf VARCHAR(100),
        tipo ENUM('ENTRADA', 'SAIDA'),
        valor DECIMAL(15,2),
        comprovante_url VARCHAR(255),
        FOREIGN KEY (semana_id) REFERENCES almo_financeiro_semanas(id) ON DELETE CASCADE
       )
    `);

    // 6. Tabela de Configuração Fiscal (Funrural)
    await conn.query(`
       CREATE TABLE IF NOT EXISTS fiscal_config (
        id INT PRIMARY KEY DEFAULT 1,
        inss_percent DECIMAL(10,4) DEFAULT 0.0120,
        gilrat_percent DECIMAL(10,4) DEFAULT 0.0010,
        senar_percent DECIMAL(10,4) DEFAULT 0.0020,
        CONSTRAINT single_row CHECK (id = 1)
       )
    `);

    // Inserir valores padrão se não existirem
    await conn.query(`
      INSERT IGNORE INTO fiscal_config (id, inss_percent, gilrat_percent, senar_percent) 
      VALUES (1, 0.0120, 0.0010, 0.0020)
    `);

    console.log("✅ Tabelas do Financeiro e Fiscal verificadas/criadas com sucesso.");
    conn.release();
  } catch (err) {
    console.error("❌ Erro ao inicializar tabelas financeiras:", err);
  }
}
// Chama a inicialização após tentar conectar
setTimeout(inicializarTabelasFinanceiras, 3000);

criarPoolMySQL();

process.on("unhandledRejection", (err) => {
  console.error("🔴 Erro não tratado:", err);
});

async function getSqlConnection() {
  try {
    const pool = await sql.connect(dbConfig);
    return pool;
  } catch (err) {
    console.error("❌ Erro ao conectar ao SQL Server:", err);
    throw err;
  }
}

module.exports = {
  getSqlConnection,
  getMySQL: () => dbMySQL,
};

const app = express();

app.use(cors());
app.use(express.json());

// ----------------------------------------------------------------------
// 🚨 CONFIGURAÇÃO DO MULTER PARA UPLOAD DE ARQUIVOS
// ----------------------------------------------------------------------

// 1. Definição do caminho de destino
const UPLOAD_PATH = "\\\\192.168.10.49\\Adriano\\almo_img";

// 2. Configuração do storage para renomear e definir destino
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 💡 MELHORIA: Tenta criar o diretório recursivamente se ele não existir.
    // Isso ajuda a evitar falhas de "ENOENT" (No such file or directory).
    try {
      if (!fs.existsSync(UPLOAD_PATH)) {
        // O Multer executa em um contexto Node.js que precisa ter permissão
        // de escrita na pasta de rede para que 'fs.mkdirSync' e 'cb(null, UPLOAD_PATH)' funcionem.
        fs.mkdirSync(UPLOAD_PATH, { recursive: true });
      }
      cb(null, UPLOAD_PATH);
    } catch (error) {
      console.error(
        "❌ Erro de Sistema ao salvar arquivo no caminho de rede:",
        UPLOAD_PATH
      );
      console.error("   Detalhes do Erro (Código):", error.code);
      console.error("   Detalhes do Erro (Mensagem):", error.message);
      // Passa o erro para o Multer/Express lidar
      cb(
        new Error(
          "Falha ao configurar o caminho de destino do upload. Verifique as permissões de rede."
        ),
        false
      );
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    // Preserva o nome original do arquivo, garantindo o encoding UTF8
    const originalname = Buffer.from(file.originalname, "latin1").toString(
      "utf8"
    );
    const filename = `${timestamp}-${originalname}`;
    cb(null, filename);
  },
});

// 3. Configuração do filtro para aceitar apenas JPEG, PNG e PDF
const fileFilter = (req, file, cb) => {
  const mimeType = file.mimetype;
  if (
    mimeType === "image/jpeg" ||
    mimeType === "image/png" ||
    mimeType === "application/pdf"
  ) {
    cb(null, true);
  } else {
    cb(
      new Error("Tipo de arquivo não suportado. Use JPEG, PNG ou PDF."),
      false
    );
  }
};

// 4. Criação da instância do Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limite de 5MB (opcional)
  },
});

// 🔴 IMPORTANTE: Mantive comentado para garantir que usamos as rotas abaixo
// app.use("/api/almoxarifado", require("./routes/almoxarifado"));
// app.use("/api/produtos", require("./routes/produtos"));

// -----------------------------------------------------------------
// 🆕 ROTA DE RELATÓRIOS UNIFICADOS
// -----------------------------------------------------------------
app.use("/api/relatorios", require("./routes/relatorios"));

// -----------------------------------------------------------------
// 🆕 ROTA DE LOGIN
// -----------------------------------------------------------------
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  console.log("Recebendo dados de login:", req.body);

  if (!username || !password) {
    return res.status(400).json({ erro: "Login e senha são obrigatórios." });
  }

  const conn = await dbMySQL.getConnection();
  try {
    const loginUpper = username.toUpperCase();
    const [users] = await conn.query(
      "SELECT id, login, senha, papel FROM almo_setor_usuarios WHERE login = ?",
      [loginUpper]
    );

    if (users.length === 0) {
      conn.release();
      return res.status(401).json({ erro: "Credenciais inválidas" });
    }

    const user = users[0];
    const passwordMatch = password === user.senha;

    if (!passwordMatch) {
      conn.release();
      return res.status(401).json({ erro: "Credenciais inválidas" });
    }

    res.json({
      sucesso: true,
      user: {
        id: user.id,
        setor: user.login,
        papel: user.papel,
      },
    });
  } catch (err) {
    console.error("Erro no processamento do login:", err);
    res.status(500).json({ erro: "Erro interno do servidor." });
  } finally {
    conn.release();
  }
});

// -----------------------------------------------------------------
// 🆕 ROTA PARA CADASTRO DE USUÁRIO/SETOR
// -----------------------------------------------------------------
app.post("/api/auth/register-sector", async (req, res) => {
  const { setor, senha, papel } = req.body;

  if (!setor || !senha) {
    return res.status(400).json({ erro: "Setor e senha são obrigatórios." });
  }

  if (senha.length < 6) {
    return res
      .status(400)
      .json({ erro: "A senha deve ter pelo menos 6 caracteres." });
  }

  const conn = await dbMySQL.getConnection();
  try {
    const setorUpper = setor.toUpperCase();
    const papelFinal = papel?.toUpperCase() || "USUARIO";

    const [existing] = await conn.query(
      "SELECT id FROM almo_setor_usuarios WHERE login = ?",
      [setorUpper]
    );

    if (existing.length > 0) {
      conn.release();
      return res
        .status(409)
        .json({ erro: `O Setor "${setor}" já está cadastrado.` });
    }

    await conn.query(
      `INSERT INTO almo_setor_usuarios (login, senha, papel) VALUES (?, ?, ?)`,
      [setorUpper, senha, papelFinal]
    );

    res.json({
      sucesso: true,
      mensagem: `Setor ${setor} cadastrado com papel: ${papelFinal}.`,
    });
  } catch (err) {
    console.error("Erro ao cadastrar setor:", err);
    res.status(500).json({ erro: "Erro interno ao cadastrar o setor." });
  } finally {
    conn.release();
  }
});

// -----------------------------------------------------------------
// 🆕 ROTAS DE CONFIGURAÇÃO FISCAL
// -----------------------------------------------------------------
app.get("/api/fiscal/config", async (req, res) => {
  const conn = await dbMySQL.getConnection();
  try {
    const [rows] = await conn.query("SELECT inss_percent, gilrat_percent, senar_percent FROM fiscal_config WHERE id = 1");
    if (rows.length === 0) {
      return res.json({ inss_percent: 0.0120, gilrat_percent: 0.0010, senar_percent: 0.0020 });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("Erro ao buscar config fiscal:", err);
    res.status(500).json({ erro: "Erro ao buscar config fiscal." });
  } finally {
    conn.release();
  }
});

app.put("/api/fiscal/config", async (req, res) => {
  const { inss_percent, gilrat_percent, senar_percent } = req.body;
  const conn = await dbMySQL.getConnection();
  try {
    await conn.query(
      "UPDATE fiscal_config SET inss_percent = ?, gilrat_percent = ?, senar_percent = ? WHERE id = 1",
      [inss_percent, gilrat_percent, senar_percent]
    );
    res.json({ sucesso: true });
  } catch (err) {
    console.error("Erro ao atualizar config fiscal:", err);
    res.status(500).json({ erro: "Erro ao atualizar config fiscal." });
  } finally {
    conn.release();
  }
});

// -----------------------------------------------------------------
// 🆕 ROTA PARA LISTAR SETORES CADASTRADOS
// -----------------------------------------------------------------
app.get("/api/auth/sectors", async (req, res) => {
  const conn = await dbMySQL.getConnection();
  try {
    const [rows] = await conn.query("SELECT id, login, papel FROM almo_setor_usuarios ORDER BY login ASC");
    res.json(rows);
  } catch (err) {
    console.error("Erro ao listar setores:", err);
    res.status(500).json({ erro: "Erro ao buscar setores." });
  } finally {
    conn.release();
  }
});

// -----------------------------------------------------------------
// 🆕 ROTA PARA ATUALIZAR SETOR
// -----------------------------------------------------------------
app.put("/api/auth/sectors/:id", async (req, res) => {
  const { id } = req.params;
  const { login, senha } = req.body;

  if (!login) {
    return res.status(400).json({ erro: "O nome do setor é obrigatório." });
  }

  const conn = await dbMySQL.getConnection();
  try {
    const loginUpper = login.toUpperCase();

    // Verifica se já existe outro com mesmo nome
    const [existing] = await conn.query(
      "SELECT id FROM almo_setor_usuarios WHERE login = ? AND id != ?",
      [loginUpper, id]
    );

    if (existing.length > 0) {
      conn.release();
      return res.status(409).json({ erro: `Já existe um setor chamado "${login}".` });
    }

    if (senha && senha.trim() !== "") {
      // Atualiza Login e Senha
      await conn.query(
        "UPDATE almo_setor_usuarios SET login = ?, senha = ? WHERE id = ?",
        [loginUpper, senha, id]
      );
    } else {
      // Atualiza só Login
      await conn.query(
        "UPDATE almo_setor_usuarios SET login = ? WHERE id = ?",
        [loginUpper, id]
      );
    }

    res.json({ success: true, message: "Setor atualizado com sucesso." });
  } catch (err) {
    console.error("Erro ao atualizar setor:", err);
    res.status(500).json({ erro: "Erro ao atualizar setor." });
  } finally {
    conn.release();
  }
});

// -----------------------------------------------------------------
// 🆕 ROTA PARA EXCLUIR SETOR
// -----------------------------------------------------------------
app.delete("/api/auth/sectors/:id", async (req, res) => {
  const { id } = req.params;
  const conn = await dbMySQL.getConnection();
  try {
    await conn.query("DELETE FROM almo_setor_usuarios WHERE id = ?", [id]);
    res.json({ success: true, message: "Setor removido com sucesso." });
  } catch (err) {
    console.error("Erro ao excluir setor:", err);
    res.status(500).json({ erro: "Erro ao excluir setor." });
  } finally {
    conn.release();
  }
});


// =================================================================
// 🏆 ROTA COMPLETA: SINCRONIZA PRODUTOS + IMPORTA SALDOS (BLINDADA)
// =================================================================
app.get("/api/importar-entradas", async (req, res) => {
  console.log("🔥 ROTA '/api/importar-entradas' ACIONADA!");

  try {
    const pool = await getSqlConnection(); // Conexão SQL Server
    const conn = await dbMySQL.getConnection(); // Conexão MySQL

    const dataCorte = "20251201";

    // =================================================================================
    // 🚀 PASSO 1: SINCRONIZAR PRODUTOS (SB1)
    // Garante que o produto existe no MySQL antes de tentarmos colocar saldo nele
    // =================================================================================
    console.log("🔌 (1/2) Buscando novos produtos no Protheus (SB1)...");

    const resultProdutos = await pool.request().query(`
            SELECT B1_COD AS codigo, B1_DESC AS descricao, B1_TIPO AS tipo, B1_UM AS unidade, 
            B1_GRUPO AS grupo, B1_SEGUM AS segunda_unidade, B1_CONV AS converso
            FROM SB1140
            WHERE D_E_L_E_T_ = '' AND B1_FILIAL = '' AND B1_MSBLQL IN ('', '2') AND B1_COD LIKE 'MC%'
        `);

    const produtosProtheus = resultProdutos.recordset;
    let novosProdutosCadastrados = 0;

    for (const item of produtosProtheus) {
      // Limpeza do código vindo do Protheus
      const codigoLimpo = String(item.codigo).trim();

      // Tratamento do Fator de Conversão
      const valorConverso = parseFloat(item.converso) > 0 ? parseFloat(item.converso) : 1;

      // Verifica se já existe no MySQL
      const [existe] = await conn.query(
        "SELECT 1 FROM almo_produtos WHERE codigo = ? LIMIT 1",
        [codigoLimpo]
      );

      if (existe.length === 0) {
        // PRODUTO NOVO: FAZ INSERT (CÓDIGO QUE VOCÊ JÁ TINHA)
        await conn.query(
          `INSERT INTO almo_produtos (codigo, descricao, tipo, unidade, grupo, segunda_unidade, converso, entrada, saida) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)`,
          [
            codigoLimpo,
            item.descricao.trim(),
            item.tipo,
            item.unidade,
            item.grupo,
            item.segunda_unidade,
            valorConverso,
          ]
        );
        novosProdutosCadastrados++;
      } else {
        // 🚨 AQUI ESTÁ A CORREÇÃO:
        // PRODUTO JÁ EXISTE: FAZ UPDATE PARA ATUALIZAR O FATOR DE CONVERSÃO
        await conn.query(
          `UPDATE almo_produtos 
         SET descricao = ?, 
             unidade = ?, 
             segunda_unidade = ?, 
             converso = ?,
             grupo = ?
         WHERE codigo = ?`,
          [
            item.descricao.trim(),
            item.unidade,
            item.segunda_unidade,
            valorConverso, // <--- Isso vai atualizar o 25 que vem do Protheus
            item.grupo,
            codigoLimpo
          ]
        );
        novosProdutosCadastrados++;
      }
    }
    console.log(`✅ Produtos novos cadastrados: ${novosProdutosCadastrados}`);

    // =================================================================================
    // 🚀 PASSO 2: IMPORTAR SALDOS/NOTAS (SD1)
    // =================================================================================
    console.log("🔌 (2/2) Buscando notas e saldos (SD1)...");

    // Busca histórico para não repetir notas
    const [notasImportadas] = await conn.query(
      "SELECT numero_nota FROM almo_saldos_importados"
    );
    const notasIgnorar = notasImportadas.map((n) => n.numero_nota);

    // Monta a Query do SQL Server
    let sqlQuery = `
            SELECT D1_DOC AS nota, D1_COD AS codigo, D1_QUANT AS quantidade, D1_EMISSAO AS emissao, D1_TOTAL AS valor_total
            FROM SD1140 
            WHERE D_E_L_E_T_ = '' 
              AND D1_FILIAL = '01' 
              AND D1_COD LIKE 'MC%' 
              AND D1_EMISSAO >= '${dataCorte}'
        `;

    if (notasIgnorar.length > 0) {
      const notasParaIn = notasIgnorar.map((nota) => `'${nota}'`).join(",");
      sqlQuery += ` AND D1_DOC NOT IN (${notasParaIn})`;
    }

    const resultSaldos = await pool.request().query(sqlQuery);
    const saldos = resultSaldos.recordset;

    let ignoradosPorData = 0;
    let processados = 0;
    let falhasProdutoNaoEncontrado = 0;
    const notasParaSalvar = new Map();

    for (const item of saldos) {
      // LIMPEZA DOS DADOS
      const codigoProduto = String(item.codigo).trim();
      let dataNormalizada = "";

      if (item.emissao instanceof Date) {
        const y = item.emissao.getFullYear();
        const m = String(item.emissao.getMonth() + 1).padStart(2, "0");
        const d = String(item.emissao.getDate()).padStart(2, "0");
        dataNormalizada = `${y}${m}${d}`;
      } else {
        dataNormalizada = String(item.emissao).trim();
      }

      // Filtro de Data
      if (dataNormalizada < dataCorte) {
        ignoradosPorData++;
        continue;
      }

      // ----------------------------------------------------
      // 💰 NOVO CÁLCULO DE CUSTO MÉDIO
      // ----------------------------------------------------
      let custoUnitario = 0;
      if (item.valor_total && item.quantidade > 0) {
        // Ex: R$ 50,00 / 50 un = R$ 1,00
        custoUnitario = item.valor_total / item.quantidade;
      }

      // Atualiza saldo E O CUSTO no MySQL
      // Se vier uma nota nova, atualizamos o custo_unitario para o valor dessa nota mais recente
      // (Isso é uma simplificação válida: "Último Preço Pago")
      const [updateResult] = await conn.query(
        `UPDATE almo_produtos 
         SET entrada = entrada + ?, 
             saldo = saldo + ?,
             custo_unitario = IF(? > 0, ?, custo_unitario) 
         WHERE codigo = ?`,
        [item.quantidade, item.quantidade, custoUnitario, custoUnitario, codigoProduto]
      );

      // VERIFICA SE O PRODUTO EXISTIA
      if (updateResult.affectedRows === 0) {
        console.warn(
          `⚠️ ERRO CRÍTICO: Tentei atualizar o produto [${codigoProduto}] mas ele ainda não existe no MySQL, mesmo após a sincronização!`
        );
        falhasProdutoNaoEncontrado++;
        continue;
      }

      console.log(
        `✅ Saldo Atualizado: Nota ${item.nota} | Produto ${codigoProduto} | Qtd: +${item.quantidade} | Custo Unit: R$ ${custoUnitario.toFixed(4)}`
      );
      notasParaSalvar.set(item.nota, dataNormalizada);
      processados++;
    }

    // Salva histórico
    for (const [nota, dataEmissao] of notasParaSalvar) {
      const dataFormatada = `${dataEmissao.substring(
        0,
        4
      )}-${dataEmissao.substring(4, 6)}-${dataEmissao.substring(6, 8)}`;

      const [check] = await conn.query(
        "SELECT 1 FROM almo_saldos_importados WHERE numero_nota = ?",
        [nota]
      );
      if (check.length === 0) {
        await conn.query(
          `INSERT INTO almo_saldos_importados (numero_nota, data_emissao, importado_em) VALUES (?, ?, NOW())`,
          [nota, dataFormatada]
        );
      }
    }

    conn.release();

    console.log(`🏁 FIM DA IMPORTAÇÃO COMPLETA.`);
    res.json({
      sucesso: true,
      novosProdutos: novosProdutosCadastrados,
      notasProcessadas: processados,
      falhas: falhasProdutoNaoEncontrado,
    });
  } catch (err) {
    console.error("❌ ERRO GERAL:", err);
    res.status(500).json({ erro: "Erro no servidor" });
  }
});

// ----------------------------------------------------------------------
// 🟢 ROTA DE PRODUTOS ESPECÍFICA DO ALMOXARIFADO (Limpa)
// ----------------------------------------------------------------------
app.get("/api/almoxarifado/produtos", async (req, res) => {
  try {
    const conn = await dbMySQL.getConnection();

    // Armazena a query multi-linha
    const sqlQuery = `
            SELECT id, codigo, descricao, tipo, unidade, grupo, segunda_unidade, entrada, saida, (entrada - saida) AS saldo, minimo, estoque_critico, converso, imagem_url, custo_unitario 
            FROM almo_produtos
            ORDER BY descricao ASC
        `;

    // 🚨 APLICAÇÃO CRÍTICA: .trim() para limpar espaços e quebras de linha antes de enviar ao MySQL
    const [produtos] = await conn.query(sqlQuery.trim());

    conn.release();
    res.json(produtos);
  } catch (err) {
    console.error("Erro ao buscar produtos do almoxarifado:", err);
    res.status(500).json({ erro: "Erro ao buscar produtos" });
  }
});

// E na rota /api/produtos (use o mesmo princípio, ou uma linha única)
app.get("/api/produtos", async (req, res) => {
  const { termo } = req.query;

  try {
    const conn = await dbMySQL.getConnection();

    // Essa é a Query "Mágica" que traz os saldos
    let sqlQuery = `
        SELECT 
            id, 
            codigo, 
            descricao, 
            tipo, 
            unidade, 
            grupo, 
            segunda_unidade, 
            IFNULL(entrada, 0) as entrada, 
            IFNULL(saida, 0) as saida,
            IFNULL(saldo, 0) as saldo, 
            minimo, 
            estoque_critico, 
            IFNULL(converso, 1) as converso, 
            imagem_url,
            custo_unitario
        FROM almo_produtos
    `;

    const params = [];

    if (termo) {
      sqlQuery += ` WHERE codigo LIKE ? OR descricao LIKE ? `;
      params.push(`%${termo}%`, `%${termo}%`);
    }

    sqlQuery += ` ORDER BY descricao ASC LIMIT 50`;

    const [produtos] = await conn.query(sqlQuery, params);

    conn.release();
    res.json(produtos);
  } catch (err) {
    console.error("Erro ao buscar produtos:", err);
    res.status(500).json({ erro: "Erro ao buscar produtos" });
  }
});

app.put("/api/almoxarifado/produtos/:codigo/minimo", async (req, res) => {
  const { codigo } = req.params;
  const { minimo } = req.body;
  try {
    const conn = await dbMySQL.getConnection(); // A lógica do SQL está correta, apenas o endpoint HTTP estava errado.
    await conn.query(`UPDATE almo_produtos SET minimo = ? WHERE codigo = ?`, [
      minimo,
      codigo,
    ]);
    conn.release();
    res.json({ sucesso: true });
  } catch (err) {
    console.error("Erro ao atualizar mínimo:", err); // Boa prática: logar o erro
    res.status(500).json({ erro: "Erro ao atualizar mínimo" });
  }
});

// ----------------------------------------------------------------------
// 🟢 ROTA DE SOLICITAÇÃO (CRIAÇÃO)
// ----------------------------------------------------------------------

// 🆕 ROTA DE EDIÇÃO MANUAL DO PRODUTO (CUSTO, MÍNIMO, CRÍTICO)
app.put("/api/almoxarifado/produtos/:codigo/manual", async (req, res) => {
  const { codigo } = req.params;
  const { custo, minimo, estoque_critico } = req.body;

  try {
    const conn = await dbMySQL.getConnection();

    // Atualiza custo_unitario, minimo e estoque_critico
    await conn.query(
      `UPDATE almo_produtos 
       SET custo_unitario = ?, 
           minimo = ?, 
           estoque_critico = ? 
       WHERE codigo = ?`,
      [custo, minimo, estoque_critico, codigo]
    );

    conn.release();
    console.log(`✅ Produto ${codigo} atualizado manualmente.`);
    res.json({ sucesso: true });
  } catch (err) {
    console.error("Erro ao atualizar produto manualmente:", err);
    res.status(500).json({ erro: "Erro ao atualizar produto" });
  }
});
// 🚨 CORREÇÃO 1: Adiciona Multer com tratamento de erro como middleware
app.post(
  "/api/almoxarifado/solicitacoes",
  (req, res, next) => {
    // Middleware do Multer (salva com nome temporário primeiro)
    upload.single("imagem_produto")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        console.error("Erro Multer:", err.message);
        return res
          .status(500)
          .json({ erro: `Falha no upload: ${err.message}` });
      } else if (err) {
        console.error("Erro Desconhecido:", err.message);
        return res.status(500).json({ erro: `Erro no upload: ${err.message}` });
      }
      next();
    });
  },
  async (req, res) => {
    const { usuario, local, data_entrega, observacao, itens, setor } = req.body;
    const arquivoTemporario = req.file; // O arquivo com nome "timestamp"

    // Parse dos itens
    let itensParsed;
    try {
      itensParsed = JSON.parse(itens);
    } catch (e) {
      if (arquivoTemporario) fs.unlinkSync(arquivoTemporario.path); // Apaga se der erro
      return res.status(400).json({ erro: "Formato de itens inválido." });
    }

    if (
      !usuario ||
      !local ||
      !data_entrega ||
      !Array.isArray(itensParsed) ||
      itensParsed.length === 0
    ) {
      if (arquivoTemporario) fs.unlinkSync(arquivoTemporario.path);
      return res.status(400).json({ erro: "Dados incompletos ou inválidos" });
    }

    const dataEntregaFormatada = formatarDataParaSQL(data_entrega);
    const conn = await dbMySQL.getConnection();

    try {
      await conn.beginTransaction();

      // 1. Insere a solicitação (ainda sem o caminho final do anexo)
      //    Passamos NULL ou uma string vazia no anexo_caminho por enquanto.
      const [result] = await conn.query(
        `INSERT INTO almo_solicitacoes (usuario, local, data_entrega, observacao, status, criado_em, anexo_caminho, setor) VALUES (?, ?, ?, ?, 'PENDENTE', NOW(), NULL, ?)`,
        [usuario, local, dataEntregaFormatada, observacao, setor || null]
      );

      const solicitacaoId = result.insertId; // 💡 AQUI TEMOS O ID (Ex: 93)
      let nomeFinalArquivo = null;

      // 2. Se houver arquivo, renomeamos ele agora usando o ID
      if (arquivoTemporario) {
        const extensao = path.extname(arquivoTemporario.originalname); // Pega .png, .jpg ou .pdf
        nomeFinalArquivo = `${solicitacaoId}${extensao}`; // Ex: "93.png"

        const caminhoAntigo = arquivoTemporario.path;
        const caminhoNovo = path.join(
          path.dirname(caminhoAntigo),
          nomeFinalArquivo
        );

        // Renomeia o arquivo físico na pasta
        fs.renameSync(caminhoAntigo, caminhoNovo);

        // Atualiza o registro no banco com o nome correto
        await conn.query(
          `UPDATE almo_solicitacoes SET anexo_caminho = ? WHERE id = ?`,
          [nomeFinalArquivo, solicitacaoId]
        );
      }

      // 3. Insere os itens
      for (const item of itensParsed) {
        const produtoDescricao =
          item.descricao_produto || "Produto sem descrição";
        await conn.query(
          `INSERT INTO almo_solicitacoes_itens (solicitacao_id, codigo_produto, descricao_produto, quantidade, quantidade_original, status_gestor) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            solicitacaoId,
            item.codigo_produto,
            produtoDescricao,
            item.quantidade,
            item.quantidade,
            "SOLICITADO",
          ]
        );
      }

      await conn.commit();

      console.log(
        `✅ Solicitação #${solicitacaoId} criada com sucesso. Arquivo: ${nomeFinalArquivo || "Nenhum"
        }`
      );
      res
        .status(201)
        .json({ sucesso: true, id: solicitacaoId, anexo: nomeFinalArquivo });
    } catch (err) {
      await conn.rollback();
      console.error("Erro ao salvar solicitação:", err);

      // Se der erro no SQL, apaga o arquivo temporário (se ainda existir)
      if (arquivoTemporario && fs.existsSync(arquivoTemporario.path)) {
        try {
          fs.unlinkSync(arquivoTemporario.path);
        } catch (e) { }
      }

      res.status(500).json({ erro: "Erro interno ao salvar solicitação" });
    } finally {
      conn.release();
    }
  }
);

app.put("/api/produtos/:codigo/estoque-critico", async (req, res) => {
  const { codigo } = req.params;
  const { estoque_critico } = req.body;
  try {
    const conn = await dbMySQL.getConnection();
    await conn.query(
      `UPDATE almo_produtos SET estoque_critico = ? WHERE codigo = ?`,
      [estoque_critico, codigo]
    );
    conn.release();
    res.json({ sucesso: true });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao atualizar estoque crítico" });
  }
});

// ----------------------------------------------------------------------
// 🟢 ROTA DE SOLICITAÇÃO POR USUÁRIO (Corrigida e Limpa)
// ----------------------------------------------------------------------
app.get("/api/solicitacoes/:usuario", async (req, res) => {
  const { usuario } = req.params;
  try {
    const conn = await dbMySQL.getConnection(); // Query principal da solicitação (limpa)
    const [solicitacoes] = await conn.query(
      `SELECT id, usuario, local, data_entrega, observacao, obs_gestor, status, criado_em, anexo_caminho FROM almo_solicitacoes WHERE usuario = ? ORDER BY criado_em DESC`,
      [usuario.toUpperCase()]
    ); // Lógica de verificação de corte para cada solicitação

    if (solicitacoes.length > 0) {
      const ids = solicitacoes.map((s) => s.id);

      const [todosItens] = await conn.query(
        `SELECT solicitacao_id, quantidade, quantidade_original FROM almo_solicitacoes_itens WHERE solicitacao_id IN (?)`,
        [ids]
      );

      const itensPorSolicitacao = {};
      todosItens.forEach((item) => {
        if (!itensPorSolicitacao[item.solicitacao_id]) {
          itensPorSolicitacao[item.solicitacao_id] = [];
        }
        itensPorSolicitacao[item.solicitacao_id].push(item);
      });

      for (const solicitacao of solicitacoes) {
        const itens = itensPorSolicitacao[solicitacao.id] || [];
        let totalOriginal = 0;
        let totalFinal = 0;

        for (const item of itens) {
          const original = item.quantidade_original || item.quantidade;
          totalOriginal += original;
          totalFinal += item.quantidade;
        }
        solicitacao.teve_corte = totalFinal < totalOriginal;
      }
    }
    conn.release();
    res.json(solicitacoes);
  } catch (err) {
    console.error("Erro ao buscar solicitações do usuário:", err);
    res.status(500).json({ erro: "Erro ao buscar solicitações" });
  }
});
// ----------------------------------------------------------------------
// 🟢 ROTA DE BUSCA DE SOLICITAÇÕES (GESTOR) (Corrigida e Limpa)
// ----------------------------------------------------------------------
app.get("/api/almoxarifado/solicitacoes", async (req, res) => {
  const { local } = req.query;
  try {
    const conn = await dbMySQL.getConnection();

    let query = `SELECT id, usuario, local, data_entrega, observacao, obs_gestor, status, criado_em, anexo_caminho FROM almo_solicitacoes`; // Query limpa principal

    let params = [];
    if (local) {
      query += ` WHERE TRIM(local) = ?`;
      params.push(local.toUpperCase());
    }

    query += ` ORDER BY criado_em DESC`;
    console.log("🔥 BUSCANDO SOLICITAÇÕES (GESTOR) - SQL:", query);

    const [solicitacoes] = await conn.query(query.trim(), params);

    if (solicitacoes.length > 0) {
      const ids = solicitacoes.map((s) => s.id);

      const [todosItens] = await conn.query(
        `SELECT 
            i.solicitacao_id,
            i.descricao_produto,
            i.quantidade, 
            i.quantidade_original, 
            i.valor_momento, 
            p.custo_unitario AS custo_atual,
            p.unidade,
            p.converso
         FROM almo_solicitacoes_itens i
         LEFT JOIN almo_produtos p ON i.codigo_produto = p.codigo
         WHERE i.solicitacao_id IN (?)`,
        [ids]
      );

      const itensPorSolicitacao = {};
      todosItens.forEach((item) => {
        if (!itensPorSolicitacao[item.solicitacao_id]) {
          itensPorSolicitacao[item.solicitacao_id] = [];
        }
        itensPorSolicitacao[item.solicitacao_id].push(item);
      });

      for (const solicitacao of solicitacoes) {
        const itens = itensPorSolicitacao[solicitacao.id] || [];

        let totalOriginal = 0;
        let totalFinal = 0;
        let valorFinanceiro = 0;
        let listaNomes = [];

        for (const item of itens) {
          const original = item.quantidade_original || item.quantidade;
          totalOriginal += original;
          totalFinal += item.quantidade;

          if (item.descricao_produto) listaNomes.push(item.descricao_produto);

          const fator = Number(item.converso) > 0 ? Number(item.converso) : 1;
          const custoAtualUnitario = (Number(item.custo_atual || 0) / fator);

          const precoUnitario = Number(item.valor_momento) > 0
            ? Number(item.valor_momento)
            : custoAtualUnitario;

          if (item.quantidade > 0) {
            valorFinanceiro += (item.quantidade * precoUnitario);
          }
        }

        solicitacao.teve_corte = totalFinal < totalOriginal;
        solicitacao.valor_total = valorFinanceiro;
        solicitacao.itens_resumo = listaNomes.join(" | ").toUpperCase();
      }
    }
    conn.release();
    res.json(solicitacoes);
  } catch (error) {
    console.error("Erro ao buscar solicitações (Gestor):", error);
    res.status(500).json({ erro: "Erro ao buscar solicitações" });
  }
});

// DELETE: Excluir Solicitação (Gestor)
app.delete("/api/almoxarifado/solicitacoes/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const conn = await dbMySQL.getConnection();
    await conn.query("DELETE FROM almo_solicitacoes WHERE id = ?", [id]);
    conn.release();
    res.json({ sucesso: true });
  } catch (err) {
    console.error("Erro ao excluir solicitação:", err);
    res.status(500).json({ erro: "Erro ao excluir solicitação." });
  }
});

// ----------------------------------------------------------------------
// 🟢 ROTAS DE ITENS (CORRIGIDAS COM PREFIXO CORRETO)
// ----------------------------------------------------------------------

// 1. Rota GET para BUSCAR itens (ESTAVA FALTANDO!)
app.get("/api/almoxarifado/solicitacoes/:id/itens", async (req, res) => {
  const { id } = req.params;
  try {
    const conn = await dbMySQL.getConnection();
    const [itens] = await conn.query(
      `SELECT 
         i.codigo_produto, 
         i.descricao_produto, 
         i.quantidade, 
         i.quantidade_original, 
         i.status_gestor,
         i.valor_momento,
         p.custo_unitario AS custo_atual,
         p.converso,
         p.unidade
       FROM almo_solicitacoes_itens i
       LEFT JOIN almo_produtos p ON i.codigo_produto = p.codigo
       WHERE i.solicitacao_id = ?`,
      [id]
    );
    conn.release();
    res.json(itens);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar itens da solicitação" });
  }
});

// 2. Rota PUT para ATUALIZAR quantidade
app.put("/api/almoxarifado/solicitacoes/:id/itens", async (req, res) => {
  const { id } = req.params;
  const { itens } = req.body;
  if (!Array.isArray(itens))
    return res.status(400).json({ erro: "Itens inválidos" });
  try {
    const conn = await dbMySQL.getConnection();
    for (const item of itens) {
      await conn.query(
        `UPDATE almo_solicitacoes_itens SET quantidade = ? WHERE solicitacao_id = ? AND codigo_produto = ?`,
        [item.quantidade, id, item.codigo_produto]
      );
    }
    conn.release();
    res.json({ sucesso: true });
  } catch (err) {
    res.status(500).json({ erro: "Erro interno ao atualizar os itens" });
  }
});

// 3. Rota PATCH para APROVAR/REJEITAR
app.patch(
  "/api/almoxarifado/almo-solicitacoes/:id/aprovar",
  async (req, res) => {
    const { id } = req.params;
    const { status, obs_gestor, itens } = req.body;
    const conn = await dbMySQL.getConnection();

    try {
      await conn.beginTransaction();

      // 1. Atualiza cabeçalho
      await conn.query(
        "UPDATE almo_solicitacoes SET status = ?, obs_gestor = ? WHERE id = ?",
        [status, obs_gestor, id]
      );

      // 2. Atualiza itens (SQL CORRIGIDO PARA LINHA ÚNICA)
      for (const item of itens) {
        const itemStatus = item.quantidade > 0 ? "ATENDIDO" : "EXCLUIDO";

        // 🚨 AQUI ESTAVA O ERRO: Usamos aspas duplas e linha única agora
        await conn.query(
          "UPDATE almo_solicitacoes_itens SET quantidade = ?, status_gestor = ? WHERE solicitacao_id = ? AND codigo_produto = ?",
          [item.quantidade, itemStatus, id, item.codigo_produto]
        );
      }

      // 3. Atualiza Estoque se Atendido
      if (status === "ATENDIDO") {
        for (const item of itens) {
          if (item.quantidade > 0) {
            // (A) Baixa no estoque físico
            await conn.query(
              "UPDATE almo_produtos SET saida = COALESCE(saida, 0) + ?, saldo = (COALESCE(entrada, 0) - (COALESCE(saida, 0) + ?)) WHERE codigo = ?",
              [item.quantidade, item.quantidade, item.codigo_produto]
            );

            // (B) [FINANCEIRO] Grava o custo do momento na solicitação
            // Busca o custo atual e fator de conversao do produto
            const [prodInfo] = await conn.query(
              "SELECT custo_unitario, converso FROM almo_produtos WHERE codigo = ?",
              [item.codigo_produto]
            );

            let custoParaGravar = 0;
            if (prodInfo.length > 0) {
              const p = prodInfo[0];
              const fator = Number(p.converso) > 0 ? Number(p.converso) : 1;
              custoParaGravar = Number(p.custo_unitario) / fator;
            }

            // Atualiza o item da solicitação com esse valor
            await conn.query(
              "UPDATE almo_solicitacoes_itens SET valor_momento = ? WHERE solicitacao_id = ? AND codigo_produto = ?",
              [custoParaGravar, id, item.codigo_produto]
            );
          }
        }
      }

      await conn.commit();
      res.json({ sucesso: true });
    } catch (err) {
      await conn.rollback();
      console.error("Erro na aprovação:", err);
      res.status(500).json({ erro: "Erro ao processar aprovação" });
    } finally {
      conn.release();
    }
  }
);

// ----------------------------------------------------------------------
// 🟢 OUTRAS ROTAS AUXILIARES
// ----------------------------------------------------------------------

app.post("/api/entrada-manual", async (req, res) => {
  const { numero, itens } = req.body;
  if (!numero || !Array.isArray(itens) || itens.length === 0)
    return res.status(400).json({ erro: "Dados inválidos" });
  try {
    const conn = await dbMySQL.getConnection();
    const [jaExiste] = await conn.query(
      "SELECT 1 FROM almo_saldos_importados WHERE numero_nota = ?",
      [numero]
    );
    if (jaExiste.length > 0) {
      conn.release();
      return res
        .status(400)
        .json({ erro: "Esse número já foi lançado manualmente!" });
    }
    for (const item of itens) {
      await conn.query(
        `UPDATE almo_produtos SET entrada = entrada + ?, saldo = saldo + ? WHERE codigo = ?`,
        [item.quantidade, item.quantidade, item.codigo]
      );
    }
    await conn.query(
      `INSERT INTO almo_saldos_importados (numero_nota, importado_em) VALUES (?, NOW())`,
      [numero]
    );
    conn.release();
    res.json({ sucesso: true, totalItens: itens.length });
  } catch (err) {
    res.status(500).json({ erro: "Erro interno ao lançar entrada manual" });
  }
});

// =========================================================================
// 🆕 ROTA DE SAÍDA MANUAL (BALCÃO)
// =========================================================================
app.post("/api/saida-manual", async (req, res) => {
  const { destino, data, itens, tipo } = req.body;

  // Validação básica
  if (!destino || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ erro: "Dados inválidos para saída." });
  }

  const conn = await dbMySQL.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Criar uma solicitação "fictícia" mas com status JÁ ATENDIDO
    // Usamos o campo 'local' ou 'usuario' para salvar o destino
    // Observação: Salvamos como 'SAIDA_BALCAO' para diferenciar nos relatórios se precisar
    const [result] = await conn.query(
      `INSERT INTO almo_solicitacoes 
         (usuario, local, data_entrega, observacao, status, criado_em, obs_gestor) 
         VALUES (?, ?, ?, ?, 'ATENDIDO', NOW(), 'Saída Rápida (Balcão)')`,
      ["GESTOR", destino.toUpperCase(), data || new Date(), `Saída Balcão para: ${destino}`]
    );

    const solicitacaoId = result.insertId;

    // 2. Processar itens: Gravar na tabela de itens E baixar do estoque
    for (const item of itens) {
      const qtd = Number(item.quantidade);

      // Grava o item vinculado à solicitação criada
      await conn.query(
        `INSERT INTO almo_solicitacoes_itens 
           (solicitacao_id, codigo_produto, descricao_produto, quantidade, quantidade_original, status_gestor) 
           VALUES (?, ?, ?, ?, ?, 'ATENDIDO')`,
        [solicitacaoId, item.codigo, item.produto, qtd, qtd]
      );

      // Atualiza o estoque (Aumenta SAIDA, Diminui SALDO)
      await conn.query(
        `UPDATE almo_produtos 
           SET saida = COALESCE(saida, 0) + ?, 
               saldo = saldo - ? 
           WHERE codigo = ?`,
        [qtd, qtd, item.codigo]
      );
    }

    await conn.commit();
    console.log(`✅ Saída Manual #${solicitacaoId} registrada para: ${destino}`);
    res.json({
      sucesso: true,
      mensagem: "Saída registrada com sucesso!",
      id: solicitacaoId,
    });
  } catch (err) {
    await conn.rollback();
    console.error("❌ Erro ao registrar saída manual:", err);
    res.status(500).json({ erro: "Erro ao registrar saída no banco de dados." });
  } finally {
    conn.release();
  }
});

app.get("/api/almoxarifado/solicitacoes/locais", async (req, res) => {
  try {
    const conn = await dbMySQL.getConnection();
    const [locais] = await conn.query(
      `SELECT DISTINCT local FROM almo_solicitacoes WHERE local IS NOT NULL AND local != '' ORDER BY local ASC`
    );
    conn.release();
    res.json(locais);
  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar lista de locais" });
  }
});


app.get("/api/almoxarifado/anexos/:filename", (req, res) => {
  const { filename } = req.params;

  // Certifique-se de que UPLOAD_PATH está definido no topo do seu arquivo
  // const UPLOAD_PATH = "\\\\192.168.10.49\\Adriano\\almo_img";

  const caminhoCompleto = path.join(UPLOAD_PATH, filename);

  // Envia o arquivo para o navegador
  res.sendFile(caminhoCompleto, (err) => {
    if (err) {
      console.error("Erro ao enviar arquivo:", err);
      res.status(404).json({ erro: "Arquivo não encontrado ou inacessível." });
    }
  });
});

// =========================================================================
// 🔧 ROTAS DE SERVIÇOS E MANUTENÇÃO (AGRUPADAS)
// =========================================================================

console.log("📢 [SERVER] Carregando rotas de /api/servicos...");

// 1. GET: Buscar Tipos de Serviços
app.get("/api/servicos/tipos", async (req, res) => {
  console.log("📥 [GET] /api/servicos/tipos - Solicitado");
  try {
    const conn = await dbMySQL.getConnection();
    const [tipos] = await conn.query(`
      SELECT t.*, 
        (SELECT COUNT(*) FROM almo_servicos_registros r WHERE r.tipo_id = t.id) as total_registros,
        (SELECT COALESCE(SUM(valor_material + valor_mao_obra), 0) FROM almo_servicos_registros r WHERE r.tipo_id = t.id) as total_gasto
      FROM almo_servicos_tipos t
      ORDER BY t.nome ASC
    `);
    conn.release();
    res.json(tipos);
  } catch (err) {
    console.error("❌ [ERRO] GET /api/servicos/tipos:", err.message);
    res.status(500).json({ erro: "Erro ao buscar tipos de serviços" });
  }
});

// 2. POST: Criar Novo Tipo de Serviço (A ROTA QUE ESTAVA DANDO ERRO)
app.post("/api/servicos/tipos", async (req, res) => {
  console.log("📥 [POST] /api/servicos/tipos - Body:", req.body);
  const { nome } = req.body;

  if (!nome) {
    console.warn("⚠️ [POST] Nome vazio recebido.");
    return res.status(400).json({ erro: "Nome é obrigatório" });
  }

  try {
    const conn = await dbMySQL.getConnection();
    // Verifica duplicidade antes de inserir
    const [existente] = await conn.query("SELECT id FROM almo_servicos_tipos WHERE nome = ?", [nome.toUpperCase()]);

    if (existente.length > 0) {
      conn.release();
      return res.status(400).json({ erro: "Este serviço já está cadastrado." });
    }

    await conn.query("INSERT INTO almo_servicos_tipos (nome) VALUES (?)", [nome.toUpperCase()]);
    conn.release();

    console.log(`✅ [POST] Serviço '${nome}' criado com sucesso.`);
    res.json({ sucesso: true });
  } catch (err) {
    console.error("❌ [ERRO] Criar serviço:", err.message);
    res.status(500).json({ erro: "Erro ao criar serviço." });
  }
});

// 3. GET: Buscar Histórico de Registros de um Tipo
app.get("/api/servicos/:id/registros", async (req, res) => {
  const { id } = req.params;
  try {
    const conn = await dbMySQL.getConnection();
    const [registros] = await conn.query(
      "SELECT * FROM almo_servicos_registros WHERE tipo_id = ? ORDER BY data_servico DESC",
      [id]
    );
    conn.release();
    res.json(registros);
  } catch (err) {
    console.error("❌ [ERRO] Buscar registros:", err.message);
    res.status(500).json({ erro: "Erro ao buscar registros" });
  }
});

// 4. POST: Lançar Novo Registro de Manutenção
app.post("/api/servicos/registros", async (req, res) => {
  console.log("📥 [POST] Novo registro recebido:", req.body);
  const { tipo_id, data_servico, local, descricao, valor_material, valor_mao_obra, data_retorno } = req.body;

  try {
    const conn = await dbMySQL.getConnection();
    await conn.query(
      `INSERT INTO almo_servicos_registros 
      (tipo_id, data_servico, local_servico, descricao, valor_material, valor_mao_obra, data_retorno) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tipo_id, data_servico, local, descricao, valor_material || 0, valor_mao_obra || 0, data_retorno || null]
    );
    conn.release();
    res.json({ sucesso: true });
  } catch (err) {
    console.error("❌ [ERRO] Salvar registro:", err.message);
    res.status(500).json({ erro: "Erro ao salvar registro" });
  }
});

// 5. DELETE: Excluir um registro de serviço específico
app.delete("/api/servicos/registros/:id", async (req, res) => {
  const { id } = req.params;
  console.log(`🗑️ [DELETE] Excluindo registro ID: ${id}`);

  try {
    const conn = await dbMySQL.getConnection();
    // Verifica se o registro existe antes (opcional, mas boa prática)
    const [result] = await conn.query("DELETE FROM almo_servicos_registros WHERE id = ?", [id]);
    conn.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({ erro: "Registro não encontrado." });
    }

    res.json({ sucesso: true });
  } catch (err) {
    console.error("❌ [ERRO] Ao excluir registro:", err.message);
    res.status(500).json({ erro: "Erro ao excluir registro" });
  }
});



// 6. GET: Busca Global de Registros (Filtro Avançado)
app.get("/api/servicos/registros/busca", async (req, res) => {
  const { termo, mes, ano } = req.query;
  try {
    const conn = await dbMySQL.getConnection();
    let query = `
      SELECT r.*, t.nome as nome_servico 
      FROM almo_servicos_registros r
      JOIN almo_servicos_tipos t ON r.tipo_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (termo) {
      const likeTerm = `%${termo}%`;
      query += ` AND (r.descricao LIKE ? OR r.local_servico LIKE ? OR t.nome LIKE ?)`;
      params.push(likeTerm, likeTerm, likeTerm);
    }

    if (mes) {
      query += ` AND MONTH(r.data_servico) = ?`;
      params.push(mes);
    }

    if (ano) {
      query += ` AND YEAR(r.data_servico) = ?`;
      params.push(ano);
    }

    query += ` ORDER BY r.data_servico DESC`;

    const [resultados] = await conn.query(query, params);
    conn.release();
    res.json(resultados);
  } catch (err) {
    console.error("❌ [ERRO] Busca global:", err);
    res.status(500).json({ erro: "Erro na busca" });
  }
});

// 7. GET: Buscar Próximos Retornos (Relatório)
app.get("/api/servicos/registros/retornos", async (req, res) => {
  try {
    const conn = await dbMySQL.getConnection();
    // Busca retornos próximos (ex: data_retorno >= hoje)
    const [retornos] = await conn.query(`
      SELECT r.*, t.nome as nome_servico 
      FROM almo_servicos_registros r
      JOIN almo_servicos_tipos t ON r.tipo_id = t.id
      WHERE r.data_retorno IS NOT NULL 
      AND r.data_retorno >= CURDATE()
      ORDER BY r.data_retorno ASC
      LIMIT 50
    `);
    conn.release();
    res.json(retornos);
  } catch (err) {
    console.error("❌ [ERRO] Buscar retornos:", err.message);
    res.status(500).json({ erro: "Erro ao buscar previsões de retorno" });
  }
});

// =========================================================================
// 💰 ROTAS DO CONTROLE FINANCEIRO (CONTAS A PAGAR)
// =========================================================================

// 1. GET: Listar Lançamentos (com Filtros)
app.get("/api/financeiro/lancamentos", async (req, res) => {
  const { mes, ano, busca, dataVencimento } = req.query;

  try {
    const conn = await dbMySQL.getConnection();

    let query = `
            SELECT distinct l.*
            FROM almo_financeiro_lancamentos l
            LEFT JOIN almo_financeiro_vencimentos v ON l.id = v.lancamento_id
            WHERE 1=1
        `;
    const params = [];

    // Filtro Mês/Ano (pela Data de Emissão OU Vencimento?)
    // Por padrão interface filtra emissão, mas vamos manter assim por enquanto
    if (mes) {
      query += ` AND MONTH(l.emissao) = ?`;
      params.push(mes);
    }
    if (ano) {
      query += ` AND YEAR(l.emissao) = ?`;
      params.push(ano);
    }

    // Filtro de Busca (Texto ou Data Específica de Vencimento)
    if (busca) {
      const termoLike = `%${busca}%`;
      // Verifica se a busca é uma data válida DD/MM/YYYY
      const regexData = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      const matchData = busca.match(regexData);

      if (matchData || dataVencimento) {
        // Se for data, busca na tabela de VENCIMENTOS
        let dataIso = dataVencimento;
        if (!dataIso && matchData) {
          dataIso = `${matchData[3]}-${matchData[2]}-${matchData[1]}`;
        }
        query += ` AND v.data_vencimento = ?`;
        params.push(dataIso);
      } else {
        // Busca textual normal
        // Prepara termo para busca de valor (troca vírgula por ponto para o banco)
        let termoValor = termoLike;
        if (busca.includes(',')) {
          termoValor = `%${busca.replace(',', '.')}%`;
        }

        query += ` AND (l.razao_social LIKE ? OR l.nf LIKE ? OR l.natureza LIKE ? OR l.estabelecimento LIKE ? OR l.destino LIKE ? OR l.valor_total LIKE ?)`;
        params.push(termoLike, termoLike, termoLike, termoLike, termoLike, termoValor);
      }
    }

    query += ` ORDER BY l.emissao DESC`;

    const [lancamentos] = await conn.query(query, params);

    if (lancamentos.length > 0) {
      const ids = lancamentos.map(l => l.id);

      const [todosVencimentos] = await conn.query(`
                SELECT lancamento_id, mes_referencia, data_vencimento 
                FROM almo_financeiro_vencimentos 
                WHERE lancamento_id IN (?)
            `, [ids]);

      const vencimentosPorLancamento = {};
      todosVencimentos.forEach(v => {
        if (!vencimentosPorLancamento[v.lancamento_id]) {
          vencimentosPorLancamento[v.lancamento_id] = [];
        }
        vencimentosPorLancamento[v.lancamento_id].push(v);
      });

      for (const lancamento of lancamentos) {
        const vencimentos = vencimentosPorLancamento[lancamento.id] || [];
        const mapaVencimentos = {};

        vencimentos.forEach(v => {
          if (v.data_vencimento) {
            const d = new Date(v.data_vencimento);
            const dia = String(d.getDate()).padStart(2, '0');
            const mes = String(d.getMonth() + 1).padStart(2, '0');
            const ano = String(d.getFullYear()).slice(-2);
            mapaVencimentos[v.mes_referencia] = `${dia}/${mes}/${ano}`;
          }
        });

        lancamento.vencimentos = mapaVencimentos;
      }
    }

    conn.release();
    res.json(lancamentos);
  } catch (err) {
    console.error("❌ [ERRO] Financeiro GET:", err);
    res.status(500).json({ erro: "Erro ao buscar lançamentos financeiros" });
  }
});

// NOVA ROTA: Relatório de Vencimentos (Próximos 15 dias)
app.get("/api/financeiro/relatorio-vencimentos", async (req, res) => {
  try {
    const conn = await dbMySQL.getConnection();

    // Data de hoje e hoje + 15
    const hoje = new Date().toISOString().split('T')[0];
    const limite = new Date();
    limite.setDate(limite.getDate() + 15);
    const limiteIso = limite.toISOString().split('T')[0];

    const query = `
      SELECT 
        l.razao_social,
        l.nf,
        l.natureza,
        l.estabelecimento,
        l.destino,
        l.valor_total,
        v.data_vencimento,
        v.mes_referencia
      FROM almo_financeiro_vencimentos v
      JOIN almo_financeiro_lancamentos l ON v.lancamento_id = l.id
      WHERE v.data_vencimento >= ? AND v.data_vencimento <= ?
      ORDER BY v.data_vencimento ASC
    `;

    const [resultados] = await conn.query(query, [hoje, limiteIso]);
    conn.release();
    res.json(resultados);

  } catch (err) {
    console.error("Erro relatório vencimentos:", err);
    res.status(500).json({ erro: "Erro ao gerar relatório" });
  }
});

// NOVA ROTA: Verificar se NF já existe
app.get("/api/financeiro/verificar-nf", async (req, res) => {
  const { nf } = req.query;
  if (!nf) return res.json({ existe: false });
  try {
    const conn = await dbMySQL.getConnection();
    const [rows] = await conn.query("SELECT id FROM almo_financeiro_lancamentos WHERE nf = ? LIMIT 1", [nf.trim()]);
    conn.release();
    res.json({ existe: rows.length > 0 });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao verificar NF" });
  }
});

// 2. POST: Criar Novo Lançamento Financeiro
app.post("/api/financeiro/lancamentos", async (req, res) => {
  const { razaoSocial, nf, emissao, valor, formaPagamento, natureza, destino, estabelecimento, vencimentos } = req.body;

  const conn = await dbMySQL.getConnection();
  try {
    await conn.beginTransaction();

    // Insere o Pai (Lançamento)
    const [result] = await conn.query(`
      INSERT INTO almo_financeiro_lancamentos 
      (razao_social, nf, emissao, valor_total, forma_pagamento, natureza, destino, estabelecimento)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [razaoSocial, nf, emissao, valor, formaPagamento, natureza, destino, estabelecimento]);

    const lancamentoId = result.insertId;

    // Insere os Filhos (Vencimentos)
    // O objeto 'vencimentos' vem como { jan: "dd/mm/aa", fev: "..." }
    for (const [mes, dataStr] of Object.entries(vencimentos)) {
      if (dataStr && dataStr.trim() !== "") {
        // Converter dd/mm/aa para YYYY-MM-DD
        const partes = dataStr.split('/');
        if (partes.length === 3) {
          // Assumindo ano 20xx
          const dataIso = `20${partes[2]}-${partes[1]}-${partes[0]}`;
          await conn.query(`
                    INSERT INTO almo_financeiro_vencimentos (lancamento_id, mes_referencia, data_vencimento)
                    VALUES (?, ?, ?)
                `, [lancamentoId, mes, dataIso]);
        }
      }
    }

    await conn.commit();
    conn.release();
    res.json({ sucesso: true, id: lancamentoId });

  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error("❌ [ERRO] Financeiro POST:", err);
    res.status(500).json({ erro: "Erro ao salvar lançamento financeiro" });
  }
});

// 3. DELETE: Excluir Lançamento
app.delete("/api/financeiro/lancamentos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const conn = await dbMySQL.getConnection();
    // O CASCADE configurado no banco já deleta os vencimentos filhos
    await conn.query("DELETE FROM almo_financeiro_lancamentos WHERE id = ?", [id]);
    conn.release();
    res.json({ sucesso: true });
  } catch (err) {
    console.error("❌ [ERRO] Financeiro DELETE:", err);
    res.status(500).json({ erro: "Erro ao excluir lançamento" });
  }
});



// =========================================================================
// 🏷️ ROTAS DE CADASTROS AUXILIARES (LOCAIS/DESTINOS)
// =========================================================================

// GET: Listar todos
app.get("/api/financeiro/cadastros", async (req, res) => {
  try {
    const conn = await dbMySQL.getConnection();
    const [rows] = await conn.query("SELECT * FROM almo_financeiro_cadastros ORDER BY nome ASC");
    conn.release();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao listar cadastros" });
  }
});

// POST: Criar novo
app.post("/api/financeiro/cadastros", async (req, res) => {
  const { tipo, nome } = req.body;
  if (!tipo || !nome) return res.status(400).json({ erro: "Dados incompletos" });

  try {
    const conn = await dbMySQL.getConnection();
    await conn.query("INSERT INTO almo_financeiro_cadastros (tipo, nome) VALUES (?, ?)", [tipo, nome]);
    conn.release();
    res.json({ sucesso: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao criar cadastro" });
  }
});

// DELETE: Remover cadastro
app.delete("/api/financeiro/cadastros/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const conn = await dbMySQL.getConnection();
    await conn.query("DELETE FROM almo_financeiro_cadastros WHERE id = ?", [id]);
    conn.release();
    res.json({ sucesso: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao remover cadastro" });
  }
});


// =========================================================================
// 📅 ROTAS DO CONTROLE SEMANAL (CAIXINHA)
// =========================================================================

// 1. GET: Buscar Semana Atual (Aberta)
app.get("/api/financeiro/semanal/atual", async (req, res) => {
  try {
    const conn = await dbMySQL.getConnection();

    // Tenta achar uma semana ABERTA
    const [semanas] = await conn.query("SELECT * FROM almo_financeiro_semanas WHERE status = 'ABERTO' ORDER BY id DESC LIMIT 1");

    if (semanas.length === 0) {
      conn.release();
      return res.json({ semanaAberta: false });
    }

    const semana = semanas[0];

    // Busca os itens (movimentações) dessa semana
    const [movimentacoes] = await conn.query("SELECT * FROM almo_financeiro_movimentos WHERE semana_id = ? ORDER BY data_movimento DESC, id DESC", [semana.id]);

    // 💡 RECALCULO DE SEGURANÇA (Auto-Healing)
    // O saldo deve ser exatamente a soma das entradas - saídas
    let totalEntradas = 0;
    let totalSaidas = 0;

    movimentacoes.forEach(m => {
      const val = Number(m.valor);
      if (m.tipo === 'ENTRADA') totalEntradas += val;
      else totalSaidas += val;
    });

    const saldoCalculado = totalEntradas - totalSaidas;
    semana.saldo_final = Number(saldoCalculado.toFixed(2));

    conn.release();
    res.json({
      semanaAberta: true,
      dadosSemana: semana,
      movimentacoes: movimentacoes
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar semana atual" });
  }
});

// 2. POST: Abrir Nova Semana
app.post("/api/financeiro/semanal/abrir", async (req, res) => {
  try {
    const conn = await dbMySQL.getConnection();

    // Verifica se já tem alguma aberta
    const [abertas] = await conn.query("SELECT id FROM almo_financeiro_semanas WHERE status = 'ABERTO'");
    if (abertas.length > 0) {
      conn.release();
      return res.status(400).json({ erro: "Já existe uma semana aberta. Feche-a antes de iniciar outra." });
    }

    const hoje = new Date();
    // Ajusta para remover horas e evitar problemas de fuso na comparação simples
    hoje.setHours(0, 0, 0, 0);

    // Lógica para pegar Segunda (1) e Sábado (6) da semana atual
    // getDay(): 0=Dom, 1=Seg, ..., 6=Sab
    const diaSemana = hoje.getDay();

    // Distância até segunda-feira
    // Se for Domingo (0), a segunda foi 6 dias atrás (-6)
    // Se for Segunda (1), a segunda é hoje (0)
    // Se for Terça (2), a segunda foi 1 dia atrás (-1)
    const diffSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;

    const dataInicio = new Date(hoje);
    dataInicio.setDate(hoje.getDate() + diffSegunda);

    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataInicio.getDate() + 5); // +5 dias a partir da segunda = Sábado

    // Formata para YYYY-MM-DD usando hora LOCAL para evitar erros de fuso (UTC)
    const toLocalISO = (d) => {
      const ano = d.getFullYear();
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const dia = String(d.getDate()).padStart(2, '0');
      return `${ano}-${mes}-${dia}`;
    };

    const isoInicio = toLocalISO(dataInicio);
    const isoFim = toLocalISO(dataFim);

    const saldoInicial = 1000.00; // Padrão solicitado

    // Cria a semana com as datas fixas (Segunda a Sábado)
    const [result] = await conn.query(`
            INSERT INTO almo_financeiro_semanas (data_inicio, data_fim, status, saldo_inicial, saldo_final)
            VALUES (?, ?, 'ABERTO', ?, ?)
        `, [isoInicio, isoFim, saldoInicial, saldoInicial]);

    const semanaId = result.insertId;

    // Cria automaticamente o movimento de 'Aporte Inicial'
    // Usa a data de inicio da semana para o movimento
    await conn.query(`
            INSERT INTO almo_financeiro_movimentos (semana_id, tipo, data_movimento, descricao, fornecedor, valor)
            VALUES (?, 'ENTRADA', ?, 'Aporte Inicial da Semana', 'Financeiro', ?)
        `, [semanaId, isoInicio, saldoInicial]);

    conn.release();
    res.json({ sucesso: true, semanaId });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao abrir semana" });
  }
});

// 3. POST: Adicionar Movimento (Gasto ou Aporte Extra)
app.post("/api/financeiro/semanal/movimento", async (req, res) => {
  const { semanaId, tipo, descricao, razaoSocial, fornecedor, nf, valor, data } = req.body;

  // Validação básica
  if (!semanaId || !valor || !tipo) return res.status(400).json({ erro: "Dados incompletos" });

  try {
    const conn = await dbMySQL.getConnection();

    // Insere o movimento
    await conn.query(`
            INSERT INTO almo_financeiro_movimentos (semana_id, tipo, data_movimento, descricao, fornecedor, nf, valor)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [semanaId, tipo, data, descricao || razaoSocial, fornecedor, nf, valor]);

    // Atualiza o saldo da semana (cache)
    if (tipo === 'ENTRADA') {
      await conn.query("UPDATE almo_financeiro_semanas SET saldo_final = saldo_final + ? WHERE id = ?", [valor, semanaId]);
    } else {
      // SAIDA
      await conn.query("UPDATE almo_financeiro_semanas SET saldo_final = saldo_final - ? WHERE id = ?", [valor, semanaId]);
    }

    conn.release();
    res.json({ sucesso: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao salvar movimento" });
  }
});

// 4. POST: Fechar Semana
app.post("/api/financeiro/semanal/fechar", async (req, res) => {
  const { semanaId } = req.body;
  try {
    const conn = await dbMySQL.getConnection();

    // Calcula totais reais para garantir integridade
    const [rows] = await conn.query(`
            SELECT 
                SUM(CASE WHEN tipo='ENTRADA' THEN valor ELSE 0 END) as total_ent,
                SUM(CASE WHEN tipo='SAIDA' THEN valor ELSE 0 END) as total_sai
            FROM almo_financeiro_movimentos WHERE semana_id = ?
        `, [semanaId]);

    const totalEnt = rows[0].total_ent || 0;
    const totalSai = rows[0].total_sai || 0;
    const saldoFinal = totalEnt - totalSai;

    // Atualiza a tabela semana
    await conn.query(`
            UPDATE almo_financeiro_semanas 
            SET status = 'FECHADO', 
                entrada_total = ?, saida_total = ?, saldo_final = ?
            WHERE id = ?
        `, [totalEnt, totalSai, saldoFinal, semanaId]);

    conn.release();
    res.json({ sucesso: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao fechar semana" });
  }
});

// 5. DELETE: Excluir Movimento Individual (E atualiza saldo)
app.delete("/api/financeiro/movimento/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const conn = await dbMySQL.getConnection();

    // 1. Apaga o movimento
    await conn.query("DELETE FROM almo_financeiro_movimentos WHERE id = ?", [id]);

    // 2. (Opcional, mas bom) O frontend vai pedir para recarregar a semana, 
    // e o endpoint GET /atual vai recalcular tudo sozinho. 
    // Então só apagar já resolve.

    conn.release();
    res.json({ sucesso: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao excluir movimento" });
  }
});

// =========================================================================
// DELETE: Excluir Semana (e seus movimentos)
app.delete("/api/financeiro/semanal/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const conn = await dbMySQL.getConnection();

    // Excluir movimentos primeiro
    await conn.query("DELETE FROM almo_financeiro_movimentos WHERE semana_id = ?", [id]);

    // Excluir a semana
    await conn.query("DELETE FROM almo_financeiro_semanas WHERE id = ?", [id]);

    conn.release();
    res.json({ sucesso: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao excluir semana." });
  }
});

// =========================================================================
// 📊 ROTA DO PAINEL DE GESTÃO (RELATÓRIO FINANCEIRO POR SETOR)
// =========================================================================
app.get("/api/relatorios/gastos-por-setor", async (req, res) => {
  const { mes, ano } = req.query; // Ex: mes=12, ano=2025

  try {
    const conn = await dbMySQL.getConnection();

    // Filtro de data dinâmico
    let filtroData = "";
    const params = [];

    if (mes && ano) {
      filtroData = "AND MONTH(s.criado_em) = ? AND YEAR(s.criado_em) = ?";
      params.push(mes, ano);
    } else if (ano) {
      filtroData = "AND YEAR(s.criado_em) = ?";
      params.push(ano);
    }

    const query = `
      SELECT 
        s.usuario AS setor,
        COUNT(DISTINCT s.id) AS total_pedidos,
        SUM(i.quantidade * COALESCE(i.valor_momento, 0)) AS total_gasto
      FROM almo_solicitacoes s
      JOIN almo_solicitacoes_itens i ON s.id = i.solicitacao_id
      WHERE s.status IN ('ATENDIDO', 'CONCLUIDO') 
      AND i.status_gestor = 'ATENDIDO'
      ${filtroData}
      GROUP BY s.usuario
      ORDER BY total_gasto DESC
    `;

    const [resultados] = await conn.query(query, params);

    conn.release();
    res.json(resultados);

  } catch (err) {
    console.error("Erro no relatório de gastos:", err);
    res.status(500).json({ erro: "Erro ao gerar relatório" });
  }
});


// 5. GET: Histórico de Semanas Fechadas (Com Busca e Filtros)
app.get("/api/financeiro/semanal/historico", async (req, res) => {
  const { search, mes, ano } = req.query;

  try {
    const conn = await dbMySQL.getConnection();

    let query = "SELECT DISTINCT s.* FROM almo_financeiro_semanas s LEFT JOIN almo_financeiro_movimentos m ON s.id = m.semana_id WHERE s.status = 'FECHADO'";
    const params = [];

    if (mes) {
      query += " AND (MONTH(s.data_inicio) = ? OR MONTH(s.data_fim) = ?)";
      params.push(mes, mes);
    }

    if (ano) {
      query += " AND (YEAR(s.data_inicio) = ? OR YEAR(s.data_fim) = ?)";
      params.push(ano, ano);
    }

    if (search) {
      const like = `%${search}%`;

      // Tenta interpretar o valor numérico (ex: "R$ 350,00" -> 350.00)
      let valorDeBusca = null;
      try {
        // Remove R$, espaços e pontos de milhar, troca vírgula por ponto
        const limpo = search.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
        if (!isNaN(limpo) && limpo !== "") {
          valorDeBusca = limpo;
        }
      } catch (e) { }

      // Busca nas datas da semana OU nas descrições/fornecedores dos movimentos
      let whereClause = " AND (s.data_inicio LIKE ? OR s.data_fim LIKE ? OR m.descricao LIKE ? OR m.fornecedor LIKE ? OR m.tipo LIKE ?";
      params.push(like, like, like, like, like);

      if (valorDeBusca) {
        // Se conseguiu converter para número, adiciona busca nos campos de valor
        // Usamos LIKE no CAST para permitir encontrar "350" em "350.00" se o banco retornar string, 
        // mas para garantir precisão em DECIMAL, o ideal é comparar range ou igualdade.
        // Dado o pedido "pesquisar tudo", vamos usar OR direto com tolerância ou conversão string.
        // Vou usar comparação direta para valores exatos e LIKE para aproximados convertidos.
        whereClause += " OR s.saldo_final = ? OR s.entrada_total = ? OR s.saida_total = ? OR m.valor = ?";
        params.push(valorDeBusca, valorDeBusca, valorDeBusca, valorDeBusca);
      }

      whereClause += ")";
      query += whereClause;
    }

    query += " ORDER BY s.id DESC LIMIT 50"; // Limitado para performance, mas com filtros ok

    const [semanas] = await conn.query(query, params);

    conn.release();
    res.json(semanas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar histórico" });
  }
});

// 6. GET: Movimentos Unificados (Para Relatório Geral Filtrado)
app.get("/api/financeiro/semanal/relatorio-unificado", async (req, res) => {
  const { search, mes, ano } = req.query; // Mesmos filtros

  try {
    const conn = await dbMySQL.getConnection();

    // Query base: todos os movimentos de semanas FECHADAS que batem com o filtro
    let query = `
            SELECT m.*, s.data_inicio as semana_inicio, s.data_fim as semana_fim 
            FROM almo_financeiro_movimentos m 
            JOIN almo_financeiro_semanas s ON m.semana_id = s.id 
            WHERE s.status = 'FECHADO'
        `;
    const params = [];

    if (mes) {
      query += " AND MONTH(m.data_movimento) = ?";
      params.push(mes);
    }
    if (ano) {
      query += " AND YEAR(m.data_movimento) = ?";
      params.push(ano);
    }
    if (search) {
      const like = `%${search}%`;
      query += " AND (s.data_inicio LIKE ? OR s.data_fim LIKE ? OR m.descricao LIKE ? OR m.fornecedor LIKE ? OR m.tipo LIKE ?)";
      params.push(like, like, like, like, like);
    }

    query += " ORDER BY m.data_movimento DESC, m.id DESC";

    const [movimentos] = await conn.query(query, params);

    conn.release();
    res.json(movimentos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao gerar relatório unificado" });
  }
});

// 7. GET: Buscar Detalhes de uma Semana (Pelo ID)
app.get("/api/financeiro/semanal/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const conn = await dbMySQL.getConnection();

    // Busca cabeçalho
    const [semanas] = await conn.query("SELECT * FROM almo_financeiro_semanas WHERE id = ?", [id]);
    if (semanas.length === 0) {
      conn.release();
      return res.status(404).json({ erro: "Semana não encontrada" });
    }

    // Busca movimentos
    const [movimentos] = await conn.query("SELECT * FROM almo_financeiro_movimentos WHERE semana_id = ? ORDER BY data_movimento DESC", [id]);

    conn.release();
    res.json({ semana: semanas[0], movimentos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar detalhes da semana" });
  }
});

// =========================================================================
// 🏢 CADASTROS AUXILIARES (DESTINOS E LOCAIS)
// =========================================================================

// GET: Listar todos
app.get("/api/financeiro/cadastros", async (req, res) => {
  try {
    const conn = await dbMySQL.getConnection();
    const [rows] = await conn.query("SELECT * FROM almo_financeiro_cadastros ORDER BY nome ASC");
    conn.release();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar cadastros" });
  }
});

// POST: Adicionar
app.post("/api/financeiro/cadastros", async (req, res) => {
  const { tipo, nome } = req.body;
  if (!tipo || !nome) return res.status(400).json({ erro: "Tipo e Nome obrigatórios" });

  try {
    const conn = await dbMySQL.getConnection();
    await conn.query("INSERT INTO almo_financeiro_cadastros (tipo, nome) VALUES (?, ?)", [tipo, nome]);
    conn.release();
    res.json({ sucesso: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao salvar cadastro" });
  }
});

// DELETE: Remover
app.delete("/api/financeiro/cadastros/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const conn = await dbMySQL.getConnection();
    await conn.query("DELETE FROM almo_financeiro_cadastros WHERE id = ?", [id]);
    conn.release();
    res.json({ sucesso: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao excluir cadastro" });
  }
});

const PORT = process.env.PORT || 4005;
app.listen(PORT, "0.0.0.0", () => {
  console.log("📢 Rotas de Serviços foram carregadas!");
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});