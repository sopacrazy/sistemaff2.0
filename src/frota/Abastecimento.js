import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FrotaHeader from './components/FrotaHeader';
import Swal from 'sweetalert2';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { API_BASE_URL } from '../utils/apiConfig';
import AbastecimentoDashboard from './AbastecimentoDashboard';

// Componente Modal Interno
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-6xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh]">
                <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-100 p-2 rounded-xl text-red-600">
                            <span className="material-symbols-rounded">local_gas_station</span>
                        </div>
                        <h3 className="font-bold text-lg text-slate-800">{title}</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-slate-100 rounded-full">
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
};

const Abastecimento = () => {
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [isAvulso, setIsAvulso] = useState(false);
    
    // Estado dos Filtros Simplificados
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [filterEmpresa, setFilterEmpresa] = useState('');

    // Lista de abastecimentos
    const [abastecimentos, setAbastecimentos] = useState([]);
    const [veiculos, setVeiculos] = useState([]); // Placas do Protheus
    const [loading, setLoading] = useState(true);
    
    // Estados para a Busca de Placa
    const [placaSearch, setPlacaSearch] = useState('');
    const [isPlacaDropdownOpen, setIsPlacaDropdownOpen] = useState(false);
    
    // Estados para a Busca de Motorista
    const [motoristas, setMotoristas] = useState([]);
    const [motoristaSearch, setMotoristaSearch] = useState('');
    const [isMotoristaDropdownOpen, setIsMotoristaDropdownOpen] = useState(false);
    
    // Estado para o Modal do Dashboard e Fechamento
    const [isDashboardModalOpen, setIsDashboardModalOpen] = useState(false);
    const [isFechamentoModalOpen, setIsFechamentoModalOpen] = useState(false);
    const [fechamentoStartDate, setFechamentoStartDate] = useState('');
    const [fechamentoEndDate, setFechamentoEndDate] = useState('');

    const fetchAbastecimentos = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/api/frota/abastecimento`);
            setAbastecimentos(response.data);
        } catch (error) {
            console.error("Erro ao buscar abastecimentos:", error);
            Swal.fire("Erro", "Não foi possível carregar os dados de abastecimento.", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchVeiculosProtheus = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/frota/abastecimento/veiculos-protheus`);
            setVeiculos(response.data);
        } catch (error) {
            console.error("Erro ao carregar veículos do Protheus:", error);
        }
    };

    const fetchMotoristasProtheus = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/frota/abastecimento/motoristas-protheus`);
            setMotoristas(response.data);
        } catch (error) {
            console.error("Erro ao carregar motoristas do Protheus:", error);
        }
    };

    useEffect(() => {
        fetchAbastecimentos();
        fetchVeiculosProtheus();
        fetchMotoristasProtheus();
    }, []);

    const [formData, setFormData] = useState({
        requerimento: '',
        empresa: 'Fort Fruit LTDA',
        data_registro: '',
        placa: '',
        motorista: '',
        tipo: 'Diesel',
        cupom: '',
        posto: '',
        data_abastecido: '',
        km_abast: '',
        km_abast_atual: '',
        km_rod: '',
        km_lt: '',
        quantidade: '',
        valor_venda: '',
        valor_correto: '',
        descricao: '',
        obs: '',
        preco: '',
        hora: '',
        nome_produto: ''
    });

    // Helper global para limpar números preservando decimais
    const parseNumericValue = (val) => {
        if (!val && val !== 0) return 0;
        let sVal = String(val).trim().replace(/[^\d.,-]/g, '');
        if (sVal.includes(',')) {
            return parseFloat(sVal.split('.').join('').replace(',', '.')) || 0;
        }
        if (sVal.includes('.') && sVal.split('.').pop().length === 3) {
            return parseFloat(sVal.split('.').join('')) || 0;
        }
        return parseFloat(sVal) || 0;
    };

    const formatCurrency = (value) => {
        if (!value && value !== 0) return '';
        const numericValue = String(value).replace(/\D/g, '');
        const formattedValue = (Number(numericValue) / 100).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        });
        return formattedValue;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updated = { ...prev, [name]: value };

            // Cálculo automático de KM Rodado e KM/LT
            if (updated.tipo !== 'Produto') {
                let rodado = parseNumericValue(updated.km_rod);

                if (name === 'km_abast' || name === 'km_abast_atual') {
                    const atual = parseNumericValue(updated.km_abast);
                    const anterior = parseNumericValue(updated.km_abast_atual);
                    if (atual > 0) {
                        rodado = atual - anterior;
                        updated.km_rod = rodado.toString();
                    }
                }

                if (name === 'km_abast' || name === 'km_abast_atual' || name === 'km_rod' || name === 'quantidade') {
                    const qtd = parseNumericValue(updated.quantidade);
                    if (qtd > 0 && rodado > 0) {
                        updated.km_lt = (rodado / qtd).toFixed(2);
                    } else if (qtd === 0 || rodado === 0) {
                        updated.km_lt = '0.00';
                    }
                }
            }

            // Cálculo automático de Preço (Valor Venda / Quantidade)
            if (name === 'quantidade') {
                const qtd = parseNumericValue(updated.quantidade);
                const vv = parseNumericValue(updated.valor_venda);
                if (qtd > 0 && vv > 0) {
                    const precoCalc = vv / qtd;
                    updated.preco = formatCurrency(precoCalc.toFixed(2));
                } else {
                    updated.preco = '';
                }
            }
            
            return updated;
        });
    };

    const fetchLastKm = async (placa) => {
        if (!placa) return;
        try {
            const response = await axios.get(`${API_BASE_URL}/api/frota/abastecimento/ultimo-km/${placa}`);
            if (response.data && response.data.ultimo_km !== undefined) {
                const kmValue = parseFloat(response.data.ultimo_km) || 0;
                setFormData(prev => ({
                    ...prev,
                    km_abast_atual: kmValue.toLocaleString('pt-BR')
                }));
            }
        } catch (error) {
            console.error("Erro ao buscar último KM:", error);
        }
    };

    // Função para formatar data sem erro de fuso horário
    const formatDate = (dateStr) => {
        if (!dateStr) return '---';
        try {
            const dateOnly = dateStr.split('T')[0];
            const [year, month, day] = dateOnly.split('-');
            return `${day}/${month}/${year}`;
        } catch (e) {
            return dateStr;
        }
    };

    const handleCurrencyChange = (e) => {
        const { name, value } = e.target;
        const formatted = formatCurrency(value);
        setFormData(prev => {
            const updated = { ...prev, [name]: formatted };

            // Cálculo automático de Preço (Valor Venda / Quantidade) e Valor Correto
            if (name === 'valor_venda') {
                updated.valor_correto = updated.valor_venda; // Espelha o valor de venda
                
                const vv = parseNumericValue(updated.valor_venda);
                const qtd = parseNumericValue(updated.quantidade);
                if (qtd > 0 && vv > 0) {
                    const precoCalc = vv / qtd;
                    updated.preco = formatCurrency(precoCalc.toFixed(2));
                } else {
                    updated.preco = '';
                }
            }

            return updated;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!isAvulso) {
            const placaAtual = (formData.placa || placaSearch || '').trim().toUpperCase();
            const placaValida = veiculos.some(v => v.placa.trim().toUpperCase() === placaAtual);
            if (!placaValida) {
                Swal.fire('Atenção', 'Selecione uma Placa válida na lista ou ative o "Lançamento Avulso".', 'warning');
                return;
            }

            const motoristaAtual = (formData.motorista || motoristaSearch || '').trim().toUpperCase();
            const motoristaValido = motoristas.some(m => m.nome.trim().toUpperCase() === motoristaAtual);
            if (!motoristaValido) {
                Swal.fire('Atenção', 'Selecione um Motorista válido na lista ou ative o "Lançamento Avulso".', 'warning');
                return;
            }
        }

        try {
            const user = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
            
            // Limpa qualquer valor numérico independente do formato (ponto ou vírgula)
            const cleanNumeric = (val) => {
                if (val === undefined || val === null || val === '') return 0;
                let sVal = String(val).trim();
                
                // Remove qualquer caractere que não seja número, ponto, vírgula ou sinal de menos
                sVal = sVal.replace(/[^0-9.,-]/g, '');
                
                // Se tiver vírgula, tratamos como formato BR (ex: 1.234,56 ou 12,34)
                if (sVal.includes(',')) {
                    // Remove pontos de milhar e troca a vírgula por ponto para o parseFloat
                    return parseFloat(sVal.split('.').join('').replace(',', '.')) || 0;
                }
                
                // Se não tem vírgula mas tem ponto e parece formato BR (ex: 21.049)
                if (sVal.includes('.') && sVal.split('.').pop().length === 3) {
                    return parseFloat(sVal.split('.').join('')) || 0;
                }

                // Se não tiver vírgula, assume que o ponto é decimal (padrão numérico)
                return parseFloat(sVal) || 0;
            };

            const dataToSend = {
                ...formData,
                placa: !isAvulso ? (formData.placa || placaSearch || '').trim().toUpperCase() : formData.placa,
                motorista: !isAvulso ? (formData.motorista || motoristaSearch || '').trim().toUpperCase() : formData.motorista,
                km_abast: cleanNumeric(formData.km_abast),
                km_abast_atual: cleanNumeric(formData.km_abast_atual),
                km_rod: cleanNumeric(formData.km_rod),
                km_lt: cleanNumeric(formData.km_lt),
                quantidade: cleanNumeric(formData.quantidade),
                preco: cleanNumeric(formData.preco),
                valor_venda: cleanNumeric(formData.valor_venda),
                valor_correto: cleanNumeric(formData.valor_correto),
                usuario: user.username || 'Sistema'
            };

            if (isEditing) {
                await axios.put(`${API_BASE_URL}/api/frota/abastecimento/${formData.id}`, dataToSend);
                Swal.fire('Atualizado!', 'Dados de abastecimento atualizados com sucesso.', 'success');
            } else {
                await axios.post(`${API_BASE_URL}/api/frota/abastecimento`, dataToSend);
                Swal.fire('Sucesso!', 'Dados de abastecimento registrados com sucesso.', 'success');
            }

            fetchAbastecimentos();
            setIsModalOpen(false);
            setIsEditing(false);
            
            // Limpar form
            setFormData({
                requerimento: '', empresa: 'Fort Fruit LTDA', data_registro: '', placa: '', motorista: '', tipo: 'Diesel',
                cupom: '', posto: '', data_abastecido: '', km_abast: '', km_abast_atual: '', km_rod: '',
                km_lt: '', quantidade: '', valor_venda: '', valor_correto: '', descricao: '', obs: '', preco: '', hora: '', nome_produto: ''
            });

        } catch (error) {
            console.error("Erro ao salvar abastecimento:", error);
            Swal.fire("Erro", "Não foi possível salvar o abastecimento.", "error");
        }
    };

    const handleView = (item) => {
        setSelectedItem(item);
        setIsDetailModalOpen(true);
    };

    const handleEdit = (item) => {
        const formatDBValueToCurrency = (val) => {
            if (!val && val !== 0) return '';
            const numVal = Number(val);
            if (isNaN(numVal)) return val;
            return numVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        };

        const formatKM = (val) => {
            if (!val && val !== 0) return '';
            const numVal = Number(val);
            if (isNaN(numVal)) return val;
            return numVal.toLocaleString('pt-BR');
        };

        const formatNumber = (val) => {
             if (!val && val !== 0) return '';
             const numVal = Number(val);
             return isNaN(numVal) ? val : numVal.toString();
        };

        // Formata as datas para o padrão YYYY-MM-DD que o input date exige
        const formattedItem = { 
            ...item,
            data_registro: item.data_registro ? item.data_registro.split('T')[0] : '',
            data_abastecido: item.data_abastecido ? item.data_abastecido.split('T')[0] : '',
            preco: formatDBValueToCurrency(item.preco),
            valor_venda: formatDBValueToCurrency(item.valor_venda),
            valor_correto: formatDBValueToCurrency(item.valor_correto),
            km_abast: formatKM(item.km_abast),
            km_abast_atual: formatKM(item.km_abast_atual),
            km_rod: formatKM(item.km_rod),
            km_lt: formatNumber(item.km_lt),
            quantidade: formatNumber(item.quantidade)
        };
        setFormData(formattedItem);
        setPlacaSearch(item.placa); 
        setMotoristaSearch(item.motorista); // Sincroniza busca do motorista
        setIsEditing(true);
        setIsDetailModalOpen(false);
        setIsModalOpen(true);
    };

    // Função de Exportação para PDF
    const exportToPDF = () => {
        const doc = new jsPDF('p', 'mm', 'a4'); // 'p' para portrait (em pé)
        const dateStr = new Date().toLocaleDateString('pt-BR');
        
        // Carrega a logo
        const img = new Image();
        img.src = '/logo_fortfruit.png';
        
        img.onload = () => {
            // Cabeçalho Oficial
            doc.addImage(img, 'PNG', 14, 10, 45, 18); // Logo ajustada (mais larga)
            
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(22, 101, 52); // Verde Escuro
            doc.text('Fort Fruit LTDA', 62, 18);
            
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            doc.text('Alameda Ceasa - Belém-PA', 62, 23);
            doc.text(`Gerado em: ${dateStr}`, 62, 28);

            // Título Centralizado - VERDE
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(22, 163, 74); // Verde Fort Fruit
            const title = 'Relatório de Abastecimentos';
            const pageWidth = doc.internal.pageSize.getWidth();
            const titleWidth = doc.getTextWidth(title);
            doc.text(title, (pageWidth - titleWidth) / 2, 45);

            // Informação de Período Filtrado (Canto Superior Direito)
            let periodoTexto = '';
            if (filterStartDate && filterEndDate) {
                const fStart = filterStartDate.split('-').reverse().join('/');
                const fEnd = filterEndDate.split('-').reverse().join('/');
                periodoTexto = `Período: ${fStart} a ${fEnd}`;
            } else if (filterStartDate) {
                const fStart = filterStartDate.split('-').reverse().join('/');
                periodoTexto = `A partir de: ${fStart}`;
            } else if (filterEndDate) {
                const fEnd = filterEndDate.split('-').reverse().join('/');
                periodoTexto = `Até: ${fEnd}`;
            }

            if (periodoTexto) {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(100);
                const textWidth = doc.getTextWidth(periodoTexto);
                doc.text(periodoTexto, pageWidth - textWidth - 14, 23); // Alinhado à direita com margem 14
            }
            
            // Subtítulo
            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.setFont('helvetica', 'italic');
            const subTitle = `Total de registros encontrados neste filtro: ${filteredAbastecimentos.length}`;
            doc.text(subTitle, (pageWidth - doc.getTextWidth(subTitle)) / 2, 51);

            // Prepara dados da tabela (Removi alguns campos para caber no modo Retrato)
            const tableData = filteredAbastecimentos.map(item => [
                item.data_registro ? new Date(item.data_registro).toLocaleDateString('pt-BR') : '---',
                item.empresa || '---',
                item.placa,
                item.motorista,
                item.posto,
                item.quantidade + ' L',
                item.km_rod ? (Number(item.km_rod) || 0).toLocaleString('pt-BR') : '0',
                new Number(item.valor_venda).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            ]);

            // Totais
            const totalValue = filteredAbastecimentos.reduce((acc, curr) => acc + (parseFloat(curr.valor_venda) || 0), 0);
            const totalLiters = filteredAbastecimentos.reduce((acc, curr) => acc + (parseFloat(curr.quantidade) || 0), 0);

            doc.autoTable({
                startY: 58,
                head: [['Data', 'Empresa', 'Placa', 'Motorista', 'Posto', 'Qtd', 'Rodado', 'Valor']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [22, 163, 74], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
                bodyStyles: { fontSize: 7 },
                foot: [['', '', '', '', 'TOTALIZADORES:', totalLiters.toFixed(2) + ' L', '', new Number(totalValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })]],
                footStyles: { fillColor: [255, 247, 237], textColor: [194, 65, 12], fontStyle: 'bold', fontSize: 8 } // Laranja para o rodapé
            });

            doc.save(`Relatorio_Abastecimento_${dateStr.replace(/\//g, '-')}.pdf`);
        };

        img.onerror = () => {
            doc.setFontSize(16);
            doc.text('Relatório de Abastecimentos', 14, 20);
            doc.save(`Relatorio_Abastecimento_${dateStr.replace(/\//g, '-')}.pdf`);
        };
    };

    const generateFechamentoPDF = () => {
        if (!fechamentoStartDate || !fechamentoEndDate) {
            Swal.fire("Aviso", "Por favor, selecione a data inicial e final para o fechamento.", "warning");
            return;
        }

        const doc = new jsPDF('p', 'mm', 'a4');
        const todayStr = new Date().toLocaleDateString('pt-BR');
        
        const fStart = fechamentoStartDate.split('-').reverse().join('/');
        const fEnd = fechamentoEndDate.split('-').reverse().join('/');
        const periodoTexto = `Período: ${fStart} a ${fEnd}`;

        const img = new Image();
        img.src = '/logo_fortfruit.png';
        
        const buildPDF = () => {
            // Cabeçalho Oficial
            doc.addImage(img, 'PNG', 14, 10, 45, 18);
            
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(22, 101, 52); // Verde Escuro
            doc.text('Fort Fruit LTDA', 62, 18);
            
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            doc.text('Alameda Ceasa - Belém-PA', 62, 23);
            doc.text(`Gerado em: ${todayStr}`, 62, 28);

            // Informação de Período Filtrado (Canto Superior Direito)
            doc.setFontSize(9);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(100);
            const textWidth = doc.getTextWidth(periodoTexto);
            const pageWidth = doc.internal.pageSize.getWidth();
            doc.text(periodoTexto, pageWidth - textWidth - 14, 23);

            // Título
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(50);
            const title = 'Fechamento de Abastecimento';
            const titleWidth = doc.getTextWidth(title);
            doc.text(title, (pageWidth - titleWidth) / 2, 45);

            // Filtragem
            const filtered = abastecimentos.filter(item => {
                if (!item.data_registro) return false;
                const itemDate = item.data_registro.split('T')[0];
                return itemDate >= fechamentoStartDate && itemDate <= fechamentoEndDate;
            });

            // Agrupamento
            const grouping = {};
            let totalBpg = 0;
            let totalFf = 0;

            filtered.forEach(item => {
                let p = item.posto?.trim().toUpperCase() || 'NÃO INFORMADO';

                const emp = item.empresa;
                // Força o uso da coluna valor_venda conforme solicitado
                const val = parseNumericValue(item.valor_venda) || 0;

                if (!grouping[p]) {
                    grouping[p] = { 'Bem Pra Gente': 0, 'Fort Fruit LTDA': 0 };
                }

                if (emp === 'Bem Pra Gente') {
                    grouping[p]['Bem Pra Gente'] += val;
                    totalBpg += val;
                } else if (emp === 'Fort Fruit LTDA') {
                    grouping[p]['Fort Fruit LTDA'] += val;
                    totalFf += val;
                } else {
                    grouping[p]['Fort Fruit LTDA'] += val;
                    totalFf += val;
                }
            });

            const formatMoney = (val) => new Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            const tableData = [];
            Object.keys(grouping).sort().forEach(p => {
                const bpg = grouping[p]['Bem Pra Gente'];
                const ff = grouping[p]['Fort Fruit LTDA'];
                const rowTotal = bpg + ff;
                tableData.push([
                    p,
                    bpg > 0 ? formatMoney(bpg) : '',
                    ff > 0 ? formatMoney(ff) : '',
                    formatMoney(rowTotal)
                ]);
            });

            const totalGeral = totalBpg + totalFf;

            doc.autoTable({
                startY: 55,
                head: [
                    ['POSTO', 'BEM PRA GENTE', 'FORT FRUIT', 'TOTAL GERAL']
                ],
                body: tableData,
                theme: 'grid',
                headStyles: { 
                    fillColor: [22, 163, 74], 
                    textColor: [255, 255, 255], 
                    fontStyle: 'bold', 
                    fontSize: 10, 
                    halign: 'center',
                    lineColor: [22, 163, 74]
                },
                bodyStyles: { 
                    fontSize: 9, 
                    textColor: [50, 50, 50],
                    valign: 'middle'
                },
                columnStyles: {
                    0: { fontStyle: 'bold', halign: 'left' },
                    1: { halign: 'right' },
                    2: { halign: 'right' },
                    3: { halign: 'right', fontStyle: 'bold', fillColor: [236, 253, 245], textColor: [6, 78, 59] } // Coluna Total Geral em destaque (Verde claro / Texto escuro)
                },
                foot: [['TOTAL GERAL DO PERÍODO', formatMoney(totalBpg), formatMoney(totalFf), formatMoney(totalGeral)]],
                footStyles: { 
                    fillColor: [15, 118, 110], 
                    textColor: [255, 255, 255], 
                    fontStyle: 'bold', 
                    fontSize: 11, 
                    halign: 'right' 
                }
            });

            // Assinaturas
            const finalY = doc.lastAutoTable.finalY + 30;
            doc.setDrawColor(0);
            doc.setLineWidth(0.5);

            // Linha FROTA
            doc.line(20, finalY, 80, finalY);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0);
            const frotaText = "FROTA";
            doc.text(frotaText, 50 - (doc.getTextWidth(frotaText)/2), finalY + 5);

            // Linha GERÊNCIA
            doc.line(130, finalY, 190, finalY);
            const gerenciaText = "GERÊNCIA";
            doc.text(gerenciaText, 160 - (doc.getTextWidth(gerenciaText)/2), finalY + 5);

            doc.save(`Fechamento_Abastecimento_${fStart.replace(/\//g, '')}_a_${fEnd.replace(/\//g, '')}.pdf`);
            setIsFechamentoModalOpen(false);
            setFechamentoStartDate('');
            setFechamentoEndDate('');
        };

        img.onload = buildPDF;
        img.onerror = buildPDF;
    };

    // Lógica de Filtragem Simplificada
    const filteredAbastecimentos = useMemo(() => {
        return abastecimentos.filter(item => {
            let matchDate = true;
            if (filterStartDate || filterEndDate) {
                if (!item.data_registro) {
                    matchDate = false;
                } else {
                    const itemDate = item.data_registro.split('T')[0];
                    if (filterStartDate && filterEndDate) {
                        matchDate = itemDate >= filterStartDate && itemDate <= filterEndDate;
                    } else if (filterStartDate) {
                        matchDate = itemDate >= filterStartDate;
                    } else if (filterEndDate) {
                        matchDate = itemDate <= filterEndDate;
                    }
                }
            }

            const matchEmpresa = filterEmpresa ? item.empresa === filterEmpresa : true;
            const searchLower = searchTerm.toLowerCase();
            const matchText = searchTerm === '' || 
                (item.requerimento?.toLowerCase().includes(searchLower)) ||
                (item.empresa?.toLowerCase().includes(searchLower)) ||
                (item.placa?.toLowerCase().includes(searchLower)) ||
                (item.motorista?.toLowerCase().includes(searchLower)) ||
                (item.tipo?.toLowerCase().includes(searchLower)) ||
                (item.cupom?.toLowerCase().includes(searchLower)) ||
                (item.posto?.toLowerCase().includes(searchLower)) ||
                (item.km_abast?.toString().includes(searchLower)) ||
                (item.km_abast_atual?.toString().includes(searchLower)) ||
                (item.km_rod?.toString().includes(searchLower)) ||
                (item.valor_venda?.toString().includes(searchLower));

            return matchDate && matchEmpresa && matchText;
        });
    }, [abastecimentos, searchTerm, filterStartDate, filterEndDate, filterEmpresa]);

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Tem certeza?',
            text: "Esta ação não poderá ser desfeita!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sim, excluir!',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await axios.delete(`${API_BASE_URL}/api/frota/abastecimento/${id}`);
                    fetchAbastecimentos();
                    Swal.fire('Excluído!', 'O registro foi removido.', 'success');
                } catch (error) {
                    console.error("Erro ao excluir:", error);
                    Swal.fire("Erro", "Não foi possível excluir o registro.", "error");
                }
            }
        });
    };
    const clearFilters = () => {
        setSearchTerm('');
        setFilterStartDate('');
        setFilterEndDate('');
        setFilterEmpresa('');
    };

    return (
        <div className="min-h-screen bg-[#F3F4F6] text-slate-800 font-sans pb-10">
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
            
            <FrotaHeader date={new Date()} />

            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                    <div>
                        <button onClick={() => navigate("/frota")} className="flex items-center gap-2 text-slate-400 hover:text-red-600 font-semibold group mb-1 text-xs transition-colors">
                            <span className="material-symbols-rounded text-base group-hover:-translate-x-1 duration-200">arrow_back</span>
                            Voltar
                        </button>
                        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Abastecimento</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={exportToPDF}
                            title="Exportar PDF do resultado"
                            className="bg-white hover:bg-slate-50 text-slate-600 p-3 rounded-xl border border-slate-200 shadow-sm transition-all active:scale-95 flex items-center justify-center group"
                        >
                            <span className="material-symbols-rounded text-xl group-hover:text-red-600">download</span>
                        </button>
                        <button 
                            onClick={() => setIsDashboardModalOpen(true)}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold shadow-xl shadow-slate-900/20 transition-all active:scale-95 flex items-center gap-2 uppercase tracking-tight font-inter text-sm"
                        >
                            <span className="material-symbols-rounded">dashboard</span>
                            Dashboard
                        </button>
                        <button 
                            onClick={() => setIsFechamentoModalOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-xl shadow-emerald-600/20 transition-all active:scale-95 flex items-center gap-2 uppercase tracking-tight font-inter text-sm"
                        >
                            <span className="material-symbols-rounded">request_quote</span>
                            Fechamento
                        </button>
                        <button 
                            onClick={() => {
                                setFormData({
                                    requerimento: '', empresa: 'Fort Fruit LTDA', 
                                    data_registro: new Date().toISOString().split('T')[0], 
                                    placa: '', motorista: '', tipo: 'Diesel',
                                    cupom: '', posto: '', 
                                    data_abastecido: new Date().toISOString().split('T')[0], 
                                    km_abast: '', km_abast_atual: '', km_rod: '',
                                    km_lt: '', quantidade: '', valor_venda: '', valor_correto: '', descricao: '', obs: '', preco: '', hora: '', nome_produto: ''
                                });
                                setPlacaSearch('');
                                setMotoristaSearch(''); // Limpa busca do motorista
                                setIsEditing(false);
                                setIsAvulso(false);
                                setIsModalOpen(true);
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold shadow-xl shadow-red-600/20 transition-all active:scale-95 flex items-center gap-2 uppercase tracking-tight font-inter text-sm"
                        >
                            <span className="material-symbols-rounded">add</span>
                            Novo Abastecimento
                        </button>
                    </div>
                </div>

                {/* Filtros Ajustados */}
                <section className="bg-white rounded-[24px] shadow-sm border border-slate-100 p-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600">
                                <span className="material-symbols-rounded text-xl">search</span>
                            </div>
                            <h2 className="font-bold text-lg text-slate-800">Filtrar Lançamentos</h2>
                        </div>
                        {(searchTerm || filterStartDate || filterEndDate || filterEmpresa) && (
                            <button 
                                onClick={clearFilters}
                                className="flex items-center gap-2 text-slate-400 hover:text-red-500 font-bold text-[10px] uppercase tracking-widest transition-colors"
                            >
                                <span className="material-symbols-rounded text-base">filter_alt_off</span>
                                Limpar
                            </button>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-5 lg:col-span-5 space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Pesquisa Geral</label>
                            <div className="relative group">
                                <span className="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xl group-focus-within:text-blue-500 transition-colors">search</span>
                                <input 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-semibold placeholder:text-slate-300 shadow-inner" 
                                    placeholder="Placa, motorista, posto, requerimento..." 
                                />
                            </div>
                        </div>
                        <div className="md:col-span-3 lg:col-span-3 space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Empresa</label>
                            <select
                                value={filterEmpresa}
                                onChange={(e) => setFilterEmpresa(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-semibold shadow-inner"
                            >
                                <option value="">Todas as Empresas</option>
                                <option value="Fort Fruit LTDA">Fort Fruit LTDA</option>
                                <option value="Bem Pra Gente">Bem Pra Gente</option>
                            </select>
                        </div>
                        <div className="md:col-span-4 lg:col-span-4 space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Período</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="date" 
                                    value={filterStartDate}
                                    onChange={(e) => setFilterStartDate(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-semibold shadow-inner" 
                                />
                                <span className="text-slate-400 font-bold">-</span>
                                <input 
                                    type="date" 
                                    value={filterEndDate}
                                    onChange={(e) => setFilterEndDate(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-semibold shadow-inner" 
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Lista de Abastecimentos */}
                <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/30">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600">
                                <span className="material-symbols-rounded text-xl">history</span>
                            </div>
                            <h2 className="font-bold text-lg text-slate-800">Lançamentos Encontrados</h2>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-3 py-1.5 rounded-full border border-slate-100">
                            {filteredAbastecimentos.length} Registro(s)
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    <th className="px-8 py-3.5">Data</th>
                                    <th className="px-8 py-3.5">Placa</th>
                                    <th className="px-8 py-3.5">Motorista</th>
                                    <th className="px-8 py-3.5">Posto</th>
                                    <th className="px-8 py-3.5">Quantidade</th>
                                    <th className="px-8 py-3.5">Valor</th>
                                    <th className="px-8 py-3.5 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredAbastecimentos.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-8 py-16 text-center text-slate-400 font-bold uppercase italic text-xs tracking-widest animate-pulse">
                                            {loading ? 'Carregando dados...' : 'Nenhum abastecimento encontrado para esta busca.'}
                                        </td>
                                    </tr>
                                ) : filteredAbastecimentos.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-4 text-sm font-semibold text-slate-600">
                                            {formatDate(item.data_registro)}
                                        </td>
                                        <td className="px-8 py-4">
                                            <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-xs font-black tracking-wider border border-slate-200 group-hover:bg-red-50 group-hover:text-red-700 group-hover:border-red-100 transition-colors whitespace-nowrap inline-block">
                                                {item.placa}
                                            </span>
                                        </td>
                                        <td className="px-8 py-4 text-sm font-bold text-slate-700 uppercase">
                                            {item.motorista}
                                        </td>
                                        <td className="px-8 py-4 text-sm font-semibold text-slate-500 italic">
                                            {item.posto}
                                        </td>
                                        <td className="px-8 py-4 text-sm font-bold text-slate-600">
                                            {item.quantidade} <span className="text-[9px] text-slate-400">Lts</span>
                                        </td>
                                        <td className="px-8 py-4 text-sm font-black text-emerald-600">
                                            {item.valor_venda ? new Number(item.valor_venda).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                                        </td>
                                        <td className="px-8 py-4 text-center">
                                            <button 
                                                onClick={() => handleView(item)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors bg-transparent hover:bg-blue-50 rounded-lg"
                                                title="Visualizar"
                                            >
                                                <span className="material-symbols-rounded text-xl">visibility</span>
                                            </button>
                                            <button 
                                                onClick={() => handleEdit(item)}
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
                        {filteredAbastecimentos.length === 0 && (
                            <div className="p-16 text-center text-slate-400 font-bold uppercase italic text-xs tracking-widest animate-pulse">
                                Nenhum abastecimento encontrado para esta busca.
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Modal Novo/Editar Abastecimento */}
            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setIsEditing(false); setIsAvulso(false); }} title={isEditing ? "Editar Abastecimento" : "Novo Abastecimento"}>
                <form onSubmit={handleSubmit}>
                    {/* Toggle Lançamento Avulso */}
                    <div className="mb-6 flex items-center gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 transition-colors hover:bg-slate-50">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={isAvulso}
                                onChange={(e) => {
                                    setIsAvulso(e.target.checked);
                                    if (e.target.checked) {
                                        setPlacaSearch('');
                                        setMotoristaSearch('');
                                    }
                                }}
                            />
                            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                        </label>
                        <div>
                            <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Lançamento Avulso</span>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Modo texto livre para terceiros</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Linha 1: Comum a todos */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tipo</label>
                            <select name="tipo" value={formData.tipo} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-bold text-slate-600">
                                <option value="Diesel">Diesel</option>
                                <option value="Gasolina">Gasolina</option>
                                <option value="Produto">Produto</option>
                            </select>
                        </div>
                        {formData.tipo === 'Produto' && (
                            <div className="space-y-1 animate-in fade-in zoom-in-95 duration-300">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Produto <span className="text-red-500">*</span></label>
                                <select 
                                    required
                                    name="nome_produto" 
                                    value={formData.nome_produto} 
                                    onChange={handleInputChange} 
                                    className="w-full px-4 py-2.5 rounded-xl border-2 border-red-100 bg-red-50/30 focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-bold text-red-600"
                                >
                                    <option value="">Selecione...</option>
                                    <option value="Arla">Arla</option>
                                    <option value="Extintor">Extintor</option>
                                    <option value="Filtro">Filtro</option>
                                    <option value="Lubrax">Lubrax</option>
                                    <option value="Lubrificante">Lubrificante</option>
                                </select>
                            </div>
                        )}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Empresa</label>
                            <select name="empresa" value={formData.empresa} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-bold text-slate-600">
                                <option value="Fort Fruit LTDA">Fort Fruit LTDA</option>
                                <option value="Bem Pra Gente">Bem Pra Gente</option>
                            </select>
                        </div>
                        <div className="space-y-1 relative">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Placa <span className="text-red-500">*</span></label>
                            <div className="relative group">
                                <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm group-focus-within:text-red-500 transition-colors">local_shipping</span>
                                <input 
                                    type="text"
                                    placeholder={isAvulso ? "DIGITE A PLACA AQUI..." : "DIGITE A PLACA (EX: QEX...)"}
                                    value={isAvulso ? formData.placa : (placaSearch || formData.placa)}
                                    onChange={(e) => {
                                        const val = e.target.value.toUpperCase();
                                        if (isAvulso) {
                                            setFormData(prev => ({ ...prev, placa: val }));
                                            return;
                                        }
                                        setPlacaSearch(val);
                                        setIsPlacaDropdownOpen(true);
                                        // Se limpar o campo, limpa a placa no form
                                        if (!val) setFormData(prev => ({ ...prev, placa: '' }));
                                    }}
                                    onFocus={() => !isAvulso && setIsPlacaDropdownOpen(true)}
                                    className={`w-full pl-9 pr-4 py-2.5 rounded-xl border ${isAvulso ? 'border-red-200 bg-red-50/30' : 'border-slate-200 bg-white'} focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-bold text-slate-700 uppercase`}
                                />
                            </div>

                            {/* Dropdown de Sugestões de Placas */}
                            {!isAvulso && isPlacaDropdownOpen && placaSearch && (
                                <div className="absolute z-[110] left-0 right-0 mt-1 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-60 overflow-y-auto custom-scrollbar">
                                    {(veiculos || [])
                                        .filter(v => 
                                            v.placa.replace(/[^a-zA-Z0-9]/g, '').includes(placaSearch.replace(/[^a-zA-Z0-9]/g, '')) ||
                                            v.descricao.toUpperCase().includes(placaSearch)
                                        )
                                        .map((v, idx) => (
                                            <div 
                                                key={idx}
                                                onClick={() => {
                                                    const cleanPlaca = v.placa.trim();
                                                    setFormData(prev => ({ ...prev, placa: cleanPlaca }));
                                                    setPlacaSearch(cleanPlaca);
                                                    setIsPlacaDropdownOpen(false);
                                                    fetchLastKm(cleanPlaca);
                                                }}
                                                className="px-4 py-3 hover:bg-red-50 cursor-pointer border-b border-slate-50 last:border-none flex items-center justify-between group transition-colors"
                                            >
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-700 group-hover:text-red-600 transition-colors uppercase">{v.placa.trim()}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-red-400 uppercase tracking-tighter">{v.descricao.trim()}</span>
                                                </div>
                                                <span className="material-symbols-rounded text-slate-200 group-hover:text-red-300 text-sm">add_circle</span>
                                            </div>
                                        ))}
                                    {(veiculos || []).filter(v => 
                                        v.placa.replace(/[^a-zA-Z0-9]/g, '').includes(placaSearch.replace(/[^a-zA-Z0-9]/g, '')) ||
                                        v.descricao.toUpperCase().includes(placaSearch)
                                    ).length === 0 && (
                                        <div className="px-4 py-8 text-center bg-slate-50">
                                            <span className="material-symbols-rounded text-slate-300 block mb-2">no_accounts</span>
                                            <p className="text-xs font-bold text-slate-400 uppercase animate-pulse">Placa não encontrada</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* Overlay invisível para fechar o dropdown ao clicar fora */}
                            {isPlacaDropdownOpen && (
                                <div className="fixed inset-0 z-[105]" onClick={() => setIsPlacaDropdownOpen(false)}></div>
                            )}
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Data <span className="text-red-500">*</span></label>
                            <input required type="date" name="data_registro" value={formData.data_registro} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" />
                        </div>

                        {/* Linha 2: Comum a todos */}
                        <div className="space-y-1 relative">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Motorista <span className="text-red-500">*</span></label>
                            <div className="relative group">
                                <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm group-focus-within:text-red-600 transition-colors">person</span>
                                <input 
                                    required
                                    type="text"
                                    placeholder={isAvulso ? "NOME DO TERCEIRO" : "NOME DO MOTORISTA"}
                                    value={isAvulso ? formData.motorista : (motoristaSearch || formData.motorista)}
                                    onChange={(e) => {
                                        const val = e.target.value.toUpperCase();
                                        if (isAvulso) {
                                            setFormData(prev => ({ ...prev, motorista: val }));
                                            return;
                                        }
                                        setMotoristaSearch(val);
                                        setIsMotoristaDropdownOpen(true);
                                        if (!val) setFormData(prev => ({ ...prev, motorista: '' }));
                                    }}
                                    onFocus={() => !isAvulso && setIsMotoristaDropdownOpen(true)}
                                    className={`w-full pl-9 pr-4 py-2.5 rounded-xl border ${isAvulso ? 'border-red-200 bg-red-50/30' : 'border-slate-200 bg-white'} focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-bold text-slate-700 uppercase`}
                                />
                            </div>

                            {/* Dropdown de Sugestões de Motoristas */}
                            {!isAvulso && isMotoristaDropdownOpen && motoristaSearch && (
                                <div className="absolute z-[110] left-0 right-0 mt-1 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-60 overflow-y-auto custom-scrollbar">
                                    {(motoristas || [])
                                        .filter(m => m.nome.toUpperCase().includes(motoristaSearch))
                                        .map((m, idx) => (
                                            <div 
                                                key={idx}
                                                onClick={() => {
                                                    const cleanNome = m.nome.trim();
                                                    setFormData(prev => ({ ...prev, motorista: cleanNome }));
                                                    setMotoristaSearch(cleanNome);
                                                    setIsMotoristaDropdownOpen(false);
                                                }}
                                                className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-none flex items-center justify-between group transition-colors"
                                            >
                                                <span className="text-sm font-bold text-slate-700 group-hover:text-red-600 transition-colors uppercase">{m.nome.trim()}</span>
                                                <span className="material-symbols-rounded text-slate-200 group-hover:text-red-300 text-sm">person_check</span>
                                            </div>
                                        ))}
                                    {(motoristas || []).filter(m => m.nome.toUpperCase().includes(motoristaSearch)).length === 0 && (
                                        <div className="px-4 py-8 text-center bg-slate-50">
                                            <p className="text-xs font-bold text-slate-400 uppercase italic animate-pulse">Motorista não localizado</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            {isMotoristaDropdownOpen && (
                                <div className="fixed inset-0 z-[105]" onClick={() => setIsMotoristaDropdownOpen(false)}></div>
                            )}
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Requerimento</label>
                            <input name="requerimento" value={formData.requerimento} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" placeholder="Nº Requerimento" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Cupom</label>
                            <input name="cupom" value={formData.cupom} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" placeholder="Nº Cupom Fiscal" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Posto</label>
                            <input name="posto" value={formData.posto} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" placeholder="Nome do Posto" />
                        </div>

                        {/* Campos específicos baseados no TIPO */}
                        {formData.tipo === 'Produto' ? (
                            <>
                                {/* Layout para PRODUTO */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Data que foi comprado</label>
                                    <input type="date" name="data_abastecido" value={formData.data_abastecido} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Hora</label>
                                    <input type="time" name="hora" value={formData.hora} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Quantidade</label>
                                    <input type="number" step="0.01" name="quantidade" value={formData.quantidade} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" placeholder="0.00" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor Venda</label>
                                    <input name="valor_venda" value={formData.valor_venda} onChange={handleCurrencyChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-bold text-blue-600" placeholder="R$ 0,00" />
                                </div>

                                {/* Campos Automáticos */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest ml-1">Preço</label>
                                    <input name="preco" value={formData.preco} onChange={handleCurrencyChange} className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner text-sm font-bold text-emerald-700" placeholder="R$ 0,00" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest ml-1">Valor Correto</label>
                                    <input name="valor_correto" value={formData.valor_correto} onChange={handleCurrencyChange} className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner text-sm font-bold text-emerald-700" placeholder="R$ 0,00" />
                                </div>
                                <div className="space-y-1 md:col-span-2 lg:col-span-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Descrição <span className="text-red-500">*</span></label>
                                    <textarea required name="descricao" value={formData.descricao} onChange={handleInputChange} rows="1" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" placeholder="Descrição obrigatória para produtos..."></textarea>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Layout para ABASTECIMENTO (Diesel/Gasolina) */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Data que foi abastecido</label>
                                    <input type="date" name="data_abastecido" value={formData.data_abastecido} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Hora</label>
                                    <input type="time" name="hora" value={formData.hora} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                        KM Abast. <span className="text-red-500">*</span>
                                    </label>
                                    <input required type="text" name="km_abast" value={formData.km_abast} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" placeholder="0" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Quantidade (Lts)</label>
                                    <input type="number" step="any" name="quantidade" value={formData.quantidade} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" placeholder="0.00" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor Venda</label>
                                    <input name="valor_venda" value={formData.valor_venda} onChange={handleCurrencyChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-bold text-blue-600" placeholder="R$ 0,00" />
                                </div>

                                {/* Campos Automáticos */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest ml-1">KM Abaste. Atual</label>
                                    <input type="text" name="km_abast_atual" value={formData.km_abast_atual} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner text-sm font-bold text-emerald-700" placeholder="0" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest ml-1">Km Rod.</label>
                                    <input type="text" name="km_rod" value={formData.km_rod} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner text-sm font-bold text-emerald-700" placeholder="0" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest ml-1">KM/LT</label>
                                    <input type="text" name="km_lt" value={formData.km_lt} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner text-sm font-bold text-emerald-700" placeholder="0.00" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest ml-1">Preço</label>
                                    <input name="preco" value={formData.preco} onChange={handleCurrencyChange} className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner text-sm font-bold text-emerald-700" placeholder="R$ 0,00" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest ml-1">Valor Correto</label>
                                    <input name="valor_correto" value={formData.valor_correto} onChange={handleCurrencyChange} className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner text-sm font-bold text-emerald-700" placeholder="R$ 0,00" />
                                </div>

                                <div className="space-y-1 md:col-span-2 lg:col-span-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                                    <textarea name="descricao" value={formData.descricao} onChange={handleInputChange} rows="1" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" placeholder="Detalhes..."></textarea>
                                </div>
                                <div className="space-y-1 md:col-span-4 lg:col-span-4">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Observações</label>
                                    <textarea name="obs" value={formData.obs} onChange={handleInputChange} rows="2" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm text-sm font-semibold" placeholder="Observações internas..."></textarea>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="mt-6 flex justify-end gap-3 px-1 pb-1">
                        <button type="button" onClick={() => { setIsModalOpen(false); setIsEditing(false); }} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all font-inter text-sm">Cancelar</button>
                        <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-8 rounded-xl shadow-lg shadow-red-600/20 transition-all active:scale-95 flex items-center gap-2 uppercase tracking-tight text-xs font-inter">
                            <span className="material-symbols-rounded text-lg">{isEditing ? 'update' : 'save'}</span>
                            {isEditing ? 'Atualizar Registro' : 'Salvar Registro'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Detalhes Abastecimento */}
            <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Detalhes do Abastecimento">
                {selectedItem && (
                    <div className="space-y-6 pb-2">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 font-inter">Requerimento</p>
                                <p className="text-sm font-bold text-slate-800 font-inter">{selectedItem.requerimento || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 font-inter">Empresa</p>
                                <p className="text-sm font-bold text-slate-800 font-inter">{selectedItem.empresa}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 font-inter">Data Lançamento</p>
                                <p className="text-sm font-bold text-slate-800 font-inter">{formatDate(selectedItem.data_registro)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 font-inter">Placa</p>
                                <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-lg text-[10px] font-black tracking-wider border border-red-100 font-inter">{selectedItem.placa}</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 font-inter">Motorista</p>
                                <p className="text-xs font-bold text-slate-800 uppercase font-inter">{selectedItem.motorista}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 font-inter">Posto</p>
                                <p className="text-xs font-bold text-slate-800 italic font-inter">{selectedItem.posto}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 font-inter">Tipo Combustível</p>
                                <p className="text-xs font-bold text-slate-800 font-inter">{selectedItem.tipo || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 font-inter">Cupom/NF</p>
                                <p className="text-xs font-bold text-slate-800 font-inter">{selectedItem.cupom || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-5 rounded-[20px] border border-slate-100 shadow-inner">
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 font-inter">KM Anterior</p>
                                <p className="text-base font-black text-slate-700 font-inter">{(Number(selectedItem.km_abast_atual) || 0).toLocaleString('pt-BR')}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 font-inter">KM Atual</p>
                                <p className="text-base font-black text-slate-700 font-inter">{(Number(selectedItem.km_abast) || 0).toLocaleString('pt-BR')}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 font-inter">KM Rodados</p>
                                <p className="text-base font-black text-blue-600 font-inter">{(Number(selectedItem.km_rod) || 0).toLocaleString('pt-BR')}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 font-inter">Média (KM/LT)</p>
                                <p className="text-base font-black text-orange-500 font-inter">{(Number(selectedItem.km_lt) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-emerald-50 p-4 rounded-[20px] border border-emerald-100 shadow-sm">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="material-symbols-rounded text-emerald-600 text-base">water_drop</span>
                                    <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest font-inter">Quantidade</p>
                                </div>
                                <p className="text-xl font-black text-emerald-700 font-inter">{selectedItem.quantidade} Lts</p>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-[20px] border border-blue-100 shadow-sm">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="material-symbols-rounded text-blue-600 text-base">payments</span>
                                    <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest font-inter">Valor Venda</p>
                                </div>
                                <p className="text-xl font-black text-blue-700 font-inter">R$ {selectedItem.valor_venda}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-[20px] border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="material-symbols-rounded text-slate-400 text-base">verified</span>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-inter">Valor Correto</p>
                                </div>
                                <p className="text-xl font-black text-slate-600 font-inter">R$ {selectedItem.valor_correto || selectedItem.valor_venda}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <div className="flex items-center gap-2 mb-1.5 ml-1">
                                    <span className="material-symbols-rounded text-slate-400 text-sm">description</span>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-inter">Descrição</p>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-slate-100 text-xs text-slate-500 italic font-inter shadow-sm">
                                    {selectedItem.descricao || "Nenhuma descrição fornecida."}
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1.5 ml-1">
                                    <span className="material-symbols-rounded text-slate-400 text-sm">notes</span>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-inter">Observações</p>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-slate-100 text-xs text-slate-500 font-inter shadow-sm">
                                    {selectedItem.obs || "Sem observações registradas."}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => setIsDetailModalOpen(false)} className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-10 rounded-xl transition-all active:scale-95 uppercase text-[10px] tracking-[0.2em] font-inter shadow-lg">
                                    Fechar Detalhes
                                </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal do Dashboard */}
            <Modal 
                isOpen={isDashboardModalOpen} 
                onClose={() => setIsDashboardModalOpen(false)} 
                title="Dashboard de Abastecimento"
                maxWidth="6xl"
            >
                <AbastecimentoDashboard data={abastecimentos} />
            </Modal>

            {/* Modal de Fechamento */}
            <Modal 
                isOpen={isFechamentoModalOpen} 
                onClose={() => setIsFechamentoModalOpen(false)} 
                title="Fechamento de Abastecimentos"
            >
                <div className="p-4 space-y-4 max-w-md mx-auto">
                    <p className="text-sm text-slate-500 font-semibold mb-4 text-center">
                        Selecione o período para gerar o PDF de fechamento resumido por Posto e Empresa.
                    </p>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Data Inicial</label>
                        <input 
                            type="date" 
                            value={fechamentoStartDate}
                            onChange={(e) => setFechamentoStartDate(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-semibold shadow-inner" 
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Data Final</label>
                        <input 
                            type="date" 
                            value={fechamentoEndDate}
                            onChange={(e) => setFechamentoEndDate(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-semibold shadow-inner" 
                        />
                    </div>
                    <div className="pt-4">
                        <button 
                            onClick={generateFechamentoPDF}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-600/30 transition-all active:scale-95 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-rounded text-lg">picture_as_pdf</span>
                            Gerar Fechamento
                        </button>
                    </div>
                </div>
            </Modal>


            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}</style>
        </div>
    );
};

export default Abastecimento;
