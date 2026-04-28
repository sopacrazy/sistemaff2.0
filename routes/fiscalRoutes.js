const express = require("express");
const sql = require("mssql");

module.exports = (getPool, dbMySQL) => {


  const router = express.Router();

  // Utils
  const formatarDataParaProtheus = (dataISO) => {
    return dataISO.replace(/-/g, "");
  };

  const mapLocalCategoriaToCodes = (categoria) => {
    if (!categoria) return "";
    switch (categoria.toUpperCase()) {
      case "CEASA":
        return ["'01'", "'03'", "'04'", "'05'", "'06'", "'07'", "'09'"].join(", ");
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
  const PRODUTOS_EXCLUIDOS_SQL = PRODUTOS_EXCLUIDOS_ARRAY.map((p) => `'${p}'`).join(",");
  const EXCLUIR_PRODUTOS_CLAUSE = ` AND T5.Z5_CODPRO NOT IN (${PRODUTOS_EXCLUIDOS_SQL}) `;

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
        T1.Z4_FILIAL = @filial
        AND T1.Z4_NOTA = '' 
        AND T1.D_E_L_E_T_ = ''
        AND T1.Z4_COND <> '991' 
        AND T1.Z4_DATA >= '20250101' 
  `;

  router.get("/dashboard/pendencias", async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: "Servidor fora de serviço." });
    const filial = req.query.filial || "01";

    try {
      const request = pool.request();
      request.input("filial", sql.VarChar, filial);

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

  router.post("/consulta/pendencias", async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: "Servidor fora de serviço." });

    const { dataInicio, dataFim, local, page = 1, limit = 100, filial = "01" } = req.body;

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
              T1.Z4_CLIENTE,
              T1.Z4_COND,
              T1.Z4_DESCOND,
              T1.Z4_NOMCLI,
              T1.Z4_NOMVEN,
              T1.Z4_LOCAL,
              CAST(
                  (SELECT SUM(T5.Z5_TOTAL) 
                   FROM SZ5140 T5
                   WHERE T5.Z5_FILIAL = T1.Z4_FILIAL
                     AND T5.Z5_BILHETE = T1.Z4_BILHETE
                     AND T5.Z5_DATA = T1.Z4_DATA
                     AND T5.D_E_L_E_T_ = ''
                     ${EXCLUIR_PRODUTOS_CLAUSE}
                  ) 
              AS DECIMAL(18, 2)) AS valor_corrigido
          FROM SZ4140 T1
          WHERE 
              T1.Z4_FILIAL = @filial
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
      request.input("filial", sql.VarChar, filial);

      const result = await request.query(CONSULTA_QUERY);
      const stats = result.recordsets[0][0];
      const records = result.recordsets[1];

      const formattedData = records.map((record) => ({
        id: record.Z4_BILHETE,
        data: record.Z4_DATA,
        clienteCod: record.Z4_CLIENTE ? record.Z4_CLIENTE.trim() : "",
        condicaoCod: record.Z4_COND ? record.Z4_COND.trim() : "",
        condicaoDesc: record.Z4_DESCOND ? record.Z4_DESCOND.trim() : "",
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

  router.get("/consulta/itens-pedido/:bilhete", async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: "Servidor fora de serviço." });

    const { bilhete } = req.params;
    const filial = req.query.filial || "01";

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
          T5.Z5_FILIAL = @filial
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

  router.get("/dashboard/conformidade", async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: "Servidor fora de serviço." });

    const filial = req.query.filial || "01";

    const hoje = new Date();
    const primeiroDiaDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const dataInicioProtheus = primeiroDiaDoMes.toISOString().slice(0, 10).replace(/-/g, "");

    const CONFORMIDADE_QUERY = `
      SELECT
          SUM(CASE WHEN T1.Z4_NOTA = '' THEN 1 ELSE 0 END) AS semNota,
          SUM(CASE WHEN T1.Z4_NOTA <> '' THEN 1 ELSE 0 END) AS comNota,
          COUNT(*) AS totalGeral,
          ISNULL(SUM(CASE WHEN T1.Z4_NOTA = '' THEN T1.Z4_TOTBIL ELSE 0 END), 0) AS valorSemNota,
          ISNULL(SUM(CASE WHEN T1.Z4_NOTA <> '' THEN T1.Z4_TOTBIL ELSE 0 END), 0) AS valorComNota
      FROM SZ4140 T1
      WHERE T1.D_E_L_E_T_ = '' 
        AND T1.Z4_FILIAL = @filial
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

  router.post("/consulta/notas-fiscais", async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: "Servidor fora de serviço." });

    const { dataInicio, dataFim, series, situacoes, comOuSemChave, page = 1, limit = 100, filial = "01" } = req.body;

    if (!dataInicio || !dataFim) return res.status(400).json({ error: "Range de data obrigatório." });

    const dataInicioProtheus = formatarDataParaProtheus(dataInicio);
    const dataFimProtheus = formatarDataParaProtheus(dataFim);
    const offset = (page - 1) * limit;

    const seriesList = series.map((s) => s.trim().replace(/'/g, "")).join("', '");
    const situacoesList = situacoes.map((s) => s.trim().replace(/'/g, "").replace(/"/g, "")).join("', '");

    let chaveCondition = "";
    if (comOuSemChave === "com") chaveCondition = "AND (T1.F3_CHVNFE IS NOT NULL AND T1.F3_CHVNFE <> '')";
    else if (comOuSemChave === "sem") chaveCondition = "AND (T1.F3_CHVNFE IS NULL OR T1.F3_CHVNFE = '')";

    const NOTA_FISCAL_QUERY = `
      SELECT COUNT(*) AS totalRegistros
      FROM SF3140 T1
      INNER JOIN SA1140 T2 ON T1.F3_CLIEFOR = T2.A1_COD AND T1.F3_FILIAL = T2.A1_FILIAL 
      WHERE T1.F3_FILIAL = @filial
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
      WHERE T1.F3_FILIAL = @filial
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

  router.post("/relatorios/notas-faltantes", async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: "Sem conexão DB." });

    const { dataInicio, dataFim, serie, filial = "01" } = req.body;

    if (!dataInicio || !dataFim || !serie) return res.status(400).json({ error: "Filtros incompletos." });

    const dataInicioProtheus = formatarDataParaProtheus(dataInicio);
    const dataFimProtheus = formatarDataParaProtheus(dataFim);

    const QUERY_SEQUENCIA = `
      SELECT CAST(F2_DOC AS BIGINT) as numero, F2_DOC as doc_original
      FROM SF2140 T1
      WHERE T1.D_E_L_E_T_ = ''
        AND T1.F2_FILIAL = @filial
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

  router.post("/relatorios/pis-cofins", async (req, res) => {
    const pool = getPool();
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
    } = req.body;

    const offset = (page - 1) * limit;
    const isSaida = tipo === "saida";
    const tabela = isSaida ? "SD2140" : "SD1140";
    const P = isSaida ? "D2" : "D1";

    let filtros = ` AND T1.${P}_FILIAL = @filial `;

    if (nota) {
      filtros += ` AND T1.${P}_DOC = @nota `;
    } else {
      if (!dataInicio || !dataFim) return res.status(400).json({ error: "Filtros incompletos" });
      const dIni = formatarDataParaProtheus(dataInicio);
      const dFim = formatarDataParaProtheus(dataFim);
      filtros += ` AND T1.${P}_EMISSAO BETWEEN '${dIni}' AND '${dFim}' `;
    }

    if (apenasPis) filtros += ` AND T1.${P}_VALIMP5 > 0 `;
    if (apenasCofins) filtros += ` AND T1.${P}_VALIMP6 > 0 `;

    const QUERY_PIS_COFINS = `
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
      res.status(500).json({ error: "Erro SQL ao buscar relatório PIS/COFINS", details: err.message });
    }
  });

  router.post("/relatorios/funrural", async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: "Sem conexão DB" });

    const { dataInicio, dataFim, nota, filial = "01", tipoPessoa } = req.body;

    // 🆕 Buscar configurações do MySQL primeiro
    let inssP = 0.0120;
    let gilratP = 0.0010;
    let senarP = 0.0020;
    let listTES = "'130','141','222','224','225'";

    try {
      if (dbMySQL) {
        const [configRows] = await dbMySQL.promise().query("SELECT * FROM fiscal_config WHERE id = 1");
        if (configRows.length > 0) {
          inssP = parseFloat(configRows[0].inss_percent);
          gilratP = parseFloat(configRows[0].gilrat_percent);
          senarP = parseFloat(configRows[0].senar_percent);
          if (configRows[0].tes_list !== null) {
            const raw = configRows[0].tes_list.trim();
            listTES = raw ? raw.split(',').map(t => `'${t.trim()}'`).join(',') : "";
          }
        }
      }
    } catch (errConfig) {
      console.error("Erro ao buscar config fiscal, usando padrões:", errConfig);
    }

    let filtros = ` WHERE F3.F3_FILIAL = @filial AND F3.D_E_L_E_T_ = '' `;

    if (listTES && listTES !== "''") {
      filtros += ` AND D1.D1_TES IN (${listTES}) `;
    }

    if (nota) {
      filtros += ` AND F3.F3_NFISCAL = @nota `;
    } else {
      if (!dataInicio || !dataFim) {
        return res.status(400).json({ error: "Datas obrigatórias quando nota não informada." });
      }
      const dIni = formatarDataParaProtheus(dataInicio);
      const dFim = formatarDataParaProtheus(dataFim);
      filtros += ` AND D1.D1_EMISSAO BETWEEN '${dIni}' AND '${dFim}' `;
    }

    if (tipoPessoa && tipoPessoa !== "TODOS") {
      filtros += ` AND SA2.A2_TIPO = '${tipoPessoa}' `;
    }

    const QUERY_FUNRURAL = `
      SELECT 
          F3.F3_FILIAL,
          F3.F3_ENTRADA,
          F3.F3_NFISCAL,
          F3.F3_SERIE,
          F3.F3_CLIEFOR,
          F3.F3_LOJA,
          F3.F3_VALCONT,
          SA2.A2_NOME,
          SA2.A2_CGC,
          SA2.A2_TIPO,
          MAX(D1.D1_TES) as TES_USADA
      FROM SF3140 F3
      INNER JOIN SD1140 D1
          ON D1.D1_FILIAL  = F3.F3_FILIAL
         AND D1.D1_DOC     = F3.F3_NFISCAL
         AND D1.D1_SERIE   = F3.F3_SERIE
         AND D1.D1_FORNECE = F3.F3_CLIEFOR
         AND D1.D1_LOJA    = F3.F3_LOJA
         AND D1.D_E_L_E_T_ = ''
      LEFT JOIN SA2140 SA2
          ON SA2.A2_FILIAL = F3.F3_FILIAL
         AND SA2.A2_COD    = F3.F3_CLIEFOR
         AND SA2.A2_LOJA   = F3.F3_LOJA
         AND SA2.D_E_L_E_T_ = ''
      ${filtros}
      GROUP BY 
          F3.F3_FILIAL,
          F3.F3_ENTRADA,
          F3.F3_NFISCAL,
          F3.F3_SERIE,
          F3.F3_CLIEFOR,
          F3.F3_LOJA,
          F3.F3_VALCONT,
          SA2.A2_NOME,
          SA2.A2_CGC,
          SA2.A2_TIPO
      ORDER BY F3.F3_ENTRADA, F3.F3_NFISCAL
    `;

    try {

      const request = pool.request();
      if (nota) request.input("nota", sql.VarChar, nota);
      // dIni e dFim agora vão direto pro filtros string se nota não existir
      request.input("filial", sql.VarChar, filial);

      const result = await request.query(QUERY_FUNRURAL);
      
      const formattedData = result.recordset.map((row) => {
        const base = parseFloat(row.F3_VALCONT || 0);
        return {
          filial: row.F3_FILIAL.trim(),
          entrada: row.F3_ENTRADA,
          nota: row.F3_NFISCAL.trim(),
          serie: row.F3_SERIE.trim(),
          cliefor: row.F3_CLIEFOR.trim(),
          nomeFornecedor: row.A2_NOME ? row.A2_NOME.trim() : row.F3_CLIEFOR.trim(),
          cgc: row.A2_CGC ? row.A2_CGC.trim() : "N/A",
          tipoFornecedor: row.A2_TIPO ? row.A2_TIPO.trim() : "J",
          loja: row.F3_LOJA.trim(),
          total: base,
          base: base,
          tes: row.TES_USADA ? row.TES_USADA.trim() : "",
          inss: (row.TES_USADA && row.TES_USADA.trim() === '141') ? 0 : base * inssP,
          gilrat: (row.TES_USADA && row.TES_USADA.trim() === '141') ? 0 : base * gilratP,
          senar: base * senarP,
          valorFunrural: (row.TES_USADA && row.TES_USADA.trim() === '141') ? (base * senarP) : base * (inssP + gilratP + senarP),
          // 🆕 Porcentagens usadas (para o front mostrar no label)
          percInss: inssP,
          percGilrat: gilratP,
          percSenar: senarP
        };
      });

      res.json(formattedData);
    } catch (err) {
      console.error("Erro Funrural:", err.message);
      res.status(500).json({ error: "Erro SQL ao buscar relatório Funrural", details: err.message });
    }
  });

  router.post("/consulta/produtos", async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: "Servidor fora de serviço." });

    const { codigo, descricao, filtroBloqueio, filtroTipo, filtroTE, filtroTS, page = 1, limit = 100 } = req.body;
    const offset = (page - 1) * limit;

    let whereCondition = `T1.D_E_L_E_T_ = ''`;

    if (codigo) whereCondition += ` AND T1.B1_COD = @codigo `;
    if (descricao) whereCondition += ` AND T1.B1_DESC LIKE @descricaoLike `;

    if (filtroBloqueio === "1") whereCondition += ` AND T1.B1_MSBLQL = '1' `;
    else if (filtroBloqueio === "2") whereCondition += ` AND (T1.B1_MSBLQL = '' OR T1.B1_MSBLQL = '2') `;

    if (filtroTipo) whereCondition += ` AND T1.B1_TIPO = @filtroTipo `;
    if (filtroTE) whereCondition += ` AND T1.B1_TE = @filtroTE `;
    if (filtroTS) whereCondition += ` AND T1.B1_TS = @filtroTS `;

    const COUNT_QUERY = `SELECT COUNT(*) AS totalRegistros FROM SB1140 T1 WHERE ${whereCondition};`;
    const DATA_QUERY = `
      SELECT 
          T1.B1_COD, T1.B1_DESC, T1.B1_TIPO, T1.B1_POSIPI, T1.B1_TE, 
          T1.B1_TS, T1.B1_MSBLQL, T1.B1_CONTA, T1.B1_ORIGEM, T1.B1_CLASFIS 
      FROM SB1140 T1
      WHERE ${whereCondition}
      ORDER BY T1.B1_COD ASC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `;

    try {
      const request = pool.request();
      request.input("offset", sql.Int, offset);
      request.input("limit", sql.Int, limit);

      if (codigo) request.input("codigo", sql.VarChar, codigo.trim().toUpperCase());
      if (descricao) request.input("descricaoLike", sql.VarChar, `%${descricao.trim().toUpperCase()}%`);
      if (filtroTipo) request.input("filtroTipo", sql.VarChar, filtroTipo.trim().toUpperCase());
      if (filtroTE) request.input("filtroTE", sql.VarChar, filtroTE.trim().toUpperCase());
      if (filtroTS) request.input("filtroTS", sql.VarChar, filtroTS.trim().toUpperCase());

      const countResult = await request.query(COUNT_QUERY);
      const dataResult = await request.query(DATA_QUERY);

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

      res.json({ totalRegistros: countResult.recordset[0].totalRegistros, dados: formattedData });
    } catch (err) {
      res.status(500).json({ error: "Erro SQL", details: err.message });
    }
  });

  return router;
};
