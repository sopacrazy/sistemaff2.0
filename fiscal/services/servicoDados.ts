import { PendenciaFiscal, NotaFiscal, ResultadoPaginado } from "../tipos";

// Declaração da tipagem do Vite para resolver o erro 'ImportMeta'
// É importante manter esta declaração se estiver usando um bundler como o Vite
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// O valor padrão "/api" será usado se VITE_API_BASE_URL não estiver definida
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

// Tipo de retorno para o serviço paginado de Pendências
interface ResultadoPendenciasPaginado {
  totalRegistros: number;
  dados: PendenciaFiscal[];
}

// Interface para o retorno das estatísticas de conformidade
// 🚀 ATUALIZADO: Inclui valorSemNota e valorComNota (Faturamento)
interface EstatisticasConformidade {
  semNota: number;
  comNota: number;
  totalGeral: number;
  valorSemNota: number;
  valorComNota: number;
}

/**
 * Função utilitária para converter a data do formato Protheus (YYYYMMDD)
 * para o formato ISO (YYYY-MM-DD) esperado pelo frontend.
 */
const formatarDataProtheus = (dateStr: string): string => {
  if (dateStr && dateStr.length === 8) {
    return `${dateStr.substring(0, 4)}-${dateStr.substring(
      4,
      6
    )}-${dateStr.substring(6, 8)}`;
  }
  return dateStr || "";
};

/**
 * [EXPORTADO PARA PAINEL.TSX] Busca a lista de pendências fiscais do back-end (Dashboard).
 */
export async function buscarPendenciasParaPainel(): Promise<PendenciaFiscal[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/pendencias`);

    if (!response.ok) {
      throw new Error(`Erro de rede ou servidor: ${response.statusText}`);
    }

    const data: PendenciaFiscal[] = await response.json();

    // Mapeia e formata os dados
    return data.map((item) => ({
      ...item,
      data: formatarDataProtheus(item.data),
      valor: parseFloat(item.valor.toString()),
    }));
  } catch (error) {
    console.error(
      "Erro ao buscar pendências do back-end para o painel:",
      error
    );
    return [];
  }
}

/**
 * [EXPORTADO PARA CONSULTAVENDAS.TSX] Busca a lista de pendências fiscais filtrada e paginada.
 *
 * 🚀 NOVO: Adicionado o 5º argumento 'local' (que agora é a categoria) e incluído no corpo da requisição.
 */
export async function buscarPendenciasPorPeriodo(
  dataInicio: string,
  dataFim: string,
  page: number = 1,
  limit: number = 100,
  local?: string // <-- Argumento é a categoria ('CEASA', 'DIST' ou '')
): Promise<ResultadoPendenciasPaginado> {
  try {
    const response = await fetch(`${API_BASE_URL}/consulta/pendencias`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // Envia os 5 parâmetros de data, paginação e local (categoria)
      body: JSON.stringify({ dataInicio, dataFim, page, limit, local }),
    });

    if (!response.ok) {
      const errorDetail = await response.json();
      throw new Error(
        `Erro de rede ou servidor: ${response.statusText} - ${errorDetail.error}`
      );
    }

    const { totalRegistros, dados }: ResultadoPendenciasPaginado =
      await response.json();

    // Mapeia e formata os dados
    const formattedData = dados.map((item) => ({
      ...item,
      data: formatarDataProtheus(item.data),
      valor: parseFloat(item.valor.toString()),
    }));

    // Retorna a estrutura completa, incluindo o total
    return {
      totalRegistros: totalRegistros,
      dados: formattedData,
    };
  } catch (error) {
    console.error("Erro ao buscar pendências por período:", error);
    return { totalRegistros: 0, dados: [] }; // Retorno em caso de falha
  }
}

/**
 * [EXPORTADO PARA PAINEL.TSX] Busca estatísticas de conformidade fiscal (total de vendas) para calcular a Taxa.
 * * 🚀 ATUALIZADO: Espera o retorno dos valores (faturamento) para calcular a taxa.
 */
export async function buscarEstatisticasConformidade(): Promise<EstatisticasConformidade> {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/conformidade`);

    if (!response.ok) {
      throw new Error(`Erro de rede ou servidor: ${response.statusText}`);
    }

    const data: EstatisticasConformidade = await response.json();
    return data;
  } catch (error) {
    console.error("Erro ao buscar estatísticas de conformidade:", error);
    // 🚀 NOVO: Retorna os valores em 0 (incluindo os novos campos de valor)
    return {
      semNota: 0,
      comNota: 0,
      totalGeral: 0,
      valorSemNota: 0,
      valorComNota: 0,
    };
  }
}

// --- FUNÇÃO DE BUSCA DE NOTAS FISCAIS ---
/**
 * [EXPORTADO PARA CONSULTANOTAFISCAL.TSX] Busca notas fiscais no back-end, unindo SF3 e SA1.
 *
 * @param dataInicio Data de Início no formato YYYY-MM-DD.
 * @param dataFim Data de Fim no formato YYYY-MM-DD.
 * @param series Array de séries ('1' ou '5').
 * @param situacoes Array de situações (Status) da nota.
 * @param comOuSemChave Filtro para notas com ou sem chave ('com', 'sem' ou 'todos').
 * @param page Página atual para paginação.
 * @param limit Limite de registros por página.
 * @returns Promise<ResultadoPaginado<NotaFiscal>>
 */
export async function buscarNotasFiscais(
  dataInicio: string,
  dataFim: string,
  series: string[],
  situacoes: string[],
  comOuSemChave: "com" | "sem" | "todos",
  page: number = 1,
  limit: number = 100
): Promise<ResultadoPaginado<NotaFiscal>> {
  // TIPO DE RETORNO ATUALIZADO
  try {
    const response = await fetch(`${API_BASE_URL}/consulta/notas-fiscais`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Passa TODOS os 7 argumentos no corpo JSON
      body: JSON.stringify({
        dataInicio,
        dataFim,
        series,
        situacoes,
        comOuSemChave,
        page,
        limit,
      }),
    });

    if (!response.ok) {
      throw new Error(`Erro de rede ou servidor: ${response.statusText}`);
    }

    // A resposta agora contém totalRegistros e o array de dados
    const { totalRegistros, dados }: ResultadoPaginado<NotaFiscal> =
      await response.json();

    // Mapeia e formata os dados
    const formattedData = dados.map((item) => ({
      ...item,
      // A data de emissão F3_EMISSAO está no formato YYYYMMDD
      emissao: formatarDataProtheus(item.emissao),
      valorTotal: parseFloat(item.valorTotal.toString()),
    }));

    // Retorna a estrutura completa, incluindo o total
    return {
      totalRegistros: totalRegistros,
      dados: formattedData,
    };
  } catch (error) {
    console.error("Erro ao buscar Notas Fiscais:", error);
    throw new Error(
      `Falha na comunicação: Verifique se o servidor está ativo. Detalhes: ${error.message}`
    );
  }
}

/**
 * [EXPORTADO PARA CONSULTAVENDAS.TSX] Converte um array de objetos em uma string CSV e aciona o download.
 */
export function exportarParaCSV(
  data: PendenciaFiscal[],
  filename: string = "relatorio_fiscal"
) {
  // OBS: Como não podemos usar 'alert' em iframes, substituído o alert por console.warn
  if (data.length === 0) {
    console.warn("Não há dados para exportar.");
    return;
  }

  // Define os cabeçalhos das colunas (Português)
  const headers = [
    "ID Pedido",
    "Data",
    "Local", // Adicionado o cabeçalho Local
    "Cliente",
    "Vendedor",
    "Valor (R$)",
    "Status",
    "Descrição",
  ];

  // Mapeia as chaves dos objetos para a ordem dos cabeçalhos
  const keys = [
    "id",
    "data",
    "local", // Adicionada a chave local
    "cliente",
    "vendedor",
    "valor",
    "status",
    "descricao",
  ];

  // 1. Cria o cabeçalho CSV
  let csvContent = headers.map((h) => `"${h}"`).join(";") + "\n"; // Usando ponto e vírgula como delimitador

  // 2. Adiciona as linhas de dados
  data.forEach((item) => {
    const row = keys
      .map((key) => {
        let value: any = item[key as keyof PendenciaFiscal];

        // Formata o valor monetário: toFixed(2) para 2 casas decimais, replace para vírgula
        if (key === "valor" && typeof value === "number") {
          value = value.toFixed(2).replace(".", ",");
        } else {
          // Trata strings, substitui aspas duplas por duas aspas duplas, e envolve em aspas
          value = String(value || "")
            .trim()
            .replace(/"/g, '""');
          value = `"${value}"`;
        }

        return value;
      })
      .join(";");
    csvContent += row + "\n";
  });

  // 3. Cria o blob (arquivo) e aciona o download (BOM \ufeff garante UTF-8 no Excel)
  const blob = new Blob(["\ufeff", csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);
  link.setAttribute(
    "download",
    `${filename}_${new Date().toISOString().slice(0, 10)}.csv`
  );

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
