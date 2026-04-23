const sql = require("mssql");

/**
 * Busca preço de compra (SZ5140) para a data (YYYY-MM-DD) e lista de códigos.
 * Retorna Map(codigoNormalizado -> preco).
 */
async function buscarPrecosCompraPorCod(dataISO, codigos, poolMSSQL) {
  if (!codigos?.length) return new Map();

  const yyyymmdd = dataISO.replace(/-/g, "");
  const codsSan = codigos
    .map((c) => String(c).replace(/\D/g, "")) // normaliza "149.032" -> "149032"
    .filter(Boolean);

  if (!codsSan.length) return new Map();

  const tempValues = codsSan.map((_, i) => `(@c${i})`).join(",");
  const request = new sql.Request(poolMSSQL);
  request.input("data", sql.VarChar(8), yyyymmdd);
  codsSan.forEach((c, i) => request.input(`c${i}`, sql.VarChar(30), c));

  const query = `
    WITH cods(cod) AS (SELECT * FROM (VALUES ${tempValues}) AS v(cod))
    SELECT
      cod = REPLACE(CAST(SZ5.Z5_CODPRO AS VARCHAR(30)), '.', ''),
      preco = MAX(CAST(SZ5.Z5_COMPRA AS DECIMAL(18,4)))
    FROM SZ5140 AS SZ5 WITH (NOLOCK)
    INNER JOIN cods ON cods.cod = REPLACE(CAST(SZ5.Z5_CODPRO AS VARCHAR(30)), '.', '')
    WHERE SZ5.Z5_DATA = @data
    GROUP BY REPLACE(CAST(SZ5.Z5_CODPRO AS VARCHAR(30)), '.', '')
  `;

  const { recordset } = await request.query(query);
  const map = new Map();
  for (const r of recordset) map.set(String(r.cod), Number(r.preco));
  return map;
}

module.exports = { buscarPrecosCompraPorCod };
