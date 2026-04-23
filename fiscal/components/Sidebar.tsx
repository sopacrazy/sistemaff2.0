import React from 'react';
import { FileSearch, History, Settings, ShieldCheck, LayoutDashboard, Search } from 'lucide-react';
import { SidebarItem, ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const items: SidebarItem[] = [
    { id: ViewState.DASHBOARD, label: 'Visão Geral', icon: <LayoutDashboard size={20} /> },
    { id: ViewState.CONSULTATION, label: 'Consultar Vendas', icon: <Search size={20} /> },
    { id: ViewState.FISCAL_AUDIT, label: 'Auditoria Manual', icon: <FileSearch size={20} /> },
    { id: ViewState.HISTORY, label: 'Histórico de Logs', icon: <History size={20} /> },
    { id: ViewState.SETTINGS, label: 'Configurações', icon: <Settings size={20} /> },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0 z-20 shadow-xl transition-all duration-300">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="bg-emerald-600 p-2 rounded-lg">
           <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold tracking-tight leading-tight">FiscalFF</span>
          <span className="text-xs text-slate-400 font-medium">Portal Contábil</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
              currentView === item.id
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className={`${currentView === item.id ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
              {item.icon}
            </span>
            <span className="font-medium text-sm">{item.label}</span>
            {currentView === item.id && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-sm"></div>
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800 rounded-xl p-4 flex items-center gap-3 border border-slate-700">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-xs font-bold">
            JS
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium truncate">João Silva</span>
            <span className="text-xs text-slate-400 truncate">Contador Admin</span>
          </div>
        </div>
      </div>
    </aside>
  );
};