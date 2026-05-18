import React from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from '../components/AppHeader';

const ContasReceberHome = () => {
  const navigate = useNavigate();

  const modules = [
    {
      id: "inadimplencias",
      title: "Inadimplências",
      subtitle: "Relatório de clientes e títulos",
      icon: "warning",
      color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
      path: "/financeiro/contas-receber/inadimplencias"
    },
    {
      id: "fechamento",
      title: "Fechamento Caixinha",
      subtitle: "Gestão de caixa diário",
      icon: "account_balance_wallet",
      color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
      path: "/financeiro/contas-receber/fechamento"
    },
    {
      id: "bilhete",
      title: "Bilhete",
      subtitle: "Pedidos e vendas de hoje",
      icon: "confirmation_number",
      color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
      path: "/caixa/bilhete"
    },
    {
      id: "nfe",
      title: "NFE",
      subtitle: "Emissão de nota fiscal",
      icon: "description",
      color: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
      path: "/caixa/nfe"
    },
    {
      id: "produto_cliente",
      title: "Produto x Cliente",
      subtitle: "Auditoria de vendas por cliente",
      icon: "query_stats",
      color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
      path: "/financeiro/contas-receber/produto-cliente"
    }
  ];

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans pb-20 transition-colors duration-300">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />

      <AppHeader title="Contas a Receber" subtitle="Financeiro" icon="payments" iconGradient="from-emerald-500 to-green-400" iconShadow="shadow-emerald-500/20" onBack="/financeiro" />

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-4">
          <button onClick={() => navigate('/financeiro')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white shadow-sm hover:shadow-md transition-all font-bold">
            <span className="material-symbols-rounded">arrow_back</span> Voltar para Financeiro
          </button>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Modulo Ativo: Receber</p>
          </div>
        </div>

        {/* GRID DE MÓDULOS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {modules.map((module) => (
            <button
              key={module.id}
              onClick={() => navigate(module.path)}
              className="group flex items-center gap-5 p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all text-left"
            >
              <div className={`w-14 h-14 rounded-xl ${module.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                <span className="material-symbols-rounded text-3xl">{module.icon}</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {module.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  {module.subtitle}
                </p>
              </div>
              <div className="ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                <span className="material-symbols-rounded text-slate-400">arrow_forward</span>
              </div>
            </button>
          ))}
        </div>

      </main>
    </div>
  );
};

export default ContasReceberHome;
