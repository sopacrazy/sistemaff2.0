import "dotenv/config";
import express from "express";
import sql from "mssql";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 4001;
const allowedOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";

app.use(
  cors({
    origin: allowedOrigin,
    methods: ["GET", "POST"],
  })
);

app.use(express.json());

// --- Configuração do Banco de Dados SQL Server ---
const sqlConfig = {
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  server: process.env.MSSQL_SERVER,
  database: process.env.MSSQL_DATABASE,
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === "true",
    trustServerCertificate: process.env.MSSQL_TRUST_SERVER_CERT === "true",
    connectionTimeout: parseInt(
      process.env.MSSQL_CONNECTION_TIMEOUT || "20000"
    ),
    requestTimeout: parseInt(process.env.MSSQL_REQUEST_TIMEOUT || "900000"),
  },
  pool: {
    max: parseInt(process.env.MSSQL_POOL_MAX || "10"),
    min: parseInt(process.env.MSSQL_POOL_MIN || "0"),
    idleTimeoutMillis: parseInt(process.env.MSSQL_POOL_IDLE_TIMEOUT || "30000"),
  },
};

let pool;
async function connectToDatabase() {
  try {
    pool = await sql.connect(sqlConfig);
    console.log("✅ Conexão com SQL Server estabelecida com sucesso!");
  } catch (err) {
    console.error("❌ ERRO ao conectar ao SQL Server:", err.message);
  }
}

connectToDatabase();

// Utils
const formatarDataParaProtheus = (dataISO) => {
  return dataISO.replace(/-/g, "");
};

const mapLocalCategoriaToCodes = (categoria) => {
  if (!categoria) return "";
  switch (categoria.toUpperCase()) {
    case "CEASA":
      return ["'01'", "'03'", "'04'", "'05'", "'06'", "'07'", "'09'"].join(
        ", "
      );
    case "DIST":
      return ["'02'"].join(", ");
    default:
      return "";
  }
};

const PRODUTOS_EXCLUIDOS_ARRAY = [
  "141.002",
  "141.007",
  "141.008",
  "499.005",
  "181.001",
  "499.009",
  "181.004",
];
const PRODUTOS_EXCLUIDOS_SQL = PRODUTOS_EXCLUIDOS_ARRAY.map(
  (p) => `'${p}'`
).join(",");
const EXCLUIR_PRODUTOS_CLAUSE = ` AND T5.Z5_CODPRO NOT IN (${PRODUTOS_EXCLUIDOS_SQL}) `;

// ==================================================================================
// ENDPOINTS MULTI-FILIAL
// ==================================================================================

// --- Endpoint 1: Dados de Pendências para o Dashboard (GET) ---
// 🚀 Atualizado para receber ?filial=XX na URL
const PENDENCIA_QUERY = `
    SELECT 
        T1.Z4_FILIAL AS filial, 
        T1.Z4_BILHETE AS id, 
        T1.Z4_DATA AS data, 
        T1.Z4_CLIENTE AS cod_cliente, 
        T1.Z4_NOMCLI AS cliente,
        T1.Z4_NOMVEN AS vendedor, 
        T1.Z4_TOTBIL AS valor,
        'Sem Nota' AS status
    FROM SZ4140 T1
    WHERE 
        T1.Z4_FILIAL = @filial  -- 🚀 FILIAL DINÂMICA
        AND T1.Z4_NOTA = '' 
        AND T1.D_E_L_E_T_ = ''
        AND T1.Z4_COND <> '991' 
        AND T1.Z4_DATA >= '20250101' 
`;

app.get("/api/dashboard/pendencias", async (req, res) => {
  if (!pool)
    return res.status(503).json({ error: "Servidor fora de serviço." }); // Pega a filial da Query String (ex: /api...?filial=04). Padrão '01'.

  const filial = req.query.filial || "01";

  try {
    const request = pool.request();
    request.input("filial", sql.VarChar, filial); // Bind do parâmetro

    const result = await request.query(PENDENCIA_QUERY);
    const formattedData = result.recordset.map((record) => ({
      id: record.id,
      data: record.data,
      cliente: record.cliente.trim(),
      vendedor: record.vendedor ? record.vendedor.trim() : "",
      valor: parseFloat(record.valor),
      descricao: "Venda de Mercadorias",
      status: record.status,
    }));
    res.json(formattedData);
  } catch (err) {
    console.error("Erro Pendências:", err.message);
    res.status(500).json({ error: "Erro SQL", details: err.message });
  }
});

// --- Endpoint 2: Consulta Detalhada de Pendências por Período (POST) ---
app.post("/api/consulta/pendencias", async (req, res) => {
  if (!pool)
    return res.status(503).json({ error: "Servidor fora de serviço." }); // 🚀 Recebe filial do body

  const {
    dataInicio,
    dataFim,
    local,
    page = 1,
    limit = 100,
    filial = "01",
  } = req.body;

  if (!dataInicio || !dataFim) {
    return res.status(400).json({ error: "Datas obrigatórias." });
  }

  const dataInicioProtheus = formatarDataParaProtheus(dataInicio);
  const dataFimProtheus = formatarDataParaProtheus(dataFim);
  const offset = (page - 1) * limit;

  const localCodes = mapLocalCategoriaToCodes(local);
  let localCondition = "";
  if (localCodes) localCondition = ` AND T1.Z4_LOCAL IN (${localCodes}) `;

  const CTE_DEFINITION = `
    WITH PedidosCorrigidos AS (
        SELECT 
            T1.Z4_FILIAL, 
            T1.Z4_BILHETE, 
            T1.Z4_DATA,
            T1.Z4_CLIENTE,  -- 🚀 NOVO CAMPO
            T1.Z4_COND,      -- 🚀 NOVO CAMPO
            T1.Z4_DESCOND,   -- 🚀 NOVO CAMPO
            T1.Z4_NOMCLI,
            T1.Z4_NOMVEN,
            T1.Z4_LOCAL,
            CAST(
                (SELECT SUM(T5.Z5_TOTAL) 
                 FROM SZ5140 T5
                 WHERE T5.Z5_FILIAL = T1.Z4_FILIAL -- Join correto
                   AND T5.Z5_BILHETE = T1.Z4_BILHETE
                   AND T5.Z5_DATA = T1.Z4_DATA
                   AND T5.D_E_L_E_T_ = ''
                   ${EXCLUIR_PRODUTOS_CLAUSE}
                ) 
            AS DECIMAL(18, 2)) AS valor_corrigido
        FROM SZ4140 T1
        WHERE 
            T1.Z4_FILIAL = @filial -- 🚀 FILIAL DINÂMICA
            AND T1.Z4_NOTA = ''
            AND T1.Z4_COND <> '991'
            AND T1.D_E_L_E_T_ = ''
            AND T1.Z4_DATA BETWEEN @dataInicio AND @dataFim 
            ${localCondition}
    )
  `;

  const CONSULTA_QUERY = `
    ${CTE_DEFINITION}
    SELECT COUNT(*) AS totalRegistros, ISNULL(SUM(valor_corrigido), 0) AS valorTotalGeral
    FROM PedidosCorrigidos WHERE valor_corrigido > 0;
    
    ${CTE_DEFINITION}
    SELECT * FROM PedidosCorrigidos
    WHERE valor_corrigido > 0 
    ORDER BY Z4_DATA DESC, Z4_BILHETE ASC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
  `;

  try {
    const request = pool.request();
    request.input("dataInicio", sql.VarChar, dataInicioProtheus);
    request.input("dataFim", sql.VarChar, dataFimProtheus);
    request.input("offset", sql.Int, offset);
    request.input("limit", sql.Int, limit);
    request.input("filial", sql.VarChar, filial); // 🚀 Bind da filial

    const result = await request.query(CONSULTA_QUERY);
    const stats = result.recordsets[0][0];
    const records = result.recordsets[1];

    const formattedData = records.map((record) => ({
      id: record.Z4_BILHETE,
      data: record.Z4_DATA, // 🚀 NOVOS CAMPOS MAPEADOS
      clienteCod: record.Z4_CLIENTE ? record.Z4_CLIENTE.trim() : "",
      condicaoCod: record.Z4_COND ? record.Z4_COND.trim() : "",
      condicaoDesc: record.Z4_DESCOND ? record.Z4_DESCOND.trim() : "", // FIM DOS NOVOS CAMPOS
      cliente: record.Z4_NOMCLI.trim(),
      vendedor: record.Z4_NOMVEN ? record.Z4_NOMVEN.trim() : "",
      local: record.Z4_LOCAL ? record.Z4_LOCAL.trim() : "",
      valor: parseFloat(record.valor_corrigido),
      descricao: "Venda de Mercadorias",
      status: "Sem Nota",
    }));

    res.json({
      totalRegistros: stats.totalRegistros,
      valorTotalGeral: stats.valorTotalGeral,
      dados: formattedData,
    });
  } catch (err) {
    console.error("Erro Consulta Detalhada:", err.message);
    res.status(500).json({ error: "Erro SQL", details: err.message });
  }
});

// --- Endpoint 2.1: Detalhes dos Itens do Pedido (GET) ---
app.get("/api/consulta/itens-pedido/:bilhete", async (req, res) => {
  if (!pool)
    return res.status(503).json({ error: "Servidor fora de serviço." });

  const { bilhete } = req.params;
  const filial = req.query.filial || "01"; // 🚀 Recebe via query param

  const ITENS_QUERY = `
    SELECT 
        Z5_BILHETE AS pedidoId, 
        Z5_CLIENTE AS clienteCod,
        Z5_DATA AS data, 
        Z5_CODPRO AS codpro, 
        Z5_DESPRO AS produtoNome, 
        CAST(Z5_QTDE AS DECIMAL(18, 2)) AS quantidade, 
        CAST(Z5_PRECO AS DECIMAL(18, 2)) AS precoUnitario,
        CAST(Z5_TOTAL AS DECIMAL(18, 2)) AS valorTotal, 
        Z5_UM AS um
    FROM SZ5140 T5 
    WHERE 
        T5.Z5_FILIAL = @filial -- 🚀 FILIAL DINÂMICA
        AND T5.Z5_BILHETE = @bilhete 
        AND T5.D_E_L_E_T_ = ''
        ${EXCLUIR_PRODUTOS_CLAUSE};
  `;

  try {
    const request = pool.request();
    request.input("bilhete", sql.VarChar(15), bilhete);
    request.input("filial", sql.VarChar, filial);

    const result = await request.query(ITENS_QUERY);
    const formattedData = result.recordset.map((record) => ({
      ...record,
      data: formatarDataParaProtheus(record.data),
      produtoNome: record.produtoNome.trim(),
      um: record.um.trim(),
    }));
    res.json(formattedData);
  } catch (err) {
    res.status(500).json({ error: "Erro SQL", details: err.message });
  }
});

// --- Endpoint 3: Estatísticas para Taxa de Conformidade (GET) ---
app.get("/api/dashboard/conformidade", async (req, res) => {
  if (!pool)
    return res.status(503).json({ error: "Servidor fora de serviço." });

  const filial = req.query.filial || "01"; // 🚀 Recebe via query param

  const hoje = new Date();
  const primeiroDiaDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const dataInicioProtheus = primeiroDiaDoMes
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  const CONFORMIDADE_QUERY = `
        SELECT
            SUM(CASE WHEN T1.Z4_NOTA = '' THEN 1 ELSE 0 END) AS semNota,
            SUM(CASE WHEN T1.Z4_NOTA <> '' THEN 1 ELSE 0 END) AS comNota,
            COUNT(*) AS totalGeral,
            ISNULL(SUM(CASE WHEN T1.Z4_NOTA = '' THEN T1.Z4_TOTBIL ELSE 0 END), 0) AS valorSemNota,
            ISNULL(SUM(CASE WHEN T1.Z4_NOTA <> '' THEN T1.Z4_TOTBIL ELSE 0 END), 0) AS valorComNota
        FROM SZ4140 T1
        WHERE T1.D_E_L_E_T_ = '' 
          AND T1.Z4_FILIAL = @filial -- 🚀 FILIAL DINÂMICA
          AND T1.Z4_COND <> '991'
          AND T1.Z4_DATA >= @dataInicioMes
        AND EXISTS (
            SELECT 1 FROM SZ5140 T5
            WHERE T5.Z5_BILHETE = T1.Z4_BILHETE AND T5.Z5_DATA = T1.Z4_DATA
            AND T5.Z5_FILIAL = T1.Z4_FILIAL AND T5.D_E_L_E_T_ = ''
            ${EXCLUIR_PRODUTOS_CLAUSE}
        );
    `;

  try {
    const request = pool.request();
    request.input("dataInicioMes", sql.VarChar, dataInicioProtheus);
    request.input("filial", sql.VarChar, filial);

    const result = await request.query(CONFORMIDADE_QUERY);
    const stats = result.recordset[0];
    res.json({
      semNota: parseInt(stats.semNota || 0),
      comNota: parseInt(stats.comNota || 0),
      totalGeral: parseInt(stats.totalGeral || 0),
      valorSemNota: parseFloat(stats.valorSemNota || 0),
      valorComNota: parseFloat(stats.valorComNota || 0),
    });
  } catch (err) {
    res.status(500).json({ error: "Erro SQL", details: err.message });
  }
});

// --- Endpoint 4: Consulta de Notas Fiscais (SF3) ---
app.post("/api/consulta/notas-fiscais", async (req, res) => {
  if (!pool)
    return res.status(503).json({ error: "Servidor fora de serviço." });

  const {
    dataInicio,
    dataFim,
    series,
    situacoes,
    comOuSemChave,
    page = 1,
    limit = 100,
    filial = "01",
  } = req.body;

  if (!dataInicio || !dataFim)
    return res.status(400).json({ error: "Range de data obrigatório." });

  const dataInicioProtheus = formatarDataParaProtheus(dataInicio);
  const dataFimProtheus = formatarDataParaProtheus(dataFim);
  const offset = (page - 1) * limit;

  const seriesList = series.map((s) => s.trim().replace(/'/g, "")).join("', '");
  const situacoesList = situacoes
    .map((s) => s.trim().replace(/'/g, "").replace(/"/g, ""))
    .join("', '");

  let chaveCondition = "";
  if (comOuSemChave === "com")
    chaveCondition = "AND (T1.F3_CHVNFE IS NOT NULL AND T1.F3_CHVNFE <> '')";
  else if (comOuSemChave === "sem")
    chaveCondition = "AND (T1.F3_CHVNFE IS NULL OR T1.F3_CHVNFE = '')";

  const NOTA_FISCAL_QUERY = `
        SELECT COUNT(*) AS totalRegistros
        FROM SF3140 T1
        INNER JOIN SA1140 T2 ON T1.F3_CLIEFOR = T2.A1_COD AND T1.F3_FILIAL = T2.A1_FILIAL 
        WHERE T1.F3_FILIAL = @filial -- 🚀 FILIAL DINÂMICA
          AND T1.D_E_L_E_T_ = '' AND T2.D_E_L_E_T_ = ''
          AND T1.F3_EMISSAO BETWEEN @dataInicio AND @dataFim
          AND T1.F3_SERIE IN ('${seriesList}')
          AND T1.F3_DESCRET IN ('${situacoesList}') 
          ${chaveCondition};

        SELECT
            T1.F3_NFISCAL AS nf,
            T1.F3_SERIE AS serie,
            T1.F3_CFO AS cfop,
            T1.F3_CLIEFOR AS clienteCodigo,
            T2.A1_NOME AS clienteNome, 
            T1.F3_EMISSAO AS emissao,
            T1.F3_VALCONT AS valorTotal,
            T1.F3_CHVNFE AS chaveNfe,
            T1.F3_DESCRET AS situacao, 
            T1.F3_OBSERV AS observacao
        FROM SF3140 T1
        INNER JOIN SA1140 T2 ON T1.F3_CLIEFOR = T2.A1_COD AND T1.F3_FILIAL = T2.A1_FILIAL 
        WHERE T1.F3_FILIAL = @filial -- 🚀 FILIAL DINÂMICA
          AND T1.D_E_L_E_T_ = '' AND T2.D_E_L_E_T_ = ''
          AND T1.F3_EMISSAO BETWEEN @dataInicio AND @dataFim
          AND T1.F3_SERIE IN ('${seriesList}')
          AND T1.F3_DESCRET IN ('${situacoesList}') 
          ${chaveCondition} 
        ORDER BY T1.F3_EMISSAO DESC, T1.F3_NFISCAL ASC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `;

  try {
    const request = pool.request();
    request.input("dataInicio", sql.VarChar, dataInicioProtheus);
    request.input("dataFim", sql.VarChar, dataFimProtheus);
    request.input("offset", sql.Int, offset);
    request.input("limit", sql.Int, limit);
    request.input("filial", sql.VarChar, filial);

    const result = await request.query(NOTA_FISCAL_QUERY);
    const records = result.recordsets[1];

    const formattedData = records.map((record) => ({
      nf: record.nf.trim(),
      serie: record.serie.trim(),
      clienteNome: record.clienteNome.trim(),
      clienteCodigo: record.clienteCodigo.trim(),
      cfop: record.cfop.trim(),
      emissao: record.emissao,
      valorTotal: parseFloat(record.valorTotal),
      chaveNfe: record.chaveNfe ? record.chaveNfe.trim() : "",
      situacao: record.situacao ? record.situacao.trim() : "",
      observacao: record.observacao ? record.observacao.trim() : "",
    }));

    res.json({
      totalRegistros: result.recordsets[0][0].totalRegistros,
      dados: formattedData,
    });
  } catch (err) {
    res.status(500).json({ error: "Erro SQL", details: err.message });
  }
});

// --- Endpoint 6: Relatório de Notas Faltantes (SF2) ---
app.post("/api/relatorios/notas-faltantes", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Sem conexão DB." });

  const { dataInicio, dataFim, serie, filial = "01" } = req.body; // 🚀 Recebe filial

  if (!dataInicio || !dataFim || !serie)
    return res.status(400).json({ error: "Filtros incompletos." });

  const dataInicioProtheus = formatarDataParaProtheus(dataInicio);
  const dataFimProtheus = formatarDataParaProtheus(dataFim);

  const QUERY_SEQUENCIA = `
    SELECT CAST(F2_DOC AS BIGINT) as numero, F2_DOC as doc_original
    FROM SF2140 T1
    WHERE T1.D_E_L_E_T_ = ''
      AND T1.F2_FILIAL = @filial -- 🚀 FILIAL DINÂMICA
      AND T1.F2_SERIE = @serie
      AND T1.F2_EMISSAO BETWEEN @dataInicio AND @dataFim
    ORDER BY CAST(F2_DOC AS BIGINT) ASC
  `;

  try {
    const request = pool.request();
    request.input("dataInicio", sql.VarChar, dataInicioProtheus);
    request.input("dataFim", sql.VarChar, dataFimProtheus);
    request.input("serie", sql.VarChar, serie);
    request.input("filial", sql.VarChar, filial);

    const result = await request.query(QUERY_SEQUENCIA);
    const notas = result.recordset;
    const faltantes = [];

    if (notas.length > 1) {
      let anterior = Number(notas[0].numero);
      for (let i = 1; i < notas.length; i++) {
        const atual = Number(notas[i].numero);
        if (atual - anterior > 1) {
          for (let k = anterior + 1; k < atual; k++) {
            faltantes.push({
              numero: k,
              serie: serie,
              status: "CANCELADA NO ERP",
              intervalo: `Entre ${anterior} e ${atual}`,
            });
          }
        }
        anterior = atual;
      }
    }
    res.json(faltantes);
  } catch (err) {
    res.status(500).json({ error: "Erro SQL", details: err.message });
  }
});

/// --- Endpoint 8: Relatório PIS/COFINS (Entradas/Saídas) ---
app.post("/api/relatorios/pis-cofins", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Sem conexão DB" });

  const {
    dataInicio,
    dataFim,
    nota,
    apenasPis,
    apenasCofins,
    tipo = "saida",
    page = 1,
    limit = 100,
    filial = "01",
  } = req.body; // 🚀 Recebe filial

  const offset = (page - 1) * limit;
  console.log("Pagination/Filial:", { offset, limit, filial }); // 💡 Loga a paginação e filial

  const isSaida = tipo === "saida";
  const tabela = isSaida ? "SD2140" : "SD1140";
  const P = isSaida ? "D2" : "D1";

  let filtros = ` AND T1.${P}_FILIAL = @filial `;

  if (nota) {
    filtros += ` AND T1.${P}_DOC = @nota `;
  } else {
    if (!dataInicio || !dataFim) {
      console.log("Filtros incompletos: dataInicio ou dataFim faltando.");
      return res.status(400).json({ error: "Filtros incompletos" });
    }
    const dIni = formatarDataParaProtheus(dataInicio);
    const dFim = formatarDataParaProtheus(dataFim);
    filtros += ` AND T1.${P}_EMISSAO BETWEEN '${dIni}' AND '${dFim}' `;
  }

  if (apenasPis) filtros += ` AND T1.${P}_VALIMP5 > 0 `;
  if (apenasCofins) filtros += ` AND T1.${P}_VALIMP6 > 0 `;

  const QUERY_PIS_COFINS = `
        -- CORREÇÃO APLICADA: Contagem de itens únicos (Nota + Produto) com concatenação robusta
        SELECT COUNT(DISTINCT T1.${P}_DOC + T1.${P}_COD) AS totalRegistros 
        FROM ${tabela} T1 
        WHERE T1.D_E_L_E_T_ = '' ${filtros};

        SELECT 
            T1.${P}_EMISSAO as emissao, T1.${P}_DOC as nota, T1.${P}_SERIE as serie, 
            T1.${P}_COD as produto, T2.B1_DESC as descricao, T1.${P}_TES as tes,
            T3.F4_CSTPIS as cstPis, T3.F4_CSTCOF as cstCofins,
            T1.${P}_CF as cfop, T1.${P}_TOTAL as valorTotal, 
            T1.${P}_BASIMP5 as basePIS, T1.${P}_ALQIMP5 as aliqPIS, T1.${P}_VALIMP5 as valPIS,
            T1.${P}_BASIMP6 as baseCOFINS, T1.${P}_ALQIMP6 as aliqCOFINS, T1.${P}_VALIMP6 as valCOFINS
        FROM ${tabela} T1
        LEFT JOIN SB1140 T2 ON T2.B1_COD = T1.${P}_COD AND T2.D_E_L_E_T_ = ''
        LEFT JOIN SF4140 T3 ON T3.F4_CODIGO = T1.${P}_TES AND T3.D_E_L_E_T_ = ''
        WHERE T1.D_E_L_E_T_ = '' ${filtros} 
        ORDER BY T1.${P}_EMISSAO DESC, T1.${P}_DOC ASC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `;

  try {
    const request = pool.request();
    if (nota) request.input("nota", sql.VarChar, nota);
    request.input("offset", sql.Int, offset);
    request.input("limit", sql.Int, limit);
    request.input("filial", sql.VarChar, filial);

    const result = await request.query(QUERY_PIS_COFINS);
    const records = result.recordsets[1];

    const formattedData = records.map((row) => ({
      ...row,
      emissao: formatarDataParaProtheus(row.emissao),
      descricao: row.descricao ? row.descricao.trim() : "PRODUTO SEM DESCRIÇÃO",
      cstPis: row.cstPis ? row.cstPis.trim() : "",
      cstCofins: row.cstCofins ? row.cstCofins.trim() : "",
      valorTotal: parseFloat(row.valorTotal || 0),
      basePIS: parseFloat(row.basePIS || 0),
      valPIS: parseFloat(row.valPIS || 0),
      baseCOFINS: parseFloat(row.baseCOFINS || 0),
      valCOFINS: parseFloat(row.valCOFINS || 0),
    }));

    res.json({
      totalRegistros: result.recordsets[0][0].totalRegistros,
      dados: formattedData,
    });
  } catch (err) {
    res.status(500).json({
      error: "Erro SQL ao buscar relatório PIS/COFINS",
      details: err.message,
    });
  }
});

// --- Endpoint 9: Consulta de Produtos (SB1) ---
app.post("/api/consulta/produtos", async (req, res) => {
  if (!pool)
    return res.status(503).json({ error: "Servidor fora de serviço." });

  const {
    codigo,
    descricao,
    filtroBloqueio,
    filtroTipo,
    filtroTE,
    filtroTS,
    page = 1,
    limit = 100,
  } = req.body;

  const offset = (page - 1) * limit;

  // Condição base
  let whereCondition = `T1.D_E_L_E_T_ = ''`;

  // Adiciona filtro por código (busca exata)
  if (codigo) {
    whereCondition += ` AND T1.B1_COD = @codigo `;
  }

  // Adiciona filtro por descrição (busca parcial/LIKE)
  if (descricao) {
    whereCondition += ` AND T1.B1_DESC LIKE @descricaoLike `;
  }

  // 🚀 LÓGICA DO FILTRO DE BLOQUEIO (B1_MSBLQL)
  if (filtroBloqueio === "1") {
    // Bloqueado
    whereCondition += ` AND T1.B1_MSBLQL = '1' `;
  } else if (filtroBloqueio === "2") {
    // Desbloqueado ('' ou '2')
    whereCondition += ` AND (T1.B1_MSBLQL = '' OR T1.B1_MSBLQL = '2') `;
  }

  // 🚀 LÓGICA DO FILTRO DE TIPO (B1_TIPO)
  if (filtroTipo) {
    whereCondition += ` AND T1.B1_TIPO = @filtroTipo `;
  }

  // 🚀 LÓGICA DO FILTRO TE (B1_TE)
  if (filtroTE) {
    whereCondition += ` AND T1.B1_TE = @filtroTE `;
  }

  // 🚀 LÓGICA DO FILTRO TS (B1_TS)
  if (filtroTS) {
    whereCondition += ` AND T1.B1_TS = @filtroTS `;
  }

  // 1. Query para contagem total de registros
  const COUNT_QUERY = `
    SELECT COUNT(*) AS totalRegistros 
    FROM SB1140 T1
    WHERE ${whereCondition};
  `;

  // 2. Query para buscar os dados paginados
  const DATA_QUERY = `
    SELECT 
        T1.B1_COD, 
        T1.B1_DESC, 
        T1.B1_TIPO, 
        T1.B1_POSIPI, 
        T1.B1_TE, 
        T1.B1_TS, 
        T1.B1_MSBLQL, 
        T1.B1_CONTA, 
        T1.B1_ORIGEM, 
        T1.B1_CLASFIS 
    FROM SB1140 T1
    WHERE ${whereCondition}
    ORDER BY T1.B1_COD ASC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
  `;

  try {
    const request = pool.request();
    request.input("offset", sql.Int, offset);
    request.input("limit", sql.Int, limit);

    if (codigo) {
      request.input("codigo", sql.VarChar, codigo.trim().toUpperCase());
    }
    if (descricao) {
      request.input(
        "descricaoLike",
        sql.VarChar,
        `%${descricao.trim().toUpperCase()}%`
      );
    }
    // 🚀 BINDING DOS NOVOS PARÂMETROS
    if (filtroTipo) {
      request.input("filtroTipo", sql.VarChar, filtroTipo.trim().toUpperCase());
    }
    if (filtroTE) {
      request.input("filtroTE", sql.VarChar, filtroTE.trim().toUpperCase());
    }
    if (filtroTS) {
      request.input("filtroTS", sql.VarChar, filtroTS.trim().toUpperCase());
    }

    // Executa a contagem e a busca dos dados
    const countResult = await request.query(COUNT_QUERY);
    const dataResult = await request.query(DATA_QUERY);

    const totalRegistros = countResult.recordset[0].totalRegistros;

    // Formata a saída, removendo espaços em branco das strings
    const formattedData = dataResult.recordset.map((record) => ({
      B1_COD: record.B1_COD ? record.B1_COD.trim() : "",
      B1_DESC: record.B1_DESC ? record.B1_DESC.trim() : "",
      B1_TIPO: record.B1_TIPO ? record.B1_TIPO.trim() : "",
      B1_POSIPI: record.B1_POSIPI ? record.B1_POSIPI.trim() : "",
      B1_TE: record.B1_TE ? record.B1_TE.trim() : "",
      B1_TS: record.B1_TS ? record.B1_TS.trim() : "",
      B1_MSBLQL: record.B1_MSBLQL ? record.B1_MSBLQL.trim() : "",
      B1_CONTA: record.B1_CONTA ? record.B1_CONTA.trim() : "",
      B1_ORIGEM: record.B1_ORIGEM ? record.B1_ORIGEM.trim() : "",
      B1_CLASFIS: record.B1_CLASFIS ? record.B1_CLASFIS.trim() : "",
    }));

    res.json({
      totalRegistros: totalRegistros,
      dados: formattedData,
    });
  } catch (err) {
    console.error("Erro Consulta Produtos:", err.message);
    res.status(500).json({ error: "Erro SQL", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor Multi-Filial rodando em http://localhost:${PORT}`);
});
