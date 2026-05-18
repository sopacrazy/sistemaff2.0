import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from '../components/AppHeader';

import { AuditoriaFiscal } from "./components/AuditoriaFiscal";
import { Painel } from "./components/Painel";
import { ConsultaVendas } from "./components/ConsultaVendas";
import { ConsultaNotaFiscal } from "./components/ConsultaNotaFiscal";
import { ConsultaProdutos } from "./components/ConsultaProdutos";
import { RelatorioPisCofins } from "./components/RelatorioPisCofins";
import { RelatorioFunrural } from "./components/RelatorioFunrural";
import { RelatorioNotasFaltantes } from "./components/RelatorioNotasFaltantes";
import { EstadoVisualizacao } from "./tipos";

const FILIAIS = [
    { codigo: "01", nome: "Matriz - Belém" },
    { codigo: "04", nome: "Filial - Castanhal" },
    { codigo: "06", nome: "Filial - Piedade" },
    { codigo: "22", nome: "Filial - Passarela" },
];

export const FiscalHome = () => {
    const navigate = useNavigate();

    const [telaAtual, setTelaAtual] = useState("MENU"); // MENU or one of EstadoVisualizacao
    const [filialSelecionada, setFilialSelecionada] = useState("01");

    const fiscalItems = [
        {
            id: EstadoVisualizacao.PAINEL,
            title: "Visão Geral",
            subtitle: "Dashboard e KPIs",
            icon: "dashboard",
            color: "blue"
        },
        {
            id: EstadoVisualizacao.CONSULTA,
            title: "Consultar Vendas",
            subtitle: "Análise de vendas PDV",
            icon: "search",
            color: "emerald"
        },
        {
            id: EstadoVisualizacao.CONSULTA_NF,
            title: "Consultar Notas",
            subtitle: "Visualizar notas fiscais",
            icon: "receipt_long",
            color: "cyan"
        },
        {
            id: EstadoVisualizacao.CONSULTA_PRODUTOS,
            title: "Consultar Produtos",
            subtitle: "Detalhes dos produtos",
            icon: "inventory_2",
            color: "indigo"
        },
        {
            id: EstadoVisualizacao.NOTAS_FALTANTES,
            title: "Auditoria Sequência",
            subtitle: "Gaps e notas faltantes",
            icon: "warning",
            color: "rose"
        },
        {
            id: EstadoVisualizacao.RELATORIO_PIS_COFINS,
            title: "Relatório PIS/COFINS",
            subtitle: "Tributação",
            icon: "request_quote",
            color: "amber"
        },
        {
            id: EstadoVisualizacao.AUDITORIA_FISCAL,
            title: "Auditoria Manual",
            subtitle: "Conferência de dados",
            icon: "fact_check",
            color: "purple"
        },
        {
            id: EstadoVisualizacao.RELATORIO_FUNRURAL,
            title: "Relatório Funrural",
            subtitle: "TES 130 e 141",
            icon: "agriculture",
            color: "orange"
        }
    ];

    const getColorClasses = (color: string) => {
        const colors: Record<string, string> = {
            emerald: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white dark:bg-emerald-900/20 dark:text-emerald-400 dark:group-hover:bg-emerald-600 dark:group-hover:text-white",
            blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-500 group-hover:text-white dark:bg-blue-900/20 dark:text-blue-400 dark:group-hover:bg-blue-600 dark:group-hover:text-white",
            red: "bg-red-50 text-red-600 group-hover:bg-red-500 group-hover:text-white dark:bg-red-900/20 dark:text-red-400 dark:group-hover:bg-red-600 dark:group-hover:text-white",
            purple: "bg-purple-50 text-purple-600 group-hover:bg-purple-500 group-hover:text-white dark:bg-purple-900/20 dark:text-purple-400 dark:group-hover:bg-purple-600 dark:group-hover:text-white",
            indigo: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white dark:bg-indigo-900/20 dark:text-indigo-400 dark:group-hover:bg-indigo-600 dark:group-hover:text-white",
            orange: "bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white dark:bg-orange-900/20 dark:text-orange-400 dark:group-hover:bg-orange-600 dark:group-hover:text-white",
            rose: "bg-rose-50 text-rose-600 group-hover:bg-rose-500 group-hover:text-white dark:bg-rose-900/20 dark:text-rose-400 dark:group-hover:bg-rose-600 dark:group-hover:text-white",
            cyan: "bg-cyan-50 text-cyan-600 group-hover:bg-cyan-500 group-hover:text-white dark:bg-cyan-900/20 dark:text-cyan-400 dark:group-hover:bg-cyan-600 dark:group-hover:text-white",
            amber: "bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white dark:bg-amber-900/20 dark:text-amber-400 dark:group-hover:bg-amber-600 dark:group-hover:text-white",
            slate: "bg-slate-50 text-slate-600 group-hover:bg-slate-500 group-hover:text-white dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-600 dark:group-hover:text-white",
        };
        return colors[color] || colors.slate;
    };

    const renderizarSubComponente = () => {
        switch (telaAtual) {
            case EstadoVisualizacao.PAINEL:
                return <Painel aoMudarTela={setTelaAtual} filial={filialSelecionada} />;
            case EstadoVisualizacao.CONSULTA:
                return <ConsultaVendas filial={filialSelecionada} />;
            case EstadoVisualizacao.CONSULTA_NF:
                return <ConsultaNotaFiscal filial={filialSelecionada} />;
            case EstadoVisualizacao.NOTAS_FALTANTES:
                return <RelatorioNotasFaltantes filial={filialSelecionada} />;
            case EstadoVisualizacao.RELATORIO_PIS_COFINS:
                return <RelatorioPisCofins filial={filialSelecionada} />;
            case EstadoVisualizacao.CONSULTA_PRODUTOS:
                return <ConsultaProdutos filial={filialSelecionada} />;
            case EstadoVisualizacao.RELATORIO_FUNRURAL:
                return <RelatorioFunrural filial={filialSelecionada} />;
            case EstadoVisualizacao.AUDITORIA_FISCAL:
                return <AuditoriaFiscal />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-[#F3F4F6] flex flex-col dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300 pb-20">
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />

            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-400/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-teal-400/10 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
            </div>

            <AppHeader title="FiscalFF" subtitle="Portal Contábil" icon="SF" iconGradient="from-indigo-600 to-indigo-400" iconShadow="shadow-indigo-600/20" onBack="/" />

            {/* Conteúdo Principal */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-6 relative z-10 flex flex-col">
                {telaAtual === "MENU" ? (
                    <>
                        <div className="mb-6 flex justify-between items-center">
                            <button onClick={() => navigate("/")} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-semibold group">
                                <span className="material-symbols-rounded group-hover:-translate-x-1 transition-transform">arrow_back</span>
                                Voltar para Início
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {fiscalItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setTelaAtual(item.id)}
                                    className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm hover:shadow-md border border-slate-100 dark:border-slate-700/50 flex items-center gap-4 transition-all duration-200 hover:scale-[1.01] hover:bg-slate-50/50 dark:hover:bg-slate-700/30 w-full text-left animate-in slide-in-from-bottom-2 fade-in"
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-300 shadow-sm ${getColorClasses(item.color)}`}>
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
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col flex-1 gap-4">
                        <div className="flex justify-between items-center">
                            <button onClick={() => setTelaAtual("MENU")} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-semibold group bg-white/50 dark:bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                                <span className="material-symbols-rounded group-hover:-translate-x-1 transition-transform text-sm">arrow_back</span>
                                Voltar ao Menu Fiscal
                            </button>
                            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-teal-500">
                                {fiscalItems.find(i => i.id === telaAtual)?.title}
                            </h2>
                        </div>

                        {/* RENDER ROOT DOM FOR FISCAL SUB-MODULES */}
                        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50 p-6 flex-1 min-h-0">
                            {renderizarSubComponente()}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default FiscalHome;
