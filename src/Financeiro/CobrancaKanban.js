import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import AppHeader from "../components/AppHeader";
import { API_BASE_URL } from "../utils/apiConfig";

// ─── Constantes ──────────────────────────────────────────────────────────────

const COLUNAS = [
  {
    id: "pendente",
    label: "Pendente",
    icon: "hourglass_empty",
    dot: "bg-slate-400",
    iconColor: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300",
  },
  {
    id: "cobrado",
    label: "Cobrado",
    icon: "forward_to_inbox",
    dot: "bg-blue-500",
    iconColor: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  },
  {
    id: "pago",
    label: "Pago / Resolvido",
    icon: "task_alt",
    dot: "bg-emerald-500",
    iconColor: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  {
    id: "sem_retorno",
    label: "Sem Retorno",
    icon: "voice_over_off",
    dot: "bg-red-500",
    iconColor: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  },
  {
    id: "negociando",
    label: "Em Negociação",
    icon: "handshake",
    dot: "bg-amber-500",
    iconColor: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  },
];

const fmtBRL = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const diasDesde = (isoStr) => {
  if (!isoStr) return null;
  const diff = Date.now() - new Date(isoStr).getTime();
  return Math.floor(diff / 86400000);
};

const fmtDataCurta = (isoStr) => {
  if (!isoStr) return "-";
  const s = String(isoStr);
  // Campos DATE puro (ex: "2026-06-26") — parseia direto para evitar shift de UTC
  if (!s.includes("T") && !s.includes(" ")) {
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  }
  return new Date(s).toLocaleDateString("pt-BR");
};

const fmtDateTime = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

// ─── Modal de Ajuda ───────────────────────────────────────────────────────────

const HelpModal = ({ onClose }) => {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const colunas = [
    { id: "pendente",    dot: "bg-slate-400",  label: "Pendente",          desc: "Cliente inadimplente no sistema que ainda não foi cobrado. Gerado automaticamente a partir dos dados do Protheus." },
    { id: "cobrado",     dot: "bg-blue-500",   label: "Cobrado",           desc: "Cobrança enviada via WhatsApp. Aguardando resposta do cliente." },
    { id: "pago",        dot: "bg-green-500",  label: "Pago / Resolvido",  desc: "Cliente quitou os títulos ou a situação foi resolvida. O saldo zerado no Protheus move o card automaticamente para cá." },
    { id: "sem_retorno", dot: "bg-red-500",    label: "Sem Retorno",       desc: "Cliente não respondeu após 24h da cobrança, ou não pagou na data combinada." },
    { id: "negociando",  dot: "bg-amber-500",  label: "Em Negociação",     desc: "Cliente informou uma data de pagamento. O card entra aqui automaticamente ao definir a previsão." },
  ];

  const regras = [
    { icon: "alarm",          color: "text-blue-500",  title: "Sem resposta em 24h",         desc: "Se o card estiver em 'Cobrado' e o cliente não responder em até 24 horas após o envio, ele é movido automaticamente para 'Sem Retorno'." },
    { icon: "event_busy",     color: "text-red-500",   title: "Previsão expirada",           desc: "Se o cliente deu uma data de pagamento (Em Negociação) e ela passou sem pagamento, o card é movido para 'Sem Retorno' e exibe o aviso 'Não cumpriu o acordo'." },
    { icon: "check_circle",   color: "text-green-500", title: "Título pago no Protheus",     desc: "Ao atualizar o painel, se o cliente não aparece mais na lista de inadimplentes do sistema (saldo = 0), o card vai automaticamente para 'Pago / Resolvido'." },
    { icon: "pending_actions",color: "text-amber-500", title: "Data de previsão definida",   desc: "Ao preencher a data de previsão de pagamento em qualquer card, ele é movido automaticamente para a coluna 'Em Negociação'." },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden" style={{ maxHeight: "90vh" }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
          <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-rounded text-white text-xl">help</span>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Como funciona o Painel de Cobrança</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Guia completo de uso e regras automáticas</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-7">

          {/* Visão geral */}
          <section>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="material-symbols-rounded text-green-500 text-lg">view_kanban</span>
              Visão Geral
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              O Painel de Cobrança organiza todos os clientes inadimplentes em colunas (Kanban), permitindo acompanhar
              o status de cada cobrança em tempo real. Os cards são movidos automaticamente conforme as ações e regras
              configuradas, ou manualmente pelo operador.
            </p>
          </section>

          {/* Colunas */}
          <section>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="material-symbols-rounded text-blue-500 text-lg">view_column</span>
              Colunas do Painel
            </h3>
            <div className="space-y-2.5">
              {colunas.map((c) => (
                <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700">
                  <span className={`w-3 h-3 rounded-full ${c.dot} flex-shrink-0 mt-1`} />
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{c.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Regras automáticas */}
          <section>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="material-symbols-rounded text-amber-500 text-lg">auto_fix_high</span>
              Regras Automáticas
            </h3>
            <div className="space-y-2.5">
              {regras.map((r, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700">
                  <span className={`material-symbols-rounded text-xl flex-shrink-0 ${r.color}`}>{r.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{r.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Como cobrar */}
          <section>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="material-symbols-rounded text-green-500 text-lg">send</span>
              Como Enviar uma Cobrança
            </h3>
            <ol className="space-y-2">
              {[
                "Na lista de clientes, clique em 'Cobrar' ao lado do cliente desejado.",
                "Selecione os títulos em aberto que deseja incluir na mensagem.",
                "Escolha um template de mensagem (Cobrança Padrão, Lembrete Amigável ou Última Notificação).",
                "Visualize o preview da mensagem e confirme o envio.",
                "O card do cliente é criado automaticamente na coluna 'Cobrado'.",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </section>

          {/* Previsão de pagamento */}
          <section>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="material-symbols-rounded text-amber-500 text-lg">event</span>
              Previsão de Pagamento
            </h3>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
              Cada card possui um campo de data de previsão. Ao preencher, o card move para <strong>Em Negociação</strong>.
              Se a data passar sem que o cliente apareça como pago no sistema, o card é movido para <strong>Sem Retorno</strong>{" "}
              e exibe o aviso <em>Não cumpriu o acordo</em>. Uma nova data pode ser definida para renegociar.
            </div>
          </section>

          {/* Ações manuais */}
          <section>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="material-symbols-rounded text-slate-500 text-lg">touch_app</span>
              Ações Manuais no Card
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { icon: "more_vert",       label: "Menu ⋮",               desc: "Mover para outra coluna ou remover do painel." },
                { icon: "chat",            label: "Ver conversa",         desc: "Abre o histórico de mensagens enviadas ao cliente." },
                { icon: "edit_note",       label: "Anotação",             desc: "Registre observações sobre a negociação. Clique no campo cinza." },
                { icon: "delete",          label: "Remover do painel",    desc: "Remove o card. O cliente volta para 'Pendente' automaticamente." },
              ].map((a, i) => (
                <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700">
                  <span className="material-symbols-rounded text-slate-500 dark:text-slate-400 text-base flex-shrink-0">{a.icon}</span>
                  <div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{a.label}</p>
                    <p className="text-[11px] text-slate-400 leading-snug">{a.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Nota de integração */}
          <section className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex items-start gap-3">
            <span className="material-symbols-rounded text-blue-500 text-xl flex-shrink-0">info</span>
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              <strong>Integração WhatsApp:</strong> no momento o envio é simulado (modo teste). As mensagens são salvas no sistema
              mas não chegam ao cliente. Quando a integração com a API do WhatsApp (Meta Cloud) for ativada, o fluxo permanece
              o mesmo — somente o envio real será habilitado.
            </p>
          </section>

        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

// Converte *texto* do WhatsApp em <strong>
const renderWhatsApp = (texto) => {
  if (!texto) return null;
  return texto.split(/(\*[^*\n]+\*)/g).map((parte, i) =>
    parte.startsWith("*") && parte.endsWith("*") && parte.length > 2
      ? <strong key={i}>{parte.slice(1, -1)}</strong>
      : <span key={i}>{parte}</span>
  );
};

// ─── Modal de conversa (abre sobre o kanban) ──────────────────────────────────

const InboxModal = ({ card, onClose }) => {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const fimRef = useRef(null);
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");

  useEffect(() => {
    const carregar = async () => {
      try {
        const { data } = await axios.get(
          `${API_BASE_URL}/api/cobranca/historico/${card.cliente_codigo}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setDados(data);
      } catch {
        setDados({ cobrancas: [], mensagens: [], conversa: null });
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, [card.cliente_codigo]);

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: "smooth" }); }, [dados?.mensagens]);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden" style={{ maxHeight: "85vh" }}>
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-rounded text-green-600 text-xl">person</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 dark:text-white truncate">{card.cliente_nome}</p>
            <p className="text-xs text-slate-400">
              {dados?.mensagens?.length || 0} mensagem(ns) · {fmtBRL(card.valor_divida)} cobrado
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {/* Histórico resumido */}
        {dados?.cobrancas?.length > 0 && (
          <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 flex-shrink-0">
            <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-1.5 uppercase tracking-wide">
              Histórico de cobranças ({dados.cobrancas.length})
            </p>
            <div className="flex flex-col gap-1.5 max-h-24 overflow-y-auto">
              {dados.cobrancas.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <span className="material-symbols-rounded text-green-500 text-sm">check_circle</span>
                  <span className="font-medium">{c.template_usado}</span>
                  <span className="text-slate-400">·</span>
                  <span>{fmtBRL(c.valor)}</span>
                  <span className="text-slate-400">·</span>
                  <span>{fmtDateTime(c.data_envio)}</span>
                  <span className="text-slate-400">· por {c.enviado_por}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F0F4F8] dark:bg-slate-900/50">
          {loading && (
            <div className="flex justify-center items-center h-20">
              <span className="material-symbols-rounded animate-spin text-slate-400 text-3xl">progress_activity</span>
            </div>
          )}
          {!loading && dados?.mensagens?.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-400">
              <span className="material-symbols-rounded text-5xl">chat_bubble_outline</span>
              <p className="text-sm">Nenhuma mensagem ainda.</p>
            </div>
          )}
          {dados?.mensagens?.map((m) => (
            <div key={m.id} className={`flex ${m.direcao === "enviada" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                m.direcao === "enviada"
                  ? "bg-[#DCF8C6] dark:bg-green-800 text-slate-800 dark:text-white rounded-tr-none"
                  : "bg-white dark:bg-slate-700 text-slate-800 dark:text-white rounded-tl-none"
              }`}>
                <p className="whitespace-pre-wrap leading-relaxed">{renderWhatsApp(m.conteudo)}</p>
                <p className={`text-[10px] mt-1 ${m.direcao === "enviada" ? "text-green-700 dark:text-green-300" : "text-slate-400"} text-right`}>
                  {fmtDateTime(m.criado_em)}
                  {m.direcao === "enviada" && (
                    <span className="ml-1 material-symbols-rounded text-[12px] align-middle">done_all</span>
                  )}
                </p>
              </div>
            </div>
          ))}
          <div ref={fimRef} />
        </div>
      </div>
    </div>
  );
};

// ─── Card de cliente ─────────────────────────────────────────────────────────

const KanbanCard = ({ card, colAtual, onMover, onObsChange, onAbrirInbox, onRemover, onPrevisao }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [editingObs, setEditingObs] = useState(false);
  const [obs, setObs] = useState(card.observacao || "");
  const menuRef = useRef(null);

  const hoje = new Date().toISOString().split("T")[0];
  const dataPrevisao = card.data_previsao ? card.data_previsao.split("T")[0] : "";
  const previsaoVencida = dataPrevisao && dataPrevisao < hoje;

  // Fecha menu ao clicar fora
  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const dias = diasDesde(card.ultima_cobranca);
  const proximas = COLUNAS.filter((c) => c.id !== "pendente" && c.id !== colAtual);

  const salvarObs = () => {
    onObsChange(card.cliente_codigo, obs);
    setEditingObs(false);
  };

  // Cor do badge de valor
  const valorBadge =
    card.valor_divida >= 100000
      ? "text-red-600 dark:text-red-400"
      : card.valor_divida >= 20000
      ? "text-orange-600 dark:text-orange-400"
      : "text-slate-700 dark:text-slate-200";

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all p-4 flex flex-col gap-3 group">
      {/* Cabeçalho do card */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p
            className="font-bold text-slate-800 dark:text-white text-base leading-tight truncate cursor-pointer hover:text-green-600 dark:hover:text-green-400 transition-colors"
            title={card.cliente_nome}
            onClick={() => onAbrirInbox(card)}
          >
            {card.cliente_nome}
          </p>
          {card.vendedor && (
            <p className="text-xs text-slate-400 mt-0.5 truncate font-medium">{card.vendedor}</p>
          )}
        </div>

        {/* Menu mover */}
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            title="Mover para..."
          >
            <span className="material-symbols-rounded text-lg">more_vert</span>
          </button>

          {showMenu && (
            <div className="absolute right-0 top-8 z-30 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl w-48 py-1 overflow-hidden">
              <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Mover para</p>
              {proximas.map((col) => (
                <button
                  key={col.id}
                  onClick={() => { onMover(card, col.id); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition text-left"
                >
                  <span className={`w-2 h-2 rounded-full ${col.dot} flex-shrink-0`} />
                  {col.label}
                </button>
              ))}
              <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
                <button
                  onClick={() => { setShowMenu(false); onAbrirInbox(card); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition text-left"
                >
                  <span className="material-symbols-rounded text-sm">chat</span>
                  Ver conversa
                </button>
                {colAtual !== "pendente" && (
                  <button
                    onClick={() => { setShowMenu(false); onRemover(card); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition text-left"
                  >
                    <span className="material-symbols-rounded text-sm">delete</span>
                    Remover do painel
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Valor e títulos */}
      <div className="flex items-center justify-between">
        <p className={`text-base font-bold ${valorBadge}`}>{fmtBRL(card.valor_divida)}</p>
        <div className="flex items-center gap-2">
          {card.qtd_titulos > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-bold">
              {card.qtd_titulos} tít.
            </span>
          )}
          {card.total_cobrancas > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold">
              {card.total_cobrancas}× cobrado
            </span>
          )}
        </div>
      </div>

      {/* Última cobrança */}
      {card.ultima_cobranca && (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="material-symbols-rounded text-sm">history</span>
          <span>
            {fmtDataCurta(card.ultima_cobranca)}
            {dias !== null && (
              <span className={`ml-1 font-semibold ${dias > 7 ? "text-red-500" : dias > 3 ? "text-amber-500" : "text-slate-400"}`}>
                ({dias === 0 ? "hoje" : `${dias}d atrás`})
              </span>
            )}
          </span>
        </div>
      )}

      {/* Observação */}
      {editingObs ? (
        <div className="flex flex-col gap-1.5">
          <textarea
            className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 p-2 resize-none focus:ring-2 focus:ring-green-500 outline-none"
            rows={3}
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Anotação sobre este cliente..."
            autoFocus
          />
          <div className="flex gap-1.5">
            <button onClick={salvarObs} className="flex-1 py-1 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition">Salvar</button>
            <button onClick={() => { setEditingObs(false); setObs(card.observacao || ""); }} className="flex-1 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-500 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition">Cancelar</button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => setEditingObs(true)}
          className="min-h-[28px] rounded-lg border border-dashed border-slate-200 dark:border-slate-600 px-2 py-1.5 cursor-text hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/10 transition"
        >
          <p className={`text-xs leading-snug ${obs ? "text-slate-600 dark:text-slate-300" : "text-slate-300 dark:text-slate-600 italic"}`}>
            {obs || "Adicionar anotação..."}
          </p>
        </div>
      )}

      {/* Previsão de pagamento — só para cards com registro no banco (não-pendente) */}
      {colAtual !== "pendente" && (
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wide font-semibold">
            <span className="material-symbols-rounded text-sm">event</span>
            Previsão de pagamento
          </label>
          <input
            type="date"
            value={dataPrevisao}
            min={colAtual === "sem_retorno" ? undefined : hoje}
            onChange={(e) => onPrevisao(card.cliente_codigo, e.target.value || null)}
            className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 px-2 py-1.5 focus:ring-2 focus:ring-amber-500 outline-none"
          />
          {previsaoVencida && (
            <div className="flex items-start gap-1.5 px-2.5 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <span className="material-symbols-rounded text-red-500 text-base flex-shrink-0">gavel</span>
              <p className="text-[10px] text-red-600 dark:text-red-400 font-semibold leading-snug">
                Não cumpriu o acordo — previsão de {fmtDataCurta(card.data_previsao)} expirou
              </p>
            </div>
          )}
          {dataPrevisao && !previsaoVencida && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
              <span className="material-symbols-rounded text-sm">pending_actions</span>
              Pagamento previsto para {fmtDataCurta(card.data_previsao)}
            </p>
          )}
        </div>
      )}

      {/* Botão inbox */}
      <button
        onClick={() => onAbrirInbox(card)}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:border-green-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/10 transition"
      >
        <span className="material-symbols-rounded text-sm">chat</span>
        Ver conversa
      </button>
    </div>
  );
};

// ─── Coluna do Kanban ─────────────────────────────────────────────────────────

const KanbanColuna = ({ config, cards, onMover, onObsChange, onAbrirInbox, onRemover, onPrevisao }) => {
  const total = cards.reduce((a, c) => a + Number(c.valor_divida || 0), 0);

  return (
    <div className="flex flex-col flex-shrink-0 w-72">
      {/* Header da coluna — fundo branco neutro, acento via ícone colorido */}
      <div className="flex items-center justify-between px-3 py-2.5 rounded-2xl mb-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${config.iconColor}`}>
            <span className="material-symbols-rounded text-base">{config.icon}</span>
          </div>
          <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{config.label}</span>
          <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs font-bold px-1.5 py-0.5 rounded-full">
            {cards.length}
          </span>
        </div>
        {total > 0 && config.id !== "pendente" && (
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">{fmtBRL(total)}</span>
        )}
      </div>

      {/* Cards — fundo neutro uniforme em todas as colunas */}
      <div className="flex-1 rounded-2xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700/50 p-2 flex flex-col gap-2.5 min-h-32 overflow-y-auto" style={{ maxHeight: "calc(100vh - 260px)" }}>
        {cards.length === 0 && (
          <div className="flex flex-col items-center justify-center h-24 gap-2 text-slate-300 dark:text-slate-600">
            <span className="material-symbols-rounded text-4xl">{config.icon}</span>
            <p className="text-xs font-medium">Vazio</p>
          </div>
        )}
        {cards.map((card) => (
          <KanbanCard
            key={card.cliente_codigo}
            card={card}
            colAtual={config.id}
            onMover={onMover}
            onObsChange={onObsChange}
            onAbrirInbox={onAbrirInbox}
            onRemover={onRemover}
            onPrevisao={onPrevisao}
          />
        ))}
      </div>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

const CobrancaKanban = () => {
  const navigate = useNavigate();
  const empresa = sessionStorage.getItem("empresa") || localStorage.getItem("empresa") || "140";

  const [kanban, setKanban] = useState([]);   // registros do MySQL
  const [protheus, setProtheus] = useState([]); // clientes do Protheus
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [inboxModal, setInboxModal] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [resKanban, resProtheus] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/cobranca/kanban`, { headers }),
        axios.get(`${API_BASE_URL}/cliente?empresa=${empresa}`, { headers }),
      ]);

      // Agrupa Protheus por cliente
      const agrupado = (resProtheus.data || []).reduce((acc, cur) => {
        const cod = cur.E1_CLIENTE;
        if (!acc[cod]) {
          acc[cod] = {
            cliente_codigo: cod,
            cliente_nome: cur.E1_NOMCLI,
            valor_divida: 0,
            qtd_titulos: 0,
            vendedor: cur.NOME_VENDEDOR || null,
          };
        }
        acc[cod].valor_divida += parseFloat(cur.E1_SALDO || 0);
        acc[cod].qtd_titulos += 1;
        return acc;
      }, {});
      const protheusValues = Object.values(agrupado);
      setProtheus(protheusValues);

      // Auto-pago: card em "cobrado" ou "negociando" cujo cliente saiu dos inadimplentes no Protheus (E1_SALDO zerado)
      const protheusSet = new Set(protheusValues.map((p) => p.cliente_codigo));
      const kanbanData = resKanban.data || [];
      const autoPago = kanbanData.filter((k) => (k.coluna === "cobrado" || k.coluna === "negociando") && !protheusSet.has(k.cliente_codigo));

      const kanbanFinal = autoPago.length > 0
        ? kanbanData.map((k) => autoPago.some((ap) => ap.cliente_codigo === k.cliente_codigo) ? { ...k, coluna: "pago" } : k)
        : kanbanData;
      setKanban(kanbanFinal);

      // Persiste auto-pago no banco (fire & forget)
      autoPago.forEach((card) => {
        axios.put(
          `${API_BASE_URL}/api/cobranca/kanban/${card.cliente_codigo}`,
          { coluna: "pago", cliente_nome: card.cliente_nome, valor_divida: card.valor_divida, vendedor: card.vendedor },
          { headers }
        ).catch(() => {});
      });
    } catch (err) {
      console.error("Erro ao carregar Kanban:", err);
    } finally {
      setLoading(false);
    }
  }, [empresa]);

  useEffect(() => { carregar(); }, [carregar]);

  // Mescla: kanban map por código
  const kanbanMap = Object.fromEntries(kanban.map((k) => [k.cliente_codigo, k]));

  // Pendentes = clientes no Protheus sem registro no kanban
  const pendentes = protheus
    .filter((p) => !kanbanMap[p.cliente_codigo])
    .map((p) => ({ ...p, coluna: "pendente", total_cobrancas: 0, ultima_cobranca: null, observacao: null }));

  // Cards com dados Protheus mesclados no kanban
  // valor_divida mantém o que foi cobrado (do banco), NÃO sobrescreve com a dívida total do Protheus
  const kanbanMerged = kanban.map((k) => {
    const prot = protheus.find((p) => p.cliente_codigo === k.cliente_codigo);
    return {
      ...k,
      qtd_titulos: prot ? prot.qtd_titulos : k.qtd_titulos,
      vendedor: prot?.vendedor || k.vendedor,
    };
  });

  // Todos os cards agrupados por coluna
  const todos = [...pendentes, ...kanbanMerged];

  const filtrados = busca
    ? todos.filter((c) => c.cliente_nome.toLowerCase().includes(busca.toLowerCase()))
    : todos;

  const porColuna = (id) => filtrados.filter((c) => c.coluna === id);

  // Métricas rápidas
  const totalDivida = todos.reduce((a, c) => a + Number(c.valor_divida || 0), 0);
  const totalClientes = todos.length;
  const pagos = todos.filter((c) => c.coluna === "pago").length;
  const semRetorno = todos.filter((c) => c.coluna === "sem_retorno").length;

  const moverCard = async (card, novaColuna) => {
    // Atualiza estado local imediatamente
    if (card.coluna === "pendente") {
      setProtheus((prev) => prev.filter((p) => p.cliente_codigo !== card.cliente_codigo));
      setKanban((prev) => [...prev, { ...card, coluna: novaColuna, ultima_cobranca: null, total_cobrancas: 0 }]);
    } else {
      setKanban((prev) => prev.map((k) => k.cliente_codigo === card.cliente_codigo ? { ...k, coluna: novaColuna } : k));
    }

    try {
      await axios.put(
        `${API_BASE_URL}/api/cobranca/kanban/${card.cliente_codigo}`,
        { coluna: novaColuna, cliente_nome: card.cliente_nome, valor_divida: card.valor_divida, vendedor: card.vendedor },
        { headers }
      );
    } catch (err) {
      Swal.fire("Erro", "Falha ao mover card.", "error");
      carregar(); // reverte
    }
  };

  const salvarObs = async (cliente_codigo, observacao) => {
    setKanban((prev) => prev.map((k) => k.cliente_codigo === cliente_codigo ? { ...k, observacao } : k));
    try {
      await axios.patch(
        `${API_BASE_URL}/api/cobranca/kanban/${cliente_codigo}/obs`,
        { observacao },
        { headers }
      );
    } catch {
      Swal.fire("Erro", "Falha ao salvar anotação.", "error");
    }
  };

  const salvarPrevisao = async (cliente_codigo, data_previsao) => {
    setKanban((prev) => prev.map((k) =>
      k.cliente_codigo === cliente_codigo
        ? { ...k, data_previsao: data_previsao || null, coluna: data_previsao && k.coluna !== "pago" ? "negociando" : k.coluna }
        : k
    ));
    try {
      await axios.patch(
        `${API_BASE_URL}/api/cobranca/kanban/${cliente_codigo}/previsao`,
        { data_previsao: data_previsao || null },
        { headers }
      );
    } catch {
      Swal.fire("Erro", "Falha ao salvar previsão.", "error");
      carregar();
    }
  };

  const removerCard = async (card) => {
    const confirma = await Swal.fire({
      title: "Resetar cliente?",
      html: `
        <p style="margin-bottom:12px">Todo o histórico de <strong>${card.cliente_nome}</strong> será apagado:</p>
        <ul style="text-align:left;font-size:13px;color:#64748b;line-height:2">
          <li>✖ Cobranças enviadas</li>
          <li>✖ Mensagens da conversa</li>
          <li>✖ Anotação e data de previsão</li>
          <li>✖ Status (voltará para Pendente)</li>
        </ul>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, resetar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
    });
    if (!confirma.isConfirmed) return;

    setKanban((prev) => prev.filter((k) => k.cliente_codigo !== card.cliente_codigo));
    try {
      await axios.delete(`${API_BASE_URL}/api/cobranca/kanban/${card.cliente_codigo}`, { headers });
    } catch {
      Swal.fire("Erro", "Falha ao resetar cliente.", "error");
      carregar();
    }
  };

  const abrirInbox = (card) => {
    setInboxModal(card);
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans pb-8 transition-colors duration-300">
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />

      <AppHeader
        title="Painel de Cobrança"
        subtitle="Financeiro · Contas a Receber"
        icon="view_kanban"
        iconGradient="from-green-500 to-emerald-400"
        iconShadow="shadow-green-500/20"
        onBack="/financeiro/contas-receber/cobranca"
      />

      <main className="px-4 md:px-6 py-6">
        {/* Navegação */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <button
            onClick={() => navigate("/financeiro/contas-receber/cobranca")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white shadow-sm hover:shadow-md transition-all font-bold text-sm"
          >
            <span className="material-symbols-rounded text-lg">arrow_back</span>
            Lista de clientes
          </button>

          {/* Busca */}
          <div className="relative flex-1 max-w-xs">
            <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Filtrar cliente..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>

          <button
            onClick={carregar}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-500 hover:text-green-600 shadow-sm hover:shadow-md transition text-sm font-semibold"
          >
            <span className={`material-symbols-rounded text-lg ${loading ? "animate-spin" : ""}`}>refresh</span>
            Atualizar
          </button>

          <button
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-500 hover:text-green-600 shadow-sm hover:shadow-md transition text-sm font-semibold"
            title="Como funciona este painel"
          >
            <span className="material-symbols-rounded text-lg">help</span>
            Ajuda
          </button>
        </div>


        {/* Modais */}
        {inboxModal && <InboxModal card={inboxModal} onClose={() => setInboxModal(null)} />}
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

        {/* Board */}
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <span className="material-symbols-rounded animate-spin text-green-500 text-5xl">progress_activity</span>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "60vh" }}>
            {COLUNAS.map((col) => (
              <KanbanColuna
                key={col.id}
                config={col}
                cards={porColuna(col.id)}
                onMover={moverCard}
                onObsChange={salvarObs}
                onAbrirInbox={abrirInbox}
                onRemover={removerCard}
                onPrevisao={salvarPrevisao}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default CobrancaKanban;
