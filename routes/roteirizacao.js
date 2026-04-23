const express = require("express");
const sql = require("mssql");
const fs = require("fs");
const path = require("path");
const os = require("os");
const PdfPrinter = require("pdfmake");
const child_process = require("child_process");
const { PDFDocument } = require("pdf-lib"); // Novo import para Merge
const { createClient } = require("@supabase/supabase-js");
const router = express.Router();

// Supabase Init
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

} else {
  console.warn("⚠️  Supabase Credentials not found in .env. File sync checks will fail or fallback to local.");
}
const BUCKET_NAME = "relato"; // Nome do bucket

/* =========================
   CONEXÃO MSSQL (reuso)
   ========================= */
let protheusPool = null;
async function getProtheusPool() {
  if (protheusPool && protheusPool.connected) return protheusPool;

  protheusPool = await new sql.ConnectionPool({
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_SERVER,
    database: process.env.MSSQL_DATABASE,
    options: { encrypt: false, trustServerCertificate: true },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  }).connect();

  return protheusPool;
}

/* =========================
   Helpers
   ========================= */
const isYYYYMMDD = (s) => typeof s === "string" && /^\d{8}$/.test(s || "");

function brMoney(n) {
  return (Number(n) || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function yyyymmddToBr(yyyymmdd) {
  if (!yyyymmdd || String(yyyymmdd).length !== 8) return yyyymmdd || "";
  return `${yyyymmdd.slice(6, 8)}/${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(
    0,
    4
  )}`;
}
const cut = (s, n) => {
  const str = String(s || "");
  return str.length > n ? str.slice(0, n - 1) + "…" : str;
};
const meioPgtoLabel = (v) => {
  const s = String(v || "")
    .trim()
    .toUpperCase();
  if (!s) return "—";
  if (s.includes("PIX")) return "PIX";
  if (s === "R$" || s.includes("DIN")) return "Dinheiro";
  if (s.includes("BOL")) return "Boleto";
  if (
    s.includes("CART") ||
    s.includes("CAR") ||
    s.includes("CRED") ||
    s.includes("DEB")
  )
    return "Cartão";
  return s;
};

function brKg(n) {
  return (Number(n) || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

/**
 * Busca o peso (kg) por bilhete = soma(Z5_UNSVEN) agrupado por Z5_BILHETE.
 */
async function getPesosByBilhete(pool, filial, bilhetes) {
  if (!bilhetes?.length) return {};

  const params = bilhetes.map((_, i) => `@b${i}`).join(",");
  const req = pool.request().input("filial", sql.VarChar, filial);
  bilhetes.forEach((b, i) => req.input(`b${i}`, sql.VarChar, b));

  const query = `
    SELECT
      Z5.Z5_BILHETE AS BILHETE,
      SUM(CAST(ISNULL(Z5.Z5_UNSVEN, 0) AS DECIMAL(18,3))) AS PESO_KG
    FROM SZ5140 Z5 WITH (NOLOCK)
    WHERE ISNULL(Z5.D_E_L_E_T_, '') = ''
      AND Z5.Z5_FILIAL = @filial
      AND Z5.Z5_BILHETE IN (${params})
    GROUP BY Z5.Z5_BILHETE
  `;

  const rs = await req.query(query);
  const out = {};
  (rs.recordset || []).forEach((r) => {
    out[String(r.BILHETE).trim()] = Number(r.PESO_KG || 0);
  });
  return out;
}

/* =========================
   ÍCONES (PNG/SVG -> base64)
   ========================= */
const ICON_BASE_DIR = path.join(__dirname, "..", "src", "img", "icons");

function fileToDataUrl(absPath) {
  try {
    if (fs.existsSync(absPath)) {
      const b64 = fs.readFileSync(absPath).toString("base64");
      const ext = path.extname(absPath).toLowerCase();
      const mime = ext === ".svg" ? "image/svg+xml" : "image/png";
      return `data:${mime};base64,${b64}`;
    }
  } catch (e) { }
  return null;
}
function resolveIconPath(baseName) {
  const candidates = [
    `${baseName}.png`,
    `${baseName}.PNG`,
    `${baseName}.svg`,
    `${baseName}.SVG`,
  ].map((f) => path.join(ICON_BASE_DIR, f));
  for (const p of candidates) if (fs.existsSync(p)) return p;
  return null;
}
function loadIcons() {
  const names = [
    "rota",
    "romaneio",
    "data",
    "motorista",
    "conferente",
    "veiculo",
    "nome",
  ];
  const map = {};
  for (const n of names) {
    const p = resolveIconPath(n);
    map[n] = p ? fileToDataUrl(p) : null;
  }
  return map;
}

/* ==========================================================
   GET /protheus (agrega faturadas/pendentes)
   ========================================================== */
router.get("/protheus", async (req, res) => {
  const filial = (req.query.filial || "").trim();
  const dtsaida = (req.query.dtsaida || "").trim();
  const dtsaida_min = (req.query.dtsaida_min || "").trim();
  const search = (req.query.search || "").trim();
  const limit = Number(req.query.limit || 0);
  const offset = Number(req.query.offset || 0);

  try {
    const pool = await getProtheusPool();

    let sqlText = `
      WITH H AS (
        SELECT
          ZH_FILIAL, ZH_DTSAIDA, ZH_CODIGO, ZH_ROTA,
          ZH_NOME, ZH_VEICULO, ZH_NOMVEI, ZH_MOTOR, ZH_NOMMOT
        FROM SZH140 WITH (NOLOCK)
        WHERE 1=1
    `;
    if (filial) sqlText += ` AND ZH_FILIAL = @filial`;
    if (dtsaida) sqlText += ` AND ZH_DTSAIDA = @dtsaida`;
    else if (dtsaida_min) sqlText += ` AND ZH_DTSAIDA >= @dtsaida_min`;

    if (search) {
      sqlText += `
        AND (
          ZH_NOME    LIKE @like OR
          ZH_ROTA    LIKE @like OR
          ZH_VEICULO LIKE @like OR
          ZH_NOMVEI  LIKE @like OR
          ZH_MOTOR   LIKE @like OR
          ZH_NOMMOT  LIKE @like
        )
      `;
    }

    sqlText += `
      )
      SELECT
        H.ZH_CODIGO,
        H.ZH_ROTA,
        H.ZH_NOME,
        H.ZH_VEICULO,
        H.ZH_NOMVEI,
        H.ZH_MOTOR,
        H.ZH_NOMMOT,
        H.ZH_DTSAIDA,
        ISNULL(COUNT(B.ZB_CARGA), 0) AS TOT_CLIENTES,
        ISNULL(SUM(CASE WHEN B.ZB_NUMSEQ IS NOT NULL AND LTRIM(RTRIM(B.ZB_NUMSEQ)) <> '' THEN 1 ELSE 0 END), 0) AS QT_FATURADAS,
        ISNULL(SUM(CASE WHEN B.ZB_CARGA IS NOT NULL AND (B.ZB_NUMSEQ IS NULL OR LTRIM(RTRIM(B.ZB_NUMSEQ)) = '') THEN 1 ELSE 0 END), 0) AS QT_PENDENTES,
        CAST(
          CASE WHEN COUNT(B.ZB_CARGA) = 0 THEN 0.0
               ELSE 100.0 * SUM(CASE WHEN B.ZB_NUMSEQ IS NOT NULL AND LTRIM(RTRIM(B.ZB_NUMSEQ)) <> '' THEN 1 ELSE 0 END) / COUNT(B.ZB_CARGA)
          END AS DECIMAL(5,2)
        ) AS PCT_FATURADAS
      FROM H
      LEFT JOIN SZB140 B WITH (NOLOCK)
        ON  B.ZB_FILIAL = H.ZH_FILIAL
        AND B.ZB_CARGA  = H.ZH_CODIGO
        AND B.ZB_DATA   = H.ZH_DTSAIDA
      GROUP BY
        H.ZH_CODIGO, H.ZH_ROTA, H.ZH_NOME, H.ZH_VEICULO, H.ZH_NOMVEI,
        H.ZH_MOTOR, H.ZH_NOMMOT, H.ZH_DTSAIDA
      ORDER BY H.ZH_DTSAIDA DESC, H.ZH_ROTA, H.ZH_CODIGO
    `;
    if (limit > 0)
      sqlText += ` OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

    const reqSql = pool.request();
    if (filial) reqSql.input("filial", sql.VarChar, filial);
    if (dtsaida) reqSql.input("dtsaida", sql.VarChar, dtsaida);
    if (!dtsaida && dtsaida_min)
      reqSql.input("dtsaida_min", sql.VarChar, dtsaida_min);
    if (search) reqSql.input("like", sql.VarChar, `%${search}%`);
    if (limit > 0)
      reqSql.input("limit", sql.Int, limit).input("offset", sql.Int, offset);

    const result = await reqSql.query(sqlText);
    res.json(result.recordset || []);
  } catch (err) {
    console.error("Erro ao buscar dados de roteirização (SZH140+SZB140):", err);
    res
      .status(500)
      .json({ error: "Erro ao buscar dados de roteirização (SZH140+SZB140)" });
  }
});

/* ==========================================================
   GET /protheus/clientes
   ========================================================== */
router.get("/protheus/clientes", async (req, res) => {
  const filial = (req.query.filial || "").trim();
  const carga = (req.query.carga || "").trim();
  const dtsaida = (req.query.dtsaida || "").trim();

  if (!filial || !carga) {
    return res
      .status(400)
      .json({ error: "Parâmetros obrigatórios: filial, carga" });
  }

  try {
    const pool = await getProtheusPool();

    let sqlText = `
      SELECT
        ZB_NUMSEQ,
        ZB_CLIENTE,
        ZB_NOMCLI,
        ZB_NOTA,
        ZB_TOTBIL,
        ZB_LOCAL,
        ZB_OBS,
        ZB_END,
        ZB_BAIRRO,
        ZB_COMPLEM,
        ZB_MUN,
        ZB_HRENTRG,
        ZB_DESCOND,
        ZB_FORMA,
        ZB_DATA,
        ZB_CARGA,
        ZB_ORDEIMP,
        ZB_VEND
      FROM SZB140 WITH (NOLOCK)
      WHERE ZB_FILIAL = @filial
        AND ZB_CARGA  = @carga
    `;
    if (dtsaida) sqlText += ` AND ZB_DATA = @dtsaida`;
    sqlText += `
      ORDER BY
        CASE WHEN NULLIF(LTRIM(RTRIM(ZB_ORDEIMP)), '') IS NULL
             THEN 999999
             ELSE TRY_CAST(ZB_ORDEIMP AS INT)
        END,
        TRY_CAST(ZB_NUMSEQ AS INT)
    `;

    const q = pool
      .request()
      .input("filial", sql.VarChar, filial)
      .input("carga", sql.VarChar, carga);
    if (dtsaida) q.input("dtsaida", sql.VarChar, dtsaida);

    const result = await q.query(sqlText);
    res.json(result.recordset || []);
  } catch (err) {
    console.error("Erro ao buscar clientes da rota (SZB140):", err);
    res.status(500).json({ error: "Erro ao buscar clientes da rota (SZB140)" });
  }
});

/* ==========================================================
   pdfmake: fontes (Windows Arial -> fallback Roboto)
   ========================================================== */
function resolveFonts() {
  const winFonts = {
    normal: "C:\\Windows\\Fonts\\arial.ttf",
    bold: "C:\\Windows\\Fonts\\arialbd.ttf",
    italics: "C:\\Windows\\Fonts\\ariali.ttf",
    bolditalics: "C:\\Windows\\Fonts\\arialbi.ttf",
  };
  const allWin = Object.values(winFonts).every((p) => fs.existsSync(p));
  if (allWin) return { Arial: winFonts };

  const robotoDir = path.join(__dirname, "fonts");
  return {
    Roboto: {
      normal: path.join(robotoDir, "Roboto-Regular.ttf"),
      bold: path.join(robotoDir, "Roboto-Medium.ttf"),
      italics: path.join(robotoDir, "Roboto-Italic.ttf"),
      bolditalics: path.join(robotoDir, "Roboto-MediumItalic.ttf"),
    },
  };
}

/* ==========================================================
   Helper: gerar CAPA (pdfmake)
   ========================================================== */
async function gerarCapaRotaPDF({
  rota,
  clientes,
  pesosByBilhete = {},
  outputPath,
}) {
  const fonts = resolveFonts();
  const printer = new PdfPrinter(fonts);
  const isArial = !!fonts.Arial;

  const logoPath = path.join(__dirname, "..", "src", "img", "logo3.png");
  let logoDataUrl = null;
  if (fs.existsSync(logoPath)) {
    const b64 = fs.readFileSync(logoPath).toString("base64");
    logoDataUrl = `data:image/png;base64,${b64}`;
  }

  const logoRightCandidates = [
    "logobpg.jpg",
    "logobpg.JPG",
    "logobpg.jpeg",
    "logobpg.png",
    "logobpg.PNG",
  ].map(f => path.join(__dirname, "..", "src", "img", f));

  let logoRightDataUrl = null;
  for (const p of logoRightCandidates) {
    if (fs.existsSync(p)) {
      const ext = p.toLowerCase().endsWith(".png") ? "png" : "jpeg";
      const b64 = fs.readFileSync(p).toString("base64");
      logoRightDataUrl = `data:image/${ext};base64,${b64}`;
      break;
    }
  }

  const ICONS = loadIcons();
  const totals = clientes.reduce((a, c) => a + Number(c.ZB_TOTBIL || 0), 0);

  const infoItem = (iconKey, label, value) => {
    const img = ICONS[iconKey];
    return {
      columns: [
        img
          ? { image: img, width: 12, margin: [0, 2, 6, 0] }
          : { text: " ", width: 12, margin: [0, 2, 6, 0] },
        {
          stack: [
            { text: label, style: "infoLabel" },
            {
              text: String(value || "—"),
              style: "infoValue",
              margin: [0, 2, 0, 0],
            },
          ],
        },
      ],
      columnGap: 6,
    };
  };

  const inlineLabel = (txt) => ({
    text: txt,
    style: "kmMicro",
    alignment: "center",
    noWrap: true,
  });

  const groups = [];
  const gmap = new Map();

  for (const c of clientes) {
    const cod = String(c.ZB_CLIENTE || "").trim();
    const nome = String(c.ZB_NOMCLI || "").trim();
    const key = `${cod}|${nome}`;

    const bilhete = String(c.ZB_NUMSEQ || "").trim();
    const pesoKg = Number(pesosByBilhete[bilhete] || 0);

    let g = gmap.get(key);
    if (!g) {
      g = { cod, nome, itens: [], total: 0, peso: 0, ordem: undefined };
      gmap.set(key, g);
      groups.push(g);
    }
    g.itens.push({ ...c, bilhete, pesoKg });
    g.total += Number(c.ZB_TOTBIL || 0);
    g.peso += pesoKg;

    const ord = parseInt(String(c.ZB_ORDEIMP || "").trim(), 10);
    if (!Number.isNaN(ord)) {
      g.ordem = Number.isInteger(g.ordem) ? Math.min(g.ordem, ord) : ord;
    }
  }

  if (groups.some((g) => Number.isInteger(g.ordem))) {
    groups.sort((a, b) => {
      const ao = Number.isInteger(a.ordem) ? a.ordem : 999999;
      const bo = Number.isInteger(b.ordem) ? b.ordem : 999999;
      if (ao !== bo) return ao - bo;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
  }

  let seq = 1;
  groups.forEach((g) => {
    g.itens.forEach((c) => {
      c._ord = seq++;
    });
    const ords = g.itens.map((c) => c._ord);
    g._ordLabel =
      ords.length === 1
        ? String(ords[0] || "")
        : ords.length <= 3
          ? ords.join("/")
          : `${ords[0]}–${ords[ords.length - 1]}`;
  });

  const detalheFrom = (c) => {
    const addrParts = [
      (c.ZB_END || "").trim(),
      (c.ZB_BAIRRO || "").trim(),
      (c.ZB_MUN || "").trim(),
    ].filter(Boolean);
    const complemento = (c.ZB_COMPLEM || "").trim();
    if (complemento) addrParts.push(complemento);
    const endereco = addrParts.join(" • ");

    const forma = c.ZB_DESCOND ? `Forma: ${c.ZB_DESCOND}` : null;
    const meio = c.ZB_FORMA ? `Meio: ${meioPgtoLabel(c.ZB_FORMA)}` : null;
    const hora = (c.ZB_HRENTRG || "").trim();
    const horaTxt = hora ? `Hora entrega: ${hora}` : null;
    const obs = (c.ZB_OBS || "").trim();
    const detalhe1 = endereco ? cut(endereco, 100) : "—";
    const detalhe2 = [forma, meio, horaTxt].filter(Boolean).join("  •  ");
    return { detalhe1, detalhe2, detalheObs: obs };
  };

  const body = [
    [
      { text: "Ordem", style: "th", alignment: "center" },
      { text: "Bilhete", style: "th", alignment: "center" },
      { text: "Clientes / Entregas", style: "th" },
      { text: "Nota", style: "th", alignment: "center" },
      { text: "Total", style: "th", alignment: "right" },
    ],
  ];

  if (groups.length === 1) {
    const g = groups[0];
    body.push([
      {
        text: g._ordLabel || "",
        alignment: "center",
        fillColor: "#F3F4F6",
        bold: true,
      },
      { text: "", fillColor: "#F3F4F6" },
      { text: cut(g.nome, 70), fillColor: "#F3F4F6", bold: true },
      { text: "", fillColor: "#F3F4F6" },
      { text: "", fillColor: "#F3F4F6" },
    ]);

    g.itens.forEach((c) => {
      const { detalhe1, detalhe2, detalheObs } = detalheFrom(c);
      body.push([
        { text: "", alignment: "center" },
        { text: c.bilhete, alignment: "center" },
        {
          stack: [
            { text: cut(c.ZB_NOMCLI, 70) },
            {
              text: detalhe1,
              fontSize: 8,
              color: "#6B7280",
              margin: [0, 1, 0, 0],
            },
            detalhe2
              ? {
                text: detalhe2,
                fontSize: 8,
                color: "#6B7280",
                margin: [0, 1, 0, 0],
              }
              : { text: " ", fontSize: 8, margin: [0, 1, 0, 0] },
            detalheObs
              ? {
                text: `Obs: ${cut(detalheObs, 100)}`,
                bold: true,
                color: "#B45309",
                fontSize: 8,
                margin: [0, 2, 0, 0],
              }
              : null,
          ],
        },
        { text: String(c.ZB_NOTA || ""), alignment: "center" },
        {
          stack: [
            { text: `R$ ${brMoney(c.ZB_TOTBIL)}`, alignment: "right" },
            c.pesoKg
              ? {
                text: `Peso: ${brKg(c.pesoKg)} kg`,
                alignment: "right",
                fontSize: 8,
                color: "#6B7280",
                margin: [0, 2, 0, 0],
              }
              : { text: " ", fontSize: 8, margin: [0, 2, 0, 0] },
          ],
        },
      ]);
    });
  } else {
    groups.forEach((g) => {
      body.push([
        {
          text: g._ordLabel || "",
          alignment: "center",
          fillColor: "#F3F4F6",
          bold: true,
        },
        { text: "", fillColor: "#F3F4F6" },
        { text: cut(g.nome, 70), fillColor: "#F3F4F6", bold: true },
        { text: "", fillColor: "#F3F4F6" },
        { text: "", fillColor: "#F3F4F6" },
      ]);

      g.itens.forEach((c) => {
        const { detalhe1, detalhe2, detalheObs } = detalheFrom(c);
        body.push([
          { text: "", alignment: "center" },
          { text: c.bilhete, alignment: "center" },
          {
            stack: [
              { text: cut(c.ZB_NOMCLI, 70) },
              {
                text: detalhe1,
                fontSize: 8,
                color: "#6B7280",
                margin: [0, 1, 0, 0],
              },
              detalhe2
                ? {
                  text: detalhe2,
                  fontSize: 8,
                  color: "#6B7280",
                  margin: [0, 1, 0, 0],
                }
                : { text: " ", fontSize: 8, margin: [0, 1, 0, 0] },
              detalheObs
                ? {
                  text: `Obs: ${cut(detalheObs, 100)}`,
                  bold: true,
                  color: "#B45309",
                  fontSize: 8,
                  margin: [0, 2, 0, 0],
                }
                : null,
            ],
          },
          { text: String(c.ZB_NOTA || ""), alignment: "center" },
          {
            stack: [
              { text: `R$ ${brMoney(c.ZB_TOTBIL)}`, alignment: "right" },
              c.pesoKg
                ? {
                  text: `Peso: ${brKg(c.pesoKg)} kg`,
                  alignment: "right",
                  fontSize: 8,
                  color: "#6B7280",
                  margin: [0, 2, 0, 0],
                }
                : { text: " ", fontSize: 8, margin: [0, 2, 0, 0] },
            ],
          },
        ]);
      });
    });
  }

  const totalPesoKg = groups.reduce((acc, g) => acc + Number(g.peso || 0), 0);

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [24, 24, 24, 34],
    content: [
      {
        table: {
          widths: [65, "*", 65],
          body: [
            [
              logoDataUrl
                ? { image: logoDataUrl, width: 45 }
                : { text: "", width: 45 },
              {
                stack: [
                  {
                    text: "FORT FRUIT LTDA",
                    style: "title",
                    margin: [0, 0, 0, 2],
                  },
                  {
                    text:
                      "ALAMEDA CEASA, SN • CURIO, BELEM, PA\n" +
                      "CEP: 66.610-120   •   PABX/FAX: 55-91-32457463\n" +
                      "CNPJ: 02.338.006/0001-07   •   I.E.: 151.977.887",
                    style: "addr",
                  },
                ],
              },
              logoRightDataUrl
                ? { image: logoRightDataUrl, width: 45, alignment: "right" }
                : { text: "", width: 45 },
            ],
          ],
        },
        layout: "noBorders",
        margin: [0, 0, 0, 8],
      },
      {
        table: {
          widths: ["*", "*", "*"],
          body: [
            [
              infoItem("rota", "Rota Nº", rota.ZH_ROTA),
              infoItem("romaneio", "Romaneio Nº", rota.ZH_CODIGO),
              infoItem("data", "Data", yyyymmddToBr(rota.ZH_DTSAIDA)),
            ],
            [
              infoItem(
                "motorista",
                "Motorista",
                rota.ZH_NOMMOT || rota.ZH_MOTOR || "—"
              ),
              infoItem(
                "conferente",
                "Conferente",
                rota.ZH_CONFERENTE || rota.ZH_CONFERE || "—"
              ),
              infoItem(
                "veiculo",
                "Veículo",
                cut(`${rota.ZH_VEICULO || ""}  ${rota.ZH_NOMVEI || ""}`, 50)
              ),
            ],
            [
              infoItem("nome", "Nome da Rota", cut(rota.ZH_NOME, 90)),
              {
                colSpan: 2,
                margin: [0, 0, 0, 0],
                table: {
                  widths: [68, 3, 68, 3, 76, 3, 76],
                  body: [
                    [
                      inlineLabel("Hora saída"),
                      {
                        margin: [0, -1, 0, 0],
                        canvas: [
                          {
                            type: "line",
                            x1: 1.5,
                            y1: 0,
                            x2: 1.5,
                            y2: 12,
                            lineWidth: 1,
                            lineColor: "#9CA3AF",
                          },
                        ],
                      },
                      inlineLabel("KM saída"),
                      {
                        margin: [0, -1, 0, 0],
                        canvas: [
                          {
                            type: "line",
                            x1: 1.5,
                            y1: 0,
                            x2: 1.5,
                            y2: 12,
                            lineWidth: 1,
                            lineColor: "#9CA3AF",
                          },
                        ],
                      },
                      inlineLabel("Hora chegada"),
                      {
                        margin: [0, -1, 0, 0],
                        canvas: [
                          {
                            type: "line",
                            x1: 1.5,
                            y1: 0,
                            x2: 1.5,
                            y2: 12,
                            lineWidth: 1,
                            lineColor: "#9CA3AF",
                          },
                        ],
                      },
                      inlineLabel("KM chegada"),
                    ],
                  ],
                },
                layout: "noBorders",
              },
              {},
            ],
          ],
        },
        // << CORREÇÃO 1 AQUI
        layout: {
          fillColor: () => "#F9FAFB",
          hLineColor: () => "#E5E7EB",
          vLineColor: () => "#E5E7EB",
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 10,
          paddingRight: () => 10,
          paddingTop: () => 8,
          paddingBottom: () => 8,
        },
        margin: [0, 0, 0, 10],
      },
      {
        columns: [
          {
            text: `Clientes da carga ${rota.ZH_CODIGO} (${groups.length})`,
            style: "section",
          },
          {
            width: "auto",
            stack: [
              {
                text: `Total: R$ ${brMoney(totals)}`,
                style: "section",
                alignment: "right",
              },
              {
                text: `Peso total: ${brKg(totalPesoKg)} kg`,
                style: "sectionSub",
                alignment: "right",
                margin: [0, 2, 0, 0],
              },
            ],
          },
        ],
        margin: [0, 0, 0, 4],
      },
      {
        table: { headerRows: 1, widths: [36, 50, "*", 68, 72], body },
        layout: {
          fillColor: (row) => (row === 0 ? "#F3F4F6" : null),
          hLineColor: () => "#E5E7EB",
          vLineColor: () => "#FFFFFF",
          hLineWidth: (i) => (i === 1 ? 1 : 0.7),
          vLineWidth: () => 0,
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 4,
          paddingBottom: () => 4,
        },
      },
      {
        columns: [
          { width: "*", text: "" },
          {
            width: 360,
            stack: [
              {
                text: "___________________________\nASSINATURA MOTORISTA",
                style: "assinatura",
                alignment: "center",
                lineHeight: 2,
                margin: [0, 20, 0, 0],
              },
            ],
            margin: [0, 26, 0, 0],
          },
          { width: "*", text: "" },
        ],
      },
    ],
    styles: {
      title: {
        font: isArial ? "Arial" : "Roboto",
        fontSize: 14,
        bold: true,
        color: "#111827",
      },
      addr: {
        font: isArial ? "Arial" : "Roboto",
        fontSize: 9,
        color: "#374151",
        lineHeight: 1.15,
      },
      section: {
        font: isArial ? "Arial" : "Roboto",
        fontSize: 10,
        bold: true,
        color: "#111827",
      },
      sectionSub: {
        font: isArial ? "Arial" : "Roboto",
        fontSize: 9,
        color: "#374151",
      },
      th: {
        font: isArial ? "Arial" : "Roboto",
        fontSize: 9,
        bold: true,
        color: "#374151",
      },
      infoLabel: {
        font: isArial ? "Arial" : "Roboto",
        fontSize: 9,
        bold: true,
        color: "#374151",
        characterSpacing: 0.1,
      },
      infoValue: {
        font: isArial ? "Arial" : "Roboto",
        fontSize: 11,
        color: "#111827",
      },
      kmLabel: { bold: true, fontSize: 9, color: "#111827" },
      kmMicro: { bold: true, fontSize: 9, color: "#111827" },
      assinatura: {
        font: isArial ? "Arial" : "Roboto",
        fontSize: 9,
        color: "#374151",
      },
    },
    defaultStyle: {
      font: isArial ? "Arial" : "Roboto",
      fontSize: 9.5,
      color: "#111827",
    },
  };

  await new Promise((resolve, reject) => {
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const out = fs.createWriteStream(outputPath);
    pdfDoc.pipe(out);
    pdfDoc.end();
    out.on("finish", resolve);
    out.on("error", reject);
  });
}

/* =========================
   IMPRESSÃO
   ========================= */
const RELATO_DIR = process.env.RELATO_DIR || "\\\\192.168.10.49\\relato";

const SUMATRA = "";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function listPdfFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => !f.startsWith(".") && f.toLowerCase().endsWith(".pdf"));
}
function groupFilesByBilhete_PDF(files) {
  const arr = files.map((f) => ({ up: f.toUpperCase(), real: f }));
  return (bilhetes) => {
    const map = {};
    for (const b of bilhetes) {
      const B = String(b || "")
        .trim()
        .toUpperCase();
      if (!B) continue;
      map[B] = arr
        .filter(({ up }) => up.startsWith(B))
        .map(({ real }) => path.join(RELATO_DIR, real))
        .sort((a, b) => a.localeCompare(b, "pt-BR"));
    }
    return map;
  };
}
function printWithSumatra(file, printer) {
  return new Promise((resolve) => {
    const args = [];
    if (printer) args.push("-print-to", printer);
    else args.push("-print-to-default");
    args.push("-silent", file);
    const p = child_process.spawn(SUMATRA, args, { windowsHide: true });
    p.on("exit", () => resolve());
    p.on("error", () => resolve());
  });
}
async function printAllSequentialPDF(files, printer) {
  for (const f of files) {
    try {
      await printWithSumatra(f, printer);
      await sleep(200);
    } catch (_) { }
  }
}

/* ==========================================================
   POST /protheus/print
   ========================================================== */
async function gerarCapaRotaPDFBuffer({
  rota,
  clientes,
  pesosByBilhete = {},
  fileName,
}) {
  const tmp = path.join(os.tmpdir(), `${Date.now()}_${fileName || "CAPA.pdf"}`);
  await gerarCapaRotaPDF({ rota, clientes, pesosByBilhete, outputPath: tmp });
  const buf = fs.readFileSync(tmp);
  try {
    fs.unlinkSync(tmp);
  } catch { }
  return buf;
}

router.post("/protheus/print", async (req, res) => {
  const { filial, dtsaida, carga, force = false } = req.body || {};
  if (!filial || !carga)
    return res.status(400).json({ ok: false, error: "bad_request" });

  try {
    const pool = await getProtheusPool();

    // 1. Busca Cabeçalho da Rota
    const headRs = await pool
      .request()
      .input("filial", sql.VarChar, filial)
      .input("carga", sql.VarChar, carga)
      .input("dtsaida", sql.VarChar, dtsaida || "").query(`
        SELECT TOP 1
          ZH_ROTA, ZH_CODIGO, ZH_NOME, ZH_VEICULO, ZH_NOMVEI,
          ZH_MOTOR, ZH_NOMMOT, ZH_DTSAIDA, ZH_CONFERE AS ZH_CONFERENTE
        FROM SZH140 WITH (NOLOCK)
        WHERE ZH_FILIAL=@filial AND ZH_CODIGO=@carga
          ${dtsaida ? "AND ZH_DTSAIDA=@dtsaida" : ""}
      `);
    const rota = headRs.recordset?.[0];
    if (!rota) return res.status(404).json({ ok: false, error: "not_found" });

    // 2. Busca Itens (Clientes)
    const itRs = await pool
      .request()
      .input("filial", sql.VarChar, filial)
      .input("carga", sql.VarChar, carga)
      .input("dtsaida", sql.VarChar, dtsaida || "").query(`
        SELECT
          ZB_NUMSEQ, ZB_CLIENTE, ZB_NOMCLI, ZB_NOTA, ZB_TOTBIL, ZB_DATA,
          ZB_END, ZB_BAIRRO, ZB_COMPLEM, ZB_MUN, ZB_HRENTRG,
          ZB_DESCOND, ZB_FORMA, ZB_ORDEIMP, ZB_OBS
        FROM SZB140 WITH (NOLOCK)
        WHERE ZB_FILIAL=@filial AND ZB_CARGA=@carga
          ${dtsaida ? "AND ZB_DATA=@dtsaida" : ""}
        ORDER BY
          CASE WHEN NULLIF(LTRIM(RTRIM(ZB_ORDEIMP)), '') IS NULL THEN 999999 ELSE TRY_CAST(ZB_ORDEIMP AS INT) END,
          TRY_CAST(ZB_NUMSEQ AS INT)
      `);

    let clientes = itRs.recordset || [];
    if (!clientes.length) return res.json({ ok: false, error: "sem_clientes" });

    // 3. Verifica arquivos faltantes (Checagem Cloud/Local)
    const missingSummary = [];
    const filesFound = []; // { bilhete, source: 'supabase'|'local', pathKey, fullPath, filename }

    const bilhetes = clientes.map((c) => String(c.ZB_NUMSEQ || "").trim()).filter(Boolean);
    const pesosByBilhete = await getPesosByBilhete(pool, filial, bilhetes);

    // Cache local list (Fallback)
    const baseDir = RELATO_DIR;
    let localFiles = [];
    try {
      if (fs.existsSync(baseDir)) {
        localFiles = fs.readdirSync(baseDir).map(f => f.toUpperCase());
      }
    } catch (e) { }

    // Para cada cliente, tenta achar TODOS arquivos correspondentes
    const fullSummary = [];
    let hasMissing = false;

    for (const c of clientes) {
      const b = String(c.ZB_NUMSEQ || "").trim();
      if (!b) continue;

      let matchesForClient = [];
      // Helper para cortar string (caso não esteja no escopo global, definimos aqui defensivamente se precisar, 
      // mas assumindo que já existe pois era usado anteriormente).
      const cliName = c.ZB_NOMCLI ? (c.ZB_NOMCLI.length > 20 ? c.ZB_NOMCLI.substring(0, 20) + "..." : c.ZB_NOMCLI) : "";

      // A) Tenta SUPABASE
      if (supabase) {
        try {
          const { data: listData, error: listError } = await supabase
            .storage
            .from(BUCKET_NAME)
            .list('arquivos', {
              limit: 15,
              search: b
            });

          if (!listError && listData && listData.length > 0) {
            const validMatches = listData.filter(f =>
              f.name.toUpperCase().endsWith(".PDF") &&
              f.name.toUpperCase().startsWith(b.toUpperCase())
            );
            validMatches.forEach(f => {
              matchesForClient.push({
                bilhete: b,
                source: 'supabase',
                filename: f.name,
                pathKey: `arquivos/${f.name}`
              });
            });
          }
        } catch (errSup) {
          console.error("Erro check supabase:", errSup);
        }
      }

      // B) Fallback LOCAL (se nenhum no Supabase)
      if (matchesForClient.length === 0 && localFiles.length > 0) {
        const matchLocal = localFiles.filter(f => f.startsWith(b) && f.endsWith(".PDF"));
        matchLocal.forEach(f => {
          matchesForClient.push({
            bilhete: b,
            source: 'local',
            filename: f,
            fullPath: path.join(baseDir, f)
          });
        });
      }

      if (matchesForClient.length > 0) {
        filesFound.push(...matchesForClient);

        // Classifica os arquivos encontrados
        const filesObj = { bilhete: [], boleto: [], nota: [] };

        matchesForClient.forEach(m => {
          const up = m.filename.toUpperCase();
          if (up.includes("BOLETO")) {
            filesObj.boleto.push(m.filename);
          } else if (up.includes("NF") || up.includes("NOTA")) {
            filesObj.nota.push(m.filename);
          } else {
            // Se for "bilhete" ou qualquer outro, joga aqui
            // (Geralmente o proprio arquivo com nome 'SAMTC9.pdf' é o bilhete)
            // Se tiver 'BILHETE' no nome explicitamente, também cai aqui
            filesObj.bilhete.push(m.filename);
          }
        });

        // Adiciona ao resumo como SUCESSO (ou PARCIAL)
        const missingTypes = [];
        if (filesObj.bilhete.length === 0) missingTypes.push('bilhete');
        if (filesObj.nota.length === 0) missingTypes.push('nota');
        if (filesObj.boleto.length === 0) missingTypes.push('boleto');

        if (missingTypes.length > 0) hasMissing = true;

        fullSummary.push({
          prefix: `${b} (Cliente: ${cliName})`,
          missing: missingTypes,
          files: filesObj
        });

      } else {
        // Arquivo faltando
        hasMissing = true;
        // Adiciona ao resumo como FALHA
        if (!force) {
          fullSummary.push({
            prefix: `${b} (Cliente: ${cliName})`,
            missing: ["arquivos ausentes"],
            files: { bilhete: [] }
          });
        }
      }
    }

    // Se houver faltantes e não for forced, retorna aviso
    if (hasMissing && !force) {
      return res.json({
        ok: false,
        needConfirm: true,
        foundSummary: fullSummary
      });
    }

    // 4. Iniciar Merge do PDF
    try {
      const mergedPdf = await PDFDocument.create();

      // 4.1 Gerar e Adicionar Capa
      const capaName = `CAPA_${carga}.pdf`;
      const capaBuf = await gerarCapaRotaPDFBuffer({
        rota,
        clientes,
        pesosByBilhete,
        fileName: capaName,
      });

      const capaDoc = await PDFDocument.load(capaBuf);
      const capaPages = await mergedPdf.copyPages(capaDoc, capaDoc.getPageIndices());
      capaPages.forEach((page) => mergedPdf.addPage(page));

      // 4.2 Adicionar Arquivos dos Clientes
      for (const c of clientes) {
        const b = String(c.ZB_NUMSEQ || "").trim();

        // Pega todos os arquivos deste cliente
        const thisClientFiles = filesFound.filter(f => f.bilhete === b);

        // Ordena por nome para manter consistência (ex: Bilhete < Boleto < NF)
        // Se quiser ordem específica, teria que criar logica customizada
        thisClientFiles.sort((a, b) => a.filename.localeCompare(b.filename));

        for (const found of thisClientFiles) {
          try {
            let fileBuffer = null;

            if (found.source === 'supabase') {
              // Download do Supabase
              const { data: blob, error: dlError } = await supabase
                .storage
                .from(BUCKET_NAME)
                .download(found.pathKey);

              if (dlError || !blob) throw dlError || new Error("Download vazio");

              const arrayBuffer = await blob.arrayBuffer();
              fileBuffer = Buffer.from(arrayBuffer);
            } else {
              // Leitura Local
              fileBuffer = fs.readFileSync(found.fullPath);
            }

            if (fileBuffer) {
              const clientDoc = await PDFDocument.load(fileBuffer);
              const clientPages = await mergedPdf.copyPages(clientDoc, clientDoc.getPageIndices());
              clientPages.forEach((page) => mergedPdf.addPage(page));
            }
          } catch (errFile) {
            console.error(`Erro ao baixar/mergear arquivo ${found.filename} (${found.source}):`, errFile);
          }
        }
      }

      // 5. Finalizar
      const pdfBytes = await mergedPdf.save();
      const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

      return res.json({
        ok: true,
        mergedPdf: pdfBase64,
        totalFilesMerged: 1 + filesFound.length
      });

    } catch (errMerge) {
      console.error("Erro no processo de merge:", errMerge);
      return res.status(500).json({ ok: false, error: "merge_error", details: errMerge.message });
    }

  } catch (err) {
    console.error("Erro em /protheus/print:", err);
    return res.status(500).json({ ok: false, error: "error" });
  }
});

/* ==========================================================
   POST /protheus/capa  (legado — usa RELATO_DIR do servidor)
   ========================================================== */
router.post("/protheus/capa", async (req, res) => {
  const { filial, dtsaida, carga } = req.body || {};
  if (!filial || !carga)
    return res.status(400).json({ ok: false, reason: "bad_request" });

  try {
    const pool = await getProtheusPool();

    const headRs = await pool
      .request()
      .input("filial", sql.VarChar, filial)
      .input("carga", sql.VarChar, carga)
      .input("dtsaida", sql.VarChar, dtsaida || "").query(`
        SELECT TOP 1
          ZH_ROTA, ZH_CODIGO, ZH_NOME, ZH_VEICULO, ZH_NOMVEI,
          ZH_MOTOR, ZH_NOMMOT, ZH_DTSAIDA,
          ZH_CONFERE AS ZH_CONFERENTE
        FROM SZH140 WITH (NOLOCK)
        WHERE ZH_FILIAL=@filial AND ZH_CODIGO=@carga
          ${dtsaida ? "AND ZH_DTSAIDA=@dtsaida" : ""}
      `);
    const rota = headRs.recordset?.[0];
    if (!rota) return res.status(404).json({ ok: false, reason: "not_found" });

    const itRs = await pool
      .request()
      .input("filial", sql.VarChar, filial)
      .input("carga", sql.VarChar, carga)
      .input("dtsaida", sql.VarChar, dtsaida || "").query(`
        SELECT
          ZB_NUMSEQ, ZB_CLIENTE, ZB_NOMCLI, ZB_NOTA, ZB_TOTBIL,
          ZB_HRENTRG, ZB_END, ZB_BAIRRO, ZB_COMPLEM, ZB_MUN, ZB_DATA,
          ZB_DESCOND, ZB_FORMA, ZB_ORDEIMP, ZB_OBS
        FROM SZB140 WITH (NOLOCK)
        WHERE ZB_FILIAL=@filial AND ZB_CARGA=@carga
          ${dtsaida ? "AND ZB_DATA=@dtsaida" : ""}
        ORDER BY
          CASE WHEN NULLIF(LTRIM(RTRIM(ZB_ORDEIMP)), '') IS NULL
               THEN 999999
               ELSE TRY_CAST(ZB_ORDEIMP AS INT)
          END,
          TRY_CAST(ZB_NUMSEQ AS INT)
      `);
    const clientes = itRs.recordset || [];

    const baseDir = RELATO_DIR;
    const filesRaw = fs.existsSync(baseDir) ? fs.readdirSync(baseDir) : [];
    const filesUC = filesRaw.map((f) => f.toUpperCase());

    const codigos = clientes
      .map((c) =>
        String(c.ZB_NUMSEQ || "")
          .trim()
          .toUpperCase()
      )
      .filter(Boolean);

    let hasAnyFile = false;
    for (const code of codigos) {
      if (filesUC.some((fname) => fname.toUpperCase().startsWith(code))) {
        hasAnyFile = true;
        break;
      }
    }
    if (!hasAnyFile) return res.json({ ok: false, reason: "no_files" });

    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    const filename = `CAPA_${carga}_${(
      dtsaida ||
      rota.ZH_DTSAIDA ||
      ""
    ).trim()}.pdf`;
    const outPath = path.join(baseDir, filename);

    const bilhetes = clientes
      .map((c) => String(c.ZB_NUMSEQ || "").trim())
      .filter(Boolean);
    const pesosByBilhete = await getPesosByBilhete(pool, filial, bilhetes);

    await gerarCapaRotaPDF({
      rota,
      clientes,
      pesosByBilhete,
      outputPath: outPath,
    });
    return res.json({ ok: true, file: outPath });
  } catch (err) {
    console.error("Erro ao gerar CAPA:", err);
    return res.status(500).json({ ok: false, reason: "error" });
  }
});

/* ==========================================================
   Placeholder de impressão geral
   ========================================================== */
router.post("/imprimir", async (req, res) => {
  try {
    const { carga } = req.body;
    res.json({ ok: true, msg: `Impressão iniciada para carga ${carga}` });
  } catch (e) {
    console.error("Erro ao imprimir:", e);
    res.status(500).json({ error: "Falha ao imprimir" });
  }
});

/* ==========================================================
   POST /protheus/check-files (Check em lote para barra de progresso)
   ========================================================== */
router.post("/protheus/check-files", async (req, res) => {
  const { filial, cargas, dtsaida } = req.body; // cargas = ['123', '456']
  if (!filial || !cargas || !Array.isArray(cargas) || cargas.length === 0) {
    return res.json({ ok: true, results: {} });
  }

  try {
    const pool = await getProtheusPool();

    // 1. Pega todos os bilhetes dessas cargas usando parametros para evitar SQL injection
    const reqSql = pool.request().input("filial", sql.VarChar, filial);
    const paramNames = cargas.map((c, i) => {
      reqSql.input(`c${i}`, sql.VarChar, c);
      return `@c${i}`;
    });

    let qry = `
         SELECT 
             ZB_CARGA, 
             ZB_NUMSEQ 
         FROM SZB140 WITH (NOLOCK)
         WHERE ZB_FILIAL=@filial 
           AND ZB_CARGA IN (${paramNames.join(',')})
           AND ZB_NUMSEQ <> ''
        `;

    if (dtsaida) {
      reqSql.input("dtsaida", sql.VarChar, dtsaida);
      qry += ` AND ZB_DATA = @dtsaida`;
    }

    const rs = await reqSql.query(qry);

    const allItems = rs.recordset || [];

    // Agrupa por carga
    // cargaMap = { '123456': ['SAMTC9', 'SAMTIA'], ... }
    const cargaMap = {};
    for (const item of allItems) {
      const c = item.ZB_CARGA;
      const b = (item.ZB_NUMSEQ || '').trim();
      if (!b) continue;
      if (!cargaMap[c]) cargaMap[c] = [];
      cargaMap[c].push(b);
    }

    // 2. Lista arquivos do Supabase (Otimizado: Listar TUDO do bucket ou os ultimos X)
    // Como o bucket tem politica de 3 dias, listar tudo deve ser ok (alguns milhares).
    // Se tiver limit, vamos tentar pegar um numero alto.
    let remoteFiles = [];
    if (supabase) {
      const { data, error } = await supabase
        .storage
        .from(BUCKET_NAME)
        .list('arquivos', { limit: 3000, sortBy: { column: 'created_at', order: 'desc' } });

      if (data) {
        remoteFiles = data.map(f => f.name.toUpperCase());
      }
    }

    // 3. Cruzamento
    const results = {};
    for (const c of cargas) {
      const bilhetes = cargaMap[c] || [];
      if (bilhetes.length === 0) {
        results[c] = { total: 0, found: 0 };
        continue;
      }

      let totalExpected = 0;
      let totalFound = 0;

      for (const b of bilhetes) {
        totalExpected += 3; // Regra: Boleto, NF/Nota, Bilhete

        const bUp = b.toUpperCase();
        // Arquivos deste bilhete
        const filesForBilhete = remoteFiles.filter(f => f.startsWith(bUp));

        const hasBoleto = filesForBilhete.some(f => f.includes("BOLETO"));
        const hasNF = filesForBilhete.some(f => f.includes("NF") || f.includes("NOTA"));
        // Bilhete: Começa com codigo e não é os outros (ou tem BILHETE no nome)
        const hasBilhete = filesForBilhete.some(f =>
          !f.includes("BOLETO") && !f.includes("NF") && !f.includes("NOTA")
        );

        if (hasBoleto) totalFound++;
        if (hasNF) totalFound++;
        if (hasBilhete) totalFound++;
      }

      results[c] = { total: totalExpected, found: totalFound };
    }

    return res.json({ ok: true, results });

  } catch (e) {
    console.error("Erro check-files:", e);
    return res.json({ ok: false });
  }
});

module.exports = router;
