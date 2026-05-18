import React, { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Box,
  Typography,
  InputAdornment,
  Autocomplete,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import axios from "axios";
import { styled } from "@mui/system";
import { API_BASE_URL } from './utils/apiConfig';
import AppHeader from './components/AppHeader';

// --- CUSTOM STYLES & COMPONENTS ---

// Estilização customizada para o Container de Produtos
const ProdutoContainer = styled("div")(({ theme }) => ({
  backgroundColor: "rgba(248, 250, 252, 0.5)", // slate-50/50
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid rgba(226, 232, 240, 0.8)", // slate-200
  marginBottom: "16px",
  transition: "all 0.2s ease-in-out",
  "&:hover": {
    backgroundColor: "rgba(248, 250, 252, 1)",
    borderColor: "rgba(203, 213, 225, 1)", // slate-300
  },
}));

const unidadesPadrao = ["UN", "CX", "KG", "SC"];

const MOTIVOS_OCORRENCIA = {
  "ACORDO COMERCIAL": "COMERCIAL",
  "ERRO DO VENDEDOR": "COMERCIAL",
  "PEDIDO LANÇADO ERRADO": "COMERCIAL",
  "CRITERIO DO CLIENTE": "CRITERIO DO CLIENTE",
  "ERRO OPERACIONAL": "LOGISTICA",
  "IMPROPRIA P/ CONSUMO": "LOGISTICA",
  LOGISTICA: "LOGISTICA",
  "HORARIO DE ENTREGA": "FATURAMENTO",
  "ERRO DE FATURAMENTO": "FATURAMENTO",
  "ERRO DO MOTORISTA": "FROTA",
};

// MUI Custom Styles para combinar com Tailwind
const muiInputStyle = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    '& fieldset': { borderColor: '#E2E8F0' }, // slate-200
    '&:hover fieldset': { borderColor: '#CBD5E1' }, // slate-300
    '&.Mui-focused fieldset': { borderColor: '#16a34a' }, // green-600
  },
  '& .MuiInputLabel-root.Mui-focused': { color: '#16a34a' },
};

const OcorrenciaForm = ({ addOcorrencia }) => {
  const navigate = useNavigate();


  // --- FORM STATES ---
  const [form, setForm] = useState({
    numero: "",
    remetente: "",
    data: new Date().toISOString().split("T")[0],
    cliente: "",
    notaFiscal: "",
    descricao: "",
    valorTotal: "0.00",
    status: "PENDENTE",
    acao: "",
    dataTratativa: "",
    bilhete: "",
    motorista: "",
    conferente: "",
    ajudante: "",
    vendedor: "",
    produtos: [
      {
        nome: "",
        quantidade: "",
        unidade: "",
        valor: "",
        total: "",
        motivo: "",
        tipo: "",
        obs: "", // Initialized obs
        departamento: "",
        unidadesOptions: [],
      },
    ],
  });

  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [conferentes, setConferentes] = useState([]);
  const [vendedores, setVendedores] = useState([]);

  // Ref para debounce da busca de produto
  const produtoDebounceRef = React.useRef({});



  // --- LOGICA DO FORMULARIO (MANTIDA) ---
  const fetchMotoristas = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/ocorrencias/motoristas`);
      if (Array.isArray(response.data)) {
        setMotoristas(response.data);
      } else {
        console.warn("Motoristas response is not an array:", response.data);
        setMotoristas([]);
      }
    } catch (error) { console.error("Erro ao buscar motoristas:", error); }
  };

  const fetchConferentes = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/ocorrencias/conferentes`);
      if (Array.isArray(response.data)) {
        setConferentes(response.data);
      } else {
        console.warn("Conferentes response is not an array:", response.data);
        setConferentes([]);
      }
    } catch (error) { console.error("Erro ao buscar conferentes:", error); }
  };

  const fetchVendedores = async (search = "") => {
    try {
      const response = await axios.get(`${API_BASE_URL}/ocorrencias/vendedores`, { params: { search } });
      if (Array.isArray(response.data)) {
        setVendedores(response.data);
      } else {
        console.warn("Vendedores response is not an array:", response.data);
        setVendedores([]);
      }
    } catch (error) { console.error("Erro ao buscar vendedores:", error); }
  };

  useEffect(() => {
    fetchMotoristas();
    fetchConferentes();
    fetchVendedores("");
  }, []);

  useEffect(() => {
    const produtosArmazenados = JSON.parse(localStorage.getItem("produtos"));
    if (produtosArmazenados) {
      setForm((prevForm) => ({ ...prevForm, produtos: produtosArmazenados }));
    }
  }, []);

  useEffect(() => {
    const limparProdutos = () => {
      localStorage.removeItem("produtos");
      setForm((prevForm) => ({
        ...prevForm,
        produtos: [{ nome: "", quantidade: "", unidade: "", valor: "", total: "", motivo: "", tipo: "", obs: "", unidadesOptions: [] }],
      }));
    };
    window.addEventListener("beforeunload", limparProdutos);
    return () => {
      limparProdutos();
      window.removeEventListener("beforeunload", limparProdutos);
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "numero") {
      const regex = /^[0-9]{0,6}$/;
      if (regex.test(value)) setForm({ ...form, [name]: value });
    } else if (name === "notaFiscal") {
      const regex = /^[0-9]{0,12}$/;
      if (regex.test(value)) setForm({ ...form, [name]: value });
    } else if (name === "valor" || name === "quantidade") {
      const regex = /^[0-9]*$/;
      if (regex.test(value)) setForm({ ...form, [name]: value });
    } else if (["bilhete", "remetente", "acao", "motorista", "conferente", "ajudante"].includes(name)) {
      setForm({ ...form, [name]: value.toUpperCase() });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const calculateTotalValue = (produtos) => {
    return produtos.reduce((acc, produto) => acc + parseFloat(produto.total || 0), 0).toFixed(2);
  };

  // Verificações
  useEffect(() => {
    if (form.cliente && form.data) {
      const verificarClienteData = async () => {
        try {
          const response = await axios.get(`${API_BASE_URL}/verificar-cliente-data`, { params: { cliente: form.cliente, data: form.data } });
          if (response.data.exists) {
            const result = await Swal.fire({
              icon: "warning",
              title: "Aviso",
              text: `Já existe uma ocorrência para este cliente na data selecionada. Número: ${response.data.numero}. Continuar?`,
              showCancelButton: true,
              confirmButtonText: "Sim",
              cancelButtonText: "Não",
            });
            if (!result.isConfirmed) setForm((prevForm) => ({ ...prevForm, cliente: "", data: "" }));
          }
        } catch (error) { }
      };
      verificarClienteData();
    }
  }, [form.cliente, form.data]);

  useEffect(() => {
    if (form.bilhete) {
      const verificarBilhete = async () => {
        try {
          const response = await axios.get(`${API_BASE_URL}/verificar-bilhete`, { params: { bilhete: form.bilhete } });
          if (response.data.exists) {
            const result = await Swal.fire({
              icon: "warning",
              title: "Aviso",
              text: `Já existe uma ocorrência com este bilhete. Número: ${response.data.numero}. Continuar?`,
              showCancelButton: true,
              confirmButtonText: "Sim",
              cancelButtonText: "Não",
            });
            if (!result.isConfirmed) setForm((prevForm) => ({ ...prevForm, bilhete: "" }));
          }
        } catch (error) { }
      };
      verificarBilhete();
    }
  }, [form.bilhete]);

  // Handlers de Produto
  const handleProdutoChange = (event, index, name, value) => {
    const updatedProdutos = [...form.produtos];
    updatedProdutos[index][name] = value;
    if (name === "motivo") updatedProdutos[index].departamento = MOTIVOS_OCORRENCIA[value] || "";
    if (name === "quantidade" || name === "valor") {
      const quantidade = parseFloat(updatedProdutos[index].quantidade) || 0;
      const valor = parseFloat(updatedProdutos[index].valor) || 0;
      updatedProdutos[index].total = (quantidade * valor).toFixed(2);
    }
    setForm({ ...form, produtos: updatedProdutos, valorTotal: calculateTotalValue(updatedProdutos) });
    localStorage.setItem("produtos", JSON.stringify(updatedProdutos));
  };

  const handleAddProduto = () => {
    const ultimoProduto = form.produtos[form.produtos.length - 1];
    if (!ultimoProduto.nome || !ultimoProduto.unidade || !ultimoProduto.valor) {
      Swal.fire({ icon: "error", title: "Erro", text: "Preencha todos os campos do produto." });
      return;
    }
    const novosProdutos = [...form.produtos, { nome: "", quantidade: "", unidade: "", valor: "", total: "", motivo: "", tipo: "", obs: "", unidadesOptions: [] }];
    setForm({ ...form, produtos: novosProdutos, valorTotal: calculateTotalValue(novosProdutos) });
    localStorage.setItem("produtos", JSON.stringify(novosProdutos));
  };

  const handleRemoveProduto = (index) => {
    setForm((prevForm) => {
      const newProdutos = prevForm.produtos.filter((_, i) => i !== index);
      const produtosFinais = newProdutos.length > 0 ? newProdutos : [{ nome: "", quantidade: "", unidade: "", valor: "", total: "", motivo: "", tipo: "", obs: "", unidadesOptions: [] }];
      return { ...prevForm, produtos: produtosFinais, valorTotal: calculateTotalValue(produtosFinais) };
    });
  };

  const handleClienteInputChange = async (event, newInputValue) => {
    if (newInputValue) {
      try {
        const response = await axios.get(`${API_BASE_URL}/clientes`, { params: { search: newInputValue } });
        setClientes(response.data);
      } catch (error) { }
    } else {
      setClientes([]);
    }
  };

  const handleProdutoInputChange = (event, index, newInputValue, reason) => {
    // 'reset' é disparado pelo MUI após seleção — não sobrescreve o nome limpo
    if (reason === 'reset') return;

    // Atualiza o texto do input imediatamente (para a UI responder)
    const updatedProdutos = [...form.produtos];
    updatedProdutos[index].nome = newInputValue;
    setForm({ ...form, produtos: updatedProdutos });

    // Cancela o debounce anterior deste campo
    if (produtoDebounceRef.current[index]) {
      clearTimeout(produtoDebounceRef.current[index]);
    }

    if (!newInputValue || newInputValue.trim().length < 2) {
      setProdutos([]);
      return;
    }

    // Debounce: só busca após 300ms sem digitar
    produtoDebounceRef.current[index] = setTimeout(async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/produto`, { params: { search: newInputValue } });
        setProdutos(response.data);
      } catch (error) { console.error("Erro ao buscar produto:", error); }
    }, 300);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    salvarOcorrencia();
  };

  const salvarOcorrencia = async () => {
    Swal.fire({ title: "Salvando...", text: "Aguarde.", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    // Validação de OBS
    if (form.produtos.some(p => !p.obs)) {
      Swal.fire("Atenção", "A observação é obrigatória para todos os itens.", "warning");
      return;
    }

    try {
      const dadosOcorrencia = { ...form, produtos: form.produtos.map((p) => ({ ...p })) };
      await axios.post(`${API_BASE_URL}/ocorrencias`, dadosOcorrencia);

      let emailMessage = "";
      const remetentesParaEmail = ["FORT FRUIT ETANA", "FORT FRUIT PIEDADE", "FORT FRUIT PETROLINA"];
      if (remetentesParaEmail.includes(form.remetente)) {
        try {
          await axios.post(`${API_BASE_URL}/api/enviar-email-devolucao`, dadosOcorrencia);
          emailMessage = `\nE-mail enviado.`;
        } catch (emailError) { console.error(emailError); }
      }

      setForm({
        numero: "", remetente: "", data: new Date().toISOString().split("T")[0], cliente: "", descricao: "", notaFiscal: "", valorTotal: "0.00",
        status: "PENDENTE", acao: "", dataTratativa: "", bilhete: "", motorista: "", conferente: "", ajudante: "", vendedor: "",
        produtos: [{ nome: "", quantidade: "", unidade: "", valor: "", total: "", motivo: "", tipo: "", unidadesOptions: [] }],
      });

      Swal.fire({ icon: "success", title: "Sucesso!", text: `Ocorrência salva! ${emailMessage}` });
      navigate("/ocorrencias");
    } catch (error) {
      Swal.fire({ icon: "error", title: "Erro", text: "Erro ao salvar." });
    }
  };

  const handleCancel = () => {
    localStorage.removeItem("produtos");
    navigate("/ocorrencias");
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />

      {/* Background Layers */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-green-400/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
      </div>

      <AppHeader title="Nova Ocorrência" subtitle="Faturamento" icon="SF" iconGradient="from-green-600 to-emerald-400" iconShadow="shadow-green-600/20" onBack="/ocorrencias" />

      {/* Container Principal */}
      <main className="max-w-5xl mx-auto px-6 py-6 pb-20 relative z-10">

        {/* Título da Página com Botão de Voltar */}
        <div className="flex items-center justify-between mb-8 animate-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/ocorrencias')}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white shadow-sm hover:shadow-md transition-all"
            >
              <span className="material-symbols-rounded text-2xl">arrow_back</span>
            </button>
            <div>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Nova Ocorrência</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Preencha o formulário abaixo para registrar.</p>
            </div>
          </div>
        </div>

        {/* Card do Formulário */}
        <div className="bg-white/80 dark:bg-slate-800/90 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20 dark:border-slate-700/50 animate-in zoom-in-95 duration-500">
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Linha 1 */}
              <Grid item xs={12} sm={3}>
                <TextField name="numero" label="Nº Ocorrência" value={form.numero} onChange={handleChange} fullWidth inputProps={{ maxLength: 6 }} required sx={muiInputStyle} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField name="data" label="Data" type="date" value={form.data} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} required sx={muiInputStyle} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required sx={muiInputStyle}>
                  <InputLabel>Remetente</InputLabel>
                  <Select name="remetente" value={form.remetente} onChange={handleChange} label="Remetente">
                    <MenuItem value="FORT FRUIT BELEM">FORT FRUIT BELEM</MenuItem>
                    <MenuItem value="FORT FRUIT CASTANHAL">FORT FRUIT CASTANHAL</MenuItem>
                    <MenuItem value="FORT FRUIT ETANA">FORT FRUIT ETANA</MenuItem>
                    <MenuItem value="FORT FRUIT PIEDADE">FORT FRUIT PIEDADE</MenuItem>
                    <MenuItem value="FORT FRUIT PETROLINA">FORT FRUIT PETROLINA</MenuItem>
                    <MenuItem value="BEM PRA GENTE">BEM PRA GENTE</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Linha 2 */}
              <Grid item xs={12} sm={8}>
                <Autocomplete
                  options={clientes}
                  getOptionLabel={(option) => option.nome_fantasia || ""}
                  value={clientes.find((c) => c.nome_fantasia === form.cliente) || (form.cliente ? { nome_fantasia: form.cliente } : null)}
                  onChange={(e, v) => setForm({ ...form, cliente: v ? v.nome_fantasia : "" })}
                  onInputChange={handleClienteInputChange}
                  renderInput={(params) => <TextField {...params} label="Cliente" fullWidth required sx={muiInputStyle} />}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField name="notaFiscal" label="Nota Fiscal" value={form.notaFiscal} onChange={handleChange} fullWidth sx={muiInputStyle} />
              </Grid>

              {/* Linha 3 - Descrição */}
              <Grid item xs={12}>
                <TextField name="descricao" label="Descrição / Observação" value={form.descricao} onChange={handleChange} fullWidth multiline rows={2} sx={muiInputStyle} />
              </Grid>

              {/* Produtos Section */}
              <Grid item xs={12}>
                <div className="my-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-700 dark:text-white flex items-center gap-2">
                      <span className="material-symbols-rounded text-green-600">shopping_cart</span>
                      Produtos da Ocorrência
                    </h3>
                  </div>

                  {form.produtos.map((produto, index) => (
                    <ProdutoContainer key={index}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={4}>
                          <Autocomplete
                            options={produtos}
                            getOptionLabel={(option) =>
                              typeof option === 'string' ? option : (option.descricao || "")
                            }
                            inputValue={produto.nome}
                            value={null}
                            isOptionEqualToValue={() => false}
                            filterOptions={(x) => x}
                            onChange={(e, v) => {
                              if (v) {
                                // descricao já vem sem código (B1_DESC direto do Protheus)
                                const nome = v.descricao;

                                const units = [];
                                if (v.primeira_unidade) units.push(v.primeira_unidade.trim());
                                if (v.segunda_unidade && v.segunda_unidade.trim()) units.push(v.segunda_unidade.trim());
                                const uniqueUnits = [...new Set(units)].filter(u => u);

                                const newProdutos = form.produtos.map((p, i) => {
                                  if (i === index) {
                                    return {
                                      ...p,
                                      nome: nome,
                                      unidade: v.primeira_unidade || p.unidade || "",
                                      unidadesOptions: uniqueUnits.length > 0 ? uniqueUnits : [],
                                    };
                                  }
                                  return p;
                                });

                                setForm({ ...form, produtos: newProdutos });
                                localStorage.setItem("produtos", JSON.stringify(newProdutos));
                              }
                            }}
                            onInputChange={(e, v, reason) => handleProdutoInputChange(e, index, v, reason)}
                            renderInput={(params) => <TextField {...params} label={`Produto ${index + 1}`} required sx={muiInputStyle} />}
                          />
                        </Grid>
                        <Grid item xs={6} sm={2}>
                          <TextField label="Qtd" type="number" value={produto.quantidade} onChange={(e) => handleProdutoChange(e, index, "quantidade", e.target.value)} fullWidth required sx={muiInputStyle} />
                        </Grid>
                        <Grid item xs={6} sm={2}>
                          <FormControl fullWidth required sx={muiInputStyle}>
                            <InputLabel>Un</InputLabel>
                            <Select value={produto.unidade} onChange={(e) => handleProdutoChange(e, index, "unidade", e.target.value)} label="Un">
                              {(produto.unidadesOptions && produto.unidadesOptions.length > 0 ? produto.unidadesOptions : unidadesPadrao).map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={6} sm={2}>
                          <TextField label="Valor Unit." type="number" value={produto.valor} onChange={(e) => handleProdutoChange(e, index, "valor", e.target.value)} fullWidth required InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }} sx={muiInputStyle} />
                        </Grid>
                        <Grid item xs={6} sm={2}>
                          <TextField label="Total" type="number" value={produto.total} fullWidth disabled InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }} sx={muiInputStyle} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <FormControl fullWidth required sx={muiInputStyle}>
                            <InputLabel>Motivo</InputLabel>
                            <Select value={produto.motivo} onChange={(e) => handleProdutoChange(e, index, "motivo", e.target.value)} label="Motivo">
                              {Object.keys(MOTIVOS_OCORRENCIA).sort().map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <FormControl fullWidth required sx={muiInputStyle}>
                            <InputLabel>Tipo</InputLabel>
                            <Select value={produto.tipo} onChange={(e) => handleProdutoChange(e, index, "tipo", e.target.value)} label="Tipo">
                              <MenuItem value="DIVERGENCIA">DIVERGENCIA</MenuItem>
                              <MenuItem value="FALTA">FALTA</MenuItem>
                              <MenuItem value="AVARIA">AVARIA</MenuItem>
                              <MenuItem value="SOBRA">SOBRA</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        {form.produtos.length > 1 && (
                          <Grid item xs={12} sm={4} display="flex" justifyContent="flex-end">
                            <Button variant="outlined" color="error" onClick={() => handleRemoveProduto(index)} sx={{ borderRadius: '10px', textTransform: 'none' }}>Remover Item</Button>
                          </Grid>
                        )}
                        <Grid item xs={12} sm={12}>
                          <TextField label="Observação do Item" value={produto.obs || ""} onChange={(e) => handleProdutoChange(e, index, "obs", e.target.value)} fullWidth required sx={muiInputStyle} />
                        </Grid>
                      </Grid>
                    </ProdutoContainer>
                  ))}

                  <div className="flex justify-end mt-4">
                    <Button variant="contained" onClick={handleAddProduto} sx={{ borderRadius: '12px', background: '#16a34a', boxShadow: 'none', textTransform: 'none', fontWeight: 'bold' }}>
                      + Adicionar Item
                    </Button>
                  </div>
                </div>
              </Grid>

              <Grid item xs={12}><div className="h-[1px] bg-slate-200 dark:bg-slate-700 w-full my-2"></div></Grid>

              {/* Detalhes Finais */}
              <Grid item xs={12} sm={6}>
                <TextField label="Valor Total da Ocorrência" value={form.valorTotal} fullWidth disabled InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }} sx={muiInputStyle} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required sx={muiInputStyle}>
                  <InputLabel>Ação a Tomar</InputLabel>
                  <Select name="acao" value={form.acao} onChange={handleChange} label="Ação a Tomar">
                    <MenuItem value="ENVIAR REPOSIÇÃO">ENVIAR REPOSIÇÃO</MenuItem>
                    <MenuItem value="EXCLUIR NOTA">EXCLUIR NOTA</MenuItem>
                    <MenuItem value="FAZER COMPRA">FAZER COMPRA</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={3}>
                <TextField name="dataTratativa" label="Data Tratativa" value={form.dataTratativa} onChange={handleChange} fullWidth type="date" InputLabelProps={{ shrink: true }} sx={muiInputStyle} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField name="bilhete" label="Bilhete" value={form.bilhete} onChange={handleChange} fullWidth sx={muiInputStyle} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete options={motoristas} getOptionLabel={(o) => o.nome || ""} value={motoristas.find(m => m.nome === form.motorista) || (form.motorista ? { nome: form.motorista } : null)} onChange={(e, v) => setForm({ ...form, motorista: v ? v.nome : "" })} renderInput={(params) => <TextField {...params} label="Motorista" sx={muiInputStyle} />} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Autocomplete options={conferentes} getOptionLabel={(o) => o.nome || ""} value={conferentes.find(c => c.nome === form.conferente) || (form.conferente ? { nome: form.conferente } : null)} onChange={(e, v) => setForm({ ...form, conferente: v ? v.nome : "" })} renderInput={(params) => <TextField {...params} label="Conferente" sx={muiInputStyle} />} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField name="ajudante" label="Ajudante" value={form.ajudante} onChange={handleChange} fullWidth sx={muiInputStyle} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Autocomplete
                  options={vendedores}
                  getOptionLabel={(o) => o.nome || ""}
                  value={vendedores.find(v => v.nome === form.vendedor) || (form.vendedor ? { nome: form.vendedor } : null)}
                  onChange={(e, v) => setForm({ ...form, vendedor: v ? v.nome : "" })}
                  onInputChange={(e, v) => fetchVendedores(v)}
                  renderInput={(params) => <TextField {...params} label="Vendedor" sx={muiInputStyle} />}
                />
              </Grid>
            </Grid>

            {/* Botões de Ação Footer */}
            <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
              <button type="button" onClick={handleCancel} className="px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                Cancelar
              </button>
              <button type="submit" className="px-8 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 shadow-lg shadow-green-600/20 hover:scale-105 transition-all">
                Salvar Ocorrência
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default OcorrenciaForm;
