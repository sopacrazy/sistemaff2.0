import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { API_BASE_URL } from '../utils/apiConfig';
import { useTheme } from '../contexts/ThemeContext';
import FrotaHeader from "./components/FrotaHeader";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

const VEHICLE_TYPES = {
    "01": "Truck",
    "02": "Toco",
    "03": "Cavalo Mecânico",
    "04": "VAN",
    "05": "Utilitário",
    "06": "Outros",
    "07": "3/4",
    "08": "Bitruck",
    "09": "VUC"
};

const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-4xl" }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200`}>
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center shrink-0 bg-white dark:bg-slate-800 z-10">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        {title}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>
                <div className="p-0 overflow-y-auto custom-scrollbar flex-1">
                    {children}
                </div>
            </div>
        </div>
    );
};

const SearchableSelect = ({ label, value, onChange, placeholder, searchEndpoint, resultMapper, required = false }) => {
    const [searchTerm, setSearchTerm] = useState(value || "");
    const [results, setResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setSearchTerm(value || "");
    }, [value]);

    const handleSearch = async (term) => {
        setSearchTerm(term);
        if (term.length < 2) {
            setResults([]);
            return;
        }
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}${searchEndpoint}?q=${term}`);
            setResults(response.data);
            setShowResults(true);
        } catch (error) {
            console.error("Erro na busca:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-1 relative">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1 italic">
                {required && <span className="text-red-500">*</span>} {label}
            </label>
            <div className="relative">
                <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => { if(results.length > 0) setShowResults(true); }}
                    onBlur={() => setTimeout(() => setShowResults(false), 200)}
                    placeholder={placeholder}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                    required={required}
                />
                {loading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
            </div>
            
            {showResults && results.length > 0 && (
                <div className="absolute z-[110] left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                    {results.map((item, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => {
                                const mapped = resultMapper(item);
                                onChange(mapped, item);
                                setSearchTerm(mapped.display);
                                setShowResults(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                        >
                            <p className="font-bold text-sm text-slate-800 dark:text-white">{resultMapper(item).display}</p>
                            {resultMapper(item).sub && <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">{resultMapper(item).sub}</p>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const MaintenanceTable = ({ data, onEdit, onView, onDelete }) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-700/50 text-xs text-slate-500 dark:text-slate-400 uppercase font-bold border-b border-slate-100 dark:border-slate-700">
                            <th className="px-6 py-4">Data</th>
                            <th className="px-6 py-4">Nota Fiscal</th>
                            <th className="px-6 py-4">Fornecedor</th>
                            <th className="px-6 py-4">Valor</th>
                            <th className="px-6 py-4">Placa</th>
                            <th className="px-6 py-4 text-center">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {data.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors text-sm">
                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                                    {dayjs.utc(item.data_nf).format('DD/MM/YYYY')}
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">
                                    {item.nf}
                                </td>
                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300 truncate max-w-[200px]" title={item.fornecedor_nome}>
                                    {item.fornecedor_nome}
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-800 dark:text-white whitespace-nowrap">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor_total)}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-1 rounded font-bold text-xs border border-slate-200 dark:border-slate-600 whitespace-nowrap">
                                        {item.placa}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center whitespace-nowrap">
                                    <div className="flex items-center justify-center gap-1">
                                        <button onClick={() => onView(item)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all" title="Visualizar">
                                            <span className="material-symbols-rounded">visibility</span>
                                        </button>
                                        <button onClick={() => onEdit(item)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all" title="Editar">
                                            <span className="material-symbols-rounded">edit</span>
                                        </button>
                                        <button onClick={() => {
                                            Swal.fire({
                                                title: 'Excluir registro?',
                                                text: "Esta ação não pode ser desfeita!",
                                                icon: 'warning',
                                                showCancelButton: true,
                                                confirmButtonColor: '#ef4444',
                                                cancelButtonColor: '#64748b',
                                                confirmButtonText: 'Sim, excluir!',
                                                cancelButtonText: 'Cancelar',
                                                reverseButtons: true,
                                                background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff',
                                                color: document.documentElement.classList.contains('dark') ? '#fff' : '#1e293b'
                                            }).then((result) => {
                                                if (result.isConfirmed) {
                                                    onDelete(item.id);
                                                }
                                            })
                                        }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" title="Excluir">
                                            <span className="material-symbols-rounded">delete</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ManutencaoPage = () => {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [loading, setLoading] = useState(false);
    const [records, setRecords] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [tiposManutencao, setTiposManutencao] = useState([]);
    const [isAddTypeModalOpen, setIsAddTypeModalOpen] = useState(false);
    const [newTypeName, setNewTypeName] = useState("");
    const [loadingTipos, setLoadingTipos] = useState(false);
    
    // Form States
    const [formData, setFormData] = useState({
        id: null,
        nf: "",
        valorTotal: "",
        fornecedor_id: "",
        fornecedor_nome: "",
        descricao: "",
        tipoManutencao: "",
        dataNF: dayjs().format('YYYY-MM-DD'),
        placa: "",
        veiculo_descricao: "",
        veiculo_tipo: "",
        observacoes: "",
        empresa: ""
    });

    const fetchTipos = useCallback(async () => {
        setLoadingTipos(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/frota/manutencao/tipos`);
            setTiposManutencao(response.data);
        } catch (error) {
            console.error("Erro ao carregar tipos:", error);
        } finally {
            setLoadingTipos(false);
        }
    }, []);

    const fetchRecords = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/frota/manutencao`);
            setRecords(response.data);
        } catch (error) {
            console.error("Erro ao buscar registros:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRecords();
        fetchTipos();
    }, [fetchRecords, fetchTipos]);

    const handleAddType = async (e) => {
        e.preventDefault();
        if (!newTypeName.trim()) return;
        try {
            await axios.post(`${API_BASE_URL}/frota/manutencao/tipos`, { nome: newTypeName.trim() });
            Swal.fire({
                icon: 'success',
                title: 'Sucesso!',
                text: 'Nova categoria adicionada!',
                timer: 2000,
                showConfirmButton: false,
                background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#fff' : '#1e293b'
            });
            setNewTypeName("");
            setIsAddTypeModalOpen(false);
            fetchTipos();
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Erro!',
                text: error.response?.data?.error || "Erro ao adicionar categoria",
                background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#fff' : '#1e293b'
            });
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleView = (item) => {
        setSelectedRecord(item);
        setIsViewModalOpen(true);
    };

    const handleEdit = (item) => {
        setFormData({
            id: item.id,
            nf: item.nf,
            valorTotal: item.valor_total.toString(),
            fornecedor_id: item.fornecedor_id,
            fornecedor_nome: item.fornecedor_nome,
            descricao: item.descricao,
            tipoManutencao: item.tipo_manutencao,
            dataNF: item.data_nf.split('T')[0],
            placa: item.placa,
            veiculo_descricao: item.veiculo_descricao || "",
            veiculo_tipo: item.veiculo_tipo || "",
            observacoes: item.observacoes || "",
            empresa: item.empresa
        });
        setIsAddModalOpen(true);
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`${API_BASE_URL}/frota/manutencao/${id}`);
            Swal.fire({
                icon: 'success',
                title: 'Excluído!',
                text: 'Registro removido com sucesso.',
                timer: 2000,
                showConfirmButton: false,
                background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#fff' : '#1e293b'
            });
            fetchRecords();
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Erro!',
                text: "Não foi possível excluir o registro.",
                background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#fff' : '#1e293b'
            });
            console.error("Erro ao excluir:", error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const body = {
            empresa: formData.empresa,
            data_nf: formData.dataNF,
            nf: formData.nf,
            fornecedor_id: formData.fornecedor_id,
            fornecedor_nome: formData.fornecedor_nome,
            valor_total: parseFloat(formData.valorTotal),
            placa: formData.placa,
            veiculo_descricao: formData.veiculo_descricao,
            veiculo_tipo: formData.veiculo_tipo,
            tipo_manutencao: formData.tipoManutencao,
            descricao: formData.descricao,
            observacoes: formData.observacoes,
            usuario: localStorage.getItem("username") || "sistema"
        };

        try {
            if (formData.id) {
                await axios.put(`${API_BASE_URL}/frota/manutencao/${formData.id}`, body);
            } else {
                await axios.post(`${API_BASE_URL}/frota/manutencao`, body);
            }
            Swal.fire({
                icon: 'success',
                title: 'Sucesso!',
                text: formData.id ? 'Registro atualizado!' : 'Registro cadastrado!',
                timer: 2500,
                showConfirmButton: false,
                background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#fff' : '#1e293b'
            });
            setIsAddModalOpen(false);
            resetForm();
            fetchRecords();
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Erro ao salvar',
                text: 'Tivemos um problema ao salvar as informações.',
                background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#fff' : '#1e293b'
            });
            console.error("Erro ao salvar:", error);
        }
    };

    const resetForm = () => {
        setFormData({
            id: null,
            nf: "",
            valorTotal: "",
            fornecedor_id: "",
            fornecedor_nome: "",
            descricao: "",
            tipoManutencao: "",
            dataNF: dayjs().format('YYYY-MM-DD'),
            placa: "",
            veiculo_descricao: "",
            veiculo_tipo: "",
            observacoes: "",
            empresa: ""
        });
    };

    const filteredRecords = records.filter(r => 
        (r.nf && r.nf.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.fornecedor_nome && r.fornecedor_nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.placa && r.placa.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300 pb-20">
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />

            <FrotaHeader />

            <div className="max-w-7xl mx-auto px-6 mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <button onClick={() => navigate("/frota/manutencao")} className="flex items-center gap-2 text-slate-500 hover:text-orange-600 transition-colors font-semibold group mb-2 text-sm">
                        <span className="material-symbols-rounded group-hover:-translate-x-1 transition-transform text-lg">arrow_back</span>
                        Voltar
                    </button>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white leading-tight">Controle NF Frota</h1>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Módulo de Manutenção</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchRecords}
                        className="p-3 bg-white dark:bg-slate-800 text-slate-400 hover:text-blue-500 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all hover:rotate-180"
                        title="Atualizar"
                    >
                        <span className="material-symbols-rounded">refresh</span>
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-1"
                    >
                        <span className="material-symbols-rounded">add</span>
                        Adicionar Manualmente
                    </button>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="mb-6 flex items-center gap-4">
                    <div className="flex-1 relative">
                        <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Pesquisar por Nota, Fornecedor ou Placa..." 
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                        />
                    </div>
                </div>

                {loading && (
                    <div className="flex justify-center py-20">
                        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                    </div>
                )}

                {!loading && filteredRecords.length === 0 && (
                    <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                        <span className="material-symbols-rounded text-6xl text-slate-200 dark:text-slate-700 mb-4">inventory_2</span>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum registro encontrado</p>
                    </div>
                )}

                {!loading && filteredRecords.length > 0 && (
                    <MaintenanceTable 
                        data={filteredRecords} 
                        onEdit={handleEdit} 
                        onView={handleView}
                        onDelete={handleDelete}
                    />
                )}
            </main>

            {/* Modal de Cadastro */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    resetForm();
                }}
                title={formData.id ? "Editar Manutenção" : "Adicionar Nota Fiscal Manualmente"}
                maxWidth="max-w-5xl"
            >
                <form onSubmit={handleSubmit} className="p-6 space-y-8">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-rounded text-blue-500">grid_view</span>
                            <h4 className="font-bold text-xs text-slate-400 uppercase tracking-widest">Dados da Nota Fiscal</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 flex items-center gap-1 italic"><span className="text-red-500">*</span> Nota Fiscal</label>
                                <input 
                                    type="text" 
                                    name="nf"
                                    value={formData.nf}
                                    onChange={handleInputChange}
                                    placeholder="Nº da Nota" 
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 flex items-center gap-1 italic"><span className="text-red-500">*</span> Valor Total</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">R$</span>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        name="valorTotal"
                                        value={formData.valorTotal}
                                        onChange={handleInputChange}
                                        placeholder="0,00" 
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 flex items-center gap-1 italic"><span className="text-red-500">*</span> Empresa</label>
                                <select 
                                    name="empresa"
                                    value={formData.empresa || ""}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer shadow-sm"
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    <option value="FORT FRUIT">Fort Fruit</option>
                                    <option value="BEM PRA GENTE">Bem Pra Gente</option>
                                </select>
                            </div>
                            
                            <div className="md:col-span-3">
                                <SearchableSelect 
                                    label="Fornecedor"
                                    value={formData.fornecedor_nome}
                                    onChange={(item) => setFormData(prev => ({ ...prev, fornecedor_id: item.id, fornecedor_nome: item.display }))}
                                    placeholder="Pesquisar fornecedor por nome ou código..."
                                    searchEndpoint="/frota/fornecedores/search"
                                    resultMapper={(item) => ({ id: item.codigo, display: item.nome, sub: item.codigo })}
                                    required={true}
                                />
                            </div>

                            <div className="md:col-span-3 space-y-1">
                                <label className="text-xs font-bold text-slate-500 flex items-center gap-1 italic"><span className="text-red-500">*</span> Descrição do Serviço/Peça</label>
                                <textarea 
                                    name="descricao"
                                    value={formData.descricao}
                                    onChange={handleInputChange}
                                    placeholder="Descreva detalhadamente o serviço ou as peças..." 
                                    rows="2"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none shadow-sm"
                                    required
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-rounded text-blue-500">info</span>
                            <h4 className="font-bold text-xs text-blue-500 uppercase tracking-widest">Informações Complementares</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-500 flex items-center gap-1 italic"><span className="text-red-500">*</span> Tipo de Manutenção</label>
                                    <button 
                                        type="button"
                                        onClick={() => setIsAddTypeModalOpen(true)}
                                        className="text-[10px] font-bold text-blue-500 hover:text-blue-600 uppercase flex items-center gap-0.5 transition-colors"
                                    >
                                        <span className="material-symbols-rounded text-sm">add_circle</span>
                                        Nova
                                    </button>
                                </div>
                                <select 
                                    name="tipoManutencao"
                                    value={formData.tipoManutencao}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer shadow-sm"
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    {tiposManutencao.map(tipo => (
                                        <option key={tipo.id} value={tipo.nome.toUpperCase()}>{tipo.nome}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 flex items-center gap-1 italic"><span className="text-red-500">*</span> Data da Nota</label>
                                <input 
                                    type="date" 
                                    name="dataNF"
                                    value={formData.dataNF}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm dark:[color-scheme:dark]"
                                    required
                                />
                            </div>
                            
                            <SearchableSelect 
                                label="Placa do Veículo"
                                value={formData.placa}
                                onChange={(mapped, raw) => {
                                    setFormData(prev => ({ 
                                        ...prev, 
                                        placa: mapped.id, 
                                        veiculo_descricao: raw.descricao,
                                        veiculo_tipo: VEHICLE_TYPES[raw.tipo_veiculo] || raw.tipo_veiculo
                                    }));
                                }}
                                placeholder="Pesquisar placa ou modelo..."
                                searchEndpoint="/frota/veiculos/search"
                                resultMapper={(item) => ({ id: item.placa, display: item.placa, sub: item.descricao })}
                                required={true}
                            />

                            {(formData.veiculo_descricao || formData.veiculo_tipo) && (
                                <div className="md:col-span-3 grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl">
                                        <p className="text-[10px] text-blue-500 uppercase font-black tracking-widest mb-1">Modelo / Descrição</p>
                                        <p className="font-bold text-sm text-slate-800 dark:text-white uppercase leading-tight">{formData.veiculo_descricao}</p>
                                    </div>
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl">
                                        <p className="text-[10px] text-blue-500 uppercase font-black tracking-widest mb-1">Tipo de Veículo</p>
                                        <p className="font-bold text-sm text-slate-800 dark:text-white uppercase leading-tight">{formData.veiculo_tipo}</p>
                                    </div>
                                </div>
                            )}

                            <div className="md:col-span-3 space-y-1">
                                <label className="text-xs font-bold text-slate-500 italic text-slate-400">Observações</label>
                                <textarea 
                                    name="observacoes"
                                    value={formData.observacoes}
                                    onChange={handleInputChange}
                                    placeholder="Detalhes adicionais, recomendações ou avisos..." 
                                    rows="2"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none shadow-sm"
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.01] active:scale-[0.99]">
                            <span className="material-symbols-rounded">save</span>
                            {formData.id ? "Atualizar Registro" : "Salvar Manutenção"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal de Visualização */}
            <Modal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                title="Detalhes da Manutenção"
                maxWidth="max-w-2xl"
            >
                {selectedRecord && (
                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Empresa</p>
                                <p className="font-bold text-slate-800 dark:text-white">{selectedRecord.empresa}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Data da Nota</p>
                                <p className="font-bold text-slate-800 dark:text-white">{dayjs.utc(selectedRecord.data_nf).format('DD/MM/YYYY')}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Nota Fiscal</p>
                                <p className="font-bold text-blue-600 dark:text-blue-400 text-lg">#{selectedRecord.nf}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Valor</p>
                                <p className="font-bold text-slate-800 dark:text-white text-lg">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedRecord.valor_total)}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2">Fornecedor</p>
                                <p className="font-bold text-slate-700 dark:text-slate-200">{selectedRecord.fornecedor_nome} <span className="text-slate-400 text-xs font-medium ml-2">({selectedRecord.fornecedor_id})</span></p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Veículo / Placa</p>
                                    <p className="font-bold text-slate-800 dark:text-white">{selectedRecord.placa}</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 uppercase leading-tight">{selectedRecord.veiculo_descricao || 'Não informado'}</p>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Tipo / Categoria</p>
                                    <p className="font-bold text-orange-500 uppercase">{selectedRecord.tipo_manutencao}</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 uppercase leading-tight">{selectedRecord.veiculo_tipo || '---'}</p>
                                </div>
                            </div>
                            
                            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2">Descrição do Serviço</p>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">{selectedRecord.descricao}</p>
                            </div>

                            {selectedRecord.observacoes && (
                                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2">Observações</p>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs italic">{selectedRecord.observacoes}</p>
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={() => setIsViewModalOpen(false)}
                            className="w-full py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 rounded-xl font-bold transition-all shadow-sm"
                        >
                            Fechar
                        </button>
                    </div>
                )}
            </Modal>
            {/* Modal para Nova Categoria */}
            <Modal
                isOpen={isAddTypeModalOpen}
                onClose={() => setIsAddTypeModalOpen(false)}
                title="Nova Categoria de Manutenção"
                maxWidth="max-w-md"
            >
                <form onSubmit={handleAddType} className="p-6 space-y-4">
                    <p className="text-xs text-slate-500 font-medium">Nome da nova categoria (ex: Elétrica, Troca de Óleo):</p>
                    <input 
                        type="text"
                        value={newTypeName}
                        onChange={(e) => setNewTypeName(e.target.value)}
                        placeholder="Nome da Categoria"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                        autoFocus
                        required
                    />
                    <div className="flex justify-end gap-2 pt-4">
                        <button 
                            type="button"
                            onClick={() => setIsAddTypeModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-sm"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-lg shadow-blue-500/20 text-sm"
                        >
                            Criar Categoria
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ManutencaoPage;
