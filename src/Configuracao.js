import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Swal from 'sweetalert2';
import { useTheme } from "./contexts/ThemeContext";
import { API_BASE_URL } from './utils/apiConfig';

// --- Components Reutilizáveis (Tailwind) ---

const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-md" }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-700 font-sans`}>
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all">
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

const ToggleSwitch = ({ checked, onChange, label }) => (
  <div
    onClick={onChange}
    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${checked
      ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
      : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
      }`}
  >
    <span className={`font-bold text-sm ${checked ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}>{label}</span>
    <div className={`w-11 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${checked ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${checked ? 'translate-x-5' : ''}`}></div>
    </div>
  </div>
);

const rotinasSystem = [
  { 
    id: "FATURAMENTO", 
    label: "FATURAMENTO", 
    subroutines: [
      { id: "FATURAMENTO_AJUSTAR_HORAS", label: "Ajustar Horas" }
    ] 
  },
  { id: "CONFERENTE", label: "CONFERENTE" },
  { id: "FINANCEIRO", label: "FINANCEIRO" },
  { id: "ESTOQUE", label: "ESTOQUE" },
  { 
    id: "ACESSOS", 
    label: "ACESSOS",
    subroutines: [
      { id: "ALTERAR_LOCAL_USUARIO", label: "Mudar Local de Usuário" }
    ]
  },
  { id: "CONFIGURAÇÃO", label: "CONFIGURAÇÃO" },
  { id: "RH", label: "RH" },
  { id: "FROTA", label: "FROTA" },
  { id: "FISCAL", label: "FISCAL" },
  { id: "RESTRICAO_ETANA", label: "RESTRICAO ETANA" },
  { id: "CAIXA", label: "CAIXA" },
];

const SETORES = [
  "RH", "Contabilidade", "T.I", "Financeiro", "Loja", "Distribuidora", 
  "CD", "BPG", "Compras", "Gestão", "Passarela 2", "Passarela 1", 
  "BTF", "Banana", "Faturamento", "Operacional", "Serviços Gerais", "Estoque"
];

// Helper para SweetAlert2 com tema
const showAlert = (title, text, icon = 'success') => {
  const isDark = document.documentElement.classList.contains('dark');
  Swal.fire({
    title,
    text,
    icon,
    background: isDark ? '#1e293b' : '#fff', // slate-800 or white
    color: isDark ? '#fff' : '#1e293b',
    confirmButtonColor: '#2563eb', // blue-600
    confirmButtonText: 'Entendido',
    customClass: {
      popup: 'rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700',
      confirmButton: 'rounded-xl px-6 py-2 font-bold'
    }
  });
};

const Configuracoes = () => {
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();

  // --- STATE ---
  const [usuarios, setUsuarios] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchUser, setSearchUser] = useState("");

  // Config Impressora
  const [printerIP, setPrinterIP] = useState("");
  const [printerName, setPrinterName] = useState("");

  // Modal Add User
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", confirmPassword: "", email: "", origem: "01", setor: "" });

  // Modal Pass Change
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [passData, setPassData] = useState({ newPassword: "", confirmPassword: "" });

  // Copy Profile
  const [userToCopyFrom, setUserToCopyFrom] = useState("");

  // System
  const [username, setUsername] = useState("");
  const [local, setLocal] = useState("08");

  // State for expanded modules in permissions
  const [expandedModules, setExpandedModules] = useState({});

  const currentUserObj = usuarios.find(u => u.username?.toLowerCase() === username?.toLowerCase());
  const userTipo = currentUserObj?.tipo?.toLowerCase();
  const hasFullConfig = userTipo === 'admin' || userTipo === 'gestor' || currentUserObj?.permissoes?.['CONFIGURAÇÃO'];

  // --- INITIALIZATION ---
  useEffect(() => {
    const u = sessionStorage.getItem("username");
    if (u) setUsername(u);

    fetchUsuarios();
    fetchPrinterConfig();
  }, []);

  // Removed local toggleDarkMode, useTheme's toggleTheme instead inside JSX
  const handleLogout = () => { localStorage.clear(); navigate("/login"); };


  // --- API CALLS ---
  const fetchPrinterConfig = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/impressora/config`);
      if (res.data) {
        setPrinterIP(res.data.ip || "");
        setPrinterName(res.data.printerName || "");
      }
    } catch (err) { console.error(err); }
  }, []);

  const savePrinterConfig = async () => {
    if (!printerIP || !printerName) return showAlert("Atenção", "Preencha IP e Nome da impressora", "warning");
    try {
      await axios.post(`${API_BASE_URL}/impressora/config`, { ip: printerIP, printerName });
      showAlert("Sucesso", "Configuração salva com sucesso!");
    } catch (err) { console.error(err); showAlert("Erro", "Erro ao salvar configuração", "error"); }
  };

  const fetchUsuarios = useCallback(async () => {
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

      const usuariosFormatados = usuariosResp.data.map((u) => {
        const userPerms = {};
        rotinasSystem.forEach(rotina => {
          userPerms[rotina.id] = permissoesMap[u.id]?.[rotina.id] || false;
          if (rotina.subroutines) {
            rotina.subroutines.forEach(sub => {
              userPerms[sub.id] = permissoesMap[u.id]?.[sub.id] || false;
            });
          }
        });

        return {
          ...u,
          permissoes: userPerms
        };
      });

      setUsuarios(usuariosFormatados);
      setFilteredUsers(usuariosFormatados);
    } catch (err) { console.error(err); }
  }, []);

  // --- HANDLERS ---

  // Filter Users
  useEffect(() => {
    let result = usuarios;
    
    // Se não for admin/gestor (não tem hasFullConfig), esconde admins e gestores da lista
    if (!hasFullConfig) {
      result = result.filter(u => u.tipo?.toLowerCase() !== 'admin' && u.tipo?.toLowerCase() !== 'gestor');
    }

    if (searchUser) {
      result = result.filter(u => u.username.toLowerCase().includes(searchUser.toLowerCase()));
    }
    
    setFilteredUsers(result);
  }, [searchUser, usuarios, hasFullConfig]);

  const handleSelectUser = (user) => {
    setSelectedUser({ ...user });
    setUserToCopyFrom("");
  };

  const handleTogglePermissao = (rotinaId) => {
    if (!selectedUser) return;
    const updatedPerms = { ...selectedUser.permissoes, [rotinaId]: !selectedUser.permissoes[rotinaId] };
    setSelectedUser({ ...selectedUser, permissoes: updatedPerms });
  };

  const toggleModuleExpansion = (moduleId) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const handleSavePermissoes = async () => {
    if (!selectedUser) return;

    const data = Object.entries(selectedUser.permissoes).map(([rotina, permitido]) => ({
      user_id: selectedUser.id,
      rotina,
      permitido,
    }));

    try {
      await axios.post(`${API_BASE_URL}/permissoes/salvar`, { permissoes: data });

      const updatedList = usuarios.map(u => u.id === selectedUser.id ? selectedUser : u);
      setUsuarios(updatedList);

      showAlert("Sucesso", "Permissões atualizadas com sucesso!");
    } catch (err) {
      console.error(err);
      showAlert("Erro", "Erro ao salvar permissões.", "error");
    }
  };

  const handleUpdateLocal = async (novoLocal) => {
    if (!selectedUser) return;

    const currentUser = usuarios.find(u => u.username?.toLowerCase() === username?.toLowerCase());
    const cUserTipo = currentUser?.tipo?.toLowerCase();
    const canChangeLocation = cUserTipo === 'admin' || cUserTipo === 'gestor' || currentUser?.permissoes?.['ALTERAR_LOCAL_USUARIO'];

    if (!canChangeLocation) {
      return showAlert("Acesso Negado", "Você não tem permissão para alterar o local de usuários.", "error");
    }

    try {
      await axios.put(`${API_BASE_URL}/usuarios/${selectedUser.username}/local`, {
        local: novoLocal,
        adminEdit: true
      });
      setSelectedUser(prev => ({ ...prev, origem: novoLocal }));
      setUsuarios(usuarios.map(u => u.id === selectedUser.id ? { ...u, origem: novoLocal } : u));
      
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500,
        background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff',
        color: document.documentElement.classList.contains('dark') ? '#fff' : '#1e293b',
      });
      Toast.fire({ icon: 'success', title: 'Local atualizado!' });
    } catch (e) {
      console.error(e);
      showAlert("Erro", "Erro ao alterar local do usuário.", "error");
    }
  };
  
  const handleUpdateSetor = async (novoSetor) => {
    if (!selectedUser) return;

    try {
      await axios.put(`${API_BASE_URL}/usuarios/${selectedUser.username}/setor`, {
        novoSetor
      });
      setSelectedUser(prev => ({ ...prev, setor: novoSetor }));
      setUsuarios(usuarios.map(u => u.id === selectedUser.id ? { ...u, setor: novoSetor } : u));
      
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500,
        background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff',
        color: document.documentElement.classList.contains('dark') ? '#fff' : '#1e293b',
      });
      Toast.fire({ icon: 'success', title: 'Setor atualizado!' });
    } catch (e) {
      console.error(e);
      showAlert("Erro", "Erro ao alterar setor do usuário.", "error");
    }
  };

  const handleCopyProfile = () => {
    if (!userToCopyFrom) return showAlert("Atenção", "Selecione um perfil para copiar.", "warning");
    const sourceUser = usuarios.find(u => u.id === parseInt(userToCopyFrom));
    if (!sourceUser) return;

    setSelectedUser(prev => ({
      ...prev,
      permissoes: { ...sourceUser.permissoes }
    }));

    // Opcional: Feedback visual rápido
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
      background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff',
      color: document.documentElement.classList.contains('dark') ? '#fff' : '#1e293b',
    });
    Toast.fire({ icon: 'info', title: 'Perfil copiado! Salve para aplicar.' });
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.confirmPassword) return showAlert("Atenção", "Preencha todos os campos", "warning");
    if (newUser.password !== newUser.confirmPassword) return showAlert("Erro", "As senhas não coincidem", "error");

    try {
      await axios.post(`${API_BASE_URL}/usuarios/adicionar`, {
        username: newUser.username,
        password: newUser.password,
        origem: newUser.origem,
        email: newUser.email,
        setor: newUser.setor
      });
      showAlert("Sucesso", `Usuário @${newUser.username} criado com sucesso!`);
      setIsUserModalOpen(false);
      setNewUser({ username: "", password: "", confirmPassword: "", email: "", origem: "01", setor: "" });
      fetchUsuarios();
    } catch (e) { console.error(e); showAlert("Erro", "Não foi possível criar o usuário.", "error"); }
  };

  const handleChangePassword = async () => {
    if (!selectedUser) return;
    if (passData.newPassword !== passData.confirmPassword) return showAlert("Erro", "As senhas não coincidem!", "error");
    if (!passData.newPassword) return showAlert("Atenção", "Digite uma senha nova.", "warning");

    try {
      await axios.put(`${API_BASE_URL}/usuarios/${selectedUser.id}/senha`, {
        password: passData.newPassword
      });
      showAlert("Sucesso", "Senha alterada com sucesso!");
      setIsPassModalOpen(false);
      setPassData({ newPassword: "", confirmPassword: "" });
    } catch (e) { console.error(e); showAlert("Erro", "Erro ao alterar a senha.", "error"); }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans pb-20 transition-colors duration-300">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />

      {/* --- HEADER --- */}
      <header className="sticky top-0 z-50 px-4 md:px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-slate-700/50 px-4 md:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
              <div className="bg-gradient-to-tr from-slate-700 to-slate-500 h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-slate-600/20">
                <span className="material-symbols-rounded text-2xl">settings</span>
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight text-slate-800 dark:text-white">Configurações</h1>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Painel Administrativo</span>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <div className="hidden md:flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-slate-800 dark:text-white">{username || "Admin"}</span>
                  <span className="text-[10px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">LOCAL: {local}</span>
                </div>
              </div>
              <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
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

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">

        {/* 1. SEÇÃO IMPRESSORA */}
        {hasFullConfig && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 p-2 rounded-lg">
              <span className="material-symbols-rounded text-2xl">print</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Impressora Térmica</h2>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-1/3 space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nome da Impressora</label>
              <input
                type="text"
                value={printerName}
                onChange={(e) => setPrinterName(e.target.value)}
                placeholder="Ex: EPSON_TM_T20"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-purple-500 transition-all font-mono"
              />
            </div>
            <div className="w-full md:w-1/3 space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Endereço IP</label>
              <input
                type="text"
                value={printerIP}
                onChange={(e) => setPrinterIP(e.target.value)}
                placeholder="Ex: 192.168.1.200"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-purple-500 transition-all font-mono"
              />
            </div>
            <div className="w-full md:w-auto">
              <button
                onClick={savePrinterConfig}
                className="w-full px-6 py-3 bg-slate-800 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:scale-105 transition-all shadow-lg"
              >
                Salvar Config
              </button>
            </div>
          </div>
        </div>
        )}

        {/* 2. SEÇÃO REMOVIDA - GERENCIAMENTO DE ACESSOS MOVIDO PARA PÁGINA PRINCIPAL */}
        {/* 2. SEÇÃO MONITORAMENTO */}
        {hasFullConfig && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 p-2 rounded-lg">
                <span className="material-symbols-rounded text-2xl">people</span>
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Usuários Online</h2>
            </div>
            <button
              onClick={() => navigate("/usuarios-online")}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-green-600/20"
            >
              <span className="material-symbols-rounded">visibility</span>
              Ver Usuários Conectados
            </button>
          </div>
          <p className="text-slate-500 text-sm">Monitore em tempo real quem está utilizando o sistema.</p>
        </div>
        )}

        {/* 3. SEÇÃO GERENCIAMENTO DE ACESSOS */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col h-[800px]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 p-2 rounded-lg">
                <span className="material-symbols-rounded text-2xl">admin_panel_settings</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Gerenciamento de Acessos</h2>
                <p className="text-sm text-slate-500">Controle permissões, senhas e locais</p>
              </div>
            </div>
            {hasFullConfig && (
            <button
              onClick={() => setIsUserModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
            >
              <span className="material-symbols-rounded">person_add</span>
              Novo Usuário
            </button>
            )}
          </div>

          <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden">

            {/* LEFT: LISTA DE USUÁRIOS */}
            <div className="w-full lg:w-1/3 flex flex-col gap-4 border-r border-slate-100 dark:border-slate-700 pr-0 lg:pr-6">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-rounded">search</span>
                <input
                  type="text"
                  placeholder="Buscar usuário..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {filteredUsers.map(user => (
                  <div
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${selectedUser?.id === user.id
                        ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 ring-1 ring-blue-500'
                        : 'bg-white border-slate-100 dark:bg-slate-800 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${selectedUser?.id === user.id ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>
                        {user.username.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${selectedUser?.id === user.id ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'}`}>
                          {user.username}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded">
                            Loc: {user.origem || 'N/A'}
                          </span>
                          {user.setor && (
                            <span className="text-[10px] uppercase font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                              {user.setor}
                            </span>
                          )}
                          {user.tipo === 'ADMIN' && (
                            <span className="text-[10px] uppercase font-bold text-purple-600 bg-purple-100 dark:bg-purple-900/30 px-1.5 py-0.5 rounded">
                              ADMIN
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="material-symbols-rounded text-slate-300 group-hover:text-blue-500 transition-colors">chevron_right</span>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: DETALHES E PERMISSÕES */}
            <div className="w-full lg:w-2/3 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-200 dark:border-slate-700">
              {selectedUser ? (
                <>
                  <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        <span className="material-symbols-rounded text-2xl">person</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">{selectedUser.username}</h3>
                        <p className="text-xs text-slate-500 font-medium">Editando permissões</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {hasFullConfig && (
                        <>
                          <button
                            onClick={() => setIsPassModalOpen(true)}
                            className="px-3 py-1.5 bg-yellow-50 text-yellow-600 hover:bg-yellow-100 border border-yellow-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                          >
                            <span className="material-symbols-rounded text-sm">key</span>
                            Senha
                          </button>
                          <button
                            onClick={handleSavePermissoes}
                            className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-md shadow-green-600/20"
                          >
                            <span className="material-symbols-rounded text-sm">save</span>
                            Salvar Alterações
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="p-6 flex-1 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {/* Alterar Local */}
                      <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider">Local (Origem) do Usuário</label>
                        <select
                          value={selectedUser.origem || "01"}
                          onChange={(e) => handleUpdateLocal(e.target.value)}
                          disabled={!(currentUserObj?.tipo?.toLowerCase() === 'admin' || currentUserObj?.tipo?.toLowerCase() === 'gestor' || currentUserObj?.permissoes?.['ALTERAR_LOCAL_USUARIO'])}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {[...Array(9)].map((_, i) => {
                            const val = String(i + 1).padStart(2, '0');
                            return (
                              <option key={val} value={val}>Local {val}</option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Alterar Setor */}
                      <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider">Setor do Usuário</label>
                        <select
                          value={selectedUser.setor || ""}
                          onChange={(e) => handleUpdateSetor(e.target.value)}
                          disabled={!hasFullConfig}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Nenhum</option>
                          {SETORES.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      {/* Copiar Perfil */}
                      {hasFullConfig && (
                      <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider">Copiar permissões de outro usuário</label>
                        <div className="flex gap-2">
                          <select
                            value={userToCopyFrom}
                            onChange={(e) => setUserToCopyFrom(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                          >
                            <option value="">Selecione um usuário...</option>
                            {usuarios.filter(u => u.id !== selectedUser.id).map(u => (
                              <option key={u.id} value={u.id}>{u.username}</option>
                            ))}
                          </select>
                          <button
                            onClick={handleCopyProfile}
                            className="px-3 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 rounded-lg font-bold text-xs transition-all dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-400 dark:border-indigo-800"
                          >
                            Copiar
                          </button>
                        </div>
                      </div>
                      )}
                    </div>

                    {hasFullConfig && (
                    <>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">Módulos do Sistema</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {rotinasSystem.map(module => (
                        <div key={module.id} className="space-y-2">
                          <div className="flex items-center gap-2">
                            {module.subroutines && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleModuleExpansion(module.id);
                                }}
                                className={`p-1.5 rounded-xl transition-all ${
                                  expandedModules[module.id] ? 'bg-blue-100 text-blue-600 rotate-180' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700'
                                }`}
                                title={expandedModules[module.id] ? "Recolher sub-rotinas" : "Expandir sub-rotinas"}
                              >
                                <span className="material-symbols-rounded text-lg">expand_more</span>
                              </button>
                            )}
                            <div className="flex-1">
                              <ToggleSwitch
                                label={module.label}
                                checked={!!selectedUser.permissoes[module.id]}
                                onChange={() => handleTogglePermissao(module.id)}
                              />
                            </div>
                          </div>
                          
                          {module.subroutines && expandedModules[module.id] && (
                            <div className="pl-6 space-y-2 border-l-2 border-slate-100 dark:border-slate-800 ml-4 animate-in slide-in-from-top-1 duration-200">
                              {module.subroutines.map(sub => (
                                <ToggleSwitch
                                  key={sub.id}
                                  label={sub.label}
                                  checked={!!selectedUser.permissoes[sub.id]}
                                  onChange={() => handleTogglePermissao(sub.id)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    </>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center opacity-60">
                  <span className="material-symbols-rounded text-6xl mb-4 text-slate-300 dark:text-slate-600">manage_accounts</span>
                  <p className="font-medium text-lg">Selecione um usuário para gerenciar</p>
                  <p className="text-sm">Clique na lista ao lado para ver detalhes</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </main>

      {/* MODAL ADD USER */}
      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title="Novo Usuário">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome de Usuário</label>
            <input className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
              value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail (Opcional)</label>
            <input type="email" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="usuario@empresa.com"
              value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha</label>
            <input type="password" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
              value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirmar Senha</label>
            <input type="password" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
              value={newUser.confirmPassword} onChange={e => setNewUser({ ...newUser, confirmPassword: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Origem</label>
            <select className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
              value={newUser.origem} onChange={e => setNewUser({ ...newUser, origem: e.target.value })}>
              {[...Array(9)].map((_, i) => (
                <option key={i} value={String(i + 1).padStart(2, '0')}>{String(i + 1).padStart(2, '0')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Setor</label>
            <select className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
              value={newUser.setor} onChange={e => setNewUser({ ...newUser, setor: e.target.value })}>
              <option value="">Selecione um setor...</option>
              {SETORES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <button onClick={handleAddUser} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl mt-2">Criar Usuário</button>
        </div>
      </Modal>

      {/* MODAL CHANGE PASSWORD */}
      <Modal isOpen={isPassModalOpen} onClose={() => setIsPassModalOpen(false)} title={`Alterar Senha: ${selectedUser?.username}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nova Senha</label>
            <input type="password" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
              value={passData.newPassword} onChange={e => setPassData({ ...passData, newPassword: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirmar Nova Senha</label>
            <input type="password" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
              value={passData.confirmPassword} onChange={e => setPassData({ ...passData, confirmPassword: e.target.value })} />
          </div>
          <button onClick={handleChangePassword} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl mt-2">Atualizar Senha</button>
        </div>
      </Modal>

    </div>
  );
};

export default Configuracoes;
