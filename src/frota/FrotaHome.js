import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from '../contexts/ThemeContext';
import axios from "axios";
import { API_BASE_URL } from '../utils/apiConfig';
import AppHeader from '../components/AppHeader';

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

            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-red-400/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
            </div>

            <AppHeader title="Frota" subtitle="Gestão de Veículos" icon="SF" iconGradient="from-red-600 to-red-400" iconShadow="shadow-red-600/20" onBack="/" />

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
