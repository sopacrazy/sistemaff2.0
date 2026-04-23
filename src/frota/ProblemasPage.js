import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from '../utils/apiConfig';
import { useTheme } from '../contexts/ThemeContext';
import FrotaHeader from "./components/FrotaHeader";
import Swal from 'sweetalert2';

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
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

const ProblemasPage = () => {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const [problemas, setProblemas] = useState([]);
    const [resolvidos, setResolvidos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    const [activeTab, setActiveTab] = useState('pendentes'); // pendentes, resolvidos
    const [expandedCards, setExpandedCards] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Date Modal Logic
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);
    const [tempDate, setTempDate] = useState("");

    const openDateModal = () => {
        setTempDate(selectedDate || dayjs().format('YYYY-MM-DD'));
        setIsDateModalOpen(true);
    };

    const saveDate = () => {
        if (!tempDate) return;
        setSelectedDate(tempDate);
        setIsDateModalOpen(false);
    };

    useEffect(() => {
        fetchProblemas();
    }, [selectedDate]);

    const fetchProblemas = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/frota/checklists?date=${selectedDate || 'all'}`);
            const list = response.data.completed || (Array.isArray(response.data) ? response.data : []);

            // comProblemas = Checklists that HAD problems originally
            const comProblemas = list.filter(c => c.hasIssues);

            // hasPendingIssues = Checklists with AT LEAST ONE unresolved item/photo
            setProblemas(comProblemas.filter(c => c.hasPendingIssues));

            // Resolvidos = Checklists with NO pending issues (everything resolved)
            setResolvidos(comProblemas.filter(c => !c.hasPendingIssues));

        } catch (error) {
            console.error("Erro ao buscar problemas:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleItem = async (itemId, currentResolved) => {
        try {
            await axios.post(`${API_BASE_URL}/frota/checklists/item/${itemId}/resolve`, {
                resolvido: !currentResolved
            });
            fetchProblemas(); // Refresh to update lists logic and UI
        } catch (error) {
            console.error("Erro ao resolver item:", error);
            Swal.fire('Erro', 'Não foi possível atualizar o item.', 'error');
        }
    };

    const handleTogglePhoto = async (photoId, currentResolved) => {
        try {
            await axios.post(`${API_BASE_URL}/frota/checklists/photo/${photoId}/resolve`, {
                resolvido: !currentResolved
            });
            fetchProblemas();
        } catch (error) {
            console.error("Erro ao resolver foto:", error);
            Swal.fire('Erro', 'Não foi possível atualizar a foto.', 'error');
        }
    };


    const formatDate = (dateString) => {
        if (!dateString) return "";
        return dayjs.utc(dateString).format('HH:mm');
    };

    // Image Preview State
    const [selectedImage, setSelectedImage] = useState(null);

    const displayList = activeTab === 'pendentes' ? problemas : resolvidos;

    // Reset page when tab changes
    useEffect(() => {
        setCurrentPage(1);
        setExpandedCards({}); // Optional: collapse all when switching tabs
    }, [activeTab]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = displayList.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(displayList.length / itemsPerPage);

    const toggleCard = (id) => {
        setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300 pb-20">
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />

            {/* Standard Frota Header */}
            <FrotaHeader
                date={selectedDate}
                onDateClick={openDateModal}
            />

            {/* Date Modal */}
            <Modal isOpen={isDateModalOpen} onClose={() => setIsDateModalOpen(false)} title="Alterar Data">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Data de Visualização:</label>
                <input type="date" value={tempDate} onChange={(e) => setTempDate(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-green-500 outline-none transition-all dark:text-white dark:[color-scheme:dark]" />
                <button onClick={saveDate} className="mt-6 w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-600/20">Confirmar Data</button>
                <button 
                    onClick={() => { setSelectedDate(''); setIsDateModalOpen(false); }} 
                    className="mt-3 w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 rounded-xl font-bold transition-all border border-transparent hover:border-slate-300 dark:hover:border-slate-500"
                >
                    Mostrar Todo o Histórico
                </button>
            </Modal>

            {/* Image Preview Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-zoom-out"
                    onClick={() => setSelectedImage(null)}
                >
                    <img
                        src={selectedImage}
                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
                        alt="Preview"
                    />
                    <button className="absolute top-4 right-4 text-white hover:text-gray-300 bg-white/10 rounded-full p-2">
                        <span className="material-symbols-rounded text-3xl">close</span>
                    </button>
                </div>
            )}

            {/* Page Header */}
            <div className="max-w-7xl mx-auto px-6 mt-6 flex flex-col md:flex-row items-start justify-between gap-6">
                <div>
                    <button onClick={() => navigate("/frota/checklist")} className="flex items-center gap-2 text-slate-500 hover:text-green-600 transition-colors font-semibold group mb-2 text-sm">
                        <span className="material-symbols-rounded group-hover:-translate-x-1 transition-transform text-lg">arrow_back</span>
                        Voltar para Checklist
                    </button>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white leading-tight flex items-center gap-2">
                        <span className={`material-symbols-rounded ${activeTab === 'pendentes' ? 'text-red-500' : 'text-green-500'}`}>
                            {activeTab === 'pendentes' ? 'report_problem' : 'check_circle'}
                        </span>
                        {activeTab === 'pendentes' ? 'Problemas em Aberto' : 'Problemas Resolvidos'}
                    </h1>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">
                        Gestão de Não Conformidades
                    </p>
                </div>

                {/* Tabs */}
                <div className="bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 flex shadow-sm">
                    <button
                        onClick={() => setActiveTab('pendentes')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'pendentes' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                        <span className="material-symbols-rounded text-lg">warning</span>
                        Pendentes
                        <span className="ml-1 bg-red-100 dark:bg-red-800 text-red-700 dark:text-white text-xs px-1.5 py-0.5 rounded-md">{problemas.length}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('resolvidos')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'resolvidos' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                        <span className="material-symbols-rounded text-lg">task_alt</span>
                        Resolvidos
                        <span className="ml-1 bg-green-100 dark:bg-green-800 text-green-700 dark:text-white text-xs px-1.5 py-0.5 rounded-md">{resolvidos.length}</span>
                    </button>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
                        <p className="text-slate-500 font-medium">Analisando frota...</p>
                    </div>
                ) : displayList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 border-dashed">
                        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4">
                            <span className="material-symbols-rounded text-4xl text-slate-300">
                                {activeTab === 'pendentes' ? 'sentiment_satisfied' : 'history'}
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">
                            {activeTab === 'pendentes' ? 'Tudo Limpo!' : 'Histórico Vazio'}
                        </h3>
                        <p className="text-slate-500 text-sm mt-1">
                            {activeTab === 'pendentes'
                                ? 'Nenhum problema pendente para esta data.'
                                : 'Nenhum problema marcado como resolvido ainda.'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 gap-4">
                            {currentItems.map((checklist) => (
                                <div key={checklist.id} className={`bg-white dark:bg-slate-800 rounded-2xl border ${!checklist.hasPendingIssues ? 'border-green-200 dark:border-green-900' : 'border-slate-200 dark:border-slate-700'} shadow-sm overflow-hidden transition-all duration-300`}>
                                    {/* Header do Card */}
                                    <div 
                                        onClick={() => toggleCard(checklist.id)}
                                        className={`p-6 border-b ${!checklist.hasPendingIssues ? 'border-green-100 dark:border-green-900 bg-green-50/30 dark:bg-green-900/10' : 'border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'} flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors group`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-lg transition-transform group-hover:scale-105 ${!checklist.hasPendingIssues ? 'bg-green-600 text-white' : 'bg-slate-800 text-white'}`}>
                                                <span className="material-symbols-rounded text-3xl">local_shipping</span>
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                    {checklist.veiculo_placa}
                                                    {!checklist.hasPendingIssues && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">RESOLVIDO</span>}
                                                </h2>
                                                <p className="text-slate-500 dark:text-slate-400 flex items-center gap-1 text-sm inline-block mt-1">
                                                    <span className="material-symbols-rounded text-sm">person</span>
                                                    {checklist.nome_motorista || checklist.motorista_id} <span className="text-xs opacity-50">({checklist.codigo_motorista})</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-slate-400 dark:text-slate-500">{formatDate(checklist.data_hora)}</div>
                                            </div>
                                            <span className={`material-symbols-rounded text-3xl text-slate-400 transition-transform duration-300 ${expandedCards[checklist.id] ? 'rotate-180' : ''}`}>expand_more</span>
                                        </div>
                                    </div>

                                    {expandedCards[checklist.id] && (
                                        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-top-2 duration-300 border-t border-slate-100 dark:border-slate-700">
                                            {/* Coluna Fotos */}
                                            <div>
                                                <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                                    <span className="material-symbols-rounded text-red-500">photo_library</span>
                                                    Evidências Fotográficas
                                                </h4>
                                                {checklist.ocorrencias && checklist.ocorrencias.length > 0 ? (
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {checklist.ocorrencias.map((foto, idx) => (
                                                            <div
                                                                key={idx}
                                                                className={`relative group rounded-xl overflow-hidden border shadow-sm transition-all ${foto.resolvido ? 'border-green-500/50 ring-2 ring-green-500/20' : 'border-slate-200 dark:border-slate-700'}`}
                                                            >
                                                                <div
                                                                    className="aspect-video cursor-zoom-in relative"
                                                                    onClick={(e) => {
                                                                        if (!e.target.closest('button')) setSelectedImage(foto.foto_url)
                                                                    }}
                                                                >
                                                                    <img
                                                                        src={foto.foto_url}
                                                                        className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${foto.resolvido ? 'grayscale-[0.5]' : ''}`}
                                                                        onError={(e) => {
                                                                            e.target.onerror = null;
                                                                            e.target.parentElement.innerHTML = `
                                                                                <div class="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-100 dark:bg-slate-700">
                                                                                    <span class="material-symbols-rounded text-3xl mb-1">broken_image</span>
                                                                                    <span class="text-xs">Indisponível</span>
                                                                                </div>
                                                                            `;
                                                                        }}
                                                                        alt="Ocorrência"
                                                                    />

                                                                    {/* Overlay de Status (Se resolvido) */}
                                                                    {foto.resolvido && (
                                                                        <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center pointer-events-none">
                                                                            <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                                                                                <span className="material-symbols-rounded text-sm">check_circle</span>
                                                                                RESOLVIDO
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {foto.observacao && (
                                                                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent text-white text-xs pt-6 pointer-events-none">
                                                                        <p className="line-clamp-2">{foto.observacao}</p>
                                                                    </div>
                                                                )}

                                                                {/* Botão de Ação Melhorado */}
                                                                <div className="absolute top-2 right-2 z-10">
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleTogglePhoto(foto.id, foto.resolvido); }}
                                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg shadow-sm backdrop-blur-md transition-all font-bold text-xs ${foto.resolvido
                                                                                ? 'bg-white/90 text-slate-600 hover:bg-amber-100 hover:text-amber-700 border border-slate-200'
                                                                                : 'bg-white/90 text-slate-700 hover:bg-green-600 hover:text-white border border-slate-200 hover:border-green-600'
                                                                            }`}
                                                                    >
                                                                        <span className="material-symbols-rounded text-sm">
                                                                            {foto.resolvido ? 'undo' : 'check_circle'}
                                                                        </span>
                                                                        {foto.resolvido ? 'Desfazer' : 'Resolver'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-8 text-center border border-dashed border-slate-300 dark:border-slate-700">
                                                        <span className="text-slate-400 text-sm">Sem fotos registradas</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Coluna Itens Reprovados */}
                                            <div>
                                                <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                                    <span className="material-symbols-rounded text-amber-500">assignment_late</span>
                                                    Itens Não Conformes
                                                </h4>
                                                <div className="space-y-3">
                                                    {checklist.respostas && checklist.respostas.filter(r => {
                                                        const s = String(r.status || '').toUpperCase();
                                                        return s !== 'OK' && s !== 'C' && s !== '1' && s !== 'CONFORME';
                                                    }).length > 0 ? (
                                                        checklist.respostas.filter(r => {
                                                            const s = String(r.status || '').toUpperCase();
                                                            return s !== 'OK' && s !== 'C' && s !== '1' && s !== 'CONFORME';
                                                        }).map((resp, idx) => (
                                                            <div
                                                                key={idx}
                                                                className={`border p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${resp.resolvido
                                                                    ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-900 opacity-80'
                                                                    : 'bg-white dark:bg-slate-800 border-red-100 dark:border-red-900/40 shadow-sm'
                                                                    }`}
                                                            >
                                                                <div className="flex items-start gap-4">
                                                                    <div className={`mt-1 p-2 rounded-full shrink-0 ${resp.resolvido
                                                                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                                                        : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                                                        }`}>
                                                                        <span className="material-symbols-rounded text-xl">
                                                                            {resp.resolvido ? 'check' : 'warning'}
                                                                        </span>
                                                                    </div>
                                                                    <div>
                                                                        <p className={`font-bold text-base ${resp.resolvido ? 'text-slate-600 dark:text-slate-400 line-through decoration-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                                                            {resp.pergunta_texto || `Item #${resp.pergunta_id}`}
                                                                        </p>
                                                                        {resp.observacao && <p className="text-slate-500 text-xs mt-1 italic">Obs: {resp.observacao}</p>}
                                                                        <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-md uppercase tracking-wide ${resp.resolvido
                                                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                                            }`}>
                                                                            {resp.status}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <button
                                                                    onClick={() => handleToggleItem(resp.id, resp.resolvido)}
                                                                    className={`shrink-0 h-10 px-5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm ${resp.resolvido
                                                                        ? 'bg-white border-2 border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300'
                                                                        : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-green-600/20 active:scale-95'
                                                                        }`}
                                                                >
                                                                    <span className="material-symbols-rounded text-lg">
                                                                        {resp.resolvido ? 'undo' : 'check_circle'}
                                                                    </span>
                                                                    {resp.resolvido ? 'Desfazer' : 'Resolver'}
                                                                </button>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900 text-green-700 dark:text-green-300 text-sm flex items-center gap-2">
                                                            <span className="material-symbols-rounded">check</span>
                                                            Apenas fotos foram registradas (Itens OK).
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Pagination Controls */}
                        {displayList.length > itemsPerPage && (
                            <div className="flex justify-center items-center gap-2 mt-8">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <span className="material-symbols-rounded">chevron_left</span>
                                </button>
                                <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                                    Página {currentPage} de {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <span className="material-symbols-rounded">chevron_right</span>
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default ProblemasPage;
