const express = require("express");
const router = express.Router();

module.exports = (dbOcorrencias) => {
    // Listar todos os abastecimentos
    router.get("/", async (req, res) => {
        try {
            const [rows] = await dbOcorrencias.promise().query(
                "SELECT * FROM frota_abastecimento ORDER BY data_registro DESC, criado_em DESC"
            );
            res.json(rows);
        } catch (error) {
            console.error("Erro ao buscar abastecimentos:", error);
            res.status(500).json({ error: "Erro interno ao buscar abastecimentos" });
        }
    });

    // Buscar o último KM registrado para uma placa específica
    router.get("/ultimo-km/:placa", async (req, res) => {
        try {
            const { placa } = req.params;
            // Limpa a placa da requisição (remove traços e espaços)
            const placaLimpa = placa.replace(/[^a-zA-Z0-9]/g, '');

            const query = `
                SELECT km_abast 
                FROM frota_abastecimento 
                WHERE REPLACE(REPLACE(placa, '-', ''), ' ', '') = ? 
                ORDER BY id DESC 
                LIMIT 1
            `;

            const [rows] = await dbOcorrencias.promise().query(query, [placaLimpa]);

            if (rows.length > 0) {
                res.json({ ultimo_km: rows[0].km_abast });
            } else {
                res.json({ ultimo_km: 0 });
            }
        } catch (error) {
            console.error("Erro ao buscar último KM:", error);
            res.status(500).json({ error: "Erro interno ao buscar último KM" });
        }
    });

    // Buscar todas as placas registradas no Protheus (DA3140)
    router.get("/veiculos-protheus", async (req, res) => {
        try {
            const poolMSSQL = req.app.locals.mssqlPool;
            if (!poolMSSQL) {
                return res.status(500).json({ error: "Conexão com Protheus não disponível no momento." });
            }

            const query = `
                SELECT DA3_PLACA AS placa, DA3_DESC AS descricao
                FROM DA3140 WITH (NOLOCK)
                WHERE DA3_FILIAL = '01' 
                AND D_E_L_E_T_ = ''
                AND DA3_PLACA != ''
                ORDER BY DA3_PLACA ASC
            `;
            
            const result = await poolMSSQL.request().query(query);
            res.json(result.recordset);
        } catch (error) {
            console.error("Erro ao buscar veículos no Protheus:", error);
            res.status(500).json({ error: "Erro interno ao buscar veículos no Protheus" });
        }
    });

    // Buscar todos os motoristas registrados no Protheus (DA4140)
    router.get("/motoristas-protheus", async (req, res) => {
        try {
            const poolMSSQL = req.app.locals.mssqlPool;
            if (!poolMSSQL) {
                return res.status(500).json({ error: "Conexão com Protheus não disponível." });
            }

            const query = `
                SELECT DA4_NOME AS nome
                FROM DA4140 WITH (NOLOCK)
                WHERE DA4_FILIAL = '01' 
                AND D_E_L_E_T_ = ''
                AND DA4_NOME != ''
                ORDER BY DA4_NOME ASC
            `;

            const result = await poolMSSQL.request().query(query);
            res.json(result.recordset);
        } catch (error) {
            console.error("Erro ao buscar motoristas no Protheus:", error);
            res.status(500).json({ error: "Erro interno ao buscar motoristas no Protheus" });
        }
    });

    // Salvar novo abastecimento
    router.post("/", async (req, res) => {
        try {
            const {
                tipo, empresa, placa, data_registro, motorista, requerimento, cupom,
                posto, data_abastecido, hora, km_abast, km_abast_atual, km_rod,
                km_lt, quantidade, preco, valor_venda, valor_correto, descricao,
                obs, nome_produto, usuario
            } = req.body;


            const query = `
                INSERT INTO frota_abastecimento 
                (tipo, empresa, placa, data_registro, motorista, requerimento, cupom, 
                posto, data_abastecido, hora, km_abast, km_abast_atual, km_rod, 
                km_lt, quantidade, preco, valor_venda, valor_correto, descricao, 
                obs, nome_produto, usuario)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const [result] = await dbOcorrencias.promise().query(query, [
                tipo || '', 
                empresa || '', 
                placa || '', 
                data_registro || new Date().toISOString().split('T')[0], 
                motorista || '', 
                requerimento || '', 
                cupom || '',
                posto || '', 
                data_abastecido || new Date().toISOString().split('T')[0], 
                hora || '', 
                parseFloat(km_abast) || 0, 
                parseFloat(km_abast_atual) || 0, 
                parseFloat(km_rod) || 0,
                parseFloat(km_lt) || 0, 
                parseFloat(quantidade) || 0, 
                parseFloat(preco) || 0, 
                parseFloat(valor_venda) || 0, 
                parseFloat(valor_correto) || 0,
                descricao || '', 
                obs || '', 
                nome_produto || '', 
                usuario || 'Sistema'
            ]);

            res.json({ success: true, id: result.insertId });
        } catch (error) {
            console.error("ERRO CRÍTICO AO SALVAR NO MYSQL:", error.message);
            res.status(500).json({ error: "Erro interno", detail: error.message });
        }
    });

    // Atualizar abastecimento
    router.put("/:id", async (req, res) => {
        try {
            const { id } = req.params;
            const {
                tipo, empresa, placa, data_registro, motorista, requerimento, cupom,
                posto, data_abastecido, hora, km_abast, km_abast_atual, km_rod,
                km_lt, quantidade, preco, valor_venda, valor_correto, descricao,
                obs, nome_produto, usuario
            } = req.body;

            const query = `
                UPDATE frota_abastecimento 
                SET tipo = ?, empresa = ?, placa = ?, data_registro = ?, motorista = ?, 
                    requerimento = ?, cupom = ?, posto = ?, data_abastecido = ?, hora = ?, 
                    km_abast = ?, km_abast_atual = ?, km_rod = ?, km_lt = ?, quantidade = ?, 
                    preco = ?, valor_venda = ?, valor_correto = ?, descricao = ?, 
                    obs = ?, nome_produto = ?, usuario = ?
                WHERE id = ?
            `;

            await dbOcorrencias.promise().query(query, [
                tipo, empresa, placa, data_registro, motorista, requerimento, cupom,
                posto, data_abastecido, hora, km_abast || 0, km_abast_atual || 0, km_rod || 0,
                km_lt || 0, quantidade || 0, preco || 0, valor_venda || 0, valor_correto || 0,
                descricao, obs, nome_produto, usuario, id
            ]);

            res.json({ success: true });
        } catch (error) {
            console.error("Erro ao atualizar abastecimento:", error);
            res.status(500).json({ error: "Erro interno ao atualizar abastecimento" });
        }
    });

    // Remover abastecimento
    router.delete("/:id", async (req, res) => {
        try {
            const { id } = req.params;
            await dbOcorrencias.promise().query("DELETE FROM frota_abastecimento WHERE id = ?", [id]);
            res.json({ success: true });
        } catch (error) {
            console.error("Erro ao remover abastecimento:", error);
            res.status(500).json({ error: "Erro interno ao remover abastecimento" });
        }
    });

    return router;
};
