// prevenda.js - Serviço de monitoramento dos pedidos da pré-venda
require("dotenv").config();
const mysql = require("mysql2/promise");
const sql = require("mssql");

// Conexão com banco principal (Protheus - SQL Server)
const dbConfigProtheus = {
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

// Conexão com banco local (MySQL da Fort Fruit)
const dbLocal = mysql.createPool({
  host: process.env.DB_HOST_OCORRENCIAS,
  user: process.env.DB_USER_OCORRENCIAS,
  password: process.env.DB_PASSWORD_OCORRENCIAS,
  database: process.env.DB_NAME_OCORRENCIAS,
});

async function buscarPedidosProtheus() {
  await sql.connect(dbConfigProtheus);
  const result = await sql.query`
    SELECT 
      ZB_BILHETE AS bilhete,
      ZB_NOMCLI AS cliente,
      ZB_EMSEPAR,
      ZB_NUMSEQ
    FROM SZB140
    WHERE ZB_FILIAL = '01' AND D_E_L_E_T_ = '' AND ZB_DTENTRE = ${getHoje()}
  `;

  return result.recordset.map((p) => ({
    bilhete: p.bilhete.trim(),
    cliente: p.cliente.trim(),
    status: getStatus(p),
  }));
}

function getStatus(pedido) {
  if (pedido.ZB_EMSEPAR === "S" && pedido.ZB_NUMSEQ !== "") return "Faturado";
  if (pedido.ZB_EMSEPAR === "S" && pedido.ZB_NUMSEQ === "")
    return "Em Separação";
  return "Pendente";
}

async function sincronizarPedidos() {
  try {
    const pedidos = await buscarPedidosProtheus();

    for (const pedido of pedidos) {
      const [rows] = await dbLocal.query(
        "SELECT * FROM monitor_pedidos WHERE bilhete = ?",
        [pedido.bilhete]
      );

      if (rows.length === 0) {
        // Inserir novo registro
        await dbLocal.query(
          `INSERT IGNORE INTO monitor_pedidos (bilhete, cliente, status, hora_pendente, atualizado_em)
   VALUES (?, ?, ?, NOW(), NOW())`,
          [pedido.bilhete, pedido.cliente, pedido.status]
        );
      } else {
        const existente = rows[0];
        if (pedido.status !== existente.status) {
          const campos = [pedido.status, new Date()];
          let extras = "";

          if (pedido.status === "Em Separação") {
            extras = ", hora_separacao = ?";
            campos.push(new Date());
          } else if (pedido.status === "Faturado") {
            extras = ", hora_faturado = ?";
            campos.push(new Date());
          }

          campos.push(pedido.bilhete);

          await dbLocal.query(
            `UPDATE monitor_pedidos 
             SET status = ?, atualizado_em = ?${extras} 
             WHERE bilhete = ?`,
            campos
          );
        }
      }
    }

    console.log(
      `[${new Date().toLocaleString()}] Sincronização concluída (${
        pedidos.length
      } pedidos).`
    );
  } catch (err) {
    console.error("Erro na sincronização:", err);
  }
}

function getHoje() {
  const hoje = new Date();
  return hoje.toISOString().slice(0, 10).replace(/-/g, "");
}

// Loop: a cada 20 segundos
setInterval(sincronizarPedidos, 20000);

// Primeira execução
sincronizarPedidos();
