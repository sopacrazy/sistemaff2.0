
import React, { useEffect, useState, useMemo } from "react";
import {
  Snackbar,
  Autocomplete,
  TextField
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getDataTrabalho } from "../utils/dataTrabalho";
import debounce from "lodash.debounce";
import dayjs from "dayjs";
import MuiAlert from "@mui/material/Alert";
import { API_BASE_URL } from '../utils/apiConfig';

/**
 * Componente NovaDevolucao Refatorado
 * - Design Glassmorphism
 * - Layout em Cards
 * - Inputs estilizados
 */
const NovaDevolucao = () => {
  const navigate = useNavigate();
  const [produtosOptions, setProdutosOptions] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtosSelecionados, setProdutosSelecionados] = useState([]);

  // Feedback
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dados globais
  const [dataTrabalho] = useState(getDataTrabalho());
  const [origemUsuario, setOrigemUsuario] = useState("");
  // Check sessionStorage first (Login.js uses it), then localStorage
  const username = sessionStorage.getItem("username") || localStorage.getItem("username") || "sistema";

  // Estado do Formulário
  const [form, setForm] = useState({
    numero: "",
    origem: "",
    cliente: "",
    clienteId: null,
    tipoDocumento: "bilhete", // 'bilhete' | 'nfd' | 'sobra'
    movimentaEstoque: true,
    numeroInput: "",
    produtos: [
      {
        codProduto: "",
        descricao: "",
        quantidade: "",
        unidade: "",
        unidadeConversao: "",
        fatorConversao: 1,
        validacao_convertida: 0,
        busca: "",
      },
    ],
  });

  // --- Efeitos Iniciais ---
  // --- Efeitos Iniciais ---
  // --- Efeitos Iniciais ---
  // --- Efeitos Iniciais ---
  useEffect(() => {
    // Buscamos sempre do banco de dados para garantir a informação mais atualizada
    if (username) {
      // Adiciona timestamp para evitar cache do navegador
      axios
        .get(`${API_BASE_URL}/usuarios/origem/${username}?t=${Date.now()}`)
        .then((res) => {
          const fromDb = res.data.origem;
          if (fromDb) {
            setOrigemUsuario(fromDb);
            setForm((prev) => ({ ...prev, origem: fromDb }));
          }
        })
        .catch(err => console.error("Erro ao buscar origem:", err));
    }
  }, [username]);

  // Sincroniza produtosSelecionados com form.produtos para o Autocomplete funcionar corretamente
  useEffect(() => {
    const atualizados = form.produtos.map((p) => ({
      codigo_produto: String(p.codProduto || "").replace(".", "") || "",
      descricao: p.descricao || "",
      segunda_unidade: p.unidade || "",
    }));
    setProdutosSelecionados(atualizados);
  }, [form.produtos]);


  // --- Buscas (Client-side debounced) ---
  const debouncedBuscaClientes = useMemo(
    () =>
      debounce(async (search) => {
        if (!search || search.trim().length < 2) {
          setClientes([]);
          return;
        }
        try {
          const res = await axios.get(`${API_BASE_URL}/clientes`, {
            params: { search: search.toUpperCase() },
          });
          setClientes(res.data);
        } catch (err) {
          console.error("Erro ao buscar clientes:", err);
        }
      }, 200),
    []
  );

  const debouncedBuscaProdutos = useMemo(
    () =>
      debounce(async (search) => {
        if (!search || search.trim().length < 2) {
          setProdutosOptions([]);
          return;
        }
        try {
          const res = await axios.get(`${API_BASE_URL}/produto`, {
            params: { search: search.toUpperCase() },
          });
          setProdutosOptions(res.data);
        } catch (err) {
          console.error("Erro ao buscar produtos:", err);
        }
      }, 200),
    []
  );


  // --- Manipuladores de Input ---

  const handleNumeroChange = (e) => {
    let input = e.target.value;

    if (form.tipoDocumento === "bilhete" || form.tipoDocumento === "sobra") {
      // Limita a alfanuméricos e 6 chars
      input = input.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

      const prefixo = form.tipoDocumento === "bilhete" ? "BIL" : "SOB";

      setForm((prev) => ({
        ...prev,
        numeroInput: input,
        numero: `${prefixo}-${input}`,
      }));

    } else if (form.tipoDocumento === "nfd") {
      // Limita a números e 9 dígitos
      input = input.replace(/\D/g, "").slice(0, 9);
      const padded = input.padEnd(0, "0"); // Apenas armazena o input cru no numeroInput

      // O numero final formatado precisa ter zeros a esquerda se o usuario terminar de digitar, 
      // mas aqui vamos montando dinamicamente
      const formatted = input.length > 0 ? `NFD-${input.padStart(9, "0")}` : "";

      setForm((prev) => ({
        ...prev,
        numeroInput: input,
        numero: formatted,
      }));
    }
  };

  const handleChangeProduto = (index, field, value) => {
    const atualizados = [...form.produtos];
    atualizados[index][field] = value;

    // Recalcula conversão se mudar a quantidade
    if (field === "quantidade") {
      const fator = atualizados[index].fatorConversao || 1;
      const qtd = parseFloat(value) || 0;
      atualizados[index].validacao_convertida = parseFloat((qtd / fator).toFixed(2));
    }

    setForm((prev) => ({ ...prev, produtos: atualizados }));
  };

  const adicionarProduto = () => {
    setForm((prev) => ({
      ...prev,
      produtos: [
        ...prev.produtos,
        {
          codProduto: "",
          descricao: "",
          quantidade: "",
          unidade: "",
          unidadeConversao: "",
          fatorConversao: 1,
          validacao_convertida: 0,
          busca: "",
        },
      ],
    }));
  };

  const removerProduto = (index) => {
    if (form.produtos.length <= 1) return;
    const novos = form.produtos.filter((_, i) => i !== index);
    setForm((prev) => ({ ...prev, produtos: novos }));
  };

  const showSnackbar = (message, severity = "info") => {
    setSnackbar({ open: true, message, severity });
  };


  // --- Salvar ---
  const handleSalvar = async () => {
    // Validação Básica
    if (!form.numeroInput || !form.cliente || !form.produtos.length) {
      showSnackbar("Preencha todos os campos obrigatórios.", "warning");
      return;
    }

    // Validação de Produtos
    for (const produto of form.produtos) {
      if (!produto.codProduto || !produto.descricao || !produto.quantidade) {
        showSnackbar("Todos os produtos precisam estar preenchidos.", "warning");
        return;
      }
    }

    setIsSubmitting(true);

    // --- Lógica Especial para Basquetas (Produto 499.001 / 499001) ---
    const basquetaCodes = ["499.001", "499001"];
    const produtosNormais = form.produtos.filter(p => !basquetaCodes.includes(String(p.codProduto).trim()));
    const basquetasNoGrid = form.produtos.filter(p => basquetaCodes.includes(String(p.codProduto).trim()));
    
    // Somar quantidades de basquetas no grid
    const totalBasquetasGeral = basquetasNoGrid.reduce((acc, p) => acc + (parseInt(p.quantidade) || 0), 0);

    const payload = {
      ...form,
      produtos: produtosNormais, // Envia apenas produtos que não são basquetas para a tabela de devolução
      numero: form.numero,
      data_inclusao: dataTrabalho,
      usuario: username,
      movimentaEstoque: form.movimentaEstoque,
      quantidadeBasquetas: totalBasquetasGeral,
    };

    try {
      // 1. Salva Devoluções de Produtos Normais (se houver)
      if (produtosNormais.length > 0) {
        await axios.post(`${API_BASE_URL}/devolucoes`, payload);
      }

      // 1.1 Registra no Controle de Basquetas (Total do campo + Grid)
      if (totalBasquetasGeral > 0) {
        try {
          await axios.post(`${API_BASE_URL}/api/basquetas/ajuste-cliente`, {
            cliente: form.clienteId,
            nome: form.cliente,
            quantidade: totalBasquetasGeral,
            tipo: 'ENTRADA',
            usuario: username,
            bilhete: form.numero
          });
          console.log("Basquetas registradas no controle.");
        } catch (basqErr) {
          console.error("Erro ao registrar basquetas no controle:", basqErr);
          showSnackbar("Erro ao registrar basquetas no controle.", "warning");
        }
      }

      // Se não tinha produtos normais e só basquetas, precisamos avisar que foi salvo
      if (produtosNormais.length === 0 && totalBasquetasGeral > 0) {
        showSnackbar("Basquetas registradas com sucesso!", "success");
      }

      // 2. Tenta imprimir (central e fallback local)
      const printPayload = {
        numero: payload.numero,
        origem: payload.origem,
        cliente: payload.cliente,
        produtos: form.produtos.map((p) => ({
          cod_produto: p.codProduto,
          descricao: p.descricao,
          quantidade: p.quantidade,
          unidade: p.unidade,
        })),
        data: new Date().toLocaleDateString(),
        hora: new Date().toLocaleTimeString(),
        usuario: payload.usuario,
      };

      try {
        // Tenta imprimir via servidor central primeiro (se existir endpoint) ou direto endpoint local
        await axios.post(`http://localhost:3005/imprimir-devolucao-termica`, printPayload, { timeout: 5000 });
        showSnackbar("Devolução salva e impressa!", "success");
      } catch (printErr) {
        console.warn("Falha impressão local:", printErr);
        // Tenta endpoint central se houver, se nao, avisa erro de impressao
        showSnackbar("Salvo, mas erro na impressão.", "warning");
      }

      // 3. Sucesso final
      setTimeout(() => {
        navigate("/estoque/devolucao");
      }, 1500);

    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || err.message;
      showSnackbar(`Erro ao salvar: ${errMsg}`, "error");
      setIsSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">

      {/* Header Glassmorphic */}
      <header className="sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-slate-700/50 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/estoque")}>
              <div className="bg-gradient-to-tr from-green-600 to-emerald-400 h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-600/20">
                <span className="font-bold text-xl italic tracking-tighter">SF</span>
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight text-slate-800 dark:text-white">Nova Devolução</h1>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Estoque</span>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              {/* Data Info */}
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
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8 relative z-10">

        {/* Card Formulário Principal */}
        <div className="space-y-6">

          {/* Seção 1: Dados do Documento */}
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-500">

            {/* Header do Card */}
            <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-700/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                  <span className="material-symbols-rounded">description</span>
                </div>
                <h2 className="text-lg font-bold text-slate-700 dark:text-white">Dados do Documento</h2>
              </div>
              <button
                onClick={() => navigate("/estoque/devolucao")}
                className="text-xs font-bold text-slate-400 hover:text-red-500 uppercase tracking-wider flex items-center gap-1 transition-colors"
              >
                Cancelar <span className="material-symbols-rounded text-base">close</span>
              </button>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-12 gap-6">

              {/* Tipo de Documento */}
              <div className="md:col-span-12">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Tipo de Documento</label>
                <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                  {['bilhete', 'nfd', 'sobra'].map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setForm(prev => ({ ...prev, tipoDocumento: type, numeroInput: "", numero: "" }));
                      }}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold uppercase transition-all duration-200 ${form.tipoDocumento === type
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                    >
                      {type === 'nfd' ? 'Nota Fiscal' : type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Número do Documento */}
              <div className="md:col-span-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                  {form.tipoDocumento === "bilhete" ? "Nº Bilhete" : form.tipoDocumento === "nfd" ? "Nº Nota" : "Cod Sobra"}
                </label>
                <input
                  type="text"
                  value={form.numeroInput}
                  onChange={handleNumeroChange}
                  placeholder={form.tipoDocumento === "bilhete" ? "ABC123" : "Apenas números"}
                  className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-bold text-lg text-slate-700 dark:text-white uppercase tracking-wider"
                />
                <div className="mt-1 text-[10px] text-slate-400 font-mono pl-1">
                  Preview: {form.numero || "..."}
                </div>
              </div>

              {/* Cliente Autocomplete */}
              <div className="md:col-span-9">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Cliente</label>
                <Autocomplete
                  options={clientes}
                  getOptionLabel={(option) => option.nome_fantasia || ""}
                  isOptionEqualToValue={(option, value) => option.codigo === value?.codigo}
                  onInputChange={(e, newInputValue, reason) => {
                    // Se o usuário apagou tudo, limpa a lista
                    if (!newInputValue) {
                      setClientes([]);
                      return;
                    }
                    // Dispara a busca debounced para qualquer entrada de texto
                    if (reason === "input") {
                      debouncedBuscaClientes(newInputValue);
                    }
                  }}
                  onChange={(_, newValue) => {
                    setForm(prev => ({
                      ...prev,
                      cliente: newValue ? (newValue.nome_reduzido || newValue.nome_completo) : "",
                      clienteId: newValue ? newValue.codigo : null
                    }));
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Busque pelo nome..."
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '12px',
                          backgroundColor: '#F8FAFC',
                          height: '48px',
                          '& fieldset': { borderColor: '#E2E8F0' },
                          '&:hover fieldset': { borderColor: '#CBD5E1' },
                          '&.Mui-focused fieldset': { borderColor: '#3B82F6', borderWidth: '2px' },
                        },
                        '& input': {
                          fontSize: '0.95rem',
                          fontWeight: '500',
                          color: '#334155'
                        }
                      }}
                    />
                  )}
                />
              </div>

              <div className="md:col-span-12 h-px bg-slate-100 dark:bg-slate-700 my-2"></div>

              {/* Origem e Movimentação */}
              <div className="md:col-span-6">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Local Recebimento</label>
                <div className="h-12 px-4 flex items-center rounded-xl bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 text-slate-500 font-bold select-none cursor-not-allowed">
                  {form.origem || "Carregando..."}
                </div>
              </div>

              <div className="md:col-span-6">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Movimenta Estoque?</label>
                <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl h-12 items-center">
                  <button
                    onClick={() => setForm(prev => ({ ...prev, movimentaEstoque: true }))}
                    className={`flex-1 h-full rounded-lg text-xs font-bold uppercase transition-all ${form.movimentaEstoque ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400'}`}
                  >
                    Sim
                  </button>
                  <button
                    onClick={() => setForm(prev => ({ ...prev, movimentaEstoque: false }))}
                    className={`flex-1 h-full rounded-lg text-xs font-bold uppercase transition-all ${!form.movimentaEstoque ? 'bg-red-500 text-white shadow-sm' : 'text-slate-400'}`}
                  >
                    Não
                  </button>
                </div>
              </div>



            </div>
          </div>


          {/* Seção 2: Itens */}
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100">

            <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-700/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                  <span className="material-symbols-rounded">inventory_2</span>
                </div>
                <h2 className="text-lg font-bold text-slate-700 dark:text-white">Itens da Devolução</h2>
              </div>
              <button
                onClick={adicionarProduto}
                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-rounded text-lg">add</span> Adicionar Item
              </button>
            </div>

            <div className="p-8 space-y-4">
              {form.produtos.map((p, index) => (
                <div key={index} className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-slate-50 dark:bg-slate-700/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 border-dashed hover:border-blue-300 dark:hover:border-blue-700 transition-colors group">

                  {/* Index Badge */}
                  <div className="hidden md:flex h-8 w-8 rounded-full bg-white dark:bg-slate-600 text-slate-400 font-bold text-xs items-center justify-center border border-slate-200 dark:border-slate-500 shrink-0">
                    {index + 1}
                  </div>

                  {/* Código */}
                  <div className="w-full md:w-32 shrink-0">
                    <input
                      value={p.codProduto}
                      disabled
                      placeholder="Cód."
                      className="w-full h-10 px-3 rounded-xl bg-slate-200/50 dark:bg-slate-800 border border-transparent text-slate-500 font-mono text-sm"
                    />
                  </div>

                  {/* Autocomplete Produto */}
                  <div className="flex-grow w-full">
                    <Autocomplete
                      options={produtosOptions}
                      value={produtosSelecionados[index] || null}
                      getOptionLabel={(option) => {
                        if (!option) return "";
                        // Se a descrição já tiver o código (formato "COD - DESC"), retorna só a descrição
                        if (option.descricao && option.descricao.includes(" - ")) return option.descricao;

                        const cod = option.codigo || option.codigo_produto || option.cod_produto || option.cod || "";
                        return cod ? `${cod} - ${option.descricao}` : option.descricao || "";
                      }}
                      isOptionEqualToValue={(option, value) => {
                        const optCod = option.codigo || option.codigo_produto;
                        const valCod = value.codigo || value.codigo_produto || value.codProduto;
                        return String(optCod) === String(valCod);
                      }}
                      onInputChange={(e, val, reason) => {
                        if (reason === "input") {
                          debouncedBuscaProdutos(val);
                        } else if (reason === "clear" || !val) {
                          setProdutosOptions([]);
                        }
                      }}
                      onChange={(_, newVal) => {
                        if (!newVal) {
                          handleChangeProduto(index, "codProduto", "");
                          handleChangeProduto(index, "descricao", "");
                          handleChangeProduto(index, "unidade", "");
                          handleChangeProduto(index, "unidadeConversao", "");
                          return;
                        }

                        // Backend retorna 'codigo', mas aceitamos variações
                        const codFormatado = newVal.codigo || newVal.codigo_produto || newVal.cod_produto || newVal.cod || "";
                        const fator = newVal.fator_conversao || 1;

                        // Remove o código da descrição se estiver concatenado, para salvar apenas a descrição
                        // O backend envia "COD - DESCRIÇÃO", queremos salvar apenas "DESCRIÇÃO"
                        let descricaoLimpa = newVal.descricao || "";
                        if (descricaoLimpa.includes(" - ")) {
                          const parts = descricaoLimpa.split(" - ");
                          // Se a primeira parte for igual ao código, remove
                          if (String(parts[0]).trim() === String(codFormatado).trim()) {
                            descricaoLimpa = parts.slice(1).join(" - ");
                          }
                        }

                        handleChangeProduto(index, "codProduto", codFormatado);
                        handleChangeProduto(index, "descricao", descricaoLimpa);
                        handleChangeProduto(index, "unidade", newVal.segunda_unidade || newVal.primeira_unidade);
                        handleChangeProduto(index, "unidadeConversao", newVal.primeira_unidade || "");
                        handleChangeProduto(index, "fatorConversao", fator);

                        // Update local state for autocomplete
                        const novosSelecionados = [...produtosSelecionados];
                        novosSelecionados[index] = newVal;
                        setProdutosSelecionados(novosSelecionados);
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Digite o nome ou código do produto..."
                          variant="standard"
                          InputProps={{
                            ...params.InputProps,
                            disableUnderline: true,
                            className: "h-10 px-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 focus-within:border-blue-500 transition-colors"
                          }}
                        />
                      )}
                    />
                  </div>

                  {/* Quantidade */}
                  <div className="w-full md:w-32 shrink-0">
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="Qtd"
                        value={p.quantidade}
                        onChange={(e) => handleChangeProduto(index, "quantidade", e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 dark:text-white"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                        {p.unidade}
                      </span>
                    </div>
                  </div>

                  {/* Conversão (Read-only) */}
                  <div className="w-full md:w-28 shrink-0">
                    <div className="relative">
                      <input
                        type="text"
                        disabled
                        value={
                          p.quantidade && p.fatorConversao
                            ? (Number(p.quantidade) / Number(p.fatorConversao)).toFixed(2)
                            : ""
                        }
                        placeholder={p.unidadeConversao || "Conv."}
                        className="w-full h-10 px-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold text-slate-600 dark:text-slate-400 select-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                        {p.unidadeConversao}
                      </span>
                    </div>
                  </div>

                  {/* Botão Remover */}
                  <button
                    onClick={() => removerProduto(index)}
                    disabled={form.produtos.length === 1}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                  >
                    <span className="material-symbols-rounded">delete</span>
                  </button>

                </div>
              ))}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-4 pt-4 pb-12">
            <button
              onClick={() => navigate("/estoque/devolucao")}
              className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
            >
              CANCELAR
            </button>
            <button
              onClick={handleSalvar}
              disabled={isSubmitting}
              className="pl-6 pr-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30 flex items-center gap-3 transition-all transform active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <span className="material-symbols-rounded animate-spin">progress_activity</span>
              ) : (
                <span className="material-symbols-rounded">save</span>
              )}
              SALVAR DEVOLUÇÃO
            </button>
          </div>

        </div>

      </main>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <MuiAlert elevation={6} variant="filled" severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))} sx={{ width: '100%', borderRadius: 3 }}>
          {snackbar.message}
        </MuiAlert>
      </Snackbar>

    </div>
  );
};

export default NovaDevolucao;
