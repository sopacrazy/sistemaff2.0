const PDFDocument = require("pdfkit");
const path = require("path");

const LOGO_PATH = path.join(__dirname, "../public/logo_fortfruit.png");

const LOC_DESC_MAP = {
  "01": "Loja",
  "02": "Depósito",
  "03": "BTF",
  "04": "Banana",
  "05": "Dep. Ovo",
  "06": "Torres",
  "07": "CD",
  "09": "Passarela 1",
};

// ===== Config de layout das linhas =====
const ROW_MIN_H = 18; // altura mínima da linha
const LINE_GAP = 2; // espaço entre linhas dentro das células

// Formatadores
const nf2 = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const formatDate = (d) => {
  // MySQL retorna DATE como objeto Date em UTC meia-noite.
  // Usar toLocaleDateString com timezone America/Sao_Paulo (UTC-3)
  // converte 30/03 00:00 UTC para 29/03 21:00 BRT = dia errado.
  // Solução: extrair dia/mês/ano diretamente via UTC.
  if (d instanceof Date && !isNaN(d)) {
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  const s = String(d).trim();
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }
  return s || '-';
};

async function gerarRelatorioFaltas(
  dbOcorrencias,
  { data, local, tipo = "padrao", poolMSSQL = null },
  res
) {
  const isCompras = String(tipo).toLowerCase() === "compras";

  // Normaliza a data para garantir formato correto (YYYY-MM-DD)
  const dataNormalizada = String(data).trim();

  // Se for tipo "Compras", verifica se precisa buscar preços que estão NULL
  // Isso garante que fechamentos antigos também tenham preços preenchidos
  if (isCompras && poolMSSQL) {
    try {
      const sql = require("mssql");
      // Busca produtos com falta mas sem preço
      const [produtosSemPreco] = await dbOcorrencias.promise().query(
        `SELECT DISTINCT cod_produto 
           FROM faltas_fechamento
           WHERE DATE(data) = DATE(?) AND local = ?
             AND (falta IS NOT NULL AND falta <> 0)
             AND (preco_compra IS NULL OR preco_compra = 0)`,
        [dataNormalizada, local]
      );

      if (produtosSemPreco.length > 0) {
        const codigos = produtosSemPreco.map((p) => p.cod_produto);

        // Busca preços usando a função do server.js (precisa importar ou recriar aqui)
        const toProtheusDate = (v) => {
          if (!v) return null;
          const s = String(v).trim();
          if (/^\d{8}$/.test(s)) return s;
          const d = new Date(s);
          if (isNaN(d)) return null;
          const yy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          return `${yy}${mm}${dd}`;
        };

        const dataProth = toProtheusDate(dataNormalizada);
        const codsSan = Array.from(
          new Set(
            codigos.map((c) => String(c).replace(/\D/g, "")).filter(Boolean)
          )
        );

        if (dataProth && codsSan.length > 0) {
          console.log(`[RelFaltas] Buscando preços para ${codsSan.length} produtos no Protheus (Data: ${dataProth})...`);
          
          // Chunking para evitar limite de parâmetros do MSSQL (2100)
          const CHUNK_SIZE = 1000;
          const mapaPrecos = new Map();

          for (let i = 0; i < codsSan.length; i += CHUNK_SIZE) {
            const chunk = codsSan.slice(i, i + CHUNK_SIZE);
            const values = chunk.map((_, idx) => `(@c${idx})`).join(",");
            const request = new sql.Request(poolMSSQL);
            
            request.input("data", sql.VarChar(8), dataProth);
            chunk.forEach((c, idx) => request.input(`c${idx}`, sql.VarChar(30), c));

            // Removido o filtro Z5_FILIAL = '01' para maior abrangência, conforme lógica do relatoriosPublicFaltas.js
            const query = `
                WITH cods(cod) AS (SELECT * FROM (VALUES ${values}) v(cod)),
                base AS (
                  SELECT
                    cod   = REPLACE(LTRIM(RTRIM(SZ5.Z5_CODPRO)), '.', ''),
                    data  = SZ5.Z5_DATA,
                    preco = CAST(SZ5.Z5_COMPRA AS DECIMAL(18,4)),
                    rn    = ROW_NUMBER() OVER (
                              PARTITION BY REPLACE(LTRIM(RTRIM(SZ5.Z5_CODPRO)), '.', '')
                              ORDER BY SZ5.Z5_DATA DESC, SZ5.R_E_C_N_O_ DESC
                            )
                  FROM SZ5140 AS SZ5 WITH (NOLOCK)
                  WHERE SZ5.D_E_L_E_T_ = ''
                    AND SZ5.Z5_DATA <= @data
                    AND SZ5.Z5_FILIAL = '01'
                    AND SZ5.Z5_COMPRA IS NOT NULL
                    AND SZ5.Z5_COMPRA <> ''
                    AND SZ5.Z5_COMPRA <> '0'
                )
                SELECT b.cod, b.preco
                FROM base b
                INNER JOIN cods c ON c.cod = b.cod
                WHERE b.rn = 1
              `;

            try {
              const { recordset } = await request.query(query);
              for (const r of recordset) {
                const preco = Number(r.preco);
                if (preco > 0) {
                  mapaPrecos.set(String(r.cod), preco);
                }
              }
            } catch (chunkErr) {
              console.error("[RelFaltas] Erro ao buscar chunk de preços no Protheus:", chunkErr);
            }
          }

          // Atualiza os preços na tabela (Optimized)
          if (mapaPrecos.size > 0) {
            console.log(`[RelFaltas] Atualizando preços de ${mapaPrecos.size} produtos na base local...`);
            
            const entries = Array.from(mapaPrecos.entries());
            // Reduzido drasticamente para 2 para evitar 'max_user_connections' (erro 1203) e ECONNRESET
            const UPDATE_CONCURRENCY = 2; 

            for (let i = 0; i < entries.length; i += UPDATE_CONCURRENCY) {
              const batch = entries.slice(i, i + UPDATE_CONCURRENCY);
              await Promise.all(
                batch.map(([cod, preco]) => 
                  dbOcorrencias.promise().query(
                    `UPDATE faltas_fechamento 
                     SET preco_compra = ? 
                     WHERE DATE(data) = DATE(?) AND local = ? AND cod_produto = ?`,
                    [preco, dataNormalizada, local, cod]
                  ).catch(err => console.error(`[RelFaltas] Erro update produto ${cod}:`, err.message))
                )
              );
            }
            console.log("[RelFaltas] Atualização de preços concluída.");
          } else {
             console.log("[RelFaltas] Nenhum preço encontrado no Protheus para os produtos listados.");
          }
        }
      }
    } catch (error) {
      // Continua gerando o relatório mesmo se falhar a busca de preços
    }
  } else if (isCompras && !poolMSSQL) {
  }

  // Busca itens (agora incluindo preco_compra)
  // Usa DATE() para garantir comparação correta mesmo se a coluna for DATETIME
  const [rows] = await dbOcorrencias.promise().query(
    `SELECT 
         cod_produto AS codigo,
         produto,
         unidade,
         saldo_calc AS saldo,
         fisico,
         falta,
         observacao,
         usuario,
         criado_em,
         preco_compra
       FROM faltas_fechamento
       WHERE DATE(data) = DATE(?) AND local = ?
         AND (falta IS NOT NULL AND falta <> 0)
       ORDER BY produto`,
    [dataNormalizada, local]
  );

  // Verifica se há dados na tabela para essa data/local (mesmo sem falta)
  const [totalRows] = await dbOcorrencias
    .promise()
    .query(
      `SELECT COUNT(*) as total FROM faltas_fechamento WHERE DATE(data) = DATE(?) AND local = ?`,
      [dataNormalizada, local]
    );

  // Resumo
  const [resumo] = await dbOcorrencias.promise().query(
    `SELECT 
         local,
         data,
         COALESCE(MAX(usuario), '-') AS usuario,
         MAX(criado_em) AS fechado_em
       FROM faltas_fechamento
       WHERE DATE(data) = DATE(?) AND local = ?
       GROUP BY local, data
       LIMIT 1`,
    [dataNormalizada, local]
  );

  const info = resumo[0] || {
    local,
    data,
    usuario: "-",
    fechado_em: null,
  };

  const localDesc = LOC_DESC_MAP[String(info.local)] || String(info.local);
  const fechadoHora = info.fechado_em
    ? new Date(info.fechado_em).toLocaleTimeString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      })
    : "-";

  const totalItens = rows.length;
  const somaFaltas = rows.reduce((acc, r) => acc + (Number(r.falta) || 0), 0);
  const somaTotalReais = isCompras
    ? rows.reduce((acc, r) => {
        const p = Number(r.preco_compra ?? 0);
        const f = Number(r.falta ?? 0);
        return acc + p * f;
      }, 0)
    : 0;

  // PDF setup
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="folha_faltas_${local}_${data}${
      isCompras ? "_compras" : ""
    }.pdf"`
  );

  const doc = new PDFDocument({
    margin: 36,
    size: "A4",
    info: { Title: "Fechamento" },
  });
  doc.pipe(res);

  let y = 36;

  // Logo + título
  try {
    doc.image(LOGO_PATH, 36, y, { fit: [120, 42] });
  } catch {}
  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .text("Fechamento", 0, y + 10, { align: "center" });
  y += 60;

  // Barra de informações
  y = drawInfoBar(doc, y, [
    { label: "Local", value: `${localDesc} (${info.local})` },
    { label: "Data", value: formatDate(info.data) },
    { label: "Usuário", value: info.usuario },
    { label: "Fechado às", value: fechadoHora },
  ]);
  y += 15;

  // Tabela
  const tableX = 36;
  const tableW = doc.page.width - 72;

  const cols = isCompras
    ? [
        { key: "codigo", title: "Código", w: 60, align: "left" },
        { key: "produto", title: "Produto", w: 220, align: "left" },
        { key: "unidade", title: "Unid.", w: 40, align: "center" },
        { key: "falta", title: "Falta", w: 60, align: "right" },
        { key: "compra", title: "Compra", w: 70, align: "right" },
        { key: "total", title: "Total", w: 70, align: "right" },
      ]
    : [
        { key: "codigo", title: "Código", w: 50, align: "left" },
        { key: "produto", title: "Produto", w: 180, align: "left" },
        { key: "unidade", title: "Unid.", w: 40, align: "center" },
        { key: "saldo", title: "Saldo", w: 50, align: "right" },
        { key: "fisico", title: "Físico", w: 50, align: "right" },
        { key: "falta", title: "Falta", w: 50, align: "right" },
        {
          key: "observacao",
          title: "Observação",
          w: tableW - (50 + 180 + 40 + 50 + 50 + 50),
          align: "left",
        },
      ];

  drawHeaderRow(doc, tableX, y, tableW, cols);
  y += 24;

  // Se não houver dados, mostra mensagem informativa
  if (rows.length === 0) {
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#666666")
      .text(
        "Nenhum item em falta encontrado para esta data e local.",
        tableX,
        y,
        {
          width: tableW,
          align: "center",
        }
      );
    y += 20;

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#999999")
      .text(
        "Nota: Para gerar este relatório, é necessário fazer o fechamento de estoque na página principal (Home/Estoque) para a data selecionada.",
        tableX,
        y,
        {
          width: tableW,
          align: "center",
        }
      );
    y += 30;
  }

  // ===== Loop de linhas (com altura dinâmica) =====
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];

    // 1) calcular a altura necessária da linha
    let rowH = ROW_MIN_H;

    const colProduto = cols.find((c) => c.key === "produto");
    if (colProduto) {
      const hProd = heightOf(doc, r.produto, colProduto.w - 8);
      rowH = Math.max(rowH, hProd + 4); // folga
    }

    if (!isCompras) {
      const colObs = cols.find((c) => c.key === "observacao");
      if (colObs) {
        const hObs = heightOf(doc, r.observacao || "", colObs.w - 8);
        rowH = Math.max(rowH, hObs + 4); // folga
      }
    }

    // 2) quebra de página respeitando a altura real
    if (y + rowH > doc.page.height - 60) {
      drawFooterPage(doc);
      doc.addPage();
      y = 36;

      y = drawInfoBar(doc, y, [
        { label: "Local", value: `${localDesc} (${info.local})` },
        { label: "Data", value: formatDate(info.data) },
        { label: "Usuário", value: info.usuario },
        { label: "Fechado às", value: fechadoHora },
      ]);
      y += 15;

      drawHeaderRow(doc, tableX, y, tableW, cols);
      y += 24;
    }

    // 3) faixa zebrada com altura real
    if (i % 2 === 0) {
      doc
        .save()
        .rect(tableX, y - 2, tableW, rowH)
        .fill("#f6f6f6")
        .restore();
    }

    // 4) desenhar células
    let x = tableX;

    if (isCompras) {
      const preco = r.preco_compra != null ? Number(r.preco_compra) : null;
      const falta = Number(r.falta || 0);
      const totalLinha = preco != null ? preco * falta : null;

      drawCell(doc, r.codigo, x, y, cols[0].w, "left");
      x += cols[0].w;
      drawCell(doc, r.produto, x, y, cols[1].w, "left");
      x += cols[1].w;
      drawCell(doc, r.unidade, x, y, cols[2].w, "center");
      x += cols[2].w;
      drawCell(doc, nf2.format(falta), x, y, cols[3].w, "right");
      x += cols[3].w;

      drawCell(
        doc,
        preco != null ? nf2.format(preco) : "-",
        x,
        y,
        cols[4].w,
        "right"
      );
      x += cols[4].w;

      doc.font("Helvetica-Bold");
      drawCell(
        doc,
        totalLinha != null ? nf2.format(totalLinha) : "-",
        x,
        y,
        cols[5].w,
        "right"
      );
      doc.font("Helvetica");
    } else {
      drawCell(doc, r.codigo, x, y, cols[0].w, "left");
      x += cols[0].w;
      drawCell(doc, r.produto, x, y, cols[1].w, "left");
      x += cols[1].w;
      drawCell(doc, r.unidade, x, y, cols[2].w, "center");
      x += cols[2].w;
      drawCell(doc, nf2.format(r.saldo), x, y, cols[3].w, "right");
      x += cols[3].w;
      drawCell(doc, nf2.format(r.fisico), x, y, cols[4].w, "right");
      x += cols[4].w;

      doc.font("Helvetica-Bold");
      drawCell(doc, nf2.format(r.falta), x, y, cols[5].w, "right");
      doc.font("Helvetica");
      x += cols[5].w;

      drawCell(doc, r.observacao || "", x, y, cols[6].w, "left");
    }

    // 5) avança Y pela altura real
    y += rowH;
  }

  // Totais
  y += 6;
  doc
    .save()
    .rect(tableX, y - 2, tableW, 20)
    .fill("#f6f6f6")
    .restore();
  doc
    .font("Helvetica-Bold")
    .text("Total de itens com falta", tableX + 4, y + 4);
  doc.text(String(totalItens), tableX, y + 4, {
    width: tableW,
    align: "right",
  });

  y += 22;
  doc
    .save()
    .rect(tableX, y - 2, tableW, 20)
    .fill("#f6f6f6")
    .restore();
  doc.font("Helvetica-Bold").text("Soma das faltas", tableX + 4, y + 4);
  doc.text(nf2.format(somaFaltas), tableX, y + 4, {
    width: tableW,
    align: "right",
  });

  if (isCompras) {
    y += 22;
    doc
      .save()
      .rect(tableX, y - 2, tableW, 20)
      .fill("#f6f6f6")
      .restore();
    doc.font("Helvetica-Bold").text("Soma total (R$)", tableX + 4, y + 4);
    doc.text(nf2.format(somaTotalReais), tableX, y + 4, {
      width: tableW,
      align: "right",
    });
  }

  drawFooterPage(doc);
  doc.end();
}

// ===== Helpers =====
function drawInfoBar(doc, y, items) {
  doc
    .save()
    .rect(36, y, doc.page.width - 72, 26)
    .fill("#f7f9fb")
    .restore();
  const colW = (doc.page.width - 72) / items.length;
  let x = 36;
  doc.fontSize(10);
  items.forEach(({ label, value }) => {
    doc
      .font("Helvetica")
      .fillColor("#666")
      .text(`${label}:`, x + 6, y + 6, {
        width: colW - 12,
        continued: true,
      });
    doc.font("Helvetica-Bold").fillColor("#000").text(` ${value}`);
    x += colW;
  });
  doc.fillColor("#000");
  return y + 26;
}

function drawHeaderRow(doc, x, y, tableW, cols) {
  doc
    .save()
    .rect(x, y - 14, tableW, 22)
    .fill("#e9edf0")
    .restore();
  let cursorX = x;
  doc.fontSize(10).font("Helvetica-Bold");
  cols.forEach((c) => {
    doc.text(c.title, cursorX + 4, y - 10, { width: c.w - 8, align: c.align });
    cursorX += c.w;
  });
  doc.font("Helvetica");
}

// mede altura de um texto para uma largura
function heightOf(doc, text, width) {
  return doc.heightOfString(String(text ?? ""), {
    width,
    lineGap: LINE_GAP,
  });
}

function drawCell(doc, text, x, y, w, align) {
  doc.fontSize(10).text(String(text ?? ""), x + 4, y, {
    width: w - 8,
    align,
    lineGap: LINE_GAP,
  });
}

function drawFooterPage(doc) {
  const footerY = doc.page.height - 30;
  doc
    .fontSize(8)
    .fillColor("#666")
    .text(
      `Impresso em ${new Date().toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      })}`,
      36,
      footerY,
      { width: doc.page.width - 72, align: "right" }
    );
  doc.fillColor("black");
}

module.exports = { gerarRelatorioFaltas };
