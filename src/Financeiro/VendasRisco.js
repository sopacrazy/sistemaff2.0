import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { CircularProgress, Tooltip } from "@mui/material";
import Swal from "sweetalert2";
import { API_BASE_URL } from "../utils/apiConfig";
import * as XLSX from "xlsx";
import AppHeader from "../components/AppHeader";

// Format helper functions
const formatarDataProtheus = (dataStr) => {
  if (!dataStr || dataStr.length !== 8) return dataStr || "Data inválida";
  const ano = dataStr.substring(0, 4);
  const mes = dataStr.substring(4, 6);
  const dia = dataStr.substring(6, 8);
  return `${dia}/${mes}/${ano}`;
};

const formatarParaISO = (dataStr) => {
  if (!dataStr || dataStr.length !== 8) return "";
  const ano = dataStr.substring(0, 4);
  const mes = dataStr.substring(4, 6);
  const dia = dataStr.substring(6, 8);
  return `${ano}-${mes}-${dia}`;
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const calcularDiasAtraso = (dataVencProtheus) => {
  if (!dataVencProtheus || dataVencProtheus.length !== 8) return 0;
  const ano = parseInt(dataVencProtheus.substring(0, 4), 10);
  const mes = parseInt(dataVencProtheus.substring(4, 6), 10) - 1;
  const dia = parseInt(dataVencProtheus.substring(6, 8), 10);
  
  const dataVenc = new Date(ano, mes, dia);
  const hoje = new Date();
  
  dataVenc.setHours(0, 0, 0, 0);
  hoje.setHours(0, 0, 0, 0);
  
  const diffTime = hoje.getTime() - dataVenc.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

const obterDataHoje = () => {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
};

const VendasRisco = () => {
  const navigate = useNavigate();
  
  // State
  const [empresa, setEmpresa] = useState(() => localStorage.getItem("financeiro_empresa") || "140");
  const [dataDe, setDataDe] = useState(obterDataHoje());
  const [dataAte, setDataAte] = useState(obterDataHoje());
  const [search, setSearch] = useState("");
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState({}); // { [saleDoc]: boolean }
  const [page, setPage] = useState(1);
  const rowsPerPage = 20;
  
  // Expansion Details State
  const [details, setDetails] = useState({}); // { [saleDoc]: { loading: boolean, items: [], titles: [] } }

  // Effects
  useEffect(() => {
    localStorage.setItem("financeiro_empresa", empresa);
    fetchSales();
  }, [empresa, dataDe, dataAte]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [empresa, dataDe, dataAte, search]);

  // Fetch Sales
  const fetchSales = () => {
    setLoading(true);
    setExpandedRows({});
    setDetails({});
    
    axios
      .get(`${API_BASE_URL}/api/vendas-report/vendas-risco`, {
        params: {
          empresa,
          dataDe,
          dataAte,
        },
      })
      .then((res) => {
        setSales(res.data || []);
      })
      .catch((err) => {
        console.error("Erro ao buscar vendas de risco:", err);
        Swal.fire({
          icon: "error",
          title: "Erro",
          text: "Erro ao buscar vendas de risco.",
          confirmButtonColor: "#EF4444",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Fetch details (items and overdue titles) for a expanded row
  const fetchRowDetails = async (sale) => {
    const saleDoc = sale.doc;
    const clientCod = sale.cliente_cod;

    setDetails((prev) => ({
      ...prev,
      [saleDoc]: { loading: true, items: [], titles: [] },
    }));

    try {
      const [resItems, resTitles] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/vendas-report/bilhete/${saleDoc}/itens`),
        axios.get(`${API_BASE_URL}/api/vendas-report/cliente/${clientCod}/titulos-atrasados`, {
          params: { empresa },
        }),
      ]);

      setDetails((prev) => ({
        ...prev,
        [saleDoc]: {
          loading: false,
          items: resItems.data || [],
          titles: resTitles.data || [],
        },
      }));
    } catch (err) {
      console.error(`Erro ao buscar detalhes da venda ${saleDoc}:`, err);
      setDetails((prev) => ({
        ...prev,
        [saleDoc]: { loading: false, items: [], titles: [], error: true },
      }));
    }
  };

  // Toggle Row Expand
  const handleToggleRow = (sale) => {
    const isExpanded = !!expandedRows[sale.doc];
    setExpandedRows((prev) => ({ ...prev, [sale.doc]: !isExpanded }));

    if (!isExpanded && !details[sale.doc]) {
      fetchRowDetails(sale);
    }
  };

  // WhatsApp Alert Sender
  const enviarWhatsAppCobrança = (cliente, numTitulo, valor, vencimento, notaFiscal) => {
    const clienteTrim = String(cliente || "").trim();
    const tituloTrim = String(numTitulo || "").trim();
    const notaTrim = String(notaFiscal || "").trim();
    const dataVenc = formatarDataProtheus(vencimento);

    let identificacaoTitulo = `*Título nº ${tituloTrim}*`;
    if (notaTrim && notaTrim !== "-") {
      identificacaoTitulo += ` (NF: *${notaTrim}*)`;
    }

    const mensagem = `Olá, *${clienteTrim}*,\n\nEstamos lembrando sobre o pagamento do título abaixo:\n\n${identificacaoTitulo}: *${formatCurrency(valor)}*, vencido em *${dataVenc}*.\n\nPedimos que regularize a pendência o quanto antes. Caso já tenha efetuado o pagamento, favor desconsiderar.\n`;
    const url = `https://web.whatsapp.com/send?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");
  };

  // Filters local logic
  const filteredSales = sales.filter((sale) => {
    const query = search.toLowerCase();
    return (
      sale.doc.toLowerCase().includes(query) ||
      sale.cliente_nome.toLowerCase().includes(query) ||
      sale.cliente_cod.toLowerCase().includes(query) ||
      sale.vendedor_nome.toLowerCase().includes(query) ||
      sale.vendedor_cod.toLowerCase().includes(query)
    );
  });

  // KPI calculations
  const totalValue = filteredSales.reduce((acc, sale) => acc + sale.valor, 0);
  const countSales = filteredSales.length;
  const uniqueClients = new Set(filteredSales.map((sale) => sale.cliente_cod)).size;
  const avgSale = countSales > 0 ? totalValue / countSales : 0;

  // Pagination slicing
  const totalPages = Math.ceil(filteredSales.length / rowsPerPage);
  const paginatedSales = filteredSales.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredSales.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "Não há dados para exportar.",
        confirmButtonColor: "#EF4444",
      });
      return;
    }

    const dataToExport = filteredSales.map((sale) => {
      const isArrears =
        sale.data_vencimento_mais_antigo &&
        sale.data_vencimento_mais_antigo < sale.emissao;
      return {
        "Documento/Bilhete": sale.doc,
        "Data da Venda": formatarDataProtheus(sale.emissao),
        "Código Cliente": sale.cliente_cod,
        "Nome Cliente": sale.cliente_nome,
        Risco: sale.risco,
        "Valor da Venda": sale.valor,
        "Qtd Títulos em Atraso": sale.total_atrasados,
        "Saldo em Atraso": sale.saldo_atrasado,
        "Vencimento Mais Antigo": formatarDataProtheus(sale.data_vencimento_mais_antigo),
        "Vendedor": `${sale.vendedor_cod} - ${sale.vendedor_nome}`,
        "Vendido em Atraso?": isArrears ? "Sim" : "Não",
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendas de Risco D");
    XLSX.writeFile(wb, `Vendas_Risco_D_${empresa}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans pb-20 transition-colors duration-300">
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0"
        rel="stylesheet"
      />

      <AppHeader
        title="Vendas de Risco D"
        subtitle="Controle de Inadimplência"
        icon="gavel"
        iconGradient="from-red-500 to-rose-400"
        iconShadow="shadow-red-500/20"
        onBack="/financeiro/contas-receber"
      />

      <main className="max-w-[95%] mx-auto px-4 md:px-6 py-8">
        {/* --- FILTERS SECTION --- */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700 mb-8 transition-colors">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            
            {/* Empresa */}
            <div className="col-span-1 md:col-span-2 flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1 font-bold">
                Empresa
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-400 dark:text-slate-500 material-symbols-rounded pointer-events-none text-xl">
                  corporate_fare
                </span>
                <select
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-red-500 outline-none transition-all cursor-pointer appearance-none shadow-sm"
                >
                  <option value="140">Fort Fruit</option>
                  <option value="240">Bem pra gente</option>
                </select>
                <span className="absolute right-2.5 text-slate-400 pointer-events-none material-symbols-rounded">
                  unfold_more
                </span>
              </div>
            </div>

            {/* Período De */}
            <div className="col-span-1 md:col-span-2 flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1 font-bold">
                Período De
              </label>
              <input
                type="date"
                value={dataDe}
                onChange={(e) => setDataDe(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-red-500 text-slate-700 dark:text-slate-200"
              />
            </div>

            {/* Período Até */}
            <div className="col-span-1 md:col-span-2 flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1 font-bold">
                Período Até
              </label>
              <input
                type="date"
                value={dataAte}
                onChange={(e) => setDataAte(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-red-500 text-slate-700 dark:text-slate-200"
              />
            </div>

            {/* Buscar */}
            <div className="col-span-1 md:col-span-4 flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1 font-bold">
                Buscar Cliente / Vendedor / Bilhete
              </label>
              <div className="relative w-full">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-rounded text-xl">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Nome, código, bilhete..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-red-500 outline-none transition-all text-slate-700 dark:text-slate-200 text-sm font-medium"
                />
              </div>
            </div>

            {/* Export e Ações */}
            <div className="col-span-1 md:col-span-2">
              <button
                onClick={handleExportExcel}
                disabled={loading || filteredSales.length === 0}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md ${
                  filteredSales.length === 0
                    ? "bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-600"
                    : "bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900"
                }`}
              >
                <span className="material-symbols-rounded text-lg">download</span>
                Excel
              </button>
            </div>

          </div>
        </div>

        {/* --- SUMMARY CARDS --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          {/* Card 1: Total Financeiro */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-rounded text-3xl">monetization_on</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Valor Total Vendido
              </p>
              <h3 className="text-xl font-black mt-1 text-slate-800 dark:text-slate-100">
                {formatCurrency(totalValue)}
              </h3>
            </div>
          </div>

          {/* Card 2: Qtd Vendas */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-rounded text-3xl">shopping_cart</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Quantidade Vendas
              </p>
              <h3 className="text-xl font-black mt-1 text-slate-800 dark:text-slate-100">
                {countSales} <span className="text-xs font-bold text-slate-400">REGISTROS</span>
              </h3>
            </div>
          </div>

          {/* Card 3: Clientes Afetados */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-rounded text-3xl">group</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Clientes Afetados
              </p>
              <h3 className="text-xl font-black mt-1 text-slate-800 dark:text-slate-100">
                {uniqueClients} <span className="text-xs font-bold text-slate-400">RISCO D</span>
              </h3>
            </div>
          </div>

          {/* Card 4: Média por Venda */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-rounded text-3xl">analytics</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Média por Venda
              </p>
              <h3 className="text-xl font-black mt-1 text-slate-800 dark:text-slate-100">
                {formatCurrency(avgSale)}
              </h3>
            </div>
          </div>

        </div>

        {/* --- MAIN TABLE AREA --- */}
        <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {loading && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/60 dark:bg-slate-800/60 backdrop-blur-[2px] transition-all duration-300">
              <CircularProgress color="error" size={48} />
              <p className="mt-4 text-red-600 dark:text-red-400 font-bold animate-pulse">
                Buscando auditoria de vendas...
              </p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="w-12 px-4 py-4"></th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Data Venda
                  </th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Doc/Bilhete
                  </th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">
                    Risco
                  </th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">
                    Títulos Atrasados
                  </th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">
                    Mais Atrasado (Dias)
                  </th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">
                    Saldo Devedor
                  </th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">
                    Valor Venda
                  </th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Vendedor
                  </th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">
                    Status Alerta
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="px-6 py-16 text-center text-slate-500 dark:text-slate-400 font-medium">
                      Nenhuma venda de risco encontrada para os critérios selecionados.
                    </td>
                  </tr>
                ) : (
                  paginatedSales.map((sale) => {
                    const isExpanded = !!expandedRows[sale.doc];
                    const rowDetail = details[sale.doc] || { loading: false, items: [], titles: [] };
                    const isArrears =
                      sale.data_vencimento_mais_antigo &&
                      sale.data_vencimento_mais_antigo < sale.emissao;

                    return (
                      <React.Fragment key={sale.doc}>
                        {/* Table Row */}
                        <tr
                          onClick={() => handleToggleRow(sale)}
                          className={`cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-700/30 ${
                            isExpanded ? "bg-slate-50 dark:bg-slate-700/20" : ""
                          }`}
                        >
                          <td className="px-4 py-4 text-center">
                            <span
                              className={`material-symbols-rounded text-slate-400 transition-transform text-xl ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            >
                              keyboard_arrow_down
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm font-bold text-slate-500">
                            {formatarDataProtheus(sale.emissao)}
                          </td>
                          <td className="px-4 py-4 text-base font-black text-red-600 dark:text-red-400 font-mono">
                            {sale.doc}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-700 dark:text-slate-200">
                                {sale.cliente_nome}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                CÓD: {sale.cliente_cod}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="inline-block px-2.5 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 font-black text-xs">
                              {sale.risco}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400 font-bold text-xs">
                              {sale.total_atrasados}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-xs font-bold text-red-600 dark:text-red-400 font-mono">
                                {formatarDataProtheus(sale.data_vencimento_mais_antigo)}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold">
                                ({calcularDiasAtraso(sale.data_vencimento_mais_antigo)} dias)
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                              {formatCurrency(sale.saldo_atrasado)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="font-black text-slate-800 dark:text-slate-100 text-base">
                              {formatCurrency(sale.valor)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                {sale.vendedor_nome}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                CÓD: {sale.vendedor_cod}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            {isArrears ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-[11px] border border-red-500/20">
                                <span className="material-symbols-rounded text-base">error</span>
                                Vendido em Atraso
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[11px] border border-blue-500/20">
                                <span className="material-symbols-rounded text-base">info</span>
                                Liberado
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <tr className="bg-slate-50/50 dark:bg-slate-900/10">
                            <td colSpan="11" className="p-0">
                              <div className="p-6 pl-12 border-t border-slate-100 dark:border-slate-700/50 shadow-inner">
                                {rowDetail.loading ? (
                                  <div className="flex items-center justify-center py-10 gap-3">
                                    <CircularProgress size={24} color="error" />
                                    <p className="text-sm text-slate-400 font-medium animate-pulse">
                                      Carregando itens e pendências do cliente...
                                    </p>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                    
                                    {/* Left: sold items */}
                                    <div className="flex flex-col">
                                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <span className="material-symbols-rounded text-base text-red-500">
                                          receipt_long
                                        </span>
                                        Itens deste Bilhete ({rowDetail.items.length})
                                      </h4>
                                      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                                        <table className="w-full text-left text-xs">
                                          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold uppercase text-[9px] border-b border-slate-100 dark:border-slate-700">
                                            <tr>
                                              <th className="px-4 py-3">Produto</th>
                                              <th className="px-4 py-3 text-center">Quantidade</th>
                                              <th className="px-4 py-3 text-right">Vl. Unitário</th>
                                              <th className="px-4 py-3 text-right">Total</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                            {rowDetail.items.length === 0 ? (
                                              <tr>
                                                <td colSpan="4" className="px-4 py-6 text-center text-slate-400 font-medium">
                                                  Nenhum item encontrado.
                                                </td>
                                              </tr>
                                            ) : (
                                              rowDetail.items.map((item, i) => (
                                                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                                  <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                      <span className="font-bold text-slate-700 dark:text-slate-300">
                                                        {item.descri}
                                                      </span>
                                                      <span className="text-[9px] text-slate-400 font-mono">
                                                        CÓD: {item.cod}
                                                      </span>
                                                    </div>
                                                  </td>
                                                  <td className="px-4 py-3 text-center font-bold text-slate-800 dark:text-slate-200">
                                                    {item.quant} <span className="text-[9px] opacity-60 font-normal">{item.um}</span>
                                                  </td>
                                                  <td className="px-4 py-3 text-right text-slate-500">
                                                    {formatCurrency(item.vunit)}
                                                  </td>
                                                  <td className="px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-300">
                                                    {formatCurrency(item.total)}
                                                  </td>
                                                </tr>
                                              ))
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>

                                    {/* Right: overdue titles */}
                                    <div className="flex flex-col">
                                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <span className="material-symbols-rounded text-base text-amber-500">
                                          assignment_late
                                        </span>
                                        Títulos em Atraso Ativos ({rowDetail.titles.length})
                                      </h4>
                                      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                                        <table className="w-full text-left text-xs">
                                          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold uppercase text-[9px] border-b border-slate-100 dark:border-slate-700">
                                            <tr>
                                              <th className="px-4 py-3">Título/Nota</th>
                                              <th className="px-4 py-3 text-center">Vencimento</th>
                                              <th className="px-4 py-3 text-center">Tipo</th>
                                              <th className="px-4 py-3 text-right">Saldo Devedor</th>
                                              <th className="px-4 py-3 text-center">Ações</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                            {rowDetail.titles.length === 0 ? (
                                              <tr>
                                                <td colSpan="5" className="px-4 py-6 text-center text-slate-400 font-medium">
                                                  Nenhum título vencido em aberto.
                                                </td>
                                              </tr>
                                            ) : (
                                              rowDetail.titles.map((title, i) => {
                                                const isTitleBeforeSale = title.vencimento < sale.emissao;
                                                return (
                                                  <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                                    <td className="px-4 py-3">
                                                      <div className="flex flex-col">
                                                        <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                                                          {title.num}
                                                        </span>
                                                        <span className="text-[9px] text-slate-400 font-mono">
                                                          NOTA: {title.nota || "-"}
                                                        </span>
                                                      </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-bold text-slate-600 dark:text-slate-300">
                                                      <div className="flex flex-col items-center">
                                                        <span>{formatarDataProtheus(title.vencimento)}</span>
                                                        {isTitleBeforeSale && (
                                                          <span className="text-[8px] bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 px-1 rounded font-bold uppercase mt-0.5">
                                                            Vencido antes da venda
                                                          </span>
                                                        )}
                                                      </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-100 dark:bg-slate-700 font-bold">
                                                        {title.prefixo} {title.tipo}
                                                      </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400">
                                                      {formatCurrency(title.saldo)}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                      <button
                                                        onClick={() =>
                                                          enviarWhatsAppCobrança(
                                                            sale.cliente_nome,
                                                            title.num,
                                                            title.saldo,
                                                            title.vencimento,
                                                            title.nota
                                                          )
                                                        }
                                                        className="p-1.5 rounded-full text-green-500 hover:bg-green-50 hover:scale-110 dark:hover:bg-green-950/30 transition-all flex items-center justify-center mx-auto shadow-sm border border-green-100 dark:border-green-900"
                                                        title="Enviar Cobrança WhatsApp"
                                                      >
                                                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                                        </svg>
                                                      </button>
                                                    </td>
                                                  </tr>
                                                );
                                              })
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>

                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm text-slate-500">
            <span>Página {page} de {totalPages || 1}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VendasRisco;
