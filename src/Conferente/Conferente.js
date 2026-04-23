import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import "moment/locale/pt-br";
import { API_BASE_URL } from '../utils/apiConfig';

// --- Components Reutilizáveis (Tailwind) ---

const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-xl" }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-700 font-sans`}>
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all">
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

const StatusBadge = ({ status }) => {
  let colors = "bg-slate-100 text-slate-600 border-slate-200";
  if (status === "Faturado") colors = "bg-green-100 text-green-700 border-green-200";
  else if (status === "Em Separação") colors = "bg-blue-100 text-blue-700 border-blue-200";
  else if (status === "Pendente") colors = "bg-amber-100 text-amber-700 border-amber-200";

  return (
    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${colors} uppercase tracking-wider`}>
      {status}
    </span>
  );
};

const ConferentePage = () => {
  const navigate = useNavigate();
  // --- STATE ---
  const [username, setUsername] = useState("");
  const [local, setLocal] = useState("08"); // Padrao
  const [dataList, setDataList] = useState([]);
  const [selectedDate, setSelectedDate] = useState(moment());
  const [searchValue, setSearchValue] = useState("");
  const [filterType, setFilterType] = useState("produto"); // 'produto' | 'cliente'

  // Filtros Rápidos (Ovo, Banana...)
  const [filtroAtivo, setFiltroAtivo] = useState(""); // 'OVO', 'BANANA', ''

  // Expanded Rows (accordion manual)
  const [expandedRows, setExpandedRows] = useState({}); // { [codPro]: boolean }
  const [loadingDetails, setLoadingDetails] = useState({}); // { [codPro]: boolean }

  // Modals
  const [isPanelModalOpen, setIsPanelModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  // Dados Auxiliares
  const [clientesData, setClientesData] = useState([]);
  const [modalClienteName, setModalClienteName] = useState("");
  const [resumoPedidos, setResumoPedidos] = useState({ Pendente: 0, "Em Separação": 0, Faturado: 0 });
  const [pedidosPorStatus, setPedidosPorStatus] = useState([]);
  const [statusSelecionado, setStatusSelecionado] = useState(null);

  // Relatório Params
  const [grupoSelecionado, setGrupoSelecionado] = useState(null);
  const [modoRelatorio, setModoRelatorio] = useState("detalhado");
  const [dataRelatorio, setDataRelatorio] = useState(moment());

  // --- INITIALIZATION ---
  useEffect(() => {
    const u = localStorage.getItem("username");
    if (u) setUsername(u);
    fetchData(); // Load initial
  }, []);

  const toggleDarkMode = () => document.documentElement.classList.toggle("dark");
  const handleLogout = () => { localStorage.clear(); navigate("/login"); };

  // --- DATA FETCHING ---
  const fetchData = useCallback(async () => {
    if (!selectedDate) return;
    try {
      const formattedDate = selectedDate.format("YYYYMMDD");
      // Se tiver filtro ativo de botão (OVO/BANANA), usa ele como 'productName' se não tiver search
      // ou combina? O original setava o SearchValue. Vamos manter a logica original de setar o search

      const response = await axios.get(`${API_BASE_URL}/api/relatorios`, {
        params: {
          date: formattedDate,
          productName: filterType === "produto" ? searchValue || null : null,
          clientName: filterType === "cliente" ? searchValue || null : null,
        },
      });

      const formattedData = response.data.map((item) => ({
        ...item,
        TOTAL_QTDE: item.TOTAL_QTDE ? parseFloat(item.TOTAL_QTDE).toFixed(2) : "0.00",
        ZC_UNSVEN: item.ZC_UNSVEN ? parseFloat(item.ZC_UNSVEN).toFixed(2) : "0.00",
        orderDetails: [] // initialize
      }));
      setDataList(formattedData);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    }
  }, [selectedDate, searchValue, filterType]);

  // Debounce Search
  useEffect(() => {
    if (filterType === "produto") {
      const timer = setTimeout(() => fetchData(), 500);
      return () => clearTimeout(timer);
    }
  }, [searchValue, filterType, fetchData]);

  // --- HANDLERS ---
  const handleExpandedRow = async (codPro) => {
    const isExpanding = !expandedRows[codPro];

    setExpandedRows(prev => ({ ...prev, [codPro]: isExpanding }));

    if (isExpanding) {
      // Find item to check if details already loaded? 
      // O original carrega SEMPRE que expande? Parece que sim ou salva no state 'data'.
      // Vamos carregar e salvar no state 'dataList' para cachear.

      const currentItem = dataList.find(d => d.ZC_CODPRO === codPro);
      if (currentItem && currentItem.orderDetails && currentItem.orderDetails.length > 0) {
        return; // Already has details
      }

      setLoadingDetails(prev => ({ ...prev, [codPro]: true }));
      try {
        const formattedDate = selectedDate.format("YYYYMMDD");
        const res = await axios.post(`${API_BASE_URL}/api/relatorios/detalhes`, {
          codProduto: codPro,
          date: formattedDate,
        });

        const details = res.data.map(item => ({
          ...item,
          QuantidadeProduto: item.QuantidadeProduto ? parseFloat(item.QuantidadeProduto).toFixed(2) : "0.00",
        }));

        setDataList(prev => prev.map(item =>
          item.ZC_CODPRO === codPro ? { ...item, orderDetails: details } : item
        ));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingDetails(prev => ({ ...prev, [codPro]: false }));
      }
    }
  };

  const handleQuickFilter = (type) => {
    // type: 'OVO', 'BANANA', ''
    setFiltroAtivo(type);
    setSearchValue(type);
    setFilterType("produto");
    // O useEffect do search vai disparar o fetch
  };

  const loadPanelData = async () => {
    // Carrega resumo do painel
    try {
      const formattedDate = selectedDate.format("YYYYMMDD");
      const res = await axios.post(`${API_BASE_URL}/api/relatorios/pedidos-status`, { date: formattedDate });
      const resumo = { Pendente: 0, "Em Separação": 0, Faturado: 0 };
      res.data.forEach((p) => { resumo[p.Status] = (resumo[p.Status] || 0) + 1; });
      setResumoPedidos(resumo);
      setStatusSelecionado(null);
      setPedidosPorStatus([]);
    } catch (err) { console.error(err); }
  };

  // Trigger Panel Load when opening
  useEffect(() => { if (isPanelModalOpen) loadPanelData(); }, [isPanelModalOpen]);

  const fetchClientesData = async () => {
    try {
      const formattedDate = selectedDate.format("YYYYMMDD");
      const res = await axios.post(`${API_BASE_URL}/api/relatorios/cliente-itens`, {
        nomeCliente: searchValue,
        date: formattedDate,
      });
      // Filter if needed (logic from original)
      let data = res.data || [];
      if (filtroAtivo) {
        data = data.filter(i => i.ZC_DESPRO?.toUpperCase().includes(filtroAtivo.toUpperCase()));
      }
      setClientesData(data);
      setModalClienteName(searchValue);
      setIsClientModalOpen(true);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans pb-20 transition-colors duration-300">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />

      {/* --- HEADER MODERN (IGUAL OCORRENCIAS) --- */}
      <header className="sticky top-0 z-50 px-4 md:px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-slate-700/50 px-4 md:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
              <div className="bg-gradient-to-tr from-amber-500 to-orange-400 h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                <span className="material-symbols-rounded text-2xl">inventory_2</span>
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight text-slate-800 dark:text-white">Pré Venda</h1>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Conferência</span>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <div className="hidden md:flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-slate-800 dark:text-white">{username || "Conferente"}</span>
                  <span className="text-[10px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">LOCAL: {local}</span>
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

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">

        {/* Toolbar de Ações e Filtros */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white/20 dark:border-slate-700/50 flex flex-col gap-6">

          {/* Top Row: Navigation & Date */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
              <button onClick={() => navigate("/")} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 font-bold text-slate-600 dark:text-slate-200 transition-colors whitespace-nowrap">
                <span className="material-symbols-rounded">home</span> Home
              </button>
              <button onClick={() => setIsPanelModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/20 transition-colors whitespace-nowrap">
                <span className="material-symbols-rounded">dashboard</span> PAINEL
              </button>
              <button onClick={() => setIsReportModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 font-bold text-slate-600 dark:text-slate-200 transition-colors whitespace-nowrap">
                <span className="material-symbols-rounded">description</span> Rel. Produção
              </button>
            </div>

            {/* Date Picker Customizado */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <span className="material-symbols-rounded">calendar_month</span>
              </div>
              <input
                type="date"
                value={selectedDate.format("YYYY-MM-DD")}
                onChange={(e) => setSelectedDate(moment(e.target.value))}
                className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              />
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-700" />

          {/* Second Row: Filters */}
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-end lg:items-center">

            {/* Search Inputs */}
            <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setFilterType('produto')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterType === 'produto' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}
                >
                  Produto
                </button>
                <button
                  onClick={() => setFilterType('cliente')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterType === 'cliente' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}
                >
                  Cliente
                </button>
              </div>

              <div className="relative flex-1 min-w-[280px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-rounded">search</span>
                <input
                  type="text"
                  placeholder={filterType === 'produto' ? "Buscar Nome do Produto..." : "Buscar Nome do Cliente..."}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all uppercase font-medium"
                />
              </div>

              {filterType === 'cliente' && (
                <button onClick={fetchClientesData} className="px-4 py-2 bg-slate-800 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:scale-105 transition-transform flex items-center gap-2">
                  <span className="material-symbols-rounded">visibility</span> Ver Itens
                </button>
              )}
            </div>

            {/* Quick Filters Pill */}
            <div className="flex gap-2">
              {[
                { id: 'OVO', label: '🥚 OVO', color: 'bg-emerald-500' },
                { id: 'BANANA', label: '🍌 BANANA', color: 'bg-amber-400' },
                { id: '', label: '📦 TODOS', color: 'bg-cyan-500' }
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => handleQuickFilter(btn.id)}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-md transform hover:-translate-y-0.5 
                         ${filtroAtivo === btn.id
                      ? `${btn.color} text-white ring-2 ring-offset-2 ring-offset-slate-100 dark:ring-offset-slate-800 ring-${btn.color.split('-')[1]}-400`
                      : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                    }
                         border border-slate-100 dark:border-slate-600
                       `}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* --- LISTA DE PRODUTOS (CARD LIST / MODERN TABLE) --- */}
        <div className="space-y-4 animate-in slide-in-from-bottom-5">
          {dataList.length === 0 ? (
            <div className="text-center py-20 bg-white/50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-300">
              <span className="material-symbols-rounded text-6xl text-slate-300 block mb-4">search_off</span>
              <p className="text-xl font-bold text-slate-500">Nenhum item encontrado</p>
              <p className="text-slate-400">Tente mudar a data ou o filtro de busca.</p>
            </div>
          ) : (
            dataList.map((item) => {
              const isExpanded = !!expandedRows[item.ZC_CODPRO];
              return (
                <div key={item.ZC_CODPRO} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-all hover:shadow-md">
                  {/* Header Row */}
                  <div
                    className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50 dark:bg-slate-700/50' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}
                    onClick={() => handleExpandedRow(item.ZC_CODPRO)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                        <span className="material-symbols-rounded transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>keyboard_arrow_down</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-white uppercase text-sm md:text-base">{item.ZC_DESPRO}</h3>
                        <p className="text-xs text-slate-400 font-mono">COD: {item.ZC_CODPRO}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 md:gap-8 text-right">
                      <div className="hidden md:block">
                        <span className="block text-[10px] uppercase text-slate-400 font-bold">Segunda UN</span>
                        <span className="font-medium text-slate-600 dark:text-slate-300">{item.ZC_UNSVEN}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase text-slate-400 font-bold">Qtd Total</span>
                        <span className="text-lg font-bold text-blue-600">{item.TOTAL_QTDE}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-black/20 p-4">
                      {loadingDetails[item.ZC_CODPRO] ? (
                        <div className="flex justify-center py-4 text-slate-400 gap-2">
                          <span className="material-symbols-rounded animate-spin">refresh</span> Carregando detalhes...
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="text-xs uppercase text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                              <tr>
                                <th className="pb-2 pl-2">Bilhete</th>
                                <th className="pb-2">Cliente</th>
                                <th className="pb-2">Vendedor</th>
                                <th className="pb-2 text-center">Qtd</th>
                                <th className="pb-2">Obs</th>
                                <th className="pb-2 text-right pr-2">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                              {item.orderDetails && item.orderDetails.map((det, idx) => (
                                <tr key={idx} className="hover:bg-black/5 transition-colors">
                                  <td className="py-2 pl-2 font-mono text-slate-600 dark:text-slate-300">{det.NumeroBilhete}</td>
                                  <td className="py-2 font-medium text-slate-800 dark:text-slate-200">{det.NomeCliente}</td>
                                  <td className="py-2 text-slate-500">{det.Vendedor}</td>
                                  <td className="py-2 text-center font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700/30 rounded-lg">{det.QuantidadeProduto}</td>
                                  <td className="py-2 text-slate-500 italic max-w-[200px] truncate" title={det.ZC_OBS}>{det.ZC_OBS || "-"}</td>
                                  <td className="py-2 text-right pr-2"><StatusBadge status={det.Status} /></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

      </main>

      {/* --- MODAL PAINEL STATUS --- */}
      <Modal isOpen={isPanelModalOpen} onClose={() => setIsPanelModalOpen(false)} title="Painel de Pedidos do Dia" maxWidth="max-w-4xl">
        {/* Cards Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { status: "Pendente", icon: "schedule", color: "bg-red-50 text-red-600 border-red-200" },
            { status: "Em Separação", icon: "progress_activity", color: "bg-blue-50 text-blue-600 border-blue-200" },
            { status: "Faturado", icon: "check_circle", color: "bg-green-50 text-green-600 border-green-200" }
          ].map((card) => (
            <div
              key={card.status}
              onClick={async () => {
                const formattedDate = selectedDate.format("YYYYMMDD");
                const res = await axios.post(`${API_BASE_URL}/api/relatorios/pedidos-status`, { date: formattedDate, status: card.status });
                setStatusSelecionado(card.status);
                setPedidosPorStatus(res.data);
              }}
              className={`p-6 rounded-2xl border cursor-pointer hover:shadow-lg transition-all transform hover:-translate-y-1 ${card.color} flex flex-col items-center justify-center gap-2`}
            >
              <span className="material-symbols-rounded text-4xl">{card.icon}</span>
              <h3 className="font-bold text-lg">{card.status}</h3>
              <span className="text-2xl font-black">{resumoPedidos[card.status] || 0}</span>
              <span className="text-xs uppercase font-bold opacity-70">Pedidos</span>
            </div>
          ))}
        </div>

        {/* Tabela Detalhes Painel */}
        {statusSelecionado && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2 mb-4 p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
              <span className="font-bold text-slate-500 uppercase text-xs pl-2">Listando:</span>
              <StatusBadge status={statusSelecionado} />
            </div>
            <div className="max-h-[300px] overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-slate-500 font-bold uppercase text-xs">Bilhete</th>
                    <th className="px-4 py-2 text-slate-500 font-bold uppercase text-xs">Cliente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                  {pedidosPorStatus.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-2 font-mono text-blue-600 font-bold">{p.NumeroBilhete}</td>
                      <td className="px-4 py-2 font-medium">{p.NomeCliente}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* --- MODAL CLIENTE ITENS --- */}
      <Modal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} title={`Itens: ${modalClienteName}`} maxWidth="max-w-3xl">
        <div className="max-h-[500px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-xs sticky top-0">
              <tr>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3 text-center">Quantidade</th>
                <th className="px-4 py-3 text-center">2ª UN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
              {clientesData.length === 0 ? (
                <tr><td colSpan="3" className="text-center py-8 text-slate-400">Nenhum item encontrado.</td></tr>
              ) : (
                clientesData.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-2 font-medium">{item.ZC_DESPRO}</td>
                    <td className="px-4 py-2 text-center text-blue-600 font-bold">{Number(item.ZC_QTDE).toFixed(2)}</td>
                    <td className="px-4 py-2 text-center text-slate-500">{item.ZC_UNSVEN ? Number(item.ZC_UNSVEN).toFixed(2) : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* --- MODAL RELATÓRIO PDF --- */}
      <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title="Gerar Relatório de Produção">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-1">Data do Relatório</label>
            <input
              type="date"
              value={dataRelatorio.format("YYYY-MM-DD")}
              onChange={(e) => setDataRelatorio(moment(e.target.value))}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-1">Grupo de Produtos</label>
            <select
              value={grupoSelecionado || ""}
              onChange={(e) => setGrupoSelecionado(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">Selecione...</option>
              <option value="0012">0012 - Folhagem</option>
              <option value="0000">0000 - Regional</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-1">Modo de Exibição</label>
            <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
              <button
                onClick={() => setModoRelatorio("detalhado")}
                className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all ${modoRelatorio === 'detalhado' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
              >Detalhado</button>
              <button
                onClick={() => setModoRelatorio("resumido")}
                className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all ${modoRelatorio === 'resumido' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
              >Resumido</button>
            </div>
          </div>

          <button
            onClick={async () => {
              if (!grupoSelecionado) return alert("Selecione um grupo");
              try {
                // Logic copy from original
                const formattedDate = dataRelatorio.format("YYYYMMDD");
                const response = await axios.post(`${API_BASE_URL}/api/relatorio-por-grupo`,
                  { data: formattedDate, grupo: grupoSelecionado, modo: modoRelatorio },
                  { responseType: "blob" }
                );
                const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
                const link = document.createElement("a");
                link.href = url;
                link.download = `relatorio_${grupoSelecionado}.pdf`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                setIsReportModalOpen(false);
              } catch (e) {
                console.error(e);
                alert("Erro ao gerar PDF");
              }
            }}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl mt-4 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
            <span className="flex items-center justify-center gap-2">
              <span className="material-symbols-rounded">picture_as_pdf</span> Gerar PDF
            </span>
          </button>
        </div>
      </Modal>

    </div>
  );
};

export default ConferentePage;
