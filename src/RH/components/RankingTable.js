import React, { useState } from "react";
import ScoreBadge from "./ScoreBadge";
import CandidateModal from "./CandidateModal";

const RankingTable = ({ jobTitle, candidates, totalCandidates, analysisTime, onReset }) => {
  const [expandedId, setExpandedId] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleExportCSV = () => {
    const headers = ["Rank", "Nome", "Cargo Atual", "Score", "Status", "Email"];
    const rows = candidates.map((c, index) => [
      index + 1,
      c.name,
      c.role,
      c.score,
      c.status,
      c.email,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `recruitai_${jobTitle.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleViewDetails = (candidate) => {
    setSelectedCandidate(candidate);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {jobTitle || "Vaga de Emprego"}
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              {totalCandidates} currículos analisados em {analysisTime} segundos
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-rounded text-lg">download</span>
              <span>Exportar Relatório (CSV)</span>
            </button>
            {onReset && (
              <button
                onClick={onReset}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-rounded text-lg">refresh</span>
                <span>Nova Análise</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Ranking Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Candidato
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Score
                </th>
                {/* Coluna Resumo oculta temporariamente */}
                {/* <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Resumo
                </th> */}
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Skills
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {candidates.map((candidate, index) => (
                <React.Fragment key={candidate.id}>
                  <tr
                    className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${
                      index < 3 ? "bg-green-50/30 dark:bg-green-900/10" : ""
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <span className="material-symbols-rounded text-yellow-500 text-xl">
                            emoji_events
                          </span>
                        )}
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          {index + 1}º
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold">
                          {candidate.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white">
                            {candidate.name}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {candidate.role}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <ScoreBadge score={candidate.score} />
                    </td>
                    {/* Coluna Resumo oculta temporariamente */}
                    {/* <td className="px-6 py-4">
                      <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md">
                        {candidate.matchSummary}
                      </p>
                    </td> */}
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {candidate.skills?.slice(0, 3).map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs rounded-md font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                        {candidate.skills?.length > 3 && (
                          <span className="px-2 py-1 text-slate-500 dark:text-slate-400 text-xs">
                            +{candidate.skills.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewDetails(candidate)}
                          className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Ver Detalhes"
                        >
                          <span className="material-symbols-rounded">visibility</span>
                        </button>
                        <button
                          onClick={() => toggleExpand(candidate.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                          title="Expandir Análise"
                        >
                          <span
                            className={`material-symbols-rounded transition-transform ${
                              expandedId === candidate.id ? "rotate-180" : ""
                            }`}
                          >
                            expand_more
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Expanded Row */}
                  {expandedId === candidate.id && (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 bg-slate-50 dark:bg-slate-700/30">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Pontos Fortes */}
                          <div>
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
                          <div>
                            <h4 className="font-bold text-orange-700 dark:text-orange-400 mb-3 flex items-center gap-2">
                              <span className="material-symbols-rounded">warning</span>
                              Pontos de Atenção
                            </h4>
                            <ul className="space-y-2">
                              {candidate.cons.map((con, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
                                >
                                  <span className="material-symbols-rounded text-orange-500 text-base mt-0.5">
                                    info
                                  </span>
                                  <span>{con}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
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

export default RankingTable;
