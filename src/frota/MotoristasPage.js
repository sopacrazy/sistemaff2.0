import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from '../utils/apiConfig';
import Swal from 'sweetalert2';

// Reuse Modal defined in other files or create a new one
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
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

const MotoristasPage = () => {
    const navigate = useNavigate();
    const [motoristas, setMotoristas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Header State
    const [username, setUsername] = useState("");
    const [local, setLocal] = useState("08");
    const [date, setDate] = useState(new Date());

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        username: "",
        nome_motorista: "",
        password: "",
        ZH_NOMMOT: "",
        ZH_MOTOR: ""
    });

    useEffect(() => {
        const storedUser = sessionStorage.getItem("username");
        const storedLocal = sessionStorage.getItem("local") || "08";
        if (storedUser) setUsername(storedUser);
        setLocal(storedLocal);
        
        fetchMotoristas();
    }, []);

    const toggleDarkMode = () => document.documentElement.classList.toggle("dark");
    const handleLogout = () => {
        sessionStorage.clear();
        navigate("/login");
    };

    const fetchMotoristas = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/frota/motoristas`);
            setMotoristas(response.data);
        } catch (error) {
            console.error("Erro ao buscar motoristas:", error);
            Swal.fire('Erro', 'Falha ao carregar motoristas', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (motorista = null) => {
        if (motorista) {
            setEditingId(motorista.id);
            setFormData({
                username: motorista.username,
                nome_motorista: motorista.nome_motorista,
                password: motorista.password,
                ZH_NOMMOT: motorista.ZH_NOMMOT || motorista.nome_motorista, // Fallback if needed
                ZH_MOTOR: motorista.ZH_MOTOR
            });
        } else {
            setEditingId(null);
            setFormData({
                username: "",
                nome_motorista: "",
                password: "",
                ZH_NOMMOT: "",
                ZH_MOTOR: ""
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        try {
            if (editingId) {
                await axios.put(`${API_BASE_URL}/frota/motoristas/${editingId}`, formData);
                Swal.fire('Sucesso', 'Motorista atualizado!', 'success');
            } else {
                await axios.post(`${API_BASE_URL}/frota/motoristas`, formData);
                Swal.fire('Sucesso', 'Motorista cadastrado!', 'success');
            }
            setIsModalOpen(false);
            fetchMotoristas();
        } catch (error) {
            console.error("Erro ao salvar:", error);
            const msg = error.response?.data?.error || 'Falha ao salvar dados.';
            Swal.fire('Erro', msg, 'error');
        }
    };

    const handleDelete = async (id) => {
        try {
            const result = await Swal.fire({
                title: 'Tem certeza?',
                text: "Você não poderá reverter isso!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sim, remover!',
                cancelButtonText: 'Cancelar'
            });

            if (result.isConfirmed) {
                await axios.delete(`${API_BASE_URL}/frota/motoristas/${id}`);
                Swal.fire('Removido!', 'O motorista foi removido.', 'success');
                fetchMotoristas();
            }
        } catch (error) {
            console.error("Erro ao remover:", error);
            Swal.fire('Erro', 'Falha ao remover motorista.', 'error');
        }
    };

    const filtered = motoristas.filter(m => 
        m.nome_motorista?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans pb-20">
             <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />
            
             {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-emerald-400/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
            </div>

            {/* Header Glass */}
            <header className="sticky top-0 z-50 px-6 py-4">
                <div className="max-w-7xl mx-auto">
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-slate-700/50 px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
                    <div className="bg-gradient-to-tr from-emerald-600 to-teal-400 h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
                        <span className="font-bold text-xl italic tracking-tighter">SF</span>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold leading-tight text-slate-800 dark:text-white">Frota</h1>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Motoristas</span>
                    </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        <div className="hidden md:flex items-center gap-2 mr-2 bg-slate-100 dark:bg-slate-700/50 px-3 py-2 rounded-xl border border-transparent">
                            <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 p-1.5 rounded-lg">
                            <span className="material-symbols-rounded text-lg">calendar_today</span>
                            </div>
                            <div className="flex flex-col items-start leading-none">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data</span>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{date.toLocaleDateString('pt-BR')}</span>
                            </div>
                        </div>
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

            <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
                 <div className="flex items-center justify-between mb-8">
                    <div>
                        <button onClick={() => navigate("/frota")} className="flex items-center gap-2 text-slate-500 hover:text-green-600 transition-colors font-semibold group mb-2 text-sm">
                            <span className="material-symbols-rounded group-hover:-translate-x-1 transition-transform text-lg">arrow_back</span>
                            Voltar para Menu
                        </button>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Gestão de Motoristas</h1>
                        <p className="text-slate-500 text-sm">Gerencie os cadastros e acessos dos condutores.</p>
                    </div>
                    <button onClick={() => handleOpenModal()} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2">
                        <span className="material-symbols-rounded">add</span>
                        Novo Motorista
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-6 flex gap-4">
                    <div className="flex-1 relative">
                        <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                        <input 
                            type="text" 
                            placeholder="Buscar por nome ou usuário..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 font-bold text-slate-600 dark:text-slate-300 text-sm">ID</th>
                                    <th className="px-6 py-4 font-bold text-slate-600 dark:text-slate-300 text-sm">Nome Motorista</th>
                                    <th className="px-6 py-4 font-bold text-slate-600 dark:text-slate-300 text-sm">Usuário</th>
                                     <th className="px-6 py-4 font-bold text-slate-600 dark:text-slate-300 text-sm">Código (ZH_MOTOR)</th>
                                    <th className="px-6 py-4 font-bold text-slate-600 dark:text-slate-300 text-sm text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {loading ? (
                                    <tr><td colSpan="5" className="text-center py-8 text-slate-500">Carregando...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center py-8 text-slate-500">Nenhum registro encontrado.</td></tr>
                                ) : (
                                    filtered.map((m) => (
                                        <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">#{m.id}</td>
                                            <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">{m.nome_motorista}</td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-900/50 rounded-lg px-2 py-1 inline-block text-xs font-mono mx-6 my-2">{m.username}</td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-sm font-mono">{m.ZH_MOTOR}</td>
                                            <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                                <button onClick={() => handleOpenModal(m)} className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2 rounded-lg transition-colors" title="Editar">
                                                    <span className="material-symbols-rounded">edit</span>
                                                </button>
                                                <button onClick={() => handleDelete(m.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors" title="Remover">
                                                    <span className="material-symbols-rounded">delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal Form */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Editar Motorista" : "Novo Motorista"}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nome Completo</label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={formData.nome_motorista}
                            onChange={(e) => setFormData({...formData, nome_motorista: e.target.value, ZH_NOMMOT: e.target.value})} // Sync ZH_NOMMOT
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Usuário</label>
                            <input 
                                type="text" 
                                className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                                value={formData.username}
                                onChange={(e) => setFormData({...formData, username: e.target.value})}
                            />
                        </div>
                         <div>
                             <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Código (ZH_MOTOR)</label>
                            <input 
                                type="text" 
                                className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                                value={formData.ZH_MOTOR}
                                onChange={(e) => setFormData({...formData, ZH_MOTOR: e.target.value})}
                            />
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Senha</label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            placeholder={editingId ? "Mantenha a atual ou digite nova" : ""}
                        />
                    </div>
                    
                    <button onClick={handleSave} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all mt-4">
                        Salvar
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default MotoristasPage;
