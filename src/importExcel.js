const xlsx = require("xlsx");
const mysql = require("mysql2");

// Conectar ao banco de dados
const dbOcorrencias = mysql.createPool({
  host: "ocorrencias.mysql.uhserver.com",
  user: "ocorrenciasff",
  password: "JzMqQ*Mrzww2m.k",
  database: "ocorrencias",
});

// Caminho do arquivo Excel
const filePath =
  "C:\\Users\\adriano.martins\\Documents\\06 - relatorio de ocorrencia Jun 2024.xlsm";

const workbook = xlsx.readFile(filePath);
const worksheet = workbook.Sheets["JUNHO"];

const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

// Função para formatar a data no formato YYYY-MM-DD
const formatDate = (date) => {
  if (!date) return null;

  if (typeof date === "string") {
    const regex = /^(\d{2})\/(\d{2})\/(\d{2,4})$/;
    const match = date.match(regex);
    if (match) {
      let [_, day, month, year] = match;
      if (year.length === 2) {
        year = "20" + year; // Ajusta o ano de 2 dígitos para 4 dígitos
      }
      return `${year}-${month}-${day}`;
    }
  } else if (date instanceof Date) {
    return date.toISOString().split("T")[0];
  } else {
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate)) {
      return parsedDate.toISOString().split("T")[0];
    }
  }
  return null;
};

// Verifica se uma linha está visível
const isRowVisible = (row) => {
  const hiddenRowProps = worksheet["!rows"]
    ? worksheet["!rows"][row]
    : undefined;
  return !(hiddenRowProps && hiddenRowProps.hidden);
};

// Pular o cabeçalho e preparar os dados para inserção
const records = data
  .slice(1)
  .map((row, index) => ({
    numero: row[0],
    remetente: row[1],
    data: formatDate(row[2]),
    cliente: row[3],
    descricao: row[4],
    valor: row[5],
    tipo: row[6],
    motivo: row[7],
    status: row[8],
    acao: row[9],
    dataTratativa: formatDate(row[10]),
    bilhete: row[11],
    motorista: row[12],
    conferente: row[13],
    ajudante: row[14],
    vendedor: row[15],
  }))
  .filter(
    (record, index) =>
      isRowVisible(index + 1) &&
      record.numero &&
      record.remetente &&
      record.data &&
      record.cliente &&
      record.descricao &&
      record.valor &&
      record.tipo &&
      record.motivo &&
      record.status &&
      record.acao &&
      record.bilhete &&
      record.motorista &&
      record.conferente &&
      record.vendedor
  );

const sqlInsert = `
  INSERT INTO ocorrencias 
  (numero, remetente, data, cliente, descricao, valor, tipo, motivo, status, acao, dataTratativa, bilhete, motorista, conferente, ajudante, vendedor) 
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

records.forEach((record) => {
  dbOcorrencias.query(
    sqlInsert,
    [
      record.numero,
      record.remetente,
      record.data,
      record.cliente,
      record.descricao,
      record.valor,
      record.tipo,
      record.motivo,
      record.status,
      record.acao,
      record.dataTratativa,
      record.bilhete,
      record.motorista,
      record.conferente,
      record.ajudante,
      record.vendedor,
    ],
    (err, result) => {
      if (err) {
        console.error("Erro ao inserir registro:", err);
      } else {
        console.log("Registro inserido com sucesso:", result);
      }
    }
  );
});
