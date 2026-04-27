import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import FrotaHeader from './components/FrotaHeader';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Cadastrodeveiculos = () => {
    const navigate = useNavigate();
    const { theme } = useTheme();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editIndex, setEditIndex] = useState(null);
    
    // Estado para a lista de veículos
    const [veiculos, setVeiculos] = useState([
        {
            motorista: "JOAO SILVA",
            placa: "ABC-1234",
            fabricante: "VOLVO",
            modelo: "FH 540",
            tipo: "Truck",
            rastreador: "Omnilink",
            protecao: "Sim",
            refrigerador: "Sim",
            capacidade: "15000",
            ano: "2020",
            idade: 4,
            chassi: "9BWAB4567890123456",
            renavan: "123456789",
            ipva: "2024-03-10",
            empresa: "FORT FRUIT LTDA"
        },
        {
            motorista: "PEDRO SANTOS",
            placa: "XYZ-9876",
            fabricante: "MERCEDES",
            modelo: "Accelo 1016",
            tipo: "3/4",
            rastreador: "Autotrac",
            protecao: "Sim",
            refrigerador: "Não",
            capacidade: "7000",
            ano: "2015",
            idade: 9,
            chassi: "3MBAB1234567890123",
            renavan: "987654321",
            ipva: "2024-12-30",
            empresa: "FORT FRUIT LTDA"
        }
    ]);

    // Estado do formulário
    const [formData, setFormData] = useState({
        motorista: '',
        placa: '',
        fabricante: '',
        modelo: '',
        tipo: '',
        rastreador: '',
        protecao: 'Não',
        refrigerador: 'Não',
        capacidade: '',
        ano: '',
        chassi: '',
        renavan: '',
        ipva: '',
        empresa: 'FORT FRUIT LTDA'
    });

    const [busca, setBusca] = useState("");

    // Cálculo automático da idade
    const calcIdade = (ano) => {
        if (!ano) return 0;
        const currentYear = new Date().getFullYear();
        return currentYear - parseInt(ano);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCadastrar = (e) => {
        e.preventDefault();
        
        if (!formData.placa || !formData.motorista) {
            Swal.fire("Erro", "Preencha ao menos Placa e Motorista", "error");
            return;
        }

        const novoVeiculo = {
            ...formData,
            idade: calcIdade(formData.ano)
        };

        if (isEditing) {
            const novosVeiculos = [...veiculos];
            novosVeiculos[editIndex] = novoVeiculo;
            setVeiculos(novosVeiculos);
            setIsEditing(false);
            setEditIndex(null);
        } else {
            setVeiculos(prev => [novoVeiculo, ...prev]);
        }

        setFormData({
            motorista: '', placa: '', fabricante: '', modelo: '', tipo: '',
            rastreador: '', protecao: 'Não', refrigerador: 'Não', capacidade: '',
            ano: '', chassi: '', renavan: '', ipva: '', empresa: 'FORT FRUIT LTDA'
        });

        setIsModalOpen(false);

        Swal.fire({
            title: "Sucesso!",
            text: isEditing ? "Veículo atualizado." : "Veículo cadastrado localmente.",
            icon: "success",
            timer: 1500,
            showConfirmButton: false
        });
    };

    const handleEdit = (index) => {
        const veiculo = veiculos[index];
        setFormData({ ...veiculo });
        setEditIndex(index);
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const veiculosFiltrados = veiculos.filter(v => 
        v.placa.toLowerCase().includes(busca.toLowerCase()) || 
        v.motorista.toLowerCase().includes(busca.toLowerCase())
    );

    const isIpvaVencido = (dataStr) => {
        if (!dataStr) return false;
        return dayjs(dataStr).isBefore(dayjs(), 'day');
    };

    const handleDownloadPDF = () => {
        const doc = new jsPDF({ orientation: 'landscape' });
        
        // Cabeçalho do PDF
        doc.setFontSize(18);
        doc.setTextColor(220, 38, 38); // Vermelho Fort Fruit
        doc.text('FORT FRUIT - RELATÓRIO DE FROTA', 14, 15);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Gerado em: ${dayjs().format('DD/MM/YYYY HH:mm')}`, 14, 22);
        doc.text(`Total de veículos: ${veiculosFiltrados.length}`, 14, 27);

        // Tabela
        const tableColumn = ["Placa", "Motorista", "Modelo", "Fabricante", "Tipo", "Rastreador", "Ano", "Idade", "IPVA", "Empresa"];
        const tableRows = veiculosFiltrados.map(v => [
            v.placa,
            v.motorista,
            v.modelo,
            v.fabricante,
            v.tipo,
            v.rastreador,
            v.ano,
            v.idade,
            v.ipva ? dayjs(v.ipva).format('DD/MM/YYYY') : '---',
            v.empresa
        ]);

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 32,
            styles: { fontSize: 8 },
            headStyles: { fillStyle: 'dark', fillColor: [220, 38, 38] },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            didDrawPage: (data) => {
                // Rodapé
                doc.setFontSize(8);
                doc.text(`Página ${data.pageNumber}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
            }
        });

        doc.save(`Relatorio_Frota_FortFruit_${dayjs().format('DD_MM_YYYY')}.pdf`);
        
        Swal.fire({
            title: 'PDF Gerado!',
            text: 'O download iniciará automaticamente.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 pb-10">
            {/* Modal de Cadastro */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-5xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-3">
                                <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-xl text-red-600">
                                    <span className="material-symbols-rounded">local_shipping</span>
                                </div>
                                <h3 className="font-bold text-xl text-slate-800 dark:text-white">{isEditing ? 'Editar Veículo' : 'Cadastrar Novo Veículo'}</h3>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                                <span className="material-symbols-rounded">close</span>
                            </button>
                        </div>
                        
                        <div className="p-8 overflow-y-auto">
                            <form onSubmit={handleCadastrar} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Motorista</label>
                                    <input name="motorista" value={formData.motorista} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none transition-all font-semibold" placeholder="Nome Completo" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Placa</label>
                                    <input name="placa" value={formData.placa} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none transition-all font-bold uppercase" placeholder="ABC-1234" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Fabricante</label>
                                    <input name="fabricante" value={formData.fabricante} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none transition-all" placeholder="Ex: Volvo, Scania" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Modelo</label>
                                    <input name="modelo" value={formData.modelo} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none transition-all" placeholder="Ex: FH 540" />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Tipo</label>
                                    <input name="tipo" value={formData.tipo} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none transition-all" placeholder="Ex: Furgão, Truck, etc." />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Rastreador</label>
                                    <input name="rastreador" value={formData.rastreador} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none transition-all" />
                                </div>
                                <div className="space-y-1 flex flex-col justify-center">
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase ml-1 mb-2">Proteção Interna</label>
                                    <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl w-fit">
                                        <button type="button" onClick={() => handleInputChange({target: {name: 'protecao', value: 'Sim'}})} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${formData.protecao === 'Sim' ? 'bg-white dark:bg-slate-600 shadow-sm text-red-600' : 'text-slate-500'}`}>SIM</button>
                                        <button type="button" onClick={() => handleInputChange({target: {name: 'protecao', value: 'Não'}})} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${formData.protecao === 'Não' ? 'bg-white dark:bg-slate-600 shadow-sm text-red-600' : 'text-slate-500'}`}>NÃO</button>
                                    </div>
                                </div>
                                <div className="space-y-1 flex flex-col justify-center">
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase ml-1 mb-2">Refrigerado</label>
                                    <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl w-fit">
                                        <button type="button" onClick={() => handleInputChange({target: {name: 'refrigerador', value: 'Sim'}})} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${formData.refrigerador === 'Sim' ? 'bg-white dark:bg-slate-600 shadow-sm text-red-600' : 'text-slate-500'}`}>SIM</button>
                                        <button type="button" onClick={() => handleInputChange({target: {name: 'refrigerador', value: 'Não'}})} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${formData.refrigerador === 'Não' ? 'bg-white dark:bg-slate-600 shadow-sm text-red-600' : 'text-slate-500'}`}>NÃO</button>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Capacidade KG</label>
                                    <input name="capacidade" type="number" value={formData.capacidade} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none transition-all" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Ano Modelo</label>
                                    <input name="ano" type="number" value={formData.ano} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none transition-all font-bold" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Chassi</label>
                                    <input name="chassi" value={formData.chassi} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none transition-all" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Renavan</label>
                                    <input name="renavan" value={formData.renavan} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none transition-all" />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Data IPVA</label>
                                    <input name="ipva" type="date" value={formData.ipva} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none transition-all" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Empresa</label>
                                    <select name="empresa" value={formData.empresa} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none transition-all font-bold">
                                        <option>FORT FRUIT LTDA</option>
                                        <option>DISTRIBUIDORA FORT FRUIT</option>
                                    </select>
                                </div>
                            </form>
                        </div>

                        <div className="p-8 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">Cancelar</button>
                            <button onClick={handleCadastrar} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-10 rounded-xl shadow-lg shadow-red-600/20 transition-all active:scale-95 flex items-center gap-2 uppercase tracking-tight">
                                <span className="material-symbols-rounded">save</span>
                                {isEditing ? 'Atualizar Veículo' : 'Salvar Veículo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <FrotaHeader date={new Date()} />

            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                    <div>
                        <button onClick={() => navigate("/frota")} className="flex items-center gap-2 text-slate-400 hover:text-red-600 font-semibold group mb-1 text-xs transition-colors">
                            <span className="material-symbols-rounded text-base group-hover:-translate-x-1 duration-200">arrow_back</span>
                            Voltar
                        </button>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Veículos</h1>
                    </div>
                    <button 
                        onClick={() => {
                            setFormData({
                                motorista: '', placa: '', fabricante: '', modelo: '', tipo: '',
                                rastreador: '', protecao: 'Não', refrigerador: 'Não', capacidade: '',
                                ano: '', chassi: '', renavan: '', ipva: '', empresa: 'FORT FRUIT LTDA'
                            });
                            setIsEditing(false);
                            setIsModalOpen(true);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold shadow-xl shadow-red-600/20 transition-all active:scale-95 flex items-center gap-2 uppercase tracking-tight font-inter text-sm"
                    >
                        <span className="material-symbols-rounded">add</span>
                        Novo Veículo
                    </button>
                </div>
                {/* Dashboard / Tabela */}
                <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-2xl text-blue-600">
                                <span className="material-symbols-rounded text-2xl">local_shipping</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">Relatório de Frota</h2>
                                <p className="text-xs text-slate-400 font-medium">{veiculos.length} veículos cadastrados</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button 
                                onClick={handleDownloadPDF} 
                                className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-5 py-3 rounded-2xl font-bold transition-all active:scale-95 border border-slate-200 dark:border-slate-600"
                            >
                                <span className="material-symbols-rounded text-xl">download</span>
                                BAIXAR RELATÓRIO
                            </button>
                            <div className="relative flex-1 sm:w-80">
                                <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                                <input type="text" placeholder="Buscar por Placa ou Motorista..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-500 transition-all font-medium" />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    <th className="px-6 py-4">Placa</th>
                                    <th className="px-6 py-4">Motorista</th>
                                    <th className="px-6 py-4">Modelo/Fabricante</th>
                                    <th className="px-6 py-4">Tipo</th>
                                    <th className="px-6 py-4">Empresa</th>
                                    <th className="px-6 py-4">Ano (Idade)</th>
                                    <th className="px-6 py-4">Rastreador</th>
                                    <th className="px-6 py-4">Proteção/Refrig.</th>
                                    <th className="px-6 py-4">Venc. IPVA</th>
                                    <th className="px-6 py-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                {veiculosFiltrados.map((v, i) => (
                                    <tr key={i} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${isIpvaVencido(v.ipva) ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                                        <td className="px-6 py-4">
                                            <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-1 rounded-lg text-xs font-bold tracking-wider">{v.placa}</span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-sm text-slate-700 dark:text-slate-300">{v.motorista}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-800 dark:text-white uppercase">{v.modelo}</span>
                                                <span className="text-[10px] text-slate-500 font-semibold">{v.fabricante}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold text-slate-500">{v.tipo}</td>
                                        <td className="px-6 py-4 text-xs font-bold text-slate-500">{v.empresa}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{v.ano}</span>
                                                <span className="text-[10px] text-slate-400 font-semibold uppercase">{v.idade} anos</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold text-slate-500">{v.rastreador}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-1">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${v.protecao === 'Sim' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>PROT: {v.protecao}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${v.refrigerador === 'Sim' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>REFR: {v.refrigerador}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`flex items-center gap-1.5 font-bold text-xs ${isIpvaVencido(v.ipva) ? 'text-red-600' : 'text-slate-500'}`}>
                                                <span className="material-symbols-rounded text-sm">{isIpvaVencido(v.ipva) ? 'error' : 'event'}</span>
                                                {v.ipva ? dayjs(v.ipva).format('DD/MM/YYYY') : '---'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => handleEdit(i)}
                                                className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors bg-transparent hover:bg-emerald-50 rounded-lg"
                                                title="Editar"
                                            >
                                                <span className="material-symbols-rounded text-xl">edit</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {veiculosFiltrados.length === 0 && (
                            <div className="p-10 text-center text-slate-400 font-bold uppercase italic">Nenhum veículo encontrado com este filtro.</div>
                        )}
                    </div>
                </div>
            </main>
            <style>{`
                .material-symbols-rounded { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
            `}</style>
        </div>
    );
};

export default Cadastrodeveiculos;
