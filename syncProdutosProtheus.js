const sql = require("mssql");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config();

const dbConfig = {
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  server: process.env.MSSQL_SERVER,
  database: process.env.MSSQL_DATABASE,
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === "true",
    trustServerCertificate: process.env.MSSQL_TRUST_SERVER_CERT === "true",
  },
  pool: {
    max: parseInt(process.env.MSSQL_POOL_MAX),
    min: parseInt(process.env.MSSQL_POOL_MIN),
    idleTimeoutMillis: parseInt(process.env.MSSQL_POOL_IDLE_TIMEOUT),
  },
  connectionTimeout: parseInt(process.env.MSSQL_CONNECTION_TIMEOUT),
  requestTimeout: parseInt(process.env.MSSQL_REQUEST_TIMEOUT),
};

const dbOcorrencias = mysql.createPool({
  host: process.env.DB_HOST_OCORRENCIAS,
  user: process.env.DB_USER_OCORRENCIAS,
  password: process.env.DB_PASSWORD_OCORRENCIAS,
  database: process.env.DB_NAME_OCORRENCIAS,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 20000,
});

async function syncProdutosProtheus() {
  console.log("🚀 Iniciando sincronização de produtos...");

  try {
    const pool = await sql.connect(dbConfig);
    const request = pool.request();
    console.log("🟢 Conectado ao SQL Server");

    const result = await request.query(`
      SELECT
        CONVERT(varchar(10),
                CAST(TRY_CAST(B1_COD AS DECIMAL(9,3)) AS DECIMAL(9,3)), 2
        ) AS B1_COD_FORMATADO,
        B1_DESC,
        B1_UM,
        B1_SEGUM,
        B1_CONV
      FROM SB1140
      WHERE B1_FILIAL = ''
        AND TRY_CAST(B1_COD AS DECIMAL(9,3)) > 100.000
        AND TRY_CAST(B1_COD AS DECIMAL(9,3)) < 900.000
      ORDER BY TRY_CAST(B1_COD AS DECIMAL(9,3))
    `);

    const produtos = result.recordset;
    console.log(`📦 Produtos retornados: ${produtos.length}`);

    const mysqlConn = await dbOcorrencias.getConnection();

    for (const prod of produtos) {
      // Remove o ponto e transforma em número
      const codigoLimpo = parseInt(prod.B1_COD_FORMATADO.replace(".", ""));

      const [existe] = await mysqlConn.query(
        "SELECT 1 FROM produto WHERE codigo_produto = ?",
        [codigoLimpo]
      );

      if (existe.length === 0) {
        await mysqlConn.query(
          `INSERT INTO produto 
           (codigo_produto, descricao, unidade, segunda_unidade, fator_conversao)
           VALUES (?, ?, ?, ?, ?)`,
          [codigoLimpo, prod.B1_DESC, prod.B1_UM, prod.B1_SEGUM, prod.B1_CONV]
        );
        console.log(`✅ Produto inserido: ${codigoLimpo}`);
      }
    }

    mysqlConn.release();
    await sql.close();
    console.log("🎉 Sincronização de produtos finalizada com sucesso!");
  } catch (err) {
    console.error("❌ Erro ao sincronizar produtos:", err.message);
  }
}

module.exports = { syncProdutosProtheus };

// Executa diretamente
syncProdutosProtheus();
