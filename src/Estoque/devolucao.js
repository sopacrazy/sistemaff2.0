
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import DefaultAppBar from "../components/DefaultAppBar"; // Mantendo compatibilidade se necessário, mas o header será custom
import { getDataTrabalho } from "../utils/dataTrabalho";
import dayjs from "dayjs";
import {
  Tooltip,
  Snackbar,
} from "@mui/material";
import MuiAlert from "@mui/material/Alert";
import { API_BASE_URL } from '../utils/apiConfig';

// --- COMPONENTS MODERNOS ---

const Modal = ({ isOpen, onClose, title, children, maxWidth = "md" }) => {
  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
    "2xl": "max-w-7xl",
    "full": "max-w-full mx-4"
  };

  return (
    <React.Fragment>
       <div 
        className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose} 
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto pointer-events-none">
        <div 
          className={`bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full ${maxWidthClasses[maxWidth]} overflow-hidden animate-in zoom-in-95 duration-300 pointer-events-auto flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-700`}
        >
          {/* Header */}
          <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white/50 dark:bg-slate-800/50 backdrop-blur-md sticky top-0 z-10">
            <h3 className="font-bold text-xl text-slate-800 dark:text-white flex items-center gap-2">
              {title}
            </h3>
            <button 
              onClick={onClose} 
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 group"
            >
              <span className="material-symbols-rounded group-hover:rotate-90 transition-transform">close</span>
            </button>
          </div>
          
          {/* Content */}
          <div className="p-8 overflow-y-auto text-slate-600 dark:text-slate-300 custom-scrollbar">
            {children}
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

const Devolucao = () => {
    const navigate = useNavigate();
    const [devolucoes, setDevolucoes] = useState([]);
    const [paginaAtual, setPaginaAtual] = useState(1);
    const itensPorPagina = 20;

    // Estados de Controle
    const [modalVisualizacaoOpen, setModalVisualizacaoOpen] = useState(false);
    const [devolucaoSelecionada, setDevolucaoSelecionada] = useState(null);
    const [itensDevolucao, setItensDevolucao] = useState([]);

    const [modalDeleteOpen, setModalDeleteOpen] = useState(false);
    const [devolucaoParaDeletar, setDevolucaoParaDeletar] = useState(null);

    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
    const [loading, setLoading] = useState(true);

    // Estados de Fechamento
    const [fechamentoRealizado, setFechamentoRealizado] = useState(false);
    const [preFechamentoRealizado, setPreFechamentoRealizado] = useState(false);

    // Auth
    const username = sessionStorage.getItem("username") || localStorage.getItem("username") || "sistema";
    const [origemUsuario, setOrigemUsuario] = useState(sessionStorage.getItem("local") || null);
    const [userTipo, setUserTipo] = useState("");
    const isGestor = userTipo.toLowerCase() === "gestor";
    const dataTrabalho = getDataTrabalho();

    useEffect(() => {
        const fetchDados = async () => {
             setLoading(true);
             try {
                // Origem e Tipo do usuário
                let currentOrigem = origemUsuario;
                if (!currentOrigem) {
                    const resUser = await axios.get(`${API_BASE_URL}/usuarios/origem/${username}`);
                    currentOrigem = resUser.data.origem;
                    setOrigemUsuario(currentOrigem);
                    sessionStorage.setItem("local", currentOrigem);
                }

                // Buscar tipo do usuário
                try {
                    const resPerfil = await axios.get(`${API_BASE_URL}/usuarios/perfil/${username}`);
                    setUserTipo(resPerfil.data?.tipo || "");
                } catch (err) {
                    console.error("Erro ao buscar tipo do usuário:", err);
                }

                // Devolucoes
                const resDev = await axios.get(`${API_BASE_URL}/devolucoes`);
                const filtras = resDev.data.filter(d => d.origem === currentOrigem);
                setDevolucoes(filtras);

                // Verificar fechamento
                axios.post(`${API_BASE_URL}/saldos/fechados`, {
                    data: dataTrabalho,
                    local: currentOrigem
                })
                .then(res => setFechamentoRealizado(res.data?.fechado || false))
                .catch(err => console.error("Erro ao verificar fechamento:", err));

                // Verificar pré-fechamento
                axios.get(`${API_BASE_URL}/pre-fechamento`, {
                    params: { data: dataTrabalho, local: currentOrigem }
                })
                .then(res => setPreFechamentoRealizado(res.data?.existe || false))
                .catch(err => console.error("Erro ao verificar pré-fechamento:", err));

             } catch (err) {
                 console.error(err);
             } finally {
                 setLoading(false);
             }
        };
        fetchDados();
    }, [username]);

    const showSnackbar = (message, severity = "info") => {
        setSnackbar({ open: true, message, severity });
    };

    // --- Actions ---

    const handleVisualizar = async (dev) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/devolucoes/${dev.id}`);
            const { devolucao, itens } = res.data;
            setDevolucaoSelecionada(devolucao);
            setItensDevolucao(itens);
            setModalVisualizacaoOpen(true);
        } catch(err) {
            console.error(err);
            showSnackbar("Erro ao carregar detalhes.", "error"); 
        }
    };

    const handleReimprimir = async (dev) => {
        try {
             showSnackbar("Enviando para impressão...", "info");
             const res = await axios.get(`${API_BASE_URL}/devolucoes/${dev.id}`);
             const { devolucao, itens } = res.data;

             const payload = {
                numero: devolucao.numero,
                origem: devolucao.origem,
                cliente: devolucao.cliente_nome || devolucao.cliente,
                produtos: itens.map(p => ({
                    cod_produto: p.cod_produto,
                    descricao: p.descricao,
                    quantidade: Number(p.validacao_convertida ?? p.quantidade ?? 0),
                    unidade: p.unidade || ""
                })),
                data: new Date().toLocaleDateString("pt-BR"),
                hora: new Date().toLocaleTimeString("pt-BR"),
                usuario: devolucao.usuario
             };

             // Tenta endpoint central primeiro
            try {
                await axios.post(`${API_BASE_URL}/imprimir-devolucao-termica`, payload);
                showSnackbar("Impressão enviada com sucesso!", "success");
            } catch {
                 // Fallback local
                 await axios.post("http://localhost:3005/imprimir-devolucao-termica", payload, { timeout: 8000 });
                 showSnackbar("Impressão enviada (agente local).", "success");
            }

        } catch(err) {
            console.error(err);
            showSnackbar("Erro ao reimprimir.", "error");
        }
    };

    const handleDelete = async () => {
        if (!devolucaoParaDeletar) return;
        try {
            await axios.delete(`${API_BASE_URL}/devolucoes/${devolucaoParaDeletar.id}`, {
                headers: {
                    "x-user": username
                }
            });
            setDevolucoes(prev => prev.filter(d => d.id !== devolucaoParaDeletar.id));
            showSnackbar("Devolução excluída.", "success");
            setModalDeleteOpen(false);
        } catch(err) {
            console.error(err);
            showSnackbar(err.response?.data?.erro || "Erro ao excluir.", "error");
        }
    };

    const handleLogout = () => {
        sessionStorage.clear();
        localStorage.removeItem("username");
        navigate("/login");
    };

    // Paginação
    const totalPaginas = Math.ceil(devolucoes.length / itensPorPagina);
    const dadosPaginados = devolucoes.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);

    return (
        <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">
             
             {/* Background Ambient */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-green-400/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
            </div>

            {/* Header Glassmorphic */}
            <header className="sticky top-0 z-50 px-4 py-4">
                <div className="w-full max-w-[98vw] mx-auto">
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-slate-700/50 px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/estoque")}>
                    <div className="bg-gradient-to-tr from-green-600 to-emerald-400 h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-600/20">
                        <span className="font-bold text-xl italic tracking-tighter">SF</span>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold leading-tight text-slate-800 dark:text-white">Devoluções</h1>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Estoque</span>
                    </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                    <Tooltip title="Alterar data na Home">
                        <div className="hidden md:flex items-center gap-2 mr-2 bg-transparent px-3 py-2 rounded-xl group border border-transparent">
                            <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-1.5 rounded-lg">
                            <span className="material-symbols-rounded text-lg">calendar_today</span>
                            </div>
                            <div className="flex flex-col items-start leading-none">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data</span>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                {dataTrabalho ? dayjs(dataTrabalho).add(12, 'hour').format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY')}
                            </span>
                            </div>
                        </div>
                    </Tooltip>

                    <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 hidden md:block"></div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex flex-col items-end">
                        <span className="text-sm font-bold text-slate-800 dark:text-white">{username}</span>
                        <div className="text-[10px] font-bold text-white bg-slate-800 dark:bg-slate-600 px-2 py-0.5 rounded flex items-center gap-1">
                            LOCAL: {origemUsuario} <span className="material-symbols-rounded text-[10px]">location_on</span>
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
                </div>
            </header>

            {/* Main Content */}
            <main className="w-full max-w-[98vw] mx-auto px-4 py-8 relative z-10">
                
                {/* Banner de Bloqueio */}
                {(fechamentoRealizado || preFechamentoRealizado) && (
                    <div className="mb-6 w-full bg-red-600 text-white text-center py-3 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-3 animate-pulse border-2 border-red-400">
                        <span className="material-symbols-rounded text-2xl">lock</span>
                        <span className="text-lg uppercase tracking-wider">Rotina Bloqueada - Estoque Fechado</span>
                    </div>
                )}
                
                {/* Actions Bar */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 animate-in slide-in-from-bottom-5 duration-500">
                     <button 
                        onClick={() => navigate("/estoque")} 
                        className="h-12 w-12 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white shadow-sm hover:shadow-md transition-all border border-slate-200 dark:border-slate-700"
                        title="Voltar"
                     >
                        <span className="material-symbols-rounded text-2xl">arrow_back</span>
                     </button>
                     
                     <div className="flex-grow"></div>

                     <button
                        onClick={() => navigate("/nova-devolucao")}
                        disabled={fechamentoRealizado || preFechamentoRealizado}
                        className="h-12 px-6 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-md shadow-green-600/20 flex items-center gap-2 text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-rounded text-lg">add_circle</span>
                        Nova Devolução
                    </button>
                </div>

                {/* Tabela Modernizada */}
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-500">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-slate-700/30 border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                    <th className="px-6 py-4">Nº</th>
                                    <th className="px-6 py-4">Cliente</th>
                                    <th className="px-6 py-4">Recebimento</th>
                                    <th className="px-6 py-4 text-center">Mov. Estoque</th>
                                    <th className="px-6 py-4">Data</th>
                                    <th className="px-6 py-4">Usuário</th>
                                    <th className="px-6 py-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {loading ? (
                                     <tr><td colSpan="7" className="p-8 text-center text-slate-500">Carregando devoluções...</td></tr>
                                ) : devolucoes.length === 0 ? (
                                     <tr><td colSpan="7" className="p-8 text-center text-slate-500">Nenhuma devolução encontrada.</td></tr>
                                ) : (
                                     dadosPaginados.map((dev) => (
                                         <tr key={dev.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                             <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{dev.numero}</td>
                                             <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-medium">{dev.cliente}</td>
                                             <td className="px-6 py-4 text-sm text-slate-500">{dev.origem}</td>
                                             <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border 
                                                    ${(dev.movimenta_estoque === 1 || dev.movimenta_estoque === "1" || dev.movimenta_estoque === true) 
                                                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                                                        : 'bg-slate-100 text-slate-600 border-slate-200'}`}
                                                >
                                                    {(dev.movimenta_estoque === 1 || dev.movimenta_estoque === "1" || dev.movimenta_estoque === true) ? "Sim" : "Não"}
                                                </span>
                                             </td>
                                             <td className="px-6 py-4 text-sm text-slate-500">
                                                {dayjs(dev.data_inclusao).add(12, 'hour').format('DD/MM/YYYY')}
                                             </td>
                                             <td className="px-6 py-4 text-sm text-slate-500">{dev.usuario}</td>
                                             <td className="px-6 py-4">
                                                 <div className="flex justify-center gap-1">
                                                     <button onClick={() => handleVisualizar(dev)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Visualizar">
                                                         <span className="material-symbols-rounded">visibility</span>
                                                     </button>
                                                     <button onClick={() => handleReimprimir(dev)} className="p-2 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors" title="Imprimir">
                                                         <span className="material-symbols-rounded">print</span>
                                                     </button>
                                                     {isGestor && (
                                                         <button 
                                                            onClick={() => { setDevolucaoParaDeletar(dev); setModalDeleteOpen(true); }} 
                                                            disabled={fechamentoRealizado || preFechamentoRealizado}
                                                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed" 
                                                            title="Excluir"
                                                         >
                                                             <span className="material-symbols-rounded">delete</span>
                                                         </button>
                                                     )}
                                                 </div>
                                             </td>
                                         </tr>
                                     ))
                                )}
                            </tbody>
                        </table>
                    </div>

                     {/* Pagination */}
                    {totalPaginas > 1 && (
                        <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50">
                            <button 
                                disabled={paginaAtual === 1}
                                onClick={() => setPaginaAtual(p => p - 1)}
                                className="px-4 py-2 text-sm font-bold text-slate-500 disabled:opacity-50 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Anterior
                            </button>
                            <span className="text-sm font-semibold text-slate-500">Página {paginaAtual} de {totalPaginas}</span>
                            <button 
                                disabled={paginaAtual === totalPaginas}
                                onClick={() => setPaginaAtual(p => p + 1)}
                                className="px-4 py-2 text-sm font-bold text-slate-500 disabled:opacity-50 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Próxima
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Modal Visualização */}
            <Modal isOpen={modalVisualizacaoOpen} onClose={() => setModalVisualizacaoOpen(false)} title="Detalhes da Devolução" maxWidth="lg">
                <div className="space-y-6">
                    {/* Header Info */}
                    <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                             <div>
                                 <span className="text-xs uppercase font-bold text-slate-400">Número</span>
                                 <p className="text-lg font-bold text-slate-700 dark:text-white">{devolucaoSelecionada?.numero}</p>
                             </div>
                             <div>
                                 <span className="text-xs uppercase font-bold text-slate-400">Data</span>
                                 <p className="font-medium text-slate-700 dark:text-white">{devolucaoSelecionada?.data_inclusao ? dayjs(devolucaoSelecionada.data_inclusao).add(12, 'hour').format('DD/MM/YYYY') : "-"}</p>
                             </div>
                             <div>
                                 <span className="text-xs uppercase font-bold text-slate-400">Tipo</span>
                                 <p className="font-medium text-slate-700 dark:text-white uppercase">{devolucaoSelecionada?.tipo_documento || "Bilhete"}</p>
                             </div>
                             <div>
                                 <span className="text-xs uppercase font-bold text-slate-400">Usuário</span>
                                 <p className="font-medium text-slate-700 dark:text-white">{devolucaoSelecionada?.usuario}</p>
                             </div>
                         </div>
                         <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                             <span className="text-xs uppercase font-bold text-slate-400">Cliente</span>
                             <p className="text-lg font-bold text-slate-700 dark:text-white">{devolucaoSelecionada?.cliente_nome || devolucaoSelecionada?.cliente}</p>
                         </div>
                    </div>

                    {/* Tabela Itens */}
                    <div>
                        <h4 className="font-bold text-slate-600 mb-3">Itens Devolvidos</h4>
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                             <table className="w-full text-sm text-left">
                                 <thead className="bg-slate-50 text-slate-500 font-bold">
                                     <tr>
                                         <th className="px-4 py-3">Código</th>
                                         <th className="px-4 py-3">Descrição</th>
                                         <th className="px-4 py-3">Qtd</th>
                                         <th className="px-4 py-3">Unid</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100">
                                     {itensDevolucao.map((item, idx) => (
                                         <tr key={idx}>
                                             <td className="px-4 py-3 font-mono text-slate-600">{item.cod_produto}</td>
                                             <td className="px-4 py-3 font-medium text-slate-700">{item.descricao}</td>
                                             <td className="px-4 py-3">{item.quantidade}</td>
                                             <td className="px-4 py-3 text-slate-500">{item.unidade}</td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Modal Delete */}
            <Modal isOpen={modalDeleteOpen} onClose={() => setModalDeleteOpen(false)} title="Confirmar Exclusão" maxWidth="sm">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto">
                        <span className="material-symbols-rounded text-3xl">delete_forever</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Tem certeza?</h3>
                    <p className="text-slate-500">
                        Você está prestes a excluir a devolução <b>{devolucaoParaDeletar?.numero}</b>. Esta ação não pode ser desfeita.
                    </p>
                    <div className="flex justify-center gap-3 pt-4">
                        <button onClick={() => setModalDeleteOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors">Cancelar</button>
                        <button onClick={handleDelete} className="px-6 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30 transition-all">
                            Sim, Excluir
                        </button>
                    </div>
                </div>
            </Modal>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <MuiAlert elevation={6} variant="filled" severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))} sx={{ borderRadius: 3 }}>
                {snackbar.message}
                </MuiAlert>
            </Snackbar>
        </div>
    );
};

export default Devolucao;
