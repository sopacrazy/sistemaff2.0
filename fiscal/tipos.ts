import React from "react";

// Define tipos para toda a aplicação

export enum EstadoVisualizacao {
  PAINEL = "PAINEL",
  AUDITORIA_FISCAL = "AUDITORIA_FISCAL",
  CONSULTA = "CONSULTA",
  CONSULTA_NF = "CONSULTA_NF", // NOVO: Consulta de Notas Fiscais
  HISTORICO = "HISTORICO",
  CONFIGURACOES = "CONFIGURACOES",
  CONSULTA_PRODUTOS = "CONSULTA_PRODUTOS",
}

export interface PendenciaFiscal {
  id: string;
  data: string; // Formato ISO YYYY-MM-DD
  cliente: string;
  vendedor: string;
  valor: number;
  descricao: string;
  status: string; // ex: "Pendente", "Sem Nota", "Erro Emissão"
}

/** Novo tipo de retorno para o serviço paginado de Pendências */
export interface ResultadoPaginado<T> {
  totalRegistros: number;
  dados: T[];
}

/** INTERFACE ATUALIZADA: Detalhes da Nota Fiscal (Tabela SF3140 + SA1140) */
export interface NotaFiscal {
  nf: string; // F3_NFISCAL
  serie: string; // F3_SERIE
  clienteNome: string; // A1_NOME (do JOIN)
  clienteCodigo: string; // F3_CLIEFOR
  cfop: string; // F3_CFO
  emissao: string; // F3_EMISSAO (Data no formato YYYY-MM-DD)
  valorTotal: number; // F3_VALCONT
  chaveNfe: string; // F3_CHVNFE
  situacao: string; // NOVO CAMPO: F3_DESCRET
  observacao: string; // F3_OBSERV
}

export interface EstatisticasFiscais {
  pendentesNoMes: number;
  pendentesNoAno: number;
  totalAnalisado: number;
}

export enum EstadoVisualizacao {
  // ... outros estados
  NOTAS_FALTANTES = "NOTAS_FALTANTES", // <--- Adicione isso
  RELATORIO_PIS_COFINS = "RELATORIO_PIS_COFINS",
}

export interface ResultadoAuditoria {
  estatisticas: EstatisticasFiscais;
  pendencias: PendenciaFiscal[];
  analisePeriodo: string; // Comentário da IA sobre o período
}

export interface ItemBarraLateral {
  id: EstadoVisualizacao;
  rotulo: string;
  icone: React.ReactNode;
}
