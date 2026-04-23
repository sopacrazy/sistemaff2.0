const PdfPrinter = require("pdfmake");
const fs = require("fs");

// Fontes que o PdfPrinter vai utilizar
const fonts = {
  Roboto: {
    normal: "fonts/Roboto-Regular.ttf",
    bold: "fonts/Roboto-Bold.ttf",
    italics: "fonts/Roboto-Italic.ttf",
    bolditalics: "fonts/Roboto-BoldItalic.ttf",
  },
};

// Função para formatar valores no padrão brasileiro
function formatCurrency(value) {
  return `R$ ${parseFloat(value)
    .toFixed(2)
    .replace(/\d(?=(\d{3})+\.)/g, "$&.")}`.replace(".", ",");
}

// Função para calcular os dias em atraso
function calculateDaysLate(vencimento) {
  if (!vencimento || vencimento.trim() === "") {
    return 0; // Se a data for nula ou vazia, retornar 0 dias de atraso
  }

  // Verificar se a data está no formato YYYYMMDD e fazer a conversão para YYYY-MM-DD
  if (vencimento.length === 8) {
    const year = vencimento.substring(0, 4);
    const month = vencimento.substring(4, 6);
    const day = vencimento.substring(6, 8);
    vencimento = `${year}-${month}-${day}`;
  }

  const vencimentoDate = new Date(vencimento);
  if (isNaN(vencimentoDate.getTime())) {
    return 0; // Se a data for inválida, retornar 0 dias de atraso
  }

  const hoje = new Date();
  const diffTime = hoje - vencimentoDate;

  // Calcular a diferença em dias
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
}

// Função para calcular a média de dias em atraso
function calculateAverageDaysLate(titulos) {
  const totalDias = titulos.reduce(
    (sum, titulo) => sum + calculateDaysLate(titulo.E1_VENCREA),
    0
  );
  return Math.ceil(totalDias / titulos.length);
}

// Função para determinar o status dos clientes
function getSituacaoClientes(clientesEmAtraso) {
  if (clientesEmAtraso > 20) {
    return { situacao: "Muitos clientes em atraso", color: "red" };
  } else if (clientesEmAtraso >= 10) {
    return { situacao: "Mediano em atrasos", color: "yellow" };
  } else {
    return { situacao: "Poucos clientes", color: "green" };
  }
}

// Função para formatar corretamente as datas no formato YYYYMMDD
function formatDate(dateString) {
  if (!dateString || dateString.trim() === "") {
    return "-"; // Substituir valor nulo ou vazio por um traço
  }

  // Verificar se a data está no formato YYYYMMDD e fazer a conversão
  if (dateString.length === 8) {
    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);
    dateString = `${year}-${month}-${day}`; // Converte para YYYY-MM-DD
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return "-"; // Substituir "Invalid Date" por um traço se a data for inválida
  }
  return date.toLocaleDateString("pt-BR");
}

// Função para gerar o relatório PDF de fiado por vendedor
async function generateFiadoVendedorReport(vendedor, titulos) {
  const printer = new PdfPrinter(fonts);

  // Cálculos para o resumo
  const totalClientesEmAtraso = titulos.length;
  const valorTotalClientes = titulos.reduce(
    (sum, item) => sum + parseFloat(item.E1_SALDO),
    0
  );
  const mediaDiasAtraso = calculateAverageDaysLate(titulos);
  const situacaoClientes = getSituacaoClientes(totalClientesEmAtraso);

  // Definir o conteúdo do PDF com layout conforme solicitado
  const docDefinition = {
    content: [
      {
        columns: [
          // Logo à esquerda
          {
            image: "src/img/logo.png", // Caminho para a logo
            width: 50,
            alignment: "left",
          },
          // Informações da empresa ao lado da logo
          {
            text: [
              { text: "FORT FRUIT LTDA\n", fontSize: 12, bold: true }, // Nome maior e negrito
              {
                text: "ALAMEDA CEASA, SN\nCURIO, BELEM, PA\nCEP: 66.610-120\nPABX/FAX: 55-91-32457463\nCNPJ: 02.338.006/0001-07\nI.E.: 151.977.887",
                fontSize: 8,
              },
            ],
            margin: [10, 0],
          },
          // Resumo do vendedor à direita
          {
            stack: [
              {
                text: `Resumo do Vendedor: ${vendedor}`,
                fontSize: 10,
                bold: true,
                alignment: "right",
              },
              {
                text: `Valor total dos clientes em atraso: ${formatCurrency(
                  valorTotalClientes
                )}`,
                fontSize: 8,
                alignment: "right",
              },
              {
                text: `Média de dias em atraso: ${mediaDiasAtraso} dias`,
                fontSize: 8,
                alignment: "right",
              },
              {
                text: `${situacaoClientes.situacao}`,
                fontSize: 8,
                bold: true,
                alignment: "right",
                color: situacaoClientes.color,
              },
            ],
            alignment: "right",
          },
        ],
      },
      {
        style: "tableExample",
        table: {
          widths: ["auto", "auto", "auto", "auto", "*", "auto", "auto", "auto"], // Adicionamos "Saldo Devedor" como última coluna
          body: [
            [
              { text: "Numero", bold: true },
              { text: "Nota", bold: true }, // Coluna para Nota
              { text: "Data Emissão", bold: true },
              { text: "Vencimento", bold: true },
              { text: "Cliente", bold: true },
              { text: "Valor Bruto", bold: true },
              { text: "Dias em Atraso", bold: true }, // Movido para antes de "Saldo Devedor"
              { text: "Saldo Devedor", bold: true }, // Nova coluna para Saldo Devedor
            ],
            ...titulos.map((titulo) => [
              titulo.E1_NUM,
              titulo.Z4_NOTA || "-", // Nota
              formatDate(titulo.E1_EMISSAO), // Data de Emissão formatada corretamente
              formatDate(titulo.E1_VENCREA), // Data de Vencimento formatada corretamente
              titulo.E1_NOMCLI, // Nome do cliente
              formatCurrency(titulo.E1_VALOR), // Formatar o valor corretamente
              calculateDaysLate(titulo.E1_VENCREA), // Calcular dias em atraso
              formatCurrency(titulo.E1_SALDO), // Formatar o saldo devedor corretamente
            ]),
          ],
        },
        layout: "noBorders", // Remover as bordas da tabela
      },
      {
        columns: [
          { text: "TOTAL CLIENTE --->", bold: true, alignment: "left" },
          {
            text: formatCurrency(
              titulos.reduce((sum, item) => sum + parseFloat(item.E1_VALOR), 0)
            ), // Formatar o total
            bold: true,
            alignment: "right",
          },
        ],
      },
    ],
    styles: {
      headerInfo: {
        fontSize: 8, // Diminuir o tamanho da fonte para manter mais conteúdo na linha
        bold: true,
        margin: [0, 0, 0, 10],
      },
      tableExample: {
        margin: [0, 5, 0, 15],
        fontSize: 8, // Diminuir o tamanho da fonte na tabela
      },
      tableHeader: {
        bold: true,
        fontSize: 9,
        color: "black",
      },
    },
  };

  const pdfDoc = printer.createPdfKitDocument(docDefinition);

  // Salvar o PDF como um arquivo temporário ou retornar o stream diretamente
  return new Promise((resolve, reject) => {
    const chunks = [];
    pdfDoc.on("data", (chunk) => chunks.push(chunk));
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
    pdfDoc.on("error", reject);
    pdfDoc.end();
  });
}

module.exports = generateFiadoVendedorReport;
