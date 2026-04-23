import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Autocomplete, TextField, CircularProgress, Checkbox } from "@mui/material";
import Swal from 'sweetalert2';
import { API_BASE_URL } from '../utils/apiConfig';
import dayjs from "dayjs";
import * as XLSX from 'xlsx';

const ProdutoPorCliente = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [local, setLocal] = useState("01");
    const [dataDe, setDataDe] = useState("");
    const [dataAte, setDataAte] = useState("");
    
    // Clientes
    const [clientes, setClientes] = useState([]);
    const [loadingClie, setLoadingClie] = useState(false);
    const [selectedCliente, setSelectedCliente] = useState(null);
    
    // Produtos
    const [produtos, setProdutos] = useState([]);
    const [loadingProd, setLoadingProd] = useState(false);
    const [selectedProduto, setSelectedProduto] = useState(null);

    // Dados das Notas (Bilhetes)
    const [notas, setNotas] = useState([]);
    const [loadingNotas, setLoadingNotas] = useState(false);
    const [selectedNotas, setSelectedNotas] = useState([]);
    const [itensAgregados, setItensAgregados] = useState([]);
    const [loadingItens, setLoadingItens] = useState(false);

    useEffect(() => {
        const u = sessionStorage.getItem("username") || localStorage.getItem("username");
        const l = sessionStorage.getItem("local") || localStorage.getItem("local") || "01";
        if (u) setUsername(u);
        if (l) setLocal(l);
        handleSearchCliente("");
        handleSearchProduto("");
    }, []);

    useEffect(() => {
        if (selectedCliente) fetchNotasByCliente(selectedCliente.id);
        else if (selectedProduto) fetchNotasByProduto(selectedProduto.cod);
    }, [dataDe, dataAte]);

    useEffect(() => {
        if (selectedNotas.length > 0) fetchAllItens();
        else setItensAgregados([]);
    }, [selectedNotas]);

    const handleSearchCliente = async (q) => {
        setLoadingClie(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/vendas-report/clientes`, { params: { q } });
            setClientes(res.data.map(f => ({ 
                id: f.cod, 
                label: `${f.fantasia} - ${f.nome} (${f.cod})`,
                ...f 
            })));
        } catch (error) { console.error(error); }
        setLoadingClie(false);
    };

    const handleSearchProduto = async (q) => {
        setLoadingProd(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/vendas-report/produtos`, { params: { q } });
            setProdutos(res.data);
        } catch (error) { console.error(error); }
        setLoadingProd(false);
    };

    const fetchNotasByCliente = async (clienteId) => {
        if (!clienteId) return;
        setLoadingNotas(true);
        setSelectedNotas([]);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/vendas-report/cliente/${clienteId}/notas`, { params: { dataDe, dataAte } });
            setNotas(res.data);
        } catch (error) { Swal.fire({ icon: 'error', title: 'Erro', text: 'Erro ao buscar bilhetes.', confirmButtonColor: '#2563eb' }); }
        setLoadingNotas(false);
    };

    const fetchNotasByProduto = async (prodCod) => {
        if (!prodCod) return;
        setLoadingNotas(true);
        setSelectedNotas([]);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/vendas-report/produto/${prodCod}/notas`, { params: { dataDe, dataAte } });
            setNotas(res.data);
        } catch (error) { Swal.fire({ icon: 'error', title: 'Erro', text: 'Erro ao buscar bilhetes.', confirmButtonColor: '#2563eb' }); }
        setLoadingNotas(false);
    };

    const fetchAllItens = async () => {
        setLoadingItens(true);
        try {
            const promessas = selectedNotas.map(nota => axios.get(`${API_BASE_URL}/api/vendas-report/bilhete/${nota.doc}/itens`));
            const resultados = await Promise.all(promessas);
            setItensAgregados(resultados.flatMap(res => res.data).sort((a,b) => a.descri.localeCompare(b.descri)));
        } catch (error) { console.error(error); }
        setLoadingItens(false);
    };

    const handleSelectNota = (nota) => {
        const index = selectedNotas.findIndex(n => n.doc === nota.doc);
        if (index > -1) setSelectedNotas(selectedNotas.filter((_, i) => i !== index));
        else setSelectedNotas([...selectedNotas, nota]);
    };

    const handleSelectAll = (checked) => { if (checked) setSelectedNotas(notas); else setSelectedNotas([]); };
    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    const totalFinanceiro = selectedNotas.reduce((acc, n) => acc + (n.valor || 0), 0);
    const totalQuantidade = itensAgregados.reduce((acc, item) => acc + (parseFloat(item.quant) || 0), 0);

    const toggleDarkMode = () => document.documentElement.classList.toggle("dark");
    const handleLogout = () => { localStorage.clear(); navigate("/login"); };

    const handleExportExcel = () => {
        if (itensAgregados.length === 0) {
            Swal.fire({ icon: 'warning', title: 'Atenção', text: 'Selecione pelo menos um bilhete para exportar os itens.', confirmButtonColor: '#2563eb' });
            return;
        }

        const dataToExport = itensAgregados.map(item => ({
            'Produto': item.descri,
            'Código': item.cod,
            'Bilhete': item.doc,
            'Cliente': item.cliente,
            'Data': dayjs(item.data).format('DD/MM/YYYY'),
            'Quantidade': item.quant,
            'U.M': item.um,
            'Preço Unitário': item.vunit,
            'Total': (item.quant * item.vunit).toFixed(2)
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Itens");
        XLSX.writeFile(wb, `Relatorio_Vendas_Cliente_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`);
    };

    return (
        <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans pb-20 transition-colors duration-300">
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />

            <header className="sticky top-0 z-50 px-4 md:px-6 py-4">
                <div className="max-w-[95%] mx-auto">
                    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-slate-700/50 px-4 md:px-6 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/financeiro/contas-receber")}>
                            <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                                <span className="material-symbols-rounded text-2xl">monitoring</span>
                            </div>
                            <div>
                                <h1 className="text-lg font-bold leading-tight text-slate-800 dark:text-white">Produto X Cliente</h1>
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Auditoria de Vendas</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 md:gap-4">
                            <div className="hidden md:flex items-center gap-3 text-right">
                                <div className="flex flex-col items-end">
                                    <span className="text-sm font-bold text-slate-800 dark:text-white">{username || "Admin"}</span>
                                    <span className="text-[10px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded uppercase tracking-tighter">Protheus Database</span>
                                </div>
                            </div>
                            <button onClick={toggleDarkMode} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                <span className="material-symbols-rounded block dark:hidden">dark_mode</span>
                                <span className="material-symbols-rounded hidden dark:block">light_mode</span>
                            </button>
                            <button onClick={handleLogout} className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                <span className="material-symbols-rounded">logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-[95%] mx-auto px-4 md:px-6 py-8">
                
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700 mb-8 transition-colors">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                        <div className="col-span-1 flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1 font-bold">Buscar Cliente (Fantasia)</label>
                            <Autocomplete options={clientes} loading={loadingClie} filterOptions={(x) => x} getOptionLabel={(option) => option.label || ""} value={selectedCliente}
                                onInputChange={(event, newValue) => handleSearchCliente(newValue)}
                                onChange={(event, newValue) => { setSelectedCliente(newValue); if (newValue) { setSelectedProduto(null); fetchNotasByCliente(newValue.id); } }}
                                renderInput={(params) => ( <TextField {...params} variant="outlined" placeholder="Digite o nome fantasia..." size="small" sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#f0f9ff', borderRadius: '12px' } }}
                                    InputProps={{ ...params.InputProps, endAdornment: ( <React.Fragment> {loadingClie ? <CircularProgress color="inherit" size={20} /> : null} {params.InputProps.endAdornment} </React.Fragment> ) }} 
                                /> )}
                            />
                        </div>
                        <div className="col-span-1 flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1 font-bold">Buscar Produto</label>
                            <Autocomplete options={produtos} loading={loadingProd} filterOptions={(x) => x} getOptionLabel={(option) => option.label || ""} value={selectedProduto}
                                onInputChange={(event, newInputValue) => { handleSearchProduto(newInputValue); }}
                                onChange={(event, newValue) => { setSelectedProduto(newValue); if (newValue) { setSelectedCliente(null); fetchNotasByProduto(newValue.cod); } }}
                                renderInput={(params) => ( <TextField {...params} variant="outlined" placeholder="Digite código ou nome..." size="small" sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#fdfaff', borderRadius: '12px' } }}
                                    InputProps={{ ...params.InputProps, endAdornment: ( <React.Fragment> {loadingProd ? <CircularProgress color="inherit" size={20} /> : null} {params.InputProps.endAdornment} </React.Fragment> ) }} 
                                /> )}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1 font-bold">Período De</label>
                            <input type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-blue-500" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1 font-bold">Período Até</label>
                            <input type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-blue-500" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[650px]">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2"> <span className="material-symbols-rounded text-blue-500">receipt_long</span> Selecionar Bilhetes </h3>
                            <div className="text-right"> <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Total Financeiro</p> <p className="text-base font-black text-blue-600">{formatCurrency(totalFinanceiro)}</p> </div>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 shadow-sm">
                                    <tr className="border-b border-slate-200 dark:border-slate-700">
                                        <th className="px-4 py-4 w-10"> <Checkbox size="small" onChange={(e) => handleSelectAll(e.target.checked)} checked={notas.length > 0 && selectedNotas.length === notas.length} sx={{ '&.Mui-checked': { color: '#2563eb' } }} /> </th>
                                        <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Bilhete</th>
                                        <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Data</th>
                                        <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Valor</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                    {loadingNotas ? ( <tr><td colSpan="4" className="px-6 py-20 text-center"><CircularProgress size={30} className="text-blue-500" /></td></tr> ) : (
                                        notas.map((nota, idx) => {
                                            const isSelected = selectedNotas.some(n => n.doc === nota.doc);
                                            return (
                                                <tr key={idx} onClick={() => handleSelectNota(nota)} className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                                                    <td className="px-4 py-4"> <Checkbox size="small" checked={isSelected} sx={{ '&.Mui-checked': { color: '#2563eb' } }} /> </td>
                                                    <td className="px-4 py-4 font-mono text-base font-black text-blue-600 dark:text-blue-400">
                                                       <div className="flex flex-col"> <span>{nota.doc}</span> {!selectedCliente && <span className="text-[9px] text-slate-400 font-bold max-w-[150px] truncate">{nota.nome}</span>} </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-center text-sm font-bold text-slate-500">{dayjs(nota.emissao).format('DD/MM/YYYY')}</td>
                                                    <td className="px-4 py-4 text-right"><span className="text-base font-black">{formatCurrency(nota.valor)}</span></td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[650px]">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2"> <span className="material-symbols-rounded text-indigo-500">inventory_2</span> Itens Vendidos </h3>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={handleExportExcel}
                                    disabled={itensAgregados.length === 0}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${
                                        itensAgregados.length === 0 
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                                        : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                                    }`}
                                >
                                    <span className="material-symbols-rounded text-lg">download</span>
                                    Excel
                                </button>
                                <div className="text-right"> <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Total Quantidade</p> <p className="text-base font-black text-indigo-600">{totalQuantidade.toLocaleString('pt-BR')} <span className="text-[10px] font-normal uppercase opacity-60">UN</span></p> </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 shadow-sm">
                                    <tr className="border-b border-slate-200 dark:border-slate-700">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Produto</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Quant..</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Preço Un.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                    {loadingItens ? ( <tr><td colSpan="3" className="px-6 py-20 text-center"><CircularProgress size={30} className="text-indigo-500" /></td></tr> ) : (
                                        itensAgregados.map((item, idx) => (
                                            <tr key={idx} className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${selectedProduto?.cod === item.cod ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col min-w-[200px]">
                                                        <span className="text-sm font-black text-slate-800 dark:text-slate-200 mb-0.5">{item.descri}</span>
                                                        <div className="flex gap-2 text-[10px] text-slate-400 font-mono"> <span>CÓD: {item.cod}</span> <span className="text-blue-500 font-bold shrink-0">| BILHETE: {item.doc}</span> </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center font-black text-base italic">{item.quant} <span className="text-[10px] font-normal not-italic opacity-50">{item.um}</span></td>
                                                <td className="px-6 py-4 text-right"><span className="text-base font-black text-blue-600 dark:text-blue-400">{formatCurrency(item.vunit)}</span></td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ProdutoPorCliente;
