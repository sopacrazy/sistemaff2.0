const express = require("express");
const sql = require("mssql");
const fs = require("fs");
const bwipjs = require("bwip-js");
const dayjs = require("dayjs");

const generatePixPayload = ({ key, name, city, amount, reference }) => {
  const f = (id, val) => id + String(val).length.toString().padStart(2, '0') + val;
  const merchantAccountInfo = f('00', 'br.gov.bcb.pix') + f('01', key.replace(/[^0-9]/g, ''));
  const additionalData = f('05', reference || 'NFE');
  
  let payload = f('00', '01') +
                f('01', '12') +
                f('26', merchantAccountInfo) +
                f('52', '0000') +
                f('53', '986') +
                f('54', amount.toFixed(2)) +
                f('58', 'BR') +
                f('59', name.substring(0, 25)) +
                f('60', city.substring(0, 15)) +
                f('62', additionalData) +
                '6304';

  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= (payload.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) crc = (crc << 1) ^ 0x1021;
      else crc <<= 1;
    }
  }
  payload += (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  return payload;
};

module.exports = (getPool, authenticateToken) => {
  const router = express.Router();

  // Rota para buscar pedidos abertos da SZ4140
  router.get("/pedidos", authenticateToken, async (req, res) => {
    const pool = getPool();
    if (!pool) {
      return res.status(503).json({ error: "Servidor SQL (Protheus) não disponível." });
    }

    const local = req.query.local;
    const dataFiltro = req.query.dataFiltro || req.query.data;
    
    // Converte data com hífens (se vier assim) para o formato Protheus (YYYYMMDD)
    const formattedDateParam = dataFiltro ? dataFiltro.replace(/-/g, "") : null;

    const query = `
      SELECT TOP 500
          Z4_LOCAL AS filial, 
          Z4_BILHETE AS bilhete, 
          Z4_DATA AS data, 
          Z4_HORA AS hora,
          Z4_NOMCLI AS cliente,
          Z4_COND AS cond_cod,
          Z4_DESCOND AS cond_nome, 
          Z4_TOTBIL AS valor,
          Z4_NOTA AS nota,
          0 AS qtdItens
      FROM SZ4140 (NOLOCK)
      WHERE 
          D_E_L_E_T_ = ' '
          AND Z4_FILIAL = '01'
          AND Z4_COND <= '899'
          ${local ? "AND Z4_LOCAL = @local" : ""}
          ${formattedDateParam ? "AND Z4_DATA = @dataFiltro" : "AND Z4_DATA >= CONVERT(VARCHAR(8), GETDATE() - 1, 112)"}
      ORDER BY 
          Z4_DATA DESC, 
          R_E_C_N_O_ DESC
    `;

    try {
      const request = pool.request();
      if (local) request.input("local", sql.VarChar, local);
      if (formattedDateParam) request.input("dataFiltro", sql.VarChar(8), formattedDateParam);

      const result = await request.query(query);
      
      const formattedData = result.recordset.map((record) => ({
        filial: (record.filial || "").trim(),
        bilhete: (record.bilhete || "").trim(),
        data: record.data ? record.data.trim() : "", 
        hora: record.hora ? record.hora.trim() : "",
        cliente: (record.cliente || "CLIENTE NÃO IDENTIFICADO").trim(),
        condPagamento: record.cond_nome ? record.cond_nome.trim() : (record.cond_cod ? record.cond_cod.trim() : ""),
        valor: parseFloat(record.valor || 0),
        qtdItens: parseInt(record.qtdItens || 0, 10),
        temNota: record.nota ? record.nota.trim() !== "" : false,
        obs: "",
      }));

      res.json(formattedData);
    } catch (err) {
      console.error("❌ ERRO FATAL API CAIXA - Detalhes:", {
        message: err.message,
        query: query,
        params: { local, dataFiltro, formattedDateParam }
      });
      res.status(500).json({ 
        error: "Erro ao consultar o banco de dados Protheus.", 
        details: err.message,
        stack: err.stack 
      });
    }
  });

  // Rota para Fechamento de Caixinha (Consolidado)
  router.get("/fechamento-caixinha", authenticateToken, async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: "Servidor SQL não disponível." });

    const { data, local, banco, agencia, conta } = req.query;
    const protheusDate = data ? data.replace(/-/g, "") : new Date().toISOString().split('T')[0].replace(/-/g, "");
    const filial = local || '01';
    const cBanco = banco || 'CX1';
    const cAgencia = agencia || '00001';
    const cConta = conta || '0000000001';

    try {
      const request = pool.request();
      request.input("filial", sql.VarChar, filial);
      request.input("data", sql.VarChar, protheusDate);
      request.input("banco", sql.VarChar, cBanco);
      request.input("agencia", sql.VarChar, cAgencia);
      request.input("conta", sql.VarChar, cConta);

      // Usar a filial para construir o nome da tabela SE5. Ex: SE5140 ou SE5010
      const tableSE5 = `SE5140`; 
      const tableSZ4 = `SZ4140`;
      const tableSE8 = `SE8140`;

      // 1. Calcular Saldo Inicial (Busca o último saldo fechado na SE8 antes da data atual)
      const saldoIniQuery = `
        SELECT TOP 1 E8_SALATUA AS saldo
        FROM ${tableSE8} (NOLOCK)
        WHERE D_E_L_E_T_ = ''
          AND E8_FILIAL = '01'
          AND E8_BANCO = @banco
          AND E8_AGENCIA = @agencia
          AND E8_CONTA = @conta
          AND E8_DTSALAT < @data
        ORDER BY E8_DTSALAT DESC
      `;
      const saldoIniRes = await request.query(saldoIniQuery);
      const saldoInicial = parseFloat(saldoIniRes.recordset[0]?.saldo || 0);

      // 2. Buscar Movimentações do Dia (SE5 + Join com SZ4 para identificar Fiado x Vista)
      const moveQuery = `
        SELECT 
          E5.E5_DATA AS data,
          E5.E5_BENEF AS beneficiario,
          E5.E5_PREFIXO AS prefixo,
          E5.E5_NUMERO AS numero,
          E5.E5_VALOR AS valor,
          E5.E5_MOTBX AS motBaixa,
          E5.E5_RECPAG AS recPag,
          E5.E5_TIPODOC AS tipoDoc,
          E5.E5_HISTOR AS historico,
          E5.E5_KEY AS e5Key,
          E5.E5_NATUREZ AS natureza,
          SZ4.Z4_COND AS condVenda
        FROM ${tableSE5} E5 (NOLOCK)
        LEFT JOIN ${tableSZ4} SZ4 (NOLOCK) 
          ON SZ4.Z4_FILIAL = E5.E5_FILIAL 
          AND SZ4.Z4_BILHETE = E5.E5_NUMERO 
          AND SZ4.D_E_L_E_T_ = ''
        WHERE E5.D_E_L_E_T_ = ''
          AND E5.E5_FILIAL = '01'
          AND E5.E5_DATA = @data
          AND E5.E5_BANCO = @banco
          AND E5.E5_AGENCIA = @agencia
          AND E5.E5_CONTA = @conta
          AND E5.E5_SITUACA <> 'C'
        ORDER BY E5.E5_RECPAG DESC, E5.E5_DATA
      `;
      const moveRes = await request.query(moveQuery);
      const movements = moveRes.recordset;

      // 3. Buscar Totais de Vendas do Dia (SZ5 Itens + SZ4 Cabeçalho)
      // O Protheus RFINR02 soma os itens da SZ5 onde o preço unitário > 0.10
      const salesQuery = `
        SELECT 
          Z4.Z4_COND AS cond,
          SUM(Z5.Z5_TOTAL) AS valor
        FROM SZ5140 Z5 (NOLOCK)
        INNER JOIN SZ4140 Z4 (NOLOCK) ON Z4.Z4_BILHETE = Z5.Z5_BILHETE 
            AND Z4.Z4_FILIAL = Z5.Z5_FILIAL 
            AND Z4.D_E_L_E_T_ = ''
        WHERE Z5.D_E_L_E_T_ = ''
          AND Z5.Z5_FILIAL = '01'
          AND Z5.Z5_DATA = @data
          AND Z5.Z5_PRECO > 0.10
        GROUP BY Z4.Z4_COND
      `;
      const salesRes = await request.query(salesQuery);
      const sales = salesRes.recordset;

      // Processar dados para o frontend
      const fiado = [];
      const diversosC = [];
      const despesas = [];

      let totDiv = 0;
      let totRecF = 0;
      let totDespesas = 0;
      let venVisCalculado = 0;
      let totBol = 0;

      movements.forEach(m => {
        const benefRaw = (m.beneficiario || '').trim();
        const histRaw = (m.historico || '').trim();
        const pre = (m.prefixo || '').trim();
        const num = (m.numero || '').trim();
        const motBaixa = (m.motBaixa || '').trim();
        const natureza = (m.natureza || '').trim();

        // 1. Pular registros de 'CHQPRE' (Cheque Pré-datado)
        // No Protheus RFINR02, naturezas 'CHQPRE' são tratadas fora do fluxo principal
        // e não devem constar como Recebimento ou Despesa para não duplicar valores vindos da SEF.
        if (natureza === 'CHQPRE') {
          return;
        }

        // Totalizar Boletos (MOTBX == 'BOL')
        if (m.recPag === 'R' && motBaixa === 'BOL') {
          totBol += parseFloat(m.valor || 0);
        }

        const item = {
          data: m.data.trim(),
          beneficiario: benefRaw || histRaw || 'DIVERSOS',
          doc: pre && num ? `${pre}-${num}` : (num || histRaw.substring(0, 15)),
          valor: parseFloat(m.valor || 0),
          motBaixa: motBaixa,
          historico: histRaw,
          recPag: m.recPag
        };

        if (m.recPag === 'R') {
          const cond = (m.condVenda || '').trim();
          const tipoDoc = (m.tipoDoc || '').trim();

          // Filtro Protheus RFINR02: Ignorar tipos de baixa/documentos de ajuste
          const ignoredTypes = ["DC", "JR", "MT", "CM", "D2", "J2", "M2", "C2", "V2", "CP", "TL", "BA"];
          if (ignoredTypes.includes(tipoDoc)) {
            return;
          }
          
          if (cond === '001') {
            venVisCalculado += item.valor;
            return;
          }

          if ((pre === 'BIL' || pre === 'DIL') && motBaixa === 'NOR') {
            fiado.push(item);
            totRecF += item.valor;
          } else {
            diversosC.push(item);
            totDiv += item.valor;
          }
        } else {
          // Filtro Protheus RFINR02 (Pagamentos):
          const tipoDoc = (m.tipoDoc || '').trim();
          const e5Key = (m.e5Key || '').trim();
          
          // Ignoramos Estornos (ES) e PAs cancelados para bater com o relatório do Protheus (RFINR02.PRW linha 741)
          if (tipoDoc === 'ES' || (tipoDoc === 'PA' && e5Key !== '')) {
             return;
          }

          despesas.push(item);
          totDespesas += item.valor;
        }
      });

      // Totais de Vendas (SZ4)
      let venPRz = 0;
      let venVisSZ4 = 0;
      let venPix = 0;

      sales.forEach(s => {
        const val = parseFloat(s.valor || 0);
        const cond = (s.cond || '').trim();
        
        if (cond === '001') {
          venVisSZ4 += val;
        } else if (cond === '033' || cond === 'PIX') {
          // No Protheus RFINR02, o PIX entra na Venda Prazo/Fiado ou separadamente?
          // Se o Protheus mostra 1.159k, e PIX é 122k, ele deve estar no Prazo.
          venPix += val;
          venPRz += val; // Mantendo no Prazo para bater com o total do Protheus
        } else if (cond.startsWith('9')) {
          // Ignora condições que começam com 9 (Outros/Diversos no Protheus)
        } else {
          venPRz += val;
        }
      });

      // 4. Buscar Valores Conferidos (SZ8)
      const sz8Query = `
        SELECT TOP 1
          Z8_DINHEIR, Z8_CHEQUE, Z8_CC, Z8_CD, Z8_TICK, Z8_OUT, Z8_OBS
        FROM SZ8140 (NOLOCK)
        WHERE D_E_L_E_T_ = ''
          AND Z8_FILIAL = '01'
          AND Z8_DATA = @data
      `;
      const sz8Res = await request.query(sz8Query);
      const sz8 = sz8Res.recordset[0] || {};

      // 5. Buscar Cheque Pré acumulado (SEF pendentes + SE5 confirmados hoje)
      // Ajustado para filtrar por banco/agencia/conta e ignorar cancelados (SITUACA <> 'C')
      const sefQuery = `
        SELECT 
          (SELECT SUM(EF_VALOR) FROM SEF140 (NOLOCK) 
            WHERE D_E_L_E_T_ = '' AND EF_FILIAL = '01' AND EF_DATA = @data 
              AND EF_EFETIV IN ('1', ' ')
              AND EF_BANCO = @banco AND EF_AGENCIA = @agencia AND EF_CONTA = @conta) as totalSef,
          (SELECT SUM(E5_VALOR) FROM SE5140 (NOLOCK) 
            WHERE D_E_L_E_T_ = '' AND E5_FILIAL = '01' AND E5_DATA = @data 
              AND E5_NATUREZ = 'CHQPRE'
              AND E5_SITUACA <> 'C'
              AND E5_BANCO = @banco AND E5_AGENCIA = @agencia AND E5_CONTA = @conta) as totalSe5
      `;
      const sefRes = await request.query(sefQuery);
      const totPre = (sefRes.recordset[0]?.totalSef || 0) + (sefRes.recordset[0]?.totalSe5 || 0);

      // O Saldo Final no Protheus RFINR02 é o saldo TEÓRICO (Entradas - Saídas).
      // Ele NÃO deve somar os valores físicos (disponibilidades, totPre, totBol) que são usados apenas para a conferência final.
      // A Venda Fiado no relatório atua como uma dedução que anula a Venda a Prazo (pois o dinheiro não entrou fisicamente).
      const saldoFinal = (saldoInicial + totDiv + venVisSZ4 + venPRz + totRecF) - (venPRz + totDespesas);

      const resumoFinanceiro = {
        saldoInicial,
        recebimentosDiversos: totDiv,
        vendaPrazo: venPRz,
        vendaVista: venVisSZ4,
        recebido: totRecF,
        vendaPix: venPix,
        despesas: totDespesas,
        saldoFinal,
        conferido: {
          dinheiro: sz8.Z8_DINHEIR || 0,
          cheque: sz8.Z8_CHEQUE || 0,
          chequePre: totPre,
          boleto: totBol,
          cartaoCredito: sz8.Z8_CC || 0,
          cartaoDebito: sz8.Z8_CD || 0,
          ticket: sz8.Z8_TICK || 0,
          outros: sz8.Z8_OUT || 0,
          total: (sz8.Z8_DINHEIR || 0) + (sz8.Z8_CHEQUE || 0) + (sz8.Z8_CC || 0) + (sz8.Z8_CD || 0) + (sz8.Z8_TICK || 0) + (sz8.Z8_OUT || 0) + totPre + totBol,
          status: (sz8.Z8_OBS || '').trim()
        }
      };

      res.json({
        sections: {
          fiado,
          diversosC,
          despesas
        },
        summary: resumoFinanceiro
      });

    } catch (err) {
      console.error("Erro no Fechamento Caixinha:", err);
      res.status(500).json({ error: "Erro ao processar fechamento de caixinha." });
    }
  });

  // Rota para buscar detalhes de um pedido específico e imprimir
  router.get("/pedido/:bilhete/imprimir", authenticateToken, async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: "Servidor SQL não disponível." });

    const { bilhete } = req.params;
    const { local } = req.query;

    try {
      // 1. Buscar Cabeçalho (SZ4140)
      const headerQuery = `
        SELECT 
          Z4_LOCAL AS filial, Z4_BILHETE AS bilhete, Z4_DATA AS data, Z4_HORA AS hora,
          Z4_CLIENTE AS cliente_cod, Z4_NOMCLI AS cliente_nome, 
          Z4_COND AS cond_cod, Z4_DESCOND AS cond_nome,
          Z4_VEND AS vend_cod, Z4_NOMVEN AS vend_nome,
          Z4_TOTBIL AS valor, Z4_NOTA AS nota, Z4_USUARIO AS usuario,
          Z4_XPED4SA AS xped4sa
        FROM SZ4140 (NOLOCK)
        WHERE D_E_L_E_T_ = '' AND Z4_BILHETE = @bilhete
      `;
      const headerRes = await pool.request().input("bilhete", sql.VarChar, bilhete).query(headerQuery);
      if (headerRes.recordset.length === 0) return res.status(404).json({ error: "Pedido não encontrado." });
      
      const header = headerRes.recordset[0];

      // 2. Buscar Itens (SZ5140)
      const itemsQuery = `
        SELECT 
          Z5_ITEM AS item, 
          Z5_CODPRO AS codigo, 
          Z5_DESPRO AS descricao,
          Z5_UM AS um, 
          Z5_SEGUM AS segum,
          Z5_QTDE AS quant, 
          Z5_PRECO AS unitario, 
          Z5_TOTAL AS total,
          Z5_OBS AS obs
        FROM SZ5140 (NOLOCK)
        WHERE D_E_L_E_T_ = '' AND Z5_BILHETE = @bilhete
        ORDER BY Z5_ITEM
      `;
      const itemsRes = await pool.request().input("bilhete", sql.VarChar, bilhete).query(itemsQuery);
      const items = itemsRes.recordset;

      const formattedHeader = {
        filial: header.filial.trim(),
        bilhete: header.bilhete.trim(),
        data: header.data ? header.data.trim() : "",
        hora: header.hora ? header.hora.trim() : "",
        cliente_cod: header.cliente_cod ? header.cliente_cod.trim() : "",
        cliente_nome: header.cliente_nome ? header.cliente_nome.trim() : "",
        cond_cod: header.cond_cod ? header.cond_cod.trim() : "",
        cond_nome: header.cond_nome ? header.cond_nome.trim() : "",
        vend_cod: header.vend_cod ? header.vend_cod.trim() : "",
        vend_nome: header.vend_nome ? header.vend_nome.trim() : "",
        valor: parseFloat(header.valor || 0),
        nota: header.nota ? header.nota.trim() : "",
        usuario: header.usuario ? header.usuario.trim() : "",
        xped4sa: header.xped4sa ? header.xped4sa.trim() : ""
      };

      // Retornamos os dados completos para o frontend gerar a visualização/impressão
      res.json({
        header: formattedHeader,
        items: items.map(i => ({
          item: i.item.trim(),
          codigo: i.codigo.trim(),
          descricao: i.descricao.trim(),
          um: i.um ? i.um.trim() : (i.segum ? i.segum.trim() : ""),
          quant: parseFloat(i.quant || 0),
          unitario: parseFloat(i.unitario || 0),
          total: parseFloat(i.total || 0),
          obs: i.obs ? i.obs.trim() : ""
        }))
      });

    } catch (err) {
      console.error("Erro ao buscar detalhes do pedido:", err);
      res.status(500).json({ error: "Erro ao buscar detalhes no Protheus." });
    }
  });

  // Rota para gerar Relatório Analítico de Vendas
  router.get("/relatorio-analitico", authenticateToken, async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: "Servidor SQL não disponível." });

    const { data, local } = req.query;
    if (!data) return res.status(400).json({ error: "A data é obrigatória." });

    // Converte YYYY-MM-DD para YYYYMMDD
    const protheusDate = data.replace(/-/g, "");
    const localFiltro = local || '01';

    try {
      // 1. Buscar Cabeçalhos e Totais
      const headerQuery = `
        SELECT 
          Z4_BILHETE AS bilhete,
          Z4_NOMCLI AS cliente,
          Z4_DESCOND AS condicao,
          Z4_FORMA AS forma,
          Z4_NOMVEN AS vendedor,
          Z4_TOTBIL AS valor,
          Z4_DATA AS data,
          Z4_HORA AS hora
        FROM SZ4140 (NOLOCK)
        WHERE D_E_L_E_T_ = '' 
          AND Z4_FILIAL = '01'
          AND Z4_DATA = @data
          AND Z4_LOCAL = @local
          AND Z4_COND <= '899'
        ORDER BY Z4_DESCOND, Z4_DATA DESC, Z4_HORA DESC
      `;
      
      const headerRes = await pool.request()
        .input("data", sql.VarChar, protheusDate)
        .input("local", sql.VarChar, localFiltro)
        .query(headerQuery);
      
      const headers = headerRes.recordset;

      // 2. Agrupar dados por Condição
      const groupedData = headers.reduce((acc, h) => {
        const cond = h.condicao.trim();
        if (!acc[cond]) acc[cond] = { items: [], total: 0 };
        acc[cond].items.push(h);
        acc[cond].total += parseFloat(h.valor || 0);
        return acc;
      }, {});

      const totalGeral = headers.reduce((acc, h) => acc + parseFloat(h.valor || 0), 0);
      
      const path = require("path");
      const PdfPrinter = require("pdfmake");

      const fonts = {
        Roboto: {
          normal: path.join(__dirname, "../fonts/Roboto-Regular.ttf"),
          bold: path.join(__dirname, "../fonts/Roboto-Medium.ttf"),
          italics: path.join(__dirname, "../fonts/Roboto-Italic.ttf"),
          bolditalics: path.join(__dirname, "../fonts/Roboto-MediumItalic.ttf"),
        },
      };

      const printer = new PdfPrinter(fonts);
      
      const formattedDate = `${protheusDate.substring(6,8)}/${protheusDate.substring(4,6)}/${protheusDate.substring(0,4)}`;
      const now = new Date();
      const emissaoStr = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

      // Montar o conteúdo do PDF dinamicamente
      const pdfContent = [
        // Cabeçalho
        {
          columns: [
            {
              stack: [
                { text: "SISTEMA FF", style: "brand" },
                { text: "RELATÓRIO ANALÍTICO DE VENDAS", style: "header" }
              ],
              width: "*"
            },
            {
              stack: [
                { text: `EMISSÃO: ${emissaoStr}`, style: "metaData" },
                { text: `DATA REF: ${formattedDate}`, style: "metaData" },
                { text: `LOCAL: ${localFiltro}`, style: "metaData" }
              ],
              alignment: "right",
              width: 150
            }
          ],
          margin: [0, 0, 0, 15]
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 535, y2: 0, lineWidth: 2, lineColor: '#10b981' }] },
        
        { text: "RESUMO POR FORMA DE PAGAMENTO", style: "sectionTitle", margin: [0, 15, 0, 8] },
        {
          table: {
            headerRows: 1,
            widths: ["*", 100],
            body: [
              [
                { text: "FORMA DE PAGAMENTO", style: "tableHeader" },
                { text: "VALOR TOTAL", style: "tableHeader", alignment: "right" }
              ],
              ...Object.entries(groupedData).map(([cond, data]) => [
                { text: cond, style: "tableCell" },
                { text: data.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), style: "tableCell", alignment: "right" }
              ]),
              [
                { text: "TOTAL GERAL", style: "tableTotalLabel" },
                { text: totalGeral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), style: "tableTotalValue", alignment: "right" }
              ]
            ]
          },
          layout: 'lightHorizontalLines'
        },
        { text: "DETALHAMENTO AGRUPADO", style: "sectionTitle", margin: [0, 20, 0, 10] }
      ];

      // Adicionar seções para cada forma de pagamento
      Object.entries(groupedData).forEach(([cond, data]) => {
        pdfContent.push(
          { 
            text: `PAGAMENTO: ${cond}`, 
            style: "groupTitle", 
            margin: [0, 10, 0, 5],
            fillColor: '#f8fafc'
          },
          {
            table: {
              headerRows: 1,
              widths: [55, "*", 90, 45, 75],
              body: [
                [
                  { text: "BILHETE", style: "tableHeader" },
                  { text: "CLIENTE", style: "tableHeader" },
                  { text: "VENDEDOR", style: "tableHeader" },
                  { text: "FORMA", style: "tableHeader" },
                  { text: "VALOR", style: "tableHeader", alignment: "right" }
                ],
                ...data.items.map(h => [
                  { text: h.bilhete.trim(), style: "tableCellBold" },
                  { text: h.cliente.trim(), style: "tableCell" },
                  { text: (h.vendedor || '').trim(), style: "tableCellSmall" },
                  { text: (h.forma || '').trim(), style: "tableCellSmall" },
                  { text: parseFloat(h.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), style: "tableCell", alignment: "right" }
                ]),
                [
                  { text: `SUBTOTAL (${cond})`, colSpan: 4, style: "subtotalLabel", alignment: "right" },
                  {}, {}, {},
                  { text: data.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), style: "subtotalValue", alignment: "right" }
                ]
              ]
            },
            layout: {
              fillColor: function (rowIndex) {
                if (rowIndex === 0) return '#f1f5f9';
                return null;
              },
              hLineColor: '#e2e8f0',
              vLineColor: '#e2e8f0'
            },
            margin: [0, 0, 0, 15]
          }
        );
      });

      const docDefinition = {
        pageSize: "A4",
        pageMargins: [30, 30, 30, 30],
        content: pdfContent,
        styles: {
          brand: { fontSize: 12, bold: true, color: '#64748b', tracking: 2 },
          header: { fontSize: 20, bold: true, color: '#10b981', margin: [0, 2, 0, 0] },
          metaData: { fontSize: 10, color: '#64748b', bold: true, margin: [0, 1, 0, 1] },
          sectionTitle: { fontSize: 14, bold: true, color: '#1e293b', margin: [0, 5, 0, 5], decoration: 'underline' },
          groupTitle: { fontSize: 12, bold: true, color: '#10b981', background: '#f0fdf4', margin: [5, 5, 5, 5] },
          tableHeader: { fontSize: 10, bold: true, color: '#475569', margin: [0, 4, 0, 4] },
          tableCell: { fontSize: 10, color: '#334155' },
          tableCellBold: { fontSize: 10, bold: true, color: '#1e293b' },
          tableCellSmall: { fontSize: 9, color: '#475569' },
          tableTotalLabel: { fontSize: 11, bold: true, color: '#1e293b', margin: [0, 4, 0, 4] },
          tableTotalValue: { fontSize: 12, bold: true, color: '#10b981', margin: [0, 4, 0, 4] },
          subtotalLabel: { fontSize: 10, bold: true, color: '#64748b' },
          subtotalValue: { fontSize: 10, bold: true, color: '#10b981' }
        }
      };

      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const fileName = `RelatorioVendas_${protheusDate}_${localFiltro}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      
      pdfDoc.pipe(res);
      pdfDoc.end();

    } catch (err) {
      console.error("Erro ao gerar relatório analítico:", err);
      res.status(500).json({ error: "Erro ao gerar o relatório analítico no servidor." });
    }
  });

  // --- NOVAS ROTAS NFE ---

  // Rota para listar notas fiscais de saída (SF2)
  router.get("/nfe", authenticateToken, async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: "Servidor SQL não disponível." });

    const { dataInicio, dataFim, local, search } = req.query;
    const filial = local || '01';
    
    // Formatar datas para o padrão Protheus (YYYYMMDD)
    const formattedStart = dataInicio ? dataInicio.replace(/-/g, "") : "";
    const formattedEnd = dataFim ? dataFim.replace(/-/g, "") : "";

    try {
      const query = `
        SELECT TOP 500
            F2.F2_DOC AS numero, 
            F2.F2_SERIE AS serie, 
            F2.F2_CLIENTE AS codCliente, 
            F2.F2_LOJA AS loja, 
            A1.A1_NOME AS nomeCliente, 
            F2.F2_EMISSAO AS dataEmissao, 
            F2.F2_VALBRUT AS valor,
            F2.F2_FILIAL AS filial,
            Z4.Z4_BILHETE AS bilhete,
            (SELECT COUNT(*) FROM SE1140 (NOLOCK) 
             WHERE E1_FILIAL = F2.F2_FILIAL AND E1_PORTADO <> '' AND D_E_L_E_T_ = '' 
             AND (E1_NUM = F2.F2_DOC OR E1_NUM = Z4.Z4_BILHETE)
            ) AS temBoleto
        FROM SF2140YY F2 (NOLOCK)
        OUTER APPLY (
            SELECT TOP 1 A1_NOME 
            FROM SA1140 (NOLOCK) 
            WHERE A1_COD = F2.F2_CLIENTE AND A1_LOJA = F2.F2_LOJA AND D_E_L_E_T_ = ''
        ) A1
        OUTER APPLY (
            SELECT TOP 1 Z4_BILHETE 
            FROM SZ4140 (NOLOCK) 
            WHERE Z4_NOTA = F2.F2_DOC AND Z4_FILIAL = F2.F2_FILIAL AND D_E_L_E_T_ = ' '
        ) Z4
        WHERE 
            F2.D_E_L_E_T_ = ''
            AND (F2.F2_SERIE = '1' OR F2.F2_SERIE = '1  ')
            AND F2.F2_EMISSAO >= '20260101'
            ${(formattedStart && !search) ? "AND F2.F2_EMISSAO >= @start" : ""}
            ${(formattedEnd && !search) ? "AND F2.F2_EMISSAO <= @end" : ""}
            ${search ? "AND (F2.F2_DOC LIKE @search OR A1.A1_NOME LIKE @search OR Z4.Z4_BILHETE LIKE @search)" : ""}
        ORDER BY F2.F2_EMISSAO DESC, F2.F2_DOC DESC
      `;

      const request = pool.request();
      request.input("filial", sql.VarChar, filial);
      if (formattedStart) request.input("start", sql.VarChar, formattedStart);
      if (formattedEnd) request.input("end", sql.VarChar, formattedEnd);
      if (search) request.input("search", sql.VarChar, `%${search}%`);

      const result = await request.query(query);

      const formattedData = result.recordset.map(r => ({
        numero: r.numero.trim(),
        serie: r.serie.trim(),
        codCliente: r.codCliente.trim(),
        loja: r.loja.trim(),
        nomeCliente: r.nomeCliente ? r.nomeCliente.trim() : "CLIENTE NÃO ENCONTRADO",
        dataEmissao: `${r.dataEmissao.substring(0,4)}-${r.dataEmissao.substring(4,6)}-${r.dataEmissao.substring(6,8)}`,
        valor: parseFloat(r.valor || 0),
        bilhete: r.bilhete ? r.bilhete.trim() : "",
        temBoleto: r.temBoleto > 0
      }));

      res.json(formattedData);
    } catch (err) {
      console.error("Erro ao listar NFE:", err);
      res.status(500).json({ error: "Erro ao consultar notas no Protheus." });
    }
  });

  // Rota para buscar detalhes de uma NFE específica (SF2 + SD2)
  router.get("/nfe/:doc/:serie", authenticateToken, async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: "Servidor SQL não disponível." });

    const { doc, serie } = req.params;
    const { local } = req.query;
    const filial = local || '01';

    try {
      // 1. Cabeçalho
      const headerQuery = `
        SELECT 
            F2_DOC, F2_SERIE, F2_CLIENTE, F2_LOJA, A1_NOME, F2_EMISSAO, F2_VALBRUT
        FROM SF2140YY F2 (NOLOCK)
        LEFT JOIN SA1140 A1 (NOLOCK) ON A1_COD = F2_CLIENTE AND A1_LOJA = F2_LOJA AND A1.D_E_L_E_T_ = ''
        WHERE F2.D_E_L_E_T_ = '' AND F2_DOC = @doc AND F2_SERIE = @serie
      `;
      const headerRes = await pool.request()
        .input("filial", sql.VarChar, filial)
        .input("doc", sql.VarChar, doc)
        .input("serie", sql.VarChar, serie)
        .query(headerQuery);

      if (headerRes.recordset.length === 0) return res.status(404).json({ error: "Nota não encontrada." });

      // 2. Itens
      const itemsQuery = `
        SELECT 
            D2_ITEM, D2_COD, B1_DESC AS D2_DESC, D2_UM, D2_QUANT, D2_PRCVEN, D2_TOTAL
        FROM SD2140 D2 (NOLOCK)
        LEFT JOIN SB1140 B1 (NOLOCK) ON B1_COD = D2_COD AND B1.D_E_L_E_T_ = ''
        WHERE D2.D_E_L_E_T_ = '' AND D2_DOC = @doc
        ORDER BY D2_ITEM
      `;
      const itemsRes = await pool.request()
        .input("filial", sql.VarChar, filial)
        .input("doc", sql.VarChar, doc)
        .input("serie", sql.VarChar, serie)
        .query(itemsQuery);

      const header = headerRes.recordset[0];
      res.json({
        header: {
          numero: String(header.F2_DOC || "").trim(),
          serie: String(header.F2_SERIE || "").trim(),
          codCliente: String(header.F2_CLIENTE || "").trim(),
          loja: String(header.F2_LOJA || "").trim(),
          nomeCliente: header.A1_NOME ? String(header.A1_NOME).trim() : "",
          dataEmissao: String(header.F2_EMISSAO || "").trim(),
          valor: parseFloat(header.F2_VALBRUT || 0)
        },
        items: itemsRes.recordset.map(i => ({
          item: String(i.D2_ITEM || "").trim(),
          codigo: String(i.D2_COD || "").trim(),
          descricao: String(i.D2_DESC || "").trim(),
          um: String(i.D2_UM || "").trim(),
          quant: parseFloat(i.D2_QUANT || 0),
          unitario: parseFloat(i.D2_PRCVEN || 0),
          total: parseFloat(i.D2_TOTAL || 0)
        }))
      });

    } catch (err) {
      console.error("Erro ao buscar detalhes da NFE:", err);
      res.status(500).json({ error: "Erro ao buscar detalhes da nota no Protheus." });
    }
  });

  // Rota para gerar PDF da DANFE (Pública para facilitar impressão direta)
  router.get("/nfe/:doc/:serie/pdf", async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: "Servidor SQL não disponível." });

    const { doc, serie } = req.params;
    const { local } = req.query;
    const filial = local || '01';

    try {
      // 1. Buscar Dados Completos (Cabeçalho + Cliente + Protocolo)
      const headerQuery = `
        SELECT 
            F2_DOC, F2_SERIE, F2_CLIENTE, F2_LOJA, F2_EMISSAO, F2_HORA, 
            F2_VALBRUT, F2_VALICM, F2_BASEICM, F2_VALTST, F2_BASETST, F2_VALIPI,
            F2_VLR_FRT, F2_SEGURO, F2_DESCONT, F2_DESPESA,
            F2_CHVNFE,
            A1_NOME, A1_END, A1_BAIRRO, A1_MUN, A1_EST, A1_CEP, A1_CGC, A1_INSCR, A1_TEL,
            (SELECT TOP 1 F3_PROTOC FROM SF3140 WHERE F3_NFISCAL = F2_DOC AND F3_SERIE = F2_SERIE AND F3_FILIAL = F2_FILIAL AND D_E_L_E_T_ = '') AS F3_PROTOC,
            (SELECT TOP 1 Z4_BILHETE FROM SZ4140 WHERE Z4_NOTA = F2_DOC AND Z4_FILIAL = F2_FILIAL AND D_E_L_E_T_ = '') AS Z4_BILHETE
        FROM SF2140YY F2 (NOLOCK)
        LEFT JOIN SA1140 A1 (NOLOCK) ON A1_COD = F2_CLIENTE AND A1_LOJA = F2_LOJA AND A1.D_E_L_E_T_ = ''
        WHERE F2.D_E_L_E_T_ = '' AND F2_DOC = @doc AND F2_SERIE = @serie
      `;
      const headerRes = await pool.request()
        .input("filial", sql.VarChar, filial)
        .input("doc", sql.VarChar, doc)
        .input("serie", sql.VarChar, serie)
        .query(headerQuery);

      if (headerRes.recordset.length === 0) return res.status(404).json({ error: "Nota não encontrada." });
      const h = headerRes.recordset[0];

      // Logo em base64
      let companyLogo = null;
      try {
          const path = require("path");
          const lPath = path.join(__dirname, "../src/img/logo.png");
          const lPath2 = path.join(__dirname, "../src/img/logo2.png");
          if (fs.existsSync(lPath2)) companyLogo = "data:image/png;base64," + fs.readFileSync(lPath2).toString('base64');
          else if (fs.existsSync(lPath)) companyLogo = "data:image/png;base64," + fs.readFileSync(lPath).toString('base64');
      } catch (e) {}

      // 2. Buscar Itens Completos
      const itemsQuery = `
        SELECT 
            D2_ITEM, D2_COD, B1_DESC AS D2_DESC, B1_POSIPI AS D2_NCM, D2_CF, D2_UM, D2_QUANT, D2_PRCVEN, D2_TOTAL,
            D2_PICM, D2_IPI, D2_VALICM, D2_BASEICM
        FROM SD2140 D2 (NOLOCK)
        LEFT JOIN SB1140 B1 (NOLOCK) ON B1_COD = D2_COD AND B1.D_E_L_E_T_ = ''
        WHERE D2.D_E_L_E_T_ = '' AND D2_DOC = @doc AND D2_SERIE = @serie
        ORDER BY D2_ITEM
      `;
      const itemsRes = await pool.request()
        .input("filial", sql.VarChar, filial)
        .input("doc", sql.VarChar, doc)
        .input("serie", sql.VarChar, serie)
        .query(itemsQuery);
      
      const items = itemsRes.recordset;

      // Determinar Natureza da Operação com base no primeiro item
      const natureMap = {
        '5152': 'TRANSFERENCIA',
        '6152': 'TRANSFERENCIA',
        '5102': 'VENDA DE MERCADORIA',
        '6102': 'VENDA DE MERCADORIA',
        '5927': 'BAIXA DE ESTOQUE'
      };
      const firstCfop = items.length > 0 ? (items[0].D2_CF || '').trim() : '';
      h.NATUREZA = natureMap[firstCfop] || 'VENDA DE MERCADORIA';

      const path = require("path");
      const PdfPrinter = require("pdfmake");
      const fonts = {
        Roboto: {
          normal: path.join(__dirname, "../fonts/Roboto-Regular.ttf"),
          bold: path.join(__dirname, "../fonts/Roboto-Medium.ttf"),
          italics: path.join(__dirname, "../fonts/Roboto-Italic.ttf"),
          bolditalics: path.join(__dirname, "../fonts/Roboto-MediumItalic.ttf"),
        }
      };
      const printer = new PdfPrinter(fonts);

      // 3. Gerar Código de Barras da Chave (Code 128)
      let nfeBarcode = null;
      if (h.F2_CHVNFE) {
          try {
              const barcodeBuffer = await bwipjs.toBuffer({
                  bcid: 'code128',
                  text: h.F2_CHVNFE.trim(),
                  scale: 3,
                  height: 12,
                  includetext: false
              });
              nfeBarcode = "data:image/png;base64," + barcodeBuffer.toString('base64');
          } catch (barErr) {
              console.error("Erro ao gerar código de barras NFE:", barErr);
          }
      }

      const fmtMoeda = (v) => parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const fmtData = (d) => d ? `${d.substring(6,8)}/ ${d.substring(4,6)}/ ${d.substring(0,4)}` : "";
      const fmtCGC = (c) => (c || "").trim();

      const docDefinition = {
        pageSize: 'A4',
        pageMargins: [20, 20, 20, 20],
        defaultStyle: { fontSize: 8, font: 'Roboto' },
        content: [
          {
            table: {
              widths: ['*', 100],
              body: [
                [
                  { 
                    stack: [
                      {
                        columns: [
                          { text: 'RECEBEMOS DE FORT FRUIT LTDA OS PRODUTOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO', fontSize: 6, bold: true, width: '*' },
                          { text: `BILHETE: ${(h.Z4_BILHETE || '').trim()}`, fontSize: 8, bold: true, width: 'auto', alignment: 'right' }
                        ]
                      },
                      {
                        columns: [
                          { 
                            stack: [
                              { text: 'DATA DE RECEBIMENTO', fontSize: 5 },
                              { text: '____ /____ /_____', fontSize: 10, margin: [0, 8, 0, 0] }
                            ],
                            width: 100
                          },
                          { 
                            stack: [
                              { text: 'IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR', fontSize: 5 },
                              { text: '__________________________________________________________________________', fontSize: 10, margin: [0, 8, 0, 0] }
                            ]
                          }
                        ],
                        margin: [0, 2, 0, 0]
                      }
                    ],
                    padding: [2, 2, 2, 2]
                  },
                  {
                    stack: [
                        { text: 'NF-e', alignment: 'center', bold: true, fontSize: 10 },
                        { text: `N. ${h.F2_DOC.trim()}`, alignment: 'center', bold: true },
                        { text: `SÉRIE ${h.F2_SERIE.trim()}`, alignment: 'center', bold: true }
                    ],
                    alignment: 'center'
                  }
                ]
              ]
            },
            margin: [0, 0, 0, 10]
          },

          // EMITENTE + DANFE + CHAVE
          {
            table: {
              widths: ['*', 110, '*'],
              body: [
                [
                  {
                    columns: [
                        companyLogo ? { image: companyLogo, width: 55, margin: [0, 2, 10, 0] } : { width: 55, text: '' },
                        {
                            stack: [
                                { text: 'FORT FRUIT LTDA', bold: true, fontSize: 12, alignment: 'center' },
                                { text: 'ALAMEDA CEASA, SN', alignment: 'center' },
                                { text: 'CURIO - BELEM/PA - CEP: 66610-120', alignment: 'center' },
                                { text: 'Fone: 559132457463', alignment: 'center' }
                            ],
                            width: '*'
                        },
                        { width: 55, text: '' } // Espaçador para equilibrar o centro
                    ]
                  },
                  {
                    stack: [
                      { text: 'DANFE', bold: true, fontSize: 14, alignment: 'center' },
                      { text: 'DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRÔNICA', fontSize: 6, alignment: 'center' },
                      {
                        columns: [
                          { text: '0-ENTRADA\n1-SAÍDA', fontSize: 7 },
                          { text: '1', fontSize: 12, bold: true, border: [true, true, true, true], alignment: 'center' }
                        ],
                        margin: [0, 5, 0, 5]
                      },
                      { text: `N. ${h.F2_DOC.trim()}\nSÉRIE ${h.F2_SERIE.trim()}\nFOLHA 01/01`, alignment: 'center', bold: true }
                    ]
                  },
                  {
                    stack: [
                        { text: 'CHAVE DE ACESSO DA NF-e', fontSize: 7, bold: true },
                        nfeBarcode ? { image: nfeBarcode, width: 150, alignment: 'center', margin: [0, 2, 0, 0] } : { text: '' },
                        { text: (h.F2_CHVNFE || '').replace(/(.{4})/g, '$1 '), fontSize: 9, margin: [0, 2, 0, 5], bold: true, alignment: 'center' },
                        { text: 'Consulta de autenticidade no portal nacional da NF-e', fontSize: 6, alignment: 'center' },
                        { text: 'www.nfe.fazenda.gov.br/portal ou no site da SEFAZ Autorizada', fontSize: 6, alignment: 'center', margin: [0, 0, 0, 5] }
                    ]
                  }
                ]
              ]
            },
            margin: [0, 0, 0, 5]
          },

          // NATUREZA + PROTOCOLO
          {
            table: {
              widths: ['*', 200],
              body: [
                [
                  { 
                    stack: [
                      { text: 'NATUREZA DA OPERAÇÃO', fontSize: 6 }, 
                      { text: (h.NATUREZA || 'VENDA DE MERCADORIA'), bold: true, fontSize: 10 }
                    ]
                  },
                  { 
                    stack: [
                      { text: 'PROTOCOLO DE AUTORIZAÇÃO DE USO', fontSize: 6 }, 
                      { text: (h.F2_PROTOCO || h.F3_PROTOC || '').trim() + ' ' + fmtData(h.F2_EMISSAO) + ' ' + (h.F2_HORA || ''), bold: true, fontSize: 9 }
                    ]
                  }
                ]
              ]
            }
          },

          // IE + CNPJ
          {
            table: {
              widths: ['*', '*', '*'],
              body: [
                [
                  { stack: [{ text: 'INSCRIÇÃO ESTADUAL', fontSize: 6 }, { text: '154371424' }] },
                  { stack: [{ text: 'INSC. ESTADUAL SUBST. TRIB.', fontSize: 6 }, { text: '' }] },
                  { stack: [{ text: 'CNPJ', fontSize: 6 }, { text: '02.338.006/0001-07' }] }
                ]
              ]
            },
            margin: [0, -1, 0, 10]
          },

          // DESTINATÁRIO
          { text: 'DESTINATÁRIO/REMETENTE', bold: true, fontSize: 7, margin: [0, 5, 0, 2] },
          {
            table: {
              widths: ['*', 100, 80],
              body: [
                [
                  { stack: [{ text: 'NOME/RAZÃO SOCIAL', fontSize: 6 }, { text: (h.A1_NOME || '').trim(), bold: true }] },
                  { stack: [{ text: 'CNPJ/CPF', fontSize: 6 }, { text: fmtCGC(h.A1_CGC), bold: true }] },
                  { stack: [{ text: 'DATA DE EMISSÃO', fontSize: 6 }, { text: fmtData(h.F2_EMISSAO), bold: true }] }
                ],
                [
                  {
                    columns: [
                      { stack: [{ text: 'ENDEREÇO', fontSize: 6 }, { text: (h.A1_END || '').trim(), bold: true }], width: '*' },
                      { stack: [{ text: 'BAIRRO/DISTRITO', fontSize: 6 }, { text: (h.A1_BAIRRO || '').trim(), bold: true }], width: 100 }
                    ]
                  },
                  { stack: [{ text: 'CEP', fontSize: 6 }, { text: (h.A1_CEP || '').trim(), bold: true }] },
                  { stack: [{ text: 'DATA ENTRADA/SAÍDA', fontSize: 6 }, { text: fmtData(h.F2_EMISSAO), bold: true }] }
                ],
                [
                  {
                    columns: [
                      { stack: [{ text: 'MUNICÍPIO', fontSize: 6 }, { text: (h.A1_MUN || '').trim(), bold: true }], width: '*' },
                      { stack: [{ text: 'FONE/FAX', fontSize: 6 }, { text: (h.A1_TEL || '').trim(), bold: true }], width: 100 }
                    ]
                  },
                  { stack: [{ text: 'UF', fontSize: 6 }, { text: (h.A1_EST || '').trim(), bold: true }] },
                  { 
                    stack: [
                      { text: 'HORA ENTRADA/SAÍDA', fontSize: 6 }, 
                      { text: (h.F2_HORA || '').trim(), bold: true }
                    ]
                  }
                ]
              ]
            }
          },

          // CÁLCULO DO IMPOSTO
          {
            table: {
              widths: ['*', '*', '*', '*', '*'],
              body: [
                [
                  { text: 'CÁLCULO DO IMPOSTO', bold: true, fontSize: 7, colSpan: 5, fillColor: '#f2f2f2', border: [true, true, true, false] },
                  {}, {}, {}, {}
                ],
                [
                  { stack: [{ text: 'BASE DE CÁLCULO DO ICMS', fontSize: 6 }, { text: fmtMoeda(h.F2_BASEICM), alignment: 'right' }] },
                  { stack: [{ text: 'VALOR DO ICMS', fontSize: 6 }, { text: fmtMoeda(h.F2_VALICM), alignment: 'right' }] },
                  { stack: [{ text: 'BASE DE CÁLCULO DO ICMS ST', fontSize: 6 }, { text: fmtMoeda(h.F2_BASEST), alignment: 'right' }] },
                  { stack: [{ text: 'VALOR DO ICMS ST', fontSize: 6 }, { text: fmtMoeda(h.F2_VALST), alignment: 'right' }] },
                  { stack: [{ text: 'VALOR TOTAL DOS PRODUTOS', fontSize: 6 }, { text: fmtMoeda(h.F2_VALBRUT), alignment: 'right', bold: true }] }
                ],
                [
                  { stack: [{ text: 'VALOR DO FRETE', fontSize: 6 }, { text: fmtMoeda(h.F2_VLR_FRT), alignment: 'right' }] },
                  { stack: [{ text: 'VALOR DO SEGURO', fontSize: 6 }, { text: fmtMoeda(h.F2_SEGURO), alignment: 'right' }] },
                  { stack: [{ text: 'DESCONTO', fontSize: 6 }, { text: fmtMoeda(h.F2_DESCONT), alignment: 'right' }] },
                  { stack: [{ text: 'BILHETE', fontSize: 6, bold: true }, { text: (h.Z4_BILHETE || '').trim(), bold: true, fontSize: 10, alignment: 'right' }], fillColor: '#f2f2f2' },
                  { stack: [{ text: 'VALOR TOTAL DA NOTA', fontSize: 6 }, { text: fmtMoeda(h.F2_VALBRUT), alignment: 'right', bold: true, fontSize: 9 }] }
                ]
              ]
            },
            margin: [0, 8, 0, 8]
          },

          // TRANSPORTADOR / VOLUMES TRANSPORTADOS
          {
            table: {
              widths: ['*', 100, 60, 60, 40, 100],
              body: [
                [
                    { text: 'TRANSPORTADOR / VOLUMES TRANSPORTADOS', bold: true, fontSize: 7, colSpan: 6, fillColor: '#f2f2f2' },
                    {}, {}, {}, {}, {}
                ],
                [
                    { stack: [{ text: 'RAZÃO SOCIAL', fontSize: 6 }, { text: 'FORT FRUIT LTDA', bold: true }] },
                    { stack: [{ text: 'FRETE POR CONTA', fontSize: 6 }, { text: '9-SEM FRETE', bold: true }] },
                    { stack: [{ text: 'CÓDIGO ANTT', fontSize: 6 }, { text: '' }] },
                    { stack: [{ text: 'PLACA DO VEÍCULO', fontSize: 6 }, { text: '' }] },
                    { stack: [{ text: 'UF', fontSize: 6 }, { text: 'PA' }] },
                    { stack: [{ text: 'CNPJ/CPF', fontSize: 6 }, { text: '02.338.006/0001-07', bold: true }] }
                ]
              ]
            },
            margin: [0, 5, 0, 5]
          },

          // ITENS - CONTAINER COM BORDAS E PREECHIMENTO
          {
            table: {
              headerRows: 1,
              widths: [40, '*', 45, 20, 25, 30, 45, 35, 35, 20],
              body: [
                [
                  { text: 'CÓD. PROD', fontSize: 6, bold: true, fillColor: '#f2f2f2' },
                  { text: 'DESCRIÇÃO DO PRODUTO', fontSize: 6, bold: true, fillColor: '#f2f2f2' },
                  { text: 'NCM', fontSize: 6, bold: true, fillColor: '#f2f2f2' },
                  { text: 'UN', fontSize: 6, bold: true, fillColor: '#f2f2f2' },
                  { text: 'QTD', fontSize: 6, bold: true, alignment: 'right', fillColor: '#f2f2f2' },
                  { text: 'V. UNIT', fontSize: 6, bold: true, alignment: 'right', fillColor: '#f2f2f2' },
                  { text: 'V. TOTAL', fontSize: 6, bold: true, alignment: 'right', fillColor: '#f2f2f2' },
                  { text: 'BC ICMS', fontSize: 6, bold: true, alignment: 'right', fillColor: '#f2f2f2' },
                  { text: 'V. ICMS', fontSize: 6, bold: true, alignment: 'right', fillColor: '#f2f2f2' },
                  { text: 'ALIQ', fontSize: 6, bold: true, alignment: 'right', fillColor: '#f2f2f2' }
                ],
                ...items.map(i => [
                  { text: String(i.D2_COD || '').trim(), fontSize: 7, border: [true, false, true, false] },
                  { text: String(i.D2_DESC || '').trim(), fontSize: 7, border: [true, false, true, false] },
                  { text: String(i.D2_NCM || '').trim(), fontSize: 7, border: [true, false, true, false] },
                  { text: String(i.D2_UM || '').trim(), fontSize: 7, border: [true, false, true, false] },
                  { text: fmtMoeda(i.D2_QUANT), fontSize: 7, alignment: 'right', border: [true, false, true, false] },
                  { text: fmtMoeda(i.D2_PRCVEN), fontSize: 7, alignment: 'right', border: [true, false, true, false] },
                  { text: fmtMoeda(i.D2_TOTAL), fontSize: 7, alignment: 'right', border: [true, false, true, false] },
                  { text: fmtMoeda(i.D2_BASEICM), fontSize: 7, alignment: 'right', border: [true, false, true, false] },
                  { text: fmtMoeda(i.D2_VALICM), fontSize: 7, alignment: 'right', border: [true, false, true, false] },
                  { text: fmtMoeda(i.D2_PICM), fontSize: 7, alignment: 'right', border: [true, false, true, false] }
                ]),
                // Espaçamento para preencher a página
                ...Array(Math.max(0, 25 - items.length)).fill([
                   { text: ' ', margin: [0, 2, 0, 2], border: [true, false, true, false] },
                   { text: ' ', border: [true, false, true, false] },
                   { text: ' ', border: [true, false, true, false] },
                   { text: ' ', border: [true, false, true, false] },
                   { text: ' ', border: [true, false, true, false] },
                   { text: ' ', border: [true, false, true, false] },
                   { text: ' ', border: [true, false, true, false] },
                   { text: ' ', border: [true, false, true, false] },
                   { text: ' ', border: [true, false, true, false] },
                   { text: ' ', border: [true, false, true, false] }
                ]),
                // Linha final do container
                [
                    { text: '', border: [true, false, true, true], colSpan: 10, margin: [0, 0, 0, 0] },
                    {}, {}, {}, {}, {}, {}, {}, {}, {}
                ]
              ]
            },
            layout: {
                hLineWidth: function (i, node) { return (i === 0 || i === 1 || i === node.table.body.length) ? 0.8 : 0.5; },
                vLineWidth: function (i, node) { return 0.5; },
                hLineColor: function (i, node) { return '#aaaaaa'; },
                vLineColor: function (i, node) { return '#aaaaaa'; }
            }
          },

          // CÁLCULO DO ISSQN
          {
            table: {
              widths: ['*', '*', '*', '*'],
              body: [
                [
                  { text: 'CÁLCULO DO ISSQN', bold: true, fontSize: 7, colSpan: 4, fillColor: '#f2f2f2' },
                  {}, {}, {}
                ],
                [
                  { stack: [{ text: 'INSCRIÇÃO MUNICIPAL', fontSize: 6 }, { text: '164571404', bold: true }] },
                  { stack: [{ text: 'VALOR TOTAL DOS SERVIÇOS', fontSize: 6 }, { text: '0,00', alignment: 'right' }] },
                  { stack: [{ text: 'BASE DE CÁLCULO DO ISSQN', fontSize: 6 }, { text: '0,00', alignment: 'right' }] },
                  { stack: [{ text: 'VALOR DO ISSQN', fontSize: 6 }, { text: '0,00', alignment: 'right' }] }
                ]
              ]
            },
            margin: [0, 5, 0, 0]
          },

          // DADOS ADICIONAIS
          {
            table: {
              widths: ['*', 180],
              body: [
                [
                  { text: 'DADOS ADICIONAIS', bold: true, fontSize: 7, colSpan: 2, fillColor: '#f2f2f2' },
                  {}
                ],
                [
                  { 
                    stack: [
                        { text: 'INFORMAÇÕES COMPLEMENTARES', fontSize: 6 }, 
                        { text: (h.F2_PROTOCO || h.F3_PROTOC || '').trim() ? `Protocolo: ${(h.F2_PROTOCO || h.F3_PROTOC || '').trim()}` : '', fontSize: 7, margin: [0, 5, 0, 0] },
                        { text: `Chave: ${h.F2_CHVNFE || ''}`, fontSize: 7, margin: [0, 2, 0, 0] }
                    ],
                    minHeight: 150
                  },
                  { stack: [{ text: 'RESERVADO AO FISCO', fontSize: 6 }, { text: '' }] }
                ]
              ]
            },
            margin: [0, 5, 0, 0]
          }
        ]
      };

      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const fileName = `DANFE_${h.F2_DOC.trim()}_${h.F2_SERIE.trim()}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=${fileName}`);
      
      pdfDoc.pipe(res);
      pdfDoc.end();

    } catch (err) {
      console.error("Erro ao gerar PDF da DANFE:", err);
      res.status(500).json({ error: "Erro ao gerar o PDF da DANFE." });
    }
  });

  router.get("/nfe/:doc/:serie/boleto", async (req, res) => {
    try {
      const getPool = req.app.locals.mssqlPool ? () => req.app.locals.mssqlPool : pool;
      const mPool = await getPool();
      const { doc, serie } = req.params;
      const filial = req.query.local || "01";

      const path = require("path");
      const PdfPrinter = require("pdfmake");
      const fonts = {
        Roboto: {
          normal: path.join(__dirname, "../fonts/Roboto-Regular.ttf"),
          bold: path.join(__dirname, "../fonts/Roboto-Medium.ttf"),
          italics: path.join(__dirname, "../fonts/Roboto-Italic.ttf"),
          bolditalics: path.join(__dirname, "../fonts/Roboto-MediumItalic.ttf"),
        },
      };
      const printer = new PdfPrinter(fonts);

      const nfeResult = await mPool.request().input("doc", doc).input("serie", serie).input("filial", filial)
        .query(`SELECT TOP 1 F2_DOC, F2_SERIE, F2_EMISSAO, F2_VALBRUT, F2_CLIENTE, F2_LOJA, F2_FILIAL, A1_NOME, A1_CGC, A1_END, A1_BAIRRO, A1_MUN, A1_EST, A1_CEP 
                FROM SF2140YY F2 (NOLOCK) 
                LEFT JOIN SA1140 A1 (NOLOCK) ON A1_COD = F2_CLIENTE AND A1_LOJA = F2_LOJA AND A1.D_E_L_E_T_ = '' 
                WHERE F2.D_E_L_E_T_ = '' AND F2_DOC = @doc AND (F2_FILIAL = @filial OR F2_FILIAL = '01') AND F2_SERIE = @serie`);

      if (nfeResult.recordset.length === 0) return res.status(404).json({ error: "NFE não encontrada." });
      const h = nfeResult.recordset[0];

      const nfeFilial = h.F2_FILIAL;

      const se1Result = await mPool.request()
        .input("doc", doc.trim())
        .input("serie", serie.trim())
        .input("filial", nfeFilial)
        .query(`
          SELECT E1_NUM, E1_PREFIXO, E1_PARCELA, E1_VALOR, E1_VENCTO, E1_PORTADO,
          E1_NUMBCO, E1_AGEDEP, E1_CONTA, E1_EMISSAO, E1_VALLIQ, E1_DESCONT, E1_DECRESC
          FROM SE1140 (NOLOCK)
          WHERE D_E_L_E_T_ = '' AND E1_FILIAL = @filial AND E1_NUM = @doc AND E1_PREFIXO = @serie
          ORDER BY E1_PARCELA
        `);

      if (se1Result.recordset.length === 0) {
          const se1AltResult = await mPool.request().input("doc", doc.trim()).input("filial", nfeFilial)
            .query("SELECT E1_NUM, E1_PREFIXO, E1_PARCELA, E1_VALOR, E1_VENCTO, E1_PORTADO, E1_NUMBCO, E1_AGEDEP, E1_CONTA, E1_EMISSAO, E1_VALLIQ, E1_DESCONT, E1_DECRESC FROM SE1140 (NOLOCK) WHERE D_E_L_E_T_ = '' AND E1_FILIAL = @filial AND E1_NUM = @doc ORDER BY E1_PARCELA");
          
          if (se1AltResult.recordset.length === 0) {
            // Tenta buscar pelo Bilhete
            const bilheteResult = await mPool.request().input("doc", doc.trim()).input("filial", nfeFilial)
              .query("SELECT TOP 1 Z4_BILHETE FROM SZ4140 (NOLOCK) WHERE Z4_NOTA = @doc AND Z4_FILIAL = @filial AND D_E_L_E_T_ = ''");
            
            if (bilheteResult.recordset.length > 0) {
              const bilhete = bilheteResult.recordset[0].Z4_BILHETE.trim();
              const se1BilheteResult = await mPool.request().input("bilhete", bilhete).input("filial", nfeFilial)
                .query("SELECT E1_NUM, E1_PREFIXO, E1_PARCELA, E1_VALOR, E1_VENCTO, E1_PORTADO, E1_NUMBCO, E1_AGEDEP, E1_CONTA, E1_EMISSAO, E1_VALLIQ, E1_DESCONT, E1_DECRESC FROM SE1140 (NOLOCK) WHERE D_E_L_E_T_ = '' AND E1_FILIAL = @filial AND E1_NUM = @bilhete ORDER BY E1_PARCELA");
              if (se1BilheteResult.recordset.length > 0) se1AltResult.recordset = se1BilheteResult.recordset;
            }
          }

          if (se1AltResult.recordset.length > 0) se1Result.recordset = se1AltResult.recordset;
          else return res.status(404).json({ error: "Título não encontrado." });
      }

      const mod10 = (n) => { let t = 0, p = 2; for (let i = n.length - 1; i >= 0; i--) { let c = parseInt(n[i]) * p; if (c > 9) c = Math.floor(c / 10) + (c % 10); t += c; p = p === 2 ? 1 : 2; } let r = t % 10; return (r === 0) ? 0 : 10 - r; };
      const mod11Safra = (n) => {
        let t = 0, p = 2;
        for (let i = n.length - 1; i >= 0; i--) { t += parseInt(n[i]) * p; p = p >= 9 ? 2 : p + 1; }
        let r = t % 11;
        let d = 11 - r;
        if (d === 0 || d === 10 || d === 11) return 1;
        return d;
      };
      const getF = (v) => { if (!v) return "0000"; let d = Math.floor((dayjs(v).toDate() - new Date(1997, 9, 7)) / 86400000); return d.toString().padStart(4, "0"); };

      const pages = [];
      for (const t of se1Result.recordset) {
        let banco = (t.E1_PORTADO || "").trim() || "422"; 
        const totalDesconto = (t.E1_DESCONT || 0) + (t.E1_DECRESC || 0);
        const valorLiquido = t.E1_VALLIQ || (t.E1_VALOR - totalDesconto);
        const valorCents = Math.round(valorLiquido * 100).toString().padStart(10, "0");
        const fator = getF(t.E1_VENCTO);
        
        let agencia = (t.E1_AGEDEP || "").trim();
        if (!agencia || agencia === "") agencia = "0048";
        agencia = agencia.substring(0, 4).padStart(4, "0");

        let contaFull = (t.E1_CONTA || "").trim();
        if (!contaFull || contaFull === "") contaFull = "584073";
        contaFull = contaFull.replace(/[^0-9]/g, "");
        const contaNum = contaFull.substring(0, Math.max(0, contaFull.length - 1)).padStart(8, "0");
        const contaDV = contaFull.substring(Math.max(0, contaFull.length - 1));

        const nossonumero = (t.E1_NUMBCO || t.E1_NUM.trim()).trim().replace(/[^0-9]/g, "").padStart(9, "0");
        
        // Campo Livre Safra (Padrão 25 posições): 7 + Agência(4) + Conta(9) + NossoNumero(9) + 2 (Tipo Cobrança)
        const campoLivre = "7" + agencia + contaNum.padStart(8, "0") + contaDV + nossonumero + "2";
        
        const bcodeBase = banco + "9" + fator + valorCents + campoLivre;
        const dvBcode = mod11Safra(bcodeBase);
        const codBarras = banco + "9" + dvBcode + fator + valorCents + campoLivre;

        const b1 = banco + "9" + campoLivre.substring(0, 5);
        const block1 = `${b1.substring(0, 5)}.${b1.substring(5, 6)}${mod10(b1)}`;
        const b2 = campoLivre.substring(5, 15);
        const block2 = `${b2.substring(0, 5)}.${b2.substring(5, 10)}${mod10(b2)}`;
        const b3 = campoLivre.substring(15, 25);
        const block3 = `${b3.substring(0, 5)}.${b3.substring(5, 10)}${mod10(b3)}`;
        const linhaDigitavel = `${block1} ${block2} ${block3} ${dvBcode} ${fator}${valorCents}`;

        const bPNG = await new Promise((res, rej) => { bwipjs.toBuffer({bcid:'interleaved2of5', text:codBarras, scale:2, height:12, includetext: false}, (e, p) => e ? rej(e) : res(`data:image/png;base64,${p.toString('base64')}`)); });

        // Gerar QR Code PIX
        const pixPayload = generatePixPayload({
          key: '02338006000107',
          name: 'FORT FRUIT LTDA',
          city: 'BELEM',
          amount: valorLiquido,
          reference: `${t.E1_NUM.trim()}${t.E1_PARCELA.trim()}`
        });

        const qrcodePNG = await new Promise((res, rej) => {
          bwipjs.toBuffer({
            bcid: 'qrcode',
            text: pixPayload,
            scale: 2
          }, (e, p) => e ? rej(e) : res(`data:image/png;base64,${p.toString('base64')}`));
        });

        const cellPadding = [2, 1, 2, 1];
        const labelStyle = { fontSize: 6, color: '#444', margin: [0, 0, 0, 2] };
        const valueStyle = { fontSize: 9, bold: true, color: '#000' };

        const hLineW = function(i, node) { return 0.5; };
        const vLineW = function(i, node) { return 0.5; };
        const borderLineColor = '#000000';
        const nomeBancoStr = banco === "422" ? 'BANCO SAFRA S A' : 'BANCO ITAÚ S A';

        pages.push([
          // PART 1: COMPROVANTE DE ENTREGA
          {
            table: {
              widths: ['auto', 'auto', '*'],
              body: [
                [
                  { text: nomeBancoStr, bold: true, fontSize: 11, border: [false, false, true, true] },
                  { text: `${banco}-7`, bold: true, fontSize: 13, border: [false, false, true, true], alignment: 'center', margin: [5,0] },
                  { text: 'Comprovante de Entrega', bold: true, fontSize: 9, alignment: 'right', border: [false, false, false, true] }
                ]
              ]
            },
            layout: { hLineWidth: hLineW, vLineWidth: vLineW, hLineColor: borderLineColor, vLineColor: borderLineColor },
            margin: [0, 0, 0, 0]
          },
          {
            table: {
              widths: ['*', 190],
              body: [
                [
                  // ESQUERDA
                  {
                    table: {
                      widths: [80, '*'],
                      body: [
                        [{ text: 'Recebedor', fontSize: 6 }, { text: '', fontSize: 8 }],
                        [{ text: 'CNPJ', fontSize: 6 }, { text: h.A1_CGC.trim(), fontSize: 8, bold: true }],
                        [{ text: 'Pagador', fontSize: 6 }, { text: h.A1_NOME.trim(), fontSize: 8, bold: true }],
                        [{ text: 'Agência / Código Beneficiário', fontSize: 6 }, { text: `${agencia}/${contaFull}`, fontSize: 8, bold: true }],
                        [{ text: 'Vencimento', fontSize: 6 }, { text: dayjs(t.E1_VENCTO).format("DD/MM/YYYY"), fontSize: 8, bold: true }],
                        [{ text: 'Nosso Número', fontSize: 6 }, { text: nossonumero, fontSize: 8, bold: true }],
                        [{ text: 'Valor do Documento', fontSize: 6 }, { text: t.E1_VALOR.toLocaleString('pt-BR', {minimumFractionDigits:2}), fontSize: 8, bold: true }]
                      ]
                    },
                    layout: 'noBorders',
                    margin: [0, 2, 0, 2]
                  },
                  // DIREITA
                  {
                    stack: [
                      { text: 'Motivos de não entrega (para uso da empresa entregadora)', fontSize: 6, bold: true, margin: [0,0,0,5] },
                      { 
                        columns: [
                          { text: '( ) Mudou-se\n( ) Ausente\n( ) Recusado', fontSize: 6 },
                          { text: '( ) Falecido\n( ) Não Procurado\n( ) Outros', fontSize: 6 }
                        ]
                      },
                      { text: 'Data ____ / ____ / ____     Entregador ________________', fontSize: 6, margin: [0, 10, 0, 0] }
                    ],
                    margin: [2, 2, 0, 2]
                  }
                ]
              ]
            },
            layout: { hLineWidth: hLineW, vLineWidth: vLineW, hLineColor: borderLineColor, vLineColor: borderLineColor },
            margin: [0, 0, 0, 1] // space before cut
          },
          
          // CUT LINE
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 535, y2: 0, lineWidth: 0.5, dash: { length: 5 } }], margin: [0, 1, 0, 1] },
          { text: 'Corte na linha pontilhada', alignment: 'right', fontSize: 5, margin: [0, 0, 0, 2] },

          // PART 2: RECIBO DO PAGADOR
          {
            table: {
              widths: ['auto', 'auto', '*'],
              body: [
                [
                  { text: nomeBancoStr, bold: true, fontSize: 11, border: [false, false, true, true] },
                  { text: `${banco}-7`, bold: true, fontSize: 13, border: [false, false, true, true], alignment: 'center', margin: [5,0] },
                  { text: 'Recibo do Pagador', bold: true, fontSize: 9, alignment: 'right', border: [false, false, false, true] }
                ]
              ]
            },
            layout: { hLineWidth: hLineW, vLineWidth: vLineW, hLineColor: borderLineColor, vLineColor: borderLineColor },
            margin: [0, 0, 0, 0]
          },
          {
            table: {
              widths: ['*', 120],
              body: [
                [
                  { stack: [{ text: 'Local de Pagamento', style: labelStyle }, { text: 'Pagável em qualquer banco do sistema de compensação', style: valueStyle }], border: [true, false, true, true], padding: cellPadding },
                  { stack: [{ text: 'Vencimento', style: labelStyle }, { text: dayjs(t.E1_VENCTO).format("DD/MM/YYYY"), style: valueStyle }], border: [false, false, true, true], padding: cellPadding }
                ],
                [
                  { stack: [{ text: 'Beneficiário', style: labelStyle }, { text: 'FORT FRUIT LTDA - CNPJ: 02.338.006/0001-07', style: valueStyle }], border: [true, false, true, true], padding: cellPadding },
                  { stack: [{ text: 'Agência/Código Beneficiário', style: labelStyle }, { text: `${agencia}/${contaFull}`, style: valueStyle }], border: [false, false, true, true], padding: cellPadding }
                ]
              ]
            },
            layout: { hLineWidth: hLineW, vLineWidth: vLineW, hLineColor: borderLineColor, vLineColor: borderLineColor },
          },
          {
            table: {
              widths: [70, 70, 40, 40, '*'],
              body: [
                [
                  { stack: [{ text: 'Data do Documento', style: labelStyle }, { text: dayjs(t.E1_EMISSAO).format("DD/MM/YYYY"), style: valueStyle }], border: [true, false, true, true], padding: cellPadding },
                  { stack: [{ text: 'Número do Documento', style: labelStyle }, { text: `${t.E1_NUM.trim()}-${t.E1_PARCELA.trim()}`, style: valueStyle }], border: [false, false, true, true], padding: cellPadding },
                  { stack: [{ text: 'Espécie Doc.', style: labelStyle }, { text: 'DM', style: valueStyle }], border: [false, false, true, true], padding: cellPadding },
                  { stack: [{ text: 'Aceite', style: labelStyle }, { text: 'N', style: valueStyle }], border: [false, false, true, true], padding: cellPadding },
                  { stack: [{ text: 'Data Processamento', style: labelStyle }, { text: dayjs().format('DD/MM/YYYY'), style: valueStyle }], border: [false, false, true, true], padding: cellPadding }
                ]
              ]
            },
            layout: { hLineWidth: hLineW, vLineWidth: vLineW, hLineColor: borderLineColor, vLineColor: borderLineColor },
          },
          {
            table: {
              widths: [70, 70, 40, 40, '*'],
              body: [
                [
                  { stack: [{ text: 'Uso do Banco', style: labelStyle }, { text: ' ', style: valueStyle }], border: [true, false, true, true], padding: cellPadding },
                  { stack: [{ text: 'Carteira', style: labelStyle }, { text: 'BOR', style: valueStyle }], border: [false, false, true, true], padding: cellPadding },
                  { stack: [{ text: 'Espécie', style: labelStyle }, { text: 'R$', style: valueStyle }], border: [false, false, true, true], padding: cellPadding },
                  { stack: [{ text: 'Quantidade', style: labelStyle }, { text: ' ', style: valueStyle }], border: [false, false, true, true], padding: cellPadding },
                  { stack: [{ text: 'Valor do Documento', style: labelStyle }, { text: t.E1_VALOR.toLocaleString('pt-BR', {minimumFractionDigits:2}), style: valueStyle, alignment: 'right' }], border: [false, false, true, true], padding: cellPadding }
                ]
              ]
            },
            layout: { hLineWidth: hLineW, vLineWidth: vLineW, hLineColor: borderLineColor, vLineColor: borderLineColor },
          },
          {
            columns: [
              {
                width: '*',
                stack: [
                  { text: 'Instruções de Responsabilidade do Beneficiário', style: labelStyle },
                  { text: 'NÃO RECEBER APÓS 30 DIAS DO VENCIMENTO.', fontSize: 7, bold: true, margin: [0, 4, 0, 0] },
                  { text: 'PAGÁVEL PREFERENCIALMENTE NO BANCO SAFRA.', fontSize: 7, bold: true, margin: [0, 2, 0, 0] }
                ],
                border: [true, false, true, true],
                margin: [5, 2, 5, 5]
              },
              {
                width: 140,
                table: {
                  widths: ['*'],
                  body: [
                    [{ stack: [{ text: '(-) Desconto / Abatimento', style: labelStyle }, { text: totalDesconto > 0 ? totalDesconto.toLocaleString('pt-BR', {minimumFractionDigits:2}) : ' ', fontSize: 8, alignment: 'right' }], border: [false, false, true, true], padding: cellPadding }],
                    [{ stack: [{ text: '(-) Outras Deduções', style: labelStyle }, { text: ' ', fontSize: 8 }], border: [false, false, true, true], padding: cellPadding }],
                    [{ stack: [{ text: '(+) Mora / Multa', style: labelStyle }, { text: ' ', fontSize: 8 }], border: [false, false, true, true], padding: cellPadding }],
                    [{ stack: [{ text: '(+) Outros Acréscimos', style: labelStyle }, { text: ' ', fontSize: 8 }], border: [false, false, true, true], padding: cellPadding }],
                    [{ stack: [{ text: '(=) Valor Cobrado', style: labelStyle }, { text: valorLiquido.toLocaleString('pt-BR', {minimumFractionDigits:2}), fontSize: 8, bold: true, alignment: 'right' }], border: [false, false, true, true], padding: cellPadding }]
                  ]
                },
                layout: { hLineWidth: hLineW, vLineWidth: vLineW, hLineColor: borderLineColor, vLineColor: borderLineColor },
              }
            ]
          },
          {
            table: {
              widths: ['*'],
              body: [
                [
                  {
                    stack: [
                      { text: 'Pagador', style: labelStyle },
                      { text: h.A1_NOME.trim(), fontSize: 8, bold: true },
                      { text: `${h.A1_END.trim()}, ${h.A1_BAIRRO.trim()} - ${h.A1_MUN.trim()} / ${h.A1_EST.trim()} - CEP: ${h.A1_CEP.trim()}`, fontSize: 8 },
                      { text: `CPF/CNPJ: ${h.A1_CGC.trim()}`, fontSize: 8, bold: true, margin: [0, 2, 0, 0] }
                    ],
                    border: [true, false, true, true],
                    padding: cellPadding
                  }
                ]
              ]
            },
            layout: { hLineWidth: hLineW, vLineWidth: vLineW, hLineColor: borderLineColor, vLineColor: borderLineColor },
            margin: [0, 0, 0, 1] // space before cut
          },

          // CUT LINE 2
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 535, y2: 0, lineWidth: 0.5, dash: { length: 5 } }], margin: [0, 1, 0, 1] },
          { text: 'Corte na linha pontilhada', alignment: 'right', fontSize: 5, margin: [0, 0, 0, 2] },

          // PART 3: FICHA DE COMPENSAÇÃO
          {
            table: {
              widths: ['auto', 'auto', '*'],
              body: [
                [
                  { text: nomeBancoStr, bold: true, fontSize: 13, border: [false, false, true, true] },
                  { text: `${banco}-7`, bold: true, fontSize: 14, border: [false, false, true, true], alignment: 'center', margin: [5,0] },
                  { text: linhaDigitavel, bold: true, fontSize: 12, alignment: 'right', border: [false, false, false, true], margin: [0,2,0,0] }
                ]
              ]
            },
            layout: { hLineWidth: hLineW, vLineWidth: vLineW, hLineColor: borderLineColor, vLineColor: borderLineColor },
            margin: [0, 0, 0, 0]
          },
          {
            table: {
              widths: ['*', 140],
              body: [
                [
                  { stack: [{ text: 'Local de Pagamento', style: labelStyle }, { text: 'Pagável em qualquer banco do sistema de compensação', style: valueStyle }], border: [true, false, true, true], padding: cellPadding },
                  { stack: [{ text: 'Vencimento', style: labelStyle }, { text: dayjs(t.E1_VENCTO).format("DD/MM/YYYY"), style: valueStyle, alignment: 'right' }], border: [false, false, true, true], padding: cellPadding, fillColor: '#eeeeee' }
                ],
                [
                  { stack: [{ text: 'Beneficiário', style: labelStyle }, { text: 'FORT FRUIT LTDA - CNPJ: 02.338.006/0001-07', style: valueStyle }], border: [true, false, true, true], padding: cellPadding },
                  { stack: [{ text: 'Agência/Código Beneficiário', style: labelStyle }, { text: `${agencia}/${contaFull}`, style: valueStyle, alignment: 'right' }], border: [false, false, true, true], padding: cellPadding }
                ]
              ]
            },
            layout: { hLineWidth: hLineW, vLineWidth: vLineW, hLineColor: borderLineColor, vLineColor: borderLineColor },
          },
          {
            table: {
              widths: [70, 70, 40, 40, 70, '*'],
              body: [
                [
                  { stack: [{ text: 'Data do Documento', style: labelStyle }, { text: dayjs(t.E1_EMISSAO).format("DD/MM/YYYY"), style: valueStyle }], border: [true, false, true, true], padding: cellPadding },
                  { stack: [{ text: 'Número do Documento', style: labelStyle }, { text: `${t.E1_NUM.trim()}-${t.E1_PARCELA.trim()}`, style: valueStyle }], border: [false, false, true, true], padding: cellPadding },
                  { stack: [{ text: 'Espécie Doc.', style: labelStyle }, { text: 'DM', style: valueStyle }], border: [false, false, true, true], padding: cellPadding },
                  { stack: [{ text: 'Aceite', style: labelStyle }, { text: 'N', style: valueStyle }], border: [false, false, true, true], padding: cellPadding },
                  { stack: [{ text: 'Data Processamento', style: labelStyle }, { text: dayjs().format('DD/MM/YYYY'), style: valueStyle }], border: [false, false, true, true], padding: cellPadding },
                  { stack: [{ text: 'Nosso Número', style: labelStyle }, { text: nossonumero, style: valueStyle, alignment: 'right' }], border: [false, false, true, true], padding: cellPadding }
                ]
              ]
            },
            layout: { hLineWidth: hLineW, vLineWidth: vLineW, hLineColor: borderLineColor, vLineColor: borderLineColor },
          },
          {
            table: {
              widths: [50, 50, 40, 60, '*', 140],
              body: [
                [
                  { stack: [{ text: 'Uso do Banco', style: labelStyle }, { text: ' ', style: valueStyle }], border: [true, false, true, true], padding: cellPadding },
                  { stack: [{ text: 'Carteira', style: labelStyle }, { text: 'BOR', style: valueStyle }], border: [false, false, true, true], padding: cellPadding },
                  { stack: [{ text: 'Espécie', style: labelStyle }, { text: 'R$', style: valueStyle }], border: [false, false, true, true], padding: cellPadding },
                  { stack: [{ text: 'Quantidade', style: labelStyle }, { text: ' ', style: valueStyle }], border: [false, false, true, true], padding: cellPadding },
                  { stack: [{ text: 'Valor', style: labelStyle }, { text: ' ', style: valueStyle }], border: [false, false, true, true], padding: cellPadding },
                  { stack: [{ text: '(=) Valor do Documento', style: labelStyle }, { text: t.E1_VALOR.toLocaleString('pt-BR', {minimumFractionDigits:2}), style: valueStyle, alignment: 'right' }], border: [false, false, true, true], padding: cellPadding, fillColor: '#eeeeee' }
                ]
              ]
            },
            layout: { hLineWidth: hLineW, vLineWidth: vLineW, hLineColor: borderLineColor, vLineColor: borderLineColor },
          },
          {
            columns: [
              {
                width: '*',
                stack: [
                  { text: 'Instruções de Responsabilidade do Beneficiário', style: labelStyle },
                  { text: 'NÃO RECEBER APÓS 30 DIAS DO VENCIMENTO.', fontSize: 7, bold: true, margin: [0, 2, 0, 0] },
                  { text: 'PAGÁVEL PREFERENCIALMENTE NO BANCO SAFRA.', fontSize: 7, bold: true, margin: [0, 1, 0, 0] }
                ],
                border: [true, false, true, true],
                margin: [5, 1, 5, 1]
              },
              {
                width: 140,
                table: {
                  widths: ['*'],
                  body: [
                    [{ stack: [{ text: '(-) Desconto / Abatimento', style: labelStyle }, { text: totalDesconto > 0 ? totalDesconto.toLocaleString('pt-BR', {minimumFractionDigits:2}) : ' ', fontSize: 8, alignment: 'right' }], border: [false, false, true, true], padding: cellPadding }],
                    [{ stack: [{ text: '(-) Outras Deduções', style: labelStyle }, { text: ' ', fontSize: 8 }], border: [false, false, true, true], padding: cellPadding }],
                    [{ stack: [{ text: '(+) Mora / Multa', style: labelStyle }, { text: ' ', fontSize: 8 }], border: [false, false, true, true], padding: cellPadding }],
                    [{ stack: [{ text: '(+) Outros Acréscimos', style: labelStyle }, { text: ' ', fontSize: 8 }], border: [false, false, true, true], padding: cellPadding }],
                    [{ stack: [{ text: '(=) Valor Cobrado', style: labelStyle }, { text: valorLiquido.toLocaleString('pt-BR', {minimumFractionDigits:2}), fontSize: 8, bold: true, alignment: 'right' }], border: [false, false, true, true], padding: cellPadding, fillColor: '#eeeeee' }]
                  ]
                },
                layout: { hLineWidth: hLineW, vLineWidth: vLineW, hLineColor: borderLineColor, vLineColor: borderLineColor },
              }
            ]
          },
          {
            table: {
              widths: ['*'],
              body: [
                [
                  {
                    stack: [
                      { text: 'Pagador / Beneficiário Final', style: labelStyle },
                      { text: h.A1_NOME.trim(), fontSize: 8, bold: true },
                      { text: `${h.A1_END.trim()}, ${h.A1_BAIRRO.trim()} - ${h.A1_MUN.trim()} / ${h.A1_EST.trim()} - CEP: ${h.A1_CEP.trim()}`, fontSize: 8 },
                      { text: `CPF/CNPJ: ${h.A1_CGC.trim()}`, fontSize: 8, bold: true, margin: [0, 1, 0, 0] }
                    ],
                    border: [true, false, true, true],
                    padding: cellPadding
                  }
                ]
              ]
            },
            layout: { hLineWidth: hLineW, vLineWidth: vLineW, hLineColor: borderLineColor, vLineColor: borderLineColor },
            margin: [0, 0, 0, 1]
          },
          {
            columns: [
                {
                    width: 320,
                    stack: [
                        { image: bPNG, width: 320, alignment: 'left', margin: [0, 2, 0, 0] },
                        { text: 'Autenticação Mecânica - Ficha de Compensação', style: labelStyle, alignment: 'left', margin: [2, 1, 0, 0] }
                    ]
                },
                {
                    width: '*',
                    stack: [
                        { text: 'PAGUE COM PIX', fontSize: 6, bold: true, alignment: 'center', margin: [0, 1, 0, 1] },
                        { image: qrcodePNG, width: 52, alignment: 'center' }
                    ]
                }
            ],
            margin: [0, 1, 0, 0]
          }
        ]);
      }

      const pdfDoc = printer.createPdfKitDocument({ 
        pageSize: 'A4', 
        pageMargins: [30, 10, 30, 10], 
        defaultStyle: { font: 'Roboto' }, 
        content: pages.flat(),
        background: function(currentPage) {
          return [
            {
              text: 'NÃO VÁLIDO',
              color: '#eeeeee',
              opacity: 0.5,
              fontSize: 80,
              bold: true,
              margin: [0, 300, 0, 0],
              alignment: 'center',
              angle: 45
            }
          ];
        }
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=Boleto_${doc}.pdf`);
      pdfDoc.pipe(res); pdfDoc.end();
    } catch (e) { console.error("Erro Boleto:", e); res.status(500).json({ error: "Erro ao gerar o Boleto." }); }
  });

  return router;
};
