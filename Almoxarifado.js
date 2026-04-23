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
            const res = await axios.get(`${API_BASE_URL}/produtos-busca-rapida`, {
                params: {
                    search: term.toUpperCase(),
                    filial: "01",
                    apenasComSaldo: false,
                    agrupar: "produto",
                    limit: 40,
                },
            });
            const produtos = res.data.map((p) => ({
                ...p,
                descricao: p.descricao || p.produto,
                codigo_produto: p.codigo_produto || p.cod || p.cod_produto,
                unidade: p.primeira_unidade || p.unidade || "",
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
            // Usando endpoint genérico de pedidos de almoxarifado ou adaptando
            const response = await axios.get(`${API_BASE_URL}/almoxarifado/pedidos`, {
                params: { usuario: username }
            });
            setHistorico(response.data);
        } catch (error) {
            console.error("Erro ao buscar histórico do almoxarifado:", error);
            // Fallback para demonstração se não existir endpoint
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
                data_pedido: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                data_entrega: formData.dataEntrega,
                observacao: formData.observacao,
                items: formData.items,
                status: 'Aberto'
            };

            // Post para o backend (seguindo o padrão do sistema)
            await axios.post(`${API_BASE_URL}/almoxarifado/pedidos`, payload);

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
            borderRadius: "12px",
            backgroundColor: "transparent",
            transition: "all 0.2s",
            "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "#3b82f6",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "#3b82f6",
                borderWidth: '2px'
            },
        },
        "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "#e2e8f0",
        },
        "& .MuiInputLabel-root": {
            fontSize: '0.875rem',
            color: '#64748b'
        },
        "& .MuiInputLabel-root.Mui-focused": {
            color: "#3b82f6",
        },
        "& .MuiInputBase-input": {
            color: 'inherit'
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/20">
            {/* Sub Tabs */}
            <div className="flex gap-4 px-8 py-4 bg-white dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <button
                    onClick={() => setSubTab('solicitar')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${subTab === 'solicitar'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                >
                    <span className="material-symbols-rounded text-lg">add_shopping_cart</span>
                    Nova Solicitação
                </button>
                <button
                    onClick={() => setSubTab('historico')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${subTab === 'historico'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                >
                    <span className="material-symbols-rounded text-lg">history</span>
                    Histórico
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {subTab === 'solicitar' ? (
                    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Header do Form */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                            Data de Entrega Desejada <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.dataEntrega}
                                            onChange={(e) => setFormData(p => ({ ...p, dataEntrega: e.target.value }))}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                        />
                                    </div>
                                </div>

                                {/* Itens */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">Itens do Pedido</h3>
                                        <button
                                            type="button"
                                            onClick={addItem}
                                            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            <span className="material-symbols-rounded text-sm">add</span>
                                            Adicionar Item
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {formData.items.map((item, index) => (
                                            <div key={index} className="flex flex-col md:flex-row gap-3 p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-700/50 group">
                                                <div className="flex-1">
                                                    <Autocomplete
                                                        freeSolo
                                                        options={produtosOptions}
                                                        getOptionLabel={(opt) => typeof opt === 'string' ? opt : opt.descricao || ''}
                                                        onInputChange={(_, newValue) => {
                                                            const upper = newValue.toUpperCase();
                                                            handleItemChange(index, 'descricao', upper);
                                                            debouncedFetchProdutos(upper);
                                                        }}
                                                        onChange={(_, newValue) => {
                                                            if (newValue && typeof newValue === 'object') {
                                                                handleItemChange(index, 'descricao', newValue.descricao);
                                                                handleItemChange(index, 'codigo', newValue.codigo_produto);
                                                            }
                                                        }}
                                                        renderInput={(params) => (
                                                            <TextField
                                                                {...params}
                                                                label="Produto (Nome ou Código)"
                                                                required
                                                                size="small"
                                                                sx={textFieldStyles}
                                                            />
                                                        )}
                                                    />
                                                </div>
                                                <div className="w-full md:w-32">
                                                    <TextField
                                                        label="Qtd"
                                                        type="number"
                                                        required
                                                        size="small"
                                                        value={item.quantidade}
                                                        onChange={(e) => handleItemChange(index, 'quantidade', e.target.value)}
                                                        inputProps={{ min: 1 }}
                                                        sx={textFieldStyles}
                                                    />
                                                </div>
                                                {formData.items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(index)}
                                                        className="p-2 text-slate-400 hover:text-red-500 transition-colors self-center"
                                                        title="Remover Item"
                                                    >
                                                        <span className="material-symbols-rounded">delete</span>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Observação */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        Observação / Destino <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        required
                                        rows="3"
                                        placeholder="Informe para onde vai o item ou detalhes adicionais..."
                                        value={formData.observacao}
                                        onChange={(e) => setFormData(p => ({ ...p, observacao: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white resize-none"
                                    ></textarea>
                                </div>

                                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-600/20 transition-all transform active:scale-95 disabled:opacity-50"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                Enviando...
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-rounded">send</span>
                                                Enviar Pedido
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
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
                                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
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
