import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "./utils/apiConfig";
import { getDataTrabalho } from "./utils/dataTrabalho";
import dayjs from "dayjs";
import { Tooltip } from "@mui/material";

const UsuariosOnline = () => {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  const username = sessionStorage.getItem("username") || localStorage.getItem("username") || "sistema";
  const origemUsuario = sessionStorage.getItem("local") || sessionStorage.getItem("origem") || "01";
  const dataTrabalho = getDataTrabalho();
  
  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.removeItem("username");
    navigate("/login");
  };

  const fetchUsuariosOnline = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/usuarios/online`);
      setUsuarios(response.data.usuarios || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Erro ao buscar usuários online:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuariosOnline();
    // Atualiza a cada 5 segundos
    const interval = setInterval(fetchUsuariosOnline, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatarData = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const NOME_LOCAL = {
    "01": "Loja",
    "02": "Depósito",
    "03": "B.T.F",
    "04": "Depósito da Banana",
    "05": "Depósito do Ovo",
    "06": "Passarela 02 (torres)",
    "07": "Centro de Distribuição (C.D)",
    "08": "Varejinho",
    "09": "Passarela 01",
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />
      
      {/* Background Ambient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-green-400/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
      </div>

      {/* Header Glassmorphic */}
      <header className="sticky top-0 z-50 px-4 py-4">
        <div className="w-full max-w-[98vw] mx-auto">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-slate-700/50 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
              <div className="bg-gradient-to-tr from-green-600 to-emerald-400 h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-600/20">
                <span className="font-bold text-xl italic tracking-tighter">SF</span>
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight text-slate-800 dark:text-white">Monitor de Usuários Online</h1>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">SistemaFF</span>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <Tooltip title="Alterar data na Home">
                <div className="hidden md:flex items-center gap-2 mr-2 bg-transparent px-3 py-2 rounded-xl group border border-transparent">
                  <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-1.5 rounded-lg">
                    <span className="material-symbols-rounded text-lg">calendar_today</span>
                  </div>
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {dataTrabalho ? dayjs(dataTrabalho).add(12, 'hour').format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY')}
                    </span>
                  </div>
                </div>
              </Tooltip>

              <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 hidden md:block"></div>

              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-bold text-slate-800 dark:text-white">{username}</span>
                  <div className="text-[10px] font-bold text-white bg-slate-800 dark:bg-slate-600 px-2 py-0.5 rounded flex items-center gap-1">
                    LOCAL: {origemUsuario} <span className="material-symbols-rounded text-[10px]">location_on</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 border-2 border-white dark:border-slate-600 flex items-center justify-center shadow-sm">
                  <span className="material-symbols-rounded text-slate-500 dark:text-slate-300">person</span>
                </div>
              </div>

              <button onClick={handleLogout} className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-all border border-transparent hover:border-red-200 dark:hover:border-red-800">
                <span className="material-symbols-rounded text-xl">logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-[98vw] mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="mb-8 animate-in slide-in-from-bottom-5 duration-500">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                  Usuários Online
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Última atualização: {formatarData(lastUpdate.toISOString())}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-xl font-bold text-lg">
                  {usuarios.length} {usuarios.length === 1 ? "usuário" : "usuários"} online
                </div>
                <button
                  onClick={fetchUsuariosOnline}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md shadow-blue-600/20 flex items-center gap-2"
                >
                  <span className="material-symbols-rounded">refresh</span>
                  Atualizar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-500">
          {loading ? (
            <div className="p-8 text-center text-slate-500">
              <span className="material-symbols-rounded animate-spin text-4xl mb-4 inline-block">
                sync
              </span>
              <p>Carregando usuários online...</p>
            </div>
          ) : usuarios.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <span className="material-symbols-rounded text-6xl mb-4 inline-block opacity-50">
                person_off
              </span>
              <p className="text-lg font-semibold">Nenhum usuário online no momento</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-700/30 border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider text-slate-500 font-bold">
                    <th className="px-6 py-4">Usuário</th>
                    <th className="px-6 py-4">Local</th>
                    <th className="px-6 py-4">Conectado Desde</th>
                    <th className="px-6 py-4">Tempo Online</th>
                    <th className="px-6 py-4">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {usuarios.map((user, index) => (
                    <tr
                      key={user.username}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            {user.username}
                          </span>
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Online"></div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            {user.local}
                          </span>
                          <span className="text-xs text-slate-500">
                            {NOME_LOCAL[user.local] || "N/A"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {formatarData(user.connectedAt)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {user.tempoOnline.formatado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                        {user.ip}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          <p>
            Esta lista mostra apenas usuários com conexão WebSocket ativa. A lista é atualizada automaticamente a cada 5 segundos.
          </p>
          <p className="mt-2">
            ⚠️ Ao reiniciar o servidor, todas as conexões serão perdidas e a lista ficará vazia.
          </p>
        </div>
      </main>
    </div>
  );
};

export default UsuariosOnline;

