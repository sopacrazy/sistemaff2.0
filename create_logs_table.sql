CREATE TABLE IF NOT EXISTS ocorrencia_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ocorrencia_id INT NOT NULL,
    acao VARCHAR(50) NOT NULL, -- 'CRIACAO', 'EDICAO', 'REABERTURA', 'ALTERACAO_STATUS'
    usuario VARCHAR(100), -- Username or 'SISTEMA' or 'APP'
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    detalhes TEXT,
    FOREIGN KEY (ocorrencia_id) REFERENCES ocorrencias(id) ON DELETE CASCADE
);
