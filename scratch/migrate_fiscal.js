const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
    console.log("Iniciando migração manual...");
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST_OCORRENCIAS,
        user: process.env.DB_USER_OCORRENCIAS,
        password: process.env.DB_PASSWORD_OCORRENCIAS,
        database: process.env.DB_NAME_OCORRENCIAS
    });

    try {
        console.log("Verificando colunas da tabela fiscal_config...");
        const [columns] = await connection.query("SHOW COLUMNS FROM fiscal_config");
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('tes_list')) {
            console.log("Adicionando coluna tes_list...");
            await connection.query("ALTER TABLE fiscal_config ADD COLUMN tes_list VARCHAR(255) DEFAULT '130,141,222,224,225'");
            console.log("Coluna tes_list adicionada com sucesso.");
        } else {
            console.log("Coluna tes_list já existe.");
        }

        console.log("Verificando se existe registro inicial...");
        const [rows] = await connection.query("SELECT * FROM fiscal_config WHERE id = 1");
        if (rows.length === 0) {
            console.log("Inserindo registro inicial...");
            await connection.query("INSERT INTO fiscal_config (id, inss_percent, gilrat_percent, senar_percent, tes_list) VALUES (1, 0.0120, 0.0010, 0.0020, '130,141,222,224,225')");
        } else {
            console.log("Registro inicial já existe.");
        }

    } catch (err) {
        console.error("Erro durante a migração:", err);
    } finally {
        await connection.end();
        console.log("Conexão encerrada.");
    }
}

migrate();
