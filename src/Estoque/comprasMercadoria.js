
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getDataTrabalho } from "../utils/dataTrabalho";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);
import {
  TextField,
  Autocomplete,
  Snackbar,
  Tooltip,
} from "@mui/material";
import MuiAlert from "@mui/material/Alert";
import { API_BASE_URL } from '../utils/apiConfig';

// --- Components Modernos ---


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

const LoadingOverlay = ({ visible }) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md flex items-center justify-center transition-all duration-300">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in-95 border border-slate-100 dark:border-slate-700">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-100 dark:border-slate-700 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">Atualizando Carregamentos</h3>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Por favor aguarde, não feche a janela...</p>
        </div>
      </div>
    </div>
  );
};


const ModalNovaCompra = ({
  open,
  onClose,
  produtosOptions,
  onSalvar,
  fetchProdutos,
}) => {
  const formInicial = {
    numero: "",
    descricao: "",
    chegada: getDataTrabalho(),
    produtos: [
      {
        codProduto: "",
        descricao: "",
        qtd: "",
        unidade: "",
        preco: "",
        total: 0,
        fornecedor: "",
      },
    ],
  };
  const [form, setForm] = useState(formInicial);
  const [fornecedoresOptions, setFornecedoresOptions] = useState([]);
  const timeoutRef = useRef(null);
  const descricaoRefs = useRef([]);

  const formatarCodigoProduto = (codigo) => {
    if (!codigo) return "";
    const codStr = String(codigo);
    const limpo = codStr.replace(/\D/g, "").padStart(6, "0");
    return `${limpo.slice(0, 3)}.${limpo.slice(3)}`;
  };

  const buscarFornecedores = useCallback(async (termo) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/fornecedores`,
        { params: { search: termo } }
      );
      setFornecedoresOptions(res.data);
    } catch (err) {
      console.error("Erro ao buscar fornecedores:", err);
    }
  }, []);

  const handleProdutoChange = (index, campo, valor) => {
    setForm((prev) => {
      const novos = [...prev.produtos];
      novos[index][campo] = valor;
      if (campo === "qtd" || campo === "preco") {
        const qtd = parseFloat(novos[index].qtd) || 0;
        const preco = parseFloat(novos[index].preco) || 0;
        novos[index].total = qtd * preco;
      }
      return { ...prev, produtos: novos };
    });
  };

  const handleRemoverProduto = (index) => {
    setForm((prev) => {
      const novos = [...prev.produtos];
      novos.splice(index, 1);
      return { ...prev, produtos: novos };
    });
  };

  const handleAdicionarProduto = () => {
    setForm((prev) => {
      const novos = [...prev.produtos, {
        codProduto: "", descricao: "", qtd: "", unidade: "", preco: "", total: 0, fornecedor: ""
      }];
      setTimeout(() => {
        descricaoRefs.current[novos.length - 1]?.focus();
      }, 100);
      return { ...prev, produtos: novos };
    });
  };

  const textFieldStyles = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      backgroundColor: '#fff',
      transition: 'all 0.2s',
      '&:hover': { borderColor: '#3b82f6' },
      '&.Mui-focused': { boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.1)' }
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Nova Compra Manual" maxWidth="lg">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextField
            label="Número da Compra"
            value={form.numero}
            onChange={(e) => setForm(prev => ({ ...prev, numero: e.target.value.replace(/\D/g, "") }))}
            fullWidth
            required
            size="small"
            sx={textFieldStyles}
          />

          <Autocomplete
            options={["COMPRAS CEASA", "COMPRAS REGIONAL"]}
            value={form.descricao}
            onChange={(e, val) => setForm(prev => ({ ...prev, descricao: val }))}
            renderInput={(params) => <TextField {...params} label="Carregamento" size="small" sx={textFieldStyles} />}
          />

          <TextField
            label="Data de Chegada"
            type="date"
            value={form.chegada}
            onChange={(e) => setForm(prev => ({ ...prev, chegada: e.target.value }))}
            fullWidth
            InputLabelProps={{ shrink: true }}
            required
            size="small"
            sx={textFieldStyles}
          />
        </div>

        <div className="h-px bg-slate-100 dark:bg-slate-700 w-full"></div>

        <div className="flex justify-between items-center">
          <h4 className="font-bold text-slate-700 dark:text-white">Itens da Compra</h4>
          <button onClick={handleAdicionarProduto} className="text-sm font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
            <span className="material-symbols-rounded text-lg">add</span>
            Adicionar Item
          </button>
        </div>

        <div className="space-y-3">
          {form.produtos.map((produto, index) => (
            <div key={index} className="flex flex-col md:flex-row gap-3 items-start p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 transition-all hover:shadow-sm">
              <div className="w-full md:w-32">
                <TextField
                  label="Código"
                  value={produto.codProduto}
                  fullWidth
                  size="small"
                  disabled
                  variant="filled"
                  InputProps={{ style: { fontSize: '0.85rem' } }}
                  sx={{ '& .MuiFilledInput-root': { borderRadius: '12px', bgcolor: 'rgba(0,0,0,0.03)' } }}
                />
              </div>
              <div className="flex-grow w-full">
                <Autocomplete
                  freeSolo
                  options={produtosOptions}
                  getOptionLabel={(opt) => typeof opt === "string" ? opt : `${formatarCodigoProduto(opt.codigo_produto)} - ${opt.descricao}`}
                  inputValue={produto.descricao}
                  onInputChange={(e, val, reason) => {
                    if (reason === "input") {
                      handleProdutoChange(index, "descricao", val);
                      handleProdutoChange(index, "codProduto", "");
                      fetchProdutos(val);
                    }
                  }}
                  onChange={(_, newVal) => {
                    if (typeof newVal === "object" && newVal) {
                      handleProdutoChange(index, "descricao", newVal.descricao);
                      handleProdutoChange(index, "codProduto", formatarCodigoProduto(newVal.codigo_produto));
                      handleProdutoChange(index, "unidade", newVal.primeira_unidade);
                    }
                  }}
                  renderInput={(params) => <TextField {...params} label="Descrição" required size="small" inputRef={el => descricaoRefs.current[index] = el} sx={textFieldStyles} />}
                />
              </div>
              <div className="w-32">
                <TextField
                  label={`Qtd ${produto.unidade ? `(${produto.unidade})` : ""}`}
                  type="number"
                  value={produto.qtd}
                  onChange={e => handleProdutoChange(index, "qtd", e.target.value)}
                  size="small"
                  required
                  sx={textFieldStyles}
                />
              </div>
              <div className="w-full md:w-64">
                <Autocomplete
                  freeSolo
                  options={fornecedoresOptions}
                  getOptionLabel={opt => typeof opt === "string" ? opt : opt.nome}
                  inputValue={produto.fornecedor}
                  onInputChange={(e, val, reason) => {
                    if (reason === "input") {
                      handleProdutoChange(index, "fornecedor", val);
                      clearTimeout(timeoutRef.current);
                      timeoutRef.current = setTimeout(() => buscarFornecedores(val), 300);
                    }
                  }}
                  onChange={(_, newVal) => {
                    if (newVal && typeof newVal === "object") handleProdutoChange(index, "fornecedor", newVal.nome);
                  }}
                  renderInput={(params) => <TextField {...params} label="Fornecedor" required size="small" sx={textFieldStyles} />}
                />
              </div>
              <button onClick={() => handleRemoverProduto(index)} disabled={form.produtos.length === 1} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <span className="material-symbols-rounded">delete</span>
              </button>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
          <button onClick={() => { onSalvar(form); setForm(formInicial); }} className="px-6 py-2.5 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20 transition-all transform active:scale-95 flex items-center gap-2">
            <span className="material-symbols-rounded">check</span> Salvar
          </button>
        </div>
      </div>
    </Modal>
  );
};

const ComprasMercadoria = () => {
  const navigate = useNavigate();
  // Auth
  const username = sessionStorage.getItem("username") || localStorage.getItem("username") || "sistema";
  const [origemUsuario, setOrigemUsuario] = useState(sessionStorage.getItem("local") || null);

  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [itensCompra, setItensCompra] = useState([]);
  const [compraSelecionada, setCompraSelecionada] = useState(null);
  const [qtdades, setQtdades] = useState({});
  const [filtroCompra, setFiltroCompra] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const comprasPorPagina = 10;

  const [filtroChegadaHoje, setFiltroChegadaHoje] = useState(false);
  const [modalTodosLocaisOpen, setModalTodosLocaisOpen] = useState(false);
  const [comprasTodosLocais, setComprasTodosLocais] = useState([]);
  const [loadingTodosLocais, setLoadingTodosLocais] = useState(false);
  const [comprasExpandidas, setComprasExpandidas] = useState(new Set());
  const [detalhesCompras, setDetalhesCompras] = useState({});
  const [carregandoDetalhes, setCarregandoDetalhes] = useState({});
  const filtroDataGlobal = getDataTrabalho();

  const [snackbar, setSnackbar] = useState({ open: false, msg: "", severity: "success" });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdatingForn, setIsUpdatingForn] = useState(false);

  const [modalNovaCompraOpen, setModalNovaCompraOpen] = useState(false);
  const [produtosOptions, setProdutosOptions] = useState([]);

  // Estados de Fechamento
  const [fechamentoRealizado, setFechamentoRealizado] = useState(false);
  const [preFechamentoRealizado, setPreFechamentoRealizado] = useState(false);

  // --- Efeitos ---
  useEffect(() => {
    if (!origemUsuario || !filtroDataGlobal) return;

    // Verificar fechamento
    axios.post(`${API_BASE_URL}/saldos/fechados`, {
      data: filtroDataGlobal,
      local: origemUsuario
    })
    .then(res => setFechamentoRealizado(res.data?.fechado || false))
    .catch(err => console.error("Erro ao verificar fechamento:", err));

    // Verificar pré-fechamento
    axios.get(`${API_BASE_URL}/pre-fechamento`, {
      params: { data: filtroDataGlobal, local: origemUsuario }
    })
    .then(res => setPreFechamentoRealizado(res.data?.existe || false))
    .catch(err => console.error("Erro ao verificar pré-fechamento:", err));
  }, [filtroDataGlobal, origemUsuario]);

  useEffect(() => {
    if (!origemUsuario) {
      axios.get(`${API_BASE_URL}/usuarios/origem/${username}`)
        .then(res => {
          const orig = res.data.origem || null;
          setOrigemUsuario(orig);
          if (orig) sessionStorage.setItem("local", orig);
        })
        .catch(err => console.error(err));
    }
  }, [username]);

  const fetchCompras = useCallback(() => {
    if (!origemUsuario) return;
    setLoading(true);
    axios
      .get(`${API_BASE_URL}/compras-mercadoria`, {
        params: { data: filtroDataGlobal, local: origemUsuario },
      })
      .then((res) => setCompras(res.data))
      .catch((err) => console.error("Erro compras:", err))
      .finally(() => setLoading(false));
  }, [filtroDataGlobal, origemUsuario]);

  // --- Handlers ---
  const showSnackbar = (msg, severity = "success") => setSnackbar({ open: true, msg, severity });

  const fetchComprasTodosLocais = useCallback(() => {
    setLoadingTodosLocais(true);
    axios
      .get(`${API_BASE_URL}/compras-mercadoria/todos-locais`, {
        params: { data: filtroDataGlobal },
      })
      .then((res) => setComprasTodosLocais(res.data))
      .catch((err) => {
        console.error("Erro compras todos locais:", err);
        showSnackbar("Erro ao buscar compras de todos os locais.", "error");
      })
      .finally(() => setLoadingTodosLocais(false));
  }, [filtroDataGlobal]);

  useEffect(() => {
    if (origemUsuario) fetchCompras();
  }, [origemUsuario, fetchCompras]);

  useEffect(() => {
    if (modalTodosLocaisOpen) {
      fetchComprasTodosLocais();
      // Limpar estados de expansão ao fechar/abrir modal
      setComprasExpandidas(new Set());
      setDetalhesCompras({});
      setCarregandoDetalhes({});
    }
  }, [modalTodosLocaisOpen, fetchComprasTodosLocais]);

  const toggleExpandirCompra = async (numero, local) => {
    const key = `${numero}-${local}`;
    const isExpanded = comprasExpandidas.has(key);

    if (isExpanded) {
      // Fechar
      const novasExpandidas = new Set(comprasExpandidas);
      novasExpandidas.delete(key);
      setComprasExpandidas(novasExpandidas);
    } else {
      // Abrir - buscar detalhes se ainda não foram carregados
      const novasExpandidas = new Set(comprasExpandidas);
      novasExpandidas.add(key);
      setComprasExpandidas(novasExpandidas);

      if (!detalhesCompras[key]) {
        setCarregandoDetalhes((prev) => ({ ...prev, [key]: true }));
        try {
          const res = await axios.get(
            `${API_BASE_URL}/compras-mercadoria/detalhes/${numero}/${local}`
          );
          setDetalhesCompras((prev) => ({ ...prev, [key]: res.data }));
        } catch (err) {
          console.error("Erro ao buscar detalhes da compra:", err);
          showSnackbar("Erro ao carregar detalhes da compra.", "error");
        } finally {
          setCarregandoDetalhes((prev) => ({ ...prev, [key]: false }));
        }
      }
    }
  };

  const fetchProdutos = async (busca) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/produto`, { params: { search: busca } });
      setProdutosOptions(res.data);
    } catch (err) { console.error(err); }
  };

  const handleAbrirModal = async (compra) => {
    setCompraSelecionada(compra);
    try {
      const res = await axios.get(`${API_BASE_URL}/compras-mercadoria/${compra.numero}/itens`, {
        params: { data: filtroDataGlobal }
      });
      setItensCompra(res.data);
      const qtdInit = {};
      res.data.forEach((item, index) => {
        qtdInit[index] = item.qtd_lancada !== null ? item.qtd_lancada.toString() : "";
      });
      setQtdades(qtdInit);
      setModalOpen(true);
    } catch (err) { console.error(err); }
  };

  const handleSalvarQtdades = async () => {
    const dataEntradaFormatada = filtroDataGlobal.includes("/") ? filtroDataGlobal.split("/").reverse().join("") : filtroDataGlobal.replaceAll("-", "");
    const payload = {
      dataEntrada: dataEntradaFormatada,
      itens: itensCompra.map((item, index) => ({
        compra_codigo: compraSelecionada.numero,
        codpro: item.codigo,
        qtd_lancada: Number(qtdades[index]) || 0,
        local: origemUsuario,
        usuario: username
      })).filter(i => i.codpro && i.local)
    };

    try {
      if (payload.itens.length === 0) {
        showSnackbar("Preencha ao menos uma quantidade.", "warning");
        return;
      }
      await axios.post(`${API_BASE_URL}/compras-mercadoria/lancar`, payload);
      fetchCompras();
      showSnackbar("Lançamentos salvos!");
      setModalOpen(false);
    } catch (err) {
      showSnackbar("Erro ao salvar.", "error");
    }
  };

  const handleSalvarNovaCompra = async (novaCompra) => {
    try {
      const payload = {
        ...novaCompra,
        local: origemUsuario,
        produtos: novaCompra.produtos.map(p => ({
          codigo: p.codProduto.replace(/\D/g, "").padStart(6, "0"),
          descricao: p.descricao,
          quantidade: p.qtd,
          unidade: p.unidade,
          preco: p.preco,
          fornecedor: p.fornecedor
        }))
      };
      await axios.post(`${API_BASE_URL}/compras-mercadoria/nova`, payload);
      fetchCompras();
      showSnackbar("Compra cadastrada!");
      setModalNovaCompraOpen(false);
    } catch (err) {
      showSnackbar("Erro ao salvar compra.", "error");
    }
  };

  // Logout
  const handleLogout = () => { sessionStorage.clear(); localStorage.removeItem("username"); navigate("/login"); };

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
                <h1 className="text-lg font-bold leading-tight text-slate-800 dark:text-white">Compras de Mercadoria</h1>
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
                      {filtroDataGlobal ? dayjs(filtroDataGlobal).add(12, 'hour').format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY')}
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
        <div className="flex flex-col xl:flex-row justify-between items-center mb-8 gap-4 animate-in slide-in-from-bottom-5 duration-500">

          {/* Esquerda: Navegação e Filtros */}
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <button
              onClick={() => navigate("/estoque")}
              className="h-12 w-12 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white shadow-sm hover:shadow-md transition-all border border-slate-200 dark:border-slate-700"
              title="Voltar"
            >
              <span className="material-symbols-rounded text-2xl">arrow_back</span>
            </button>

            <button
              onClick={() => setFiltroChegadaHoje(!filtroChegadaHoje)}
              className={`h-12 px-6 rounded-xl text-sm font-bold transition-all border shadow-sm flex items-center ${filtroChegadaHoje
                ? "bg-blue-600 text-white border-blue-600 shadow-blue-600/20"
                : "bg-white dark:bg-slate-800 text-slate-500 hover:text-blue-600 border-slate-200 dark:border-slate-700 hover:border-blue-300"
                }`}
            >
              {filtroChegadaHoje ? "MOSTRANDO HOJE" : "MOSTRAR CHEGADA HOJE"}
            </button>

            <button
              onClick={() => setModalTodosLocaisOpen(true)}
              className="h-12 px-6 rounded-xl text-sm font-bold transition-all border shadow-sm flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-500 hover:text-purple-600 border-slate-200 dark:border-slate-700 hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"
              title="Mostrar compras de todos os locais dos últimos 3 dias"
            >
              <span className="material-symbols-rounded text-lg">public</span>
              VER TODOS OS LOCAIS
            </button>

            {/* KPI Card Simple */}
            <div className="hidden md:flex h-12 items-center gap-3 px-5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl border border-blue-200 dark:border-blue-800">
              <span className="material-symbols-rounded">calendar_month</span>
              <div className="flex flex-col leading-none">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Previsto Hoje</span>
                <span className="text-base font-bold">
                  {compras.filter(c => new Date(c.chegada).toISOString().split("T")[0] === filtroDataGlobal).length}
                </span>
              </div>
            </div>
          </div>

          {/* Direita: Pesquisa e Ações */}
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end">
            <div className="relative flex-grow md:flex-grow-0">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                <span className="material-symbols-rounded">search</span>
              </div>
              <input
                type="text"
                className="h-12 pl-10 pr-4 w-full md:w-64 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm text-sm"
                placeholder="Pesquisar Nº..."
                value={filtroCompra}
                onChange={(e) => setFiltroCompra(e.target.value)}
              />
            </div>

            <button
              disabled={isUpdating || fechamentoRealizado || preFechamentoRealizado}
              onClick={async () => {
                setIsUpdating(true);
                try {
                  // Agora enviando a data no body para atualização otimizada
                  await axios.post(`${API_BASE_URL}/atualizar-compras`, { data: filtroDataGlobal }, { headers: { "x-local": origemUsuario } });
                  showSnackbar("Compras atualizadas!");
                  fetchCompras();
                } catch (e) { showSnackbar("Erro ao atualizar", "error"); }
                finally { setIsUpdating(false); }
              }}
              className="h-12 w-12 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-slate-500 hover:text-blue-600 shadow-sm border border-slate-200 hover:border-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Atualizar Compras"
            >
              <span className={`material-symbols-rounded text-xl ${isUpdating ? 'animate-spin' : ''}`}>sync</span>
            </button>

            <button
              onClick={() => setModalNovaCompraOpen(true)}
              disabled={fechamentoRealizado || preFechamentoRealizado}
              className="h-12 px-6 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-md shadow-green-600/20 flex items-center gap-2 text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-rounded text-lg">add_circle</span>
              Incluir Compra
            </button>
          </div>
        </div>

        {/* Tabela Modernizada */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-500">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-700/30 border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider text-slate-500 font-bold">
                  <th className="px-6 py-4">Nº Compra</th>
                  <th className="px-6 py-4">Chegada</th>
                  <th className="px-6 py-4">Fornecedor</th>
                  <th className="px-6 py-4 text-center">Efetivação</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {loading ? (
                  <tr><td colSpan="6" className="p-8 text-center text-slate-500">Carregando compras...</td></tr>
                ) : compras.filter(c => {
                  const matchNum = c.numero.toString().includes(filtroCompra.trim());
                  const matchData = !filtroChegadaHoje || new Date(c.chegada).toISOString().split("T")[0] === new Date().toISOString().split("T")[0];
                  return matchNum && matchData;
                }).length === 0 ? (
                  <tr><td colSpan="6" className="p-8 text-center text-slate-500">Nenhuma compra encontrada.</td></tr>
                ) : (
                  compras
                    .filter(c => {
                      const matchNum = c.numero.toString().includes(filtroCompra.trim());
                      const matchData = !filtroChegadaHoje || new Date(c.chegada).toISOString().split("T")[0] === new Date().toISOString().split("T")[0];
                      return matchNum && matchData;
                    })
                    .slice((paginaAtual - 1) * comprasPorPagina, paginaAtual * comprasPorPagina)
                    .map((compra) => (
                      <tr key={compra.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">#{compra.numero}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                          {compra.chegada ? new Date(compra.chegada).toLocaleDateString("pt-BR") : "-"}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-200">{compra.fornecedor}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border 
                                           ${compra.efetivada === 1 ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400' :
                              'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400'}`}
                          >
                            {compra.efetivada === 1 ? '✓ Efetivada' : '○ Em Aberto'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border 
                                            ${compra.status?.toLowerCase() === 'pendente' ? 'bg-red-100 text-red-700 border-red-200' :
                              compra.status?.toLowerCase() === 'pendências' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                'bg-emerald-100 text-emerald-700 border-emerald-200'}`}
                          >
                            {compra.status || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleAbrirModal(compra)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-semibold text-sm flex items-center gap-1 ml-auto"
                          >
                            <span className="material-symbols-rounded text-lg">edit_note</span>
                            Lançar
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50">
            <button
              disabled={paginaAtual === 1}
              onClick={() => setPaginaAtual(p => p - 1)}
              className="px-4 py-2 text-sm font-bold text-slate-500 disabled:opacity-50 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Anterior
            </button>
            <span className="text-sm font-semibold text-slate-500">Página {paginaAtual}</span>
            <button
              disabled={paginaAtual * comprasPorPagina >= compras.length} // Simples check, ideal é filtrar length real
              onClick={() => setPaginaAtual(p => p + 1)}
              className="px-4 py-2 text-sm font-bold text-slate-500 disabled:opacity-50 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Próxima
            </button>
          </div>
        </div>

      </main>

      {/* Modal Lançamento */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`Lançamento: Compra #${compraSelecionada?.numero}`}>
        {itensCompra.length === 0 ? (
          <div className="text-center py-8 text-slate-500">Nenhum item nesta compra.</div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Descrição</th>
                    <th className="px-4 py-3 text-right">Qtd Nota</th>
                    <th className="px-4 py-3 text-right">Qtd Recebida</th>
                    <th className="px-4 py-3 text-center">Usuário</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itensCompra.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-slate-600">{item.codigo}</td>
                      <td className="px-4 py-3 font-medium">{item.descricao}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{item.qtde}</td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          value={qtdades[idx] || ""}
                          onChange={e => {
                            const val = e.target.value;
                            setQtdades(p => ({ ...p, [idx]: val }));
                          }}
                          className="w-24 text-right border border-slate-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.criado_por ? (
                          <Tooltip title={`Lançado por ${item.criado_por} em ${dayjs.utc(item.criado_em).local().format('DD/MM/YYYY HH:mm')}`} arrow placement="top">
                            <div className="flex items-center justify-center cursor-help">
                              <div className="bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 p-1.5 rounded-lg transition-all border border-slate-100 dark:border-slate-700/50">
                                <span className="material-symbols-rounded text-lg leading-none">history</span>
                              </div>
                            </div>
                          </Tooltip>
                        ) : (
                          <span className="text-slate-300 text-xs">--</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button onClick={() => setModalOpen(false)} className="px-6 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 font-bold transition-colors">Cancelar</button>
              <button onClick={handleSalvarQtdades} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2">
                <span className="material-symbols-rounded">save</span> Salvar Lançamento
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ModalNovaCompra
        open={modalNovaCompraOpen}
        onClose={() => setModalNovaCompraOpen(false)}
        produtosOptions={produtosOptions}
        fetchProdutos={fetchProdutos}
        onSalvar={handleSalvarNovaCompra}
      />

      {/* Modal Todos os Locais - Somente Visualização */}
      <Modal isOpen={modalTodosLocaisOpen} onClose={() => setModalTodosLocaisOpen(false)} title="Compras de Todos os Locais - Últimos 3 Dias" maxWidth="full">
        <div className="space-y-4">
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
              <span className="material-symbols-rounded">visibility</span>
              <span className="text-sm font-semibold">
                Visualização somente - Compras de todos os locais dos últimos 3 dias ordenadas por data de chegada (mais recente primeiro)
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 w-12"></th>
                    <th className="px-4 py-3">Nº Compra</th>
                    <th className="px-4 py-3">Local</th>
                    <th className="px-4 py-3">Chegada</th>
                    <th className="px-4 py-3">Fornecedor</th>
                    <th className="px-4 py-3 text-center">Efetivação</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingTodosLocais ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-500">
                        Carregando compras...
                      </td>
                    </tr>
                  ) : comprasTodosLocais.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-500">
                        Nenhuma compra encontrada nos últimos 3 dias.
                      </td>
                    </tr>
                  ) : (
                    comprasTodosLocais.map((compra) => {
                      const key = `${compra.numero}-${compra.local}`;
                      const isExpanded = comprasExpandidas.has(key);
                      const detalhes = detalhesCompras[key];
                      const carregando = carregandoDetalhes[key];

                      return (
                        <React.Fragment key={key}>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer" onClick={() => toggleExpandirCompra(compra.numero, compra.local)}>
                            <td className="px-4 py-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpandirCompra(compra.numero, compra.local);
                                }}
                                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                              >
                                <span className={`material-symbols-rounded text-slate-600 dark:text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                  chevron_right
                                </span>
                              </button>
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">
                              #{compra.numero}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold text-xs">
                                {compra.local || "-"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                              {compra.chegada ? new Date(compra.chegada).toLocaleDateString("pt-BR") : "-"}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                              {compra.fornecedor}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border 
                                ${compra.efetivada === 1
                                  ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400'}`}
                              >
                                {compra.efetivada === 1 ? '✓ Efetivada' : '○ Em Aberto'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border 
                                ${compra.status?.toLowerCase() === 'pendente'
                                  ? 'bg-red-100 text-red-700 border-red-200'
                                  : compra.status?.toLowerCase() === 'pendências'
                                    ? 'bg-amber-100 text-amber-700 border-amber-200'
                                    : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}
                              >
                                {compra.status || 'N/A'}
                              </span>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan="7" className="px-4 py-4 bg-slate-50 dark:bg-slate-800/50">
                                {carregando ? (
                                  <div className="text-center py-4 text-slate-500">
                                    <span className="material-symbols-rounded animate-spin inline-block mr-2">sync</span>
                                    Carregando detalhes...
                                  </div>
                                ) : detalhes ? (
                                  <div className="space-y-4">
                                    {/* Itens da Compra */}
                                    <div className="bg-white dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                                      <h4 className="font-bold text-lg text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                                        <span className="material-symbols-rounded text-blue-600">inventory_2</span>
                                        Itens da Compra (SZ1140) - {detalhes.itens.length} item(ns)
                                      </h4>
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                          <thead className="bg-slate-100 dark:bg-slate-600 border-b border-slate-200 dark:border-slate-500">
                                            <tr>
                                              <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-200">Código</th>
                                              <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-200">Descrição</th>
                                              <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-200">Fornecedor</th>
                                              <th className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-200">Qtd</th>
                                              <th className="px-3 py-2 text-center font-semibold text-slate-700 dark:text-slate-200">Efetivado</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100 dark:divide-slate-600">
                                            {detalhes.itens.map((item, idx) => (
                                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-600/50">
                                                <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300">{item.codigo}</td>
                                                <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{item.descricao}</td>
                                                <td className="px-3 py-2 text-slate-600 dark:text-slate-400 text-xs">{item.fornecedor || "-"}</td>
                                                <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300">{item.quantidade.toFixed(2)}</td>
                                                <td className="px-3 py-2 text-center">
                                                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${item.efetivado ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                                    {item.efetivado ? "Sim" : "Não"}
                                                  </span>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-4 text-red-500">
                                    Erro ao carregar detalhes da compra.
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-200">
            <div className="text-sm text-slate-500">
              Total: <span className="font-bold text-slate-700 dark:text-slate-200">{comprasTodosLocais.length}</span> compras
            </div>
            <button
              onClick={() => setModalTodosLocaisOpen(false)}
              className="px-6 py-2.5 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-600/20 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-rounded">close</span>
              Fechar
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
          {snackbar.msg}
        </MuiAlert>
      </Snackbar>

      <LoadingOverlay visible={isUpdating} />
    </div>
  );
};

export default ComprasMercadoria;
