import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { API_BASE_URL } from '../utils/apiConfig';

const ContasPagarList = () => {
    const navigate = useNavigate();
    const [originalData, setOriginalData] = useState([]);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const rowsPerPage = 50;
    const [username, setUsername] = useState("");
    const [loading, setLoading] = useState(true);
    const [showVencendoHoje, setShowVencendoHoje] = useState(false);

    // Novos Filtros
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [statusFilter, setStatusFilter] = useState("TODOS");

    // Resumo de anexos
    const [anexosResumo, setAnexosResumo] = useState([]);

    // Modal Anexos
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTitulo, setSelectedTitulo] = useState(null);
    const [anexos, setAnexos] = useState([]);
    const [tipoAnexo, setTipoAnexo] = useState("NF");
    const [uploading, setUploading] = useState(false);
    
    // Preview
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
        const u = localStorage.getItem("username");
        if (u) setUsername(u);
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [response, resumo] = await Promise.all([
                axios.get(`${API_BASE_URL}/contas-pagar`),
                axios.get(`${API_BASE_URL}/contas-pagar/anexos-resumo`)
            ]);
            setOriginalData(response.data || []);
            setAnexosResumo(resumo.data || []);
        } catch (error) {
            console.error("Erro ao buscar dados:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleDarkMode = () => document.documentElement.classList.toggle("dark");
    const handleLogout = () => { localStorage.clear(); navigate("/login"); };

    const formatarDataBrasileira = (data) => {
        if (!data || data.length !== 8) return data;
        const ano = data.substring(0, 4);
        const mes = data.substring(4, 6);
        const dia = data.substring(6, 8);
        return `${dia}/${mes}/${ano}`;
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
    };

    // Reset All Filters
    const resetFilters = () => {
        setSearch("");
        setStartDate("");
        setEndDate("");
        setStatusFilter("TODOS");
        setShowVencendoHoje(false);
        setPage(1);
    };

    // Filter logic
    const filteredData = originalData.filter(item => {
        const searchLower = search.toLowerCase();
        const hojeYMD = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        
        // 1. Filtro de Pesquisa Texto
        const matchesSearch = (
            (item.E2_NOMFOR || "").toLowerCase().includes(searchLower) ||
            (item.E2_NUM || "").toLowerCase().includes(searchLower) ||
            (item.E2_FORNECE || "").toLowerCase().includes(searchLower)
        );
        if (!matchesSearch) return false;

        // 2. Filtro de "Vencendo Hoje" (Prioridade se ativo)
        if (showVencendoHoje) {
            if (item.E2_VENCTO !== hojeYMD || parseFloat(item.E2_SALDO) === 0) return false;
        }

        // 3. Filtro de Status
        if (statusFilter !== "TODOS") {
            const saldo = parseFloat(item.E2_SALDO || 0);
            const vencimento = item.E2_VENCTO;

            if (statusFilter === "VENCIDOS") {
                if (!(vencimento < hojeYMD && saldo > 0)) return false;
            } else if (statusFilter === "PAGOS") {
                if (saldo !== 0) return false;
            } else if (statusFilter === "A_VENCER") {
                if (!(vencimento >= hojeYMD && saldo > 0)) return false;
            }
        }

        // 4. Filtro de Período de Data
        if (startDate || endDate) {
            const vencimento = item.E2_VENCTO; // YYYYMMDD
            if (startDate) {
                const startYMD = startDate.replace(/-/g, "");
                if (vencimento < startYMD) return false;
            }
            if (endDate) {
                const endYMD = endDate.replace(/-/g, "");
                if (vencimento > endYMD) return false;
            }
        }

        return true;
    });

    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const paginatedData = filteredData.slice((page - 1) * rowsPerPage, page * rowsPerPage);

    // --- LOGICA DE ANEXOS ---
    const getResumo = (item) => {
        const itemNum = item.E2_NUM?.trim();
        const itemParc = item.E2_PARCELA?.trim();
        const itemFornece = item.E2_FORNECE?.trim();

        return anexosResumo.find(r => 
            r.titulo_num?.trim() === itemNum && 
            r.parcela?.trim() === itemParc && 
            r.fornecedor?.trim() === itemFornece
        );
    };

    const openAnexosModal = async (item) => {
        setSelectedTitulo(item);
        setPreviewUrl(null);
        setIsModalOpen(true);
        loadAnexos(item);
    };

    const handleGenerateReport = async () => {
        const doc = new jsPDF('l', 'mm', 'a4');
        const hoje = new Date().toLocaleString('pt-BR');

        try {
            // Helper para carregar a logo (Baseado no path do public)
            const loadImage = (url) => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.onerror = () => resolve(null);
                    img.src = url;
                });
            };

            const logo = await loadImage('/logo_fortfruit.png');
            if (logo) {
                // Logo à direita
                doc.addImage(logo, 'PNG', 242, 10, 40, 15);
            }
        } catch (err) {
            console.error("Erro ao carregar logo:", err);
        }

        // --- CABEÇALHO DESIGNER ---
        doc.setFontSize(18); // Menor como solicitado
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text("CONTAS A PAGAR", 14, 20); // Nome menor

        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(14, 28, 282, 28); // Linha divisória top

        // Informações de Geração (Esquerda)
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(`SISTEMAFF | GESTÃO FINANCEIRA`, 14, 33);
        doc.text(`DATA DE EMISSÃO: ${hoje}`, 14, 37);

        // Resumo (Direita, abaixo da logo)
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        const totalValue = filteredData.reduce((acc, current) => acc + (parseFloat(current.E2_VALOR) || 0), 0);
        doc.text(`RESUMO: ${formatCurrency(totalValue)}`, 282, 35, { align: 'right' });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`${filteredData.length} TÍTULOS ENCONTRADOS`, 282, 39, { align: 'right' });

        // Critérios de Filtro
        let filterText = "CRITÉRIOS DE BUSCA: ";
        if (search) filterText += `PESQUISA: "${search.toUpperCase()}" | `;
        if (statusFilter !== "TODOS") filterText += `STATUS: ${statusFilter} | `;
        if (startDate || endDate) filterText += `VENCIMENTO: ${startDate || '?'} A ${endDate || '?'} | `;
        if (showVencendoHoje) filterText += `FILTRO: VENCENDO HOJE | `;
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(filterText, 14, 43);

        const tableData = filteredData.map(item => [
            parseFloat(item.E2_SALDO) === 0 ? "PAGO" : "ABERTO",
            item.E2_NUM,
            item.E2_PARCELA || "-",
            item.E2_NOMFOR.substring(0, 50),
            item.E2_NATUREZ,
            formatarDataBrasileira(item.E2_EMISSAO),
            formatarDataBrasileira(item.E2_VENCTO),
            formatCurrency(parseFloat(item.E2_VALOR))
        ]);

        doc.autoTable({
            startY: 47,
            head: [['STATUS', 'Nº TÍTULO', 'PARC', 'FORNECEDOR', 'NATUREZA', 'EMISSÃO', 'VENCIMENTO', 'VALOR BRUTO']],
            body: tableData,
            theme: 'striped',
            headStyles: { 
                fillColor: [30, 41, 59], // Slate 800 para contraste sóbrio
                textColor: [255, 255, 255],
                fontSize: 8,
                fontStyle: 'bold',
                halign: 'center'
            },
            styles: { 
                fontSize: 7.5,
                cellPadding: 2.5,
                valign: 'middle'
            },
            columnStyles: {
                0: { halign: 'center', fontStyle: 'bold' },
                1: { halign: 'center' },
                2: { halign: 'center' },
                3: { cellWidth: 80 },
                4: { halign: 'center' },
                5: { halign: 'center' },
                6: { halign: 'center' },
                7: { halign: 'right', fontStyle: 'bold' }
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { bottom: 20 },
            didDrawPage: (data) => {
                // Rodapé profissional
                doc.setFontSize(7);
                doc.setTextColor(150, 150, 150);
                const pageStr = `Página ${doc.internal.getNumberOfPages()}`;
                doc.text(`Documento emitido via SistemaFF`, 14, 202);
                doc.text(pageStr, 282, 202, { align: 'right' });
            }
        });

        // Total Geral ao final (sempre no final da última página)
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(`TOTAL GERAL: ${formatCurrency(totalValue)}`, 282, finalY, { align: 'right' });

        doc.save(`relatorio_financeiro_fortfruit_${new Date().getTime()}.pdf`);
    };

    const loadAnexos = async (item) => {
        try {
            const num = item.E2_NUM?.trim();
            const parc = item.E2_PARCELA?.trim() || "";
            const fornece = item.E2_FORNECE?.trim();

            const response = await axios.get(`${API_BASE_URL}/contas-pagar/anexos/ANY/ANY/ANY`, {
                params: { titulo: num, parcela: parc, fornecedor: fornece }
            });
            setAnexos(response.data || []);
            // Atualiza resumo global também
            const resumo = await axios.get(`${API_BASE_URL}/contas-pagar/anexos-resumo`);
            setAnexosResumo(resumo.data || []);
        } catch (error) {
            console.error("Erro ao carregar anexos:", error);
        }
    };

    const handlePrint = () => {
        if (!previewUrl) return;
        
        // Se for PDF, abre em nova aba para imprimir (mais seguro para PDFs externos)
        if (previewUrl.toLowerCase().endsWith('.pdf') || previewUrl.includes('supabase')) {
            const printWindow = window.open(previewUrl, '_blank');
            if (printWindow) {
                printWindow.onload = () => {
                    printWindow.print();
                };
            }
            return;
        }

        // Para imagens, usa o método do iframe oculto
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = previewUrl;
        document.body.appendChild(iframe);
        iframe.onload = () => {
            iframe.contentWindow.print();
            setTimeout(() => document.body.removeChild(iframe), 1000);
        };
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("arquivo", file);
        formData.append("titulo_num", selectedTitulo.E2_NUM?.trim());
        formData.append("parcela", selectedTitulo.E2_PARCELA?.trim() || " ");
        formData.append("fornecedor", selectedTitulo.E2_FORNECE?.trim());
        formData.append("tipo_anexo", tipoAnexo);

        try {
            setUploading(true);
            await axios.post(`${API_BASE_URL}/contas-pagar/anexar`, formData);
            loadAnexos(selectedTitulo);
        } catch (error) {
            console.error("Erro no upload:", error);
            const msg = error.response?.data?.details || error.response?.data?.error || "Erro ao enviar arquivo.";
            alert(msg);
        } finally {
            setUploading(false);
            e.target.value = null;
        }
    };

    const deleteAnexo = async (id) => {
        if (!window.confirm("Deseja realmente excluir este anexo?")) return;
        try {
            await axios.delete(`${API_BASE_URL}/contas-pagar/anexos/${id}`);
            if (previewUrl?.includes(`/storage/v1/object/public/`)) setPreviewUrl(null); // Simple reset
            loadAnexos(selectedTitulo);
        } catch (error) {
            console.error("Erro ao excluir:", error);
        }
    };

    return (
        <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans pb-20 transition-colors duration-300">
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />

            {/* --- HEADER --- */}
            <header className="sticky top-0 z-50 px-4 md:px-6 py-4">
                <div className="max-w-[95%] mx-auto">
                    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-slate-700/50 px-4 md:px-6 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/financeiro/contas-pagar")}>
                            <div className="bg-gradient-to-tr from-rose-600 to-amber-500 h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-rose-600/20">
                                <span className="material-symbols-rounded text-2xl">receipt_long</span>
                            </div>
                            <div>
                                <h1 className="text-lg font-bold leading-tight text-slate-800 dark:text-white">Lista Contas a Pagar</h1>
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Financeiro</span>
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

            {/* --- BODY --- */}
            <main className="max-w-[95%] mx-auto px-4 md:px-6 py-8">
                
                {/* --- FILTROS --- */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 mb-8 overflow-visible">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                        
                        {/* Busca Texto */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Busca Geral</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-rounded text-xl">search</span>
                                <input
                                    type="text"
                                    placeholder="Fornecedor, Título..."
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-rose-500 outline-none transition-all text-sm font-medium"
                                />
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Status do Título</label>
                            <select 
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-rose-500 outline-none transition-all text-sm font-bold shadow-sm"
                            >
                                <option value="TODOS">Todos os Status</option>
                                <option value="VENCIDOS">🔴 Vencidos</option>
                                <option value="PAGOS">🟢 Pagos</option>
                                <option value="A_VENCER">🔵 A Vencer</option>
                            </select>
                        </div>

                        {/* Período de Vencimento */}
                        <div className="flex flex-col gap-2 lg:col-span-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Período de Vencimento (De / Até)</label>
                            <div className="flex items-center gap-3">
                                <input 
                                    type="date" 
                                    value={startDate}
                                    onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-rose-500 outline-none transition-all text-sm font-bold"
                                />
                                <span className="text-slate-400 font-bold">à</span>
                                <input 
                                    type="date" 
                                    value={endDate}
                                    onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-rose-500 outline-none transition-all text-sm font-bold"
                                />
                            </div>
                        </div>

                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
                        <button 
                            onClick={() => { resetFilters(); }}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all shadow-sm group"
                        >
                            <span className="material-symbols-rounded text-lg group-hover:rotate-180 transition-transform">refresh</span>
                            Limpar Filtros
                        </button>

                        <button 
                            onClick={() => { setShowVencendoHoje(!showVencendoHoje); setPage(1); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                                showVencendoHoje 
                                ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20' 
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-amber-600 dark:text-amber-400 hover:shadow-md'
                            }`}
                        >
                            <span className="material-symbols-rounded text-lg">{showVencendoHoje ? 'event_available' : 'calendar_today'}</span>
                            Vencendo Hoje
                        </button>

                        <button 
                            onClick={handleGenerateReport}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-rose-600 border border-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-600/20 transition-all"
                        >
                            <span className="material-symbols-rounded text-lg">picture_as_pdf</span>
                            Relatório PDF
                        </button>

                        <div className="ml-auto text-[11px] font-bold text-slate-400">
                            Exibindo <span className="text-rose-500">{filteredData.length}</span> títulos encontrados
                        </div>
                    </div>
                </div>

                {/* --- TABELA --- */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Nº Título</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Parcela</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Fornecedor</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Natureza</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Anexos</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Emissão</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Vencimento</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Valor</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center pr-8">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {loading ? (
                                    <tr><td colSpan="10" className="px-6 py-20 text-center"><div className="flex flex-col items-center gap-3"><div className="w-10 h-10 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin"></div><span className="text-slate-400 text-sm font-bold animate-pulse">Consultando Protheus...</span></div></td></tr>
                                ) : paginatedData.length === 0 ? (
                                    <tr><td colSpan="10" className="px-6 py-20 text-center"><div className="flex flex-col items-center gap-2"><span className="material-symbols-rounded text-slate-300 text-5xl">folder_off</span><span className="text-slate-400 text-sm font-medium">Nenhum título encontrado.</span></div></td></tr>
                                ) : (
                                    paginatedData.map((item, idx) => {
                                        const resumo = getResumo(item);
                                        return (
                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                <td className="px-6 py-4 text-center">
                                                    {parseFloat(item.E2_SALDO) === 0 ? (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Pago </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Aberto </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500 dark:text-rose-400">{item.E2_NUM}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200 text-center">{item.E2_PARCELA}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.E2_NOMFOR}</span>
                                                        <span className="text-[10px] text-slate-400 font-medium">Cód: {item.E2_FORNECE}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400 uppercase">{item.E2_NATUREZ}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex gap-2 justify-center">
                                                        {resumo?.has_nf > 0 && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); openAnexosModal(item); }}
                                                                title="Abrir Gestão de NF" 
                                                                className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
                                                            >
                                                                <span className="material-symbols-rounded text-lg">description</span>
                                                            </button>
                                                        )}
                                                        {resumo?.has_boleto > 0 && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); openAnexosModal(item); }}
                                                                title="Abrir Gestão de Boleto" 
                                                                className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
                                                            >
                                                                <span className="material-symbols-rounded text-lg">payments</span>
                                                            </button>
                                                        )}
                                                        {!resumo?.has_nf && !resumo?.has_boleto && <span className="text-slate-300 dark:text-slate-600 text-xs">-</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center text-sm font-medium text-slate-500 dark:text-slate-400">{formatarDataBrasileira(item.E2_EMISSAO)}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`text-sm font-black ${new Date().toISOString().slice(0, 10).replace(/-/g, "") > item.E2_VENCTO ? 'text-red-500 animate-pulse' : 'text-slate-600 dark:text-slate-300'}`}>{formatarDataBrasileira(item.E2_VENCTO)}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-sm font-black text-rose-600 dark:text-rose-400">{formatCurrency(parseFloat(item.E2_VALOR))}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center pr-8">
                                                    <button onClick={() => openAnexosModal(item)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-all shadow-sm">
                                                        <span className="material-symbols-rounded">attach_file</span>
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
            </main>

            {/* --- MODAL ANEXOS --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                        {/* Header Modal */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-rounded text-rose-500">attach_file</span>
                                    Anexos do Título: {selectedTitulo?.E2_NUM}
                                </h2>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedTitulo?.E2_NOMFOR}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {previewUrl && (
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={handlePrint} 
                                            title="Imprimir Anexo"
                                            className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:scale-110 transition-all"
                                        >
                                            <span className="material-symbols-rounded">print</span>
                                        </button>
                                        <button 
                                            onClick={() => window.open(previewUrl, '_blank')} 
                                            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 text-xs font-bold flex items-center gap-2 hover:bg-slate-200 transition-colors"
                                        >
                                            <span className="material-symbols-rounded">open_in_new</span> Expandir
                                        </button>
                                    </div>
                                )}
                                <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                                    <span className="material-symbols-rounded">close</span>
                                </button>
                            </div>
                        </div>

                        {/* Conteúdo Modal */}
                        <div className="flex-1 flex overflow-hidden">
                            {/* Lateral Esquerda: Lista e Upload */}
                            <div className="w-full md:w-80 border-r border-slate-100 dark:border-slate-700 flex flex-col bg-slate-50/30 dark:bg-slate-900/20 shrink-0">
                                <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                                    {/* Upload Area */}
                                    <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center gap-3 mb-6">
                                        <div className="flex gap-1 w-full mb-1">
                                            <button onClick={() => setTipoAnexo("NF")} className={`flex-1 py-1 px-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${tipoAnexo === 'NF' ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-400'}`}>NF</button>
                                            <button onClick={() => setTipoAnexo("BOLETO")} className={`flex-1 py-1 px-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${tipoAnexo === 'BOLETO' ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-400'}`}>Boleto</button>
                                        </div>
                                        <input type="file" id="fileUpload" className="hidden" onChange={handleFileUpload} />
                                        <label htmlFor="fileUpload" className={`w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${uploading ? 'bg-slate-200 text-slate-400 cursor-wait' : 'bg-rose-100 text-rose-600 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50'}`}>
                                            <span className="material-symbols-rounded text-lg">{uploading ? 'sync' : 'cloud_upload'}</span>
                                            {uploading ? 'Enviando...' : `Anexar`}
                                        </label>
                                    </div>

                                    {/* List */}
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 px-2">Arquivos</h3>
                                    <div className="space-y-2">
                                        {anexos.length === 0 ? (
                                            <div className="py-6 text-center text-slate-400 text-[11px] font-medium">Nenhum anexo.</div>
                                        ) : (
                                            anexos.map((anexo) => (
                                                <div 
                                                    key={anexo.id} 
                                                    onClick={() => setPreviewUrl(anexo.arquivo_url)}
                                                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer group ${previewUrl === anexo.arquivo_url ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-900/30' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${anexo.tipo_anexo === 'NF' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                                            <span className="material-symbols-rounded text-base">{anexo.tipo_anexo === 'NF' ? 'description' : 'payments'}</span>
                                                        </div>
                                                        <div className="truncate">
                                                            <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">{anexo.arquivo_nome}</p>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase">{anexo.tipo_anexo}</span>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); deleteAnexo(anexo.id); }} 
                                                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <span className="material-symbols-rounded text-lg">delete</span>
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Lateral Direita: Preview */}
                            <div className="flex-1 bg-slate-100 dark:bg-slate-900/40 relative">
                                {previewUrl ? (
                                    <div className="w-full h-full flex flex-col">
                                        {previewUrl.toLowerCase().endsWith('.pdf') || previewUrl.includes('supabase') ? (
                                             <iframe src={previewUrl} className="w-full h-full border-none" title="Preview"></iframe>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center p-4">
                                                <img src={previewUrl} alt="Preview" className="max-w-full max-h-full rounded-lg shadow-lg object-contain" />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                                        <div className="w-16 h-16 rounded-3xl bg-slate-200/50 dark:bg-slate-800 flex items-center justify-center">
                                            <span className="material-symbols-rounded text-4xl">visibility_off</span>
                                        </div>
                                        <p className="text-sm font-medium">Selecione um arquivo para pré-visualizar</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContasPagarList;
