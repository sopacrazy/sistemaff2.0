// npm i xlsx
import * as XLSX from "xlsx";

/**
 * Exporta a tabela do Fechamento Geral para Excel (XLSX)
 * - Respeita o filtro "Somente com Movimentação"
 * - Monta cabeçalho com 2 linhas (CÓD / PRODUTO + grupos por local)
 * - Faz merge nos títulos dos locais (Físico/Sistema/DIF)
 */
export function exportFechamentoExcel({
  dados,
  locais,
  somenteComMov,
  nomeArquivo = "Fechamento.xlsx",
}) {
  // ---------- helpers ----------
  // Número com 2 casas quando houver valor; quando vazio/0 vira 0 numérico.
  const fmt = (n) => {
    const v = Number(n);
    return Number.isFinite(v) ? +v.toFixed(2) : 0;
  };

  // ---------- Cabeçalhos ----------
  const headerTop = ["CÓD", "PRODUTO"];
  const headerSub = ["", ""]; // placeholders para alinhar a 2ª linha

  locais.forEach((l) => {
    headerTop.push(l.nome, "", "");
    headerSub.push("Físico", "Sistema", "DIF");
  });

  headerTop.push("Físico", "Sistema", "DIF", "Status");
  headerSub.push("", "", "", ""); // totais + status (sem subtítulo)

  // ---------- Linhas ----------
  const rows = [];

  const temMov = (item) =>
    locais.some(
      (l) =>
        (Number(item[l.colFisico]) || 0) !== 0 ||
        (Number(item[l.colSistema]) || 0) !== 0
    );

  const fonte = dados
    .filter((it) => (somenteComMov ? temMov(it) : true))
    .sort((a, b) =>
      (a?.nome_produto || "").localeCompare(b?.nome_produto || "", "pt-BR", {
        sensitivity: "base",
      })
    );

  fonte.forEach((item) => {
    // Código numérico (remove pontos e exporta como número)
    const codNum = Number(String(item.cod_produto).replace(/\D/g, "")) || 0;

    const row = [codNum, item.nome_produto];

    locais.forEach((l) => {
      const fisico = Number(item[l.colFisico]) || 0;
      const sist = Number(item[l.colSistema]) || 0;
      const dif = fisico - sist;

      row.push(fmt(fisico));
      row.push(fmt(sist));
      // Se diferença for 0 e existir físico & sistema > 0, mostra "OK"; senão 0
      row.push(dif !== 0 ? fmt(dif) : fisico && sist ? "OK" : 0);
    });

    const totalFis = locais.reduce(
      (acc, l) => acc + (Number(item[l.colFisico]) || 0),
      0
    );
    const totalSis = locais.reduce(
      (acc, l) => acc + (Number(item[l.colSistema]) || 0),
      0
    );
    const totalDif = totalFis - totalSis;
    const status =
      totalDif === 0 ? "CORRETO" : totalDif > 0 ? "SOBRA" : "FALTA";

    row.push(
      fmt(totalFis),
      fmt(totalSis),
      totalDif !== 0 ? fmt(totalDif) : 0,
      status
    );

    rows.push(row);
  });

  // ---------- Montagem da planilha ----------
  const wsData = [headerTop, headerSub, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Mescla os títulos dos locais (3 colunas cada)
  // CÓD(0) PRODUTO(1) => primeiro local começa na coluna 2
  const merges = [];
  let col = 2;
  locais.forEach(() => {
    merges.push({ s: { r: 0, c: col }, e: { r: 0, c: col + 2 } });
    col += 3;
  });
  ws["!merges"] = merges;

  // Larguras de coluna
  const cols = [
    { wch: 10 }, // CÓD
    { wch: 36 }, // PRODUTO
  ];
  locais.forEach(() => cols.push({ wch: 10 }, { wch: 10 }, { wch: 8 }));
  cols.push({ wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 10 });
  ws["!cols"] = cols;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Fechamento");

  // Download
  XLSX.writeFile(wb, nomeArquivo);
}
