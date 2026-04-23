import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import Swal from "sweetalert2";
import useEntregas from "./hooks/useEntregas";
import { API_BASE_URL } from './utils/apiConfig';
import jsPDF from "jspdf";
import "jspdf-autotable";
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("pt-br");

const TZ = "America/Sao_Paulo";

// --- COMPONENTES REUTILIZÁVEIS ---

const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-md" }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 custom-scrollbar relative flex flex-col`}>
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <span className="material-symbols-rounded block">close</span>
          </button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

// Modal Específico para Imagem (Tela Cheia)
const ImageModal = ({ isOpen, onClose, imageUrl }) => {
  const [rotation, setRotation] = useState(-90);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setRotation(-90);
      setZoom(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex flex-col bg-black/95 animate-in fade-in duration-200">
      {/* Toolbar */}
      <div className="flex justify-between items-center p-4 bg-black/50 backdrop-blur-md absolute top-0 left-0 right-0 z-10">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          <span className="material-symbols-rounded">image</span> Visualização
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-800/80 rounded-lg p-1">
            <button onClick={() => setRotation(r => r - 90)} className="p-2 text-white hover:bg-slate-700 rounded-md transition"><span className="material-symbols-rounded">rotate_left</span></button>
            <button onClick={() => setRotation(r => r + 90)} className="p-2 text-white hover:bg-slate-700 rounded-md transition"><span className="material-symbols-rounded">rotate_right</span></button>
            <div className="w-[1px] h-6 bg-slate-600 mx-1"></div>
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="p-2 text-white hover:bg-slate-700 rounded-md transition"><span className="material-symbols-rounded">zoom_out</span></button>
            <span className="text-xs font-mono text-slate-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="p-2 text-white hover:bg-slate-700 rounded-md transition"><span className="material-symbols-rounded">zoom_in</span></button>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors">
            <span className="material-symbols-rounded block text-2xl">close</span>
          </button>
        </div>
      </div>

      {/* Image Area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative" onWheel={(e) => {
        if (e.deltaY < 0) setZoom(z => Math.min(3, z + 0.1));
        else setZoom(z => Math.max(0.5, z - 0.1));
      }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Preview"
            className="transition-transform duration-200 ease-out object-contain max-h-[85vh] max-w-[90vw]"
            style={{ transform: `rotate(${rotation}deg) scale(${zoom})` }}
          />
        ) : (
          <div className="text-white">Imagem indisponível</div>
        )}
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const styles = {
    'CONCLUIDA': 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    'PENDENTE': 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    'EM ROTA': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    'DEFAULT': 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
  };
  const style = styles[status] || styles['DEFAULT'];

  return (
    <span className={`px-2 py-1 rounded-md text-xs font-bold border uppercase ${style}`}>
      {status || 'N/A'}
    </span>
  );
};

// Modal da Linha do Tempo
// Modal de Ajuste de Horários (ADM)
const AdjustmentModal = ({ isOpen, onClose, rota, onSave, onOpenImage }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const fetchFullData = useCallback(async () => {
    if (!rota) return;
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/rota-completa-ajuste`, {
        params: {
          codigo_rota: rota.ZH_CODIGO,
          data_ref: dayjs(rota.ZB_DTENTRE).format('YYYY-MM-DD')
        }
      });
      setData(response.data);
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível carregar os detalhes da rota.' });
    } finally {
      setIsLoading(false);
    }
  }, [rota]);

  useEffect(() => {
    if (isOpen) fetchFullData();
  }, [isOpen, fetchFullData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        codigo_rota: rota.ZH_CODIGO,
        data_ref: dayjs(rota.ZB_DTENTRE).format('YYYY-MM-DD'),
        inicio_rota: data.logs.find(l => l.acao === 'INICIO')?.data_hora,
        inicio_km: data.logs.find(l => l.acao === 'INICIO')?.km,
        fim_rota: data.logs.find(l => l.acao === 'ENCERRAR')?.data_hora,
        fim_km: data.logs.find(l => l.acao === 'ENCERRAR')?.km,
        entregas: data.entregas.map(e => ({
          id: e.id,
          chegada_em: e.chegada_em,
          concluido_em: e.concluido_em
        })),
        paradas: data.paradas.map(p => ({
          id: p.id,
          hora_inicio: p.hora_inicio,
          hora_fim: p.hora_fim
        })),
        username: localStorage.getItem('username') || sessionStorage.getItem('username') || 'ADM'
      };

      const response = await axios.post(`${API_BASE_URL}/atualizar-rota-tempos`, payload);
      if (response.data.success) {
        Swal.fire({ icon: 'success', title: 'Sucesso', text: 'Horários atualizados!', timer: 1500, showConfirmButton: false });
        onSave();
        onClose();
      }
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Erro', text: 'Erro ao salvar alterações.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteParada = async (paradaId) => {
    const confirm = await Swal.fire({
      title: 'Excluir Parada?',
      text: "Esta ação apagará o registro desta parada e sua foto permanentemente.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Sim, Excluir',
      cancelButtonText: 'Cancelar'
    });

    if (confirm.isConfirmed) {
      try {
        const response = await axios.delete(`${API_BASE_URL}/excluir-parada/${paradaId}`, {
          params: {
            codigo_rota: rota.ZH_CODIGO,
            data_ref: dayjs(rota.ZB_DTENTRE).format('YYYY-MM-DD')
          }
        });
        if (response.data.success) {
          setData(prev => ({
            ...prev,
            paradas: prev.paradas.filter(p => p.id !== paradaId)
          }));
          Swal.fire({ icon: 'success', title: 'Sucesso', text: 'Parada removida!', timer: 1500, showConfirmButton: false });
        }
      } catch (error) {
        console.error(error);
        Swal.fire({ icon: 'error', title: 'Erro', text: error.response?.data?.error || 'Erro ao excluir parada.' });
      }
    }
  };

  const handleFecharRota = async () => {
    const confirm = await Swal.fire({
      title: 'Fechar Rota?',
      text: "Após o fechamento, não será mais possível alterar nenhum horário desta rota.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#10B981',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Sim, Encerrar Rota',
      cancelButtonText: 'Cancelar'
    });

    if (confirm.isConfirmed) {
      setIsClosing(true);
      try {
        const response = await axios.post(`${API_BASE_URL}/fechar-rota`, {
          codigo_rota: rota.ZH_CODIGO,
          data_ref: dayjs(rota.ZB_DTENTRE).format('YYYY-MM-DD'),
          username: localStorage.getItem('username')
        });
        if (response.data.success) {
          Swal.fire({ icon: 'success', title: 'Sucesso', text: 'Rota encerrada com sucesso!', timer: 2000, showConfirmButton: false });
          onSave();
          fetchFullData(); // Recarrega para aplicar o lock visual
        }
      } catch (error) {
        console.error(error);
        Swal.fire({ icon: 'error', title: 'Erro', text: error.response?.data?.error || 'Erro ao encerrar rota.' });
      } finally {
        setIsClosing(false);
      }
    }
  };

  const updateLog = (acao, value, isKm = false) => {
    setData(prev => {
      const exists = prev.logs.some(l => l.acao === acao);
      if (exists) {
        return {
          ...prev,
          logs: prev.logs.map(l => l.acao === acao ? { ...l, [isKm ? 'km' : 'data_hora']: value } : l)
        };
      } else {
        return {
          ...prev,
          logs: [...prev.logs, { acao, [isKm ? 'km' : 'data_hora']: value }]
        };
      }
    });
  };

  const updateEntrega = (id, field, value) => {
    setData(prev => ({
      ...prev,
      entregas: prev.entregas.map(e => e.id === id ? { ...e, [field]: value } : e)
    }));
  };

  const updateParada = (id, field, value) => {
    setData(prev => ({
      ...prev,
      paradas: prev.paradas.map(p => p.id === id ? { ...p, [field]: value } : p)
    }));
  };

  const isClosed = data?.logs?.some(l => l.acao === 'FECHADA');
  const isAllFilled = data?.entregas?.every(e => e.chegada_em && e.concluido_em);

  if (!isOpen || !rota) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Ajuste de Rota - #${rota.ZH_ROTA}`} maxWidth="max-w-4xl">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <span className="material-symbols-rounded animate-spin text-4xl text-blue-500">refresh</span>
          <p className="mt-4 font-bold text-slate-500">Carregando detalhes...</p>
        </div>
      ) : data ? (
        <div className="space-y-8 pb-4">
          {/* Header Rota */}
          <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white p-2 rounded-lg">
                <span className="material-symbols-rounded">local_shipping</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white uppercase text-sm">{rota.ZH_NOME}</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{rota.ZH_NOMMOT} | {rota.ZH_VEICULO}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
               <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase">Rota #{rota.ZH_ROTA}</span>
               <span className="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 px-3 py-1 rounded-full text-[10px] font-bold uppercase">{dayjs(rota.ZB_DTENTRE).format('DD/MM/YYYY')}</span>
            </div>
          </div>

          {/* Seção 1: Rota Master */}
          <section className="space-y-4">
             <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-rounded text-blue-500">settings</span>
                <h5 className="font-bold text-slate-700 dark:text-slate-200 uppercase text-xs tracking-widest">Controle da Rota</h5>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 transition-all">
                   <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Início do Percurso</label>
                   <input 
                      type="datetime-local" 
                      readOnly={isClosed}
                      className={`w-full bg-slate-50 dark:bg-slate-900 border-none rounded-lg font-bold text-sm dark:text-white dark:[color-scheme:dark] ${isClosed ? 'opacity-60 cursor-not-allowed' : ''}`}
                      value={data.logs.find(l => l.acao === 'INICIO')?.data_hora ? dayjs.utc(data.logs.find(l => l.acao === 'INICIO').data_hora).format('YYYY-MM-DDTHH:mm') : ''}
                      onChange={(e) => updateLog('INICIO', e.target.value)}
                   />
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">KM Inicial</label>
                      <input 
                         type="number" 
                         readOnly={isClosed}
                         placeholder="0"
                         className={`w-full bg-slate-50 dark:bg-slate-900 border-none rounded-lg font-bold text-sm dark:text-white ${isClosed ? 'opacity-60 cursor-not-allowed' : ''}`}
                         value={data.logs.find(l => l.acao === 'INICIO')?.km || ''}
                         onChange={(e) => updateLog('INICIO', e.target.value, true)}
                      />
                    </div>
                </div>
                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-red-400 transition-all">
                   <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Fim do Percurso</label>
                   <input 
                      type="datetime-local" 
                      readOnly={isClosed}
                      className={`w-full bg-slate-50 dark:bg-slate-900 border-none rounded-lg font-bold text-sm dark:text-white dark:[color-scheme:dark] ${isClosed ? 'opacity-60 cursor-not-allowed' : ''}`}
                      value={data.logs.find(l => l.acao === 'ENCERRAR')?.data_hora ? dayjs.utc(data.logs.find(l => l.acao === 'ENCERRAR').data_hora).format('YYYY-MM-DDTHH:mm') : ''}
                      onChange={(e) => updateLog('ENCERRAR', e.target.value)}
                   />
                   <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                     <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">KM Final</label>
                     <input 
                        type="number" 
                        readOnly={isClosed}
                        placeholder="0"
                        className={`w-full bg-slate-50 dark:bg-slate-900 border-none rounded-lg font-bold text-sm dark:text-white ${isClosed ? 'opacity-60 cursor-not-allowed' : ''}`}
                        value={data.logs.find(l => l.acao === 'ENCERRAR')?.km || ''}
                        onChange={(e) => updateLog('ENCERRAR', e.target.value, true)}
                     />
                   </div>
                </div>
             </div>
          </section>

          {/* Seção 2: Entregas */}
          <section className="space-y-4">
             <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-rounded text-green-500">home_work</span>
                <h5 className="font-bold text-slate-700 dark:text-slate-200 uppercase text-xs tracking-widest">Entregas e Clientes</h5>
             </div>
             <div className="space-y-3">
                {data.entregas.map((entrega) => (
                  <div key={entrega.id} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center gap-4 hover:shadow-md transition-all">
                     <div className="flex-1">
                        <h6 className="font-bold text-slate-800 dark:text-white text-sm uppercase">{entrega.ZB_NOMCLI}</h6>
                        <span className="text-[10px] font-bold text-slate-400">BILHETE: {entrega.ZB_NUMSEQ}</span>
                     </div>
                     <div className="flex gap-2">
                        <div className="flex-1 md:w-44">
                           <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Chegada</label>
                           <input 
                              type="datetime-local" 
                              readOnly={isClosed}
                              className={`w-full bg-slate-50 dark:bg-slate-900 border-none rounded-lg font-bold text-xs dark:text-white p-2 dark:[color-scheme:dark] ${isClosed ? 'opacity-60 cursor-not-allowed' : ''}`}
                              value={entrega.chegada_em ? dayjs.utc(entrega.chegada_em).format('YYYY-MM-DDTHH:mm') : ''}
                              onChange={(e) => updateEntrega(entrega.id, 'chegada_em', e.target.value)}
                           />
                        </div>
                        <div className="flex-1 md:w-44">
                           <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Conclusão</label>
                           <input 
                              type="datetime-local" 
                              readOnly={isClosed}
                              className={`w-full bg-slate-50 dark:bg-slate-900 border-none rounded-lg font-bold text-xs dark:text-white p-2 dark:[color-scheme:dark] ${isClosed ? 'opacity-60 cursor-not-allowed' : ''}`}
                              value={entrega.concluido_em ? dayjs.utc(entrega.concluido_em).format('YYYY-MM-DDTHH:mm') : ''}
                              onChange={(e) => updateEntrega(entrega.id, 'concluido_em', e.target.value)}
                           />
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          </section>

          {/* Seção 3: Paradas (Daily Logs) */}
          <section className="space-y-4">
             <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-rounded text-amber-500">warning</span>
                <h5 className="font-bold text-slate-700 dark:text-slate-200 uppercase text-xs tracking-widest">Paradas no Trajeto (Daily Logs)</h5>
             </div>
             {data.paradas.length === 0 ? (
                <div className="p-6 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                   <p className="text-slate-400 text-sm italic">Nenhuma parada registrada pelo motorista.</p>
                </div>
             ) : (
                <div className="space-y-3">
                   {data.paradas.map((parada) => (
                      <div key={parada.id} className="p-4 bg-amber-50/30 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-900/30 flex flex-col md:flex-row md:items-center gap-4">
                         <div className="flex-1">
                           <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                 <span className="material-symbols-rounded text-amber-600 text-sm">pause_circle</span>
                                 <h6 className="font-bold text-amber-800 dark:text-amber-400 text-sm uppercase">{parada.local || 'PAUSA'}</h6>
                              </div>
                              {!isClosed && (
                                 <button 
                                    onClick={() => handleDeleteParada(parada.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                    title="Excluir Parada"
                                 >
                                    <span className="material-symbols-rounded text-lg">delete</span>
                                 </button>
                              )}
                           </div>
                           <span className="text-[10px] font-bold text-amber-600/60 uppercase">{parada.status || 'FINALIZADA'}</span>
                           {parada.foto_url && (
                              <div className="mt-2 group relative w-16 h-16 rounded-xl overflow-hidden border-2 border-amber-200 dark:border-amber-900/50 shadow-sm hover:border-amber-400 transition-all cursor-pointer" onClick={() => onOpenImage(parada.foto_url)}>
                                 <img src={parada.foto_url} alt="Foto da Parada" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                 <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="material-symbols-rounded text-white text-lg">zoom_in</span>
                                 </div>
                              </div>
                           )}
                        </div>
                        <div className="flex gap-2">
                           <div className="flex-1 md:w-44">
                              <label className="text-[9px] font-bold text-amber-600/60 uppercase mb-1 block">Início Parada</label>
                              <input 
                                 type="datetime-local" 
                                 readOnly={isClosed}
                                 className={`w-full bg-white dark:bg-slate-900 border-none rounded-lg font-bold text-xs dark:text-white p-2 dark:[color-scheme:dark] ${isClosed ? 'opacity-60 cursor-not-allowed' : ''}`}
                                 value={parada.hora_inicio ? dayjs.utc(parada.hora_inicio).format('YYYY-MM-DDTHH:mm') : ''}
                                 onChange={(e) => updateParada(parada.id, 'hora_inicio', e.target.value)}
                              />
                           </div>
                           <div className="flex-1 md:w-44">
                              <label className="text-[9px] font-bold text-amber-600/60 uppercase mb-1 block">Fim Parada</label>
                              <input 
                                 type="datetime-local" 
                                 readOnly={isClosed}
                                 className={`w-full bg-white dark:bg-slate-900 border-none rounded-lg font-bold text-xs dark:text-white p-2 dark:[color-scheme:dark] ${isClosed ? 'opacity-60 cursor-not-allowed' : ''}`}
                                 value={parada.hora_fim ? dayjs.utc(parada.hora_fim).format('YYYY-MM-DDTHH:mm') : ''}
                                 onChange={(e) => updateParada(parada.id, 'hora_fim', e.target.value)}
                              />
                           </div>
                        </div>
                      </div>
                   ))}
                </div>
             )}
          </section>

          {/* Footer Ações */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center sticky bottom-0 bg-white dark:bg-slate-800 pb-2">
             <div>
                {!isClosed && (
                   <button 
                      onClick={handleFecharRota}
                      disabled={!isAllFilled || isClosing}
                      title={!isAllFilled ? "Preencha todos os horários de todas as entregas para liberar o fechamento" : ""}
                      className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
                        isAllFilled 
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400" 
                        : "bg-slate-50 text-slate-300 cursor-not-allowed grayscale"
                      }`}
                   >
                      {isClosing ? (
                         <span className="material-symbols-rounded animate-spin">refresh</span>
                      ) : (
                         <span className="material-symbols-rounded">task_alt</span>
                      )}
                      Fechar Rota
                   </button>
                )}
                {isClosed && (
                   <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                      <span className="material-symbols-rounded">lock</span>
                      ROTA ENCERRADA
                   </div>
                )}
             </div>

             <div className="flex gap-3">
                <button 
                   onClick={onClose}
                   className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-bold transition-all"
                >
                   {isClosed ? 'Fechar' : 'Cancelar'}
                </button>
                {!isClosed && (
                   <button 
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
                   >
                      {isSaving ? (
                         <>
                            <span className="material-symbols-rounded animate-spin">refresh</span>
                            Salvando...
                         </>
                      ) : (
                         <>
                            <span className="material-symbols-rounded">save</span>
                            Salvar Alterações
                         </>
                      )}
                   </button>
                )}
             </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
};

const TimelineModal = ({ isOpen, onClose, rota }) => {
  if (!isOpen || !rota) return null;

  // Ordenar entregas concluídas ou em andamento (chegada registrada)
  const entregasOrdenadas = [...rota.entregas]
    .filter(e => e.hora_conclusao || e.chegada_em)
    .sort((a, b) => {
      const timeA = new Date(a.hora_conclusao || a.chegada_em);
      const timeB = new Date(b.hora_conclusao || b.chegada_em);
      return timeA - timeB;
    });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Linha do Tempo - Rota #${rota.ZH_ROTA}`} maxWidth="max-w-2xl">
      <div className="relative border-l-2 border-blue-500/30 ml-6 pl-8 space-y-8 py-4">
        {/* Rota Pronta */}
        {rota.hora_pronta && (
          <div className="relative animate-in slide-in-from-left duration-300">
            <div className="absolute -left-[41px] top-1.5 w-5 h-5 rounded-full bg-blue-500 border-4 border-white dark:border-slate-800 shadow-sm z-10"></div>
            <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
              <div className="flex items-center gap-3">
                <span className="material-symbols-rounded text-blue-600">task</span>
                <span className="font-bold text-blue-700 dark:text-blue-400 uppercase text-xs tracking-wider">Rota Pronta (Faturamento)</span>
              </div>
              <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-bold">
                {rota.hora_pronta ? dayjs.utc(rota.hora_pronta).format("HH:mm") : "--:--"}
              </span>
            </div>
          </div>
        )}

        {/* Início da Rota */}
        {rota.hora_inicio && (
          <div className="relative animate-in slide-in-from-left duration-300">
            <div className="absolute -left-[41px] top-1.5 w-5 h-5 rounded-full bg-green-500 border-4 border-white dark:border-slate-800 shadow-sm z-10"></div>
            <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/10 p-3 rounded-xl border border-green-100 dark:border-green-900/30">
              <div className="flex items-center gap-3">
                <span className="material-symbols-rounded text-green-600">play_circle</span>
                <span className="font-bold text-green-700 dark:text-green-400 uppercase text-xs tracking-wider">Início do Percurso</span>
              </div>
              <span className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-bold">
                {rota.hora_inicio ? dayjs.utc(rota.hora_inicio).format("HH:mm") : "--:--"}
              </span>
            </div>
          </div>
        )}

        {entregasOrdenadas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <span className="material-symbols-rounded text-4xl mb-2 opacity-30">pending_actions</span>
            <p className="italic text-center">Nenhuma entrega concluída nesta rota até o momento.</p>
          </div>
        ) : (
          entregasOrdenadas.map((entrega, index) => {
            const diffMinutos = entrega.chegada_em && !entrega.hora_conclusao 
              ? dayjs.utc().diff(dayjs.utc(entrega.chegada_em), 'minute') 
              : 0;
            const isAtrasado = diffMinutos > 30;

            return (
              <div key={index} className="relative animate-in slide-in-from-left duration-300" style={{ animationDelay: `${(index + 1) * 100}ms` }}>
                {/* Dot */}
                <div className={`absolute -left-[41px] top-1.5 w-5 h-5 rounded-full bg-white dark:bg-slate-800 border-4 ${isAtrasado ? 'border-red-500 animate-pulse' : 'border-blue-500'} shadow-sm z-10`}></div>

                <div className={`flex flex-col bg-white dark:bg-slate-800 p-4 rounded-2xl border ${isAtrasado ? 'border-red-400 bg-red-50/30' : 'border-slate-200'} dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500/50 transition-all group shadow-sm`}>
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase text-sm">
                          {entrega.ZB_NOMCLI}
                        </h4>
                        {isAtrasado && (
                          <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded animate-pulse flex items-center gap-1">
                            <span className="material-symbols-rounded text-[10px]">warning</span> ALERTA: {diffMinutos} MIN
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 tracking-wider">BILHETE: {entrega.ZB_NUMSEQ}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1 rounded-lg text-sm font-bold">
                        {entrega.hora_conclusao ? dayjs.utc(entrega.hora_conclusao).format("HH:mm") : "--:--"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded-md ${isAtrasado ? 'bg-red-100 dark:bg-red-900/40 text-red-600' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600'}`}>
                        <span className="material-symbols-rounded text-xs">schedule</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-0.5">Permanência</span>
                        <span className={`text-[11px] font-bold ${isAtrasado ? 'text-red-600' : 'text-slate-600 dark:text-slate-300'}`}>
                          {(() => {
                            if (!entrega.chegada_em) return "-- : --";
                            const fim = entrega.hora_conclusao ? dayjs.utc(entrega.hora_conclusao) : dayjs.utc();
                            const diff = fim.diff(dayjs.utc(entrega.chegada_em), 'minute');
                            if (diff < 0) return "0 min";
                            const h = Math.floor(diff / 60);
                            const m = diff % 60;
                            return h > 0 ? `${h}h ${m}min` : `${m} min`;
                          })()}
                          {isAtrasado && !entrega.hora_conclusao && " (AGUARDANDO)"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="bg-green-100 dark:bg-green-900/40 text-green-600 p-1 rounded-md">
                        <span className="material-symbols-rounded text-xs">done_all</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-0.5">Status</span>
                        <span className={`text-[11px] font-bold uppercase tracking-tighter ${entrega.ZH_STATUS === 'CONCLUIDA' ? 'text-green-600' : 'text-amber-500 animate-pulse'}`}>
                          {entrega.ZH_STATUS || 'PENDENTE'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Fim da Rota */}
        {rota.hora_fim && (
          <div className="relative animate-in slide-in-from-left duration-300" style={{ animationDelay: `${(entregasOrdenadas.length + 1) * 100}ms` }}>
            <div className="absolute -left-[41px] top-1.5 w-5 h-5 rounded-full bg-red-500 border-4 border-white dark:border-slate-800 shadow-sm z-10"></div>
            <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/10 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
              <div className="flex items-center gap-3">
                <span className="material-symbols-rounded text-red-600">stop_circle</span>
                <span className="font-bold text-red-700 dark:text-red-400 uppercase text-xs tracking-wider">Fim do Percurso</span>
              </div>
              <span className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-bold">
                {rota.hora_fim ? dayjs.utc(rota.hora_fim).format("HH:mm") : "--:--"}
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

const Gerenciador = () => {
  const navigate = useNavigate();

  // --- HEADER STATES ---
  const [username, setUsername] = useState("");
  const [local, setLocal] = useState("08");
  const [date, setDate] = useState(new Date());
  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [tempLocal, setTempLocal] = useState("");
  const [tempDate, setTempDate] = useState("");

  // --- CONTENT STATES ---
  const [pesquisa, setPesquisa] = useState("");
  const [filtro, setFiltro] = useState("bilhete");
  const [dataFiltro, setDataFiltro] = useState(dayjs());
  const [apenasSemFoto, setApenasSemFoto] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState(null); // null | 'pendente' | 'finalizado'

  // Custom Table Expansion State
  const [expandedRows, setExpandedRows] = useState([]);

  // Image Modal
  const [selectedImage, setSelectedImage] = useState(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Export Excel Modal
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [dataInicioExport, setDataInicioExport] = useState(dayjs().format('YYYY-MM-DD'));
  const [dataFimExport, setDataFimExport] = useState(dayjs().format('YYYY-MM-DD'));
  const [isExporting, setIsExporting] = useState(false);

  // Timeline Modal
  const [selectedRotaTimeline, setSelectedRotaTimeline] = useState(null);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);

  // Adjustment Modal
  const [selectedRotaAdjustment, setSelectedRotaAdjustment] = useState(null);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);

  // Auth & Permissions
  const [userPermissions, setUserPermissions] = useState({});
  const [userTipo, setUserTipo] = useState("");

  // Hook Data

  // Hook Data
  const { rotas, isLoading, isRefreshing, stats, refetch } = useEntregas(dataFiltro);

  // --- INITIALIZATION ---
  const fetchMyPermissions = async () => {
    try {
      const u = sessionStorage.getItem("username") || localStorage.getItem("username");
      if (!u) return;

      const userResp = await axios.get(`${API_BASE_URL}/usuarios`);
      const user = userResp.data.find(usr => usr.username?.toLowerCase() === u.toLowerCase());
      if (!user) return;

      setUserTipo(user.tipo || "");

      const permsResp = await axios.get(`${API_BASE_URL}/permissoes/usuario/${user.id}`);
      setUserPermissions(permsResp.data);
    } catch (e) {
      console.error("Erro ao carregar permissões:", e);
    }
  };

  useEffect(() => {
    const storedUser = sessionStorage.getItem("username") || localStorage.getItem("username");
    const storedLocal = sessionStorage.getItem("local") || localStorage.getItem("local");
    if (storedUser) setUsername(storedUser);
    if (storedLocal) setLocal(storedLocal);
    else if (!localStorage.getItem("local")) {
      localStorage.setItem("local", "08");
      setLocal("08");
    }

    fetchMyPermissions();
  }, []);

  // --- HEADER HANDLERS ---
  const handleLogout = () => { localStorage.clear(); sessionStorage.clear(); navigate("/login"); };
  const toggleDarkMode = () => document.documentElement.classList.toggle("dark");
  // BLOQUEADO: Troca de local só permitida na página Home (Painel de Controle)
  const openLocalModal = () => { alert("Para alterar o local, volte ao Painel de Controle (Home)."); };
  const saveLocal = () => { /* Bloqueado */ };

  const openDateModal = () => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    setTempDate(localDate.toISOString().split('T')[0]);
    setIsDateModalOpen(true);
  };
  const saveDate = () => {
    if (!tempDate) return;
    const [y, m, d] = tempDate.split('-');
    const newDate = new Date(y, m - 1, d, 12, 0, 0);
    setDate(newDate);
    setIsDateModalOpen(false);
  };

  // --- PAGE HANDLERS ---
  const toggleRow = (id) => {
    setExpandedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const handleClearFilters = () => {
    setPesquisa("");
    setDataFiltro(dayjs());
    setApenasSemFoto(false);
    setFiltro("bilhete");
    setFiltroStatus(null);
  };

  const openImage = (url) => {
    setSelectedImage(url);
    setIsImageModalOpen(true);
  };

  const openTimeline = (rota) => {
    setSelectedRotaTimeline(rota);
    setIsTimelineModalOpen(true);
  };

  const openAdjustment = (rota) => {
    // Agora verifica apenas a permissão explícita, sem bypass de Admin, a pedido do usuário.
    if (!userPermissions.FATURAMENTO_AJUSTAR_HORAS) {
      return Swal.fire({
        icon: "error",
        title: "Acesso Negado",
        text: "Você não tem permissão para ajustar horários. Entre em contato com o administrador.",
        confirmButtonColor: "#3085d6"
      });
    }
    setSelectedRotaAdjustment(rota);
    setIsAdjustmentModalOpen(true);
  };

  const handleResetFoto = useCallback(async (entrega) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/resetar-foto`, { entregaId: entrega.ZB_NUMSEQ });
      if (response.data.success) {
        Swal.fire({ icon: 'success', title: 'Sucesso', text: `Foto da entrega ${entrega.ZB_NUMSEQ} resetada!`, timer: 1500, showConfirmButton: false });
        refetch();
      }
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Erro', text: 'Erro ao resetar foto.' });
    }
  }, [refetch]);

  const showConfirmReset = (entrega) => {
    Swal.fire({
      title: 'Tem certeza?',
      text: `Deseja remover a foto da entrega ${entrega.ZB_NUMSEQ} e voltar para PENDENTE?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sim, remover',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) handleResetFoto(entrega);
    });
  };

  const generateDiarioBordo = async (rota) => {
    try {
      Swal.fire({
        title: 'Gerando Diário...',
        text: 'Buscando informações da rota.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const response = await axios.get(`${API_BASE_URL}/rota-completa-ajuste`, {
        params: {
          codigo_rota: rota.ZH_CODIGO,
          data_ref: dayjs.utc(rota.ZB_DTENTRE).format('YYYY-MM-DD')
        },
        timeout: 15000 // 15 segundos
      });
      
      Swal.update({
        title: 'Gerando Relatório...',
        text: 'Processando dados e gerando o PDF.',
      });

      const { logs, entregas, paradas, vehicle_info } = response.data;
      const vehicleInfo = vehicle_info || { tipo_desc: 'CAMINHÕES', modelo: '---' };
      
      const inicioLog = logs.find(l => l.acao === 'INICIO') || {};
      const fimLog = logs.find(l => l.acao === 'ENCERRAR') || {};
      
      const kmSaida = inicioLog.km_inicial || inicioLog.km || '---';
      const kmChegada = fimLog.km_final || fimLog.km || '---';
      
      let calcTotalKm = '---';
      if (!isNaN(parseFloat(kmSaida)) && !isNaN(parseFloat(kmChegada))) {
        calcTotalKm = (parseFloat(kmChegada) - parseFloat(kmSaida)).toFixed(1) + ' km';
      }

      const doc = new jsPDF('p', 'pt', 'a4');
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();

      // ÍCONES OUTLINE BASE64
      const iconDate = "data:image/png;base64,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";
      const iconUser = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAABuwAAAbsBOuzj4gAAABl0RVh0U29mdHdhcmUAd3d3Linape.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";
      const iconTruck = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAB2AAAAdgB+lymcgAAABl0RVh0U29mdHdhcmUAd3d3Linape.org5vuPBoAAASISklEQVR4nO2dpZjBRVFIDhb5wRRhGEMS4RiGxKgsGNKHGJoPAgRjCoRDH44oNGgxpNFNH44IsBXzAYFzQa9z2KwRjjluD2gNGoiKgsAVxRowgqgjjtw71Nl01Pd00vA23Xn1Tq9q1b554+fe65p04XGRkZGRkZGRktSht+je3jsQEvYlKV8ibhk5q16kM6MDi22+N5YKKvGnlNRRvGx/YK7MBRGFSlvFX4sw56ZfQVbZiDM/a0IhXYiTuxvBHC/0auCY4nG/HlOxQC1x34pRGT1MhETNWgAJsUuhjrGjFJHZjaKMGlrHoOhjZqwio4uZHCSxngekxu5KR7E6UM8FGfa1G+IzG6UcJLGeDGRk1WJXMxH0MUkrZKbZbatBPkt5mRvVatb3hC77fMblySRngz5O5D4rkbv6UY3yE8zyzCG/ix0g17uwe8Iuj3dcrx/fG5lMnTPtXrtdeyHVcKBpiF6eUGN8MSKGYglmF4hXE7BG+4N47vcfk02xI4UfpguDme7+pJeDN6QFs8b8FZFcaOxaO4Cs/g3VKDms0DxsfPaR/cno/jv0Bn8cX/YxAsZo5Q9xyDecUXW8EAP+CG2L5ZKP7uohUMAA/hdSHmLVYoALeMAXK4HH8Ij9dz8hdaxQCwHrfF9u1i0G/GbTBPP8zs5T0bhafEUXgAU5rRAN3xPADPVikjJ+QQs5vRAKuEvX1EDTIGCX8Azaf5EqF6MCrKzLVSEEySyzda1QC7yAywpxXY0/R2F+gQqiwzhCj6D1bicSytr2qpmYhLhRx/P+Elj6V4GNsq3dymEBBWCuWkJIvwSGyPxgsY14Ost3ARfo6fb8H5Kb5AJTqF5/pvMCzRPwAPxjlLsREX4oP4eQoWxHZ/HJMfWK6iMjeOORzfKlRZFgi1tguEktNf8drHUTG4v4LstMdau2+D7Xg19u/E47gY5+JWfB+vbVH4wWaWkp/0gKuxqciKn+JLPBetuSZackPRuBOEEnSXkFzMEwoX9cgtrsHp/usBV+A+wWOn47Wie7qE/GGC4AETcAROidcPlSiTVUqEhgrpZzdOKqPoLAUP6Vfxa6WnVCK0KvbdVOa+YUIMyAkGTDJSCQ9YLChfzFhME97+yhcTuhSWR/7cgZ+EF6wew3dllOsNM6PCW3GPsMTyj7OHxDkJf+kdJDzkrIl9S3Ae3sH7CZmDBS1CcKM0a3FJQsDIRH+SFSll1eP4vWjudbF/SqJvYQUZ2ztwmfLvCB0tvP+XfGdgi2DpJO1CsISX7B5PqqUTx+Eroba3P2bHc5dCcfQpHCzEijz5mPFhPIpZlkaBEQp/OB5bZtyMOG6rEtXXOrM6znVdmTGHCV6Sw5m1Trg0CvpMiKDFjFHYehbWOlkKrlVYBqeWuH6AkJfkhNhVc8Y7XAg2OaHKOk9YNpOFbW+rQu39wFonS8G+eDvOuR1342ycJmyb+XiwTfmdq1eME6JrTwFlub59t2iwwhZZ6tikDq5fTKewBb0pBJv1eFkISu0939ZQpgkVotXC1vuekB/0hSdmZGRkZGRkZDQv/wKuLYwEw4h4QQAAAABJRU5ErkJggg==";
      const iconKM = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAB2AAAAdgB+lymcgAAABl0RVh0U29mdHdhcmUAd3d3Linape.org5vuPBoAAAP5SklEQVR4nO2vPaxQxFMc/FatSLZ783dXWStF/wJMHBc8Kir+wBxFPWqvFg/+Coti74EGR+qNaRbTiSWyVelQQ0VgQxR9tqbUqLdb1kDfsdnYyk8lkZ5bufOExs5OX5Ju3L8lLJgM5clQTDcAxYAT4LTIizxoyY5USFgF9QFEjfaKzYHEC1dBfQBewSqRLnhVFZ8HiNaqRp+T3RhHkWVF0FiymUY1ci2r4H5ECsEbSfmbGTuCyD75ifh9fLs+/lOkO5fpVrit8eYYd8nGCAnAPmEI/mIXJkK+sQtnvYcsyp4ABoMNxWytQAMYtCNoibj3jQEuC+iLRLxU9BjYY6JsyQBRagEHRvZOgvkh4bm9q5bQMAMo7i8Bkgvoi4SfkH+R0YuOWXoOipHyQTGrwSPgrMO2bg8QzQgF4GqN8HT/niFthOzCBeYOCBrV2h3wSw6bCduAu8WaPcckT1nhbPomQeoURqAqfBb0aM0E1Q2EbST0UDtuUKPp0/L91+kkRVb4pHyMsTpJZAz8hU+KZjC+1PwZUwwN0yHIG0SIND3gZ8Kzm1v1BiDvvVnsxlMcB1UCaBnhB5bz/PMX6A1H3HhCGfAxwjPIukLnre8i7QAjyLlAPqEYoXJMhrw4uPSAo5I2LmgqR8y2xekBugKxJGKL8Rcso6oSJh0dAN/PfPDtBVJ/zL27iRncm3dcDN4FZn26QzALXKJ1CMUIte8BB4D1wFJgDbgOHgDagCWgGtgGdqDfZAMeBN8A+FwSymAXOAP+kvn7M3HsL8IASz5NJSWRlgP2oxs8Bp31pS4CLwGdgDOgFGn065yXvHMuLrBF3DAiToP4dlb8rIM+FAL0rAXrnJW0CdUjLClkaoD9AH+CTpO8Cdsj9d43uQ0m/oW9iONLuAi3AX9Ro3qbRGRMOO4Hdcj+m0d0MzEh562wIJYkDbGKEZ6J7IESnEdXnx1Gufxk1MOrQKWUOGNRfgbQN8FF0N9uQ1WCrlDlqkzntLjAj5S8L0Ql6BR+2hG4WHavTZFkZYKkBJ7/o0CTp2jPJtRQKf5OrybMBszOBXgxgG6qrCkDvJPrdodlemW91SnUkgG8gXKvwzK9RZHVVlvaY8AmSoGQbvETh1MrpUBotQ2htA0Aau1fBO474HRf0q7bktFVlpacDeEUNQv0yPMJ1Ncp1vAXbvuBg63MUWmEIA5DPp0eSsvpRBsjcY/Lu0Q3pQ2RAcy2uVpFtyh5E2+IeH0o7ulvVzgA/BAOs6gtsSOonZ8lwEq5PyxpXiA1AexxQaADu09mspJZ4CqO/6wW1GcpkzXQQL9MAx+AJ6jvEJ1vi+eoB/wH+23RA79p0hYAAAAASUVORK5CYII=";
      const iconCarga = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAABuwAAAbsBOuzj4gAAABl0RVh0U29mdHdhcmUAd3d3Linape.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";

      // CABEÇALHO LIMPO
      doc.setFillColor(255, 255, 255); 
      doc.rect(0, 0, pageWidth, 80, 'F');
      
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("DIÁRIO DE BORDO", 40, 45);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`ROTA: #${rota.ZH_ROTA} - ${rota.ZH_NOME}`, 40, 65);
      doc.setTextColor(100, 116, 139);
      doc.text(`Emissão: ${dayjs().format('DD/MM/YYYY HH:mm')}`, pageWidth - 40, 65, { align: 'right' });

      // BOX DE INFORMAÇÕES - CINZA CLARO
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(40, 90, pageWidth - 80, 115, 8, 8, 'FD');
      
      const iconSize = 14;
      
      // DATA (Col 1, Row 1)
      // doc.addImage(iconDate, 'PNG', 55, 105, iconSize, iconSize);
      doc.setTextColor(100, 116, 139); 
      doc.setFontSize(8); doc.setFont("helvetica", "bold");
      doc.text("DATA", 80, 112);
      doc.setTextColor(15, 23, 42); doc.setFontSize(10);
      doc.text(dayjs.utc(rota.ZB_DTENTRE || rota.ZH_DTENTRE).format('DD/MM/YYYY'), 80, 126);

      // MOTORISTA (Col 2, Row 1)
      // doc.addImage(iconUser, 'PNG', 210, 105, iconSize, iconSize);
      doc.setTextColor(100, 116, 139); doc.setFontSize(8);
      doc.text("MOTORISTA", 235, 112);
      doc.setTextColor(15, 23, 42); doc.setFontSize(10);
      doc.text((rota.ZH_NOMMOT || "---").toUpperCase(), 235, 126);

      // CARGA (Col 3, Row 1)
      // doc.addImage(iconCarga, 'PNG', 410, 105, iconSize, iconSize);
      doc.setTextColor(100, 116, 139); doc.setFontSize(8);
      doc.text("CARGA / ROMANEIO", 435, 112);
      doc.setTextColor(15, 23, 42); doc.setFontSize(10);
      const numCarga = (entregas && entregas.length > 0) ? entregas[0].ZB_CARGA : (rota.ZB_CARGA || '---');
      doc.text(String(numCarga), 435, 126);

      // TIPO DE VEÍCULO / PLACA (Col 1, Row 2)
      // doc.addImage(iconTruck, 'PNG', 55, 150, iconSize, iconSize);
      doc.setTextColor(100, 116, 139); doc.setFontSize(8);
      doc.text("TIPO DE VEÍCULO / PLACA", 80, 157);
      doc.setTextColor(15, 23, 42); doc.setFontSize(10);
      const vehDisplay = (vehicleInfo.tipo_id ? `${vehicleInfo.tipo_id} - ` : '') + (vehicleInfo.tipo_desc || 'VEÍCULO');
      doc.text(vehDisplay.toUpperCase(), 80, 171);
      doc.setFontSize(9); doc.setTextColor(15, 23, 42);
      doc.text(`PLACA: ${rota.ZH_VEICULO || "---"}`, 80, 183);

      // KM SAÍDA / CHEGADA (Col 2, Row 2)
      // doc.addImage(iconKM, 'PNG', 210, 150, iconSize, iconSize);
      doc.setTextColor(100, 116, 139); doc.setFontSize(8);
      doc.text("KM SAÍDA / CHEGADA", 235, 157);
      doc.setTextColor(15, 23, 42); doc.setFontSize(10);
      doc.text(`${kmSaida} / ${kmChegada}`, 235, 171);

      // TOTAL KM (Col 3, Row 2) - MAIOR E SEPARADO
      // doc.addImage(iconKM, 'PNG', 410, 150, iconSize, iconSize);
      doc.setTextColor(100, 116, 139); doc.setFontSize(8);
      doc.text("TOTAL KM PERCORRIDO", 435, 157);
      doc.setTextColor(15, 23, 42); doc.setFontSize(15);
      doc.text(String(calcTotalKm), 435, 175);

      // TABELA
      let timeline = [];
      let tempoParadasMinutos = 0;
      
      entregas.forEach(e => {
        timeline.push({
          tipo: 'ENTREGA',
          local: e.ZB_NOMCLI,
          chegada: e.chegada_em ? dayjs.utc(e.chegada_em) : null,
          saida: e.concluido_em ? dayjs.utc(e.concluido_em) : null,
          status: e.ZH_STATUS || 'PENDENTE'
        });
      });
      
      paradas.forEach(p => {
        timeline.push({
          tipo: 'PARADA',
          local: p.local || p.status || 'PAUSA',
          chegada: p.hora_inicio ? dayjs.utc(p.hora_inicio) : null,
          saida: p.hora_fim ? dayjs.utc(p.hora_fim) : null,
          status: 'CONCLUIDA'
        });
      });

      // Adicionar Início e Fim da Rota na Timeline
      if (inicioLog.data_hora) {
        timeline.push({
          tipo: 'ROTA',
          local: 'INÍCIO DA ROTA',
          chegada: null,
          saida: dayjs.utc(inicioLog.data_hora),
          status: 'INICIADO'
        });
      }
      
      if (fimLog.data_hora) {
        timeline.push({
          tipo: 'ROTA',
          local: 'FIM DA ROTA',
          chegada: dayjs.utc(fimLog.data_hora),
          saida: null,
          status: 'ENCERRADO'
        });
      }

      timeline.sort((a, b) => {
        const timeA = a.chegada || a.saida || dayjs(0);
        const timeB = b.chegada || b.saida || dayjs(0);
        return timeA.valueOf() - timeB.valueOf();
      });

      const tableData = timeline.map(item => {
        let perm = "---";
        if (item.chegada && item.saida) {
          const m = item.saida.diff(item.chegada, 'minute');
          perm = m >= 60 ? `${Math.floor(m/60)}h ${m%60}m` : `${m}m`;
          tempoParadasMinutos += m;
        }
        
        const localUpper = (item.local || '---').toString().toUpperCase();
        
        return [
          item.tipo,
          localUpper,
          item.chegada && item.chegada.isValid() ? item.chegada.format('HH:mm') : '---',
          item.saida && item.saida.isValid() ? item.saida.format('HH:mm') : '---',
          perm,
          item.status
        ];
      });

      doc.autoTable({
        startY: 230,
        head: [['TIPO', 'LOCAL / CLIENTE', 'ENTRADA', 'SAÍDA', 'PERMANÊNCIA', 'STATUS']],
        body: tableData,
        theme: 'grid',
        styles: { lineColor: [226, 232, 240], lineWidth: 0.5 },
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontSize: 9, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 8, textColor: [0, 0, 0] },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 50, halign: 'center' },
          1: { cellWidth: 180 },
          2: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'center' },
          5: { halign: 'center', fontStyle: 'bold' }
        }
      });

      // RESUMO DE HORAS
      let tempoTrabalhadoMinutos = 0;
      let primeiraEntrada = null;
      let ultimaSaida = null;
      timeline.forEach(item => {
        if (item.chegada && (!primeiraEntrada || item.chegada.isBefore(primeiraEntrada))) primeiraEntrada = item.chegada;
        if (item.saida && (!ultimaSaida || item.saida.isAfter(ultimaSaida))) ultimaSaida = item.saida;
      });

      if (primeiraEntrada && ultimaSaida) {
        tempoTrabalhadoMinutos = ultimaSaida.diff(primeiraEntrada, 'minute');
      }

      if (tempoTrabalhadoMinutos === 0 && inicioLog.data_hora && fimLog.data_hora) {
        tempoTrabalhadoMinutos = dayjs.utc(fimLog.data_hora).diff(dayjs.utc(inicioLog.data_hora), 'minute');
      }

      const tempoLiquidoMinutos = Math.max(0, tempoTrabalhadoMinutos - tempoParadasMinutos);
      const toFormat = m => m >= 60 ? `${Math.floor(m/60)}h ${m%60}m` : `${m}m`;

      const finalY = doc.lastAutoTable.finalY + 30;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(40, finalY - 15, pageWidth - 80, 70, 5, 5, 'FD');

      doc.setFontSize(10); doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("RESUMO DE HORAS", 50, finalY + 5);
      
      doc.setFontSize(8); doc.setFont("helvetica", "normal");
      doc.text(`Total Parado / Permanências: ${toFormat(tempoParadasMinutos)}`, 50, finalY + 20);
      doc.setFont("helvetica", "bold");
      doc.text(`Tempo Efetivo em Viagem: ${toFormat(tempoLiquidoMinutos)}`, 50, finalY + 35);

      // ASSINATURAS
      let signY = finalY + 110;
      if (signY > pageHeight - 50) {
        doc.addPage();
        signY = 100;
      }

      doc.setDrawColor(148, 163, 184); 
      doc.setLineWidth(0.5);
      
      doc.line(40, signY, 260, signY);
      doc.setFontSize(8); doc.setTextColor(0, 0, 0);
      doc.text((rota.ZH_NOMMOT || "MOTORISTA").toUpperCase(), 40, signY + 12);
      
      doc.line(pageWidth - 260, signY, pageWidth - 40, signY);
      doc.text("GESTOR DE FROTA", pageWidth - 260, signY + 12);

      Swal.close();
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
      
    } catch (error) {
      console.error(error);
      let errorMsg = 'Não foi possível gerar o PDF.';
      if (error.code === 'ECONNABORTED') errorMsg = 'Tempo limite esgotado ao buscar dados.';
      if (error.response?.status === 404) errorMsg = 'Rota não encontrada.';
      
      Swal.fire({ 
        icon: 'error', 
        title: 'Erro na Geração', 
        text: errorMsg,
        confirmButtonColor: '#3085d6'
      });
    }
  };

  const handleExportExcel = async () => {
    if (!dataInicioExport || !dataFimExport) {
      Swal.fire({
        icon: 'warning',
        title: 'Atenção',
        text: 'Por favor, informe a data início e data fim.'
      });
      return;
    }

    if (dayjs(dataInicioExport).isAfter(dayjs(dataFimExport))) {
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'A data início deve ser anterior ou igual Ã  data fim.'
      });
      return;
    }

    setIsExporting(true);
    try {
      const url = `${API_BASE_URL}/exportar-entregas-excel?dataInicio=${dataInicioExport}&dataFim=${dataFimExport}`;

      const response = await axios.get(url, {
        responseType: 'blob',
        timeout: 60000 // 60 segundos de timeout
      });

      // Criar link para download
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `entregas_${dataInicioExport}_${dataFimExport}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: 'Arquivo Excel exportado com sucesso!',
        timer: 2000,
        showConfirmButton: false
      });

      setIsExportModalOpen(false);
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      let errorMessage = 'Erro ao exportar arquivo Excel.';

      if (error.response?.data) {
        try {
          const errorData = JSON.parse(await error.response.data.text());
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          // Se nÃ£o conseguir parsear, usar mensagem padrÃ£o
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: errorMessage
      });
    } finally {
      setIsExporting(false);
    }
  };

  // --- FILTERING ---
  const rotasFiltradas = useMemo(() => {
    if (!rotas) return [];
    return rotas
      .map((rota) => {
        const entregasFiltradas = (rota.entregas || []).filter((entrega) => {
          if (apenasSemFoto && entrega.ZH_FOTO_URL) return false;
          const pesquisaLower = pesquisa.toLowerCase();
          switch (filtro) {
            case "bilhete": return String(entrega.ZB_NUMSEQ).toLowerCase().includes(pesquisaLower);
            case "cliente": return entrega.ZB_NOMCLI?.toLowerCase().includes(pesquisaLower);
            case "rota": return String(rota.ZH_CODIGO).toLowerCase().includes(pesquisaLower);
            case "status": return entrega.ZH_STATUS?.toLowerCase().includes(pesquisaLower);
            default: return true;
          }
        });
        return { ...rota, entregas: entregasFiltradas };
      })
      .filter((rota) => {
        if (rota.entregas.length === 0) return false;
        if (filtroStatus === "pendente") {
          // mostra sÃ³ rotas com pelo menos uma entrega nÃ£o concluÃ­da
          return rota.entregas.some((e) => e.ZH_STATUS !== "CONCLUIDA");
        }
        if (filtroStatus === "finalizado") {
          // mostra sÃ³ rotas 100% concluÃ­das
          return rota.entregas.every((e) => e.ZH_STATUS === "CONCLUIDA");
        }
        return true;
      });
  }, [rotas, filtro, pesquisa, apenasSemFoto, filtroStatus]);

  const calcularProgresso = (entregas) => {
    if (!entregas || !entregas.length) return 0;
    const concluidas = entregas.filter((e) => e.ZH_STATUS === "CONCLUIDA").length;
    return Math.round((concluidas / entregas.length) * 100);
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300 pb-20">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />

      {/* HEADER */}
      <header className="sticky top-0 z-50 px-4 py-4">
        <div className="w-full max-w-[98vw] mx-auto">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-slate-700/50 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
              <div className="bg-gradient-to-tr from-blue-600 to-cyan-400 h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                <span className="material-symbols-rounded text-2xl">local_shipping</span>
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight text-slate-800 dark:text-white">Gerenciador</h1>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Entrega de Pedidos</span>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <button onClick={openDateModal} className="hidden md:flex items-center gap-2 mr-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 px-3 py-2 rounded-xl transition-all cursor-pointer group border border-transparent hover:border-slate-200 dark:hover:border-slate-600">
                <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-1.5 rounded-lg">
                  <span className="material-symbols-rounded text-lg">calendar_today</span>
                </div>
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{date.toLocaleDateString('pt-BR')}</span>
                </div>
              </button>
              <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 hidden md:block"></div>
              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-bold text-slate-800 dark:text-white">{username || "User"}</span>
                  <button onClick={openLocalModal} className="text-[10px] font-bold text-white bg-slate-400 px-2 py-0.5 rounded transition-colors cursor-not-allowed flex items-center gap-1 opacity-80">
                    LOCAL: {local} <span className="material-symbols-rounded text-[10px]">lock</span>
                  </button>
                </div>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 border-2 border-white dark:border-slate-600 flex items-center justify-center shadow-sm">
                  <span className="material-symbols-rounded text-slate-500 dark:text-slate-300">person</span>
                </div>
              </div>
              <button onClick={toggleDarkMode} className="ml-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-600 dark:text-slate-300 border border-transparent hover:border-slate-300 dark:hover:border-slate-500">
                <span className="material-symbols-rounded block dark:hidden text-xl">dark_mode</span>
                <span className="material-symbols-rounded hidden dark:block text-xl">light_mode</span>
              </button>
              <button onClick={handleLogout} className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-all border border-transparent hover:border-red-200 dark:hover:border-red-800">
                <span className="material-symbols-rounded text-xl">logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* BACKGROUND DECORATION */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-400/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-400/10 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
      </div>

      {/* MODALS INJETADOS */}
      <Modal isOpen={isLocalModalOpen} onClose={() => setIsLocalModalOpen(false)} title="Alterar Local">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Novo Local:</label>
        <div className="flex gap-2">
          <input type="text" value={tempLocal} onChange={(e) => setTempLocal(e.target.value)} className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white uppercase font-bold" maxLength={2} />
        </div>
        <button onClick={saveLocal} className="mt-6 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20">Salvar</button>
      </Modal>

      <Modal isOpen={isDateModalOpen} onClose={() => setIsDateModalOpen(false)} title="Alterar Data">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Data de Trabalho:</label>
        <input type="date" value={tempDate} onChange={(e) => setTempDate(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white dark:[color-scheme:dark]" />
        <button onClick={saveDate} className="mt-6 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20">Confirmar</button>
      </Modal>

      <ImageModal isOpen={isImageModalOpen} onClose={() => setIsImageModalOpen(false)} imageUrl={selectedImage} />

      <TimelineModal isOpen={isTimelineModalOpen} onClose={() => setIsTimelineModalOpen(false)} rota={selectedRotaTimeline} />

      <AdjustmentModal 
        isOpen={isAdjustmentModalOpen} 
        onClose={() => setIsAdjustmentModalOpen(false)} 
        rota={selectedRotaAdjustment} 
        onSave={refetch} 
        onOpenImage={openImage}
      />

      {/* Export Excel Modal */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => !isExporting && setIsExportModalOpen(false)}
        title="Exportar para Excel"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Selecione o perÃ­odo para exportar todas as entregas:
          </p>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Data Início:
            </label>
            <input
              type="date"
              value={dataInicioExport}
              onChange={(e) => setDataInicioExport(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:[color-scheme:dark]"
              disabled={isExporting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Data Fim:
            </label>
            <input
              type="date"
              value={dataFimExport}
              onChange={(e) => setDataFimExport(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:[color-scheme:dark]"
              disabled={isExporting}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-lg shadow-green-600/20 flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <>
                  <span className="material-symbols-rounded animate-spin">refresh</span>
                  <span>Exportando...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-rounded">download</span>
                  <span>Exportar Excel</span>
                </>
              )}
            </button>
            <button
              onClick={() => setIsExportModalOpen(false)}
              disabled={isExporting}
              className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      {/* MAIN CONTENT */}
      <main className="w-full max-w-[98vw] mx-auto px-4 py-6 relative z-10">

        {/* FILTERS & STATS - CARDS PADRONIZADOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8 animate-in slide-in-from-bottom-2 duration-500">

          {/* Card Pendências Foto (Mês) */}
          <div className={`p-6 rounded-2xl bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-sm flex items-center gap-4 cursor-pointer transition-all hover:shadow-md ${apenasSemFoto ? 'border-l-4 border-l-amber-500 ring-2 ring-amber-500/20' : 'border-l-4 border-l-amber-500'}`} onClick={() => setApenasSemFoto(!apenasSemFoto)}>
            <div className="bg-amber-100 dark:bg-amber-900/10 text-amber-600 p-3 rounded-xl shrink-0">
              <span className="material-symbols-rounded text-3xl">no_photography</span>
            </div>
            <div className="min-w-0">
              <p className="text-3xl font-bold text-slate-800 dark:text-white truncate">{stats.pendenciasFotoMes}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate">Pendências Foto (Mês)</p>
              {apenasSemFoto && <span className="text-[10px] font-bold text-amber-600 mt-1 block">FILTRO ATIVO</span>}
            </div>
          </div>

          {/* Card Total Carregamento Dia */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border-l-4 border-l-blue-500 dark:border-slate-700 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
            <div className="bg-blue-100 dark:bg-blue-900/10 text-blue-600 p-3 rounded-xl shrink-0">
              <span className="material-symbols-rounded text-3xl">local_shipping</span>
            </div>
            <div className="min-w-0">
              <p className="text-3xl font-bold text-slate-800 dark:text-white truncate">{stats.totalCarregamentosDia || 0}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate">Total Carregamento Dia</p>
            </div>
          </div>

          {/* Card Total Finalizados */}
          <div
            onClick={() => setFiltroStatus(f => f === "finalizado" ? null : "finalizado")}
            className={`p-6 rounded-2xl bg-white dark:bg-slate-800 border-l-4 border-l-green-500 dark:border-slate-700 shadow-sm flex items-center gap-4 transition-all hover:shadow-md cursor-pointer select-none ${filtroStatus === "finalizado" ? "ring-2 ring-green-500/50 shadow-md" : ""
              }`}
          >
            <div className="bg-green-100 dark:bg-green-900/10 text-green-600 p-3 rounded-xl shrink-0">
              <span className="material-symbols-rounded text-3xl">task_alt</span>
            </div>
            <div className="min-w-0">
              <p className="text-3xl font-bold text-slate-800 dark:text-white leading-none">{stats.totalCaminhoesFinalizado ?? 0}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-0.5">Entregas Finalizados</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{stats.totalFinalizadosDia || 0} entregas finalizadas</p>
              {filtroStatus === "finalizado" && <span className="text-[10px] font-bold text-green-600 mt-1 block">FILTRO ATIVO</span>}
            </div>
          </div>


          {/* Card Total Pendentes (Em Rota) */}
          <div
            onClick={() => setFiltroStatus(f => f === "pendente" ? null : "pendente")}
            className={`p-6 rounded-2xl bg-white dark:bg-slate-800 border-l-4 border-l-indigo-500 dark:border-slate-700 shadow-sm transition-all hover:shadow-md flex items-center gap-4 cursor-pointer select-none ${filtroStatus === "pendente" ? "ring-2 ring-indigo-500/50 shadow-md" : ""
              }`}
          >
            <div className="bg-indigo-100 dark:bg-indigo-900/10 text-indigo-600 p-3 rounded-xl shrink-0">
              <span className="material-symbols-rounded text-3xl">route</span>
            </div>
            <div className="min-w-0">
              <p className="text-3xl font-bold text-slate-800 dark:text-white leading-none">{stats.totalCaminhoesPendentes ?? stats.pendentePorCaminhao?.length ?? 0}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-0.5">Caminhões em Rota (Pendente)</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{stats.totalEmRotaDia || 0} pedidos pendentes</p>
              {filtroStatus === "pendente" && <span className="text-[10px] font-bold text-indigo-600 mt-1 block">FILTRO ATIVO</span>}
            </div>
          </div>


        </div>

        {/* FILTERS BAR */}
        <div className="mb-8 animate-in slide-in-from-bottom-2 duration-500 delay-150">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-4 rounded-2xl border border-white/20 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center gap-3">
            <div className="relative w-full md:w-48">
              <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-white appearance-none outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-bold text-sm uppercase">
                <option value="bilhete">Bilhete</option>
                <option value="cliente">Cliente</option>
                <option value="rota">Rota</option>
                <option value="status">Status</option>
              </select>
              <span className="material-symbols-rounded absolute left-3 top-3 text-slate-400">filter_alt</span>
            </div>

            <div className="relative flex-1 w-full">
              <span className="material-symbols-rounded absolute left-3 top-3 text-slate-400">search</span>
              <input
                type="text"
                value={pesquisa}
                onChange={(e) => setPesquisa(e.target.value)}
                placeholder={`Pesquisar por ${filtro.toUpperCase()}...`}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
              />
            </div>

            <div className="relative w-full md:w-48">
              <input
                type="date"
                value={dataFiltro.utc().format('YYYY-MM-DD')}
                onChange={(e) => setDataFiltro(dayjs(e.target.value))}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 uppercase font-bold text-sm dark:[color-scheme:dark]"
              />
              <span className="material-symbols-rounded absolute left-3 top-3 text-slate-400">calendar_month</span>
            </div>

            <button onClick={handleClearFilters} className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-slate-500 dark:text-slate-300 transition-colors" title="Limpar Filtros">
              <span className="material-symbols-rounded">filter_alt_off</span>
            </button>

            <button
              onClick={() => setIsExportModalOpen(true)}
              className="p-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors flex items-center gap-2 font-bold text-sm shadow-lg shadow-green-500/20"
              title="Exportar para Excel"
            >
              <span className="material-symbols-rounded">download</span>
              <span className="hidden md:inline">Exportar Excel</span>
            </button>
          </div>
        </div>

        {/* LOADING STATE */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/30 text-blue-500 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-rounded text-4xl animate-spin">refresh</span>
            </div>
            <p className="text-slate-500 font-bold">Carregando rotas...</p>
          </div>
        )}

        {/* MAIN TABLE WINDOW */}
        {!isLoading && (
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-500 relative">
            {/* HEADERS */}
            <div className="grid grid-cols-12 gap-4 px-6 py-5 bg-slate-50/80 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider items-center">
              <div className="col-span-1 text-center">Abrir</div>
              <div className="col-span-1">Cód. Rota</div>
              <div className="col-span-2">Nome da Rota</div>
              <div className="col-span-2">Motorista</div>
              <div className="col-span-1">Placa</div>
              <div className="col-span-1 text-center">Início / Fim</div>
              <div className="col-span-2 text-center">Progresso</div>
              <div className="col-span-1 text-center">Entregas</div>
              <div className="col-span-1 text-center">Ações</div>
            </div>

            <div className="max-h-[85vh] overflow-y-auto custom-scrollbar">
              {rotasFiltradas.length === 0 ? (
                <div className="py-20 text-center text-slate-400 flex flex-col items-center">
                  <span className="material-symbols-rounded text-4xl mb-2 opacity-50">search_off</span>
                  <p>Nenhuma rota encontrada para os filtros.</p>
                </div>
              ) : (
                [...rotasFiltradas]
                  .sort((a, b) => {
                    const hasAtrasoA = a.entregas.some(e => e.chegada_em && !e.hora_conclusao && dayjs.utc().diff(dayjs.utc(e.chegada_em), 'minute') > 30);
                    const hasAtrasoB = b.entregas.some(e => e.chegada_em && !e.hora_conclusao && dayjs.utc().diff(dayjs.utc(e.chegada_em), 'minute') > 30);
                    if (hasAtrasoA && !hasAtrasoB) return -1;
                    if (!hasAtrasoA && hasAtrasoB) return 1;
                    return 0;
                  })
                  .map((rota) => {
                  const isExpanded = expandedRows.includes(rota.ZH_CODIGO);
                  const progress = calcularProgresso(rota.entregas);
                  const hasAtraso = rota.entregas.some(e => 
                    e.chegada_em && !e.hora_conclusao && dayjs.utc().diff(dayjs.utc(e.chegada_em), 'minute') > 30
                  );

                  return (
                    <div key={rota.ZH_CODIGO} className={`border-b border-slate-100 dark:border-slate-700/50 transition-all duration-300 ${hasAtraso ? 'bg-red-50/80 dark:bg-red-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}>
                      {/* ROTA ROW */}
                      <div className="grid grid-cols-12 gap-4 px-6 py-5 items-center cursor-pointer relative overflow-hidden" onClick={() => toggleRow(rota.ZH_CODIGO)}>
                        {hasAtraso && (
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500 animate-pulse"></div>
                        )}
                        <div className="col-span-1 text-center">
                          <button className={`p-1 rounded-lg transition-all ${isExpanded ? 'bg-blue-100 text-blue-600 rotate-180' : 'text-slate-400 hover:bg-slate-100'}`}>
                            <span className="material-symbols-rounded">expand_more</span>
                          </button>
                        </div>
                        <div className="col-span-1 flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200 text-xs">
                          <span className={hasAtraso ? 'text-red-600 dark:text-red-400' : ''}>#{rota.ZH_ROTA}</span>
                          {hasAtraso && (
                            <div className="flex items-center bg-red-500 text-white rounded-full px-1.5 py-0.5 shadow-sm">
                              <span className="material-symbols-rounded text-[14px]">warning</span>
                            </div>
                          )}
                        </div>
                        <div className={`col-span-2 font-bold text-sm truncate ${hasAtraso ? 'text-red-700 dark:text-red-400' : 'text-slate-800 dark:text-white'}`} title={rota.ZH_NOME}>{rota.ZH_NOME}</div>
                        <div className="col-span-2 text-xs text-slate-600 dark:text-slate-300 truncate font-medium">{rota.ZH_NOMMOT || "-"}</div>
                        <div className="col-span-1">
                          <span className={`px-3 py-1.5 rounded text-base font-mono font-bold border ${hasAtraso ? 'bg-red-100 border-red-200 text-red-700 dark:bg-red-900/40 dark:border-red-800 dark:text-red-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'}`}>
                            {rota.ZH_VEICULO || "SEM PLACA"}
                          </span>
                        </div>
                        <div className="col-span-1 flex flex-col items-center gap-1.5">
                          {rota.hora_inicio ? <span className="text-base font-bold text-green-600 bg-green-50 px-2 py-1 rounded w-fit">{dayjs.utc(rota.hora_inicio).format("HH:mm")}</span> : <span className="text-sm text-slate-300">-</span>}
                          {rota.hora_fim ? <span className="text-base font-bold text-red-500 bg-red-50 px-2 py-1 rounded w-fit">{dayjs.utc(rota.hora_fim).format("HH:mm")}</span> : null}
                        </div>
                        <div className="col-span-2 px-2">
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                          </div>
                          <div className="text-[10px] text-right text-slate-400 mt-1 font-bold">{progress}%</div>
                        </div>
                        <div className="col-span-1 text-center font-bold text-slate-700 dark:text-white">
                          {rota.entregas.length}
                        </div>
                          <div className="flex items-center justify-center gap-2">
                            <button
                               onClick={(e) => { e.stopPropagation(); generateDiarioBordo(rota); }}
                               className="p-2.5 bg-emerald-100/80 hover:bg-emerald-600 text-emerald-600 hover:text-white dark:bg-slate-700 dark:hover:bg-emerald-600 dark:text-emerald-400 rounded-xl transition-all shadow-sm hover:shadow-md"
                               title="Diário de Bordo (PDF)"
                            >
                               <span className="material-symbols-rounded block">receipt_long</span>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); openTimeline(rota); }}
                              className="p-2.5 bg-blue-100 hover:bg-blue-600 text-blue-600 hover:text-white dark:bg-slate-700 dark:hover:bg-blue-600 dark:text-blue-400 rounded-xl transition-all shadow-sm hover:shadow-md"
                              title="Ver Linha do Tempo"
                            >
                              <span className="material-symbols-rounded block">route</span>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); openAdjustment(rota); }}
                              className={`p-2.5 rounded-xl transition-all shadow-sm hover:shadow-md ${
                                userPermissions.FATURAMENTO_AJUSTAR_HORAS 
                                ? 'bg-amber-100 hover:bg-amber-600 text-amber-600 hover:text-white dark:bg-slate-700 dark:hover:bg-amber-600 dark:text-amber-400' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50'
                              }`}
                              title={userPermissions.FATURAMENTO_AJUSTAR_HORAS ? "Ajustar Horários" : "Sem permissão para ajustar"}
                            >
                              <span className="material-symbols-rounded block">{userPermissions.FATURAMENTO_AJUSTAR_HORAS ? "edit_calendar" : "lock"}</span>
                            </button>
                          </div>
                      </div>

                      {/* EXPANDED DETAILS (ENTREGAS) */}
                      {isExpanded && (
                        <div className="bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-700 p-4 animate-in slide-in-from-top-2">
                          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-slate-100 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                                <tr>
                                  <th className="px-4 py-3">Cliente</th>
                                  <th className="px-4 py-3">Bilhete / Nota</th>
                                  <th className="px-4 py-3 text-center">Conclusão</th>
                                  <th className="px-4 py-3 text-center">Status</th>
                                  <th className="px-4 py-3 text-center">Foto</th>
                                  <th className="px-4 py-3 text-center">Ações</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {rota.entregas.map((entrega) => {
                                  // Calcular se esta entrega especÃ­fica estÃ¡ atrasada
                                  const diffMin = entrega.chegada_em && !entrega.hora_conclusao 
                                    ? dayjs.utc().diff(dayjs.utc(entrega.chegada_em), 'minute') 
                                    : 0;
                                  const isEntregaAtrasada = diffMin > 30;

                                  return (
                                    <tr key={`${entrega.ZB_NUMSEQ}-${entrega.ZB_NOTA}`} className={`transition-colors ${isEntregaAtrasada ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                                      <td className={`px-4 py-3 font-bold ${isEntregaAtrasada ? 'text-red-700 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                        <div className="flex flex-col">
                                          <span>{entrega.ZB_NOMCLI}</span>
                                          {isEntregaAtrasada && (
                                            <span className="text-[10px] text-red-500 flex items-center gap-1 animate-pulse">
                                              <span className="material-symbols-rounded text-[12px]">timer</span>
                                              AGUARDANDO HÃ {diffMin} MINUTOS
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono">
                                      <div className="font-bold text-slate-700 dark:text-slate-300 text-lg">{entrega.ZB_NUMSEQ}</div>
                                      <div className="text-sm opacity-75 font-semibold">NF: {entrega.ZB_NOTA || '-'}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center font-mono text-base font-bold text-slate-600 dark:text-slate-300">
                                      {entrega.hora_conclusao ? dayjs.utc(entrega.hora_conclusao).format("HH:mm") : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <StatusBadge status={entrega.ZH_STATUS} />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      {entrega.ZH_FOTO_URL ? (
                                        <button onClick={() => openImage(entrega.ZH_FOTO_URL)} className="group relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 shadow-sm hover:ring-2 hover:ring-blue-500 transition-all">
                                          <img src={entrega.ZH_FOTO_URL} alt="Foto" className="w-full h-full object-cover" />
                                          <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors flex items-center justify-center">
                                            <span className="material-symbols-rounded text-white opacity-0 group-hover:opacity-100 text-lg shadow-black drop-shadow-md">visibility</span>
                                          </div>
                                        </button>
                                      ) : (
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">Sem Foto</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      {entrega.ZH_FOTO_URL && entrega.ZH_STATUS !== "PENDENTE" && (
                                        <button
                                          onClick={() => showConfirmReset(entrega)}
                                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                          title="Resetar Entrega"
                                        >
                                          <span className="material-symbols-rounded">restart_alt</span>
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default Gerenciador;
