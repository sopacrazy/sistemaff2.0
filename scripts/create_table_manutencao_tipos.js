const mysql = require('mysql2');
require('dotenv').config();

const dbOcorrencias = mysql.createConnection({
    host: process.env.DB_HOST_OCORRENCIAS, // Usando host correto do .env
    user: process.env.DB_USER_OCORRENCIAS,
    password: process.env.DB_PASSWORD_OCORRENCIAS,
    database: process.env.DB_NAME_OCORRENCIAS // Usando nome correto (ocorrencias)
});

const createTableSql = `
CREATE TABLE IF NOT EXISTS frota_manutencao_tipos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

const insertInitialTiposSql = `
INSERT IGNORE INTO frota_manutencao_tipos (nome) VALUES 
('Preventiva'),
('Corretiva'),
('Funilaria'),
('Pneus'),
('Troca de Óleo'),
('Elétrica');
`;

dbOcorrencias.connect((err) => {
    if (err) {
        console.error('Erro ao conectar ao banco:', err);
        return;
    }
    console.log(`Conectado ao banco ${process.env.DB_NAME_OCORRENCIAS}.`);

    dbOcorrencias.query(createTableSql, (err) => {
        if (err) {
            console.error('Erro ao criar tabela:', err);
        } else {
            console.log('Tabela frota_manutencao_tipos criada com sucesso.');
            
            dbOcorrencias.query(insertInitialTiposSql, (err) => {
                if (err) console.error('Erro ao inserir tipos iniciais:', err);
                else console.log('Tipos iniciais inseridos (se não existiam).');
                
                dbOcorrencias.end();
            });
        }
    });
});
