import React, { useState, useEffect, useCallback, useRef } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { API_BASE_URL } from '../utils/apiConfig';
import FrotaHeader from "./components/FrotaHeader";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement
);

const customDataLabelsPlugin = {
  id: 'customDataLabels',
  afterDraw: (chart) => {
    const { ctx } = chart;
    ctx.save();
    chart.data.datasets.forEach((dataset, i) => {
      const meta = chart.getDatasetMeta(i);
      meta.data.forEach((bar, index) => {
        const val = dataset.data[index];
        const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 10px Inter';
        ctx.textAlign = chart.options.indexAxis === 'y' ? 'left' : 'center';
        ctx.textBaseline = 'middle';
        const padding = 5;
        let x, y;
        if (chart.options.indexAxis === 'y') {
          x = bar.x + padding;
          y = bar.y;
        } else {
          x = bar.x;
          y = bar.y - padding - 8;
        }
        ctx.fillText(formatted, x, y);
      });
    });
    ctx.restore();
  }
};

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const SearchableSelect = ({ label, value, onChange, placeholder, searchEndpoint, resultMapper }) => {
    const [searchTerm, setSearchTerm] = useState(value || "");
    const [results, setResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    useEffect(() => { setSearchTerm(value || ""); }, [value]);
    const handleSearch = async (term) => {
        setSearchTerm(term);
        if (term.length < 2) { setResults([]); return; }
        try {
            const response = await axios.get(`${API_BASE_URL}${searchEndpoint}?q=${term}`);
            setResults(response.data);
            setShowResults(true);
        } catch (error) { console.error("Erro na busca:", error); }
    };
    return (
        <div className="space-y-1 relative">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>
            <div className="relative">
                <input type="text" value={searchTerm} onChange={(e) => handleSearch(e.target.value)} onFocus={() => { if(results.length > 0) setShowResults(true); }} onBlur={() => setTimeout(() => setShowResults(false), 200)} placeholder={placeholder}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm text-sm" />
                {searchTerm && ( <button onClick={() => { setSearchTerm(""); onChange(""); setResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"><span className="material-symbols-rounded text-sm">close</span></button> )}
            </div>
            {showResults && results.length > 0 && (
                <div className="absolute z-[110] left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                    {results.map((item, idx) => (
                        <button key={idx} type="button" onClick={() => { const mapped = resultMapper(item); onChange(mapped.id); setSearchTerm(mapped.display); setShowResults(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                            <p className="font-bold text-sm text-slate-800">{resultMapper(item).display}</p>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const StatCard = ({ title, value, icon, color, isFullscreen }) => (
    <div className={`h-full bg-white border-slate-100 p-6 rounded-3xl shadow-sm border flex items-start justify-between relative group hover:shadow-lg transition-all duration-300 overflow-hidden`}>
        <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
            <h3 className="text-2xl font-black text-slate-900 mb-1">{value}</h3>
        </div>
        <div className={`p-3 rounded-2xl ${color} bg-opacity-10 text-blue-500 shrink-0`}>
            <span className="material-symbols-rounded text-2xl">{icon}</span>
        </div>
    </div>
);

const chartOptionsBase = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: {
            callbacks: {
                label: (context) => 'Valor: ' + formatCurrency(context.chart.options.indexAxis === 'y' ? context.parsed.x : context.parsed.y)
            }
        }
    },
    scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 }, color: '#94a3b8' } },
        x: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' }, color: '#64748b' } },
    },
};

const ManutencaoDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ stats: {}, porTipo: [], porFornecedor: [], porVeiculo: [] });
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const DEFAULT_WIDGETS = [
        'kpi-total', 'kpi-records', 'kpi-avg',
        'chart-fornecedores', 'chart-veiculos', 'chart-tipos'
    ];
    const DEFAULT_CONFIG = {
        'kpi-total': { w: 'w-full md:w-[calc(33.33%-16px)]', h: 120 },
        'kpi-records': { w: 'w-full md:w-[calc(33.33%-16px)]', h: 120 },
        'kpi-avg': { w: 'w-full md:w-[calc(33.33%-16px)]', h: 120 },
        'chart-fornecedores': { w: 'w-full', h: 450 },
        'chart-veiculos': { w: 'w-full', h: 450 },
        'chart-tipos': { w: 'w-full', h: 450 }
    };

    const [widgets, setWidgets] = useState(DEFAULT_WIDGETS);
    const [widgetConfig, setWidgetConfig] = useState(DEFAULT_CONFIG);

    const [expTipo, setExpTipo] = useState(false);
    const [expFornecedor, setExpFornecedor] = useState(false);
    const [expVeiculo, setExpVeiculo] = useState(false);

    const [filters, setFilters] = useState({
        placa: "",
        dataInicio: dayjs().startOf('month').format('YYYY-MM-DD'),
        dataFim: dayjs().format('YYYY-MM-DD')
    });

    useEffect(() => {
        const handleFsChange = () => {
            const isFs = !!document.fullscreenElement;
            setIsFullscreen(isFs);
            if (!isFs) {
                setWidgets(DEFAULT_WIDGETS);
                setWidgetConfig(DEFAULT_CONFIG);
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
    };

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.placa) params.append("placa", filters.placa);
            if (filters.dataInicio) params.append("dataInicio", filters.dataInicio);
            if (filters.dataFim) params.append("dataFim", filters.dataFim);
            if (expTipo) params.append("limitTipo", "true");
            if (expFornecedor) params.append("limitFornecedor", "true");
            if (expVeiculo) params.append("limitVeiculo", "true");
            const response = await axios.get(`${API_BASE_URL}/frota/manutencao/dashboard?${params.toString()}`);
            setStats(response.data);
        } catch (error) { console.error("Erro dashboard:", error); }
        finally { setLoading(false); }
    }, [filters, expTipo, expFornecedor, expVeiculo]);

    useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const newWidgets = Array.from(widgets);
        const [removed] = newWidgets.splice(result.source.index, 1);
        newWidgets.splice(result.destination.index, 0, removed);
        setWidgets(newWidgets);
    };

    const updateConfig = (id, field, value) => {
        setWidgetConfig(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    };

    const renderWidget = (id) => {
        const config = widgetConfig[id];
        const isKPI = id.startsWith('kpi');
        const content = () => {
            if (id === 'kpi-total') return <StatCard title="Investimento Total" value={formatCurrency(stats.stats?.total_geral || 0)} icon="payments" color="text-blue-500" />;
            if (id === 'kpi-records') return <StatCard title="Notas Processadas" value={stats.stats?.total_records || stats.stats?.total_registros || 0} icon="receipt_long" color="text-emerald-500" />;
            if (id === 'kpi-avg') return <StatCard title="Custo Médio / Nota" value={formatCurrency((stats.stats?.total_geral / (stats.stats?.total_records || stats.stats?.total_registros || 1)) || 0)} icon="calculate" color="text-orange-500" />;
            
            let chartId, title, color, data, exp, setExp, icon;
            if (id === 'chart-fornecedores') { chartId = "fornecedores"; title = "Top Fornecedores"; color = "#10B981"; data = stats.porFornecedor; exp = expFornecedor; setExp = setExpFornecedor; icon = "local_shipping"; }
            if (id === 'chart-veiculos') { chartId = "veiculos"; title = "Gastos por Veículo"; color = "#6366F1"; data = stats.porVeiculo; exp = expVeiculo; setExp = setExpVeiculo; icon = "directions_car"; }
            if (id === 'chart-tipos') { chartId = "tipos"; title = "Categorias"; color = "#3B82F6"; data = stats.porTipo; exp = expTipo; setExp = setExpTipo; icon = "category"; }

            const sum = data.reduce((a,b)=>a+b.value, 0);
            return (
                <section className={`h-full bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col group relative`}>
                    {isFullscreen && (
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                            <button onClick={() => updateConfig(id, 'w', config.w === 'w-full' ? 'md:w-[calc(50%-12px)]' : 'w-full')} className="p-1 px-2 bg-slate-50 border rounded text-[10px] font-bold text-slate-500 hover:text-blue-500">{config.w === 'w-full' ? 'Lado a Lado' : 'Largura Total'}</button>
                            <button onMouseDown={(e) => {
                                const startY = e.clientY; const startH = config.h;
                                const onMove = (me) => updateConfig(id, 'h', Math.max(200, startH + (me.clientY - startY)));
                                const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                                window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
                            }} className="p-1 bg-slate-50 border rounded text-slate-500 cursor-ns-resize"><span className="material-symbols-rounded text-sm">height</span></button>
                        </div>
                    )}
                    <div className="flex items-center justify-between mb-4 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl bg-opacity-10 text-${color.replace('#','')}`} style={{ backgroundColor: `${color}22`, color: color }}><span className="material-symbols-rounded text-xl">{icon}</span></div>
                            <div><h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight leading-none">{exp ? `Todos: ${title}` : `Top 10: ${title}`}</h3><p className="text-[9px] font-bold uppercase tracking-widest mt-1" style={{ color: color }}>Soma: {formatCurrency(sum)}</p></div>
                        </div>
                        {!isFullscreen && <button onClick={() => setExp(!exp)} className="px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all bg-slate-50 text-slate-600 hover:scale-105 active:scale-95">{exp ? "Top 10" : "Tudo"}</button>}
                    </div>
                    <div className="flex-1 min-h-0">
                        <Bar 
                            data={{ labels: data.map(d => d.label), datasets: [{ data: data.map(d => d.value), backgroundColor: color, borderRadius: 8 }] }} 
                            plugins={[customDataLabelsPlugin]}
                            options={{ ...chartOptionsBase, indexAxis: 'y', layout: { padding: { right: 80 } }, scales: { ...chartOptionsBase.scales, x: { ...chartOptionsBase.scales.x, ticks: { ...chartOptionsBase.scales.x.ticks, callback: (v) => formatCurrency(v).replace(',00','') } }, y: { ...chartOptionsBase.scales.y, grid: { display: false } } } }}
                        />
                    </div>
                </section>
            );
        };

        return (
            <Draggable key={id} draggableId={id} index={widgets.indexOf(id)} isDragDisabled={!isFullscreen}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`${config.w} transition-all duration-200 ${snapshot.isDragging ? 'z-[100] scale-105 rotate-1 animate-pulse' : ''}`}
                        style={{ ...provided.draggableProps.style, height: config.h }}
                    >
                        {content()}
                    </div>
                )}
            </Draggable>
        );
    };

    return (
        <div className={`min-h-screen ${isFullscreen ? 'bg-slate-50 border-[16px] border-slate-200 absolute inset-0 z-[1000] overflow-y-auto' : 'bg-[#F9FAFB]'} text-slate-800 font-sans transition-all duration-500 pb-20 custom-scrollbar`}>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
            {!isFullscreen && <FrotaHeader />}

            <div className={`max-w-7xl mx-auto px-6 ${isFullscreen ? 'mt-8 mb-4' : 'mt-6'}`}>
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        {!isFullscreen && <button onClick={() => navigate("/frota/manutencao")} className="flex items-center gap-2 text-slate-400 hover:text-blue-600 font-semibold group mb-2 text-sm transition-colors"><span className="material-symbols-rounded group-hover:-translate-x-1 duration-200">arrow_back</span>Voltar</button>}
                        <h1 className={`font-black leading-tight tracking-tighter uppercase ${isFullscreen ? 'text-5xl text-slate-900' : 'text-3xl text-slate-900'}`}>{isFullscreen ? "Apresentação" : "Dashboard de Custos"}</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {isFullscreen && (
                            <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="px-5 py-3 rounded-2xl flex items-center gap-2 font-bold bg-white border border-slate-200 text-slate-600 shadow-lg hover:bg-slate-50 transition-all">
                                <span className="material-symbols-rounded">{isFilterOpen ? 'close' : 'filter_alt'}</span>
                                {isFilterOpen ? 'Fechar Filtros' : 'Filtrar'}
                            </button>
                        )}
                        <button onClick={toggleFullscreen} className={`px-5 py-3 rounded-2xl flex items-center gap-2 font-bold transition-all shadow-xl hover:scale-105 active:scale-95 ${isFullscreen ? 'bg-slate-200 text-slate-700' : 'bg-blue-600 text-white'}`}>
                            <span className="material-symbols-rounded">{isFullscreen ? 'fullscreen_exit' : 'present_to_all'}</span>
                            <span>{isFullscreen ? 'Sair do Modo TV' : 'Apresentação'}</span>
                        </button>
                    </div>
                </div>

                {/* Filtros em Apresentação */}
                {isFullscreen && isFilterOpen && (
                    <div className="mt-6 bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 flex flex-wrap gap-6 items-end animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex-1 min-w-[300px]">
                            <SearchableSelect label="Veículo" value={filters.placa} onChange={(v) => { setFilters(p => ({ ...p, placa: v })); setTimeout(()=>setIsFilterOpen(false), 800); }} placeholder="Placa..." searchEndpoint="/frota/veiculos/search" resultMapper={(i) => ({ id: i.placa, display: i.placa, sub: i.descricao })} />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Início</label>
                            <input type="date" value={filters.dataInicio} onChange={(e) => setFilters(p => ({ ...p, dataInicio: e.target.value }))} className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Fim</label>
                            <input type="date" value={filters.dataFim} onChange={(e) => setFilters(p => ({ ...p, dataFim: e.target.value }))} className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                )}
            </div>

            <main className={`${isFullscreen ? 'max-w-[95%] mx-auto' : 'max-w-7xl mx-auto px-6'} py-4`}>
                {!isFullscreen && (
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-8 grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                        <div className="md:col-span-2"><SearchableSelect label="Filtro por Veículo" value={filters.placa} onChange={(v) => setFilters(p => ({ ...p, placa: v }))} placeholder="Placa..." searchEndpoint="/frota/veiculos/search" resultMapper={(i) => ({ id: i.placa, display: i.placa, sub: i.descricao })} /></div>
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Início</label><input type="date" value={filters.dataInicio} onChange={(e) => setFilters(p => ({ ...p, dataInicio: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm" /></div>
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Fim</label><input type="date" value={filters.dataFim} onChange={(e) => setFilters(p => ({ ...p, dataFim: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm" /></div>
                    </div>
                )}

                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="dashboard-grid" direction="horizontal">
                        {(provided) => (
                            <div 
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="flex flex-wrap gap-4 items-start content-start"
                            >
                                {widgets.map((id) => renderWidget(id))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </main>
        </div>
    );
};

export default ManutencaoDashboard;
