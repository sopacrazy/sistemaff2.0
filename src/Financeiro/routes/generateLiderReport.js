const PdfPrinter = require("pdfmake");

const fonts = {
  Roboto: {
    normal: "fonts/Roboto-Regular.ttf",
    bold: "fonts/Roboto-Bold.ttf",
    italics: "fonts/Roboto-Italic.ttf",
    bolditalics: "fonts/Roboto-BoldItalic.ttf",
  },
};

function formatCurrency(value) {
  const num = parseFloat(value) || 0;
  return `R$ ${num.toFixed(2).replace(".", ",").replace(/\d(?=(\d{3})+,)/g, "$&.")}`;
}

function formatDate(dateString) {
  if (!dateString || dateString.trim() === "") return "-";
  if (dateString.length === 8) {
    dateString = `${dateString.substring(0, 4)}-${dateString.substring(4, 6)}-${dateString.substring(6, 8)}`;
  }
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? "-" : date.toLocaleDateString("pt-BR");
}

function calcDaysLate(vencimento) {
  if (!vencimento || vencimento.trim() === "") return 0;
  if (vencimento.length === 8) {
    vencimento = `${vencimento.substring(0, 4)}-${vencimento.substring(4, 6)}-${vencimento.substring(6, 8)}`;
  }
  const diff = Math.ceil((new Date() - new Date(vencimento)) / 86400000);
  return diff > 0 ? diff : 0;
}

function formatCNPJ(cnpj) {
  if (!cnpj) return "-";
  const c = cnpj.replace(/\D/g, "");
  if (c.length !== 14) return cnpj.trim();
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
}

// A4 content width = 555 pts; última coluna usa * para preencher o espaço restante
const COL_WIDTHS = [45, 55, 55, 55, 40, 65, 60, "*"];

async function generateLiderReport(lojas, empresa, tipo) {
  const printer = new PdfPrinter(fonts);

  const isEmpresa240 = empresa === "240";
  const logoPath = isEmpresa240 ? "assets/bempraagente-logo.png" : "src/img/logo.png";
  const companyName = isEmpresa240 ? "BEM PRA GENTE" : "FORT FRUIT LTDA";
  const companyDetails = isEmpresa240
    ? "ALAMEDA CEASA, SN — CURIÔ, BELÉM, PA — CEP: 66.610-120"
    : "ALAMEDA CEASA, SN — CURIÔ, BELÉM, PA — CEP: 66.610-120 | CNPJ: 02.338.006/0001-07";

  const now = new Date();
  const dataRelatorio = now.toLocaleDateString("pt-BR") + " " +
    now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const filtroLabel = tipo === "vencido" ? "SOMENTE TÍTULOS VENCIDOS" : "TODOS OS TÍTULOS EM ABERTO";

  const totalSaldo = lojas.reduce((s, l) => s + l.titulos.reduce((ss, t) => ss + parseFloat(t.E1_SALDO || 0), 0), 0);
  const totalValor = lojas.reduce((s, l) => s + l.titulos.reduce((ss, t) => ss + parseFloat(t.E1_VALOR || 0), 0), 0);
  const totalDesconto = lojas.reduce((s, l) => s + l.titulos.reduce((ss, t) => ss + parseFloat(t.E1_DESCONT || 0), 0), 0);
  const totalLiquido = lojas.reduce((s, l) => s + l.titulos.reduce((ss, t) => ss + parseFloat(t.E1_VALLIQ || 0), 0), 0);
  const totalTitulos = lojas.reduce((s, l) => s + l.titulos.length, 0);
  const totalLojas = lojas.length;

  // ── Cabeçalho ──────────────────────────────────────────────────────────────
  const header = [
    {
      columns: [
        { image: logoPath, width: 55, alignment: "left" },
        {
          stack: [
            { text: companyName, fontSize: 11, bold: true },
            { text: companyDetails, fontSize: 7, color: "#555555", margin: [0, 1, 0, 0] },
          ],
          margin: [10, 4, 0, 0],
        },
        {
          stack: [
            { text: "RELATÓRIO DE TÍTULOS — GRUPO LIDER", fontSize: 10, bold: true, alignment: "right" },
            { text: "LIDER COMERCIO E INDUSTRIA LTDA", fontSize: 7.5, bold: true, alignment: "right" },
            { text: filtroLabel, fontSize: 7, alignment: "right", italics: true, margin: [0, 1, 0, 0] },
            { text: `Emitido em: ${dataRelatorio}`, fontSize: 7, alignment: "right", color: "#555555", margin: [0, 2, 0, 0] },
          ],
          margin: [0, 4, 0, 0],
        },
      ],
      margin: [0, 0, 0, 8],
    },
    { canvas: [{ type: "line", x1: 0, y1: 0, x2: 555, y2: 0, lineWidth: 1.5, lineColor: "#000000" }], margin: [0, 0, 0, 8] },
  ];

  // ── Resumo (P&B: bordas, sem fundos coloridos) ─────────────────────────────
  const resumo = {
    table: {
      widths: ["*", "*", "*", "*"],
      body: [[
        {
          stack: [
            { text: "TOTAL EM ABERTO", fontSize: 7, bold: true },
            { text: formatCurrency(totalSaldo), fontSize: 12, bold: true },
          ],
          alignment: "center", margin: [6, 5, 6, 5],
        },
        {
          stack: [
            { text: "TÍTULOS", fontSize: 7, bold: true },
            { text: `${totalTitulos}`, fontSize: 12, bold: true },
          ],
          alignment: "center", margin: [6, 5, 6, 5],
        },
        {
          stack: [
            { text: "LOJAS / FILIAIS", fontSize: 7, bold: true },
            { text: `${totalLojas}`, fontSize: 12, bold: true },
          ],
          alignment: "center", margin: [6, 5, 6, 5],
        },
        {
          stack: [
            { text: "CNPJ TRONCO", fontSize: 7, bold: true },
            { text: "05.054.671/00__-__", fontSize: 10, bold: true },
          ],
          alignment: "center", margin: [6, 5, 6, 5],
        },
      ]],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => "#AAAAAA",
      vLineColor: () => "#AAAAAA",
    },
    margin: [0, 0, 0, 12],
  };

  // ── Cabeçalho das colunas da tabela ───────────────────────────────────────
  const tableHeaderRow = [
    { text: "TÍTULO",     style: "thCell" },
    { text: "NF",         style: "thCell" },
    { text: "EMISSÃO",    style: "thCell" },
    { text: "VENCIMENTO", style: "thCell" },
    { text: "ATRASO",     style: "thCell" },
    { text: "VALOR",      style: "thCell" },
    { text: "DESCONTO",   style: "thCell" },
    { text: "SALDO DEVEDOR", style: "thCell" },
  ];

  // ── Seções por loja ────────────────────────────────────────────────────────
  const secoes = [];

  for (const loja of lojas) {
    const { nome, codigo, cnpj, cidade, estado, vendedor, titulos } = loja;

    // Cabeçalho da loja — fundo branco, borda preta, texto preto
    secoes.push({
      table: {
        widths: ["*"],
        body: [[
          {
            columns: [
              {
                stack: [
                  { text: nome || codigo, fontSize: 8.5, bold: true, color: "#000000" },
                  {
                    text: `Cód: ${codigo}   CNPJ: ${formatCNPJ(cnpj)}   ${cidade || ""}${estado ? "/" + estado : ""}`,
                    fontSize: 6.5, color: "#444444",
                  },
                ],
              },
              {
                stack: [
                  { text: `Vendedor: ${vendedor || "-"}`, fontSize: 6.5, color: "#444444", alignment: "right" },
                  { text: `${titulos.length} título(s)`, fontSize: 6.5, color: "#444444", alignment: "right" },
                ],
                alignment: "right",
              },
            ],
            margin: [8, 5, 8, 5],
          },
        ]],
      },
      layout: {
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => "#000000",
        vLineColor: () => "#000000",
      },
      margin: [0, 0, 0, 0],
    });

    // Linhas de títulos — P&B: alternância branco / cinza muito claro, sem cores
    const rows = titulos.map((t, idx) => {
      const dias = calcDaysLate(t.E1_VENCREA);
      const bg = idx % 2 === 0 ? "#FFFFFF" : "#F2F2F2";
      const diasText = dias > 0 ? `${dias}d` : "A vencer";
      const diasBold = dias > 0; // negrito só para vencidos

      return [
        { text: (t.E1_NUM  || "").trim(), style: "tdCell", fillColor: bg },
        { text: (t.Z4_NOTA || "").trim(), style: "tdCell", fillColor: bg },
        { text: formatDate(t.E1_EMISSAO), style: "tdCell", fillColor: bg },
        { text: formatDate(t.E1_VENCREA), style: "tdCell", fillColor: bg },
        { text: diasText, style: "tdCell", bold: diasBold, fillColor: bg },
        { text: formatCurrency(t.E1_VALOR), style: "tdCell", alignment: "right", fillColor: bg },
        { text: formatCurrency(t.E1_DESCONT), style: "tdCell", alignment: "right", fillColor: bg },
        { text: formatCurrency(t.E1_SALDO), style: "tdCell", bold: true, alignment: "right", fillColor: bg },
      ];
    });

    // Subtotal da loja
    const valorLoja = titulos.reduce((s, t) => s + parseFloat(t.E1_VALOR || 0), 0);
    const descLoja = titulos.reduce((s, t) => s + parseFloat(t.E1_DESCONT || 0), 0);
    const saldoLoja = titulos.reduce((s, t) => s + parseFloat(t.E1_SALDO || 0), 0);

    const subtotalRow = [
      {
        text: "SUBTOTAL DA LOJA", colSpan: 5,
        bold: true, fontSize: 7.5, fillColor: "#E8E8E8",
        margin: [4, 3, 4, 3],
      },
      {}, {}, {}, {},
      { text: formatCurrency(valorLoja), bold: true, fontSize: 7.5, fillColor: "#E8E8E8", alignment: "right", margin: [4, 3, 4, 3] },
      { text: formatCurrency(descLoja), bold: true, fontSize: 7.5, fillColor: "#E8E8E8", alignment: "right", margin: [4, 3, 4, 3] },
      { text: formatCurrency(saldoLoja), bold: true, fontSize: 7.5, fillColor: "#E8E8E8", alignment: "right", margin: [4, 3, 4, 3] },
    ];

    secoes.push({
      table: {
        widths: COL_WIDTHS,
        body: [tableHeaderRow, ...rows, subtotalRow],
      },
      layout: {
        hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? 0.5 : 0,
        vLineWidth: () => 0,
        hLineColor: () => "#AAAAAA",
      },
      margin: [0, 0, 0, 10],
    });
  }

  // ── Total geral — fundo branco, borda preta, texto preto ──────────────────
  const totalGeralBlock = {
    table: {
      widths: COL_WIDTHS,
      body: [[
        {
          text: `TOTAL GERAL — ${totalLojas} loja(s) / ${totalTitulos} título(s)`,
          colSpan: 5,
          bold: true, fontSize: 8, color: "#000000", margin: [6, 6, 6, 6],
        },
        {}, {}, {}, {},
        {
          text: formatCurrency(totalValor),
          bold: true, fontSize: 8, color: "#000000", alignment: "right", margin: [4, 6, 4, 6],
        },
        {
          text: formatCurrency(totalDesconto),
          bold: true, fontSize: 8, color: "#000000", alignment: "right", margin: [4, 6, 4, 6],
        },
        {
          text: formatCurrency(totalSaldo),
          bold: true, fontSize: 8.5, color: "#000000", alignment: "right", margin: [4, 6, 4, 6],
        },
      ]],
    },
    layout: {
      hLineWidth: () => 1,
      vLineWidth: () => 1,
      hLineColor: () => "#000000",
      vLineColor: () => "#000000",
    },
    margin: [0, 4, 0, 0],
  };

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [20, 20, 20, 30],
    content: [...header, resumo, ...secoes, totalGeralBlock],
    footer: (page, pages) => ({
      columns: [
        { text: "Sistema FF — Bem pra Gente", fontSize: 6, color: "#888888", margin: [20, 0, 0, 0] },
        { text: `Página ${page} de ${pages}`, fontSize: 6, color: "#888888", alignment: "right", margin: [0, 0, 20, 0] },
      ],
      margin: [0, 6, 0, 0],
    }),
    styles: {
      thCell: {
        fontSize: 7, bold: true, color: "#000000", fillColor: "#DDDDDD",
        margin: [4, 4, 4, 4], alignment: "center",
      },
      tdCell: {
        fontSize: 7, color: "#111111", margin: [4, 3, 4, 3], alignment: "center",
      },
    },
    defaultStyle: { font: "Roboto" },
  };

  const pdfDoc = printer.createPdfKitDocument(docDefinition);

  return new Promise((resolve, reject) => {
    const chunks = [];
    pdfDoc.on("data", (chunk) => chunks.push(chunk));
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
    pdfDoc.on("error", reject);
    pdfDoc.end();
  });
}

module.exports = generateLiderReport;
