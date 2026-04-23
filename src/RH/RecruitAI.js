import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import JobForm from "./components/JobForm";
import RankingTable from "./components/RankingTable";
import { API_BASE_URL } from "../utils/apiConfig";

const RecruitAI = () => {
  const navigate = useNavigate();
  const [jobDescription, setJobDescription] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [analysisTime, setAnalysisTime] = useState(0);

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      alert("Por favor, insira a descrição da vaga.");
      return;
    }

    setIsAnalyzing(true);
    const startTime = Date.now();
    
    try {
      // Busca o token de autenticação
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      if (!token) {
        alert("Sessão expirada. Por favor, faça login novamente.");
        navigate("/login");
        return;
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/rh/rank-candidates`,
        {
          descricao_vaga: jobDescription,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const elapsedTime = Math.round((Date.now() - startTime) / 1000);
      setAnalysisTime(elapsedTime);

      // Extrai título da vaga (primeira linha)
      const firstLine = jobDescription.split("\n")[0].trim();
      setJobTitle(firstLine || "Vaga de Emprego");

      // Transforma os dados da API para o formato esperado pelo RankingTable
      const formattedCandidates = response.data.candidatos.map((cand, index) => ({
        id: index + 1,
        name: cand.nome_candidato || `Candidato ${index + 1}`,
        role: "Candidato",
        score: cand.match_score || 0,
        matchSummary: cand.justificativa || "Análise realizada pela IA",
        pros: cand.pontos_fortes && cand.pontos_fortes.length > 0 ? cand.pontos_fortes : (cand.justificativa ? [cand.justificativa] : []),
        cons: cand.pontos_atencao && cand.pontos_atencao.length > 0 ? cand.pontos_atencao : [],
        status: cand.match_score >= 90 ? "interview" : cand.match_score >= 70 ? "hold" : "rejected",
        experienceYears: cand.informacoes_completas?.experiencia ? 
          parseInt(cand.informacoes_completas.experiencia.match(/\d+/)?.[0] || "0") : 0,
        email: cand.informacoes_completas?.email || "",
        telefone: cand.informacoes_completas?.telefone || "",
        endereco: cand.informacoes_completas?.endereco || "",
        formacao: cand.informacoes_completas?.formacao || "",
        cursos: cand.informacoes_completas?.cursos || [],
        habilidades: cand.informacoes_completas?.habilidades || [],
        resumo: cand.informacoes_completas?.resumo || "",
        textoCompleto: cand.texto_completo || "",
        skills: cand.informacoes_completas?.habilidades || [],
        arquivo: cand.arquivo || null, // Nome do arquivo PDF
      }));

      setCandidates(formattedCandidates);
      setAnalysisComplete(true);
    } catch (error) {
      console.error("Erro ao analisar candidatos:", error);
      console.error("Detalhes do erro:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      let errorMessage = "Erro ao analisar candidatos.";
      
      // Se o erro for relacionado a token expirado e não há refresh token, não mostra alerta
      // (o interceptor já redirecionou para login)
      if (error.message?.includes("Refresh token não encontrado")) {
        // Não mostra alerta, o interceptor já redirecionou
        return;
      }
      
      if (error.response?.status === 401) {
        errorMessage = "Sessão expirada. Por favor, faça login novamente.";
        navigate("/login");
      } else if (error.response?.status === 403) {
        // Se for token expirado, tenta renovar (o interceptor cuida disso)
        if (error.response?.data?.details?.includes("jwt expired") || 
            error.response?.data?.error?.includes("expired")) {
          errorMessage = "Token expirado. Tentando renovar...";
          // O interceptor vai tentar renovar automaticamente
          return; // Não mostra alerta, deixa o interceptor tentar renovar
        }
        errorMessage = error.response?.data?.error || error.response?.data?.message || "Acesso negado. Verifique suas permissões.";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setJobDescription("");
    setCandidates([]);
    setAnalysisComplete(false);
    setJobTitle("");
    setAnalysisTime(0);
  };

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
                onClick={() => navigate("/")}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                <span className="material-symbols-rounded text-2xl">arrow_back</span>
              </button>
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-tr from-indigo-600 to-purple-500 h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                  <span className="material-symbols-rounded text-2xl">work</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold leading-tight text-slate-800 dark:text-white">
                    RecruitAI
                  </h1>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    Triagem Inteligente de Currículos
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/rh/candidatos")}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors font-medium text-sm flex items-center gap-2"
              >
                <span className="material-symbols-rounded text-lg">people</span>
                <span>Banco de Talentos</span>
              </button>
              {analysisComplete && (
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium text-sm"
                >
                  Nova Análise
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {!analysisComplete ? (
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
                Recrutamento Inteligente
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                Poupe centenas de horas de triagem manual. Deixe nossa IA analisar e ranquear os melhores candidatos para suas vagas em segundos.
              </p>
            </div>

            {/* Job Form */}
            <JobForm
              jobDescription={jobDescription}
              setJobDescription={setJobDescription}
              onAnalyze={handleAnalyze}
              isAnalyzing={isAnalyzing}
            />
          </div>
        ) : (
          <RankingTable
            jobTitle={jobTitle}
            candidates={candidates}
            totalCandidates={candidates.length}
            analysisTime={analysisTime.toString()}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
};

export default RecruitAI;
