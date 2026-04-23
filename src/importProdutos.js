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
const filePath = "C:\\Users\\adriano.martins\\Documents\\produtos.xlsx";

const workbook = xlsx.readFile(filePath);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];

const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

// Pular o cabeçalho e preparar os dados para inserção
const records = data
  .slice(1)
  .map((row) => ({
    codigo_produto: row[0],
    descricao: row[1],
    primeira_unidade: row[2],
    segunda_unidade: row[3],
  }))
  .filter(
    (record) =>
      record.codigo_produto &&
      record.descricao &&
      record.primeira_unidade &&
      record.segunda_unidade
  );

const sqlDelete = `DELETE FROM produtos`;
const sqlInsert = `
  INSERT INTO produtos (codigo_produto, descricao, primeira_unidade, segunda_unidade) 
  VALUES (?, ?, ?, ?)
`;

// Deletar registros existentes
dbOcorrencias.query(sqlDelete, (err, result) => {
  if (err) {
    console.error("Erro ao deletar registros:", err);
    return;
  }
  console.log("Registros deletados com sucesso:", result);

  // Inserir novos registros
  records.forEach((record) => {
    dbOcorrencias.query(
      sqlInsert,
      [
        record.codigo_produto,
        record.descricao,
        record.primeira_unidade,
        record.segunda_unidade,
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
});
