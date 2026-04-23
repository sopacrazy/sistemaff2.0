const express = require("express");
const path = require("path");
const PdfPrinter = require("pdfmake");
const fs = require("fs");
const ExcelJS = require("exceljs");

const router = express.Router();

module.exports = (dbOcorrencias) => {
  // 🔥 Rota para gerar PDF com filtro de motivo
  router.get("/pdf", (req, res) => {
    const { startDate, endDate, tipoRelatorio, motivo } = req.query;

    let query = `
      SELECT ocorrencias.cliente, ocorrencias.descricao,itens_produto.produto_nome, itens_produto.produto_unidade, itens_produto.quantidade, itens_produto.valor, itens_produto.total, itens_produto.motivo, itens_produto.tipo, ocorrencias.conferente, ocorrencias.id as ocorrencia_id, ocorrencias.data, ocorrencias.motorista, ocorrencias.numero, ocorrencias.remetente
      FROM ocorrencias
      JOIN itens_produto ON ocorrencias.id = itens_produto.ocorrencia_id
      WHERE ocorrencias.data BETWEEN ? AND ?
      AND ocorrencias.D_E_L_E_T_ = '' AND itens_produto.D_E_L_E_T_ = ''
    `;

    const params = [startDate, endDate];

    if (motivo && motivo !== "todos") {
      query += " AND TRIM(UPPER(itens_produto.motivo)) = TRIM(UPPER(?))";
      params.push(motivo);
    }

    dbOcorrencias.query(query, params, (err, rows) => {
      if (err) {
        console.error("❌ Erro ao gerar relatório PDF:", err);
        return res.status(500).send("Erro ao gerar relatório PDF");
      }

      const fonts = {
        Roboto: {
          normal: path.join(__dirname, "../fonts/Roboto-Regular.ttf"),
          bold: path.join(__dirname, "../fonts/Roboto-Medium.ttf"),
          italics: path.join(__dirname, "../fonts/Roboto-Italic.ttf"),
          bolditalics: path.join(__dirname, "../fonts/Roboto-MediumItalic.ttf"),
        },
      };

      const printer = new PdfPrinter(fonts);

      const docDefinition = {
        content: [{ text: "Relatório de Ocorrências", style: "header" }],
        styles: {
          header: {
            fontSize: 18,
            bold: true,
            alignment: "center",
            margin: [0, 0, 0, 20],
          },
          subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
          tableHeader: { bold: true, fontSize: 10, fillColor: "#eeeeee" },
          tableCell: { fontSize: 8 },
          totalOcorrencia: {
            fontSize: 10,
            bold: true,
            alignment: "right",
            margin: [0, 5, 0, 5],
          },
          totalGeral: {
            fontSize: 12,
            bold: true,
            alignment: "right",
            margin: [0, 10, 0, 10],
          },
        },
      };

      if (tipoRelatorio === "sintetico") {
        const totalPorTipo = {};
        const totalPorMotivo = {};

        rows.forEach((row) => {
          totalPorTipo[row.tipo] =
            (totalPorTipo[row.tipo] || 0) + parseFloat(row.total);
          totalPorMotivo[row.motivo] =
            (totalPorMotivo[row.motivo] || 0) + parseFloat(row.total);
        });

        const tableBodyTipo = [
          [
            { text: "Tipo", style: "tableHeader" },
            { text: "Soma", style: "tableHeader" },
          ],
        ];
        for (const [tipo, soma] of Object.entries(totalPorTipo)) {
          tableBodyTipo.push([
            { text: tipo, style: "tableCell" },
            { text: `R$ ${soma.toFixed(2)}`, style: "tableCell" },
          ]);
        }

        const tableBodyMotivo = [
          [
            { text: "Motivo", style: "tableHeader" },
            { text: "Soma", style: "tableHeader" },
          ],
        ];
        for (const [mot, soma] of Object.entries(totalPorMotivo)) {
          tableBodyMotivo.push([
            { text: mot, style: "tableCell" },
            { text: `R$ ${soma.toFixed(2)}`, style: "tableCell" },
          ]);
        }

        const totalGeral = Object.values(totalPorMotivo).reduce(
          (acc, v) => acc + v,
          0
        );

        docDefinition.content.push(
          { text: "Por Tipo", style: "subheader" },
          { table: { headerRows: 1, widths: ["*", "*"], body: tableBodyTipo } },
          { text: "Por Motivo", style: "subheader" },
          {
            table: { headerRows: 1, widths: ["*", "*"], body: tableBodyMotivo },
          },
          {
            text: `TOTAL GERAL: R$ ${totalGeral.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            style: "totalGeral",
          }
        );
      } else {
        const conferentes = [...new Set(rows.map((row) => row.conferente))];

        conferentes.forEach((conferente) => {
          const ocorrencias = rows.filter((r) => r.conferente === conferente);
          const romaneios = [...new Set(ocorrencias.map((o) => o.numero))];

          romaneios.forEach((romaneio) => {
            const produtos = ocorrencias.filter((o) => o.numero === romaneio);

            if (produtos.length === 0) return; // Se não tem itens filtrados, pula

            const motoristaNome = produtos[0].motorista
              .split(" ")
              .slice(0, 2)
              .join(" ");

            docDefinition.content.push(
              {
                canvas: [
                  { type: "rect", x: 0, y: 0, w: 500, h: 20, color: "#d3d3d3" },
                ],
              },
              {
                text: `CONFERENTE -> ${conferente.toUpperCase()}`,
                style: "subheader",
                alignment: "center",
                margin: [0, -15, 0, 10],
              }
            );

            docDefinition.content.push({
              text: `ROMANEIO: ${romaneio}  MOTORISTA: ${motoristaNome}`,
              style: "subheader",
            });
            docDefinition.content.push({
              text: `DATA: ${new Date(produtos[0].data).toLocaleDateString(
                "pt-BR"
              )}`,
              style: "tableCell",
            });
            docDefinition.content.push({
              text: `DESCRIÇÃO: ${produtos[0].descricao?.trim() || ""}`,
              style: "tableCell",
            });

            const tableBody = [
              [
                { text: "Cliente", style: "tableHeader" },
                { text: "Produto", style: "tableHeader" },
                { text: "Qtd", style: "tableHeader" },
                { text: "Unidade", style: "tableHeader" },
                { text: "Valor", style: "tableHeader" },
                { text: "Total", style: "tableHeader" },
                { text: "Motivo", style: "tableHeader" },
                { text: "Tipo", style: "tableHeader" },
              ],
            ];

            produtos.forEach((produto) => {
              tableBody.push([
                { text: produto.cliente.trim(), style: "tableCell" },
                { text: produto.produto_nome.trim(), style: "tableCell" },
                { text: String(produto.quantidade), style: "tableCell" },
                { text: produto.produto_unidade.trim(), style: "tableCell" },
                {
                  text: `R$${parseFloat(produto.valor).toFixed(2)}`,
                  style: "tableCell",
                },
                {
                  text: `R$${parseFloat(produto.total).toFixed(2)}`,
                  style: "tableCell",
                },
                { text: produto.motivo.trim(), style: "tableCell" },
                { text: produto.tipo.trim(), style: "tableCell" },
              ]);
            });

            const totalOcorrencia = produtos.reduce(
              (acc, p) => acc + parseFloat(p.total),
              0
            );

            docDefinition.content.push({
              table: {
                headerRows: 1,
                widths: [90, 90, 20, 40, 40, 40, 70, 40],
                body: tableBody,
              },
              layout: "noBorders",
              margin: [0, 0, 0, 10],
            });
            docDefinition.content.push({
              text: `TOTAL OCORRÊNCIA: R$${totalOcorrencia.toLocaleString(
                "pt-BR",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}`,
              style: "totalOcorrencia",
            });
          });
        });
      }

      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const writeStream = fs.createWriteStream("relatorio.pdf");

      pdfDoc.pipe(writeStream);
      pdfDoc.end();

      writeStream.on("finish", () => {
        res.download("relatorio.pdf");
      });
    });
  });

  return router;
};
