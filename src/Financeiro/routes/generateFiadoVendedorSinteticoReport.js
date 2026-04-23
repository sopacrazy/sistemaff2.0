const PdfPrinter = require("pdfmake");
const fs = require("fs");

// Configurações das fontes para o PdfPrinter
const fonts = {
  Roboto: {
    normal: "fonts/Roboto-Regular.ttf",
    bold: "fonts/Roboto-Bold.ttf",
    italics: "fonts/Roboto-Italic.ttf",
    bolditalics: "fonts/Roboto-BoldItalic.ttf",
  },
};

const printer = new PdfPrinter(fonts);

// Função para formatar valores monetários no formato brasileiro
const formatCurrency = (value) => {
  if (isNaN(value) || value === null || value === undefined) {
    value = 0; // Se o valor for inválido, defina como 0
  }
  return `R$ ${parseFloat(value)
    .toFixed(2)
    .replace(/\d(?=(\d{3})+\.)/g, "$&,")}`;
};

// Função para gerar o relatório PDF Sintético
const generateFiadoVendedorSinteticoReport = async (
  vendedor,
  clientesResumo
) => {
  // Agrupar clientes e somar os valores de cada um
  const groupedClientes = clientesResumo.reduce((acc, cliente) => {
    const clienteId = cliente.E1_CLIENTE;
    if (!acc[clienteId]) {
      acc[clienteId] = {
        codigo: cliente.E1_CLIENTE,
        cliente: cliente.E1_NOMCLI,
        valorBruto: 0,
        saldoDevedor: 0,
      };
    }

    // Certifique-se de que os valores sejam somados corretamente, mesmo que venham como null/undefined
    acc[clienteId].valorBruto += parseFloat(cliente.E1_VALOR) || 0;
    acc[clienteId].saldoDevedor += parseFloat(cliente.E1_SALDO) || 0;

    return acc;
  }, {});

  const clientesAgrupados = Object.values(groupedClientes);

  // Calcular o total do saldo devedor
  const totalSaldoDevedor = clientesAgrupados.reduce(
    (sum, cliente) => sum + cliente.saldoDevedor,
    0
  );

  // Definição do layout do documento
  const docDefinition = {
    content: [
      {
        text: `Relatório Sintético - Vendedor: ${vendedor}`,
        fontSize: 20,
        bold: true,
        alignment: "center",
        margin: [0, 0, 0, 20], // Margem inferior para separar do título
      },
      {
        // Definição da tabela de dados
        table: {
          headerRows: 1,
          widths: [80, "*", 100, 100], // Define as larguras das colunas
          body: [
            // Cabeçalho com fundo colorido
            [
              {
                text: "Código",
                bold: true,
                fontSize: 12,
                alignment: "left",
                fillColor: "#CCCCCC",
              },
              {
                text: "Cliente",
                bold: true,
                fontSize: 12,
                alignment: "left",
                fillColor: "#CCCCCC",
              },
              {
                text: "Valor Bruto",
                bold: true,
                fontSize: 12,
                alignment: "right",
                fillColor: "#CCCCCC",
              },
              {
                text: "Saldo Devedor",
                bold: true,
                fontSize: 12,
                alignment: "right",
                fillColor: "#CCCCCC",
              },
            ],
            // Adicionando os dados dos clientes agrupados
            ...clientesAgrupados.map((cliente) => [
              { text: cliente.codigo, fontSize: 10, alignment: "left" },
              { text: cliente.cliente, fontSize: 10, alignment: "left" },
              {
                text: formatCurrency(cliente.valorBruto),
                fontSize: 10,
                alignment: "right",
              },
              {
                text: formatCurrency(cliente.saldoDevedor),
                fontSize: 10,
                alignment: "right",
              },
            ]),
            // Adicionar a linha do totalizador do saldo devedor
            [
              { text: "", colSpan: 2 }, // Deixar duas colunas vazias
              {},
              { text: "Total", bold: true, fontSize: 12, alignment: "right" },
              {
                text: formatCurrency(totalSaldoDevedor),
                bold: true,
                fontSize: 12,
                alignment: "right",
              },
            ],
          ],
        },
        layout: {
          fillColor: (rowIndex) => {
            return rowIndex % 2 === 0 ? "#F5F5F5" : null; // Alternar cor de fundo entre as linhas
          },
        },
      },
    ],
    styles: {
      header: {
        fontSize: 14,
        bold: true,
        margin: [0, 0, 0, 10],
      },
      tableHeader: {
        bold: true,
        fontSize: 12,
        fillColor: "#EEEEEE",
      },
      tableBody: {
        margin: [0, 5, 0, 15],
        fontSize: 10,
        alignment: "right",
      },
    },
    defaultStyle: {
      font: "Roboto", // Define a fonte Roboto como padrão
    },
  };

  // Criando o documento PDF
  const pdfDoc = printer.createPdfKitDocument(docDefinition);

  return new Promise((resolve, reject) => {
    const chunks = [];
    pdfDoc.on("data", (chunk) => chunks.push(chunk)); // Coleta os pedaços do PDF
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks))); // Concatena os pedaços ao final
    pdfDoc.on("error", reject); // Rejeita se houver erros
    pdfDoc.end(); // Finaliza o documento
  });
};

module.exports = generateFiadoVendedorSinteticoReport;
