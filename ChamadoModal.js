import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { useTheme } from '../contexts/ThemeContext'; // Assuming this context exists based on Home.js
import { API_BASE_URL } from '../utils/apiConfig';
import axios from 'axios';
import { supabase } from '../utils/supabaseClient';
import Almoxarifado from './Almoxarifado';



const ChamadoModal = ({ isOpen, onClose, updatedIds = [], onClearId }) => {
    const [activeTab, setActiveTab] = useState('novo');
    const [formData, setFormData] = useState({
        titulo: '',
        descricao: '',
        email: '',
        categoria: 'Sistema FF',
        prioridade: 'Baixa'
    });
    const [historico, setHistorico] = useState([]);
    const [selectedChamado, setSelectedChamado] = useState(null);
    const [mensagens, setMensagens] = useState([]);
    const [novaMensagem, setNovaMensagem] = useState('');
    const [enviandoMsg, setEnviandoMsg] = useState(false);
    const [anexoFile, setAnexoFile] = useState(null);
    const [novoChamadoAnexo, setNovoChamadoAnexo] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [isNovoEmojiPickerOpen, setIsNovoEmojiPickerOpen] = useState(false);
    const itemsPerPage = 7;
    const scrollContainerRef = useRef(null);
    const inputRef = useRef(null);
    const descriptionRef = useRef(null);

    const handleAddEmoji = (emoji) => {
        const input = inputRef.current;
        if (!input) {
            setNovaMensagem(prev => prev + emoji);
            return;
        }

        const start = input.selectionStart;
        const end = input.selectionEnd;
        const text = novaMensagem;
        const before = text.substring(0, start);
        const after = text.substring(end);

        setNovaMensagem(before + emoji + after);

        // Reposicionar cursor após o emoji
        setTimeout(() => {
            input.focus();
            input.setSelectionRange(start + emoji.length, start + emoji.length);
        }, 10);
    };

    const handleAddNewEmoji = (emoji) => {
        const input = descriptionRef.current;
        if (!input) {
            setFormData(prev => ({ ...prev, descricao: prev.descricao + emoji }));
            return;
        }

        const start = input.selectionStart;
        const end = input.selectionEnd;
        const text = formData.descricao;
        const before = text.substring(0, start);
        const after = text.substring(end);

        setFormData(prev => ({ ...prev, descricao: before + emoji + after }));

        setTimeout(() => {
            input.focus();
            input.setSelectionRange(start + emoji.length, start + emoji.length);
        }, 10);
    };

    const emojiGroups = {
        "Sorrisos": ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠"],
        "Gestos": ["🤲", "👐", "🙌", "👏", "🤝", "👍", "👎", "👊", "✊", "🤛", "🤜", "🤞", "✌️", "🤟", "🤘", "👌", "🤙", "💪", "🖕", "✍️", "🙏", "🤳", "💅"],
        "Corações": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟"],
        "Objetos": ["💡", "💻", "📱", "⌚", "📷", "🔋", "🔌", "🏠", "🏢", "🚗", "🚀", "⏰", "📅", "✉️", "📦", "📁", "📍", "🔒", "🔑", "🔨", "🛠️", "🩹", "🎁", "🎉", "🔥", "✨", "⭐"]
    };

    // Rolar para o final instantaneamente quando abrir ou novas mensagens chegarem
    // Rolar para o final instantaneamente quando abrir ou novas mensagens chegarem
    useEffect(() => {
        if (scrollContainerRef.current) {
            setTimeout(() => {
                scrollContainerRef.current.scrollTo({
                    top: scrollContainerRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }, 100);
        }
    }, [mensagens, selectedChamado]);

    // Carregar histórico ao abrir o modal
    useEffect(() => {
        if (isOpen) {
            fetchHistorico();
            setCurrentPage(1); // Reset page when opening
            const interval = setInterval(fetchHistorico, 10000);
            return () => clearInterval(interval);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleRefresh = (e) => {
            console.log('🔄 Atualizando histórico de chamados via evento WS');
            fetchHistorico();

            // Se o chamado atualizado for o que está aberto, atualiza mensagens também
            if (selectedChamado && e.detail.chamado_id == selectedChamado.id) {
                fetchMensagens(selectedChamado.id);
            }
        };
        window.addEventListener('chamado_updated', handleRefresh);
        return () => window.removeEventListener('chamado_updated', handleRefresh);
    }, [selectedChamado]);

    const fetchHistorico = async () => {
        try {
            // Em uma implementação real, passaríamos o email do usuário logado para filtrar
            // const userEmail = sessionStorage.getItem('userEmail');
            // const response = await fetch(`${API_BASE_URL}/chamados?email=${userEmail}`);

            // Por enquanto, traz todos ou filtra se tiver o user no session
            const storedUser = sessionStorage.getItem("username");

            // Filtra pelo nome do usuario logado
            const response = await axios.get(`${API_BASE_URL}/chamados`, {
                params: { username: storedUser }
            });

            if (response.data) {
                setHistorico(response.data);
            }
        } catch (error) {
            console.error("Erro ao buscar histórico:", error);
        }
    };

    const fetchMensagens = async (chamadoId) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/chamados/${chamadoId}/mensagens`);
            if (response.data) {
                setMensagens(response.data);
            }
        } catch (error) {
            console.error("Erro ao buscar mensagens:", error);
        }
    };

    useEffect(() => {
        if (selectedChamado) {
            fetchMensagens(selectedChamado.id);
            // Poderia ter um poll aqui se quisesse tempo real sem websocket
            const interval = setInterval(() => fetchMensagens(selectedChamado.id), 5000);
            return () => clearInterval(interval);
        }
    }, [selectedChamado]);

    const handleEnviarMensagem = async (e) => {
        e.preventDefault();

        if (!novaMensagem.trim() && !anexoFile) return;

        setEnviandoMsg(true);
        try {
            const storedUser = sessionStorage.getItem("username");

            let anexoUrl = null;

            // 1. Upload para Supabase Storage se tiver arquivo
            if (anexoFile) {
                const fileExt = anexoFile.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${selectedChamado.id}/${fileName}`;

                const { data, error } = await supabase.storage
                    .from('chamado-anexos')
                    .upload(filePath, anexoFile);

                if (error) {
                    throw error;
                }

                // 2. Obter URL pública
                const { data: publicUrlData } = supabase.storage
                    .from('chamado-anexos')
                    .getPublicUrl(filePath);

                anexoUrl = publicUrlData.publicUrl;
            }

            // 3. Enviar mensagem com URL do anexo
            await axios.post(`${API_BASE_URL}/chamados/${selectedChamado.id}/mensagens`, {
                mensagem: novaMensagem,
                remetente_tipo: 'usuario',
                remetente_nome: storedUser || 'Usuario',
                anexo_url: anexoUrl // Novo campo para URL do anexo
            });

            setNovaMensagem('');
            setAnexoFile(null); // Limpar arquivo selecionado
            fetchMensagens(selectedChamado.id);

        } catch (error) {
            console.error("Erro ao enviar mensagem:", error);
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'Não foi possível enviar a mensagem. Verifique a conexão ou permissões.',
            });
        } finally {
            setEnviandoMsg(false);
        }
    };


    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setAnexoFile(e.target.files[0]);
        }
    };


    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            // Tentar pegar usuario logado para preencher email/nome se vazio
            const storedUser = sessionStorage.getItem("username");

            let anexoUrl = null;

            // 1. Upload do anexo do novo chamado se existir
            if (novoChamadoAnexo) {
                const fileExt = novoChamadoAnexo.name.split('.').pop();
                const fileName = `novo-chamado-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `temp/${fileName}`; // Pasta temporária ou raiz

                const { data, error } = await supabase.storage
                    .from('chamado-anexos')
                    .upload(filePath, novoChamadoAnexo);

                if (error) {
                    throw error;
                }

                const { data: publicUrlData } = supabase.storage
                    .from('chamado-anexos')
                    .getPublicUrl(filePath);

                anexoUrl = publicUrlData.publicUrl;
            }

            const payload = {
                titulo: formData.titulo,
                descricao: formData.descricao,
                categoria: formData.categoria,
                prioridade: formData.prioridade,
                solicitante_email: formData.email,
                solicitante_nome: storedUser || 'Sem Identificação',
                caminho_anexo: anexoUrl // Url do anexo enviado
            };

            await axios.post(`${API_BASE_URL}/chamados`, payload);

            Swal.fire({
                icon: 'success',
                title: 'Chamado Criado!',
                text: 'Seu chamado foi registrado com sucesso.',
                confirmButtonColor: '#10b981'
            });

            setFormData({
                titulo: '',
                descricao: '',
                email: '',
                categoria: 'Sistema FF',
                prioridade: 'Baixa'
            });
            setNovoChamadoAnexo(null);

            fetchHistorico();
            setActiveTab('historico');

        } catch (error) {
            console.error("Erro ao enviar chamado:", error);
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'Não foi possível registrar o chamado. Verifique sua conexão ou o anexo.',
            });
        }
    };


    const getPriorityColor = (p) => {
        switch (p) {
            case 'Urgente': return 'text-red-700 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800';
            case 'Alta': return 'text-orange-700 bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800';
            case 'Media': return 'text-yellow-700 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800';
            default: return 'text-green-700 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800';
        }
    };

    // Modal de Detalhes (Renderizado acima do modal principal se selecionado)
    if (selectedChamado) {
        return (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] h-full"> {/* Tamanho e altura ajustados */}

                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                <span className="material-symbols-rounded">sticky_note_2</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white">Detalhes do Chamado #{selectedChamado.id}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Visualize as informações e interaja com o suporte</p>
                            </div>
                        </div>
                        <button onClick={() => setSelectedChamado(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                            <span className="material-symbols-rounded">close</span>
                        </button>
                    </div>

                    {/* Body - Layout de Colunas */}
                    <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

                        {/* Sidebar - Informações (Esquerda) */}
                        <div className="w-full md:w-1/3 bg-slate-50/50 dark:bg-slate-900/30 border-r border-slate-100 dark:border-slate-700 p-6 overflow-y-auto">
                            <div className="space-y-6">

                                {/* Status Card */}
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Status Atual</span>
                                    <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider inline-block
                                        ${selectedChamado.status === 'Em Aberto' || selectedChamado.status === 'Aberto' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                            selectedChamado.status === 'Em Andamento' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                                                selectedChamado.status === 'Fechado' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-slate-100 text-slate-600'}`}>
                                        {selectedChamado.status || 'Em Aberto'}
                                    </span>
                                </div>

                                {/* Lista de Propriedades */}
                                <div className="space-y-4 text-sm">
                                    <div>
                                        <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Prioridade</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${selectedChamado.prioridade === 'Urgente' ? 'bg-red-500' :
                                                selectedChamado.prioridade === 'Alta' ? 'bg-orange-500' :
                                                    selectedChamado.prioridade === 'Media' ? 'bg-yellow-500' : 'bg-green-500'
                                                }`}></span>
                                            <span className="font-medium text-slate-700 dark:text-slate-300">{selectedChamado.prioridade}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Categoria</span>
                                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                                            <span className="material-symbols-rounded text-base text-slate-400">category</span>
                                            {selectedChamado.categoria}
                                        </div>
                                    </div>

                                    <div>
                                        <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Solicitante</span>
                                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                                            <span className="material-symbols-rounded text-base text-slate-400">person</span>
                                            {selectedChamado.solicitante_nome}
                                        </div>
                                        <div className="text-xs text-slate-500 ml-6 truncate" title={selectedChamado.solicitante_email}>
                                            {selectedChamado.solicitante_email}
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                        <div>
                                            <span className="block text-xs font-semibold text-slate-500 mb-1">Abertura</span>
                                            <span className="text-slate-700 dark:text-slate-300">
                                                {new Date(selectedChamado.data_abertura).toLocaleString('pt-BR')}
                                            </span>
                                        </div>
                                        {selectedChamado.data_fechamento && (
                                            <div className="mt-3">
                                                <span className="block text-xs font-semibold text-slate-500 mb-1">Fechamento</span>
                                                <span className="text-slate-700 dark:text-slate-300">
                                                    {new Date(selectedChamado.data_fechamento).toLocaleString('pt-BR')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Conteúdo Principal (Direita) */}
                        <div className="w-full md:w-2/3 flex flex-col bg-white dark:bg-slate-800 h-full relative">

                            {/* Header Fixo no Topo */}
                            <div className="px-6 py-5 md:px-8 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 z-10 flex-shrink-0">
                                <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-2">
                                    {selectedChamado.titulo}
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${getPriorityColor(selectedChamado.prioridade)}`}>
                                        {selectedChamado.prioridade}
                                    </span>
                                </h2>
                            </div>

                            {/* Conteúdo com Scroll */}
                            <div
                                ref={scrollContainerRef}
                                className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar flex flex-col relative"
                            >

                                {/* Area de Mensagens */}
                                <div className="space-y-6 flex-1">
                                    {/* Mensagem Inicial (Descrição do Chamado) */}
                                    <div className="flex flex-col gap-1 items-end">
                                        <div className="bg-blue-50 dark:bg-blue-900/20 text-slate-700 dark:text-slate-300 p-4 rounded-2xl rounded-tr-none max-w-[90%] border border-blue-100 dark:border-blue-800">
                                            <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                                {selectedChamado.descricao}
                                            </p>
                                            {selectedChamado.caminho_anexo && (
                                                <div className="mt-3 pt-3 border-t border-blue-100 dark:border-blue-800">
                                                    <span className="text-xs font-bold text-slate-500 mb-2 block flex items-center gap-1">
                                                        <span className="material-symbols-rounded text-sm">attachment</span>
                                                        Anexo do Chamado:
                                                    </span>
                                                    {selectedChamado.caminho_anexo.match(/\.(jpg|jpeg|png|gif|webp|avif|bmp|svg)$/i) ? (
                                                        <div
                                                            onClick={() => setPreviewImage(selectedChamado.caminho_anexo)}
                                                            className="cursor-pointer group relative overflow-hidden rounded-lg border border-white/20 max-w-fit"
                                                        >
                                                            <img
                                                                src={selectedChamado.caminho_anexo}
                                                                alt="Anexo Inicial"
                                                                className="max-w-full max-h-60 object-cover group-hover:scale-105 transition-transform duration-300"
                                                            />
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                                <span className="material-symbols-rounded text-white drop-shadow-lg bg-black/20 p-2 rounded-full">zoom_in</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <a
                                                            href={selectedChamado.caminho_anexo}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-2 bg-white/50 p-2 rounded hover:bg-white/80 transition-colors text-xs font-bold underline text-blue-600"
                                                        >
                                                            <span className="material-symbols-rounded">open_in_new</span>
                                                            Visualizar Arquivo Anexado
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-slate-400 mr-2">
                                            {new Date(selectedChamado.data_abertura).toLocaleString('pt-BR')} • Abertura
                                        </span>
                                    </div>

                                    {/* Lista de Mensagens */}
                                    {mensagens.map((msg) => {
                                        const isImage = msg.anexo_path?.match(/\.(jpg|jpeg|png|gif|webp|avif|bmp|svg)$/i);
                                        return (
                                            <div key={msg.id} className={`flex flex-col gap-1 ${msg.remetente_tipo === 'usuario' ? 'items-end' : 'items-start'}`}>

                                                {/* Imagem (Sem balão) */}
                                                {isImage && (
                                                    <div
                                                        onClick={() => setPreviewImage(msg.anexo_path)}
                                                        className={`cursor-pointer group relative overflow-hidden rounded-2xl border border-white/20 max-w-[85%] 
                                                        shadow-sm mb-1 ${msg.remetente_tipo === 'usuario' ? 'rounded-br-none' : 'rounded-bl-none'}`}
                                                    >
                                                        <img
                                                            src={msg.anexo_path}
                                                            alt="Anexo"
                                                            className="block max-w-full max-h-60 object-cover group-hover:scale-105 transition-transform duration-300"
                                                        />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                            <span className="material-symbols-rounded text-white drop-shadow-lg bg-black/20 p-2 rounded-full">zoom_in</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Conteúdo em Balão (Texto ou Arquivo não-imagem) */}
                                                {(msg.mensagem || (msg.anexo_path && !isImage)) && (
                                                    <div className={`p-4 rounded-2xl max-w-[85%] shadow-sm text-sm leading-relaxed whitespace-pre-wrap flex flex-col gap-2
                                                    ${msg.remetente_tipo === 'usuario'
                                                            ? 'bg-blue-600 text-white rounded-tr-none'
                                                            : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-slate-600 rounded-tl-none'
                                                        }`}>

                                                        {/* Arquivo (se não for imagem) */}
                                                        {msg.anexo_path && !isImage && (
                                                            <div className="mb-2">
                                                                <a href={msg.anexo_path} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-black/10 p-2 rounded hover:bg-black/20 transition-colors text-xs font-bold underline">
                                                                    <span className="material-symbols-rounded">attachment</span>
                                                                    Ver Anexo
                                                                </a>
                                                            </div>
                                                        )}

                                                        {/* Texto da Mensagem */}
                                                        {msg.mensagem && <span>{msg.mensagem}</span>}
                                                    </div>
                                                )}

                                                <span className="text-[10px] text-slate-400 mx-1">
                                                    {msg.remetente_nome} • {new Date(msg.data_envio).toLocaleString('pt-BR')}
                                                </span>
                                            </div>
                                        )
                                    })}

                                    {mensagens.length === 0 && (
                                        <div className="text-center py-8 text-slate-400 text-xs italic">
                                            Nenhuma resposta ainda.
                                        </div>
                                    )}
                                    {mensagens.length === 0 && (
                                        <div className="text-center py-8 text-slate-400 text-xs italic">
                                            Nenhuma resposta ainda.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Área de Input (Footer) */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex-shrink-0 z-20">
                                <form onSubmit={handleEnviarMensagem} className="flex flex-col gap-2 w-full">
                                    {/* Preview do arquivo selecionado */}
                                    {anexoFile && (
                                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-xs w-fit border border-slate-200 dark:border-slate-700">
                                            <span className="material-symbols-rounded text-slate-500">attach_file</span>
                                            <span className="truncate max-w-[150px] text-slate-700 dark:text-slate-300">{anexoFile.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => setAnexoFile(null)}
                                                className="hover:text-red-500 text-slate-400"
                                            >
                                                <span className="material-symbols-rounded text-sm">close</span>
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 w-full">
                                        <div className="flex items-center">
                                            <label className="p-2.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 relative group">
                                                <span className="material-symbols-rounded">attach_file</span>
                                                <input
                                                    type="file"
                                                    onChange={handleFileChange}
                                                    className="hidden"
                                                    accept="image/*,.pdf,.doc,.docx"
                                                />
                                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                    Anexar arquivo
                                                </span>
                                            </label>

                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                                                    className={`p-2.5 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 relative group ${isEmojiPickerOpen ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'text-slate-400'}`}
                                                >
                                                    <span className="material-symbols-rounded">mood</span>
                                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                        Emoji
                                                    </span>
                                                </button>

                                                {/* Emoji Picker Popover */}
                                                {isEmojiPickerOpen && (
                                                    <div className="absolute bottom-full left-0 mb-4 w-72 h-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 flex flex-col z-[150] animate-in slide-in-from-bottom-2 duration-200">
                                                        <div className="p-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-t-2xl">
                                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Escolha um Emoji</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setIsEmojiPickerOpen(false)}
                                                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                            >
                                                                <span className="material-symbols-rounded text-sm">close</span>
                                                            </button>
                                                        </div>
                                                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-4">
                                                            {Object.entries(emojiGroups).map(([group, emojis]) => (
                                                                <div key={group}>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 px-1">{group}</p>
                                                                    <div className="grid grid-cols-7 gap-1">
                                                                        {emojis.map(emoji => (
                                                                            <button
                                                                                key={emoji}
                                                                                type="button"
                                                                                onClick={() => handleAddEmoji(emoji)}
                                                                                className="text-xl p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all active:scale-125"
                                                                            >
                                                                                {emoji}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex-1 relative">
                                            <input
                                                ref={inputRef}
                                                type="text"
                                                value={novaMensagem}
                                                onChange={(e) => setNovaMensagem(e.target.value)}
                                                onFocus={() => setIsEmojiPickerOpen(false)}
                                                placeholder="Digite uma mensagem..."
                                                className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed dark:text-white"
                                                disabled={enviandoMsg || selectedChamado.status === 'Fechado'}
                                            />
                                            <button
                                                type="submit"
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                                disabled={(!novaMensagem.trim() && !anexoFile) || enviandoMsg || selectedChamado.status === 'Fechado'}
                                            >
                                                {enviandoMsg ? (
                                                    <span className="material-symbols-rounded text-lg animate-spin">progress_activity</span>
                                                ) : (
                                                    <span className="material-symbols-rounded text-lg">send</span>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                                {selectedChamado.status === 'Fechado' && (
                                    <p className="text-[10px] text-center text-red-400 mt-2">
                                        Este chamado está fechado e não aceita novas mensagens.
                                    </p>
                                )}
                            </div>

                        </div>
                    </div>
                </div>

                {/* Modal de Preview de Imagem */}
                {previewImage && (
                    <div
                        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setPreviewImage(null)}
                    >
                        <div className="relative max-w-[90vw] max-h-[90vh]">
                            <button
                                onClick={() => setPreviewImage(null)}
                                className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors"
                            >
                                <span className="material-symbols-rounded text-3xl">close</span>
                            </button>
                            <img
                                src={previewImage}
                                alt="Visualização"
                                className="max-w-full max-h-[90vh] rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
                                onClick={(e) => e.stopPropagation()} // Evita fechar ao clicar na imagem
                            />
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div id="chamado-modal-container" className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                            <span className="material-symbols-rounded">support_agent</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Central de Chamados</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Abra um novo ticket ou acompanhe suas solicitações</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                            <span className="material-symbols-rounded">close</span>
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-700 px-6">
                    <button
                        id="tab-novo-chamado"
                        onClick={() => setActiveTab('novo')}
                        className={`py-3 px-4 text-sm font-semibold transition-colors relative ${activeTab === 'novo'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                    >
                        Novo Chamado
                        {activeTab === 'novo' && (
                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></span>
                        )}
                    </button>
                    <button
                        id="tab-almoxarifado"
                        onClick={() => setActiveTab('almoxarifado')}
                        className={`py-3 px-4 text-sm font-semibold transition-colors relative ${activeTab === 'almoxarifado'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                    >
                        Almoxarifado
                        {activeTab === 'almoxarifado' && (
                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></span>
                        )}
                    </button>
                    <button
                        id="tab-historico"
                        onClick={() => setActiveTab('historico')}
                        className={`py-3 px-4 text-sm font-semibold transition-colors relative ${activeTab === 'historico'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                    >
                        Histórico de Chamados
                        {activeTab === 'historico' && (
                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></span>
                        )}
                    </button>
                </div>

                {/* Content */}
                <div className="p-0 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-900/20 flex-1">
                    {activeTab === 'novo' ? (
                        <div className="p-8 max-w-2xl mx-auto">
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {/* Categoria */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Categoria <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-rounded text-lg">category</span>
                                            <select
                                                name="categoria"
                                                value={formData.categoria}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white appearance-none cursor-pointer"
                                            >
                                                <option value="Infra-estrutura">Infra-estrutura</option>
                                                <option value="Sistema FF">Sistema FF</option>
                                                <option value="Sistema Protheus">Sistema Protheus</option>
                                                <option value="4Sales">4Sales</option>
                                            </select>
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-rounded text-lg pointer-events-none">expand_more</span>
                                        </div>
                                    </div>

                                    {/* Prioridade */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Prioridade <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-rounded text-lg">priority_high</span>
                                            <select
                                                name="prioridade"
                                                value={formData.prioridade}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white appearance-none cursor-pointer"
                                            >
                                                <option value="Baixa">Baixa</option>
                                                <option value="Media">Média</option>
                                                <option value="Alta">Alta</option>
                                                <option value="Urgente">Urgente</option>
                                            </select>
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-rounded text-lg pointer-events-none">expand_more</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Título */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Título do Chamado <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-rounded text-lg">title</span>
                                        <input
                                            type="text"
                                            name="titulo"
                                            value={formData.titulo}
                                            onChange={handleChange}
                                            placeholder="Resumo do problema..."
                                            required
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white placeholder-slate-400"
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Email do Solicitante (Opcional)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-rounded text-lg">mail</span>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="seu.email@exemplo.com"
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white placeholder-slate-400"
                                        />
                                    </div>
                                </div>

                                {/* Descrição */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Descrição Detalhada <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-3 text-slate-400 material-symbols-rounded text-lg">description</span>
                                        <textarea
                                            ref={descriptionRef}
                                            name="descricao"
                                            value={formData.descricao}
                                            onChange={handleChange}
                                            onFocus={() => setIsNovoEmojiPickerOpen(false)}
                                            placeholder="Descreva o problema com o máximo de detalhes possível..."
                                            required
                                            rows="4"
                                            className="w-full pl-10 pr-12 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white placeholder-slate-400 resize-none"
                                        ></textarea>

                                        {/* Emoji Button for Description */}
                                        <div className="absolute right-2 bottom-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsNovoEmojiPickerOpen(!isNovoEmojiPickerOpen)}
                                                className={`p-1.5 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 relative group ${isNovoEmojiPickerOpen ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'text-slate-400'}`}
                                            >
                                                <span className="material-symbols-rounded text-xl">mood</span>

                                                {/* Tooltip */}
                                                <span className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                                    Adicionar emoji
                                                </span>
                                            </button>

                                            {/* Emoji Picker Popover */}
                                            {isNovoEmojiPickerOpen && (
                                                <div className="absolute bottom-full right-0 mb-2 w-72 h-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 flex flex-col z-[200] animate-in slide-in-from-bottom-2 duration-200">
                                                    <div className="p-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-t-2xl">
                                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Emoji na Descrição</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsNovoEmojiPickerOpen(false)}
                                                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                        >
                                                            <span className="material-symbols-rounded text-sm">close</span>
                                                        </button>
                                                    </div>
                                                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-4">
                                                        {Object.entries(emojiGroups).map(([group, emojis]) => (
                                                            <div key={group}>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 px-1">{group}</p>
                                                                <div className="grid grid-cols-7 gap-1">
                                                                    {emojis.map(emoji => (
                                                                        <button
                                                                            key={emoji}
                                                                            type="button"
                                                                            onClick={() => handleAddNewEmoji(emoji)}
                                                                            className="text-xl p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all active:scale-125"
                                                                        >
                                                                            {emoji}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Anexo (Opcional) */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Anexo (Opcional)
                                    </label>
                                    <div className="relative">
                                        <div className="flex items-center gap-3 w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800">
                                            <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg cursor-pointer transition-colors text-sm font-medium text-slate-700 dark:text-slate-300">
                                                <span className="material-symbols-rounded">attach_file</span>
                                                Escolher Arquivo
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    onChange={(e) => setNovoChamadoAnexo(e.target.files[0])}
                                                    accept="image/*,.pdf,.doc,.docx"
                                                />
                                            </label>
                                            <span className="text-sm text-slate-500 dark:text-slate-400 truncate flex-1">
                                                {novoChamadoAnexo ? novoChamadoAnexo.name : 'Nenhum arquivo selecionado'}
                                            </span>
                                            {novoChamadoAnexo && (
                                                <button
                                                    type="button"
                                                    onClick={() => setNovoChamadoAnexo(null)}
                                                    className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full text-slate-400 hover:text-red-500 transition-colors"
                                                >
                                                    <span className="material-symbols-rounded text-lg">close</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-rounded">send</span>
                                    Enviar Chamado
                                </button>
                            </form>
                        </div>
                    ) : activeTab === 'almoxarifado' ? (
                        <Almoxarifado />
                    ) : (
                        <div className="p-6">
                            {historico.length > 0 ? (
                                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider">
                                                <th className="p-4 w-16 text-center">ID</th>
                                                <th className="p-4">Prioridade</th>
                                                <th className="p-4 w-40">Status</th>
                                                <th className="p-4">Categoria</th>
                                                <th className="p-4 w-1/3">Título</th>
                                                <th className="p-4 text-center">Data</th>
                                                <th className="p-4 text-center">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                                            {historico.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item) => (
                                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                    <td className="p-4 text-center font-bold text-slate-400 relative">
                                                        <div className="flex items-center justify-center gap-1">
                                                            {updatedIds.includes(Number(item.id)) && (
                                                                <span className="flex h-2 w-2 relative -mr-1">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                                                </span>
                                                            )}
                                                            #{item.id}
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${getPriorityColor(item.prioridade)}`}>
                                                            {item.prioridade}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap
                                                            ${item.status === 'Em Aberto' || item.status === 'Aberto'
                                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30'
                                                                : item.status === 'Em Andamento'
                                                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30'
                                                                    : item.status === 'Fechado'
                                                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30'
                                                                        : 'bg-slate-100 text-slate-600'
                                                            }`}>
                                                            {item.status || 'Em Aberto'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="material-symbols-rounded text-lg text-slate-400">category</span>
                                                            {item.categoria}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 font-semibold text-slate-800 dark:text-white">
                                                        {item.titulo}
                                                    </td>
                                                    <td className="p-4 text-center text-slate-500 dark:text-slate-400">
                                                        {new Date(item.data_abertura).toLocaleDateString('pt-BR')}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedChamado(item);
                                                                if (onClearId) onClearId(Number(item.id));
                                                            }}
                                                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-all relative"
                                                            title="Ver Detalhes"
                                                        >
                                                            <span className="material-symbols-rounded">visibility</span>
                                                            {updatedIds.includes(Number(item.id)) && (
                                                                <span className="absolute top-1 right-1 h-2 w-2 bg-blue-500 rounded-full border border-white"></span>
                                                            )}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {/* Pagination Controls */}
                                    {historico.length > itemsPerPage && (
                                        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                                                Página {currentPage} de {Math.ceil(historico.length / itemsPerPage)}
                                            </span>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                    disabled={currentPage === 1}
                                                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 shadow-sm"
                                                >
                                                    Anterior
                                                </button>
                                                <button
                                                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(historico.length / itemsPerPage), p + 1))}
                                                    disabled={currentPage === Math.ceil(historico.length / itemsPerPage)}
                                                    className="px-3 py-1.5 bg-blue-600 border border-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md shadow-blue-600/20"
                                                >
                                                    Próxima
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-80 text-center">
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                                        <span className="material-symbols-rounded text-3xl text-slate-400 dark:text-slate-500">history</span>
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">Nenhum chamado salvo</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                                        Seus chamados salvos aparecerão nesta tabela.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChamadoModal;
