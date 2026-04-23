// hooks/useEntregas.js

import { useState, useEffect, useCallback } from "react"; // 1. Remover o useRef, não precisamos mais dele
import axios from "axios";
import dayjs from "dayjs";
import { API_BASE_URL } from '../utils/apiConfig';

// Função para remover duplicatas (mantida)
const removerDuplicatas = (dados) => {
  if (!dados || !Array.isArray(dados)) return [];
  const mapaRotas = new Map();
  dados.forEach((rota) => {
    const chaveUnica = `${rota.ZH_CODIGO}-${rota.ZH_ROTA}-${rota.ZB_DTENTRE}`;
    if (!mapaRotas.has(chaveUnica)) {
      mapaRotas.set(chaveUnica, rota);
    }
  });
  return Array.from(mapaRotas.values());
};

const useEntregas = (dataFiltro) => {
  const [rotas, setRotas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({ pendenciasFotoMes: 0 }); // ALTERAÇÃO 1: A função agora aceita um parâmetro para saber se é um 'refresh'

  const fetchEntregas = useCallback(
    async (isRefresh = false) => {
      // Se NÃO for um refresh (carga inicial ou mudança de data), ativa o loading grande.
      // Se FOR um refresh, ativa o loading pequeno.
      if (!isRefresh) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const dataFormatada = dataFiltro
          ? dayjs(dataFiltro).format("YYYY-MM-DD")
          : "";
        const url = `${API_BASE_URL}/entregas-por-rota${
          dataFormatada ? `?data=${dataFormatada}` : ""
        }`;

        const response = await axios.get(url);

        const dadosProcessados = removerDuplicatas(response.data.rotas);
        
        // Ocultar rotas específicas conforme solicitação do usuário
        const rotasFiltradas = dadosProcessados.filter(rota => {
          const numRota = String(rota.ZH_ROTA).trim();
          return numRota !== '000031' && numRota !== '000019' && numRota !== '000034';
        });

        setRotas(rotasFiltradas);
        setStats(response.data.stats);
      } catch (error) {
        console.error("Erro ao buscar entregas:", error);
        setRotas([]);
        setStats({ pendenciasFotoMes: 0 });
      } finally {
        // ALTERAÇÃO 2: Desliga os dois loadings ao final.
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [dataFiltro]
  );

  useEffect(() => {
    // ALTERAÇÃO 3: A lógica aqui fica muito mais simples!
    // 1. Chama a função para a carga principal (NÃO é um refresh)
    fetchEntregas(false); // 2. O intervalo chama a função dizendo que AGORA SIM é um refresh

    const interval = setInterval(() => {
      fetchEntregas(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchEntregas]); // A dependência continua a mesma // O retorno do hook continua igual

  return { rotas, isLoading, isRefreshing, stats, refetch: fetchEntregas };
};

export default useEntregas;
