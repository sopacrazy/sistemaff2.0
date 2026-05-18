import React from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from '../components/AppHeader';

const ContasPagarHome = () => {
  const navigate = useNavigate();

  const modules = [
    {
      id: "lista_contas",
      title: "Contas a Pagar",
      subtitle: "Consulta de títulos e fornecedores",
      icon: "receipt_long",
      color: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
      path: "/financeiro/contas-pagar/lista"
    },
    {
      id: "produto_fornecedor",
      title: "Produto x Fornecedor",
      subtitle: "Consulta de compras por fornecedor",
      icon: "query_stats",
      color: "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400",
      path: "/financeiro/contas-pagar/produto-fornecedor"
    }
  ];

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans pb-20 transition-colors duration-300">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />

      <AppHeader title="Contas a Pagar" subtitle="Financeiro" icon="payments" iconGradient="from-emerald-500 to-green-400" iconShadow="shadow-emerald-500/20" onBack="/financeiro" />

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-4">
          <button onClick={() => navigate('/financeiro')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white shadow-sm hover:shadow-md transition-all font-bold">
            <span className="material-symbols-rounded">arrow_back</span> Voltar para Financeiro
          </button>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Modulo Ativo: Pagar</p>
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
                <h3 className="text-lg font-bold text-slate-800 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
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

export default ContasPagarHome;
