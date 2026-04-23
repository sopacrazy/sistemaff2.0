// routes/relatoriosPublicRoutes.js
const express = require("express");
const PDFDocument = require("pdfkit");
const path = require("path");

// ======== MAPA DE LOCAIS (ajuste se quiser) ========
const NOME_LOCAL = {
  "09": "PASSARELA 1",
  "06": "TORRES",
  "03": "BTF",
  "04": "BANANA",
  "07": "CD",
  "01": "LOJA",
  "05": "DEP. OVO",
  "02": "DEPOSITO",
};

// ======== UTIL NÚMERO ========
function fmtNum(v, maxFrac = 3) {
  const n = Number(v);
  if (Number.isFinite(n))
    return n.toLocaleString("pt-BR", { maximumFractionDigits: maxFrac });
  return v ?? "";
}

// ======== UTIL DATA (DD/MM/AAAA) ========
function fmtDateBr(input) {
  if (!input) return "-";

  // Date nativo
  if (input instanceof Date && !isNaN(input)) {
    const dd = String(input.getDate()).padStart(2, "0");
    const mm = String(input.getMonth() + 1).padStart(2, "0");
    const yyyy = String(input.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
  }

  const s = String(input);

  // ISO / "YYYY-MM-DD ..."
  const mIso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (mIso) {
    const [, yyyy, mm, dd] = mIso;
    return `${dd}/${mm}/${yyyy}`;
  }

  // Tenta parsear outras strings (ex.: "Thu Sep 04 2025 ...")
  const d = new Date(s);
  if (!isNaN(d)) {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = String(d.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
  }

  return "-";
}

// ======== “TEMA” E ASSETS (opcionais) ========
const MARGIN = 36;
const COLORS = {
  primary: "#E5E7EB",
  text: "#111111",
  muted: "#666666",
  line: "#e6e6e6",
  zebra: "#f8f8f8",
  chipIn: "#e6f4ea",
  chipOut: "#fde7e9",
};

const FONT_REG = path.join(__dirname, "..", "fonts", "Roboto-Regular.ttf");
const FONT_BOLD = path.join(__dirname, "..", "fonts", "Roboto-Medium.ttf");
const LOGO_PATH = path.join(__dirname, "..", "assets", "fortfruit-logo.png");

// ======== HELPERS (PDFKit) ========
function registerFonts(doc) {
  try {
    doc.registerFont("REG", FONT_REG);
    doc.registerFont("BOLD", FONT_BOLD);
    doc.font("REG");
  } catch {}
}

function addHeader(doc, titulo, infoLeft, infoRight) {
  const pageWidth = doc.page.width - MARGIN * 2;

  doc.save().rect(0, 0, doc.page.width, 60).fill(COLORS.primary).restore();

  try {
    doc.image(LOGO_PATH, MARGIN, 12, { height: 36 });
  } catch {}

  doc
    .fillColor("#333333")
    .font("BOLD")
    .fontSize(16)
    .text(titulo, MARGIN + 180, 18, { width: pageWidth - 180, align: "right" });

  doc
    .moveTo(MARGIN, 70)
    .lineTo(doc.page.width - MARGIN, 70)
    .strokeColor(COLORS.line)
    .lineWidth(1)
    .stroke();

  doc
    .fillColor(COLORS.text)
    .font("BOLD")
    .fontSize(10)
    .text(infoLeft, MARGIN, 76, { continued: true })
    .font("REG")
    .text("")
    .text(infoRight, MARGIN, 76, { width: pageWidth, align: "right" });

  return 92;
}

function addFooter(doc) {
  const ts = new Date().toLocaleString("pt-BR");
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const footerY = doc.page.height - MARGIN + 6;
    const pageWidth = doc.page.width - MARGIN * 2;
    doc
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(`Gerado em ${ts}`, MARGIN, footerY, { width: pageWidth })
      .text(`Página ${i + 1} / ${range.count}`, MARGIN, footerY, {
        width: pageWidth,
        align: "right",
      });
  }
}

function ensureSpace(doc, y, need = 40) {
  if (y + need > doc.page.height - MARGIN) {
    doc.addPage();
    return true;
  }
  return false;
}

function chip(doc, x, y, label, value, bg) {
  const text = `${label}: ${fmtNum(value)}`;
  const w = doc.widthOfString(text) + 16;
  const h = 18;
  doc
    .save()
    .rect(x, y, w, h)
    .fill(bg)
    .restore()
    .fillColor(COLORS.text)
    .font("BOLD")
    .fontSize(9)
    .text(text, x + 8, y + 4);
  return w + 6;
}

function drawZebraTable(doc, y, columns, rows, options = {}) {
  const pageWidth = doc.page.width - MARGIN * 2;
  const startX = MARGIN;
  const headerH = options.headerH || 40; // 🔥 aumenta altura para caber 2 linhas
  const rowH = options.rowH || 18;

  // fundo do cabeçalho
  doc.save().rect(startX, y, pageWidth, headerH).fill(COLORS.zebra).restore();

  // render cabeçalho
  // Cabeçalho
  let x = startX;
  doc.font("BOLD").fillColor(COLORS.text).fontSize(8.5);
  columns.forEach((c) => {
    const label = c.label;

    // 🔥 mede altura real do texto dentro da largura da coluna
    const textH = doc.heightOfString(label, {
      width: c.w - 4,
      align: c.align || "left",
    });

    // 🔥 centraliza verticalmente dentro do headerH
    const offsetY = y + (headerH - textH) / 2;

    doc.text(label, x + 2, offsetY, {
      width: c.w - 4,
      align: c.align || "left",
    });

    x += c.w;
  });
  y += headerH;

  // render linhas
  doc.font("REG").fontSize(9).fillColor(COLORS.text);
  rows.forEach((r, idx) => {
    const bg = idx % 2 === 0 ? "#ffffff" : COLORS.zebra;
    doc.save().rect(startX, y, pageWidth, rowH).fill(bg).restore();

    let x = startX;
    columns.forEach((c) => {
      const v = r[c.key] ?? "";
      doc.text(String(v), x + 2, y + 4, {
        width: c.w - 4,
        align: c.align || "left",
      });
      x += c.w;
    });

    y += rowH;
  });

  return y + 8;
}

function produtoCard(doc, y, { titulo, metaLeft, metaRight }) {
  const x = MARGIN;
  const w = doc.page.width - MARGIN * 2;
  const pad = 8;

  doc.font("BOLD").fontSize(11);
  const nomeH = doc.heightOfString(titulo, { width: w - 170 });

  const cardH = Math.max(44, 16 + nomeH + 14);
  doc.save().roundedRect(x, y, w, cardH, 8).fill("#F3F4F6").restore();

  doc
    .fillColor(COLORS.text)
    .font("BOLD")
    .fontSize(11)
    .text(titulo, x + pad, y + 10, { width: w - 170 });

  doc
    .font("REG")
    .fontSize(10)
    .fillColor(COLORS.muted)
    .text(metaRight, x + w - 160, y + 10, {
      width: 150,
      align: "right",
    });

  doc
    .font("REG")
    .fontSize(10)
    .fillColor(COLORS.muted)
    .text(metaLeft, x + pad, y + 10 + nomeH + 6);

  return y + cardH + 8;
}

module.exports = (dbOcorrencias) => {
  const router = express.Router();

  // ======================================================================================
  // /relatorios-public/avarias/pdf  (NOVO)
  // ======================================================================================
  router.get("/avarias/pdf", async (req, res) => {
    try {
      const data = String(req.query.data || "").slice(0, 10);
      const local = String(req.query.local || "").padStart(2, "0");
      if (!data || !local) {
        return res
          .status(400)
          .json({ error: "Parâmetros obrigatórios: data, local" });
      }

      const [cab] = await dbOcorrencias.promise().query(
        `
        SELECT
          ae.id,
          ae.numero,
          ae.local,
          ae.usuario,
          ae.responsavel,
          ae.status,
          ae.motivo,
          ae.data_inclusao,
          ae.data_concluida
        FROM avarias_estoque ae
        WHERE ae.local = ?
          AND DATE(ae.data_inclusao) = ?
        ORDER BY ae.data_inclusao, ae.numero
        `,
        [local, data]
      );

      const [itens] = await dbOcorrencias.promise().query(
        `
        SELECT
          ae.id                       AS estoque_id,
          ae.numero                   AS numero_doc,
          ae.local,
          ai.cod_produto,
          ai.descricao,
          ai.quantidade,
          ai.unidade,
          ai.fator_conversao,
          ai.segunda_unidade,
          ai.validacao,
          ai.validacao_convertida
        FROM avarias_estoque ae
        LEFT JOIN avarias_itens ai
          ON ai.numero_avaria = ae.id
          OR ai.numero_avaria = CAST(REPLACE(ae.numero, 'A-', '') AS UNSIGNED)
        WHERE ae.local = ?
          AND DATE(ae.data_inclusao) = ?
        ORDER BY ae.data_inclusao, ae.numero
        `,
        [local, data]
      );

      const grupos = new Map();
      for (const h of cab) grupos.set(h.id, { header: h, itens: [] });
      for (const it of itens) {
        if (grupos.has(it.estoque_id)) grupos.get(it.estoque_id).itens.push(it);
      }

      const nomeLocal = NOME_LOCAL[local] || local;
      const dataBr = fmtDateBr(data);

      const doc = new PDFDocument({
        size: "A4",
        margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
        bufferPages: true,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="avarias_${local}_${data}.pdf"`
      );
      doc.pipe(res);

      registerFonts(doc);

      let y = addHeader(
        doc,
        "Relatório de Avarias",
        `Data: ${dataBr}`,
        `Local: ${nomeLocal}`
      );

      if (!cab.length) {
        doc
          .font("BOLD")
          .fontSize(11)
          .text("Nenhuma avaria encontrada para o período.", MARGIN, y);
        addFooter(doc);
        doc.end();
        return;
      }

      for (const g of grupos.values()) {
        const h = g.header;

        if (ensureSpace(doc, y, 120)) {
          y = addHeader(
            doc,
            "Relatório de Avarias",
            `Data: ${dataBr}`,
            `Local: ${nomeLocal}`
          );
        }

        const metaLeft = [
          `Usuário: ${h.usuario || "-"}`,
          `Responsável: ${h.responsavel || "-"}`,
          `Status: ${h.status || "-"}`,
          h.motivo ? `Motivo: ${h.motivo}` : null,
        ]
          .filter(Boolean)
          .join("  •  ");

        const metaRight = [
          h.numero ? `Nº: ${h.numero}` : "",
          h.data_concluida ? `Concluído: ${fmtDateBr(h.data_concluida)}` : "",
        ]
          .filter(Boolean)
          .join("  •  ");

        y = produtoCard(doc, y, {
          titulo: "Avaria",
          metaLeft,
          metaRight,
        });

        if (!g.itens.length) {
          doc
            .font("REG")
            .fillColor(COLORS.muted)
            .fontSize(9)
            .text("Sem itens vinculados.", MARGIN, y);
          y += 14;
          continue;
        }

        // Tabela de itens (ajuste de largura para caber na página)
        const cols = [
          { key: "cod", label: "Código", w: 70, align: "left" },
          { key: "desc", label: "Descrição", w: 230, align: "left" }, // ganho de largura
          { key: "qtd", label: "Qtd", w: 50, align: "right" },
          { key: "un", label: "Unid", w: 38, align: "center" },
          { key: "un2", label: "2ª Unid", w: 60, align: "center" }, // um pouco maior
          { key: "val", label: "Valid.", w: 35, align: "right" },
          { key: "valc", label: "Conv.", w: 35, align: "right" },
        ];

        // linhas (sem 'fat')
        const rows = g.itens.map((r) => ({
          cod: r.cod_produto || "",
          desc: r.descricao || "",
          qtd: fmtNum(r.quantidade),
          un: r.unidade || "",
          un2: r.segunda_unidade || "",
          val: r.validacao != null ? fmtNum(r.validacao) : "",
          valc:
            r.validacao_convertida != null
              ? fmtNum(r.validacao_convertida)
              : "",
        }));

        const pageHeight = doc.page.height - MARGIN;
        const headerHeight = 120;
        const rowH = 18;
        const headerH = 20;
        const maxRows = Math.max(
          1,
          Math.floor((pageHeight - headerHeight - 40 - headerH) / rowH)
        );

        let i = 0;
        while (i < rows.length) {
          const fatia = rows.slice(i, i + maxRows);
          y = drawZebraTable(doc, y, cols, fatia, { rowH, headerH });

          i += maxRows;
          if (i < rows.length) {
            doc.addPage();
            y = addHeader(
              doc,
              "Relatório de Avarias",
              `Data: ${dataBr}`,
              `Local: ${nomeLocal}`
            );
          }
        }
        y += 6;
      }

      addFooter(doc);
      doc.end();
    } catch (err) {
      console.error("Erro /relatorios-public/avarias/pdf:", err);
      res.status(500).json({ error: "Falha ao gerar relatório de avarias." });
    }
  });

  // ======================================================================================
  // /relatorios-public/faltas-mov/pdf  (Toda a movimentação dos produtos em falta)
  // ======================================================================================
  router.get("/faltas-mov/pdf", async (req, res) => {
    try {
      const data = String(req.query.data || "").slice(0, 10);
      const local = String(req.query.local || "").padStart(2, "0");
      if (!data || !local) {
        return res
          .status(400)
          .json({ error: "Parâmetros obrigatórios: data, local" });
      }

      const [faltas] = await dbOcorrencias.promise().query(
        `
        SELECT DISTINCT
          f.data,
          f.local,
          f.cod_produto,
          TRIM(f.cod_produto) AS cod_produto_trim,
          f.produto,
          f.unidade,
          f.saldo_calc
        FROM faltas_fechamento f
        WHERE f.local = ? AND f.data = ?
        ORDER BY f.cod_produto
        `,
        [local, data]
      );

      const [movs] = await dbOcorrencias.promise().query(
        `
        SELECT
          f.cod_produto                         AS cod_produto_falta,
          f.produto                             AS nome_produto,
          f.unidade,
          f.saldo_calc,
          t.numero,
          t.origem,
          t.destino,
          t.quantidade,
          t.status,
          t.usuario,
          t.carregador,
          t.data_inclusao
        FROM (
          SELECT DISTINCT
            f.data, f.local,
            TRIM(f.cod_produto) AS cod_produto,
            f.produto, f.unidade, f.saldo_calc
          FROM faltas_fechamento f
          WHERE f.local = ? AND f.data = ?
        ) f
        JOIN transferencias_estoque t
          ON REPLACE(TRIM(t.cod_produto), '.', '') = f.cod_produto
         AND DATE(t.data_inclusao) = f.data
         AND (t.origem = f.local OR t.destino = f.local)
        ORDER BY f.cod_produto, t.data_inclusao, t.origem, t.destino
        `,
        [local, data]
      );

      const porProduto = new Map();
      for (const r of movs) {
        const key = r.cod_produto_falta;
        if (!porProduto.has(key)) {
          porProduto.set(key, {
            info: {
              cod_produto: r.cod_produto_falta,
              produto: r.nome_produto,
              unidade: r.unidade,
              saldo_calc: r.saldo_calc,
            },
            linhas: [],
          });
        }
        let movimento = "OUTRA_BASE";
        if (r.origem === local) movimento = "SAÍDA";
        else if (r.destino === local) movimento = "ENTRADA";
        porProduto.get(key).linhas.push({ ...r, movimento });
      }

      const nomeLocal = NOME_LOCAL[local] || local;
      const dataBr = fmtDateBr(data);

      const doc = new PDFDocument({
        size: "A4",
        margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
        bufferPages: true,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="faltas-mov-${local}-${data}.pdf"`
      );
      doc.pipe(res);

      registerFonts(doc);
      let y = addHeader(
        doc,
        "Faltas por Produto — Movimentação",
        `Data: ${dataBr}`,
        `Local: ${nomeLocal}`
      );

      if (!faltas.length) {
        doc
          .font("BOLD")
          .fontSize(11)
          .text("Nenhum produto em falta.", MARGIN, y);
        addFooter(doc);
        doc.end();
        return;
      }

      for (const f of faltas) {
        const key = String(f.cod_produto).trim();
        const grupo = porProduto.get(key);

        if (ensureSpace(doc, y, 120)) {
          y = addHeader(
            doc,
            "Faltas por Produto — Movimentação",
            `Data: ${dataBr}`,
            `Local: ${nomeLocal}`
          );
        }

        // CARD do produto (destaque visual) — nova assinatura
        y = produtoCard(doc, y, {
          titulo: f.produto,
          metaLeft: `Unid: ${f.unidade || ""}  •  Falta: ${fmtNum(
            f.saldo_calc
          )}`,
          metaRight: `Código: ${key}`,
        });

        // chips de resumo
        let entradas = 0,
          saidas = 0;
        if (grupo && grupo.linhas.length) {
          for (const r of grupo.linhas) {
            const q = Number(r.quantidade) || 0;
            if (r.movimento === "ENTRADA") entradas += q;
            if (r.movimento === "SAÍDA") saidas += q;
          }
        }
        let x = MARGIN;
        x += chip(doc, x, y, "Entradas", entradas, COLORS.chipIn);
        chip(doc, x, y, "Saídas", saidas, COLORS.chipOut);
        y += 24;

        if (!grupo || !grupo.linhas.length) {
          doc
            .font("REG")
            .fillColor(COLORS.muted)
            .fontSize(9)
            .text("Sem transferências no dia.", MARGIN, y);
          y += 12;
          continue;
        }

        const cols = [
          { key: "hora", label: "Hora", w: 45, align: "left" },
          { key: "od", label: "Origem → Destino", w: 160, align: "left" },
          { key: "mov", label: "Mov.", w: 45, align: "center" },
          { key: "qtd", label: "Qtd", w: 55, align: "right" },
          { key: "status", label: "Status", w: 72, align: "left" },
          { key: "usuario", label: "Usuário", w: 85, align: "left" },
          { key: "carregador", label: "Carregador", w: 92, align: "left" },
          { key: "numero", label: "Nº", w: 45, align: "right" },
        ];

        const linhas = grupo.linhas.map((r) => {
          const hora = new Date(r.data_inclusao).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          });
          return {
            hora,
            od: `${r.origem} -> ${r.destino}`,
            mov: r.movimento,
            qtd: fmtNum(r.quantidade),
            status: r.status || "",
            usuario: r.usuario || "",
            carregador: r.carregador || "",
            numero: r.numero || "",
          };
        });

        const pageHeight = doc.page.height - MARGIN;
        const headerHeight = 120;
        const rowH = 18;
        const headerH = 20;
        const maxRows = Math.max(
          1,
          Math.floor((pageHeight - headerHeight - 40 - headerH) / rowH)
        );

        let i = 0;
        while (i < linhas.length) {
          const fatia = linhas.slice(i, i + maxRows);
          y = drawZebraTable(doc, y, cols, fatia, { rowH, headerH });

          i += maxRows;
          if (i < linhas.length) {
            doc.addPage();
            y = addHeader(
              doc,
              "Faltas por Produto — Movimentação",
              `Data: ${dataBr}`,
              `Local: ${nomeLocal}`
            );
          }
        }
        y += 4;
      }

      addFooter(doc);
      doc.end();
    } catch (err) {
      console.error("Erro /relatorios-public/faltas-mov/pdf:", err);
      res.status(500).json({ error: "Falha ao gerar relatório." });
    }
  });

  router.get("/ping", (req, res) =>
    res.json({ ok: true, where: "/relatorios-public" })
  );

  return router;
};
