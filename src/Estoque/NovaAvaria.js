import React, { useEffect, useState, useMemo } from "react";
import { Box, TextField, Autocomplete, Snackbar, Switch, FormControlLabel } from "@mui/material";
import MuiAlert from "@mui/material/Alert";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import debounce from "lodash.debounce";
import dayjs from "dayjs";
import { getDataTrabalho } from "../utils/dataTrabalho";
import { API_BASE_URL } from "../utils/apiConfig";

// --- Configurações Locais ---
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

const NovaAvaria = () => {
  const navigate = useNavigate();

  // --- Estados do Formulário ---
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [numeroAvaria, setNumeroAvaria] = useState("");
  const [responsavel, setResponsavel] = useState("");

  // Lista de Produtos
  const [produtos, setProdutos] = useState([
    {
      codProduto: "",
      descricao: "",
      quantidade: "",
      conversao: "",
      unidade: "",
      segundaUnidade: "",
      fatorConversao: "",
      unidadeConversao: "",
      busca: "",
    },
  ]);
  const [produtosOptions, setProdutosOptions] = useState([]);

  // Estados de Controle
  // Estados de Controle
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trazerTudo, setTrazerTudo] = useState(false); // Toggle para buscar todos os produtos

  const username =
    sessionStorage.getItem("username") ||
    localStorage.getItem("username") ||
    "sistema";
  const dataTrabalho = getDataTrabalho();

  // Refs para o debounce acessar valores atualizados sem recriar a função
  const trazerTudoRef = React.useRef(trazerTudo);
  const origemRef = React.useRef(origem);

  useEffect(() => { trazerTudoRef.current = trazerTudo; }, [trazerTudo]);
  useEffect(() => { origemRef.current = origem; }, [origem]);

  // --- Buscas Iniciais ---
  useEffect(() => {
    const buscarOrigemUsuario = async () => {
      // Tenta cache local primeiro
      const storedLocal =
        sessionStorage.getItem("local") || localStorage.getItem("origem");
      if (storedLocal) {
        setOrigem(storedLocal);
      }

      if (!username || username === "sistema") return;

      try {
        const res = await axios.get(
          `${API_BASE_URL}/usuarios/origem/${username}`
        );
        if (res.data?.origem) {
          setOrigem(res.data.origem);
          sessionStorage.setItem("local", res.data.origem);
        }
      } catch (err) {
        console.warn("Aviso ao buscar origem (user):", err);
        if (!storedLocal) {
          setSnackbar({
            open: true,
            message: "Erro ao carregar origem de '" + username + "'.",
            severity: "warning",
          });
        }
      }
    };
    buscarOrigemUsuario();
  }, [username]);

  // Função para mapear produtos
  const mapearProdutos = (data) => {
    return data.map((p) => {
      const descricaoOriginal = p.descricao || p.produto || "";
      const codigo = p.codigo_produto || p.cod || p.cod_produto || "";
      return {
        ...p,
        // Mostra estoque apenas consultivo na descrição exibida
        descricao: descricaoOriginal || `Código: ${codigo}`,
        descricaoOriginal: descricaoOriginal, // Mantém descrição original para salvar
        codigo_produto: codigo,
        cod: codigo, // Garante que tenha 'cod' também
        cod_produto: codigo, // Garante que tenha 'cod_produto' também
        unidade: p.primeira_unidade || p.unidade || "",
        unidadeConversao: p.primeira_unidade || "",
      };
    });
  };

  // Função para buscar todos os produtos (AVARIA: inclui zerados e negativos)
  const buscarTodosProdutos = async () => {
    try {
      const isTodos = trazerTudoRef.current;
      const localBusca = origemRef.current;

      // O backend retorna vazio se search estiver vazio
      // Fazemos buscas com caracteres comuns e combinamos os resultados
      const caracteres = ["1", "A", "B", "C", "0", "2"];
      const promessas = caracteres.map(caractere =>
        axios.get(`${API_BASE_URL}/produtos-busca-rapida`, {
          params: {
            search: caractere,
            filial: "01",
            local: isTodos ? null : localBusca,
            apenasComSaldo: !isTodos,
            limit: 1000,
          },
        }).catch(() => ({ data: [] }))
      );

      const resultados = await Promise.all(promessas);

      // Combina todos os resultados e remove duplicatas por código
      const produtosUnicos = new Map();
      resultados.forEach(res => {
        const mapped = mapearProdutos(res.data || []);
        mapped.forEach(prod => {
          const cod = prod.codigo_produto || prod.cod || prod.cod_produto;
          if (cod && !produtosUnicos.has(cod)) {
            produtosUnicos.set(cod, prod);
          }
        });
      });

      setProdutosOptions(Array.from(produtosUnicos.values()));
    } catch (error) {
      console.error("Erro ao buscar todos os produtos:", error);
      setProdutosOptions([]);
    }
  };
  // Gatilho para atualizar a lista quando mudar o filtro ou a origem
  useEffect(() => {
    buscarTodosProdutos();
  }, [trazerTudo, origem]);

  // --- Lógica de Produtos (Debounce) ---
  const debouncedBuscaProduto = useMemo(
    () =>
      debounce(async (search) => {
        if (!search || search.trim() === "") {
          await buscarTodosProdutos();
          return;
        }
        try {
          const isTodos = trazerTudoRef.current;
          const localBusca = origemRef.current;

          const res = await axios.get(`${API_BASE_URL}/produtos-busca-rapida`, {
            params: {
              search,
              filial: "01",
              local: isTodos ? null : localBusca,
              apenasComSaldo: !isTodos,
              limit: 1000,
            },
          });

          const mapped = mapearProdutos(res.data);
          setProdutosOptions(mapped);
        } catch (error) {
          console.error("Erro ao buscar produtos:", error);
          setProdutosOptions([]); // Limpa opções em caso de erro
        }
      }, 400),
    []
  );

  const handleProdutoChange = (index, field, value) => {
    const updated = [...produtos];
    const produto = updated[index];
    const fator = Number(produto.fatorConversao);

    if (field === "quantidade") {
      produto.quantidade = value;
      // Calcula conversão com base na quantidade
      if (fator && fator > 0 && value !== "") {
        const result = Number(value) / fator;
        // Evita muitos decimais se for exato
        produto.conversao = Number.isInteger(result) ? result.toString() : result.toFixed(2);
      } else if (value === "") {
        produto.conversao = "";
      }
    } else if (field === "conversao") {
      produto.conversao = value;
      // Calcula quantidade com base na conversão
      if (fator && fator > 0 && value !== "") {
        const result = Number(value) * fator;
        produto.quantidade = Number.isInteger(result) ? result.toString() : result.toFixed(2);
      } else if (value === "") {
        produto.quantidade = "";
      }
    } else {
      produto[field] = value;
    }
    
    setProdutos(updated);
  };

  const adicionarProduto = () => {
    setProdutos([
      ...produtos,
      { codProduto: "", descricao: "", quantidade: "", conversao: "", unidade: "", unidadeConversao: "", busca: "" },
    ]);
  };

  const removerProduto = (index) => {
    if (produtos.length === 1) {
      // Limpa o único item em vez de remover
      const limpo = [
        {
          codProduto: "",
          descricao: "",
          quantidade: "",
          conversao: "",
          unidade: "",
          unidadeConversao: "",
          busca: "",
        },
      ];
      setProdutos(limpo);
      return;
    }
    const updated = produtos.filter((_, i) => i !== index);
    setProdutos(updated);
  };

  // --- Salvar e Imprimir ---
  const imprimirAvaria = async (payload) => {
    try {
      // Tenta Local
      await axios.get("http://localhost:3005/ping", { timeout: 1500 });
      await axios.post(
        "http://localhost:3005/imprimir-avaria-termica",
        payload,
        { timeout: 8000 }
      );
      setSnackbar({
        open: true,
        message: "✅ Impressão enviada (Local).",
        severity: "success",
      });
    } catch (e1) {
      console.warn("Local indisponível, tentando servidor...", e1?.message);
      try {
        await axios.post(`${API_BASE_URL}/imprimir-avaria-termica`, payload);
        setSnackbar({
          open: true,
          message: "✅ Impressão enviada (Servidor).",
          severity: "success",
        });
      } catch (e2) {
        console.error("Falha na impressão:", e2);
        setSnackbar({
          open: true,
          message: "⚠️ Avaria salva, mas erro na impressão.",
          severity: "warning",
        });
      }
    }
  };

  const handleSalvar = async () => {
    if (!destino || !responsavel) {
      setSnackbar({
        open: true,
        message: "Preencha Destino e Responsável.",
        severity: "warning",
      });
      return;
    }
    const temProdutoInvalido = produtos.some(
      (p) => !p.codProduto || !p.quantidade
    );
    if (temProdutoInvalido) {
      setSnackbar({
        open: true,
        message: "Preencha corretamente todos os itens.",
        severity: "warning",
      });
      return;
    }

    setIsSubmitting(true);

    const payload = {
      numero: numeroAvaria,
      origem,
      destino,
      responsavel: responsavel.toUpperCase(),
      produtos: produtos.map((p) => ({
        cod_produto: p.codProduto,
        descricao: p.descricao,
        quantidade: Number(p.quantidade),
        unidade: p.unidade || "",
        segunda_unidade: p.segundaUnidade || "",
        fator_conversao: p.fatorConversao || "",
      })),
      data_inclusao: dataTrabalho,
      usuario: username,
    };

    const now = new Date();
    // Para impressão, monta payload apenas com campos necessários e unidade correta
    const impressaoPayload = {
      numero: payload.numero,
      origem: payload.origem,
      destino: payload.destino,
      responsavel: payload.responsavel,
      usuario: payload.usuario,
      data: now.toLocaleDateString(),
      hora: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      produtos: payload.produtos.map((p) => {
        // Para impressão inicial, se tiver fator de conversão, já converte
        let qtdFinal = Number(p.quantidade) || 0;
        let unidadeFinal = p.unidade || "";
        const fator = Number(p.fator_conversao);

        if (fator && fator > 0) {
          qtdFinal = qtdFinal / fator;
          unidadeFinal = p.segunda_unidade || "UN";
        }

        return {
          cod_produto: p.cod_produto,
          descricao: p.descricao,
          quantidade: qtdFinal,
          unidade: unidadeFinal,
        };
      }),
    };

    try {
      await axios.post(`${API_BASE_URL}/avarias`, payload);
      await imprimirAvaria(impressaoPayload);

      setSnackbar({
        open: true,
        message: "✅ Avaria salva com sucesso!",
        severity: "success",
      });
      setTimeout(() => navigate("/estoque/avarias"), 1500);
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: "Erro ao salvar avaria.",
        severity: "error",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] pb-20 transition-colors duration-300">
      {/* Header Glassmorphic */}
      <header className="sticky top-0 z-50 px-6 py-4">
        <div className="max-w-5xl mx-auto bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/estoque/avarias")}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              <span className="material-symbols-rounded">arrow_back</span>
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                Nova Avaria
              </h1>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Lançamento
              </span>
            </div>
          </div>

          {/* Date Info */}
          <div className="hidden md:flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-600">
            <span className="material-symbols-rounded text-green-600 dark:text-green-400 text-lg">
              calendar_month
            </span>
            <div className="flex flex-col leading-none">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Data de Trabalho
              </span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {dataTrabalho
                  ? dayjs(dataTrabalho).add(12, "h").format("DD/MM/YYYY")
                  : dayjs().format("DD/MM/YYYY")}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8 relative z-10 space-y-6">
        {/* Card: Dados do Documento */}
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 overflow-hidden">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-3">
            <div className="p-2 bg-blue-100/50 rounded-lg text-blue-600">
              <span className="material-symbols-rounded">description</span>
            </div>
            <h2 className="font-bold text-lg text-slate-700 dark:text-slate-200">
              Dados do Documento
            </h2>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Número (Auto) */}
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                Número
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={numeroAvaria || "Automático"}
                  disabled
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-500 font-mono font-bold"
                />
                {!numeroAvaria && destino && (
                  <div className="absolute right-3 top-3.5">
                    <span className="block h-4 w-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin"></span>
                  </div>
                )}
              </div>
            </div>

            {/* Origem (Auto) */}
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                Origem
              </label>
              <input
                type="text"
                value={
                  locaisOptions.find((l) => l.value === origem)?.label ||
                  origem ||
                  "Carregando..."
                }
                disabled
                className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-600 font-bold"
              />
            </div>

            {/* Destino Selector */}
            <div className="md:col-span-6">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">
                Destino *
              </label>
              <Autocomplete
                options={locaisOptions}
                getOptionLabel={(opt) => opt.label}
                value={
                  locaisOptions.find((opt) => opt.value === destino) || null
                }
                onChange={async (_, newValue) => {
                  const dest = newValue?.value || "";
                  setDestino(dest);

                  if (dest && origem) {
                    try {
                      setSnackbar({
                        open: true,
                        message: "Gerando número...",
                        severity: "info",
                      });
                      setNumeroAvaria("");
                      const res = await axios.get(
                        `${API_BASE_URL}/avarias/proximo-numero`,
                        { params: { origem, destino: dest } }
                      );
                      setNumeroAvaria(res.data.numero);
                      setSnackbar({
                        open: false,
                        message: "",
                        severity: "info",
                      }); // Fecha snack
                    } catch (error) {
                      console.error("Erro ao gerar número:", error);
                      let msg = "Erro ao gerar número.";
                      if (error.response?.data?.erro)
                        msg = error.response.data.erro;
                      setSnackbar({
                        open: true,
                        message: msg,
                        severity: "error",
                      });
                    }
                  } else {
                    setNumeroAvaria("");
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Selecione o destino"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "0.75rem",
                        backgroundColor: "white",
                        "& fieldset": { borderColor: "#E2E8F0" },
                        "&:hover fieldset": { borderColor: "#CBD5E1" },
                        "&.Mui-focused fieldset": {
                          borderColor: "#3B82F6",
                          borderWidth: "2px",
                        },
                      },
                    }}
                  />
                )}
              />
            </div>

            {/* Responsavel */}
            <div className="md:col-span-12">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">
                Responsável *
              </label>
              <input
                type="text"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value.toUpperCase())}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all uppercase placeholder:normal-case"
                placeholder="Dígite o nome do responsável..."
              />
            </div>
          </div>
        </div>

        {/* Card: Itens */}
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 overflow-hidden">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100/50 rounded-lg text-amber-600">
                <span className="material-symbols-rounded">inventory_2</span>
              </div>
              <h2 className="font-bold text-lg text-slate-700 dark:text-slate-200">
                Itens da Avaria
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={trazerTudo}
                    onChange={(e) => setTrazerTudo(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    {trazerTudo ? "Todos os Produtos" : "Somente com Saldo"}
                  </span>
                }
              />

              <button
                onClick={adicionarProduto}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-sm flex items-center gap-2 transition-colors"
              >
                <span className="material-symbols-rounded text-lg">add</span>{" "}
                Adicionar Item
              </button>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-4">
            {produtos.map((produto, index) => (
              <div
                key={index}
                className="grid grid-cols-12 gap-4 items-end bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:shadow-md transition-shadow"
              >
                {/* Código Readonly */}
                <div className="col-span-3 md:col-span-2 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
                    Cód
                  </label>
                  <input
                    type="text"
                    value={produto.codProduto}
                    disabled
                    className="w-full h-10 bg-slate-200/50 border border-transparent rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-600 text-center"
                  />
                </div>

                {/* Autocomplete Descrição */}
                <div className="col-span-9 md:col-span-5 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
                    Produto
                  </label>
                  <Autocomplete
                    freeSolo
                    options={produtosOptions}
                    getOptionLabel={(opt) => {
                      if (typeof opt === "string") return opt;
                      return opt.descricao || opt.descricaoOriginal || opt.produto || opt.codigo_produto || "";
                    }}
                    filterOptions={(x) => x}
                    inputValue={produto.busca || ""}
                    // Busca ao Digitar
                    onInputChange={(_, newVal, reason) => {
                      if (reason === "input") {
                        const upper = (newVal || "").toUpperCase();
                        handleProdutoChange(index, "busca", upper); // Atualiza texto
                        debouncedBuscaProduto(upper); // Busca API
                      }
                    }}
                    // Carrega todos os produtos ao abrir o campo
                    onOpen={() => {
                      if (produtosOptions.length === 0) {
                        buscarTodosProdutos();
                      }
                    }}
                    // Seleção
                    onChange={(_, newVal) => {
                      if (!newVal) {
                        // Limpar
                        handleProdutoChange(index, "codProduto", "");
                        handleProdutoChange(index, "descricao", "");
                        handleProdutoChange(index, "unidade", "");
                        handleProdutoChange(index, "segundaUnidade", "");
                        handleProdutoChange(index, "fatorConversao", "");
                        handleProdutoChange(index, "unidadeConversao", "");
                        handleProdutoChange(index, "conversao", "");
                      } else {
                        // Preencher
                        handleProdutoChange(
                          index,
                          "codProduto",
                          newVal.cod || newVal.cod_produto || ""
                        );
                        handleProdutoChange(
                          index,
                          "descricao",
                          (newVal.descricaoOriginal || newVal.descricao || newVal.produto || "").toUpperCase()
                        );
                        // AVARIA: Unidade de entrada (o que o usuário digita) é B1_SEGUM
                        handleProdutoChange(
                          index,
                          "unidade",
                          (newVal.segunda_unidade || newVal.unidade || "KG").toUpperCase()
                        );
                        // AVARIA: Unidade de destino da estimativa/conversão é B1_UM
                        handleProdutoChange(
                          index,
                          "segundaUnidade",
                          (newVal.primeira_unidade || newVal.unidade || "").toUpperCase()
                        );
                        handleProdutoChange(
                          index,
                          "fatorConversao",
                          newVal.fator_conversao || ""
                        );
                        handleProdutoChange(
                          index,
                          "unidadeConversao",
                          (newVal.primeira_unidade || newVal.unidade || "").toUpperCase()
                        );
                        handleProdutoChange(
                          index,
                          "busca",
                          (newVal.descricaoOriginal || newVal.descricao || newVal.produto || "").toUpperCase()
                        );
                      }
                    }}
                    // Validação ao sair
                    onClose={(_, reason) => {
                      if (reason === "blur" && !produto.codProduto) {
                        handleProdutoChange(index, "busca", ""); // Limpa se invaĺido
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Busque por nome..."
                        error={!produto.codProduto && !!produto.busca}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "0.5rem",
                            backgroundColor: "white",
                            height: "40px",
                            padding: "0 8px !important",
                            "& input": {
                              padding: "0 !important",
                              height: "100%",
                              fontSize: "0.875rem",
                              fontWeight: 600,
                            },
                            "& fieldset": { borderColor: "#E2E8F0" },
                          },
                        }}
                      />
                    )}
                  />
                </div>

                {/* Quantidade */}
                <div className="col-span-4 md:col-span-2 relative flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 flex items-center gap-1">
                    Qtd {produto.unidade && (
                      <span className="text-slate-700 dark:text-slate-200 font-extrabold">({produto.unidade})</span>
                    )}
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={produto.quantidade}
                    onChange={(e) =>
                      handleProdutoChange(index, "quantidade", e.target.value)
                    }
                    className="w-full h-10 bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Conversão */}
                <div className="col-span-4 md:col-span-2 relative flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
                    {produto.unidadeConversao ? (
                      <span className="text-slate-700 dark:text-slate-200 font-extrabold">{produto.unidadeConversao}</span>
                    ) : "Conversão"}
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={produto.conversao}
                    onChange={(e) =>
                      handleProdutoChange(index, "conversao", e.target.value)
                    }
                    className="w-full h-10 bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-center"
                  />
                </div>

                <div className="col-span-4 md:col-span-1 flex justify-center items-center h-10">
                  <button
                    onClick={() => removerProduto(index)}
                    className="h-10 w-10 flex items-center justify-center rounded-xl text-red-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Remover Item"
                  >
                    <span className="material-symbols-rounded">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-4 pt-4 pb-12">
          <button
            onClick={() => navigate("/estoque/avarias")}
            className="px-6 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-200/50 hover:text-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={isSubmitting}
            className={`
                      px-8 py-4 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400
                      text-white font-bold rounded-xl shadow-lg shadow-green-600/30
                      transform transition-all active:scale-95 flex items-center gap-2
                      ${isSubmitting ? "opacity-70 cursor-not-allowed" : ""}
                  `}
          >
            {isSubmitting ? (
              <span className="h-5 w-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
            ) : (
              <span className="material-symbols-rounded">check_circle</span>
            )}
            {isSubmitting ? "Salvando..." : "Salvar Avaria"}
          </button>
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
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%", borderRadius: 2, fontWeight: "bold" }}
        >
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
    </div>
  );
};

export default NovaAvaria;
