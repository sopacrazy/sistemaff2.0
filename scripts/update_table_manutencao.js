const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
dotenv.config();

async function run() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST_OCORRENCIAS,
    user: process.env.DB_USER_OCORRENCIAS,
    password: process.env.DB_PASSWORD_OCORRENCIAS,
    database: process.env.DB_NAME_OCORRENCIAS,
  });

  const [cols] = await db.query("SHOW COLUMNS FROM frota_manutencao");
  const columnNames = cols.map(c => c.Field);

  if (!columnNames.includes("veiculo_descricao")) {
    await db.query("ALTER TABLE frota_manutencao ADD COLUMN veiculo_descricao VARCHAR(255) AFTER placa");
    console.log("Added veiculo_descricao");
  }
  if (!columnNames.includes("veiculo_tipo")) {
    await db.query("ALTER TABLE frota_manutencao ADD COLUMN veiculo_tipo VARCHAR(100) AFTER veiculo_descricao");
    console.log("Added veiculo_tipo");
  }

  await db.end();
  process.exit(0);
}

run().catch(console.error);
