// config/dbConfig.js
module.exports = {
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
