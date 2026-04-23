import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/apiConfig';

/**
 * Hook personalizado para verificar o ambiente (Produção/Desenvolvimento)
 * @returns {Object} { environment, isProduction, isDevelopment, loading }
 */
export const useEnvironment = () => {
  const [envInfo, setEnvInfo] = useState({
    environment: 'DEVELOPMENT',
    isProduction: false,
    isDevelopment: true,
    loading: true
  });

  useEffect(() => {
    const fetchEnvironment = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/environment`);
        setEnvInfo({
          ...response.data,
          loading: false
        });
      } catch (error) {
        console.error('Erro ao buscar ambiente:', error);
        // Fallback: assume desenvolvimento se der erro
        setEnvInfo({
          environment: 'DEVELOPMENT',
          isProduction: false,
          isDevelopment: true,
          loading: false
        });
      }
    };

    fetchEnvironment();
  }, []);

  return envInfo;
};

/**
 * Função auxiliar para confirmar ações críticas em produção
 * @param {string} message - Mensagem de confirmação
 * @param {boolean} isProduction - Se está em produção
 * @returns {boolean} - Se o usuário confirmou
 */
export const confirmIfProduction = (message, isProduction) => {
  if (!isProduction) return true;
  
  const confirmMessage = `⚠️ AMBIENTE DE PRODUÇÃO!\n\n${message}\n\nDeseja realmente continuar?`;
  return window.confirm(confirmMessage);
};

/**
 * Função para exibir alerta em produção
 * @param {string} message - Mensagem
 * @param {boolean} isProduction - Se está em produção
 */
export const alertIfProduction = (message, isProduction) => {
  if (isProduction) {
    alert(`🔴 PRODUÇÃO: ${message}`);
  }
};

