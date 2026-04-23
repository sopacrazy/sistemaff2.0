import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { API_BASE_URL } from '../utils/apiConfig';
import { TextField, Autocomplete, Tooltip } from "@mui/material";
import dayjs from "dayjs";
import debounce from "lodash.debounce";

const Almoxarifado = () => {
    const [subTab, setSubTab] = useState('solicitar');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [historico, setHistorico] = useState([]);
    const [loadingHistorico, setLoadingHistorico] = useState(false);
    const [produtosOptions, setProdutosOptions] = useState([]);
    const username = sessionStorage.getItem("username") || "sistema";
    const userSetor = sessionStorage.getItem("setor") || "";

    // Estado do formulário
    const [formData, setFormData] = useState({
        dataEntrega: dayjs().format('YYYY-MM-DD'),
        observacao: '',
        items: [{ codigo: '', descricao: '', quantidade: 1 }]
    });

    // --- Busca de Produtos ---
    const fetchProdutos = useCallback(async (term) => {
        if (!term || term.length < 2) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/chamados/almo-produtos`, {
                params: { search: term.toUpperCase() }
            });
            const produtos = res.data.map((p) => ({
                ...p,
                descricao: p.descricao,
                codigo: p.codigo,
                unidade: p.unidade || "",
            }));
            setProdutosOptions(produtos);
        } catch (err) {
            console.error("Erro ao buscar produtos:", err);
        }
    }, []);

    const debouncedFetchProdutos = useMemo(
        () => debounce(fetchProdutos, 300),
        [fetchProdutos]
    );

    // --- Histórico ---
    const fetchHistorico = async () => {
        setLoadingHistorico(true);
        try {
            // Nova rota interna mapeada no chamadoRoutes
            const response = await axios.get(`${API_BASE_URL}/chamados/almo-solicitacoes/${username}`);
            setHistorico(response.data);
        } catch (error) {
            console.error("Erro ao buscar histórico do almoxarifado:", error);
            setHistorico([]);
        } finally {
            setLoadingHistorico(false);
        }
    };

    useEffect(() => {
        if (subTab === 'historico') {
            fetchHistorico();
        }
    }, [subTab]);

    // --- Manipulação do Formulário ---
    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { codigo: '', descricao: '', quantidade: 1 }]
        }));
    };

    const removeItem = (index) => {
        if (formData.items.length === 1) return;
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validações
        if (!formData.dataEntrega) {
            Swal.fire('Erro', 'Data da entrega é obrigatória', 'warning');
            return;
        }
        if (!formData.observacao.trim()) {
            Swal.fire('Erro', 'O campo observação é obrigatório para informar o destino', 'warning');
            return;
        }
        const itemsValidos = formData.items.every(item => item.descricao && item.quantidade > 0);
        if (!itemsValidos) {
            Swal.fire('Erro', 'Todos os itens precisam de descrição e quantidade', 'warning');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                usuario: username,
                setor: userSetor,
                local: "TI/SISTEMA", // Informação de quem está preenchendo ou de onde partiu
                data_entrega: formData.dataEntrega,
                observacao: formData.observacao,
                itens: formData.items // Passa o array diretamente pq o backend agrupa via node
            };

            // Post para nova rota interna no server.js (chamadoRoutes)
            await axios.post(`${API_BASE_URL}/chamados/almo-solicitacoes`, payload);

            Swal.fire({
                icon: 'success',
                title: 'Pedido Realizado!',
                text: 'Sua solicitação de almoxarifado foi enviada com sucesso.',
                confirmButtonColor: '#10b981'
            });

            // Reseta form
            setFormData({
                dataEntrega: dayjs().format('YYYY-MM-DD'),
                observacao: '',
                items: [{ codigo: '', descricao: '', quantidade: 1 }]
            });
            setSubTab('historico');

        } catch (error) {
            console.error("Erro ao enviar pedido:", error);
            Swal.fire('Erro', 'Não foi possível enviar o pedido. Tente novamente mais tarde.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Atendido': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
            case 'Parcialmente atendido': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
            case 'Negado': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
            default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
        }
    };

    // Estilo costumizado para os inputs MUI para combinar com o modal original
    const textFieldStyles = {
        "& .MuiOutlinedInput-root": {
            borderRadius: "0.75rem",
            backgroundColor: "transparent",
            paddingLeft: "36px",
            transition: "all 0.2s",
            "& fieldset": { borderColor: "#e2e8f0" },
            "&:hover fieldset": { borderColor: "#cbd5e1" },
            "&.Mui-focused fieldset": { borderColor: "#3b82f6", borderWidth: "2px" },
        },
        ".dark & .MuiOutlinedInput-root": {
            "& fieldset": { borderColor: "#475569" },
            "&:hover fieldset": { borderColor: "#64748b" },
        },
        "& .MuiInputBase-input": {
            padding: "10px 14px 10px 42px !important",
            color: "inherit"
        }
    };

    const qdtFieldStyles = {
        ...textFieldStyles,
        "& .MuiOutlinedInput-root": {
            ...textFieldStyles["& .MuiOutlinedInput-root"],
            paddingLeft: "10px", // Less padding for QTD
        }
    }

    return (
        <div className="flex flex-col h-full bg-transparent">
            {/* Sub Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 px-6 bg-transparent">
                <button
                    onClick={() => setSubTab('solicitar')}
                    className={`py-3 px-4 text-sm font-semibold transition-colors relative ${subTab === 'solicitar'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                >
                    Nova Solicitação
                    {subTab === 'solicitar' && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></span>
                    )}
                </button>
                <button
                    onClick={() => setSubTab('historico')}
                    className={`py-3 px-4 text-sm font-semibold transition-colors relative ${subTab === 'historico'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                >
                    Histórico
                    {subTab === 'historico' && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></span>
                    )}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-900/20 p-0">
                {subTab === 'solicitar' ? (
                    <div className="p-8 max-w-2xl mx-auto animate-in fade-in duration-200">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Header do Form */}
                            <div className="grid grid-cols-1 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Data de Entrega Desejada <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-rounded text-lg">calendar_month</span>
                                        <input
                                            type="date"
                                            required
                                            value={formData.dataEntrega}
                                            onChange={(e) => setFormData(p => ({ ...p, dataEntrega: e.target.value }))}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Itens */}
                            <div className="space-y-4 pt-2">
                                <div className="flex justify-between items-center">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Itens do Pedido <span className="text-red-500">*</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={addItem}
                                        className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded transition-colors"
                                    >
                                        <span className="material-symbols-rounded text-sm relative top-[-1px]">add</span>
                                        Adicionar Item
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {formData.items.map((item, index) => (
                                        <div key={index} className="flex flex-col md:flex-row gap-3 relative group">
                                            <div className="flex-1 relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-rounded text-lg z-10 pointer-events-none">inventory_2</span>
                                                <Autocomplete
                                                    freeSolo
                                                    options={produtosOptions}
                                                    getOptionLabel={(opt) => typeof opt === 'string' ? opt : opt.descricao || ''}
                                                    renderOption={(props, option) => {
                                                        const { key, ...restProps } = props;
                                                        return (
                                                            <li key={key || option.codigo} {...restProps} className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex flex-col items-start text-sm">
                                                                <span className="text-slate-700 dark:text-slate-300 font-medium">{option.descricao}</span>
                                                                <span className="text-xs font-bold font-mono text-slate-500 bg-slate-200/50 dark:bg-slate-700/50 px-2 py-0.5 rounded mt-1">
                                                                    Cód: {option.codigo}
                                                                </span>
                                                            </li>
                                                        );
                                                    }}
                                                    onInputChange={(_, newValue) => {
                                                        const upper = newValue.toUpperCase();
                                                        handleItemChange(index, 'descricao', upper);
                                                        debouncedFetchProdutos(upper);
                                                    }}
                                                    onChange={(_, newValue) => {
                                                        if (newValue && typeof newValue === 'object') {
                                                            handleItemChange(index, 'descricao', newValue.descricao);
                                                            handleItemChange(index, 'codigo', newValue.codigo);
                                                        }
                                                    }}
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            placeholder="Produto (Nome ou Código)"
                                                            required
                                                            size="small"
                                                            sx={textFieldStyles}
                                                        />
                                                    )}
                                                    className="bg-white dark:bg-slate-800 rounded-xl"
                                                />
                                            </div>
                                            <div className="w-full md:w-32 flex gap-2">
                                                <div className="relative flex-1">
                                                    <TextField
                                                        placeholder="Qtd"
                                                        type="number"
                                                        required
                                                        size="small"
                                                        value={item.quantidade}
                                                        onChange={(e) => handleItemChange(index, 'quantidade', e.target.value)}
                                                        inputProps={{ min: 1, style: { paddingLeft: "14px" } }}
                                                        sx={qdtFieldStyles}
                                                        className="bg-white dark:bg-slate-800 rounded-xl w-full"
                                                    />
                                                </div>
                                                {formData.items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(index)}
                                                        className="p-2.5 text-slate-400 hover:text-red-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl transition-colors shrink-0"
                                                        title="Remover Item"
                                                    >
                                                        <span className="material-symbols-rounded text-lg">delete</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Observação */}
                            <div className="pt-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Observação / Destino <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-3 text-slate-400 material-symbols-rounded text-lg">description</span>
                                    <textarea
                                        required
                                        rows="3"
                                        placeholder="Informe para onde vai o item ou detalhes adicionais..."
                                        value={formData.observacao}
                                        onChange={(e) => setFormData(p => ({ ...p, observacao: e.target.value }))}
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white resize-none"
                                    ></textarea>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <span className="material-symbols-rounded text-lg animate-spin">progress_activity</span>
                                    ) : (
                                        <span className="material-symbols-rounded text-lg">send</span>
                                    )}
                                    {isSubmitting ? 'Enviando Pedido...' : 'Enviar Solicitação'}
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="p-8 max-w-4xl mx-auto animate-in fade-in duration-200">
                        {loadingHistorico ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                                <p className="text-slate-500 font-medium">Carregando solicitações...</p>
                            </div>
                        ) : historico.length > 0 ? (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                                            <tr>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Data</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Itens</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Ação</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                            {historico.map((pedido) => (
                                                <tr key={pedido.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                                                    <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                                                        {dayjs(pedido.data_pedido).format('DD/MM/YYYY')}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate">
                                                            {pedido.items?.map(i => `${i.quantidade}x ${i.descricao}`).join(', ')}
                                                        </p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(pedido.status)}`}>
                                                            {pedido.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Tooltip title="Ver Detalhes">
                                                            <button className="text-slate-400 hover:text-blue-600 transition-colors">
                                                                <span className="material-symbols-rounded">visibility</span>
                                                            </button>
                                                        </Tooltip>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-2">
                                    <span className="material-symbols-rounded text-4xl">inventory_2</span>
                                </div>
                                <div className="max-w-xs">
                                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Sem solicitações</h3>
                                    <p className="text-sm text-slate-500">Você ainda não realizou nenhum pedido ao almoxarifado.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Almoxarifado;
