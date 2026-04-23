import React from "react";
import { useNavigate } from "react-router-dom";
import FrotaHeader from "./components/FrotaHeader";

const ManutencaoHome = () => {
    const navigate = useNavigate();

    const menuItems = [
        {
            title: "Controle NF Frota",
            subtitle: "Gestão e cadastro de notas fiscais",
            icon: "receipt_long",
            color: "blue",
            path: "/frota/manutencao/controle"
        },
        {
            title: "Dashboard",
            subtitle: "Indicadores e gráficos de gastos",
            icon: "dashboard",
            color: "orange",
            path: "/frota/manutencao/dashboard"
        }
    ];

    const getColorClasses = (color) => {
        const colors = {
            blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-500 group-hover:text-white dark:bg-blue-900/20 dark:text-blue-400 dark:group-hover:bg-blue-600 dark:group-hover:text-white",
            orange: "bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white dark:bg-orange-900/20 dark:text-orange-400 dark:group-hover:bg-orange-600 dark:group-hover:text-white",
        };
        return colors[color] || colors.blue;
    };

    return (
        <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300 pb-20">
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />

            <FrotaHeader />

            <div className="max-w-7xl mx-auto px-6 mt-6">
                <button onClick={() => navigate("/frota")} className="flex items-center gap-2 text-slate-500 hover:text-orange-600 transition-colors font-semibold group mb-2 text-sm">
                    <span className="material-symbols-rounded group-hover:-translate-x-1 transition-transform text-lg">arrow_back</span>
                    Voltar para Home Frota
                </button>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white leading-tight">Manutenção de Frota</h1>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Selecione uma rotina para continuar</p>
            </div>

            <main className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {menuItems.map((item, index) => (
                        <button
                            key={index}
                            onClick={() => navigate(item.path)}
                            className="group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-800 p-8 shadow-sm hover:shadow-xl border border-slate-100 dark:border-slate-700/50 flex flex-col items-center text-center gap-6 transition-all duration-300 hover:-translate-y-2 animate-in zoom-in-95 duration-500"
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg group-hover:scale-110 ${getColorClasses(item.color)}`}>
                                <span className="material-symbols-rounded text-4xl">{item.icon}</span>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 transition-colors">
                                    {item.title}
                                </h3>
                                <p className="text-sm font-medium text-slate-400 dark:text-slate-500 line-clamp-2">
                                    {item.subtitle}
                                </p>
                            </div>
                            
                            <div className="mt-4 flex items-center gap-2 text-blue-500 font-bold text-sm opacity-0 group-hover:opacity-100 transition-all">
                                Acessar rotina
                                <span className="material-symbols-rounded">arrow_forward</span>
                            </div>

                            {/* Decorative background element */}
                            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-slate-100/50 dark:bg-slate-700/20 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors"></div>
                        </button>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default ManutencaoHome;
