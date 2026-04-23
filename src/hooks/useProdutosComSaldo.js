// hooks/useProdutosComSaldo.js
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from '../utils/apiConfig';

export const useProdutosComSaldo = (search, origem) => {
  return useQuery({
    queryKey: ["produtos-com-saldo", search, origem],
    queryFn: async () => {
      if (!search || search.length < 2) return [];
      const { data } = await axios.get(
        `${API_BASE_URL}/produtos-com-saldo`,
        {
          params: { search, local: origem },
        }
      );

      return data.map((p) => ({
        ...p,
        codigo_produto: p.cod || p.cod_produto || p.codigo_produto,
        descricao: p.descricao || p.nome_produto || "",
        primeira_unidade: p.primeira_unidade || p.unidade || "",
        segunda_unidade: p.segunda_unidade || "",
        fatorConversao: p.fator_conversao || 1,
      }));
    },
    enabled: !!search && !!origem,
    staleTime: 1000 * 60 * 5,
  });
};
