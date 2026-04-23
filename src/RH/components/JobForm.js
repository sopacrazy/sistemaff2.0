import React from "react";

const JobForm = ({
  jobDescription,
  setJobDescription,
  onAnalyze,
  isAnalyzing,
}) => {
  return (
    <div className="space-y-6">
      {/* Job Description Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg">
            <span className="material-symbols-rounded text-indigo-600 dark:text-indigo-400">
              description
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">
            Descrição da Vaga
          </h3>
        </div>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Cole aqui os requisitos técnicos, competências desejadas e responsabilidades da vaga..."
          className="w-full h-48 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all dark:text-white resize-none"
        />
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <span className="material-symbols-rounded text-blue-600 dark:text-blue-400 text-2xl">
            info
          </span>
          <div>
            <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-1">
              Análise de Currículos da Pasta Local
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              O sistema irá ler automaticamente todos os arquivos PDF da pasta configurada no servidor e analisá-los com IA.
            </p>
          </div>
        </div>
      </div>

      {/* Analyze Button */}
      <div className="flex justify-center">
        <button
          onClick={onAnalyze}
          disabled={isAnalyzing || !jobDescription.trim()}
          className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
        >
          {isAnalyzing ? (
            <>
              <span className="material-symbols-rounded animate-spin">refresh</span>
              <span>Analisando Candidatos...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-rounded">auto_awesome</span>
              <span>Analisar Candidatos da Pasta Local</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default JobForm;
