import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useTheme } from './contexts/ThemeContext';
import Swal from 'sweetalert2';
import { getDataTrabalho, setDataTrabalho } from "./utils/dataTrabalho";
import { API_BASE_URL } from "./utils/apiConfig";

// Modal Component Simples
const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-sm" }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full ${maxWidth} overflow-hidden animate-in zoom-in-95 duration-200`}>
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme, forceTheme } = useTheme();
  const [permissoes, setPermissoes] = useState({});
  const [username, setUsername] = useState("");
  const [canChangeLocal, setCanChangeLocal] = useState(false);
  const [userTipo, setUserTipo] = useState("");

  // Estados para gerenciamento de permissões
  const [usuariosPermissoes, setUsuariosPermissoes] = useState([]);
  const [filteredUsersPermissoes, setFilteredUsersPermissoes] = useState([]);
  const [selectedUserPermissoes, setSelectedUserPermissoes] = useState(null);
  const [searchUserPermissoes, setSearchUserPermissoes] = useState("");
  const [userToCopyFrom, setUserToCopyFrom] = useState("");
  const [tempLocalUsuario, setTempLocalUsuario] = useState("");

  // Estados para criar usuário
  const [isNovoUsuarioModalOpen, setIsNovoUsuarioModalOpen] = useState(false);
  const [novoUsuario, setNovoUsuario] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    origem: "01"
  });

  // Estados para alterar senha
  const [isAlterarSenhaModalOpen, setIsAlterarSenhaModalOpen] = useState(false);
  const [senhaData, setSenhaData] = useState({
    novaSenha: "",
    confirmarSenha: ""
  });

  // Permissões apenas para os módulos principais do Painel de Controle
  const rotinasSystem = [
    "FATURAMENTO",
    "CONFERENTE",
    "FINANCEIRO",
    "ESTOQUE",
    "ACESSOS",
    "CONFIGURAÇÃO",
    "RH",
    "FROTA",
    "FISCAL",
    "RESTRICAO_ETANA",
    "CAIXA",
  ];

  // States para Local e Data
  const [local, setLocal] = useState("08");
  const [date, setDate] = useState(() => {
    const stored = getDataTrabalho();
    return stored ? new Date(stored + "T12:00:00") : new Date();
  });

  // Modals stats
  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isPermissoesModalOpen, setIsPermissoesModalOpen] = useState(false);

  // Temp states para os inputs dos modals
  const [tempLocal, setTempLocal] = useState("08");
  const [tempDate, setTempDate] = useState("");
  const [passwordData, setPasswordData] = useState({
    senhaAtual: "",
    novaSenha: "",
    confirmarSenha: ""
  });

  useEffect(() => {
    const fetchUserData = async () => {
      const storedUser = sessionStorage.getItem("username");
      const storedLocal = sessionStorage.getItem("local");
      // Initially, use stored value or 08. We will update with server data shortly.
      setLocal(storedLocal || "08");
      if (!storedLocal) sessionStorage.setItem("local", "08");

      if (storedUser) {
        setUsername(storedUser);
        try {
          // Fetch users list to get current user details
          const userResp = await axios.get(
            `${API_BASE_URL}/usuarios`
          );
          const user = userResp.data.find((u) => u.username === storedUser);

          if (user) {
            // Update local from server 'origem'
            if (user.origem) {
              setLocal(user.origem);
              sessionStorage.setItem("local", user.origem);
            }

            // Check permission
            // loose comparison because database might return '1' string or 1 number
            setCanChangeLocal(user.podeTrocarLocal == 1);

            // Armazena o tipo do usuário
            setUserTipo(user.tipo || "");

            const permissoesResp = await axios.get(
              `${API_BASE_URL}/permissoes/usuario/${user.id}`
            );
            setPermissoes(permissoesResp.data);
          }
        } catch (err) {
          console.error("Erro ao buscar dados do usuário:", err);
        }
      }
    };
    fetchUserData();
  }, []);

  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.removeItem("token"); // Cleanup legacy if exists
    forceTheme('light'); // Reset theme immediately on logout
    navigate("/login");
  };

  const checkProtheusConnection = async () => {
    try {
      const resp = await fetch(
        `${API_BASE_URL}/check-protheus`
      );
      const data = await resp.json();
      return data.connected;
    } catch {
      return false;
    }
  };

  // Handlers para Local
  const openLocalModal = () => {
    if (!canChangeLocal) {
      Swal.fire({
        icon: 'warning',
        title: 'Acesso Negado',
        text: 'Você não tem permissão para alterar o local.',
        confirmButtonColor: '#eab308' // amber-500
      });
      return;
    }
    setTempLocal(local);
    setIsLocalModalOpen(true);
  };

  const saveLocal = async () => {
    try {
      await axios.put(`${API_BASE_URL}/usuarios/${username}/local`, {
        local: tempLocal
      });

      setLocal(tempLocal);
      sessionStorage.setItem("local", tempLocal);
      setIsLocalModalOpen(false);
      Swal.fire({
        icon: 'success',
        title: 'Sucesso',
        text: `Local alterado para ${tempLocal}!`,
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error("Erro ao salvar local:", error);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: error.response?.data?.error || 'Não foi possível alterar o local.'
      });
    }
  };

  // Handlers para Data
  const openDateModal = () => {
    // Formata para YYYY-MM-DD para o input
    // Ajuste simples para fuso horário local
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    setTempDate(localDate.toISOString().split('T')[0]);
    setIsDateModalOpen(true);
  };

  const saveDate = () => {
    if (!tempDate) return;

    // Salva globalmente no localStorage via helper
    setDataTrabalho(tempDate);

    const [y, m, d] = tempDate.split('-');
    // Cria data ao meio-dia para evitar problemas de fuso
    const newDate = new Date(y, m - 1, d, 12, 0, 0);
    setDate(newDate);
    setIsDateModalOpen(false);
  };

  // Handlers para Senha
  const openPasswordModal = () => {
    setPasswordData({
      senhaAtual: "",
      novaSenha: "",
      confirmarSenha: ""
    });
    setIsUserMenuOpen(false); // Fecha o menu ao abrir o modal
    setIsPasswordModalOpen(true);
  };

  // Handler para toggle do menu do usuário
  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  // Fecha o menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isUserMenuOpen && !event.target.closest('.user-menu-container')) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  const savePassword = async () => {
    // Validações
    if (!passwordData.senhaAtual || !passwordData.novaSenha || !passwordData.confirmarSenha) {
      Swal.fire({
        icon: 'warning',
        title: 'Atenção',
        text: 'Por favor, preencha todos os campos.',
        confirmButtonColor: '#10b981'
      });
      return;
    }

    if (passwordData.novaSenha.length < 4) {
      Swal.fire({
        icon: 'warning',
        title: 'Atenção',
        text: 'A nova senha deve ter pelo menos 4 caracteres.',
        confirmButtonColor: '#10b981'
      });
      return;
    }

    if (passwordData.novaSenha !== passwordData.confirmarSenha) {
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'As senhas não coincidem. Por favor, verifique.',
        confirmButtonColor: '#10b981'
      });
      return;
    }

    try {
      await axios.put(`${API_BASE_URL}/usuarios/${username}/alterar-senha`, {
        senhaAtual: passwordData.senhaAtual,
        novaSenha: passwordData.novaSenha
      });

      setIsPasswordModalOpen(false);
      setPasswordData({
        senhaAtual: "",
        novaSenha: "",
        confirmarSenha: ""
      });

      Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: 'Senha alterada com sucesso!',
        timer: 2000,
        showConfirmButton: false,
        confirmButtonColor: '#10b981'
      });
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      const errorMessage = error.response?.data?.error || 'Não foi possível alterar a senha.';
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: errorMessage,
        confirmButtonColor: '#10b981'
      });
    }
  };

  // Função para buscar usuários e permissões (para o modal)
  const fetchUsuariosPermissoes = useCallback(async () => {
    try {
      const [usuariosResp, permissoesResp] = await Promise.all([
        axios.get(`${API_BASE_URL}/usuarios`),
        axios.get(`${API_BASE_URL}/permissoes`),
      ]);

      const permissoesMap = {};
      permissoesResp.data.forEach(({ user_id, rotina, permitido }) => {
        if (!permissoesMap[user_id]) permissoesMap[user_id] = {};
        permissoesMap[user_id][rotina] = !!permitido;
      });

      const usuariosFormatados = usuariosResp.data.map((u) => ({
        ...u,
        permissoes: rotinasSystem.reduce((acc, rotina) => {
          acc[rotina] = permissoesMap[u.id]?.[rotina] || false;
          return acc;
        }, {}),
      }));

      setUsuariosPermissoes(usuariosFormatados);
      setFilteredUsersPermissoes(usuariosFormatados);
    } catch (err) {
      console.error("Erro ao buscar usuários:", err);
    }
  }, []);

  // Filtro de usuários
  useEffect(() => {
    if (!searchUserPermissoes) {
      setFilteredUsersPermissoes(usuariosPermissoes);
    } else {
      setFilteredUsersPermissoes(
        usuariosPermissoes.filter((u) =>
          u.username.toLowerCase().includes(searchUserPermissoes.toLowerCase())
        )
      );
    }
  }, [searchUserPermissoes, usuariosPermissoes]);

  // Handlers para permissões
  const handleSelectUserPermissoes = async (user) => {
    setSelectedUserPermissoes({ ...user });
    setUserToCopyFrom("");
    setTempLocalUsuario(user.origem || "01");

    try {
      const permissoesResp = await axios.get(
        `${API_BASE_URL}/permissoes/usuario/${user.id}`
      );
      const permissoesObj = {};
      rotinasSystem.forEach((rotina) => {
        permissoesObj[rotina] = permissoesResp.data[rotina] || false;
      });
      setSelectedUserPermissoes({
        ...user,
        permissoes: permissoesObj,
      });
    } catch (err) {
      console.error("Erro ao buscar permissões:", err);
    }
  };

  const handleTogglePermissao = (rotina) => {
    if (!selectedUserPermissoes) return;
    const updatedPerms = {
      ...selectedUserPermissoes.permissoes,
      [rotina]: !selectedUserPermissoes.permissoes[rotina],
    };
    setSelectedUserPermissoes({
      ...selectedUserPermissoes,
      permissoes: updatedPerms,
    });
  };

  const handleSavePermissoes = async () => {
    if (!selectedUserPermissoes) return;

    const data = Object.entries(selectedUserPermissoes.permissoes).map(
      ([rotina, permitido]) => ({
        user_id: selectedUserPermissoes.id,
        rotina,
        permitido,
      })
    );

    try {
      // Salva permissões
      await axios.post(`${API_BASE_URL}/permissoes/salvar`, {
        permissoes: data,
      });

      // Salva local do usuário se foi alterado (admin pode alterar local de qualquer usuário)
      if (tempLocalUsuario && tempLocalUsuario !== selectedUserPermissoes.origem) {
        try {
          await axios.put(`${API_BASE_URL}/usuarios/${selectedUserPermissoes.username}/local`, {
            local: tempLocalUsuario,
            adminEdit: true // Indica que é um admin editando outro usuário
          });
        } catch (localErr) {
          console.error("Erro ao atualizar local:", localErr);
          // Não bloqueia o salvamento das permissões se o local falhar
        }
      }

      // Atualiza a lista de usuários com o novo local
      const updatedUser = {
        ...selectedUserPermissoes,
        origem: tempLocalUsuario || selectedUserPermissoes.origem
      };
      const updatedList = usuariosPermissoes.map((u) =>
        u.id === selectedUserPermissoes.id ? updatedUser : u
      );
      setUsuariosPermissoes(updatedList);
      setSelectedUserPermissoes(updatedUser);

      Swal.fire({
        icon: "success",
        title: "Sucesso",
        text: "Permissões e local atualizados com sucesso!",
        timer: 2000,
        showConfirmButton: false,
        confirmButtonColor: "#10b981",
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Erro",
        text: "Erro ao salvar permissões.",
        confirmButtonColor: "#10b981",
      });
    }
  };

  const handleCriarUsuario = async () => {
    if (!novoUsuario.username || !novoUsuario.password || !novoUsuario.confirmPassword) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "Preencha todos os campos!",
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    if (novoUsuario.password !== novoUsuario.confirmPassword) {
      Swal.fire({
        icon: "error",
        title: "Erro",
        text: "As senhas não coincidem!",
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/usuarios/adicionar`, {
        username: novoUsuario.username,
        password: novoUsuario.password,
        origem: novoUsuario.origem,
        email: novoUsuario.email
      });

      Swal.fire({
        icon: "success",
        title: "Sucesso",
        text: `Usuário @${novoUsuario.username} criado com sucesso!`,
        timer: 2000,
        showConfirmButton: false,
      });

      setIsNovoUsuarioModalOpen(false);
      setNovoUsuario({ username: "", password: "", confirmPassword: "", email: "", origem: "01" });

      // Recarregar lista de usuários
      await fetchUsuariosPermissoes();
    } catch (err) {
      console.error("Erro ao criar usuário:", err);
      Swal.fire({
        icon: "error",
        title: "Erro",
        text: err.response?.data?.error || "Não foi possível criar o usuário.",
        timer: 3000,
        showConfirmButton: false,
      });
    }
  };

  const handleAlterarSenha = async () => {
    if (!selectedUserPermissoes) return;

    if (!senhaData.novaSenha || !senhaData.confirmarSenha) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "Preencha todos os campos!",
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    if (senhaData.novaSenha !== senhaData.confirmarSenha) {
      Swal.fire({
        icon: "error",
        title: "Erro",
        text: "As senhas não coincidem!",
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    try {
      await axios.put(`${API_BASE_URL}/usuarios/${selectedUserPermissoes.id}/senha`, {
        password: senhaData.novaSenha
      });

      Swal.fire({
        icon: "success",
        title: "Sucesso",
        text: "Senha alterada com sucesso!",
        timer: 2000,
        showConfirmButton: false,
      });

      setIsAlterarSenhaModalOpen(false);
      setSenhaData({ novaSenha: "", confirmarSenha: "" });
    } catch (err) {
      console.error("Erro ao alterar senha:", err);
      Swal.fire({
        icon: "error",
        title: "Erro",
        text: err.response?.data?.error || "Erro ao alterar a senha.",
        timer: 3000,
        showConfirmButton: false,
      });
    }
  };

  const handleCopyProfile = () => {
    if (!userToCopyFrom) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "Selecione um perfil para copiar.",
        confirmButtonColor: "#10b981",
      });
      return;
    }
    const sourceUser = usuariosPermissoes.find(
      (u) => u.id === parseInt(userToCopyFrom)
    );
    if (!sourceUser) return;

    setSelectedUserPermissoes((prev) => ({
      ...prev,
      permissoes: { ...sourceUser.permissoes },
    }));

    Swal.fire({
      icon: "info",
      title: "Perfil copiado!",
      text: "Salve para aplicar as permissões.",
      timer: 2000,
      showConfirmButton: false,
      confirmButtonColor: "#10b981",
    });
  };

  const openPermissoesModal = () => {
    setIsPermissoesModalOpen(true);
    fetchUsuariosPermissoes();
  };

  const menuItems = [
    {
      title: "Faturamento",
      subtitle: "Gestão completa de vendas e emissão",
      icon: "inventory_2",
      color: "emerald",
      path: "/faturamento",
      permission: "FATURAMENTO",
    },
    {
      title: "Conferente",
      subtitle: "Checklist operacional e tarefas",
      icon: "assignment_ind",
      color: "blue",
      path: "/conferente",
      permission: "CONFERENTE",
    },
    {
      title: "Financeiro",
      subtitle: "Controle de fluxo de caixa",
      icon: "payments",
      color: "teal",
      path: "/financeiro",
      permission: "FINANCEIRO",
      action: async (e) => {
        e.preventDefault();
        const connected = await checkProtheusConnection();
        if (connected) navigate("/financeiro");
        else alert("VPN não está ativa ou falha na conexão PROTHEUS");
      },
    },
    {
      title: "Caixa",
      subtitle: "Faturamento e recebimento Protheus",
      icon: "shopping_cart_checkout",
      color: "emerald",
      path: "/caixa",
      permission: "CAIXA",
    },
    {
      title: "Estoque",
      subtitle: "Entradas, saídas e balanço",
      icon: "deployed_code",
      color: "amber",
      path: "/estoque",
      permission: "ESTOQUE",
    },
    {
      title: "Frota",
      subtitle: "Gestão de veículos e logística",
      icon: "local_shipping",
      color: "red",
      path: "/frota",
      permission: "FROTA",
    },
    {
      title: "Fiscal",
      subtitle: "Portal contábil e auditoria",
      icon: "account_balance",
      color: "indigo",
      path: "/fiscal",
      permission: "FISCAL",
    },
    /*
    {
      title: "Acessos",
      subtitle: "Gerenciar permissões de usuários",
      icon: "admin_panel_settings",
      color: "indigo",
      path: null,
      permission: "ACESSOS",
      action: (e) => {
        e.preventDefault();
        openPermissoesModal();
      },
    },
    {
      title: "Usuários Online",
      subtitle: "Monitor de usuários conectados",
      icon: "people",
      color: "green",
      path: "/usuarios-online",
      permission: "GESTOR_ONLINE",
    },
    */
    {
      title: "RH",
      subtitle: "Recrutamento inteligente com IA",
      icon: "work",
      color: "purple",
      path: "/rh/recruitai",
      permission: "RH",
    },
  ];

  // Helper para classes dinâmicas de cor
  const getColorClasses = (color, disabled) => {
    if (disabled) return "bg-gray-100 text-gray-400 dark:bg-gray-800/50 dark:text-gray-600";

    const colors = {
      emerald: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white dark:bg-emerald-900/20 dark:text-emerald-400 dark:group-hover:bg-emerald-600 dark:group-hover:text-white",
      blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-500 group-hover:text-white dark:bg-blue-900/20 dark:text-blue-400 dark:group-hover:bg-blue-600 dark:group-hover:text-white",
      teal: "bg-teal-50 text-teal-600 group-hover:bg-teal-500 group-hover:text-white dark:bg-teal-900/20 dark:text-teal-400 dark:group-hover:bg-teal-600 dark:group-hover:text-white",
      amber: "bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white dark:bg-amber-900/20 dark:text-amber-400 dark:group-hover:bg-amber-600 dark:group-hover:text-white",
      gray: "bg-gray-50 text-gray-600 group-hover:bg-gray-500 group-hover:text-white",
      slate: "bg-slate-50 text-slate-600 group-hover:bg-slate-500 group-hover:text-white dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-600 dark:group-hover:text-white",
      indigo: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white dark:bg-indigo-900/20 dark:text-indigo-400 dark:group-hover:bg-indigo-600 dark:group-hover:text-white",
      orange: "bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white dark:bg-orange-900/20 dark:text-orange-400 dark:group-hover:bg-orange-600 dark:group-hover:text-white",
      green: "bg-green-50 text-green-600 group-hover:bg-green-500 group-hover:text-white dark:bg-green-900/20 dark:text-green-400 dark:group-hover:bg-green-600 dark:group-hover:text-white",
      purple: "bg-purple-50 text-purple-600 group-hover:bg-purple-500 group-hover:text-white dark:bg-purple-900/20 dark:text-purple-400 dark:group-hover:bg-purple-600 dark:group-hover:text-white",
    };
    return colors[color] || colors.slate;
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />

      {/* Modals */}
      <Modal isOpen={isLocalModalOpen} onClose={() => setIsLocalModalOpen(false)} title="Alterar Local">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Selecione o novo Local:</label>
        <div className="flex gap-2">
          <select
            value={tempLocal}
            onChange={(e) => setTempLocal(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-green-500 outline-none transition-all dark:text-white font-bold"
          >
            {[...Array(9)].map((_, i) => {
              const val = String(i + 1).padStart(2, '0');
              return (
                <option key={val} value={val}>{val}</option>
              );
            })}
          </select>
        </div>
        <p className="text-xs text-slate-400 mt-2">Dica: 01 = Matriz, 08 = CD...</p>
        <button onClick={saveLocal} className="mt-6 w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-600/20 active:scale-95">
          Confirmar Alteração
        </button>
      </Modal>

      <Modal isOpen={isDateModalOpen} onClose={() => setIsDateModalOpen(false)} title="Alterar Data">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Selecione a Data de Trabalho:</label>
        <input
          type="date"
          value={tempDate}
          onChange={(e) => setTempDate(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-green-500 outline-none transition-all dark:text-white dark:[color-scheme:dark]"
        />
        <button onClick={saveDate} className="mt-6 w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-600/20 active:scale-95">
          Confirmar Data
        </button>
      </Modal>

      <Modal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} title="Alterar Senha">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Senha Atual:</label>
            <input
              type="password"
              value={passwordData.senhaAtual}
              onChange={(e) => setPasswordData({ ...passwordData, senhaAtual: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-green-500 outline-none transition-all dark:text-white"
              placeholder="Digite sua senha atual"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nova Senha:</label>
            <input
              type="password"
              value={passwordData.novaSenha}
              onChange={(e) => setPasswordData({ ...passwordData, novaSenha: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-green-500 outline-none transition-all dark:text-white"
              placeholder="Digite a nova senha (mín. 4 caracteres)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Confirmar Nova Senha:</label>
            <input
              type="password"
              value={passwordData.confirmarSenha}
              onChange={(e) => setPasswordData({ ...passwordData, confirmarSenha: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-green-500 outline-none transition-all dark:text-white"
              placeholder="Confirme a nova senha"
            />
          </div>
          <button onClick={savePassword} className="mt-6 w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-600/20 active:scale-95">
            Alterar Senha
          </button>
        </div>
      </Modal>

      {/* Modal de Gerenciamento de Acessos */}
      <Modal isOpen={isPermissoesModalOpen} onClose={() => setIsPermissoesModalOpen(false)} title="Gerenciar Acessos" maxWidth="max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: User List */}
          <div className="lg:col-span-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-rounded text-blue-500 text-lg">group</span> Usuários
                </h3>
                <button
                  onClick={() => setIsNovoUsuarioModalOpen(true)}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 shadow-sm"
                  title="Criar novo usuário"
                >
                  <span className="material-symbols-rounded text-sm">person_add</span>
                  Novo
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-rounded text-sm">search</span>
                <input
                  type="text"
                  placeholder="Buscar usuário..."
                  value={searchUserPermissoes}
                  onChange={(e) => setSearchUserPermissoes(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredUsersPermissoes.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleSelectUserPermissoes(user)}
                  className={`p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-all border ${selectedUserPermissoes?.id === user.id
                    ? "bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800"
                    : "bg-white dark:bg-slate-800 border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/30"
                    }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${selectedUserPermissoes?.id === user.id
                      ? "bg-blue-500"
                      : "bg-slate-300 dark:bg-slate-600"
                      }`}
                  >
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h4
                      className={`font-bold text-sm ${selectedUserPermissoes?.id === user.id
                        ? "text-blue-700 dark:text-blue-300"
                        : "text-slate-700 dark:text-slate-300"
                        }`}
                    >
                      {user.username}
                    </h4>
                    <span className="text-xs text-slate-400">
                      ID: {user.id} • Origem: {user.origem || "N/A"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Permission Editor */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden min-h-[600px] flex flex-col">
            {selectedUserPermissoes ? (
              <>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/30 dark:bg-slate-800/30">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Editar Permissões</h3>
                    <p className="text-xs text-slate-500">
                      Gerenciando acesso para{" "}
                      <span className="font-bold text-blue-600">@{selectedUserPermissoes.username}</span>
                    </p>
                    {/* Campo para alterar local */}
                    <div className="mt-3 flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Local:</label>
                      <select
                        value={tempLocalUsuario}
                        onChange={(e) => setTempLocalUsuario(e.target.value)}
                        className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        {[...Array(9)].map((_, i) => {
                          const val = String(i + 1).padStart(2, '0');
                          return (
                            <option key={val} value={val}>{val}</option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsAlterarSenhaModalOpen(true)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 shadow-sm"
                      title="Alterar senha do usuário"
                    >
                      <span className="material-symbols-rounded text-sm">lock_reset</span>
                      Alterar Senha
                    </button>
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-bold text-slate-400 ml-1 uppercase">Copiar de:</span>
                      <select
                        value={userToCopyFrom}
                        onChange={(e) => setUserToCopyFrom(e.target.value)}
                        className="text-xs bg-transparent outline-none font-bold text-slate-700 dark:text-white w-24"
                      >
                        <option value="">Selecionar...</option>
                        {usuariosPermissoes
                          .filter((u) => u.id !== selectedUserPermissoes.id)
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.username}
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={handleCopyProfile}
                        disabled={!userToCopyFrom}
                        className="p-1 bg-slate-100 dark:bg-slate-700 hover:bg-blue-100 text-slate-600 hover:text-blue-600 rounded transition-colors disabled:opacity-50"
                        title="Aplicar Cópia"
                      >
                        <span className="material-symbols-rounded text-sm">content_copy</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 flex-1 bg-slate-50/50 dark:bg-black/20 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {rotinasSystem.map((rotina) => (
                      <div
                        key={rotina}
                        onClick={() => handleTogglePermissao(rotina)}
                        className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${selectedUserPermissoes.permissoes[rotina]
                          ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                          : "bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                          }`}
                      >
                        <span
                          className={`font-bold text-xs ${selectedUserPermissoes.permissoes[rotina]
                            ? "text-blue-700 dark:text-blue-400"
                            : "text-slate-600 dark:text-slate-300"
                            }`}
                        >
                          {rotina}
                        </span>
                        <div
                          className={`w-9 h-5 flex items-center rounded-full p-0.5 duration-300 ease-in-out ${selectedUserPermissoes.permissoes[rotina]
                            ? "bg-blue-500"
                            : "bg-slate-300 dark:bg-slate-600"
                            }`}
                        >
                          <div
                            className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform duration-300 ease-in-out ${selectedUserPermissoes.permissoes[rotina] ? "translate-x-4" : ""
                              }`}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                  <button
                    onClick={handleSavePermissoes}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg shadow-green-600/20 transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-rounded text-lg">save</span>
                    Salvar Permissões
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-4">
                  <span className="material-symbols-rounded text-4xl opacity-50">touch_app</span>
                </div>
                <h3 className="text-lg font-bold text-slate-600 dark:text-slate-300">Nenhum Usuário Selecionado</h3>
                <p className="max-w-xs mx-auto mt-2 text-sm">
                  Clique em um usuário na lista à esquerda para visualizar e editar suas permissões.
                </p>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal Criar Novo Usuário */}
      <Modal isOpen={isNovoUsuarioModalOpen} onClose={() => setIsNovoUsuarioModalOpen(false)} title="Criar Novo Usuário">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome de Usuário</label>
            <input
              type="text"
              value={novoUsuario.username}
              onChange={(e) => setNovoUsuario({ ...novoUsuario, username: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-green-500 text-slate-800 dark:text-white"
              placeholder="Digite o nome de usuário"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail (Opcional)</label>
            <input
              type="email"
              value={novoUsuario.email}
              onChange={(e) => setNovoUsuario({ ...novoUsuario, email: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-green-500 text-slate-800 dark:text-white"
              placeholder="Ex: usuario@empresa.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha</label>
            <input
              type="password"
              value={novoUsuario.password}
              onChange={(e) => setNovoUsuario({ ...novoUsuario, password: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-green-500 text-slate-800 dark:text-white"
              placeholder="Digite a senha"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirmar Senha</label>
            <input
              type="password"
              value={novoUsuario.confirmPassword}
              onChange={(e) => setNovoUsuario({ ...novoUsuario, confirmPassword: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-green-500 text-slate-800 dark:text-white"
              placeholder="Confirme a senha"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Local</label>
            <select
              value={novoUsuario.origem}
              onChange={(e) => setNovoUsuario({ ...novoUsuario, origem: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-green-500 text-slate-800 dark:text-white font-bold"
            >
              {[...Array(9)].map((_, i) => {
                const val = String(i + 1).padStart(2, '0');
                return (
                  <option key={val} value={val}>{val}</option>
                );
              })}
            </select>
          </div>
          <button
            onClick={handleCriarUsuario}
            className="mt-6 w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-600/20 active:scale-95"
          >
            <span className="material-symbols-rounded inline-block mr-2 align-middle">person_add</span>
            Criar Usuário
          </button>
        </div>
      </Modal>

      {/* Modal Alterar Senha */}
      <Modal isOpen={isAlterarSenhaModalOpen} onClose={() => setIsAlterarSenhaModalOpen(false)} title={`Alterar Senha: ${selectedUserPermissoes?.username || ''}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nova Senha</label>
            <input
              type="password"
              value={senhaData.novaSenha}
              onChange={(e) => setSenhaData({ ...senhaData, novaSenha: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 dark:text-white"
              placeholder="Digite a nova senha"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirmar Nova Senha</label>
            <input
              type="password"
              value={senhaData.confirmarSenha}
              onChange={(e) => setSenhaData({ ...senhaData, confirmarSenha: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 dark:text-white"
              placeholder="Confirme a nova senha"
            />
          </div>
          <button
            onClick={handleAlterarSenha}
            className="mt-6 w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-amber-600/20 active:scale-95"
          >
            <span className="material-symbols-rounded inline-block mr-2 align-middle">lock_reset</span>
            Alterar Senha
          </button>
        </div>
      </Modal>

      {/* Background Ambient Layers */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-green-400/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
      </div>

      {/* Header Moderno (Flutuante/Glass) */}
      <header className="sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-slate-700/50 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-green-600 to-emerald-400 h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-600/20">
                <span className="font-bold text-xl italic tracking-tighter">SF</span>
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight text-slate-800 dark:text-white">SistemaFF</h1>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Fort Fruit</span>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              {/* Botão de Data - Agora com funcionalidade */}
              <button
                onClick={openDateModal}
                className="hidden md:flex items-center gap-2 mr-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 px-3 py-2 rounded-xl transition-all cursor-pointer group border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
                title="Clique para alterar a data"
              >
                <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-1.5 rounded-lg">
                  <span className="material-symbols-rounded text-lg">calendar_today</span>
                </div>
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{date.toLocaleDateString('pt-BR')}</span>
                </div>
              </button>

              <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 hidden md:block"></div>

              {/* Botão de Usuário e Local - Agora funcional */}
              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-bold text-slate-800 dark:text-white">{username || "Visitante"}</span>
                  <button
                    onClick={openLocalModal}
                    className={`text-[10px] font-bold text-white px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${canChangeLocal ? 'bg-slate-800 dark:bg-slate-600 hover:bg-primary dark:hover:bg-primary cursor-pointer' : 'bg-gray-400 cursor-not-allowed'}`}
                    title={canChangeLocal ? "Clique para alterar o local" : "Você não tem permissão para alterar o local"}
                  >
                    LOCAL: {local}
                    {canChangeLocal && <span className="material-symbols-rounded text-[10px]">edit</span>}
                    {!canChangeLocal && <span className="material-symbols-rounded text-[10px]">lock</span>}
                  </button>
                </div>
                <div className="relative user-menu-container">
                  <button
                    onClick={toggleUserMenu}
                    className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 border-2 border-white dark:border-slate-600 flex items-center justify-center shadow-sm hover:shadow-md hover:scale-105 transition-all cursor-pointer"
                    title="Menu do usuário"
                  >
                    <span className="material-symbols-rounded text-slate-500 dark:text-slate-300">person</span>
                  </button>

                  {/* Menu Dropdown */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                      <button
                        onClick={openPasswordModal}
                        className="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 border-b border-slate-100 dark:border-slate-700"
                      >
                        <span className="material-symbols-rounded text-lg text-slate-500 dark:text-slate-400">lock</span>
                        <span>Alterar Senha</span>
                      </button>
                      {(permissoes["CONFIGURAÇÃO"] || permissoes["ALTERAR_LOCAL_USUARIO"] || (userTipo && (userTipo.toLowerCase() === "admin" || userTipo.toLowerCase() === "gestor"))) && (
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            navigate('/configuracao');
                          }}
                          className="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-3"
                        >
                          <span className="material-symbols-rounded text-lg text-slate-500 dark:text-slate-400">settings</span>
                          <span>Configuração</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <button onClick={toggleTheme} className="ml-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-600 dark:text-slate-300 border border-transparent hover:border-slate-300 dark:hover:border-slate-500">
                <span className="material-symbols-rounded block dark:hidden text-xl" title="Mudar para Escuro">dark_mode</span>
                <span className="material-symbols-rounded hidden dark:block text-xl" title="Mudar para Claro">light_mode</span>
              </button>

              <button onClick={handleLogout} className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-all border border-transparent hover:border-red-200 dark:hover:border-red-800" title="Sair do Sistema">
                <span className="material-symbols-rounded text-xl">logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        <div className="mb-10 animate-in slide-in-from-bottom-5 duration-500">
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Painel de Controle</h2>
          <p className="text-slate-500 dark:text-slate-400">Selecione um módulo para começar suas atividades.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {menuItems.map((item, index) => {
            // Admin/Gestor sempre tem acesso ao card "Acessos" para poder configurar permissões
            const isAdmin = userTipo && (userTipo.toLowerCase() === "admin" || userTipo.toLowerCase() === "gestor");
            const hasAccessToAcessos = item.permission === "ACESSOS" && isAdmin;
            const hasAccessToGestorOnline = item.permission === "GESTOR_ONLINE" && isAdmin;
            const isDisabled = item.disabled || (item.permission && !permissoes[item.permission] && !hasAccessToAcessos && !hasAccessToGestorOnline);
            const colorClass = getColorClasses(item.color, isDisabled);

            return (
              <button
                key={index}
                onClick={(e) => {
                  // Admin/Gestor sempre pode acessar o card "Acessos" e "Usuários Online"
                  if (isDisabled && !hasAccessToAcessos && !hasAccessToGestorOnline) {
                    Swal.fire({
                      icon: 'warning',
                      title: 'Acesso Negado',
                      text: 'Você não tem permissão para acessar este módulo.',
                      confirmButtonColor: '#10b981'
                    });
                    return;
                  }
                  if (item.action) item.action(e);
                  else if (item.path) navigate(item.path);
                }}
                disabled={isDisabled && !hasAccessToAcessos && !hasAccessToGestorOnline}
                className={`group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-5 shadow-sm transition-all duration-300 border border-slate-100 dark:border-slate-700/50 text-left w-full animate-in zoom-in-50 duration-500 fill-mode-backwards ${(isDisabled && !hasAccessToAcessos && !hasAccessToGestorOnline)
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:shadow-md hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer'
                  }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Watermark Icon (Fundo) */}
                <div className={`absolute -right-4 -bottom-4 text-[6rem] opacity-5 group-hover:opacity-10 dark:opacity-[0.03] dark:group-hover:opacity-[0.08] transition-all duration-500 group-hover:scale-110 ${item.color === 'emerald' ? 'text-emerald-500' : `text-${item.color}-500`}`}>
                  <span className="material-symbols-rounded align-middle select-none">{item.icon}</span>
                </div>

                <div className="flex items-center gap-4 relative z-10 h-full">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${colorClass}`}>
                    <span className="material-symbols-rounded text-3xl">{item.icon}</span>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white group-hover:text-primary transition-colors leading-tight mb-1">{item.title}</h3>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors line-clamp-2">
                      {item.subtitle}
                    </p>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform -translate-x-2 group-hover:translate-x-0 ml-2 text-slate-300 dark:text-slate-600">
                    <span className="material-symbols-rounded">chevron_right</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </main>

    </div>
  );
};

export default Home;
