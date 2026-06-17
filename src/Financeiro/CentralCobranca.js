import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import AppHeader from "../components/AppHeader";
import { API_BASE_URL } from "../utils/apiConfig";

const fmtBRL = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

const diasDesde = (iso) => {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
};

const gravidade = (saldo) => {
  if (saldo >= 100000) return { dot: "bg-red-500",    saldoColor: "text-red-600 dark:text-red-400",    bar: "bg-red-500",    badgeColor: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",    label: "Crítico"  };
  if (saldo >= 50000)  return { dot: "bg-orange-500", saldoColor: "text-orange-600 dark:text-orange-400", bar: "bg-orange-400", badgeColor: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400", label: "Alto"     };
  if (saldo >= 10000)  return { dot: "bg-amber-400",  saldoColor: "text-amber-600 dark:text-amber-400",  bar: "bg-amber-400",  badgeColor: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",  label: "Médio"    };
  return                      { dot: "bg-slate-300",  saldoColor: "text-slate-600 dark:text-slate-400",  bar: null,            badgeColor: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",   label: "Normal"   };
};

const statusCobranca = (cobrado) => {
  if (!cobrado) return {
    icon: "mark_email_unread",
    label: "Nunca cobrado",
    sub: null,
    color: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
  };
  const dias = diasDesde(cobrado.data_envio);
  const total = cobrado.total_cobrancas || 1;
  const sub = `${total} cobrança${total > 1 ? "s" : ""}`;
  if (dias === 0) return { icon: "send",                    label: "Cobrado hoje", sub, color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"       };
  if (dias <= 3)  return { icon: "send",                    label: `Há ${dias}d`,  sub, color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"       };
  if (dias <= 7)  return { icon: "history",                 label: `Há ${dias}d`,  sub, color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"   };
  if (dias <= 14) return { icon: "history",                 label: `Há ${dias}d`,  sub, color: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" };
  return                 { icon: "notification_important",  label: `Há ${dias}d`,  sub, color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"           };
};

// E1_VENCREA vem como "YYYYMMDD" do Protheus
const fmtVenc = (v) => {
  if (!v || v.length !== 8) return "-";
  return `${v.slice(6, 8)}/${v.slice(4, 6)}/${v.slice(0, 4)}`;
};

// ─── Modal de Cobrança ──────────────────────────────────────────────────────
const ModalCobranca = ({ cliente, onClose, onSucesso, templates }) => {
  const [templateId, setTemplateId] = useState(templates[0]?.id || "");
  const [selecionados, setSelecionados] = useState(new Set());
  const [enviando, setEnviando] = useState(false);

  const titulos = cliente.titulos || [];

  const toggleTitulo = (num) =>
    setSelecionados((prev) => {
      const next = new Set(prev);
      next.has(num) ? next.delete(num) : next.add(num);
      return next;
    });

  const toggleTodos = () =>
    setSelecionados(selecionados.size === titulos.length ? new Set() : new Set(titulos.map((t) => t.E1_NUM)));

  const titulosSel = titulos.filter((t) => selecionados.has(t.E1_NUM));
  const valorSel = titulosSel.reduce((a, t) => a + parseFloat(t.E1_SALDO || 0), 0);

  const listaTexto = titulosSel
    .map((t) => `• ${t.E1_NUM}  →  ${fmtBRL(t.E1_SALDO)}  |  venc: ${fmtVenc(t.E1_VENCREA)}`)
    .join("\n");

  const template = templates.find((t) => t.id === templateId);
  const preview = template && selecionados.size > 0
    ? template.mensagem
        .replace("{nome}", cliente.cliente)
        .replace("{titulos}", listaTexto)
    : template
    ? "Selecione ao menos um título para ver o preview."
    : "";

  const confirmar = async () => {
    if (selecionados.size === 0) {
      Swal.fire("Atenção", "Selecione ao menos um título para cobrar.", "warning");
      return;
    }
    setEnviando(true);
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      await axios.post(
        `${API_BASE_URL}/api/cobranca/enviar`,
        {
          cliente_codigo: cliente.codigo || cliente.cliente,
          cliente_nome: cliente.cliente,
          template_id: templateId,
          valor: valorSel,
          titulos_selecionados: titulosSel.map((t) => ({
            numero: t.E1_NUM,
            valor: parseFloat(t.E1_SALDO || 0),
            vencimento: fmtVenc(t.E1_VENCREA),
          })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSucesso(cliente.cliente);
      onClose();
    } catch (err) {
      Swal.fire("Erro", err.response?.data?.erro || "Falha ao enviar cobrança.", "error");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl flex flex-col gap-4 p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Cobrar cliente</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {/* Info cliente */}
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 flex items-center gap-4 flex-shrink-0">
          <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-rounded text-green-600 dark:text-green-400 text-2xl">person</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 dark:text-white truncate">{cliente.cliente}</p>
            <p className="text-xs text-slate-400">{titulos.length} título(s) · Vendedor: {cliente.vendedor || "-"}</p>
          </div>
          {selecionados.size > 0 && (
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-slate-400">{selecionados.size} selecionado(s)</p>
              <p className="font-bold text-red-600 dark:text-red-400">{fmtBRL(valorSel)}</p>
            </div>
          )}
        </div>

        {/* Seleção de títulos */}
        <div className="flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Selecionar títulos
            </label>
            <button
              onClick={toggleTodos}
              className="text-xs text-green-600 dark:text-green-400 font-semibold hover:underline"
            >
              {selecionados.size === titulos.length ? "Desmarcar todos" : "Selecionar todos"}
            </button>
          </div>

          <div className="border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden">
            {/* Cabeçalho */}
            <div className="grid grid-cols-12 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              <div className="col-span-1"></div>
              <div className="col-span-4">Título</div>
              <div className="col-span-4 text-right">Saldo</div>
              <div className="col-span-3 text-right">Vencimento</div>
            </div>
            {/* Linhas — scroll se muitos títulos */}
            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
              {titulos.map((t) => {
                const sel = selecionados.has(t.E1_NUM);
                return (
                  <label
                    key={t.E1_NUM}
                    className={`grid grid-cols-12 px-3 py-2.5 items-center cursor-pointer transition ${
                      sel
                        ? "bg-green-50 dark:bg-green-900/20"
                        : "hover:bg-slate-50 dark:hover:bg-slate-700/30"
                    }`}
                  >
                    <div className="col-span-1">
                      <input
                        type="checkbox"
                        checked={sel}
                        onChange={() => toggleTitulo(t.E1_NUM)}
                        className="w-4 h-4 accent-green-600 rounded"
                      />
                    </div>
                    <div className="col-span-4">
                      <p className="text-sm font-mono font-semibold text-slate-800 dark:text-white">{t.E1_NUM}</p>
                      <p className="text-[10px] text-slate-400">{t.E1_TIPO || ""}</p>
                    </div>
                    <div className="col-span-4 text-right">
                      <p className="text-sm font-bold text-red-600 dark:text-red-400">{fmtBRL(t.E1_SALDO)}</p>
                    </div>
                    <div className="col-span-3 text-right">
                      <p className="text-xs text-slate-500 dark:text-slate-400">{fmtVenc(t.E1_VENCREA)}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Template */}
        <div className="flex-shrink-0">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Template de mensagem</label>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-green-500 text-sm"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </select>
        </div>

        {/* Preview */}
        <div className="flex-shrink-0">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Preview da mensagem</label>
          <div className={`rounded-xl rounded-tr-none p-4 text-sm whitespace-pre-wrap leading-relaxed shadow-sm border ${
            selecionados.size > 0
              ? "bg-[#DCF8C6] dark:bg-green-900/30 text-slate-800 dark:text-slate-100 border-green-200 dark:border-green-800"
              : "bg-slate-50 dark:bg-slate-700/50 text-slate-400 border-slate-200 dark:border-slate-600 italic"
          }`}>
            {preview}
          </div>
        </div>

        <div className="flex gap-3 justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={enviando || selecionados.size === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enviando ? (
              <span className="material-symbols-rounded animate-spin text-lg">progress_activity</span>
            ) : (
              <span className="material-symbols-rounded text-lg">send</span>
            )}
            {enviando ? "Enviando..." : `Confirmar envio${selecionados.size > 0 ? ` (${selecionados.size})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Componente principal ────────────────────────────────────────────────────
const CentralCobranca = () => {
  const navigate = useNavigate();
  const empresa = sessionStorage.getItem("empresa") || localStorage.getItem("empresa") || "140";

  const [clientes, setClientes] = useState([]);
  const [enviadas, setEnviadas] = useState({});
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [modalCliente, setModalCliente] = useState(null);
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 30;

  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [resClientes, resTemplates, resEnviadas] = await Promise.all([
        axios.get(`${API_BASE_URL}/cliente?empresa=${empresa}`, { headers }),
        axios.get(`${API_BASE_URL}/api/cobranca/templates`, { headers }),
        axios.get(`${API_BASE_URL}/api/cobranca/lista-enviadas`, { headers }),
      ]);

      // Agrupar por cliente (igual ao financeiro.js)
      const agrupado = (resClientes.data || []).reduce((acc, cur) => {
        const nome = cur.E1_NOMCLI;
        if (!acc[nome]) {
          acc[nome] = {
            cliente: nome,
            codigo: cur.E1_CLIENTE,
            saldo: 0,
            vendedor: cur.NOME_VENDEDOR,
            titulos: [],
          };
        }
        acc[nome].titulos.push(cur);
        acc[nome].saldo += parseFloat(cur.E1_SALDO || 0);
        return acc;
      }, {});

      setClientes(Object.values(agrupado).sort((a, b) => b.saldo - a.saldo));
      setTemplates(resTemplates.data || []);

      // Mapear última cobrança por cliente_codigo
      const envMap = {};
      (resEnviadas.data || []).forEach((e) => { envMap[e.cliente_codigo] = e; });
      setEnviadas(envMap);
    } catch (err) {
      console.error("Erro ao carregar Central de Cobrança:", err);
    } finally {
      setLoading(false);
    }
  }, [empresa]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const handleSucesso = (nomeCliente) => {
    Swal.fire({
      icon: "success",
      title: "Cobrança enviada!",
      text: `Mensagem enviada para ${nomeCliente}.`,
      timer: 2500,
      showConfirmButton: false,
    });
    carregarDados();
  };

  const clientesFiltrados = clientes.filter((c) =>
    c.cliente.toLowerCase().includes(busca.toLowerCase())
  );
  const totalPaginas = Math.ceil(clientesFiltrados.length / POR_PAGINA);
  const clientesPagina = clientesFiltrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const irPara = (p) => setPagina(Math.min(Math.max(1, p), totalPaginas));

  // ── Lista principal ──
  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans pb-20 transition-colors duration-300">
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />

      <AppHeader
        title="Central de Cobrança"
        subtitle="Financeiro · Contas a Receber"
        icon="chat"
        iconGradient="from-green-500 to-emerald-400"
        iconShadow="shadow-green-500/20"
        onBack="/financeiro/contas-receber"
      />

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        {/* Navegação */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate("/financeiro/contas-receber")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white shadow-sm hover:shadow-md transition-all font-bold text-sm"
          >
            <span className="material-symbols-rounded">arrow_back</span> Voltar
          </button>
          <button
            onClick={() => navigate("/financeiro/contas-receber/cobranca/kanban")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md transition-all font-bold text-sm"
          >
            <span className="material-symbols-rounded">view_kanban</span>
            Painel Kanban
          </button>
        </div>

        {/* Busca */}
        <div className="relative mb-6">
          <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input
            type="text"
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
            placeholder="Buscar cliente..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-green-500 outline-none text-sm"
          />
        </div>

        {/* Lista */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Cabeçalho */}
          <div className="grid grid-cols-12 px-5 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            <div className="col-span-3">Cliente</div>
            <div className="col-span-2 text-right">Saldo</div>
            <div className="col-span-1 text-center">Tít.</div>
            <div className="col-span-2">Vendedor</div>
            <div className="col-span-2 text-center">Histórico</div>
            <div className="col-span-2 text-right">Ação</div>
          </div>

          {loading && (
            <div className="flex justify-center items-center py-16">
              <span className="material-symbols-rounded animate-spin text-green-500 text-4xl">progress_activity</span>
            </div>
          )}

          {!loading && clientesFiltrados.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
              <span className="material-symbols-rounded text-5xl">sentiment_satisfied</span>
              <p className="text-sm font-medium">Nenhum cliente inadimplente encontrado.</p>
            </div>
          )}

          {!loading && clientesPagina.map((cliente) => {
            const cobrado = enviadas[cliente.codigo];
            const grav = gravidade(cliente.saldo);
            const hist = statusCobranca(cobrado);
            return (
              <div
                key={cliente.cliente}
                className="relative grid grid-cols-12 px-5 py-3.5 items-center border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition"
              >
                {/* Barra de prioridade lateral */}
                {grav.bar && (
                  <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${grav.bar}`} />
                )}

                {/* Cliente */}
                <div className="col-span-3 min-w-0 flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${grav.dot}`} />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-white text-sm truncate leading-tight">{cliente.cliente}</p>
                    {cobrado && (
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{fmtDate(cobrado.data_envio)}</p>
                    )}
                  </div>
                </div>

                {/* Saldo */}
                <div className="col-span-2 text-right">
                  <span className={`font-bold text-sm ${grav.saldoColor}`}>{fmtBRL(cliente.saldo)}</span>
                </div>

                {/* Títulos */}
                <div className="col-span-1 text-center">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold">
                    {cliente.titulos.length}
                  </span>
                </div>

                {/* Vendedor */}
                <div className="col-span-2 min-w-0">
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate block">{cliente.vendedor || "-"}</span>
                </div>

                {/* Histórico */}
                <div className="col-span-2 flex flex-col items-center gap-0.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${hist.color}`}>
                    <span className="material-symbols-rounded text-[11px]">{hist.icon}</span>
                    {hist.label}
                  </span>
                  {hist.sub && (
                    <span className="text-[9px] text-slate-400 dark:text-slate-500">{hist.sub}</span>
                  )}
                </div>

                {/* Botão */}
                <div className="col-span-2 flex justify-end" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setModalCliente(cliente); }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition shadow-sm whitespace-nowrap"
                    title="Enviar cobrança via WhatsApp"
                  >
                    <span className="material-symbols-rounded text-sm">send</span>
                    {cobrado ? "Cobrar novamente" : "Cobrar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Paginação */}
        {!loading && totalPaginas > 1 && (
          <div className="flex items-center justify-between mt-4 px-1">
            <p className="text-xs text-slate-400">
              {((pagina - 1) * POR_PAGINA) + 1}–{Math.min(pagina * POR_PAGINA, clientesFiltrados.length)} de {clientesFiltrados.length} clientes
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => irPara(1)}
                disabled={pagina === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <span className="material-symbols-rounded text-base">first_page</span>
              </button>
              <button
                onClick={() => irPara(pagina - 1)}
                disabled={pagina === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <span className="material-symbols-rounded text-base">chevron_left</span>
              </button>

              {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPaginas || Math.abs(p - pagina) <= 2)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === "..." ? (
                    <span key={`dot-${idx}`} className="w-8 h-8 flex items-center justify-center text-slate-400 text-xs">…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => irPara(item)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                        item === pagina
                          ? "bg-green-600 text-white shadow-sm"
                          : "text-slate-500 hover:bg-white hover:shadow-sm"
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}

              <button
                onClick={() => irPara(pagina + 1)}
                disabled={pagina === totalPaginas}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <span className="material-symbols-rounded text-base">chevron_right</span>
              </button>
              <button
                onClick={() => irPara(totalPaginas)}
                disabled={pagina === totalPaginas}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <span className="material-symbols-rounded text-base">last_page</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modal de cobrança */}
      {modalCliente && (
        <ModalCobranca
          cliente={modalCliente}
          templates={templates}
          onClose={() => setModalCliente(null)}
          onSucesso={handleSucesso}
        />
      )}
    </div>
  );
};

export default CentralCobranca;
