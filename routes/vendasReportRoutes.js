const express = require("express");
const sql = require("mssql");

module.exports = (getPool) => {
  const router = express.Router();

  // 1. Buscar Clientes (SA1140)
  router.get("/clientes", async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: "Servidor fora de serviço." });
    const { filial = "01", q = "" } = req.query;
    
    // Protheus SA1: A1_COD, A1_NOME, A1_NREDUZ
    const QUERY = `
      SELECT TOP 100 A1_COD, A1_NOME, A1_NREDUZ 
      FROM SA1140 (NOLOCK)
      WHERE D_E_L_E_T_ = '' AND A1_FILIAL = @filial
      ${q ? "AND (A1_COD LIKE @q OR A1_NOME LIKE @q OR A1_NREDUZ LIKE @q)" : ""}
      ORDER BY A1_NREDUZ ASC
    `;

    try {
      const request = pool.request();
      request.input("filial", sql.VarChar, filial);
      if (q) request.input("q", sql.VarChar, `%${q.toUpperCase()}%`);

      const result = await request.query(QUERY);
      const formattedData = result.recordset.map((r) => ({
        cod: r.A1_COD ? r.A1_COD.trim() : "",
        nome: r.A1_NOME ? r.A1_NOME.trim() : "",
        fantasia: r.A1_NREDUZ ? r.A1_NREDUZ.trim() : ""
      }));
      res.json(formattedData);
    } catch (err) {
      console.error("ERRO /clientes:", err);
      res.status(500).json({ error: "Erro SQL", details: err.message });
    }
  });

  // 2. Buscar Notas (Bilhetes) por Cliente (SZ4140)
  router.get("/cliente/:cliente/notas", async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: "Servidor fora de serviço." });
    const { cliente } = req.params;
    const { dataDe, dataAte } = req.query;

    let QUERY = `
      SELECT Z4_BILHETE, Z4_DATA, Z4_TOTBIL, Z4_NOMCLI, Z4_LOCAL
      FROM SZ4140 (NOLOCK)
      WHERE Z4_FILIAL = '01' AND Z4_CLIENTE = @cliente AND D_E_L_E_T_ = ''
    `;

    if (dataDe) QUERY += ` AND Z4_DATA >= @dataDe`;
    if (dataAte) QUERY += ` AND Z4_DATA <= @dataAte`;

    QUERY += ` ORDER BY Z4_DATA DESC`;

    try {
      const request = pool.request();
      request.input("cliente", sql.VarChar, cliente);
      if (dataDe) request.input("dataDe", sql.VarChar, dataDe.replace(/-/g, ""));
      if (dataAte) request.input("dataAte", sql.VarChar, dataAte.replace(/-/g, ""));

      const result = await request.query(QUERY);
      const formattedData = result.recordset.map((r) => ({
        doc: r.Z4_BILHETE.trim(),
        emissao: r.Z4_DATA.trim(),
        valor: parseFloat(r.Z4_TOTBIL || 0),
        nome: r.Z4_NOMCLI.trim(),
        local: r.Z4_LOCAL.trim()
      }));
      res.json(formattedData);
    } catch (err) {
      res.status(500).json({ error: "Erro SQL", details: err.message });
    }
  });

  // 3. Buscar Itens de um Bilhete (SZ5140)
  router.get("/bilhete/:bilhete/itens", async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: "Servidor fora de serviço." });
    const { bilhete } = req.params;

    const QUERY = `
      SELECT Z5_CODPRO, Z5_DESPRO, Z5_UM, Z5_QTDE, Z5_PRECO, Z5_TOTAL, Z5_CLIENTE, Z5_DATA
      FROM SZ5140 (NOLOCK)
      WHERE Z5_FILIAL = '01' AND RTRIM(Z5_BILHETE) = RTRIM(@bilhete) AND D_E_L_E_T_ = ''
    `;

    try {
      const request = pool.request();
      request.input("bilhete", sql.VarChar, bilhete);

      const result = await request.query(QUERY);
      const formattedData = result.recordset.map((r) => ({
        cod: r.Z5_CODPRO.trim(),
        descri: r.Z5_DESPRO.trim(),
        um: r.Z5_UM ? r.Z5_UM.trim() : "",
        quant: parseFloat(r.Z5_QTDE || 0),
        vunit: parseFloat(r.Z5_PRECO || 0),
        total: parseFloat(r.Z5_TOTAL || 0),
        cliente: r.Z5_CLIENTE.trim(),
        data: r.Z5_DATA.trim(),
        doc: bilhete
      }));
      res.json(formattedData);
    } catch (err) {
      res.status(500).json({ error: "Erro SQL", details: err.message });
    }
  });

  // 4. Buscar Produtos (SB1140)
  router.get("/produtos", async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: "Servidor fora de serviço." });
    const { q = "" } = req.query;
    
    const QUERY = `
      SELECT TOP 100 B1_COD, B1_DESC 
      FROM SB1140 (NOLOCK)
      WHERE B1_FILIAL = '' AND B1_TIPO = 'MC' AND D_E_L_E_T_ = ''
      ${q ? "AND (B1_COD LIKE @q OR B1_DESC LIKE @q)" : ""}
      ORDER BY B1_DESC ASC
    `;

    try {
      const request = pool.request();
      if (q) request.input("q", sql.VarChar, `%${q.toUpperCase()}%`);
      const result = await request.query(QUERY);
      const formattedData = result.recordset.map((r) => ({
        id: r.B1_COD ? r.B1_COD.trim() : "",
        label: `${r.B1_COD.trim()} - ${r.B1_DESC.trim()}`,
        cod: r.B1_COD.trim(),
        descri: r.B1_DESC.trim()
      }));
      res.json(formattedData);
    } catch (err) {
      console.error("ERRO /produtos:", err);
      res.status(500).json({ error: "Erro SQL", details: err.message });
    }
  });

  // 5. Buscar Notas por Produto (SZ5140 join SZ4140)
  router.get("/produto/:prod/notas", async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: "Servidor fora de serviço." });
    const { prod } = req.params;
    const { dataDe, dataAte } = req.query;

    let QUERY = `
      SELECT DISTINCT Z4.Z4_BILHETE, Z4.Z4_DATA, Z4.Z4_TOTBIL, Z4.Z4_NOMCLI, Z4.Z4_LOCAL
      FROM SZ5140 Z5 (NOLOCK)
      INNER JOIN SZ4140 Z4 (NOLOCK) ON Z4.Z4_FILIAL = Z5.Z5_FILIAL AND Z4.Z4_BILHETE = Z5.Z5_BILHETE AND Z4.D_E_L_E_T_ = ''
      WHERE Z5.Z5_FILIAL = '01' AND Z5.Z5_CODPRO = @prod AND Z5.D_E_L_E_T_ = ''
    `;

    if (dataDe) QUERY += ` AND Z4.Z4_DATA >= @dataDe`;
    if (dataAte) QUERY += ` AND Z4.Z4_DATA <= @dataAte`;

    QUERY += ` ORDER BY Z4.Z4_DATA DESC`;

    try {
      const request = pool.request();
      request.input("prod", sql.VarChar, prod);
      if (dataDe) request.input("dataDe", sql.VarChar, dataDe.replace(/-/g, ""));
      if (dataAte) request.input("dataAte", sql.VarChar, dataAte.replace(/-/g, ""));

      const result = await request.query(QUERY);
      const formattedData = result.recordset.map((r) => ({
        doc: r.Z4_BILHETE.trim(),
        emissao: r.Z4_DATA.trim(),
        valor: parseFloat(r.Z4_TOTBIL || 0),
        nome: r.Z4_NOMCLI.trim(),
        local: r.Z4_LOCAL.trim()
      }));
      res.json(formattedData);
    } catch (err) {
      res.status(500).json({ error: "Erro SQL", details: err.message });
    }
  });

  const getTableName = (base, req) => {
    const empresa = req.query.empresa || req.body.empresa || '140';
    let suffix = empresa === '240' ? '240' : '140';
    if (base === 'SA3') suffix = '140';
    return `${base}${suffix}`;
  };

  // 6. Buscar Vendas de Clientes de Risco com Títulos Atrasados (SZ4 join SA1)
  router.get("/vendas-risco", async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: "Servidor fora de serviço." });
    
    const { dataDe, dataAte, empresa = "140" } = req.query;
    
    const se1Table = getTableName("SE1", req);
    const sa1Table = getTableName("SA1", req);
    const sz4Table = getTableName("SZ4", req);

    let QUERY = `
      SELECT 
        Z4.Z4_BILHETE AS doc,
        Z4.Z4_DATA AS emissao,
        Z4.Z4_TOTBIL AS valor,
        Z4.Z4_CLIENTE AS cliente_cod,
        Z4.Z4_NOMCLI AS cliente_nome,
        Z4.Z4_VEND AS vendedor_cod,
        Z4.Z4_NOMVEN AS vendedor_nome,
        SA1.A1_RISCO AS risco,
        (SELECT COUNT(*) FROM ${se1Table} E1 
         WHERE E1.E1_CLIENTE = Z4.Z4_CLIENTE 
           AND E1.E1_SALDO <> 0 
           AND E1.E1_PREFIXO IN ('BIL', '001')
           AND E1.E1_TIPO <> 'NCC'
           AND E1.E1_VENCREA < CONVERT(VARCHAR(8), DATEADD(DAY, -2, GETDATE()), 112)
           AND E1.D_E_L_E_T_ = '') AS total_atrasados,
        (SELECT SUM(E1.E1_SALDO) FROM ${se1Table} E1 
         WHERE E1.E1_CLIENTE = Z4.Z4_CLIENTE 
           AND E1.E1_SALDO <> 0 
           AND E1.E1_PREFIXO IN ('BIL', '001')
           AND E1.E1_TIPO <> 'NCC'
           AND E1.E1_VENCREA < CONVERT(VARCHAR(8), DATEADD(DAY, -2, GETDATE()), 112)
           AND E1.D_E_L_E_T_ = '') AS saldo_atrasado,
        (SELECT MIN(E1.E1_VENCREA) FROM ${se1Table} E1 
         WHERE E1.E1_CLIENTE = Z4.Z4_CLIENTE 
           AND E1.E1_SALDO <> 0 
           AND E1.E1_PREFIXO IN ('BIL', '001')
           AND E1.E1_TIPO <> 'NCC'
           AND E1.E1_VENCREA < CONVERT(VARCHAR(8), DATEADD(DAY, -2, GETDATE()), 112)
           AND E1.D_E_L_E_T_ = '') AS data_vencimento_mais_antigo
      FROM ${sz4Table} Z4 (NOLOCK)
      JOIN ${sa1Table} SA1 (NOLOCK) ON Z4.Z4_CLIENTE = SA1.A1_COD AND SA1.A1_FILIAL = '01' AND SA1.D_E_L_E_T_ = ''
      WHERE Z4.Z4_FILIAL = '01' 
        AND Z4.D_E_L_E_T_ = ''
        AND SA1.A1_RISCO = 'D'
        AND EXISTS (
            SELECT 1 FROM ${se1Table} E1
            WHERE E1.E1_CLIENTE = Z4.Z4_CLIENTE
              AND E1.E1_SALDO <> 0
              AND E1.E1_PREFIXO IN ('BIL', '001')
              AND E1.E1_TIPO <> 'NCC'
              AND E1.E1_VENCREA < CONVERT(VARCHAR(8), DATEADD(DAY, -2, GETDATE()), 112)
              AND E1.D_E_L_E_T_ = ''
        )
    `;

    if (dataDe) QUERY += ` AND Z4.Z4_DATA >= @dataDe`;
    if (dataAte) QUERY += ` AND Z4.Z4_DATA <= @dataAte`;

    QUERY += ` ORDER BY Z4.Z4_DATA DESC`;

    try {
      const request = pool.request();
      if (dataDe) request.input("dataDe", sql.VarChar, dataDe.replace(/-/g, ""));
      if (dataAte) request.input("dataAte", sql.VarChar, dataAte.replace(/-/g, ""));

      const result = await request.query(QUERY);
      const formattedData = result.recordset.map((r) => ({
        doc: r.doc ? r.doc.trim() : "",
        emissao: r.emissao ? r.emissao.trim() : "",
        valor: parseFloat(r.valor || 0),
        cliente_cod: r.cliente_cod ? r.cliente_cod.trim() : "",
        cliente_nome: r.cliente_nome ? r.cliente_nome.trim() : "",
        vendedor_cod: r.vendedor_cod ? r.vendedor_cod.trim() : "",
        vendedor_nome: r.vendedor_nome ? r.vendedor_nome.trim() : "",
        risco: r.risco ? r.risco.trim() : "",
        total_atrasados: parseInt(r.total_atrasados || 0, 10),
        saldo_atrasado: parseFloat(r.saldo_atrasado || 0),
        data_vencimento_mais_antigo: r.data_vencimento_mais_antigo ? r.data_vencimento_mais_antigo.trim() : ""
      }));
      res.json(formattedData);
    } catch (err) {
      console.error("ERRO /vendas-risco:", err);
      res.status(500).json({ error: "Erro SQL", details: err.message });
    }
  });

  // 7. Buscar Títulos Atrasados de um Cliente Específico (SE1)
  router.get("/cliente/:cliente/titulos-atrasados", async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: "Servidor fora de serviço." });
    const { cliente } = req.params;
    const { empresa = "140" } = req.query;
    
    const se1Table = getTableName("SE1", req);
    const sz4Table = getTableName("SZ4", req);

    const QUERY = `
      SELECT 
        SE1.E1_NUM AS num,
        SE1.E1_PREFIXO AS prefixo,
        SE1.E1_TIPO AS tipo,
        SE1.E1_VENCREA AS vencimento,
        SE1.E1_VALOR AS valor,
        SE1.E1_SALDO AS saldo,
        Z4.Z4_NOTA AS nota,
        Z4.Z4_BILHETE AS bilhete
      FROM 
        ${se1Table} SE1 (NOLOCK)
      LEFT JOIN 
        ${sz4Table} Z4 (NOLOCK) ON SE1.E1_NUM = Z4.Z4_BILHETE AND Z4.D_E_L_E_T_ = ''
      WHERE 
        SE1.E1_FILIAL = '01'
        AND SE1.D_E_L_E_T_ = ''
        AND SE1.E1_CLIENTE = @cliente
        AND SE1.E1_SALDO <> 0
        AND SE1.E1_PREFIXO IN ('BIL', '001')
        AND SE1.E1_TIPO <> 'NCC'
        AND SE1.E1_VENCREA < CONVERT(VARCHAR(8), DATEADD(DAY, -2, GETDATE()), 112)
      ORDER BY SE1.E1_VENCREA ASC
    `;

    try {
      const request = pool.request();
      request.input("cliente", sql.VarChar, cliente);
      const result = await request.query(QUERY);
      const formattedData = result.recordset.map((r) => ({
        num: r.num ? r.num.trim() : "",
        prefixo: r.prefixo ? r.prefixo.trim() : "",
        tipo: r.tipo ? r.tipo.trim() : "",
        vencimento: r.vencimento ? r.vencimento.trim() : "",
        valor: parseFloat(r.valor || 0),
        saldo: parseFloat(r.saldo || 0),
        nota: r.nota ? r.nota.trim() : "",
        bilhete: r.bilhete ? r.bilhete.trim() : ""
      }));
      res.json(formattedData);
    } catch (err) {
      console.error("ERRO /cliente/:cliente/titulos-atrasados:", err);
      res.status(500).json({ error: "Erro SQL", details: err.message });
    }
  });

  return router;
};
