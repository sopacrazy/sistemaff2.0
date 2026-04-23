import React, { useState, useEffect } from "react";
import axios from "axios";
import { Tooltip } from "@mui/material";
import { API_BASE_URL } from "./utils/apiConfig";

const StatusBar = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [isVpnConnected, setIsVpnConnected] = useState(false);
  const [isWsConnected, setIsWsConnected] = useState(false);

  // --- CHECKS ---
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    const handleWsStatus = (e) => setIsWsConnected(e.detail.connected);
    window.addEventListener('ws_status', handleWsStatus);
    return () => window.removeEventListener('ws_status', handleWsStatus);
  }, []);

  useEffect(() => {
    const checkStatus = async () => {
      // Se não tiver internet, nem adianta checar o resto (ou checa local)
      if (!navigator.onLine) {
        setIsDbConnected(false);
        setIsVpnConnected(false);
        return;
      }
      try {
        const [dbRes, vpnRes] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/db-status`, { timeout: 5000 }),
          axios.get(`${API_BASE_URL}/check-protheus`, { timeout: 5000 })
        ]);

        setIsDbConnected(dbRes.status === 'fulfilled' && dbRes.value.data.connected);
        setIsVpnConnected(vpnRes.status === 'fulfilled' && vpnRes.value.data.connected);
      } catch (err) {
        console.warn("Status Check Failed:", err);
        setIsDbConnected(false);
        setIsVpnConnected(false);
      }
    };

    checkStatus();
    const intervalId = setInterval(checkStatus, 30000); // Checa a cada 30s para não spammar
    return () => clearInterval(intervalId);
  }, []);

  const StatusIndicator = ({ label, subLabel, status, icon, color }) => (
    <Tooltip title={`${label}: ${status ? "Conectado" : "Desconectado"}`} arrow placement="top">
      <div className={`
         group flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 cursor-default
         ${status
          ? "bg-slate-800/5 hover:bg-slate-800/10 dark:bg-white/5 dark:hover:bg-white/10"
          : "bg-red-500/10 hover:bg-red-500/20"
        }
       `}>
        <div className="relative flex items-center justify-center w-5 h-5">
          <span className={`material-symbols-rounded text-lg ${status ? color : "text-red-500"}`}>
            {icon}
          </span>
          {status && (
            <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-white dark:border-slate-900 ${color.replace('text-', 'bg-')}`}>
              <span className={`absolute inset-0 rounded-full animate-ping opacity-75 ${color.replace('text-', 'bg-')}`}></span>
            </span>
          )}
        </div>
        <div className="hidden sm:flex flex-col leading-none">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${status ? "text-slate-600 dark:text-slate-300" : "text-red-600 dark:text-red-400"}`}>
            {label}
          </span>
          <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">
            {status ? "Online" : "Offline"}
          </span>
        </div>
      </div>
    </Tooltip>
  );

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-[1000] border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-[0_-5px_20px_-10px_rgba(0,0,0,0.1)] transition-colors duration-300">
      <div className="max-w-[1920px] mx-auto px-6 h-12 flex items-center justify-between">

        {/* Left: Branding & Version */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-700 dark:text-white leading-tight">
              Sistema FF <span className="text-slate-400 font-normal">Manager</span>
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-tight">
              v2.0.0 • © 2025 Adriano Martins
            </span>
          </div>
        </div>

        {/* Right: Connectivity Status */}
        <div className="flex items-center gap-2 md:gap-4">

          <StatusIndicator
            label="Internet"
            status={isOnline}
            icon="wifi"
            color="text-blue-500"
          />

          <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700 hidden sm:block"></div>

          <StatusIndicator
            label="Banco de Dados"
            status={isDbConnected}
            icon="database"
            color="text-emerald-500"
          />

          <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700 hidden sm:block"></div>

          <StatusIndicator
            label="VPN Corporativa"
            status={isVpnConnected}
            icon="vpn_lock"
            color="text-purple-500"
          />

        </div>
      </div>
    </footer>
  );
};

export default StatusBar;
