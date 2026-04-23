const ActionCard = ({ title, icon: Icon, color, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled} // permite desabilitar se necessário
    className={`relative overflow-hidden group p-4 h-28 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all duration-300 text-left w-full flex flex-col justify-between ${
      disabled 
        ? "bg-slate-100 dark:bg-slate-800 opacity-50 cursor-not-allowed" 
        : "bg-white dark:bg-slate-800 cursor-pointer hover:-translate-y-1"
    }`}
  >
    <div
      className={`p-2 rounded-xl w-fit ${color} text-white shadow-md group-hover:shadow-lg transition-all`}
    >
      <Icon sx={{ fontSize: 24 }} />
    </div>
    <div className="z-10">
       <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 transition-colors uppercase tracking-wide">
        {title}
      </h3>
    </div>
    {/* Ícone de fundo decorativo */}
    <div className="absolute -bottom-6 -right-6 text-slate-100 dark:text-slate-700/50 opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all duration-500 pointer-events-none">
      <Icon sx={{ fontSize: 90 }} />
    </div>
  </button>
);

export default ActionCard;
