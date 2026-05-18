import React from "react";
import { useNavigate } from "react-router-dom";

const RHHome = () => {
  const navigate = useNavigate();

  const options = [
    {
      title: "Recrutamento IA",
      description: "Triagem Inteligente de Currículos e ranking de candidatos.",
      icon: "psychology",
      color: "from-indigo-600 to-purple-500",
      path: "/rh/recruitai",
    },
    {
      title: "Gerador de Contrato (Protheus)",
      description: "Geração automática de contratos de experiência e documentos admissionais.",
      icon: "description",
      color: "from-emerald-500 to-teal-600",
      path: "/rh/contrato",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300 pb-20">
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0"
        rel="stylesheet"
      />

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/")}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                <span className="material-symbols-rounded text-2xl">arrow_back</span>
              </button>
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-tr from-purple-600 to-indigo-500 h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-600/20">
                  <span className="material-symbols-rounded text-2xl">groups</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold leading-tight text-slate-800 dark:text-white">
                    Recursos Humanos
                  </h1>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    SistemaFF - Gestão de Pessoas
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {options.map((option, index) => (
            <button
              key={index}
              onClick={() => navigate(option.path)}
              className="group relative bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 text-left overflow-hidden"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${option.color} opacity-5 -mr-16 -mt-16 rounded-full group-hover:scale-150 transition-transform duration-500`}></div>
              
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${option.color} flex items-center justify-center text-white mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                <span className="material-symbols-rounded text-3xl">{option.icon}</span>
              </div>

              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {option.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                {option.description}
              </p>

              <div className="flex items-center text-sm font-bold text-indigo-600 dark:text-indigo-400 gap-2">
                <span>Acessar Módulo</span>
                <span className="material-symbols-rounded text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RHHome;
