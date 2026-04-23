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
const filePath = "C:\\Users\\adria\\Documents\\clientes.xlsx";

const workbook = xlsx.readFile(filePath);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];

const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

// Pular o cabeçalho e preparar os dados para inserção
const records = data
  .slice(1)
  .map((row) => ({
    codigo: row[0],
    nome: row[1],
    nome_fantasia: row[2],
  }))
  .filter((record) => record.codigo && record.nome && record.nome_fantasia);

const sqlDelete = `DELETE FROM clientes`;
const sqlInsert = `
  INSERT INTO clientes (codigo, nome, nome_fantasia) 
  VALUES (?, ?, ?)
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
      [record.codigo, record.nome, record.nome_fantasia],
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
