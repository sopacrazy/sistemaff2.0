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

async function syncComprasMercadoria() {
  console.log("🔥 Entrou na função de sincronização");
  try {
    const pool = await sql.connect(dbConfig);
    const request = pool.request();
    console.log("🟢 Conectado ao SQL Server.");

    const mysqlConn = await dbOcorrencias.getConnection();

    // ---------------- COMPRAS ---------------- //
    const resultHeader = await request.query(`
      SELECT Z2_CODCAR, Z2_CHEGADA, Z2_DESCRI, Z2_MOTORIS, Z2_OBSCAPA 
      FROM SZ2140
      WHERE Z2_FILIAL = '01'
        AND D_E_L_E_T_ = ''
        AND Z2_TM = ''
    `);

    const headers = resultHeader.recordset;
    console.log(`🔍 Compras encontradas: ${headers.length}`);

    for (const head of headers) {
      const [exist] = await mysqlConn.query(
        "SELECT 1 FROM compras_mercadoria WHERE codigo = ?",
        [head.Z2_CODCAR]
      );

      if (exist.length === 0) {
        await mysqlConn.query(
          `INSERT INTO compras_mercadoria 
   (codigo, chegada, descricao, motorista, observacao, local)
   VALUES (?, ?, ?, ?, ?, ?)`,
          [
            head.Z2_CODCAR,
            novaChegada,
            head.Z2_DESCRI,
            head.Z2_MOTORIS,
            head.Z2_OBSCAPA,
            "02", // 👈 ou "07", ou a origem correta do usuário logado
          ]
        );

        console.log(`✔️ Cabeçalho inserido: ${head.Z2_CODCAR}`);
      } else {
        console.log(`⚠️ Cabeçalho já existente: ${head.Z2_CODCAR}`);
      }

      const itensResult = await request.query(`
        SELECT Z1_CODCAR, Z1_DATCAR, Z1_CODPRO, Z1_DESCPRO, 
               Z1_CODFOR, Z1_FORNEC, Z1_QTDE, Z1_PRECO, Z1_TOTAL 
        FROM SZ1140
        WHERE Z1_FILIAL = '01'
          AND D_E_L_E_T_ = ''
          AND Z1_PROC = ''
          AND Z1_CODCAR = '${head.Z2_CODCAR}'
      `);

      const itens = itensResult.recordset;

      for (const item of itens) {
        const [existsItem] = await mysqlConn.query(
          "SELECT 1 FROM compras_mercadoria_itens WHERE codcar = ? AND codpro = ?",
          [item.Z1_CODCAR, item.Z1_CODPRO]
        );

        if (existsItem.length === 0) {
          await mysqlConn.query(
            `INSERT INTO compras_mercadoria_itens 
              (codcar, datcar, codpro, descpro, codfor, fornec, qtde, preco, total)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              item.Z1_CODCAR,
              formatData(item.Z1_DATCAR),
              item.Z1_CODPRO,
              item.Z1_DESCPRO,
              item.Z1_CODFOR,
              item.Z1_FORNEC,
              item.Z1_QTDE,
              item.Z1_PRECO,
              item.Z1_TOTAL,
            ]
          );
        }
      }

      if (itens.length > 0) {
        console.log(
          `➕ Itens inseridos para compra ${head.Z2_CODCAR}: ${itens.length}`
        );
      }
    }

    // ---------------- SALDO ---------------- //
    const resultSaldo = await request.query(`
      SELECT 
        B2.B2_FILIAL AS filial,
        B2.B2_COD AS cod_produto,
        B1.B1_DESC AS nome_produto,
        SUM(B2.B2_QATU) AS saldo_total
      FROM SB2140 B2
      JOIN SB1140 B1 ON B2.B2_COD = B1.B1_COD
      WHERE 
        B2.B2_FILIAL = '01' AND 
        B2.D_E_L_E_T_ = '' AND 
        B2.B2_QATU > 0
      GROUP BY 
        B2.B2_FILIAL, B2.B2_COD, B1.B1_DESC
    `);

    const saldos = resultSaldo.recordset;
    console.log(`🔄 Produtos com saldo: ${saldos.length}`);

    for (const saldo of saldos) {
      const [existsSaldo] = await mysqlConn.query(
        `SELECT 1 FROM saldo_produtos WHERE filial = ? AND cod_produto = ?`,
        [saldo.filial, saldo.cod_produto]
      );

      if (existsSaldo.length === 0) {
        await mysqlConn.query(
          `INSERT INTO saldo_produtos (filial, cod_produto, nome_produto, saldo_total, data_alteracao)
           VALUES (?, ?, ?, ?, NOW())`,
          [
            saldo.filial,
            saldo.cod_produto,
            saldo.nome_produto,
            saldo.saldo_total,
          ]
        );
      } else {
        await mysqlConn.query(
          `UPDATE saldo_produtos 
           SET nome_produto = ?, saldo_total = ?, data_alteracao = NOW()
           WHERE filial = ? AND cod_produto = ?`,
          [
            saldo.nome_produto,
            saldo.saldo_total,
            saldo.filial,
            saldo.cod_produto,
          ]
        );
      }
    }

    // ---------------- VENDAS DO DIA ---------------- //
    const hoje = new Date();
    const dataHoje =
      hoje.getFullYear().toString() +
      String(hoje.getMonth() + 1).padStart(2, "0") +
      String(hoje.getDate()).padStart(2, "0");

    console.log("📅 Data que será usada no filtro de vendas:", dataHoje);

    const vendasResult = await request.query(`
  SELECT 
    Z5_FILIAL, Z5_BILHETE, Z5_CLIENTE, Z5_DATA, 
    Z5_CODPRO, Z5_DESPRO, Z5_QTDE, Z5_PRECO, Z5_TOTAL 
  FROM SZ5140
  WHERE Z5_FILIAL = '01'
    AND D_E_L_E_T_ = ''
    AND Z5_DATA = '${dataHoje}'
`);

    const vendas = vendasResult.recordset;

    console.log(
      `🧾 Total de vendas retornadas do SQL Server: ${vendas.length}`
    );

    if (vendas.length > 0) {
      console.log("📋 Lista de vendas encontradas:");
      vendas.forEach((v, i) => {
        console.log(
          `  ${i + 1}. Bilhete: ${v.Z5_BILHETE}, Produto: ${
            v.Z5_CODPRO
          }, Qtde: ${v.Z5_QTDE}, Data: ${v.Z5_DATA}`
        );
      });
    } else {
      console.log("⚠️ Nenhuma venda retornada para a data informada.");
    }

    for (const venda of vendas) {
      try {
        await mysqlConn.query(
          `INSERT INTO vendas_produtos 
        (filial, bilhete, cliente, data, codpro, descricao, qtde, preco, total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            venda.Z5_FILIAL,
            venda.Z5_BILHETE,
            venda.Z5_CLIENTE,
            formatData(venda.Z5_DATA),
            venda.Z5_CODPRO,
            venda.Z5_DESPRO,
            venda.Z5_QTDE,
            venda.Z5_PRECO,
            venda.Z5_TOTAL,
          ]
        );
        console.log(
          `✅ Venda inserida: Bilhete ${venda.Z5_BILHETE}, Produto ${venda.Z5_CODPRO}`
        );
      } catch (err) {
        console.error(
          `❌ Erro ao inserir venda (Bilhete ${venda.Z5_BILHETE}):`,
          err.message
        );
      }
    }

    mysqlConn.release();
    await sql.close();
    console.log("✅ Sincronização completa.");
  } catch (error) {
    console.error("❌ Erro durante sincronização:", error);
  }
}

function formatData(dataString) {
  if (!dataString) return null;
  const str = dataString.toString();
  return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
}

module.exports = { syncComprasMercadoria };
