import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { Table, ConfigProvider, Empty } from "antd"; // Manter AntD só para a Tabela Complexa
import ptBR from "antd/lib/locale/pt_BR";
import { getDataTrabalho, setDataTrabalho } from "./utils/dataTrabalho";
import { API_BASE_URL } from './utils/apiConfig';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement
);

// --- Componentes de UI Personalizados ---

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color, subtext }) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 flex items-start justify-between relative overflow-hidden group hover:shadow-lg transition-all duration-300">
    <div className="relative z-10">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
        {title}
      </p>
      <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">
        {value}
      </h3>
      {subtext && (
        <p className="text-xs text-slate-500 font-medium">{subtext}</p>
      )}
    </div>
    <div
      className={`p-3 rounded-2xl ${color} bg-opacity-10 dark:bg-opacity-20 text-white`}
    >
      <span
        className="material-symbols-rounded text-2xl"
        style={{ color: "inherit" }}
      >
        {icon}
      </span>
    </div>
    {/* Decor */}
    <div
      className={`absolute -bottom-4 -right-4 text-8xl opacity-5 group-hover:scale-110 transition-transform duration-500 ${color.replace(
        "bg-",
        "text-"
      )}`}
    >
      <span className="material-symbols-rounded">{icon}</span>
    </div>
  </div>
);

const FilterSelect = ({ value, onChange, options, placeholder, icon }) => (
  <div className="relative group">
    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-green-500 transition-colors pointer-events-none">
      <span className="material-symbols-rounded text-lg">{icon}</span>
    </div>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full pl-10 pr-8 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-gray-200 text-sm font-medium focus:ring-2 focus:ring-green-500/50 outline-none appearance-none transition-all shadow-sm"
    >
      <option value="">{placeholder}</option>
      {options.map((opt, i) => (
        <option key={i} value={opt.value || opt}>
          {opt.label || opt}
        </option>
      ))}
    </select>
    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
      <span className="material-symbols-rounded text-lg">expand_more</span>
    </div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();

  // --- States ---
  const [tipo, setTipo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [vendedor, setVendedor] = useState("");
  const [vendedores, setVendedores] = useState([]);
  const [tipoData, setTipoData] = useState([]);
  const [filteredMotivos, setFilteredMotivos] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [clientesData, setClientesData] = useState([]);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [loading, setLoading] = useState(false);

  // Theme State (Simulado, pegando do localStorage ou default)
  // --- Header States ---
  const [username, setUsername] = useState("");
  const [local, setLocal] = useState("08");
  // ⚡ Load initial date from storage
  const [date, setDate] = useState(() => {
    const stored = getDataTrabalho();
    return stored ? new Date(stored + "T12:00:00") : new Date();
  });
  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [tempLocal, setTempLocal] = useState("08");
  const [tempDate, setTempDate] = useState("");

  const isDark = document.documentElement.classList.contains("dark");

  // --- Header Logic ---
  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login");
  };
  const toggleDarkMode = () =>
    document.documentElement.classList.toggle("dark");
  // BLOQUEADO: Troca de local só permitida na página Home (Painel de Controle)
  const openLocalModal = () => {
    alert("Para alterar o local, volte ao Painel de Controle (Home).");
  };
  const saveLocal = () => {
    /* Bloqueado */
  };
  const openDateModal = () => {
    // Should default to currently selected date in the modal input
    const currentStr = date.toISOString().split("T")[0];
    setTempDate(currentStr);
    setIsDateModalOpen(true);
  };

  const saveDate = () => {
    if (!tempDate) return;
    // Persist to global storage
    setDataTrabalho(tempDate);

    // Update local state
    const [y, m, d] = tempDate.split("-");
    const newDate = new Date(y, m - 1, d, 12, 0, 0);
    setDate(newDate);
    setIsDateModalOpen(false);
  };

  useEffect(() => {
    const storedUser = sessionStorage.getItem("username");
    const storedLocal = sessionStorage.getItem("local");
    if (storedUser) setUsername(storedUser);
    if (storedLocal) setLocal(storedLocal);
    else sessionStorage.setItem("local", "08");
  }, []);

  // --- Data Fetching Logic (Adaptada) ---
  const aggregateMotivos = (data) => {
    return data.reduce((acc, item) => {
      const existing = acc.find((row) => row.motivo === item.motivo);
      if (existing) {
        existing.totalValue += Number(item.totalValue);
      } else {
        acc.push({ ...item, totalValue: Number(item.totalValue) });
      }
      return acc;
    }, []);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        tipo: tipo || null,
        motivo: motivo || null,
        vendedor: vendedor || null,
        startDate: dateRange.start || null,
        endDate: dateRange.end || null,
      };

      const [tipoRes, motivoRes, clienteRes, totalRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/dashboard/tipo`, { params }),
        axios.get(`${API_BASE_URL}/dashboard/motivo`, {
          params,
        }),
        axios.get(`${API_BASE_URL}/dashboard/cliente`, {
          params,
        }),
        axios.get(`${API_BASE_URL}/cliente/total`),
      ]);

      setTipoData(tipoRes.data);
      const aggregatedMotivos = aggregateMotivos(motivoRes.data);
      setFilteredMotivos(
        motivo
          ? aggregatedMotivos.filter((r) => r.motivo === motivo)
          : aggregatedMotivos
      );

      const clientesComTotal = clienteRes.data.map((cliente) => {
        const totalCliente = totalRes.data.find(
          (item) => item.cliente === cliente.cliente
        );
        return {
          ...cliente,
          totalValue: totalCliente ? totalCliente.soma_valor_total : 0,
        };
      });
      setClientesData(clientesComTotal);
    } catch (error) {
      console.error("Erro ao buscar dados dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, [tipo, motivo, vendedor, dateRange]);

  // Initial Fetches
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/dashboard/tipos`)
      .then((r) => setTipos(r.data))
      .catch(console.error);
    axios
      .get(`${API_BASE_URL}/vendedores`)
      .then((r) => setVendedores(r.data))
      .catch(console.error);
  }, []);

  // --- Calculations for Charts & KPIs ---
  const totalGeral = useMemo(() => {
    return tipoData.reduce(
      (acc, curr) => acc + Number(curr.totalValue || 0),
      0
    );
  }, [tipoData]);

  const totalOcorrencias = useMemo(() => {
    // Estimativa baseada nos dados disponíveis, assumindo que tipoData tem count ou somente valor
    // Se a API não retorna count, usamos 0 ou calculamos se possível.
    // Como a original não tinha count explícito na tabela, vamos focar no Valor.
    return 0;
  }, [tipoData]);

  const topMotivo = useMemo(() => {
    if (!filteredMotivos.length) return { motivo: "-", valor: 0 };
    return filteredMotivos.reduce((prev, current) =>
      prev.totalValue > current.totalValue ? prev : current
    );
  }, [filteredMotivos]);

  // Chart Data Configuration
  const barChartData = {
    labels: tipoData.map((d) => d.tipo),
    datasets: [
      {
        label: "Valor (R$)",
        data: tipoData.map((d) => d.totalValue),
        backgroundColor: "#10B981", // emerald-500
        borderRadius: 6,
      },
    ],
  };

  const doughnutChartData = {
    labels: filteredMotivos.map((d) => d.motivo),
    datasets: [
      {
        data: filteredMotivos.map((d) => d.totalValue),
        backgroundColor: [
          "#3B82F6",
          "#EF4444",
          "#F59E0B",
          "#10B981",
          "#6366F1",
          "#8B5CF6",
          "#EC4899",
        ],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: { usePointStyle: true, boxWidth: 8 },
      },
    },
    scales: {
      y: { grid: { display: false }, ticks: { display: false } },
      x: { grid: { display: false } },
    },
  };

  // Expanded Row Logic for AntD Table
  const ExpandedRow = ({ cliente, updateClienteTotal }) => {
    const [detalhes, setDetalhes] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(true);

    useEffect(() => {
      axios
        .get(`${API_BASE_URL}/cliente/detalhes`, {
          params: { cliente },
        })
        .then((res) => {
          setDetalhes(res.data.detalhes);
        })
        .finally(() => setLoadingDetails(false));
    }, [cliente]);

    if (loadingDetails)
      return (
        <div className="p-4 text-center text-slate-500">
          Carregando detalhes...
        </div>
      );

    return (
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-100 dark:bg-slate-700/50 rounded-lg">
            <tr>
              <th className="px-4 py-2 rounded-l-lg">Produto</th>
              <th className="px-4 py-2">Qtd</th>
              <th className="px-4 py-2">Valor Un.</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2 rounded-r-lg">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {detalhes.map((item, idx) => (
              <tr key={idx}>
                <td className="px-4 py-2 font-medium">{item.produto_nome}</td>
                <td className="px-4 py-2">
                  {item.quantidade} {item.produto_unidade}
                </td>
                <td className="px-4 py-2">
                  R${" "}
                  {Number(item.valor).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-300">
                  R${" "}
                  {(item.quantidade * item.valor).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {new Date(item.data).toLocaleDateString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const columns = [
    {
      title: "Cliente",
      dataIndex: "cliente",
      key: "cliente",
      className: "dark:text-white font-medium",
    },
    {
      title: "Valor Geral",
      dataIndex: "totalValue",
      key: "totalValue",
      align: "right",
      sorter: (a, b) => b.totalValue - a.totalValue,
      render: (v) => (
        <span className="font-bold text-green-600">
          R${" "}
          {Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0B1120] pb-20 font-sans transition-colors duration-300">
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0"
        rel="stylesheet"
      />

      {/* Modals Injetados */}
      <Modal
        isOpen={isLocalModalOpen}
        onClose={() => setIsLocalModalOpen(false)}
        title="Alterar Local"
      >
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Novo Local:
        </label>
        <div className="flex gap-2">
          <select
            value={tempLocal}
            onChange={(e) => setTempLocal(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-green-500 outline-none transition-all dark:text-white font-bold"
          >
            {[...Array(9)].map((_, i) => {
              const val = String(i + 1).padStart(2, "0");
              return (
                <option key={val} value={val}>
                  {val}
                </option>
              );
            })}
          </select>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Dica: 01 = Matriz, 08 = CD...
        </p>
        <button
          onClick={saveLocal}
          className="mt-6 w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-600/20"
        >
          Confirmar
        </button>
      </Modal>

      <Modal
        isOpen={isDateModalOpen}
        onClose={() => setIsDateModalOpen(false)}
        title="Alterar Data"
      >
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Data de Trabalho:
        </label>
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
      </Modal>

      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-green-400/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen dark:opacity-5"></div>
      </div>

      {/* Header Glass */}
      <header className="sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-slate-700/50 px-6 py-3 flex items-center justify-between">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate("/faturamento")}
            >
              <div className="bg-gradient-to-tr from-amber-500 to-orange-400 h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                <span className="material-symbols-rounded">bar_chart</span>
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight text-slate-800 dark:text-white">
                  Dashboard
                </h1>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  Visão Geral
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={openDateModal}
                className="hidden md:flex items-center gap-2 mr-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 px-3 py-2 rounded-xl transition-all cursor-pointer group border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
              >
                <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-1.5 rounded-lg">
                  <span className="material-symbols-rounded text-lg">
                    calendar_today
                  </span>
                </div>
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Data
                  </span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {date.toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </button>

              <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 hidden md:block"></div>

              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-bold text-slate-800 dark:text-white">
                    {username || "Admin"}
                  </span>
                  <button
                    onClick={openLocalModal}
                    className="text-[10px] font-bold text-white bg-slate-400 px-2 py-0.5 rounded transition-colors cursor-not-allowed flex items-center gap-1 opacity-80"
                  >
                    LOCAL: {local}{" "}
                    <span className="material-symbols-rounded text-[10px]">
                      lock
                    </span>
                  </button>
                </div>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 border-2 border-white dark:border-slate-600 flex items-center justify-center shadow-sm">
                  <span className="material-symbols-rounded text-slate-500 dark:text-slate-300">
                    person
                  </span>
                </div>
              </div>

              <button
                onClick={toggleDarkMode}
                className="ml-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-600 dark:text-slate-300 border border-transparent hover:border-slate-300 dark:hover:border-slate-500"
              >
                <span className="material-symbols-rounded block dark:hidden text-xl">
                  dark_mode
                </span>
                <span className="material-symbols-rounded hidden dark:block text-xl">
                  light_mode
                </span>
              </button>

              <button
                onClick={handleLogout}
                className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-all border border-transparent hover:border-red-200 dark:hover:border-red-800"
              >
                <span className="material-symbols-rounded text-xl">logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-in slide-in-from-bottom-4 duration-500">
          <StatCard
            title="Valor Total (Filtro)"
            value={`R$ ${totalGeral.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}`}
            icon="paid"
            color="bg-green-500"
          />
          <StatCard
            title="Top Motivo"
            value={
              topMotivo.motivo.length > 20
                ? topMotivo.motivo.substring(0, 20) + "..."
                : topMotivo.motivo
            }
            subtext={`R$ ${Number(topMotivo.totalValue || 0).toLocaleString(
              "pt-BR",
              { minimumFractionDigits: 2 }
            )}`}
            icon="warning"
            color="bg-red-500"
          />
          <StatCard
            title="Clientes Listados"
            value={clientesData.length}
            icon="groups"
            color="bg-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 mb-8">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <span className="material-symbols-rounded text-slate-400">
              filter_alt
            </span>{" "}
            Filtros
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FilterSelect
              icon="category"
              placeholder="Tipo"
              options={tipos}
              value={tipo}
              onChange={setTipo}
            />
            <FilterSelect
              icon="report_problem"
              placeholder="Motivo"
              options={filteredMotivos.map((m) => m.motivo)}
              value={motivo}
              onChange={setMotivo}
            />
            <FilterSelect
              icon="person"
              placeholder="Vendedor"
              options={vendedores}
              value={vendedor}
              onChange={setVendedor}
            />
            <div className="flex gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange({ ...dateRange, start: e.target.value })
                }
                className="w-full px-3 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-gray-200 text-sm outline-none focus:ring-2 focus:ring-green-500/50"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange({ ...dateRange, end: e.target.value })
                }
                className="w-full px-3 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-gray-200 text-sm outline-none focus:ring-2 focus:ring-green-500/50"
              />
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 min-h-[400px]">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">
              Custos por Tipo
            </h3>
            <div className="h-[300px]">
              {tipoData.length > 0 ? (
                <Bar data={barChartData} options={chartOptions} />
              ) : (
                <Empty description="Sem dados" />
              )}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 min-h-[400px]">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">
              Distribuição por Motivo
            </h3>
            <div className="h-[300px] flex justify-center">
              {filteredMotivos.length > 0 ? (
                <Doughnut data={doughnutChartData} options={chartOptions} />
              ) : (
                <Empty description="Sem dados" />
              )}
            </div>
          </div>
        </div>

        {/* Clients Table */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">
            Detalhamento por Cliente
          </h3>
          <ConfigProvider
            theme={{
              token: {
                colorBgContainer: "transparent",
                colorText: isDark ? "#fff" : "#1f2937",
                colorBorderSecondary: isDark ? "#374151" : "#f0f0f0",
                colorFillAlter: isDark ? "#1f2937" : "#fafafa",
              },
            }}
          >
            <Table
              columns={columns}
              dataSource={clientesData.map((row, i) => ({ ...row, key: i }))}
              expandable={{
                expandedRowRender: (record) => (
                  <ExpandedRow cliente={record.cliente} />
                ),
              }}
              pagination={{ pageSize: 10 }}
              rowClassName="bg-transparent hover:bg-slate-50 dark:hover:bg-slate-700/20"
            />
          </ConfigProvider>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
