import React, { useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip as ChartTooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Tooltip from '@mui/material/Tooltip';
import dayjs from 'dayjs';
import axios from 'axios';
import { API_BASE_URL } from '../utils/apiConfig';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    ChartTooltip,
    Legend,
    ArcElement
);

const DashboardFechamento = () => {
    const { state } = useLocation();
    const navigate = useNavigate();

    const locaisFull = state?.locais || [];
    const [filtroDataInicio, setFiltroDataInicio] = React.useState(state?.filtroData || dayjs().format('YYYY-MM-DD'));
    const [filtroDataFim, setFiltroDataFim] = React.useState(state?.filtroData || dayjs().format('YYYY-MM-DD'));
    const [dadosFechamento, setDadosFechamento] = React.useState(state?.dadosFechamento || []);
    const [dadosDetalhes, setDadosDetalhes] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState('dashboard');

    const handleExportExcel = () => {
        if (!dadosDetalhes || dadosDetalhes.length === 0) {
            alert("Não há dados detalhados para exportar.");
            return;
        }

        const dataParaExportar = dadosDetalhes
            .filter(r => filtroDashboardLocal === "" || r.local === filtroDashboardLocal)
            .map(r => ({
                Data: dayjs(r.data).format('DD/MM/YYYY'),
                Local: r.nome_local,
                'Cód. Produto': r.cod_produto,
                Produto: r.nome_produto,
                'Qtd Físico': r.total_fisico,
                'Qtd Sistema': r.total_sistema,
                UM: r.um || '',
                'Custo Unit. (R$)': r.custo || 0,
                'Diferença': r.dif,
                'Total Custo (R$)': r.total_custo_dif || 0
            }));

        const ws = XLSX.utils.json_to_sheet(dataParaExportar);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Fechamento Detalhado");
        XLSX.writeFile(wb, `Fechamento_Estoque_${dayjs().format('DD-MM-YYYY')}.xlsx`);
    };

    const username = sessionStorage.getItem("username") || localStorage.getItem("username") || "sistema";
    const localLogado = sessionStorage.getItem("local") || localStorage.getItem("local") || "08";

    const fetchDadosPeriodo = async (inicio, fim) => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/saldos/fechamento-geral`, {
                params: { data: inicio, dataFim: fim }
            });
            // O backend retorna { summary: [], details: [] } para ranges
            if (res.data.summary && res.data.details) {
                setDadosFechamento(res.data.summary);
                setDadosDetalhes(res.data.details);
            } else if (Array.isArray(res.data)) {
                setDadosFechamento(res.data);
                setDadosDetalhes([]); // Ou gerar detalhes se quiser, mas ranges retornam objeto
            }
        } catch (err) {
            console.error("Erro ao buscar dados do dashboard:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleConsultar = () => {
        fetchDadosPeriodo(filtroDataInicio, filtroDataFim);
    };

    const handleLogout = () => { sessionStorage.clear(); navigate("/login"); };

    const [filtroDashboardLocal, setFiltroDashboardLocal] = React.useState("");

    // Paginação para os detalhes
    const [page, setPage] = React.useState(1);
    const rowsPerPage = 15;
    const detailsFiltrados = React.useMemo(() => {
        return filtroDashboardLocal
            ? dadosDetalhes.filter(d => d.local === filtroDashboardLocal)
            : dadosDetalhes;
    }, [dadosDetalhes, filtroDashboardLocal]);

    const totalPages = Math.ceil(detailsFiltrados.length / rowsPerPage);
    const paginatedDetails = detailsFiltrados.slice((page - 1) * rowsPerPage, page * rowsPerPage);

    const chartData = useMemo(() => {
        if (!dadosFechamento.length || !locaisFull.length) return null;

        const labels = [];
        const faltasData = [];
        const sobrasData = [];

        let totalGeralFalta = 0;
        let totalGeralSobra = 0;

        const topFaltasMap = new Map();
        const topSobrasMap = new Map();

        const locaisFiltrados = filtroDashboardLocal ? locaisFull.filter(l => l.id === filtroDashboardLocal) : locaisFull;

        locaisFiltrados.forEach(l => {
            let diffFalta = 0;
            let diffSobra = 0;

            dadosFechamento.forEach(item => {
                const fisico = Number(item[l.colFisico]) || 0;
                const sistema = Number(item[l.colSistema]) || 0;
                const dif = fisico - sistema;
                const nomeProd = item.nome_produto || item.cod_produto;

                if (dif < -0.01) {
                    const absDif = Math.abs(dif);
                    diffFalta += absDif;
                    const prev = topFaltasMap.get(nomeProd) || 0;
                    topFaltasMap.set(nomeProd, prev + absDif);
                } else if (dif > 0.01) {
                    diffSobra += dif;
                    const prev = topSobrasMap.get(nomeProd) || 0;
                    topSobrasMap.set(nomeProd, prev + dif);
                }
            });

            labels.push(l.nome);
            faltasData.push(Math.round(diffFalta));
            sobrasData.push(Math.round(diffSobra));

            totalGeralFalta += diffFalta;
            totalGeralSobra += diffSobra;
        });

        const topFaltas = Array.from(topFaltasMap.entries())
            .map(([nome, val]) => ({ nome, valor: Math.round(val) }))
            .sort((a, b) => b.valor - a.valor)
            .slice(0, 5);

        const topSobras = Array.from(topSobrasMap.entries())
            .map(([nome, val]) => ({ nome, valor: Math.round(val) }))
            .sort((a, b) => b.valor - a.valor)
            .slice(0, 5);

        return {
            barData: {
                labels,
                datasets: [
                    {
                        label: 'Falta (Qtd)',
                        data: faltasData,
                        backgroundColor: 'rgba(239, 68, 68, 0.8)', // red-500
                    },
                    {
                        label: 'Sobra (Qtd)',
                        data: sobrasData,
                        backgroundColor: 'rgba(16, 185, 129, 0.8)', // emerald-500
                    }
                ]
            },
            pieData: {
                labels: ['Total Faltas', 'Total Sobras'],
                datasets: [{
                    data: [Math.round(totalGeralFalta), Math.round(totalGeralSobra)],
                    backgroundColor: ['rgba(239, 68, 68, 0.8)', 'rgba(16, 185, 129, 0.8)'],
                    borderWidth: 0
                }]
            },
            topFaltas,
            topSobras,
            totalGeralFalta: Math.round(totalGeralFalta),
            totalGeralSobra: Math.round(totalGeralSobra)
        };
    }, [dadosFechamento, locaisFull, filtroDashboardLocal]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F3F4F6] dark:bg-[#0B1120]">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <h2 className="text-xl font-bold text-slate-600 dark:text-slate-400">Carregando indicadores...</h2>
            </div>
        );
    }

    if (!state && (!dadosFechamento || dadosFechamento.length === 0)) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                <h2 className="text-xl font-bold mb-4">Nenhum dado encontrado para o período selecionado.</h2>
                <button
                    onClick={() => navigate('/estoque/fechamento-geral')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold"
                >
                    Voltar
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] pb-20 font-sans transition-colors duration-300">
            <header className="sticky top-0 z-50 px-4 md:px-6 py-4">
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-slate-700/50 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/estoque/fechamento-geral')}
                            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-colors text-slate-600 dark:text-slate-300 flex items-center gap-2 font-bold"
                        >
                            <ArrowBackIcon /> Voltar
                        </button>
                        <div>
                            <h1 className="text-xl font-bold leading-tight text-slate-800 dark:text-white">
                                Dashboard de Fechamento
                            </h1>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                                Indicadores e Gráficos de Estoque
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700/50 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 shadow-inner">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Início</span>
                                <input
                                    type="date"
                                    value={filtroDataInicio}
                                    onChange={(e) => setFiltroDataInicio(e.target.value)}
                                    className="bg-transparent border-none outline-none text-sm font-bold text-slate-700 dark:text-slate-200"
                                />
                            </div>
                            <div className="h-4 w-px bg-slate-300 dark:bg-slate-500 mx-1"></div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Fim</span>
                                <input
                                    type="date"
                                    value={filtroDataFim}
                                    onChange={(e) => setFiltroDataFim(e.target.value)}
                                    className="bg-transparent border-none outline-none text-sm font-bold text-slate-700 dark:text-slate-200"
                                />
                            </div>
                            <button
                                onClick={handleConsultar}
                                disabled={loading}
                                className="ml-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all flex items-center justify-center disabled:opacity-50"
                                title="Consultar"
                            >
                                {loading ? <span className="material-symbols-rounded animate-spin text-sm">refresh</span> : <span className="material-symbols-rounded text-sm">search</span>}
                            </button>
                            {dadosDetalhes.length > 0 && (
                                <button
                                    onClick={handleExportExcel}
                                    className="ml-2 p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all flex items-center justify-center shadow-lg shadow-emerald-200 dark:shadow-none"
                                    title="Exportar Excel"
                                >
                                    <span className="material-symbols-rounded text-sm">download</span>
                                </button>
                            )}
                        </div>

                        <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 hidden md:block"></div>

                        <div className="flex items-center gap-3">
                            <div className="hidden md:flex flex-col items-end">
                                <span className="text-sm font-bold text-slate-800 dark:text-white">{username}</span>
                                <div className="text-[10px] font-bold text-white bg-slate-800 dark:bg-slate-600 px-2 py-0.5 rounded flex items-center gap-1">
                                    LOCAL: {localLogado} <span className="material-symbols-rounded text-[10px]">location_on</span>
                                </div>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 border-2 border-white dark:border-slate-600 flex items-center justify-center shadow-sm">
                                <span className="material-symbols-rounded text-slate-500 dark:text-slate-300">person</span>
                            </div>
                        </div>

                        <button onClick={handleLogout} className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-all border border-transparent hover:border-red-200 dark:hover:border-red-800">
                            <span className="material-symbols-rounded text-xl">logout</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="px-4 md:px-6 mt-6 max-w-7xl mx-auto space-y-6">

                {/* Tabs Switcher and Local Filter */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex p-1 bg-white/50 dark:bg-slate-800/50 backdrop-blur rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}
                        >
                            Gráficos
                        </button>
                        <button
                            onClick={() => setActiveTab('analytic')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'analytic' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}
                        >
                            Analítico
                        </button>
                    </div>

                    <div className="flex p-1 bg-white/50 dark:bg-slate-800/50 backdrop-blur rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto no-scrollbar hidden-scrollbar max-w-full">
                        <button
                            onClick={() => setFiltroDashboardLocal("")}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${filtroDashboardLocal === "" ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"}`}
                        >
                            TODOS OS LOCAIS
                        </button>
                        {locaisFull.map(l => (
                            <button
                                key={l.id}
                                onClick={() => setFiltroDashboardLocal(l.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${filtroDashboardLocal === l.id ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"}`}
                            >
                                {l.nome}
                            </button>
                        ))}
                    </div>
                </div>

                {activeTab === 'dashboard' ? (
                    chartData ? (
                        <>
                            {/* Sumário Geral */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-center">
                                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Resumo Geral de Diferenças</h2>
                                    <div className="flex justify-around items-center">
                                        <div className="text-center">
                                            <span className="block text-4xl font-black text-red-500">{chartData.totalGeralFalta}</span>
                                            <span className="text-xs font-bold text-slate-400 mt-2 block uppercase">Desfalque Total (Qtd)</span>
                                        </div>
                                        <div className="h-16 w-px bg-slate-200 dark:bg-slate-700"></div>
                                        <div className="text-center">
                                            <span className="block text-4xl font-black text-emerald-500">{chartData.totalGeralSobra}</span>
                                            <span className="text-xs font-bold text-slate-400 mt-2 block uppercase">Excesso Total (Qtd)</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex justify-center items-center" style={{ maxHeight: '250px' }}>
                                    <div className="h-full max-w-[250px] w-full">
                                        <Pie
                                            data={chartData.pieData}
                                            options={{
                                                maintainAspectRatio: false,
                                                plugins: { legend: { position: 'bottom', labels: { color: '#64748b', font: { weight: 'bold' } } } }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Gráfico de Barras */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Diferenças por Local</h2>
                                <div className="h-[300px] w-full">
                                    <Bar
                                        data={chartData.barData}
                                        options={{
                                            maintainAspectRatio: false,
                                            scales: {
                                                y: { ticks: { color: '#64748b' }, grid: { color: '#e2e8f0' } },
                                                x: { ticks: { color: '#64748b' }, grid: { display: false } }
                                            },
                                            plugins: {
                                                legend: { labels: { color: '#64748b', font: { weight: 'bold' } } }
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Top Faltas e Sobras */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-red-100 dark:border-red-900/30">
                                    <h2 className="text-sm font-bold text-red-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <span className="material-symbols-rounded">trending_down</span> Top 5 Maiores Faltas (Geral)
                                    </h2>
                                    <div className="space-y-3">
                                        {chartData.topFaltas.map((f, i) => (
                                            <div key={i} className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/10 rounded-xl">
                                                <span className="font-semibold text-slate-700 dark:text-slate-300 truncate pr-4">{f.nome}</span>
                                                <span className="font-black text-red-600 bg-red-100 dark:bg-red-900/50 px-3 py-1 rounded-lg">-{f.valor}</span>
                                            </div>
                                        ))}
                                        {chartData.topFaltas.length === 0 && <span className="text-slate-400 italic">Nenhuma falta registrada.</span>}
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-emerald-100 dark:border-emerald-900/30">
                                    <h2 className="text-sm font-bold text-emerald-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <span className="material-symbols-rounded">trending_up</span> Top 5 Maiores Sobras (Geral)
                                    </h2>
                                    <div className="space-y-3">
                                        {chartData.topSobras.map((s, i) => (
                                            <div key={i} className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl">
                                                <span className="font-semibold text-slate-700 dark:text-slate-300 truncate pr-4">{s.nome}</span>
                                                <span className="font-black text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 px-3 py-1 rounded-lg">+{s.valor}</span>
                                            </div>
                                        ))}
                                        {chartData.topSobras.length === 0 && <span className="text-slate-400 italic">Nenhuma sobra registrada.</span>}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 shadow-sm border border-slate-200 dark:border-slate-700 text-center">
                            <span className="material-symbols-rounded text-6xl text-slate-300 dark:text-slate-600 mb-4">analytics</span>
                            <h3 className="text-xl font-bold text-slate-600 dark:text-slate-400">Sem dados para o período e local selecionados</h3>
                            <p className="text-slate-400">Selecione outro período ou local acima.</p>
                        </div>
                    )
                ) : (
                    /* ABA ANALÍTICA */
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Data</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Local</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Produto</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Físico</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Sistema</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">UM</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Custo Unit.</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Diferença</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Total Custo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedDetails.map((row, i) => (
                                        <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                {dayjs(row.data).format('DD/MM/YYYY')}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200">
                                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-600 rounded text-[10px]">{row.nome_local}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                <div className="flex flex-col">
                                                    <span>{row.nome_produto}</span>
                                                    <span className="text-[10px] text-slate-400">{row.cod_produto}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200 text-right">{row.total_fisico}</td>
                                            <td className="px-6 py-4 text-sm font-semibold text-slate-400 text-right">{row.total_sistema}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-slate-500 text-center">
                                                <span className="px-2 py-0.5 border border-slate-200 dark:border-slate-600 rounded uppercase text-[10px]">{row.um || '--'}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-slate-600 text-right">
                                                {row.custo ? `R$ ${row.custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '--'}
                                            </td>
                                            <td className={`px-6 py-4 text-sm font-black text-right ${row.dif < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                {row.dif > 0 ? `+${row.dif}` : row.dif}
                                            </td>
                                            <td className={`px-6 py-4 text-sm font-black text-right ${row.total_custo_dif < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {row.total_custo_dif ? `R$ ${row.total_custo_dif.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'}
                                            </td>
                                        </tr>
                                    ))}
                                    {paginatedDetails.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-20 text-center text-slate-400 italic">
                                                Nenhuma movimentação detalhada encontrada para este período.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginação */}
                        {totalPages > 1 && (
                            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-400">Página {page} de {totalPages} ({detailsFiltrados.length} itens)</span>
                                <div className="flex gap-2">
                                    <button
                                        disabled={page === 1}
                                        onClick={() => setPage(p => p - 1)}
                                        className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ArrowBackIcon sx={{ fontSize: 18 }} />
                                    </button>
                                    <button
                                        disabled={page === totalPages}
                                        onClick={() => setPage(p => p + 1)}
                                        className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ArrowBackIcon sx={{ fontSize: 18, transform: 'rotate(180deg)' }} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </main>
        </div>
    );
};

export default DashboardFechamento;
