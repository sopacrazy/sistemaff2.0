import React from 'react';
import { ViewState } from '../types';
import { 
  AlertTriangle, 
  FileWarning, 
  ArrowRight, 
  DollarSign, 
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface DashboardProps {
  onChangeView: (view: ViewState) => void;
}

// Mock Data simulating a local database query
const MOCK_PENDING_ORDERS = [
  { id: 'ORD-2024-889', customer: 'Mercado Silva & Filhos', date: '2024-03-14', value: 1250.00, status: 'Sem Nota' },
  { id: 'ORD-2024-892', customer: 'Padaria Central', date: '2024-03-15', value: 450.50, status: 'Erro Sefaz' },
  { id: 'ORD-2024-901', customer: 'Restaurante Sabor Mineiro', date: '2024-03-16', value: 3200.00, status: 'Sem Nota' },
  { id: 'ORD-2024-905', customer: 'Oficina do Zé', date: '2024-03-16', value: 890.00, status: 'Sem Nota' },
  { id: 'ORD-2024-910', customer: 'Farmácia Vida Nova', date: '2024-03-17', value: 150.00, status: 'Pendente' },
];

export const Dashboard: React.FC<DashboardProps> = ({ onChangeView }) => {
  const totalPendingValue = MOCK_PENDING_ORDERS.reduce((acc, curr) => acc + curr.value, 0);
  const totalCount = MOCK_PENDING_ORDERS.length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Visão Geral Fiscal</h1>
          <p className="text-slate-500 mt-1">
            Monitoramento em tempo real de pendências fiscais (Banco de Dados Local).
          </p>
        </div>
        <button 
          onClick={() => onChangeView(ViewState.FISCAL_AUDIT)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2"
        >
          <FileWarning className="w-4 h-4" />
          Auditar Novos Arquivos
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Critical Card */}
        <div className="bg-white p-6 rounded-xl border-l-4 border-red-500 shadow-sm flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Pedidos sem Nota</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">{totalCount}</h3>
            <p className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Ação Imediata Necessária
            </p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg text-red-600">
            <FileWarning className="w-6 h-6" />
          </div>
        </div>

        {/* Financial Impact */}
        <div className="bg-white p-6 rounded-xl border-l-4 border-orange-400 shadow-sm flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Risco Fiscal (Valor)</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">
              R$ {totalPendingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-orange-600 mt-1 font-medium">
              Faturamento pendente de regularização
            </p>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg text-orange-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Compliance Rate */}
        <div className="bg-white p-6 rounded-xl border-l-4 border-emerald-500 shadow-sm flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Taxa de Conformidade</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">94.2%</h3>
            <p className="text-xs text-emerald-600 mt-1 font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              +2.4% vs mês anterior
            </p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Alert List Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-slate-800">Alertas Recentes: Vendas sem Nota</h3>
          </div>
          <button className="text-sm text-emerald-600 font-medium hover:text-emerald-800 flex items-center gap-1">
            Ver Todos <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">ID Pedido</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4 text-right">Valor (R$)</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_PENDING_ORDERS.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 font-mono text-xs text-slate-500">{order.id}</td>
                  <td className="px-6 py-3">{order.date}</td>
                  <td className="px-6 py-3 font-medium text-slate-900">{order.customer}</td>
                  <td className="px-6 py-3 text-right font-medium">
                    {order.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      order.status === 'Sem Nota' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <button className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 hover:underline">
                      Regularizar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-400 text-center">
          Dados sincronizados do banco de dados local às {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};