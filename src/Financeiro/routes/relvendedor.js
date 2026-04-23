const fs = require("fs");
const path = require("path");
const PdfPrinter = require("pdfmake");

// Função para ler e converter a imagem para Base64
const carregarImagemBase64 = (caminho) => {
  try {
    const imagem = fs.readFileSync(caminho);
    return "data:image/png;base64," + imagem.toString("base64");
  } catch (error) {
    console.error("Erro ao carregar a imagem:", error);
    return null; // Retorna null se houver erro
  }
};

// Caminho da nova imagem da logo
const caminhoLogo = "./src/img/logo.png"; // Caminho da imagem enviada

// Definindo as fontes para o pdfmake
const fonts = {
  Roboto: {
    normal: "fonts/Roboto-Regular.ttf",
    bold: "fonts/Roboto-Medium.ttf",
    italics: "fonts/Roboto-Italic.ttf",
    bolditalics: "fonts/Roboto-MediumItalic.ttf",
  },
};

const printer = new PdfPrinter(fonts);

// Função para formatar a data no formato correto
const formatarData = (data) => {
  if (!data || data.length !== 8) return "  /  /  "; // Atualizado para mostrar "  /  /  "
  const ano = data.substring(0, 4);
  const mes = data.substring(4, 6);
  const dia = data.substring(6, 8);
  return `${dia}/${mes}/${ano}`;
};

// Função para garantir valores válidos
const safeValue = (value, defaultValue = "-") => {
  return value !== undefined && value !== null ? value : defaultValue;
};

// Função para formatar valores monetários
const formatCurrency = (value) => {
  return !isNaN(value) && value !== null
    ? `R$ ${parseFloat(value)
        .toFixed(2)
        .replace(/\d(?=(\d{3})+\.)/g, "$&,")
        .replace(".", ",")}`
    : "R$ 0,00";
};

// Função para classificar os clientes em grupos
const classificarClientes = (clientes) => {
  const hoje = new Date();
  const seisMesesAtras = new Date(hoje.setMonth(hoje.getMonth() - 6));

  const recentes = [];
  const antigos = [];
  const nuncaCompraram = [];

  clientes.forEach((cliente) => {
    if (!cliente.UltimaCompra || cliente.UltimaCompra === "N/A") {
      nuncaCompraram.push(cliente);
    } else {
      const dataCompra = new Date(
        `${cliente.UltimaCompra.substring(
          0,
          4
        )}-${cliente.UltimaCompra.substring(
          4,
          6
        )}-${cliente.UltimaCompra.substring(6, 8)}`
      );
      if (isNaN(dataCompra)) {
        nuncaCompraram.push(cliente);
      } else if (dataCompra >= seisMesesAtras) {
        recentes.push(cliente);
      } else {
        antigos.push(cliente);
      }
    }
  });

  // Ordena alfabeticamente os grupos
  recentes.sort((a, b) => a.RSocial.localeCompare(b.RSocial));
  antigos.sort((a, b) => a.RSocial.localeCompare(b.RSocial));
  nuncaCompraram.sort((a, b) => a.RSocial.localeCompare(b.RSocial));

  return { recentes, antigos, nuncaCompraram };
};

async function generateVendedorReport(vendedor, clientes) {
  // Classifica os clientes em grupos
  const { recentes, antigos, nuncaCompraram } = classificarClientes(clientes);

  const totalClientes = clientes.length;
  const totalNuncaMaisCompraram = antigos.length;
  const totalCadastradosSomente = nuncaCompraram.length;

  // Função para montar o corpo da tabela de clientes
  // Função para montar o corpo da tabela de clientes sem a coluna "Média Valor Pedido"
  // Função para montar o corpo da tabela de clientes com a coluna "Condição de Pagamento"
  const montarLinhasCliente = (clientes, grupoNome) => {
    return [
      [
        {
          text: grupoNome,
          colSpan: 7,
          alignment: "center",
          bold: true,
          margin: [0, 20, 0, 10],
        },
      ], // Ajustado para 7 colunas
      ...clientes.map((cliente, index) => [
        { text: index + 1, style: "tableRow" }, // Contagem de linhas
        { text: safeValue(cliente.CodigoCliente), style: "tableRow" },
        { text: safeValue(cliente.RSocial), style: "tableRow" },
        {
          text: cliente.UltimaCompra
            ? formatarData(cliente.UltimaCompra)
            : "N/A",
          style: "tableRow",
        },
        {
          text: cliente.Bloqueado === "1" ? "Bloqueado" : "Ativo",
          style: "tableRow",
        },
        { text: formatCurrency(cliente.TotalPendencias), style: "tableRow" },
        { text: safeValue(cliente.CondicaoPagamento), style: "tableRow" }, // Nova coluna para Condição de Pagamento
      ]),
    ];
  };

  // Definindo o layout e o conteúdo do PDF com a nova coluna "Condição de Pagamento"
  const docDefinition = {
    pageOrientation: "landscape", // Define o layout como paisagem
    pageSize: "A4", // Define o tamanho da página como A4
    content: [
      {
        columns: [
          {
            image: carregarImagemBase64(caminhoLogo), // Usando a função de carregar a imagem
            width: 60, // Ajuste para diminuir o tamanho da logo
            height: 60, // Mantém a proporção da logo
          },
          {
            text: [
              { text: "FORT FRUIT LTDA\n", style: "header", alignment: "left" }, // Alinhamento ajustado
              {
                text: "ALAMEDA CEASA, SN\n",
                style: "subheader",
                alignment: "left",
              },
              {
                text: "CURIO, BELEM, PA\n",
                style: "subheader",
                alignment: "left",
              },
              {
                text: "CEP: 66.610-120\n",
                style: "subheader",
                alignment: "left",
              },
              {
                text: "PABX/FAX: 55-91-32457463\n",
                style: "subheader",
                alignment: "left",
              },
              {
                text: "CNPJ: 02.338.006/0",
                style: "subheader",
                alignment: "left",
              },
            ],
            alignment: "left",
          },
          {
            text: [
              {
                text: `Carteira do Vendedor: ${vendedor.toUpperCase()}\n`,
                style: "header",
                alignment: "right",
              },
              {
                text: `Total de clientes cadastrados: ${totalClientes}\n`,
                style: "subheader",
                alignment: "right",
              },
              {
                text: `Total de clientes que nunca mais compraram: ${totalNuncaMaisCompraram}\n`,
                style: "subheader",
                alignment: "right",
              },
              {
                text: `Total de clientes somente cadastrados: ${totalCadastradosSomente}`,
                style: "subheader",
                alignment: "right",
                color: "red",
              },
            ],
            alignment: "right",
            margin: [0, 0, 0, 0], // Remover margens extras para alinhar verticalmente com a logo e os dados da empresa
          },
        ],
      },
      { text: "\n" }, // Linha em branco para separar o cabeçalho do conteúdo
      {
        table: {
          headerRows: 1,
          widths: ["5%", "10%", "30%", "15%", "10%", "15%", "15%"], // Ajustando as larguras das colunas para 7 colunas
          body: [
            // Cabeçalhos da tabela ajustados
            [
              { text: "#", style: "tableHeader" },
              { text: "Código Cliente", style: "tableHeader" },
              { text: "Razão Social", style: "tableHeader" },
              { text: "Última Compra", style: "tableHeader" },
              { text: "Bloqueado", style: "tableHeader" },
              { text: "Total Pendências", style: "tableHeader" },
              { text: "Condição de Pagamento", style: "tableHeader" }, // Novo cabeçalho
            ],

            // Linhas de clientes, separados por grupos
            ...montarLinhasCliente(recentes, "Clientes Recentes"),
            ...montarLinhasCliente(antigos, "Clientes Inativos"),
            ...montarLinhasCliente(
              nuncaCompraram,
              "Clientes que Nunca Compraram"
            ),
          ],
        },
        layout: {
          fillColor: function (rowIndex) {
            return rowIndex % 2 === 0 ? null : "#f3f3f3"; // Fundo alternado para as linhas de dados
          },
          hLineWidth: () => 0, // Remove as linhas horizontais
          vLineWidth: () => 0, // Remove as linhas verticais
        },
      },
    ],
    styles: {
      header: { fontSize: 16, bold: true, marginBottom: 10 },
      subheader: { fontSize: 10, bold: false, marginBottom: 5 },
      tableHeader: { fontSize: 9, bold: true, fillColor: "#eeeeee" }, // Estilo dos cabeçalhos da tabela
      tableRow: { fontSize: 9 }, // Estilo das linhas de dados
    },
    defaultStyle: {
      font: "Roboto",
    },
  };

  // Gera o PDF
  const pdfDoc = printer.createPdfKitDocument(docDefinition);

  const chunks = [];
  return new Promise((resolve, reject) => {
    pdfDoc.on("data", (chunk) => chunks.push(chunk));
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
    pdfDoc.on("error", (err) => reject(err));
    pdfDoc.end();
  });
}

module.exports = generateVendedorReport;
