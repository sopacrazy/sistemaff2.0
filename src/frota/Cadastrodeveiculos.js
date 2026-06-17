import React from 'react';
import { useNavigate } from 'react-router-dom';
import FrotaHeader from './components/FrotaHeader';

const Cadastrodeveiculos = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] font-sans">
            <link
                href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0"
                rel="stylesheet"
            />

            <FrotaHeader />

            <main className="max-w-3xl mx-auto px-6 py-20 flex flex-col items-center justify-center text-center">
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-14 w-full flex flex-col items-center gap-6">

                    {/* Ícone animado */}
                    <div className="relative">
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-full p-6">
                            <span className="material-symbols-rounded text-6xl text-blue-400 dark:text-blue-500">
                                directions_car
                            </span>
                        </div>
                        <div className="absolute -top-1 -right-1 bg-amber-400 rounded-full w-6 h-6 flex items-center justify-center shadow-md">
                            <span className="material-symbols-rounded text-white text-sm">build</span>
                        </div>
                    </div>

                    {/* Textos */}
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight mb-2">
                            Módulo em Desenvolvimento
                        </h2>
                        <p className="text-slate-400 dark:text-slate-500 text-sm font-medium max-w-sm mx-auto leading-relaxed">
                            O cadastro e gestão de veículos está sendo desenvolvido e estará disponível em breve.
                        </p>
                    </div>

                    {/* Badge status */}
                    <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-4 py-2 rounded-xl border border-amber-100 dark:border-amber-800/30">
                        <span className="material-symbols-rounded text-base">schedule</span>
                        <span className="text-xs font-bold uppercase tracking-widest">Em breve</span>
                    </div>

                    {/* Botão voltar */}
                    <button
                        onClick={() => navigate('/frota')}
                        className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 active:scale-95 text-white rounded-xl font-semibold text-sm transition-all shadow-md mt-2"
                    >
                        <span className="material-symbols-rounded text-[18px]">arrow_back</span>
                        Voltar para Frota
                    </button>
                </div>
            </main>
        </div>
    );
};

export default Cadastrodeveiculos;
