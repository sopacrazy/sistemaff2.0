import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../utils/apiConfig";
import Swal from "sweetalert2";

const NFE = () => {
  const navigate = useNavigate();
  const [nfeList, setNfeList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [dateStart, setDateStart] = useState(new Date().toISOString().split("T")[0]);
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().split("T")[0]);
  const [username, setUsername] = useState("");
  const [local, setLocal] = useState("");

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    const storedUser = sessionStorage.getItem("username") || localStorage.getItem("username");
    const storedLocal = sessionStorage.getItem("local") || localStorage.getItem("local") || "01";
    if (storedUser) setUsername(storedUser);
    if (storedLocal) setLocal(storedLocal);

    fetchNotas();
  }, [dateStart, dateEnd, local]); // Carrega quando datas ou local mudam

  // Debounce para a busca
  useEffect(() => {
    if (searchTerm.length === 0) {
        setIsSearching(false);
        fetchNotas();
        return;
    }
    
    setIsSearching(true);
    const delayDebounceFn = setTimeout(() => {
      fetchNotas();
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const fetchNotas = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/caixa/nfe`, {
        params: {
          dataInicio: dateStart,
          dataFim: dateEnd,
          local: local || "01",
          search: searchTerm
        }
      });
      setNfeList(response.data);
    } catch (error) {
      console.error("Erro ao buscar notas:", error);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  const handlePrint = (nota) => {
    const pdfUrl = `${API_BASE_URL}/api/caixa/nfe/${nota.numero}/${nota.serie}/pdf?local=${local || "01"}`;
    window.open(pdfUrl, "_blank");
  };

  const handleBoleto = (nota) => {
    const pdfUrl = `${API_BASE_URL}/api/caixa/nfe/${nota.numero}/${nota.serie}/boleto?local=${local || "01"}`;
    window.open(pdfUrl, "_blank");
  };

  const handleView = async (nota) => {
    try {
      Swal.fire({
        title: 'Buscando detalhes...',
        didOpen: () => Swal.showLoading(),
        allowOutsideClick: false
      });

      const response = await axios.get(`${API_BASE_URL}/api/caixa/nfe/${nota.numero}/${nota.serie}`, {
        params: { local: local || "01" }
      });
      
      const { header, items } = response.data;

      Swal.fire({
        title: `Nota ${header.numero} - Série ${header.serie}`,
        width: '800px',
        html: `
          <div class="text-left font-sans">
            <div class="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100">
              <div>
                <p class="text-[10px] font-black uppercase text-slate-400">Cliente</p>
                <p class="font-bold text-slate-800">${header.nomeCliente}</p>
                <p class="text-xs text-slate-500">${header.codCliente} / ${header.loja}</p>
              </div>
              <div class="text-right">
                <p class="text-[10px] font-black uppercase text-slate-400">Total da Nota</p>
                <p class="text-xl font-black text-rose-600">R$ ${header.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            
            <div class="max-h-[300px] overflow-y-auto border border-slate-100 rounded-xl">
              <table class="w-full text-xs">
                <thead class="bg-slate-50 sticky top-0">
                  <tr>
                    <th class="px-3 py-2 text-left text-slate-400 uppercase">Cód</th>
                    <th class="px-3 py-2 text-left text-slate-400 uppercase">Descrição</th>
                    <th class="px-3 py-2 text-center text-slate-400 uppercase">Qtd</th>
                    <th class="px-3 py-2 text-right text-slate-400 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                  ${items.map(i => `
                    <tr>
                      <td class="px-3 py-2 font-mono text-slate-500">${i.codigo}</td>
                      <td class="px-3 py-2 font-bold text-slate-700">${i.descricao}</td>
                      <td class="px-3 py-2 text-center text-slate-600">${i.quant} ${i.um}</td>
                      <td class="px-3 py-2 text-right font-bold text-slate-800">R$ ${i.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>`,
        confirmButtonColor: "#e11d48",
        confirmButtonText: "Fechar"
      });
    } catch (error) {
      console.error("Erro ao buscar detalhes da nota:", error);
      Swal.fire("Erro", "Não foi possível carregar os itens desta nota.", "error");
    }
  };

  // Paginação
  const totalPages = Math.ceil(nfeList.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = nfeList.slice(indexOfFirstItem, indexOfLastItem);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300 pb-20">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />

      {/* Header Glass */}
      <header className="sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-slate-700/50 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
              <div className="bg-gradient-to-tr from-rose-600 to-pink-400 h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-rose-600/20">
                <span className="material-symbols-rounded font-bold text-2xl">description</span>
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight text-slate-800 dark:text-white">NFE</h1>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Notas Fiscais de Saída</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end leading-tight">
                <span className="text-sm font-bold text-slate-800 dark:text-white">{username}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Local: {local}</span>
              </div>
              <button onClick={() => navigate("/")} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all" title="Ir para Home">
                <span className="material-symbols-rounded block">home</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 scroll-smooth">
        {/* Filtro de Busca Simplificado */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input 
              type="text" 
              placeholder="Pesquisar nota, cliente ou bilhete em 2026..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-slate-800 border-none shadow-lg focus:ring-2 focus:ring-rose-500 outline-none transition-all dark:text-white text-lg"
              autoFocus
            />
            {(loading || isSearching) && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="animate-spin h-5 w-5 border-2 border-rose-500 border-t-transparent rounded-full"></div>
                </div>
            )}
          </div>
          {!searchTerm && !loading && !isSearching && (
              <p className="text-center text-slate-400 text-[10px] mt-3 uppercase font-bold tracking-widest">
                Mostrando notas de hoje • Digite para buscar no histórico de 2026
              </p>
          )}
        </div>

        {/* Listagem */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700/50">
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Número</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Série</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Local</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Bilhete</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Emissão</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {(loading || isSearching) && currentItems.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Buscando notas no Protheus...</span>
                    </div>
                  </td>
                </tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((nota, index) => (
                  <tr key={`${nota.numero}-${nota.serie}-${index}`} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-slate-900 dark:text-white font-bold">{nota.numero}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 font-bold text-[10px]">{nota.serie}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold text-[10px]">{nota.filial}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-rose-600 dark:text-rose-400 font-black tracking-tight">{nota.bilhete || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 line-clamp-1 truncate max-w-[250px]">{nota.nomeCliente}</span>
                        <span className="text-[10px] font-medium text-slate-400">{nota.codCliente} / {nota.loja}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium text-sm">
                      {new Date(nota.dataEmissao + "T12:00:00").toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-rose-600 font-black text-sm">
                        {nota.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleView(nota)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-rose-100 hover:text-rose-600 transition-all">
                          <span className="material-symbols-rounded text-lg">visibility</span>
                        </button>
                        <button onClick={() => handlePrint(nota)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-rose-100 hover:text-rose-600 transition-all">
                          <span className="material-symbols-rounded text-lg">picture_as_pdf</span>
                        </button>
                        {nota.temBoleto && (
                          <button onClick={() => handleBoleto(nota)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-rose-100 hover:text-rose-600 transition-all">
                            <span className="material-symbols-rounded text-lg">barcode</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <span className="material-symbols-rounded text-5xl text-slate-200 dark:text-slate-700">description</span>
                      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nenhuma nota encontrada.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Página {currentPage} de {totalPages}</span>
            <div className="flex gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => goToPage(currentPage - 1)}
                className="p-2 rounded-xl bg-white dark:bg-slate-800 disabled:opacity-30 border border-slate-100 dark:border-slate-700 shadow-sm"
              >
                <span className="material-symbols-rounded block">chevron_left</span>
              </button>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => goToPage(currentPage + 1)}
                className="p-2 rounded-xl bg-white dark:bg-slate-800 disabled:opacity-30 border border-slate-100 dark:border-slate-700 shadow-sm"
              >
                <span className="material-symbols-rounded block">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Voltar para Home */}
      <div className="max-w-7xl mx-auto px-6 mt-4">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-slate-400 hover:text-rose-500 transition-colors font-bold uppercase text-[10px] tracking-widest group">
          <span className="material-symbols-rounded group-hover:-translate-x-1 transition-transform">arrow_back</span>
          Voltar para Início
        </button>
      </div>
    </div>
  );
};

export default NFE;
