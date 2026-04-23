const express = require("express");
const axios = require("axios");

module.exports = (getPool, authenticateToken) => {
  const router = express.Router();

  router.post("/analisar-divergencia", authenticateToken, async (req, res) => {
    const { data, resumo } = req.body;
    const pool = getPool();
    
    if (!pool) return res.status(503).json({ error: "Banco de dados Protheus não disponível." });
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: "Chave da OpenAI não configurada." });

    try {
      const diff = parseFloat((resumo.saldoFinal - resumo.conferido.total).toFixed(2));
      const absDiff = Math.abs(diff);

      const diffMetade = parseFloat((absDiff / 2).toFixed(2));
      const diffDobrada = parseFloat((absDiff * 2).toFixed(2));

      let reportText = `### 🔍 Análise Determinística de Diferença\n\n`;
      reportText += `**Valor da Divergência:** R$ ${absDiff.toFixed(2)} (${diff > 0 ? "Faltante no caixa - Saldo sistema maior que o físico" : "Sobrando no caixa - Físico maior que o sistema"})\n\n`;

      let foundMatches = false;

      // 1. Busca na Tabela de Cartões (SZN)
      const sznQuery = `
        SELECT ZN_FILIAL, ZN_DATA, ZN_VALOR, ZN_ADM, ZN_NOMADM 
        FROM SZN140 (NOLOCK)
        WHERE D_E_L_E_T_ = '' AND ZN_DATA = @data
          AND (ZN_VALOR = @absDiff OR ZN_VALOR = @diffMetade OR ZN_VALOR = @diffDobrada)
      `;
      const sznRes = await pool.request()
        .input('data', data.replace(/-/g, ""))
        .input('absDiff', absDiff)
        .input('diffMetade', diffMetade)
        .input('diffDobrada', diffDobrada)
        .query(sznQuery);

      if (sznRes.recordset.length > 0) {
        foundMatches = true;
        reportText += `#### 💳 Tabela de Cartões (SZN)\n`;
        sznRes.recordset.forEach(row => {
          let motivo = row.ZN_VALOR === absDiff ? "Bate exatamente com a diferença." : (row.ZN_VALOR === diffMetade ? "Pode ter sido lançado invertido (Entrada/Saída)." : "A diferença é o dobro deste valor.");
          reportText += `- **Cartão**: ${row.ZN_NOMADM} | **Valor**: R$ ${row.ZN_VALOR.toLocaleString('pt-BR')} | *${motivo}*\n`;
        });
        reportText += `\n`;
      }

      // 2. Busca na SE5 (Movimentação Financeira)
      const se5Query = `
        SELECT E5_PREFIXO, E5_NUMERO, E5_VALOR, E5_TIPODOC, E5_HISTOR, E5_BENEF 
        FROM SE5140 (NOLOCK)
        WHERE D_E_L_E_T_ = '' AND E5_FILIAL = '01' AND E5_DATA = @data
          AND (E5_VALOR = @absDiff OR E5_VALOR = @diffMetade OR E5_VALOR = @diffDobrada)
      `;
      const se5Res = await pool.request()
        .input('data', data.replace(/-/g, ""))
        .input('absDiff', absDiff)
        .input('diffMetade', diffMetade)
        .input('diffDobrada', diffDobrada)
        .query(se5Query);

      if (se5Res.recordset.length > 0) {
        foundMatches = true;
        reportText += `#### 🏦 Movimentações Financeiras (SE5)\n`;
        se5Res.recordset.forEach(row => {
          reportText += `- **Doc**: ${row.E5_NUMERO} | **Tipo**: ${row.E5_TIPODOC} | **Histórico**: ${row.E5_HISTOR ? row.E5_HISTOR.trim() : ""} | **Valor**: R$ ${row.E5_VALOR.toLocaleString('pt-BR')}\n`;
        });
        reportText += `\n`;
      }

      // 3. Busca nos Bilhetes (SZ4)
      try {
        const sz4Query = `
          SELECT Z4_BILHETE, Z4_TOTBIL, Z4_NOMCLI, Z4_COND
          FROM SZ4140 (NOLOCK)
          WHERE D_E_L_E_T_ = '' AND Z4_DATA = @data
            AND (Z4_TOTBIL = @absDiff OR Z4_TOTBIL = @diffMetade OR Z4_TOTBIL = @diffDobrada)
        `;
        const sz4Res = await pool.request()
          .input('data', data.replace(/-/g, ""))
          .input('absDiff', absDiff)
          .input('diffMetade', diffMetade)
          .input('diffDobrada', diffDobrada)
          .query(sz4Query);

        if (sz4Res.recordset.length > 0) {
          foundMatches = true;
          reportText += `#### 🎫 Bilhetes Abertos ou à Vista (SZ4)\n`;
          sz4Res.recordset.forEach(row => {
            reportText += `- **Bilhete**: ${row.Z4_BILHETE} | **Cliente**: ${row.Z4_NOMCLI ? row.Z4_NOMCLI.trim() : ""} | **Valor**: R$ ${row.Z4_TOTBIL.toLocaleString('pt-BR')} (Cond: ${row.Z4_COND})\n`;
          });
          reportText += `\n`;
        }
      } catch (e) {
        console.warn("Erro ao buscar SZ4:", e.message);
      }

      // 4. Busca nos Cheques (SEF)
      try {
        const sefQuery = `
          SELECT EF_BANCO, EF_AGENCIA, EF_CONTA, EF_NUM, EF_VALOR, EF_DATA
          FROM SEF140 (NOLOCK)
          WHERE D_E_L_E_T_ = '' AND EF_FILIAL = '01' AND EF_DATA = @data
            AND (EF_VALOR = @absDiff OR EF_VALOR = @diffMetade OR EF_VALOR = @diffDobrada)
        `;
        const sefRes = await pool.request()
          .input('data', data.replace(/-/g, ""))
          .input('absDiff', absDiff)
          .input('diffMetade', diffMetade)
          .input('diffDobrada', diffDobrada)
          .query(sefQuery);

        if (sefRes.recordset.length > 0) {
          foundMatches = true;
          reportText += `#### 📝 Tabela de Cheques Pré/Vista (SEF)\n`;
          sefRes.recordset.forEach(row => {
            reportText += `- **Cheque Nº**: ${row.EF_NUM ? row.EF_NUM.trim() : ""} | **Banco**: ${row.EF_BANCO ? row.EF_BANCO.trim() : ""} | **Valor**: R$ ${row.EF_VALOR.toLocaleString('pt-BR')}\n`;
            reportText += `  *(Aviso: Pode ser um cheque físico não lançado no caxinha Protheus)*\n`;
          });
          reportText += `\n`;
        }
      } catch (e) {
        console.warn("Erro ao buscar SEF:", e.message);
      }

      // 5. Regra de Transposição (Divisível por 9)
      if (absDiff > 0 && (absDiff * 100) % 900 === 0) { // Verifica divibilidade considerando centavos
        reportText += `#### ⚠️ Alerta de Erro de Digitação\n`;
        reportText += `A diferença de R$ ${absDiff.toFixed(2)} é divisível por 9. Isso é um forte indício matemático de que **houve inversão de dígitos** na hora de digitar os valores conferidos na gaveta (Ex: Digitar 149 ao invés de 194).\n\n`;
        foundMatches = true;
      }

      if (!foundMatches) {
        reportText += `🤷 Nenhuma movimentação individual exata de R$ ${absDiff.toFixed(2)} foi localizada no momento.\n\n*Aviso*: A diferença pode ser a soma de 2 ou mais recibos combinados que não foram lançados.\n`;
      }

      res.json({ success: true, analise: reportText });

    } catch (error) {
      console.error("Erro na Auditoria Determinística:", error.message);
      res.status(500).json({ error: "Erro ao realizar auditoria no banco de dados." });
    }
  });

  return router;
};
