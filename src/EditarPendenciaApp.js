import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { API_BASE_URL } from './utils/apiConfig';

// --- CONSTANTES ---
const MOTIVOS = [
  "ACORDO COMERCIAL",
  "CRITERIO DO CLIENTE",
  "DIV. DE BALANÇA",
  "ERRO DE FATURAMENTO",
  "ERRO DO MOTORISTA",
  "ERRO DO VENDEDOR",
  "ERRO OPERACIONAL",
  "HORARIO DE ENTREGA",
  "HORARIO ENCERRADO",
  "IMPROPRIA P/ CONSUMO",
  "PEDIDO LANÇADO ERRADO",
];

const UNIDADES = ["UN", "CX", "KG", "SC", "FM", "BJ", "PT", "PC", "PE", "MC", "BD"];
const TIPOS = ["DIVERGENCIA", "FALTA", "AVARIA", "SOBRA"];
const ACOES = [
  "ENVIAR REPOSIÇÃO",
  "EXCLUIR NOTA",
  "FAZER COMPRA",
  "FAZER TROCA",
  "REFAZER NF E BOLETO",
  "REPOSIÇÃO",
];

const MOTIVOS_PARA_DEPARTAMENTO = {
  "ACORDO COMERCIAL": "COMERCIAL",
  "ERRO DO VENDEDOR": "COMERCIAL",
  "PEDIDO LANÇADO ERRADO": "COMERCIAL",
  "CRITERIO DO CLIENTE": "CRITERIO DO CLIENTE",
  "ERRO OPERACIONAL": "LOGISTICA",
  "IMPROPRIA P/ CONSUMO": "LOGISTICA",
  "ERRO DE FATURAMENTO": "FATURAMENTO",
  "HORARIO DE ENTREGA": "FATURAMENTO",
  "ERRO DO MOTORISTA": "FROTA",
  "DIV. DE BALANÇA": "LOGISTICA",
  "HORARIO ENCERRADO": "FATURAMENTO",
};

// --- UTILS ---
const toISO = (yyyymmdd) => {
  const s = String(yyyymmdd || "").replace(/\D/g, "");
  if (s.length !== 8) return "";
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
};
const brDate = (yyyymmdd) => {
  const s = String(yyyymmdd || "").replace(/\D/g, "");
  if (s.length !== 8) return "";
  return `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)}`;
};
const money = (v) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const onlyDigits = (s) => String(s || "").replace(/\D/g, "");
const padLeft = (s, size) => {
  const d = onlyDigits(s);
  if (!d) return "";
  return d.slice(0, size).padStart(size, "0");
};

// --- MODAL COMPONENT (Reusado) ---
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// --- COMPONENT PRINCIPAL ---
const EditarPendenciaApp = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // --- Header State ---
  const [username, setUsername] = useState("");
  const [local, setLocal] = useState("08");
  useEffect(() => {
    const storedUser = localStorage.getItem("username");
    const storedLocal = localStorage.getItem("local");
    if (storedUser) setUsername(storedUser);
    if (storedLocal) setLocal(storedLocal);
  }, []);
  const toggleDarkMode = () => document.documentElement.classList.toggle("dark");
  const handleLogout = () => { localStorage.clear(); navigate("/login"); };

  // --- Form State ---
  const [form, setForm] = useState({
    bilhete: "",
    data: "",
    cliente: "",
    clienteCodigo: "",
    vendedor: "",
    descricao: "",
    valorTotal: "0.00",
    produtos: [],
    acao: "",
    notaFiscal: "",
    serie: "",
    status: "PENDENTE",
    dataTratativa: "",
  });

  const [loading, setLoading] = useState(false);
  const [cabecalho, setCabecalho] = useState(null);
  const [itens, setItens] = useState([]);
  const [selecoes, setSelecoes] = useState({});
  const [buscaDesc, setBuscaDesc] = useState("");
  const [ocorrenciaOriginal, setOcorrenciaOriginal] = useState(null);

  // Dialog OBS Item
  const [obsDialogOpen, setObsDialogOpen] = useState(false);
  const [obsDialogId, setObsDialogId] = useState(null);
  const [obsDialogText, setObsDialogText] = useState("");

  const rowId = (it, idx) => `${it.Z5_CODPRO || "COD"}|${idx}`;

  const openObsDialog = (id) => {
    const cur = selecoes[id] || {};
    setObsDialogId(id);
    setObsDialogText(cur.obs || "");
    setObsDialogOpen(true);
  };
  const saveObsDialog = () => {
    if (obsDialogId) {
      setSelecoes((m) => ({ ...m, [obsDialogId]: { ...(m[obsDialogId] || {}), obs: obsDialogText } }));
    }
    closeObsDialog();
  };
  const closeObsDialog = () => {
    setObsDialogOpen(false);
    setObsDialogId(null);
    setObsDialogText("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "bilhete") {
      setForm((s) => ({ ...s, bilhete: value.toUpperCase().slice(0, 20) }));
    } else if (name === "notaFiscal") {
      setForm((s) => ({ ...s, notaFiscal: onlyDigits(value).slice(0, 9) }));
    } else if (name === "serie") {
      setForm((s) => ({ ...s, serie: onlyDigits(value).slice(0, 3) }));
    } else {
      setForm((s) => ({ ...s, [name]: value }));
    }
  };

  // Carrega a ocorrência ao iniciar
  useEffect(() => {
    if (id) {
      carregarOcorrencia(id);
    }
  }, [id]);

  const carregarOcorrencia = async (ocrId) => {
    setLoading(true);
    try {
      const resp = await axios.get(`${API_BASE_URL}/ocorrencias/${ocrId}`);
      const data = resp.data;

      setOcorrenciaOriginal(data);

      // Preenche form básico
      setForm(prev => ({
        ...prev,
        bilhete: data.bilhete || "",
        data: data.data ? data.data.split('T')[0] : "",
        cliente: data.cliente || "",
        vendedor: data.vendedor || "", // Pega vendedor da ocorrência salva
        descricao: data.descricao || "",
        acao: data.acao || "",
        notaFiscal: "", // Deve vir vazio conforme pedido
        serie: "",     // Deve vir vazio também? Vou manter vazio para forçar preenchimento se necessário
        status: (data.status === "PEN. APP") ? "PENDENTE" : (data.status || "PENDENTE"), // Converte PEN. APP para PENDENTE
        dataTratativa: data.dataTratativa ? data.dataTratativa.split('T')[0] : "",
      }));

      // Se tiver bilhete, busca os dados do Protheus e mergeia
      if (data.bilhete) {
        await buscarBilheteEPopular(data.bilhete, data.produtos || []);
      }

    } catch (error) {
      console.error("Erro ao carregar ocorrência:", error);
      Swal.fire("Erro", "Não foi possível carregar a ocorrência.", "error");
    } finally {
      setLoading(false);
    }
  };

  const buscarBilheteEPopular = async (bilhete, produtosSalvos) => {
    try {
      // Busca dados do Protheus
      const { data } = await axios.get(`${API_BASE_URL}/protheus/bilhete`, { params: { bilhete: bilhete } });
      const cab = data?.cabecalho;
      const its = data?.itens || [];

      if (!cab) {
        Swal.fire("Ops", "Nenhum cabeçalho encontrado para este bilhete no Protheus. Os dados serão carregados apenas da ocorrência salva.", "info");
      }

      if (cab) {
        setCabecalho(cab);
        // Atualiza cabeçalho mas mantém o que já veio da ocorrência se necessário
        // (Geralmente a ocorrência salva é a verdade, mas o Protheus pode ter detalhes extras)
        // Aqui optamos por não sobrescrever cliente/vendedor se já vierem da ocorrência carregada, 
        // ou sobrescrever se quisermos o dado mais fresco do ERP. 
        // Como é edição, manter o que está salvo é mais seguro, mas vamos preencher se estiver vazio.
        setForm(s => ({
          ...s,
          data: s.data || toISO(cab.Z4_DATA),
          cliente: s.cliente || cab.Z4_NOMCLI || "",
          clienteCodigo: cab.Z4_CLIENTE || "", // Esse código não costuma vir na ocorrencia salva explicitamente as vezes
          vendedor: s.vendedor || cab.Z4_NOMVEN || "",
        }));
      }

      setItens(its);

      // Agora mergeia com os produtos salvos
      const init = {};
      its.forEach((it, idx) => {
        const id = rowId(it, idx);

        // Tenta encontrar este item nos produtos salvos
        // A comparação ideal seria por código e talvez preço/qtd, mas código é o principal.
        // Como pode ter itens repetidos no bilhete, precisamos de cuidado.
        // Vamos tentar casar por código. Se tiver multiplos iguais, vamos consumindo.

        // Estratégia simples: match por código do produto (Z5_CODPRO vs p.produto_nome ou código se tiver)
        // Na ocorrencia salva, geralmente temos 'nome' que é a descrição. Não temos o código salvo separado as vezes.
        // Mas a descrição (Z5_DESPRO) deve bater.

        const codigoProtheus = String(it.Z5_CODPRO || "").trim();
        const nomeProtheus = String(it.Z5_DESPRO || "").trim();

        const produtoSalvo = produtosSalvos.find(p => {
          // Tenta match por nome (descrição) ou código se estiver disponivel no objeto produto
          const nomeSalvo = String(p.nome || p.produto_nome || "").trim();
          // Verifica se o nome contem o nomeProtheus ou vice versa (as vezes tem espaços extras)
          return nomeSalvo === nomeProtheus;
        });

        const umOriginal = String(it.Z5_UM || "").trim();
        const umInicial = umOriginal || "UN";

        if (produtoSalvo) {
          // Determine Unit and Price usage based on saved values
          const umSalvo = produtoSalvo.unidade || umInicial;
          const usePreco2 = umOriginal && umSalvo !== umOriginal;

          init[id] = {
            selected: true,
            motivo: produtoSalvo.motivo || "",
            tipo: produtoSalvo.tipo || "",
            departamento: produtoSalvo.departamento || "",
            quantidade: Number(produtoSalvo.quantidade) || 0,
            um: umSalvo,
            umOriginal: umInicial, // Mantém original para referência
            usePreco2: usePreco2,
            // Restore price to the correct slot based on unit usage
            preco: usePreco2
              ? (Number(it.Z5_PRECO) || 0)
              : (Number(produtoSalvo.valor) || Number(it.Z5_PRECO) || 0),
            preco2: usePreco2
              ? (Number(produtoSalvo.valor) || Number(it.Z5_PRECO2) || 0)
              : (Number(it.Z5_PRECO2) || 0),
            obs: produtoSalvo.obs || produtoSalvo.observacao || "",
          };

          // Remove o produto da lista de salvos para não casar de novo com outro item igual se houver duplicidade
          // (Isso é uma cópia local do array para busca, não altera o state original)
          const index = produtosSalvos.indexOf(produtoSalvo);
          if (index > -1) {
            produtosSalvos.splice(index, 1);
          }

        } else {
          // Se não encontrou salvo, inicia desmarcado
          init[id] = {
            selected: false,
            motivo: "",
            tipo: "",
            departamento: "",
            quantidade: Number(it.Z5_QTDE) || 0,
            um: umInicial,
            umOriginal: umInicial,
            usePreco2: false,
            preco: Number(it.Z5_PRECO) || 0,
            preco2: Number(it.Z5_PRECO2) || 0,
            obs: "",
          };
        }
      });

      setSelecoes(init);

    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao buscar dados do bilhete no Protheus.", "error");
    }
  };

  const manualSearch = async () => {
    if (!form.bilhete) { Swal.fire("Atenção", "Informe o Bilhete para pesquisar.", "warning"); return; }

    // Se for busca manual em tela de edição, avisa que vai resetar seleções
    const result = await Swal.fire({
      title: 'Buscar Bilhete?',
      text: "Isso irá recarregar os dados do bilhete e pode perder alterações não salvas nos itens.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, buscar'
    });

    if (result.isConfirmed) {
      setLoading(true);
      // Passa array vazio para produtos salvos para vir tudo 'zerado/desmarcado' ou tenta manter?
      // Melhor buscar do zero como no buscarBilhete original
      try {
        const { data } = await axios.get(`${API_BASE_URL}/protheus/bilhete`, { params: { bilhete: form.bilhete } });
        // ... lógica igual ao OcorrenciaForm2 original ...
        const cab = data?.cabecalho;
        const its = data?.itens || [];

        if (cab) {
          setCabecalho(cab);
          setForm(s => ({
            ...s,
            data: toISO(cab.Z4_DATA),
            cliente: cab.Z4_NOMCLI || "",
            vendedor: cab.Z4_NOMVEN || ""
          }));
        }
        setItens(its);

        const init = {};
        its.forEach((it, idx) => {
          const id = rowId(it, idx);
          const umOriginal = String(it.Z5_UM || "").trim();
          const umInicial = umOriginal || "UN";
          init[id] = {
            selected: false,
            motivo: "",
            tipo: "",
            quantidade: Number(it.Z5_QTDE) || 0,
            um: umInicial,
            umOriginal: umInicial,
            usePreco2: false,
            preco: Number(it.Z5_PRECO) || 0,
            preco2: Number(it.Z5_PRECO2) || 0,
            obs: "",
            departamento: ""
          };
        });
        setSelecoes(init);
      } catch (e) {
        Swal.fire("Erro", "Erro ao buscar bilhete", "error");
      } finally {
        setLoading(false);
      }
    }
  }


  // Recalcula total e produtos selecionados
  useEffect(() => {
    if (!itens?.length) {
      setForm(s => ({ ...s, produtos: [], valorTotal: "0.00" }));
      return;
    }
    const selecionados = itens.map((it, idx) => {
      const id = rowId(it, idx);
      const sel = selecoes[id];
      if (!sel?.selected) return null;

      const qtd = Number(sel.quantidade) || 0;
      const precoAplicado = sel.usePreco2 ? (Number(sel.preco2) || 0) : (Number(sel.preco) || 0);
      const total = Number((qtd * precoAplicado).toFixed(2));

      return {
        nome: it.Z5_DESPRO || "",
        unidade: sel?.um || it.Z5_UM || "",
        quantidade: qtd,
        valor: precoAplicado,
        total,
        motivo: sel.motivo || "",
        tipo: sel.tipo || "",
        departamento: sel.departamento || "",
        obs: sel.obs || ""
      };
    }).filter(Boolean);

    const total = selecionados.reduce((acc, p) => acc + (p.total || 0), 0);
    setForm(s => ({ ...s, produtos: selecionados, valorTotal: total.toFixed(2) }));
  }, [selecoes, itens]);

  // Handlers de input na tabela
  const updateSelecao = (id, field, value) => {
    setSelecoes(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const toggleSelect = (id) => {
    setSelecoes(prev => ({
      ...prev,
      [id]: { ...prev[id], selected: !prev[id].selected }
    }));
  };

  const handleMotivoChange = (id, value) => {
    setSelecoes(prev => ({
      ...prev,
      [id]: { ...prev[id], motivo: value, departamento: MOTIVOS_PARA_DEPARTAMENTO[value] || "" }
    }));
  };

  const handleUMChange = (id, value) => {
    setSelecoes(prev => {
      const sel = prev[id];
      const novoUM = String(value).toUpperCase();
      const usePreco2 = sel.umOriginal && novoUM !== sel.umOriginal;
      return {
        ...prev,
        [id]: { ...sel, um: novoUM, usePreco2 }
      };
    });
  };

  const handleSubmit = async () => {
    if (!form.produtos.length) { Swal.fire("Atenção", "Selecione ao menos um item.", "warning"); return; }
    if (form.produtos.some(p => !p.motivo || !p.tipo)) { Swal.fire("Atenção", "Motivo e Tipo são obrigatórios nos itens selecionados.", "warning"); return; }

    Swal.fire({ title: "Salvando alterações...", didOpen: () => Swal.showLoading() });

    // Se tiver cabeçalho do Protheus, usa ele pra garantir consistência, senão usa o que tá no form
    const nfOrigem = cabecalho
      ? String(cabecalho?.NOTA_ORIGEM || cabecalho?.Z4_NOTA || "").replace(/\D/g, "").slice(0, 12)
      : (form.notaOrigem || "");

    const payload = {
      ...ocorrenciaOriginal, // Mantém dados originais que não mudaram
      numero: String(cabecalho?.Z4_CARGA || ocorrenciaOriginal.numero || ""), // Carga é o 'numero' da ocorrencia geralmente
      remetente: ocorrenciaOriginal.remetente, // Não muda remetente na edição
      data: form.data || new Date().toISOString().slice(0, 10),
      cliente: form.cliente,
      // Se não tiver fornecedorCod, tenta manter o que tinha
      fornecedorCod: cabecalho?.Z4_CLIENTE || form.clienteCodigo || ocorrenciaOriginal.fornecedorCod || "",
      descricao: form.descricao || "",
      notaFiscal: form.notaFiscal ? padLeft(form.notaFiscal, 9) : "",
      serie: form.serie ? padLeft(form.serie, 3) : "",
      notaOrigem: nfOrigem,
      valorTotal: form.valorTotal,

      status: form.status, // Usa o status do form ("PENDENTE" ou "RESOLVIDO")
      acao: form.acao || "",
      dataTratativa: form.dataTratativa || null, // Salva data tratativa
      bilhete: form.bilhete,
      // Dados do motorista/conferente se disponivel no protheus atualiza, senao mantem
      motorista: cabecalho?.MOTORISTA || cabecalho?.ZH_NOMMOT || ocorrenciaOriginal.motorista || "",
      conferente: cabecalho?.CONFERENTE || cabecalho?.ZH_CONFERE || ocorrenciaOriginal.conferente || "",
      vendedor: form.vendedor || ocorrenciaOriginal.vendedor || "", // Vendedor é editavel? No form original não era input, mas vinha do protheus.
      placa: cabecalho?.PLACA || cabecalho?.ZH_VEICULO || ocorrenciaOriginal.placa || "",
      produtos: form.produtos,
      adicionado_pelo_app: "S" // Garante flag
    };

    try {
      await axios.put(`${API_BASE_URL}/ocorrencias/${id}`, payload);
      Swal.fire("Sucesso", "Ocorrência atualizada com sucesso!", "success");
      navigate("/ocorrencias");
    } catch (error) {
      console.error(error);
      Swal.fire("Erro", "Erro ao atualizar ocorrência.", "error");
    }
  };

  const itensFiltrados = buscaDesc.trim() === "" ? itens : itens.filter(it => String(it.Z5_DESPRO || "").toLowerCase().includes(buscaDesc.toLowerCase()));
  const totalItensPedido = itens.reduce((acc, it) => acc + (Number(it?.Z5_TOTAL) || 0), 0);

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />

      {/* Header */}
      <header className="sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-slate-700/50 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
              <div className="bg-gradient-to-tr from-orange-500 to-amber-400 h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-600/20">
                <span className="font-bold text-xl italic tracking-tighter">SF</span>
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight text-slate-800 dark:text-white">Editar Ocorrência</h1>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Pendência App</span>
              </div>
            </div>
            {/* User Info Right */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-bold text-slate-800 dark:text-white">{username || "Visitante"}</span>
                <span className="text-[10px] text-slate-400">LOCAL: {local}</span>
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

      <main className="max-w-6xl mx-auto px-6 py-6 pb-20 relative z-10">
        {/* Title & Back */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/ocorrencias')} className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all text-slate-500">
              <span className="material-symbols-rounded text-2xl">arrow_back</span>
            </button>
            <div>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Editar Pendência App</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Atualize os dados e resolva a pendência</p>
            </div>
          </div>
        </div>

        {/* Search Box / Info */}
        <div className="bg-white/80 dark:bg-slate-800/90 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20 dark:border-slate-700/50 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Número do Bilhete ou Nota (Vinculado)</label>
              <input
                type="text"
                value={form.bilhete}
                onChange={handleChange}
                name="bilhete"
                disabled={true} // Em edição de pendência vinculada, talvez não devêssemos deixar mudar o bilhete drasticamente, mas se o user quiser buscar outro... vamos deixar 'semi-locked' ou com aviso no manualSearch
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all uppercase font-bold text-lg text-slate-500"
              />
            </div>

          </div>
        </div>

        {/* Header Details */}
        {cabecalho && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-md border border-slate-100 dark:border-slate-700 mb-8 animate-in fade-in">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="material-symbols-rounded">receipt_long</span> Detalhes do Pedido
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div><p className="text-xs text-slate-500 uppercase">Data</p><p className="font-bold text-slate-800 dark:text-white">{brDate(cabecalho.Z4_DATA)}</p></div>
              <div><p className="text-xs text-slate-500 uppercase">Cliente</p><p className="font-bold text-slate-800 dark:text-white truncate" title={cabecalho.Z4_NOMCLI}>{cabecalho.Z4_NOMCLI}</p></div>
              <div><p className="text-xs text-slate-500 uppercase">Vendedor</p><p className="font-bold text-slate-800 dark:text-white truncate">{cabecalho.Z4_NOMVEN}</p></div>
              <div><p className="text-xs text-slate-500 uppercase">Carga</p><p className="font-bold text-slate-800 dark:text-white">{cabecalho.Z4_CARGA}</p></div>
              <div><p className="text-xs text-slate-500 uppercase">Motorista</p><p className="font-bold text-slate-800 dark:text-white truncate">{cabecalho.MOTORISTA || cabecalho.ZH_NOMMOT || "-"}</p></div>
              <div><p className="text-xs text-slate-500 uppercase">Placa</p><p className="font-bold text-slate-800 dark:text-white">{cabecalho.PLACA || cabecalho.ZH_VEICULO || "-"}</p></div>
              <div><p className="text-xs text-slate-500 uppercase">Nota Origem</p><p className="font-bold text-slate-800 dark:text-white">{cabecalho.NOTA_ORIGEM || cabecalho.Z4_NOTA || "-"}</p></div>
              <div><p className="text-xs text-slate-500 uppercase">Total Bilhete</p><p className="font-bold text-green-600">{money(cabecalho.Z4_TOTBIL)}</p></div>
            </div>
          </div>
        )}

        {/* Items Table */}
        {itens.length > 0 && (
          <div className="space-y-6 animate-in slide-in-from-bottom-10">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700">
              {/* Filter */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                <span className="material-symbols-rounded text-slate-400">filter_list</span>
                <input
                  type="text"
                  placeholder="Filtrar itens por descrição..."
                  className="bg-transparent outline-none text-sm w-full text-slate-700 dark:text-slate-300 font-medium placeholder-slate-400"
                  value={buscaDesc}
                  onChange={(e) => setBuscaDesc(e.target.value)}
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 w-10 text-center">Busy</th>
                      <th className="px-4 py-3">Produto</th>
                      <th className="px-4 py-3 w-24 text-center">Qtd</th>
                      <th className="px-4 py-3 w-20 text-center">Un</th>
                      <th className="px-4 py-3 w-24 text-right">Preço</th>
                      <th className="px-4 py-3 w-24 text-right">Total</th>
                      <th className="px-4 py-3 w-40">Tipo</th>
                      <th className="px-4 py-3 w-40">Motivo</th>
                      <th className="px-4 py-3 w-16 text-center">Obs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800/50">
                    {itensFiltrados.map((it, idx) => {
                      const realIdx = itens.indexOf(it);
                      const id = rowId(it, realIdx);
                      const sel = selecoes[id] || {};
                      const isSelected = !!sel.selected;

                      // Display Values
                      const qtd = isSelected ? sel.quantidade : Number(it.Z5_QTDE) || 0;
                      const preco = isSelected ? (sel.usePreco2 ? sel.preco2 : sel.preco) : (Number(it.Z5_PRECO) || 0);
                      const total = isSelected ? (qtd * preco) : (Number(it.Z5_TOTAL) || 0);

                      return (
                        <tr key={id} className={`transition-colors ${isSelected ? 'bg-orange-50/50 dark:bg-orange-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/20'}`}>
                          <td className="px-4 py-3 text-center">
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(id)} className="w-5 h-5 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-700 dark:text-slate-200">{it.Z5_DESPRO}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{it.Z5_CODPRO}</div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              disabled={!isSelected}
                              value={qtd}
                              onChange={(e) => updateSelecao(id, 'quantidade', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Tab' && !e.shiftKey && isSelected) {
                                  e.preventDefault();
                                  const unSelect = document.querySelector(`select[data-tabindex="${id}-un"]`);
                                  if (unSelect) unSelect.focus();
                                }
                              }}
                              data-tabindex={`${id}-qtd`}
                              className={`w-20 px-2 py-1 rounded border text-center outline-none transition-all ${isSelected ? 'bg-white border-orange-300 text-orange-700 font-bold focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:border-orange-500' : 'bg-transparent border-transparent text-slate-500'}`}
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <select
                              disabled={!isSelected}
                              value={sel.um || it.Z5_UM || ""}
                              onChange={(e) => handleUMChange(id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Tab' && !e.shiftKey && isSelected) {
                                  e.preventDefault();
                                  const precoInput = document.querySelector(`input[data-tabindex="${id}-preco"]`);
                                  if (precoInput) precoInput.focus();
                                }
                              }}
                              data-tabindex={`${id}-un`}
                              className={`w-16 py-1 rounded border text-xs outline-none transition-all ${isSelected ? 'bg-white border-orange-300 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:border-orange-500' : 'bg-transparent border-transparent appearance-none'}`}
                            >
                              {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <input
                              type="number"
                              disabled={!isSelected}
                              value={sel.usePreco2 ? sel.preco2 : sel.preco}
                              onChange={(e) => updateSelecao(id, sel.usePreco2 ? 'preco2' : 'preco', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Tab' && !e.shiftKey && isSelected) {
                                  e.preventDefault();
                                  const tipoSelect = document.querySelector(`select[data-tabindex="${id}-tipo"]`);
                                  if (tipoSelect) tipoSelect.focus();
                                }
                              }}
                              data-tabindex={`${id}-preco`}
                              className={`w-24 px-2 py-1 rounded border text-right outline-none transition-all ${isSelected ? 'bg-white border-orange-300 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:border-orange-500' : 'bg-transparent border-transparent'}`}
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-200">
                            {money(total)}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              disabled={!isSelected}
                              value={sel.tipo || ""}
                              onChange={(e) => updateSelecao(id, 'tipo', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Tab' && !e.shiftKey && isSelected) {
                                  e.preventDefault();
                                  const motivoSelect = document.querySelector(`select[data-tabindex="${id}-motivo"]`);
                                  if (motivoSelect) motivoSelect.focus();
                                }
                              }}
                              data-tabindex={`${id}-tipo`}
                              className={`w-full py-1.5 px-2 rounded border text-xs outline-none transition-all ${isSelected ? 'bg-white border-orange-300 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:border-orange-500' : 'bg-gray-100 border-transparent text-gray-400'}`}
                            >
                              <option value="">Selecione...</option>
                              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              disabled={!isSelected}
                              value={sel.motivo || ""}
                              onChange={(e) => handleMotivoChange(id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Tab' && !e.shiftKey && isSelected) {
                                  e.preventDefault();
                                  const obsButton = document.querySelector(`button[data-tabindex="${id}-obs"]`);
                                  if (obsButton) obsButton.focus();
                                }
                              }}
                              data-tabindex={`${id}-motivo`}
                              className={`w-full py-1.5 px-2 rounded border text-xs outline-none transition-all ${isSelected ? 'bg-white border-orange-300 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:border-orange-500' : 'bg-gray-100 border-transparent text-gray-400'}`}
                            >
                              <option value="">Selecione...</option>
                              {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => openObsDialog(id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Tab' && !e.shiftKey && isSelected) {
                                  // Vai para o próximo item da lista ou próximo campo
                                  const nextRow = itensFiltrados[idx + 1];
                                  if (nextRow) {
                                    const nextId = rowId(nextRow, itens.indexOf(nextRow));
                                    const nextQtdInput = document.querySelector(`input[data-tabindex="${nextId}-qtd"]`);
                                    if (nextQtdInput) {
                                      e.preventDefault();
                                      nextQtdInput.focus();
                                    }
                                  }
                                }
                              }}
                              data-tabindex={`${id}-obs`}
                              tabIndex={isSelected ? 0 : -1}
                              className={`p-1.5 rounded-lg transition-all ${sel.obs ? 'bg-amber-100 text-amber-600 hover:bg-amber-200 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'}`}
                            >
                              <span className="material-symbols-rounded text-lg">sticky_note_2</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                    <tr>
                      <td colSpan="5" className="px-4 py-3 text-right font-bold text-slate-500 uppercase text-xs">Total Pedido</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-300">{money(totalItensPedido)}</td>
                      <td colSpan="3"></td>
                    </tr>
                    <tr>
                      <td colSpan="5" className="px-4 py-3 text-right font-bold text-orange-600 uppercase text-xs">Total Selecionado</td>
                      <td className="px-4 py-3 text-right font-bold text-orange-600 text-lg">{money(form.valorTotal)}</td>
                      <td colSpan="3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-white/80 dark:bg-slate-800/90 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20 dark:border-slate-700/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Descrição Geral</label>
                  <textarea
                    value={form.descricao}
                    onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24"
                    placeholder="Detalhes adicionais da ocorrência..."
                  ></textarea>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Ação a Tomar</label>
                    <select
                      value={form.acao}
                      onChange={handleChange}
                      name="acao"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Selecione...</option>
                      {ACOES.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nota Fiscal (9)</label>
                    <input
                      type="text"
                      name="notaFiscal"
                      value={form.notaFiscal}
                      onChange={handleChange}
                      maxLength={9}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Série (3)</label>
                    <input
                      type="text"
                      name="serie"
                      value={form.serie}
                      onChange={handleChange}
                      maxLength={3}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Linha Extra: Status e Data Tratativa */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Status</label>
                    <select
                      value={form.status}
                      onChange={handleChange}
                      name="status"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                    >
                      <option value="PENDENTE">PENDENTE</option>
                      <option value="RESOLVIDO">RESOLVIDO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Data Tratativa</label>
                    <input
                      type="date"
                      name="dataTratativa"
                      value={form.dataTratativa}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 border-t border-slate-200 dark:border-slate-700 pt-6">
                <button onClick={() => navigate('/ocorrencias')} className="px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors uppercase text-sm">
                  Cancelar
                </button>
                <button onClick={handleSubmit} className="px-10 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 shadow-lg shadow-green-600/20 hover:scale-105 transition-all uppercase text-sm tracking-wide">
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal OBS */}
      <Modal isOpen={obsDialogOpen} onClose={closeObsDialog} title="Observação do Item">
        <textarea
          className="w-full h-32 p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-blue-500 outline-none resize-none mb-4"
          placeholder="Digite a observação para este produto..."
          value={obsDialogText}
          onChange={(e) => setObsDialogText(e.target.value)}
        ></textarea>
        <div className="flex justify-end gap-2">
          <button onClick={closeObsDialog} className="px-4 py-2 text-slate-500 font-bold uppercase text-xs hover:bg-slate-100 rounded-lg">Cancelar</button>
          <button onClick={saveObsDialog} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Salvar OBS</button>
        </div>
      </Modal>
    </div>
  );
};

export default EditarPendenciaApp;
