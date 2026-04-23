import { ResultadoAuditoria } from "../tipos";

export const gerarAuditoriaFiscal = async (dadosVenda: string): Promise<ResultadoAuditoria> => {
  // Mock criado temporariamente porque a IA não será usada agora
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        estatisticas: {
          pendentesNoMes: 0,
          pendentesNoAno: 0,
          totalAnalisado: 0
        },
        pendencias: [],
        analisePeriodo: "A auditoria usando Inteligência Artificial está temporariamente desativada."
      });
    }, 1500);
  });
};