import React from "react";

const ScoreBadge = ({ score }) => {
  const getScoreColor = (score) => {
    if (score >= 90) return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400";
    if (score >= 70) return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400";
    return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400";
  };

  const getScoreIcon = (score) => {
    if (score >= 90) return "check_circle";
    if (score >= 70) return "warning";
    return "cancel";
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`px-3 py-1.5 rounded-full text-sm font-bold border ${getScoreColor(
          score
        )}`}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-rounded text-base">
            {getScoreIcon(score)}
          </span>
          <span>{score}%</span>
        </div>
      </div>
      {/* Progress Bar */}
      <div className="w-20 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            score >= 90
              ? "bg-green-500"
              : score >= 70
              ? "bg-yellow-500"
              : "bg-red-500"
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
};

export default ScoreBadge;
