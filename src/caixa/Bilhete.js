import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../utils/apiConfig";
import Swal from "sweetalert2";
import TicketImpressao from "../TicketImpressao";
import TicketImpressaoModerno from "../TicketImpressaoModerno";

const Caixa = () => {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [localFilterStatus, setLocalFilterStatus] = useState("todos"); // 'todos', 'pendente', 'impresso'
  const [username, setUsername] = useState("");
  const [local, setLocal] = useState("");
  const [ticketData, setTicketData] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printLayout, setPrintLayout] = useState("classic"); // "classic" ou "modern"
  
  // PDV States
  const [isPdvOpen, setIsPdvOpen] = useState(false);
  const [selectedPdv, setSelectedPdv] = useState(null);
  const [pdvDetails, setPdvDetails] = useState(null);
  const [isPdvLoading, setIsPdvLoading] = useState(false);
  const [valorRecebidoRaw, setValorRecebidoRaw] = useState("");
  
  // View States
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewDetails, setViewDetails] = useState(null);
  const [isViewLoading, setIsViewLoading] = useState(false);

  // Report States
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const handleOpenPdv = async (pedido) => {
    setSelectedPdv(pedido);
    setPdvDetails(null);
    setValorRecebidoRaw("");
    setIsPdvOpen(true);
    setIsPdvLoading(true);

    try {
      const response = await axios.get(`${API_BASE_URL}/api/caixa/pedido/${pedido.bilhete}/imprimir`);
      setPdvDetails(response.data);
    } catch (error) {
      console.error("Erro ao buscar detalhes do pedido para o PDV:", error);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Não foi possível carregar os detalhes do pedido.'
      });
      setIsPdvOpen(false);
    } finally {
      setIsPdvLoading(false);
    }
  };

  const handlePdvConfirm = () => {
    setIsPdvOpen(false);
    handlePrint(selectedPdv);
  };

  const handleViewPedido = async (pedido) => {
    setSelectedPdv(pedido);
    setViewDetails(null);
    setIsViewOpen(true);
    setIsViewLoading(true);

    try {
      const response = await axios.get(`${API_BASE_URL}/api/caixa/pedido/${pedido.bilhete}/imprimir`);
      setViewDetails(response.data);
    } catch (error) {
      console.error("Erro ao buscar detalhes do pedido:", error);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Não foi possível carregar os detalhes do pedido.'
      });
      setIsViewOpen(false);
    } finally {
      setIsViewLoading(false);
    }
  };
  
  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const currentLocal = sessionStorage.getItem("local") || localStorage.getItem("local") || "01";
      
      const response = await axios.get(`${API_BASE_URL}/api/caixa/relatorio-analitico`, {
        params: { 
          data: reportDate,
          local: currentLocal
        },
        responseType: 'blob',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Relatorio_Vendas_${reportDate}_${currentLocal}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setIsReportModalOpen(false);
      Swal.fire({
        icon: 'success',
        title: 'Relatório Gerado',
        text: 'O PDF foi gerado e o download deve começar em instantes.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Não foi possível gerar o relatório. Verifique se há vendas para a data selecionada.'
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };
  
  // Controle de Impressão Local (Persistent no localStorage)
  const [impressoes, setImpressoes] = useState(() => {
    const saved = localStorage.getItem("caixa_impressoes");
    return saved ? JSON.parse(saved) : {};
  });

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    localStorage.setItem("caixa_impressoes", JSON.stringify(impressoes));
  }, [impressoes]);

  useEffect(() => {
    const storedUser = sessionStorage.getItem("username") || localStorage.getItem("username");
    const storedLocal = sessionStorage.getItem("local") || localStorage.getItem("local");
    if (storedUser) setUsername(storedUser);
    if (storedLocal) setLocal(storedLocal);

    fetchPedidos();
  }, []); // Executa apenas na montagem

  useEffect(() => {
    // Auto-refresh a cada 10 segundos
    const interval = setInterval(() => {
      fetchPedidos(true, filterDate); // true para refresh silencioso
    }, 10000);

    return () => clearInterval(interval);
  }, [filterDate]);

  const fetchPedidos = async (silent = false, specificDate = filterDate) => {
    // Buscar direto da fonte para garantir que a filial (local) nunca se perca na memória
    const currentLocal = sessionStorage.getItem("local") || localStorage.getItem("local") || "01";
    
    // Converte de YYYY-MM-DD para YYYYMMDD do Protheus
    const formattedDate = specificDate ? specificDate.replace(/-/g, "") : "";
    
    if (!silent) setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/caixa/pedidos`, {
        params: { 
          local: currentLocal,
          dataFiltro: formattedDate
        }
      });
      
      setPedidos(response.data);
      if (!silent) setCurrentPage(1); 
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
      if (!silent) {
        Swal.fire({
          icon: "error",
          title: "Erro",
          text: "Não foi possível carregar os pedidos do Protheus.",
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handlePrint = async (pedido) => {
    const isAlreadyPrinted = impressoes[pedido.bilhete];

    const { isConfirmed } = await Swal.fire({
      title: isAlreadyPrinted ? "Reimprimir?" : "Imprimir?",
      text: `Deseja imprimir o bilhete ${pedido.bilhete}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sim, imprimir",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#10b981",
    });

    if (isConfirmed) {
      setIsPrinting(true);
      setPrintLayout("classic");
      try {
        const response = await axios.get(`${API_BASE_URL}/api/caixa/pedido/${pedido.bilhete}/imprimir`);
        setTicketData(response.data);

        setTimeout(() => {
          setImpressoes(prev => ({ ...prev, [pedido.bilhete]: true }));
          window.print();
          setIsPrinting(false);
        }, 500);

      } catch (error) {
        console.error("Erro ao preparar impressão:", error);
        Swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível carregar os detalhes do pedido.' });
        setIsPrinting(false);
      }
    }
  };

  const handlePrintModern = async (pedido) => {
    setIsPrinting(true);
    setPrintLayout("modern");
    try {
      const response = await axios.get(`${API_BASE_URL}/api/caixa/pedido/${pedido.bilhete}/imprimir`);
      setTicketData(response.data);

      setTimeout(() => {
        setImpressoes(prev => ({ ...prev, [pedido.bilhete]: true }));
        window.print();
        setIsPrinting(false);
      }, 500);

    } catch (error) {
      console.error("Erro ao preparar impressão moderna:", error);
      Swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível carregar os detalhes do pedido.' });
      setIsPrinting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${day}/${month}/${year}`;
  };

  const filteredPedidos = pedidos.filter((p) => {
    const matchesSearch = p.cliente.toLowerCase().includes(searchTerm.toLowerCase()) || p.bilhete.includes(searchTerm);
    const isPrinted = !!impressoes[p.bilhete];
    
    if (localFilterStatus === "pendente") return matchesSearch && !isPrinted;
    if (localFilterStatus === "impresso") return matchesSearch && isPrinted;
    return matchesSearch;
  });

  const counts = {
    todos: pedidos.length,
    pendentes: pedidos.filter(p => !impressoes[p.bilhete]).length,
    impressos: pedidos.filter(p => !!impressoes[p.bilhete]).length
  };

  // Cálculo do Total do Dia/Data Ativa
  const todayVal = new Date().toISOString().split('T')[0].replace(/-/g, "");
  const activeDateVal = filterDate ? filterDate.replace(/-/g, "") : todayVal;
  
  // Se não houver data no filtro, pegamos apenas o que é de HOJE (ignora o ontem que o Protheus traz)
  // Se houver data no filtro, somamos tudo que veio (pois o backend já filtrou)
  const totalDia = pedidos
    .filter(p => !filterDate ? p.data === todayVal : true)
    .reduce((acc, current) => acc + (current.valor || 0), 0);
    
  const activeDateLabel = filterDate 
    ? new Date(filterDate + "T12:00:00").toLocaleDateString("pt-BR", { day: '2-digit', month: 'long' })
    : "Vendas de Hoje";

  // Lógica de Paginação
  const totalPages = Math.ceil(filteredPedidos.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPedidos.slice(indexOfFirstItem, indexOfLastItem);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300 pb-20">
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0"
        rel="stylesheet"
      />

      {/* Header */}
      <header className="sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-slate-700/50 px-6 py-3 flex items-center justify-between">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate("/")}
            >
              <div className="bg-gradient-to-tr from-emerald-600 to-teal-400 h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
                <span className="material-symbols-rounded">payments</span>
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight text-slate-800 dark:text-white">
                  Caixa
                </h1>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  Operacional
                </span>
              </div>
            </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all font-bold text-sm shadow-sm"
                >
                  <span className="material-symbols-rounded text-[20px]">assessment</span>
                  <span className="hidden sm:inline">Relatório</span>
                </button>
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-bold text-slate-800 dark:text-white">
                    {username}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    Local: {local}
                  </span>
                </div>
                <button
                  onClick={() => navigate("/")}
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                >
                  <span className="material-symbols-rounded">home</span>
                </button>
              </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Resumo do Dia */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-500 rounded-3xl p-5 shadow-lg shadow-emerald-500/20 text-white relative overflow-hidden group">
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">{activeDateLabel}</span>
                <span className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums">
                  {totalDia.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <span className="material-symbols-rounded text-3xl">payments</span>
              </div>
            </div>
            {/* Efeito decorativo */}
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-700/50 flex items-center justify-between group hover:shadow-md transition-shadow">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Pedidos Totais</span>
              <span className="text-2xl font-black text-slate-800 dark:text-white tabular-nums">
                {pedidos.filter(p => !filterDate ? p.data === todayVal : true).length}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-colors">
              <span className="material-symbols-rounded text-3xl">shopping_cart</span>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col gap-4 mb-6 sm:mb-8 items-stretch justify-between">
          <div className="flex flex-col xl:flex-row items-center gap-3 w-full">
            <div className="relative flex-1 sm:max-w-md">
              <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar cliente ou bilhete..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-sm dark:text-white text-sm sm:text-base h-[50px]"
              />
            </div>

            <div className="relative w-full sm:w-48">
              <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                calendar_month
              </span>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => {
                  setFilterDate(e.target.value);
                  fetchPedidos(false, e.target.value);
                }}
                className="w-full pl-10 pr-8 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-sm text-slate-700 dark:text-white [color-scheme:light] dark:[color-scheme:dark] text-sm sm:text-base h-[50px]"
              />
              {filterDate && (
                <button 
                  onClick={() => { setFilterDate(""); fetchPedidos(false, ""); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors"
                  title="Limpar Data"
                >
                  <span className="material-symbols-rounded text-[18px]">close</span>
                </button>
              )}
            </div>
            
            <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/50 h-[50px] items-center">
              {[
                { id: 'todos', label: 'Todos', icon: 'list', count: counts.todos },
                { id: 'pendente', label: 'Pendentes', icon: 'schedule', count: counts.pendentes, color: 'text-amber-500' },
                { id: 'impresso', label: 'Impressos', icon: 'check_circle', count: counts.impressos, color: 'text-emerald-500' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setLocalFilterStatus(tab.id);
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    localFilterStatus === tab.id 
                      ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-600 dark:text-emerald-400' 
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <span className={`material-symbols-rounded text-[18px] ${localFilterStatus === tab.id ? '' : tab.color || ''}`}>
                    {tab.icon}
                  </span>
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${
                    localFilterStatus === tab.id 
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700' 
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Table Container */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[900px] lg:min-w-0">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="w-[150px] px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Bilhete</th>
                  <th className="w-[300px] px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Cliente</th>
                  <th className="w-[150px] px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Cond. Pagto</th>
                  <th className="w-[100px] px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="w-[120px] px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Valor</th>
                  <th className="w-[140px] px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="font-medium">Carregando pedidos...</span>
                      </div>
                    </td>
                  </tr>
                ) : currentItems.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                      <span className="material-symbols-rounded text-5xl mb-2 block">inventory_2</span>
                      <span className="font-medium">Nenhum pedido encontrado.</span>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((pedido) => (
                    <tr
                      key={pedido.bilhete}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            {pedido.bilhete}
                          </span>
                          <div className="flex flex-col mt-0.5">
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black tracking-wider leading-none">
                              {formatDate(pedido.data)}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold leading-tight">
                              {pedido.hora}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 truncate">
                        <div className="flex flex-col overflow-hidden">
                          <span className="font-semibold text-slate-800 dark:text-white truncate" title={pedido.cliente}>
                            {pedido.cliente}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase">
                            FILIAL: {pedido.filial}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold">
                          {pedido.condPagamento}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {impressoes[pedido.bilhete] ? (
                          <div className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-lg text-[10px] font-black w-max whitespace-nowrap mx-auto text-center shadow-sm border border-emerald-200 dark:border-emerald-800">
                            IMPRESSO
                          </div>
                        ) : (
                          <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded-lg text-[10px] font-black w-max whitespace-nowrap mx-auto text-center shadow-sm border border-amber-100 dark:border-amber-900/30">
                            PENDENTE
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {pedido.valor.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleViewPedido(pedido)}
                            className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all shadow-sm border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800/30 dark:text-emerald-400 dark:hover:bg-emerald-600 dark:hover:text-white"
                            title="Visualizar"
                          >
                            <span className="material-symbols-rounded text-xl block">visibility</span>
                          </button>
                          {/* 
                          <button
                            onClick={() => handleOpenPdv(pedido)}
                            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white transition-all shadow-sm border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/30 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white"
                            title="PDV"
                          >
                            <span className="material-symbols-rounded text-xl block">point_of_sale</span>
                          </button>
                          */}
                          <button
                            onClick={() => handlePrint(pedido)}
                            className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all shadow-sm border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800/30 dark:text-emerald-400 dark:hover:bg-emerald-600 dark:hover:text-white"
                            title="Imprimir Cupom"
                          >
                            <span className="material-symbols-rounded text-xl block">print</span>
                          </button>
                          <button
                            onClick={() => handlePrintModern(pedido)}
                            className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-500 hover:text-white transition-all shadow-sm border border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800/30 dark:text-indigo-400 dark:hover:bg-indigo-600 dark:hover:text-white"
                            title="Imprimir Cupom (Novo Layout)"
                          >
                            <span className="material-symbols-rounded text-xl block">confirmation_number</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700/50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs font-medium text-slate-500 order-2 sm:order-1">
                Página {currentPage} de {totalPages} ({filteredPedidos.length} registros)
              </span>
              <div className="flex items-center gap-2 order-1 sm:order-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="material-symbols-rounded block">chevron_left</span>
                </button>
                <div className="flex gap-1">
                  {[...Array(Math.min(currentPage > 3 ? (totalPages - currentPage >= 2 ? 5 : totalPages - (totalPages - 5)) : 5, totalPages))].map((_, i) => {
                    let pageNum;
                    const maxDisplay = 5;
                    if (totalPages <= maxDisplay) pageNum = i + 1;
                    else if (currentPage <= 3) pageNum = i + 1;
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = currentPage - 2 + i;
                    
                    if (pageNum > totalPages || pageNum < 1) return null;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                          currentPage === pageNum
                            ? 'bg-emerald-500 text-white'
                            : 'hidden xs:block hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="material-symbols-rounded block">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* PDV Modal */}
      {isPdvOpen && selectedPdv && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col h-[90vh]">
            <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <span className="material-symbols-rounded text-2xl sm:text-3xl block">point_of_sale</span>
                </div>
                <div className="flex flex-col">
                  <h3 className="font-bold text-lg sm:text-xl text-slate-800 dark:text-white leading-tight">PDV - Caixa</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-[11px] font-black tracking-widest border border-blue-200 dark:border-blue-800/50 shadow-sm">
                      {selectedPdv.bilhete}
                    </span>
                    <span className="text-[10px] text-slate-500/80 font-bold uppercase tracking-wider leading-none">PEDIDO SELECIONADO</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsPdvOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl">
                <span className="material-symbols-rounded block">close</span>
              </button>
            </div>
            
            <div className="flex-1 px-4 sm:px-6 py-4 flex flex-col min-h-0 overflow-hidden">
              {isPdvLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <span className="font-bold uppercase text-[10px] tracking-widest text-center">Carregando detalhes do pedido...</span>
                </div>
              ) : pdvDetails ? (
                <>
                  {/* Cabeçalho Resumido */}
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                      <div className="overflow-hidden">
                        <span className="block text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 sm:mb-1">Cliente</span>
                        <span className="font-bold text-slate-800 dark:text-white uppercase truncate block text-xs sm:text-sm">{pdvDetails.header.cliente_nome}</span>
                      </div>
                      <div className="overflow-hidden">
                        <span className="block text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 sm:mb-1">Vendedor</span>
                        <span className="font-bold text-slate-800 dark:text-white uppercase truncate block text-xs sm:text-sm">{pdvDetails.header.vend_nome || "-"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Lista de Itens */}
                  <div className="flex flex-col flex-1 min-h-0">
                    <div className="flex-1 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900/20">
                      <table className="w-full text-left text-sm relative border-collapse">
                        <thead className="bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="px-3 sm:px-4 py-2 font-bold text-slate-500 text-[9px] sm:text-[10px] uppercase w-[20%]">Cod</th>
                            <th className="px-3 sm:px-4 py-2 font-bold text-slate-500 text-[9px] sm:text-[10px] uppercase">Produto</th>
                            <th className="px-3 sm:px-4 py-2 font-bold text-slate-500 text-[9px] sm:text-[10px] uppercase text-center w-[15%]">Qt / UM</th>
                            <th className="px-3 sm:px-4 py-2 font-bold text-slate-500 text-[9px] sm:text-[10px] uppercase text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                          {pdvDetails.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="px-3 sm:px-4 py-2.5 font-mono text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-tighter">{item.codigo}</td>
                              <td className="px-3 sm:px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-200 text-[11px] sm:text-xs leading-tight">
                                <div className="truncate max-w-[120px] sm:max-w-[220px]" title={item.descricao}>{item.descricao}</div>
                              </td>
                              <td className="px-3 sm:px-4 py-2.5 font-bold text-center text-slate-600 dark:text-slate-400 text-[11px] sm:text-xs">
                                <div className="flex items-center justify-center gap-1">
                                  <span>{item.quant}</span>
                                  <span className="text-[9px] opacity-60 font-black">{item.um}</span>
                                </div>
                              </td>
                              <td className="px-3 sm:px-4 py-2.5 font-bold text-right text-emerald-600 dark:text-emerald-400 text-[11px] sm:text-xs tabular-nums">
                                {item.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Faturamento Rápido */}
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-3 shrink-0">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] sm:text-xs tracking-widest">Total do Pedido</span>
                      <span className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white tracking-tighter tabular-nums">
                        {selectedPdv.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                    
                    <div className="space-y-2 sm:space-y-3 px-1">
                      <label className="block text-[10px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1">
                        <span className="material-symbols-rounded text-[14px]">payments</span> Dinheiro Recebido
                      </label>
                      <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-base sm:text-lg transition-colors group-focus-within:text-blue-500">R$</span>
                        <input 
                          type="number" 
                          step="0.01"
                          min="0"
                          value={valorRecebidoRaw}
                          onChange={(e) => setValorRecebidoRaw(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-xl sm:text-2xl font-bold font-mono transition-all shadow-inner h-[50px]"
                          placeholder="0,00"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className={`flex justify-between items-center p-3 sm:p-4 rounded-2xl border-2 transition-all duration-300 ${
                        parseFloat(valorRecebidoRaw) >= selectedPdv.valor
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-xl shadow-emerald-500/10' 
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400'
                      }`}>
                      <span className="font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center gap-2">
                        <span className="material-symbols-rounded">price_change</span> Troco
                      </span>
                      <span className="text-xl sm:text-2xl font-black font-mono tracking-tighter tabular-nums text-right">
                        {(() => {
                          const recebido = parseFloat(valorRecebidoRaw) || 0;
                          const troco = recebido - selectedPdv.valor;
                          if (troco <= 0 || recebido === 0) return "R$ 0,00";
                          return troco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                        })()}
                      </span>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <div className="px-5 sm:px-6 py-4 sm:py-5 bg-slate-50/80 dark:bg-slate-900/60 backdrop-blur-sm flex gap-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button 
                onClick={() => setIsPdvOpen(false)}
                className="flex-1 py-3 sm:py-4 rounded-xl font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors uppercase tracking-wider text-[11px] sm:text-sm shadow-sm"
              >
                Sair
              </button>
              <button 
                onClick={handlePdvConfirm}
                className="flex-[2] py-3 sm:py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 active:scale-95 transition flex items-center justify-center gap-2 uppercase tracking-wider text-[11px] sm:text-sm focus:ring-4 focus:ring-blue-500/30 outline-none"
              >
                <span className="material-symbols-rounded font-bold text-lg sm:text-xl">print</span>
                <span>Finalizar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização */}
      {isViewOpen && selectedPdv && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col h-[90vh]">
            <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <span className="material-symbols-rounded text-2xl sm:text-3xl block">description</span>
                </div>
                <div className="flex flex-col">
                  <h3 className="font-bold text-lg sm:text-xl text-slate-800 dark:text-white leading-tight">Visualizar Pedido</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-[11px] font-black tracking-widest border border-emerald-200 dark:border-emerald-800/50 shadow-sm">
                      {selectedPdv.bilhete}
                    </span>
                    <span className="text-[10px] text-slate-500/80 font-bold uppercase tracking-wider leading-none">REGISTRO PROTHEUS</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsViewOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl">
                <span className="material-symbols-rounded block">close</span>
              </button>
            </div>
            
            <div className="flex-1 px-4 sm:px-6 py-4 flex flex-col min-h-0 overflow-hidden">
              {isViewLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <span className="font-bold uppercase text-[10px] tracking-widest text-center">Buscando detalhes no Protheus...</span>
                </div>
              ) : viewDetails ? (
                <>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cliente</span>
                        <span className="font-bold text-slate-800 dark:text-white block uppercase truncate">{viewDetails.header.cliente_nome}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Vendedor</span>
                        <span className="font-bold text-slate-800 dark:text-white block uppercase truncate">{viewDetails.header.vend_nome || "-"}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pagamento</span>
                        <span className="font-bold text-slate-800 dark:text-white block uppercase truncate">{viewDetails.header.desc_cond || viewDetails.header.condicao}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900/20">
                    <table className="w-full text-left text-sm relative border-collapse">
                      <thead className="bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase w-[20%]">Código</th>
                          <th className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase">Produto</th>
                          <th className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase text-center">Qt / UM</th>
                          <th className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase text-right">Unitário</th>
                          <th className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {viewDetails.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-3 font-mono text-[11px] font-bold text-slate-400">{item.codigo}</td>
                            <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 text-xs">{item.descricao}</td>
                            <td className="px-4 py-3 font-bold text-center text-slate-600 dark:text-slate-400 text-xs text-center">
                              <div className="flex items-center justify-center gap-1">
                                <span>{item.quant}</span>
                                <span className="text-[10px] font-black opacity-60 tracking-tighter">{item.um}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-medium text-right text-slate-500 text-xs tabular-nums">
                              {(item.unitario || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </td>
                            <td className="px-4 py-3 font-bold text-right text-emerald-600 dark:text-emerald-400 text-xs tabular-nums">
                              {(item.total || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 p-4 bg-slate-900 rounded-2xl flex items-center justify-between shrink-0 shadow-xl shadow-slate-900/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                        <span className="material-symbols-rounded">shopping_bag</span>
                      </div>
                      <span className="text-white font-bold uppercase text-[10px] tracking-widest">Total Líquido</span>
                    </div>
                    <span className="text-2xl sm:text-3xl font-black text-white tracking-tighter tabular-nums">
                      {(selectedPdv?.valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                </>
              ) : null}
            </div>

            <div className="px-5 sm:px-6 py-4 sm:py-5 bg-slate-50/80 dark:bg-slate-900/60 backdrop-blur-sm flex gap-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button 
                onClick={() => setIsViewOpen(false)}
                className="flex-1 py-3 sm:py-4 rounded-xl font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors uppercase tracking-wider text-[11px] sm:text-sm"
              >
                Fechar
              </button>
              <button 
                onClick={() => { setIsViewOpen(false); handleOpenPdv(selectedPdv); }}
                className="flex-[2] py-3 sm:py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 active:scale-95 transition flex items-center justify-center gap-2 uppercase tracking-wider text-[11px] sm:text-sm"
              >
                <span className="material-symbols-rounded font-bold text-lg sm:text-xl">payments</span>
                <span>Faturar este Pedido</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Invisível na tela, visível na impressão */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Esconder completamente os elementos da tela */
          header, main, footer, button, .fixed, [class*="fixed"], [class*="absolute"], nav { 
            display: none !important; 
            opacity: 0 !important;
            visibility: hidden !important;
          }
          
          /* Forçar esquema de luz e fundo branco total */
          html, body { 
            background: white !important; 
            background-color: white !important;
            color: black !important;
            overflow: visible !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            color-scheme: light !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          @page { 
            margin: 0; 
            size: A4 portrait; 
          }

          /* Reset de sombras e fundos que podem vazar do app */
          * { 
            box-shadow: none !important;
            text-shadow: none !important;
          }

          /* O Ticket ficará visível */
          #printable-ticket, #printable-ticket-moderno { 
            display: block !important; 
            position: static !important; 
            width: 100% !important;
            background: white !important;
            background-color: white !important;
            padding: 90mm 0 10mm 0 !important;
            margin-top: 10mm !important;
          }

          /* Garantir que não apareçam scrollbars no papel */
          ::-webkit-scrollbar { display: none !important; }
        }
      `}} />
      {printLayout === "classic" && <TicketImpressao data={ticketData} />}
      {printLayout === "modern" && <TicketImpressaoModerno data={ticketData} />}

      {/* Modal de Relatório */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20 dark:border-slate-700">
            <div className="p-8 pb-4 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-6 rotate-3">
                <span className="material-symbols-rounded text-4xl">analytics</span>
              </div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Relatório de Vendas</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium px-4">
                Selecione a data para gerar o relatório analítico detalhado do dia.
              </p>
            </div>

            <div className="p-8 pt-2">
              <div className="space-y-6">
                <div className="relative group">
                  <label className="block text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2 ml-1">Data do Relatório</label>
                  <div className="relative">
                    <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors">calendar_month</span>
                    <input
                      type="date"
                      value={reportDate}
                      onChange={(e) => setReportDate(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-lg font-bold text-slate-700 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setIsReportModalOpen(false)}
                    className="flex-1 py-4 px-6 rounded-2xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all uppercase tracking-widest text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGenerateReport}
                    disabled={isGeneratingReport}
                    className="flex-[1.5] py-4 px-6 rounded-2xl font-black text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isGeneratingReport ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Gerando...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-rounded text-lg">download</span>
                        <span>Gerar PDF</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50/50 dark:bg-slate-900/30 px-8 py-4 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Relatório Analítico Consolidado - Sistema FF</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Caixa;
