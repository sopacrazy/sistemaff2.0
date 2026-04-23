import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from '../utils/apiConfig';
import { useTheme } from '../contexts/ThemeContext';
import FrotaHeader from "./components/FrotaHeader";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-4xl" }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200`}>
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center shrink-0 bg-white dark:bg-slate-800 z-10">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        {title}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>
                <div className="p-0 overflow-y-auto custom-scrollbar flex-1">
                    {children}
                </div>
            </div>
        </div>
    );
};

const ChecklistPage = () => {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const [completed, setCompleted] = useState([]);
    const [pending, setPending] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [selectedChecklist, setSelectedChecklist] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'

    // Polling ref to allow cleaning up interval
    const intervalRef = useRef(null);

    // Date Modal State (reused from FrotaHome logic but simplified for local date)
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);
    const [tempDate, setTempDate] = useState("");

    const fetchChecklists = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/frota/checklists?date=${selectedDate}`);
            if (response.data.completed) {
                setCompleted(response.data.completed);
                setPending(response.data.pending || []);
            } else {
                setCompleted(Array.isArray(response.data) ? response.data : []);
            }
        } catch (error) {
            console.error("Erro ao buscar checklists:", error);
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    useEffect(() => {
        fetchChecklists();
        intervalRef.current = setInterval(() => {
            fetchChecklists(true);
        }, 5000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [selectedDate]);

    const handleCardClick = (checklist) => {
        setSelectedChecklist(checklist);
        setIsModalOpen(true);
    };

    const formatDate = (dateString) => {
        if (!dateString) return "";
        return dayjs.utc(dateString).format('HH:mm');
    };

    // Date Picker Logic
    const openDateModal = () => {
        setTempDate(selectedDate);
        setIsDateModalOpen(true);
    };

    const saveDate = () => {
        if (!tempDate) return;
        setSelectedDate(tempDate);
        setIsDateModalOpen(false);
    };

    // Image Modal Logic within Details Modal
    const [selectedImage, setSelectedImage] = useState(null);

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
                <div className="p-6">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Data de Visualização:</label>
                    <input type="date" value={tempDate} onChange={(e) => setTempDate(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-green-500 outline-none transition-all dark:text-white dark:[color-scheme:dark]" />
                    <button onClick={saveDate} className="mt-6 w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all">Confirmar</button>
                </div>
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

            {/* Page Title & Actions */}
            <div className="max-w-7xl mx-auto px-6 mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <button onClick={() => navigate("/frota")} className="flex items-center gap-2 text-slate-500 hover:text-green-600 transition-colors font-semibold group mb-2 text-sm">
                        <span className="material-symbols-rounded group-hover:-translate-x-1 transition-transform text-lg">arrow_back</span>
                        Voltar para Menu
                    </button>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white leading-tight">Checklist Diário</h1>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Frota</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className="bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center shadow-sm">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-2 rounded-lg transition-all flex items-center ${viewMode === 'grid' ? 'bg-slate-100 dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                            title="Visualização em Grade"
                        >
                            <span className="material-symbols-rounded">grid_view</span>
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-2 rounded-lg transition-all flex items-center ${viewMode === 'list' ? 'bg-slate-100 dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                            title="Visualização em Lista"
                        >
                            <span className="material-symbols-rounded">view_list</span>
                        </button>
                    </div>

                    <button
                        onClick={() => navigate("/frota/problemas")}
                        className="bg-red-500 hover:bg-red-600 text-white px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-red-500/20 transition-all hover:-translate-y-1"
                    >
                        <span className="material-symbols-rounded">warning</span>
                        Ver Problemas
                    </button>
                </div>
            </div>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-6 py-6 space-y-8">

                {/* Pending Section */}
                {pending.length > 0 && (
                    <div className="animate-in slide-in-from-bottom-2 duration-500">
                        <h2 className="text-lg font-bold text-slate-600 dark:text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-wide">
                            <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded text-xs font-black ring-1 ring-amber-500/20">{pending.length}</span>
                            Pendentes
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {pending.map((item, idx) => (
                                <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-l-4 border-slate-100 dark:border-slate-700 border-l-amber-500 shadow-sm opacity-80 hover:opacity-100 transition-opacity">
                                    <div className="flex justify-between items-start">
                                        <div className="font-bold text-lg text-slate-800 dark:text-white">{item.veiculo_placa}</div>
                                        <span className="material-symbols-rounded text-amber-500 text-sm" title="Aguardando Checklist">schedule</span>
                                    </div>
                                    <p className="text-xs text-slate-400 font-bold mt-1">NÃO INICIADO</p>
                                    {item.ultimo_motorista && (
                                        <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1">
                                            <span className="material-symbols-rounded text-xs">person</span>
                                            {item.ultimo_motorista}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Completed Section */}
                <div>
                    <h2 className="text-lg font-bold text-slate-600 dark:text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-wide">
                        <span className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded text-xs font-black ring-1 ring-green-500/20">{completed.length}</span>
                        Realizados
                    </h2>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
                            <p className="text-slate-500 font-medium">Atualizando...</p>
                        </div>
                    ) : completed.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 border-dashed">
                            <p className="text-slate-500 text-sm">Nenhum checklist realizado ainda.</p>
                        </div>
                    ) : (
                        <>
                            {/* Lógica de Renderização Baseada no ViewMode e Sorting */}
                            {(() => {
                                // Ordenação: Problemas primeiro
                                const sorted = [...completed].sort((a, b) => {
                                    if (a.hasIssues && !b.hasIssues) return -1;
                                    if (!a.hasIssues && b.hasIssues) return 1;
                                    return 0; // Mantém ordem original (normalmente por data DESC se a API mandar)
                                });

                                if (viewMode === 'grid') {
                                    return (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                            {sorted.map((checklist) => (
                                                <div
                                                    key={checklist.id}
                                                    onClick={() => handleCardClick(checklist)}
                                                    className={`group bg-white dark:bg-slate-800 rounded-xl p-4 border shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden ${checklist.hasIssues ? 'border-red-200 dark:border-red-900/50' : 'border-slate-200 dark:border-slate-700'}`}
                                                >
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm ${checklist.hasIssues ? 'bg-red-50 dark:bg-red-900/20 text-red-600' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                                                                {checklist.veiculo_placa ? checklist.veiculo_placa.slice(0, 3) : '---'}
                                                            </div>
                                                            <div>
                                                                <h3 className="font-bold text-base text-slate-800 dark:text-white leading-tight">{checklist.veiculo_placa}</h3>
                                                                <p className="text-[10px] text-slate-500 font-bold uppercase">{checklist.nome_motorista ? checklist.nome_motorista.split(' ')[0] : checklist.motorista_id}</p>
                                                            </div>
                                                        </div>
                                                        {checklist.hasIssues ? (
                                                            <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Problema</span>
                                                        ) : (
                                                            <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">OK</span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                                                            <span className="material-symbols-rounded text-sm">schedule</span>
                                                            {formatDate(checklist.data_hora)}
                                                        </div>
                                                        {checklist.ocorrencias && checklist.ocorrencias.length > 0 && (
                                                            <div className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-full">
                                                                <span className="material-symbols-rounded text-xs">photo_camera</span>
                                                                {checklist.ocorrencias.length}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                } else {
                                    // List View Table
                                    return (
                                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50 dark:bg-slate-700/50 text-xs text-slate-500 dark:text-slate-400 uppercase font-bold border-b border-slate-100 dark:border-slate-700">
                                                        <th className="px-4 py-3">Status</th>
                                                        <th className="px-4 py-3">Placa</th>
                                                        <th className="px-4 py-3">Horário</th>
                                                        <th className="px-4 py-3">Motorista</th>
                                                        <th className="px-4 py-3 text-center">Fotos</th>
                                                        <th className="px-4 py-3 text-right">Ação</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                    {sorted.map((checklist) => (
                                                        <tr
                                                            key={checklist.id}
                                                            onClick={() => handleCardClick(checklist)}
                                                            className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer text-sm"
                                                        >
                                                            <td className="px-4 py-3">
                                                                {checklist.hasIssues ? (
                                                                    <span className="inline-flex items-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                                                                        <span className="material-symbols-rounded text-[14px]">warning</span> Problema
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                                                                        <span className="material-symbols-rounded text-[14px]">check_circle</span> OK
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">
                                                                {checklist.veiculo_placa}
                                                            </td>
                                                            <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                                                                {formatDate(checklist.data_hora)}
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                                                {checklist.nome_motorista || checklist.motorista_id}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {checklist.ocorrencias && checklist.ocorrencias.length > 0 ? (
                                                                    <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded textxs font-bold">
                                                                        {checklist.ocorrencias.length}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-slate-300 text-xs">-</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <span className="text-blue-600 dark:text-blue-400 font-bold text-xs hover:underline">Ver</span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                }
                            })()}
                        </>
                    )}
                </div>
            </main>

            {/* Details Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={selectedChecklist ? `Checklist: ${selectedChecklist.veiculo_placa} - ${formatDate(selectedChecklist.data_hora)}` : "Detalhes"}
            >
                {selectedChecklist && (
                    <div className="p-6 space-y-8">
                        {/* Info Section */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                            <div>
                                <p className="text-xs text-slate-400 uppercase font-bold">Placa</p>
                                <p className="font-bold text-slate-800 dark:text-white text-lg">{selectedChecklist.veiculo_placa}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 uppercase font-bold">Motorista</p>
                                <p className="font-bold text-slate-800 dark:text-white text-md line-clamp-1">{selectedChecklist.nome_motorista || selectedChecklist.motorista_id}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 uppercase font-bold">Hora</p>
                                <p className="font-bold text-slate-800 dark:text-white text-lg">{formatDate(selectedChecklist.data_hora)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 uppercase font-bold">Código</p>
                                <p className="font-bold text-slate-800 dark:text-white text-lg">{selectedChecklist.codigo_motorista || '---'}</p>
                            </div>
                        </div>

                        {/* Photos Section */}
                        {selectedChecklist.ocorrencias && selectedChecklist.ocorrencias.length > 0 && (
                            <div className="animate-in slide-in-from-bottom-2 duration-300">
                                <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 text-lg border-b border-slate-200 dark:border-slate-700 pb-2">
                                    <span className="material-symbols-rounded text-red-500">photo_library</span>
                                    Fotos / Ocorrências
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {selectedChecklist.ocorrencias.map((foto, idx) => (
                                        <div
                                            key={idx}
                                            className="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm aspect-video bg-black/10 text-center cursor-zoom-in"
                                            onClick={() => setSelectedImage(foto.foto_url)}
                                        >
                                            {foto.foto_url ? (
                                                <img
                                                    src={foto.foto_url}
                                                    alt={`Ocorrência ${idx + 1}`}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = 'https://placehold.co/600x400?text=Erro+na+Imagem';
                                                    }}
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-slate-400 text-sm">Sem imagem</div>
                                            )}
                                            {foto.observacao && (
                                                <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm text-white p-2 text-xs">
                                                    {foto.observacao}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Answers Section */}
                        <div className="animate-in slide-in-from-bottom-4 duration-500">
                            <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 text-lg border-b border-slate-200 dark:border-slate-700 pb-2">
                                <span className="material-symbols-rounded text-blue-500">list_alt</span>
                                Respostas do Checklist
                            </h4>
                            <div className="space-y-2">
                                {selectedChecklist.respostas && selectedChecklist.respostas.length > 0 ? (
                                    selectedChecklist.respostas.map((resp, idx) => {
                                        const status = String(resp.status || '').toUpperCase();
                                        const isOk = status === 'OK' || status === 'C' || status === '1' || status === 'CONFORME';

                                        return (
                                            <div key={idx} className={`flex items-start gap-4 p-3 rounded-lg transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 text-sm ${!isOk ? 'bg-red-50 dark:bg-red-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}>
                                                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${isOk ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                <div className="flex-1">
                                                    <p className="font-semibold text-slate-800 dark:text-white">{resp.pergunta_texto || `Pergunta #${resp.pergunta_id}`}</p>
                                                    {resp.observacao && <p className="text-slate-600 dark:text-slate-300 text-xs mt-1 font-medium bg-white dark:bg-black/20 p-1 rounded inline-block">Obs: {resp.observacao}</p>}
                                                </div>
                                                <div className={`px-2 py-1 rounded text-xs font-bold ${isOk ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                                                    {resp.status || 'N/A'}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-slate-500 text-sm italic">Nenhuma resposta registrada.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default ChecklistPage;
