const dayjs = require("dayjs");

const toISO = (yyyymmdd) => {
  const s = String(yyyymmdd || "").replace(/\D/g, "");
  if (s.length !== 8) return "";
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
};

let isRunning = false;

async function runAutoResolve(dbOcorrencias, getMSSQLPool) {
  if (isRunning) return;
  isRunning = true;

  try {
    // 1. Busca todas as ocorrências PENDENTES que têm nota_fiscal e fornecedor_cod
    const [rows] = await dbOcorrencias.promise().query(`
      SELECT id, nota_fiscal, serie, nota_origem, valor, filial, fornecedor_cod
      FROM ocorrencias
      WHERE D_E_L_E_T_ = ''
        AND status NOT IN ('RESOLVIDO', 'CONCLUIDO', 'CONCLUIDA')
        AND nota_origem IS NOT NULL AND nota_origem <> ''
        AND nota_fiscal IS NOT NULL AND nota_fiscal <> ''
        AND fornecedor_cod IS NOT NULL AND fornecedor_cod <> ''
    `);

    if (!rows.length) return;

    // 2. Busca devoluções no Protheus em lote (SD1140)
    const uniqueDocs = [...new Set(rows.map(r => String(r.nota_fiscal).replace(/\D/g, "").padStart(9, "0")))];
    const docsSQL = uniqueDocs.map(d => `'${d}'`).join(",");

    const pool = await getMSSQLPool();
    if (!pool) return;

    const devResult = await pool.request().query(`
      SELECT D1_DOC, D1_SERIE, D1_FORNECE, D1_FILIAL,
             MAX(D1_DTDIGIT) AS D1_DTDIGIT_MAX,
             SUM(D1_TOTAL)   AS D1_TOTAL_SUM
        FROM SD1140 WITH (NOLOCK)
       WHERE D_E_L_E_T_ = ''
         AND D1_TIPO    = 'D'
         AND D1_DOC IN (${docsSQL})
       GROUP BY D1_DOC, D1_SERIE, D1_FORNECE, D1_FILIAL
    `);

    // Monta mapa: filial_fornece_doc_serie → dados
    const devMap = {};
    for (const r of devResult.recordset) {
      const doc   = String(r.D1_DOC).trim();
      const serie = String(r.D1_SERIE).trim().replace(/^0+/, "");
      const forn  = String(r.D1_FORNECE).trim();
      const fil   = String(r.D1_FILIAL).trim();
      devMap[`${fil}_${forn}_${doc}_${serie}`] = {
        total:   Number(r.D1_TOTAL_SUM || 0),
        doc,
        serie,
        emissao: r.D1_DTDIGIT_MAX ? toISO(r.D1_DTDIGIT_MAX) : null,
      };
    }

    // 3. Verifica cada ocorrência e resolve as sem divergência
    let resolvidosCount = 0;
    for (const row of rows) {
      const filial   = String(row.filial || "01").trim();
      const docPad   = String(row.nota_fiscal).replace(/\D/g, "").padStart(9, "0");
      const cleanSerie = String(row.serie || "").trim().replace(/^0+/, "");
      const key = `${filial}_${row.fornecedor_cod}_${docPad}_${cleanSerie}`;

      const dev = devMap[key];
      if (!dev) continue;

      // Checa divergências
      const valOcr  = parseFloat(row.valor || 0);
      const valProt = parseFloat(dev.total || 0);
      if (Math.abs(valOcr - valProt) >= 0.01) continue;

      const cleanOcrSerie  = String(row.serie || "").trim().replace(/^0+/, "");
      const cleanProtSerie = String(dev.serie || "").trim().replace(/^0+/, "");
      if (cleanOcrSerie && cleanOcrSerie !== "-" && cleanOcrSerie !== cleanProtSerie) continue;

      const cleanOcrNota  = String(row.nota_fiscal || "").trim().replace(/^0+/, "");
      const cleanProtDoc  = String(dev.doc || "").trim().replace(/^0+/, "");
      if (cleanOcrNota && cleanOcrNota !== "-" && cleanOcrNota !== cleanProtDoc) continue;

      // Sem divergência → resolve
      await dbOcorrencias.promise().query(
        "UPDATE ocorrencias SET status = 'RESOLVIDO', dataTratativa = NOW(), updated_at = NOW() WHERE id = ?",
        [row.id]
      );
      await dbOcorrencias.promise().query(
        "INSERT INTO ocorrencia_logs (ocorrencia_id, acao, usuario, detalhes) VALUES (?, 'EDICAO', 'SISTEMA', ?)",
        [row.id, "Status alterado automaticamente para RESOLVIDO por job de conciliação com Protheus"]
      );
      resolvidosCount++;
    }

    if (resolvidosCount > 0) {
      console.log(`[AutoResolve] ✅ ${resolvidosCount} ocorrência(s) resolvida(s) automaticamente - ${dayjs().format("DD/MM/YYYY HH:mm:ss")}`);
    }
  } catch (err) {
    console.error("[AutoResolve] ❌ Erro no job:", err.message);
  } finally {
    isRunning = false;
  }
}

function startAutoResolveJob(dbOcorrencias, getMSSQLPool, intervalMs = 5 * 60 * 1000) {
  // Roda uma vez ao iniciar (aguarda 30s para as conexões estabilizarem)
  setTimeout(() => runAutoResolve(dbOcorrencias, getMSSQLPool), 30000);
  // Depois roda no intervalo configurado
  setInterval(() => runAutoResolve(dbOcorrencias, getMSSQLPool), intervalMs);
  console.log(`[AutoResolve] Job iniciado — intervalo: ${intervalMs / 60000} min`);
}

module.exports = { startAutoResolveJob };
