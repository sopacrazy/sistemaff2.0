import React, { useState, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { Box } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from './contexts/ThemeContext';
import Swal from 'sweetalert2';
import "sweetalert2/dist/sweetalert2.min.css";

import Home from "./home";
import Faturamento from "./Faturamento";
import OcorrenciaForm from "./OcorrenciaForm";
import OcorrenciasList from "./OcorrenciasList";
import Gerenciador from "./gerenciador";
import StatusBar from "./StatusBar";
import Dashboard from "./Dashboard";
import Tabela from "./Tabela";
import Configuracao from "./Configuracao";
import Login from "./Login";
import Financeiro from "./Financeiro/financeiro";
import FinanceiroHome from "./Financeiro/FinanceiroHome";
import ContasReceberHome from "./Financeiro/ContasReceberHome";
import ContasPagarHome from "./Financeiro/ContasPagarHome";
import ContasPagarList from "./Financeiro/ContasPagarList";
import PrivateRoute from "./PrivateRoute";
import HomeEstoque from "./Estoque/homeEstoque";
import EntradaEstoque from "./Estoque/entradaEstoque";
import ComprasMercadoria from "./Estoque/comprasMercadoria";
import Transferencias from "./Estoque/transferencias";
import Avarias from "./Estoque/avarias";
import Devolucao from "./Estoque/devolucao";
import FechamentoGeral from "./Estoque/fechamentoGeral";
import Conferente from "./Conferente/Conferente";
import NovaTransferencia from "./Estoque/NovaTransferencia";
import NovaDevolucao from "./Estoque/NovaDevolucao";
import NovaAvaria from "./Estoque/NovaAvaria";
import ProdutoPorFornecedor from "./Financeiro/ProdutoPorFornecedor";
import ProdutoPorCliente from "./Financeiro/ProdutoPorCliente";
import ValidarCnpj from "./ValidarCnpj";
import RastreadorPage from "./frota/RastreadorPage";
import FrotaHome from "./frota/FrotaHome";
import ChecklistPage from "./frota/ChecklistPage";
import ProblemasPage from "./frota/ProblemasPage";
import MotoristasPage from "./frota/MotoristasPage";
import ManutencaoPage from "./frota/ManutencaoPage";
import ManutencaoHome from "./frota/ManutencaoHome";
import ManutencaoDashboard from "./frota/ManutencaoDashboard";
import RequireGestor from "./routes/RequireGestor";
import RequireRH from "./routes/RequireRH";
import RequirePermission from "./routes/RequirePermission";
import Relatorios from "./Estoque/Relatorios";
import FolhaDeFaltasPage from "./Estoque/FolhaDeFaltasPage";
import Cadastro from "./Estoque/Cadastro";
import SugestaoAbastecimento from "./Estoque/SugestaoAbastecimento";
import AdminBroadcast from "./AdminBroadcast";
import AnnouncementCenter from "./components/AnnouncementCenter";

import OcorrenciaForm2 from "./OcorrenciaForm2";
import KanbanBoard from "./KanbanBoard";
import Fluxograma from "./Fluxograma";
import RoteirizacaoPage from "./RoteirizacaoPage";
import UsuariosOnline from "./UsuariosOnline";
import RecruitAI from "./RH/RecruitAI";
import CandidatesPage from "./RH/components/CandidatesPage";
import EditarPendenciaApp from "./EditarPendenciaApp";
import { FiscalHome } from "./fiscal/FiscalHome";
import CaixaHome from "./CaixaHome";
import CaixaBilhete from "./caixa/Bilhete";
import FechamentoCaixinha from "./caixa/FechamentoCaixinha";
import NFE from "./caixa/NFE";
import BasquetaControl from "./BasquetaControl";
// wrapper local para as telas que usam react-dnd
import WithDndProvider from "./WithDndProvider";
import ChamadoModal from "./chamado/ChamadoModal";
import DashboardFechamento from "./Estoque/DashboardFechamento";
// removido import { initMainTour } from "./components/TutorialController";
const App = () => {
  const location = useLocation();
  const [isChamadoModalOpen, setIsChamadoModalOpen] = useState(false);
  const [updatedChamadoIds, setUpdatedChamadoIds] = useState(() => {
    const saved = localStorage.getItem("updatedChamadoIds");
    return saved ? JSON.parse(saved) : [];
  });

  const [ocorrencias, setOcorrencias] = useState(() => {
    const saved = localStorage.getItem("ocorrencias");
    return saved ? JSON.parse(saved) : [];
  });

  const queryClient = new QueryClient();

  useEffect(() => {
    localStorage.setItem("ocorrencias", JSON.stringify(ocorrencias));
  }, [ocorrencias]);

  useEffect(() => {
    localStorage.setItem("updatedChamadoIds", JSON.stringify(updatedChamadoIds));
  }, [updatedChamadoIds]);

  useEffect(() => {
    const handleWsMessage = (e) => {
      const data = e.detail;
      console.log('📬 [App.js] Alerta recebido via WebSocket:', data);
      if (data.tipo === 'movimentacao_chamado' || data.tipo === 'mensagem_chamado') {
        console.log('🔔 Movimentação no chamado detectada:', data);

        if (data.chamado_id) {
          setUpdatedChamadoIds(prev => [...new Set([...prev, Number(data.chamado_id)])]);
        }

        // Disparar evento global para componentes (como o Modal) atualizarem
        window.dispatchEvent(new CustomEvent('chamado_updated', { detail: data }));

        // Mostrar Toast customizado e persistente se necessário
        const Toast = Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: true,
          confirmButtonText: 'Ver Chamado',
          confirmButtonColor: '#2563eb',
          timer: 10000,
          timerProgressBar: true,
          didOpen: (toast) => {
            toast.style.zIndex = '999999'; // Forçar acima de tudo
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
            // Ao clicar no corpo da notificação (não no botão)
            toast.style.cursor = 'pointer';
            toast.onclick = (e) => {
              // Se clicou no botão de fechar ou no botão de confirmação, o Swal já trata
              if (!e.target.closest('.swal2-confirm')) {
                setIsChamadoModalOpen(true);
                Swal.close();
              }
            };
          }
        });

        const msg = data.tipo === 'movimentacao_chamado'
          ? `O chamado #${data.chamado_id} foi alterado para: ${data.status_novo}`
          : `Nova mensagem no chamado #${data.chamado_id}`;

        Toast.fire({
          icon: 'success', // Muda para success para ser verde/visível
          title: 'Nova Movimentação',
          text: msg
        });

        // Tenta tocar um som de alerta
        try {
          const context = new (window.AudioContext || window.webkitAudioContext)();
          const osc = context.createOscillator();
          const gain = context.createGain();
          osc.connect(gain);
          gain.connect(context.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, context.currentTime); // Mi 
          gain.gain.setValueAtTime(0.1, context.currentTime);
          osc.start();
          osc.stop(context.currentTime + 0.1);
        } catch (e) {
          // Navegador bloqueou áudio sem interação prévia
        }
      }
    };
    window.addEventListener('ws_message', handleWsMessage);
    return () => window.removeEventListener('ws_message', handleWsMessage);
  }, []);

  // Limpar banner de notificação se o modal estiver aberto
  useEffect(() => {
    if (isChamadoModalOpen) {
      // Opcional: Limpar o alerta global ao abrir o modal, 
      // mas mantemos os IDs individuais para mostrar no histórico
    }
  }, [isChamadoModalOpen]);

  const addOcorrencia = (o) => setOcorrencias((s) => [...s, o]);
  const editOcorrencia = (o) =>
    setOcorrencias((s) => s.map((x) => (x.id === o.id ? o : x)));
  const deleteOcorrencia = (id) =>
    setOcorrencias((s) => s.filter((x) => x.id !== id));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
          <AnnouncementCenter />
          <Box sx={{ flex: 1, overflowY: "auto", paddingBottom: "50px" }}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <Home />
                  </PrivateRoute>
                }
              />
              <Route
                path="/faturamento"
                element={
                  <PrivateRoute>
                    <Faturamento />
                  </PrivateRoute>
                }
              />
              <Route
                path="/faturamento/basquetas"
                element={
                  <PrivateRoute>
                    <BasquetaControl />
                  </PrivateRoute>
                }
              />
              <Route
                path="/financeiro"
                element={
                  <PrivateRoute>
                    <FinanceiroHome />
                  </PrivateRoute>
                }
              />
              <Route
                path="/financeiro/contas-receber"
                element={
                  <PrivateRoute>
                    <ContasReceberHome />
                  </PrivateRoute>
                }
              />
              <Route
                path="/financeiro/contas-pagar"
                element={
                  <PrivateRoute>
                    <ContasPagarHome />
                  </PrivateRoute>
                }
              />
              <Route
                path="/financeiro/contas-pagar/lista"
                element={
                  <PrivateRoute>
                    <ContasPagarList />
                  </PrivateRoute>
                }
              />
              <Route
                path="/financeiro/contas-receber/inadimplencias"
                element={
                  <PrivateRoute>
                    <Financeiro />
                  </PrivateRoute>
                }
              />
              <Route
                path="/financeiro/contas-receber/fechamento"
                element={
                  <PrivateRoute>
                    <RequirePermission permission="CAIXA">
                      <FechamentoCaixinha />
                    </RequirePermission>
                  </PrivateRoute>
                }
              />
              <Route
                path="/ocorrencias"
                element={
                  <PrivateRoute>
                    <OcorrenciasList
                      ocorrencias={ocorrencias}
                      onEdit={editOcorrencia}
                      onDelete={deleteOcorrencia}
                    />
                  </PrivateRoute>
                }
              />
              <Route
                path="/cadastrar"
                element={
                  <PrivateRoute>
                    <OcorrenciaForm addOcorrencia={addOcorrencia} />
                  </PrivateRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/gerenciador"
                element={
                  <PrivateRoute>
                    <Gerenciador />
                  </PrivateRoute>
                }
              />
              <Route
                path="/tabela"
                element={
                  <PrivateRoute>
                    <Tabela />
                  </PrivateRoute>
                }
              />
              {/* ESTOQUE (com react-dnd) */}
              <Route
                path="/estoque"
                element={
                  <PrivateRoute>
                    <HomeEstoque />
                  </PrivateRoute>
                }
              />
              <Route
                path="/estoque/entrada"
                element={
                  <PrivateRoute>
                    <EntradaEstoque />
                  </PrivateRoute>
                }
              />
              <Route
                path="/estoque/entrada/mercadoria"
                element={
                  <PrivateRoute>
                    <ComprasMercadoria />
                  </PrivateRoute>
                }
              />
              <Route
                path="/financeiro/contas-pagar/produto-fornecedor"
                element={
                  <PrivateRoute>
                    <ProdutoPorFornecedor />
                  </PrivateRoute>
                }
              />
              <Route
                path="/financeiro/contas-receber/produto-cliente"
                element={
                  <PrivateRoute>
                    <ProdutoPorCliente />
                  </PrivateRoute>
                }
              />
              <Route
                path="/estoque/transferencia"
                element={
                  <PrivateRoute>
                    <WithDndProvider>
                      <Transferencias />
                    </WithDndProvider>
                  </PrivateRoute>
                }
              />
              <Route
                path="/transferencias/nova"
                element={
                  <PrivateRoute>
                    <WithDndProvider>
                      <NovaTransferencia />
                    </WithDndProvider>
                  </PrivateRoute>
                }
              />
              <Route
                path="/estoque/avarias"
                element={
                  <PrivateRoute>
                    <Avarias />
                  </PrivateRoute>
                }
              />
              <Route
                path="/estoque/devolucao"
                element={
                  <PrivateRoute>
                    <Devolucao />
                  </PrivateRoute>
                }
              />
              <Route
                path="/estoque/fechamento-geral"
                element={
                  <RequireGestor>
                    <FechamentoGeral />
                  </RequireGestor>
                }
              />
              <Route
                path="/estoque/fechamento-geral/dashboard"
                element={
                  <RequireGestor>
                    <DashboardFechamento />
                  </RequireGestor>
                }
              />

              <Route path="/conferente" element={<Conferente />} />
              <Route path="/Configuracao" element={<Configuracao />} />
              <Route
                path="/usuarios-online"
                element={
                  <RequireGestor>
                    <PrivateRoute>
                      <UsuariosOnline />
                    </PrivateRoute>
                  </RequireGestor>
                }
              />
              <Route path="/nova-devolucao" element={<NovaDevolucao />} />
              <Route
                path="/nova-avaria"
                element={
                  <PrivateRoute>
                    <NovaAvaria />
                  </PrivateRoute>
                }
              />
              <Route
                path="/validar-cnpj"
                element={
                  <PrivateRoute>
                    <ValidarCnpj />
                  </PrivateRoute>
                }
              />
              {/* KANBAN – sem react-dnd (usa @hello-pangea/dnd) */}
              <Route path="/kanban" element={<KanbanBoard />} />
              <Route
                path="/fluxograma"
                element={
                  <PrivateRoute>
                    <Fluxograma />
                  </PrivateRoute>
                }
              />

              <Route path="/relatorios">
                <Route
                  index
                  element={
                    <PrivateRoute>
                      <Relatorios />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="faltas"
                  element={
                    <PrivateRoute>
                      <FolhaDeFaltasPage />
                    </PrivateRoute>
                  }
                />
              </Route>

              <Route path="/rastreador" element={<RastreadorPage />} />

              <Route
                path="/fiscal/*"
                element={
                  <PrivateRoute>
                    <RequirePermission permission="FISCAL">
                      <FiscalHome />
                    </RequirePermission>
                  </PrivateRoute>
                }
              />

              <Route
                path="/frota"
                element={
                  <PrivateRoute>
                    <RequirePermission permission="FROTA">
                      <FrotaHome />
                    </RequirePermission>
                  </PrivateRoute>
                }
              />
              <Route
                path="/frota/checklist"
                element={
                  <PrivateRoute>
                    <RequirePermission permission="FROTA">
                      <ChecklistPage />
                    </RequirePermission>
                  </PrivateRoute>
                }
              />
              <Route
                path="/frota/problemas"
                element={
                  <PrivateRoute>
                    <RequirePermission permission="FROTA">
                      <ProblemasPage />
                    </RequirePermission>
                  </PrivateRoute>
                }
              />
              <Route
                path="/frota/motoristas"
                element={
                  <PrivateRoute>
                    <RequirePermission permission="FROTA">
                      <MotoristasPage />
                    </RequirePermission>
                  </PrivateRoute>
                }
              />
              <Route
                path="/frota/manutencao"
                element={
                  <PrivateRoute>
                    <RequirePermission permission="FROTA">
                      <ManutencaoHome />
                    </RequirePermission>
                  </PrivateRoute>
                }
              />
              <Route
                path="/frota/manutencao/controle"
                element={
                  <PrivateRoute>
                    <RequirePermission permission="FROTA">
                      <ManutencaoPage />
                    </RequirePermission>
                  </PrivateRoute>
                }
              />
              <Route
                path="/frota/manutencao/dashboard"
                element={
                  <PrivateRoute>
                    <RequirePermission permission="FROTA">
                      <ManutencaoDashboard />
                    </RequirePermission>
                  </PrivateRoute>
                }
              />
              <Route path="/cadastro" element={<Cadastro />} />
              <Route
                path="/sugestao-abastecimento" // Caminho que o botão navega
                element={
                  <PrivateRoute>
                    <SugestaoAbastecimento />{" "}
                  </PrivateRoute>
                }
              />
              <Route path="/admin/broadcast" element={<AdminBroadcast />} />
              <Route path="/roteirizacao" element={<RoteirizacaoPage />} />
              <Route
                path="/rh/recruitai"
                element={
                  <PrivateRoute>
                    <RequireRH>
                      <RecruitAI />
                    </RequireRH>
                  </PrivateRoute>
                }
              />
              <Route
                path="/rh/candidatos"
                element={
                  <PrivateRoute>
                    <CandidatesPage />
                  </PrivateRoute>
                }
              />

              <Route
                path="/cadastrar2"
                element={
                  <PrivateRoute>
                    <OcorrenciaForm2 addOcorrencia={addOcorrencia} />
                  </PrivateRoute>
                }
              />
              <Route
                path="/editar-pendencia/:id"
                element={
                  <PrivateRoute>
                    <EditarPendenciaApp />
                  </PrivateRoute>
                }
              />
              <Route
                path="/caixa"
                element={
                  <PrivateRoute>
                    <RequirePermission permission="CAIXA">
                      <CaixaHome />
                    </RequirePermission>
                  </PrivateRoute>
                }
              />
              <Route
                path="/caixa/bilhete"
                element={
                  <PrivateRoute>
                    <RequirePermission permission="CAIXA">
                      <CaixaBilhete />
                    </RequirePermission>
                  </PrivateRoute>
                }
              />
              <Route
                path="/caixa/nfe"
                element={
                  <PrivateRoute>
                    <RequirePermission permission="CAIXA">
                      <NFE />
                    </RequirePermission>
                  </PrivateRoute>
                }
              />
            </Routes>
          </Box>

          <StatusBar />

          {/* Global Floating Action Button - Chamado Rápido */}
          {/* Exibe o botão em todas as telas, exceto Login */}
          {location.pathname !== "/login" && (
            <>
              <ChamadoModal
                isOpen={isChamadoModalOpen}
                onClose={() => setIsChamadoModalOpen(false)}
                updatedIds={updatedChamadoIds}
                onClearId={(id) => setUpdatedChamadoIds(prev => prev.filter(x => x !== id))}
              />


              <button
                id="btn-chamado-fab"
                onClick={() => {
                  setIsChamadoModalOpen(true);
                }}
                className="fixed bottom-20 right-6 z-[9999] p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl shadow-blue-600/30 transition-all hover:scale-110 active:scale-95 group flex items-center justify-center"
                title="Chamado Rápido"
                style={{ zIndex: 9999 }} // Garantir que está acima de tudo
              >
                <span className="material-symbols-rounded text-3xl animate-pulse">support_agent</span>

                {/* Badge de Notificação */}
                {updatedChamadoIds.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-5 w-5 bg-red-600 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">
                      {updatedChamadoIds.length}
                    </span>
                  </span>
                )}

                {/* Tooltip on hover */}
                <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-800 text-white text-xs font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  Abrir Chamado
                </span>
              </button>
            </>
          )}

        </Box>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
