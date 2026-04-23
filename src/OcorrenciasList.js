import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import dayjs from "dayjs";
import Swal from "sweetalert2";
import {
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Chip,
  Autocomplete,
  Button, // Added Button
} from "@mui/material";
import { getDataTrabalho } from "./utils/dataTrabalho";
import { API_BASE_URL } from "./utils/apiConfig";

// Components Reutilizáveis (Header/Modal)
// Idealmente isso estaria em um arquivo separado, mas vou manter aqui para garantir independência por hora

const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-sm", zIndex = "z-[100]" }) => {
  if (!isOpen) return null;
  return (
    <div className={`fixed inset-0 ${zIndex} flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200`}>
      <div
        className={`bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 custom-scrollbar`}
      >
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const OcorrenciasList = () => {
  const navigate = useNavigate();

  // --- HEADER STATE ---
  const [username, setUsername] = useState("");
  const [local, setLocal] = useState("08");
  const [date] = useState(() => {
    const saved = getDataTrabalho();
    return saved ? new Date(saved + "T12:00:00") : new Date();
  });
  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [tempLocal, setTempLocal] = useState("");
  const [tempDate, setTempDate] = useState("");

  // --- LIST DATA STATE ---
  const [ocorrencias, setOcorrencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("TODOS"); // Novo Estado de Filtro
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [overdueCount, setOverdueCount] = useState(0); // Contador total de atrasados

  // --- PAGINATION STATE ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // --- VIEW STATE ---
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingOcorrencia, setViewingOcorrencia] = useState(null);
  const [hasRestricaoEtana, setHasRestricaoEtana] = useState(false);

  // --- LOGS STATE ---
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // --- EDIT STATE ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOcorrencia, setEditingOcorrencia] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [produtosSearchList, setProdutosSearchList] = useState([]); // Busca de produtos no modal de edição
  const [conferentes, setConferentes] = useState([]); // Lista de conferentes
  const [vendedores, setVendedores] = useState([]); // Lista de vendedores

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

  // --- INITIALIZATION ---
  useEffect(() => {
    const fetchPermissions = async () => {
      const storedUser = sessionStorage.getItem("username");
      if (storedUser) {
        setUsername(storedUser);
        try {
          // Fetch user id
          const userResp = await axios.get(`${API_BASE_URL}/usuarios`);
          const user = userResp.data.find(u => u.username === storedUser);
          if (user) {
            const permissoesResp = await axios.get(`${API_BASE_URL}/permissoes/usuario/${user.id}`);
            const perms = permissoesResp.data;
            if (perms['RESTRICAO_ETANA']) {
              setHasRestricaoEtana(true);
              setSearchTerm("FORT FRUIT ETANA"); // Opcional: já preencher filtro visual, mas o backend que manda
            }
          }
        } catch (e) {
          console.error("Erro ao buscar permissoes", e);
        }
      }
    };

    const storedLocal =
      sessionStorage.getItem("origem") ||
      sessionStorage.getItem("local") ||
      "08";
    setLocal(storedLocal);

    fetchPermissions();
    fetchOcorrencias();
    fetchOverdueCount();
  }, []);

  // Função para buscar o total de ocorrências atrasadas
  const fetchOverdueCount = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/ocorrencias/count-overdue`
      );
      setOverdueCount(response.data.count || 0);
    } catch (error) {
      console.error("Erro ao buscar contagem de atrasados:", error);
      // Em caso de erro, usa 0 como fallback
      setOverdueCount(0);
    }
  };

  // Atualiza busca quando muda página, pesquisa ou filtro
  useEffect(() => {
    setCurrentPage(1); // Reset para primeira página quando pesquisa/filtro muda
  }, [searchTerm, filterStatus, showOverdueOnly]);

  useEffect(() => {
    fetchOcorrencias(currentPage);
    // Atualiza o contador de atrasados quando muda página, pesquisa ou filtro
    // (mas só se não estiver filtrando por status específico, para não fazer chamadas desnecessárias)
    if (
      filterStatus === "TODOS" ||
      filterStatus === "" ||
      filterStatus === "PENDENTE" ||
      filterStatus === "PENDENTE_APP"
    ) {
      fetchOverdueCount();
    }
  }, [currentPage, searchTerm, filterStatus, showOverdueOnly]);

  const fetchOcorrencias = async (page = 1) => {
    try {
      setLoading(true);
      // Passando parâmetros de paginação, pesquisa e status para o backend
      const response = await axios.get(`${API_BASE_URL}/ocorrencias`, {
        params: {
          page,
          limit: 20,
          search: searchTerm.trim(),
          status: filterStatus !== "TODOS" ? filterStatus : "",
          showOverdueOnly: showOverdueOnly ? "true" : "false", // Novo parâmetro para filtrar apenas atrasados
        },
      });

      let data = response.data;
      // O backend retorna { ocorrencias: [...], totalPages: N }
      if (data.ocorrencias && Array.isArray(data.ocorrencias)) {
        setOcorrencias(data.ocorrencias);
        setTotalPages(data.totalPages || 1);
      } else if (Array.isArray(data)) {
        // Fallback se o backend retornar array direto
        setOcorrencias(data);
        setTotalPages(1);
      } else {
        setOcorrencias([]);
      }
    } catch (error) {
      console.error("Erro ao buscar ocorrências:", error);
      const saved = localStorage.getItem("ocorrencias");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setOcorrencias(Array.isArray(parsed) ? parsed : []);
        } catch (e) {
          setOcorrencias([]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // --- HEADER HANDLERS ---
  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login");
  };
  const toggleDarkMode = () =>
    document.documentElement.classList.toggle("dark");
  // BLOQUEADO: Troca de local só permitida na página Home (Painel de Controle)
  const openLocalModal = () => {
    alert("Para alterar o local, volte ao Painel de Controle (Home).");
  };
  const saveLocal = () => {
    /* Bloqueado */
  };
  const openDateModal = () => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    setTempDate(localDate.toISOString().split("T")[0]);
    setIsDateModalOpen(true);
  };
  const saveDate = () => {
    if (!tempDate) return;
    const [y, m, d] = tempDate.split("-");
    const newDate = new Date(y, m - 1, d, 12, 0, 0);
    setDate(newDate);
    setIsDateModalOpen(false);
  };

  // --- LIST HANDLERS ---
  const handleDelete = async (ocr) => {
    if (ocr.status === "RESOLVIDO") {
      Swal.fire({
        icon: "warning",
        title: "Exclusão Não Permitida",
        text: "Não é permitido excluir ocorrências com status RESOLVIDO.",
        confirmButtonColor: "#16a34a",
      });
      return;
    }

    const result = await Swal.fire({
      icon: "warning",
      title: "Confirmar Exclusão",
      html: `
        <div class="text-left">
          <p class="mb-2"><strong>Romaneio:</strong> #${ocr.numero || ocr.id}</p>
          <p class="mb-2"><strong>Cliente:</strong> ${ocr.cliente || "-"}</p>
          <p class="mb-2"><strong>Valor:</strong> ${ocr.valor ? `R$ ${parseFloat(ocr.valor).toFixed(2).replace(".", ",")}` : "-"}</p>
          <p class="mb-4"><strong>Status:</strong> <span class="text-red-600 font-bold">${ocr.status || "PENDENTE"}</span></p>
          <p class="text-sm text-red-600 font-bold">⚠️ Esta ação não pode ser desfeita!</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Sim, Excluir",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      reverseButtons: true,
      focusCancel: true,
    });

    if (!result.isConfirmed) return;

    try {
      Swal.fire({
        title: "Excluindo...",
        text: "Aguarde enquanto processamos a exclusão.",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      await axios.delete(`${API_BASE_URL}/ocorrencias/${ocr.id}`);

      // Remove da lista local
      setOcorrencias((prev) => prev.filter((o) => o.id !== ocr.id));

      // Recarrega a lista para garantir sincronização
      await fetchOcorrencias(currentPage);

      Swal.fire({
        icon: "success",
        title: "Ocorrência Excluída!",
        text: `O Romaneio #${ocr.numero || ocr.id} foi excluído com sucesso.`,
        confirmButtonColor: "#16a34a",
        timer: 2000,
        timerProgressBar: true,
      });
    } catch (error) {
      console.error("Erro ao excluir:", error);
      Swal.fire({
        icon: "error",
        title: "Erro ao Excluir",
        text: error.response?.data?.message || "Erro ao excluir ocorrência. Tente novamente.",
        confirmButtonColor: "#dc2626",
      });
    }
  };

  const handleReopen = async (ocr) => {
    const role = sessionStorage.getItem("role");
    if (role !== "gestor") {
      Swal.fire({
        icon: "warning",
        title: "Permissão Negada",
        text: "Apenas Gestores podem reabrir ocorrências.",
        confirmButtonColor: "#16a34a",
      });
      return;
    }

    const result = await Swal.fire({
      icon: "question",
      title: "Reabrir Ocorrência?",
      html: `
        <div class="text-left">
          <p class="mb-2"><strong>Romaneio:</strong> #${ocr.numero || ocr.id}</p>
          <p class="mb-2"><strong>Cliente:</strong> ${ocr.cliente || "-"}</p>
          <p class="mb-4"><strong>Status Atual:</strong> <span class="text-red-600 font-bold">${ocr.status || "PENDENTE"}</span></p>
          <p class="text-sm text-slate-600">O status será alterado para <strong class="text-green-600">PENDENTE</strong>.</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Sim, Reabrir",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#6b7280",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      Swal.fire({
        title: "Reabrindo...",
        text: "Aguarde enquanto processamos a solicitação.",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      await axios.put(`${API_BASE_URL}/ocorrencias/${ocr.id}`, {
        ...ocr,
        status: "PENDENTE",
      });

      await fetchOcorrencias(currentPage); // Recarrega a lista

      Swal.fire({
        icon: "success",
        title: "Ocorrência Reaberta!",
        text: `A ocorrência #${ocr.numero || ocr.id} foi reaberta com sucesso.`,
        confirmButtonColor: "#16a34a",
        timer: 2000,
        timerProgressBar: true,
      });
    } catch (error) {
      console.error("Erro ao reabrir:", error);
      Swal.fire({
        icon: "error",
        title: "Erro ao Reabrir",
        text: error.response?.data?.message || "Erro ao reabrir ocorrência. Tente novamente.",
        confirmButtonColor: "#dc2626",
      });
    }
  };

  const handleEditClick = async (ocr) => {
    // Bloqueia edição se estiver CONCLUIDA ou RESOLVIDO
    if (ocr.status === "CONCLUIDO" || ocr.status === "CONCLUIDA" || ocr.status === "RESOLVIDO") {
      return; // Botão já está oculto, mas mantém a validação como segurança
    }

    // Se a ocorrência foi criada pelo App, redireciona para a página de edição especial
    if (ocr.adicionado_pelo_app === "S") {
      navigate(`/editar-pendencia/${ocr.id}`);
      return;
    }

    setEditingOcorrencia(ocr);
    // Inicializa com dados básicos enquanto carrega
    setEditFormData({
      ...ocr,
      produtos: [],
    });
    setIsEditModalOpen(true);

    // Busca conferentes e vendedores quando abre o modal
    const fetchConferentes = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/ocorrencias/conferentes`);
        setConferentes(response.data);
      } catch (error) {
        console.error("Erro ao buscar conferentes:", error);
      }
    };

    const fetchVendedores = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/ocorrencias/vendedores`);
        setVendedores(response.data);
      } catch (error) {
        console.error("Erro ao buscar vendedores:", error);
      }
    };

    fetchConferentes();
    fetchVendedores();

    try {
      const response = await axios.get(`${API_BASE_URL}/ocorrencias/${ocr.id}`);
      const fullData = response.data;

      let produtos = [];

      // Verifica se já existem produtos salvos na ocorrência
      const produtosExistentes = fullData.produtos && fullData.produtos.length > 0 ? fullData.produtos : [];

      // Se já tem produtos salvos, usa eles (não busca do Protheus novamente)
      if (produtosExistentes.length > 0) {
        produtos = produtosExistentes;
      }
      // Se não tem produtos salvos E a ocorrência foi adicionada pelo app com bilhete, busca do Protheus
      else if (fullData.adicionado_pelo_app === "S" && fullData.bilhete) {
        try {
          Swal.fire({
            title: "Buscando itens do pedido...",
            text: "Aguarde enquanto carregamos os produtos do bilhete.",
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
          });

          const bilheteResponse = await axios.get(`${API_BASE_URL}/protheus/bilhete`, {
            params: {
              bilhete: fullData.bilhete,
              data: fullData.data,
              filial: fullData.filial || "01",
            },
          });

          const itens = bilheteResponse.data?.itens || [];

          // Converte os itens do Protheus para o formato esperado
          produtos = itens.map((item, index) => ({
            id: null, // Novo item, sem ID ainda
            produto_nome: item.Z5_DESPRO || "",
            nome: item.Z5_DESPRO || "",
            produto_unidade: item.Z5_UM || "",
            unidade: item.Z5_UM || "",
            quantidade: Number(item.Z5_QTDE) || 0,
            valor: Number(item.Z5_PRECO) || 0,
            total: (Number(item.Z5_QTDE) * Number(item.Z5_PRECO)).toFixed(2),
            motivo: "",
            tipo: "",
            departamento: "",
            obs: null,
          }));

          Swal.close();
        } catch (bilheteError) {
          console.error("Erro ao buscar itens do bilhete:", bilheteError);
          Swal.fire({
            icon: "warning",
            title: "Aviso",
            text: "Não foi possível buscar os itens do pedido. Você pode adicionar os produtos manualmente.",
            confirmButtonColor: "#16a34a",
          });

          // Se falhar, deixa produtos vazio para adicionar manualmente
          produtos = [];
        }
      } else {
        // Se não é do app ou não tem bilhete, produtos fica vazio
        produtos = [];
      }

      setEditFormData({
        ...fullData,
        status: fullData.status || "PENDENTE",
        dataTratativa: fullData.dataTratativa
          ? fullData.dataTratativa.split("T")[0]
          : "",
        notaFiscal: fullData.nota_fiscal || fullData.notaFiscal || "",
        nota_fiscal: fullData.nota_fiscal || fullData.notaFiscal || "",
        serie: fullData.serie || "",
        notaOrigem: fullData.nota_origem || fullData.notaOrigem || "",
        nota_origem: fullData.nota_origem || fullData.notaOrigem || "",
        produtos: produtos,
      });
    } catch (error) {
      console.error("Erro ao carregar detalhes para edição", error);
      Swal.fire({
        icon: "error",
        title: "Erro",
        text: "Não foi possível carregar os detalhes da ocorrência.",
        confirmButtonColor: "#dc2626",
      });
    }
  };

  // --- EDIT PRODUCT HANDLERS ---
  const handleProdutoSearch = async (event, newInputValue) => {
    if (newInputValue && newInputValue.length > 2) {
      try {
        const response = await axios.get(`${API_BASE_URL}/produto`, {
          params: { search: newInputValue },
        });
        setProdutosSearchList(response.data);
      } catch (error) { }
    } else {
      setProdutosSearchList([]);
    }
  };

  const handleEditProductChange = (index, field, value) => {
    const updatedProdutos = [...(editFormData.produtos || [])];

    // Se for autocomplete
    if (field === "nome_autocomplete") {
      updatedProdutos[index].produto_nome = value?.descricao || value;
      updatedProdutos[index].nome = value?.descricao || value;
    } else {
      updatedProdutos[index][field] = value;
    }

    // Auto-preencher departamento pelo motivo
    if (field === "motivo") {
      updatedProdutos[index].departamento = MOTIVOS_OCORRENCIA[value] || "";
    }

    // Calc total
    if (field === "quantidade" || field === "valor") {
      const qtd = parseFloat(updatedProdutos[index].quantidade) || 0;
      const val = parseFloat(updatedProdutos[index].valor) || 0;
      updatedProdutos[index].total = (qtd * val).toFixed(2);
    }

    // Recalcula o total geral da ocorrência
    const totalGeral = updatedProdutos.reduce((acc, p) => {
      const qtd = parseFloat(p.quantidade) || 0;
      const val = parseFloat(p.valor) || 0;
      return acc + (qtd * val);
    }, 0);

    setEditFormData({
      ...editFormData,
      produtos: updatedProdutos,
      valor: totalGeral.toFixed(2),
      valorTotal: totalGeral.toFixed(2)
    });
  };

  const handleAddProduct = () => {
    const novosProdutos = [
      ...(editFormData.produtos || []),
      {
        produto_nome: "",
        quantidade: "",
        produto_unidade: "UN",
        valor: "",
        total: "",
        motivo: "",
        tipo: "",
        observacao: "",
      },
    ];
    setEditFormData({ ...editFormData, produtos: novosProdutos });
  };

  const handleRemoveProduct = (index) => {
    const novosProdutos = (editFormData.produtos || []).filter(
      (_, i) => i !== index
    );
    setEditFormData({ ...editFormData, produtos: novosProdutos });
  };

  const handleViewClick = async (ocr) => {
    try {
      // Abre o modal imediatamente com os dados que já temos (para percepção de velocidade)
      setViewingOcorrencia(ocr);
      setIsViewModalOpen(true);

      // Busca os detalhes completos (incluindo produtos)
      const response = await axios.get(`${API_BASE_URL}/ocorrencias/${ocr.id}`);
      setViewingOcorrencia(response.data);
    } catch (error) {
      console.error("Erro ao buscar detalhes da ocorrência:", error);
      // Se falhar, mantém os dados que já tinha (melhor que nada)
    }
  };

  const handleSaveEdit = async () => {
    if (!editingOcorrencia) return;

    // Validação de campos obrigatórios (todos menos: Ajudante, Conferente, Vendedor, Motorista, Descrição, Nota Fiscal, Nota de Origem)
    const camposObrigatorios = [
      { campo: "numero", nome: "Romaneio" },
      { campo: "data", nome: "Data" },
      { campo: "cliente", nome: "Cliente" },
      { campo: "status", nome: "Status" },
      { campo: "dataTratativa", nome: "Data Tratativa" },
      { campo: "serie", nome: "Série" },
    ];

    // Se for do app, Bilhete também é obrigatório
    if (editFormData.adicionado_pelo_app === "S") {
      camposObrigatorios.push({ campo: "bilhete", nome: "Bilhete" });
    }

    // Verifica campos obrigatórios
    for (const { campo, nome, alt } of camposObrigatorios) {
      let valor = editFormData[campo];
      if (!valor && alt) {
        for (const altCampo of alt) {
          if (editFormData[altCampo]) {
            valor = editFormData[altCampo];
            break;
          }
        }
      }
      if (!valor || String(valor).trim() === "") {
        Swal.fire({
          icon: "warning",
          title: "Campo Obrigatório",
          text: `O campo '${nome}' é obrigatório. Por favor, preencha antes de salvar.`,
          confirmButtonColor: "#16a34a",
        });
        return;
      }
    }

    try {
      Swal.fire({
        title: "Salvando...",
        text: "Aguarde enquanto processamos as alterações.",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      // Recalcula o valor total baseado nos produtos
      const totalCalculado = (editFormData.produtos || []).reduce((acc, p) => {
        const qtd = parseFloat(p.quantidade) || 0;
        const val = parseFloat(p.valor) || 0;
        return acc + (qtd * val);
      }, 0);

      // Se for do app, usa remetente padrão "FORT FRUIT BELEM"
      const remetenteFinal = editFormData.adicionado_pelo_app === "S"
        ? "FORT FRUIT BELEM"
        : (editFormData.remetente || "");

      const dadosParaSalvar = {
        ...editFormData,
        numero: String(editFormData.numero || "").trim(),
        remetente: remetenteFinal,
        valor: totalCalculado.toFixed(2),
        valorTotal: totalCalculado.toFixed(2),
        notaFiscal: editFormData.notaFiscal || editFormData.nota_fiscal || "",
        nota_fiscal: editFormData.notaFiscal || editFormData.nota_fiscal || "", // Garante compatibilidade
        serie: editFormData.serie || "",
        notaOrigem: editFormData.notaOrigem || editFormData.nota_origem || "",
        nota_origem: editFormData.notaOrigem || editFormData.nota_origem || "",
      };

      const response = await axios.put(
        `${API_BASE_URL}/ocorrencias/${editingOcorrencia.id}`,
        dadosParaSalvar
      );

      // Fecha o modal primeiro
      setIsEditModalOpen(false);
      setEditingOcorrencia(null);

      // Recarrega a lista completa para garantir sincronização
      await fetchOcorrencias(currentPage);

      Swal.fire({
        icon: "success",
        title: "Ocorrência Atualizada!",
        text: `A ocorrência #${editingOcorrencia.numero || editingOcorrencia.id} foi atualizada com sucesso.`,
        confirmButtonColor: "#16a34a",
        timer: 2000,
        timerProgressBar: true,
      });
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      Swal.fire({
        icon: "error",
        title: "Erro ao Salvar",
        text: error.response?.data?.message || "Erro ao salvar alterações. Verifique os dados e tente novamente.",
        confirmButtonColor: "#dc2626",
      });
    }
  };

  const handleOpenLogs = async (id) => {
    setLogs([]);
    setIsLogsModalOpen(true);
    setLogsLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/ocorrencias/${id}/logs`);
      setLogs(res.data);
    } catch (e) {
      console.error("Erro ao buscar logs", e);
    } finally {
      setLogsLoading(false);
    }
  };

  const isOverdue = (dateString, status) => {
    // Verifica se o status é PENDENTE (case insensitive)
    const statusNormalized = String(status || "")
      .toUpperCase()
      .trim();
    if (!dateString || statusNormalized !== "PENDENTE") return false;

    // Normaliza a data para meia-noite (evita problemas de timezone)
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false; // Data inválida

    // Define ambas as datas para meia-noite para cálculo preciso
    const dateMidnight = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    const now = new Date();
    const nowMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    // Calcula a diferença em dias
    const diffTime = nowMidnight - dateMidnight;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 7;
  };

  const safeOcorrencias = Array.isArray(ocorrencias) ? ocorrencias : [];

  // A pesquisa, filtro de status e filtro de atrasados já são feitos no backend
  // Não precisa mais filtrar localmente, o backend já retorna apenas os atrasados quando showOverdueOnly=true
  const filteredOcorrencias = safeOcorrencias;

  // O overdueCount agora vem do backend (estado), não precisa calcular localmente
  // Mas mantemos o cálculo local para exibir os ícones na tabela (já está sendo usado no map)

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300 pb-20">
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0"
        rel="stylesheet"
      />

      {/* Modals Injetados */}
      <Modal
        isOpen={isLocalModalOpen}
        onClose={() => setIsLocalModalOpen(false)}
        title="Alterar Local"
      >
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Novo Local:
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={tempLocal}
            onChange={(e) => setTempLocal(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-green-500 outline-none transition-all dark:text-white uppercase font-bold"
            maxLength={2}
          />
        </div>
        <button
          onClick={saveLocal}
          className="mt-6 w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-600/20"
        >
          Salvar
        </button>
      </Modal>

      <Modal
        isOpen={isDateModalOpen}
        onClose={() => setIsDateModalOpen(false)}
        title="Alterar Data"
      >
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Data de Trabalho:
        </label>
        <input
          type="date"
          value={tempDate}
          onChange={(e) => setTempDate(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-green-500 outline-none transition-all dark:text-white dark:[color-scheme:dark]"
        />
        <button
          onClick={saveDate}
          className="mt-6 w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-600/20"
        >
          Confirmar
        </button>
      </Modal>

      {/* Modal de Logs */}
      <Modal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        title="Histórico de Ações"
        maxWidth="max-w-2xl"
        zIndex="z-[150]"
      >
        {logsLoading ? (
          <div className="p-8 text-center text-slate-500">
            <span className="animate-spin material-symbols-rounded text-3xl mb-2">progress_activity</span>
            <p>Carregando histórico...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.length === 0 ? (
              <p className="text-center text-slate-400 py-8">Nenhum registro encontrado.</p>
            ) : (
              <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-3 space-y-6 pl-6 py-2">
                {logs.map((log) => (
                  <div key={log.id} className="relative">
                    <div className="absolute -left-[31px] bg-white dark:bg-slate-800 p-1">
                      <div className={`w-3 h-3 rounded-full ${log.acao === 'CRIACAO' ? 'bg-green-500' :
                        log.acao === 'EDICAO' ? 'bg-blue-500' :
                          log.acao === 'REABERTURA' ? 'bg-yellow-500' :
                            'bg-slate-400'
                        }`}></div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-400 uppercase">
                        {new Date(log.data_hora).toLocaleString()}
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        {log.acao} - {log.usuario}
                      </span>
                      {log.detalhes && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          {log.detalhes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal de Edição (MODERNO E COMPLETO) */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Editar Romaneio #${editingOcorrencia?.numero || ""}`}
        maxWidth="max-w-4xl"
      >
        <div className="flex flex-col gap-6">
          {/* Status e Info Geral */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Romaneio <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editFormData.numero || ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, numero: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-green-500 outline-none dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Data <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={editFormData.data ? editFormData.data.split("T")[0] : ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, data: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-green-500 outline-none dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Cliente <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editFormData.cliente || ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, cliente: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-green-500 outline-none dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                value={editFormData.status}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, status: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-green-500 outline-none dark:text-white"
                required
              >
                <option value="PENDENTE">PENDENTE</option>
                <option value="RESOLVIDO">RESOLVIDO</option>
                <option value="INFORMATIVO">INFORMATIVO</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Data Tratativa <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={editFormData.dataTratativa || ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    dataTratativa: e.target.value,
                  })
                }
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-green-500 outline-none dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nota fiscal
              </label>
              <input
                type="text"
                value={
                  editFormData.nota_fiscal || editFormData.notaFiscal || ""
                }
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    nota_fiscal: e.target.value,
                    notaFiscal: e.target.value,
                  })
                } // Mantém compatibilidade
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-green-500 outline-none dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Série <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editFormData.serie || ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, serie: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-green-500 outline-none dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nota de Origem
              </label>
              <input
                type="text"
                value={editFormData.notaOrigem || editFormData.nota_origem || ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    notaOrigem: e.target.value,
                    nota_origem: e.target.value,
                  })
                }
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-green-500 outline-none dark:text-white"
              />
            </div>
          </div>

          {/* Campos adicionais para ocorrências do app */}
          {editFormData.adicionado_pelo_app === "S" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Bilhete <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editFormData.bilhete || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, bilhete: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-green-500 outline-none dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Motorista
                  </label>
                  <input
                    type="text"
                    value={editFormData.motorista || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, motorista: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-green-500 outline-none dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Conferente
                  </label>
                  <Autocomplete
                    options={conferentes}
                    getOptionLabel={(option) => option.nome || ""}
                    value={conferentes.find((c) => c.nome === editFormData.conferente) || null}
                    onChange={(e, v) =>
                      setEditFormData({ ...editFormData, conferente: v ? v.nome : "" })
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        fullWidth
                        className="dark:text-white"
                      />
                    )}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Ajudante
                  </label>
                  <input
                    type="text"
                    value={editFormData.ajudante || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, ajudante: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-green-500 outline-none dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Vendedor
                  </label>
                  <Autocomplete
                    options={vendedores}
                    getOptionLabel={(option) => option.nome || ""}
                    value={vendedores.find((v) => v.nome === editFormData.vendedor) || null}
                    onChange={(e, v) =>
                      setEditFormData({ ...editFormData, vendedor: v ? v.nome : "" })
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        fullWidth
                        className="dark:text-white"
                      />
                    )}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Descrição
                </label>
                <textarea
                  rows="2"
                  value={editFormData.descricao || ""}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, descricao: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-green-500 outline-none dark:text-white resize-none"
                />
              </div>
            </>
          )}

          {/* Descrição para ocorrências normais (não do app) */}
          {editFormData.adicionado_pelo_app !== "S" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Descrição
              </label>
              <textarea
                rows="2"
                value={editFormData.descricao || ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, descricao: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-green-500 outline-none dark:text-white resize-none"
              />
            </div>
          )}

          <div className="h-[1px] bg-slate-200 dark:bg-slate-700 w-full"></div>

          {/* Produtos Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="material-symbols-rounded text-green-500">
                  shopping_cart
                </span>{" "}
                Produtos
              </h4>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {(editFormData.produtos || []).map((prod, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 hover:border-green-200 transition-colors"
                >
                  <div className="flex justify-between items-center mb-3 border-b border-dashed border-slate-100 dark:border-slate-700 pb-2">
                    <h5 className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                      Produto {index + 1}:{" "}
                      {prod.produto_nome || prod.nome || "Novo Item"}
                    </h5>
                    <button
                      onClick={() => handleRemoveProduct(index)}
                      className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded font-bold transition-colors uppercase"
                    >
                      Remover Produto
                    </button>
                  </div>

                  <div className="grid grid-cols-12 gap-3">
                    {/* Linha 1 Produto */}
                    <div className="col-span-12">
                      <Autocomplete
                        options={produtosSearchList}
                        getOptionLabel={(option) => option.descricao || ""}
                        freeSolo
                        inputValue={prod.produto_nome || prod.nome || ""}
                        value={{
                          descricao: prod.produto_nome || prod.nome || "",
                        }}
                        onInputChange={(e, v, reason) => {
                          if (reason === "input") {
                            // Atualiza o valor do input enquanto digita
                            handleEditProductChange(
                              index,
                              "nome_autocomplete",
                              v
                            );
                            // Busca produtos
                            handleProdutoSearch(e, v);
                          }
                        }}
                        onChange={(e, v) =>
                          handleEditProductChange(index, "nome_autocomplete", v)
                        }
                        filterOptions={(x) => x}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Buscar Produto"
                            size="small"
                            fullWidth
                          />
                        )}
                      />
                    </div>

                    {/* Linha 2 Valores */}
                    <div className="col-span-4 sm:col-span-3">
                      <TextField
                        label="Quantidade"
                        type="number"
                        size="small"
                        fullWidth
                        value={prod.quantidade || ""}
                        onChange={(e) =>
                          handleEditProductChange(
                            index,
                            "quantidade",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-3">
                      <TextField
                        label="Unidade"
                        size="small"
                        fullWidth
                        value={prod.produto_unidade || prod.unidade || ""}
                        onChange={(e) =>
                          handleEditProductChange(
                            index,
                            "produto_unidade",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-3">
                      <TextField
                        label="Valor"
                        type="number"
                        size="small"
                        fullWidth
                        value={prod.valor || ""}
                        onChange={(e) =>
                          handleEditProductChange(
                            index,
                            "valor",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div className="col-span-12 sm:col-span-3">
                      <TextField
                        label="Total"
                        type="number"
                        size="small"
                        fullWidth
                        disabled
                        value={prod.total || ""}
                      />
                    </div>

                    {/* Linha 3 Detalhes */}
                    <div className="col-span-12 sm:col-span-6">
                      <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">
                        Tipo
                      </label>
                      <select
                        className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 text-sm outline-none"
                        value={prod.tipo || ""}
                        onChange={(e) =>
                          handleEditProductChange(index, "tipo", e.target.value)
                        }
                      >
                        <option value="">Selecione...</option>
                        <option value="DIVERGENCIA">DIVERGENCIA</option>
                        <option value="FALTA">FALTA</option>
                        <option value="AVARIA">AVARIA</option>
                        <option value="SOBRA">SOBRA</option>
                      </select>
                    </div>
                    <div className="col-span-12 sm:col-span-6">
                      <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">
                        Motivo
                      </label>
                      <select
                        className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 text-sm outline-none"
                        value={prod.motivo || ""}
                        onChange={(e) =>
                          handleEditProductChange(
                            index,
                            "motivo",
                            e.target.value
                          )
                        }
                      >
                        <option value="">Selecione...</option>
                        {Object.keys(MOTIVOS_OCORRENCIA).map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-12">
                      <TextField
                        label="Observação do Produto"
                        size="small"
                        fullWidth
                        value={prod.observacao || prod.obs || ""}
                        onChange={(e) =>
                          handleEditProductChange(
                            index,
                            "observacao",
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={handleAddProduct}
                className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-500 hover:border-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all font-bold flex items-center justify-center gap-2"
              >
                <span className="material-symbols-rounded">add_circle</span>
                ADICIONAR PRODUTO
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-slate-500 hover:text-slate-800 font-bold uppercase text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg shadow-blue-600/20 uppercase text-sm tracking-wide"
            >
              Salvar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Visualização (MODERNO) */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={
          <div className="flex items-center gap-3">
            <span>Detalhes do Romaneio #{viewingOcorrencia?.numero || ""}</span>
            {viewingOcorrencia && (
              <button
                onClick={() => handleOpenLogs(viewingOcorrencia.id)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-slate-500 dark:text-slate-300 transition-all flex items-center justify-center"
                title="Ver Histórico"
              >
                <span className="material-symbols-rounded text-lg">history</span>
              </button>
            )}
          </div>
        }
        maxWidth="max-w-5xl"
      >
        {viewingOcorrencia && (
          <div className="flex flex-col gap-8">
            {/* Header: Status & Info Importante */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 p-3 rounded-xl">
                  <span className="material-symbols-rounded text-2xl">
                    article
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Cliente
                  </h4>
                  <p className="text-lg font-bold text-slate-800 dark:text-white leading-tight">
                    {viewingOcorrencia.cliente}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase">
                    Data Abertura
                  </p>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">
                    {viewingOcorrencia.data
                      ? dayjs(viewingOcorrencia.data).add(12, 'hour').format('DD/MM/YYYY')
                      : "N/A"}
                  </p>
                </div>
                <span
                  className={`px-4 py-2 rounded-xl text-sm font-bold border ${viewingOcorrencia.status === "RESOLVIDO" ||
                    viewingOcorrencia.status === "CONCLUIDO"
                    ? "bg-green-100 text-green-700 border-green-200"
                    : viewingOcorrencia.status === "PENDENTE" && viewingOcorrencia.adicionado_pelo_app === "S"
                      ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                      : viewingOcorrencia.status === "PENDENTE"
                        ? "bg-red-100 text-red-700 border-red-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                >
                  {viewingOcorrencia.status === "PENDENTE" && viewingOcorrencia.adicionado_pelo_app === "S"
                    ? "PEND. APP"
                    : viewingOcorrencia.status || "PENDENTE"}
                </span>
              </div>
            </div>

            {/* Grid Detail Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Coluna 1: Info Básica */}
              <div className="space-y-4">
                <h5 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b pb-2 border-slate-100 dark:border-slate-700">
                  <span className="material-symbols-rounded text-green-500">
                    info
                  </span>{" "}
                  Informações
                </h5>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="block text-xs font-bold text-slate-400 uppercase">
                      Remetente
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {viewingOcorrencia.remetente || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-400 uppercase">
                      Data Tratativa
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {viewingOcorrencia.dataTratativa
                        ? dayjs(viewingOcorrencia.dataTratativa).add(12, 'hour').format('DD/MM/YYYY')
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Coluna 2: Documentos e Valores */}
              <div className="space-y-4">
                <h5 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b pb-2 border-slate-100 dark:border-slate-700">
                  <span className="material-symbols-rounded text-blue-500">
                    receipt_long
                  </span>{" "}
                  Documento
                </h5>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="block text-xs font-bold text-slate-400 uppercase">
                      NF Devolução
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {viewingOcorrencia.notaFiscal || viewingOcorrencia.nota_fiscal || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-400 uppercase">
                      Série
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {viewingOcorrencia.serie || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-400 uppercase">
                      Nota de Origem
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {viewingOcorrencia.notaOrigem || viewingOcorrencia.nota_origem || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-400 uppercase">
                      Bilhete
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {viewingOcorrencia.bilhete || "-"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-xs font-bold text-slate-400 uppercase">
                      Valor Total
                    </span>
                    <span className="font-bold text-green-600 text-lg">
                      {viewingOcorrencia.valor
                        ? `R$ ${parseFloat(viewingOcorrencia.valor).toFixed(2).replace(".", ",")}`
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Coluna 3: Envolvidos */}
              <div className="space-y-4">
                <h5 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b pb-2 border-slate-100 dark:border-slate-700">
                  <span className="material-symbols-rounded text-orange-500">
                    groups
                  </span>{" "}
                  Envolvidos
                </h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-dashed border-slate-100 dark:border-slate-700 pb-1">
                    <span className="text-slate-500">Motorista:</span>
                    <span className="font-medium text-right">
                      {viewingOcorrencia.motorista || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-slate-100 dark:border-slate-700 pb-1">
                    <span className="text-slate-500">Ajudante:</span>
                    <span className="font-medium text-right">
                      {viewingOcorrencia.ajudante || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-slate-100 dark:border-slate-700 pb-1">
                    <span className="text-slate-500">Conferente:</span>
                    <span className="font-medium text-right">
                      {viewingOcorrencia.conferente || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-slate-500">Vendedor:</span>
                    <span className="font-medium text-right">
                      {viewingOcorrencia.vendedor || "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Descrição em Destaque */}
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30">
              <h5 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <span className="material-symbols-rounded text-sm">
                  description
                </span>{" "}
                Descrição do Ocorrido
              </h5>
              <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                {viewingOcorrencia.descricao || "Sem descrição disponível."}
              </p>
            </div>

            {/* Tabela de Produtos */}
            <div>
              <h5 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                <span className="material-symbols-rounded text-purple-500">
                  inventory_2
                </span>{" "}
                Produtos da Ocorrência
              </h5>
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3">Produto</th>
                      <th className="px-4 py-3 text-center">Qtd</th>
                      <th className="px-4 py-3 text-center">Un</th>
                      <th className="px-4 py-3 text-center">Tipo</th>
                      <th className="px-4 py-3 text-right">Valor</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3">Motivo</th>
                      <th className="px-4 py-3">Obs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800/50">
                    {viewingOcorrencia.produtos &&
                      viewingOcorrencia.produtos.length > 0 ? (
                      viewingOcorrencia.produtos.map((prod, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                            {prod.produto_nome ||
                              prod.nome ||
                              prod.produto ||
                              `Item ${idx + 1}`}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {prod.quantidade}
                          </td>
                          <td className="px-4 py-3 text-center text-xs opacity-70">
                            {prod.produto_unidade || prod.unidade || "UN"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {prod.tipo ? (
                              <span className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-600 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                                {prod.tipo}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {prod.valor ? `R$ ${prod.valor}` : "-"}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {prod.total ? `R$ ${prod.total}` : "-"}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-xs font-semibold">
                              {prod.motivo || "Geral"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 italic">
                            {prod.observacao || prod.obs || "-"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="8"
                          className="px-4 py-8 text-center text-slate-400"
                        >
                          Nenhum produto listado nesta ocorrência.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-6 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-xl font-bold transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-green-400/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
      </div>

      {/* Header Glass */}
      <header className="sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-slate-700/50 px-6 py-3 flex items-center justify-between">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate("/")}
            >
              <div className="bg-gradient-to-tr from-green-600 to-emerald-400 h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-600/20">
                <span className="font-bold text-xl italic tracking-tighter">
                  SF
                </span>
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight text-slate-800 dark:text-white">
                  Ocorrências
                </h1>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  Lista Geral
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <Tooltip title="Alterar data na Home">
                <div className="hidden md:flex items-center gap-2 mr-2 bg-transparent px-3 py-2 rounded-xl group border border-transparent">
                  <div className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 p-1.5 rounded-lg">
                    <span className="material-symbols-rounded text-lg">
                      calendar_today
                    </span>
                  </div>
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Data
                    </span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {date.toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
              </Tooltip>
              <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 hidden md:block"></div>
              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-bold text-slate-800 dark:text-white">
                    {username || "Admin"}
                  </span>
                  <div className="text-[10px] font-bold text-white bg-slate-500/50 dark:bg-slate-700/50 px-2 py-0.5 rounded flex items-center gap-1 cursor-default select-none border border-white/10 opacity-80">
                    LOCAL: {local}
                  </div>
                </div>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 border-2 border-white dark:border-slate-600 flex items-center justify-center shadow-sm">
                  <span className="material-symbols-rounded text-slate-500 dark:text-slate-300">
                    person
                  </span>
                </div>
              </div>
              <button
                onClick={toggleDarkMode}
                className="ml-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-600 dark:text-slate-300 border border-transparent hover:border-slate-300 dark:hover:border-slate-500"
              >
                <span className="material-symbols-rounded block dark:hidden text-xl">
                  dark_mode
                </span>
                <span className="material-symbols-rounded hidden dark:block text-xl">
                  light_mode
                </span>
              </button>
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

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {/* Ações e Filtros */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 animate-in slide-in-from-bottom-5 duration-500">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button
              onClick={() => navigate("/faturamento")}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white shadow-sm hover:shadow-md transition-all"
            >
              <span className="material-symbols-rounded text-2xl">
                arrow_back
              </span>
            </button>
            <div className="relative w-full md:w-96">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <span className="material-symbols-rounded">search</span>
              </div>
              <input
                type="text"
                placeholder="Buscar cliente, romaneio ou remetente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-white focus:ring-2 focus:ring-green-500 outline-none shadow-sm transition-all"
              />
            </div>
            {/* Filtro de Status */}
            <div className="relative min-w-[150px]">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-4 pr-8 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-white focus:ring-2 focus:ring-green-500 outline-none shadow-sm appearance-none cursor-pointer font-medium"
              >
                <option value="TODOS">Todos</option>
                <option value="PENDENTE">Pendentes</option>
                <option value="PENDENTE_APP">Pendentes App</option>
                <option value="RESOLVIDO">Resolvidos</option>
                <option value="CONCLUIDO">Concluídos</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <span className="material-symbols-rounded">filter_list</span>
              </div>
            </div>
          </div>

          {!hasRestricaoEtana && (
            <button
              onClick={() => navigate("/cadastrar")}
              className="w-full md:w-auto px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-600/20 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-rounded">add</span>
              Nova Ocorrência
            </button>
          )}

          {!hasRestricaoEtana && (
            <button
              onClick={() => navigate("/cadastrar2")}
              className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-rounded">autorenew</span>
              Automática
            </button>
          )}
        </div>

        {/* Banner de Atrasos */}
        {overdueCount > 0 && (
          <div
            onClick={() => setShowOverdueOnly(!showOverdueOnly)}
            className={`mb-6 p-4 ${showOverdueOnly
              ? "bg-red-100 border-red-300 ring-2 ring-red-400/20"
              : "bg-red-50 hover:bg-red-100"
              } dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2 shadow-sm cursor-pointer transition-all group select-none`}
          >
            <div className="flex items-center gap-3">
              <div className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 p-2 rounded-lg">
                <span className="material-symbols-rounded">warning</span>
              </div>
              <div>
                <h4 className="font-bold text-red-700 dark:text-red-300">
                  Atenção: {overdueCount} ocorrência(s) com atraso crítico!
                </h4>
                <p className="text-sm text-red-600/80 dark:text-red-400/80">
                  {showOverdueOnly
                    ? "Mostrando apenas atrasados. Clique para ver todos."
                    : "Clique aqui para filtrar e corrigir as pendências."}
                </p>
              </div>
            </div>
            <div className="bg-white/50 dark:bg-slate-800/50 p-2 rounded-lg text-red-600 group-hover:bg-white transition-colors">
              <span className="material-symbols-rounded">
                {showOverdueOnly ? "close" : "visibility"}
              </span>
            </div>
          </div>
        )}

        {/* Tabela de Dados Glassmorphic */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-500">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-700/30 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Romaneio
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Data Pedido
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Data Inclusa
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Remetente
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                    Valor Total
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">
                    Status
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {loading ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-6 py-10 text-center text-slate-500 dark:text-slate-400"
                    >
                      <div className="flex justify-center items-center gap-2">
                        <span className="material-symbols-rounded animate-spin">
                          refresh
                        </span>
                        Carregando dados...
                      </div>
                    </td>
                  </tr>
                ) : filteredOcorrencias.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-6 py-10 text-center text-slate-500 dark:text-slate-400"
                    >
                      Nenhuma ocorrência encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredOcorrencias.map((ocr, index) => (
                    <tr
                      key={ocr.id || index}
                      className="hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors group"
                    >
                      <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">
                        #{ocr.numero || "---"}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          {isOverdue(ocr.data, ocr.status) && (
                            <Tooltip title="Atrasado (> 7 dias)">
                              <span className="material-symbols-rounded text-red-500 text-lg animate-pulse">
                                error
                              </span>
                            </Tooltip>
                          )}
                          <span
                            className={
                              isOverdue(ocr.data, ocr.status)
                                ? "font-bold text-red-600"
                                : ""
                            }
                          >
                            {ocr.data
                              ? (() => {
                                  const parts = ocr.data.split('T')[0].split('-');
                                  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : new Date(ocr.data).toLocaleDateString("pt-BR");
                                })()
                              : "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">
                        {ocr.created_at
                          ? new Date(ocr.created_at).toLocaleDateString("pt-BR")
                          : "-"}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">
                        {ocr.cliente}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {ocr.remetente}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-right font-medium">
                        {ocr.valor
                          ? Number(ocr.valor).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })
                          : "-"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${ocr.status === "RESOLVIDO" ||
                            ocr.status === "CONCLUIDO"
                            ? "bg-green-100 text-green-700 border-green-200"
                            : ocr.status === "PENDENTE" && ocr.adicionado_pelo_app === "S"
                              ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                              : ocr.status === "PENDENTE"
                                ? "bg-red-100 text-red-700 border-red-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                        >
                          {ocr.status === "PENDENTE" && ocr.adicionado_pelo_app === "S"
                            ? "PEND. APP"
                            : ocr.status || "PENDENTE"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          {(ocr.status === "RESOLVIDO" || ocr.status === "CONCLUIDO" || ocr.status === "CONCLUIDA") &&
                            !hasRestricaoEtana && sessionStorage.getItem("role") === "gestor" && (
                              <Tooltip title="Voltar para Pendente">
                                <button
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                                  onClick={() => handleReopen(ocr)}
                                >
                                  <span className="material-symbols-rounded">
                                    undo
                                  </span>
                                </button>
                              </Tooltip>
                            )}
                          <Tooltip title="Visualizar">
                            <button
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                              onClick={() => handleViewClick(ocr)}
                            >
                              <span className="material-symbols-rounded">
                                visibility
                              </span>
                            </button>
                          </Tooltip>
                          {(ocr.status !== "RESOLVIDO" && ocr.status !== "CONCLUIDO" && ocr.status !== "CONCLUIDA") && !hasRestricaoEtana && (
                            <Tooltip title="Editar">
                              <button
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                onClick={() => handleEditClick(ocr)}
                              >
                                <span className="material-symbols-rounded">
                                  edit
                                </span>
                              </button>
                            </Tooltip>
                          )}
                          {!hasRestricaoEtana && (
                            <Tooltip
                              title={
                                ocr.status === "RESOLVIDO"
                                  ? "Não é possível excluir (Resolvido)"
                                  : "Excluir"
                              }
                            >
                              <button
                                onClick={() => handleDelete(ocr)}
                                disabled={ocr.status === "RESOLVIDO"}
                                className={`p-1.5 rounded-lg transition-colors ${ocr.status === "RESOLVIDO"
                                  ? "text-slate-300 dark:text-slate-600 cursor-not-allowed"
                                  : "text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  }`}
                              >
                                <span className="material-symbols-rounded">
                                  delete
                                </span>
                              </button>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm text-slate-500">
            <span>
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
              >
                Anterior
              </button>

              {/* Paginação Simplificada no Mobile / Completa no Desktop se precisar */}
              <div className="hidden md:flex gap-1">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  // Logica simples para mostrar paginas proximas (opcional, aqui mostrando 1..5 fixo ou dinamico basico)
                  // Para simplificar, vou deixar so os botoes prev/next funcionais e o indicador de texto
                  return null;
                })}
              </div>

              <button
                className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages || loading}
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
export default OcorrenciasList;
