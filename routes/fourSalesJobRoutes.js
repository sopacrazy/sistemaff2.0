const express = require("express");
const router = express.Router();

function formatProtheusDate(raw) {
  const s = String(raw || "").trim();
  if (s.length !== 8) return null;
  return `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)}`;
}

const TABLES = [
  { name: "SA1140XX", field: "A1_MSEXP",  label: "Clientes"       },
  { name: "SA3140",   field: "A3_MSEXP",  label: "Vendedores"     },
  { name: "SB1140",   field: "B1_MSEXP",  label: "Produtos"       },
  { name: "DA0140",   field: "DA0_MSEXP", label: "Tab. Preços (cabeçalho)" },
  { name: "DA1140",   field: "DA1_MSEXP", label: "Tab. Preços (itens)"     },
];

module.exports = (getMSSQLPool) => {
  router.get("/4sales-job-status", async (req, res) => {
    try {
      const pool = await getMSSQLPool();
      if (!pool) return res.json({ ok: false, lastSync: null, tables: [] });

      // Busca MAX de cada tabela individualmente
      const selects = TABLES.map(
        t => `SELECT '${t.name}' AS tbl, MAX(${t.field}) AS msexp FROM ${t.name} WITH(NOLOCK) WHERE ${t.field} <> '' AND D_E_L_E_T_ = ''`
      ).join("\nUNION ALL\n");

      const result = await pool.request().query(selects);

      const tables = TABLES.map(t => {
        const row = result.recordset.find(r => r.tbl === t.name);
        const rawDate = row?.msexp || null;
        return {
          table: t.name,
          label: t.label,
          lastSync: rawDate ? formatProtheusDate(rawDate) : null,
          raw: rawDate,
        };
      });

      // Data mais recente geral
      const allRaws = tables.map(t => t.raw).filter(Boolean);
      const maxRaw = allRaws.length ? allRaws.sort().at(-1) : null;

      res.json({
        ok: !!maxRaw,
        lastSync: maxRaw ? formatProtheusDate(maxRaw) : null,
        tables,
      });
    } catch (err) {
      console.error("[4SalesJob] Erro:", err.message);
      res.json({ ok: false, lastSync: null, tables: [] });
    }
  });

  return router;
};
