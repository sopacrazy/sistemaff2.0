// routes/relatorioFaltas.js
const PDFDocument = require("pdfkit");
const path = require("path");

const LOGO_PATH = path.join(__dirname, "../public/logo_fortfruit.png");

const LOC_DESC_MAP = {
  "01": "Loja",
  "02": "Depósito",
  "03": "BTF",
  "04": "Banana",
  "05": "Dep. Ovo",
  "06": "Torres",
  "07": "CD",
  "09": "Passarela 1",
};

// Formatadores
const nf2 = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const formatDate = (d) =>
  new Date(d).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

async function gerarRelatorioFaltas(dbOcorrencias, { data, local }, res) {
  // Busca itens
  const [rows] = await dbOcorrencias.promise().query(
    `SELECT 
         cod_produto AS codigo,
         produto,
         unidade,
         saldo_calc AS saldo,
         fisico,
         falta,
         observacao,
         usuario,
         criado_em
       FROM faltas_fechamento
       WHERE data = ? AND local = ?
         AND (falta IS NOT NULL AND falta <> 0)
       ORDER BY produto`,
    [data, local]
  );

  // Resumo
  const [resumo] = await dbOcorrencias.promise().query(
    `SELECT 
         local,
         data,
         COALESCE(MAX(usuario), '-') AS usuario,
         MAX(criado_em) AS fechado_em
       FROM faltas_fechamento
       WHERE data = ? AND local = ?
       GROUP BY local, data
       LIMIT 1`,
    [data, local]
  );

  const info = resumo[0] || {
    local,
    data,
    usuario: "-",
    fechado_em: null,
  };

  const localDesc = LOC_DESC_MAP[String(info.local)] || String(info.local);
  const fechadoHora = info.fechado_em
    ? new Date(info.fechado_em).toLocaleTimeString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      })
    : "-";

  const totalItens = rows.length;
  const somaFaltas = rows.reduce((acc, r) => acc + (Number(r.falta) || 0), 0);

  // PDF setup
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="folha_faltas_${local}_${data}.pdf"`
  );

  const doc = new PDFDocument({
    margin: 36,
    size: "A4",
    info: { Title: "Fechamento" },
  });
  doc.pipe(res);

  let y = 36;

  // Logo
  try {
    doc.image(LOGO_PATH, 36, y, { fit: [120, 42] });
  } catch {}
  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .text("Fechamento", 0, y + 10, { align: "center" });

  y += 60;

  // Bloco de informações
  y = drawInfoBar(doc, y, [
    { label: "Local", value: `${localDesc} (${info.local})` },
    { label: "Data", value: formatDate(info.data) },
    { label: "Usuário", value: info.usuario },
    { label: "Fechado às", value: fechadoHora },
  ]);

  y += 15;

  // Config tabela
  const tableX = 36;
  const tableW = doc.page.width - 72;
  const cols = [
    { key: "codigo", title: "Código", w: 50, align: "left" },
    { key: "produto", title: "Produto", w: 180, align: "left" },
    { key: "unidade", title: "Unid.", w: 40, align: "center" },
    { key: "saldo", title: "Saldo", w: 50, align: "right" },
    { key: "fisico", title: "Físico", w: 50, align: "right" },
    { key: "falta", title: "Falta", w: 50, align: "right" },
    {
      key: "observacao",
      title: "Observação",
      w: tableW - (60 + 200 + 50 + 70 + 70 + 70),
      align: "left",
    },
  ];

  drawHeaderRow(doc, tableX, y, tableW, cols);
  y += 24;

  // Linhas
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const h = 18;

    if (y + h > doc.page.height - 60) {
      drawFooterPage(doc);
      doc.addPage();
      y = 36;

      y = drawInfoBar(doc, y, [
        { label: "Local", value: `${localDesc} (${info.local})` },
        { label: "Data", value: formatDate(info.data) },
        { label: "Usuário", value: info.usuario },
        { label: "Fechado às", value: fechadoHora },
      ]);
      y += 15;

      drawHeaderRow(doc, tableX, y, tableW, cols);
      y += 24;
    }

    if (i % 2 === 0) {
      doc
        .save()
        .rect(tableX, y - 2, tableW, h)
        .fill("#f6f6f6")
        .restore();
    }

    let x = tableX;
    drawCell(doc, r.codigo, x, y, cols[0].w, "left");
    x += cols[0].w;
    drawCell(doc, r.produto, x, y, cols[1].w, "left");
    x += cols[1].w;
    drawCell(doc, r.unidade, x, y, cols[2].w, "center");
    x += cols[2].w;
    drawCell(doc, nf2.format(r.saldo), x, y, cols[3].w, "right");
    x += cols[3].w;
    drawCell(doc, nf2.format(r.fisico), x, y, cols[4].w, "right");
    x += cols[4].w;

    doc.font("Helvetica-Bold");
    drawCell(doc, nf2.format(r.falta), x, y, cols[5].w, "right");
    doc.font("Helvetica");
    x += cols[5].w;

    drawCell(doc, r.observacao || "", x, y, cols[6].w, "left");

    y += h;
  }

  // Totais
  y += 6;
  doc
    .save()
    .rect(tableX, y - 2, tableW, 20)
    .fill("#f6f6f6")
    .restore();
  doc
    .font("Helvetica-Bold")
    .text("Total de itens com falta", tableX + 4, y + 4);
  doc.text(String(totalItens), tableX, y + 4, {
    width: tableW,
    align: "right",
  });

  y += 22;
  doc
    .save()
    .rect(tableX, y - 2, tableW, 20)
    .fill("#f6f6f6")
    .restore();
  doc.font("Helvetica-Bold").text("Soma das faltas", tableX + 4, y + 4);
  doc.text(nf2.format(somaFaltas), tableX, y + 4, {
    width: tableW,
    align: "right",
  });

  drawFooterPage(doc);
  doc.end();
}

// Helpers
function drawInfoBar(doc, y, items) {
  doc
    .save()
    .rect(36, y, doc.page.width - 72, 26)
    .fill("#f7f9fb")
    .restore();
  const colW = (doc.page.width - 72) / items.length;
  let x = 36;
  doc.fontSize(10);
  items.forEach(({ label, value }) => {
    doc
      .font("Helvetica")
      .fillColor("#666")
      .text(`${label}:`, x + 6, y + 6, {
        width: colW - 12,
        continued: true,
      });
    doc.font("Helvetica-Bold").fillColor("#000").text(` ${value}`);
    x += colW;
  });
  doc.fillColor("#000");
  return y + 26;
}
function drawHeaderRow(doc, x, y, tableW, cols) {
  doc
    .save()
    .rect(x, y - 14, tableW, 22)
    .fill("#e9edf0")
    .restore();
  let cursorX = x;
  doc.fontSize(10).font("Helvetica-Bold");
  cols.forEach((c) => {
    doc.text(c.title, cursorX + 4, y - 10, { width: c.w - 8, align: c.align });
    cursorX += c.w;
  });
  doc.font("Helvetica");
}
function drawCell(doc, text, x, y, w, align) {
  doc.fontSize(10).text(String(text || ""), x + 4, y, { width: w - 8, align });
}
function drawFooterPage(doc) {
  const footerY = doc.page.height - 30;
  doc
    .fontSize(8)
    .fillColor("#666")
    .text(
      `Impresso em ${new Date().toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      })}`,
      36,
      footerY,
      { width: doc.page.width - 72, align: "right" }
    );
  doc.fillColor("black");
}

module.exports = { gerarRelatorioFaltas };
