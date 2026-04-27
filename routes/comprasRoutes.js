const express = require("express");
const sql = require("mssql");

module.exports = (getPool) => {
  const router = express.Router();

  const formatarDataDoProtheus = (dataString) => {
    if (!dataString || dataString.length !== 8) return dataString;
    return `${dataString.substring(0, 4)}-${dataString.substring(4, 6)}-${dataString.substring(6, 8)}`;
  };

  router.get("/naturezas", async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: "Servidor fora de serviço." });
    
    const QUERY = `
      SELECT DISTINCT 
        RTRIM(E2.E2_NATUREZ) AS CODIGO, 
        RTRIM(ISNULL(ED.ED_DESCRIC, 'SEM DESCRICAO')) AS DESCRICAO
      FROM SE2140 E2
      LEFT JOIN SED140 ED ON ED.ED_CODIGO = E2.E2_NATUREZ AND ED.D_E_L_E_T_ = ''
      WHERE E2.E2_FILIAL = '01' AND E2.D_E_L_E_T_ = '' AND E2.E2_NATUREZ <> ''
      ORDER BY CODIGO ASC
    `;

    try {
      const result = await pool.request().query(QUERY);
      res.json(result.recordset.map(r => ({
        id: r.CODIGO,
        label: `${r.CODIGO} - ${r.DESCRICAO}`
      })));
    } catch (err) {
      res.status(500).json({ error: "Erro SQL", details: err.message });
    }
  });

  router.get("/fornecedores", async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: "Servidor fora de serviço." });
    const { filial = "01", q = "" } = req.query;
    
    const QUERY = `
      SELECT TOP 100 A2_COD, A2_NOME, A2_NREDUZ 
      FROM SA2140 
      WHERE A2_FILIAL = @filial AND D_E_L_E_T_ = ''
      ${q ? "AND (UPPER(A2_COD) LIKE UPPER(@q) OR UPPER(A2_NOME) LIKE UPPER(@q) OR UPPER(A2_NREDUZ) LIKE UPPER(@q))" : ""}
      ORDER BY A2_NREDUZ ASC
    `;

    try {
      const request = pool.request();
      request.input("filial", sql.VarChar, filial);
      if (q) request.input("q", sql.VarChar, `%${q}%`);

      const result = await request.query(QUERY);
      const formattedData = result.recordset.map((r) => ({
        cod: r.A2_COD ? r.A2_COD.trim() : "",
        nome: r.A2_NOME ? r.A2_NOME.trim() : "",
        fantasia: r.A2_NREDUZ ? r.A2_NREDUZ.trim() : ""
      }));
      res.json(formattedData);
    } catch (err) {
      res.status(500).json({ error: "Erro SQL", details: err.message });
    }
  });

  router.get("/fornecedor/:fornece/notas", async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: "Servidor fora de serviço." });
    const { filial = "01", dataDe, dataAte, natureza } = req.query;
    const { fornece } = req.params;

    let QUERY = `
      SELECT DISTINCT 
        F1.F1_FILIAL, F1.F1_DOC, F1.F1_SERIE, F1.F1_FORNECE, F1.F1_NOMFOR, F1.F1_EMISSAO, 
        CAST(F1.F1_VALMERC AS DECIMAL(18,2)) AS F1_VALMERC,
        RTRIM(E2.E2_NATUREZ) AS NATUREZA,
        RTRIM(ISNULL(ED.ED_DESCRIC, '')) AS DESC_NATUREZA
      FROM SF1140 F1
      INNER JOIN SE2140 E2 ON E2.E2_FILIAL = F1.F1_FILIAL AND E2.E2_NUM = F1.F1_DOC AND E2.E2_PREFIXO = F1.F1_SERIE AND E2.E2_FORNECE = F1.F1_FORNECE AND E2.E2_LOJA = F1.F1_LOJA AND E2.D_E_L_E_T_ = ''
      LEFT JOIN SED140 ED ON ED.ED_CODIGO = E2.E2_NATUREZ AND ED.D_E_L_E_T_ = ''
      WHERE F1.F1_FILIAL = @filial AND F1.F1_FORNECE = @fornece AND F1.D_E_L_E_T_ = ''
    `;

    if (natureza) QUERY += ` AND E2.E2_NATUREZ = @natureza `;
    if (dataDe) QUERY += ` AND F1.F1_EMISSAO >= @dataDe`;
    if (dataAte) QUERY += ` AND F1.F1_EMISSAO <= @dataAte`;

    QUERY += ` ORDER BY F1.F1_EMISSAO DESC`;

    try {
      const request = pool.request();
      request.input("filial", sql.VarChar, filial);
      request.input("fornece", sql.VarChar, fornece);
      if (natureza) request.input("natureza", sql.VarChar, natureza);
      if (dataDe) request.input("dataDe", sql.VarChar, dataDe.replace(/-/g, ''));
      if (dataAte) request.input("dataAte", sql.VarChar, dataAte.replace(/-/g, ''));

      const result = await request.query(QUERY);
      const formattedData = result.recordset.map((r) => ({
        filial: r.F1_FILIAL ? r.F1_FILIAL.trim() : "",
        doc: r.F1_DOC ? r.F1_DOC.trim() : "",
        serie: r.F1_SERIE ? r.F1_SERIE.trim() : "",
        fornece: r.F1_FORNECE ? r.F1_FORNECE.trim() : "",
        nome: r.F1_NOMFOR ? r.F1_NOMFOR.trim() : "",
        emissao: formatarDataDoProtheus(r.F1_EMISSAO),
        valor: parseFloat(r.F1_VALMERC || 0),
        natureza: r.NATUREZA,
        descNatureza: r.DESC_NATUREZA
      }));
      res.json(formattedData);
    } catch (err) {
      res.status(500).json({ error: "Erro SQL", details: err.message });
    }
  });

  router.get("/nota/:doc/itens", async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: "Servidor fora de serviço." });
    const { doc } = req.params;
    const filial = req.query.filial || "01";
    const { fornece, serie } = req.query;

    let QUERY = `
      SELECT 
        SD1.D1_FILIAL, SD1.D1_ITEM, SD1.D1_COD, 
        ISNULL(NULLIF(SB1.B1_DESC, ''), SD1.D1_DESCRI) AS D1_DESCRI,
        SD1.D1_UM, SD1.D1_SEGUM, 
        CAST(SD1.D1_QUANT AS DECIMAL(18,2)) AS D1_QUANT, 
        CAST(SD1.D1_VUNIT AS DECIMAL(18,2)) AS D1_VUNIT, 
        SD1.D1_FORNECE, SD1.D1_DOC, SD1.D1_EMISSAO, SD1.D1_SERIE 
      FROM SD1140 SD1
      LEFT JOIN SB1140 SB1 ON SB1.B1_COD = SD1.D1_COD AND SB1.B1_FILIAL = '' AND SB1.D_E_L_E_T_ = ''
      WHERE SD1.D1_FILIAL = @filial AND SD1.D1_DOC = @doc AND SD1.D_E_L_E_T_ = ''
    `;
    
    if (fornece) {
      QUERY += ` AND SD1.D1_FORNECE = @fornece`;
    }
    if (serie) {
      QUERY += ` AND SD1.D1_SERIE = @serie`;
    }

    try {
      const request = pool.request();
      request.input("filial", sql.VarChar, filial);
      request.input("doc", sql.VarChar, doc);
      if (fornece) {
        request.input("fornece", sql.VarChar, fornece);
      }
      if (serie) {
        request.input("serie", sql.VarChar, serie);
      }

      const result = await request.query(QUERY);
      const formattedData = result.recordset.map((r) => ({
        filial: r.D1_FILIAL ? r.D1_FILIAL.trim() : "",
        item: r.D1_ITEM ? r.D1_ITEM.trim() : "",
        cod: r.D1_COD ? r.D1_COD.trim() : "",
        descri: r.D1_DESCRI ? r.D1_DESCRI.trim() : "",
        um: r.D1_UM ? r.D1_UM.trim() : "",
        segum: r.D1_SEGUM ? r.D1_SEGUM.trim() : "",
        quant: parseFloat(r.D1_QUANT || 0),
        vunit: parseFloat(r.D1_VUNIT || 0),
        fornece: r.D1_FORNECE ? r.D1_FORNECE.trim() : "",
        doc: r.D1_DOC ? r.D1_DOC.trim() : "",
        emissao: formatarDataDoProtheus(r.D1_EMISSAO),
        serie: r.D1_SERIE ? r.D1_SERIE.trim() : ""
      }));
      res.json(formattedData);
    } catch (err) {
      res.status(500).json({ error: "Erro SQL", details: err.message });
    }
  });

  router.get("/produtos", async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: "Servidor fora de serviço." });
    const { q = "" } = req.query;
    
    const QUERY = `
      SELECT TOP 100 B1_COD, B1_DESC 
      FROM SB1140 
      WHERE B1_FILIAL = '' AND B1_COD LIKE 'MC%' AND D_E_L_E_T_ = ''
      ${q ? "AND (UPPER(B1_COD) LIKE UPPER(@q) OR UPPER(B1_DESC) LIKE UPPER(@q))" : ""}
      ORDER BY B1_DESC ASC
    `;

    try {
      const request = pool.request();
      if (q) request.input("q", sql.VarChar, `%${q}%`);
      const result = await request.query(QUERY);
      const formattedData = result.recordset.map((r) => ({
        id: r.B1_COD ? r.B1_COD.trim() : "",
        label: `${r.B1_COD.trim()} - ${r.B1_DESC.trim()}`,
        cod: r.B1_COD.trim(),
        descri: r.B1_DESC.trim()
      }));
      res.json(formattedData);
    } catch (err) {
      res.status(500).json({ error: "Erro SQL", details: err.message });
    }
  });

  router.get("/produto/:cod/notas", async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: "Servidor fora de serviço." });
    const { cod } = req.params;
    const { filial = "01", dataDe, dataAte, natureza } = req.query;

    let QUERY = `
      SELECT DISTINCT 
        F1.F1_FILIAL, F1.F1_DOC, F1.F1_SERIE, F1.F1_FORNECE, F1.F1_NOMFOR, F1.F1_EMISSAO, 
        CAST(F1.F1_VALMERC AS DECIMAL(18,2)) AS F1_VALMERC,
        RTRIM(E2.E2_NATUREZ) AS NATUREZA,
        RTRIM(ISNULL(ED.ED_DESCRIC, '')) AS DESC_NATUREZA
      FROM SF1140 F1
      INNER JOIN SD1140 D1 ON D1.D1_DOC = F1.F1_DOC AND D1.D1_SERIE = F1.F1_SERIE AND D1.D1_FORNECE = F1.F1_FORNECE AND D1.D1_FILIAL = F1.F1_FILIAL
      INNER JOIN SE2140 E2 ON E2.E2_FILIAL = F1.F1_FILIAL AND E2.E2_NUM = F1.F1_DOC AND E2.E2_PREFIXO = F1.F1_SERIE AND E2.E2_FORNECE = F1.F1_FORNECE AND E2.E2_LOJA = F1.F1_LOJA AND E2.D_E_L_E_T_ = ''
      LEFT JOIN SED140 ED ON ED.ED_CODIGO = E2.E2_NATUREZ AND ED.D_E_L_E_T_ = ''
      WHERE F1.F1_FILIAL = @filial AND D1.D1_COD = @cod AND F1.D_E_L_E_T_ = '' AND D1.D_E_L_E_T_ = ''
    `;

    if (natureza) QUERY += ` AND E2.E2_NATUREZ = @natureza `;
    if (dataDe) QUERY += ` AND F1.F1_EMISSAO >= @dataDe`;
    if (dataAte) QUERY += ` AND F1.F1_EMISSAO <= @dataAte`;

    QUERY += ` ORDER BY F1.F1_EMISSAO DESC`;

    try {
      const request = pool.request();
      request.input("filial", sql.VarChar, filial);
      request.input("cod", sql.VarChar, cod);
      if (natureza) request.input("natureza", sql.VarChar, natureza);
      if (dataDe) request.input("dataDe", sql.VarChar, dataDe.replace(/-/g, ''));
      if (dataAte) request.input("dataAte", sql.VarChar, dataAte.replace(/-/g, ''));

      const result = await request.query(QUERY);
      const formattedData = result.recordset.map((r) => ({
        filial: r.F1_FILIAL ? r.F1_FILIAL.trim() : "",
        doc: r.F1_DOC ? r.F1_DOC.trim() : "",
        serie: r.F1_SERIE ? r.F1_SERIE.trim() : "",
        fornece: r.F1_FORNECE ? r.F1_FORNECE.trim() : "",
        nome: r.F1_NOMFOR ? r.F1_NOMFOR.trim() : "",
        emissao: formatarDataDoProtheus(r.F1_EMISSAO),
        valor: parseFloat(r.F1_VALMERC || 0),
        natureza: r.NATUREZA,
        descNatureza: r.DESC_NATUREZA
      }));
      res.json(formattedData);
    } catch (err) {
      res.status(500).json({ error: "Erro SQL", details: err.message });
    }
  });

  router.get("/notas", async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: "Servidor fora de serviço." });
    const { filial = "01", dataDe, dataAte, natureza } = req.query;

    let QUERY = `
      SELECT DISTINCT 
        F1.F1_FILIAL, F1.F1_DOC, F1.F1_SERIE, F1.F1_FORNECE, F1.F1_NOMFOR, F1.F1_EMISSAO, 
        CAST(F1.F1_VALMERC AS DECIMAL(18,2)) AS F1_VALMERC,
        RTRIM(E2.E2_NATUREZ) AS NATUREZA,
        RTRIM(ISNULL(ED.ED_DESCRIC, '')) AS DESC_NATUREZA
      FROM SF1140 F1
      INNER JOIN SE2140 E2 ON E2.E2_FILIAL = F1.F1_FILIAL AND E2.E2_NUM = F1.F1_DOC AND E2.E2_PREFIXO = F1.F1_SERIE AND E2.E2_FORNECE = F1.F1_FORNECE AND E2.E2_LOJA = F1.F1_LOJA AND E2.D_E_L_E_T_ = ''
      LEFT JOIN SED140 ED ON ED.ED_CODIGO = E2.E2_NATUREZ AND ED.D_E_L_E_T_ = ''
      WHERE F1.F1_FILIAL = @filial AND F1.D_E_L_E_T_ = ''
    `;

    if (natureza) QUERY += ` AND E2.E2_NATUREZ = @natureza `;
    if (dataDe) QUERY += ` AND F1.F1_EMISSAO >= @dataDe`;
    if (dataAte) QUERY += ` AND F1.F1_EMISSAO <= @dataAte`;

    QUERY += ` ORDER BY F1.F1_EMISSAO DESC`;

    try {
      const request = pool.request();
      request.input("filial", sql.VarChar, filial);
      if (natureza) request.input("natureza", sql.VarChar, natureza);
      if (dataDe) request.input("dataDe", sql.VarChar, dataDe.replace(/-/g, ''));
      if (dataAte) request.input("dataAte", sql.VarChar, dataAte.replace(/-/g, ''));

      const result = await request.query(QUERY);
      const formattedData = result.recordset.map((r) => ({
        filial: r.F1_FILIAL ? r.F1_FILIAL.trim() : "",
        doc: r.F1_DOC ? r.F1_DOC.trim() : "",
        serie: r.F1_SERIE ? r.F1_SERIE.trim() : "",
        fornece: r.F1_FORNECE ? r.F1_FORNECE.trim() : "",
        nome: r.F1_NOMFOR ? r.F1_NOMFOR.trim() : "",
        emissao: formatarDataDoProtheus(r.F1_EMISSAO),
        valor: parseFloat(r.F1_VALMERC || 0),
        natureza: r.NATUREZA,
        descNatureza: r.DESC_NATUREZA
      }));
      res.json(formattedData);
    } catch (err) {
      res.status(500).json({ error: "Erro SQL", details: err.message });
    }
  });

  return router;
};
