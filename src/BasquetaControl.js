import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "./utils/apiConfig";

const BasquetaControl = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedClient, setSelectedClient] = useState(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [isAddingInventory, setIsAddingInventory] = useState(false);
    const [loading, setLoading] = useState(false);
    const [mainLoading, setMainLoading] = useState(true);
    const [basquetasData, setBasquetasData] = useState([]);
    const [clientHistory, setClientHistory] = useState([]);
    const [confirmarFechamento, setConfirmarFechamento] = useState(false);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isClosed, setIsClosed] = useState(false);
    
    // Novas variáveis para inclusão
    const [findClientTerm, setFindClientTerm] = useState("");
    const [foundClients, setFoundClients] = useState([]);
    const [newMovement, setNewMovement] = useState({ cliente: "", nome: "", quantidade: 0, tipo: "ENTRADA", motorista: "", currentVal: 0 });
    const [searchingClient, setSearchingClient] = useState(false);
    
    // Novo Estado para Estoque da Empresa - Alterado para 0 conforme solicitado (banco vazio)
    const [totalEstoqueEmpresa, setTotalEstoqueEmpresa] = useState(0);
    const [isEditingTotal, setIsEditingTotal] = useState(false);
    const [tempTotal, setTempTotal] = useState(0);

    const totalComClientes = basquetasData.reduce((acc, curr) => acc + curr.quantidadeAtual, 0);
    const estoqueNaFortFruit = totalEstoqueEmpresa - totalComClientes;

    const username = sessionStorage.getItem("username") || localStorage.getItem("username") || "sistema";
    const localUsuario = sessionStorage.getItem("local") || localStorage.getItem("local") || "00";

    // 1. Fetch Summary Data (Resumo + Config)
    const fetchResumo = async () => {
        try {
            setMainLoading(true);
            const response = await axios.get(`${API_BASE_URL}/api/basquetas/resumo`, {
                params: { data: date }
            });
            // Agora o backend retorna um objeto { clientes, config, isClosed }
            setBasquetasData(response.data.clientes || []);
            setIsClosed(response.data.isClosed || false);
            if (response.data.config) {
                setTotalEstoqueEmpresa(parseInt(response.data.config.totalEstoque) || 0);
                setTempTotal(parseInt(response.data.config.totalEstoque) || 0);
            }
        } catch (error) {
            console.error("Erro ao buscar resumo de basquetas:", error);
        } finally {
            setMainLoading(false);
        }
    };

    useEffect(() => {
        fetchResumo();
    }, [date]);

    // 2. Buscar Clientes para inclusão
    useEffect(() => {
        if (findClientTerm.length > 2) {
            const delayDebounceFn = setTimeout(async () => {
                setSearchingClient(true);
                try {
                    const response = await axios.get(`${API_BASE_URL}/api/vendas-report/clientes?q=${findClientTerm}`);
                    setFoundClients(response.data);
                } catch (error) {
                    console.error("Erro ao buscar clientes:", error);
                } finally {
                    setSearchingClient(false);
                }
            }, 500);
            return () => clearTimeout(delayDebounceFn);
        } else {
            setFoundClients([]);
        }
    }, [findClientTerm]);

    // 3. Fetch Client History
    const handleViewDetails = async (client) => {
        try {
            setSelectedClient(client);
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/api/basquetas/movimentacoes/${client.cliente}`);
            setClientHistory(response.data);
        } catch (error) {
            console.error("Erro ao buscar histórico do cliente:", error);
        } finally {
            setLoading(false);
        }
    };

    // 4. Salvar Ajuste de Cliente no Banco
    const handleSaveMovement = async () => {
        try {
            setLoading(true);
            await axios.post(`${API_BASE_URL}/api/basquetas/ajuste-cliente`, {
                cliente: newMovement.cliente,
                nome: newMovement.nome,
                quantidade: newMovement.quantidade,
                tipo: 'ENTRADA', // Sempre ENTRADA para retorno
                motorista: newMovement.motorista,
                usuario: username
            });
            
            setIsAddingNew(false);
            setNewMovement({ cliente: "", nome: "", quantidade: 0, tipo: "ENTRADA", motorista: "" });
            setFindClientTerm("");
            fetchResumo(); // Atualizar tabela
        } catch (error) {
            console.error("Erro ao salvar ajuste:", error);
            alert("Erro ao salvar operação no banco.");
        } finally {
            setLoading(false);
        }
    };

    // 5. Salvar Inventário Diário (Snaphot e Ajuste de Saldo)
    const handleSaveInventory = async (clientData, newValue) => {
        const countValue = parseInt(newValue);
        if (isNaN(countValue)) return;
        
        try {
            setLoading(true);
            const currentVal = clientData.quantidadeAtual;
            const diff = countValue - currentVal;
            
            // 1. Salvar Snapshot de Inventário (Auditoria)
            await axios.post(`${API_BASE_URL}/api/basquetas/inventario`, {
                cliente: clientData.cliente,
                saldo_sistema: currentVal,
                saldo_fisico: countValue,
                usuario: username
            });

            // 2. Ajustar Saldo Sistêmico para bater com a contagem física
            if (diff !== 0) {
                await axios.post(`${API_BASE_URL}/api/basquetas/ajuste-cliente`, {
                    cliente: clientData.cliente,
                    nome: clientData.nome,
                    quantidade: diff,
                    tipo: 'SALDO_INICIAL',
                    usuario: username,
                    bilhete: "INVENTÁRIO RÁPIDO"
                });
            }

            setIsAddingInventory(false);
            fetchResumo(); 
        } catch (error) {
            console.error("Erro ao salvar inventário:", error);
            alert("Erro ao salvar inventário.");
        } finally {
            setLoading(false);
        }
    };

    const handleFecharDia = async () => {
        setLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/api/basquetas/fechar-dia`, {
                data: date, // Adiciona a data selecionada no fechamento
                clientes: basquetasData,
                estoque_empresa: totalEstoqueEmpresa,
                usuario: username
            });

            setConfirmarFechamento(false);
            alert("✅ Fechamento de basquetas realizado com sucesso!");
            fetchResumo();
        } catch (error) {
            console.error("Erro ao fechar dia:", error);
            alert("❌ Erro ao realizar o fechamento.");
        } finally {
            setLoading(false);
        }
    };

    const handleReabrirDia = async () => {
        if (!window.confirm(`⚠️ Certeza que deseja REABRIR o dia ${date}? \nIsso apagará o snapshot de fechamento deste dia.`)) return;
        
        setLoading(true);
        try {
            await axios.delete(`${API_BASE_URL}/api/basquetas/reabrir-dia`, {
                params: { data: date }
            });
            alert("✅ Dia reaberto! Você pode fazer novas alterações agora.");
            fetchResumo();
        } catch (error) {
            console.error("Erro ao reabrir dia:", error);
            alert("❌ Erro ao reabrir o dia.");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveTotal = async () => {
        try {
            setLoading(true);
            await axios.post(`${API_BASE_URL}/api/basquetas/estoque-empresa`, {
                valor: tempTotal
            });
            setIsEditingTotal(false);
            fetchResumo();
        } catch (error) {
            console.error("Erro ao salvar estoque total:", error);
            alert("Erro ao atualizar estoque da empresa.");
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const filteredData = basquetasData.filter(item =>
        item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.cliente.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <style type="text/css">{`
                @media print {
                    .no-print { display: none !important; }
                    .print-only { display: block !important; }
                    body { background: white !important; margin: 0; padding: 0; }
                }
                @media screen {
                    .print-only { display: none !important; }
                }
            `}</style>
            
            <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300 pb-20 no-print">
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />

            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-orange-400/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
            </div>

            {/* Header Standard */}
            <header className="sticky top-0 z-50 px-4 py-4">
                <div className="w-full max-w-[98vw] mx-auto">
                    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-slate-700/50 px-6 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/faturamento")}>
                            <div className="bg-gradient-to-tr from-green-600 to-emerald-400 h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-600/20">
                                <span className="font-bold text-xl italic tracking-tighter">SF</span>
                            </div>
                            <div>
                                <h1 className="text-lg font-bold leading-tight text-slate-800 dark:text-white">Controle de Basquetas</h1>
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none block">Faturamento</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 md:gap-4">
                            <div className="hidden md:flex items-center gap-2 mr-2 bg-transparent px-3 py-2 rounded-xl group border border-transparent">
                                <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-1.5 rounded-lg">
                                    <span className="material-symbols-rounded text-lg">calendar_today</span>
                                </div>
                                <div className="flex flex-col items-start leading-none gap-0.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data do Sistema</span>
                                    <input 
                                        type="date" 
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="bg-transparent border-none text-sm font-black text-slate-800 dark:text-white outline-none cursor-pointer focus:ring-0 p-0"
                                    />
                                </div>
                                {isClosed && (
                                    <div className="ml-2 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-md text-[10px] font-black uppercase tracking-tighter animate-pulse border border-emerald-200 dark:border-emerald-800">
                                        FECHADO
                                    </div>
                                )}
                            </div>

                            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 hidden md:block"></div>

                            <div className="flex items-center gap-3">
                                <div className="hidden md:flex flex-col items-end leading-tight">
                                    <span className="text-xs font-bold text-slate-800 dark:text-white">{username}</span>
                                    <div className="text-[9px] font-bold text-white bg-slate-800 dark:bg-slate-600 px-2 py-0.5 rounded flex items-center gap-1 mt-0.5">
                                        LOCAL: {localUsuario} <span className="material-symbols-rounded text-[9px]">location_on</span>
                                    </div>
                                </div>
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 border-2 border-white dark:border-slate-600 flex items-center justify-center shadow-sm">
                                    <span className="material-symbols-rounded text-slate-500 dark:text-slate-300">person</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-4 relative z-10">
                {/* Actions Bar Standard */}
                <div className="flex items-center mb-6 animate-in slide-in-from-bottom-5 duration-500">
                    <button
                        onClick={() => navigate("/faturamento")}
                        className="h-11 w-11 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white shadow-sm hover:shadow-md transition-all border border-slate-200 dark:border-slate-700"
                        title="Voltar"
                    >
                        <span className="material-symbols-rounded text-2xl">arrow_back</span>
                    </button>
                    <div className="ml-4 h-6 w-[1px] bg-slate-200 dark:bg-slate-700 hidden md:block"></div>
                    <button onClick={fetchResumo} className={`ml-4 p-2 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all ${mainLoading ? 'animate-spin' : ''}`}>
                         <span className="material-symbols-rounded block text-xl">refresh</span>
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total com Clientes</p>
                            <p className="text-3xl font-extrabold text-orange-600">{totalComClientes}</p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-900/10 flex items-center justify-center text-orange-600">
                            <span className="material-symbols-rounded text-3xl">shopping_basket</span>
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Clientes com Basqueta</p>
                            <p className="text-3xl font-extrabold text-blue-600">
                                {basquetasData.filter(item => item.quantidadeAtual > 0).length}
                            </p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center text-blue-600">
                            <span className="material-symbols-rounded text-3xl">groups</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Estoque na Fort Fruit</p>
                            <div className="flex flex-col">
                                <p className={`text-3xl font-extrabold ${estoqueNaFortFruit < 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                                    {estoqueNaFortFruit}
                                </p>
                                <div className="mt-1 flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Total na Empresa:</span>
                                    <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10 px-2 py-0.5 rounded-md">
                                        {totalEstoqueEmpresa}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${estoqueNaFortFruit < 0 ? 'bg-rose-50 dark:bg-rose-900/10 text-rose-500' : 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600'}`}>
                            <span className="material-symbols-rounded text-3xl">warehouse</span>
                        </div>
                    </div>
                </div>

                {/* Search Row */}
                <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-rounded text-slate-400">search</span>
                        <input
                            type="text"
                            placeholder="Pesquisar na lista..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        {isClosed ? (
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm animate-in fade-in slide-in-from-right duration-500">
                                <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black rounded-xl uppercase tracking-widest border border-emerald-100 dark:border-emerald-800/50">
                                    Dia Fechado
                                </div>
                                <button 
                                    onClick={handlePrint}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 dark:bg-slate-700 hover:bg-white dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-xl font-bold text-sm transition-all active:scale-95 border border-slate-200 dark:border-slate-500"
                                >
                                    <span className="material-symbols-rounded text-lg">print</span>
                                    <span>Relatório</span>
                                </button>
                                <button 
                                    onClick={handleReabrirDia}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl font-bold text-sm transition-all active:scale-95 border border-rose-200/50 dark:border-rose-800/50"
                                >
                                    <span className="material-symbols-rounded text-lg">lock_open</span>
                                    <span>Reabrir</span>
                                </button>
                            </div>
                        ) : (
                            <>
                                <button 
                                    onClick={() => { setTempTotal(totalEstoqueEmpresa); setIsEditingTotal(true); }}
                                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-white transition-all shadow-sm border border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95"
                                >
                                    <span className="material-symbols-rounded text-xl">warehouse</span>
                                    <span className="font-bold whitespace-nowrap">Saldo Empresa</span>
                                </button>
                                <button 
                                    onClick={() => setConfirmarFechamento(true)}
                                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-200 active:scale-95 animate-in zoom-in duration-300"
                                >
                                    <span className="material-symbols-rounded">inventory_2</span>
                                    <span className="font-bold whitespace-nowrap">Fechar Dia</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden relative min-h-[400px]">
                    {mainLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-20">
                            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="font-bold text-slate-500">Sincronizando com Protheus...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-700">
                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Cliente</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Saldo Inicial</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Saídas (+)</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Retorno (-)</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Saldo Atual</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {filteredData.map((item) => (
                                        <tr key={item.cliente} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold overflow-hidden shadow-inner">
                                                        {item.nome.substring(0, 1) || "?"}
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-slate-700 dark:text-slate-200 block">{item.nome}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.cliente}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className="text-sm font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                                                    {Number(item.saldoFechamento) || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-black">
                                                    {Number(item.totalSaida) > 0 ? `+${item.totalSaida}` : item.totalSaida}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black ${
                                                    Number(item.totalEntrada || 0) > 0 ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' : 'bg-slate-50 dark:bg-slate-700/30 text-slate-400'
                                                }`}>
                                                    {Number(item.totalEntrada || 0) > 0 ? `-${Number(item.totalEntrada)}` : 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black ${
                                                    (Number(item.saldoFechamento || 0) + Number(item.totalSaida || 0) - Number(item.totalEntrada || 0)) > 50 ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' : 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                                }`}>
                                                    {Number(item.saldoFechamento || 0) + Number(item.totalSaida || 0) - Number(item.totalEntrada || 0)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => {
                                                        setNewMovement({ 
                                                            cliente: item.cliente, 
                                                            nome: item.nome, 
                                                            quantidade: 0, 
                                                            tipo: "ENTRADA", 
                                                            motorista: "" 
                                                        });
                                                        setIsAddingNew(true);
                                                    }}
                                                    disabled={isClosed}
                                                    className={`p-2 rounded-lg transition-colors ${isClosed ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-400 dark:text-orange-500 hover:text-orange-600'}`}
                                                    title="Registrar Retorno (Entrada)"
                                                >
                                                    <span className="material-symbols-rounded">local_shipping</span>
                                                </button>

                                                <button 
                                                    onClick={() => handleViewDetails(item)}
                                                    className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 dark:text-slate-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                                                    title="Ver Histórico"
                                                >
                                                    <span className="material-symbols-rounded">visibility</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* Modal de Saldo Empresa (Total) */}
            {isEditingTotal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-white/10">
                        <div className="px-8 py-6 bg-slate-800 dark:bg-slate-800/80 border-b border-white/10 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                    <span className="material-symbols-rounded">warehouse</span>
                                </div>
                                <h3 className="font-bold text-xl text-white">Saldo Empresa</h3>
                            </div>
                            <button onClick={() => setIsEditingTotal(false)} className="w-8 h-8 rounded-full bg-slate-700/50 hover:bg-slate-600 transition-colors flex items-center justify-center text-slate-300">
                                <span className="material-symbols-rounded">close</span>
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Global de Basquetas</label>
                                <input 
                                    type="number"
                                    value={tempTotal}
                                    onChange={(e) => setTempTotal(parseInt(e.target.value) || 0)}
                                    className="w-full px-6 py-6 bg-slate-50 dark:bg-slate-800 text-center text-4xl font-black text-slate-800 dark:text-white border-2 border-slate-100 dark:border-slate-700 rounded-3xl outline-none focus:border-emerald-500 transition-all shadow-inner"
                                />
                                <p className="mt-4 text-xs text-slate-400 font-medium text-center italic">
                                    Este valor define o estoque total inicial da FORT FRUIT.
                                </p>
                            </div>
                        </div>

                        <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                            <button 
                                onClick={() => setIsEditingTotal(false)}
                                className="flex-1 py-4 px-6 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-all"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSaveTotal}
                                className="flex-[2] py-4 px-6 rounded-2xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 active:scale-95 transition-all outline-none"
                            >
                                Atualizar Estoque
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Inclusão (Registrar Retorno) */}
            {isAddingNew && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/10">
                        <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-xl text-slate-800 dark:text-white">Registrar Retorno de Basquetas</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Entrada de basqueta vinda do cliente</p>
                            </div>
                            <button onClick={() => { setIsAddingNew(false); setFindClientTerm(""); setFoundClients([]); setNewMovement({ cliente: "", nome: "", quantidade: 0, tipo: "ENTRADA", motorista: "" }); }} className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                <span className="material-symbols-rounded">close</span>
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            {/* Busca de Cliente */}
                            <div className="relative">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-2">Selecione o Cliente</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-rounded text-slate-400">person_search</span>
                                    <input 
                                        type="text"
                                        placeholder="Digite o nome ou código..."
                                        value={newMovement.cliente ? `${newMovement.cliente} - ${newMovement.nome}` : findClientTerm}
                                        onChange={(e) => {
                                            setFindClientTerm(e.target.value);
                                            if (newMovement.cliente) setNewMovement({ ...newMovement, cliente: "", nome: "" });
                                        }}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white font-bold"
                                    />
                                    {searchingClient && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>}
                                </div>

                                {/* Resultados da Busca */}
                                {foundClients.length > 0 && !newMovement.cliente && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 max-h-48 overflow-y-auto z-50 overflow-hidden divide-y divide-slate-50 dark:divide-slate-700">
                                        {foundClients.map(c => (
                                            <button 
                                                key={c.cod}
                                                onClick={() => {
                                                    setNewMovement({ ...newMovement, cliente: c.cod, nome: c.nome });
                                                    setFindClientTerm("");
                                                    setFoundClients([]);
                                                }}
                                                className="w-full px-6 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex flex-col transition-colors"
                                            >
                                                <span className="font-bold text-slate-700 dark:text-slate-200">{c.nome}</span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase">{c.cod} - {c.fantasia}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Motorista (Opcional) */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-2">Nome do Motorista (Opcional)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-rounded text-slate-400">local_shipping</span>
                                    <input 
                                        type="text"
                                        placeholder="Nome do motorista que trouxe as basquetas..."
                                        value={newMovement.motorista}
                                        onChange={(e) => setNewMovement({ ...newMovement, motorista: e.target.value })}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white font-bold"
                                    />
                                </div>
                            </div>

                            {/* Quantidade */}
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-2">Quantidade Estornada / Devolvida</label>
                                    <input 
                                        type="number"
                                        value={newMovement.quantidade}
                                        onChange={(e) => setNewMovement({ ...newMovement, quantidade: parseInt(e.target.value) || 0 })}
                                        className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white font-bold text-2xl text-center"
                                    />
                                </div>
                                <div className="flex flex-col justify-end">
                                    <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                                        <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest text-center">Tipo de Operação</p>
                                        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 text-center mt-1">RETORNO / ENTRADA</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                            <button 
                                onClick={() => { setIsAddingNew(false); setFindClientTerm(""); }}
                                className="flex-1 py-4 px-6 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-all"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSaveMovement}
                                disabled={!newMovement.cliente || newMovement.quantidade <= 0}
                                className={`flex-[2] py-4 px-6 rounded-2xl font-bold text-white shadow-lg transition-all ${newMovement.cliente && newMovement.quantidade > 0 ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/20 active:scale-95' : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'}`}
                            >
                                Confirmar Retorno
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Detalhes (Movimentações) */}
            {selectedClient && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/10 relative">
                        {loading && (
                            <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-[2px] z-[110] flex flex-col items-center justify-center">
                                <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Carregando Histórico...</p>
                            </div>
                        )}
                        
                        <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-xl text-slate-800 dark:text-white">{selectedClient.nome}</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Histórico de Movimentação de Basquetas</p>
                            </div>
                            <button onClick={() => { setSelectedClient(null); setClientHistory([]); }} className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                <span className="material-symbols-rounded">close</span>
                            </button>
                        </div>

                        <div className="p-8">
                            <div className="grid grid-cols-3 gap-4 mb-8">
                                <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-3xl border border-blue-100/50 dark:border-blue-900/30 text-center">
                                    <p className="text-[9px] font-black text-blue-400 dark:text-blue-500 uppercase tracking-widest">Saldo Atual</p>
                                    <p className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">{selectedClient.quantidadeAtual}</p>
                                </div>
                                <div className="bg-rose-50 dark:bg-rose-900/10 p-5 rounded-3xl border border-rose-100/50 dark:border-rose-900/30 text-center">
                                    <p className="text-[9px] font-black text-rose-400 dark:rose-500 uppercase tracking-widest">Total Saídas</p>
                                    <p className="text-3xl font-black text-rose-600 dark:rose-400 mt-1">{selectedClient.totalSaida}</p>
                                </div>
                                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-3xl border border-emerald-100/50 dark:border-emerald-900/30 text-center">
                                    <p className="text-[9px] font-black text-emerald-400 dark:text-emerald-500 uppercase tracking-widest">Total Entradas</p>
                                    <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                                        {clientHistory.filter(m => m.tipo === 'ENTRADA').reduce((acc, curr) => acc + curr.quantidade, 0)}
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-800/30 max-h-[300px] overflow-y-auto shadow-inner">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-10">
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Data</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Tipo</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Documento</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Quantidade</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {clientHistory.map((mov) => (
                                            <tr key={mov.id} className="hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-600 dark:text-slate-300">
                                                    {mov.data.substring(6,8)}/{mov.data.substring(4,6)}/{mov.data.substring(0,4)}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter ${
                                                        mov.tipo === 'SAIDA' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                                                    }`}>
                                                        {mov.tipo}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-xs text-slate-400 uppercase">
                                                    {mov.bilhete}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`font-black text-sm ${mov.tipo === 'SAIDA' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                        {mov.tipo === 'SAIDA' ? '+' : '-'} {mov.quantidade}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-right">
                            <button onClick={() => { setSelectedClient(null); setClientHistory([]); }} className="px-8 py-3 bg-slate-800 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black hover:scale-105 transition-all text-xs shadow-xl shadow-slate-800/20">
                                Fechar Detalhes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Inventário (Carga Provisória) */}
            {isAddingInventory && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-white/10">
                        <div className="px-8 py-6 bg-blue-600 dark:bg-blue-800 border-b border-white/10 flex justify-between items-center text-white">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                    <span className="material-symbols-rounded">edit_note</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl leading-none">Inventário / Ajuste</h3>
                                    <p className="text-[9px] font-bold text-blue-100 uppercase tracking-widest mt-1 opacity-80">Correção de estoque no cliente</p>
                                </div>
                            </div>
                            <button onClick={() => setIsAddingInventory(false)} className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 transition-colors flex items-center justify-center">
                                <span className="material-symbols-rounded">close</span>
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div className="text-center">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{newMovement.cliente}</span>
                                <h4 className="font-extrabold text-slate-700 dark:text-slate-200 text-lg leading-tight">{newMovement.nome}</h4>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Atual</p>
                                    <p className="text-2xl font-black text-slate-600 dark:text-slate-400">{newMovement.currentVal} UN</p>
                                </div>
                                <span className="material-symbols-rounded text-slate-300 text-3xl">arrow_forward</span>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Novo Saldo</p>
                                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{newMovement.quantidade} UN</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-center text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">Informe a Contagem Física</label>
                                <input 
                                    type="number"
                                    value={newMovement.quantidade}
                                    onChange={(e) => setNewMovement({ ...newMovement, quantidade: parseInt(e.target.value) || 0 })}
                                    className="w-full px-6 py-6 bg-slate-50 dark:bg-slate-800 text-center text-4xl font-black text-slate-800 dark:text-white border-2 border-slate-100 dark:border-slate-700 rounded-3xl outline-none focus:border-blue-500 transition-all shadow-inner"
                                    autoFocus
                                />
                                <p className="mt-4 text-[10px] text-slate-400 font-bold text-center uppercase tracking-widest opacity-60">
                                    O sistema adicionará {newMovement.quantidade - newMovement.currentVal} UN para compensar.
                                </p>
                            </div>
                        </div>

                        <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                            <button 
                                onClick={() => setIsAddingInventory(false)}
                                className="flex-1 py-4 px-6 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-all"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSaveInventory}
                                className="flex-[2] py-4 px-6 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/20 active:scale-95 transition-all outline-none"
                            >
                                Salvar Contagem
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Fechamento */}
            {confirmarFechamento && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-white/10">
                        <div className="px-8 py-8 flex flex-col items-center text-center">
                            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 mb-6 drop-shadow-sm">
                                <span className="material-symbols-rounded text-5xl">inventory_2</span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Fechar Dia?</h3>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">
                                Isso irá salvar o saldo atual de <b>todos os clientes</b> ({basquetasData.length}) como saldo inicial para amanhã.
                            </p>
                            
                            <div className="w-full mt-8 flex flex-col gap-3">
                                <button
                                    onClick={handleFecharDia}
                                    disabled={loading}
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-lg transition-all shadow-lg shadow-emerald-200 dark:shadow-none active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    {loading ? "Fechando..." : "Confirmar Fechamento"}
                                </button>
                                <button
                                    onClick={() => setConfirmarFechamento(false)}
                                    className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </div> {/* FECHAMENTO DA DIV NO-PRINT */}

            {/* RELATÓRIO PARA IMPRESSÃO (FORA DA no-print) */}
            <div className="print-only p-10 bg-white text-black font-serif">
                <div id="printable-report">
                    <div className="text-center border-b-4 border-black pb-6 mb-8 mt-4">
                        <h1 className="text-4xl font-black italic mb-1 uppercase tracking-tighter">SOPACRAZY - SISTEMA FF</h1>
                        <h2 className="text-xl font-bold bg-black text-white py-1 px-6 inline-block transform -skew-x-12">RELATÓRIO DE FECHAMENTO DIÁRIO</h2>
                        <div className="mt-4 flex justify-center gap-12 text-sm font-black">
                            <p>DATA: {date.split('-').reverse().join('/')}</p>
                            <p>USUÁRIO: {username.toUpperCase()}</p>
                            <p>LOCAL: {localUsuario}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-8 mb-10 text-center">
                        <div className="border-4 border-black p-4 rounded-xl">
                            <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Total com Clientes</p>
                            <p className="text-3xl font-black">{totalComClientes}</p>
                        </div>
                        <div className="border-4 border-black p-4 rounded-xl">
                            <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Basquetas em Estoque</p>
                            <p className="text-3xl font-black">{estoqueNaFortFruit}</p>
                        </div>
                        <div className="border-4 border-black p-4 rounded-xl bg-slate-50">
                            <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Total Geral (Empresa)</p>
                            <p className="text-3xl font-black">{totalEstoqueEmpresa}</p>
                        </div>
                    </div>

                    <table className="w-full border-collapse border-4 border-black mb-12 text-[12px]">
                        <thead>
                            <tr className="bg-black text-white">
                                <th className="border border-white/20 px-3 py-4 text-left">CÓD</th>
                                <th className="border border-white/20 px-3 py-4 text-left">NOME DO CLIENTE</th>
                                <th className="border border-white/20 px-3 py-4 text-center">INICIAL</th>
                                <th className="border border-white/20 px-3 py-4 text-center">SAÍDAS (+)</th>
                                <th className="border border-white/20 px-3 py-4 text-center">RETORNO (-)</th>
                                <th className="border border-white/20 px-3 py-4 text-center">SALDO FINAL</th>
                            </tr>
                        </thead>
                        <tbody className="font-bold">
                            {filteredData.map((item, idx) => (
                                <tr key={item.cliente} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                    <td className="border border-black px-3 py-2">{item.cliente}</td>
                                    <td className="border border-black px-3 py-2 uppercase">{item.nome}</td>
                                    <td className="border border-black px-3 py-2 text-center">{item.saldoFechamento}</td>
                                    <td className="border border-black px-2 py-1 text-center">{Number(item.totalSaida) > 0 ? `+${item.totalSaida}` : item.totalSaida}</td>
                                    <td className="border border-black px-2 py-1 text-center">{Number(item.totalEntrada || 0) > 0 ? `-${item.totalEntrada}` : 0}</td>
                                    <td className="border border-black px-2 py-1 text-center font-bold">
                                        {Number(item.saldoFechamento || 0) + Number(item.totalSaida || 0) - Number(item.totalEntrada || 0)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="mt-32 space-y-20">
                        <div className="flex justify-between gap-20">
                            <div className="flex-1 text-center">
                                <div className="border-t-4 border-black pt-2">
                                    <p className="text-sm font-black uppercase mb-1">Responsável pela Expedição</p>
                                    <p className="text-xs text-slate-500 uppercase tracking-widest">{username.toUpperCase()}</p>
                                </div>
                            </div>
                            <div className="flex-1 text-center">
                                <div className="border-t-4 border-black pt-2">
                                    <p className="text-sm font-black uppercase">Responsável pela Auditoria / Conferência</p>
                                </div>
                            </div>
                        </div>
                        <div className="text-center pt-8 border-t border-dashed border-slate-300">
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Documento Gerado via Sistema FF - {new Date().toLocaleString('pt-BR')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default BasquetaControl;
