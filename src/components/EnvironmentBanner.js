import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/apiConfig';

const EnvironmentBanner = () => {
  const [envInfo, setEnvInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEnvironment = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/environment`);
        setEnvInfo(response.data);
      } catch (error) {
        console.error('Erro ao buscar ambiente:', error);
        // Fallback: assume desenvolvimento se der erro
        setEnvInfo({
          environment: 'DEVELOPMENT',
          isDevelopment: true,
          isProduction: false
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEnvironment();
  }, []);

  if (loading || !envInfo) return null;

  // Se estiver em desenvolvimento, mostra banner discreto
  if (envInfo.isDevelopment) {
    return (
      <div className="fixed bottom-4 right-4 z-[9999] animate-in slide-in-from-bottom-5">
        <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-bold">
          <span className="material-symbols-rounded text-lg">code</span>
          <span>DESENVOLVIMENTO</span>
        </div>
      </div>
    );
  }

  // Se estiver em PRODUÇÃO, mostra alerta GRANDE e chamativo
  return (
    <>
      {/* Banner fixo no topo */}
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white shadow-2xl">
        <div className="container mx-auto px-4 py-3 flex items-center justify-center gap-3 animate-pulse">
          <span className="material-symbols-rounded text-2xl">warning</span>
          <span className="text-lg font-black uppercase tracking-wider">
            ⚠️ ATENÇÃO: AMBIENTE DE PRODUÇÃO! ⚠️
          </span>
          <span className="material-symbols-rounded text-2xl">warning</span>
        </div>
      </div>

      {/* Badge flutuante no canto */}
      <div className="fixed bottom-4 right-4 z-[9999]">
        <div className="bg-red-600 text-white px-6 py-3 rounded-xl shadow-2xl border-4 border-red-800 animate-pulse">
          <div className="text-xs font-bold uppercase tracking-wider mb-1">Base Ativa:</div>
          <div className="text-xl font-black">🔴 PRODUÇÃO</div>
        </div>
      </div>
    </>
  );
};

export default EnvironmentBanner;

