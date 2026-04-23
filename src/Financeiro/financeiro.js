import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from '../utils/apiConfig';

// --- Components Reutilizáveis (Tailwind) ---

const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-md" }) => {
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

// Formatação helpers
const formatarData = (data) => {
  if (!data || data.length !== 8) return "Data inválida";
  const ano = data.substring(0, 4);
  const mes = data.substring(4, 6);
  const dia = data.substring(6, 8);
  return `${ano}-${mes}-${dia}`;
};

const formatarDataBrasileira = (data) => {
  const dataFormatada = formatarData(data);
  const dateObj = new Date(dataFormatada);
  return isNaN(dateObj.getTime()) ? "Data inválida" : dateObj.toLocaleDateString("pt-BR");
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};


const ContasReceber = () => {
  const navigate = useNavigate();

  // --- STATE ---
  const [clientes, setClientes] = useState({});
  const [vendedores, setVendedores] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const rowsPerPage = 20;

  // Expanded Rows
  const [expandedRows, setExpandedRows] = useState({}); // { [clienteKey]: boolean }

  // Modals State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isCarteiraModalOpen, setIsCarteiraModalOpen] = useState(false);

  // Form States
  const [selectedVendedor, setSelectedVendedor] = useState("");
  const [selectedTipoRelatorio, setSelectedTipoRelatorio] = useState("analitico");

  const [selectedVendedorCarteira, setSelectedVendedorCarteira] = useState("");
  const [selectedTipoAcao, setSelectedTipoAcao] = useState("consulta");

  const [username, setUsername] = useState("");
  const [local, setLocal] = useState("08");

  // --- EFFECTS ---
  useEffect(() => {
    const u = localStorage.getItem("username");
    if (u) setUsername(u);

    fetchVendedores();
    fetchData();
  }, []);

  const toggleDarkMode = () => document.documentElement.classList.toggle("dark");
  const handleLogout = () => { localStorage.clear(); navigate("/login"); };


  // --- API CALLS ---
  const fetchVendedores = () => {
    axios.get(`${API_BASE_URL}/vendedor`)
      .then(res => setVendedores(res.data || []))
      .catch(err => console.error("Erro ao buscar vendedores:", err));
  };

  const fetchData = () => {
    axios.get(`${API_BASE_URL}/cliente`)
      .then(response => {
        const groupedData = groupByCliente(response.data || []);
        setClientes(groupedData);
      })
      .catch(error => console.error("Erro ao buscar clientes:", error));
  };

  const groupByCliente = (data) => {
    return data.reduce((acc, current) => {
      const cliente = current.E1_NOMCLI;
      if (!acc[cliente]) {
        acc[cliente] = {
          cliente: cliente,
          saldo: 0,
          vendedor: current.NOME_VENDEDOR,
          titulos: [],
        };
      }
      acc[cliente].titulos.push({
        E1_NUM: current.E1_NUM,
        Z4_NOTA: current.Z4_NOTA,
        Z4_BILHETE: current.Z4_BILHETE,
        E1_VENCREA: current.E1_VENCREA,
        E1_VALOR: parseFloat(current.E1_SALDO),
        E1_TIPO: current.E1_TIPO,
      });
      acc[cliente].saldo += parseFloat(current.E1_SALDO);
      return acc;
    }, {});
  };

  // --- HANDLERS ---
  const handleExpandRow = (clienteKey) => {
    setExpandedRows(prev => ({ ...prev, [clienteKey]: !prev[clienteKey] }));
  };

  const gerarRelatorioVendedor = () => {
    if (!selectedVendedor) return alert("Selecione um vendedor.");

    axios.get(`${API_BASE_URL}/relatorio-vendedor?vendedor=${selectedVendedor}&tipo=${selectedTipoRelatorio}`, { responseType: "blob" })
      .then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.download = `relatorio_${selectedTipoRelatorio}_${selectedVendedor}.pdf`;
        document.body.appendChild(link);
        link.click();
        setIsReportModalOpen(false);
      })
      .catch(console.error);
  };

  const gerarCarteira = () => {
    if (!selectedVendedorCarteira) return alert("Selecione um vendedor.");

    axios.get(`${API_BASE_URL}/vendedor-cliente?vendedor=${encodeURIComponent(selectedVendedorCarteira)}`, { responseType: "blob" })
      .then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.download = `carteira_${selectedVendedorCarteira}.pdf`;
        document.body.appendChild(link);
        link.click();
        setIsCarteiraModalOpen(false);
      })
      .catch(console.error);
  };

  const handleRelatorioCliente = (cliente) => {
    axios.get(`${API_BASE_URL}/relatorio-cliente?cliente=${cliente}`, { responseType: "blob" })
      .then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.download = `relatorio_${cliente}.pdf`;
        document.body.appendChild(link);
        link.click();
      })
      .catch(console.error);
  };

  const enviarWhatsApp = (cliente, numeroTitulo, valor, dataVencimento) => {
    const mensagem = `Olá, *${cliente}*,\n\nEstamos lembrando sobre o pagamento do título abaixo:\n\n*Título nº ${numeroTitulo}*: *${valor}*, vencido em *${dataVencimento}*.\n\nPedimos que regularize a pendência o quanto antes. Caso já tenha efetuado o pagamento, favor desconsiderar.\n`;
    const url = `https://web.whatsapp.com/send?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");
  };

  // --- PAGINATION & FILTER LOGIC ---
  const allClientesKeys = Object.keys(clientes || {});
  const filteredKeys = allClientesKeys.filter(key => {
    const nome = clientes[key]?.cliente || "";
    return nome.toLowerCase().includes(search.toLowerCase());
  });

  const totalPages = Math.ceil(filteredKeys.length / rowsPerPage);
  const paginatedKeys = filteredKeys.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const ordenarTitulos = (titulos) => {
    return titulos.sort((a, b) => new Date(formatarData(a.E1_VENCREA)) - new Date(formatarData(b.E1_VENCREA)));
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans pb-20 transition-colors duration-300">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />

      {/* --- HEADER --- */}
      <header className="sticky top-0 z-50 px-4 md:px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-slate-700/50 px-4 md:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/financeiro/contas-receber")}>
              <div className="bg-gradient-to-tr from-rose-600 to-amber-500 h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-rose-600/20">
                <span className="material-symbols-rounded text-2xl">warning</span>
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight text-slate-800 dark:text-white">Inadimplências</h1>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Financeiro</span>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <div className="hidden md:flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-slate-800 dark:text-white">{username || "Admin"}</span>
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

      {/* --- BODY --- */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">

        {/* Actions Toolbar */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-8">

          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <button onClick={() => navigate('/financeiro/contas-receber')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold transition-all">
              <span className="material-symbols-rounded">arrow_back</span> Voltar
            </button>
            <button onClick={() => setIsReportModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 font-bold shadow-sm transition-all">
              <span className="material-symbols-rounded">description</span> Relatório Geral
            </button>
            <button onClick={() => setIsCarteiraModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 font-bold shadow-sm transition-all">
              <span className="material-symbols-rounded">folder_shared</span> Carteira
            </button>
          </div>

          <div className="relative w-full lg:w-96">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-rounded">search</span>
            <input
              type="text"
              placeholder="Buscar Cliente..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Clients Table */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="w-12 px-4 py-4"></th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Saldo Devedor</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Títulos</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Vendedor</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {paginatedKeys.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
                      Nenhum cliente encontrado.
                    </td>
                  </tr>
                ) : (
                  paginatedKeys.map((key) => {
                    const cliente = clientes[key];
                    const isExpanded = !!expandedRows[key];
                    return (
                      <React.Fragment key={key}>
                        <tr className={`cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30 ${isExpanded ? 'bg-slate-50 dark:bg-slate-700/20' : ''}`} onClick={() => handleExpandRow(key)}>
                          <td className="px-4 py-3 text-center">
                            <span className={`material-symbols-rounded text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>keyboard_arrow_down</span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                            {cliente.cliente}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-block px-3 py-1 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-bold text-sm">
                              {formatCurrency(Math.abs(cliente.saldo))}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-400">
                            {cliente.titulos.length}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">
                            {cliente.vendedor}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRelatorioCliente(cliente.cliente); }}
                              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                              title="Baixar Relatório Cliente"
                            >
                              <span className="material-symbols-rounded">picture_as_pdf</span>
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-50/50 dark:bg-slate-900/20">
                            <td colSpan="6" className="p-0">
                              <div className="p-4 pl-12 border-t border-slate-100 dark:border-slate-700 shadow-inner">
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                  <span className="material-symbols-rounded text-base">receipt_long</span> Títulos Pendentes
                                </h4>
                                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                                  <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-100 dark:bg-slate-700 text-slate-500 font-bold uppercase text-[10px]">
                                      <tr>
                                        <th className="px-4 py-2">Número</th>
                                        <th className="px-4 py-2">Nota/Bilhete</th>
                                        <th className="px-4 py-2">Vencimento</th>
                                        <th className="px-4 py-2">Tipo</th>
                                        <th className="px-4 py-2 text-right">Valor</th>
                                        <th className="px-4 py-2 text-center">Ações</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                      {ordenarTitulos(cliente.titulos).map((titulo, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                          <td className="px-4 py-2 font-mono">{titulo.E1_NUM}</td>
                                          <td className="px-4 py-2">{titulo.E1_TIPO === "NCC" ? titulo.Z4_BILHETE : titulo.Z4_NOTA}</td>
                                          <td className="px-4 py-2">{formatarDataBrasileira(titulo.E1_VENCREA)}</td>
                                          <td className="px-4 py-2">
                                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-700 font-bold">{titulo.E1_TIPO}</span>
                                          </td>
                                          <td className="px-4 py-2 text-right font-bold text-red-600 dark:text-red-400">
                                            {formatCurrency(Math.abs(titulo.E1_VALOR))}
                                          </td>
                                          <td className="px-4 py-2 text-center">
                                            <button
                                              onClick={() => enviarWhatsApp(cliente.cliente, titulo.E1_NUM, formatCurrency(titulo.E1_VALOR), formatarDataBrasileira(titulo.E1_VENCREA))}
                                              className="p-2 rounded-full text-green-500 hover:bg-green-50 hover:scale-110 dark:hover:bg-green-900/20 transition-all flex items-center justify-center mx-auto shadow-sm border border-green-100 dark:border-green-900"
                                              title="Enviar Cobrança WhatsApp"
                                            >
                                              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                              </svg>
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
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

      {/* --- MODAL RELATÓRIO VENDEDOR --- */}
      <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title="Relatório por Vendedor">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-1">Vendedor</label>
            <select
              value={selectedVendedor}
              onChange={(e) => setSelectedVendedor(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione...</option>
              {vendedores.map((v, i) => (
                <option key={i} value={v.nome}>{v.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-1">Tipo</label>
            <select
              value={selectedTipoRelatorio}
              onChange={(e) => setSelectedTipoRelatorio(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="analitico">Analítico</option>
              <option value="sintetico">Sintético</option>
            </select>
          </div>
          <button onClick={gerarRelatorioVendedor} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl mt-2 transition-all shadow-lg shadow-blue-600/20">
            Gerar Relatório
          </button>
        </div>
      </Modal>

      {/* --- MODAL CARTEIRA --- */}
      <Modal isOpen={isCarteiraModalOpen} onClose={() => setIsCarteiraModalOpen(false)} title="Carteira de Vendedor">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-1">Vendedor</label>
            <select
              value={selectedVendedorCarteira}
              onChange={(e) => setSelectedVendedorCarteira(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Selecione...</option>
              {vendedores.map((v, i) => (
                <option key={i} value={v.nome}>{v.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-1">Ação</label>
            <select
              value={selectedTipoAcao}
              onChange={(e) => setSelectedTipoAcao(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="consulta">Consulta</option>
              <option value="relatorio">Relatório PDF</option>
            </select>
          </div>
          <button onClick={gerarCarteira} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl mt-2 transition-all shadow-lg shadow-indigo-600/20">
            Gerar Carteira
          </button>
        </div>
      </Modal>

    </div>
  );
};

export default ContasReceber;
