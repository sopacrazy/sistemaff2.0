import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/apiConfig';
import { useTheme } from '../../contexts/ThemeContext';

const FrotaHeader = ({ date, setDate, onDateClick }) => {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const [username, setUsername] = useState("");
    const [local, setLocal] = useState("08");

    useEffect(() => {
        const storedUser = sessionStorage.getItem("username") || localStorage.getItem("username");
        const storedLocal = sessionStorage.getItem("origem") || localStorage.getItem("local") || "08";
        if (storedUser) setUsername(storedUser);
        setLocal(storedLocal);
    }, []);

    const handleLogout = () => {
        sessionStorage.clear();
        localStorage.removeItem("token");
        navigate("/login");
    };

    const toggleDarkMode = () => document.documentElement.classList.toggle("dark");

    return (
        <header className="sticky top-0 z-50 px-6 py-4">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-slate-700/50 px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/frota")}>
                        <div className="bg-gradient-to-tr from-red-600 to-red-400 h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-600/20">
                            <span className="font-bold text-xl italic tracking-tighter">SF</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold leading-tight text-slate-800 dark:text-white">Frota</h1>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Gestão de Veículos</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        <button
                            onClick={onDateClick}
                            className="hidden md:flex items-center gap-2 mr-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 px-3 py-2 rounded-xl transition-all cursor-pointer group border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
                        >
                            <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-1.5 rounded-lg">
                                <span className="material-symbols-rounded text-lg">calendar_today</span>
                            </div>
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data</span>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                    {date === 'all' || !date 
                                        ? "Histórico Completo" 
                                        : (date instanceof Date ? date.toLocaleDateString('pt-BR') : new Date(date + 'T12:00:00').toLocaleDateString('pt-BR'))}
                                </span>
                            </div>
                        </button>
                        <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 hidden md:block"></div>
                        <div className="flex items-center gap-3">
                            <div className="hidden md:flex flex-col items-end">
                                <span className="text-sm font-bold text-slate-800 dark:text-white">{username || "Admin"}</span>
                                <div className="text-[10px] font-bold text-white bg-slate-500/50 dark:bg-slate-700/50 px-2 py-0.5 rounded flex items-center gap-1 cursor-default select-none border border-white/10 opacity-80">
                                    LOCAL: {local}
                                </div>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 border-2 border-white dark:border-slate-600 flex items-center justify-center shadow-sm">
                                <span className="material-symbols-rounded text-slate-500 dark:text-slate-300">person</span>
                            </div>
                        </div>
                        <button onClick={toggleDarkMode} className="ml-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-600 dark:text-slate-300 border border-transparent hover:border-slate-300 dark:hover:border-slate-500">
                            <span className="material-symbols-rounded block dark:hidden text-xl">dark_mode</span>
                            <span className="material-symbols-rounded hidden dark:block text-xl">light_mode</span>
                        </button>
                        <button onClick={handleLogout} className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-all border border-transparent hover:border-red-200 dark:hover:border-red-800">
                            <span className="material-symbols-rounded text-xl">logout</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default FrotaHeader;
