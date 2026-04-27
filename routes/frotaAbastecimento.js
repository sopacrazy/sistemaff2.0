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
                tipo, empresa, placa, data_registro, motorista, requerimento, cupom,
                posto, data_abastecido, hora, km_abast || 0, km_abast_atual || 0, km_rod || 0,
                km_lt || 0, quantidade || 0, preco || 0, valor_venda || 0, valor_correto || 0,
                descricao, obs, nome_produto, usuario
            ]);

            res.json({ success: true, id: result.insertId });
        } catch (error) {
            console.error("Erro ao salvar abastecimento:", error);
            res.status(500).json({ error: "Erro interno ao salvar abastecimento" });
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
