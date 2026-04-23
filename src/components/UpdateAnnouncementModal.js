
import React, { useState } from 'react';

const UpdateAnnouncementModal = ({ isOpen, onClose, onOpenChamado }) => {
    const [dontShowAgain, setDontShowAgain] = useState(false);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-5 duration-300 border border-slate-200 dark:border-slate-700">
                {/* Hero Section */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] animate-pulse"></div>
                    <div className="relative z-10">
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg ring-4 ring-white/10">
                            <span className="material-symbols-rounded text-4xl text-white">forum</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Nova Central de Chamados</h2>
                        <span className="px-3 py-1 bg-white/20 text-white text-xs font-bold rounded-full uppercase tracking-wider backdrop-blur-sm">
                            Atualização 2.0
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
                                <span className="material-symbols-rounded text-xl">chat</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white text-lg">Chat em Tempo Real</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Converse diretamente com o suporte técnico dentro de cada chamado. Troque mensagens, envie detalhes e resolva problemas muito mais rápido.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                                <span className="material-symbols-rounded text-xl">history</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white text-lg">Histórico Centralizado</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Acompanhe todos os seus chamados, status e conversas antigas em um único lugar organizado.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
                        <button 
                            onClick={() => {
                                onOpenChamado(dontShowAgain); // Pass state
                                onClose(dontShowAgain); // Should ideally be handled by parent but kept for safety/fallback if parent uses this
                            }}
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
                        >
                            <span>Experimentar Agora</span>
                            <span className="material-symbols-rounded group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </button>
                        <button 
                            onClick={() => onClose(dontShowAgain)} // Pass state
                            className="w-full py-3 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-semibold transition-colors"
                        >
                            Ver depois
                        </button>
                        
                        {/* Checkbox for don't show again */}
                        <div className="flex items-center justify-center gap-2 mt-2">
                            <input 
                                type="checkbox" 
                                id="dontShowAgain" 
                                checked={dontShowAgain} 
                                onChange={(e) => setDontShowAgain(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <label htmlFor="dontShowAgain" className="text-xs text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                                Não mostrar esta mensagem novamente
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpdateAnnouncementModal;
