const mysql = require("mysql2");
const dotenv = require("dotenv");
dotenv.config();

const dbOcorrencias = mysql.createPool({
  host: process.env.DB_HOST_OCORRENCIAS,
  user: process.env.DB_USER_OCORRENCIAS,
  password: process.env.DB_PASSWORD_OCORRENCIAS,
  database: process.env.DB_NAME_OCORRENCIAS,
});

const query = `
CREATE TABLE IF NOT EXISTS frota_manutencao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa VARCHAR(50),
    data_nf DATE,
    nf VARCHAR(50),
    fornecedor_id VARCHAR(50),
    fornecedor_nome VARCHAR(255),
    valor_total DECIMAL(10,2),
    placa VARCHAR(20),
    tipo_manutencao VARCHAR(50),
    descricao TEXT,
    observacoes TEXT,
    usuario VARCHAR(50),
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);`;

dbOcorrencias.promise().query(query)
  .then(() => {
    console.log("Table frota_manutencao created successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error creating table:", err);
    process.exit(1);
  });
