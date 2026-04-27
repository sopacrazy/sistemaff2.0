import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FrotaHeader from './components/FrotaHeader';
import Swal from 'sweetalert2';
import axios from 'axios';
import { API_BASE_URL } from '../utils/apiConfig';

// Componente Modal Interno
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-6xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh]">
                <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-100 p-2 rounded-xl text-red-600">
                            <span className="material-symbols-rounded">local_gas_station</span>
                        </div>
                        <h3 className="font-bold text-lg text-slate-800">{title}</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-slate-100 rounded-full">
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
};

const Abastecimento = () => {
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    
    // Estado dos Filtros Simplificados
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');

    // Lista de abastecimentos (Simulado)
    const [abastecimentos, setAbastecimentos] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAbastecimentos = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/api/frota/abastecimento`);
            setAbastecimentos(response.data);
        } catch (error) {
            console.error("Erro ao buscar abastecimentos:", error);
            Swal.fire("Erro", "Não foi possível carregar os dados de abastecimento.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAbastecimentos();
    }, []);

    const [formData, setFormData] = useState({
        requerimento: '',
        empresa: 'Fort Fruit LTDA',
        data: '',
        placa: '',
        motorista: '',
        tipo: 'Diesel',
        cupom: '',
        posto: '',
        dataAbastecido: '',
        kmAbast: '',
        kmAbastAtual: '',
        kmRod: '',
        kmLt: '',
        quantidade: '',
        valorVenda: '',
        valorCorreto: '',
        descricao: '',
        obs: '',
        preco: '',
        hora: '',
        nomeProduto: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const formatCurrency = (value) => {
        if (!value) return '';
        const numericValue = value.replace(/\D/g, '');
        const formattedValue = (Number(numericValue) / 100).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        });
        return formattedValue;
    };

    const handleCurrencyChange = (e) => {
        const { name, value } = e.target;
        const formatted = formatCurrency(value);
        setFormData(prev => ({
            ...prev,
            [name]: formatted
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            const user = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
            
            // Limpa formatação de moeda para enviar números ao banco
            const cleanCurrency = (val) => {
                if (typeof val !== 'string') return val;
                return parseFloat(val.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
            };

            const dataToSend = {
                ...formData,
                data_registro: formData.data || new Date().toISOString().split('T')[0],
                data_abastecido: formData.dataAbastecido || new Date().toISOString().split('T')[0],
                km_abast: parseInt(formData.kmAbast) || 0,
                km_abast_atual: parseInt(formData.kmAbastAtual) || 0,
                km_rod: parseInt(formData.kmRod) || 0,
                km_lt: cleanCurrency(formData.kmLt),
                quantidade: cleanCurrency(formData.quantidade),
                preco: cleanCurrency(formData.preco),
                valor_venda: cleanCurrency(formData.valorVenda),
                valor_correto: cleanCurrency(formData.valorCorreto),
                usuario: user.username || 'Sistema'
            };

            if (isEditing) {
                await axios.put(`${API_BASE_URL}/api/frota/abastecimento/${formData.id}`, dataToSend);
                Swal.fire('Atualizado!', 'Dados de abastecimento atualizados com sucesso.', 'success');
            } else {
                await axios.post(`${API_BASE_URL}/api/frota/abastecimento`, dataToSend);
                Swal.fire('Sucesso!', 'Dados de abastecimento registrados com sucesso.', 'success');
            }

            fetchAbastecimentos();
            setIsModalOpen(false);
            setIsEditing(false);
            
            // Limpar form
            setFormData({
                requerimento: '', empresa: 'Fort Fruit LTDA', data: '', placa: '', motorista: '', tipo: 'Diesel',
                cupom: '', posto: '', dataAbastecido: '', kmAbast: '', kmAbastAtual: '', kmRod: '',
                kmLt: '', quantidade: '', valorVenda: '', valorCorreto: '', descricao: '', obs: '', preco: '', hora: '', nomeProduto: ''
            });

        } catch (error) {
            console.error("Erro ao salvar abastecimento:", error);
            Swal.fire("Erro", "Não foi possível salvar o abastecimento.", "error");
        }
    };

    const handleView = (item) => {
        setSelectedItem(item);
        setIsDetailModalOpen(true);
    };

    const handleEdit = (item) => {
        setFormData({ ...item });
        setIsEditing(true);
        setIsDetailModalOpen(false);
        setIsModalOpen(true);
    };

    // Lógica de Filtragem Simplificada
    const filteredAbastecimentos = useMemo(() => {
        return abastecimentos.filter(item => {
            // Filtro por Data
            const matchDate = filterDate ? item.data === filterDate : true;
            
            // Filtro de Texto Global
            const searchLower = searchTerm.toLowerCase();
            const matchText = searchTerm === '' || 
                (item.requerimento?.toLowerCase().includes(searchLower)) ||
                (item.empresa?.toLowerCase().includes(searchLower)) ||
                (item.placa?.toLowerCase().includes(searchLower)) ||
                (item.motorista?.toLowerCase().includes(searchLower)) ||
                (item.tipo?.toLowerCase().includes(searchLower)) ||
                (item.cupom?.toLowerCase().includes(searchLower)) ||
                (item.posto?.toLowerCase().includes(searchLower)) ||
                (item.kmAbast?.toString().includes(searchLower)) ||
                (item.kmAbastAtual?.toString().includes(searchLower)) ||
                (item.kmLt?.toString().includes(searchLower)) ||
                (item.valorVenda?.toLowerCase().includes(searchLower)) ||
                (item.valorCorreto?.toLowerCase().includes(searchLower));

            return matchDate && matchText;
        });
    }, [abastecimentos, searchTerm, filterDate]);

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Tem certeza?',
            text: "Esta ação não poderá ser desfeita!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sim, excluir!',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await axios.delete(`${API_BASE_URL}/api/frota/abastecimento/${id}`);
                    fetchAbastecimentos();
                    Swal.fire('Excluído!', 'O registro foi removido.', 'success');
                } catch (error) {
                    console.error("Erro ao excluir:", error);
                    Swal.fire("Erro", "Não foi possível excluir o registro.", "error");
                }
            }
        });
    };
    const clearFilters = () => {
        setSearchTerm('');
        setFilterDate('');
    };

    return (
        <div className="min-h-screen bg-[#F3F4F6] text-slate-800 font-sans pb-10">
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
            
            <FrotaHeader date={new Date()} />

            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                    <div>
                        <button onClick={() => navigate("/frota")} className="flex items-center gap-2 text-slate-400 hover:text-red-600 font-semibold group mb-1 text-xs transition-colors">
                            <span className="material-symbols-rounded text-base group-hover:-translate-x-1 duration-200">arrow_back</span>
                            Voltar
                        </button>
                        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Abastecimento</h1>
                    </div>
                    <button 
                        onClick={() => {
                            setFormData({
                                requerimento: '', empresa: 'Fort Fruit LTDA', data: '', placa: '', motorista: '', tipo: 'Diesel',
                                cupom: '', posto: '', dataAbastecido: '', kmAbast: '', kmAbastAtual: '', kmRod: '',
                                kmLt: '', quantidade: '', valorVenda: '', valorCorreto: '', descricao: '', obs: '', preco: '', hora: '', nomeProduto: ''
                            });
                            setIsEditing(false);
                            setIsModalOpen(true);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold shadow-xl shadow-red-600/20 transition-all active:scale-95 flex items-center gap-2 uppercase tracking-tight font-inter text-sm"
                    >
                        <span className="material-symbols-rounded">add</span>
                        Novo Abastecimento
                    </button>
                </div>

                {/* Filtros Ajustados */}
                <section className="bg-white rounded-[24px] shadow-sm border border-slate-100 p-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600">
                                <span className="material-symbols-rounded text-xl">search</span>
                            </div>
                            <h2 className="font-bold text-lg text-slate-800">Filtrar Lançamentos</h2>
                        </div>
                        {(searchTerm || filterDate) && (
                            <button 
                                onClick={clearFilters}
                                className="flex items-center gap-2 text-slate-400 hover:text-red-500 font-bold text-[10px] uppercase tracking-widest transition-colors"
                            >
                                <span className="material-symbols-rounded text-base">filter_alt_off</span>
                                Limpar
                            </button>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 items-end">
                        <div className="md:col-span-3 lg:col-span-4 space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Pesquisa Geral</label>
                            <div className="relative group">
                                <span className="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xl group-focus-within:text-blue-500 transition-colors">search</span>
                                <input 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-semibold placeholder:text-slate-300 shadow-inner" 
                                    placeholder="Placa, motorista, empresa, posto, requerimento..." 
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Por Dia</label>
                            <input 
                                type="date" 
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-semibold shadow-inner" 
                            />
                        </div>
                    </div>
                </section>

                {/* Lista de Abastecimentos */}
                <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/30">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600">
                                <span className="material-symbols-rounded text-xl">history</span>
                            </div>
                            <h2 className="font-bold text-lg text-slate-800">Lançamentos Encontrados</h2>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-3 py-1.5 rounded-full border border-slate-100">
                            {filteredAbastecimentos.length} Registro(s)
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    <th className="px-8 py-3.5">Data</th>
                                    <th className="px-8 py-3.5">Placa</th>
                                    <th className="px-8 py-3.5">Motorista</th>
                                    <th className="px-8 py-3.5">Posto</th>
                                    <th className="px-8 py-3.5">Quantidade</th>
                                    <th className="px-8 py-3.5">Valor</th>
                                    <th className="px-8 py-3.5 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredAbastecimentos.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-8 py-16 text-center text-slate-400 font-bold uppercase italic text-xs tracking-widest animate-pulse">
                                            {loading ? 'Carregando dados...' : 'Nenhum abastecimento encontrado para esta busca.'}
                                        </td>
                                    </tr>
                                ) : filteredAbastecimentos.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-4 text-sm font-semibold text-slate-600">
                                            {item.data_registro ? new Date(item.data_registro).toLocaleDateString('pt-BR') : '---'}
                                        </td>
                                        <td className="px-8 py-4">
                                            <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-xs font-black tracking-wider border border-slate-200 group-hover:bg-red-50 group-hover:text-red-700 group-hover:border-red-100 transition-colors">
                                                {item.placa}
                                            </span>
                                        </td>
                                        <td className="px-8 py-4 text-sm font-bold text-slate-700 uppercase">
                                            {item.motorista}
                                        </td>
                                        <td className="px-8 py-4 text-sm font-semibold text-slate-500 italic">
                                            {item.posto}
                                        </td>
                                        <td className="px-8 py-4 text-sm font-bold text-slate-600">
                                            {item.quantidade} <span className="text-[9px] text-slate-400">Lts</span>
                                        </td>
                                        <td className="px-8 py-4 text-sm font-black text-emerald-600">
                                            {item.valor_correto ? new Number(item.valor_correto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                                        </td>
                                        <td className="px-8 py-4 text-center">
                                            <button 
                                                onClick={() => handleView(item)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors bg-transparent hover:bg-blue-50 rounded-lg"
                                                title="Visualizar"
                                            >
                                                <span className="material-symbols-rounded text-xl">visibility</span>
                                            </button>
                                            <button 
                                                onClick={() => handleEdit(item)}
                                                className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors bg-transparent hover:bg-emerald-50 rounded-lg"
                                                title="Editar"
                                            >
                                                <span className="material-symbols-rounded text-xl">edit</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredAbastecimentos.length === 0 && (
                            <div className="p-16 text-center text-slate-400 font-bold uppercase italic text-xs tracking-widest animate-pulse">
                                Nenhum abastecimento encontrado para esta busca.
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Modal Novo/Editar Abastecimento */}
            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setIsEditing(false); }} title={isEditing ? "Editar Abastecimento" : "Novo Abastecimento"}>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Linha 1: Comum a todos */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tipo</label>
                            <select name="tipo" value={formData.tipo} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-bold text-slate-600">
                                <option value="Diesel">Diesel</option>
                                <option value="Gasolina">Gasolina</option>
                                <option value="Produto">Produto</option>
                            </select>
                        </div>
                        {formData.tipo === 'Produto' && (
                            <div className="space-y-1 animate-in fade-in zoom-in-95 duration-300">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Produto <span className="text-red-500">*</span></label>
                                <select 
                                    required
                                    name="nomeProduto" 
                                    value={formData.nomeProduto} 
                                    onChange={handleInputChange} 
                                    className="w-full px-4 py-2.5 rounded-xl border-2 border-red-100 bg-red-50/30 focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-bold text-red-600"
                                >
                                    <option value="">Selecione...</option>
                                    <option value="Arla">Arla</option>
                                    <option value="Extintor">Extintor</option>
                                    <option value="Filtro">Filtro</option>
                                    <option value="Lubrax">Lubrax</option>
                                    <option value="Lubrificante">Lubrificante</option>
                                </select>
                            </div>
                        )}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Empresa</label>
                            <select name="empresa" value={formData.empresa} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-bold text-slate-600">
                                <option value="Fort Fruit LTDA">Fort Fruit LTDA</option>
                                <option value="Bem Pra Gente">Bem Pra Gente</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Placa</label>
                            <input name="placa" value={formData.placa} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-bold uppercase" placeholder="ABC-1234" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Data</label>
                            <input type="date" name="data" value={formData.data} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" />
                        </div>

                        {/* Linha 2: Comum a todos */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Motorista</label>
                            <input name="motorista" value={formData.motorista} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" placeholder="Nome do Motorista" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Requerimento</label>
                            <input name="requerimento" value={formData.requerimento} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" placeholder="Nº Requerimento" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Cupom</label>
                            <input name="cupom" value={formData.cupom} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" placeholder="Nº Cupom Fiscal" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Posto</label>
                            <input name="posto" value={formData.posto} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" placeholder="Nome do Posto" />
                        </div>

                        {/* Campos específicos baseados no TIPO */}
                        {formData.tipo === 'Produto' ? (
                            <>
                                {/* Layout para PRODUTO */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Data que foi comprado</label>
                                    <input type="date" name="dataAbastecido" value={formData.dataAbastecido} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Hora</label>
                                    <input type="time" name="hora" value={formData.hora} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Quantidade</label>
                                    <input type="number" step="0.01" name="quantidade" value={formData.quantidade} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" placeholder="0.00" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Preço</label>
                                    <input name="preco" value={formData.preco} onChange={handleCurrencyChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-bold text-slate-700" placeholder="R$ 0,00" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor Venda</label>
                                    <input name="valorVenda" value={formData.valorVenda} onChange={handleCurrencyChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-bold text-blue-600" placeholder="R$ 0,00" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor Correto</label>
                                    <input name="valorCorreto" value={formData.valorCorreto} onChange={handleCurrencyChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-bold text-emerald-600" placeholder="R$ 0,00" />
                                </div>
                                <div className="space-y-1 md:col-span-3">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Descrição <span className="text-red-500">*</span></label>
                                    <textarea required name="descricao" value={formData.descricao} onChange={handleInputChange} rows="2" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" placeholder="Descrição obrigatória para produtos..."></textarea>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Layout para ABASTECIMENTO (Diesel/Gasolina) */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Data que foi abastecido</label>
                                    <input type="date" name="dataAbastecido" value={formData.dataAbastecido} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Hora</label>
                                    <input type="time" name="hora" value={formData.hora} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                        KM Abast. <span className="text-red-500">*</span>
                                    </label>
                                    <input required type="number" name="kmAbast" value={formData.kmAbast} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" placeholder="0" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">KM Abaste. Atual</label>
                                    <input type="number" name="kmAbastAtual" value={formData.kmAbastAtual} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" placeholder="0" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Km Rod.</label>
                                    <input type="number" name="kmRod" value={formData.kmRod} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" placeholder="0" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">KM/LT</label>
                                    <input type="number" step="0.01" name="kmLt" value={formData.kmLt} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" placeholder="0.00" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Quantidade (Lts)</label>
                                    <input type="number" step="0.01" name="quantidade" value={formData.quantidade} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" placeholder="0.00" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Preço</label>
                                    <input name="preco" value={formData.preco} onChange={handleCurrencyChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-bold text-slate-700" placeholder="R$ 0,00" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor Venda</label>
                                    <input name="valorVenda" value={formData.valorVenda} onChange={handleCurrencyChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-bold text-blue-600" placeholder="R$ 0,00" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor Correto</label>
                                    <input name="valorCorreto" value={formData.valorCorreto} onChange={handleCurrencyChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-bold text-emerald-600" placeholder="R$ 0,00" />
                                </div>
                                <div className="space-y-1 md:col-span-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                                    <textarea name="descricao" value={formData.descricao} onChange={handleInputChange} rows="1" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" placeholder="Detalhes..."></textarea>
                                </div>
                                <div className="space-y-1 md:col-span-4">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Observações</label>
                                    <textarea name="obs" value={formData.obs} onChange={handleInputChange} rows="2" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" placeholder="Observações internas..."></textarea>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="mt-6 flex justify-end gap-3 px-1 pb-1">
                        <button type="button" onClick={() => { setIsModalOpen(false); setIsEditing(false); }} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all font-inter text-sm">Cancelar</button>
                        <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-8 rounded-xl shadow-lg shadow-red-600/20 transition-all active:scale-95 flex items-center gap-2 uppercase tracking-tight text-xs font-inter">
                            <span className="material-symbols-rounded text-lg">{isEditing ? 'update' : 'save'}</span>
                            {isEditing ? 'Atualizar Registro' : 'Salvar Registro'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Detalhes Abastecimento */}
            <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Detalhes do Abastecimento">
                {selectedItem && (
                    <div className="space-y-6 pb-2">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 font-inter">Requerimento</p>
                                <p className="text-sm font-bold text-slate-800 font-inter">{selectedItem.requerimento || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 font-inter">Empresa</p>
                                <p className="text-sm font-bold text-slate-800 font-inter">{selectedItem.empresa}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 font-inter">Data Lançamento</p>
                                <p className="text-sm font-bold text-slate-800 font-inter">{new Date(selectedItem.data).toLocaleDateString('pt-BR')}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 font-inter">Placa</p>
                                <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-lg text-[10px] font-black tracking-wider border border-red-100 font-inter">{selectedItem.placa}</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 font-inter">Motorista</p>
                                <p className="text-xs font-bold text-slate-800 uppercase font-inter">{selectedItem.motorista}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 font-inter">Posto</p>
                                <p className="text-xs font-bold text-slate-800 italic font-inter">{selectedItem.posto}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 font-inter">Tipo Combustível</p>
                                <p className="text-xs font-bold text-slate-800 font-inter">{selectedItem.tipo || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 font-inter">Cupom/NF</p>
                                <p className="text-xs font-bold text-slate-800 font-inter">{selectedItem.cupom || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-5 rounded-[20px] border border-slate-100 shadow-inner">
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 font-inter">KM Anterior</p>
                                <p className="text-base font-black text-slate-700 font-inter">{selectedItem.kmAbast || '0'}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 font-inter">KM Atual</p>
                                <p className="text-base font-black text-slate-700 font-inter">{selectedItem.kmAbastAtual || '0'}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 font-inter">KM Rodados</p>
                                <p className="text-base font-black text-blue-600 font-inter">{selectedItem.kmRod || '0'}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 font-inter">Média (KM/LT)</p>
                                <p className="text-base font-black text-orange-500 font-inter">{selectedItem.kmLt || '0.00'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-emerald-50 p-4 rounded-[20px] border border-emerald-100 shadow-sm">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="material-symbols-rounded text-emerald-600 text-base">water_drop</span>
                                    <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest font-inter">Quantidade</p>
                                </div>
                                <p className="text-xl font-black text-emerald-700 font-inter">{selectedItem.quantidade} Lts</p>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-[20px] border border-blue-100 shadow-sm">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="material-symbols-rounded text-blue-600 text-base">payments</span>
                                    <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest font-inter">Valor Venda</p>
                                </div>
                                <p className="text-xl font-black text-blue-700 font-inter">{selectedItem.valorVenda}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-[20px] border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="material-symbols-rounded text-slate-400 text-base">verified</span>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-inter">Valor Correto</p>
                                </div>
                                <p className="text-xl font-black text-slate-600 font-inter">{selectedItem.valorCorreto || selectedItem.valorVenda}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <div className="flex items-center gap-2 mb-1.5 ml-1">
                                    <span className="material-symbols-rounded text-slate-400 text-sm">description</span>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-inter">Descrição</p>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-slate-100 text-xs text-slate-500 italic font-inter shadow-sm">
                                    {selectedItem.descricao || "Nenhuma descrição fornecida."}
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1.5 ml-1">
                                    <span className="material-symbols-rounded text-slate-400 text-sm">notes</span>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-inter">Observações</p>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-slate-100 text-xs text-slate-500 font-inter shadow-sm">
                                    {selectedItem.obs || "Sem observações registradas."}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => setIsDetailModalOpen(false)} className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-10 rounded-xl transition-all active:scale-95 uppercase text-[10px] tracking-[0.2em] font-inter shadow-lg">
                                    Fechar Detalhes
                                </button>
                        </div>
                    </div>
                )}
            </Modal>


            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}</style>
        </div>
    );
};

export default Abastecimento;
