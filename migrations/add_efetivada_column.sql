-- Script para adicionar coluna 'efetivada' nas tabelas de compras de mercadoria
-- Execute este script no banco MySQL (OCORRÊNCIAS)

-- Adiciona coluna efetivada na tabela compras_mercadoria
ALTER TABLE compras_mercadoria 
ADD COLUMN IF NOT EXISTS efetivada TINYINT(1) DEFAULT 0 
COMMENT 'Z2_TM: 0=Em Aberto, 1=Efetivada';

-- Adiciona coluna efetivada na tabela compras_mercadoria_itens
ALTER TABLE compras_mercadoria_itens 
ADD COLUMN IF NOT EXISTS efetivada TINYINT(1) DEFAULT 0 
COMMENT 'Z1_PROC: 0=Em Aberto, 1=Efetivada';

-- Adiciona índice para melhorar performance
ALTER TABLE compras_mercadoria 
ADD INDEX IF NOT EXISTS idx_local_efetivada (local, efetivada);

-- Comentário: 
-- Z2_TM = '' -> efetivada = 0 (Em aberta)
-- Z2_TM = 'S' -> efetivada = 1 (Efetivada)
-- Z1_PROC = '' -> efetivada = 0 (Em aberta)
-- Z1_PROC = '1' -> efetivada = 1 (Efetivada)

