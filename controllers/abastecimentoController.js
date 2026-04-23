// C:\Sistema\ocorrencia\controllers\abastecimentoController.js
const sql = require("mssql");

module.exports = (dbOcorrencias, mssqlPoolArg) => {
  // Helpers
  const normalizeLocal = (v) =>
    String(v ?? "")
      .trim()
      .padStart(2, "0");

  const DIAS_PADRAO_CALCULO = 25; // 25 dias úteis

  // 🚨 FUNÇÃO POST: SALVAR ESTOQUE PADRÃO CUSTOMIZADO
  async function updateEstoquePadrao(req, res) {
    const { codigo_produto, local, estoque_padrao } = req.body;
    const usuario = req.headers["x-user"] || "sistema";

    if (!codigo_produto || !local || estoque_padrao === undefined) {
      return res
        .status(400)
        .json({ error: "Código, local e estoque_padrao são obrigatórios." });
    }

    const codLimpo = String(codigo_produto).replace(/\./g, "");
    const localNorm = normalizeLocal(local).trim();

    let mysqlConn;
    try {
      mysqlConn = await dbOcorrencias.promise().getConnection();

      const query = `
                INSERT INTO estoque_padrao_config 
                    (cod_produto, local, estoque_padrao, usuario_alteracao)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    estoque_padrao = VALUES(estoque_padrao),
                    usuario_alteracao = VALUES(usuario_alteracao),
                    data_alteracao = CURRENT_TIMESTAMP
            `;

      await mysqlConn.query(query, [
        codLimpo,
        localNorm,
        parseFloat(estoque_padrao),
        usuario,
      ]);

      res.json({ success: true, message: "Estoque padrão salvo." });
    } catch (error) {
      console.error(`❌ Erro ao salvar estoque padrão:`, error);
      res.status(500).json({ message: "Erro interno ao salvar configuração." });
    } finally {
      if (mysqlConn) mysqlConn.release();
    }
  }

  // -------------------------------------------------------------
  // 🚨 FUNÇÃO GET: BUSCAR VENDAS MENSAIS (MÊS/ANO ANTERIOR)
  async function getVendasMensais(poolMSSQL, local, dataRef) {
    if (!poolMSSQL || !poolMSSQL.connected) {
      return new Map();
    }

    try {
      const request = poolMSSQL.request();

      request.input("local", sql.VarChar(2), local);
      request.input("filial", sql.VarChar(2), "01");
      request.input("dataRef", sql.Date, dataRef); // Data do Frontend

      const queryVendas = `
                DECLARE @RefDate DATE = @dataRef;
                DECLARE @PrevYearDate DATE = DATEADD(year, -1, @RefDate); 

                -- 1. Calcula o primeiro dia do MÊS DO ANO ANTERIOR
                DECLARE @StartDate VARCHAR(8) = CONVERT(VARCHAR(8), 
                    DATEADD(month, DATEDIFF(month, 0, @PrevYearDate), 0), 112);
                    
                -- 2. Calcula o último dia do MÊS DO ANO ANTERIOR
                DECLARE @EndDate VARCHAR(8) = CONVERT(VARCHAR(8), 
                    DATEADD(day, -1, DATEADD(month, DATEDIFF(month, 0, @PrevYearDate) + 1, 0)), 112);

                SELECT
                    REPLACE(T5.Z5_CODPRO, '.', '') AS codigo_produto, 
                    SUM(T5.Z5_QTDE) AS SOMA_TOTAL_QTDE_MES
                FROM
                    SZ5140 T5
                INNER JOIN
                    SZ4140 T4 ON T5.Z5_BILHETE = T4.Z4_BILHETE AND T5.Z5_FILIAL = T4.Z4_FILIAL
                WHERE
                    T5.Z5_FILIAL = @filial
                    AND T5.D_E_L_E_T_ = ''
                    AND T4.D_E_L_E_T_ = '' 
                    AND T4.Z4_LOCAL = @local
                    AND T5.Z5_DATA BETWEEN @StartDate AND @EndDate
                GROUP BY
                    T5.Z5_CODPRO
                ORDER BY
                    T5.Z5_CODPRO;
            `;

      const result = await request.query(queryVendas);

      const vendasMap = new Map();
      result.recordset.forEach((row) => {
        const codLimpo = String(row.codigo_produto).trim();
        vendasMap.set(codLimpo, parseFloat(row.SOMA_TOTAL_QTDE_MES) || 0);
      });

      return vendasMap;
    } catch (error) {
      console.error(
        "❌ Erro ao buscar vendas mensais (Ano Anterior) no Protheus:",
        error
      );
      return new Map();
    }
  }

  // -------------------------------------------------------------

  // 🚨 FUNÇÃO PRINCIPAL: BUSCAR ESTOQUE E COMBINAR DADOS
  async function getEstoqueAtual(req, res) {
    const local = normalizeLocal(req.query.local || "01");
    const dataRef = req.query.data || new Date().toISOString().slice(0, 10); // Data do Frontend

    let mysqlConn;
    try {
      const poolMSSQLConectado = req.app.locals.mssqlPool;

      // 1. Busca Vendas (Passa dataRef para buscar o mês/ano anterior)
      const vendasMap = await getVendasMensais(
        poolMSSQLConectado,
        local,
        dataRef
      );

      mysqlConn = await dbOcorrencias.promise().getConnection();

      // 2. Busca a data de fechamento mais recente (<= dataRef do Frontend)
      const [ultimaDataResult] = await mysqlConn.query(
        `SELECT MAX(data) AS ultima_data 
                 FROM saldos_fechamento 
                 WHERE local = ? AND data <= ?`,
        [local, dataRef]
      );

      const dataFechamento = ultimaDataResult[0].ultima_data;

      if (!dataFechamento) {
        // Se não houver dados de fechamento, retorna vazio com status OK.
        return res.json({ data: [], dataReferencia: dataRef });
      }

      // 3. Consulta de Estoque, Produto e CONFIGURAÇÃO CUSTOMIZADA
      const query = `
                SELECT
                    sf.local,
                    p.codigo_produto, 
                    p.descricao AS produto, 
                    p.unidade AS primeira_unidade,
                    p.segunda_unidade,
                    sf.saldo_final AS estoqueAtual,
                    -- 🚨 Busca o valor salvo, se existir, senão será NULL
                    epc.estoque_padrao AS estoque_padrao_custom
                FROM
                    saldos_fechamento sf
                INNER JOIN
                    produto p ON REPLACE(p.codigo_produto, '.', '') = REPLACE(sf.cod_produto, '.', '')
                LEFT JOIN 
                    estoque_padrao_config epc ON REPLACE(p.codigo_produto, '.', '') = epc.cod_produto
                    AND epc.local = sf.local
                WHERE
                    sf.local = ? AND
                    sf.data = ? 
                ORDER BY
                    p.descricao;
            `;

      const [results] = await mysqlConn.query(query, [local, dataFechamento]);

      // 4. Formatação e combinação dos dados
      const dataFormatada = results.map((item) => {
        const codLimpo = String(item.codigo_produto).replace(/\./g, "");
        const vendasMensaisReais = vendasMap.get(codLimpo) || 0;

        // Cálculo da Venda Média (base: 25 dias)
        const vendasMediaDiaria = vendasMensaisReais / DIAS_PADRAO_CALCULO;

        // Define o Estoque Padrão: Prioridade 1: Customizado, Prioridade 2: Venda Média Arredondada
        const estoquePadraoInicial = Math.ceil(vendasMediaDiaria);
        const estoquePadrao =
          item.estoque_padrao_custom || estoquePadraoInicial;

        return {
          id: `${item.local}-${item.codigo_produto}`,
          produto: item.produto,
          local: normalizeLocal(item.local),
          estoqueAtual: parseFloat(item.estoqueAtual) || 0,
          codigo_produto: item.codigo_produto,
          vendasMensais: vendasMensaisReais,
          estoquePadrao: parseFloat(estoquePadrao),
          unidade: item.segunda_unidade || item.primeira_unidade || "UN",
        };
      });

      res.json({
        data: dataFormatada,
        dataReferencia: dataFechamento,
      });
    } catch (error) {
      console.error(
        `❌ Erro ao buscar estoque atual para o local ${local}:`,
        error
      );
      res
        .status(500)
        .json({ message: "Erro interno do servidor ao consultar banco." });
    } finally {
      if (mysqlConn) mysqlConn.release();
    }
  }

  return { getEstoqueAtual, updateEstoquePadrao };
};
