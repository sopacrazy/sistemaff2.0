import React, { useState } from "react";
import ScoreBadge from "./ScoreBadge";
import { API_BASE_URL } from "../../utils/apiConfig";

const CandidateModal = ({ isOpen, onClose, candidate }) => {
  const [showFullInfo, setShowFullInfo] = useState(false);
  
  if (!isOpen || !candidate) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-800">
          <div className="flex items-center gap-4">
            {/* Avatar com inicial */}
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-2xl shadow-md">
              {candidate.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-xl text-slate-800 dark:text-white">
                {candidate.name}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {candidate.role}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {candidate.arquivo && (
              <a
                href={`${API_BASE_URL}/api/rh/candidato-pdf/${encodeURIComponent(candidate.arquivo)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <span className="material-symbols-rounded text-lg">description</span>
                <span>Abrir PDF</span>
              </a>
            )}
            <button
              onClick={() => setShowFullInfo(!showFullInfo)}
              className="px-4 py-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <span className="material-symbols-rounded text-lg">
                {showFullInfo ? "visibility_off" : "visibility"}
              </span>
              <span>{showFullInfo ? "Ocultar" : "Ver"} Informações Completas</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <span className="material-symbols-rounded text-2xl">close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Score Section */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                Match Score
              </p>
              <ScoreBadge score={candidate.score} />
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                Status
              </p>
              <span
                className={`px-3 py-1 rounded-full text-sm font-bold ${
                  candidate.status === "interview"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : candidate.status === "hold"
                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }`}
              >
                {candidate.status === "interview"
                  ? "Entrevista"
                  : candidate.status === "hold"
                  ? "Em Espera"
                  : "Rejeitado"}
              </span>
            </div>
          </div>

          {/* Summary */}
          <div>
            <h4 className="font-bold text-slate-800 dark:text-white mb-2">
              Resumo da Análise
            </h4>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {candidate.matchSummary}
            </p>
          </div>

          {/* Pros and Cons Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pontos Fortes */}
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
              <h4 className="font-bold text-green-700 dark:text-green-400 mb-3 flex items-center gap-2">
                <span className="material-symbols-rounded">check_circle</span>
                Pontos Fortes
              </h4>
              <ul className="space-y-2">
                {candidate.pros.map((pro, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
                  >
                    <span className="material-symbols-rounded text-green-500 text-base mt-0.5">
                      check
                    </span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pontos de Atenção */}
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
              <h4 className="font-bold text-orange-700 dark:text-orange-400 mb-3 flex items-center gap-2">
                <span className="material-symbols-rounded">warning</span>
                Pontos de Atenção
              </h4>
              {candidate.cons && candidate.cons.length > 0 ? (
                <ul className="space-y-2">
                  {candidate.cons.map((con, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
                    >
                      <span className="material-symbols-rounded text-orange-500 text-base mt-0.5 flex-shrink-0">
                        info
                      </span>
                      <span>{con}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                  Nenhum ponto de atenção identificado.
                </p>
              )}
            </div>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">
                Experiência
              </p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {candidate.experienceYears} anos
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">
                Email
              </p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {candidate.email}
              </p>
            </div>
          </div>

          {/* Skills */}
          {candidate.skills && candidate.skills.length > 0 && (
            <div>
              <h4 className="font-bold text-slate-800 dark:text-white mb-3">
                Competências
              </h4>
              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Informações Completas do Candidato */}
          {showFullInfo && (
            <div className="pt-6 border-t border-slate-200 dark:border-slate-700 space-y-4">
              <h4 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2">
                <span className="material-symbols-rounded text-indigo-600 dark:text-indigo-400">
                  person
                </span>
                Informações Completas do Candidato
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contato */}
                <div className="space-y-3">
                  <h5 className="font-semibold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider">
                    Contato
                  </h5>
                  {candidate.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="material-symbols-rounded text-slate-400 text-lg">
                        email
                      </span>
                      <a
                        href={`mailto:${candidate.email}`}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        {candidate.email}
                      </a>
                    </div>
                  )}
                  {candidate.telefone && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="material-symbols-rounded text-slate-400 text-lg">
                        phone
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {candidate.telefone}
                      </span>
                    </div>
                  )}
                  {candidate.endereco && (
                    <div className="flex items-start gap-2 text-sm">
                      <span className="material-symbols-rounded text-slate-400 text-lg mt-0.5">
                        location_on
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {candidate.endereco}
                      </span>
                    </div>
                  )}
                </div>

                {/* Formação e Experiência */}
                <div className="space-y-3">
                  <h5 className="font-semibold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider">
                    Formação & Experiência
                  </h5>
                  {candidate.formacao && (
                    <div className="flex items-start gap-2 text-sm">
                      <span className="material-symbols-rounded text-slate-400 text-lg mt-0.5">
                        school
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {candidate.formacao}
                      </span>
                    </div>
                  )}
                  {candidate.experienceYears > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="material-symbols-rounded text-slate-400 text-lg">
                        work
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {candidate.experienceYears} {candidate.experienceYears === 1 ? "ano" : "anos"} de experiência
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Resumo/Objetivo */}
              {candidate.resumo && (
                <div className="mt-4">
                  <h5 className="font-semibold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider mb-2">
                    Resumo Profissional
                  </h5>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                    {candidate.resumo}
                  </p>
                </div>
              )}

              {/* Cursos Adicionais */}
              {candidate.cursos && candidate.cursos.length > 0 && (
                <div className="mt-4">
                  <h5 className="font-semibold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider mb-2">
                    Cursos Adicionais
                  </h5>
                  <ul className="space-y-2">
                    {candidate.cursos.map((curso, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg"
                      >
                        <span className="material-symbols-rounded text-indigo-500 text-base mt-0.5 flex-shrink-0">
                          school
                        </span>
                        <span className="flex-1">{curso}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Texto Completo do PDF (colapsável) */}
              {candidate.textoCompleto && (
                <div className="mt-4">
                  <details className="group">
                    <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider flex items-center gap-2 list-none">
                      <span className="material-symbols-rounded text-slate-400 text-lg group-open:rotate-90 transition-transform">
                        chevron_right
                      </span>
                      <span>Texto Completo do Currículo</span>
                    </summary>
                    <div className="mt-3 p-6 bg-slate-50 dark:bg-slate-700/50 rounded-lg max-h-96 overflow-y-auto">
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        {candidate.textoCompleto.split("\n").map((paragrafo, idx) => {
                          const linha = paragrafo.trim();
                          if (!linha) return <br key={idx} />;
                          
                          // Identifica seções principais (títulos)
                          const isTitulo = linha === linha.toUpperCase() && linha.length < 50 && 
                                           !linha.includes("@") && !linha.match(/\(\d{2}\)/);
                          const isSubtitulo = linha.endsWith(":") && linha.length < 40;
                          
                          if (isTitulo) {
                            return (
                              <h3 key={idx} className="font-bold text-slate-800 dark:text-slate-200 mt-4 mb-2 text-base uppercase tracking-wide">
                                {linha}
                              </h3>
                            );
                          } else if (isSubtitulo) {
                            return (
                              <h4 key={idx} className="font-semibold text-slate-700 dark:text-slate-300 mt-3 mb-1 text-sm">
                                {linha}
                              </h4>
                            );
                          } else {
                            return (
                              <p key={idx} className="text-sm text-slate-600 dark:text-slate-400 mb-2 leading-relaxed">
                                {linha}
                              </p>
                            );
                          }
                        })}
                      </div>
                    </div>
                  </details>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CandidateModal;
