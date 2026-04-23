const PdfPrinter = require("pdfmake");
const fs = require("fs");
const path = require("path");

const fonts = {
  Roboto: {
    normal: path.resolve(__dirname, "./fonts/Roboto-Regular.ttf"),
    bold: path.resolve(__dirname, "./fonts/Roboto-Medium.ttf"),
    italics: path.resolve(__dirname, "./fonts/Roboto-Italic.ttf"),
    bolditalics: path.resolve(__dirname, "./fonts/Roboto-MediumItalic.ttf"),
  },
};

const printer = new PdfPrinter(fonts);

// Ícones por campo
const iconesCampo = {
  Nome: "🏢",
  CEP: "📮",
  Endereço: "📍",
  Bairro: "🌆",
  Município: "🧭",
  UF: "🏴",
  "Inscrição Estadual": "🧾",
};

function gerarPdfValidacao(clientes) {
  const content = [
    {
      text: "📋 Relatório de Validação de CNPJs",
      style: "header",
      alignment: "center",
      margin: [0, 0, 0, 20],
    },
  ];

  clientes.forEach((cli) => {
    const bloco = [];

    bloco.push({
      text: `Cliente: ${cli.codigo} - ${cli.nome}`,
      style: "subheader",
      margin: [0, 0, 0, 6],
    });

    const subBody = [
      [
        { text: "Campo", style: "tableHeader", alignment: "left" },
        { text: "Valor (ERP)", style: "tableHeader" },
        { text: "Valor (Receita)", style: "tableHeader" },
      ],
    ];

    if (cli.divergencias && cli.divergencias.length > 0) {
      cli.divergencias.forEach((div) => {
        const nomeCampo = `${iconesCampo[div.campo] || ""} ${div.campo}`;
        subBody.push([
          { text: nomeCampo, alignment: "left" },
          { text: div.valorERP || "-", alignment: "left" },
          { text: div.valorReceita || "-", alignment: "left" },
        ]);
      });
    } else {
      subBody.push([
        { text: "-", alignment: "left" },
        { text: "-", alignment: "left" },
        { text: "-", alignment: "left" },
      ]);
    }

    bloco.push({
      table: {
        headerRows: 1,
        widths: [80, "*", "*"], // reduzido o espaço da primeira coluna
        body: subBody,
      },
      layout: {
        fillColor: (rowIndex) => (rowIndex === 0 ? "#f5f5f5" : null),
        hLineColor: () => "#ccc",
        vLineColor: () => "#ccc",
      },
      margin: [0, 0, 0, 20],
    });

    content.push(...bloco);
  });

  const docDefinition = {
    pageOrientation: "landscape",
    pageMargins: [40, 40, 40, 40],
    footer: function (currentPage, pageCount) {
      return {
        columns: [
          { text: "Sistema FF", alignment: "left", margin: [40, 0, 0, 0] },
          {
            text: `Página ${currentPage} de ${pageCount}`,
            alignment: "right",
            margin: [0, 0, 40, 0],
          },
        ],
        fontSize: 8,
      };
    },
    content,
    styles: {
      header: {
        fontSize: 16,
        bold: true,
      },
      subheader: {
        fontSize: 10,
        bold: true,
        margin: [0, 0, 0, 4],
      },
      tableHeader: {
        bold: true,
        fontSize: 9,
        color: "black",
        fillColor: "#f0f0f0",
      },
    },
    defaultStyle: {
      font: "Roboto",
      fontSize: 8,
    },
  };

  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  return pdfDoc;
}

module.exports = gerarPdfValidacao;
