import React, { useMemo, useState } from 'react';
import { 
    Chart as ChartJS, 
    CategoryScale, 
    LinearScale, 
    BarElement, 
    Title, 
    Tooltip, 
    Legend, 
    ArcElement,
    PointElement,
    LineElement,
    Filler
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Registrar componentes do ChartJS
ChartJS.register(
    CategoryScale, 
    LinearScale, 
    BarElement, 
    Title, 
    Tooltip, 
    Legend, 
    ArcElement,
    PointElement,
    LineElement,
    Filler
);

const AbastecimentoDashboard = ({ data = [] }) => {
    // Estados de Filtro
    const [period, setPeriod] = useState('all'); // '7', 'month', 'all', 'custom'
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [company, setCompany] = useState('all');
    const [drillDownPlate, setDrillDownPlate] = useState(null);
    const [showAllKmChart, setShowAllKmChart] = useState(false);
    const [isEfficiencyModalOpen, setIsEfficiencyModalOpen] = useState(false);

    // Lógica de Filtragem
    const filteredData = useMemo(() => {
        return data.filter(item => {
            const now = new Date();
            
            // Para evitar problemas de fuso horário que jogam o dia 01 para o mês anterior (UTC-3),
            // extraímos a data diretamente da string
            const dateStr = item.data_registro ? item.data_registro.split('T')[0] : '';
            const [year, month, day] = dateStr ? dateStr.split('-') : [0, 0, 0];
            const localItemDate = dateStr ? new Date(year, month - 1, day) : new Date(0);
            
            // Filtro de Período
            let passPeriod = true;
            if (period === '7') {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setHours(0, 0, 0, 0);
                sevenDaysAgo.setDate(now.getDate() - 7);
                passPeriod = localItemDate >= sevenDaysAgo;
            } else if (period === 'month') {
                passPeriod = parseInt(month, 10) === now.getMonth() + 1 && parseInt(year, 10) === now.getFullYear();
            } else if (period === 'custom' && customStart && customEnd) {
                const [sy, sm, sd] = customStart.split('-');
                const [ey, em, ed] = customEnd.split('-');
                const start = new Date(sy, sm - 1, sd);
                const end = new Date(ey, em - 1, ed);
                passPeriod = localItemDate >= start && localItemDate <= end;
            }

            // Filtro de Empresa
            const passCompany = company === 'all' || item.empresa === company;

            // Filtro de Drill-down (Placa)
            const passPlate = !drillDownPlate || item.placa === drillDownPlate;

            return passPeriod && passCompany && passPlate;
        });
    }, [data, period, customStart, customEnd, company, drillDownPlate]);

    // Cálculos de KPIs
    const stats = useMemo(() => {
        const totalSpent = filteredData.reduce((acc, curr) => acc + (parseFloat(curr.valor_venda) || 0), 0);
        const totalVolume = filteredData.reduce((acc, curr) => acc + (parseFloat(curr.quantidade) || 0), 0);
        const totalKM = filteredData.reduce((acc, curr) => acc + (parseFloat(curr.km_rod) || 0), 0);
        
        // Média Geral (Apenas para Diesel/Gasolina que tenham KM/LT preenchido)
        const itemsWithMedia = filteredData.filter(item => parseFloat(item.km_lt) > 0);
        const avgMedia = itemsWithMedia.length > 0
            ? itemsWithMedia.reduce((acc, curr) => acc + parseFloat(curr.km_lt), 0) / itemsWithMedia.length
            : 0;

        return { totalSpent, totalVolume, totalKM, avgMedia };
    }, [filteredData]);

    // Dados para Gráfico: Gastos por Placa (Top 10)
    const spentByPlateData = useMemo(() => {
        const grouping = {};
        filteredData.forEach(item => {
            grouping[item.placa] = (grouping[item.placa] || 0) + (parseFloat(item.valor_venda) || 0);
        });

        const sorted = Object.entries(grouping)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        return {
            labels: sorted.map(i => i[0]),
            datasets: [{
                label: 'Gasto Total (R$)',
                data: sorted.map(i => i[1]),
                backgroundColor: 'rgba(239, 68, 68, 0.8)',
                borderRadius: 8,
                hoverBackgroundColor: 'rgba(239, 68, 68, 1)',
            }]
        };
    }, [filteredData]);

    // Dados para Ranking de Eficiência (KM/LT)
    const efficiencyRanking = useMemo(() => {
        const grouping = {};
        const counts = {};
        filteredData.forEach(item => {
            const media = parseFloat(item.km_lt);
            if (media > 0) {
                grouping[item.placa] = (grouping[item.placa] || 0) + media;
                counts[item.placa] = (counts[item.placa] || 0) + 1;
            }
        });

        const averages = Object.entries(grouping).map(([placa, sum]) => ({
            placa,
            avg: sum / counts[placa]
        }));

        const sorted = averages.sort((a, b) => b.avg - a.avg);
        const maxAvg = sorted.length > 0 ? sorted[0].avg : 1;

        return { items: sorted, maxAvg };
    }, [filteredData]);

    // Dados para Gráfico: Consumo por Tipo
    const typeConsumptionData = useMemo(() => {
        const grouping = {};
        filteredData.forEach(item => {
            grouping[item.tipo] = (grouping[item.tipo] || 0) + (parseFloat(item.valor_venda) || 0);
        });

        return {
            labels: Object.keys(grouping),
            datasets: [{
                data: Object.values(grouping),
                backgroundColor: [
                    'rgba(30, 41, 59, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(100, 116, 139, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                ],
                borderWidth: 0,
            }]
        };
    }, [filteredData]);

    // Dados para Gráfico: KM Rodado por Placa (Top 10 ou Todos)
    const kmByPlateData = useMemo(() => {
        const grouping = {};
        filteredData.forEach(item => {
            const km = parseFloat(item.km_rod) || 0;
            if (km > 0) {
                grouping[item.placa] = (grouping[item.placa] || 0) + km;
            }
        });

        let sorted = Object.entries(grouping).sort((a, b) => b[1] - a[1]);
        const maxKm = sorted.length > 0 ? sorted[0][1] : 1;

        if (!showAllKmChart) {
            sorted = sorted.slice(0, 10);
        }

        return { items: sorted, maxKm };
    }, [filteredData, showAllKmChart]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1e293b',
                titleFont: { size: 12, weight: 'bold' },
                bodyFont: { size: 12 },
                padding: 12,
                cornerRadius: 8,
                displayColors: false
            }
        },
        scales: {
            y: { grid: { display: false }, ticks: { font: { size: 10, weight: '600' } } },
            x: { grid: { display: false }, ticks: { font: { size: 10, weight: '600' } } }
        }
    };

    return (
        <div className="space-y-6 text-slate-800 font-inter">
            {/* Filtros */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100 shadow-inner">
                <div className="flex flex-wrap items-center gap-2">
                    {[
                        { key: '7',     label: 'Últ. 7 Dias' },
                        { key: 'month', label: 'Mês Atual'   },
                        { key: 'all',   label: 'Tudo'        },
                        { key: 'custom', label: 'Personalizado', icon: 'date_range' },
                    ].map(({ key, label, icon }) => (
                        <button
                            key={key}
                            onClick={() => setPeriod(key)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${period === key ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-white text-slate-400 hover:text-slate-600'}`}
                        >
                            {icon && <span className="material-symbols-rounded text-sm">{icon}</span>}
                            {label}
                        </button>
                    ))}

                    {period === 'custom' && (
                        <div className="flex items-center gap-2 ml-1 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-100">
                            <input
                                type="date"
                                value={customStart}
                                onChange={(e) => setCustomStart(e.target.value)}
                                className="text-[11px] font-semibold text-slate-700 outline-none bg-transparent cursor-pointer"
                            />
                            <span className="text-slate-300 text-xs font-bold">→</span>
                            <input
                                type="date"
                                value={customEnd}
                                onChange={(e) => setCustomEnd(e.target.value)}
                                className="text-[11px] font-semibold text-slate-700 outline-none bg-transparent cursor-pointer"
                            />
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <select 
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className="bg-white px-4 py-2 rounded-xl border-none shadow-sm text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-red-500 transition-all cursor-pointer"
                    >
                        <option value="all">Todas as Empresas</option>
                        <option value="Fort Fruit LTDA">Fort Fruit</option>
                        <option value="Bem Pra Gente">Bem Pra Gente</option>
                    </select>

                    {drillDownPlate && (
                        <button 
                            onClick={() => setDrillDownPlate(null)}
                            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95"
                        >
                            <span className="material-symbols-rounded text-base">close</span>
                            Placa: {drillDownPlate}
                        </button>
                    )}
                </div>
            </div>

            {/* Cards KPI */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Gasto Total', val: stats.totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: 'payments', color: 'text-red-600', bg: 'bg-red-50' },
                    { label: 'Volume Total', val: `${stats.totalVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Lts`, icon: 'water_drop', color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'KM Rodados', val: `${stats.totalKM.toLocaleString('pt-BR')} KM`, icon: 'route', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Média Frota', val: `${stats.avgMedia.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KM/L`, icon: 'query_stats', color: 'text-orange-500', bg: 'bg-orange-50' },
                ].map((kpi, i) => (
                    <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex items-start justify-between mb-4">
                            <div className={`${kpi.bg} ${kpi.color} p-3 rounded-2xl`}>
                                <span className="material-symbols-rounded text-2xl">{kpi.icon}</span>
                            </div>
                            <span className="material-symbols-rounded text-slate-200 group-hover:text-slate-300 transition-colors">trending_up</span>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{kpi.label}</p>
                        <h3 className="text-xl font-black text-slate-800 tracking-tighter">{kpi.val}</h3>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gastos por Placa */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 leading-tight">Gastos por Veículo</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Top 10 Placas com maior custo</p>
                        </div>
                        <span className="material-symbols-rounded text-slate-300">bar_chart</span>
                    </div>
                    <div className="h-[300px]">
                        <Bar 
                            data={spentByPlateData} 
                            options={{
                                ...chartOptions,
                                onClick: (e, elements) => {
                                    if (elements.length > 0) {
                                        const index = elements[0].index;
                                        setDrillDownPlate(spentByPlateData.labels[index]);
                                    }
                                }
                            }} 
                        />
                    </div>
                    <p className="text-[9px] text-center text-slate-300 font-bold uppercase tracking-widest mt-4 italic">* Clique em uma barra para filtrar detalhes</p>
                </div>

                {/* Consumo por Tipo */}
                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col items-center">
                    <div className="w-full mb-8">
                        <h3 className="text-lg font-black text-slate-900 leading-tight">Consumo por Tipo</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Diesel vs Gasolina vs Prod.</p>
                    </div>
                    <div className="h-[240px] w-full relative">
                        <Doughnut data={typeConsumptionData} options={{ ...chartOptions, cutout: '75%' }} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total</span>
                            <span className="text-base font-black text-slate-800 tracking-tighter">
                                {stats.totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                            </span>
                        </div>
                    </div>
                    <div className="mt-8 w-full space-y-2">
                        {typeConsumptionData.labels.map((label, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: typeConsumptionData.datasets[0].backgroundColor[i] }}></div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">{label}</span>
                                </div>
                                <span className="text-[10px] font-black text-slate-700 leading-none">
                                    {((typeConsumptionData.datasets[0].data[i] / (stats.totalSpent || 1)) * 100).toFixed(0)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-2">
                <div className="bg-slate-900 p-8 rounded-[32px] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[60px] rounded-full -mr-16 -mt-16"></div>
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div>
                            <h3 className="text-lg font-black text-white leading-tight">Mais Eficientes</h3>
                            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Top 5 Médias de KM/L</p>
                        </div>
                        <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-400">
                            <span className="material-symbols-rounded">verified</span>
                        </div>
                    </div>
                    <div className="space-y-4 relative z-10">
                        {efficiencyRanking.items.slice(0, 5).map((item, i) => (
                            <div key={i} className="flex flex-col gap-1.5 group cursor-pointer" onClick={() => setDrillDownPlate(item.placa)}>
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-black text-white uppercase tracking-wider">{item.placa}</span>
                                    <span className="text-[11px] font-black text-emerald-400">{item.avg.toFixed(2)} <small className="text-[8px] opacity-60">KM/L</small></span>
                                </div>
                                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out" 
                                        style={{ width: `${(item.avg / efficiencyRanking.maxAvg) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                        {efficiencyRanking.items.length === 0 && (
                            <p className="text-center py-10 text-[10px] font-bold text-slate-500 uppercase italic tracking-widest">Nenhum dado de média encontrado</p>
                        )}
                    </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-[32px] shadow-2xl relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[60px] rounded-full -mr-16 -mt-16"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-lg font-black text-white leading-tight">Top 10 KM/LT</h3>
                                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Ranking de Desempenho</p>
                            </div>
                            <button 
                                onClick={() => setIsEfficiencyModalOpen(true)}
                                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                            >
                                Ver Todos
                            </button>
                        </div>
                        <div className="space-y-3.5">
                            {efficiencyRanking.items.slice(0, 10).map((item, i) => (
                                <div key={i} className="flex items-center justify-between group cursor-pointer" onClick={() => setDrillDownPlate(item.placa)}>
                                    <span className="text-[10px] font-black text-white/80 uppercase tracking-wider">{i + 1}. {item.placa}</span>
                                    <span className="text-[10px] font-black text-emerald-400">{item.avg.toFixed(2)} <small className="text-[7px] opacity-60 italic">KM/L</small></span>
                                </div>
                            ))}
                            {efficiencyRanking.items.length === 0 && (
                                <p className="text-center py-10 text-[10px] font-bold text-slate-500 uppercase italic tracking-widest">Nenhum dado encontrado</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Novo Gráfico: KM Rodado (Estilo Lista de Progresso) */}
            <div className="bg-slate-900 p-8 rounded-[32px] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[60px] rounded-full -mr-16 -mt-16"></div>
                <div className="flex items-center justify-between mb-8 relative z-10">
                    <div>
                        <h3 className="text-lg font-black text-white leading-tight">KM Rodado por Veículo</h3>
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                            {showAllKmChart ? 'Todos os Veículos listados' : 'Top 10 Veículos (Maior KM)'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setShowAllKmChart(!showAllKmChart)}
                            className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all flex items-center gap-1.5"
                        >
                            <span className="material-symbols-rounded text-sm">{showAllKmChart ? 'filter_list' : 'list_alt'}</span>
                            {showAllKmChart ? 'Top 10' : 'Ver Todos'}
                        </button>
                        <div className="bg-blue-500/20 p-2 rounded-xl text-blue-400">
                            <span className="material-symbols-rounded">speed</span>
                        </div>
                    </div>
                </div>
                
                <div className="space-y-5 relative z-10">
                    {kmByPlateData.items.map(([placa, km], i) => (
                        <div key={i} className="flex flex-col gap-2 group cursor-pointer" onClick={() => setDrillDownPlate(placa)}>
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black text-white uppercase tracking-wider">{placa}</span>
                                <span className="text-[11px] font-black text-blue-400">
                                    {km.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} <small className="text-[8px] opacity-60">KM</small>
                                </span>
                            </div>
                            <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out" 
                                    style={{ width: `${(km / kmByPlateData.maxKm) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}
                    {kmByPlateData.items.length === 0 && (
                        <p className="text-center py-10 text-[10px] font-bold text-slate-500 uppercase italic tracking-widest">Nenhum dado de KM encontrado</p>
                    )}
                </div>
                <p className="text-[9px] text-center text-slate-500 font-bold uppercase tracking-widest mt-8 italic">* Clique em um veículo para filtrar detalhes</p>
            </div>


            {/* Modal: Ranking Completo de Eficiência */}
            {isEfficiencyModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Ranking de Eficiência</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Lista completa por KM/L</p>
                            </div>
                            <button 
                                onClick={() => setIsEfficiencyModalOpen(false)}
                                className="bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 p-3 rounded-2xl transition-all shadow-sm border border-slate-100"
                            >
                                <span className="material-symbols-rounded">close</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-4">
                            <div className="grid grid-cols-12 gap-4 px-4 mb-2">
                                <span className="col-span-1 text-[10px] font-black text-slate-400 uppercase">Pos.</span>
                                <span className="col-span-6 text-[10px] font-black text-slate-400 uppercase">Veículo</span>
                                <span className="col-span-5 text-[10px] font-black text-slate-400 uppercase text-right">Média KM/L</span>
                            </div>
                            {efficiencyRanking.items.map((item, i) => (
                                <div 
                                    key={i} 
                                    className="grid grid-cols-12 gap-4 items-center p-4 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group border border-transparent hover:border-slate-100"
                                    onClick={() => {
                                        setDrillDownPlate(item.placa);
                                        setIsEfficiencyModalOpen(false);
                                    }}
                                >
                                    <span className="col-span-1 text-sm font-black text-slate-300">#{i + 1}</span>
                                    <span className="col-span-6 text-sm font-black text-slate-700 uppercase tracking-tight">{item.placa}</span>
                                    <div className="col-span-5 flex items-center justify-end gap-3">
                                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden md:block">
                                            <div className="h-full bg-emerald-500" style={{ width: `${(item.avg / efficiencyRanking.maxAvg) * 100}%` }}></div>
                                        </div>
                                        <span className="text-sm font-black text-emerald-600 w-16 text-right">{item.avg.toFixed(2)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">* Clique em um veículo para filtrar os dados do dashboard</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AbastecimentoDashboard;
