import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { getDataTrabalho, setDataTrabalho } from '../utils/dataTrabalho';

const AppHeader = ({
  title,
  subtitle,
  icon = 'SF',
  iconGradient = 'from-green-600 to-emerald-400',
  iconShadow = 'shadow-green-600/20',
  onBack,
  canChangeLocal = false,
  onLocalClick,
  userMenuItems = [],
  localValue,
  usernameValue,
}) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [username, setUsername] = useState('');
  const [local, setLocal] = useState('');
  const [date, setDate] = useState(() => {
    const stored = getDataTrabalho();
    return stored ? new Date(stored + 'T12:00:00') : new Date();
  });
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [tempDate, setTempDate] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const storedUser = sessionStorage.getItem('username') || localStorage.getItem('username') || '';
    const storedLocal = sessionStorage.getItem('origem') || localStorage.getItem('origem') || sessionStorage.getItem('local') || localStorage.getItem('local') || '';
    setUsername(storedUser);
    setLocal(storedLocal);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('permissoes');
    localStorage.removeItem('origem');
    sessionStorage.clear();
    navigate('/login');
  };

  const openDateModal = () => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    setTempDate(localDate.toISOString().split('T')[0]);
    setIsDateModalOpen(true);
  };

  const saveDate = () => {
    if (!tempDate) return;
    setDataTrabalho(tempDate);
    const [y, m, d] = tempDate.split('-');
    setDate(new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0));
    setIsDateModalOpen(false);
    window.location.reload();
  };

  const handleLocalClick = () => {
    if (canChangeLocal && onLocalClick) {
      onLocalClick();
    } else if (!canChangeLocal) {
      alert('Para alterar o local, volte ao Painel de Controle (Home).');
    }
  };

  const handleBack = () => {
    if (typeof onBack === 'string') navigate(onBack);
    else if (typeof onBack === 'function') onBack();
  };

  return (
    <>
      {isDateModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">Alterar Data</h3>
              <button onClick={() => setIsDateModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Data de Trabalho:</label>
              <input
                type="date"
                value={tempDate}
                onChange={(e) => setTempDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-green-500 outline-none transition-all dark:text-white dark:[color-scheme:dark]"
              />
              <button
                onClick={saveDate}
                className="mt-6 w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-600/20"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-slate-700/50 px-6 py-3 flex items-center justify-between">

            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  onClick={handleBack}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400 mr-1"
                  title="Voltar"
                >
                  <span className="material-symbols-rounded">arrow_back</span>
                </button>
              )}
              <div className={`bg-gradient-to-tr ${iconGradient} h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg ${iconShadow}`}>
                {icon === 'SF'
                  ? <span className="font-bold text-xl italic tracking-tighter">SF</span>
                  : <span className="material-symbols-rounded">{icon}</span>
                }
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight text-slate-800 dark:text-white">{title}</h1>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{subtitle}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={openDateModal}
                className="hidden md:flex items-center gap-2 mr-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 px-3 py-2 rounded-xl transition-all cursor-pointer group border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
                title="Clique para alterar a data"
              >
                <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-1.5 rounded-lg">
                  <span className="material-symbols-rounded text-lg">calendar_today</span>
                </div>
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{date.toLocaleDateString('pt-BR')}</span>
                </div>
              </button>

              <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 hidden md:block"></div>

              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-bold text-slate-800 dark:text-white">{usernameValue || username || 'Usuário'}</span>
                  <button
                    onClick={handleLocalClick}
                    className={`text-[10px] font-bold text-white px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                      canChangeLocal
                        ? 'bg-slate-800 dark:bg-slate-600 hover:bg-green-600 cursor-pointer'
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    LOCAL: {localValue || local}
                    <span className="material-symbols-rounded text-[10px]">{canChangeLocal ? 'edit' : 'lock'}</span>
                  </button>
                </div>

                {userMenuItems.length > 0 ? (
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 border-2 border-white dark:border-slate-600 flex items-center justify-center shadow-sm hover:shadow-md hover:scale-105 transition-all cursor-pointer"
                      title="Menu do usuário"
                    >
                      <span className="material-symbols-rounded text-slate-500 dark:text-slate-300">person</span>
                    </button>
                    {isUserMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                        {userMenuItems.map((item, i) => (
                          <button
                            key={i}
                            onClick={() => { item.onClick(); setIsUserMenuOpen(false); }}
                            className={`w-full px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 ${i < userMenuItems.length - 1 ? 'border-b border-slate-100 dark:border-slate-700' : ''}`}
                          >
                            <span className="material-symbols-rounded text-lg text-slate-500 dark:text-slate-400">{item.icon}</span>
                            <span>{item.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 border-2 border-white dark:border-slate-600 flex items-center justify-center shadow-sm">
                    <span className="material-symbols-rounded text-slate-500 dark:text-slate-300">person</span>
                  </div>
                )}
              </div>

              <button
                onClick={toggleTheme}
                className="ml-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-600 dark:text-slate-300 border border-transparent hover:border-slate-300 dark:hover:border-slate-500"
                title={theme === 'light' ? 'Mudar para Escuro' : 'Mudar para Claro'}
              >
                <span className="material-symbols-rounded text-xl">
                  {theme === 'light' ? 'dark_mode' : 'light_mode'}
                </span>
              </button>

              <button
                onClick={handleLogout}
                className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-all border border-transparent hover:border-red-200 dark:hover:border-red-800"
                title="Sair do Sistema"
              >
                <span className="material-symbols-rounded text-xl">logout</span>
              </button>
            </div>

          </div>
        </div>
      </header>
    </>
  );
};

export default AppHeader;
