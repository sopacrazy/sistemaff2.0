const express = require("express");
const sql = require("mssql");
const axios = require("axios");
const router = express.Router();
const dbConfig = require("../config/dbConfig");

const CNPJA_TOKEN = process.env.CNPJA_TOKEN;

// 🔤 Função para normalizar texto (remove acento e caixa alta)
function normalizarTexto(str) {
  return str
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

router.get("/validar-clientes-lote", async (req, res) => {
  try {
    await sql.connect(dbConfig);

    const result = await sql.query(`
      SELECT TOP 50
        A1_COD, A1_CGC, A1_NOME, A1_NREDUZ, A1_MUN, A1_EST, 
        A1_CEP, A1_INSCR, A1_END, A1_BAIRRO
      FROM SA1140
      WHERE A1_FILIAL = '01'
        AND A1_PESSOA = 'J'
        AND A1_ULTCOM >= '20250301'
        AND D_E_L_E_T_ = ''
        AND A1_CGC <> ''
    `);

    const clientes = result.recordset;
    const resultadoFinal = [];

    for (const cliente of clientes) {
      const cnpj = cliente.A1_CGC.replace(/\D/g, "");
      const divergencias = [];

      try {
        const { data } = await axios.get(
          `https://api.cnpja.com/office/${cnpj}?registrations=BR`,
          {
            headers: { Authorization: CNPJA_TOKEN },
          }
        );

        // Nome
        const nomeReceita = data.company?.name?.trim();
        if (
          normalizarTexto(cliente.A1_NOME?.trim()) !==
          normalizarTexto(nomeReceita)
        ) {
          divergencias.push({
            campo: "Nome",
            valorERP: cliente.A1_NOME,
            valorReceita: nomeReceita,
          });
        }

        // Município
        const municipioReceita = data.address?.city;
        if (
          normalizarTexto(cliente.A1_MUN?.trim()) !==
          normalizarTexto(municipioReceita?.trim())
        ) {
          divergencias.push({
            campo: "Município",
            valorERP: cliente.A1_MUN,
            valorReceita: municipioReceita,
          });
        }

        // UF
        const ufReceita = data.address?.state?.trim().toUpperCase();
        if (cliente.A1_EST?.trim().toUpperCase() !== ufReceita) {
          divergencias.push({
            campo: "UF",
            valorERP: cliente.A1_EST,
            valorReceita: ufReceita,
          });
        }

        // CEP
        const cepReceita = data.address?.zip?.replace(/\D/g, "");
        if (cliente.A1_CEP?.replace(/\D/g, "") !== cepReceita) {
          divergencias.push({
            campo: "CEP",
            valorERP: cliente.A1_CEP,
            valorReceita: cepReceita,
          });
        }

        // Endereço
        const enderecoReceita = data.address?.street?.trim();
        if (
          normalizarTexto(cliente.A1_END) !== normalizarTexto(enderecoReceita)
        ) {
          divergencias.push({
            campo: "Endereço",
            valorERP: cliente.A1_END,
            valorReceita: enderecoReceita,
          });
        }

        // Bairro
        const bairroReceita = data.address?.district?.trim();
        if (
          normalizarTexto(cliente.A1_BAIRRO?.trim()).replace(/\s/g, "") !==
          normalizarTexto(bairroReceita?.trim()).replace(/\s/g, "")
        ) {
          divergencias.push({
            campo: "Bairro",
            valorERP: cliente.A1_BAIRRO,
            valorReceita: bairroReceita,
          });
        }

        // Inscrição Estadual
        const inscricoes = data.registrations || [];
        const ieUF = inscricoes.find((ie) => ie.state === cliente.A1_EST);
        const ieReceita = ieUF?.number?.replace(/\D/g, "") || "ISENTO";
        const ieERP = cliente.A1_INSCR?.replace(/\D/g, "") || "";

        if (ieERP !== ieReceita && !(ieERP === "" && ieReceita === "ISENTO")) {
          divergencias.push({
            campo: "Inscrição Estadual",
            valorERP: cliente.A1_INSCR || "ISENTO",
            valorReceita: ieReceita,
          });
        }

        resultadoFinal.push({
          codigo: cliente.A1_COD,
          nome: cliente.A1_NOME,
          divergencias,
        });
      } catch (err) {
        console.error("❌ Erro na consulta:", err.message);
        resultadoFinal.push({
          codigo: cliente.A1_COD,
          nome: cliente.A1_NOME,
          divergencias: [
            {
              campo: "Erro",
              valorERP: "-",
              valorReceita: "Erro na API",
            },
          ],
        });
      }
    }

    res.json(resultadoFinal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno ao validar clientes." });
  }
});

module.exports = router;
