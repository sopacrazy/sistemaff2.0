// src/routes/RequireRH.jsx
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../utils/apiConfig";

export default function RequireRH({ children }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const username =
          sessionStorage.getItem("username") ||
          localStorage.getItem("username");
        if (!username) {
          console.warn("RequireRH: Username não encontrado");
          setAllowed(false);
          setLoading(false);
          return;
        }

        // Busca lista de usuários para encontrar o ID
        const usuariosRes = await axios.get(`${API_BASE_URL}/usuarios`);
        const user = usuariosRes.data.find(
          (u) => u.username?.toLowerCase() === username.toLowerCase()
        );

        if (!user || !user.id) {
          console.warn("RequireRH: Usuário não encontrado ou sem ID", { username, user });
          setAllowed(false);
          setLoading(false);
          return;
        }

        // Verifica permissão de RH
        const permRes = await axios.get(
          `${API_BASE_URL}/permissoes/usuario/${user.id}`
        );
        const permissoes = permRes.data || {};

        // Verifica se tem permissão para RH
        // A API retorna boolean (!!permitido), então verificamos se é true
        // Também aceita 1 (número) ou "1" (string) como verdadeiro
        const temPermissao = 
          permissoes.RH === true || 
          permissoes.RH === 1 || 
          permissoes.RH === "1" ||
          permissoes["RH"] === true ||
          permissoes["RH"] === 1;
        
        console.log("RequireRH - Verificação de permissão:", {
          username,
          userId: user.id,
          todasPermissoes: permissoes,
          permissaoRH: permissoes.RH,
          tipoPermissaoRH: typeof permissoes.RH,
          temPermissao,
        });
        
        setAllowed(temPermissao);
      } catch (error) {
        console.error("RequireRH - Erro ao verificar permissão:", error);
        console.error("Detalhes:", error.response?.data || error.message);
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-600 dark:text-slate-400">Verificando permissão...</div>
      </div>
    );
  }

  // Se não tiver permissão, redireciona para home
  if (!allowed) {
    console.warn("RequireRH: Acesso negado ao módulo RH. Redirecionando...");
    return <Navigate to="/" replace />;
  }

  // Se tiver permissão, renderiza o conteúdo
  return children;
}
