import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { TextField, Autocomplete, Snackbar, Tooltip } from "@mui/material";
import MuiAlert from "@mui/material/Alert";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getDataTrabalho } from "../utils/dataTrabalho";
import debounce from "lodash.debounce";
import dayjs from "dayjs";
import { API_BASE_URL } from "../utils/apiConfig";

const locaisOptions = [
  { value: "01", label: "01 - Loja" },
  { value: "02", label: "02 - Depósito" },
  { value: "03", label: "03 - B.T.F" },
  { value: "04", label: "04 - Depósito da Banana" },
  { value: "05", label: "05 - Depósito do Ovo" },
  { value: "06", label: "06 - Passarela 02 (torres)" },
  { value: "07", label: "07 - Centro de Distribuição (C.D)" },
  { value: "08", label: "08 - Varejinho" },
  { value: "09", label: "09 - Passarela 01" },
];

const NovaTransferencia = () => {
  const navigate = useNavigate();
  // Auth & Session
  const username =
    sessionStorage.getItem("username") ||
    localStorage.getItem("username") ||
    "sistema";
  const [origemUsuario, setOrigemUsuario] = useState(
    sessionStorage.getItem("local") || "08"
  );

  const dataTrabalho = getDataTrabalho();

  // Refs
  const destinoRef = useRef(null);
  const carregadorRef = useRef(null);
  const descricaoRefs = useRef([]);

  // State Form
  const [form, setForm] = useState({
    origem: "",
    destino: "",
    carregador: "",
    produtos: [{ codProduto: "", descricao: "", qtd: "", unidade: "" }],
  });

  const [numeroTransferencia, setNumeroTransferencia] = useState("");
  const [produtosOptions, setProdutosOptions] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Efeitos ---

  // Carregar Origem
  useEffect(() => {
    if (!form.origem) {
      axios
        .get(`${API_BASE_URL}/usuarios/origem/${username}`)
        .then((res) => {
          const origem = res.data.origem || "";
          setOrigemUsuario(origem);
          setForm((prev) => ({ ...prev, origem }));
          sessionStorage.setItem("local", origem);
          setTimeout(() => destinoRef.current?.focus(), 200);
        })
        .catch((err) => console.error("Erro ao carregar origem user:", err));
    }
  }, [username, form.origem]);

  // Logout
  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.removeItem("username");
    navigate("/login");
  };

  const showSnackbar = (message, severity = "info") => {
    setSnackbar({ open: true, message, severity });
  };

  const verificarFechamento = async (local) => {
    try {
      const { data } = await axios.get(
        `${API_BASE_URL}/saldos/fechamento/${dataTrabalho}`,
        { params: { local } }
      );
      return data.fechado === true;
    } catch (err) {
      console.error("Erro ao verificar fechamento:", err);
      return false;
    }
  };

  const fetchProdutos = useCallback(async (term) => {
    if (!term || term.length < 2) return;

    try {
      const res = await axios.get(`${API_BASE_URL}/produtos-busca-rapida`, {
        params: {
          search: term.toUpperCase(),
          filial: "01",
          // Não passa local para somar estoque de todos os locais
          apenasComSaldo: false, // Sempre mostra todos os produtos, independente do estoque
          agrupar: "produto",
          limit: 40,
        },
      });
      const produtos = res.data.map((p) => {
        const produto = {
          ...p,
          // Mostra o saldo protheus na lista para ajudar o usuário
          // O backend já filtra produtos que têm saldo positivo em algum local
          descricao: p.em_compra
            ? p.descricao // Produtos em compra já vêm com descrição formatada do backend
            : p.descricao
              ? `${p.descricao} (Estoque Total: ${p.saldo_protheus || 0})`
              : p.produto,
          codigo_produto: p.codigo_produto || p.cod || p.cod_produto,
          unidade: p.primeira_unidade || p.unidade || "",
          em_compra: p.em_compra === true, // Garantir que seja boolean
        };
        return produto;
      });
      setProdutosOptions(produtos);
    } catch (err) {
      console.error("Erro ao buscar produtos:", err);
    }
  }, []);

  const debouncedFetchProdutos = useMemo(
    () => debounce(fetchProdutos, 300),
    [fetchProdutos]
  );

  const handleProdutoChange = (index, field, value) => {
    const updated = [...form.produtos];
    updated[index][field] = value;
    setForm((prev) => ({ ...prev, produtos: updated }));
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSalvar = async () => {
    if (!form.origem || !form.destino || !form.carregador) {
      showSnackbar("Preencha todos os campos obrigatórios.", "warning");
      return;
    }
    if (form.origem === form.destino) {
      showSnackbar("Origem e Destino devem ser diferentes.", "error");
      return;
    }
    const produtosValidos = form.produtos.every(
      (p) => p.codProduto && p.descricao && p.qtd
    );
    if (!produtosValidos) {
      showSnackbar(
        "Todos os produtos devem ter Código, Descrição e Quantidade.",
        "warning"
      );
      return;
    }

    setIsSubmitting(true);

    const destinoFechado = await verificarFechamento(form.destino);
    if (destinoFechado) {
      showSnackbar(
        `❌ O destino ${form.destino} está fechado em ${dataTrabalho}.`,
        "error"
      );
      setIsSubmitting(false);
      return;
    }

    const horaAtual = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const payload = {
      numero: numeroTransferencia,
      origem: form.origem,
      destino: form.destino,
      carregador: form.carregador.toUpperCase(),
      produtos: form.produtos.map((p) => ({
        cod_produto: p.codProduto,
        descricao: p.descricao,
        quantidade: Number(p.qtd),
        unidade: p.unidade,
      })),
      data_inclusao: dataTrabalho,
      hora: horaAtual,
      usuario: username,
    };

    try {
      showSnackbar("Salvando...", "info");
      await axios.post(`${API_BASE_URL}/transferencias`, payload);
      showSnackbar("Transferência salva com sucesso!", "success");

      try {
        // Tenta agente local primeiro (máquina do usuário)
        await axios.get("http://localhost:3005/ping", { timeout: 1500 });
        await axios.post(
          "http://localhost:3005/imprimir-transferencia-termica",
          payload,
          { timeout: 8000 }
        );
        showSnackbar("🖨️ Enviado para impressão (Local).", "info");
      } catch (e1) {
        console.warn(
          "Agente local indisponível, tentando servidor...",
          e1?.message
        );
        try {
          // Fallback para servidor central
          await axios.post(
            `${API_BASE_URL}/imprimir-transferencia-termica`,
            payload
          );
          showSnackbar("🖨️ Enviado para impressão (Servidor).", "info");
        } catch (e2) {
          console.warn("Falha impressão:", e2);
          showSnackbar("Salvo. Falha ao imprimir.", "warning");
        }
      }

      setForm({
        origem: form.origem,
        destino: "",
        carregador: "",
        produtos: [{ codProduto: "", descricao: "", qtd: "", unidade: "" }],
      });
      setNumeroTransferencia("");
      setTimeout(() => destinoRef.current?.focus(), 100);
    } catch (err) {
      console.error("Erro ao salvar:", err);
      const msg =
        err.response?.data?.message || err.message || "Erro desconhecido";
      showSnackbar(`Erro: ${msg}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Custom Styles for MUI Inputs to match Glassmorphism/Tailwind
  const textFieldStyles = {
    "& .MuiOutlinedInput-root": {
      borderRadius: "12px",
      backgroundColor: "#fff",
      transition: "all 0.2s",
      "&:hover": {
        borderColor: "#3b82f6",
      },
      "&.Mui-focused": {
        boxShadow: "0 0 0 4px rgba(59, 130, 246, 0.1)",
        borderColor: "#3b82f6",
      },
    },
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: "#e2e8f0", // slate-200
    },
    "& .MuiInputLabel-root.Mui-focused": {
      color: "#3b82f6",
      fontWeight: "bold",
    },
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">
      {/* Estilo global para produtos em compra */}
      <style>{`
        .MuiAutocomplete-option[data-em-compra="true"],
        .MuiAutocomplete-option.produto-em-compra {
          color: #dc2626 !important;
          font-weight: bold !important;
        }
        .MuiAutocomplete-option[data-em-compra="true"] span,
        .MuiAutocomplete-option.produto-em-compra span {
          color: #dc2626 !important;
          font-weight: bold !important;
        }
        .MuiAutocomplete-option[data-em-compra="true"]:hover {
          background-color: rgba(220, 38, 38, 0.08) !important;
        }
      `}</style>
      {/* Background Ambient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-green-400/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
      </div>

      {/* Header Glassmorphic */}
      <header className="sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-slate-700/50 px-6 py-3 flex items-center justify-between">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate("/estoque")}
            >
              <div className="bg-gradient-to-tr from-green-600 to-emerald-400 h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-600/20">
                <span className="font-bold text-xl italic tracking-tighter">
                  SF
                </span>
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight text-slate-800 dark:text-white">
                  Nova Transferência
                </h1>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  Estoque
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <Tooltip title="Alterar data na Home">
                <div className="hidden md:flex items-center gap-2 mr-2 bg-transparent px-3 py-2 rounded-xl group border border-transparent">
                  <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-1.5 rounded-lg">
                    <span className="material-symbols-rounded text-lg">
                      calendar_today
                    </span>
                  </div>
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Data
                    </span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {dataTrabalho
                        ? dayjs(dataTrabalho)
                          .add(12, "hour")
                          .format("DD/MM/YYYY")
                        : dayjs().format("DD/MM/YYYY")}
                    </span>
                  </div>
                </div>
              </Tooltip>

              <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 hidden md:block"></div>

              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-bold text-slate-800 dark:text-white">
                    {username}
                  </span>
                  <div className="text-[10px] font-bold text-white bg-slate-800 dark:bg-slate-600 px-2 py-0.5 rounded flex items-center gap-1">
                    LOCAL: {origemUsuario}{" "}
                    <span className="material-symbols-rounded text-[10px]">
                      location_on
                    </span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 border-2 border-white dark:border-slate-600 flex items-center justify-center shadow-sm">
                  <span className="material-symbols-rounded text-slate-500 dark:text-slate-300">
                    person
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-all border border-transparent hover:border-red-200 dark:hover:border-red-800"
              >
                <span className="material-symbols-rounded text-xl">logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8 relative z-10">
        {/* Header da Página */}
        <div className="flex items-center justify-between mb-8 animate-in slide-in-from-bottom-5 duration-500">
          <button
            onClick={() => navigate("/estoque/transferencia")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-sm hover:shadow-md transition-all group"
          >
            <span className="material-symbols-rounded group-hover:-translate-x-1 transition-transform">
              arrow_back
            </span>
            <span className="font-bold text-sm">Voltar</span>
          </button>
        </div>

        {/* Card Formulário */}
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-500">
          {/* Cabeçalho do Card */}
          <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="material-symbols-rounded text-green-600">
                  add_circle
                </span>
                Nova Transferência
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Preencha os dados abaixo para registrar uma saída de mercadoria.
              </p>
            </div>
            {numeroTransferencia && (
              <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-xl font-mono font-bold text-lg border border-blue-200 dark:border-blue-800">
                #{numeroTransferencia}
              </div>
            )}
          </div>

          <div className="p-8 space-y-8">
            {/* Linha 1: Origem / Destino / Carregador */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-2">
                <TextField
                  label="Origem"
                  value={form.origem}
                  disabled
                  fullWidth
                  variant="filled"
                  size="small"
                  sx={{
                    "& .MuiFilledInput-root": {
                      borderRadius: "12px",
                      bgcolor: "rgba(0,0,0,0.04)",
                    },
                  }}
                />
              </div>
              <div className="lg:col-span-4">
                <Autocomplete
                  options={locaisOptions}
                  getOptionLabel={(opt) => opt.label}
                  value={
                    locaisOptions.find((l) => l.value === form.destino) || null
                  }
                  onChange={async (_, newValue) => {
                    const dest = newValue?.value || "";
                    handleChange("destino", dest);

                    if (dest && form.origem) {
                      try {
                        const res = await axios.get(
                          `${API_BASE_URL}/transferencias/proximo-numero`,
                          { params: { origem: form.origem, destino: dest } }
                        );
                        setNumeroTransferencia(res.data.numero);
                        setTimeout(() => carregadorRef.current?.focus(), 100);
                      } catch (error) {
                        console.error("Erro ao buscar próximo número:", error);
                        showSnackbar("Erro ao gerar número.", "error");
                      }
                    } else {
                      setNumeroTransferencia("");
                    }
                  }}
                  getOptionDisabled={(opt) => opt.value === form.origem}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Destino"
                      required
                      variant="outlined"
                      size="small"
                      inputRef={destinoRef}
                      sx={textFieldStyles}
                    />
                  )}
                />
              </div>
              <div className="lg:col-span-6">
                <TextField
                  label="Nome do Carregador"
                  value={form.carregador}
                  onChange={(e) =>
                    handleChange("carregador", e.target.value.toUpperCase())
                  }
                  fullWidth
                  required
                  variant="outlined"
                  size="small"
                  inputRef={carregadorRef}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      descricaoRefs.current[0]?.focus();
                    }
                  }}
                  inputProps={{ style: { textTransform: "uppercase" } }}
                  sx={textFieldStyles}
                />
              </div>
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-700 w-full my-4"></div>

            {/* Produtos */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-700 dark:text-slate-200">
                  Itens da Transferência
                </h3>
                <button
                  onClick={() => {
                    setForm((p) => ({
                      ...p,
                      produtos: [
                        ...p.produtos,
                        { codProduto: "", descricao: "", qtd: "", unidade: "" },
                      ],
                    }));
                    setTimeout(() => {
                      const idx = form.produtos.length;
                      descricaoRefs.current[idx]?.focus();
                    }, 100);
                  }}
                  className="text-sm font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-rounded text-lg">add</span>
                  Adicionar Item
                </button>
              </div>

              <div className="space-y-3">
                {form.produtos.map((produto, index) => (
                  <div
                    key={index}
                    className="flex flex-col md:flex-row gap-3 items-start p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 transition-all hover:shadow-sm hover:border-blue-200 dark:hover:border-blue-800"
                  >
                    <div className="w-full md:w-32">
                      <TextField
                        label="Cód"
                        value={produto.codProduto}
                        fullWidth
                        size="small"
                        disabled
                        variant="filled"
                        InputProps={{ style: { fontSize: "0.85rem" } }}
                        sx={{
                          "& .MuiFilledInput-root": {
                            borderRadius: "12px",
                            bgcolor: "rgba(0,0,0,0.03)",
                          },
                        }}
                      />
                    </div>
                    <div className="flex-grow w-full">
                      <Autocomplete
                        freeSolo
                        autoHighlight
                        options={produtosOptions}
                        filterOptions={(x) => x}
                        getOptionLabel={(opt) =>
                          typeof opt === "string" ? opt : opt.descricao || ""
                        }
                        value={produto.descricao}
                        onInputChange={(e, newInput, reason) => {
                          // Evita loop infinito de atualizações se o input não mudou realmente
                          // ou se for apenas seleção
                          if (reason === "reset" && newInput === produto.descricao) return;

                          const upper = newInput.toUpperCase();
                          handleProdutoChange(index, "descricao", upper);
                          if (reason === "input") {
                            // Limpa campos se o usuário estiver digitando
                            handleProdutoChange(index, "unidade", "");
                            handleProdutoChange(index, "codProduto", "");
                            debouncedFetchProdutos(upper);
                          }
                        }}
                        onChange={(_, newValue) => {
                          if (typeof newValue === "object" && newValue) {
                            handleProdutoChange(
                              index,
                              "descricao",
                              newValue.descricao
                            );
                            handleProdutoChange(
                              index,
                              "codProduto",
                              newValue.codigo_produto
                            );
                            // Tenta pegar a unidade de várias formas possíveis
                            const unidadeFinal = newValue.unidade ||
                              newValue.primeira_unidade ||
                              "";
                            handleProdutoChange(
                              index,
                              "unidade",
                              unidadeFinal
                            );
                            setTimeout(
                              () =>
                                document
                                  .getElementById(`qtd-${index}`)
                                  ?.focus(),
                              100
                            );
                          }
                        }}
                        renderOption={(props, option) => {
                          const isEmCompra =
                            typeof option === "object" &&
                            option.em_compra === true;
                          // Extrair key das props para evitar warning
                          const { key, ...restProps } = props;
                          return (
                            <li
                              key={key}
                              {...restProps}
                              data-em-compra={isEmCompra ? "true" : "false"}
                              className={isEmCompra ? "produto-em-compra" : ""}
                              style={{
                                ...restProps.style,
                                color: isEmCompra
                                  ? "#dc2626 !important"
                                  : restProps.style?.color,
                                fontWeight: isEmCompra
                                  ? "bold !important"
                                  : restProps.style?.fontWeight,
                              }}
                            >
                              <span
                                className={
                                  isEmCompra ? "text-red-600 font-bold" : ""
                                }
                                style={{
                                  color: isEmCompra
                                    ? "#dc2626 !important"
                                    : "inherit",
                                  fontWeight: isEmCompra
                                    ? "bold !important"
                                    : "normal",
                                }}
                              >
                                {typeof option === "string"
                                  ? option
                                  : option.descricao || ""}
                              </span>
                            </li>
                          );
                        }}
                        slotProps={{
                          popper: {
                            sx: {
                              "& .MuiAutocomplete-option": {
                                "&[data-em-compra='true']": {
                                  color: "#dc2626 !important",
                                  fontWeight: "bold !important",
                                  "& span": {
                                    color: "#dc2626 !important",
                                    fontWeight: "bold !important",
                                  },
                                  "&:hover": {
                                    backgroundColor:
                                      "rgba(220, 38, 38, 0.08) !important",
                                  },
                                },
                                "&.produto-em-compra": {
                                  color: "#dc2626 !important",
                                  fontWeight: "bold !important",
                                  "& span": {
                                    color: "#dc2626 !important",
                                    fontWeight: "bold !important",
                                  },
                                },
                              },
                            },
                          },
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Descrição do Produto"
                            required
                            size="small"
                            variant="outlined"
                            inputProps={{
                              ...params.inputProps,
                              ref: (el) => {
                                descricaoRefs.current[index] = el;
                                if (params.inputProps.ref) {
                                  if (typeof params.inputProps.ref === 'function') {
                                    params.inputProps.ref(el);
                                  } else {
                                    params.inputProps.ref.current = el;
                                  }
                                }
                              }
                            }}
                            sx={textFieldStyles}
                          />
                        )}
                      />
                    </div>
                    <div className="w-full md:w-auto flex gap-2 items-start">
                      <TextField
                        id={`qtd-${index}`}
                        label={
                          produto.unidade ? `Qtd (${produto.unidade})` : "Qtd"
                        }
                        value={produto.qtd}
                        onChange={(e) =>
                          handleProdutoChange(index, "qtd", e.target.value)
                        }
                        type="number"
                        size="small"
                        required
                        inputProps={{ min: 1 }}
                        className="w-full md:w-40"
                        variant="outlined"
                        sx={textFieldStyles}
                      />
                      {/* Botão Adicionar Item - só aparece na última linha */}
                      {index === form.produtos.length - 1 && (
                        <button
                          onClick={() => {
                            setForm((p) => ({
                              ...p,
                              produtos: [
                                ...p.produtos,
                                {
                                  codProduto: "",
                                  descricao: "",
                                  qtd: "",
                                  unidade: "",
                                },
                              ],
                            }));
                            setTimeout(() => {
                              const idx = form.produtos.length;
                              descricaoRefs.current[idx]?.focus();
                            }, 100);
                          }}
                          className="h-10 w-10 flex items-center justify-center rounded-xl bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 transition-colors"
                          title="Adicionar novo item"
                        >
                          <span className="material-symbols-rounded">add</span>
                        </button>
                      )}
                      {/* Botão Remover - aparece em todas as linhas exceto a primeira */}
                      {index > 0 && (
                        <button
                          onClick={() => {
                            const novaLista = form.produtos.filter(
                              (_, i) => i !== index
                            );
                            setForm((prev) => ({
                              ...prev,
                              produtos: novaLista,
                            }));
                          }}
                          className="h-10 w-10 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                          title="Remover linha"
                        >
                          <span className="material-symbols-rounded">
                            delete
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Actions - Restored */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => navigate("/estoque/transferencia")}
                className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvar}
                disabled={isSubmitting}
                className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg flex items-center gap-2 transition-all transform active:scale-95 ${isSubmitting
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 shadow-green-600/30 hover:shadow-green-600/50"
                  }`}
              >
                {isSubmitting ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Salvando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-rounded">
                      check_circle
                    </span>
                    SALVAR TRANSFERÊNCIA
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <MuiAlert
          elevation={6}
          variant="filled"
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          sx={{ borderRadius: 3 }}
        >
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
    </div>
  );
};

export default NovaTransferencia;
