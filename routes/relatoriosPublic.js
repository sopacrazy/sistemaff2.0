// routes/relatoriosPublic.js (ou adicione no mesmo arquivo onde já tem /relatorios-public/faltas/pdf)
import express from "express";
import PdfPrinter from "pdfmake";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../db.js"; // <- usa o seu pool mysql2/promise

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ====== fontes do pdfmake (ajuste os caminhos conforme seu projeto) ======
const fonts = {
  Roboto: {
    normal: path.join(__dirname, "../fonts/Roboto-Regular.ttf"),
    bold: path.join(__dirname, "../fonts/Roboto-Medium.ttf"),
    italics: path.join(__dirname, "../fonts/Roboto-Italic.ttf"),
    bolditalics: path.join(__dirname, "../fonts/Roboto-MediumItalic.ttf"),
  },
};
// Se você já tem um util global de PdfPrinter, pode reutilizar.
const printer = new PdfPrinter(fonts);

// (opcional) label dos locais
const NOME_LOCAL = {
  "09": "PASSARELA 1",
  "06": "TORRES",
  "03": "BTF",
  "04": "BANANA",
  "07": "CD",
  "01": "LOJA",
  "05": "DEP. OVO",
  "02": "DEPOSITO",
};

// util simples
const fmtNum = (v) =>
  typeof v === "number"
    ? v.toLocaleString("pt-BR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
      })
    : v ?? "";

router.get("/faltas-mov/pdf", async (req, res) => {
  try {
    const data = String(req.query.data || "").slice(0, 10); // "YYYY-MM-DD"
    const local = String(req.query.local || "").padStart(2, "0");

    if (!data || !local) {
      return res
        .status(400)
        .json({ error: "Parâmetros obrigatórios: data, local" });
    }

    // 1) lista de produtos em falta (distinct)
    const [faltas] = await pool.query(
      `
      SELECT DISTINCT
        f.data,
        f.local,
        TRIM(f.cod_produto)       AS cod_produto,
        f.produto,
        f.unidade,
        f.saldo_calc
      FROM faltas_fechamento f
      WHERE f.local = ? AND f.data = ?
      ORDER BY f.cod_produto
      `,
      [local, data]
    );

    if (!faltas.length) {
      // Gera um PDF simples avisando que não há faltas
      const docDefinition = {
        pageMargins: [22, 32, 22, 32],
        content: [
          { text: "Faltas por Produto (Movimentação)", style: "h1" },
          {
            text: `Data: ${data}   Local: ${NOME_LOCAL[local] || local}`,
            margin: [0, 6, 0, 12],
          },
          {
            text: "Nenhum produto em falta encontrado para os parâmetros informados.",
          },
        ],
        styles: {
          h1: { fontSize: 14, bold: true },
        },
      };
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="faltas-mov-${local}-${data}.pdf"`
      );
      pdfDoc.pipe(res);
      pdfDoc.end();
      return;
    }

    // 2) busca TODAS as transferências desses produtos no MESMO dia
    //    normalizando o código (removendo pontos)
    const [movs] = await pool.query(
      `
      SELECT
        f.cod_produto                         AS cod_produto_falta,
        f.produto                             AS nome_produto,
        f.unidade,
        f.saldo_calc,
        t.numero,
        t.origem,
        t.destino,
        t.quantidade,
        t.status,
        t.usuario,
        t.carregador,
        t.data_inclusao
      FROM (
        SELECT DISTINCT
          f.data, f.local,
          TRIM(f.cod_produto) AS cod_produto,
          f.produto, f.unidade, f.saldo_calc
        FROM faltas_fechamento f
        WHERE f.local = ? AND f.data = ?
      ) f
      JOIN transferencias_estoque t
        ON REPLACE(TRIM(t.cod_produto), '.', '') = f.cod_produto
       AND DATE(t.data_inclusao) = f.data
      ORDER BY f.cod_produto, t.data_inclusao, t.origem, t.destino
      `,
      [local, data]
    );

    // Agrupa por produto
    const porProduto = new Map();
    for (const row of movs) {
      const key = row.cod_produto_falta;
      if (!porProduto.has(key)) {
        porProduto.set(key, {
          info: {
            cod_produto: row.cod_produto_falta,
            produto: row.nome_produto,
            unidade: row.unidade,
            saldo_calc: row.saldo_calc,
          },
          linhas: [],
        });
      }
      // classifica mov. relativo ao local solicitado
      let movimento = "OUTRA_BASE";
      if (row.origem === local) movimento = "SAÍDA";
      else if (row.destino === local) movimento = "ENTRADA";

      porProduto.get(key).linhas.push({
        data_inclusao: row.data_inclusao,
        origem: row.origem,
        destino: row.destino,
        movimento,
        quantidade: row.quantidade,
        status: row.status,
        usuario: row.usuario,
        carregador: row.carregador,
        numero: row.numero,
      });
    }

    // Monta conteúdo do PDF
    const conteudo = [
      { text: "Faltas por Produto (Movimentação)", style: "h1" },
      {
        text: `Data: ${data}   Local: ${NOME_LOCAL[local] || local}`,
        margin: [0, 6, 0, 2],
      },
      {
        text: `Produtos em falta: ${faltas.length}${
          movs.length ? `   |   Transferências encontradas: ${movs.length}` : ""
        }`,
        margin: [0, 0, 0, 12],
      },
    ];

    // Para cada produto, cria uma seção com tabela
    for (const [cod, grupo] of porProduto) {
      const info = grupo.info;
      const linhas = grupo.linhas;

      // header da seção do produto
      conteudo.push(
        {
          canvas: [
            { type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 },
          ],
          margin: [0, 8, 0, 8],
        },
        {
          columns: [
            { text: `Produto: ${info.produto}`, bold: true },
            { text: `Código: ${info.cod_produto}`, alignment: "center" },
            {
              text: `Unid: ${info.unidade}   |   Falta: ${fmtNum(
                info.saldo_calc
              )}`,
              alignment: "right",
            },
          ],
        }
      );

      if (!linhas.length) {
        conteudo.push({
          text: "Sem transferências no dia.",
          italics: true,
          margin: [0, 2, 0, 8],
        });
        continue;
      }

      // soma entradas/saídas p/ mini resumo
      const resumo = linhas.reduce(
        (acc, r) => {
          if (r.movimento === "ENTRADA")
            acc.entrada += Number(r.quantidade) || 0;
          else if (r.movimento === "SAÍDA")
            acc.saida += Number(r.quantidade) || 0;
          return acc;
        },
        { entrada: 0, saida: 0 }
      );

      conteudo.push({
        text: `Entradas: ${fmtNum(resumo.entrada)}   |   Saídas: ${fmtNum(
          resumo.saida
        )}   |   Líquido: ${fmtNum(resumo.entrada - resumo.saida)}`,
        margin: [0, 2, 0, 6],
      });

      // tabela de movimentações
      const body = [
        [
          { text: "Hora", style: "th" },
          { text: "Origem → Destino", style: "th" },
          { text: "Mov.", style: "th", alignment: "center" },
          { text: "Qtd", style: "th", alignment: "right" },
          { text: "Status", style: "th" },
          { text: "Usuário", style: "th" },
          { text: "Carregador", style: "th" },
          { text: "Nº", style: "th", alignment: "right" },
        ],
      ];

      for (const r of linhas) {
        const hora = new Date(r.data_inclusao).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });
        body.push([
          { text: hora },
          { text: `${r.origem} → ${r.destino}` },
          { text: r.movimento, alignment: "center" },
          { text: fmtNum(r.quantidade), alignment: "right" },
          { text: r.status || "" },
          { text: r.usuario || "" },
          { text: r.carregador || "" },
          { text: String(r.numero || ""), alignment: "right" },
        ]);
      }

      conteudo.push({
        table: {
          headerRows: 1,
          widths: [40, "*", 48, 45, 60, 60, 70, 40],
          body,
        },
        layout: "lightHorizontalLines",
        fontSize: 9,
        margin: [0, 0, 0, 8],
      });
    }

    // Se algum produto em falta não teve nenhuma transferência,
    // ainda é legal listá-los (visibilidade total):
    const produtosSemMov = faltas.filter(
      (f) => !porProduto.has(String(f.cod_produto).trim())
    );
    if (produtosSemMov.length) {
      conteudo.push(
        {
          canvas: [
            { type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 },
          ],
          margin: [0, 8, 0, 8],
        },
        {
          text: "Produtos sem movimentação no dia:",
          bold: true,
          margin: [0, 0, 0, 4],
        }
      );
      for (const f of produtosSemMov) {
        conteudo.push({
          text: `• ${f.produto} (cód. ${String(f.cod_produto).trim()} | unid ${
            f.unidade
          } | falta ${fmtNum(f.saldo_calc)})`,
          fontSize: 9,
          margin: [0, 0, 0, 2],
        });
      }
    }

    const docDefinition = {
      pageSize: "A4",
      pageMargins: [22, 32, 22, 40],
      footer: (currentPage, pageCount) => ({
        margin: [22, 0, 22, 10],
        fontSize: 8,
        columns: [
          { text: `Gerado em ${new Date().toLocaleString("pt-BR")}` },
          { text: `Página ${currentPage} / ${pageCount}`, alignment: "right" },
        ],
      }),
      content: conteudo,
      styles: {
        h1: { fontSize: 14, bold: true },
        th: { bold: true },
      },
      defaultStyle: { font: "Roboto" },
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="faltas-mov-${local}-${data}.pdf"`
    );
    pdfDoc.pipe(res);
    pdfDoc.end();
  } catch (err) {
    console.error("Erro ao gerar PDF faltas-mov:", err);
    res.status(500).json({ error: "Falha ao gerar relatório." });
  }
});

export default router;
