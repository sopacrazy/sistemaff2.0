const PdfPrinter = require("pdfmake");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// Configuração das fontes (ajustado para subir um nível, se as fontes estiverem na pasta raiz 'fonts')
const fonts = {
  Roboto: {
    normal: path.join(__dirname, "..", "fonts", "Roboto-Regular.ttf"),
    bold: path.join(__dirname, "..", "fonts", "Roboto-Medium.ttf"),
    italics: path.join(__dirname, "..", "fonts", "Roboto-Italic.ttf"),
    bolditalics: path.join(__dirname, "..", "fonts", "Roboto-MediumItalic.ttf"),
  },
};

const printer = new PdfPrinter(fonts);

// Função para chamar a API da DeepSeek e gerar análise
async function generateAnalysisWithDeepSeek(data) {
  const apiKey = process.env.DEEPSEEK_API_KEY; // Chave da API em variáveis de ambiente
  const apiUrl = "https://api.deepseek.com/v1/chat/completions"; // Endpoint corrigido

  try {
    const response = await axios.post(
      apiUrl,
      {
        model: "deepseek-chat", // Modelo da IA
        messages: [
          {
            role: "user",
            content:
              "Analise os dados e gere um resumo com insights relevantes.",
          },
        ],
        data: data, // Dados enviados para análise
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.analysis; // Supondo que a API retorne um campo "analysis"
  } catch (error) {
    console.error("Erro ao chamar a API da DeepSeek:", error);
    return "Erro ao gerar análise.";
  }
}

// Função principal para gerar o relatório PDF
async function generatePdfReport(
  excelFilePath,
  selectedCompany,
  numColumns,
  numRows
) {
  return new Promise(async (resolve, reject) => {
    try {
      // 1) Ler o arquivo Excel e converter para array de arrays
      const workbook = XLSX.readFile(excelFilePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // 2) Limitar as linhas e colunas conforme os parâmetros
      const limitedData = jsonData
        .slice(0, numRows)
        .map((row) => row.slice(0, numColumns));

      // 3) Funções auxiliares para formatação
      function toBRL(value) {
        return new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(value);
      }

      function formatDateYYYYMMDD(value) {
        let str = String(value).padStart(8, "0");
        const year = str.slice(0, 4);
        const month = str.slice(4, 6);
        const day = str.slice(6, 8);
        return `${day}/${month}/${year}`;
      }

      // 4) Somar os valores numéricos (ignorando cabeçalho e células que parecem datas)
      const sums = new Array(numColumns).fill(0);
      for (let r = 1; r < limitedData.length; r++) {
        const row = limitedData[r];
        for (let c = 0; c < row.length; c++) {
          const val = parseFloat(row[c]);
          // Se for número e não for uma data (8 dígitos)
          if (!isNaN(val) && String(Math.floor(val)).length !== 8) {
            sums[c] += val;
          }
        }
      }
      const sumRow = new Array(numColumns).fill("");
      sumRow[0] = "TOTAL";
      for (let c = 1; c < numColumns; c++) {
        if (sums[c] !== 0) {
          sumRow[c] = sums[c].toString();
        }
      }
      const dataWithSum = [...limitedData, sumRow];

      // 5) Converter os valores: datas ou moeda
      const convertedData = dataWithSum.map((row, rowIndex) => {
        // Cabeçalho permanece sem alteração
        if (rowIndex === 0) return row;
        // Linha de total (última linha)
        if (rowIndex === dataWithSum.length - 1) {
          return row.map((cell, colIndex) => {
            if (colIndex === 0) return cell;
            const parsed = parseFloat(cell);
            if (!isNaN(parsed)) return toBRL(parsed);
            return cell;
          });
        }
        // Demais linhas
        return row.map((cell) => {
          // Se for string com 8 dígitos numéricos, trata como data
          if (
            typeof cell === "string" &&
            cell.length === 8 &&
            /^\d+$/.test(cell)
          ) {
            return formatDateYYYYMMDD(cell);
          }
          // Se for número, verificar se possui 8 dígitos
          const parsed = parseFloat(cell);
          if (!isNaN(parsed)) {
            if (String(Math.floor(parsed)).length === 8) {
              return formatDateYYYYMMDD(parsed);
            } else {
              return toBRL(parsed);
            }
          }
          return cell;
        });
      });

      // 6) Definir título e logo
      let headerTitle = "";
      let logoPath = "";
      if (selectedCompany === "Fort Fruit") {
        // Cabeçalho com informações adicionais para Fort Fruit
        headerTitle =
          "Fort Fruit - Relatório\nAlamenda ceasa, SN\nCurio, Belem, PA";
        logoPath = path.join(__dirname, "..", "assets", "fortfruit-logo.png");
      } else if (selectedCompany === "Bem Pra gente") {
        headerTitle = "Bem Pra gente - Relatório";
        logoPath = path.join(
          __dirname,
          "..",
          "assets",
          "bempraagente-logo.png"
        );
      }

      let logoData = "";
      try {
        const logoFile = fs.readFileSync(logoPath);
        logoData = "data:image/png;base64," + logoFile.toString("base64");
      } catch (err) {
        console.error("Erro ao ler a logo:", err);
      }

      // 7) Gerar análise com a DeepSeek
      const analysisText = await generateAnalysisWithDeepSeek(convertedData);

      // 8) Montar o docDefinition com layout customizado para a tabela
      const docDefinition = {
        pageSize: "A4",
        pageOrientation: "landscape",
        pageMargins: [20, 20, 20, 20],
        content: [
          {
            image: logoData,
            width: 100,
            alignment: "center",
          },
          {
            text: headerTitle,
            style: "header",
            alignment: "center",
            margin: [0, 10, 0, 20],
          },
          {
            table: {
              headerRows: 1,
              widths: Array(numColumns).fill("*"),
              body: [convertedData[0], ...convertedData.slice(1)],
            },
            // Layout customizado: alterna cores de fundo para as linhas
            layout: {
              fillColor: function (rowIndex, node, columnIndex) {
                if (rowIndex === 0) return "#D3D3D3";
                return rowIndex % 2 === 0 ? "#F5F5F5" : "#FFFFFF";
              },
              hLineColor: "#CCCCCC",
              vLineColor: "#CCCCCC",
            },
            style: "tableExample",
          },
          {
            text: "Análise Automática",
            style: "header",
            margin: [0, 20, 0, 10],
          },
          {
            text: analysisText,
            style: "analysisText",
            margin: [0, 0, 0, 20],
          },
        ],
        styles: {
          header: {
            fontSize: 16,
            bold: true,
          },
          tableExample: {
            fontSize: 9,
            noWrap: false,
          },
          analysisText: {
            fontSize: 10,
            color: "#333333",
          },
        },
      };

      // 9) Gerar o PDF e retornar como Buffer
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks = [];
      pdfDoc.on("data", (chunk) => {
        chunks.push(chunk);
      });
      pdfDoc.on("end", () => {
        const result = Buffer.concat(chunks);
        resolve(result);
      });
      pdfDoc.on("error", (err) => {
        reject(err);
      });
      pdfDoc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = generatePdfReport;
