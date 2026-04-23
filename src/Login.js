import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useTheme } from "./contexts/ThemeContext";
import "./index.css";

// Configuração da URL da API (detecta automaticamente o IP da rede)
import { API_BASE_URL } from "./utils/apiConfig";
const API_BASE = API_BASE_URL;

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { forceTheme, loadUserTheme } = useTheme();

  // Força o tema Light ao entrar na tela de login
  useEffect(() => {
    forceTheme('light');
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro("");

    const u = username.trim().toLowerCase();
    const p = password;

    if (!u || !p) {
      setErro("Informe usuário e senha.");
      return;
    }

    try {
      setLoading(true);

      const { data } = await axios.post(`${API_BASE}/login`, {
        username: u,
        password: p,
      });

      const token = data?.token || "";
      if (!token) throw new Error("Token ausente na resposta.");

      sessionStorage.setItem("token", token);
      // Salva refresh token se disponível
      if (data?.refreshToken) {
        sessionStorage.setItem("refreshToken", data.refreshToken);
      }
      sessionStorage.setItem("username", data?.username || u);
      if (data?.origem) sessionStorage.setItem("origem", data.origem);
      if (data?.setor) sessionStorage.setItem("setor", data.setor);

      const permissoes = Array.isArray(data?.permissoes) ? data.permissoes : [];
      sessionStorage.setItem("permissoes", JSON.stringify(permissoes));

      if (data?.tipo) sessionStorage.setItem("role", data.tipo);

      // Carrega o tema do usuário recém logado
      await loadUserTheme(data?.username || u);

      navigate("/");
    } catch (error) {
      console.error("Erro de login:", error);
      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "Usuário ou senha inválidos";
      setErro(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 min-h-screen flex overflow-hidden">
      <style>{`
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background-color: rgba(156, 163, 175, 0.5); border-radius: 20px; }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in-up 0.6s ease-out forwards; }
      `}</style>
      <link
        href="https://fonts.googleapis.com/icon?family=Material+Symbols+Rounded"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* Lado Esquerdo - Branding Fort Fruit */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-green-600 via-green-700 to-emerald-700 items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)'
          }}></div>
        </div>
        <div className="relative z-10 p-12 max-w-2xl text-white animate-fade-in text-center lg:text-left">
          <div className="mb-8 inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg">
            <span className="text-4xl font-extrabold text-white tracking-tight">
              FF
            </span>
          </div>
          <h2 className="text-5xl font-bold mb-4 leading-tight tracking-tight">
            Fort Fruit
          </h2>
          <p className="text-xl text-green-50/90 font-light leading-relaxed mb-8">
            Sistema de Gestão Integrado
          </p>
          <p className="text-lg text-green-50/80 font-light leading-relaxed mb-10">
            Gerencie estoque, finanças e operações com eficiência e precisão.
          </p>
          <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm backdrop-blur-sm">
              <span className="material-symbols-rounded text-base">
                inventory_2
              </span>
              <span>Controle de Estoque</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm backdrop-blur-sm">
              <span className="material-symbols-rounded text-base">
                analytics
              </span>
              <span>Gestão Financeira</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm backdrop-blur-sm">
              <span className="material-symbols-rounded text-base">
                security
              </span>
              <span>Segurança Total</span>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/4 -right-24 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      {/* Lado Direito - Formulário */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between bg-white dark:bg-gray-800 relative overflow-y-auto">
        <div className="h-2 w-full bg-gradient-to-r from-green-600 via-green-500 to-emerald-500 lg:hidden"></div>
        <div className="flex-grow flex items-center justify-center p-6 sm:p-12 lg:p-16 relative">
          <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none z-0 opacity-30">
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 left-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl"></div>
          </div>

          <div
            className="w-full max-w-md space-y-8 z-10 animate-fade-in"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="text-center">
              <div className="inline-flex items-center justify-center mb-6">
                <div className="relative flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl shadow-lg">
                  <span className="text-4xl font-extrabold text-white tracking-tighter">
                    FF
                  </span>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                Bem-vindo
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                SistemaFF - Versão 2.0.0
              </p>
            </div>

            {erro && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm text-center border border-red-200 dark:border-red-800 flex items-center justify-center gap-2">
                <span className="material-symbols-rounded text-lg">error</span>
                <span>{erro}</span>
              </div>
            )}

            <form className="mt-8 space-y-6" onSubmit={handleLogin}>
              <div className="space-y-5">
                {/* Usuário */}
                <div>
                  <label
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                    htmlFor="username"
                  >
                    Usuário
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <span className="material-symbols-rounded text-gray-400 text-xl group-focus-within:text-green-600 transition-colors">
                        person
                      </span>
                    </div>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      required
                      className="block w-full pl-11 pr-4 py-3 text-base border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all shadow-sm hover:bg-white dark:hover:bg-gray-800"
                      placeholder="Digite seu usuário"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>

                {/* Senha */}
                <div>
                  <label
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                    htmlFor="password"
                  >
                    Senha
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <span className="material-symbols-rounded text-gray-400 text-xl group-focus-within:text-green-600 transition-colors">
                        lock
                      </span>
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      className="block w-full pl-11 pr-12 py-3 text-base border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all shadow-sm hover:bg-white dark:hover:bg-gray-800"
                      placeholder="Digite sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none cursor-pointer"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className="material-symbols-rounded text-xl">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-green-500/20 text-sm font-bold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-rounded text-lg animate-spin mr-2">progress_activity</span>
                      <span>ACESSANDO...</span>
                    </>
                  ) : (
                    <>
                      <span>ACESSAR SISTEMA</span>
                      <span className="material-symbols-rounded text-lg ml-2">arrow_forward</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                Problemas com o acesso? Entre em contato com o suporte.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
