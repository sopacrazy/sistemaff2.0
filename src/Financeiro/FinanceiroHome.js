import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from '../components/AppHeader';

const FinanceiroHome = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [local, setLocal] = useState("08");

  useEffect(() => {
    const u = localStorage.getItem("username");
    if (u) setUsername(u);
  }, []);

  const handleLogout = () => { localStorage.clear(); navigate("/login"); };

  const modules = [
    {
      id: "receber",
      title: "Contas a Receber",
      subtitle: "Gestão de entradas e clientes",
      icon: "arrow_circle_down",
      color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
      path: "/financeiro/contas-receber",
      disabled: false
    },
    {
      id: "pagar",
      title: "Contas a Pagar",
      subtitle: "Gestão de saídas e fornecedores",
      icon: "arrow_circle_up",
      color: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
      path: "/financeiro/contas-pagar",
      disabled: false
    }
  ];

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans pb-20 transition-colors duration-300">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />

      <AppHeader title="Financeiro" subtitle="Módulos" icon="payments" iconGradient="from-emerald-500 to-green-400" iconShadow="shadow-emerald-500/20" onBack="/" />

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-4">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white shadow-sm hover:shadow-md transition-all font-bold">
            <span className="material-symbols-rounded">arrow_back</span> Voltar para Home
          </button>
          <p className="text-slate-400 text-sm font-medium">Selecione o módulo financeiro para prosseguir</p>
        </div>

        {/* GRID DE MÓDULOS - MAIS SIMPLES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {modules.map((module) => (
            <button
              key={module.id}
              onClick={() => !module.disabled && navigate(module.path)}
              disabled={module.disabled}
              className={`group flex items-center gap-5 p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all text-left ${
                module.disabled 
                  ? "opacity-50 grayscale cursor-not-allowed" 
                  : "hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <div className={`w-14 h-14 rounded-xl ${module.color} flex items-center justify-center flex-shrink-0 ${!module.disabled && "group-hover:scale-110"} transition-transform`}>
                <span className="material-symbols-rounded text-3xl">{module.icon}</span>
              </div>
              <div>
                <h3 className={`text-lg font-bold text-slate-800 dark:text-white ${!module.disabled && "group-hover:text-blue-600 dark:group-hover:text-blue-400"} transition-colors`}>
                  {module.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  {module.subtitle}
                </p>
              </div>
              {!module.disabled && (
                <div className="ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                  <span className="material-symbols-rounded text-slate-400">arrow_forward</span>
                </div>
              )}
            </button>
          ))}
        </div>

      </main>
    </div>
  );
};

export default FinanceiroHome;


