import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../../utils/apiConfig";
import CandidateModal from "./CandidateModal";

const CandidatesPage = () => {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, []);

  useEffect(() => {
    // Filtra candidatos baseado na busca
    if (!searchTerm.trim()) {
      setFilteredCandidates(candidates);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = candidates.filter(
        (candidate) =>
          candidate.nome?.toLowerCase().includes(term) ||
          candidate.cargo_atual?.toLowerCase().includes(term) ||
          candidate.skills?.some((skill) =>
            skill.toLowerCase().includes(term)
          ) ||
          candidate.email?.toLowerCase().includes(term)
      );
      setFilteredCandidates(filtered);
    }
  }, [searchTerm, candidates]);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      // Busca o token de autenticação
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      if (!token) {
        alert("Sessão expirada. Por favor, faça login novamente.");
        navigate("/login");
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/api/rh/candidates`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.data.success) {
        setCandidates(response.data.candidatos || []);
        setFilteredCandidates(response.data.candidatos || []);
      }
    } catch (error) {
      console.error("Erro ao buscar candidatos:", error);
      console.error("Detalhes do erro:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      if (error.response?.status === 401) {
        alert("Sessão expirada. Por favor, faça login novamente.");
        navigate("/login");
      } else if (error.response?.status === 403) {
        const errorMessage = error.response?.data?.message || error.response?.data?.error || "Você não tem permissão para acessar o Banco de Talentos.";
        alert(errorMessage + "\n\nEntre em contato com o administrador para solicitar a permissão 'RH' no Gerenciador de Acessos.");
        navigate("/");
      } else {
        alert("Erro ao carregar candidatos. Verifique se há PDFs na pasta configurada.\n\n" + (error.response?.data?.error || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = (candidate) => {
    // Converte o formato do candidato para o formato esperado pelo modal
    const candidateForModal = {
      id: candidate.id,
      name: candidate.nome,
      role: candidate.cargo_atual,
      email: candidate.email,
      experienceYears: candidate.anos_experiencia,
      skills: candidate.skills || [],
      matchSummary: candidate.resumo || "",
      pros: [],
      cons: [],
      status: "hold",
      score: 0,
      arquivo: candidate.arquivo,
      textoCompleto: "",
    };
    setSelectedCandidate(candidateForModal);
    setIsModalOpen(true);
  };

  // Loading Skeleton
  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, index) => (
        <div
          key={index}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 animate-pulse"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="h-16 w-16 rounded-full bg-slate-200 dark:bg-slate-700"></div>
            <div className="flex-1">
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
            </div>
          </div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6 mb-4"></div>
          <div className="flex gap-2 mb-4">
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
          </div>
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300 pb-20">
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0"
        rel="stylesheet"
      />

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/rh/recruitai")}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                <span className="material-symbols-rounded text-2xl">arrow_back</span>
              </button>
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-tr from-indigo-600 to-purple-500 h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                  <span className="material-symbols-rounded text-2xl">people</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold leading-tight text-slate-800 dark:text-white">
                    Banco de Talentos
                  </h1>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    Gerencie todos os candidatos salvos
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Buscar por nome ou habilidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <button
                onClick={fetchCandidates}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                <span className="material-symbols-rounded">refresh</span>
                <span>Atualizar</span>
              </button>
            </div>
            {searchTerm && (
              <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                {filteredCandidates.length} candidato(s) encontrado(s)
              </div>
            )}
          </div>
        </div>

        {/* Candidates Grid */}
        {loading ? (
          <LoadingSkeleton />
        ) : filteredCandidates.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
            <span className="material-symbols-rounded text-6xl text-slate-300 dark:text-slate-600 mb-4">
              person_off
            </span>
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
              {searchTerm ? "Nenhum candidato encontrado" : "Nenhum candidato cadastrado"}
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              {searchTerm
                ? "Tente buscar com outros termos"
                : "Adicione arquivos PDF na pasta de candidatos para começar"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition-all duration-200"
              >
                {/* Header do Card */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-2xl shadow-md">
                    {candidate.nome?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white truncate">
                      {candidate.nome || "Candidato"}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                      {candidate.cargo_atual || "Não informado"}
                    </p>
                  </div>
                </div>

                {/* Badge de Experiência */}
                {candidate.anos_experiencia > 0 && (
                  <div className="mb-4">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold">
                      <span className="material-symbols-rounded text-sm">work</span>
                      {candidate.anos_experiencia} {candidate.anos_experiencia === 1 ? "ano" : "anos"} de experiência
                    </span>
                  </div>
                )}

                {/* Resumo */}
                {candidate.resumo && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 line-clamp-3">
                    {candidate.resumo}
                  </p>
                )}

                {/* Skills */}
                {candidate.skills && candidate.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {candidate.skills.slice(0, 3).map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-md font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                    {candidate.skills.length > 3 && (
                      <span className="px-2 py-1 text-slate-500 dark:text-slate-400 text-xs">
                        +{candidate.skills.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Footer do Card */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  {candidate.email && (
                    <div className="flex items-center gap-2 mb-3 text-sm text-slate-600 dark:text-slate-400">
                      <span className="material-symbols-rounded text-lg">email</span>
                      <span className="truncate">{candidate.email}</span>
                    </div>
                  )}
                  <button
                    onClick={() => handleViewProfile(candidate)}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-rounded text-lg">visibility</span>
                    <span>Ver Perfil</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Candidate Modal */}
      <CandidateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        candidate={selectedCandidate}
      />
    </div>
  );
};

export default CandidatesPage;
