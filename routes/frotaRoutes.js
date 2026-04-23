const express = require("express");
const router = express.Router();
const moment = require("moment");

module.exports = (db, dbOcorrencias) => {
    // --- MANUTENCAO ---

    // GET /frota/manutencao
    router.get("/manutencao", async (req, res) => {
        try {
            const [rows] = await dbOcorrencias.promise().query("SELECT * FROM frota_manutencao ORDER BY data_nf DESC, criado_em DESC");
            res.json(rows);
        } catch (error) {
            console.error("Erro ao buscar manutencao:", error);
            res.status(500).json({ error: "Erro interno" });
        }
    });

    // POST /frota/manutencao
    router.post("/manutencao", async (req, res) => {
        try {
            const { empresa, data_nf, nf, fornecedor_id, fornecedor_nome, valor_total, placa, veiculo_descricao, veiculo_tipo, tipo_manutencao, descricao, observacoes, usuario } = req.body;
            const query = `
                INSERT INTO frota_manutencao 
                (empresa, data_nf, nf, fornecedor_id, fornecedor_nome, valor_total, placa, veiculo_descricao, veiculo_tipo, tipo_manutencao, descricao, observacoes, usuario)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            await dbOcorrencias.promise().query(query, [empresa, data_nf, nf, fornecedor_id, fornecedor_nome, valor_total, placa, veiculo_descricao, veiculo_tipo, tipo_manutencao, descricao, observacoes, usuario]);
            res.json({ success: true });
        } catch (error) {
            console.error("Erro ao salvar manutencao:", error);
            res.status(500).json({ error: "Erro interno" });
        }
    });

    // PUT /frota/manutencao/:id
    router.put("/manutencao/:id", async (req, res) => {
        try {
            const { id } = req.params;
            const { empresa, data_nf, nf, fornecedor_id, fornecedor_nome, valor_total, placa, veiculo_descricao, veiculo_tipo, tipo_manutencao, descricao, observacoes, usuario } = req.body;
            const query = `
                UPDATE frota_manutencao 
                SET empresa = ?, data_nf = ?, nf = ?, fornecedor_id = ?, fornecedor_nome = ?, valor_total = ?, placa = ?, veiculo_descricao = ?, veiculo_tipo = ?, tipo_manutencao = ?, descricao = ?, observacoes = ?, usuario = ?
                WHERE id = ?
            `;
            await dbOcorrencias.promise().query(query, [empresa, data_nf, nf, fornecedor_id, fornecedor_nome, valor_total, placa, veiculo_descricao, veiculo_tipo, tipo_manutencao, descricao, observacoes, usuario, id]);
            res.json({ success: true });
        } catch (error) {
            console.error("Erro ao atualizar manutencao:", error);
            res.status(500).json({ error: "Erro interno" });
        }
    });

    // DELETE /frota/manutencao/:id
    router.delete("/manutencao/:id", async (req, res) => {
        try {
            const { id } = req.params;
            await dbOcorrencias.promise().query("DELETE FROM frota_manutencao WHERE id = ?", [id]);
            res.json({ success: true });
        } catch (error) {
            console.error("Erro ao remover manutencao:", error);
            res.status(500).json({ error: "Erro interno" });
        }
    });

    // --- PESQUISA MSSQL (PROTHEUS) ---

    // GET /frota/manutencao/dashboard
    router.get("/manutencao/dashboard", async (req, res) => {
        try {
            const { placa, dataInicio, dataFim } = req.query;
            let queryMatch = "WHERE 1=1";
            const params = [];

            if (placa) {
                queryMatch += " AND placa = ?";
                params.push(placa);
            }
            if (dataInicio && dataFim) {
                queryMatch += " AND data_nf BETWEEN ? AND ?";
                params.push(dataInicio, dataFim);
            }

            const queryStats = `
                SELECT 
                    SUM(valor_total) as total_geral,
                    COUNT(*) as total_registros
                FROM frota_manutencao
                ${queryMatch}
            `;

            const queryPorTipo = `
                SELECT tipo_manutencao as label, SUM(valor_total) as value
                FROM frota_manutencao
                ${queryMatch}
                GROUP BY tipo_manutencao
                ORDER BY value DESC
                ${req.query.limitTipo === 'true' ? '' : 'LIMIT 10'}
            `;

            const queryPorFornecedor = `
                SELECT fornecedor_nome as label, SUM(valor_total) as value
                FROM frota_manutencao
                ${queryMatch}
                GROUP BY fornecedor_nome
                ORDER BY value DESC
                ${req.query.limitFornecedor === 'true' ? '' : 'LIMIT 10'}
            `;

            const queryPorVeiculo = `
                SELECT CONCAT(placa, ' - ', veiculo_descricao) as label, SUM(valor_total) as value
                FROM frota_manutencao
                ${queryMatch}
                GROUP BY placa, veiculo_descricao
                ORDER BY value DESC
                ${req.query.limitVeiculo === 'true' ? '' : 'LIMIT 10'}
            `;

            const [stats] = await dbOcorrencias.promise().query(queryStats, params);
            const [porTipo] = await dbOcorrencias.promise().query(queryPorTipo, params);
            const [porFornecedor] = await dbOcorrencias.promise().query(queryPorFornecedor, params);
            const [porVeiculo] = await dbOcorrencias.promise().query(queryPorVeiculo, params);

            res.json({
                stats: stats[0],
                porTipo,
                porFornecedor,
                porVeiculo
            });
        } catch (error) {
            console.error("Erro no dashboard manutencao:", error);
            res.status(500).json({ error: "Erro interno" });
        }
    });

    // GET /frota/manutencao/tipos
    router.get("/manutencao/tipos", async (req, res) => {
        try {
            const [rows] = await dbOcorrencias.promise().query("SELECT * FROM frota_manutencao_tipos ORDER BY nome");
            res.json(rows);
        } catch (error) {
            console.error("Erro ao listar tipos:", error);
            res.status(500).json({ error: "Erro interno" });
        }
    });

    // POST /frota/manutencao/tipos
    router.post("/manutencao/tipos", async (req, res) => {
        const { nome } = req.body;
        if (!nome) return res.status(400).json({ error: "Nome obrigatório" });
        try {
            const [result] = await dbOcorrencias.promise().execute(
                "INSERT INTO frota_manutencao_tipos (nome) VALUES (?)",
                [nome]
            );
            res.status(201).json({ id: result.insertId, nome });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: "Este tipo já existe" });
            }
            console.error("Erro ao criar tipo:", error);
            res.status(500).json({ error: "Erro interno" });
        }
    });

    // GET /frota/veiculos/search?q=...
    router.get("/veiculos/search", async (req, res) => {
        try {
            const { q } = req.query;
            const poolMSSQL = req.app.locals.mssqlPool;
            if (!poolMSSQL) return res.status(500).json({ error: "Conexão com Protheus não disponível." });

            const request = poolMSSQL.request();
            if (q) {
                request.input('query', `%${q}%`);
            }
            
            const query = `
                SELECT TOP 50 DA3_PLACA AS placa, DA3_DESC AS descricao, DA3_TPROD AS tipo_veiculo 
                FROM DA3140 WITH (NOLOCK)
                WHERE DA3_FILIAL = '01' 
                AND DA3_PLACA != ''
                ${q ? "AND (DA3_PLACA LIKE @query OR DA3_DESC LIKE @query)" : ""}
                ORDER BY DA3_PLACA ASC
            `;
            
            const result = await request.query(query);
            res.json(result.recordset);
        } catch (error) {
            console.error("Erro ao buscar veiculos:", error.message);
            res.status(500).json({ error: "Erro ao buscar veiculos" });
        }
    });

    // GET /frota/fornecedores/search?q=...
    router.get("/fornecedores/search", async (req, res) => {
        try {
            const { q } = req.query;
            const poolMSSQL = req.app.locals.mssqlPool;
            if (!poolMSSQL) return res.status(500).json({ error: "Conexão com Protheus não disponível." });

            const request = poolMSSQL.request();
            if (q) {
                request.input('query', `%${q}%`);
            }
            
            const query = `
                SELECT TOP 50 A2_COD AS codigo, A2_NOME AS nome 
                FROM SA2140 WITH (NOLOCK)
                WHERE A2_FILIAL = '01' 
                AND D_E_L_E_T_ = ''
                ${q ? "AND (A2_NOME LIKE @query OR A2_COD LIKE @query)" : ""}
                ORDER BY A2_NOME ASC
            `;
            
            const result = await request.query(query);
            res.json(result.recordset);
        } catch (error) {
            console.error("Erro ao buscar fornecedores:", error.message);
            res.status(500).json({ error: "Erro ao buscar fornecedores" });
        }
    });

    // GET /frota/checklists?date=YYYY-MM-DD
    router.get("/checklists", async (req, res) => {
        try {
            const { date } = req.query;
            let targetDate = date;
            
            // Logic:
            // If date === 'all', fetch everything (no date filter).
            // If date is provided (YYYY-MM-DD), filter by it.
            // If date is missing/empty, default to TODAY.

            let queryChecklists = `
        SELECT 
            c.id, 
            c.motorista_id, 
            c.veiculo_placa, 
            c.data_hora, 
            c.created_at,
            COALESCE(l.nome_motorista, l.ZH_NOMMOT) as nome_motorista,
            l.ZH_MOTOR as codigo_motorista,
            l.username,
            c.resolvido
        FROM checklist_diario c
        LEFT JOIN login l ON c.motorista_id = l.ZH_MOTOR
      `;

            const queryParams = [];

            if (targetDate !== 'all') {
                if (!targetDate) {
                    targetDate = moment().format("YYYY-MM-DD");
                }
                queryChecklists += ` WHERE DATE(c.data_hora) = ?`;
                queryParams.push(targetDate);
            }

            queryChecklists += ` ORDER BY c.data_hora DESC`;

            const [checklists] = await db.promise().query(queryChecklists, queryParams);

            // 2. Enriquecer com ocorrências e respostas
            let enrichedChecklists = [];
            if (checklists.length > 0) {
                const checklistIds = checklists.map((c) => c.id);
                // Creating placeholders for IN clause is tricky if list is huge.
                // If fetching 'all', we might hit query size limits if we have thousands of checklists.
                // Assuming reasonable size for now, or we might need a JOIN approach in the future.
                // For safety with 'all', if list is > 1000, we might need to batch or change strategy.
                // But let's proceed with current logic as user requested "bring all".

                const placeholders = checklistIds.map(() => "?").join(",");

                const [ocorrencias] = await db.promise().query(
                    `SELECT * FROM checklist_ocorrencias WHERE checklist_id IN (${placeholders})`,
                    checklistIds
                );

                const [respostas] = await db.promise().query(
                    `SELECT * FROM checklist_respostas WHERE checklist_id IN (${placeholders})`,
                    checklistIds
                );

                enrichedChecklists = checklists.map((checklist) => {
                    const fotos = ocorrencias.filter((o) => o.checklist_id === checklist.id);
                    const resps = respostas.filter((r) => r.checklist_id === checklist.id);

                    // Verifica problemas pendentes (que não estejam resolvidos)
                    const pendingPhotos = fotos.filter(f => !f.resolvido);
                    const pendingResps = resps.filter(r => {
                        const s = String(r.status).toUpperCase();
                        const isProblem = s !== 'OK' && s !== 'C' && s !== '1' && s !== 'CONFORME';
                        return isProblem && !r.resolvido;
                    });

                    // hasIssuesOriginal: se teve algum problema originalmente
                    const hasIssuesOriginal = fotos.length > 0 || resps.some(r => {
                        const s = String(r.status).toUpperCase();
                        return s !== 'OK' && s !== 'C' && s !== '1' && s !== 'CONFORME';
                    });

                    // hasPendingIssues: se ainda tem algo a resolver
                    const hasPendingIssues = pendingPhotos.length > 0 || pendingResps.length > 0;

                    return {
                        ...checklist,
                        ocorrencias: fotos,
                        respostas: resps,
                        hasIssues: hasIssuesOriginal,
                        hasPendingIssues
                    };
                });
            }

            // 3. Buscar veículos PENDENTES
            // Se date === 'all', pending não faz sentido (quem não fez checklist em "toda a eternidade"?).
            // Retornamos vazio ou calculamos com base em HOJE se quiser.
            // Mas para compatibilidade, se 'all', pending é vazio.
            
            let pendingVehicles = [];

            if (targetDate !== 'all') {
                const [allPlates] = await db.promise().query(`
                    SELECT DISTINCT c.veiculo_placa,
                    (
                        SELECT COALESCE(l.nome_motorista, l.ZH_NOMMOT)
                        FROM checklist_diario sub
                        LEFT JOIN login l ON sub.motorista_id = l.ZH_MOTOR
                        WHERE sub.veiculo_placa = c.veiculo_placa
                        ORDER BY sub.data_hora DESC
                        LIMIT 1
                    ) as ultimo_motorista
                    FROM checklist_diario c
                    WHERE c.data_hora > NOW() - INTERVAL 60 DAY
                `);

                const activeVehicles = allPlates.filter(p => p.veiculo_placa && p.veiculo_placa !== 'null' && p.veiculo_placa !== 'undefined' && p.veiculo_placa !== 'LIBERACAO_ADM');

                // Filtrar quem já fez
                const donePlates = enrichedChecklists.map(c => c.veiculo_placa);

                pendingVehicles = activeVehicles.filter(v => !donePlates.includes(v.veiculo_placa)).map(v => ({
                    veiculo_placa: v.veiculo_placa,
                    ultimo_motorista: v.ultimo_motorista,
                    status: 'PENDENTE'
                }));
            }

            res.json({
                date: targetDate,
                completed: enrichedChecklists,
                pending: pendingVehicles
            });

        } catch (error) {
            console.error("Erro ao buscar checklists:", error);
            res.status(500).json({ error: "Erro interno ao buscar checklists." });
        }
    });



    // POST /frota/checklists/item/:id/resolve
    router.post("/checklists/item/:id/resolve", async (req, res) => {
        try {
            const { id } = req.params;
            const { resolvido } = req.body;
            await db.promise().query("UPDATE checklist_respostas SET resolvido = ? WHERE id = ?", [resolvido, id]);
            res.json({ success: true });
        } catch (error) {
            console.error("Erro ao resolver item:", error);
            res.status(500).json({ error: "Erro interno" });
        }
    });

    // POST /frota/checklists/photo/:id/resolve
    router.post("/checklists/photo/:id/resolve", async (req, res) => {
        try {
            const { id } = req.params;
            const { resolvido } = req.body;
            await db.promise().query("UPDATE checklist_ocorrencias SET resolvido = ? WHERE id = ?", [resolvido, id]);
            res.json({ success: true });
        } catch (error) {
            console.error("Erro ao resolver foto:", error);
            res.status(500).json({ error: "Erro interno" });
        }
    });

    // --- ROTAS DE MOTORISTAS (login table) ---

    // GET /frota/motoristas
    router.get("/motoristas", async (req, res) => {
        try {
            const [rows] = await db.promise().query("SELECT * FROM login ORDER BY nome_motorista ASC");
            res.json(rows);
        } catch (error) {
            console.error("Erro ao buscar motoristas:", error);
            res.status(500).json({ error: "Erro interno" });
        }
    });

    // POST /frota/motoristas
    router.post("/motoristas", async (req, res) => {
        try {
            const { username, password, nome_motorista, ZH_NOMMOT, ZH_MOTOR } = req.body;
            // Validação simples
            if (!username || !password) {
                 return res.status(400).json({ error: "Campos obrigatórios faltando." });
            }

            // Validação de Duplicidade (ZH_MOTOR)
            if (ZH_MOTOR) {
                const [existing] = await db.promise().query("SELECT id FROM login WHERE ZH_MOTOR = ?", [ZH_MOTOR]);
                if (existing.length > 0) {
                    return res.status(400).json({ error: "Já existe um motorista com este código (ZH_MOTOR)." });
                }
            }
            
            const query = "INSERT INTO login (username, password, nome_motorista, ZH_NOMMOT, ZH_MOTOR) VALUES (?, ?, ?, ?, ?)";
            await db.promise().query(query, [username, password, nome_motorista, ZH_NOMMOT, ZH_MOTOR]);
            res.json({ success: true });
        } catch (error) {
            console.error("Erro ao criar motorista:", error);
            res.status(500).json({ error: "Erro interno" });
        }
    });

     // PUT /frota/motoristas/:id
    router.put("/motoristas/:id", async (req, res) => {
        try {
            const { id } = req.params;
            const { username, password, nome_motorista, ZH_NOMMOT, ZH_MOTOR } = req.body;

             // Validação de Duplicidade (ZH_MOTOR)
             if (ZH_MOTOR) {
                const [existing] = await db.promise().query("SELECT id FROM login WHERE ZH_MOTOR = ? AND id != ?", [ZH_MOTOR, id]);
                if (existing.length > 0) {
                    return res.status(400).json({ error: "Já existe outro motorista com este código (ZH_MOTOR)." });
                }
            }
            
            const query = "UPDATE login SET username = ?, password = ?, nome_motorista = ?, ZH_NOMMOT = ?, ZH_MOTOR = ? WHERE id = ?";
            await db.promise().query(query, [username, password, nome_motorista, ZH_NOMMOT, ZH_MOTOR, id]);
            res.json({ success: true });
        } catch (error) {
           console.error("Erro ao atualizar motorista:", error);
            res.status(500).json({ error: "Erro interno" });
        }
    });

    // DELETE /frota/motoristas/:id
    router.delete("/motoristas/:id", async (req, res) => {
        try {
            const { id } = req.params;
            await db.promise().query("DELETE FROM login WHERE id = ?", [id]);
            res.json({ success: true });
        } catch (error) {
            console.error("Erro ao remover motorista:", error);
            res.status(500).json({ error: "Erro interno" });
        }
    }); 

    return router;
};
