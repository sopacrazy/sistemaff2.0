const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuração de upload para anexos (se necessário)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/chamados/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'chamado-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Garantir que a tabela de chat exista
const ensureChatTable = async (db) => {
    try {
        await db.promise().query(`
            CREATE TABLE IF NOT EXISTS chamado_chat (
                id INT AUTO_INCREMENT PRIMARY KEY,
                chamado_id INT NOT NULL,
                mensagem TEXT NOT NULL,
                remetente_tipo ENUM('usuario', 'tecnico', 'sistema') NOT NULL,
                remetente_nome VARCHAR(255),
                data_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
                anexo_path VARCHAR(255),
                FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

    } catch (error) {
        console.error('Erro ao verificar/criar tabela chamado_chat:', error);
    }
};

module.exports = (db, notifyUser) => {

    // Inicializar tabela
    ensureChatTable(db);

    // Helper functions
    const checkIsAdminOrSupport = (req) => {
        // Implementar lógica real de permissão se tiver tabela de perfis
        // Por enquanto, retorna true para facilitar testes ou checa se é usuário 'admin' ou da infra
        // No futuro: return req.user && (req.user.role === 'admin' || req.user.departamento === 'TI');
        return true;
    };

    /**
     * @route GET /chamados/almo-produtos
     * @desc Buscar produtos do almoxarifado (busca rápida)
     */
    router.get('/almo-produtos', async (req, res) => {
        try {
            const search = req.query.search || '';
            const query = `
                SELECT codigo, descricao, unidade 
                FROM almo_produtos 
                WHERE descricao LIKE ? OR codigo LIKE ?
                LIMIT 40
            `;
            const param = `%${search}%`;
            const [rows] = await db.promise().query(query, [param, param]);
            res.json(rows);
        } catch (error) {
            console.error('Erro ao buscar produtos do almoxarifado:', error);
            res.status(500).json({ error: 'Erro ao buscar produtos' });
        }
    });

    /**
     * @route POST /chamados/almo-solicitacoes
     * @desc Criar um novo pedido de Almoxarifado
     */
    router.post('/almo-solicitacoes', async (req, res) => {
        const { usuario, local, data_entrega, observacao, itens, setor } = req.body;

        if (!usuario || !data_entrega || !Array.isArray(itens) || itens.length === 0) {
            return res.status(400).json({ error: "Dados incompletos ou inválidos" });
        }

        const conn = await db.promise().getConnection();
        try {
            await conn.beginTransaction();

            const [result] = await conn.query(
                `INSERT INTO almo_solicitacoes (usuario, local, data_entrega, observacao, status, criado_em, anexo_caminho, setor) VALUES (?, ?, ?, ?, 'PENDENTE', NOW(), NULL, ?)`,
                [usuario, local || 'SISTEMA', data_entrega, observacao, setor || null]
            );

            const solicitacaoId = result.insertId;

            for (const item of itens) {
                const produtoDescricao = item.descricao || "Produto sem descrição";
                await conn.query(
                    `INSERT INTO almo_solicitacoes_itens (solicitacao_id, codigo_produto, descricao_produto, quantidade, quantidade_original, status_gestor) VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        solicitacaoId,
                        item.codigo,
                        produtoDescricao,
                        item.quantidade,
                        item.quantidade,
                        "SOLICITADO",
                    ]
                );
            }

            await conn.commit();
            console.log(`✅ Solicitação de Almoxarifado #${solicitacaoId} criada com sucesso por ${usuario}`);
            res.status(201).json({ message: 'Solicitação efetuada', id: solicitacaoId });
        } catch (err) {
            await conn.rollback();
            console.error("Erro ao salvar solicitação do almoxarifado:", err);
            res.status(500).json({ error: "Erro interno ao salvar solicitação" });
        } finally {
            conn.release();
        }
    });

    /**
     * @route GET /chamados/almo-solicitacoes/:usuario
     * @desc Listar histórico de pedidos de almoxarifado por usuário
     */
    router.get('/almo-solicitacoes/:usuario', async (req, res) => {
        const { usuario } = req.params;
        try {
            const [solicitacoes] = await db.promise().query(
                `SELECT id, usuario, local, data_entrega, observacao, obs_gestor, status, criado_em, anexo_caminho 
                 FROM almo_solicitacoes 
                 WHERE usuario = ? ORDER BY criado_em DESC`,
                [usuario]
            );

            if (solicitacoes.length > 0) {
                const ids = solicitacoes.map(s => s.id);
                const [todosItens] = await db.promise().query(
                    `SELECT solicitacao_id, quantidade, quantidade_original, descricao_produto as descricao 
                     FROM almo_solicitacoes_itens 
                     WHERE solicitacao_id IN (?)`,
                    [ids]
                );

                const itensPorSolicitacao = {};
                todosItens.forEach(item => {
                    if (!itensPorSolicitacao[item.solicitacao_id]) {
                        itensPorSolicitacao[item.solicitacao_id] = [];
                    }
                    itensPorSolicitacao[item.solicitacao_id].push(item);
                });

                for (const solicitacao of solicitacoes) {
                    solicitacao.items = itensPorSolicitacao[solicitacao.id] || [];
                    solicitacao.data_pedido = solicitacao.criado_em; // Mapeia p/ o frontend usar dayjs(pedido.data_pedido)
                }
            }

            res.json(solicitacoes);
        } catch (error) {
            console.error('Erro ao buscar histórico de solicitações:', error);
            res.status(500).json({ error: 'Erro ao buscar histórico' });
        }
    });

    /**
     * @route POST /chamados
     * @desc Criar um novo chamado
     */
    router.post('/', upload.single('anexo'), async (req, res) => {
        try {
            const {
                titulo,
                descricao,
                categoria,
                prioridade,
                solicitante_email,
                solicitante_nome
            } = req.body;

            const caminho_anexo = req.body.caminho_anexo || (req.file ? req.file.path : null);
            const status = 'Em Aberto';
            const data_abertura = new Date();

            // Validação básica
            if (!titulo || !descricao || !categoria || !prioridade) {
                return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
            }

            const query = `
                INSERT INTO chamados 
                (solicitante_nome, solicitante_email, titulo, descricao, categoria, prioridade, status, data_abertura, caminho_anexo) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const values = [
                solicitante_nome || 'Anônimo',
                solicitante_email || '', // Email opcional
                titulo,
                descricao,
                categoria,
                prioridade,
                status,
                data_abertura,
                caminho_anexo
            ];

            const [result] = await db.promise().query(query, values);

            res.status(201).json({
                message: 'Chamado criado com sucesso!',
                id: result.insertId
            });

        } catch (error) {
            console.error('Erro ao criar chamado:', error);
            res.status(500).json({ error: 'Erro interno ao criar chamado.' });
        }
    });

    /**
     * @route GET /chamados
     * @desc Listar chamados (filtrar por usuario se não for admin)
     */
    router.get('/', async (req, res) => {
        try {
            const { email } = req.query;

            // Se passar email, filtra. Se não, e for admin, mostra tudo.
            // Para simplificar agora: se tem email, filtra por ele.

            let query = 'SELECT * FROM chamados';
            let params = [];

            if (email) {
                query += ' WHERE solicitante_email = ?';
                params.push(email);
            } else if (req.query.username) {
                query += ' WHERE solicitante_nome = ?';
                params.push(req.query.username);
            }

            query += ' ORDER BY data_abertura DESC';

            const [rows] = await db.promise().query(query, params);
            res.json(rows);

        } catch (error) {
            console.error('Erro ao buscar chamados:', error);
            res.status(500).json({ error: 'Erro ao buscar chamados.' });
        }
    });

    /**
     * @route GET /chamados/:id
     * @desc Obter detalhes de um chamado
     */
    router.get('/:id', async (req, res) => {
        try {
            const [rows] = await db.promise().query('SELECT * FROM chamados WHERE id = ?', [req.params.id]);
            if (rows.length === 0) {
                return res.status(404).json({ error: 'Chamado não encontrado.' });
            }
            res.json(rows[0]);
        } catch (error) {
            console.error('Erro ao buscar chamado:', error);
            res.status(500).json({ error: 'Erro ao buscar detalhes do chamado.' });
        }
    });

    /**
     * @route PUT /chamados/:id/status
     * @desc Atualizar status do chamado (ex: Fechado)
     */
    router.put('/:id/status', async (req, res) => {
        try {
            const { status, tecnico_id } = req.body;
            const { id } = req.params;

            fs.appendFileSync("ws_logs.txt", `[${new Date().toISOString()}] ROUTE: PUT /chamados/${id}/status | Status: ${status}\n`);

            let query = 'UPDATE chamados SET status = ?, data_atualizacao = NOW()';
            const params = [status];

            if (status === 'Fechado') {
                query += ', data_fechamento = NOW()';
            }

            if (tecnico_id) {
                query += ', tecnico_id = ?';
                params.push(tecnico_id);
            }

            query += ' WHERE id = ?';
            params.push(id);

            await db.promise().query(query, params);

            // Notificar usuário sobre mudança de status
            if (notifyUser) {
                try {
                    const [chamado] = await db.promise().query('SELECT solicitante_nome, titulo FROM chamados WHERE id = ?', [id]);
                    if (chamado.length > 0) {
                        const solicitor = (chamado[0].solicitante_nome || '').trim();
                        console.log(`[NOTIFY] Ticket #${id} status changed to ${status}. Notifying ${solicitor}`);
                        notifyUser(solicitor, {
                            tipo: 'movimentacao_chamado',
                            chamado_id: id,
                            titulo: chamado[0].titulo,
                            status_novo: status,
                            timestamp: new Date()
                        });
                    }
                } catch (notifyErr) {
                    console.error('Erro ao notificar movimentação:', notifyErr);
                }
            }

            res.json({ message: 'Status atualizado com sucesso.' });

        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            res.status(500).json({ error: 'Erro ao atualizar status.' });
        }
    });

    /**
     * @route GET /chamados/:id/mensagens
     * @desc Listar mensagens do chat de um chamado
     */
    router.get('/:id/mensagens', async (req, res) => {
        try {
            const { id } = req.params;
            const query = `
                SELECT * FROM chamado_chat 
                WHERE chamado_id = ? 
                ORDER BY data_envio ASC
            `;
            const [rows] = await db.promise().query(query, [id]);
            res.json(rows);
        } catch (error) {
            console.error('Erro ao buscar mensagens:', error);
            res.status(500).json({ error: 'Erro ao buscar mensagens.' });
        }
    });

    /**
     * @route POST /chamados/:id/mensagens
     * @desc Enviar mensagem no chat
     */
    router.post('/:id/mensagens', upload.single('anexo'), async (req, res) => {
        try {
            const { id } = req.params;
            const { mensagem, remetente_tipo, remetente_nome, anexo_url } = req.body;
            // Prioriza URL do Supabase, senão verifica upload do multer
            const anexo_path = anexo_url || (req.file ? req.file.path : null);

            if (!mensagem && !anexo_path) {
                return res.status(400).json({ error: 'Mensagem vazia.' });
            }

            const query = `
                INSERT INTO chamado_chat (chamado_id, mensagem, remetente_tipo, remetente_nome, anexo_path)
                VALUES (?, ?, ?, ?, ?)
            `;

            await db.promise().query(query, [
                id,
                mensagem || '',
                remetente_tipo || 'usuario',
                remetente_nome || 'Anônimo',
                anexo_path
            ]);

            // Notificar usuário se a mensagem NÃO for dele (vinda do técnico ou sistema)
            if (notifyUser && remetente_tipo !== 'usuario') {
                try {
                    const [chamado] = await db.promise().query('SELECT solicitante_nome, titulo FROM chamados WHERE id = ?', [id]);
                    if (chamado.length > 0) {
                        const solicitor = (chamado[0].solicitante_nome || '').trim();
                        notifyUser(solicitor, {
                            tipo: 'mensagem_chamado',
                            chamado_id: id,
                            titulo: chamado[0].titulo,
                            remetente: remetente_nome,
                            timestamp: new Date()
                        });
                    }
                } catch (notifyErr) {
                    console.error('Erro ao notificar mensagem:', notifyErr);
                }
            }

            res.status(201).json({ message: 'Mensagem enviada.' });

        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            res.status(500).json({ error: 'Erro ao enviar mensagem.' });
        }
    });

    return router;
};
