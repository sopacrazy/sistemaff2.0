const express = require("express");
const router = express.Router();
const sql = require("mssql");
const PdfPrinter = require("pdfmake");
const dbConfig = require("../config/dbConfig");

router.post("/relatorio-por-grupo", async (req, res) => {
  const { data, grupo, modo = "detalhado" } = req.body;

  try {
    await sql.connect(dbConfig);

    // --> CORREÇÃO AQUI NO JOIN <--
    const result = await sql.query(`
      SELECT 
        ZB.ZB_DTENTRE, 
        ZC.ZC_CODPRO,
        ZC.ZC_DESPRO,
        ZC.ZC_QTDE,
        ZC.ZC_UM,
        ZC.ZC_UNSVEN,
        ZC.ZC_SEGUM,
        ZC.ZC_CLIENTE,
        SA.A1_NREDUZ AS CLIENTE_NOME,
        SB.B1_GRUPO,
        SB.B1_FORAEST,
        ZC.ZC_OBS
      FROM SZC140 ZC
      /* A linha abaixo foi corrigida para usar ZB_NUMERO e ZC_NUMERO */
      LEFT JOIN SZB140 ZB ON ZB.ZB_BILHETE = ZC.ZC_BILHETE AND ZB.ZB_FILIAL = ZC.ZC_FILIAL
      LEFT JOIN SB1140 SB ON SB.B1_COD = ZC.ZC_CODPRO
      LEFT JOIN SA1140 SA ON SA.A1_COD = ZC.ZC_CLIENTE AND SA.A1_FILIAL = ZC.ZC_FILIAL
      WHERE ZC.ZC_FILIAL = '01'
        AND ZC.ZC_OBS <> 'CORTE'
        AND ZB.ZB_DTENTRE = '${data}' 
        ${
          grupo === "0000"
            ? "AND SB.B1_FORAEST = 'N'"
            : `AND SB.B1_GRUPO = '${grupo}'`
        }
        AND ZC.D_E_L_E_T_ = ''
        AND ZB.D_E_L_E_T_ = ''
    `);

    const registros = result.recordset;

    if (registros.length === 0) {
      return res
        .status(404)
        .send("Nenhum registro encontrado para a data e grupo informados.");
    }

    const dataDoRelatorio = registros[0].ZB_DTENTRE;

    // Agrupar por produto
    const agrupado = {};

    for (const item of registros) {
      const cod = item.ZC_CODPRO;
      const desc = item.ZC_DESPRO?.trim();
      const chave = `${cod} - ${desc}`;

      if (!agrupado[chave]) {
        agrupado[chave] = {
          unidade1: item.ZC_UM,
          unidade2: item.ZC_SEGUM,
          clientes: [],
          total1: 0,
          total2: 0,
        };
      }

      agrupado[chave].clientes.push({
        nome: item.CLIENTE_NOME?.trim() || `(COD: ${item.ZC_CLIENTE || "N/A"})`,
        qtde1: parseFloat(item.ZC_QTDE || 0),
        qtde2: parseFloat(item.ZC_UNSVEN || 0),
      });

      agrupado[chave].total1 += parseFloat(item.ZC_QTDE || 0);
      agrupado[chave].total2 += parseFloat(item.ZC_UNSVEN || 0);
    }

    // Conteúdo PDF
    const content = [
      {
        text:
          modo === "resumido"
            ? "Resumo de Pré Vendas por Produto"
            : "Pré Vendas Produto X Clientes",
        style: "header",
        alignment: "center",
        margin: [0, 0, 0, 10],
      },
      {
        text: `Data de Entrega: ${dataDoRelatorio.slice(
          6,
          8
        )}/${dataDoRelatorio.slice(4, 6)}/${dataDoRelatorio.slice(
          0,
          4
        )} - Grupo: ${grupo}`,
        style: "subheader",
        alignment: "center",
        margin: [0, 0, 0, 15],
      },
    ];

    if (modo === "resumido") {
      const body = [
        [
          { text: "PRODUTO", bold: true },
          { text: "PRIMEIRA UNID", bold: true, alignment: "right" },
          { text: "SEGUNDA UNID", bold: true, alignment: "right" },
        ],
      ];

      for (const [produto, info] of Object.entries(agrupado)) {
        body.push([
          produto,
          {
            text: `${info.total1.toFixed(2)} (${info.unidade1 || "-"})`,
            alignment: "right",
          },
          {
            text:
              info.total2 > 0
                ? `${info.total2.toFixed(2)} (${info.unidade2 || "-"})`
                : "",
            alignment: "right",
          },
        ]);
      }

      content.push({
        table: {
          headerRows: 1,
          widths: ["*", "auto", "auto"],
          body,
        },
        layout: "lightHorizontalLines",
      });
    } else {
      for (const [produto, info] of Object.entries(agrupado)) {
        content.push({
          text: `PRODUTO: ${produto}`,
          style: "produtoHeader",
          fillColor: "#e6f0ff",
          alignment: "left",
        });

        const body = [
          [
            { text: "CLIENTES", bold: true },
            { text: "Primeira Unidade", bold: true, alignment: "right" },
            { text: "Segunda Unidade", bold: true, alignment: "right" },
          ],
        ];

        for (const cliente of info.clientes) {
          body.push([
            cliente.nome,
            {
              text: `${cliente.qtde1.toFixed(2)} (${info.unidade1 || "-"})`,
              alignment: "right",
            },
            {
              text:
                cliente.qtde2 > 0
                  ? `${cliente.qtde2.toFixed(2)} (${info.unidade2 || "-"})`
                  : "",
              alignment: "right",
            },
          ]);
        }

        body.push([
          { text: "TOTAL ITEM", bold: true },
          {
            text: info.total1.toFixed(2),
            alignment: "right",
            bold: true,
          },
          {
            text: info.total2 > 0 ? info.total2.toFixed(2) : "",
            alignment: "right",
            bold: true,
          },
        ]);

        content.push({
          table: {
            headerRows: 1,
            widths: ["*", "auto", "auto"],
            body,
          },
          layout: "lightHorizontalLines",
        });
      }
    }

    // PDF
    const printer = new PdfPrinter({
      Roboto: {
        normal: "fonts/Roboto-Regular.ttf",
        bold: "fonts/Roboto-Medium.ttf",
        italics: "fonts/Roboto-Italic.ttf",
        bolditalics: "fonts/Roboto-MediumItalic.ttf",
      },
    });

    const docDefinition = {
      content,
      defaultStyle: {
        fontSize: 11,
      },
      styles: {
        header: { fontSize: 14, bold: true },
        subheader: { fontSize: 10, margin: [0, 5, 0, 5] },
        produtoHeader: {
          fontSize: 13,
          bold: true,
          color: "#1f4e79",
          margin: [0, 6, 0, 6],
        },
      },
      pageOrientation: "portrait",
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks = [];
    pdfDoc.on("data", (chunk) => chunks.push(chunk));
    pdfDoc.on("end", () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=relatorio_grupo_${grupo}_${modo}.pdf`
      );
      res.send(pdfBuffer);
    });
    pdfDoc.end();
  } catch (err) {
    console.error("Erro ao gerar relatório agrupado:", err);
    res.status(500).send("Erro ao gerar relatório agrupado.");
  }
});

module.exports = router;
