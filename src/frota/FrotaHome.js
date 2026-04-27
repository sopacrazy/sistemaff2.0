import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from '../contexts/ThemeContext';
import axios from "axios";
import { API_BASE_URL } from '../utils/apiConfig';

// Modal Component (Reutilizado)
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

const FrotaHome = () => {
    const navigate = useNavigate();
    const { theme } = useTheme();

    // --- HEADER & SHARED STATE ---
    const [username, setUsername] = useState("");
    const [permissoes, setPermissoes] = useState({});
    const [local, setLocal] = useState("08");
    const [date, setDate] = useState(new Date());

    const [isDateModalOpen, setIsDateModalOpen] = useState(false);
    const [tempDate, setTempDate] = useState("");

    // --- INITIALIZATION ---
    useEffect(() => {
        const storedUser = sessionStorage.getItem("username") || localStorage.getItem("username");
        const storedLocal = sessionStorage.getItem("origem") || localStorage.getItem("local") || "08";

        if (storedUser) setUsername(storedUser);
        setLocal(storedLocal);

        const fetchPermissoes = async () => {
            if (storedUser) {
                try {
                    const userResp = await axios.get(`${API_BASE_URL}/usuarios`);
                    const user = userResp.data.find((u) => u.username?.toLowerCase() === storedUser?.toLowerCase());
                    if (user) {
                        const permissoesResp = await axios.get(`${API_BASE_URL}/permissoes/usuario/${user.id}`);
                        setPermissoes(permissoesResp.data || {});
                    }
                } catch (err) {
                    console.error("Erro ao buscar permissões:", err);
                }
            }
        };
        fetchPermissoes();
    }, []);

    const hasPerm = (key) => {
        // If permission key is null, everyone has access
        if (!key) return true;
        return Boolean(
            permissoes[key] ||
            permissoes[key?.normalize("NFD").replace(/[\u0300-\u036f]/g, "")]
        );
    };

    const handleLogout = () => {
        sessionStorage.clear();
        localStorage.removeItem("token");
        navigate("/login");
    };

    const toggleDarkMode = () => document.documentElement.classList.toggle("dark");

    const openDateModal = () => {
        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - (offset * 60 * 1000));
        setTempDate(localDate.toISOString().split('T')[0]);
        setIsDateModalOpen(true);
    };

    const saveDate = () => {
        if (!tempDate) return;
        const [y, m, d] = tempDate.split('-');
        const newDate = new Date(y, m - 1, d, 12, 0, 0);
        setDate(newDate);
        setIsDateModalOpen(false);
    };

    // --- MENU ITEMS DEFINITION ---
    const frotaItems = [
        {
            title: "Checklist",
            subtitle: "Inspeção diária da frota",
            icon: "checklist",
            color: "red",
            onClick: () => navigate("/frota/checklist"),
            permission: null, // Open for now, or "FROTA_CHECKLIST"
        },
        {
            title: "Veículos",
            subtitle: "Cadastro e gestão da frota",
            icon: "directions_car", // or local_shipping
            color: "blue",
            onClick: () => navigate("/frota/veiculos"),
            permission: null,
        },
        {
            title: "Motoristas",
            subtitle: "Controle de condutores",
            icon: "badge", // or person_pin
            color: "emerald",
            onClick: () => navigate("/frota/motoristas"),
            permission: null,
        },
        {
            title: "Manutenção",
            subtitle: "Ordens de serviço e revisões",
            icon: "build",
            color: "orange",
            onClick: () => navigate("/frota/manutencao"),
            permission: null,
        },
        {
            title: "Abastecimento",
            subtitle: "Controle de combustível",
            icon: "local_gas_station",
            color: "purple",
            onClick: () => navigate("/frota/abastecimento"),
            permission: null,
        },
        {
            title: "Pneus",
            subtitle: "Gestão de rodados",
            icon: "tire_repair", // material symbol might be 'tire_repair' or just 'settings' if not avail
            color: "slate",
            onClick: () => alert("Módulo de Pneus em desenvolvimento"),
            permission: null,
        },
        {
            title: "Multas",
            subtitle: "Infrações e pontuação",
            icon: "priority_high",
            color: "rose",
            onClick: () => alert("Módulo de Multas em desenvolvimento"),
            permission: null,
        },
        {
            title: "Relatórios",
            subtitle: "Indicadores de desempenho",
            icon: "bar_chart",
            color: "cyan",
            onClick: () => alert("Relatórios em desenvolvimento"),
            permission: null,
        }
    ];

    const getColorClasses = (color, disabled) => {
        if (disabled) return "bg-gray-100 text-gray-400 dark:bg-gray-800/50 dark:text-gray-600";
        const colors = {
            emerald: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white dark:bg-emerald-900/20 dark:text-emerald-400 dark:group-hover:bg-emerald-600 dark:group-hover:text-white",
            blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-500 group-hover:text-white dark:bg-blue-900/20 dark:text-blue-400 dark:group-hover:bg-blue-600 dark:group-hover:text-white",
            red: "bg-red-50 text-red-600 group-hover:bg-red-500 group-hover:text-white dark:bg-red-900/20 dark:text-red-400 dark:group-hover:bg-red-600 dark:group-hover:text-white",
            purple: "bg-purple-50 text-purple-600 group-hover:bg-purple-500 group-hover:text-white dark:bg-purple-900/20 dark:text-purple-400 dark:group-hover:bg-purple-600 dark:group-hover:text-white",
            indigo: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white dark:bg-indigo-900/20 dark:text-indigo-400 dark:group-hover:bg-indigo-600 dark:group-hover:text-white",
            orange: "bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white dark:bg-orange-900/20 dark:text-orange-400 dark:group-hover:bg-orange-600 dark:group-hover:text-white",
            rose: "bg-rose-50 text-rose-600 group-hover:bg-rose-500 group-hover:text-white dark:bg-rose-900/20 dark:text-rose-400 dark:group-hover:bg-rose-600 dark:group-hover:text-white",
            cyan: "bg-cyan-50 text-cyan-600 group-hover:bg-cyan-500 group-hover:text-white dark:bg-cyan-900/20 dark:text-cyan-400 dark:group-hover:bg-cyan-600 dark:group-hover:text-white",
            slate: "bg-slate-50 text-slate-600 group-hover:bg-slate-500 group-hover:text-white dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-600 dark:group-hover:text-white",
        };
        return colors[color] || colors.slate;
    };

    return (
        <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300 pb-20">
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />

            {/* Modals Injetados */}
            <Modal isOpen={isDateModalOpen} onClose={() => setIsDateModalOpen(false)} title="Alterar Data">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Data de Trabalho:</label>
                <input type="date" value={tempDate} onChange={(e) => setTempDate(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-green-500 outline-none transition-all dark:text-white dark:[color-scheme:dark]" />
                <button onClick={saveDate} className="mt-6 w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all">Confirmar</button>
            </Modal>

            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-red-400/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
            </div>

            {/* Header Glass */}
            <header className="sticky top-0 z-50 px-6 py-4">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-slate-700/50 px-6 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
                            <div className="bg-gradient-to-tr from-red-600 to-red-400 h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-600/20">
                                <span className="font-bold text-xl italic tracking-tighter">SF</span>
                            </div>
                            <div>
                                <h1 className="text-lg font-bold leading-tight text-slate-800 dark:text-white">Frota</h1>
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Gestão de Veículos</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 md:gap-4">
                            <button onClick={openDateModal} className="hidden md:flex items-center gap-2 mr-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 px-3 py-2 rounded-xl transition-all cursor-pointer group border border-transparent hover:border-slate-200 dark:hover:border-slate-600">
                                <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-1.5 rounded-lg">
                                    <span className="material-symbols-rounded text-lg">calendar_today</span>
                                </div>
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data</span>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{date.toLocaleDateString('pt-BR')}</span>
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

            {/* Voltar para Home (Estilo Moderno) */}
            <div className="max-w-7xl mx-auto px-6 mt-6">
                <button onClick={() => navigate("/")} className="flex items-center gap-2 text-slate-500 hover:text-green-600 transition-colors font-semibold group">
                    <span className="material-symbols-rounded group-hover:-translate-x-1 transition-transform">arrow_back</span>
                    Voltar para Início
                </button>
            </div>

            {/* Compact Menu Layout */}
            <main className="max-w-7xl mx-auto px-6 py-6 relative z-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {frotaItems.map((item, index) => {
                        // For now, no strict permissions for frota items, or adapt as needed
                        // const isDisabled = item.permission && !hasPerm(item.permission); 
                        const isDisabled = false;
                        const colorClass = getColorClasses(item.color, isDisabled);

                        if (isDisabled) {
                            return (
                                <div key={index} className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/30 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed grayscale">
                                    <div className={`w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-400 flex items-center justify-center`}>
                                        <span className="material-symbols-rounded text-xl">{item.icon}</span>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400">{item.title}</h3>
                                    </div>
                                </div>
                            );
                        }

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

export default FrotaHome;
