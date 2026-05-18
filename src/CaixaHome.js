import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from './utils/apiConfig';
import AppHeader from './components/AppHeader';

// Modal Component (Reutilizado de Faturamento/Home)
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const CaixaHome = () => {
  const navigate = useNavigate();

  // --- HEADER & SHARED STATE ---
  const [username, setUsername] = useState("");
  const [local, setLocal] = useState("01");

  // --- INITIALIZATION ---
  useEffect(() => {
    const storedUser = sessionStorage.getItem("username") || localStorage.getItem("username");
    const storedLocal = sessionStorage.getItem("local") || localStorage.getItem("origem") || "01";

    if (storedUser) setUsername(storedUser);
    setLocal(storedLocal);
  }, []);

  // --- HEADER HANDLERS ---
  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/login");
  };

  // --- MENU ITEMS DEFINITION ---
  const caixaItems = [
    {
      title: "Bilhete",
      subtitle: "Pedidos e vendas de hoje",
      icon: "confirmation_number",
      color: "emerald",
      onClick: () => navigate("/caixa/bilhete"),
    },
    {
      title: "NFE",
      subtitle: "Emissão de nota fiscal",
      icon: "description",
      color: "rose",
      onClick: () => navigate("/caixa/nfe"),
    },
  ];

  const getColorClasses = (color) => {
    const colors = {
      emerald: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white dark:bg-emerald-900/20 dark:text-emerald-400 dark:group-hover:bg-emerald-600 dark:group-hover:text-white",
      blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-500 group-hover:text-white dark:bg-blue-900/20 dark:text-blue-400 dark:group-hover:bg-blue-600 dark:group-hover:text-white",
      rose: "bg-rose-50 text-rose-600 group-hover:bg-rose-500 group-hover:text-white dark:bg-rose-900/20 dark:text-rose-400 dark:group-hover:bg-rose-600 dark:group-hover:text-white",
      slate: "bg-slate-50 text-slate-600 group-hover:bg-slate-500 group-hover:text-white dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-600 dark:group-hover:text-white",
    };
    return colors[color] || colors.slate;
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300 pb-20">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />

      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-emerald-400/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
      </div>

      <AppHeader title="Caixa" subtitle="Operacional" icon="payments" iconGradient="from-emerald-600 to-green-400" iconShadow="shadow-emerald-600/20" onBack="/" />

      {/* Voltar para Home */}
      <div className="max-w-7xl mx-auto px-6 mt-6">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition-colors font-semibold group">
          <span className="material-symbols-rounded group-hover:-translate-x-1 transition-transform">arrow_back</span>
          Voltar para Início
        </button>
      </div>

      {/* Menu Cards */}
      <main className="max-w-7xl mx-auto px-6 py-6 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {caixaItems.map((item, index) => {
            const colorClass = getColorClasses(item.color);

            return (
              <button
                key={index}
                onClick={item.onClick}
                className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm hover:shadow-md border border-slate-100 dark:border-slate-700/50 flex items-center gap-4 transition-all duration-200 hover:scale-[1.01] hover:bg-slate-50/50 dark:hover:bg-slate-700/30 w-full text-left animate-in slide-in-from-bottom-2 fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-300 shadow-sm ${colorClass}`}>
                  <span className="material-symbols-rounded text-2xl">{item.icon}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-slate-800 dark:text-white leading-tight group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-1">
                    {item.subtitle}
                  </p>
                </div>
                <span className="material-symbols-rounded text-slate-300 dark:text-slate-600 -translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                  arrow_forward
                </span>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default CaixaHome;
