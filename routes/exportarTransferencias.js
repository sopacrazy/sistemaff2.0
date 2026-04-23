const express = require("express");
const router = express.Router();
const db = require("../db");

router.post("/exportar-transferencias-csv", async (req, res) => {
  const { data, local } = req.body;

  if (!data || !local) {
    return res.status(400).json({ error: "Data e local são obrigatórios." });
  }

  try {
    const conn = await db.promise().getConnection();

    const [rows] = await conn.query(
      `
      SELECT 
        cod_produto,
        TRIM(SUBSTRING_INDEX(descricao, ' -', 1)) AS nome_produto,
        destino,
        SUM(quantidade) AS total
      FROM transferencias_estoque
      WHERE DATE(data_inclusao) = ? 
        AND status = 'Concluído'
        AND origem = ?
      GROUP BY cod_produto, nome_produto, destino
      ORDER BY cod_produto, destino
      `,
      [data, local]
    );

    conn.release();

    if (rows.length === 0) {
      return res.status(204).send();
    }

    const agrupado = {};
    const destinoMap = {
      "01": "LOJA (01)",
      "02": "DEP (02)",
      "07": "CD",
      "04": "BANANA",
      "05": "DEP. OVO",
      "06": "PS2",
      "03": "BTF",
      "09": "PS1",
      "08": "08 - VAREJINHO",
    };

    for (const row of rows) {
      const key = row.cod_produto + "___" + row.nome_produto;
      if (!agrupado[key]) {
        agrupado[key] = {
          CODIGO: row.cod_produto,
          PRODUTOS: row.nome_produto,
          UND: "",
          INICIAL: "",
          ENTRADA: "",
          DEVOLUÇÃO: "",
          DEP: "",
          LOJA: "",
          P1: "",
          P2: "",
          BTF: "",
          "TOTAL ENTRADA": "",
          MCP: "",
          "CAS.": "",
          "LOJA (01)": "",
          "DEP (02)": "",
          CD: "",
          BANANA: "",
          "DEP. OVO": "",
          PS2: "",
          BTF: "",
          PS1: "",
          VAREJINHO: "",
        };
      }

      const coluna = destinoMap[row.destino];
      if (coluna) {
        agrupado[key][coluna] = row.total;
      }
    }

    const headerDecorativo = "ENTRADA;;;;;;;;;;;;SAÍDA;;;;;;;;;;";
    const headerCampos = [
      "CODIGO",
      "PRODUTOS",
      "UND",
      "INICIAL",
      "ENTRADA",
      "DEVOLUÇÃO",
      "DEP",
      "LOJA",
      "P1",
      "P2",
      "BTF",
      "TOTAL ENTRADA",
      "MCP",
      "CAS.",
      "LOJA (01)",
      "DEP (02)",
      "CD",
      "BANANA",
      "DEP. OVO",
      "PS2",
      "BTF",
      "PS1",
      "08 - VAREJINHO",
    ].join(";");

    const linhas = [headerDecorativo, headerCampos];

    // 🔹 Adiciona a primeira linha de produto padrão
    const linhaPadrao = [
      "000.000",
      "PRODUTO PADRÃO",
      "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""
    ].join(";");
    linhas.push(linhaPadrao);

    const dadosFinal = Object.values(agrupado);

    dadosFinal.forEach((item) => {
      const linha = [
        item.CODIGO,
        item.PRODUTOS,
        item.UND,
        item.INICIAL,
        item.ENTRADA,
        item["DEVOLUÇÃO"],
        item.DEP,
        item.LOJA,
        item.P1,
        item.P2,
        item.BTF,
        item["TOTAL ENTRADA"],
        item.MCP,
        item["CAS."],
        item["LOJA (01)"],
        item["DEP (02)"],
        item["CD"],
        item["BANANA"],
        item["DEP. OVO"],
        item.PS2,
        item.BTF,
        item.PS1,
        item["08 - VAREJINHO"], // mapeado pelo nome da coluna no destinoMap
      ]
        .map((val) => (val !== undefined && val !== null ? val : ""))
        .join(";");
      linhas.push(linha);
    });

    for (let i = 0; i < 20; i++) {
      linhas.push(";;;;;;;;;;;;;;;;;;;;;");
    }

    const csvContent = "\uFEFF" + linhas.join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Transferencias_${local}_${data}.csv`
    );
    res.send(csvContent);
  } catch (error) {
    console.error("Erro ao exportar CSV:", error);
    res.status(500).json({ error: "Erro ao gerar CSV" });
  }
});


router.post("/exportar-transferencias-csv-todos", async (req, res) => {
  const { data } = req.body;

  if (!data) {
    return res.status(400).json({ error: "Data é obrigatória." });
  }

  try {
    const conn = await db.promise().getConnection();

    const [rows] = await conn.query(
      `
      SELECT 
        cod_produto,
        TRIM(SUBSTRING_INDEX(descricao, ' -', 1)) AS nome_produto,
        destino,
        SUM(quantidade) AS total
      FROM transferencias_estoque
      WHERE DATE(data_inclusao) = ? 
        AND status = 'Concluído'
      GROUP BY cod_produto, nome_produto, destino
      ORDER BY cod_produto, destino
      `,
      [data]
    );

    conn.release();

    if (rows.length === 0) {
      return res.status(204).send();
    }

    const agrupado = {};
    const destinoMap = {
      "01": "LOJA (01)",
      "02": "DEP (02)",
      "07": "CD",
      "04": "BANANA",
      "05": "DEP. OVO",
      "06": "PS2",
      "03": "BTF",
      "09": "PS1",
      "08": "08 - VAREJINHO",
    };

    for (const row of rows) {
      const key = row.cod_produto + "___" + row.nome_produto;
      if (!agrupado[key]) {
        agrupado[key] = {
          CODIGO: row.cod_produto,
          PRODUTOS: row.nome_produto,
          UND: "",
          INICIAL: "",
          ENTRADA: "",
          DEVOLUÇÃO: "",
          DEP: "",
          LOJA: "",
          P1: "",
          P2: "",
          BTF: "",
          "TOTAL ENTRADA": "",
          MCP: "",
          "CAS.": "",
          "LOJA (01)": "",
          "DEP (02)": "",
          CD: "",
          BANANA: "",
          "DEP. OVO": "",
          PS2: "",
          BTF: "",
          PS1: "",
          VAREJINHO: "",
        };
      }

      const coluna = destinoMap[row.destino];
      if (coluna) {
        agrupado[key][coluna] = row.total;
      }
    }

    const headerDecorativo = "ENTRADA;;;;;;;;;;;;SAÍDA;;;;;;;;;;";
    const headerCampos = [
      "CODIGO",
      "PRODUTOS",
      "UND",
      "INICIAL",
      "ENTRADA",
      "DEVOLUÇÃO",
      "DEP",
      "LOJA",
      "P1",
      "P2",
      "BTF",
      "TOTAL ENTRADA",
      "MCP",
      "CAS.",
      "LOJA (01)",
      "DEP (02)",
      "CD",
      "BANANA",
      "DEP. OVO",
      "PS2",
      "BTF",
      "PS1",
      "08 - VAREJINHO",
    ].join(";");

    const linhas = [headerDecorativo, headerCampos];

    const linhaPadrao = [
      "000.000",
      "PRODUTO PADRÃO",
      "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""
    ].join(";");
    linhas.push(linhaPadrao);

    const dadosFinal = Object.values(agrupado);

    dadosFinal.forEach((item) => {
      const linha = [
        item.CODIGO,
        item.PRODUTOS,
        item.UND,
        item.INICIAL,
        item.ENTRADA,
        item["DEVOLUÇÃO"],
        item.DEP,
        item.LOJA,
        item.P1,
        item.P2,
        item.BTF,
        item["TOTAL ENTRADA"],
        item.MCP,
        item["CAS."],
        item["LOJA (01)"],
        item["DEP (02)"],
        item["CD"],
        item["BANANA"],
        item["DEP. OVO"],
        item.PS2,
        item.BTF,
        item.PS1,
        item["08 - VAREJINHO"],
      ]
        .map((val) => (val !== undefined && val !== null ? val : ""))
        .join(";");
      linhas.push(linha);
    });

    for (let i = 0; i < 20; i++) {
      linhas.push(";;;;;;;;;;;;;;;;;;;;;");
    }

    const csvContent = "\uFEFF" + linhas.join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Transferencias_Geral_TODOS_${data}.csv`
    );
    res.send(csvContent);
  } catch (error) {
    console.error("Erro ao exportar CSV Geral:", error);
    res.status(500).json({ error: "Erro ao gerar CSV Geral" });
  }
});

module.exports = router;
