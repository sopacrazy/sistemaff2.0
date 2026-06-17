// src/utils/apiConfig.js
// Detecta automaticamente a URL da API baseada no hostname atual
import axios from "axios";

function getApiBaseUrl() {
  // 1. Se houver uma URL definida explicitamente no ambiente (ex: .env.production)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = 3001; // Porta padrão do backend (Sincronizada com server.js e .env)

  // 2. Se estiver em localhost ou 127.0.0.1, usa localhost:3001
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `http://localhost:${port}`;
  }

  // 3. Se estiver acessando por IP de rede (192.168.x.x, 10.x.x.x, etc)
  if (hostname.match(/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/)) {
    return `http://${hostname}:${port}`;
  }

  // 4. Em produção (portal.fortfruit.com.br), o Apache faz proxy de /api/*
  // Se não caiu em nenhuma regra acima, retornamos /api como caminho relativo
  return "/api";
}

export const API_BASE_URL = getApiBaseUrl();

// Log para debug (sempre, para facilitar troubleshooting)
console.log(`[API Config] Hostname: ${window.location.hostname}`);
console.log(`[API Config] API URL: ${API_BASE_URL}`);
console.log(`[API Config] Location: ${window.location.href}`);

// Flag para evitar loops infinitos de renovação
let isRefreshing = false;
let failedQueue = [];

// Função para renovar o token
const refreshToken = async () => {
  const refreshTokenValue =
    sessionStorage.getItem("refreshToken") ||
    localStorage.getItem("refreshToken");

  if (!refreshTokenValue) {
    // Se não há refresh token, redireciona para login sem mostrar erro
    console.warn(
      "[Token Refresh] Refresh token não encontrado. Redirecionando para login..."
    );
    sessionStorage.clear();
    localStorage.clear();
    window.location.href = "/login";
    throw new Error("Refresh token não encontrado");
  }

  try {
    const response = await axios.post(`${API_BASE_URL}/refresh-token`, {
      refreshToken: refreshTokenValue,
    });

    const { token, refreshToken: newRefreshToken } = response.data;

    // Atualiza os tokens
    sessionStorage.setItem("token", token);
    if (newRefreshToken) {
      sessionStorage.setItem("refreshToken", newRefreshToken);
    }

    console.log("[Token Refresh] Token renovado com sucesso");
    return token;
  } catch (error) {
    // Se o refresh token também expirou, limpa tudo e redireciona para login
    console.error("[Token Refresh] Erro ao renovar token:", error);
    sessionStorage.clear();
    localStorage.clear();
    window.location.href = "/login";
    throw error;
  }
};

// Interceptor de resposta para renovar token automaticamente
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Se o erro for 403 e a mensagem indicar token expirado
    // OU se o erro for 401 (não autenticado)
    if (
      (error.response?.status === 403 &&
        (error.response?.data?.details?.includes("jwt expired") ||
          error.response?.data?.error?.includes("expired") ||
          error.response?.data?.message?.includes("expired") ||
          error.response?.data?.details === "jwt expired")) ||
      error.response?.status === 401
    ) {
      // Verifica se há refresh token antes de tentar renovar
      const hasRefreshToken = !!(
        sessionStorage.getItem("refreshToken") ||
        localStorage.getItem("refreshToken")
      );

      if (!hasRefreshToken) {
        // Se não há refresh token, redireciona para login imediatamente
        console.warn(
          "[Token Refresh] Token expirado e refresh token não encontrado. Redirecionando para login..."
        );
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      // Se já está tentando renovar, adiciona à fila
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axios(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      isRefreshing = true;

      try {
        const newToken = await refreshToken();

        // Processa a fila de requisições pendentes
        failedQueue.forEach(({ resolve }) => {
          resolve(newToken);
        });
        failedQueue = [];

        // Atualiza o header da requisição original e tenta novamente
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        isRefreshing = false;
        return axios(originalRequest);
      } catch (refreshError) {
        // Se falhar ao renovar, rejeita todas as requisições na fila
        failedQueue.forEach(({ reject }) => {
          reject(refreshError);
        });
        failedQueue = [];
        isRefreshing = false;
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Interceptor de requisição para adicionar token automaticamente
axios.interceptors.request.use(
  (config) => {
    const token =
      sessionStorage.getItem("token") || localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
