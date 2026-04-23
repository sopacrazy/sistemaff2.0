require('dotenv').config();
const dbConfig = require('./config/dbConfig');
const sql = require('mssql');

async function run() {
  try {
    const pool = await sql.connect(dbConfig);
    const dataInicio = '2026-02-09'.replace(/-/g, '');
    const dataFim = '2026-03-11'.replace(/-/g, '');
    const filial = '02';

    const query = `
        SELECT TOP 2000
            F2_DOC AS numero, 
            F2_SERIE AS serie, 
            F2_CLIENTE AS codCliente, 
            F2_LOJA AS loja, 
            (SELECT TOP 1 A1_NOME FROM SA1140 (NOLOCK) WHERE A1_COD = F2_CLIENTE AND A1_LOJA = F2_LOJA AND D_E_L_E_T_ = '') AS nomeCliente, 
            F2_EMISSAO AS dataEmissao, 
            F2_VALBRUT AS valor,
            (SELECT TOP 1 Z4_BILHETE FROM SZ4140 (NOLOCK) WHERE Z4_NOTA = F2_DOC AND Z4_FILIAL = F2_FILIAL AND D_E_L_E_T_ = '') AS bilhete,
            (SELECT COUNT(*) FROM SE1140 (NOLOCK) 
             WHERE E1_FILIAL = F2_FILIAL AND E1_PORTADO <> '' AND D_E_L_E_T_ = '' 
             AND (E1_NUM = F2_DOC OR E1_NUM = (SELECT TOP 1 Z4_BILHETE FROM SZ4140 (NOLOCK) WHERE Z4_NOTA = F2_DOC AND Z4_FILIAL = F2_FILIAL AND D_E_L_E_T_ = ''))
            ) AS temBoleto
        FROM SF2140YY F2 (NOLOCK)
        WHERE 
            F2.D_E_L_E_T_ = ''
            AND (F2_SERIE = '1' OR F2_SERIE = '1  ')
            AND F2_EMISSAO >= '20260101'
            AND F2_EMISSAO >= @start
            AND F2_EMISSAO <= @end
        ORDER BY F2_EMISSAO DESC, F2_DOC DESC
      `;

      const request = pool.request();
      request.input("filial", sql.VarChar, filial);
      if (dataInicio) request.input("start", sql.VarChar, dataInicio);
      if (dataFim) request.input("end", sql.VarChar, dataFim);

      const result = await request.query(query);
      console.log('Result count: ', result.recordset.length);
      if (result.recordset.length > 0) console.log(result.recordset[0]);
    pool.close();
  } catch(e){
    console.error(e);
  }
}
run();