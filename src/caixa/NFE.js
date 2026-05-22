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

  const handleWhatsApp = async (nota) => {
    const rawDdd = nota.dddCliente || "";
    const rawTel = nota.telCliente || "";
    
    // Limpar o telefone para envio
    const defaultPhone = `${rawDdd.trim()}${rawTel.trim()}`.replace(/\D/g, "");
    const formattedPhone = defaultPhone ? (defaultPhone.startsWith("55") ? defaultPhone : `55${defaultPhone}`) : "";

    // Criar a mensagem padrão
    const valorFormatado = nota.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const dataFormatada = new Date(nota.dataEmissao + "T12:00:00").toLocaleDateString('pt-BR');
    
    const pdfUrl = `${API_BASE_URL}/api/caixa/nfe/${nota.numero}/${nota.serie}/pdf?local=${local || "01"}`;
    const boletoUrl = `${API_BASE_URL}/api/caixa/nfe/${nota.numero}/${nota.serie}/boleto?local=${local || "01"}`;

    let mensagem = `Olá, *${nota.nomeCliente}*,\n\nSegue o link para a sua *Nota Fiscal nº ${nota.numero} (Série ${nota.serie})* emitida em *${dataFormatada}* no valor de *${valorFormatado}*:\n\n📄 PDF da Nota: ${pdfUrl}`;
    
    if (nota.temBoleto) {
      mensagem += `\n\n💵 Boleto Bancário: ${boletoUrl}`;
    }
    
    mensagem += `\n\nPor favor, confirme o recebimento. Obrigado!`;

    const { value: formValues } = await Swal.fire({
      title: 'Enviar por WhatsApp',
      html:
        `<div style="text-align: left; font-family: sans-serif; font-size: 14px;">
          <label style="display: block; font-weight: bold; margin-bottom: 5px; color: #475569;">Número do WhatsApp (com DDI + DDD):</label>
          <input id="swal-input-phone" class="swal2-input" style="width: 100%; margin: 0 0 15px 0; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1;" value="${formattedPhone}" placeholder="Ex: 5591999999999">
          
          <label style="display: block; font-weight: bold; margin-bottom: 5px; color: #475569;">Mensagem:</label>
          <textarea id="swal-input-message" class="swal2-textarea" style="width: 100%; margin: 0; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1; height: 120px; font-family: sans-serif; font-size: 13px; line-height: 1.4;">${mensagem}</textarea>
          
          <div style="margin-top: 15px; display: flex; flex-direction: column; gap: 8px;">
            <label style="display: flex; align-items: center; gap: 8px; color: #475569; font-weight: 500; cursor: pointer;">
              <input type="checkbox" id="swal-input-dl-pdf" checked style="width: 16px; height: 16px; accent-color: #22c55e;">
              Baixar PDF automaticamente (para arrastar e enviar no chat)
            </label>
            ${nota.temBoleto ? `
            <label style="display: flex; align-items: center; gap: 8px; color: #475569; font-weight: 500; cursor: pointer;">
              <input type="checkbox" id="swal-input-dl-boleto" checked style="width: 16px; height: 16px; accent-color: #22c55e;">
              Baixar Boleto automaticamente (para arrastar e enviar no chat)
            </label>
            ` : ''}
          </div>
        </div>`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#22c55e',
      cancelButtonColor: '#64748b',
      preConfirm: () => {
        const phone = document.getElementById('swal-input-phone').value.replace(/\D/g, "");
        const msg = document.getElementById('swal-input-message').value;
        const dlPdf = document.getElementById('swal-input-dl-pdf')?.checked || false;
        const dlBoleto = document.getElementById('swal-input-dl-boleto')?.checked || false;
        if (!phone) {
          Swal.showValidationMessage('O número de WhatsApp é obrigatório!');
          return false;
        }
        if (phone.length < 10) {
          Swal.showValidationMessage('Número inválido! Digite o DDD e o número (ex: 5591999999999).');
          return false;
        }
        return { phone, msg, dlPdf, dlBoleto };
      }
    });

    if (formValues) {
      const { phone, msg, dlPdf, dlBoleto } = formValues;

      // Função interna para baixar arquivos de forma silenciosa via Blob
      const downloadFile = async (url, filename) => {
        try {
          const response = await axios.get(url, { responseType: 'blob' });
          const blob = new Blob([response.data], { type: 'application/pdf' });
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
          console.error("Erro ao baixar arquivo para anexo:", error);
        }
      };

      if (dlPdf) {
        await downloadFile(pdfUrl, `NFe_${nota.numero}.pdf`);
      }

      if (dlBoleto && nota.temBoleto) {
        await downloadFile(boletoUrl, `Boleto_NFe_${nota.numero}.pdf`);
      }

      const waUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`;
      window.open(waUrl, "_blank");
    }
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
                        <button 
                          onClick={() => handleWhatsApp(nota)} 
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-900/30 dark:hover:text-green-400 transition-all flex items-center justify-center"
                          title="Enviar por WhatsApp"
                        >
                          <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                          </svg>
                        </button>
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
