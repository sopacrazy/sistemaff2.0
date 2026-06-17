import React, { useState, useEffect } from "react";
import axios from "axios";
import { Tooltip } from "@mui/material";
import { API_BASE_URL } from "./utils/apiConfig";

const StatusBar = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [isVpnConnected, setIsVpnConnected] = useState(false);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [fourSalesLastSync, setFourSalesLastSync] = useState(null);
  const [fourSalesTables, setFourSalesTables] = useState([]);
  const [showFourSalesPopover, setShowFourSalesPopover] = useState(false);

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
        setIsDbConnected(false);
        setIsVpnConnected(false);
      }
    };

    checkStatus();
    const id = setInterval(checkStatus, 30000);
    return () => clearInterval(id);
  }, []);

  // 4Sales Job — verifica a cada 60s
  useEffect(() => {
    const check4Sales = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/4sales-job-status`, { timeout: 8000 });
        setFourSalesLastSync(res.data?.lastSync || null);
        setFourSalesTables(res.data?.tables || []);
      } catch {
        setFourSalesLastSync(null);
      }
    };

    check4Sales();
    const id = setInterval(check4Sales, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const StatusIndicator = ({ label, status, icon, color }) => (
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

  const FourSalesIndicator = () => {
    const isToday = (() => {
      if (!fourSalesLastSync) return false;
      const [d, m, y] = fourSalesLastSync.split("/");
      const today = new Date();
      return (
        parseInt(d) === today.getDate() &&
        parseInt(m) === today.getMonth() + 1 &&
        parseInt(y) === today.getFullYear()
      );
    })();

    const isActive  = !!fourSalesLastSync && isToday;
    const isDelayed = !!fourSalesLastSync && !isToday;

    const isTodayFn = (dateStr) => {
      if (!dateStr) return false;
      const [d, m, y] = dateStr.split("/");
      const today = new Date();
      return parseInt(d) === today.getDate() && parseInt(m) === today.getMonth() + 1 && parseInt(y) === today.getFullYear();
    };

    return (
      <div className="relative">
        {/* Popover */}
        {showFourSalesPopover && (
          <>
            {/* Overlay invisível para fechar */}
            <div className="fixed inset-0 z-[999]" onClick={() => setShowFourSalesPopover(false)} />
            <div className="absolute bottom-10 right-0 z-[1000] w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-rounded text-amber-500 text-base">sync</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider">4Sales Job</span>
                </div>
                <button onClick={() => setShowFourSalesPopover(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <span className="material-symbols-rounded text-sm">close</span>
                </button>
              </div>

              <div className="p-3 space-y-1.5">
                {fourSalesTables.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">Sem dados disponíveis</p>
                )}
                {fourSalesTables.map((t) => {
                  const ok = isTodayFn(t.lastSync);
                  return (
                    <div key={t.table} className={`flex items-center justify-between px-3 py-2 rounded-xl ${ok ? "bg-green-50 dark:bg-green-900/10" : t.lastSync ? "bg-red-50 dark:bg-red-900/10" : "bg-slate-50 dark:bg-slate-700/30"}`}>
                      <div>
                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{t.label}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{t.table}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-bold ${ok ? "text-green-600 dark:text-green-400" : t.lastSync ? "text-red-500 dark:text-red-400" : "text-slate-400"}`}>
                          {t.lastSync || "—"}
                        </span>
                        <span className={`material-symbols-rounded text-sm ${ok ? "text-green-500" : t.lastSync ? "text-red-500" : "text-slate-300"}`}>
                          {ok ? "check_circle" : t.lastSync ? "warning" : "radio_button_unchecked"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700 text-center">
                <span className="text-[10px] text-slate-400">Atualizado a cada 5 min • Clique fora para fechar</span>
              </div>
            </div>
          </>
        )}

        {/* Indicador clicável */}
        <Tooltip title="4Sales Job — clique para ver detalhes" arrow placement="top">
          <div
            onClick={() => setShowFourSalesPopover(v => !v)}
            className={`
              group flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 cursor-pointer
              ${isActive  ? "bg-slate-800/5 hover:bg-slate-800/10 dark:bg-white/5 dark:hover:bg-white/10" : ""}
              ${isDelayed ? "bg-red-500/10 hover:bg-red-500/20" : ""}
              ${!fourSalesLastSync ? "bg-amber-500/10 hover:bg-amber-500/20" : ""}
            `}
          >
            <div className="relative flex items-center justify-center w-5 h-5">
              <span className={`material-symbols-rounded text-lg
                ${isActive  ? "text-amber-500" : ""}
                ${isDelayed ? "text-red-500"   : ""}
                ${!fourSalesLastSync ? "text-amber-400" : ""}
              `}>
                {isDelayed ? "sync_problem" : "sync"}
              </span>
              {isActive && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-white dark:border-slate-900 bg-amber-500">
                  <span className="absolute inset-0 rounded-full animate-ping opacity-75 bg-amber-500"></span>
                </span>
              )}
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <span className={`text-[10px] font-bold uppercase tracking-wider
                ${isActive  ? "text-slate-600 dark:text-slate-300" : ""}
                ${isDelayed ? "text-red-600 dark:text-red-400"     : ""}
                ${!fourSalesLastSync ? "text-amber-600 dark:text-amber-400" : ""}
              `}>
                4Sales Job
              </span>
              <span className={`text-[9px] font-semibold
                ${isDelayed ? "text-red-500 dark:text-red-400" : "text-slate-400 dark:text-slate-500"}
              `}>
                {isActive  ? fourSalesLastSync  : ""}
                {isDelayed ? `${fourSalesLastSync} ⚠` : ""}
                {!fourSalesLastSync ? "Sem dados" : ""}
              </span>
            </div>
          </div>
        </Tooltip>
      </div>
    );
  };

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
              v{__APP_VERSION__} • © 2025 Adriano Martins
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

          <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700 hidden sm:block"></div>

          <FourSalesIndicator />

        </div>
      </div>
    </footer>
  );
};

export default StatusBar;
