import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ResultadoAuditoria } from "../tipos";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Define o esquema para saída estruturada em Português
const esquemaPendencia: Schema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING, description: "ID do Pedido ou Referência da Transação" },
    data: { type: Type.STRING, description: "Data da venda no formato YYYY-MM-DD" },
    cliente: { type: Type.STRING, description: "Nome do cliente" },
    valor: { type: Type.NUMBER, description: "Valor da transação" },
    descricao: { type: Type.STRING, description: "Descrição do item ou serviço" },
    status: { type: Type.STRING, description: "Motivo do apontamento (ex: 'Sem Nota Fiscal', 'Nota Pendente')" }
  },
  required: ['id', 'data', 'cliente', 'valor', 'status']
};

const esquemaAuditoria: Schema = {
  type: Type.OBJECT,
  properties: {
    estatisticas: {
      type: Type.OBJECT,
      properties: {
        pendentesNoMes: { type: Type.NUMBER, description: "Contagem de itens sem nota fiscal no mês atual dos dados" },
        pendentesNoAno: { type: Type.NUMBER, description: "Contagem de itens sem nota fiscal no ano atual dos dados" },
        totalAnalisado: { type: Type.NUMBER, description: "Número total de registros processados" }
      },
      required: ['pendentesNoMes', 'pendentesNoAno', 'totalAnalisado']
    },
    pendencias: {
      type: Type.ARRAY,
      items: esquemaPendencia,
      description: "Lista de TODAS as vendas identificadas como sem documento fiscal (nota fiscal)."
    },
    analisePeriodo: { 
      type: Type.STRING, 
      description: "Um breve resumo profissional em PORTUGUÊS sobre o status de conformidade fiscal." 
    }
  },
  required: ['estatisticas', 'pendencias', 'analisePeriodo']
};

export const gerarAuditoriaFiscal = async (dadosVenda: string): Promise<ResultadoAuditoria> => {
  try {
    const modelo = 'gemini-2.5-flash';
    const hoje = new Date().toISOString().split('T')[0];
    
    const prompt = `
      Você é um Auditor de Conformidade Fiscal (Brasil). 
      Analise os seguintes dados brutos de vendas (CSV, JSON ou texto).
      
      Data de Referência Atual: ${hoje}

      Tarefa:
      1. Identifique TODAS as vendas que estão SEM "Nota Fiscal", marcadas como "Pendente", "Vazio" ou sem número de nota.
      2. Calcule quantas estão faltando para o MÊS ATUAL (com base nas datas nos dados).
      3. Calcule quantas estão faltando para o ANO ATUAL (com base nas datas nos dados).
      4. Extraia os detalhes dessas vendas não conformes.

      Dados Brutos:
      ${dadosVenda}
      
      Retorne um objeto JSON estruturado seguindo estritamente o esquema fornecido, com chaves em Português.
    `;

    const resposta = await ai.models.generateContent({
      model: modelo,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: esquemaAuditoria,
        temperature: 0.1, // Temperatura baixa para extração rigorosa de dados
      }
    });

    const textoJson = resposta.text;
    if (!textoJson) {
      throw new Error("Nenhum dado retornado pelo Gemini");
    }

    const dados = JSON.parse(textoJson) as ResultadoAuditoria;
    return dados;

  } catch (erro) {
    console.error("Erro ao gerar auditoria:", erro);
    throw erro;
  }
};