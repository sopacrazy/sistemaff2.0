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

  return router;
};
