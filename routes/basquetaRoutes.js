const express = require("express");
const sql = require("mssql");

module.exports = (dbOcorrencias, getPool) => {
    const router = express.Router();

    // -- INICIALIZAÇÃO DO BANCO (MySQL Ocorrências) --
    const initDB = async () => {
        try {
            const conn = await dbOcorrencias.promise().getConnection();
            
            // Tabela para fechamento diário total
            await conn.query(`
                CREATE TABLE IF NOT EXISTS basquetas_fechamento (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    data_fechamento DATE NOT NULL,
                    cliente VARCHAR(20) NOT NULL,
                    saldo_inicial INT DEFAULT 0,
                    total_saida INT DEFAULT 0,
                    total_entrada INT DEFAULT 0,
                    saldo_final INT NOT NULL,
                    saldo_fisico INT DEFAULT 0,
                    estoque_empresa_total INT DEFAULT 0,
                    usuario VARCHAR(50),
                    data_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_fechamento (cliente, data_fechamento)
                )
            `);

            // Garantir que as novas colunas existam para bases já criadas
            const [colsFech] = await conn.query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'basquetas_fechamento' 
                AND COLUMN_NAME IN ('saldo_inicial', 'total_saida', 'total_entrada')
            `);
            const existingColsFech = colsFech.map(c => c.COLUMN_NAME.toLowerCase());
            if (!existingColsFech.includes('saldo_inicial')) await conn.query("ALTER TABLE basquetas_fechamento ADD COLUMN saldo_inicial INT DEFAULT 0 AFTER cliente");
            if (!existingColsFech.includes('total_saida')) await conn.query("ALTER TABLE basquetas_fechamento ADD COLUMN total_saida INT DEFAULT 0 AFTER saldo_inicial");
            if (!existingColsFech.includes('total_entrada')) await conn.query("ALTER TABLE basquetas_fechamento ADD COLUMN total_entrada INT DEFAULT 0 AFTER total_saida");


            // Tabela para inventário diário (Auditoria)
            await conn.query(`
                CREATE TABLE IF NOT EXISTS basquetas_inventario (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    cliente VARCHAR(20) NOT NULL,
                    data_inventario DATE NOT NULL,
                    saldo_sistema INT NOT NULL,
                    saldo_fisico INT NOT NULL,
                    divergencia INT NOT NULL,
                    usuario VARCHAR(50),
                    data_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_cliente_data (cliente, data_inventario)
                )
            `);

            // Tabela para ajustes manuais de clientes
            await conn.query(`
                CREATE TABLE IF NOT EXISTS basquetas_mov_manual (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    cliente VARCHAR(20) NOT NULL,
                    nome VARCHAR(100),
                    quantidade INT NOT NULL,
                    tipo ENUM('SAIDA', 'ENTRADA', 'SALDO_INICIAL') DEFAULT 'SALDO_INICIAL',
                    bilhete VARCHAR(50),
                    motorista VARCHAR(100),
                    data_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
                    usuario VARCHAR(50)
                )
            `);

            // Migração robusta de colunas (para versões do MySQL sem 'ADD COLUMN IF NOT EXISTS')
            const [columns] = await conn.query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'basquetas_mov_manual' 
                AND COLUMN_NAME IN ('bilhete', 'motorista')
            `);

            const existingColumns = columns.map(c => c.COLUMN_NAME.toLowerCase());
            
            if (!existingColumns.includes('bilhete')) {
                await conn.query("ALTER TABLE basquetas_mov_manual ADD COLUMN bilhete VARCHAR(50) AFTER tipo");
                console.log("Coluna 'bilhete' adicionada em basquetas_mov_manual");
            }
            if (!existingColumns.includes('motorista')) {
                await conn.query("ALTER TABLE basquetas_mov_manual ADD COLUMN motorista VARCHAR(100) AFTER bilhete");
                console.log("Coluna 'motorista' adicionada em basquetas_mov_manual");
            }

            // Tabela para configurações globais (ex: estoque total)
            await conn.query(`
                CREATE TABLE IF NOT EXISTS basquetas_config (
                    chave VARCHAR(50) PRIMARY KEY,
                    valor VARCHAR(100) NOT NULL,
                    last_update DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);

            conn.release();
        } catch (err) {
            console.error("ERRO AO INICIALIZAR TABELAS DE BASQUETAS:", err);
        }
    };

    initDB();

    // 1. Resumo + Configurações
    router.get("/resumo", async (req, res) => {
        const { data = new Date().toISOString().split('T')[0] } = req.query;
        console.log("--- INÍCIO RESUMO --- Data solicitada:", data);
        
        const pool = getPool();
        if (!pool) return res.status(503).json({ error: "Servidor fora de serviço (Protheus)." });

        try {
            // A. Verificar se ESSE DIA já está fechado
            const [diaFechado] = await dbOcorrencias.promise().query(`
                SELECT cliente, saldo_inicial, total_saida, total_entrada, saldo_final, saldo_fisico, estoque_empresa_total, data_fechamento
                FROM basquetas_fechamento 
                WHERE data_fechamento = ?
            `, [data]);


            console.log("Dia Fechado?", diaFechado.length > 0 ? "SIM" : "NÃO");

            if (diaFechado.length > 0) {
                // DIA FECHADO: Retornar apenas os dados congelados
                // 1. Buscar inventários específicos desta data (Divergências)
                const [invAuditoria] = await dbOcorrencias.promise().query(`
                    SELECT cliente, saldo_sistema, saldo_fisico, divergencia 
                    FROM basquetas_inventario 
                    WHERE DATE(data_inventario) = ?
                `, [data]);

                // 2. Buscar Saídas do Protheus p/ este dia (p/ análise histórica)
                const requestProth = pool.request();
                requestProth.input("filial", sql.VarChar, "01");
                const dtF = data.replace(/-/g, '');
                requestProth.input("dt", sql.VarChar, dtF);
                
                const resSaidas = await requestProth.query(`
                    SELECT Z4.Z4_CLIENTE as cod, SUM(Z5.Z5_QTDE) as saida
                    FROM SZ5140 Z5 (NOLOCK)
                    INNER JOIN SZ4140 Z4 (NOLOCK) ON Z4.Z4_FILIAL = Z5.Z5_FILIAL AND Z4.Z4_BILHETE = Z5.Z5_BILHETE
                    WHERE Z5.Z5_FILIAL = @filial 
                    AND Z5.Z5_DATA = @dt 
                    AND Z5.Z5_CODPRO = '499.001'
                    AND Z4.D_E_L_E_T_ = '' AND Z5.D_E_L_E_T_ = ''
                    GROUP BY Z4.Z4_CLIENTE
                `);
                const mapSaidas = new Map();
                resSaidas.recordset.forEach(s => mapSaidas.set(s.cod.trim(), s.saida));

                // 3. Buscar Nomes Oficiais (Reforçado)
                const ids = diaFechado.map(f => `'${f.cliente.trim()}'`).join(",");
                let mapNomes = new Map();
                if (ids) {
                    const poolNomes = getPool();
                    // Cadastro Geral
                    const resNomes = await poolNomes.request().query(`
                        SELECT RTRIM(A1_COD) as COD, RTRIM(A1_NOME) as NOME 
                        FROM SA1010 
                        WHERE (RTRIM(A1_COD) IN (${ids}) OR LTRIM(RTRIM(A1_COD)) IN (${ids}))
                        AND D_E_L_E_T_ = ''
                    `);
                    resNomes.recordset.forEach(n => mapNomes.set(n.COD, n.NOME));

                    // Fallback SZ4140
                    const faltamNoFechado = diaFechado.filter(f => !mapNomes.has(f.cliente.trim()));
                    if (faltamNoFechado.length > 0) {
                        const idsRestante = faltamNoFechado.map(f => `'${f.cliente.trim()}'`).join(",");
                        const resF = await poolNomes.request().query(`
                            SELECT DISTINCT RTRIM(Z4_CLIENTE) as COD, RTRIM(Z4_NOMCLI) as NOME 
                            FROM SZ4140 
                            WHERE RTRIM(Z4_CLIENTE) IN (${idsRestante})
                            AND D_E_L_E_T_ = ''
                        `);
                        resF.recordset.forEach(n => mapNomes.set(n.COD, n.NOME));
                    }
                }

                const clientes = diaFechado.map(f => {
                    const cid = f.cliente.trim();
                    const inv = invAuditoria.find(i => i.cliente.trim() === cid);
                    return {
                        cliente: cid,
                        nome: mapNomes.get(cid) || "CLIENTE " + cid,
                        saldoFechamento: f.saldo_inicial || 0,
                        totalSaida: f.total_saida || mapSaidas.get(cid) || 0,
                        totalEntrada: f.total_entrada || 0,
                        quantidadeAtual: f.saldo_final,
                        saldoFisico: inv ? inv.saldo_fisico : (f.saldo_fisico || 0),
                        divergencia: inv ? inv.divergencia : 0,
                        isClosed: true
                    };
                });


                return res.json({ success: true, clientes: clientes, config: { totalEstoque: diaFechado[0].estoque_empresa_total }, isClosed: true });
            }

            // 0. Descobrir a data do ÚLTIMO FECHAMENTO (antes da data solicitada)
            const [lastFech] = await dbOcorrencias.promise().query(`
                SELECT MAX(data_fechamento) as ultima_data 
                FROM basquetas_fechamento
                WHERE data_fechamento < ?
            `, [data]);
            
            const dataBase = lastFech[0].ultima_data; 
            
            // Lógica de datas para consulta:
            let dataProtheusStart, dataManualStart;
            if (dataBase) {
                const nextDay = new Date(dataBase);
                nextDay.setDate(nextDay.getDate() + 1);
                dataProtheusStart = nextDay.toISOString().split('T')[0].replace(/-/g, '');
                dataManualStart = nextDay.toISOString().split('T')[0];
            } else {
                dataProtheusStart = "20260408"; // Data inicial do sistema
                dataManualStart = "2026-04-08";
            }
            const dataProtheusEnd = data.replace(/-/g, '');
            const dataManualEnd = data;



            // 1. Carregar Saldos do Último Fechamento (se existir)
            const clientMap = new Map();
            if (dataBase) {
                const [fechados] = await dbOcorrencias.promise().query(`
                    SELECT cliente, saldo_final, estoque_empresa_total 
                    FROM basquetas_fechamento 
                    WHERE data_fechamento = ?
                `, [dataBase]);
                
                fechados.forEach(f => {
                    clientMap.set(f.cliente, {
                        cliente: f.cliente,
                        nome: "Carregando...",
                        totalSaida: 0,
                        quantidadeAtual: f.saldo_final,
                        saldoFechamento: f.saldo_final
                    });
                });
            }

            // A. Consultas Protheus (Vendas APÓS o último fechamento até a data selecionada)
            const request = pool.request();
            request.input("filial", sql.VarChar, "01");
            request.input("dataIni", sql.VarChar, dataProtheusStart);
            request.input("dataEnd", sql.VarChar, dataProtheusEnd);

            const QUERY_PROTHEUS = `
                SELECT 
                    Z4.Z4_CLIENTE AS cod_cliente,
                    MAX(Z4.Z4_NOMCLI) AS nome_cliente,
                    SUM(Z5.Z5_QTDE) AS total_saida
                FROM SZ5140 Z5 (NOLOCK)
                INNER JOIN SZ4140 Z4 (NOLOCK) ON Z4.Z4_FILIAL = Z5.Z5_FILIAL AND Z4.Z4_BILHETE = Z5.Z5_BILHETE AND Z4.D_E_L_E_T_ = ''
                WHERE Z5.Z5_FILIAL = @filial
                AND Z5.Z5_CODPRO = '499.001'
                AND Z5.Z5_DATA BETWEEN @dataIni AND @dataEnd
                AND Z5.D_E_L_E_T_ = ''
                GROUP BY Z4.Z4_CLIENTE
            `;
            const resultProth = await request.query(QUERY_PROTHEUS);
            const protheusData = resultProth.recordset;
            console.log("Total Saídas Protheus:", protheusData.length);

            // B. Buscar Ajustes Manuais (Apenas ENTRADA e SAIDA, ignorando ajustes de inventário)
            const [ajustes] = await dbOcorrencias.promise().query(`
                SELECT 
                    cliente, 
                    nome as nome_manual, 
                    SUM(CASE WHEN tipo = 'ENTRADA' THEN -quantidade WHEN tipo = 'SAIDA' THEN quantidade ELSE 0 END) as saldo_ajuste,
                    SUM(CASE WHEN tipo = 'ENTRADA' THEN quantidade ELSE 0 END) as total_entrada
                FROM basquetas_mov_manual
                WHERE DATE(data_registro) BETWEEN ? AND ?
                AND tipo IN ('ENTRADA', 'SAIDA')
                GROUP BY cliente, nome
            `, [dataManualStart, dataManualEnd]);
            console.log("Total Ajustes Manuais:", ajustes.length);

            // C. Buscar Configuração de Estoque Total
            const [config] = await dbOcorrencias.promise().query("SELECT valor FROM basquetas_config WHERE chave = 'total_estoque'");
            const totalEstoqueGlobal = config.length > 0 ? parseInt(config[0].valor) : 1500;

            // D. Buscar Inventário ESPECÍFICO DESTA DATA
            const [inventario] = await dbOcorrencias.promise().query(`
                SELECT cliente, saldo_fisico, divergencia 
                FROM basquetas_inventario 
                WHERE DATE(data_inventario) = ?
            `, [data]);
            console.log("Total Itens Inventário (Contagem):", inventario.length);

            // E. Recuperar nomes que faltam (Reforçado)
            const idsParaNome = Array.from(clientMap.keys()).filter(k => clientMap.get(k).nome === "Carregando...");
            if (idsParaNome.length > 0) {
                const iStr = idsParaNome.map(id => `'${id.trim()}'`).join(",");
                const pool = getPool();
                
                // Primeiro na SA1010 (Cadastro Geral)
                const resNomes = await pool.request().query(`
                    SELECT RTRIM(A1_COD) as COD, RTRIM(A1_NOME) as NOME 
                    FROM SA1010 
                    WHERE (RTRIM(A1_COD) IN (${iStr}) OR LTRIM(RTRIM(A1_COD)) IN (${iStr}))
                    AND D_E_L_E_T_ = ''
                `);
                resNomes.recordset.forEach(n => { if (clientMap.has(n.COD)) clientMap.get(n.COD).nome = n.NOME; });

                // Segundo na SZ4140 (Histórico de Vendas) para os que ainda faltam
                const aindaFaltam = Array.from(clientMap.keys()).filter(k => clientMap.get(k).nome === "Carregando...");
                if (aindaFaltam.length > 0) {
                    const iStrRest = aindaFaltam.map(id => `'${id.trim()}'`).join(",");
                    const resFallback = await pool.request().query(`
                        SELECT DISTINCT RTRIM(Z4_CLIENTE) as COD, RTRIM(Z4_NOMCLI) as NOME 
                        FROM SZ4140 
                        WHERE RTRIM(Z4_CLIENTE) IN (${iStrRest})
                        AND D_E_L_E_T_ = ''
                    `);
                    resFallback.recordset.forEach(n => { if (clientMap.has(n.COD)) clientMap.get(n.COD).nome = n.NOME; });
                }
            }

            // F. Mesclar Dados
            
            // Adicionar Protheus (Vendas do dia)
            protheusData.forEach(p => {
                const cod = p.cod_cliente.trim();
                const vSaida = Number(p.total_saida || 0);

                if (clientMap.has(cod)) {
                    const obj = clientMap.get(cod);
                    obj.nome = p.nome_cliente.trim();
                    obj.totalSaida = vSaida;
                    obj.quantidadeAtual = Number(obj.quantidadeAtual || 0) + vSaida; 
                } else {
                    clientMap.set(cod, {
                        cliente: cod,
                        nome: p.nome_cliente.trim(),
                        saldoFechamento: 0,
                        totalSaida: vSaida,
                        totalEntrada: 0,
                        quantidadeAtual: vSaida
                    });
                }
            });

            // Aplicar Ajustes
            ajustes.forEach(a => {
                const cid = a.cliente.trim();
                const existing = clientMap.get(cid);
                if (existing) {
                    existing.quantidadeAtual = Number(existing.quantidadeAtual || 0) + Number(a.saldo_ajuste || 0);
                    existing.totalEntrada = Number(a.total_entrada || 0);
                    if (existing.nome === "Carregando..." && a.nome_manual) existing.nome = a.nome_manual;
                } else {
                    clientMap.set(cid, {
                        cliente: cid,
                        nome: a.nome_manual || "CLIENTE " + cid,
                        totalSaida: 0,
                        totalEntrada: Number(a.total_entrada || 0),
                        quantidadeAtual: Number(a.saldo_ajuste || 0),
                        saldoFechamento: 0
                    });
                }
            });

            console.log("Finalizando resumo... Total no clientMap:", clientMap.size);

            res.json({
                success: true,
                clientes: Array.from(clientMap.values()),
                config: {
                    totalEstoque: totalEstoqueGlobal
                },
                isClosed: false
            });

        } catch (err) {
            console.error("ERRO /basquetas/resumo:", err);
            res.status(500).json({ error: "Erro ao processar resumo", details: err.message });
        }
    });

    // 2. Salvar Movimentação Manual (Retorno ou Ajuste)
    router.post("/ajuste-cliente", async (req, res) => {
        const { cliente, nome, quantidade, tipo, usuario, motorista, bilhete } = req.body;
        
        if (!cliente || !quantidade) return res.status(400).json({ error: "Dados incompletos" });

        // Verificar Bloqueio de Fechamento
        const dataAjuste = new Date().toISOString().split('T')[0];
        const [fechado] = await dbOcorrencias.promise().query("SELECT 1 FROM basquetas_fechamento WHERE data_fechamento = ?", [dataAjuste]);
        if (fechado.length > 0) return res.status(403).json({ error: "Este dia já está fechado. Alterações não permitidas." });

        try {
            await dbOcorrencias.promise().query(
                "INSERT INTO basquetas_mov_manual (cliente, nome, quantidade, tipo, usuario, motorista, bilhete) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [cliente, nome, parseFloat(quantidade), tipo || 'ENTRADA', usuario || 'SISTEMA', motorista || null, bilhete || null]
            );
            res.json({ success: true, message: "Movimentação registrada com sucesso" });
        } catch (err) {
            console.error("ERRO /basquetas/ajuste-cliente:", err);
            res.status(500).json({ error: "Erro MySQL", details: err.message });
        }
    });

    // 3. Salvar Estoque Total da Empresa
    router.post("/estoque-empresa", async (req, res) => {
        const { valor } = req.body;
        if (valor === undefined) return res.status(400).json({ error: "Valor não informado" });

        try {
            await dbOcorrencias.promise().query(
                "INSERT INTO basquetas_config (chave, valor) VALUES ('total_estoque', ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)",
                [valor.toString()]
            );
            res.json({ success: true, message: "Estoque atualizado" });
        } catch (err) {
            console.error("ERRO /basquetas/estoque-empresa:", err);
            res.status(500).json({ error: "Erro MySQL", details: err.message });
        }
    });

    // 5. Salvar Inventário Diário (Snaphot)
    router.post("/inventario", async (req, res) => {
        const { cliente, saldo_sistema, saldo_fisico, usuario } = req.body;
        const hoje = new Date().toISOString().split('T')[0];

        // Bloqueio se fechado
        const [fechado] = await dbOcorrencias.promise().query("SELECT 1 FROM basquetas_fechamento WHERE data_fechamento = ?", [hoje]);
        if (fechado.length > 0) return res.status(403).json({ error: "Inventário bloqueado: Dia já fechado." });
        
        if (!cliente || saldo_sistema === undefined || saldo_fisico === undefined) {
            return res.status(400).json({ error: "Dados incompletos" });
        }

        const divergencia = saldo_fisico - saldo_sistema;

        try {
            await dbOcorrencias.promise().query(`
                INSERT INTO basquetas_inventario (cliente, data_inventario, saldo_sistema, saldo_fisico, divergencia, usuario)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    saldo_sistema = VALUES(saldo_sistema),
                    saldo_fisico = VALUES(saldo_fisico),
                    divergencia = VALUES(divergencia),
                    usuario = VALUES(usuario),
                    data_registro = CURRENT_TIMESTAMP
            `, [cliente, hoje, saldo_sistema, saldo_fisico, divergencia, usuario || 'SISTEMA']);

            res.json({ success: true, message: "Inventário registrado" });
        } catch (err) {
            console.error("ERRO /basquetas/inventario:", err);
            res.status(500).json({ error: "Erro MySQL", details: err.message });
        }
    });

    // 7. Salvar Fechamento Diário
    router.post("/fechar-dia", async (req, res) => {
        // ... (já implementado acima)
        const { data, clientes, estoque_empresa, usuario } = req.body;
        
        if (!data || !clientes) {
            return res.status(400).json({ error: "Dados incompletos" });
        }

        try {
            const conn = await dbOcorrencias.promise().getConnection();
            try {
                await conn.beginTransaction();

                for (const cli of clientes) {
                    // Se houver saldo físico informado (contagem), ele vira o saldo_final para o dia seguinte.
                    // Caso contrário (contagem vazia ou zero), usamos o saldo sistêmico (quantidadeAtual).
                    const saldoRealParaProximoDia = (cli.saldoFisico !== undefined && cli.saldoFisico !== null && cli.saldoFisico !== 0) ? cli.saldoFisico : cli.quantidadeAtual;

                    await conn.query(`
                        INSERT INTO basquetas_fechamento (
                            data_fechamento, cliente, saldo_inicial, total_saida, total_entrada, 
                            saldo_final, saldo_fisico, estoque_empresa_total, usuario
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE 
                            saldo_inicial = VALUES(saldo_inicial),
                            total_saida = VALUES(total_saida),
                            total_entrada = VALUES(total_entrada),
                            saldo_final = VALUES(saldo_final),
                            saldo_fisico = VALUES(saldo_fisico),
                            estoque_empresa_total = VALUES(estoque_empresa_total),
                            usuario = VALUES(usuario),
                            data_registro = CURRENT_TIMESTAMP
                    `, [
                        data, 
                        cli.cliente, 
                        cli.saldoFechamento || 0, 
                        cli.totalSaida || 0, 
                        cli.totalEntrada || 0, 
                        saldoRealParaProximoDia, 
                        cli.saldoFisico || 0, 
                        estoque_empresa, 
                        usuario
                    ]);
                }


                await conn.commit();
                res.json({ success: true, message: "Fechamento realizado com sucesso" });
            } catch (err) {
                await conn.rollback();
                throw err;
            } finally {
                conn.release();
            }
        } catch (err) {
            console.error("ERRO /basquetas/fechar-dia:", err);
            res.status(500).json({ error: "Erro MySQL", details: err.message });
        }
    });

    // 9. Reabrir Dia (Excluir Fechamento)
    router.delete("/reabrir-dia", async (req, res) => {
        const { data } = req.query;
        if (!data) return res.status(400).json({ error: "Data não informada" });

        try {
            await dbOcorrencias.promise().query("DELETE FROM basquetas_fechamento WHERE data_fechamento = ?", [data]);
            res.json({ success: true, message: "Dia reaberto com sucesso" });
        } catch (err) {
            console.error("ERRO /basquetas/reabrir-dia:", err);
            res.status(500).json({ error: "Erro ao reabrir dia", details: err.message });
        }
    });

    // 10. Histórico de Fechamentos (Opcional, para consulta)
    router.get("/movimentacoes/:cliente", async (req, res) => {
        // ... (mesma lógica anterior, mas talvez unindo com os registros manuais depois)
        const pool = getPool();
        const { cliente } = req.params;
        const { filial = "01", dataIni = "20260330" } = req.query;

        try {
            const request = pool.request();
            request.input("filial", sql.VarChar, filial);
            request.input("cliente", sql.VarChar, cliente);
            request.input("dataIni", sql.VarChar, dataIni.replace(/-/g, ""));

            const resultProth = await request.query(`
                SELECT 
                    Z5.Z5_BILHETE AS bilhete, 
                    Z5.Z5_DATA AS data, 
                    Z5.Z5_QTDE AS quantidade, 
                    'SAIDA' AS tipo
                FROM SZ5140 Z5 (NOLOCK)
                INNER JOIN SZ4140 Z4 (NOLOCK) ON Z4.Z4_FILIAL = Z5.Z5_FILIAL AND Z4.Z4_BILHETE = Z5.Z5_BILHETE AND Z4.D_E_L_E_T_ = ''
                WHERE Z5.Z5_FILIAL = @filial 
                AND Z4.Z4_CLIENTE = @cliente 
                AND Z5.Z5_CODPRO = '499.001' 
                AND Z5.Z5_DATA >= @dataIni 
                AND Z5.D_E_L_E_T_ = ''
            `);

            const [resultManual] = await dbOcorrencias.promise().query(
                "SELECT id, data_registro as data, quantidade, tipo, motorista, bilhete FROM basquetas_mov_manual WHERE cliente = ?", [cliente]
            );

            const prothMapped = resultProth.recordset.map(r => ({
                id: r.bilhete.trim(),
                data: r.data.trim(),
                quantidade: parseFloat(r.quantidade),
                tipo: r.tipo,
                bilhete: r.bilhete.trim(),
                motorista: "PROTHEUS"
            }));

            const manualMapped = resultManual.map(r => ({
                id: `M-${r.id}`,
                data: r.data.toISOString().split('T')[0].replace(/-/g, ''),
                quantidade: r.quantidade,
                tipo: r.tipo,
                bilhete: r.tipo === 'ENTRADA' ? (r.motorista ? `MOTORISTA: ${r.motorista}` : "RETORNO MANUAL") : (r.bilhete || "AJUSTE"),
                motorista: r.motorista || "-"
            }));

            res.json([...prothMapped, ...manualMapped].sort((a, b) => b.data - a.data));
        } catch (err) {
            res.status(500).json({ error: "Erro", details: err.message });
        }
    });

    return router;
};
